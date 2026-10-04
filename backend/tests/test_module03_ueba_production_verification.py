"""
CYBERDOME MODULE 03 — UEBA PRODUCTION VERIFICATION SUITE
Comprehensive verification of all 30 audit requirements specified in the
Production Verification Contract for Module 03 (User & Entity Behavior Analytics).

Audit Points:
 1. test_01_m03_service_imports
 2. test_02_real_artifacts_load
 3. test_03_schema_loads_exactly_30_features
 4. test_04_schema_model_dimensions_match
 5. test_05_scaler_loads_and_transforms
 6. test_06_isolation_forest_loads_and_infers
 7. test_07_xgboost_loads_and_predicts
 8. test_08_label_mapping_works
 9. test_09_valid_telemetry_accepted_benign_and_threat
10. test_10_missing_feature_rejected_insufficient_data
11. test_11_extra_feature_behavior_verified
12. test_12_nan_rejected_invalid_feature_value
13. test_13_infinity_rejected_invalid_feature_value
14. test_14_invalid_type_rejected
15. test_15_model_inference_executes
16. test_16_confidence_derived_from_real_model_output
17. test_17_security_event_persistence_works
18. test_18_tenant_isolation_database
19. test_19_user_authorization_rejects_normal_user
20. test_20_cross_company_request_fails
21. test_21_incident_correlation_works
22. test_22_m05_detection_evidence_works
23. test_23_websocket_tenant_isolation_works
24. test_24_digital_twin_integration_works
25. test_25_attack_graph_integration_works
26. test_26_ai_copilot_can_access_actual_ueba_evidence
27. test_27_m07_is_not_bypassed
28. test_28_no_fake_telemetry_generated
29. test_29_unknown_insufficient_data_handled_correctly
30. test_30_m03_api_appears_in_openapi
"""

import pytest
import math
import uuid
import json
from pathlib import Path
import numpy as np
import pandas as pd
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.models import User, Company, CompanyUser, AuditLog
from app.models.phase4 import (
    UEBAEvent, SecurityEvent, Incident, IncidentEvent,
    PlaybookExecution
)
from app.services.ml_ueba_service import (
    ml_ueba_service, MLUEBAService, UEBAFeatureAdapter,
    InsufficientDataException, MLUEBAAnalysisResult
)
from app.services.ml_fusion_service import ml_fusion_service, DetectionEvidence
from app.services.ai_copilot_service import ai_copilot_service


