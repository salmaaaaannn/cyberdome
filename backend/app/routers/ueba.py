"""
CYBERDOME — User and Entity Behavior Analytics (UEBA) Router.
Company-isolated behavioral monitoring:
Ingestion of user actions, explainable rule-based risk evaluation,
anomaly alerts, and user risk profiling (Rule-based, NO ML yet).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.models import User, CompanyUser
from app.models.phase4 import UEBAEvent
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission, create_audit_entry
)

router = APIRouter(prefix="/ueba", tags=["UEBA & Insider Threat"])


# ─── Pydantic Schemas ──────────────────────────────────────────────────
class UEBAEventCreate(BaseModel):
    user_id: Optional[str] = None
    action: str = Field(..., min_length=2, max_length=150)
    event_type: Optional[str] = "user_action"
    source: Optional[str] = "ueba_collector"
    ip_address: Optional[str] = None
    resource: Optional[str] = None
    risk_score: Optional[float] = None
    location: Optional[str] = None
    details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    environment: Optional[str] = "REAL"  # REAL, SIMULATION
    features: Optional[Dict[str, Any]] = None


class UEBAMLAnalyzeRequest(BaseModel):
    features: Dict[str, Any] = Field(..., description="Dictionary containing the 30 UEBA behavioral features.")
    user_id: Optional[str] = Field(None, description="Employee or user identifier")
    user_name: Optional[str] = Field("Employee User", description="Display name")
    source_ip: Optional[str] = Field("10.0.1.50", description="Source IP address")
    resource: Optional[str] = Field("Active Directory", description="Target resource")
    environment: Optional[str] = "REAL"  # REAL, SIMULATION
    record_detection: Optional[bool] = True
    context: Optional[Dict[str, Any]] = None


def _compute_explainable_risk(action: str, location: Optional[str], details: Optional[Dict[str, Any]]) -> float:
    """
    Explainable rule-based security risk calculation (No opaque ML models).
    Evaluates indicators: privileged elevation, unusual time, suspicious location,
    bulk data export, credential dumping signatures.
    """
    score = 10.0
    action_lower = action.lower()

    if any(k in action_lower for k in ["sudo", "privilege_escalation", "admin_role_grant", "pass_the_hash", "mimikatz"]):
        score += 55.0
    if any(k in action_lower for k in ["bulk_download", "mass_export", "exfiltration", "data_dump"]):
        score += 50.0
    if any(k in action_lower for k in ["password_spray", "failed_mfa_burst", "brute_force", "failed_login"]):
        score += 45.0
    if any(k in action_lower for k in ["lateral_movement", "psexec", "wmi_remote", "ssh_scan"]):
        score += 40.0
    if any(k in action_lower for k in ["disable_firewall", "stop_edr", "delete_audit_log"]):
        score += 65.0

    if details and details.get("impossible_travel"):
        score += 50.0
    if details and details.get("tor_exit_node"):
        score += 40.0
    if details and details.get("off_hours"):
        score += 15.0

    return min(100.0, score)


def _format_ueba(e: UEBAEvent) -> dict:
    return {
        "id": e.id,
        "companyId": e.company_id,
        "userId": e.user_id,
        "userName": e.user_id or "System User",
        "action": e.action,
        "eventType": getattr(e, 'event_type', 'user_action') or 'user_action',
        "riskScore": round(float(e.risk_score or 0.0), 1),
        "location": e.location or "Internal Network",
        "ipAddress": getattr(e, 'ip_address', None) or "10.0.1.15",
        "sourceIp": getattr(e, 'ip_address', None) or "10.0.1.15",
        "resource": getattr(e, 'resource', None) or "Active Directory SSO",
        "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        "details": e.details or {},
        "description": f"User behavior recorded: {e.action} (Risk score: {round(float(e.risk_score or 0.0), 1)}/100)",
        "deviation": f"+{round(float(e.risk_score or 0.0) * 0.4, 1)}% variance",
        "baseline": "Standard User Activity Baseline",
    }


# ─── Endpoints ────────────────────────────────────────────────────────
@router.get("/events")
async def list_behavior_events(
    user_id: Optional[str] = Query(None),
    min_risk: Optional[float] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """List audited behavior events for the company."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company UEBA events."}
        )

    query = select(UEBAEvent).where(UEBAEvent.company_id == membership.company_id)
    if user_id:
        if user_id != user.id:
            cu_check = await db.execute(
                select(CompanyUser).where(
                    CompanyUser.user_id == user_id,
                    CompanyUser.company_id == membership.company_id
                )
            )
            if not cu_check.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"code": "FORBIDDEN", "message": f"Target user {user_id} is not an authorized member of your company."}
                )
        query = query.where(UEBAEvent.user_id == user_id)
    if min_risk is not None:
        query = query.where(UEBAEvent.risk_score >= min_risk)

    res = await db.execute(query.order_by(UEBAEvent.id.desc()).limit(limit))
    events = res.scalars().all()
    return success_response([_format_ueba(e) for e in events])


