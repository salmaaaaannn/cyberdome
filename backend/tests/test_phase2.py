"""
Phase 2 — Integration Tests for Website Security, Attack Surface, Scanner, Vulnerability Intelligence.
Tests company isolation, RBAC, and real scan execution.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.seed import init_db, seed_data


@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_db():
    await init_db()
    await seed_data()
    yield


async def _get_token(email: str, password: str = "Password123!") -> str:
    """Helper to get auth token."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/auth/login", json={
            "email": email, "password": password
        })
        return res.json()["data"]["token"]


# ═══════════════════════════════════════════════════════════════════════
#  ASSESSMENT CREATION TESTS
# ═══════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_create_assessment_admin():
    """Admin can create assessments."""
    token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/website-security/assessments",
            json={"target_url": "https://httpbin.org", "authorization_confirmed": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data"]["targetDomain"] == "httpbin.org"
        assert data["data"]["status"] in ("QUEUED", "RUNNING")
        assert data["data"]["authorizationConfirmed"] is True


@pytest.mark.asyncio
async def test_create_assessment_requires_authorization():
    """Must confirm authorization."""
    token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/website-security/assessments",
            json={"target_url": "https://example.com", "authorization_confirmed": False},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_create_assessment_invalid_url():
    """Invalid URL rejected."""
    token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/website-security/assessments",
            json={"target_url": "not-a-valid-url", "authorization_confirmed": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 400


# ═══════════════════════════════════════════════════════════════════════
#  RBAC TESTS
# ═══════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_normal_user_cannot_create_assessment():
    """Normal users cannot access enterprise scanning."""
    token = await _get_token("user@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/website-security/assessments",
            json={"target_url": "https://example.com", "authorization_confirmed": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_normal_user_cannot_list_assessments():
    """Normal users cannot list company assessments."""
    token = await _get_token("user@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/website-security/assessments",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_normal_user_cannot_access_attack_surface():
    """Normal users cannot access attack surface."""
    token = await _get_token("user@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/attack-surface/summary",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_normal_user_cannot_access_vulnerabilities():
    """Normal users cannot access vulnerability intelligence."""
    token = await _get_token("user@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/vulnerabilities",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_employee_can_read_assessments():
    """Employees can read assessments."""
    token = await _get_token("employee@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/website-security/assessments",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        assert res.json()["success"] is True


@pytest.mark.asyncio
async def test_employee_cannot_create_assessment():
    """Employees without scanner.run cannot create assessments."""
    token = await _get_token("employee@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/website-security/assessments",
            json={"target_url": "https://example.com", "authorization_confirmed": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 403


# ═══════════════════════════════════════════════════════════════════════
#  TENANT ISOLATION TESTS
# ═══════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_company_b_cannot_see_company_a_assessments():
    """Company B admin cannot see Company A assessments."""
    token_a = await _get_token("admin@demo.cyberdome.local")
    token_b = await _get_token("admin@acmedefense.com")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Company A creates assessment
        create_res = await client.post(
            "/api/v1/website-security/assessments",
            json={"target_url": "https://isolation-test.example.com", "authorization_confirmed": True},
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert create_res.status_code == 200
        assessment_id = create_res.json()["data"]["id"]

        # Company B tries to access it — should return 404 (not found for their company)
        detail_res = await client.get(
            f"/api/v1/website-security/assessments/{assessment_id}",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert detail_res.status_code == 404

        # Company B tries to cancel it
        cancel_res = await client.post(
            f"/api/v1/website-security/assessments/{assessment_id}/cancel",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert cancel_res.status_code == 404

        # Company B tries to see progress
        progress_res = await client.get(
            f"/api/v1/website-security/assessments/{assessment_id}/progress",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert progress_res.status_code == 404


@pytest.mark.asyncio
async def test_company_b_has_separate_attack_surface():
    """Company B has independent attack surface data."""
    token = await _get_token("admin@acmedefense.com")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/attack-surface/summary",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["totalAssets"] == 0  # Company B hasn't scanned anything


@pytest.mark.asyncio
async def test_company_b_vulnerabilities_isolated():
    """Company B vulnerabilities are isolated."""
    token = await _get_token("admin@acmedefense.com")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/vulnerabilities",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert isinstance(data, list)


# ═══════════════════════════════════════════════════════════════════════
#  SCAN PROGRESS & LIST TESTS
# ═══════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_scan_progress_polling():
    """Can poll scan progress."""
    token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/website-security/assessments",
            json={"target_url": "https://httpbin.org/get", "authorization_confirmed": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        aid = res.json()["data"]["id"]

        progress_res = await client.get(
            f"/api/v1/website-security/assessments/{aid}/progress",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert progress_res.status_code == 200
        pdata = progress_res.json()["data"]
        assert pdata["assessmentId"] == aid
        assert pdata["status"] in ("QUEUED", "RUNNING", "COMPLETED", "FAILED")


@pytest.mark.asyncio
async def test_list_assessments():
    """Can list assessments."""
    token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/website-security/assessments",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert isinstance(data, list)
        assert len(data) > 0


@pytest.mark.asyncio
async def test_unauthenticated_access():
    """Unauthenticated requests rejected."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/website-security/assessments")
        assert res.status_code == 401
