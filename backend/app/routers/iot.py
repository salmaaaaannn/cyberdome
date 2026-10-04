"""
CYBERDOME — IoT & Operational Technology Device Management.
Company-isolated IoT posture monitoring:
Device registration, telemetry, firmware status, anomaly tracking,
and real-time ML inference (Module 02 - CICIoT2023 46-feature benchmark).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Optional, List, Dict, Any

from app.core.database import get_db
from app.models.models import User, CompanyUser
from app.models.phase4 import IoTDevice
from app.schemas.common import success_response
from app.schemas.iot import (
    IoTDeviceCreate,
    IoTDeviceUpdate,
    IoTEventCreate,
    IoTTelemetryAnalyzeRequest,
    IoTMLAnalyzeRequest,
)
from app.services.iot_ml_service import iot_ml_service, IoTFeatureAdapter
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission, create_audit_entry
)
from app.core.websocket import ws_manager

router = APIRouter(prefix="/iot", tags=["IoT Security"])


def _format_iot(d: IoTDevice) -> dict:
    fw = d.firmware or d.firmware_version or "v1.0.0"
    ip = d.ip_address or "N/A"
    return {
        "id": d.id,
        "companyId": d.company_id,
        "deviceIdentifier": d.device_identifier or d.id,
        "name": d.name,
        "deviceType": d.device_type or "SENSOR",
        "type": (d.device_type or "SENSOR").lower(),
        "ipAddress": ip,
        "ip": ip,
        "macAddress": d.mac_address,
        "manufacturer": d.manufacturer or "Industrial Generic",
        "model": d.model or "Edge-IOT",
        "firmwareVersion": fw,
        "firmware": fw,
        "status": d.status or "ONLINE",
        "riskScore": float(d.risk_score or 0.0),
        "anomalies": d.anomalies or 0,
        "lastSeen": d.last_seen.isoformat() if hasattr(d, 'last_seen') and d.last_seen else None,
        "createdAt": d.created_at.isoformat() if hasattr(d, 'created_at') and d.created_at else None,
    }


# ─── Device Inventory Endpoints ────────────────────────────────────────

@router.get("/devices")
async def list_iot_devices(
    status_filter: Optional[str] = Query(None, alias="status"),
    device_type: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """List all registered IoT and OT devices for authenticated company."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company IoT devices."}
        )

    query = select(IoTDevice).where(IoTDevice.company_id == membership.company_id)
    if status_filter:
        query = query.where(IoTDevice.status == status_filter.upper())
    if device_type:
        query = query.where(IoTDevice.device_type == device_type.upper())

    res = await db.execute(query.order_by(IoTDevice.name))
    devices = res.scalars().all()
    return success_response([_format_iot(d) for d in devices])


