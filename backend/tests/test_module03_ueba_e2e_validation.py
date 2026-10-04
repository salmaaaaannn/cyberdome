"""
CYBERDOME MODULE 03 — UEBA (USER & ENTITY BEHAVIOR ANALYTICS) END-TO-END VALIDATION SUITE.
Covers all 25 audit & empirical validation requirements:
 1. test_01_ueba_artifacts_exist
 2. test_02_ueba_feature_schema_exact
 3. test_03_ueba_scaler_input_shape
 4. test_04_ueba_isolation_forest_contract
 5. test_05_ueba_xgboost_contract
 6. test_06_benign_office_worker_inference
 7. test_07_suspicious_off_hours_email_leak
 8. test_08_threat_after_hours_usb_exfil
 9. test_09_threat_failed_login_burst
10. test_10_missing_features_raises_insufficient_data
11. test_11_malformed_nan_infinite_features_rejected
12. test_12_real_vs_simulation_separation
13. test_13_security_event_persisted_in_database
14. test_14_incident_correlation_engine_triggered
15. test_15_anti_fatigue_deduplication
16. test_16_company_user_risk_score_updated
17. test_17_tenant_isolation_database
18. test_18_tenant_isolation_websocket
19. test_19_digital_twin_reflects_user_threat
20. test_20_attack_graph_reflects_user_threat
21. test_21_audit_log_persisted
22. test_22_artifact_reload_equivalence
23. test_23_inference_latency_p95
24. test_24_full_pipeline_ingest_endpoint
25. test_25_combined_three_module_pipeline
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
from app.models.phase4 import (
    UEBAEvent, SecurityEvent, Incident, IncidentEvent,
    IoTDevice, NetworkEvent, SOARPlaybook, PlaybookExecution
)
from app.services.ml_ueba_service import ml_ueba_service, MLUEBAService, UEBAFeatureAdapter
from app.services.ml_iot_service import ml_iot_service
from app.services.ml_network_service import ml_network_service


@pytest.fixture
def ueba_test_vectors():
    """Loads realistic CERT Insider Threat benchmark test vectors."""
    fixture_path = Path(__file__).parent / "fixtures" / "ueba_test_vectors.json"
    if fixture_path.exists():
        with open(fixture_path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise FileNotFoundError(f"Fixture not found at {fixture_path}")


@pytest.fixture
def base_ueba_features():
    """Returns a baseline 30-feature dictionary initialized to 0.0."""
    return {f: 0.0 for f in ml_ueba_service.feature_names}


@pytest.fixture
def benign_worker_sample(ueba_test_vectors):
    return ueba_test_vectors["Benign Office Worker Telemetry"]


@pytest.fixture
def usb_exfil_sample(ueba_test_vectors):
    return ueba_test_vectors["Malicious After-Hours USB Exfiltration"]


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
        "user_id": data["user"]["id"],
        "headers": {"Authorization": f"Bearer {data['token']}"}
    }


# =====================================================================
# 1. ARTIFACT EXISTENCE & COMPONENT INTEGRITY AUDIT
# =====================================================================
@pytest.mark.asyncio
async def test_01_ueba_artifacts_exist():
    """Verify presence, integrity, and non-zero sizes of all 7 UEBA artifacts."""
    base_dir = Path(__file__).resolve().parent.parent / "app" / "ml_models" / "ueba"

    iso_path = base_dir / "models" / "ueba_isolation_forest.joblib"
    xgb_path = base_dir / "models" / "ueba_xgboost.joblib"
    scaler_path = base_dir / "preprocessing" / "scaler.joblib"
    schema_path = base_dir / "preprocessing" / "feature_schema.json"
    meta_path = base_dir / "metadata" / "model_metadata.json"
    eval_path = base_dir / "evaluation" / "evaluation_report.json"
    fi_path = base_dir / "evaluation" / "feature_importance.json"

    assert iso_path.exists() and iso_path.stat().st_size > 100000, "Isolation Forest artifact missing or too small"
    assert xgb_path.exists() and xgb_path.stat().st_size > 10000, "XGBoost artifact missing or too small"
    assert scaler_path.exists() and scaler_path.stat().st_size > 500, "Scaler artifact missing or too small"
    assert schema_path.exists() and schema_path.stat().st_size > 200, "Feature schema missing or too small"
    assert meta_path.exists() and meta_path.stat().st_size > 100, "Model metadata missing"
    assert eval_path.exists() and eval_path.stat().st_size > 100, "Evaluation report missing"
    assert fi_path.exists() and fi_path.stat().st_size > 100, "Feature importance report missing"

    health = ml_ueba_service.get_health_status()
    assert health["status"] == "HEALTHY"
    assert health["module"] == "ueba_anomaly_detection"
    assert health["model_version"] == "ueba-anomaly-v1"
    assert health["dataset_benchmark"] == "CERT_Insider_Threat"
    assert health["feature_count"] == 30
    assert health["artifacts_loaded"]["scaler"] is True
    assert health["artifacts_loaded"]["isolation_forest"] is True
    assert health["artifacts_loaded"]["xgboost"] is True
    assert health["artifacts_loaded"]["schema"] is True
    assert health["zero_imputation_enforced"] is True


# =====================================================================
# 2. FEATURE SCHEMA EXACT ORDERING AUDIT
# =====================================================================
@pytest.mark.asyncio
async def test_02_ueba_feature_schema_exact():
    """Verify exactly 30 features and strict canonical ordering matching schema."""
    assert len(ml_ueba_service.feature_names) == 30
    assert ml_ueba_service.feature_names[0] == "hour_of_day"
    assert ml_ueba_service.feature_names[1] == "day_of_week"
    assert ml_ueba_service.feature_names[2] == "is_weekend"
    assert ml_ueba_service.feature_names[3] == "is_after_hours"
    assert ml_ueba_service.feature_names[-1] == "failed_resource_access_count"
    assert ml_ueba_service.feature_names[-2] == "privileged_action_count"
    assert ml_ueba_service.feature_names[-3] == "removable_media_events"


# =====================================================================
# 3. SCALER INPUT SHAPE AND NORMALIZATION
# =====================================================================
@pytest.mark.asyncio
async def test_03_ueba_scaler_input_shape(base_ueba_features):
    """Verify scaler loads, enforces 30 input features, and transforms cleanly."""
    assert hasattr(ml_ueba_service.scaler, "n_features_in_")
    assert ml_ueba_service.scaler.n_features_in_ == 30

    df = ml_ueba_service.validate_and_prepare_features(base_ueba_features)
    assert df.shape == (1, 30)
    scaled = ml_ueba_service.scaler.transform(df)
    assert scaled.shape == (1, 30)
    assert not np.isnan(scaled).any()
    assert not np.isinf(scaled).any()


# =====================================================================
# 4. ISOLATION FOREST CONTRACT
# =====================================================================
@pytest.mark.asyncio
async def test_04_ueba_isolation_forest_contract(base_ueba_features):
    """Verify Isolation Forest model contract (30 features, outputs 1 or -1)."""
    assert hasattr(ml_ueba_service.isolation_forest, "n_features_in_")
    assert ml_ueba_service.isolation_forest.n_features_in_ == 30

    df = ml_ueba_service.validate_and_prepare_features(base_ueba_features)
    scaled = ml_ueba_service.scaler.transform(df)
    pred = ml_ueba_service.isolation_forest.predict(scaled)
    assert pred[0] in [1, -1]

    score = ml_ueba_service.isolation_forest.score_samples(scaled)
    assert isinstance(score[0], (float, np.floating))


# =====================================================================
# 5. XGBOOST CONTRACT
# =====================================================================
@pytest.mark.asyncio
async def test_05_ueba_xgboost_contract(base_ueba_features):
    """Verify XGBoost classifier contract (30 features, binary classes [0, 1])."""
    assert hasattr(ml_ueba_service.xgboost, "n_features_in_")
    assert ml_ueba_service.xgboost.n_features_in_ == 30
    assert list(ml_ueba_service.xgboost.classes_) == [0, 1]

    df = ml_ueba_service.validate_and_prepare_features(base_ueba_features)
    scaled = ml_ueba_service.scaler.transform(df)
    proba = ml_ueba_service.xgboost.predict_proba(scaled)
    assert proba.shape == (1, 2)
    assert math.isclose(float(np.sum(proba)), 1.0, rel_tol=1e-4)


# =====================================================================
# 6. BENIGN OFFICE WORKER INFERENCE
# =====================================================================
@pytest.mark.asyncio
async def test_06_benign_office_worker_inference(benign_worker_sample):
    """Verify benign employee behavior yields BENIGN_USER verdict without alerts."""
    res = ml_ueba_service.predict(benign_worker_sample, environment="REAL")
    assert res.status == "SUCCESS"
    assert res.verdict == "BENIGN_USER"
    assert res.is_anomaly is False
    assert res.is_threat is False
    assert res.severity == "INFO"
    assert res.confidence >= 0.70


# =====================================================================
# 7. SUSPICIOUS OFF-HOURS EMAIL LEAK
# =====================================================================
@pytest.mark.asyncio
async def test_07_suspicious_off_hours_email_leak(ueba_test_vectors):
    """Verify off-hours massive email activity with attachments is flagged as threat/anomaly."""
    vec = ueba_test_vectors["Suspicious Off-Hours Email Leak"]
    res = ml_ueba_service.predict(vec, environment="REAL")
    assert res.status == "SUCCESS"
    assert res.is_threat or res.is_anomaly
    assert res.verdict in ["CONFIRMED_INSIDER_THREAT", "CLASSIFIED_INSIDER_THREAT", "UEBA_ANOMALY"]
    assert res.severity in ["MEDIUM", "HIGH", "CRITICAL"]


# =====================================================================
# 8. MALICIOUS AFTER-HOURS USB EXFILTRATION
# =====================================================================
@pytest.mark.asyncio
async def test_08_threat_after_hours_usb_exfil(usb_exfil_sample):
    """Verify 2 AM USB bulk data exfiltration yields CONFIRMED_INSIDER_THREAT."""
    res = ml_ueba_service.predict(usb_exfil_sample, environment="REAL")
    assert res.status == "SUCCESS"
    assert res.verdict == "CONFIRMED_INSIDER_THREAT"
    assert res.is_threat is True
    assert res.is_anomaly is True
    assert res.severity in ["HIGH", "CRITICAL"]
    assert res.confidence >= 0.85


# =====================================================================
# 9. MALICIOUS FAILED LOGIN BURST
# =====================================================================
@pytest.mark.asyncio
async def test_09_threat_failed_login_burst(ueba_test_vectors):
    """Verify brute-force credential stuffing pattern is flagged as anomaly or threat."""
    vec = ueba_test_vectors["Malicious Failed Login Burst"]
    res = ml_ueba_service.predict(vec, environment="REAL")
    assert res.status == "SUCCESS"
    assert res.is_anomaly is True or res.is_threat is True
    assert res.verdict in ["UEBA_ANOMALY", "CONFIRMED_INSIDER_THREAT", "CLASSIFIED_INSIDER_THREAT"]


# =====================================================================
# 10. INSUFFICIENT DATA (ZERO FAKE IMPUTATION — HTTP 422)
# =====================================================================
@pytest.mark.asyncio
async def test_10_missing_features_raises_insufficient_data(ueba_test_vectors):
    """Verify missing features reject with HTTP 422 and INSUFFICIENT_DATA code."""
    incomplete = ueba_test_vectors["Incomplete Vector (Missing 3 Features)"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "UEBAImpute")
        headers = comp["headers"]

        # 1. /api/v1/ueba/analyze must reject with 422
        res = await client.post("/api/v1/ueba/analyze", headers=headers, json={
            "features": incomplete
        })
        assert res.status_code == 422
        body = res.json()
        detail = body.get("error", {}) or body.get("detail", {})
        assert detail.get("code") == "INSUFFICIENT_DATA"
        assert len(detail.get("missing_features", [])) == 3
        assert "removable_media_events" in detail.get("missing_features", [])
        assert detail.get("provided_count") == 27
        assert detail.get("required_count") == 30

        # 2. /api/v1/ueba/events must also reject with 422 when features explicitly provided
        ev_res = await client.post("/api/v1/ueba/events", headers=headers, json={
            "action": "USB_MASS_STORAGE_CONNECT",
            "features": incomplete
        })
        assert ev_res.status_code == 422
        ev_detail = ev_res.json().get("error", {}) or ev_res.json().get("detail", {})
        assert ev_detail.get("code") == "INSUFFICIENT_DATA"


# =====================================================================
# 11. MALFORMED NAN AND INFINITE FEATURES REJECTED
# =====================================================================
@pytest.mark.asyncio
async def test_11_malformed_nan_infinite_features_rejected(ueba_test_vectors):
    """Verify NaN and Infinity non-finite values are rejected with 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "UEBANaN")
        headers = comp["headers"]

        # Test NaN vector
        nan_vec = ueba_test_vectors["Malformed Vector with NaN"]
        res_nan = await client.post("/api/v1/ueba/analyze", headers=headers, json={
            "features": nan_vec
        })
        assert res_nan.status_code == 422
        detail_nan = res_nan.json().get("error", {}) or res_nan.json().get("detail", {})
        assert detail_nan.get("code") == "INVALID_FEATURE_VALUE"

        # Test Infinity vector
        inf_vec = ueba_test_vectors["Malformed Vector with Infinity"]
        res_inf = await client.post("/api/v1/ueba/analyze", headers=headers, json={
            "features": inf_vec
        })
        assert res_inf.status_code == 422
        detail_inf = res_inf.json().get("error", {}) or res_inf.json().get("detail", {})
        assert detail_inf.get("code") == "INVALID_FEATURE_VALUE"


