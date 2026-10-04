"""
Phase 2 — Attack Surface API.
Provides company-scoped access to discovered assets from website assessments.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Optional

from app.core.database import get_db
from app.models.models import User, CompanyUser
from app.models.website_security import DiscoveredAsset, WebsiteAssessment
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission
)

router = APIRouter(prefix="/attack-surface", tags=["Attack Surface"])


@router.get("/assessments/{assessment_id}")
async def get_attack_surface_for_assessment(
    assessment_id: str,
    asset_type: Optional[str] = Query(None, description="Filter by asset type"),
    request: Request = None,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Get attack surface (discovered assets) for a specific assessment."""
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

    query = select(DiscoveredAsset).where(
        DiscoveredAsset.assessment_id == assessment_id,
        DiscoveredAsset.company_id == membership.company_id,
    )
    if asset_type:
        query = query.where(DiscoveredAsset.asset_type == asset_type.upper())

    result = await db.execute(query.order_by(DiscoveredAsset.created_at))
    assets = result.scalars().all()

    # Format to match frontend ObservableAsset interface
    out = []
    for a in assets:
        out.append({
            "id": a.id,
            "type": a.asset_type.lower(),
            "name": a.name,
            "target": a.hostname or a.domain or a.ip_address or a.name,
            "details": a.details or "",
            "port": a.port,
            "protocol": a.protocol,
            "exposure": a.exposure,
            "discoveredAt": a.first_seen.isoformat(),
        })

    return success_response(out)


@router.get("/summary")
async def get_attack_surface_summary(
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Get attack surface summary across all company assessments."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company resources."}
        )

    # Count by type
    type_counts = await db.execute(
        select(DiscoveredAsset.asset_type, func.count(DiscoveredAsset.id))
        .where(DiscoveredAsset.company_id == membership.company_id)
        .group_by(DiscoveredAsset.asset_type)
    )

    counts = {row[0]: row[1] for row in type_counts}
    total = sum(counts.values())

    return success_response({
        "totalAssets": total,
        "byType": counts,
        "companyId": membership.company_id,
    })
