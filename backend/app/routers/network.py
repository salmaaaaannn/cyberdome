"""
CYBERDOME — Network Security & Telemetry Router.
Company-isolated network monitoring:
Events ingestion, active connections, alerts, protocol statistics,
and dynamic topological network mapping.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.models import User, CompanyUser, Asset
from app.models.phase4 import NetworkEvent
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission, create_audit_entry
)

router = APIRouter(prefix="/network", tags=["Network Security"])


# ─── Pydantic Schemas ──────────────────────────────────────────────────
class NetworkEventCreate(BaseModel):
    source_ip: str = Field(..., min_length=7, max_length=45)
    dest_ip: Optional[str] = Field(None, min_length=7, max_length=45)
    destination_ip: Optional[str] = Field(None, min_length=7, max_length=45)
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    protocol: Optional[str] = "TCP"
    direction: Optional[str] = "INBOUND"
    bytes: Optional[int] = None
    packets: Optional[int] = 0
    event_type: Optional[str] = "network_flow"
    source: Optional[str] = "network_sensor"
    action: Optional[str] = "allow" # alert, block, allow
    severity: Optional[str] = "INFO" # INFO, LOW, MEDIUM, HIGH, CRITICAL
    signature: Optional[str] = None
    bytes_in: Optional[int] = 0
    bytes_out: Optional[int] = 0
    raw_data: Optional[Dict[str, Any]] = None
    environment: Optional[str] = "REAL" # REAL, SIMULATION


class NetworkMLAnalyzeRequest(BaseModel):
    features: Dict[str, Any] = Field(..., description="Dictionary containing the 77 CIC-IDS2017 features.")
    source_ip: Optional[str] = Field("192.168.1.100", min_length=7, max_length=45)
    dest_ip: Optional[str] = Field("10.0.0.1", min_length=7, max_length=45)
    protocol: Optional[str] = "TCP"
    environment: Optional[str] = "REAL" # REAL, SIMULATION
    record_detection: Optional[bool] = True
    context: Optional[Dict[str, Any]] = None


def _format_event(e: NetworkEvent) -> dict:
    target_dest = e.destination_ip or e.dest_ip
    b_in = e.bytes_in or 0
    b_out = e.bytes_out or 0
    total_bytes = e.bytes if e.bytes is not None else (b_in + b_out)
    raw = e.raw_data if isinstance(e.raw_data, dict) else {}
    return {
        "id": e.id,
        "companyId": e.company_id,
        "sourceIp": e.source_ip,
        "destIp": target_dest,
        "destinationIp": target_dest,
        "sourcePort": e.source_port,
        "destPort": e.destination_port,
        "destinationPort": e.destination_port,
        "protocol": e.protocol or "TCP",
        "direction": e.direction or "INBOUND",
        "action": e.action or "allow",
        "severity": e.severity or "INFO",
        "environment": getattr(e, "environment", "REAL") or "REAL",
        "signature": e.signature,
        "bytes": total_bytes,
        "bytesIn": b_in,
        "bytesOut": b_out,
        "packets": e.packets or 0,
        "eventType": e.event_type or "traffic_flow",
        "source": e.source or "network_sensor",
        "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        "createdAt": e.created_at.isoformat() if hasattr(e, 'created_at') and e.created_at else None,
        "mlAnalysis": raw.get("ml_analysis"),
    }


# ─── Endpoints ────────────────────────────────────────────────────────
@router.get("/events")
async def get_network_events(
    action: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    protocol: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve telemetry network events for authenticated company."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company network events."}
        )

    query = select(NetworkEvent).where(NetworkEvent.company_id == membership.company_id)
    if action:
        query = query.where(NetworkEvent.action == action.lower())
    if severity:
        query = query.where(NetworkEvent.severity == severity.upper())
    if protocol:
        query = query.where(NetworkEvent.protocol == protocol.upper())

    query = query.order_by(NetworkEvent.id.desc()).limit(limit)
    res = await db.execute(query)
    events = res.scalars().all()
    return success_response([_format_event(e) for e in events])


@router.post("/events", status_code=status.HTTP_201_CREATED)
async def ingest_network_event(
    data: NetworkEventCreate,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """Ingest a network event from authorized sensor, normalize, evaluate detections, and correlate."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot ingest company network telemetry."}
        )

    from app.services.telemetry.normalizer import TelemetryNormalizer
    from app.services.detection.engine import DetectionEngine
    from app.services.incidents.correlation import IncidentCorrelationEngine
    from app.core.websocket import ws_manager

    target_dest = (data.dest_ip or data.destination_ip or "").strip()
    if not target_dest:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "VALIDATION_ERROR", "message": "Destination IP must be provided (dest_ip or destination_ip)."}
        )

    b_in = data.bytes_in or 0
    b_out = data.bytes_out or 0
    total_b = data.bytes if data.bytes is not None else (b_in + b_out)

    env_tag = (data.environment or "REAL").upper()

    event = NetworkEvent(
        company_id=membership.company_id,
        source_ip=data.source_ip.strip(),
        dest_ip=target_dest,
        destination_ip=target_dest,
        source_port=data.source_port,
        destination_port=data.destination_port,
        protocol=data.protocol.upper() if data.protocol else "TCP",
        direction=data.direction.upper() if data.direction else "INBOUND",
        bytes=total_b,
        packets=data.packets or 0,
        event_type=data.event_type or "traffic_flow",
        severity=data.severity.upper() if data.severity else "INFO",
        source=data.source or "network_sensor",
        action=data.action.lower() if data.action else "allow",
        signature=data.signature.strip() if data.signature else None,
        bytes_in=b_in,
        bytes_out=b_out,
        raw_data=data.raw_data or data.model_dump(),
        environment=env_tag,
        timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    # 1. Normalize
    normalized = TelemetryNormalizer.normalize_network_event(
        company_id=membership.company_id,
        source_ip=event.source_ip,
        dest_ip=event.dest_ip,
        protocol=event.protocol,
        action=event.action,
        severity=event.severity,
        source_port=event.source_port,
        dest_port=event.destination_port,
        bytes_count=event.bytes,
        packets=event.packets,
        signature=event.signature,
        raw_data=event.raw_data,
        timestamp=event.timestamp,
    )
    event.normalized_data = normalized
    await db.commit()

    # 2. Deterministic Detection Engine
    detections = await DetectionEngine.evaluate_event(db, normalized)

    # 3. Incident Correlation Engine
    if detections:
        await IncidentCorrelationEngine.correlate_detections(db, membership.company_id, detections)

    # 4. Module 01 Network Anomaly Detection ML Pipeline
    from app.services.ml_network_service import ml_network_service, NetworkFeatureAdapter

    raw_dict = event.raw_data if isinstance(event.raw_data, dict) else {}
    candidate_features = NetworkFeatureAdapter.extract_features(raw_dict)

    if candidate_features:
        ml_res = ml_network_service.predict(candidate_features, environment=env_tag)
        if ml_res.status == "SUCCESS":
            ml_analysis_dict = ml_res.model_dump()
            if ml_res.is_anomaly or ml_res.is_attack:
                sec_ev = await ml_network_service.process_and_correlate_ml_event(
                    db=db,
                    company_id=membership.company_id,
                    event_id=event.id,
                    source_ip=event.source_ip,
                    dest_ip=event.dest_ip,
                    analysis=ml_res,
                    raw_payload=raw_dict,
                    environment=env_tag,
                )
                if sec_ev:
                    ml_analysis_dict["security_event_id"] = sec_ev.id
            raw_dict["ml_analysis"] = ml_analysis_dict
        else:
            raw_dict["ml_analysis"] = {
                "status": ml_res.status,
                "reason": ml_res.error_message,
                "missing_count": len(ml_res.missing_features) if ml_res.missing_features else 0,
            }
        from sqlalchemy.orm.attributes import flag_modified
        event.raw_data = dict(raw_dict)
        flag_modified(event, "raw_data")
        await db.commit()

    # 5. Broadcast Real-time WebSocket event to tenant
    formatted = _format_event(event)
    await ws_manager.broadcast_to_company(membership.company_id, "network_event", formatted)

    return success_response(formatted)


@router.get("/ml/health")
async def get_network_ml_health(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
):
    """Retrieve diagnostic health status of CYBERDOME Module 01 Network ML models."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access ML health telemetry."}
        )
    from app.services.ml_network_service import ml_network_service
    return success_response(ml_network_service.get_health_status())


@router.post("/analyze")
async def analyze_network_flow_ml(
    payload: NetworkMLAnalyzeRequest,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """
    Execute CYBERDOME Module 01 Machine Learning inference on a 77-feature network flow.
    Evaluates both Isolation Forest (unsupervised) and XGBoost (supervised).
    Strict feature validation: missing features reject with 422 INSUFFICIENT_DATA.
    Never fabricates missing values or claims synthetic production accuracy.
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot run ML network analysis."}
        )

    from app.services.ml_network_service import ml_network_service

    env_tag = (payload.environment or "REAL").upper()
    result = ml_network_service.predict(payload.features, environment=env_tag)

    if result.status == "INSUFFICIENT_DATA":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INSUFFICIENT_DATA",
                "message": result.error_message,
                "missing_features": result.missing_features,
                "provided_count": result.features_evaluated,
                "required_count": 77,
                "rules": "Zero fake feature imputation is enforced. All 77 CIC-IDS2017 features are required."
            }
        )

    if result.status == "ERROR":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "ML_EVALUATION_ERROR",
                "message": result.error_message,
            }
        )

    sec_event = None
    if payload.record_detection and (result.is_anomaly or result.is_attack):
        sec_event = await ml_network_service.process_and_correlate_ml_event(
            db=db,
            company_id=membership.company_id,
            event_id=None,
            source_ip=payload.source_ip or "192.168.1.100",
            dest_ip=payload.dest_ip or "10.0.0.1",
            analysis=result,
            raw_payload={"features_count": len(payload.features), "context": payload.context},
            environment=env_tag,
        )

    response_data = result.model_dump()
    if sec_event:
        response_data["security_event_id"] = sec_event.id

    return success_response(response_data)