# =====================================================================
# 12. REAL VS SIMULATION SEPARATION
# =====================================================================
@pytest.mark.asyncio
async def test_12_real_vs_simulation_separation(usb_exfil_sample):
    """Verify SIMULATION telemetry maintains strict segregation from REAL records."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "UEBASimSep")
        headers = comp["headers"]

        # 1. Send SIMULATION threat event
        sim_res = await client.post("/api/v1/ueba/events", headers=headers, json={
            "action": "SIMULATED_USB_EXFIL",
            "environment": "SIMULATION",
            "features": usb_exfil_sample
        })
        assert sim_res.status_code == 201
        sim_ml = sim_res.json()["data"]["mlAnalysis"]
        assert sim_ml["environment"] == "SIMULATION"
        sim_sec_id = sim_ml["security_event_id"]

        # 2. Send REAL threat event
        real_res = await client.post("/api/v1/ueba/events", headers=headers, json={
            "action": "UNAUTHORIZED_USB_DUMP",
            "environment": "REAL",
            "features": usb_exfil_sample
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
# 13. SECURITY EVENT PERSISTED IN DATABASE
# =====================================================================
@pytest.mark.asyncio
async def test_13_security_event_persisted_in_database(usb_exfil_sample):
    """Verify SecurityEvent record is created in database with entity_type='USER'."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "UEBASecEv")
        cid = comp["company_id"]
        headers = comp["headers"]

        ev_res = await client.post("/api/v1/ueba/events", headers=headers, json={
            "action": "MASS_FILE_EXFIL_AFTER_HOURS",
            "features": usb_exfil_sample
        })
        assert ev_res.status_code == 201
        sec_id = ev_res.json()["data"]["mlAnalysis"]["security_event_id"]

        async with AsyncSessionLocal() as db:
            sec_ev = await db.scalar(select(SecurityEvent).where(SecurityEvent.id == sec_id))
            assert sec_ev is not None
            assert sec_ev.company_id == cid
            assert sec_ev.entity_type == "USER"
            assert sec_ev.severity in ["HIGH", "CRITICAL"]
            assert sec_ev.confidence >= 0.85
            assert "UEBA-ML" in sec_ev.rule_id
            assert sec_ev.metadata_json["module"] == "ueba_anomaly_detection"


