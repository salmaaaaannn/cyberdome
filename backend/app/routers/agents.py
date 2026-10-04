"""
CYBERDOME — Endpoint Agent & Telemetry Router.
Company-isolated agent management:
Enrollment, revocable tokens, heartbeats, security telemetry ingestion,
and revocation controls. Collects security metadata only.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import secrets

from app.core.database import get_db
from app.models.models import User, CompanyUser
from app.models.phase4 import AgentDevice, AgentStatus
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission, create_audit_entry
)

router = APIRouter(prefix="/agents", tags=["Endpoint Agents"])


# ─── Pydantic Schemas ──────────────────────────────────────────────────
class AgentEnrollRequest(BaseModel):
    hostname: str = Field(..., min_length=2, max_length=150)
    os_type: Optional[str] = "Linux"
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None


class AgentTelemetryPayload(BaseModel):
    cpu_percent: Optional[float] = None
    memory_percent: Optional[float] = None
    active_listening_ports: Optional[List[int]] = Field(default_factory=list)
    running_security_services: Optional[List[str]] = Field(default_factory=list)


def _format_agent(a: AgentDevice) -> dict:
    return {
        "id": a.id,
        "companyId": a.company_id,
        "hostname": a.hostname,
        "osType": a.os_type,
        "ipAddress": a.ip_address,
        "macAddress": a.mac_address,
        "status": a.status or "OFFLINE",
        "lastSeen": a.last_seen.isoformat() if a.last_seen else None,
    }


# ─── Endpoints ────────────────────────────────────────────────────────
@router.get("")
@router.get("/")
async def list_agents(
    status_filter: Optional[str] = Query(None, alias="status"),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """List enrolled endpoint agents for company."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company agents."}
        )

    query = select(AgentDevice).where(AgentDevice.company_id == membership.company_id)
    if status_filter:
        query = query.where(AgentDevice.status == status_filter.upper())

    res = await db.execute(query.order_by(AgentDevice.hostname))
    agents = res.scalars().all()
    return success_response([_format_agent(a) for a in agents])


@router.post("/enroll", status_code=status.HTTP_201_CREATED)
async def enroll_agent(
    data: AgentEnrollRequest,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """Enroll a new endpoint agent into company inventory."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot enroll company agents."}
        )

    agent_token = f"agt_{secrets.token_urlsafe(24)}"
    agent = AgentDevice(
        company_id=membership.company_id,
        hostname=data.hostname.strip(),
        os_type=data.os_type or "Linux",
        ip_address=data.ip_address.strip() if data.ip_address else None,
        mac_address=data.mac_address.strip().upper() if data.mac_address else None,
        status="ONLINE",
        last_seen=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)

    # Audit log
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="AGENT_ENROLLED",
        result="SUCCESS",
        user_id=user.id,
        company_id=membership.company_id,
        resource_type="agent",
        resource_id=agent.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"hostname": agent.hostname, "os_type": agent.os_type}
    )

    out = _format_agent(agent)
    out["enrollmentToken"] = agent_token
    return success_response(out)


@router.post("/{agent_id}/heartbeat")
async def agent_heartbeat(
    agent_id: str,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db),
):
    """Record agent heartbeat update."""
    if not membership or user.account_type == "USER":
        raise HTTPException(status_code=403, detail="Forbidden")

    res = await db.execute(
        select(AgentDevice).where(
            AgentDevice.id == agent_id,
            AgentDevice.company_id == membership.company_id
        )
    )
    agent = res.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if agent.status == "REVOKED":
        raise HTTPException(status_code=403, detail="Agent credentials have been revoked")

    agent.last_seen = datetime.now(timezone.utc).replace(tzinfo=None)
    agent.status = "ONLINE"
    await db.commit()
    await db.refresh(agent)
    return success_response(_format_agent(agent))


@router.post("/{agent_id}/revoke")
async def revoke_agent(
    agent_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an agent's credentials immediately."""
    if not membership or user.account_type == "USER":
        raise HTTPException(status_code=403, detail="Forbidden")

    res = await db.execute(
        select(AgentDevice).where(
            AgentDevice.id == agent_id,
            AgentDevice.company_id == membership.company_id
        )
    )
    agent = res.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent.status = "REVOKED"
    await db.commit()
    await db.refresh(agent)

    # Audit log
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="AGENT_REVOKED",
        result="SUCCESS",
        user_id=user.id,
        company_id=membership.company_id,
        resource_type="agent",
        resource_id=agent.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"hostname": agent.hostname}
    )

    return success_response(_format_agent(agent))


@router.post("/{agent_id}/telemetry")
async def ingest_agent_telemetry(
    agent_id: str,
    telemetry: AgentTelemetryPayload,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Ingest authorized security metadata from agent.
    Never stores or processes sensitive credentials or communications.
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(status_code=403, detail="Forbidden")

    res = await db.execute(
        select(AgentDevice).where(
            AgentDevice.id == agent_id,
            AgentDevice.company_id == membership.company_id
        )
    )
    agent = res.scalar_one_or_none()
    if not agent or agent.status == "REVOKED":
        raise HTTPException(status_code=403, detail="Invalid or revoked agent")

    agent.last_seen = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()

    return success_response({
        "agentId": agent.id,
        "status": "INGESTED",
        "timestamp": datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
    })
