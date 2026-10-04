import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select

from app.main import app
from app.seed import init_db, seed_data
from app.core.database import AsyncSessionLocal
from app.models.models import User, CompanyUser, Asset, AuditLog

@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_db():
    await init_db()
    await seed_data()
    yield

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data"]["status"] == "healthy"

import uuid

@pytest.mark.asyncio
async def test_normal_user_signup_isolation():
    """
    CRITICAL RULE:
    Normal users MUST have:
    - account_type = 'USER'
    - company_id = NULL
    - NO company_users record!
    - Redirect to /personal/dashboard
    """
    uid = uuid.uuid4().hex[:6]
    test_email = f"jane.public.{uid}@example.com"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/auth/signup", json={
            "name": "Jane Public",
            "email": test_email,
            "phone": "+1 555 999 1234",
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!"
        })
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        payload = body["data"]
        assert payload["role"] == "USER"
        assert payload["user"]["account_type"] == "USER"
        assert payload["user"]["company_id"] is None
        assert payload["company"] is None
        assert payload["redirect_url"] == "/personal/dashboard"

        # Verify database record: NO company_users entry
        async with AsyncSessionLocal() as db:
            user_id = payload["user"]["id"]
            cu_res = await db.execute(select(CompanyUser).where(CompanyUser.user_id == user_id))
            assert cu_res.scalar_one_or_none() is None, "Normal user must NOT have a company_users record!"

@pytest.mark.asyncio
async def test_company_signup_flow():
    """
    Company signup creates company, admin user, and company_users membership.
    """
    uid = uuid.uuid4().hex[:6]
    domain = f"novashield-{uid}.io"
    work_email = f"elena@{domain}"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/auth/company-signup", json={
            "company_name": f"NovaShield Corp {uid}",
            "domain": domain,
            "admin_name": "Elena Rostova",
            "work_email": work_email,
            "phone": "+1 555 333 4444",
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!",
            "access_code": f"NOVA-{uid.upper()}"
        })
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        data = body["data"]
        assert data["role"] == "ADMIN"
        assert data["user"]["account_type"] == "COMPANY"
        assert data["company"]["company_name"] == f"NovaShield Corp {uid}"
        assert data["redirect_url"] == "/admin"

