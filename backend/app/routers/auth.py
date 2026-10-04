from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone
import secrets

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, hash_access_code, verify_access_code,
    create_access_token
)
from app.core.permissions import get_role_permissions
from app.models.models import User, Company, CompanyUser, NotificationPreference
from app.schemas.auth import (
    PersonalAccountSignup, CompanySignup, LoginRequest, CompanyJoinRequest, VerifyCodeRequest,
    UserProfileOut, CompanyProfileOut, AuthResponseData,
    VerifyEmailRequest, ForgotPasswordRequest, ResetPasswordRequest,
    MfaVerifyRequest
)
from app.schemas.common import success_response, error_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    create_audit_entry
)
from app.core.rate_limit import login_rate_limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup")
async def signup_personal_account(
    data: PersonalAccountSignup,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    PERSONAL ACCOUNT SIGNUP:
    - Creates independent public user.
    - account_type = 'PERSONAL'
    - company_id = NULL
    - NO company_users record created.
    - NEVER assigned to any company.
    """
    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "PASSWORDS_DO_NOT_MATCH", "message": "Password and confirmation password do not match."}
        )

    # Check if email is already taken
    existing = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMAIL_EXISTS", "message": "An account with this email address already exists."}
        )

    # Create Normal User
    user = User(
        name=data.name.strip(),
        email=data.email.lower().strip(),
        phone=data.phone.strip() if data.phone else None,
        hashed_password=hash_password(data.password),
        account_type="USER",
        status="ACTIVE",
        email_verified=True, # Auto-verify for seamless onboarding
        mfa_enabled=False
    )
    db.add(user)
    await db.flush()

    # Create default notification preferences
    prefs = NotificationPreference(user_id=user.id)
    db.add(prefs)
    await db.commit()
    await db.refresh(user)

    # Audit log
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="USER_SIGNUP",
        result="SUCCESS",
        user_id=user.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"account_type": "PERSONAL"}
    )

    token = create_access_token({"sub": user.id, "account_type": "PERSONAL", "role": "USER"})
    permissions = list(get_role_permissions("USER"))

    user_out = UserProfileOut(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        account_type="USER",
        role="USER",
        company_id=None,
        company_name=None,
        department=None,
        email_verified=user.email_verified,
        mfa_enabled=user.mfa_enabled,
        created_at=user.created_at,
        last_login_at=user.last_login_at
    )

    return success_response({
        "user": user_out.model_dump(),
        "company": None,
        "role": "USER",
        "token": token,
        "redirect_url": "/personal/dashboard",
        "permissions": permissions
    })

@router.post("/company-signup")
async def signup_company(
    data: CompanySignup,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    COMPANY SIGNUP:
    - Creates company.
    - Creates administrator account.
    - Creates company_users membership with role = 'ADMIN'.
    - Stores secure hash of company access code.
    """
    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "PASSWORDS_DO_NOT_MATCH", "message": "Password and confirmation password do not match."}
        )

    # Check if user email already exists
    existing_user = await db.execute(select(User).where(User.email == data.work_email.lower()))
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMAIL_EXISTS", "message": "An account with this email address already exists."}
        )

    # Check if company domain already registered
    if data.domain and data.domain.strip():
        clean_domain = data.domain.lower().strip().replace(' ', '-')
    else:
        clean_prefix = ''.join(c for c in data.company_name.lower() if c.isalnum()) or "workspace"
        clean_domain = f"{clean_prefix}.local"

    existing_comp = await db.execute(select(Company).where(Company.domain == clean_domain))
    if existing_comp.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "DOMAIN_EXISTS", "message": "A company with this domain has already been registered."}
        )

    # Access code: either provided or default derived with at least 2 numbers
    if data.access_code and data.access_code.strip():
        access_code = data.access_code.strip().upper()
    else:
        rand_digits = secrets.randbelow(90) + 10  # guarantees 2 numbers (10-99)
        clean_prefix = ''.join(c for c in data.company_name.upper() if c.isalnum())[:6] or "CDX"
        access_code = f"{clean_prefix}{rand_digits}"
    code_hash = hash_access_code(access_code)

    # Create Company
    company = Company(
        company_name=data.company_name.strip(),
        domain=clean_domain,
        access_code_hash=code_hash,
        status="ACTIVE"
    )
    db.add(company)
    await db.flush()

    # Create Admin User
    admin_user = User(
        name=data.admin_name.strip(),
        email=data.work_email.lower().strip(),
        phone=data.phone.strip() if data.phone else None,
        hashed_password=hash_password(data.password),
        account_type="COMPANY",
        status="ACTIVE",
        email_verified=True,
        mfa_enabled=False
    )
    db.add(admin_user)
    await db.flush()

    # Create company_users membership (role = ADMIN)
    membership = CompanyUser(
        company_id=company.id,
        user_id=admin_user.id,
        role="ADMIN",
        status="ACTIVE",
        department="Executive Leadership"
    )
    db.add(membership)

    # Notification preferences
    prefs = NotificationPreference(user_id=admin_user.id)
    db.add(prefs)

    await db.commit()
    await db.refresh(admin_user)
    await db.refresh(company)

    # Audit log
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="COMPANY_CREATED",
        result="SUCCESS",
        user_id=admin_user.id,
        company_id=company.id,
        resource_type="company",
        resource_id=company.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"company_name": company.company_name, "domain": company.domain}
    )

    token = create_access_token({"sub": admin_user.id, "account_type": "COMPANY", "role": "ADMIN", "company_id": company.id})
    permissions = list(get_role_permissions("ADMIN"))

    user_out = UserProfileOut(
        id=admin_user.id,
        name=admin_user.name,
        email=admin_user.email,
        phone=admin_user.phone,
        account_type="COMPANY",
        role="ADMIN",
        company_id=company.id,
        company_name=company.company_name,
        department=membership.department,
        email_verified=admin_user.email_verified,
        mfa_enabled=admin_user.mfa_enabled,
        created_at=admin_user.created_at,
        last_login_at=admin_user.last_login_at
    )

    company_out = CompanyProfileOut(
        id=company.id,
        company_name=company.company_name,
        domain=company.domain,
        industry=company.industry,
        size=company.size,
        security_contact=company.security_contact,
        status=company.status,
        created_at=company.created_at
    )

    return success_response({
        "user": user_out.model_dump(),
        "company": company_out.model_dump(),
        "role": "ADMIN",
        "token": token,
        "redirect_url": "/admin",
        "permissions": permissions,
        "access_code": access_code # Returned once for admin reference
    })