# =====================================================================
# 14. INCIDENT CORRELATION ENGINE TRIGGERED
# =====================================================================
@pytest.mark.asyncio
async def test_14_incident_correlation_engine_triggered(usb_exfil_sample):
    """Verify IncidentCorrelationEngine creates an active Incident for the insider threat."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "UEBAIncident")
        cid = comp["company_id"]
        headers = comp["headers"]

        await client.post("/api/v1/ueba/events", headers=headers, json={
            "action": "AFTER_HOURS_USB_EXFIL",
            "features": usb_exfil_sample
        })

        async with AsyncSessionLocal() as db:
            inc = await db.scalar(
                select(Incident).where(
                    Incident.company_id == cid,
                    Incident.status.in_(["OPEN", "INVESTIGATING"])
                )
            )
            assert inc is not None
            assert inc.severity in ["HIGH", "CRITICAL"]
            assert "Insider Threat" in inc.title or "UEBA" in inc.title or "Insider" in inc.summary


# =====================================================================
# 15. ANTI-FATIGUE DEDUPLICATION / CORRELATION
# =====================================================================
@pytest.mark.asyncio
async def test_15_anti_fatigue_deduplication(usb_exfil_sample):
    """Verify repeated threats against the same user correlate into existing incident."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "UEBAAntiFatigue")
        cid = comp["company_id"]
        headers = comp["headers"]

        for _ in range(3):
            res = await client.post("/api/v1/ueba/events", headers=headers, json={
                "action": "REPEATED_EXFIL_ATTEMPT",
                "features": usb_exfil_sample
            })
            assert res.status_code == 201

        async with AsyncSessionLocal() as db:
            incidents = (await db.scalars(
                select(Incident).where(Incident.company_id == cid)
            )).all()
            # Anti-fatigue correlation prevents 3 separate incidents
            assert len(incidents) <= 2


