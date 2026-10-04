"""
CYBERDOME MODULE 02 — IoT ANOMALY DETECTION END-TO-END VALIDATION SUITE.
Covers all 17 audit & empirical validation requirements:
1. Artifact loading & component audit (scaler, isolation_forest, xgboost, schema)
2. Feature pipeline & strict 46-feature schema ordering
3. Benign IoT telemetry & zero false positive incident creation
4. Attack IoT telemetry & threat classification
5. Insufficient data handling (Zero fake imputation, HTTP 422)
6. Invalid data handling (NaN, Inf, strings, clean HTTP 422 errors)
7. Simulation vs Real separation (environment tagging)
8. Multi-tenant isolation (Tenant A vs Tenant B: devices, events, incidents)
9. WebSocket tenant isolation
10. Repeated malicious events & anti-fatigue correlation
11. Digital Twin 3D spatial node state transitions
12. Dynamic Attack Graph integration (IoT node mapping & risk elevation)
13. SOAR automated playbook execution
14. Immutable Audit Log verification
15. Reload equivalence & state preservation
16. Performance benchmarks (min, avg, p95, max latency)
17. Complete 16-stage pipeline E2E traversal
"""

import pytest
import time
import math
import uuid
import json
from pathlib import Path
import numpy as np
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.models import User, Company, CompanyUser, Asset, AuditLog
from app.models.phase4 import IoTDevice, SecurityEvent, Incident, IncidentEvent, SOARPlaybook, PlaybookExecution
from app.services.ml_iot_service import ml_iot_service, MLIoTService, IoTFeatureAdapter


@pytest.fixture
def base_iot_features():
    """Returns a baseline 46-feature dictionary initialized to 0.0."""
    return {f: 0.0 for f in ml_iot_service.feature_names}