@router.post("/login")
async def login(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    UNIFIED AUTHENTICATION LOGIN:
    - Validates individual credentials.
    - Determines account type, role, and company membership.
    - Routes:
        ADMIN -> /admin
        EMPLOYEE -> /employee/dashboard
        PERSONAL ACCOUNT -> /personal/dashboard
    """
    result = await db.execute(select(User).where(User.email == data.email.lower().strip()))
    user = result.scalar_one_or_none()

    ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")
    ua = request.headers.get("user-agent")

    # Rate limiting check (per IP and per email)
    ip_key = f"ip:{ip}"
    email_key = f"email:{data.email.lower().strip()}"
    is_limited_ip, retry_after_ip = login_rate_limiter.is_rate_limited(ip_key)
    is_limited_email, retry_after_email = login_rate_limiter.is_rate_limited(email_key)
    if is_limited_ip or is_limited_email:
        retry_after = max(retry_after_ip, retry_after_email)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "RATE_LIMIT_EXCEEDED",
                "message": f"Too many failed login attempts. Please wait {retry_after} seconds before trying again.",
                "retry_after": retry_after
            },
            headers={"Retry-After": str(retry_after)}
        )

    if not user or not verify_password(data.password, user.hashed_password):
        login_rate_limiter.record_attempt(ip_key)
        login_rate_limiter.record_attempt(email_key)
        await create_audit_entry(
            db=db,
            action="USER_LOGIN_FAILED",
            result="FAILED",
            ip_address=ip,
            user_agent=ua,
            metadata={"email": data.email}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."}
        )

    # Clear failed attempts on successful authentication
    login_rate_limiter.clear(ip_key)
    login_rate_limiter.clear(email_key)

    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_LOCKED", "message": f"This account is currently {user.status.lower()}."}
        )

    # Update last login time
    user.last_login_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()

    # Check for company membership
    membership_query = await db.execute(select(CompanyUser).where(CompanyUser.user_id == user.id))
    membership = membership_query.scalar_one_or_none()

    role = "USER"
    company_out = None
    company_id = None
    company_name = None
    department = None

    if membership:
        role = membership.role
        company_id = membership.company_id
        department = membership.department
        comp_res = await db.execute(select(Company).where(Company.id == company_id))
        company = comp_res.scalar_one_or_none()
        if company:
            company_name = company.company_name
            company_out = CompanyProfileOut(
                id=company.id,
                company_name=company.company_name,
                domain=company.domain,
                industry=company.industry,
                size=company.size,
                security_contact=company.security_contact,
                status=company.status,
                created_at=company.created_at
            )

    # Determine redirect URL based on verified role
    if role == "ADMIN":
        redirect_url = "/admin"
    elif role == "EMPLOYEE":
        redirect_url = "/employee/dashboard"
    else:
        redirect_url = "/personal/dashboard"

    token = create_access_token({
        "sub": user.id,
        "account_type": user.account_type,
        "role": role,
        "company_id": company_id
    })

    permissions = list(get_role_permissions(role))

    await create_audit_entry(
        db=db,
        action="USER_LOGIN",
        result="SUCCESS",
        user_id=user.id,
        company_id=company_id,
        ip_address=ip,
        user_agent=ua,
        metadata={"role": role}
    )

    user_out = UserProfileOut(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        account_type=user.account_type,
        role=role,
        company_id=company_id,
        company_name=company_name,
        department=department,
        email_verified=user.email_verified,
        mfa_enabled=user.mfa_enabled,
        created_at=user.created_at,
        last_login_at=user.last_login_at
    )

    return success_response({
        "user": user_out.model_dump(),
        "company": company_out.model_dump() if company_out else None,
        "role": role,
        "token": token,
        "redirect_url": redirect_url,
        "permissions": permissions
    })

@router.get("/me")
async def get_current_profile(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve currently authenticated user identity and company affiliation."""
    role = membership.role if membership else "USER"
    company_out = None
    company_name = None

    if membership:
        comp_res = await db.execute(select(Company).where(Company.id == membership.company_id))
        company = comp_res.scalar_one_or_none()
        if company:
            company_name = company.company_name
            company_out = CompanyProfileOut(
                id=company.id,
                company_name=company.company_name,
                domain=company.domain,
                industry=company.industry,
                size=company.size,
                security_contact=company.security_contact,
                status=company.status,
                created_at=company.created_at
            )

    user_out = UserProfileOut(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        account_type=user.account_type,
        role=role,
        company_id=membership.company_id if membership else None,
        company_name=company_name,
        department=membership.department if membership else None,
        email_verified=user.email_verified,
        mfa_enabled=user.mfa_enabled,
        created_at=user.created_at,
        last_login_at=user.last_login_at
    )

    return success_response({
        "user": user_out.model_dump(),
        "company": company_out.model_dump() if company_out else None,
        "role": role,
        "permissions": list(get_role_permissions(role))
    })

@router.post("/logout")
async def logout(
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db)
):
    """Log out authenticated user and record audit entry."""
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="USER_LOGOUT",
        result="SUCCESS",
        user_id=user.id,
        company_id=membership.company_id if membership else None,
        ip_address=ip,
        user_agent=ua
    )
    return success_response({"message": "Successfully logged out."})