@pytest.mark.asyncio
async def test_login_routes_by_role():
    """
    Test logins for Admin, Employee, and Normal User.
    Verifies that redirect URLs and company affiliations match roles.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Admin A Login
        res_admin = await client.post("/api/v1/auth/login", json={
            "email": "admin@demo.cyberdome.local",
            "password": "Password123!"
        })
        assert res_admin.status_code == 200
        admin_data = res_admin.json()["data"]
        assert admin_data["role"] == "ADMIN"
        assert admin_data["redirect_url"] == "/admin"
        assert admin_data["company"]["id"] == "comp-cyberdome-001"

        # Employee A Login
        res_emp = await client.post("/api/v1/auth/login", json={
            "email": "employee@demo.cyberdome.local",
            "password": "Password123!"
        })
        assert res_emp.status_code == 200
        emp_data = res_emp.json()["data"]
        assert emp_data["role"] == "EMPLOYEE"
        assert emp_data["redirect_url"] == "/employee/dashboard"
        assert emp_data["company"]["id"] == "comp-cyberdome-001"

        # Normal User Login
        res_user = await client.post("/api/v1/auth/login", json={
            "email": "user@demo.cyberdome.local",
            "password": "Password123!"
        })
        assert res_user.status_code == 200
        user_data = res_user.json()["data"]
        assert user_data["role"] == "USER"
        assert user_data["redirect_url"] == "/personal/dashboard"
        assert user_data["company"] is None

@pytest.mark.asyncio
async def test_employee_join_with_access_code():
    """
    Employee joins using authorized company code.
    """
    uid = uuid.uuid4().hex[:6]
    test_email = f"analyst.{uid}@cyberdome.local"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Join with valid code for Company A (CSX-COMPANY)
        res = await client.post("/api/v1/companies/join", json={
            "name": f"Analyst {uid}",
            "email": test_email,
            "password": "Password123!",
            "confirm_password": "Password123!",
            "company_code": "CSX-COMPANY",
            "department": "Threat Intelligence"
        })
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["role"] == "EMPLOYEE"
        assert data["company"]["company_name"] == "CyberDome Technologies"
        assert data["redirect_url"] == "/employee/dashboard"

        # Fails with bad code
        bad_res = await client.post("/api/v1/companies/join", json={
            "name": "Attacker",
            "email": f"attacker.{uid}@evil.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "company_code": "INVALID-CODE-999"
        })
        assert bad_res.status_code == 400
        assert bad_res.json()["error"]["code"] == "INVALID_ACCESS_CODE"

@pytest.mark.asyncio
async def test_strict_multi_tenant_isolation():
    """
    CRITICAL MULTI-TENANT TEST MATRIX:
    - Company A: comp-cyberdome-001, Admin A, Employee A, Asset A (ast-cdx-001)
    - Company B: comp-acme-002, Admin B, Employee B, Asset B (ast-acme-001)
    - Normal User: No company

    Verifications:
    1. Admin A can access Asset A -> 200 OK.
    2. Admin A CANNOT access Asset B -> 403 Forbidden.
    3. Employee A can access Asset A -> 200 OK.
    4. Employee A CANNOT access Asset B -> 403 Forbidden.
    5. Admin B can access Asset B -> 200 OK.
    6. Admin B CANNOT access Asset A -> 403 Forbidden.
    7. Normal User CANNOT access Asset A -> 403 Forbidden.
    8. Normal User CANNOT access Asset B -> 403 Forbidden.
    9. Normal User CANNOT access Admin overview -> 403 Forbidden.
    10. Employee A CANNOT access Admin overview -> 403 Forbidden.
    11. Employee A CANNOT change employee roles -> 403 Forbidden.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Obtain Tokens
        login_admin_a = await client.post("/api/v1/auth/login", json={"email": "admin@demo.cyberdome.local", "password": "Password123!"})
        token_admin_a = login_admin_a.json()["data"]["token"]

        login_emp_a = await client.post("/api/v1/auth/login", json={"email": "employee@demo.cyberdome.local", "password": "Password123!"})
        token_emp_a = login_emp_a.json()["data"]["token"]

        login_admin_b = await client.post("/api/v1/auth/login", json={"email": "admin@acmedefense.com", "password": "Password123!"})
        token_admin_b = login_admin_b.json()["data"]["token"]

        login_user = await client.post("/api/v1/auth/login", json={"email": "user@demo.cyberdome.local", "password": "Password123!"})
        token_user = login_user.json()["data"]["token"]

        headers_admin_a = {"Authorization": f"Bearer {token_admin_a}"}
        headers_emp_a = {"Authorization": f"Bearer {token_emp_a}"}
        headers_admin_b = {"Authorization": f"Bearer {token_admin_b}"}
        headers_user = {"Authorization": f"Bearer {token_user}"}

        # Verification 1: Admin A accesses Asset A (Allowed)
        res = await client.get("/api/v1/assets/ast-cdx-001", headers=headers_admin_a)
        assert res.status_code == 200
        assert res.json()["data"]["id"] == "ast-cdx-001"

        # Verification 2: Admin A attempts to access Asset B (Cross-tenant DENIED)
        res = await client.get("/api/v1/assets/ast-acme-001", headers=headers_admin_a)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "FORBIDDEN"

        # Verification 3: Employee A accesses Asset A (Allowed)
        res = await client.get("/api/v1/assets/ast-cdx-001", headers=headers_emp_a)
        assert res.status_code == 200

        # Verification 4: Employee A attempts to access Asset B (Cross-tenant DENIED)
        res = await client.get("/api/v1/assets/ast-acme-001", headers=headers_emp_a)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "FORBIDDEN"

        # Verification 5: Admin B accesses Asset B (Allowed)
        res = await client.get("/api/v1/assets/ast-acme-001", headers=headers_admin_b)
        assert res.status_code == 200
        assert res.json()["data"]["id"] == "ast-acme-001"

        # Verification 6: Admin B attempts to access Asset A (Cross-tenant DENIED)
        res = await client.get("/api/v1/assets/ast-cdx-001", headers=headers_admin_b)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "FORBIDDEN"

        # Verification 7: Normal User attempts to access Asset A (DENIED)
        res = await client.get("/api/v1/assets/ast-cdx-001", headers=headers_user)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "FORBIDDEN"

        # Verification 8: Normal User attempts to access Asset B (DENIED)
        res = await client.get("/api/v1/assets/ast-acme-001", headers=headers_user)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "FORBIDDEN"

        # Verification 9: Normal User attempts to access Admin Overview (DENIED)
        res = await client.get("/api/v1/admin/overview", headers=headers_user)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "FORBIDDEN"

        # Verification 10: Employee A attempts to access Admin Overview (DENIED)
        res = await client.get("/api/v1/admin/overview", headers=headers_emp_a)
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "FORBIDDEN"

        # Verification 11: Employee A attempts to patch employee role (DENIED)
        res = await client.patch(
            "/api/v1/admin/employees/usr-emp-001/role",
            json={"role": "ADMIN"},
            headers=headers_emp_a
        )
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "FORBIDDEN"