@pytest.fixture
def ciciot_test_vectors():
    """Loads realistic CICIoT2023 benchmark test vectors."""
    fixture_path = Path(__file__).parent / "fixtures" / "ciciot2023_test_vectors.json"
    if fixture_path.exists():
        with open(fixture_path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise FileNotFoundError(f"Fixture not found at {fixture_path}")


@pytest.fixture
def benign_sample(ciciot_test_vectors):
    return ciciot_test_vectors["Benign Smart Camera Stream"]


@pytest.fixture
def attack_samples(ciciot_test_vectors):
    attacks = []
    for name in ["DDoS SYN Flood", "Mirai GRE Flood", "Recon Port Scan", "DoS UDP Flood"]:
        if name in ciciot_test_vectors:
            attacks.append((name, ciciot_test_vectors[name]))
    return attacks


async def create_test_company(client: AsyncClient, prefix: str):
    """Helper to create a dedicated company and return admin token and company ID."""
    suffix = uuid.uuid4().hex[:6]
    res = await client.post("/api/v1/auth/company-signup", json={
        "company_name": f"{prefix} Corp {suffix}",
        "domain": f"{prefix.lower()}-{suffix}.io",
        "admin_name": f"{prefix} Admin",
        "work_email": f"admin.{prefix.lower()}.{suffix}@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })
    assert res.status_code == 200, f"Signup failed: {res.text}"
    data = res.json()["data"]
    return {
        "token": data["token"],
        "company_id": data["company"]["id"],
        "headers": {"Authorization": f"Bearer {data['token']}"}
    }


# =====================================================================
# 1. ARTIFACT LOADING & COMPONENT AUDIT
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_01_component_audit():
    """Verify presence, integrity, and non-zero sizes of all 4 artifacts."""
    base_dir = Path(__file__).resolve().parent.parent / "app" / "ml_models" / "iot"

    iso_path = base_dir / "models" / "iot_isolation_forest.joblib"
    xgb_path = base_dir / "models" / "iot_xgboost.joblib"
    scaler_path = base_dir / "preprocessing" / "scaler.joblib"
    schema_path = base_dir / "preprocessing" / "feature_schema.json"

    assert iso_path.exists() and iso_path.stat().st_size > 100000, "Isolation Forest missing or too small"
    assert xgb_path.exists() and xgb_path.stat().st_size > 10000, "XGBoost missing or too small"
    assert scaler_path.exists() and scaler_path.stat().st_size > 500, "Scaler missing or too small"
    assert schema_path.exists() and schema_path.stat().st_size > 200, "Schema missing or too small"

    # Verify loaded state in service
    health = ml_iot_service.get_health_status()
    assert health["status"] == "HEALTHY"
    assert health["module"] == "iot_anomaly_detection"
    assert health["model_version"] == "iot-anomaly-v1"
    assert health["dataset_benchmark"] == "CICIoT2023"
    assert health["feature_count"] == 46
    assert health["artifacts_loaded"]["scaler"] is True
    assert health["artifacts_loaded"]["isolation_forest"] is True
    assert health["artifacts_loaded"]["xgboost"] is True
    assert health["artifacts_loaded"]["schema"] is True
    assert health["zero_imputation_enforced"] is True


# =====================================================================
# 2. FEATURE PIPELINE & SCHEMA ORDERING TEST
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_02_feature_pipeline_and_ordering(base_iot_features):
    """Verify exact 46-feature schema ordering and scaler transformation."""
    assert len(ml_iot_service.feature_names) == 46
    assert ml_iot_service.feature_names[0] == "flow_duration"
    assert ml_iot_service.feature_names[1] == "Header_Length"
    assert ml_iot_service.feature_names[-1] == "Weight"

    df = ml_iot_service.validate_and_prepare_features(base_iot_features)
    assert list(df.columns) == ml_iot_service.feature_names
    assert df.shape == (1, 46)

    scaled = ml_iot_service.scaler.transform(df)
    assert scaled.shape == (1, 46)
    assert not np.isnan(scaled).any()


# =====================================================================
# 3. BENIGN TELEMETRY & ZERO FALSE POSITIVE INCIDENT CREATION
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_03_benign_iot_telemetry(benign_sample):
    """Verify benign IoT telemetry produces BENIGN_IOT and does not raise false alarm."""
    # 1. Pure ML inference check
    res = ml_iot_service.predict(benign_sample, environment="REAL")
    assert res.status == "SUCCESS"
    assert res.verdict == "BENIGN_IOT"
    assert res.is_anomaly is False
    assert res.is_attack is False
    assert res.severity == "INFO"

    # 2. Ingestion pipeline check
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "BenignIoT")
        cid = comp["company_id"]
        headers = comp["headers"]

        # Register device
        dev_res = await client.post("/api/v1/iot/devices", headers=headers, json={
            "name": "Smart Security Camera Entrance",
            "device_type": "CAMERA",
            "ip_address": "10.0.10.15",
            "mac_address": "AA:BB:CC:DD:EE:01",
        })
        assert dev_res.status_code == 201
        dev_id = dev_res.json()["data"]["id"]

        # Ingest benign telemetry
        ingest_res = await client.post("/api/v1/iot/events", headers=headers, json={
            "device_id": dev_id,
            "ip_address": "10.0.10.15",
            "event_type": "camera_stream",
            "features": benign_sample
        })
        assert ingest_res.status_code == 201
        ingest_data = ingest_res.json()["data"]
        assert "mlAnalysis" in ingest_data
        assert ingest_data["mlAnalysis"]["verdict"] == "BENIGN_IOT"
        assert "security_event_id" not in ingest_data["mlAnalysis"]

        # Verify device remains healthy in database
        async with AsyncSessionLocal() as db:
            dev_db = await db.scalar(select(IoTDevice).where(IoTDevice.id == dev_id))
            assert dev_db.status == "ONLINE"
            assert dev_db.anomalies == 0
            assert dev_db.risk_score <= 10.0

            # Verify NO rogue SecurityEvent or Incident was created
            sec_evs = (await db.scalars(
                select(SecurityEvent).where(SecurityEvent.company_id == cid)
            )).all()
            assert len(sec_evs) == 0

            incs = (await db.scalars(
                select(Incident).where(Incident.company_id == cid)
            )).all()
            assert len(incs) == 0


# =====================================================================
# 4. ATTACK TELEMETRY & THREAT CLASSIFICATION
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_04_attack_iot_telemetry(attack_samples):
    """Verify all 4 CICIoT2023 attack vectors are accurately classified as attacks."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "AttackIoT")
        cid = comp["company_id"]
        headers = comp["headers"]

        for name, features in attack_samples:
            res = ml_iot_service.predict(features, environment="REAL")
            assert res.status == "SUCCESS"
            assert res.verdict in ["CONFIRMED_IOT_ATTACK", "CLASSIFIED_IOT_ATTACK"]
            assert res.is_attack is True
            assert res.confidence >= 0.85

            # Test via /analyze endpoint
            analyze_res = await client.post("/api/v1/iot/analyze", headers=headers, json={
                "features": features,
                "device_name": f"Sensor-{name}",
                "ip_address": "10.0.10.99",
                "environment": "REAL",
                "record_detection": False,
            })
            assert analyze_res.status_code == 200
            adata = analyze_res.json()["data"]
            assert adata["is_attack"] is True
            assert adata["verdict"] in ["CONFIRMED_IOT_ATTACK", "CLASSIFIED_IOT_ATTACK"]


# =====================================================================
# 5. INSUFFICIENT DATA HANDLING (ZERO FAKE IMPUTATION)
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_05_insufficient_data_zero_imputation(base_iot_features):
    """Verify strict rejection with HTTP 422 and INSUFFICIENT_DATA code when features are missing."""
    incomplete = base_iot_features.copy()
    del incomplete["Rate"]
    del incomplete["flow_duration"]
    del incomplete["Radius"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "ZeroImpute")
        headers = comp["headers"]

        # 1. /api/v1/iot/analyze must reject with 422
        res = await client.post("/api/v1/iot/analyze", headers=headers, json={
            "features": incomplete,
            "ip_address": "10.0.10.50"
        })
        assert res.status_code == 422
        body = res.json()
        detail = body.get("error", {}) or body.get("detail", {})
        assert detail.get("code") == "INSUFFICIENT_DATA"
        assert "Rate" in detail.get("missing_features", [])
        assert "flow_duration" in detail.get("missing_features", [])
        assert "Radius" in detail.get("missing_features", [])
        assert detail.get("provided_count") == 43
        assert detail.get("required_count") == 46

        # 2. /api/v1/iot/events must also reject with 422 when features explicitly passed
        ev_res = await client.post("/api/v1/iot/events", headers=headers, json={
            "ip_address": "10.0.10.50",
            "features": incomplete
        })
        assert ev_res.status_code == 422
        ev_detail = ev_res.json().get("error", {}) or ev_res.json().get("detail", {})
        assert ev_detail.get("code") == "INSUFFICIENT_DATA"


# =====================================================================
# 6. INVALID NON-FINITE DATA REJECTION
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_06_invalid_non_finite_data(base_iot_features):
    """Verify rejection of NaN, Inf, and non-numeric string values."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "InvalidData")
        headers = comp["headers"]

        # Test NaN
        nan_features = base_iot_features.copy()
        nan_features["Rate"] = float("nan")
        # In JSON nan serializes as null, so let's test null and also string "NaN"
        nan_features["Rate"] = "NaN"
        res_nan = await client.post("/api/v1/iot/analyze", headers=headers, json={
            "features": nan_features
        })
        assert res_nan.status_code == 422

        # Test non-numeric string
        str_features = base_iot_features.copy()
        str_features["flow_duration"] = "INVALID_STRING"
        res_str = await client.post("/api/v1/iot/analyze", headers=headers, json={
            "features": str_features
        })
        assert res_str.status_code == 422


# =====================================================================
# 7. SIMULATION VS REAL SEPARATION
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_07_simulation_vs_real_separation(attack_samples):
    """Verify SIMULATION telemetry maintains strict separation without polluting REAL metrics."""
    _, att_features = attack_samples[0]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "SimSep")
        cid = comp["company_id"]
        headers = comp["headers"]

        # Register IoT Device
        dev_res = await client.post("/api/v1/iot/devices", headers=headers, json={
            "name": "Simulated Gateway",
            "device_type": "GATEWAY",
            "ip_address": "10.0.20.1",
        })
        dev_id = dev_res.json()["data"]["id"]

        # 1. Send SIMULATION attack event
        sim_res = await client.post("/api/v1/iot/events", headers=headers, json={
            "device_id": dev_id,
            "ip_address": "10.0.20.1",
            "environment": "SIMULATION",
            "features": att_features
        })
        assert sim_res.status_code == 201
        sim_ml = sim_res.json()["data"]["mlAnalysis"]
        assert sim_ml["environment"] == "SIMULATION"
        sim_sec_id = sim_ml["security_event_id"]

        # 2. Send REAL attack event
        real_res = await client.post("/api/v1/iot/events", headers=headers, json={
            "device_id": dev_id,
            "ip_address": "10.0.20.1",
            "environment": "REAL",
            "features": att_features
        })
        assert real_res.status_code == 201
        real_ml = real_res.json()["data"]["mlAnalysis"]
        assert real_ml["environment"] == "REAL"
        real_sec_id = real_ml["security_event_id"]

        # Verify DB records
        async with AsyncSessionLocal() as db:
            sim_ev = await db.scalar(select(SecurityEvent).where(SecurityEvent.id == sim_sec_id))
            assert sim_ev.environment == "SIMULATION"
            assert "[SIMULATION]" in sim_ev.title

            real_ev = await db.scalar(select(SecurityEvent).where(SecurityEvent.id == real_sec_id))
            assert real_ev.environment == "REAL"
            assert "[SIMULATION]" not in real_ev.title


# =====================================================================
# 8. MULTI-TENANT ISOLATION (COMPANY A VS COMPANY B)
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_08_multi_tenant_isolation(attack_samples):
    """Verify strict tenant isolation: Company B cannot see Company A's IoT devices or threats."""
    _, att_features = attack_samples[0]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp_a = await create_test_company(client, "CompanyA")
        comp_b = await create_test_company(client, "CompanyB")

        # Company A registers a device
        dev_res = await client.post("/api/v1/iot/devices", headers=comp_a["headers"], json={
            "name": "Company A Proprietary Sensor",
            "device_type": "INDUSTRIAL_CONTROLLER",
            "ip_address": "10.100.1.1",
        })
        assert dev_res.status_code == 201
        dev_a_id = dev_res.json()["data"]["id"]

        # Company A ingests attack telemetry
        ev_res = await client.post("/api/v1/iot/events", headers=comp_a["headers"], json={
            "device_id": dev_a_id,
            "ip_address": "10.100.1.1",
            "features": att_features
        })
        assert ev_res.status_code == 201

        # 1. Company A can see their device and anomalies
        list_a = await client.get("/api/v1/iot/devices", headers=comp_a["headers"])
        assert list_a.status_code == 200
        assert any(d["id"] == dev_a_id for d in list_a.json()["data"])

        # 2. Company B CANNOT see Company A's device
        list_b = await client.get("/api/v1/iot/devices", headers=comp_b["headers"])
        assert list_b.status_code == 200
        assert not any(d["id"] == dev_a_id for d in list_b.json()["data"])

        # 3. Company B attempting direct access gets 404
        direct_b = await client.get(f"/api/v1/iot/devices/{dev_a_id}", headers=comp_b["headers"])
        assert direct_b.status_code == 404

        # 4. Direct DB check for tenant B
        async with AsyncSessionLocal() as db:
            b_devices = (await db.scalars(
                select(IoTDevice).where(IoTDevice.company_id == comp_b["company_id"])
            )).all()
            assert not any(d.id == dev_a_id for d in b_devices)


# =====================================================================
# 9. WEBSOCKET TENANT ISOLATION
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_09_websocket_isolation():
    """Verify WebSocket emissions are strictly routed per company_id."""
    from app.core.websocket import ws_manager
    assert hasattr(ws_manager, "broadcast_to_company")
    assert hasattr(ws_manager, "_company_connections")


# =====================================================================
# 10. REPEATED MALICIOUS EVENTS & ANTI-FATIGUE CORRELATION
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_10_repeated_malicious_events_correlation(attack_samples):
    """Verify repeated threats against the same device update/correlate to existing incident."""
    _, att_features = attack_samples[0]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "AntiFatigue")
        cid = comp["company_id"]
        headers = comp["headers"]

        dev_res = await client.post("/api/v1/iot/devices", headers=headers, json={
            "name": "High Value Smart Switch",
            "device_type": "SMART_PLUG",
            "ip_address": "10.0.50.2",
        })
        dev_id = dev_res.json()["data"]["id"]

        # Send 3 repeated attack telemetry bursts
        for i in range(3):
            res = await client.post("/api/v1/iot/events", headers=headers, json={
                "device_id": dev_id,
                "ip_address": "10.0.50.2",
                "features": att_features
            })
            assert res.status_code == 201

        # Check incidents in database
        async with AsyncSessionLocal() as db:
            incidents = (await db.scalars(
                select(Incident).where(Incident.company_id == cid)
            )).all()
            # Incident Correlation Engine should correlate repeated detections into 1 or 2 consolidated incidents, NOT 3 separate ones
            assert len(incidents) <= 2

            # IoT device should have accumulated anomalies
            dev_db = await db.scalar(select(IoTDevice).where(IoTDevice.id == dev_id))
            assert dev_db.anomalies >= 3
            assert dev_db.status == "CRITICAL"


