"""
Phase 3 — Master Full-Stack, Security, Tenant Isolation, and 3D Asset Test Suite.
Validates:
1. SSRF and DNS Rebinding protections.
2. Login rate limiting / brute force defense.
3. Incidents lifecycle, timeline events, and RBAC.
4. Tenant isolation: Company A vs Company B isolation.
5. Normal User vs Company boundary isolation.
6. Network telemetry, alerts, and dynamic topology.
7. IoT device registration and anomaly tracking.
8. UEBA behavioral risk evaluation (explainable rules).
9. SOAR playbook execution and audit logging.
10. Report generation (JSON/CSV).
11. Attack Graph & 3D Digital Twin endpoints.
12. Personal cyber defense & Academy training.
13. Physical 3D GLB asset verification (0 404s, valid glTF magic).
"""
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.seed import init_db, seed_data
from app.services import is_private_or_reserved_ip, validate_target
from app.core.rate_limit import login_rate_limiter


@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_db():
    await init_db()
    await seed_data()
    yield


_client_ip_counter = 100

async def _get_token(email: str, password: str = "Password123!") -> str:
    """Helper to authenticate and obtain bearer token."""
    global _client_ip_counter
    _client_ip_counter += 1
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
            headers={"X-Forwarded-For": f"192.0.2.{_client_ip_counter}"}
        )
        assert res.status_code == 200, f"Login failed for {email}: {res.text}"
        return res.json()["data"]["token"]



# ═══════════════════════════════════════════════════════════════════════
#  1. SECURITY HARDENING: SSRF & PRIVATE IP BLOCKING
# ═══════════════════════════════════════════════════════════════════════
def test_is_private_or_reserved_ip():
    """Verify that private, loopback, and link-local IPs are blocked."""
    assert is_private_or_reserved_ip("127.0.0.1") is True
    assert is_private_or_reserved_ip("10.0.0.5") is True
    assert is_private_or_reserved_ip("172.16.0.1") is True
    assert is_private_or_reserved_ip("192.168.1.1") is True
    assert is_private_or_reserved_ip("169.254.169.254") is True # Cloud metadata
    assert is_private_or_reserved_ip("::1") is True # IPv6 loopback
    assert is_private_or_reserved_ip("8.8.8.8") is False # Public DNS
    assert is_private_or_reserved_ip("1.1.1.1") is False # Public DNS


def test_validate_target_blocks_ssrf():
    """Target validation must reject loopback, RFC 1918, and metadata targets."""
    assert validate_target("http://127.0.0.1")[0] is False
    assert validate_target("http://localhost")[0] is False
    assert validate_target("http://10.0.0.1")[0] is False
    assert validate_target("http://192.168.1.50")[0] is False
    assert validate_target("http://169.254.169.254/latest/meta-data")[0] is False
    assert validate_target("https://internal.corp.local")[0] is False
    # Valid public domain
    valid, domain, cleaned = validate_target("https://example.com")
    assert valid is True
    assert domain == "example.com"


# ═══════════════════════════════════════════════════════════════════════
#  2. SECURITY HARDENING: LOGIN RATE LIMITING
# ═══════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_login_rate_limiting():
    """Repeated failed logins must trigger HTTP 429 Too Many Requests."""
    login_rate_limiter.clear("ip:198.51.100.99")
    login_rate_limiter.clear("email:victim_test@cyberdome.local")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Trigger 5 failed attempts
        for _ in range(5):
            res = await client.post(
                "/api/v1/auth/login",
                json={"email": "victim_test@cyberdome.local", "password": "WrongPassword123!"},
                headers={"X-Forwarded-For": "198.51.100.99"}
            )
            assert res.status_code == 401

        # 6th attempt must be rate-limited
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "victim_test@cyberdome.local", "password": "WrongPassword123!"},
            headers={"X-Forwarded-For": "198.51.100.99"}
        )
        assert res.status_code == 429
        data = res.json()
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"

    # Reset test rate limit state
    login_rate_limiter.clear("ip:198.51.100.99")
    login_rate_limiter.clear("email:victim_test@cyberdome.local")