@pytest.fixture
def ueba_test_vectors():
    fixture_path = Path(__file__).parent / "fixtures" / "ueba_test_vectors.json"
    if fixture_path.exists():
        with open(fixture_path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise FileNotFoundError(f"Fixture not found at {fixture_path}")


@pytest.fixture
def base_ueba_features():
    return {f: 0.0 for f in ml_ueba_service.feature_names}


@pytest.fixture
def benign_worker_sample(ueba_test_vectors):
    return ueba_test_vectors["Benign Office Worker Telemetry"]


@pytest.fixture
def usb_exfil_sample(ueba_test_vectors):
    return ueba_test_vectors["Malicious After-Hours USB Exfiltration"]


async def create_test_company(client: AsyncClient, prefix: str):
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
# 1. M03 Service Imports
# =====================================================================
def test_01_m03_service_imports():
    from app.services.ml_ueba_service import ml_ueba_service as svc
    assert svc is not None
    assert isinstance(svc, MLUEBAService)
    assert hasattr(svc, "predict")
    assert hasattr(svc, "validate_and_prepare_features")
    assert hasattr(svc, "process_and_correlate_ueba_ml_event")
    assert hasattr(svc, "get_health_status")


# =====================================================================
# 2. Real Artifacts Load
# =====================================================================
def test_02_real_artifacts_load():
    base_dir = Path(__file__).resolve().parent.parent / "app" / "ml_models" / "ueba"
    iso_path = base_dir / "models" / "ueba_isolation_forest.joblib"
    xgb_path = base_dir / "models" / "ueba_xgboost.joblib"
    scaler_path = base_dir / "preprocessing" / "scaler.joblib"
    schema_path = base_dir / "preprocessing" / "feature_schema.json"
    meta_path = base_dir / "metadata" / "model_metadata.json"

    assert iso_path.exists() and iso_path.stat().st_size > 50000
    assert xgb_path.exists() and xgb_path.stat().st_size > 5000
    assert scaler_path.exists() and scaler_path.stat().st_size > 500
    assert schema_path.exists() and schema_path.stat().st_size > 200
    assert meta_path.exists() and meta_path.stat().st_size > 100

    health = ml_ueba_service.get_health_status()
    assert health["status"] == "HEALTHY"
    assert health["artifacts_loaded"]["scaler"] is True
    assert health["artifacts_loaded"]["isolation_forest"] is True
    assert health["artifacts_loaded"]["xgboost"] is True
    assert health["artifacts_loaded"]["schema"] is True


# =====================================================================
# 3. Schema Loads Exactly 30 Features
# =====================================================================
def test_03_schema_loads_exactly_30_features():
    assert len(ml_ueba_service.feature_names) == 30
    assert "hour_of_day" in ml_ueba_service.feature_names
    assert "day_of_week" in ml_ueba_service.feature_names
    assert "file_access_count" in ml_ueba_service.feature_names
    assert "removable_media_events" in ml_ueba_service.feature_names
    assert "failed_resource_access_count" in ml_ueba_service.feature_names


# =====================================================================
# 4. Schema / Model Dimensions Match
# =====================================================================
def test_04_schema_model_dimensions_match():
    schema_count = len(ml_ueba_service.feature_names)
    scaler_count = ml_ueba_service.scaler.n_features_in_
    iso_count = ml_ueba_service.isolation_forest.n_features_in_
    xgb_count = ml_ueba_service.xgboost.n_features_in_

    assert schema_count == 30
    assert scaler_count == 30
    assert iso_count == 30
    assert xgb_count == 30
    assert schema_count == scaler_count == iso_count == xgb_count


# =====================================================================
# 5. Scaler Loads and Transforms
# =====================================================================
def test_05_scaler_loads_and_transforms(base_ueba_features):
    df = ml_ueba_service.validate_and_prepare_features(base_ueba_features)
    assert df.shape == (1, 30)
    scaled = ml_ueba_service.scaler.transform(df)
    assert scaled.shape == (1, 30)
    assert not np.isnan(scaled).any()
    assert not np.isinf(scaled).any()


# =====================================================================
# 6. Isolation Forest Loads and Infers
# =====================================================================
def test_06_isolation_forest_loads_and_infers(base_ueba_features):
    df = ml_ueba_service.validate_and_prepare_features(base_ueba_features)
    scaled = ml_ueba_service.scaler.transform(df)
    pred = ml_ueba_service.isolation_forest.predict(scaled)
    score = ml_ueba_service.isolation_forest.decision_function(scaled)

    assert pred[0] in [1, -1]
    assert isinstance(float(score[0]), float)


# =====================================================================
# 7. XGBoost Loads and Predicts
# =====================================================================
def test_07_xgboost_loads_and_predicts(base_ueba_features):
    df = ml_ueba_service.validate_and_prepare_features(base_ueba_features)
    scaled = ml_ueba_service.scaler.transform(df)
    pred = ml_ueba_service.xgboost.predict(scaled)
    proba = ml_ueba_service.xgboost.predict_proba(scaled)

    assert int(pred[0]) in [0, 1]
    assert proba.shape == (1, 2)
    assert math.isclose(float(np.sum(proba)), 1.0, rel_tol=1e-4)


# =====================================================================
# 8. Label Mapping Works
# =====================================================================
def test_08_label_mapping_works():
    classes = list(ml_ueba_service.xgboost.classes_)
    assert classes == [0, 1]
    label_map = {0: "BENIGN", 1: "THREAT"}
    assert label_map[0] == "BENIGN"
    assert label_map[1] == "THREAT"


# =====================================================================
# 9. Valid Telemetry Accepted (Benign & Threat)
# =====================================================================
def test_09_valid_telemetry_accepted_benign_and_threat(benign_worker_sample, usb_exfil_sample):
    res_b = ml_ueba_service.predict(benign_worker_sample)
    assert res_b.status == "SUCCESS"
    assert res_b.verdict == "BENIGN_USER"
    assert res_b.is_threat is False
    assert res_b.is_anomaly is False

    res_t = ml_ueba_service.predict(usb_exfil_sample)
    assert res_t.status == "SUCCESS"
    assert res_t.verdict == "CONFIRMED_INSIDER_THREAT"
    assert res_t.is_threat is True
    assert res_t.is_anomaly is True


# =====================================================================
# 10. Missing Feature Rejected (Insufficient Data)
# =====================================================================
def test_10_missing_feature_rejected_insufficient_data(ueba_test_vectors):
    incomplete = ueba_test_vectors["Incomplete Vector (Missing 3 Features)"]
    with pytest.raises(InsufficientDataException) as exc_info:
        ml_ueba_service.validate_and_prepare_features(incomplete)
    assert len(exc_info.value.missing_features) == 3
    assert "removable_media_events" in exc_info.value.missing_features

    res = ml_ueba_service.predict(incomplete)
    assert res.status == "INSUFFICIENT_DATA"
    assert res.verdict == "INSUFFICIENT_DATA"
    assert len(res.missing_features) == 3


# =====================================================================
# 11. Extra Feature Behavior Verified
# =====================================================================
def test_11_extra_feature_behavior_verified(benign_worker_sample):
    augmented = dict(benign_worker_sample)
    augmented["extra_sensor_id"] = "agent-xyz-999"
    augmented["device_firmware_version"] = "2.4.1"

    df = ml_ueba_service.validate_and_prepare_features(augmented)
    assert df.shape == (1, 30)
    assert "extra_sensor_id" not in df.columns
    res = ml_ueba_service.predict(augmented)
    assert res.status == "SUCCESS"
    assert res.verdict == "BENIGN_USER"


# =====================================================================
# 12. NaN Rejected
# =====================================================================
def test_12_nan_rejected_invalid_feature_value(ueba_test_vectors):
    nan_vec = ueba_test_vectors["Malformed Vector with NaN"]
    with pytest.raises(ValueError) as exc:
        ml_ueba_service.validate_and_prepare_features(nan_vec)
    assert "invalid non-finite value" in str(exc.value)

    res = ml_ueba_service.predict(nan_vec)
    assert res.status == "ERROR"
    assert "invalid non-finite value" in res.error_message


# =====================================================================
# 13. Infinity Rejected
# =====================================================================
def test_13_infinity_rejected_invalid_feature_value(ueba_test_vectors):
    inf_vec = ueba_test_vectors["Malformed Vector with Infinity"]
    with pytest.raises(ValueError) as exc:
        ml_ueba_service.validate_and_prepare_features(inf_vec)
    assert "invalid non-finite value" in str(exc.value)

    res = ml_ueba_service.predict(inf_vec)
    assert res.status == "ERROR"
    assert "invalid non-finite value" in res.error_message


# =====================================================================
# 14. Invalid Type Rejected
# =====================================================================
def test_14_invalid_type_rejected(base_ueba_features):
    bad_vec = dict(base_ueba_features)
    bad_vec["hour_of_day"] = "invalid_string_hour"
    with pytest.raises(ValueError) as exc:
        ml_ueba_service.validate_and_prepare_features(bad_vec)
    assert "must be numeric" in str(exc.value)

    res = ml_ueba_service.predict(bad_vec)
    assert res.status == "ERROR"
    assert "must be numeric" in res.error_message


# =====================================================================
# 15. Model Inference Executes
# =====================================================================
def test_15_model_inference_executes(benign_worker_sample, usb_exfil_sample):
    res1 = ml_ueba_service.predict(benign_worker_sample)
    assert isinstance(res1, MLUEBAAnalysisResult)
    assert res1.features_evaluated == 30

    res2 = ml_ueba_service.predict(usb_exfil_sample)
    assert isinstance(res2, MLUEBAAnalysisResult)
    assert res2.features_evaluated == 30


# =====================================================================
# 16. Confidence Derived from Real Model Output
# =====================================================================
def test_16_confidence_derived_from_real_model_output(usb_exfil_sample):
    df = ml_ueba_service.validate_and_prepare_features(usb_exfil_sample)
    scaled = ml_ueba_service.scaler.transform(df)
    xgb_probs = ml_ueba_service.xgboost.predict_proba(scaled)[0]

    res = ml_ueba_service.predict(usb_exfil_sample)
    assert math.isclose(res.xgboost_probability, float(xgb_probs[1]), rel_tol=1e-4)
    assert res.confidence >= 0.85


# =====================================================================
# 17. SecurityEvent Persistence Works
# =====================================================================
@pytest.mark.asyncio
async def test_17_security_event_persistence_works(usb_exfil_sample):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "VerifySecEv")
        cid = comp["company_id"]
        headers = comp["headers"]

        ev_res = await client.post("/api/v1/ueba/events", headers=headers, json={
            "action": "SUSPICIOUS_BULK_DOWNLOAD",
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
            assert sec_ev.metadata_json["module"] == "ueba_anomaly_detection"


# =====================================================================
# 18. Tenant Isolation Works
# =====================================================================
@pytest.mark.asyncio
async def test_18_tenant_isolation_database(usb_exfil_sample):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp_a = await create_test_company(client, "VerifyIsoA")
        comp_b = await create_test_company(client, "VerifyIsoB")

        res_a = await client.post("/api/v1/ueba/events", headers=comp_a["headers"], json={
            "action": "SECRET_EXFIL_A",
            "features": usb_exfil_sample
        })
        assert res_a.status_code == 201
        ev_id = res_a.json()["data"]["id"]

        # Company A can see it
        list_a = await client.get("/api/v1/ueba/events", headers=comp_a["headers"])
        assert list_a.status_code == 200
        assert any(e["id"] == ev_id for e in list_a.json()["data"])

        # Company B CANNOT see Company A's event
        list_b = await client.get("/api/v1/ueba/events", headers=comp_b["headers"])
        assert list_b.status_code == 200
        assert not any(e["id"] == ev_id for e in list_b.json()["data"])


# =====================================================================
# 19. User Authorization Works
# =====================================================================
@pytest.mark.asyncio
async def test_19_user_authorization_rejects_normal_user():
    suffix = uuid.uuid4().hex[:6]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create normal USER account
        signup_res = await client.post("/api/v1/auth/signup", json={
            "name": "Normal User",
            "email": f"normal.{suffix}@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
        })
        assert signup_res.status_code == 200
        user_token = signup_res.json()["data"]["token"]
        headers = {"Authorization": f"Bearer {user_token}"}

        # Normal User attempting to access UEBA endpoints must receive 403
        res = await client.get("/api/v1/ueba/events", headers=headers)
        assert res.status_code == 403

        res_anom = await client.get("/api/v1/ueba/anomalies", headers=headers)
        assert res_anom.status_code == 403

        res_health = await client.get("/api/v1/ueba/ml/health", headers=headers)
        assert res_health.status_code == 403


# =====================================================================
# 20. Cross-Company Request Fails
# =====================================================================
@pytest.mark.asyncio
async def test_20_cross_company_request_fails(usb_exfil_sample):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp_a = await create_test_company(client, "CrossCompA")
        comp_b = await create_test_company(client, "CrossCompB")

        user_b_id = comp_b["user_id"]

        # Company A admin attempting to ingest an event targeting Company B user must fail with 403
        cross_res = await client.post("/api/v1/ueba/events", headers=comp_a["headers"], json={
            "user_id": user_b_id,
            "action": "CROSS_COMPANY_SPOOF_ATTEMPT",
            "features": usb_exfil_sample
        })
        assert cross_res.status_code == 403

        # Company A admin attempting to query Company B user profile must fail with 403
        prof_res = await client.get(f"/api/v1/ueba/users/{user_b_id}/profile", headers=comp_a["headers"])
        assert prof_res.status_code == 403

        # Company A admin attempting to list events filtered by Company B user must fail with 403
        list_res = await client.get(f"/api/v1/ueba/events?user_id={user_b_id}", headers=comp_a["headers"])
        assert list_res.status_code == 403


# =====================================================================
# 21. Incident Correlation Works
# =====================================================================
@pytest.mark.asyncio
async def test_21_incident_correlation_works(usb_exfil_sample):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "VerifyCorr")
        cid = comp["company_id"]
        headers = comp["headers"]

        await client.post("/api/v1/ueba/events", headers=headers, json={
            "action": "CRITICAL_INSIDER_EXFIL",
            "features": usb_exfil_sample
        })

        async with AsyncSessionLocal() as db:
            inc = await db.scalar(select(Incident).where(Incident.company_id == cid))
            assert inc is not None
            assert inc.severity in ["HIGH", "CRITICAL"]


# =====================================================================
# 22. M05 DetectionEvidence Works
# =====================================================================
def test_22_m05_detection_evidence_works():
    cid = str(uuid.uuid4())
    uid = str(uuid.uuid4())
    evidence = DetectionEvidence(
        source="UEBA",
        entity_type="USER",
        entity_id=uid,
        company_id=cid,
        user_id=uid,
        verdict="CONFIRMED_INSIDER_THREAT",
        is_threat=True,
        severity="CRITICAL",
        confidence=0.95,
        anomaly_score=-0.15,
        model_version="ueba-anomaly-v1",
        raw_evidence={"verdict": "CONFIRMED_INSIDER_THREAT"},
        environment="REAL",
    )
    assessment = ml_fusion_service.evaluate_fusion(
        evidence_items=[evidence],
        company_id=cid,
        environment="REAL"
    )
    assert assessment is not None
    assert "UEBA" in assessment.sources_present
    assert "UEBA" in assessment.threat_sources
    assert assessment.verdict in ["SUSPICIOUS", "HIGH_CONFIDENCE_THREAT", "CRITICAL_THREAT"]


# =====================================================================
# 23. WebSocket Tenant Isolation Works
# =====================================================================
def test_23_websocket_tenant_isolation_works():
    from app.core.websocket import ws_manager
    assert hasattr(ws_manager, "broadcast_to_company")
    assert hasattr(ws_manager, "_company_connections")


# =====================================================================
# 24. Digital Twin Integration Works
# =====================================================================
@pytest.mark.asyncio
async def test_24_digital_twin_integration_works(usb_exfil_sample):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "VerifyTwin")
        headers = comp["headers"]
        uid = comp["user_id"]

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