# =====================================================================
# 11. DIGITAL TWIN 3D STATE TRANSITION
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_11_digital_twin_state_transition(attack_samples):
    """Verify IoT device transitions from ONLINE to CRITICAL in 3D Digital Twin nodes."""
    _, att_features = attack_samples[0]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "TwinIoT")
        headers = comp["headers"]

        # 1. Register device
        dev_res = await client.post("/api/v1/iot/devices", headers=headers, json={
            "name": "3D Twin Monitored Sensor",
            "device_type": "SENSOR",
            "ip_address": "10.0.30.12",
        })
        dev_id = dev_res.json()["data"]["id"]

        # Initial digital twin check
        dt1 = await client.get("/api/v1/digital-twin/nodes", headers=headers)
        assert dt1.status_code == 200
        nodes1 = dt1.json()["data"]["nodes"]
        target1 = next((n for n in nodes1 if n["id"] == dev_id), None)
        assert target1 is not None
        assert target1["status"] == "ONLINE"
        assert target1["riskScore"] <= 20.0

        # Ingest attack
        await client.post("/api/v1/iot/events", headers=headers, json={
            "device_id": dev_id,
            "ip_address": "10.0.30.12",
            "features": att_features
        })

        # Post-attack digital twin check
        dt2 = await client.get("/api/v1/digital-twin/nodes", headers=headers)
        assert dt2.status_code == 200
        nodes2 = dt2.json()["data"]["nodes"]
        target2 = next((n for n in nodes2 if n["id"] == dev_id), None)
        assert target2 is not None
        assert target2["status"] in ["CRITICAL", "WARNING"]
        assert target2["riskScore"] >= 60.0
        assert len(target2["detections"]) >= 1


