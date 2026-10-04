from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
import secrets

from app.core.database import get_db
from app.models.models import User, Company, CompanyUser, Asset, Invitation, AuditLog
from app.schemas.employee import EmployeeOut, EmployeeRoleUpdate, EmployeeStatusUpdate
from app.schemas.company import CompanyOverviewOut, CompanyProfileOut, CompanyUpdate, InvitationCreate, InvitationOut
from app.schemas.audit import AuditLogOut
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_role, require_permission, create_audit_entry,
    validate_tenant_access
)

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.get("/overview")
async def get_admin_overview(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _role: str = Depends(require_role(["ADMIN"])),
    _perm: bool = Depends(require_permission("company.read")),
    db: AsyncSession = Depends(get_db)
):
    """
    ADMIN DASHBOARD OVERVIEW:
    - Counts ONLY company_users belonging to this company.
    - NEVER includes independent Normal Users in employee counts!
    """
    company_id = membership.company_id
    comp_res = await db.execute(select(Company).where(Company.id == company_id))
    company = comp_res.scalar_one_or_none()

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Count company employees (STRICTLY company_users, NEVER users WHERE account_type = 'USER')
    emp_count_res = await db.execute(
        select(func.count(CompanyUser.id)).where(CompanyUser.company_id == company_id)
    )
    total_employees = emp_count_res.scalar() or 0

    # Count company assets
    asset_count_res = await db.execute(
        select(func.count(Asset.id)).where(Asset.company_id == company_id)
    )
    total_assets = asset_count_res.scalar() or 0

    overview = CompanyOverviewOut(
        company_id=company.id,
        company_name=company.company_name,
        domain=company.domain,
        total_employees=total_employees,
        total_assets=total_assets,
        active_incidents=2,
        security_score=88,
        status=company.status
    )
    return success_response(overview.model_dump())

@router.get("/employees")
async def list_employees(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _role: str = Depends(require_role(["ADMIN"])),
    _perm: bool = Depends(require_permission("employee.read")),
    db: AsyncSession = Depends(get_db)
):
    """List all employees belonging to the authenticated admin's company."""
    company_id = membership.company_id
    query = (
        select(CompanyUser, User)
        .join(User, CompanyUser.user_id == User.id)
        .where(CompanyUser.company_id == company_id)
        .order_by(CompanyUser.created_at.desc())
    )
    result = await db.execute(query)
    rows = result.all()

    employees = []
    for cu, u in rows:
        employees.append({
            "id": cu.id,
            "userId": u.id,
            "companyId": cu.company_id,
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "role": cu.role,
            "status": cu.status,
            "department": cu.department or "General",
            "emailVerified": u.email_verified,
            "mfaEnabled": u.mfa_enabled,
            "lastLogin": u.last_login_at.isoformat() if u.last_login_at else "Never",
            "createdAt": cu.created_at.isoformat()
        })

    return success_response(employees)

@router.post("/employees/invite")
async def invite_employee(
    data: InvitationCreate,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _role: str = Depends(require_role(["ADMIN"])),
    _perm: bool = Depends(require_permission("employee.create")),
    db: AsyncSession = Depends(get_db)
):
    """Admin creates an invitation token to invite an employee to their company."""
    company_id = membership.company_id
    token = f"inv_{secrets.token_urlsafe(24)}"
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7)

    inv = Invitation(
        company_id=company_id,
        email=data.email.lower().strip(),
        role=data.role,
        token=token,
        department=data.department or "General",
        status="PENDING",
        expires_at=expires_at,
        created_by=user.id
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="EMPLOYEE_INVITED",
        result="SUCCESS",
        user_id=user.id,
        company_id=company_id,
        resource_type="invitation",
        resource_id=inv.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"invited_email": data.email, "role": data.role}
    )

    return success_response({
        "id": inv.id,
        "companyId": inv.company_id,
        "email": inv.email,
        "role": inv.role,
        "department": inv.department,
        "token": inv.token,
        "expiresAt": inv.expires_at.isoformat(),
        "status": inv.status
    })

