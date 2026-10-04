"""
CYBERDOME — Network Sensor & Tap Management Router.
Company-isolated network sensor registration, telemetry collection,
and capture status.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.models import User, CompanyUser
from app.models.phase4 import AgentDevice, NetworkEvent
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission, create_audit_entry
)

router = APIRouter(prefix="/sensors", tags=["Network Sensors"])


class SensorRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    ip_address: Optional[str] = None
    interface: Optional[str] = "eth0"
    mode: Optional[str] = "PROMISCUOUS" # INLINE, TAP, PROMISCUOUS


class SensorTelemetryBatch(BaseModel):
    events: List[dict] = Field(default_factory=list)


@router.get("")
@router.get("/")
async def list_sensors(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """List network probe sensors enrolled in company network."""
    if not membership or user.account_type == "USER":
        raise HTTPException(status_code=403, detail="Forbidden")

    res = await db.execute(
        select(AgentDevice).where(
            AgentDevice.company_id == membership.company_id,
            AgentDevice.os_type == "Sensor"
        )
    )
    sensors = res.scalars().all()
    return success_response([
        {
            "id": s.id,
            "name": s.hostname,
            "ipAddress": s.ip_address,
            "status": s.status,
            "lastSeen": s.last_seen.isoformat() if s.last_seen else None
        }
        for s in sensors
    ])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_sensor(
    data: SensorRegisterRequest,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """Register a new network capture sensor/probe."""
    if not membership or user.account_type == "USER":
        raise HTTPException(status_code=403, detail="Forbidden")

    sensor = AgentDevice(
        company_id=membership.company_id,
        hostname=f"sensor-{data.name.lower().replace(' ', '-')}",
        os_type="Sensor",
        ip_address=data.ip_address,
        status="ONLINE",
        last_seen=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(sensor)
    await db.commit()
    await db.refresh(sensor)

    return success_response({
        "id": sensor.id,
        "name": sensor.hostname,
        "interface": data.interface,
        "status": sensor.status
    })


@router.post("/{sensor_id}/telemetry")
async def ingest_sensor_telemetry_batch(
    sensor_id: str,
    batch: SensorTelemetryBatch,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db),
):
    """Batch ingest parsed network connection flows from sensor."""
    if not membership or user.account_type == "USER":
        raise HTTPException(status_code=403, detail="Forbidden")

    created_events = []
    for item in batch.events[:50]: # Cap batch size
        src = item.get("source_ip") or item.get("sourceIp")
        dst = item.get("dest_ip") or item.get("destIp")
        if src and dst:
            ev = NetworkEvent(
                company_id=membership.company_id,
                source_ip=str(src),
                dest_ip=str(dst),
                protocol=str(item.get("protocol", "TCP")).upper(),
                action=str(item.get("action", "allow")).lower(),
                severity=str(item.get("severity", "INFO")).upper(),
                bytes_in=int(item.get("bytes_in", item.get("bytesIn", 0))),
                bytes_out=int(item.get("bytes_out", item.get("bytesOut", 0))),
                timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
            )
            db.add(ev)
            created_events.append(ev)

    await db.commit()
    return success_response({
        "sensorId": sensor_id,
        "ingestedCount": len(created_events)
    })