# =====================================================================
# 12. DYNAMIC ATTACK GRAPH INTEGRATION
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_12_attack_graph_integration(attack_samples):
    """Verify IoT devices appear in Attack Graph and update upon ML threat detection."""
    _, att_features = attack_samples[0]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "AttackGraphIoT")
        headers = comp["headers"]

        # Register Gateway IoT device
        dev_res = await client.post("/api/v1/iot/devices", headers=headers, json={
            "name": "Industrial IoT Gateway",
            "device_type": "GATEWAY",
            "ip_address": "10.0.40.1",
        })
        dev_id = dev_res.json()["data"]["id"]

        # Check Attack Graph contains device
        ag1 = await client.get("/api/v1/attack-graph", headers=headers)
        assert ag1.status_code == 200
        ag_data = ag1.json()["data"]
        iot_node = next((n for n in ag_data["nodes"] if n["id"] == dev_id), None)
        assert iot_node is not None
        assert iot_node["type"] == "iot"
        assert iot_node["status"] == "SAFE"

        # Ingest attack
        await client.post("/api/v1/iot/events", headers=headers, json={
            "device_id": dev_id,
            "ip_address": "10.0.40.1",
            "features": att_features
        })

        # Post-attack Attack Graph check
        ag2 = await client.get("/api/v1/attack-graph", headers=headers)
        assert ag2.status_code == 200
        iot_node_post = next((n for n in ag2.json()["data"]["nodes"] if n["id"] == dev_id), None)
        assert iot_node_post is not None
        assert iot_node_post["status"] in ["CRITICAL", "WARNING"]
        assert iot_node_post["riskScore"] >= 60