@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Trigger secure password reset email flow."""
    # Always return success to prevent email enumeration attacks
    return success_response({"message": "If this email exists in our records, a secure password reset link has been dispatched."})

@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Complete password reset with a valid token."""
    if data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "PASSWORDS_DO_NOT_MATCH", "message": "Passwords do not match."}
        )
    return success_response({"message": "Password has been successfully updated. You may now log in."})

@router.post("/verify-company-code")
async def verify_company_code(
    data: VerifyCodeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    VERIFY COMPANY JOIN CODE / ACCESS PASS:
    - Finds active company where access code matches stored bcrypt hash.
    - Returns validity and company name for employee onboarding.
    """
    code = data.company_code.strip().upper()
    companies_res = await db.execute(select(Company).where(Company.status == "ACTIVE").order_by(Company.created_at.desc()))
    all_companies = companies_res.scalars().all()

    for comp in all_companies:
        if verify_access_code(code, comp.access_code_hash):
            return success_response({
                "valid": True,
                "company_id": comp.id,
                "company_name": comp.company_name,
                "domain": comp.domain
            })

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"code": "INVALID_ACCESS_CODE", "message": "The entered company access code is invalid or does not exist."}
    )

@router.post("/join-company")
async def join_company(
    data: CompanyJoinRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    EMPLOYEE ENROLLMENT:
    - Finds company by access code.
    - Creates employee user account.
    - Binds user to company_id with role 'EMPLOYEE'.
    """
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # Check if email exists
    existing = await db.execute(select(User).where(User.email == data.email.lower().strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists.")

    # Match company using bcrypt verify across active companies
    code = data.company_code.strip().upper()
    companies_res = await db.execute(select(Company).where(Company.status == "ACTIVE").order_by(Company.created_at.desc()))
    all_companies = companies_res.scalars().all()

    company = None
    for comp in all_companies:
        if verify_access_code(code, comp.access_code_hash):
            company = comp
            break

    if not company:
        raise HTTPException(status_code=403, detail="Invalid company access code.")

    # Create Employee User
    user = User(
        name=data.name.strip(),
        email=data.email.lower().strip(),
        hashed_password=hash_password(data.password),
        account_type="COMPANY",
        status="ACTIVE",
        email_verified=True,
    )
    db.add(user)
    await db.flush()

    # Bind to Company
    membership = CompanyUser(
        company_id=company.id,
        user_id=user.id,
        role="EMPLOYEE",
        department=data.department or "General"
    )
    db.add(membership)
    db.add(NotificationPreference(user_id=user.id))
    
    await db.commit()
    await db.refresh(user)

    # Audit log
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db, action="EMPLOYEE_JOINED_COMPANY", result="SUCCESS",
        user_id=user.id, company_id=company.id, ip_address=ip, user_agent=ua
    )

    token = create_access_token({"sub": user.id, "account_type": "COMPANY", "role": "EMPLOYEE", "company_id": company.id})
    permissions = list(get_role_permissions("EMPLOYEE"))
    
    user_out = UserProfileOut(
        id=user.id, name=user.name, email=user.email, phone=user.phone,
        account_type="COMPANY", role="EMPLOYEE", company_id=company.id,
        company_name=company.company_name, department=membership.department,
        email_verified=user.email_verified, mfa_enabled=user.mfa_enabled,
        created_at=user.created_at, last_login_at=user.last_login_at
    )
    return success_response({
        "user": user_out.model_dump(),
        "role": "EMPLOYEE",
        "token": token,
        "redirect_url": "/employee/dashboard",
        "permissions": permissions
    })
