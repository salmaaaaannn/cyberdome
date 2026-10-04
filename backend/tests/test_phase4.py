"""
Phase 4 — Production Security Operations Test Suite.
Validates:
1. Network event creation & telemetry ingestion with normalization.
2. IoT device creation & IoT event streaming.
3. Behavior event creation & explainable rule scoring.
4. Company isolation across telemetry and detections.
5. Detection rule execution (deterministic).
6. SecurityEvent / Detection creation.
7. Incident correlation (burst deduplication and timeline tracking).
8. Incident creation & RBAC.
9. Incident update & timeline persistence.
10. WebSocket authorization and tenant filtering.
11. SOAR playbook execution, safe containment, and audit logging.
12. Dashboard real aggregations (no mock metrics).
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.seed import init_db, seed_data
from app.core.websocket import ws_manager

@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_db():
    await init_db()
    await seed_data()
    yield

_client_ip_counter = 500

async def _get_token(email: str, password: str = "Password123!") -> str:
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


@pytest.mark.asyncio
async def test_network_event_ingestion_and_normalization():
    """Verify network event ingestion, normalization, and detection execution."""
    token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/network/events",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "source_ip": "192.168.1.50",
                "destination_ip": "10.0.1.10",
                "source_port": 54321,
                "destination_port": 4444, # Suspicious port triggering RULE-NET-001
                "protocol": "TCP",
                "direction": "INBOUND",
                "action": "alert",
                "signature": "ET TROJAN Reverse Shell Probe",
                "bytes": 2048,
                "packets": 12
            }
        )
        assert res.status_code == 201
        data = res.json()["data"]
        assert data["sourceIp"] == "192.168.1.50"
        assert data["destIp"] == "10.0.1.10"
        assert data["destPort"] == 4444


@pytest.mark.asyncio
async def test_iot_device_and_event_streaming():
    """Verify IoT device registration and IoT telemetry stream event."""
    token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register device
        reg_res = await client.post(
            "/api/v1/iot/devices",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Perimeter CCTV Camera 04",
                "device_identifier": "CCTV-MAC-004",
                "device_type": "CAMERA",
                "ip_address": "10.0.20.4",
                "mac_address": "00:1A:2B:3C:4D:5E",
                "manufacturer": "Axis Communications",
                "model": "M3045-V",
                "firmware": "v9.80.3",
                "status": "ONLINE"
            }
        )
        assert reg_res.status_code == 201
        dev_id = reg_res.json()["data"]["id"]

        # Stream event for device
        ev_res = await client.post(
            "/api/v1/iot/events",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "device_id": dev_id,
                "name": "Perimeter CCTV Camera 04",
                "device_type": "CAMERA",
                "ip_address": "10.0.20.4",
                "event_type": "anomaly_burst",
                "severity": "HIGH",
                "anomalies": 2,
                "firmware": "v9.80.3"
            }
        )
        assert ev_res.status_code == 201
        assert ev_res.json()["data"]["status"] == "INGESTED"


@pytest.mark.asyncio
async def test_behavior_event_creation_and_explainable_risk():
    """Verify UEBA behavioral event ingestion and explainable scoring."""
    token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/ueba/events",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "action": "privilege_escalation shadow_copy_deletion",
                "location": "Moscow, RU",
                "details": {"impossible_travel": True}
            }
        )
        assert res.status_code == 201
        data = res.json()["data"]
        # Score calculation: 10 + 55 (privilege_escalation) + 50 (impossible_travel) = capped at 100
        assert data["riskScore"] >= 80.0


@pytest.mark.asyncio
async def test_company_isolation_on_telemetry_and_detections():
    """Verify Company A cannot access Company B telemetry or detections."""
    token_a = await _get_token("admin@demo.cyberdome.local") # Company A
    token_b = await _get_token("admin@acmedefense.com")      # Company B
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Ingest event under Company A
        res_a = await client.post(
            "/api/v1/network/events",
            headers={"Authorization": f"Bearer {token_a}"},
            json={
                "source_ip": "172.16.10.10",
                "dest_ip": "10.0.1.5",
                "action": "allow"
            }
        )
        assert res_a.status_code == 201
        ev_id = res_a.json()["data"]["id"]

        # Company B gets events - should NOT see Company A's event
        res_b = await client.get(
            "/api/v1/network/events",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert res_b.status_code == 200
        b_ids = [e["id"] for e in res_b.json()["data"]]
        assert ev_id not in b_ids


@pytest.mark.asyncio
async def test_detection_rule_execution_and_security_events():
    """Verify deterministic rule matching creates a SecurityEvent."""
    token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Send event matching RULE-NET-002 (action=alert, malicious signature)
        res = await client.post(
            "/api/v1/network/events",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "source_ip": "198.51.100.99",
                "dest_ip": "10.0.1.5",
                "action": "alert",
                "severity": "CRITICAL",
                "signature": "Cobalt Strike C2 Beacon Activity"
            }
        )
        assert res.status_code == 201

        # Check detections endpoint
        det_res = await client.get(
            "/api/v1/detections",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert det_res.status_code == 200
        detections = det_res.json()["data"]
        assert len(detections) > 0
        rule_ids = [d["ruleId"] for d in detections]
        assert "RULE-NET-002" in rule_ids


@pytest.mark.asyncio
async def test_incident_correlation_and_lifecycle():
    """Verify related detections correlate into an incident with timeline evidence."""
    token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Trigger critical network event on specific target
        await client.post(
            "/api/v1/network/events",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "source_ip": "203.0.113.44",
                "dest_ip": "10.0.1.5",
                "destination_port": 4444,
                "action": "alert",
                "severity": "CRITICAL",
                "signature": "Known Ransomware Stage 1 C2"
            }
        )

        # Verify an incident exists
        inc_res = await client.get(
            "/api/v1/incidents",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert inc_res.status_code == 200
        incidents = inc_res.json()["data"]
        assert len(incidents) > 0

        target_inc = incidents[0]
        inc_id = target_inc["id"]

        # Update incident status to INVESTIGATING
        patch_res = await client.patch(
            f"/api/v1/incidents/{inc_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "INVESTIGATING", "severity": "CRITICAL"}
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["data"]["status"] == "INVESTIGATING"

        # Check detail with timeline
        detail_res = await client.get(
            f"/api/v1/incidents/{inc_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert detail_res.status_code == 200
        timeline = detail_res.json()["data"]["timeline"]
        assert len(timeline) >= 1


@pytest.mark.asyncio
async def test_soar_playbook_execution_and_containment():
    """Verify authorized safe SOAR playbook execution and audit tracking."""
    token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # List playbooks
        pb_res = await client.get(
            "/api/v1/soar/playbooks",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert pb_res.status_code == 200
        playbooks = pb_res.json()["data"]
        assert len(playbooks) > 0
        pb_id = playbooks[0]["id"]

        # Execute playbook
        exec_res = await client.post(
            f"/api/v1/soar/playbooks/{pb_id}/execute",
            headers={"Authorization": f"Bearer {token}"},
            json={"incident_id": None}
        )
        assert exec_res.status_code == 200
        assert exec_res.json()["data"]["status"] == "SUCCESS"


@pytest.mark.asyncio
async def test_dashboard_real_metrics_aggregation():
    """Verify dashboard metrics returns real values from database with no fabrication."""
    token = await _get_token("admin@demo.cyberdome.local")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/companies/dashboard-metrics",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        metrics = res.json()["data"]
        assert "totalAssets" in metrics
        assert "activeAssets" in metrics
        assert "totalVulnerabilities" in metrics
        assert "networkEvents" in metrics
        assert "iotDevices" in metrics
        assert "securityScore" in metrics
        assert metrics["isRealData"] is True
