from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import hash_password, verify_access_code, create_access_token
from app.core.permissions import get_role_permissions
from app.models.models import User, Company, CompanyUser, Invitation, NotificationPreference
from app.schemas.auth import CompanyJoinRequest, UserProfileOut, CompanyProfileOut
from app.schemas.company import InvitationAccept
from app.schemas.common import success_response
from app.core.dependencies import create_audit_entry, get_current_user, get_current_company_membership

router = APIRouter(prefix="/companies", tags=["Companies & Membership"])

@router.post("/join")
async def join_company_with_code(
    data: CompanyJoinRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    EMPLOYEE JOIN VIA COMPANY ACCESS CODE:
    - Verifies the authorized company code against company.access_code_hash.
    - Creates employee user account.
    - Creates company_users membership (role = EMPLOYEE).
    - Returns session token and redirect to /employee/dashboard.
    """
    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "PASSWORDS_DO_NOT_MATCH", "message": "Password and confirmation password do not match."}
        )

    # Check for existing user with this email
    existing_user = await db.execute(select(User).where(User.email == data.email.lower().strip()))
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMAIL_EXISTS", "message": "An account with this email address already exists."}
        )

    # Locate company by matching access code
    companies_res = await db.execute(select(Company).where(Company.status == "ACTIVE"))
    all_companies = companies_res.scalars().all()

    matched_company: Company = None
    for comp in all_companies:
        if verify_access_code(data.company_code, comp.access_code_hash):
            matched_company = comp
            break

    if not matched_company:
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")
        await create_audit_entry(
            db=db,
            action="INVALID_COMPANY_CODE_ATTEMPT",
            result="DENIED",
            ip_address=ip,
            user_agent=ua,
            metadata={"entered_code": data.company_code}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_ACCESS_CODE", "message": "The entered company access code is invalid or expired."}
        )

    # Create employee user
    user = User(
        name=data.name.strip(),
        email=data.email.lower().strip(),
        hashed_password=hash_password(data.password),
        account_type="COMPANY",
        status="ACTIVE",
        email_verified=True,
        mfa_enabled=False
    )
    db.add(user)
    await db.flush()

    # Create membership in matched company
    membership = CompanyUser(
        company_id=matched_company.id,
        user_id=user.id,
        role="EMPLOYEE",
        status="ACTIVE",
        department=data.department or "General"
    )
    db.add(membership)

    prefs = NotificationPreference(user_id=user.id)
    db.add(prefs)

    await db.commit()
    await db.refresh(user)

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="EMPLOYEE_JOINED",
        result="SUCCESS",
        user_id=user.id,
        company_id=matched_company.id,
        resource_type="company_user",
        resource_id=membership.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"company": matched_company.company_name, "role": "EMPLOYEE"}
    )

    token = create_access_token({
        "sub": user.id,
        "account_type": "COMPANY",
        "role": "EMPLOYEE",
        "company_id": matched_company.id
    })

    user_out = UserProfileOut(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        account_type="COMPANY",
        role="EMPLOYEE",
        company_id=matched_company.id,
        company_name=matched_company.company_name,
        department=membership.department,
        email_verified=user.email_verified,
        mfa_enabled=user.mfa_enabled,
        created_at=user.created_at,
        last_login_at=user.last_login_at
    )

    company_out = CompanyProfileOut(
        id=matched_company.id,
        company_name=matched_company.company_name,
        domain=matched_company.domain,
        industry=matched_company.industry,
        size=matched_company.size,
        security_contact=matched_company.security_contact,
        status=matched_company.status,
        created_at=matched_company.created_at
    )

    return success_response({
        "user": user_out.model_dump(),
        "company": company_out.model_dump(),
        "role": "EMPLOYEE",
        "token": token,
        "redirect_url": "/employee/dashboard",
        "permissions": list(get_role_permissions("EMPLOYEE"))
    })

@router.post("/invitations/accept")
async def accept_invitation(
    data: InvitationAccept,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    ACCEPT ADMIN INVITATION:
    - Verifies invitation token.
    - Creates employee user account and attaches to company.
    """
    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "PASSWORDS_DO_NOT_MATCH", "message": "Passwords do not match."}
        )

    res = await db.execute(select(Invitation).where(Invitation.token == data.token))
    inv = res.scalar_one_or_none()

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    inv_expires = inv.expires_at.replace(tzinfo=None) if inv and inv.expires_at else None

    if not inv or inv.status != "PENDING" or (inv_expires and inv_expires < now_utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_INVITATION", "message": "The invitation token is invalid or has expired."}
        )

    # Check if user already exists
    user_res = await db.execute(select(User).where(User.email == inv.email.lower()))
    user = user_res.scalar_one_or_none()

    if not user:
        user = User(
            name=data.name.strip(),
            email=inv.email.lower(),
            hashed_password=hash_password(data.password),
            account_type="COMPANY",
            status="ACTIVE",
            email_verified=True
        )
        db.add(user)
        await db.flush()

    # Create company_user
    membership = CompanyUser(
        company_id=inv.company_id,
        user_id=user.id,
        role=inv.role,
        status="ACTIVE",
        department=inv.department or "General"
    )
    db.add(membership)

    inv.status = "ACCEPTED"
    await db.commit()

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="EMPLOYEE_JOINED_VIA_INVITE",
        result="SUCCESS",
        user_id=user.id,
        company_id=inv.company_id,
        ip_address=ip,
        user_agent=ua,
        metadata={"invitation_id": inv.id, "role": inv.role}
    )

    token = create_access_token({
        "sub": user.id,
        "account_type": "COMPANY",
        "role": inv.role,
        "company_id": inv.company_id
    })

    return success_response({
        "message": "Invitation accepted successfully.",
        "token": token,
        "redirect_url": "/employee/dashboard" if inv.role == "EMPLOYEE" else "/admin"
    })


