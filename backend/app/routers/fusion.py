"""
CYBERDOME — Multi-Model Detection Fusion Router.
Provides company-isolated multi-signal evidence fusion, unified security state assessment,
and diagnostic health telemetry across Network, IoT, UEBA, and URL detection streams.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List, Dict, Any

from app.core.database import get_db
from app.models.models import User, CompanyUser
from app.models.phase4 import SecurityEvent
from app.services.ml_fusion_service import (
    ml_fusion_service, FusionRequest, FusionAssessment, DetectionEvidence
)
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission
)

router = APIRouter(prefix="/security/fusion", tags=["Multi-Model Detection Fusion"])


@router.get("/health")
async def get_fusion_health(
    user: User = Depends(get_current_user)
):
    """
    Retrieve diagnostic health status of CYBERDOME Module 05 Multi-Model Detection Fusion Engine.
    """
    return success_response(ml_fusion_service.get_health_status())


@router.post("/analyze")
async def analyze_fused_evidence(
    payload: FusionRequest,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db)
):
    """
    Synthesize multiple independent security evidence streams into a unified, explainable assessment.
    Enforces strict zero fake data imputation, temporal correlation, entity correlation,
    and automatic incident correlation.
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access enterprise detection fusion."}
        )

    cid = membership.company_id
    if payload.company_id and payload.company_id != cid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Cannot evaluate telemetry across tenant boundaries."}
        )

    env_tag = (payload.environment or "REAL").upper()

    try:
        assessment = ml_fusion_service.evaluate_fusion(
            evidence_items=payload.evidence_items,
            company_id=cid,
            environment=env_tag
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_FEATURE_VALUE", "message": str(val_err)}
        )

    sec_event = None
    if payload.record_detection and assessment.verdict in ["HIGH_CONFIDENCE_THREAT", "CRITICAL_THREAT", "SUSPICIOUS"]:
        sec_event = await ml_fusion_service.process_and_correlate_fusion_event(
            db=db,
            assessment=assessment,
            source_evidence=payload.evidence_items,
            user_id=user.id
        )

    resp_dict = assessment.model_dump()
    if sec_event:
        resp_dict["security_event_id"] = sec_event.id
        resp_dict["incident_correlated"] = assessment.incident_id is not None

    return success_response(resp_dict)


@router.get("/events")
async def list_fused_events(
    severity: Optional[str] = Query(None),
    verdict: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db)
):
    """
    List historical multi-model fused security detections for authenticated company.
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access enterprise fusion events."}
        )

    cid = membership.company_id
    query = select(SecurityEvent).where(
        SecurityEvent.company_id == cid,
        SecurityEvent.source == "multi_model_fusion"
    )

    if severity:
        query = query.where(SecurityEvent.severity == severity.upper())

    query = query.order_by(SecurityEvent.timestamp.desc()).limit(limit)
    res = await db.execute(query)
    events = res.scalars().all()

    formatted = []
    for ev in events:
        meta = ev.metadata_json or {}
        if verdict and meta.get("verdict", "").upper() != verdict.upper():
            continue
        formatted.append({
            "id": ev.id,
            "eventId": ev.event_id,
            "title": ev.title,
            "description": ev.description,
            "severity": ev.severity,
            "confidence": ev.confidence,
            "verdict": meta.get("verdict", "UNKNOWN"),
            "threatSources": meta.get("threat_sources", []),
            "attackChain": meta.get("attack_chain", []),
            "reasonCodes": meta.get("reason_codes", []),
            "environment": ev.environment,
            "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
        })

    return success_response(formatted)
