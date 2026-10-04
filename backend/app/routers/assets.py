from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.models import User, CompanyUser, Asset
from app.schemas.asset import AssetCreate, AssetUpdate, AssetOut
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission, validate_tenant_access, create_audit_entry
)

router = APIRouter(prefix="/assets", tags=["Enterprise Assets"])

@router.get("")
async def get_company_assets(
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db)
):
    """
    List assets belonging strictly to the authenticated company.
    Normal Users are rejected with 403 FORBIDDEN.
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company resources."}
        )

    res = await db.execute(
        select(Asset).where(Asset.company_id == membership.company_id).order_by(Asset.created_at.desc())
    )
    assets = res.scalars().all()

    out = []
    for a in assets:
        out.append({
            "id": a.id,
            "companyId": a.company_id,
            "name": a.name,
            "assetType": a.asset_type,
            "hostname": a.hostname,
            "ipAddress": a.ip_address,
            "domain": a.domain,
            "status": a.status,
            "criticality": a.criticality,
            "description": a.description,
            "createdAt": a.created_at.isoformat()
        })

    return success_response(out)

@router.get("/{asset_id}")
async def get_asset_by_id(
    asset_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db)
):
    """
    CRITICAL TENANT VALIDATION:
    - Verifies the requested asset belongs strictly to user's company.
    - If asset belongs to Company B and user is from Company A -> 403 FORBIDDEN!
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company resources."}
        )

    res = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = res.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    # Cross-tenant check
    await validate_tenant_access(
        requested_company_id=asset.company_id,
        user=user,
        membership=membership,
        db=db,
        request=request
    )

    return success_response({
        "id": asset.id,
        "companyId": asset.company_id,
        "name": asset.name,
        "assetType": asset.asset_type,
        "hostname": asset.hostname,
        "ipAddress": asset.ip_address,
        "domain": asset.domain,
        "status": asset.status,
        "criticality": asset.criticality,
        "description": asset.description,
        "createdAt": asset.created_at.isoformat()
    })

@router.post("")
async def create_asset(
    data: AssetCreate,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.create")),
    db: AsyncSession = Depends(get_db)
):
    """Create a company-owned asset attached to user's company_id."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company resources."}
        )

    asset = Asset(
        company_id=membership.company_id,
        name=data.name.strip(),
        asset_type=data.asset_type.upper(),
        hostname=data.hostname,
        ip_address=data.ip_address,
        domain=data.domain,
        status=data.status or "ACTIVE",
        criticality=data.criticality or "HIGH",
        description=data.description
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="ASSET_CREATED",
        result="SUCCESS",
        user_id=user.id,
        company_id=membership.company_id,
        resource_type="asset",
        resource_id=asset.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"asset_name": asset.name, "type": asset.asset_type}
    )

    return success_response({
        "id": asset.id,
        "companyId": asset.company_id,
        "name": asset.name,
        "assetType": asset.asset_type,
        "hostname": asset.hostname,
        "ipAddress": asset.ip_address,
        "domain": asset.domain,
        "status": asset.status,
        "criticality": asset.criticality,
        "description": asset.description,
        "createdAt": asset.created_at.isoformat()
    })