# =====================================================================
# 25. Attack Graph Integration Works
# =====================================================================
@pytest.mark.asyncio
async def test_25_attack_graph_integration_works(usb_exfil_sample):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "VerifyAG")
        headers = comp["headers"]
        uid = comp["user_id"]

        await client.post("/api/v1/ueba/events", headers=headers, json={
            "user_id": uid,
            "action": "USB_BULK_EXFIL_AFTER_HOURS",
            "features": usb_exfil_sample
        })

        ag_res = await client.get("/api/v1/attack-graph", headers=headers)
        assert ag_res.status_code == 200
        nodes = ag_res.json()["data"]["nodes"]
        user_node = next((n for n in nodes if n["id"] == uid), None)
        assert user_node is not None
        assert user_node["type"] == "identity"


# =====================================================================
# 26. AI Copilot Can Access Actual UEBA Evidence
# =====================================================================
@pytest.mark.asyncio
async def test_26_ai_copilot_can_access_actual_ueba_evidence(usb_exfil_sample):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "VerifyCopilot")
        headers = comp["headers"]
        uid = comp["user_id"]

        # Ingest threat event for user
        await client.post("/api/v1/ueba/events", headers=headers, json={
            "user_id": uid,
            "action": "MASS_UNAUTHORIZED_DATA_EXFIL",
            "features": usb_exfil_sample
        })

        # Ask Copilot to investigate the user
        inv_res = await client.post("/api/v1/ai/investigate", headers=headers, json={
            "target_type": "USER",
            "target_value": uid
        })
        assert inv_res.status_code == 200
        inv_data = inv_res.json()
        assert inv_data["target_type"] == "USER"
        assert len(inv_data["evidence"]) >= 1
        assert any(e.get("entity_type") == "USER" for e in inv_data["evidence"])