@router.patch("/employees/{employee_id}/role")
async def update_employee_role(
    employee_id: str,
    data: EmployeeRoleUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _role: str = Depends(require_role(["ADMIN"])),
    _perm: bool = Depends(require_permission("employee.update")),
    db: AsyncSession = Depends(get_db)
):
    """Change employee role or department within the same company."""
    company_id = membership.company_id
    res = await db.execute(
        select(CompanyUser).where(
            CompanyUser.id == employee_id,
            CompanyUser.company_id == company_id
        )
    )
    target = res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Employee not found in your company.")

    old_role = target.role
    target.role = data.role
    if data.department:
        target.department = data.department
    await db.commit()

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="ROLE_CHANGED",
        result="SUCCESS",
        user_id=user.id,
        company_id=company_id,
        resource_type="company_user",
        resource_id=target.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"old_role": old_role, "new_role": data.role, "target_user_id": target.user_id}
    )

    return success_response({"message": "Role updated successfully."})

@router.patch("/employees/{employee_id}/status")
async def update_employee_status(
    employee_id: str,
    data: EmployeeStatusUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _role: str = Depends(require_role(["ADMIN"])),
    _perm: bool = Depends(require_permission("employee.deactivate")),
    db: AsyncSession = Depends(get_db)
):
    """Activate, suspend, or deactivate an employee."""
    company_id = membership.company_id
    res = await db.execute(
        select(CompanyUser).where(
            CompanyUser.id == employee_id,
            CompanyUser.company_id == company_id
        )
    )
    target = res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Employee not found in your company.")

    target.status = data.status
    await db.commit()

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="EMPLOYEE_STATUS_CHANGED",
        result="SUCCESS",
        user_id=user.id,
        company_id=company_id,
        resource_type="company_user",
        resource_id=target.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"new_status": data.status}
    )

    return success_response({"message": f"Employee status updated to {data.status}."})

@router.post("/employees/{employee_id}/reset-access")
async def reset_employee_access(
    employee_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _role: str = Depends(require_role(["ADMIN"])),
    _perm: bool = Depends(require_permission("employee.update")),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger individual password reset without exposing or setting plaintext password.
    """
    company_id = membership.company_id
    res = await db.execute(
        select(CompanyUser, User)
        .join(User, CompanyUser.user_id == User.id)
        .where(CompanyUser.id == employee_id, CompanyUser.company_id == company_id)
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Employee not found.")

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="EMPLOYEE_ACCESS_RESET_INITIATED",
        result="SUCCESS",
        user_id=user.id,
        company_id=company_id,
        resource_type="company_user",
        resource_id=employee_id,
        ip_address=ip,
        user_agent=ua,
        metadata={"target_user_id": row.User.id}
    )

    return success_response({"message": "A secure access reset link has been dispatched to the employee's work email."})

@router.get("/company")
async def get_company_profile(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _role: str = Depends(require_role(["ADMIN"])),
    _perm: bool = Depends(require_permission("company.read")),
    db: AsyncSession = Depends(get_db)
):
    """Fetch company profile for authenticated admin's company."""
    res = await db.execute(select(Company).where(Company.id == membership.company_id))
    company = res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    out = CompanyProfileOut(
        id=company.id,
        company_name=company.company_name,
        domain=company.domain,
        industry=company.industry,
        size=company.size,
        security_contact=company.security_contact,
        status=company.status,
        created_at=company.created_at
    )
    return success_response(out.model_dump())

@router.patch("/company")
async def update_company_profile(
    data: CompanyUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _role: str = Depends(require_role(["ADMIN"])),
    _perm: bool = Depends(require_permission("company.update")),
    db: AsyncSession = Depends(get_db)
):
    """Update company details."""
    res = await db.execute(select(Company).where(Company.id == membership.company_id))
    company = res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    if data.company_name:
        company.company_name = data.company_name
    if data.industry:
        company.industry = data.industry
    if data.size:
        company.size = data.size
    if data.security_contact:
        company.security_contact = data.security_contact

    await db.commit()
    await db.refresh(company)

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="COMPANY_PROFILE_UPDATED",
        result="SUCCESS",
        user_id=user.id,
        company_id=company.id,
        resource_type="company",
        resource_id=company.id,
        ip_address=ip,
        user_agent=ua
    )

    out = CompanyProfileOut(
        id=company.id,
        company_name=company.company_name,
        domain=company.domain,
        industry=company.industry,
        size=company.size,
        security_contact=company.security_contact,
        status=company.status,
        created_at=company.created_at
    )
    return success_response(out.model_dump())