@router.post("/devices", status_code=status.HTTP_201_CREATED)
async def register_iot_device(
    data: IoTDeviceCreate,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """Register a new IoT device in company inventory."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot register company IoT devices."}
        )

    fw = data.firmware or data.firmware_version or "v1.0.0"
    device = IoTDevice(
        company_id=membership.company_id,
        device_identifier=data.device_identifier or data.mac_address,
        name=data.name.strip(),
        device_type=(data.device_type or "SENSOR").upper(),
        ip_address=data.ip_address.strip() if data.ip_address else None,
        mac_address=data.mac_address.strip().upper() if data.mac_address else None,
        manufacturer=data.manufacturer,
        model=data.model,
        firmware_version=fw,
        firmware=fw,
        status=(data.status or "ONLINE").upper(),
        risk_score=data.risk_score or 0.0,
        anomalies=0,
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)

    # Broadcast via WebSocket
    formatted = _format_iot(device)
    await ws_manager.broadcast_to_company(membership.company_id, "iot_device_updated", formatted)

    # Audit log
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="IOT_DEVICE_REGISTERED",
        result="SUCCESS",
        user_id=user.id,
        company_id=membership.company_id,
        resource_type="iot_device",
        resource_id=device.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"name": device.name, "device_type": device.device_type}
    )

    return success_response(formatted)


@router.get("/devices/{device_id}")
async def get_iot_device(
    device_id: str,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Get full details of a specific IoT device."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company IoT devices."}
        )

    res = await db.execute(
        select(IoTDevice).where(
            IoTDevice.id == device_id,
            IoTDevice.company_id == membership.company_id
        )
    )
    device = res.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "IoT device not found."}
        )

    return success_response(_format_iot(device))


@router.patch("/devices/{device_id}")
async def update_iot_device(
    device_id: str,
    data: IoTDeviceUpdate,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """Update status, firmware version, or anomaly status of an IoT device."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot update company IoT devices."}
        )

    res = await db.execute(
        select(IoTDevice).where(
            IoTDevice.id == device_id,
            IoTDevice.company_id == membership.company_id
        )
    )
    device = res.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "IoT device not found."}
        )

    if data.name is not None:
        device.name = data.name.strip()
    if data.device_type is not None:
        device.device_type = data.device_type.upper()
    if data.ip_address is not None:
        device.ip_address = data.ip_address.strip()
    if data.mac_address is not None:
        device.mac_address = data.mac_address.strip().upper()
    if data.firmware_version is not None:
        device.firmware_version = data.firmware_version.strip()
    if data.status is not None:
        device.status = data.status.upper()
    if data.anomalies is not None:
        device.anomalies = max(0, data.anomalies)

    await db.commit()
    await db.refresh(device)
    return success_response(_format_iot(device))


# ─── Telemetry Ingestion Endpoint ──────────────────────────────────────