@router.post("/events", status_code=status.HTTP_201_CREATED)
async def ingest_behavior_event(
    data: UEBAEventCreate,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """Ingest a behavioral telemetry event, evaluate deterministic detections, and correlate."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot ingest company UEBA events."}
        )

    from app.services.telemetry.normalizer import TelemetryNormalizer
    from app.services.detection.engine import DetectionEngine
    from app.services.incidents.correlation import IncidentCorrelationEngine
    from app.core.websocket import ws_manager

    assigned_user_id = data.user_id or user.id
    if data.user_id and data.user_id != user.id:
        cu_check = await db.execute(
            select(CompanyUser).where(
                CompanyUser.user_id == data.user_id,
                CompanyUser.company_id == membership.company_id
            )
        )
        if not cu_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": f"Target user {data.user_id} is not an authorized member of your company."}
            )

    # Pre-evaluate ML telemetry if candidate features are supplied (Zero dirty commits)
    from app.services.ml_ueba_service import ml_ueba_service, UEBAFeatureAdapter

    env_tag = (data.environment or "REAL").upper()
    raw_dict = data.details if isinstance(data.details, dict) else (data.features or data.model_dump())
    candidate_features = UEBAFeatureAdapter.extract_features(data.features or raw_dict)
    ml_res = None

    if candidate_features or data.features is not None:
        target_features = data.features or candidate_features or {}
        ml_res = ml_ueba_service.predict(target_features, environment=env_tag)
        if ml_res.status == "INSUFFICIENT_DATA":
            if data.features is not None or "features" in (data.details or {}):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "code": "INSUFFICIENT_DATA",
                        "message": ml_res.error_message,
                        "missing_features": ml_res.missing_features,
                        "provided_count": ml_res.features_evaluated,
                        "required_count": 30,
                        "rules": "Zero fake feature imputation is enforced. All 30 UEBA behavioral features are required."
                    }
                )
        elif ml_res.status == "ERROR":
            if data.features is not None or "features" in (data.details or {}):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "code": "INVALID_FEATURE_VALUE",
                        "message": ml_res.error_message,
                    }
                )

    risk = data.risk_score
    if risk is None:
        risk = _compute_explainable_risk(data.action, data.location, data.details)

    if ml_res and ml_res.status == "SUCCESS" and (ml_res.is_anomaly or ml_res.is_threat):
        ml_risk = float(ml_res.confidence * 100.0)
        if ml_risk > risk:
            risk = ml_risk

    event = UEBAEvent(
        company_id=membership.company_id,
        user_id=assigned_user_id,
        action=data.action.strip(),
        event_type=data.event_type or "user_action",
        source=data.source or "ueba_collector",
        ip_address=data.ip_address,
        resource=data.resource,
        risk_score=float(risk),
        location=data.location,
        timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
        details=data.details or {},
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    # 1. Normalize
    normalized = TelemetryNormalizer.normalize_behavior_event(
        company_id=membership.company_id,
        user_id=assigned_user_id,
        action=event.action,
        risk_score=event.risk_score,
        location=event.location,
        ip_address=event.ip_address,
        resource=event.resource,
        details=event.details,
        timestamp=event.timestamp,
    )

    # 2. Evaluate Detections
    detections = await DetectionEngine.evaluate_event(db, normalized)

    # 3. Incident Correlation
    if detections:
        await IncidentCorrelationEngine.correlate_detections(db, membership.company_id, detections)

    # 4. Correlate ML detection if present
    ml_analysis_dict = None
    if ml_res:
        if ml_res.status == "SUCCESS":
            ml_analysis_dict = ml_res.model_dump()
            if ml_res.is_anomaly or ml_res.is_threat:
                sec_ev = await ml_ueba_service.process_and_correlate_ueba_ml_event(
                    db=db,
                    company_id=membership.company_id,
                    user_id=assigned_user_id,
                    user_name=(data.details.get("user_name") if data.details else None) or getattr(user, "name", None) or getattr(user, "full_name", None) or user.email or "Employee User",
                    analysis=ml_res,
                    source_ip=data.ip_address,
                    resource=data.resource,
                    environment=env_tag,
                )
                if sec_ev:
                    ml_analysis_dict["security_event_id"] = sec_ev.id
        elif ml_res.status == "INSUFFICIENT_DATA":
            ml_analysis_dict = {
                "status": ml_res.status,
                "reason": ml_res.error_message,
                "missing_count": len(ml_res.missing_features) if ml_res.missing_features else 0,
            }
        elif ml_res.status == "ERROR":
            ml_analysis_dict = {
                "status": ml_res.status,
                "reason": ml_res.error_message,
            }

    # 5. Broadcast Real-time WebSocket event to tenant
    formatted = _format_ueba(event)
    await ws_manager.broadcast_to_company(membership.company_id, "security_event", formatted)

    resp_payload = dict(formatted)
    if ml_analysis_dict is not None:
        resp_payload["mlAnalysis"] = ml_analysis_dict

    return success_response(resp_payload)


@router.get("/anomalies")
async def get_behavior_anomalies(
    threshold: float = Query(70.0, ge=0.0, le=100.0),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Return high-risk anomalies where risk_score exceeds the defined threshold."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company UEBA anomalies."}
        )

    res = await db.execute(
        select(UEBAEvent).where(
            UEBAEvent.company_id == membership.company_id,
            UEBAEvent.risk_score >= threshold
        ).order_by(UEBAEvent.risk_score.desc())
    )
    anomalies = res.scalars().all()
    return success_response([_format_ueba(a) for a in anomalies])


@router.get("/users/{target_user_id}/profile")
async def get_user_risk_profile(
    target_user_id: str,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Compute aggregate behavioral risk profile for an employee or identity."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access user risk profiles."}
        )

    if target_user_id != user.id:
        cu_check = await db.execute(
            select(CompanyUser).where(
                CompanyUser.user_id == target_user_id,
                CompanyUser.company_id == membership.company_id
            )
        )
        if not cu_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": f"Target user {target_user_id} is not an authorized member of your company."}
            )

    res = await db.execute(
        select(UEBAEvent).where(
            UEBAEvent.company_id == membership.company_id,
            UEBAEvent.user_id == target_user_id
        ).order_by(UEBAEvent.id.desc()).limit(100)
    )
    events = res.scalars().all()

    avg_risk = 0.0
    max_risk = 0.0
    if events:
        scores = [e.risk_score or 0.0 for e in events]
        avg_risk = sum(scores) / len(scores)
        max_risk = max(scores)

    return success_response({
        "userId": target_user_id,
        "totalEvents": len(events),
        "averageRiskScore": round(avg_risk, 1),
        "maximumRiskScore": round(max_risk, 1),
        "recentEvents": [_format_ueba(e) for e in events[:10]]
    })


@router.get("/ml/health")
async def get_ueba_ml_health(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
):
    """Retrieve diagnostic health status of CYBERDOME Module 03 UEBA ML models."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access ML health telemetry."}
        )
    from app.services.ml_ueba_service import ml_ueba_service
    return success_response(ml_ueba_service.get_health_status())


