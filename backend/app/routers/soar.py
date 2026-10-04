"""
CYBERDOME — Security Orchestration, Automation, and Response (SOAR) Router.
Company-isolated playbook management & automated response actions:
Playbook definitions, execution tracking, containment logs,
and authorization controls for destructive operations.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.models import User, CompanyUser
from app.models.phase4 import SOARPlaybook, PlaybookExecution, Incident, IncidentEvent
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission, create_audit_entry
)

router = APIRouter(prefix="/soar", tags=["SOAR & Automation"])


# ─── Pydantic Schemas ──────────────────────────────────────────────────
class PlaybookCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=150)
    description: Optional[str] = None
    trigger: str = Field(..., min_length=2, max_length=100)
    is_active: Optional[bool] = True


class ExecutionRequest(BaseModel):
    incident_id: Optional[str] = None
    dry_run: Optional[bool] = False


DEFAULT_PLAYBOOKS = [
    {
        "name": "Automated Incident Containment & Tagging",
        "description": "Quarantines compromised assets, tags security status, and generates automated timeline evidence.",
        "trigger": "INCIDENT_CREATED",
        "steps": [
            {"id": "step-1", "name": "Verify Incident Signature", "status": "success"},
            {"id": "step-2", "name": "Tag Asset as Quarantined", "status": "success"},
            {"id": "step-3", "name": "Notify Security Lead", "status": "success"},
            {"id": "step-4", "name": "Update Incident to Containment", "status": "success"}
        ]
    },
    {
        "name": "Suspicious IP Port-Block Quarantine",
        "description": "Automatically issues local dynamic block rule for adversary IP addresses probing unauthorized ports.",
        "trigger": "MALICIOUS_PORT_PROBE",
        "steps": [
            {"id": "step-1", "name": "Extract Offending Source IP", "status": "success"},
            {"id": "step-2", "name": "Generate Ingress Block Rule", "status": "success"},
            {"id": "step-3", "name": "Log Security Audit Event", "status": "success"}
        ]
    },
    {
        "name": "Bulk Exfiltration Account Session Revocation",
        "description": "Revokes OAuth refresh tokens, terminates active SSO sessions, and flags identity for mandatory MFA reset.",
        "trigger": "UEBA_EXFILTRATION",
        "steps": [
            {"id": "step-1", "name": "Identify Targeted Identity", "status": "success"},
            {"id": "step-2", "name": "Revoke SSO / OAuth Refresh Tokens", "status": "success"},
            {"id": "step-3", "name": "Notify Identity & Access Administrator", "status": "success"}
        ]
    },
    {
        "name": "IoT Botnet Network Port Quarantine",
        "description": "Isolates anomalous smart/OT sensors via 802.1X dynamic VLAN assignment to prevent lateral spread.",
        "trigger": "IOT_ANOMALY_BURST",
        "steps": [
            {"id": "step-1", "name": "Detect Anomaly Burst", "status": "success"},
            {"id": "step-2", "name": "Quarantine 802.1X Switch Port", "status": "success"},
            {"id": "step-3", "name": "Notify IoT Security Operations", "status": "success"}
        ]
    }
]

def _format_playbook(p: SOARPlaybook, execution_count: int = 1) -> dict:
    steps = getattr(p, 'steps', None) or [
        {"id": "step-1", "name": "Initiate Triage Verification", "status": "success"},
        {"id": "step-2", "name": "Apply Automated Defense Rule", "status": "success"},
        {"id": "step-3", "name": "Publish Incident Timeline Audit", "status": "success"},
    ]
    return {
        "id": p.id,
        "companyId": p.company_id,
        "name": p.name,
        "description": p.description,
        "trigger": p.trigger,
        "isActive": p.is_active,
        "status": "active" if p.is_active else "disabled",
        "steps": steps,
        "executions": execution_count,
        "avgDuration": "1m 45s",
    }


def _format_execution(e: PlaybookExecution) -> dict:
    return {
        "id": e.id,
        "companyId": e.company_id,
        "playbookId": e.playbook_id,
        "status": e.status,
        "incidentId": e.incident_id,
        "result": e.result if hasattr(e, 'result') and e.result is not None else {},
        "startedAt": e.started_at.isoformat() if hasattr(e, 'started_at') and e.started_at else None,
        "completedAt": e.completed_at.isoformat() if hasattr(e, 'completed_at') and e.completed_at else None,
    }


# ─── Endpoints ────────────────────────────────────────────────────────
@router.get("/playbooks")
async def list_playbooks(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("incident.read")),
    db: AsyncSession = Depends(get_db),
):
    """List available automated response playbooks for authenticated company."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access SOAR playbooks."}
        )

    cid = membership.company_id
    res = await db.execute(
        select(SOARPlaybook).where(SOARPlaybook.company_id == cid)
    )
    playbooks = res.scalars().all()

    # Seed baseline safe playbooks if empty
    if not playbooks:
        for pb_def in DEFAULT_PLAYBOOKS:
            new_pb = SOARPlaybook(
                company_id=cid,
                name=pb_def["name"],
                description=pb_def["description"],
                trigger=pb_def["trigger"],
                steps=pb_def["steps"],
                is_active=True
            )
            db.add(new_pb)
        await db.commit()
        refreshed = await db.execute(select(SOARPlaybook).where(SOARPlaybook.company_id == cid))
        playbooks = refreshed.scalars().all()

    return success_response([_format_playbook(p) for p in playbooks])


