"""
Phase 2 — Web Scanner API.
Provides company-scoped access to scanner findings (security checks).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional

from app.core.database import get_db
from app.models.models import User, CompanyUser
from app.models.website_security import WebsiteFinding, WebsiteAssessment
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission
)

router = APIRouter(prefix="/scanner", tags=["Web Scanner"])


@router.get("/assessments/{assessment_id}")
async def get_scanner_results(
    assessment_id: str,
    category: Optional[str] = Query(None, description="Filter by category"),
    request: Request = None,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Get scanner findings (security checks) for a specific assessment."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company resources."}
        )

    # Verify assessment belongs to company
    assess_result = await db.execute(
        select(WebsiteAssessment).where(
            WebsiteAssessment.id == assessment_id,
            WebsiteAssessment.company_id == membership.company_id,
        )
    )
    if not assess_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Assessment not found."})

    query = select(WebsiteFinding).where(
        WebsiteFinding.assessment_id == assessment_id,
        WebsiteFinding.company_id == membership.company_id,
    )
    if category:
        query = query.where(WebsiteFinding.category == category.upper())

    result = await db.execute(query.order_by(WebsiteFinding.created_at))
    findings = result.scalars().all()

    # Build checks list (matching frontend WebsiteScanCheck interface)
    checks = []
    finding_details = []
    for f in findings:
        checks.append({
            "id": f.id,
            "name": f.check_name,
            "category": f.category,
            "status": f.check_status,
            "details": f.details or f.evidence or "",
        })

        if f.check_status in ("FAIL", "WARN"):
            finding_details.append({
                "id": f.id,
                "severity": f.severity,
                "title": f.title,
                "whatIsWrong": f.details or "",
                "whyItMatters": f.evidence or "",
                "affectedTarget": f.affected_target or "",
                "evidence": f.evidence,
                "recommendedFix": f.recommendation or "",
                "status": f.status,
                "source": f.source,
            })

    return success_response({
        "checks": checks,
        "findings": finding_details,
    })
