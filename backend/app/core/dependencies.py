from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List
from datetime import datetime, timezone
import json

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.models import User, CompanyUser, Company, AuditLog
from app.core.permissions import has_permission

security_bearer = HTTPBearer(auto_error=False)

async def create_audit_entry(
    db: AsyncSession,
    action: str,
    result: str = "SUCCESS",
    user_id: Optional[str] = None,
    company_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[dict] = None
):
    """Helper to record immutable audit log entries."""
    audit = AuditLog(
        action=action,
        result=result,
        user_id=user_id,
        company_id=company_id,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata_json=json.dumps(metadata) if metadata else None,
        timestamp=datetime.now(timezone.utc).replace(tzinfo=None)
    )
    db.add(audit)
    await db.commit()

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Extract authenticated User from JWT token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Missing authentication token"}
        )
    
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or expired session token"}
        )
    
    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "USER_NOT_FOUND", "message": "Authenticated user does not exist"}
        )
    
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_INACTIVE", "message": f"User account is {user.status.lower()}"}
        )
    
    return user

async def get_current_company_membership(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Optional[CompanyUser]:
    """Retrieve active company membership for the user if one exists."""
    result = await db.execute(select(CompanyUser).where(CompanyUser.user_id == user.id))
    membership = result.scalar_one_or_none()
    return membership

async def get_user_role(
    user: User = Depends(get_current_user),
    membership: Optional[CompanyUser] = Depends(get_current_company_membership)
) -> str:
    """Determine effective role: ADMIN or EMPLOYEE if membership exists, otherwise USER."""
    if membership:
        return membership.role
    return "USER"

def require_role(allowed_roles: List[str]):
    """Enforce that the user has one of the required roles."""
    async def role_checker(
        request: Request,
        user: User = Depends(get_current_user),
        membership: Optional[CompanyUser] = Depends(get_current_company_membership),
        db: AsyncSession = Depends(get_db)
    ):
        role = membership.role if membership else "USER"
        if role not in allowed_roles:
            ip = request.client.host if request.client else None
            ua = request.headers.get("user-agent")
            await create_audit_entry(
                db=db,
                action="ACCESS_DENIED",
                result="DENIED",
                user_id=user.id,
                company_id=membership.company_id if membership else None,
                ip_address=ip,
                user_agent=ua,
                metadata={"required_roles": allowed_roles, "actual_role": role, "path": request.url.path}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": f"Role '{role}' is not authorized to access this resource."}
            )
        return role
    return role_checker

def require_permission(permission: str):
    """Enforce granular RBAC permission."""
    async def perm_checker(
        request: Request,
        user: User = Depends(get_current_user),
        membership: Optional[CompanyUser] = Depends(get_current_company_membership),
        db: AsyncSession = Depends(get_db)
    ):
        role = membership.role if membership else "USER"
        if not has_permission(role, permission):
            ip = request.client.host if request.client else None
            ua = request.headers.get("user-agent")
            await create_audit_entry(
                db=db,
                action="ACCESS_DENIED",
                result="DENIED",
                user_id=user.id,
                company_id=membership.company_id if membership else None,
                ip_address=ip,
                user_agent=ua,
                metadata={"required_permission": permission, "role": role, "path": request.url.path}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": f"Permission '{permission}' is required."}
            )
        return True
    return perm_checker

async def validate_tenant_access(
    requested_company_id: str,
    user: User,
    membership: Optional[CompanyUser],
    db: AsyncSession,
    request: Optional[Request] = None
) -> str:
    """
    CRITICAL MULTI-TENANT ISOLATION LAYER:
    - Normal Users (membership is None or account_type == USER) CANNOT access company resources.
    - Company users can ONLY access their own company's resources.
    - Any attempt to cross tenants results in 403 FORBIDDEN and an immutable audit log entry.
    """
    ip = request.client.host if request and request.client else None
    ua = request.headers.get("user-agent") if request else None

    if not membership or user.account_type == "USER":
        await create_audit_entry(
            db=db,
            action="TENANT_VIOLATION_BLOCKED",
            result="DENIED",
            user_id=user.id,
            company_id=requested_company_id,
            ip_address=ip,
            user_agent=ua,
            metadata={"reason": "Normal Users cannot access company resources"}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company resources."}
        )

    if membership.company_id != requested_company_id:
        await create_audit_entry(
            db=db,
            action="CROSS_TENANT_ACCESS_BLOCKED",
            result="DENIED",
            user_id=user.id,
            company_id=membership.company_id,
            resource_type="company",
            resource_id=requested_company_id,
            ip_address=ip,
            user_agent=ua,
            metadata={"user_company": membership.company_id, "target_company": requested_company_id}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Access denied. Cross-tenant access is strictly prohibited."}
        )

    return membership.company_id