@router.post("/events", status_code=status.HTTP_201_CREATED)
async def ingest_iot_event(
    data: IoTEventCreate,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """Ingest IoT telemetry stream event, evaluate detection rules, and correlate incidents."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot ingest company IoT telemetry."}
        )

    from app.services.telemetry.normalizer import TelemetryNormalizer
    from app.services.detection.engine import DetectionEngine
    from app.services.incidents.correlation import IncidentCorrelationEngine
    from datetime import datetime, timezone

    cid = membership.company_id
    dev_id = data.device_id or data.device_identifier

    # Find device if exists
    device = None
    if dev_id:
        res = await db.execute(
            select(IoTDevice).where(
                IoTDevice.company_id == cid,
                (IoTDevice.id == dev_id) | (IoTDevice.device_identifier == dev_id)
            )
        )
        device = res.scalar_one_or_none()

    if device:
        if data.anomalies:
            device.anomalies = (device.anomalies or 0) + data.anomalies
        if data.severity and data.severity.upper() in ["HIGH", "CRITICAL"]:
            device.status = "WARNING"
            device.risk_score = max(device.risk_score or 0.0, 75.0)
        device.last_seen = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()
        await db.refresh(device)
        dev_name = device.name
        dev_type = device.device_type
        target_id = device.id
    else:
        dev_name = data.name or "IoT Sensor"
        dev_type = data.device_type or "SENSOR"
        target_id = dev_id or "iot-unknown"

    # 1. Normalize
    normalized = TelemetryNormalizer.normalize_iot_event(
        company_id=cid,
        device_id=target_id,
        device_name=dev_name,
        device_type=dev_type,
        ip_address=data.ip_address,
        event_type=data.event_type or "iot_telemetry",
        severity=data.severity or "INFO",
        anomalies=data.anomalies or 0,
        firmware=data.firmware,
        raw_data=data.raw_data or data.model_dump(),
    )

    # 2. Evaluate Deterministic Detections
    detections = await DetectionEngine.evaluate_event(db, normalized)

    # 3. Incident Correlation
    if detections:
        await IncidentCorrelationEngine.correlate_detections(db, cid, detections)

    # 4. Module 02 IoT ML Anomaly Detection Pipeline
    env_tag = (data.environment or "REAL").upper()
    raw_dict = data.raw_data if isinstance(data.raw_data, dict) else (data.features or data.model_dump())
    candidate_features = IoTFeatureAdapter.extract_features(data.features or raw_dict)
    ml_analysis_dict = None

    if candidate_features:
        ml_res = iot_ml_service.predict(candidate_features, environment=env_tag)
        if ml_res.status == "SUCCESS":
            ml_analysis_dict = ml_res.model_dump(exclude={"security_event_id", "incident_correlated"})
            if ml_res.is_anomaly or ml_res.is_attack:
                sec_ev = await iot_ml_service.process_and_correlate_iot_ml_event(
                    db=db,
                    company_id=cid,
                    device_id=target_id,
                    device_name=dev_name,
                    analysis=ml_res,
                    device_ip=data.ip_address,
                    environment=env_tag,
                )
                if sec_ev:
                    ml_analysis_dict["security_event_id"] = sec_ev.id
        elif ml_res.status == "INSUFFICIENT_DATA":
            if data.features is not None or "features" in (data.raw_data or {}):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "code": "INSUFFICIENT_DATA",
                        "message": ml_res.error_message,
                        "missing_features": ml_res.missing_features,
                        "available_features": ml_res.available_features,
                        "provided_count": ml_res.received_feature_count,
                        "required_count": ml_res.expected_feature_count,
                        "coverage_ratio": ml_res.coverage_ratio,
                        "rules": "Zero fake feature imputation is enforced. All 46 CICIoT2023 features are required."
                    }
                )
            else:
                ml_analysis_dict = {
                    "status": ml_res.status,
                    "reason": ml_res.error_message,
                    "missing_count": len(ml_res.missing_features) if ml_res.missing_features else 0,
                }
        elif ml_res.status == "ERROR":
            if data.features is not None or "features" in (data.raw_data or {}):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "code": "INVALID_FEATURE_VALUE",
                        "message": ml_res.error_message,
                    }
                )
            else:
                ml_analysis_dict = {
                    "status": ml_res.status,
                    "reason": ml_res.error_message,
                }

    # 5. Broadcast Real-time WebSocket event
    if device:
        await db.refresh(device)
        await ws_manager.broadcast_to_company(cid, "iot_device_updated", _format_iot(device))

    resp_payload = {
        "status": "INGESTED",
        "deviceId": target_id,
        "detectionsCount": len(detections),
        "normalized": normalized
    }
    if ml_analysis_dict is not None:
        resp_payload["mlAnalysis"] = ml_analysis_dict

    return success_response(resp_payload)


# ─── Module 02 ML Inference Endpoints ──────────────────────────────────

@router.get("/ml/health")
async def get_iot_ml_health(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
):
    """Retrieve diagnostic health status of CYBERDOME Module 02 IoT ML models."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access ML health telemetry."}
        )
    return success_response(iot_ml_service.get_health_status())