@router.get("/alerts")
async def get_network_alerts(
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve security alerts detected in network traffic."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company network alerts."}
        )

    query = select(NetworkEvent).where(
        NetworkEvent.company_id == membership.company_id,
        (NetworkEvent.action == "alert") | (NetworkEvent.severity.in_(["HIGH", "CRITICAL"]))
    ).order_by(NetworkEvent.id.desc()).limit(limit)

    res = await db.execute(query)
    alerts = res.scalars().all()
    return success_response([_format_event(a) for a in alerts])


@router.get("/topology")
async def get_network_topology(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """
    Build real network topology from real company assets and active connections.
    Empty database returns empty nodes list (no fabricated nodes).
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company network topology."}
        )

    # 1. Fetch real assets
    asset_res = await db.execute(
        select(Asset).where(Asset.company_id == membership.company_id)
    )
    assets = asset_res.scalars().all()

    # 2. Fetch recent network events to map connections
    ev_res = await db.execute(
        select(NetworkEvent).where(NetworkEvent.company_id == membership.company_id).limit(100)
    )
    events = ev_res.scalars().all()

    # Map nodes
    import math
    nodes = []
    total = len(assets)
    ip_to_node_id = {}

    for i, a in enumerate(assets):
        angle = (i * 2 * math.pi) / total if total > 0 else 0
        node = {
            "id": a.id,
            "label": a.name,
            "type": a.asset_type.lower() if a.asset_type else "workstation",
            "ip": a.ip_address or a.hostname or "N/A",
            "status": "online" if a.status == "ACTIVE" else "offline",
            "x": math.cos(angle) * 280 + 400 if total > 0 else 400,
            "y": math.sin(angle) * 280 + 300 if total > 0 else 300,
            "connections": [],
        }
        nodes.append(node)
        if a.ip_address:
            ip_to_node_id[a.ip_address] = a.id

    # Add observed connections from network events
    connections = []
    seen_conns = set()
    for ev in events:
        src_id = ip_to_node_id.get(ev.source_ip)
        dst_id = ip_to_node_id.get(ev.dest_ip)
        if src_id and dst_id and src_id != dst_id:
            pair_key = tuple(sorted([src_id, dst_id]))
            if pair_key not in seen_conns:
                seen_conns.add(pair_key)
                connections.append({
                    "source": src_id,
                    "target": dst_id,
                    "protocol": ev.protocol,
                    "action": ev.action,
                })
                # Add to node connection lists
                for n in nodes:
                    if n["id"] == src_id and dst_id not in n["connections"]:
                        n["connections"].append(dst_id)
                    elif n["id"] == dst_id and src_id not in n["connections"]:
                        n["connections"].append(src_id)

    return success_response({
        "nodes": nodes,
        "connections": connections,
        "totalAssets": len(assets),
        "activeConnections": len(connections),
    })


@router.get("/stats")
async def get_network_statistics(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregated network telemetry statistics."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company network stats."}
        )

    cid = membership.company_id
    total_events = await db.scalar(
        select(func.count(NetworkEvent.id)).where(NetworkEvent.company_id == cid)
    ) or 0

    total_bytes_in = await db.scalar(
        select(func.sum(NetworkEvent.bytes_in)).where(NetworkEvent.company_id == cid)
    ) or 0

    total_bytes_out = await db.scalar(
        select(func.sum(NetworkEvent.bytes_out)).where(NetworkEvent.company_id == cid)
    ) or 0

    total_alerts = await db.scalar(
        select(func.count(NetworkEvent.id)).where(
            NetworkEvent.company_id == cid,
            (NetworkEvent.action == "alert") | (NetworkEvent.severity.in_(["HIGH", "CRITICAL"]))
        )
    ) or 0

    return success_response({
        "totalEvents": total_events,
        "totalBytesIn": total_bytes_in,
        "totalBytesOut": total_bytes_out,
        "totalAlerts": total_alerts,
        "isRealData": True
    })
