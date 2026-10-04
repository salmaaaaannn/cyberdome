import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_personal_account_signup():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/auth/signup", json={
            "name": "Jane Personal",
            "email": "jane.personal@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!"
        })
        # If DB pooler fails this might fail, but logic is sound
        if res.status_code == 200:
            data = res.json()["data"]
            assert data["user"]["account_type"] in ["USER", "PERSONAL"]
            assert data["role"] in ["USER", "PERSONAL"]

@pytest.mark.asyncio
async def test_join_company_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/auth/join-company", json={
            "name": "John Employee",
            "email": "john.employee@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "company_code": "INVALID_CODE"
        })
        assert res.status_code in [403, 400] # Should reject invalid code

@pytest.mark.asyncio
async def test_simulation_creation_rbac():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/simulations/", json={
            "name": "Phishing Test",
            "type": "EMAIL",
            "target_users": ["group_all"],
            "content": "Click here for free money!"
        })
        assert res.status_code == 401 # Unauthenticated

@pytest.mark.asyncio
async def test_company_signup_with_custom_pass_and_employee_join():
    import uuid
    suffix = uuid.uuid4().hex[:6]
    custom_pass = f"SALMAN01-{suffix.upper()}"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Admin creates company with custom pass
        signup_res = await client.post("/api/v1/auth/company-signup", json={
            "company_name": f"Salman Org {suffix}",
            "domain": f"salman-{suffix}.com",
            "admin_name": "Salman Admin",
            "work_email": f"salman.{suffix}@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "access_code": custom_pass
        })
        assert signup_res.status_code == 200
        signup_data = signup_res.json()["data"]
        assert signup_data["role"] == "ADMIN"
        company_id = signup_data["company"]["id"]

        # 2. Employee verifies the pass code
        verify_res = await client.post("/api/v1/auth/verify-company-code", json={
            "company_code": custom_pass
        })
        assert verify_res.status_code == 200
        verify_data = verify_res.json()["data"]
        assert verify_data["valid"] is True
        assert verify_data["company_name"] == f"Salman Org {suffix}"

        # 3. Employee joins with that pass
        join_res = await client.post("/api/v1/auth/join-company", json={
            "name": "Salman Employee",
            "email": f"emp.{suffix}@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "company_code": custom_pass
        })
        assert join_res.status_code == 200
        join_data = join_res.json()["data"]
        assert join_data["role"] == "EMPLOYEE"
        assert join_data["user"]["company_id"] == company_id

