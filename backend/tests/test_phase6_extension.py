"""
CYBERDOME MODULE 06 — EXTENSION ENHANCEMENT AUTOMATED VALIDATION SUITE
Tests passive automatic website security assessment, score & baseline classification,
genuine evidence-based findings, SecurityEvent persistence, SSRF defense,
REAL vs SIMULATION segregation, and user-isolated security history retrieval.
"""

import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.models import User, CompanyUser
from app.models.phase4 import SecurityEvent
from app.seed import init_db, seed_data


@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_db():
    await init_db()
    await seed_data()
    yield


async def create_personal_user(client: AsyncClient, prefix: str = "extuser"):
    """Helper to create a personal user and return user id, token, and auth headers."""
    suffix = uuid.uuid4().hex[:6]
    email = f"{prefix}.{suffix}@cyberdome.local"
    password = "Password123!"
    res = await client.post(
        "/api/v1/auth/signup",
        json={
            "name": f"Extension User {suffix}",
            "email": email,
            "password": password,
            "confirm_password": password,
        }
    )
    assert res.status_code == 200, f"Personal signup failed: {res.text}"
    token = res.json()["data"]["token"]
    user_id = res.json()["data"]["user"]["id"]
    return {
        "user_id": user_id,
        "email": email,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"}
    }


async def create_company_admin(client: AsyncClient, prefix: str = "extadmin"):
    """Helper to create a company admin and return user id, token, and auth headers."""
    suffix = uuid.uuid4().hex[:6]
    email = f"{prefix}.{suffix}@cyberdome.corp"
    password = "Password123!"
    res = await client.post(
        "/api/v1/auth/company-signup",
        json={
            "company_name": f"ExtCorp {suffix}",
            "domain": f"extcorp-{suffix}.io",
            "admin_name": f"Admin {suffix}",
            "work_email": email,
            "password": password,
            "confirm_password": password,
        }
    )
    assert res.status_code == 200, f"Company signup failed: {res.text}"
    token = res.json()["data"]["token"]
    user_id = res.json()["data"]["user"]["id"]
    company_id = res.json()["data"]["company"]["id"]
    return {
        "user_id": user_id,
        "company_id": company_id,
        "email": email,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"}
    }


# =====================================================================
# 1. AUTOMATIC SCAN PAYLOAD & CONTRACT VALIDATION
# =====================================================================
@pytest.mark.asyncio
async def test_01_automatic_scan_payload_and_schema():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user = await create_personal_user(client, "auto_scan")

        payload = {
            "url": "https://github.com",
            "mode": "AUTOMATIC",
            "source": "browser_extension",
            "environment": "REAL",
            "record_detection": True
        }

        resp = await client.post(
            "/api/v1/browser/check-url",
            json=payload,
            headers=user["headers"]
        )
        assert resp.status_code == 200
        data = resp.json()["data"]

        # Validate essential schema contract
        assert "url" in data
        assert "domain" in data
        assert "score" in data
        assert "baseline" in data
        assert "verdict" in data
        assert "findingsCount" in data
        assert "findings" in data
        assert isinstance(data["findings"], list)

        # Validate findingsCount keys
        counts = data["findingsCount"]
        for key in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
            assert key in counts
            assert isinstance(counts[key], int)


# =====================================================================
# 2. BASELINE & SCORE CLASSIFICATION: GOOD BASELINE
# =====================================================================
@pytest.mark.asyncio
async def test_02_baseline_and_score_classification_good():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user = await create_personal_user(client, "good_base")

        resp = await client.post(
            "/api/v1/browser/check-url",
            json={
                "url": "https://github.com",
                "mode": "AUTOMATIC",
                "source": "browser_extension"
            },
            headers=user["headers"]
        )
        assert resp.status_code == 200
        data = resp.json()["data"]

        assert data["isSafe"] is True
        assert data["verdict"] in ["SAFE", "UNKNOWN"]
        if data["verdict"] == "SAFE":
            assert data["baseline"] == "GOOD BASELINE"
            assert data["score"] is not None
            assert data["score"] >= 70