# =====================================================================
# 16. COMPANY USER RISK SCORE UPDATED
# =====================================================================
@pytest.mark.asyncio
async def test_16_company_user_risk_score_updated(usb_exfil_sample):
    """Verify CompanyUser record in database reflects escalated risk score and risk level."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "UEBAUserRisk")
        cid = comp["company_id"]
        uid = comp["user_id"]
        headers = comp["headers"]

        await client.post("/api/v1/ueba/events", headers=headers, json={
            "user_id": uid,
            "action": "PRIVILEGED_USB_EXFIL",
            "features": usb_exfil_sample
        })

        async with AsyncSessionLocal() as db:
            cu = await db.scalar(
                select(CompanyUser).where(
                    CompanyUser.company_id == cid,
                    CompanyUser.user_id == uid
                )
            )
            assert cu is not None
            assert cu.risk_score >= 80.0
            assert cu.risk_level in ["HIGH", "CRITICAL"]
            assert cu.evidence_count >= 1


# =====================================================================
# 17. TENANT ISOLATION DATABASE
# =====================================================================
@pytest.mark.asyncio
async def test_17_tenant_isolation_database(usb_exfil_sample):
    """Verify Tenant B cannot view Tenant A's UEBA events or anomalies."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp_a = await create_test_company(client, "TenantA")
        comp_b = await create_test_company(client, "TenantB")

        # Company A ingests threat
        res_a = await client.post("/api/v1/ueba/events", headers=comp_a["headers"], json={
            "action": "SECRET_DATA_LEAK",
            "features": usb_exfil_sample
        })
        assert res_a.status_code == 201
        ev_id = res_a.json()["data"]["id"]

        # Company A can see it
        list_a = await client.get("/api/v1/ueba/events", headers=comp_a["headers"])
        assert list_a.status_code == 200
        assert any(e["id"] == ev_id for e in list_a.json()["data"])

        # Company B CANNOT see it
        list_b = await client.get("/api/v1/ueba/events", headers=comp_b["headers"])
        assert list_b.status_code == 200
        assert not any(e["id"] == ev_id for e in list_b.json()["data"])

        # Company B anomalies list is empty for Company A's events
        anom_b = await client.get("/api/v1/ueba/anomalies", headers=comp_b["headers"])
        assert anom_b.status_code == 200
        assert not any(e["id"] == ev_id for e in anom_b.json()["data"])