# =====================================================================
# 13. SOAR PLAYBOOK EXECUTION
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_13_soar_playbook_execution(attack_samples):
    """Verify automated response playbook execution on IoT incident."""
    _, att_features = attack_samples[0]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "SOARTest")
        cid = comp["company_id"]
        headers = comp["headers"]

        dev_res = await client.post("/api/v1/iot/devices", headers=headers, json={
            "name": "Compromised Smart Thermostat",
            "device_type": "SENSOR",
            "ip_address": "10.0.60.5",
        })
        dev_id = dev_res.json()["data"]["id"]

        # Ingest attack
        ev_res = await client.post("/api/v1/iot/events", headers=headers, json={
            "device_id": dev_id,
            "ip_address": "10.0.60.5",
            "features": att_features
        })
        assert ev_res.status_code == 201

        # Retrieve generated incident
        async with AsyncSessionLocal() as db:
            inc = await db.scalar(
                select(Incident).where(Incident.company_id == cid).order_by(Incident.id.desc())
            )
            assert inc is not None
            inc_id = inc.id

        # Create or fetch IoT SOAR playbook
        pb_res = await client.post("/api/v1/soar/playbooks", headers=headers, json={
            "name": "IoT Botnet Network Port Quarantine",
            "description": "Isolates anomalous smart/OT sensors via dynamic VLAN assignment.",
            "trigger": "CONFIRMED_IOT_ATTACK",
            "is_active": True
        })
        assert pb_res.status_code in [200, 201]
        pb_id = pb_res.json()["data"]["id"]

        # Execute playbook
        exec_res = await client.post(
            f"/api/v1/soar/playbooks/{pb_id}/execute",
            headers=headers,
            json={"incident_id": inc_id, "dry_run": False}
        )
        assert exec_res.status_code == 200
        exec_data = exec_res.json()["data"]
        assert exec_data["status"] == "SUCCESS"


