"""
CYBERDOME — Incidents Management Router.
Provides company-scoped Incident Response lifecycle:
Creation, triage, severity & status management, assignee assignment,
timeline tracking, evidence logging, and MITRE ATT&CK mapping.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.models import User, CompanyUser
from app.models.phase4 import Incident, IncidentEvent, IncidentStatus, IncidentSeverity
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission, create_audit_entry
)

router = APIRouter(prefix="/incidents", tags=["Incidents & SOC"])


# ─── Pydantic Schemas ──────────────────────────────────────────────────
class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    severity: str = Field(default="MEDIUM")
    status: str = Field(default="OPEN")
    assignee_id: Optional[str] = None
    mitre_mapping: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[str] = None
    mitre_mapping: Optional[List[Dict[str, Any]]] = None


class IncidentEventCreate(BaseModel):
    action: str = Field(..., min_length=2)
    actor: Optional[str] = None
    details: Optional[str] = None


def _format_incident(inc: Incident, events: Optional[List[IncidentEvent]] = None) -> dict:
    return {
        "id": inc.id,
        "companyId": inc.company_id,
        "title": inc.title,
        "description": inc.description,
        "severity": inc.severity,
        "status": inc.status,
        "environment": getattr(inc, "environment", "REAL") or "REAL",
        "assigneeId": inc.assignee_id,
        "mitreMapping": inc.mitre_mapping or [],
        "timeline": [
            {
                "id": ev.id,
                "action": ev.action,
                "actor": ev.actor,
                "details": ev.details,
            }
            for ev in (events or [])
        ]
    }


# ─── Endpoints ────────────────────────────────────────────────────────
@router.get("")
@router.get("/")
async def list_incidents(
    severity: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("incident.read")),
    db: AsyncSession = Depends(get_db),
):
    """List all incidents for authenticated user's company with optional filters."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company incidents."}
        )

    query = select(Incident).where(Incident.company_id == membership.company_id)
    if severity:
        query = query.where(Incident.severity == severity.upper())
    if status_filter:
        query = query.where(Incident.status == status_filter.upper())

    result = await db.execute(query)
    incidents = result.scalars().all()
    return success_response([_format_incident(i) for i in incidents])


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_incident(
    data: IncidentCreate,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("incident.write")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new security incident under authenticated company."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot create company incidents."}
        )

    incident = Incident(
        company_id=membership.company_id,
        title=data.title.strip(),
        description=data.description,
        severity=data.severity.upper(),
        status=data.status.upper(),
        assignee_id=data.assignee_id,
        mitre_mapping=data.mitre_mapping or [],
    )
    db.add(incident)
    await db.flush()

    # Initial timeline event
    initial_event = IncidentEvent(
        company_id=membership.company_id,
        incident_id=incident.id,
        action="INCIDENT_CREATED",
        actor=user.name or user.email,
        details=f"Incident opened with severity {incident.severity}: {incident.title}",
    )
    db.add(initial_event)
    await db.commit()
    await db.refresh(incident)

    # Audit log
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="INCIDENT_CREATED",
        result="SUCCESS",
        user_id=user.id,
        company_id=membership.company_id,
        resource_type="incident",
        resource_id=incident.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"title": incident.title, "severity": incident.severity}
    )

    formatted = _format_incident(incident, [initial_event])
    from app.core.websocket import ws_manager
    await ws_manager.broadcast_to_company(membership.company_id, "incident_created", formatted)

    return success_response(formatted)


@router.get("/{incident_id}")
async def get_incident(
    incident_id: str,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("incident.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details and timeline events for an incident."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company incidents."}
        )

    res = await db.execute(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.company_id == membership.company_id
        )
    )
    incident = res.scalar_one_or_none()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Incident not found."}
        )

    # Fetch events
    ev_res = await db.execute(
        select(IncidentEvent).where(
            IncidentEvent.incident_id == incident_id,
            IncidentEvent.company_id == membership.company_id
        )
    )
    events = ev_res.scalars().all()
    return success_response(_format_incident(incident, events))


@router.patch("/{incident_id}")
async def update_incident(
    incident_id: str,
    data: IncidentUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("incident.write")),
    db: AsyncSession = Depends(get_db),
):
    """Update incident status, severity, or assignee."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot update company incidents."}
        )

    res = await db.execute(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.company_id == membership.company_id
        )
    )
    incident = res.scalar_one_or_none()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Incident not found."}
        )

    changes = []
    if data.title is not None and data.title != incident.title:
        incident.title = data.title.strip()
        changes.append(f"Title changed to '{incident.title}'")
    if data.description is not None:
        incident.description = data.description
    if data.severity is not None and data.severity.upper() != incident.severity:
        old_sev = incident.severity
        incident.severity = data.severity.upper()
        changes.append(f"Severity changed from {old_sev} to {incident.severity}")
    if data.status is not None and data.status.upper() != incident.status:
        old_st = incident.status
        incident.status = data.status.upper()
        changes.append(f"Status changed from {old_st} to {incident.status}")
    if data.assignee_id is not None and data.assignee_id != incident.assignee_id:
        incident.assignee_id = data.assignee_id
        changes.append(f"Assignee updated to {incident.assignee_id}")
    if data.mitre_mapping is not None:
        incident.mitre_mapping = data.mitre_mapping

    if changes:
        timeline_entry = IncidentEvent(
            company_id=membership.company_id,
            incident_id=incident.id,
            action="INCIDENT_UPDATED",
            actor=user.name or user.email,
            details="; ".join(changes),
        )
        db.add(timeline_entry)

    await db.commit()
    await db.refresh(incident)

    # Fetch updated events
    ev_res = await db.execute(
        select(IncidentEvent).where(
            IncidentEvent.incident_id == incident_id,
            IncidentEvent.company_id == membership.company_id
        )
    )
    events = ev_res.scalars().all()
    formatted = _format_incident(incident, events)

    from app.core.websocket import ws_manager
    await ws_manager.broadcast_to_company(membership.company_id, "incident_updated", formatted)

    return success_response(formatted)


@router.post("/{incident_id}/events", status_code=status.HTTP_201_CREATED)
async def add_incident_event(
    incident_id: str,
    data: IncidentEventCreate,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("incident.write")),
    db: AsyncSession = Depends(get_db),
):
    """Add a timeline event or forensic note to an incident."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot modify company incidents."}
        )

    res = await db.execute(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.company_id == membership.company_id
        )
    )
    incident = res.scalar_one_or_none()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Incident not found."}
        )

    event = IncidentEvent(
        company_id=membership.company_id,
        incident_id=incident_id,
        action=data.action.strip(),
        actor=data.actor or user.name or user.email,
        details=data.details,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    return success_response({
        "id": event.id,
        "incidentId": event.incident_id,
        "action": event.action,
        "actor": event.actor,
        "details": event.details
    })