async def _execute_iot_telemetry_analysis(
    payload: IoTTelemetryAnalyzeRequest,
    user: User,
    membership: CompanyUser,
    db: AsyncSession,
):
    """
    Common handler for IoT telemetry analysis with strict tenant isolation,
    device ownership checks, and 46-feature ML inference.
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot run ML IoT analysis."}
        )

    # 1. Tenant Isolation Verification
    if payload.company_id and payload.company_id != membership.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Cross-company telemetry analysis is prohibited."}
        )

    # 2. Device Ownership Verification
    target_id = payload.device_id or "iot-analyzed"
    target_name = payload.device_name or "IoT Device"
    target_ip = payload.ip_address

    if payload.device_id:
        dev_res = await db.execute(
            select(IoTDevice).where(IoTDevice.id == payload.device_id)
        )
        existing_device = dev_res.scalar_one_or_none()
        if existing_device:
            if existing_device.company_id != membership.company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"code": "FORBIDDEN", "message": "Cross-company device access is prohibited."}
                )
            target_name = existing_device.name
            target_ip = existing_device.ip_address or target_ip

    # 3. Extract Features
    raw_data = payload.telemetry or payload.features
    candidate_features = IoTFeatureAdapter.extract_features(raw_data)
    if candidate_features is None and isinstance(raw_data, dict):
        candidate_features = raw_data
    elif candidate_features is None:
        candidate_features = {}

    # 4. Execute ML Inference
    env_tag = (payload.environment or "REAL").upper()
    result = iot_ml_service.analyze_event(candidate_features, environment=env_tag)

    if result.status == "INSUFFICIENT_DATA":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INSUFFICIENT_DATA",
                "message": result.error_message,
                "missing_features": result.missing_features,
                "available_features": result.available_features,
                "provided_count": result.received_feature_count,
                "required_count": result.expected_feature_count,
                "coverage_ratio": result.coverage_ratio,
                "rules": "Zero fake feature imputation is enforced. All 46 CICIoT2023 features are required."
            }
        )

    if result.status == "ERROR":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_FEATURE_VALUE",
                "message": result.error_message,
            }
        )

    # 5. SecurityEvent Creation and Incident Correlation on Threat
    sec_event = None
    if payload.record_detection and (result.is_anomaly or result.is_attack):
        sec_event = await iot_ml_service.process_and_correlate_iot_ml_event(
            db=db,
            company_id=membership.company_id,
            device_id=target_id,
            device_name=target_name,
            analysis=result,
            device_ip=target_ip,
            environment=env_tag,
        )

    response_dict = result.model_dump(exclude={"security_event_id", "incident_correlated"})
    if sec_event:
        response_dict["security_event_id"] = sec_event.id
        response_dict["incident_correlated"] = True

    return success_response(response_dict)


@router.post("/analyze-telemetry")
async def analyze_iot_telemetry(
    payload: IoTTelemetryAnalyzeRequest,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """
    Execute CYBERDOME Module 02 Machine Learning inference on a 46-feature IoT flow.
    Enforces tenant isolation, device authorization, and strict schema validation.
    """
    return await _execute_iot_telemetry_analysis(payload, user, membership, db)


@router.post("/analyze")
async def analyze_iot_flow_ml(
    payload: IoTTelemetryAnalyzeRequest,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """
    Backward-compatible alias for /analyze-telemetry.
    Executes Module 02 Machine Learning inference on a 46-feature IoT flow.
    """
    return await _execute_iot_telemetry_analysis(payload, user, membership, db)


# ─── Anomalies & Posture Statistics ────────────────────────────────────

@router.get("/anomalies")
async def get_iot_anomalies(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """List IoT devices currently exhibiting behavioral or telemetry anomalies."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company IoT anomalies."}
        )

    res = await db.execute(
        select(IoTDevice).where(
            IoTDevice.company_id == membership.company_id,
            IoTDevice.anomalies > 0
        ).order_by(IoTDevice.anomalies.desc())
    )
    devices = res.scalars().all()
    return success_response([_format_iot(d) for d in devices])


@router.get("/stats")
async def get_iot_statistics(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate posture statistics for all company IoT/OT infrastructure."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company IoT statistics."}
        )

    cid = membership.company_id
    total = await db.scalar(select(func.count(IoTDevice.id)).where(IoTDevice.company_id == cid)) or 0
    online = await db.scalar(
        select(func.count(IoTDevice.id)).where(IoTDevice.company_id == cid, IoTDevice.status == "ONLINE")
    ) or 0
    anomalous = await db.scalar(
        select(func.count(IoTDevice.id)).where(IoTDevice.company_id == cid, IoTDevice.anomalies > 0)
    ) or 0

    return success_response({
        "totalDevices": total,
        "onlineDevices": online,
        "offlineDevices": max(0, total - online),
        "anomalousDevices": anomalous,
        "healthPercentage": round(((total - anomalous) / total * 100), 1) if total > 0 else 100.0,
    })