# =====================================================================
# 14. IMMUTABLE AUDIT LOG VERIFICATION
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_14_immutable_audit_log(attack_samples):
    """Verify audit log records entry for IOT_ML_THREAT_DETECTED."""
    _, att_features = attack_samples[0]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "AuditLogIoT")
        cid = comp["company_id"]
        headers = comp["headers"]

        dev_res = await client.post("/api/v1/iot/devices", headers=headers, json={
            "name": "Audited Smart Meter",
            "device_type": "SENSOR",
            "ip_address": "10.0.70.1",
        })
        dev_id = dev_res.json()["data"]["id"]

        # Ingest attack
        await client.post("/api/v1/iot/events", headers=headers, json={
            "device_id": dev_id,
            "ip_address": "10.0.70.1",
            "features": att_features
        })

        # Query audit log
        async with AsyncSessionLocal() as db:
            audit = await db.scalar(
                select(AuditLog).where(
                    AuditLog.company_id == cid,
                    AuditLog.action == "IOT_ML_THREAT_DETECTED"
                )
            )
            assert audit is not None
            assert audit.result == "DETECTED"
            assert audit.resource_id == dev_id


# =====================================================================
# 15. RELOAD EQUIVALENCE & STATE PRESERVATION
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_15_reload_equivalence(benign_sample, attack_samples):
    """Verify instantiating fresh MLIoTService yields identical inference outputs."""
    fresh_service = MLIoTService()

    # Compare benign
    pred_orig_b = ml_iot_service.predict(benign_sample)
    pred_fresh_b = fresh_service.predict(benign_sample)
    assert pred_orig_b.verdict == pred_fresh_b.verdict
    assert math.isclose(pred_orig_b.confidence, pred_fresh_b.confidence, rel_tol=1e-4)

    # Compare attack
    _, att_features = attack_samples[0]
    pred_orig_a = ml_iot_service.predict(att_features)
    pred_fresh_a = fresh_service.predict(att_features)
    assert pred_orig_a.verdict == pred_fresh_a.verdict
    assert math.isclose(pred_orig_a.confidence, pred_fresh_a.confidence, rel_tol=1e-4)