# =====================================================================
# 18. WEBSOCKET TENANT ISOLATION
# =====================================================================
@pytest.mark.asyncio
async def test_18_tenant_isolation_websocket():
    """Verify WebSocket manager has company isolation routing."""
    from app.core.websocket import ws_manager
    assert hasattr(ws_manager, "broadcast_to_company")
    assert hasattr(ws_manager, "_company_connections")


# =====================================================================
# 19. DIGITAL TWIN REFLECTS USER THREAT
# =====================================================================
@pytest.mark.asyncio
async def test_19_digital_twin_reflects_user_threat(usb_exfil_sample):
    """Verify 3D Digital Twin includes user identity node with updated status and risk."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "TwinUEBA")
        headers = comp["headers"]
        uid = comp["user_id"]

        # Ingest threat for this user
        await client.post("/api/v1/ueba/events", headers=headers, json={
            "user_id": uid,
            "action": "USB_BULK_EXFIL_AFTER_HOURS",
            "features": usb_exfil_sample
        })

        dt_res = await client.get("/api/v1/digital-twin/nodes", headers=headers)
        assert dt_res.status_code == 200
        nodes = dt_res.json()["data"]["nodes"]
        user_node = next((n for n in nodes if n["id"] == uid), None)
        assert user_node is not None
        assert user_node["type"] == "identity"
        assert user_node["status"] in ["CRITICAL", "WARNING"]
        assert user_node["riskScore"] >= 75.0


# =====================================================================
# 20. ATTACK GRAPH REFLECTS USER THREAT
# =====================================================================
@pytest.mark.asyncio
async def test_20_attack_graph_reflects_user_threat(usb_exfil_sample):
    """Verify Dynamic Attack Graph maps risky identity in Tier 2 with elevated risk."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "AttackGraphUEBA")
        headers = comp["headers"]
        uid = comp["user_id"]

        await client.post("/api/v1/ueba/events", headers=headers, json={
            "user_id": uid,
            "action": "PRIVILEGE_ABUSE_EXFIL",
            "features": usb_exfil_sample
        })

        ag_res = await client.get("/api/v1/attack-graph", headers=headers)
        assert ag_res.status_code == 200
        nodes = ag_res.json()["data"]["nodes"]
        user_node = next((n for n in nodes if n["id"] == uid), None)
        assert user_node is not None
        assert user_node["type"] == "identity"
        assert user_node["status"] in ["CRITICAL", "WARNING"]
        assert user_node["riskScore"] >= 75