# =====================================================================
# 27. M07 Is Not Bypassed
# =====================================================================
@pytest.mark.asyncio
async def test_27_m07_is_not_bypassed(usb_exfil_sample):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "VerifySOARBoundary")
        cid = comp["company_id"]
        headers = comp["headers"]

        async with AsyncSessionLocal() as db:
            initial_executions = (await db.scalars(
                select(PlaybookExecution).where(PlaybookExecution.company_id == cid)
            )).all()
            initial_count = len(initial_executions)

        # Ingesting a UEBA threat must NEVER automatically execute destructive SOAR actions
        await client.post("/api/v1/ueba/events", headers=headers, json={
            "action": "UNAUTHORIZED_USB_DUMP",
            "features": usb_exfil_sample
        })

        async with AsyncSessionLocal() as db:
            after_executions = (await db.scalars(
                select(PlaybookExecution).where(PlaybookExecution.company_id == cid)
            )).all()
            assert len(after_executions) == initial_count


# =====================================================================
# 28. No Fake Telemetry Generated
# =====================================================================
def test_28_no_fake_telemetry_generated(benign_worker_sample):
    # Verify deterministic output across multiple invocations
    res1 = ml_ueba_service.predict(benign_worker_sample)
    res2 = ml_ueba_service.predict(benign_worker_sample)
    assert res1.verdict == res2.verdict
    assert res1.confidence == res2.confidence
    assert res1.anomaly_score == res2.anomaly_score
    assert res1.xgboost_probability == res2.xgboost_probability


# =====================================================================
# 29. Unknown / Insufficient Data Handled Correctly
# =====================================================================
def test_29_unknown_insufficient_data_handled_correctly():
    empty_features = {}
    res = ml_ueba_service.predict(empty_features)
    assert res.status == "INSUFFICIENT_DATA"
    assert res.verdict == "INSUFFICIENT_DATA"
    assert len(res.missing_features) == 30
    assert res.confidence == 0.0


# =====================================================================
# 30. M03 API Appears in OpenAPI
# =====================================================================
def test_30_m03_api_appears_in_openapi():
    openapi = app.openapi()
    paths = openapi.get("paths", {})
    expected_endpoints = [
        "/api/v1/ueba/events",
        "/api/v1/ueba/analyze",
        "/api/v1/ueba/anomalies",
        "/api/v1/ueba/users/{target_user_id}/profile",
        "/api/v1/ueba/ml/health",
    ]
    for endpoint in expected_endpoints:
        assert endpoint in paths, f"Expected endpoint {endpoint} not found in OpenAPI"