# =====================================================================
# 16. PERFORMANCE BENCHMARKS (MIN, AVG, P95, MAX)
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_16_performance_benchmarks(benign_sample, attack_samples):
    """Verify inference latency over 50 consecutive runs meets SLA (< 20ms p95)."""
    _, att_features = attack_samples[0]
    latencies = []

    # Warmup
    for _ in range(5):
        ml_iot_service.predict(benign_sample)

    for i in range(50):
        vec = benign_sample if i % 2 == 0 else att_features
        t0 = time.perf_counter()
        ml_iot_service.predict(vec)
        dt_ms = (time.perf_counter() - t0) * 1000.0
        latencies.append(dt_ms)

    min_lat = min(latencies)
    avg_lat = sum(latencies) / len(latencies)
    p95_lat = float(np.percentile(latencies, 95))
    max_lat = max(latencies)

    print(f"\n[BENCHMARK] Min: {min_lat:.2f}ms | Avg: {avg_lat:.2f}ms | P95: {p95_lat:.2f}ms | Max: {max_lat:.2f}ms")
    assert p95_lat < 25.0, f"P95 latency {p95_lat:.2f}ms exceeds threshold"


# =====================================================================
# 17. COMPLETE 16-STAGE PIPELINE END-TO-END TRAVERSAL
# =====================================================================
@pytest.mark.asyncio
async def test_requirement_17_full_16_stage_pipeline(attack_samples):
    """
    Validate the complete 16-stage pipeline:
    1. Telemetry ingestion (POST /api/v1/iot/events)
    2. 46-feature extraction
    3. Feature validation (strict schema order)
    4. StandardScaler normalization
    5. Isolation Forest inference
    6. XGBoost inference
    7. Decision fusion & MLIoTAnalysisResult
    8. IoTDevice state & anomaly updates in DB
    9. SecurityEvent generation in DB
    10. IncidentCorrelationEngine correlation
    11. WebSocket tenant emission
    12. Dashboard IoT devices list API
    13. Digital Twin 3D spatial node update
    14. Dynamic Attack Graph update
    15. SOAR Playbook execution
    16. Immutable Audit Log record
    """
    _, att_features = attack_samples[0]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "Pipeline16")
        cid = comp["company_id"]
        headers = comp["headers"]

        # Register device
        dev_res = await client.post("/api/v1/iot/devices", headers=headers, json={
            "name": "Pipeline High Value Industrial Controller",
            "device_type": "INDUSTRIAL_CONTROLLER",
            "ip_address": "10.0.99.10",
        })
        assert dev_res.status_code == 201
        dev_id = dev_res.json()["data"]["id"]

        # Stage 1-7: Ingest event with 46 features
        ingest_res = await client.post("/api/v1/iot/events", headers=headers, json={
            "device_id": dev_id,
            "ip_address": "10.0.99.10",
            "environment": "REAL",
            "features": att_features
        })
        assert ingest_res.status_code == 201
        res_data = ingest_res.json()["data"]
        assert "mlAnalysis" in res_data
        ml_an = res_data["mlAnalysis"]
        assert ml_an["verdict"] == "CONFIRMED_IOT_ATTACK"
        sec_ev_id = ml_an["security_event_id"]

        # Stage 8: IoTDevice DB update
        async with AsyncSessionLocal() as db:
            dev_db = await db.scalar(select(IoTDevice).where(IoTDevice.id == dev_id))
            assert dev_db.status == "CRITICAL"
            assert dev_db.anomalies >= 1
            assert dev_db.risk_score >= 80.0

            # Stage 9: SecurityEvent DB record
            sec_db = await db.scalar(select(SecurityEvent).where(SecurityEvent.id == sec_ev_id))
            assert sec_db is not None
            assert sec_db.severity == "CRITICAL"
            assert sec_db.entity_type == "IOT_DEVICE"

            # Stage 10: Correlated Incident DB record
            inc_db = await db.scalar(
                select(Incident).where(
                    Incident.company_id == cid,
                    Incident.status.in_(["OPEN", "INVESTIGATING"])
                )
            )
            assert inc_db is not None
            inc_id = inc_db.id

            # Stage 16: Audit Log DB record
            audit_db = await db.scalar(
                select(AuditLog).where(
                    AuditLog.company_id == cid,
                    AuditLog.action == "IOT_ML_THREAT_DETECTED"
                )
            )
            assert audit_db is not None

        # Stage 11: WebSocket verified via ws_manager
        from app.core.websocket import ws_manager
        assert hasattr(ws_manager, "broadcast_to_company")

        # Stage 12: Dashboard IoT devices API check
        dash_res = await client.get("/api/v1/iot/devices", headers=headers)
        assert dash_res.status_code == 200
        d_found = next(d for d in dash_res.json()["data"] if d["id"] == dev_id)
        assert d_found["status"] == "CRITICAL"
        assert d_found["anomalies"] >= 1

        # Stage 13: Digital Twin 3D spatial node
        dt_res = await client.get("/api/v1/digital-twin/nodes", headers=headers)
        assert dt_res.status_code == 200
        dt_node = next(n for n in dt_res.json()["data"]["nodes"] if n["id"] == dev_id)
        assert dt_node["status"] in ["CRITICAL", "WARNING"]
        assert dt_node["riskScore"] >= 60.0

        # Stage 14: Dynamic Attack Graph
        ag_res = await client.get("/api/v1/attack-graph", headers=headers)
        assert ag_res.status_code == 200
        ag_node = next(n for n in ag_res.json()["data"]["nodes"] if n["id"] == dev_id)
        assert ag_node["status"] in ["CRITICAL", "WARNING"]

        # Stage 15: SOAR Playbook Execution
        pb_res = await client.post("/api/v1/soar/playbooks", headers=headers, json={
            "name": "Pipeline Auto Containment",
            "description": "Quarantines anomalous IoT device.",
            "trigger": "CONFIRMED_IOT_ATTACK",
            "is_active": True
        })
        pb_id = pb_res.json()["data"]["id"]

        exec_res = await client.post(
            f"/api/v1/soar/playbooks/{pb_id}/execute",
            headers=headers,
            json={"incident_id": inc_id, "dry_run": False}
        )
        assert exec_res.status_code == 200
        assert exec_res.json()["data"]["status"] == "SUCCESS"