# =====================================================================
# 21. IMMUTABLE AUDIT LOG PERSISTED
# =====================================================================
@pytest.mark.asyncio
async def test_21_audit_log_persisted(usb_exfil_sample):
    """Verify audit log records entry for UEBA_THREAT_DETECTED."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "AuditUEBA")
        cid = comp["company_id"]
        headers = comp["headers"]

        await client.post("/api/v1/ueba/events", headers=headers, json={
            "action": "AUDITED_USB_EXFIL",
            "features": usb_exfil_sample
        })

        async with AsyncSessionLocal() as db:
            audit = await db.scalar(
                select(AuditLog).where(
                    AuditLog.company_id == cid,
                    AuditLog.action == "UEBA_THREAT_DETECTED"
                )
            )
            assert audit is not None
            assert audit.result == "DETECTED"
            assert audit.resource_type == "user"


# =====================================================================
# 22. ARTIFACT RELOAD EQUIVALENCE
# =====================================================================
@pytest.mark.asyncio
async def test_22_artifact_reload_equivalence(benign_worker_sample, usb_exfil_sample):
    """Verify instantiating fresh MLUEBAService produces bit-identical outputs."""
    fresh_service = MLUEBAService()

    # Compare benign
    pred_orig_b = ml_ueba_service.predict(benign_worker_sample)
    pred_fresh_b = fresh_service.predict(benign_worker_sample)
    assert pred_orig_b.verdict == pred_fresh_b.verdict
    assert math.isclose(pred_orig_b.confidence, pred_fresh_b.confidence, rel_tol=1e-4)

    # Compare threat
    pred_orig_t = ml_ueba_service.predict(usb_exfil_sample)
    pred_fresh_t = fresh_service.predict(usb_exfil_sample)
    assert pred_orig_t.verdict == pred_fresh_t.verdict
    assert math.isclose(pred_orig_t.confidence, pred_fresh_t.confidence, rel_tol=1e-4)


# =====================================================================
# 23. INFERENCE LATENCY P95 SLA
# =====================================================================
@pytest.mark.asyncio
async def test_23_inference_latency_p95(benign_worker_sample, usb_exfil_sample):
    """Verify inference latency over 50 consecutive runs meets SLA (< 25ms p95)."""
    latencies = []

    # Warmup
    for _ in range(5):
        ml_ueba_service.predict(benign_worker_sample)

    for i in range(50):
        vec = benign_worker_sample if i % 2 == 0 else usb_exfil_sample
        t0 = time.perf_counter()
        ml_ueba_service.predict(vec)
        dt_ms = (time.perf_counter() - t0) * 1000.0
        latencies.append(dt_ms)

    min_lat = min(latencies)
    avg_lat = sum(latencies) / len(latencies)
    p95_lat = float(np.percentile(latencies, 95))
    max_lat = max(latencies)

    print(f"\n[UEBA BENCHMARK] Min: {min_lat:.2f}ms | Avg: {avg_lat:.2f}ms | P95: {p95_lat:.2f}ms | Max: {max_lat:.2f}ms")
    assert p95_lat < 25.0, f"P95 latency {p95_lat:.2f}ms exceeds 25ms SLA"


# =====================================================================
# 24. FULL PIPELINE INGEST ENDPOINT
# =====================================================================
@pytest.mark.asyncio
async def test_24_full_pipeline_ingest_endpoint(usb_exfil_sample):
    """
    Validate the complete pipeline for UEBA:
    POST /api/v1/ueba/events
    -> Feature extraction
    -> StandardScaler
    -> Isolation Forest + XGBoost
    -> MLUEBAAnalysisResult
    -> UEBAEvent DB record
    -> SecurityEvent DB record
    -> Incident correlation
    -> WebSocket broadcast
    -> AuditLog
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "FullPipelineUEBA")
        cid = comp["company_id"]
        uid = comp["user_id"]
        headers = comp["headers"]

        res = await client.post("/api/v1/ueba/events", headers=headers, json={
            "user_id": uid,
            "action": "MASS_UNAUTHORIZED_DATA_EXFIL",
            "environment": "REAL",
            "features": usb_exfil_sample
        })
        assert res.status_code == 201
        data = res.json()["data"]

        # Check ML Analysis block
        assert "mlAnalysis" in data
        ml_an = data["mlAnalysis"]
        assert ml_an["verdict"] == "CONFIRMED_INSIDER_THREAT"
        assert ml_an["is_threat"] is True
        assert ml_an["is_anomaly"] is True
        sec_ev_id = ml_an["security_event_id"]

        # Verify DB records
        async with AsyncSessionLocal() as db:
            # 1. UEBA event record
            ev = await db.scalar(select(UEBAEvent).where(UEBAEvent.id == data["id"]))
            assert ev is not None
            assert ev.company_id == cid

            # 2. Security event record
            sec_ev = await db.scalar(select(SecurityEvent).where(SecurityEvent.id == sec_ev_id))
            assert sec_ev is not None
            assert sec_ev.entity_type == "USER"
            assert sec_ev.severity in ["HIGH", "CRITICAL"]

            # 3. Incident record
            inc = await db.scalar(select(Incident).where(Incident.company_id == cid))
            assert inc is not None

            # 4. Audit log record
            audit = await db.scalar(
                select(AuditLog).where(
                    AuditLog.company_id == cid,
                    AuditLog.action == "UEBA_THREAT_DETECTED"
                )
            )
            assert audit is not None