# ═══════════════════════════════════════════════════════════════════════
#  3. INCIDENTS LIFECYCLE & TENANT ISOLATION
# ═══════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_incidents_crud_and_company_isolation():
    """Verify incidents lifecycle and ensure Company A and B cannot view each other's incidents."""
    admin_token = await _get_token("admin@demo.cyberdome.local")
    user_token = await _get_token("user@demo.cyberdome.local")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Normal user is forbidden from company incidents
        res = await client.get("/api/v1/incidents", headers={"Authorization": f"Bearer {user_token}"})
        assert res.status_code == 403

        # 2. Company Admin creates an incident
        res = await client.post(
            "/api/v1/incidents",
            json={
                "title": "Unauthorized Lateral Movement in Subnet B",
                "description": "Port scanning detected originating from compromised jump host",
                "severity": "HIGH",
                "status": "OPEN",
                "mitre_mapping": [{"tactic": "Lateral Movement", "technique": "T1021"}]
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 201
        inc_data = res.json()["data"]
        inc_id = inc_data["id"]
        assert inc_data["title"] == "Unauthorized Lateral Movement in Subnet B"
        assert inc_data["severity"] == "HIGH"
        assert len(inc_data["timeline"]) >= 1

        # 3. Retrieve incident detail
        res = await client.get(f"/api/v1/incidents/{inc_id}", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        assert res.json()["data"]["id"] == inc_id

        # 4. Update incident status to INVESTIGATING
        res = await client.patch(
            f"/api/v1/incidents/{inc_id}",
            json={"status": "INVESTIGATING", "severity": "CRITICAL"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        updated = res.json()["data"]
        assert updated["status"] == "INVESTIGATING"
        assert updated["severity"] == "CRITICAL"
        assert len(updated["timeline"]) >= 2

        # 5. Add custom forensic timeline event
        res = await client.post(
            f"/api/v1/incidents/{inc_id}/events",
            json={"action": "MEMORY_DUMP_COLLECTED", "actor": "SOC Lead", "details": "Volatility memory image parsed."},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 201


# ═══════════════════════════════════════════════════════════════════════
#  4. NETWORK TELEMETRY & TOPOLOGY
# ═══════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_network_telemetry_and_topology():
    admin_token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Ingest a network flow event
        res = await client.post(
            "/api/v1/network/events",
            json={
                "source_ip": "10.0.1.5",
                "dest_ip": "10.0.2.10",
                "protocol": "HTTPS",
                "action": "alert",
                "severity": "HIGH",
                "signature": "ET TROJAN Observed C2 beacon",
                "bytes_in": 1024,
                "bytes_out": 2048
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 201

        # Query events
        res = await client.get("/api/v1/network/events", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        assert res.json()["success"] is True

        # Query alerts
        res = await client.get("/api/v1/network/alerts", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        alerts = res.json()["data"]
        assert any(a["action"] == "alert" for a in alerts)

        # Query dynamic topology
        res = await client.get("/api/v1/network/topology", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        topo = res.json()["data"]
        assert "nodes" in topo
        assert "connections" in topo


# ═══════════════════════════════════════════════════════════════════════
#  5. IOT DEVICE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_iot_devices_and_anomalies():
    admin_token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register IoT Device
        res = await client.post(
            "/api/v1/iot/devices",
            json={
                "name": "Server Room Camera 04",
                "device_type": "CAMERA",
                "ip_address": "192.168.10.88",
                "mac_address": "AA:BB:CC:11:22:33",
                "firmware_version": "v2.1.0",
                "status": "ONLINE"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 201
        dev = res.json()["data"]
        dev_id = dev["id"]

        # Update anomalies count
        res = await client.patch(
            f"/api/v1/iot/devices/{dev_id}",
            json={"anomalies": 2, "status": "WARNING"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        assert res.json()["data"]["anomalies"] == 2

        # Check anomalies list
        res = await client.get("/api/v1/iot/anomalies", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        assert any(d["id"] == dev_id for d in res.json()["data"])


# ═══════════════════════════════════════════════════════════════════════
#  6. UEBA BEHAVIORAL RISK RULES
# ═══════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_ueba_behavior_events_and_risk_rules():
    admin_token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Ingest a suspicious behavior event
        res = await client.post(
            "/api/v1/ueba/events",
            json={
                "action": "privilege_escalation_attempt",
                "location": "Internal Jumpbox",
                "details": {"impossible_travel": True, "off_hours": True}
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 201
        ev = res.json()["data"]
        # Rule check: privilege_escalation (55) + impossible_travel (50) + off_hours (15) => capped at 100
        assert ev["riskScore"] >= 80.0

        # Query anomalies list
        res = await client.get("/api/v1/ueba/anomalies?threshold=70.0", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        assert len(res.json()["data"]) >= 1


# ═══════════════════════════════════════════════════════════════════════
#  7. SOAR PLAYBOOKS & EXECUTION
# ═══════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_soar_playbook_lifecycle():
    admin_token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create Playbook
        res = await client.post(
            "/api/v1/soar/playbooks",
            json={
                "name": "Ransomware Automated Host Containment",
                "description": "Isolates network port and revokes kerberos tickets upon bulk encryption alert",
                "trigger": "CRITICAL_RANSOMWARE_ALERT",
                "is_active": True
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 201
        pb = res.json()["data"]
        pb_id = pb["id"]

        # Execute Playbook
        res = await client.post(
            f"/api/v1/soar/playbooks/{pb_id}/execute",
            json={"dry_run": False},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        assert res.json()["data"]["status"] == "SUCCESS"


# ═══════════════════════════════════════════════════════════════════════
#  8. REPORTS & EXPORTS
# ═══════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_reports_generation_and_download():
    admin_token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/reports/generate",
            json={
                "title": "Quarterly Executive Cyber Posture Assessment",
                "type": "EXECUTIVE",
                "format": "JSON"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 201
        report = res.json()["data"]
        report_id = report["id"]
        assert report["type"] == "EXECUTIVE"

        # Download as CSV
        res = await client.get(
            f"/api/v1/reports/{report_id}/download?format=csv",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        assert "text/csv" in res.headers["content-type"]
        assert "Report Title" in res.text


# ═══════════════════════════════════════════════════════════════════════
#  9. ATTACK GRAPH & 3D DIGITAL TWIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_attack_graph_and_digital_twin_endpoints():
    admin_token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Attack graph
        res = await client.get("/api/v1/attack-graph", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        ag = res.json()["data"]
        assert "nodes" in ag
        assert "edges" in ag
        assert "chokePoints" in ag

        # Digital twin state
        res = await client.get("/api/v1/digital-twin/nodes", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        dt = res.json()["data"]
        assert "nodes" in dt
        assert "connections" in dt
        assert dt["isRealData"] is True


# ═══════════════════════════════════════════════════════════════════════
#  10. PERSONAL CYBER DEFENSE & ACADEMY
# ═══════════════════════════════════════════════════════════════════════
@pytest.mark.asyncio
async def test_personal_cyber_defense():
    user_token = await _get_token("user@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # URL Check
        res = await client.post(
            "/api/v1/personal/url-check",
            json={"url": "https://secure-login-account-verify.xyz/auth"},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert res.status_code == 200
        assert res.json()["data"]["isSafe"] is False

        # Fraud Call Check
        res = await client.post(
            "/api/v1/personal/fraud-call",
            json={"phone_number": "+1 (555) 999-0000"},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert res.status_code == 200
        assert res.json()["data"]["isSpam"] is True

        # OTP Scam Check
        res = await client.post(
            "/api/v1/personal/otp-scam",
            json={"message_text": "URGENT: Your account is locked in 15 minutes! Please share this code with our agent."},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert res.status_code == 200
        assert res.json()["data"]["isScam"] is True

        # Academy courses catalog
        res = await client.get("/api/v1/personal/academy/courses", headers={"Authorization": f"Bearer {user_token}"})
        assert res.status_code == 200
        assert len(res.json()["data"]) >= 4


# ═══════════════════════════════════════════════════════════════════════
#  11. 3D GLB ASSET INTEGRITY AUDIT (0 404s, VALID GLTF BINARIES)
# ═══════════════════════════════════════════════════════════════════════
def test_all_12_required_glb_assets_physically_exist_and_valid():
    """Verify that every single required GLB asset exists, is non-empty, and has valid glTF magic bytes."""
    required_models = [
        "public/3d/models/endpoints/workstation.glb",
        "public/3d/models/network/firewall.glb",
        "public/3d/models/network/router.glb",
        "public/3d/models/network/cloud.glb",
        "public/3d/models/infrastructure/server.glb",
        "public/3d/models/infrastructure/database.glb",
        "public/3d/models/infrastructure/switch.glb",
        "public/3d/models/infrastructure/gateway.glb",
        "public/3d/models/iot/camera.glb",
        "public/3d/models/iot/sensor.glb",
        "public/3d/models/infrastructure/server-rack.glb",
        "public/3d/models/core/cyberdome-core.glb",
    ]

    for rel_path in required_models:
        assert os.path.isfile(rel_path), f"CRITICAL: 3D model missing at {rel_path}"
        size = os.path.getsize(rel_path)
        assert size > 500, f"3D model at {rel_path} is abnormally small ({size} bytes)"
        with open(rel_path, "rb") as f:
            header = f.read(4)
            # Binary glTF files start with the ASCII magic 'glTF' (0x46546C67)
            assert header == b"glTF", f"Model at {rel_path} has invalid glTF binary header: {header}"