@router.post("/playbooks", status_code=status.HTTP_201_CREATED)
async def create_playbook(
    data: PlaybookCreate,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("incident.write")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new response playbook for authenticated company."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot create SOAR playbooks."}
        )

    playbook = SOARPlaybook(
        company_id=membership.company_id,
        name=data.name.strip(),
        description=data.description,
        trigger=data.trigger.strip(),
        is_active=data.is_active if data.is_active is not None else True,
    )
    db.add(playbook)
    await db.commit()
    await db.refresh(playbook)

    # Audit log
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="SOAR_PLAYBOOK_CREATED",
        result="SUCCESS",
        user_id=user.id,
        company_id=membership.company_id,
        resource_type="soar_playbook",
        resource_id=playbook.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"name": playbook.name, "trigger": playbook.trigger}
    )

    return success_response(_format_playbook(playbook))


@router.get("/playbooks/{playbook_id}")
async def get_playbook(
    playbook_id: str,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("incident.read")),
    db: AsyncSession = Depends(get_db),
):
    """Get details of a specific playbook."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access SOAR playbooks."}
        )

    res = await db.execute(
        select(SOARPlaybook).where(
            SOARPlaybook.id == playbook_id,
            SOARPlaybook.company_id == membership.company_id
        )
    )
    pb = res.scalar_one_or_none()
    if not pb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Playbook not found."}
        )

    return success_response(_format_playbook(pb))


@router.post("/playbooks/{playbook_id}/execute")
async def execute_playbook(
    playbook_id: str,
    data: ExecutionRequest,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("incident.write")),
    db: AsyncSession = Depends(get_db),
):
    """
    Execute an automated response playbook.
    Requires incident.write permission. Destructive actions are audited.
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot execute SOAR playbooks."}
        )

    from app.services.soar_orchestrator import soar_orchestrator
    try:
        execution = await soar_orchestrator.initiate_playbook(
            db=db,
            company_id=membership.company_id,
            playbook_id=playbook_id,
            incident_id=data.incident_id,
            actor=f"{user.name or user.email}",
            is_simulation=data.dry_run
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "BAD_REQUEST", "message": str(e)}
        )

    # Audit log
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="SOAR_PLAYBOOK_EXECUTION_INITIATED",
        result="SUCCESS",
        user_id=user.id,
        company_id=membership.company_id,
        resource_type="soar_execution",
        resource_id=execution.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"playbook_id": playbook_id, "incident_id": data.incident_id, "status": execution.status}
    )
    await create_audit_entry(
        db=db,
        action="SOAR_PLAYBOOK_EXECUTED",
        result="SUCCESS" if execution.status in ["SUCCESS", "WAITING_APPROVAL", "RUNNING", "PARTIAL_SUCCESS"] else "FAILED",
        user_id=user.id,
        company_id=membership.company_id,
        resource_type="soar_execution",
        resource_id=execution.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"playbook_id": playbook_id, "incident_id": data.incident_id, "status": execution.status}
    )

    return success_response(_format_execution(execution))


@router.get("/executions")
async def list_executions(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("incident.read")),
    db: AsyncSession = Depends(get_db),
):
    """List execution history of automated security playbooks."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access SOAR executions."}
        )

    res = await db.execute(
        select(PlaybookExecution).where(PlaybookExecution.company_id == membership.company_id)
        .order_by(PlaybookExecution.id.desc()).limit(100)
    )
    executions = res.scalars().all()
    return success_response([_format_execution(e) for e in executions])


@router.post("/executions/{execution_id}/approve")
async def approve_execution_endpoint(
    execution_id: str,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("incident.write")),
    db: AsyncSession = Depends(get_db),
):
    """Approve a WAITING_APPROVAL execution."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot approve SOAR executions."}
        )

    from app.services.soar_orchestrator import soar_orchestrator
    try:
        execution = await soar_orchestrator.approve_execution(
            db=db,
            company_id=membership.company_id,
            execution_id=execution_id,
            approver_id=f"{user.name or user.email}"
        )
        return success_response(_format_execution(execution))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "BAD_REQUEST", "message": str(e)}
        )

@router.post("/executions/{execution_id}/cancel")
async def cancel_execution_endpoint(
    execution_id: str,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("incident.write")),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a WAITING_APPROVAL execution."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot cancel SOAR executions."}
        )

    from app.services.soar_orchestrator import soar_orchestrator
    try:
        execution = await soar_orchestrator.cancel_execution(
            db=db,
            company_id=membership.company_id,
            execution_id=execution_id,
            actor=f"{user.name or user.email}"
        )
        return success_response(_format_execution(execution))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "BAD_REQUEST", "message": str(e)}
        )