@router.get("/dashboard-metrics")
async def get_company_dashboard_metrics(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Real database security metrics for company dashboard.
    Never fabricates metrics. Returns exact counts from verified tables.
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company dashboard metrics."}
        )

    from sqlalchemy import func
    from app.models.models import Asset
    from app.models.phase4 import NetworkEvent, IoTDevice, Incident, SecurityEvent
    from app.models.website_security import AssetVulnerability, Vulnerability, WebsiteFinding

    cid = membership.company_id

    # 1. Assets
    total_assets = await db.scalar(select(func.count(Asset.id)).where(Asset.company_id == cid)) or 0
    active_assets = await db.scalar(select(func.count(Asset.id)).where(Asset.company_id == cid, Asset.status == "ACTIVE")) or 0

    # 2. Vulnerabilities
    vuln_rows = await db.execute(
        select(Vulnerability.severity, func.count(AssetVulnerability.id))
        .join(Vulnerability, AssetVulnerability.vulnerability_id == Vulnerability.id)
        .where(AssetVulnerability.company_id == cid)
        .group_by(Vulnerability.severity)
    )
    vuln_counts = dict(vuln_rows.all())
    critical_vulns = vuln_counts.get("CRITICAL", 0)
    high_vulns = vuln_counts.get("HIGH", 0)
    medium_vulns = vuln_counts.get("MEDIUM", 0)
    low_vulns = vuln_counts.get("LOW", 0)
    total_vulns = sum(vuln_counts.values())

    # 3. Telemetry & Operations
    network_events = await db.scalar(select(func.count(NetworkEvent.id)).where(NetworkEvent.company_id == cid)) or 0
    iot_devices = await db.scalar(select(func.count(IoTDevice.id)).where(IoTDevice.company_id == cid)) or 0
    detections = await db.scalar(select(func.count(SecurityEvent.id)).where(SecurityEvent.company_id == cid)) or 0
    open_incidents = await db.scalar(
        select(func.count(Incident.id)).where(Incident.company_id == cid, Incident.status.in_(["OPEN", "INVESTIGATING"]))
    ) or 0

    # 4. Deterministic Security Score Calculation (100 base, deductions for confirmed weaknesses)
    penalty = (critical_vulns * 15) + (high_vulns * 8) + (medium_vulns * 3) + (open_incidents * 10)
    security_score = max(25, 100 - penalty)

    # 5. Recent real findings
    finding_res = await db.execute(
        select(WebsiteFinding).where(WebsiteFinding.company_id == cid)
        .order_by(WebsiteFinding.created_at.desc()).limit(5)
    )
    recent_findings_raw = finding_res.scalars().all()
    recent_findings = [
        {
            "id": f.id,
            "asset": f.affected_target or "Web Gateway",
            "finding": f.title,
            "severity": f.severity,
            "status": f.status,
            "detected": f.created_at.isoformat() if f.created_at else "Recently",
            "type": f.category
        }
        for f in recent_findings_raw
    ]

    # 6. Recent real detections/alerts
    det_res = await db.execute(
        select(SecurityEvent).where(SecurityEvent.company_id == cid)
        .order_by(SecurityEvent.timestamp.desc()).limit(5)
    )
    recent_alerts_raw = det_res.scalars().all()
    recent_alerts = [
        {
            "id": d.id,
            "type": d.severity.lower(),
            "title": d.title,
            "desc": d.description or f"Rule {d.rule_id} triggered on {d.entity_id}",
            "time": d.timestamp.isoformat() if d.timestamp else "Recently"
        }
        for d in recent_alerts_raw
    ]

    return success_response({
        "totalAssets": total_assets,
        "activeAssets": active_assets,
        "totalVulnerabilities": total_vulns,
        "criticalVulnerabilities": critical_vulns,
        "highVulnerabilities": high_vulns,
        "mediumVulnerabilities": medium_vulns,
        "lowVulnerabilities": low_vulns,
        "networkEvents": network_events,
        "iotDevices": iot_devices,
        "detections": detections,
        "openIncidents": open_incidents,
        "securityScore": security_score,
        "recentFindings": recent_findings,
        "recentAlerts": recent_alerts,
        "isRealData": True
    })