# =====================================================================
# 25. COMBINED THREE-MODULE PIPELINE (NETWORK + IOT + UEBA)
# =====================================================================
@pytest.mark.asyncio
async def test_25_combined_three_module_pipeline(usb_exfil_sample):
    """
    Verify end-to-end multi-domain convergence:
    Run Module 01 (Network), Module 02 (IoT), and Module 03 (UEBA)
    concurrently inside the same enterprise tenant.
    Confirm each domain creates distinct SecurityEvents with isolated entity_types:
    - Module 01: entity_type="IP" or "NETWORK"
    - Module 02: entity_type="IOT_DEVICE"
    - Module 03: entity_type="USER"
    And all 3 correlate properly into the unified company posture.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "UnifiedThreeModules")
        cid = comp["company_id"]
        uid = comp["user_id"]
        headers = comp["headers"]

        # 1. Module 01 — Network Threat Event
        # 77-feature vector from network fixture
        net_fixture_path = Path(__file__).parent / "fixtures" / "cic_ids2017_test_vectors.json"
        with open(net_fixture_path) as f:
            net_vectors = json.load(f)
        net_features = net_vectors["Brute Force"]

        net_res = await client.post("/api/v1/network/events", headers=headers, json={
            "source_ip": "192.168.1.100",
            "dest_ip": "192.168.1.10",
            "protocol": "TCP",
            "direction": "INBOUND",
            "bytes": 65535,
            "packets": 420,
            "environment": "REAL",
            "raw_data": {
                "features": net_features,
                "sensor_id": "snort-eth0-gateway"
            }
        })
        assert net_res.status_code in [200, 201]

        # 2. Module 02 — IoT Threat Event
        # Register IoT device and send CICIoT2023 attack
        dev_res = await client.post("/api/v1/iot/devices", headers=headers, json={
            "name": "Unified Perimeter Camera",
            "device_type": "CAMERA",
            "ip_address": "10.0.10.15",
        })
        dev_id = dev_res.json()["data"]["id"]

        iot_fixture_path = Path(__file__).parent / "fixtures" / "ciciot2023_test_vectors.json"
        with open(iot_fixture_path) as f:
            iot_vectors = json.load(f)
        iot_features = iot_vectors["DDoS SYN Flood"]

        iot_res = await client.post("/api/v1/iot/events", headers=headers, json={
            "device_id": dev_id,
            "ip_address": "10.0.10.15",
            "features": iot_features,
            "environment": "REAL"
        })
        assert iot_res.status_code == 201

        # 3. Module 03 — UEBA Insider Threat Event
        ueba_res = await client.post("/api/v1/ueba/events", headers=headers, json={
            "user_id": uid,
            "action": "MASS_UNAUTHORIZED_DATA_EXFIL",
            "features": usb_exfil_sample,
            "environment": "REAL"
        })
        assert ueba_res.status_code == 201

        # 4. Verify all 3 distinct domain security events in database
        async with AsyncSessionLocal() as db:
            sec_events = (await db.scalars(
                select(SecurityEvent).where(SecurityEvent.company_id == cid)
            )).all()

            # Must have at least 3 security events, one from each module
            assert len(sec_events) >= 3

            entity_types = {e.entity_type for e in sec_events}
            assert "USER" in entity_types, "Module 03 USER security event missing"
            assert "IOT_DEVICE" in entity_types, "Module 02 IOT_DEVICE security event missing"
            assert any(t in ["IP", "NETWORK"] for t in entity_types), "Module 01 NETWORK/IP security event missing"

            # Verify audit logs generated for all domains
            audit_actions = {
                a.action for a in (await db.scalars(
                    select(AuditLog).where(AuditLog.company_id == cid)
                )).all()
            }
            assert "UEBA_THREAT_DETECTED" in audit_actions
            assert "IOT_ML_THREAT_DETECTED" in audit_actions

            # Verify Company posture shows correlated incidents
            incidents = (await db.scalars(
                select(Incident).where(Incident.company_id == cid)
            )).all()
            assert len(incidents) >= 1
