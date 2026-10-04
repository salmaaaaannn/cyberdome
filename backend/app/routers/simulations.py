from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_company_membership
from app.core.permissions import has_permission
from app.models.models import User, CompanyUser, EmployeeSecuritySimulation, SimulationEvent
from app.schemas.common import success_response, error_response
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/simulations", tags=["Employee Simulations"])

class CreateSimulationRequest(BaseModel):
    name: str
    type: Optional[str] = "EMAIL"
    target_users: Optional[List[str]] = None
    targets: Optional[str] = None
    content: Optional[str] = None
    subject: Optional[str] = None
    message: Optional[str] = None
    scenario: Optional[str] = None
    action: Optional[str] = None

class SimulationEventRequest(BaseModel):
    event_type: str # 'SIMULATION_SENT', 'DELIVERED', 'OPENED', 'LINK_CLICKED', 'REPORTED', 'IGNORED'

@router.post("")
@router.post("/")
async def create_simulation(
    data: CreateSimulationRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership)
):
    if not membership or not has_permission(membership.role, "employee.create"):
        raise HTTPException(status_code=403, detail="Not authorized to create simulations")

    # Normalize target users
    targets = data.target_users
    if not targets and data.targets:
        targets = [t.strip() for t in data.targets.split(",") if t.strip()]
    if not targets:
        targets = ["All Employees"]

    # Normalize content
    content_payload = data.content
    if not content_payload:
        content_payload = f"{data.subject or ''} - {data.message or ''}".strip()

    simulation = EmployeeSecuritySimulation(
        company_id=membership.company_id,
        created_by=user.id,
        name=data.name,
        type="EMAIL" if "EMAIL" in (data.type or "").upper() else "MESSAGE",
        target_users=targets,
        content=content_payload or "Security awareness exercise",
        status="RUNNING"
    )
    db.add(simulation)
    await db.commit()
    await db.refresh(simulation)

    return success_response({"simulation": {"id": simulation.id, "name": simulation.name, "status": simulation.status}})

@router.post("/{simulation_id}/events")
async def log_simulation_event(
    simulation_id: str,
    data: SimulationEventRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership)
):
    sim_query = await db.execute(select(EmployeeSecuritySimulation).where(
        EmployeeSecuritySimulation.id == simulation_id,
        EmployeeSecuritySimulation.company_id == membership.company_id
    ))
    simulation = sim_query.scalar_one_or_none()
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation not found.")

    event = SimulationEvent(
        simulation_id=simulation.id,
        user_id=user.id,
        company_id=membership.company_id,
        event_type=data.event_type
    )
    db.add(event)

    # Risk Engine Update
    if data.event_type == "LINK_CLICKED":
        membership.risk_score += 15.0
        membership.evidence_count += 1
    elif data.event_type == "REPORTED":
        membership.risk_score = max(0.0, membership.risk_score - 5.0)
    
    if membership.risk_score > 50:
        membership.risk_level = "CRITICAL"
    elif membership.risk_score > 30:
        membership.risk_level = "HIGH"
    elif membership.risk_score > 15:
        membership.risk_level = "MEDIUM"
    elif membership.risk_score > 0:
        membership.risk_level = "LOW"
    else:
        membership.risk_level = "SECURE"
        
    membership.calculated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()

    return success_response({"message": "Event logged and risk calculated."})

@router.get("")
@router.get("/")
async def get_simulations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership)
):
    if not membership or not has_permission(membership.role, "employee.read"):
        raise HTTPException(status_code=403, detail="Not authorized to view simulations")
    
    result = await db.execute(select(EmployeeSecuritySimulation).where(EmployeeSecuritySimulation.company_id == membership.company_id))
    sims = result.scalars().all()
    
    return success_response({"simulations": [{"id": s.id, "name": s.name, "type": s.type, "status": s.status, "created_at": s.created_at} for s in sims]})

@router.get("/{simulation_id}")
async def get_simulation_detail(
    simulation_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership)
):
    if not membership or not has_permission(membership.role, "employee.read"):
        raise HTTPException(status_code=403, detail="Not authorized to view simulations")

    sim_query = await db.execute(select(EmployeeSecuritySimulation).where(
        EmployeeSecuritySimulation.id == simulation_id,
        EmployeeSecuritySimulation.company_id == membership.company_id
    ))
    simulation = sim_query.scalar_one_or_none()
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation not found.")

    return success_response({
        "id": simulation.id,
        "name": simulation.name,
        "type": simulation.type,
        "status": simulation.status,
        "createdAt": simulation.created_at.isoformat() if simulation.created_at else None,
        "createdBy": "Administrator",
        "recipients": [
            {"name": "Authorized Staff", "identifier": u, "deliveryStatus": "DELIVERED", "interactions": "--"}
            for u in (simulation.target_users if isinstance(simulation.target_users, list) else [])
        ]
    })