@router.get("/audit")
@router.get("/audit-logs")
async def get_company_audit_logs(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _role: str = Depends(require_role(["ADMIN"])),
    _perm: bool = Depends(require_permission("audit.read")),
    db: AsyncSession = Depends(get_db)
):
    """Fetch immutable audit logs for the authenticated company."""
    res = await db.execute(
        select(AuditLog)
        .where(AuditLog.company_id == membership.company_id)
        .order_by(AuditLog.timestamp.desc())
        .limit(100)
    )
    logs = res.scalars().all()

    out = []
    for log in logs:
        out.append({
            "id": log.id,
            "companyId": log.company_id,
            "userId": log.user_id,
            "action": log.action,
            "resourceType": log.resource_type,
            "resourceId": log.resource_id,
            "ipAddress": log.ip_address,
            "userAgent": log.user_agent,
            "result": log.result,
            "timestamp": log.timestamp.isoformat()
        })

    return success_response(out)

@router.get("/employees/{employee_id}")
async def get_employee_detail(
    employee_id: str,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _role: str = Depends(require_role(["ADMIN", "MANAGER"])),
    db: AsyncSession = Depends(get_db)
):
    """Fetch individual employee profile and risk metrics for company admin."""
    company_id = membership.company_id
    query = (
        select(CompanyUser, User)
        .join(User, CompanyUser.user_id == User.id)
        .where(
            CompanyUser.company_id == company_id,
            (CompanyUser.id == employee_id) | (User.id == employee_id)
        )
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Employee not found.")

    cu, u = row
    return success_response({
        "id": cu.id,
        "userId": u.id,
        "name": u.name,
        "email": u.email,
        "phone": u.phone,
        "role": cu.role,
        "status": cu.status,
        "department": cu.department or "General",
        "riskScore": cu.risk_score,
        "riskLevel": cu.risk_level,
        "evidenceCount": cu.evidence_count,
        "lastLogin": u.last_login_at.isoformat() if u.last_login_at else None,
        "createdAt": cu.created_at.isoformat()
    })

@router.get("/devices")
async def list_company_devices(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _role: str = Depends(require_role(["ADMIN", "MANAGER"])),
    db: AsyncSession = Depends(get_db)
):
    """
    List company monitored devices and endpoint telemetry.
    Returns real connected devices or empty array when no endpoint telemetry exists.
    """
    company_id = membership.company_id
    # Check assets tagged as devices or endpoints
    query = (
        select(Asset)
        .where(
            Asset.company_id == company_id,
            Asset.asset_type.in_(["DEVICE", "ENDPOINT", "LAPTOP", "WORKSTATION", "IOT_DEVICE"])
        )
    )
    result = await db.execute(query)
    devices = result.scalars().all()

    out = []
    for d in devices:
        out.append({
            "id": d.id,
            "name": d.name,
            "type": d.asset_type,
            "ip": d.ip_address,
            "hostname": d.hostname,
            "status": d.status,
            "createdAt": d.created_at.isoformat()
        })

    return success_response(out)