# =====================================================================
# 3. BASELINE & SCORE CLASSIFICATION: HIGH RISK
# =====================================================================
@pytest.mark.asyncio
async def test_03_baseline_and_score_classification_high_risk():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user = await create_personal_user(client, "high_risk")

        resp = await client.post(
            "/api/v1/browser/check-url",
            json={
                "url": "http://secure-login-account-verify.xyz",
                "mode": "AUTOMATIC",
                "source": "browser_extension"
            },
            headers=user["headers"]
        )
        assert resp.status_code == 200
        data = resp.json()["data"]

        assert data["isSafe"] is False
        assert data["verdict"] == "DANGEROUS"
        assert data["baseline"] == "HIGH RISK"
        assert data["score"] is not None
        assert data["score"] <= 40
        assert data["findingsCount"]["CRITICAL"] >= 1 or data["findingsCount"]["HIGH"] >= 1


# =====================================================================
# 4. GENUINE EVIDENCE-BASED FINDINGS VALIDATION
# =====================================================================
@pytest.mark.asyncio
async def test_04_genuine_evidence_based_findings():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user = await create_personal_user(client, "evidence")

        resp = await client.post(
            "/api/v1/browser/check-url",
            json={
                "url": "http://paypal-auth-update-notice.top",
                "mode": "AUTOMATIC",
                "source": "browser_extension"
            },
            headers=user["headers"]
        )
        assert resp.status_code == 200
        data = resp.json()["data"]

        findings = data.get("findings", [])
        assert len(findings) > 0

        # Each finding must have authentic inspected attributes
        for finding in findings:
            assert "severity" in finding
            assert finding["severity"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
            assert "title" in finding and len(finding["title"]) > 0
            assert "evidence" in finding and len(finding["evidence"]) > 0
            assert "impact" in finding and len(finding["impact"]) > 0
            assert "recommendation" in finding and len(finding["recommendation"]) > 0
            assert "source" in finding


# =====================================================================
# 5. SECURITY EVENT PERSISTENCE FOR PERSONAL USERS
# =====================================================================
@pytest.mark.asyncio
async def test_05_security_event_persistence_personal_user():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user = await create_personal_user(client, "sec_event")

        test_url = "https://example.org"
        resp = await client.post(
            "/api/v1/browser/check-url",
            json={
                "url": test_url,
                "mode": "AUTOMATIC",
                "source": "browser_extension",
                "record_detection": True
            },
            headers=user["headers"]
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "securityEventId" in data or "security_event_id" in data

        event_id = data.get("securityEventId") or data.get("security_event_id")

        # Query Database directly using SQLAlchemy
        async with AsyncSessionLocal() as session:
            stmt = select(SecurityEvent).where(SecurityEvent.id == event_id)
            res = await session.execute(stmt)
            event = res.scalar_one_or_none()

            assert event is not None
            assert event.user_id == user["user_id"]
            assert event.source == "browser_extension"
            assert event.metadata_json is not None
            assert event.metadata_json.get("mode") == "AUTOMATIC"
            assert event.metadata_json.get("simulation") is False
            assert "baseline" in event.metadata_json


# =====================================================================
# 6. SSRF & PRIVATE IP DEFENSE
# =====================================================================
@pytest.mark.asyncio
async def test_06_ssrf_and_private_ip_blocking():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user = await create_personal_user(client, "ssrf_test")

        forbidden_targets = [
            "http://127.0.0.1:8000/internal",
            "http://localhost:5432",
            "http://169.254.169.254/latest/meta-data",
            "http://10.0.0.1/admin"
        ]

        for target in forbidden_targets:
            resp = await client.post(
                "/api/v1/browser/check-url",
                json={
                    "url": target,
                    "mode": "AUTOMATIC",
                    "source": "browser_extension",
                    "record_detection": True
                },
                headers=user["headers"]
            )
            assert resp.status_code == 200
            data = resp.json()["data"]
            assert data["isSafe"] is False
            assert data["status"] == "MALICIOUS"
            assert data["baseline"] == "HIGH RISK"
            assert data["score"] == 15
            assert "Private or blocked IP/domain" in data["phishingIndicators"]


# =====================================================================
# 7. REAL VS SIMULATION SEGREGATION
# =====================================================================
@pytest.mark.asyncio
async def test_07_simulation_vs_real_segregation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user = await create_personal_user(client, "seg_user")

        # 1. Normal real browsing
        resp_real = await client.post(
            "/api/v1/browser/check-url",
            json={
                "url": "https://wikipedia.org",
                "mode": "AUTOMATIC",
                "source": "browser_extension",
                "environment": "REAL",
                "record_detection": True
            },
            headers=user["headers"]
        )
        assert resp_real.status_code == 200
        real_event_id = resp_real.json()["data"]["securityEventId"]

        # 2. Simulated drill scan
        resp_sim = await client.post(
            "/api/v1/browser/check-url",
            json={
                "url": "https://wikipedia.org",
                "mode": "AUTOMATIC",
                "source": "browser_extension",
                "environment": "SIMULATION",
                "record_detection": True
            },
            headers=user["headers"]
        )
        assert resp_sim.status_code == 200
        sim_event_id = resp_sim.json()["data"]["securityEventId"]

        # Verify DB segregation
        async with AsyncSessionLocal() as session:
            real_ev = (await session.execute(select(SecurityEvent).where(SecurityEvent.id == real_event_id))).scalar_one()
            sim_ev = (await session.execute(select(SecurityEvent).where(SecurityEvent.id == sim_event_id))).scalar_one()

            assert real_ev.environment == "REAL"
            assert real_ev.metadata_json["simulation"] is False

            assert sim_ev.environment == "SIMULATION"
            assert sim_ev.metadata_json["simulation"] is True


# =====================================================================
# 8. SECURITY HISTORY RETRIEVAL ENDPOINT
# =====================================================================
@pytest.mark.asyncio
async def test_08_security_history_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user = await create_personal_user(client, "history_user")

        # Scan two distinct websites
        await client.post(
            "/api/v1/browser/check-url",
            json={"url": "https://python.org", "mode": "AUTOMATIC", "record_detection": True},
            headers=user["headers"]
        )
        await client.post(
            "/api/v1/browser/check-url",
            json={"url": "https://fastapi.tiangolo.com", "mode": "AUTOMATIC", "record_detection": True},
            headers=user["headers"]
        )

        # Retrieve history via personal endpoint
        res = await client.get("/api/v1/personal/security-history", headers=user["headers"])
        assert res.status_code == 200
        data = res.json()["data"]

        assert data["total"] >= 2
        events = data["events"]
        assert len(events) >= 2

        # Check latest event formatting
        latest = events[0]
        assert "url" in latest
        assert "domain" in latest
        assert "verdict" in latest
        assert "baseline" in latest
        assert "score" in latest
        assert "findingsCount" in latest
        assert "timestamp" in latest

        # Retrieve history via browser extension alias
        res_alias = await client.get("/api/v1/browser/history", headers=user["headers"])
        assert res_alias.status_code == 200
        assert res_alias.json()["data"]["total"] >= 2


# =====================================================================
# 9. STRICT TENANT & USER ISOLATION
# =====================================================================
@pytest.mark.asyncio
async def test_09_tenant_and_user_isolation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user_a = await create_personal_user(client, "user_a")
        user_b = await create_personal_user(client, "user_b")

        # User A performs private scan
        target_a = "https://user-a-private-domain.com"
        await client.post(
            "/api/v1/browser/check-url",
            json={"url": target_a, "record_detection": True},
            headers=user_a["headers"]
        )

        # User B queries their history
        res_b = await client.get("/api/v1/personal/security-history", headers=user_b["headers"])
        assert res_b.status_code == 200
        history_b = res_b.json()["data"]["events"]

        # Ensure User A's private target is not in User B's history
        urls_b = [item["url"] for item in history_b]
        assert target_a not in urls_b


# =====================================================================
# 10. INPUT VALIDATION: EMPTY TARGET URL
# =====================================================================
@pytest.mark.asyncio
async def test_10_empty_url_handling():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user = await create_personal_user(client, "empty_url")

        resp = await client.post(
            "/api/v1/browser/check-url",
            json={"url": "   "},
            headers=user["headers"]
        )
        assert resp.status_code == 422


# =====================================================================
# 11. BROWSER ALIAS ENDPOINT PARITY
# =====================================================================
@pytest.mark.asyncio
async def test_11_browser_alias_endpoint_parity():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user = await create_personal_user(client, "parity")

        payload = {"url": "https://cyberdome.io", "mode": "MANUAL", "record_detection": False}

        resp_personal = await client.post("/api/v1/personal/url-check", json=payload, headers=user["headers"])
        resp_browser = await client.post("/api/v1/browser/check-url", json=payload, headers=user["headers"])

        assert resp_personal.status_code == 200
        assert resp_browser.status_code == 200

        data_personal = resp_personal.json()["data"]
        data_browser = resp_browser.json()["data"]

        assert data_personal["verdict"] == data_browser["verdict"]
        assert data_personal["baseline"] == data_browser["baseline"]
        assert data_personal["score"] == data_browser["score"]
        assert data_personal["findingsCount"] == data_browser["findingsCount"]