@pytest.mark.asyncio
async def test_admin_overview_employee_count_excludes_normal_users():
    """
    CRITICAL METRIC TEST:
    Admin dashboard overview must count ONLY company_users.
    It must NEVER count users WHERE account_type = 'USER'.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_admin_a = await client.post("/api/v1/auth/login", json={"email": "admin@demo.cyberdome.local", "password": "Password123!"})
        token_admin_a = login_admin_a.json()["data"]["token"]
        headers_admin_a = {"Authorization": f"Bearer {token_admin_a}"}

        res = await client.get("/api/v1/admin/overview", headers=headers_admin_a)
        assert res.status_code == 200
        overview = res.json()["data"]

        # In Company A, there are only company users belonging to comp-cyberdome-001
        # It must match company_users exactly and NEVER include normal users!
        from sqlalchemy import func
        async with AsyncSessionLocal() as db:
            comp_users_count = (await db.execute(
                select(func.count(CompanyUser.id)).where(CompanyUser.company_id == "comp-cyberdome-001")
            )).scalar()
            
            total_users_count = (await db.execute(
                select(func.count(User.id))
            )).scalar()

        assert overview["total_employees"] == comp_users_count
        assert overview["total_employees"] < total_users_count, "Company employee count must NEVER include public normal users!"
        assert overview["company_name"] == "CyberDome Technologies"

@pytest.mark.asyncio
async def test_employee_invitation_and_accept_flow():
    """Admin invites employee -> employee accepts invitation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Admin logs in
        login_res = await client.post("/api/v1/auth/login", json={"email": "admin@demo.cyberdome.local", "password": "Password123!"})
        admin_token = login_res.json()["data"]["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Admin sends invitation
        uid = uuid.uuid4().hex[:6]
        invited_email = f"invited.{uid}@cyberdome.local"
        inv_res = await client.post("/api/v1/admin/employees/invite", json={
            "email": invited_email,
            "role": "EMPLOYEE",
            "department": "Incident Response"
        }, headers=headers)
        assert inv_res.status_code == 200
        inv_data = inv_res.json()["data"]
        token = inv_data["token"]
        assert token.startswith("inv_")

        # 3. Employee accepts invitation
        accept_res = await client.post("/api/v1/companies/invitations/accept", json={
            "token": token,
            "name": f"Invited SecOp {uid}",
            "password": "Password123!",
            "confirm_password": "Password123!"
        })
        assert accept_res.status_code == 200
        assert accept_res.json()["data"]["redirect_url"] == "/employee/dashboard"

@pytest.mark.asyncio
async def test_admin_employee_management_and_audit():
    """Admin lists employees, updates role, updates status, views audit logs."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_res = await client.post("/api/v1/auth/login", json={"email": "admin@demo.cyberdome.local", "password": "Password123!"})
        admin_token = login_res.json()["data"]["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # List employees
        emp_res = await client.get("/api/v1/admin/employees", headers=headers)
        assert emp_res.status_code == 200
        employees = emp_res.json()["data"]
        assert len(employees) >= 2
        first_emp = employees[0]

        # Update employee status
        status_res = await client.patch(
            f"/api/v1/admin/employees/{first_emp['id']}/status",
            json={"status": "ACTIVE"},
            headers=headers
        )
        assert status_res.status_code == 200

        # View audit logs
        audit_res = await client.get("/api/v1/admin/audit", headers=headers)
        assert audit_res.status_code == 200
        audit_logs = audit_res.json()["data"]
        assert len(audit_logs) > 0
        assert all(log["companyId"] == "comp-cyberdome-001" for log in audit_logs)

@pytest.mark.asyncio
async def test_notifications_isolation():
    """Normal user sees only their personal notifications, not company alerts."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_user = await client.post("/api/v1/auth/login", json={"email": "user@demo.cyberdome.local", "password": "Password123!"})
        user_token = login_user.json()["data"]["token"]
        headers = {"Authorization": f"Bearer {user_token}"}

        res = await client.get("/api/v1/notifications", headers=headers)
        assert res.status_code == 200
        notes = res.json()["data"]
        assert len(notes) >= 1
        # Crucial check: all notifications for normal user must have companyId = None
        for n in notes:
            assert n["companyId"] is None