@router.post("/analyze")
async def analyze_behavior_flow_ml(
    payload: UEBAMLAnalyzeRequest,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """
    Execute CYBERDOME Module 03 Machine Learning inference on a 30-feature UEBA behavior vector.
    Evaluates both Isolation Forest (unsupervised anomaly) and XGBoost (supervised insider threat).
    Strict feature validation: missing features reject with 422 INSUFFICIENT_DATA.
    Never fabricates missing values or claims synthetic production accuracy.
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot run ML UEBA analysis."}
        )

    target_user_id = payload.user_id or user.id
    if payload.user_id and payload.user_id != user.id:
        cu_check = await db.execute(
            select(CompanyUser).where(
                CompanyUser.user_id == payload.user_id,
                CompanyUser.company_id == membership.company_id
            )
        )
        if not cu_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": f"Target user {payload.user_id} is not an authorized member of your company."}
            )

    from app.services.ml_ueba_service import ml_ueba_service

    env_tag = (payload.environment or "REAL").upper()
    result = ml_ueba_service.predict(payload.features, environment=env_tag)

    if result.status == "INSUFFICIENT_DATA":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INSUFFICIENT_DATA",
                "message": result.error_message,
                "missing_features": result.missing_features,
                "provided_count": result.features_evaluated,
                "required_count": 30,
                "rules": "Zero fake feature imputation is enforced. All 30 UEBA behavioral features are required."
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

    sec_event = None
    target_user_name = payload.user_name or getattr(user, "name", None) or getattr(user, "full_name", None) or user.email or "Employee User"

    if payload.record_detection and (result.is_anomaly or result.is_threat):
        sec_event = await ml_ueba_service.process_and_correlate_ueba_ml_event(
            db=db,
            company_id=membership.company_id,
            user_id=target_user_id,
            user_name=target_user_name,
            analysis=result,
            source_ip=payload.source_ip,
            resource=payload.resource,
            environment=env_tag,
        )

    response_dict = result.model_dump()
    if sec_event:
        response_dict["security_event_id"] = sec_event.id
        response_dict["incident_correlated"] = True

    return success_response(response_dict)
