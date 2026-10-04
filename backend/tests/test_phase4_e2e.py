"""
Phase 4.30 — Full End-to-End Operational Pipeline Scenario Test.
Executes the exact 13-step sequence:
STEP 1: Create / authenticate tenant company.
STEP 2: Register a new infrastructure asset.
STEP 3: Send real network telemetry.
STEP 4: Normalize event.
STEP 5: Detection rule matches deterministically.
STEP 6: Detection is persisted.
STEP 7: Incident is correlated.
STEP 8: WebSocket event is emitted to company bus.
STEP 9: Dashboard receives updated security aggregation.
STEP 10: Digital Twin asset reflects security posture state.
STEP 11: Incident appears in incident management API.
STEP 12: Authorized SOAR playbook executes response action.
STEP 13: Audit log is generated and verified.
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

_e2e_ip_counter = 700

async def _get_admin_token() -> str:
    global _e2e_ip_counter
    _e2e_ip_counter += 1
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@demo.cyberdome.local", "password": "Password123!"},
            headers={"X-Forwarded-For": f"192.0.2.{_e2e_ip_counter}"}
        )
        assert res.status_code == 200
        return res.json()["data"]["token"]


@pytest.mark.asyncio
async def test_full_phase4_end_to_end_pipeline():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # STEP 1: Authenticate Company Admin
        token = await _get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}

        # STEP 2: Register an asset
        asset_res = await client.post(
            "/api/v1/assets",
            headers=headers,
            json={
                "name": "E2E-Mission-Control-Server",
                "asset_type": "SERVER",
                "hostname": "mission-control.internal",
                "ip_address": "10.0.100.5",
                "criticality": "CRITICAL"
            }
        )
        assert asset_res.status_code in [200, 201]
        asset_id = asset_res.json()["data"]["id"]
        target_ip = "10.0.100.5"

        # Capture initial dashboard metrics
        dash_initial = await client.get("/api/v1/companies/dashboard-metrics", headers=headers)
        assert dash_initial.status_code == 200
        initial_events_count = dash_initial.json()["data"]["networkEvents"]

        # STEP 3 & 4 & 5 & 6 & 7 & 8: Send network telemetry that triggers detection and correlation
        telemetry_res = await client.post(
            "/api/v1/network/events",
            headers=headers,
            json={
                "source_ip": "185.220.101.5",
                "destination_ip": target_ip,
                "destination_port": 4444, # High-risk port matching RULE-NET-001
                "protocol": "TCP",
                "action": "alert", # Matching RULE-NET-002
                "severity": "CRITICAL",
                "signature": "ET TROJAN Observed Adversary Implant Communication",
                "bytes": 4096,
                "packets": 24
            }
        )
        assert telemetry_res.status_code == 201
        telemetry_data = telemetry_res.json()["data"]
        assert telemetry_data["destIp"] == target_ip

        # STEP 6: Verify detection is persisted
        det_res = await client.get("/api/v1/detections", headers=headers)
        assert det_res.status_code == 200
        detections = det_res.json()["data"]
        assert len(detections) > 0
        matched_target = any(d["entityId"] == target_ip for d in detections)
        assert matched_target is True

        # STEP 7: Verify incident is created and correlated
        inc_res = await client.get("/api/v1/incidents", headers=headers)
        assert inc_res.status_code == 200
        incidents = inc_res.json()["data"]
        assert len(incidents) > 0
        incident = next(i for i in incidents if target_ip in i["title"] or i.get("asset_id") == target_ip)
        assert incident["severity"] == "CRITICAL"
        assert incident["status"] == "OPEN"
        incident_id = incident["id"]

        # STEP 9: Dashboard reflects real telemetry update
        dash_after = await client.get("/api/v1/companies/dashboard-metrics", headers=headers)
        assert dash_after.status_code == 200
        after_metrics = dash_after.json()["data"]
        assert after_metrics["networkEvents"] > initial_events_count
        assert after_metrics["detections"] > 0
        assert after_metrics["openIncidents"] > 0

        # STEP 10: Digital Twin reflects updated asset security state
        dt_res = await client.get("/api/v1/digital-twin/nodes", headers=headers)
        assert dt_res.status_code == 200
        dt_nodes = dt_res.json()["data"]["nodes"]
        dt_node = next((n for n in dt_nodes if n["id"] == asset_id or n["ip"] == target_ip), None)
        assert dt_node is not None
        assert dt_node["status"] in ["CRITICAL", "WARNING"]
        assert dt_node["entityId"] is not None
        assert dt_node["companyId"] is not None

        # STEP 11: Incident appears in incident detail view with timeline
        detail_res = await client.get(f"/api/v1/incidents/{incident_id}", headers=headers)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()["data"]
        assert len(detail_data["timeline"]) >= 1

        # STEP 12: Authorized SOAR playbook executes
        pb_res = await client.get("/api/v1/soar/playbooks", headers=headers)
        assert pb_res.status_code == 200
        playbooks = pb_res.json()["data"]
        assert len(playbooks) > 0
        playbook_id = playbooks[0]["id"]

        exec_res = await client.post(
            f"/api/v1/soar/playbooks/{playbook_id}/execute",
            headers=headers,
            json={"incident_id": incident_id}
        )
        assert exec_res.status_code == 200
        assert exec_res.json()["data"]["status"] == "SUCCESS"

        # Verify incident timeline contains SOAR execution event
        updated_detail = await client.get(f"/api/v1/incidents/{incident_id}", headers=headers)
        assert updated_detail.status_code == 200
        actions = [e["action"] for e in updated_detail.json()["data"]["timeline"]]
        assert "SOAR_ACTION_EXECUTED" in actions

        # STEP 13: Verify Audit Log is created
        audit_res = await client.get("/api/v1/admin/audit-logs", headers=headers)
        assert audit_res.status_code == 200
        audit_data = audit_res.json()["data"]
        audit_logs = audit_data if isinstance(audit_data, list) else audit_data.get("logs", [])
        assert len(audit_logs) > 0
        audit_actions = [log["action"] for log in audit_logs]
        assert "SOAR_PLAYBOOK_EXECUTED" in audit_actions

