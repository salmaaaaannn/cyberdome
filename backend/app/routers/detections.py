"""
CYBERDOME — Detection Rules & Security Detections Router.
Company-isolated retrieval of detection rules, active security events,
and custom tenant-specific rule authoring.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.models import User, CompanyUser
from app.models.phase4 import DetectionRule, SecurityEvent
from app.services.detection.engine import BASELINE_RULES
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission, create_audit_entry
)

router = APIRouter(prefix="/detection-rules", tags=["Detection Rules & Alerts"])

class DetectionRuleCreate(BaseModel):
    rule_id: str = Field(..., min_length=3, max_length=100)
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    severity: str = Field(default="MEDIUM")
    event_type: str = Field(default="network") # network, iot, ueba, auth
    conditions: Dict[str, Any] = Field(default_factory=dict)
    is_enabled: bool = True

def _format_rule(r: Any) -> dict:
    if isinstance(r, dict):
        return {
            "id": r.get("rule_id"),
            "ruleId": r.get("rule_id"),
            "name": r.get("name"),
            "description": r.get("description"),
            "severity": r.get("severity"),
            "eventType": r.get("event_type"),
            "status": "active" if r.get("is_enabled", True) else "disabled",
            "conditions": r.get("conditions", {}),
            "hits": 0,
            "source": "CYBERDOME SIGMA",
            "tags": [r.get("event_type", "general"), r.get("severity", "MEDIUM").lower()],
            "rule": f"detection:\n  condition: deterministic\n  event_type: {r.get('event_type')}\n  severity: {r.get('severity')}"
        }
    return {
        "id": r.id,
        "ruleId": r.rule_id,
        "name": r.name,
        "description": r.description,
        "severity": r.severity,
        "eventType": r.event_type,
        "status": "active" if r.is_enabled else "disabled",
        "conditions": r.conditions or {},
        "hits": 0,
        "source": "CYBERDOME SIGMA",
        "tags": [r.event_type, r.severity.lower()],
        "rule": f"detection:\n  condition: deterministic\n  event_type: {r.event_type}\n  severity: {r.severity}"
    }

def _format_detection(d: SecurityEvent) -> dict:
    return {
        "id": d.id,
        "eventId": d.event_id,
        "ruleId": d.rule_id,
        "title": d.title,
        "description": d.description,
        "severity": d.severity,
        "confidence": d.confidence,
        "source": d.source,
        "entityType": d.entity_type,
        "entityId": d.entity_id,
        "riskScore": d.risk_score,
        "timestamp": d.timestamp.isoformat() if d.timestamp else None,
        "metadata": d.metadata_json or {},
    }

@router.get("")
@router.get("/")
async def list_detection_rules(
    event_type: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """List all global and tenant-specific detection rules."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access detection rules."}
        )

    cid = membership.company_id
    query = select(DetectionRule).where(
        (DetectionRule.company_id == cid) | (DetectionRule.company_id.is_(None))
    )
    if event_type:
        query = query.where(DetectionRule.event_type == event_type.lower())

    res = await db.execute(query.order_by(DetectionRule.name))
    rules = res.scalars().all()

    if not rules:
        # Return standard baseline rules
        formatted = [_format_rule(r) for r in BASELINE_RULES]
    else:
        formatted = [_format_rule(r) for r in rules]

    return success_response(formatted)

@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_detection_rule(
    data: DetectionRuleCreate,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new custom detection rule for authenticated company."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot create detection rules."}
        )

    rule = DetectionRule(
        company_id=membership.company_id,
        rule_id=data.rule_id.strip(),
        name=data.name.strip(),
        description=data.description,
        severity=data.severity.upper(),
        event_type=data.event_type.lower(),
        conditions=data.conditions,
        is_enabled=data.is_enabled,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)

    await create_audit_entry(
        db=db,
        action="DETECTION_RULE_CREATED",
        result="SUCCESS",
        user_id=user.id,
        company_id=membership.company_id,
        resource_type="detection_rule",
        resource_id=rule.id,
        metadata={"rule_id": rule.rule_id, "name": rule.name}
    )

    return success_response(_format_rule(rule))

# Sub-router for detections under /detections
detections_router = APIRouter(prefix="/detections", tags=["Detections & Security Events"])

@detections_router.get("")
@detections_router.get("/")
async def list_security_detections(
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """List historical security events and detections for authenticated company."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access security detections."}
        )

    query = select(SecurityEvent).where(SecurityEvent.company_id == membership.company_id)
    if severity:
        query = query.where(SecurityEvent.severity == severity.upper())

    query = query.order_by(SecurityEvent.timestamp.desc()).limit(limit)
    res = await db.execute(query)
    events = res.scalars().all()
    return success_response([_format_detection(e) for e in events])
