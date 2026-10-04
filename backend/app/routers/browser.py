from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import User, CompanyUser
from app.core.dependencies import get_current_user
from app.routers.personal import check_url_safety as internal_check_url_safety, URLCheckRequest
from app.services.ml_url_service import ml_url_service, URLDecisionFusion
from app.schemas.common import success_response

router = APIRouter(prefix="/browser", tags=["Browser Extension"])


class URLMLAnalyzeRequest(BaseModel):
    url: Optional[str] = None
    features: Optional[Dict[str, Any]] = None
    environment: Optional[str] = "REAL"
    record_detection: Optional[bool] = False
    source_ip: Optional[str] = None


@router.get("/ml/health")
async def get_url_ml_health(
    user: User = Depends(get_current_user)
):
    """
    Retrieve diagnostic health status of CYBERDOME Module 04 Phishing & Malicious URL ML models.
    """
    return success_response(ml_url_service.get_health_status())


@router.post("/check-url")
async def check_url(
    data: URLCheckRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check URL safety for the browser extension.
    Delegates to the existing personal URL checking logic with multi-source decision fusion.
    """
    return await internal_check_url_safety(data, request, user, db)


@router.get("/history")
async def get_browser_history(
    limit: int = 50,
    offset: int = 0,
    environment: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve website security assessment history for browser extension.
    """
    from app.routers.personal import get_security_history
    return await get_security_history(limit=limit, offset=offset, environment=environment, user=user, db=db)



@router.post("/analyze")
async def analyze_url_ml(
    payload: URLMLAnalyzeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Execute CYBERDOME Module 04 Machine Learning inference on a URL string or 27-feature vector.
    Evaluates both Isolation Forest (unsupervised) and XGBoost (supervised).
    Strict feature validation: missing features reject with 422 INSUFFICIENT_DATA.
    Rejects non-finite values with 422 INVALID_FEATURE_VALUE.
    """
    if payload.features is None and not payload.url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INSUFFICIENT_DATA",
                "message": "Either 'url' string or 27 'features' dictionary must be provided."
            }
        )

    target = payload.features if payload.features is not None else (payload.url or "")
    env_tag = (payload.environment or "REAL").upper()
    result = ml_url_service.predict(target, environment=env_tag)

    if result.status == "INSUFFICIENT_DATA":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INSUFFICIENT_DATA",
                "message": result.error_message,
                "missing_features": result.missing_features,
                "provided_count": result.features_evaluated,
                "required_count": 27,
                "rules": "Zero fake feature imputation is enforced. All 27 canonical URL features are required."
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
    if payload.record_detection and result.is_malicious:
        # Determine company membership
        comp_res = await db.execute(
            select(CompanyUser).where(CompanyUser.user_id == user.id)
        )
        membership = comp_res.scalar_one_or_none()
        if membership:
            fused_decision = {
                "final_verdict": result.verdict,
                "severity": result.severity,
                "confidence": result.confidence,
                "primary_reason": f"Direct ML analysis flagged URL threat ({result.verdict})",
                "evidence": {"ml": result.model_dump()}
            }
            sec_event = await ml_url_service.process_and_correlate_url_ml_event(
                db=db,
                company_id=membership.company_id,
                url=payload.url or "direct-feature-vector",
                domain=payload.url or "direct-feature-vector",
                analysis=result,
                fused_decision=fused_decision,
                user_id=user.id,
                source_ip=payload.source_ip,
                environment=env_tag,
            )

    resp_dict = result.model_dump()
    if sec_event:
        resp_dict["security_event_id"] = sec_event.id
        resp_dict["incident_correlated"] = True

    return success_response(resp_dict)


url_router = APIRouter(prefix="/url", tags=["URL Scanner & Defense"])


@url_router.post("/analyze")
async def analyze_url_endpoint(
    data: URLCheckRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.services import validate_target
    target_url = (data.url or "").strip()
    valid, domain, cleaned = validate_target(target_url)
    if not valid:
        return success_response({
            "url": target_url,
            "is_malicious": True,
            "verdict": "MALICIOUS",
            "risk_score": 95.0,
            "reason": "SSRF, internal or reserved network target blocked"
        })
    return await internal_check_url_safety(data, request, user, db)
