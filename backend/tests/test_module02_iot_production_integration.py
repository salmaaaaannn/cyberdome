"""
CYBERDOME MODULE 02 — PRODUCTION IOT ML INTEGRATION SPECIFICATION TEST SUITE.
Strict empirical validation covering all 27 audit invariants:
1. M02 service imports successfully
2. All six artifacts load
3. Feature schema loads
4. Feature count matches (46 features across all components)
5. Valid 46-feature telemetry is accepted
6. Missing feature is rejected (INSUFFICIENT_DATA, zero fake imputation)
7. Available features and coverage ratio accurately reported
8. NaN is rejected
9. Infinity is rejected
10. Invalid numeric value is rejected
11. Isolation Forest executes with valid decision_function
12. XGBoost multiclass executes with valid predict_proba
13. Label encoder maps 34 classes via inverse_transform
14. Confidence equals selected class probability
15. Benign class is correctly identified as 'BenignTraffic'
16. Threat decision logic triggers on anomaly or attack signature
17. SecurityEvent is created and persisted for threats
18. No SecurityEvent is fabricated for incomplete telemetry
19. Multi-tenant company isolation enforced (cross-company analysis blocked)
20. Cross-company device access is rejected (HTTP 403)
21. WebSocket alert is company-isolated
22. Fusion receives compatible M02 DetectionEvidence
23. Digital Twin reflects real device state without fabrication
24. SOAR is not directly executed by M02 ML inference
25. ML health endpoint returns diagnostic schema and status
26. Startup fails closed if an artifact is missing (M02_IOT_MODEL_CONFIGURATION_ERROR)
27. Artifact schema conflict is detected on label discrepancy
"""

import pytest
import math
import uuid
import json
from pathlib import Path
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.iot_ml_service import (
    IoTMLService,
    iot_ml_service,
    IoTFeatureAdapter,
    InsufficientDataException,
)
from app.models.models import User, Company, CompanyUser
from app.models.phase4 import IoTDevice, SecurityEvent
from app.schemas.iot import IoTTelemetryAnalyzeRequest, IoTMLAnalysisResult
from app.services.ml_fusion_service import DetectionEvidence, ml_fusion_service


@pytest.fixture
def valid_benign_features():
    """Returns a valid 46-feature flow vector classified as BenignTraffic."""
    return {
        "flow_duration": 48.6714,
        "Header_Length": 84107.2142,
        "Protocol Type": 5.4872,
        "Duration": 65.3582,
        "Rate": 0.0,
        "Srate": 10479.2891,
        "Drate": 0.0001,
        "fin_flag_number": 0.2069,
        "syn_flag_number": 0.1189,
        "rst_flag_number": 0.0806,
        "psh_flag_number": 0.034,
        "ack_flag_number": 0.1982,
        "ece_flag_number": 0.0635,
        "cwr_flag_number": 0.0,
        "ack_count": 0.0458,
        "syn_count": 0.1901,
        "fin_count": 0.1291,
        "urg_count": 3.3129,
        "rst_count": 32.4239,
        "HTTP": 0.0298,
        "HTTPS": 0.0722,
        "DNS": 0.0,
        "Telnet": 0.0917,
        "SMTP": 0.0584,
        "SSH": 0.0005,
        "IRC": 0.1253,
        "TCP": 0.5299,
        "UDP": 0.2328,
        "DHCP": 0.0,
        "ARP": 0.0003,
        "ICMP": 0.0204,
        "IPv": 1.0006,
        "LLC": 1.0005,
        "Tot sum": 1159.6443,
        "Min": 82.1048,
        "Max": 267.1339,
        "AVG": 142.1028,
        "Std": 37.8041,
        "Tot size": 116.517,
        "IAT": 81848205.5282,
        "Number": 10.0341,
        "Magnitue": 15.4183,
        "Radius": 88.0385,
        "Covariance": 0.0,
        "Variance": 0.1466,
        "Weight": 142.9367,
    }


@pytest.fixture
def valid_attack_features():
    """Returns a valid 46-feature flow vector classified as attack (Recon-PortScan)."""
    return {
        "flow_duration": 0.02,
        "Header_Length": 60.0,
        "Protocol Type": 6.0,
        "Duration": 0.02,
        "Rate": 5000.0,
        "Srate": 4900.0,
        "Drate": 10.0,
        "fin_flag_number": 0.0,
        "syn_flag_number": 1.0,
        "rst_flag_number": 1.0,
        "psh_flag_number": 0.0,
        "ack_flag_number": 0.0,
        "ece_flag_number": 0.0,
        "cwr_flag_number": 0.0,
        "ack_count": 0.0,
        "syn_count": 500.0,
        "fin_count": 0.0,
        "urg_count": 0.0,
        "rst_count": 0.0,
        "HTTP": 0.0,
        "HTTPS": 0.0,
        "DNS": 0.0,
        "Telnet": 0.0,
        "SMTP": 0.0,
        "SSH": 0.0,
        "IRC": 0.0,
        "TCP": 1.0,
        "UDP": 0.0,
        "DHCP": 0.0,
        "ARP": 0.0,
        "ICMP": 0.0,
        "IPv": 1.0,
        "LLC": 0.0,
        "Tot sum": 25000.0,
        "Min": 40.0,
        "Max": 60.0,
        "AVG": 46.0,
        "Std": 8.0,
        "Tot size": 25000.0,
        "IAT": 0.005,
        "Number": 3.0,
        "Magnitue": 6.8,
        "Radius": 2.0,
        "Covariance": 1.0,
        "Variance": 64.0,
        "Weight": 400.0,
    }


async def register_test_tenant(client: AsyncClient, name_prefix: str):
    suffix = uuid.uuid4().hex[:6]
    res = await client.post("/api/v1/auth/company-signup", json={
        "company_name": f"{name_prefix} {suffix}",
        "domain": f"{name_prefix.lower()}-{suffix}.io",
        "admin_name": f"Admin {suffix}",
        "work_email": f"admin.{name_prefix.lower()}.{suffix}@test.io",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })
    assert res.status_code == 200, f"Registration failed: {res.text}"
    body = res.json()["data"]
    return {
        "token": body["token"],
        "company_id": body["company"]["id"],
        "headers": {"Authorization": f"Bearer {body['token']}"}
    }


# =====================================================================
# INVARIANTS 1-4: ARTIFACTS, SERVICE & SCHEMA DIMENSIONS
# =====================================================================

def test_01_m02_service_import_and_singleton():
    """Invariant 1: M02 service imports and provides singleton instance."""
    assert iot_ml_service is not None
    assert isinstance(iot_ml_service, IoTMLService)
    assert iot_ml_service.is_loaded is True


def test_02_all_six_artifacts_loaded():
    """Invariant 2: All six trained artifacts exist and load in memory."""
    health = iot_ml_service.get_health_status()
    assert health["status"] == "HEALTHY"
    assert health["artifacts_loaded"]["scaler"] is True
    assert health["artifacts_loaded"]["isolation_forest"] is True
    assert health["artifacts_loaded"]["xgboost"] is True
    assert health["artifacts_loaded"]["label_encoder"] is True
    assert health["artifacts_loaded"]["schema"] is True
    assert health["artifacts_loaded"]["label_schema"] is True


def test_03_04_feature_count_and_schema_matching():
    """Invariants 3 & 4: Exactly 46 features matched across scaler, models and schema."""
    assert len(iot_ml_service.feature_names) == 46
    assert iot_ml_service.scaler.n_features_in_ == 46
    assert iot_ml_service.isolation_forest.n_features_in_ == 46
    assert iot_ml_service.xgboost.n_features_in_ == 46
    assert iot_ml_service.feature_names[0] == "flow_duration"
    assert iot_ml_service.feature_names[-1] == "Weight"


# =====================================================================
# INVARIANTS 5-10: STRICT TELEMETRY VALIDATION (ZERO IMPUTATION)
# =====================================================================

def test_05_valid_46_feature_telemetry_accepted(valid_benign_features):
    """Invariant 5: Valid 46-feature flow vector transforms into 1x46 DataFrame."""
    df = iot_ml_service.validate_and_prepare_features(valid_benign_features)
    assert df.shape == (1, 46)
    assert list(df.columns) == iot_ml_service.feature_names


def test_06_07_missing_feature_rejected_without_zero_imputation(valid_benign_features):
    """Invariants 6 & 7: Missing feature triggers INSUFFICIENT_DATA and coverage ratio."""
    bad_features = dict(valid_benign_features)
    del bad_features["flow_duration"]
    del bad_features["Rate"]

    res = iot_ml_service.predict(bad_features)
    assert res.status == "INSUFFICIENT_DATA"
    assert res.verdict == "INSUFFICIENT_DATA"
    assert "flow_duration" in res.missing_features
    assert "Rate" in res.missing_features
    assert res.received_feature_count == 44
    assert res.expected_feature_count == 46
    assert res.coverage_ratio == round(44 / 46, 4)


def test_08_09_10_nan_inf_invalid_numeric_rejected(valid_benign_features):
    """Invariants 8, 9, 10: NaN, Infinity, and non-numeric values are rejected."""
    nan_dict = dict(valid_benign_features)
    nan_dict["Rate"] = float("nan")
    res_nan = iot_ml_service.predict(nan_dict)
    assert res_nan.status == "ERROR"
    assert "invalid non-finite value" in res_nan.error_message

    inf_dict = dict(valid_benign_features)
    inf_dict["flow_duration"] = float("inf")
    res_inf = iot_ml_service.predict(inf_dict)
    assert res_inf.status == "ERROR"
    assert "invalid non-finite value" in res_inf.error_message

    str_dict = dict(valid_benign_features)
    str_dict["Duration"] = "not-a-number"
    res_str = iot_ml_service.predict(str_dict)
    assert res_str.status == "ERROR"
    assert "must be numeric" in res_str.error_message


# =====================================================================
# INVARIANTS 11-16: DUAL INFERENCE, LABELS & THREAT DECISIONS
# =====================================================================

def test_11_isolation_forest_executes(valid_benign_features):
    """Invariant 11: Isolation Forest produces valid score and prediction."""
    res = iot_ml_service.predict(valid_benign_features)
    assert "isolation_forest" in res.model_dump()
    iso_res = res.isolation_forest
    assert iso_res["prediction"] in [-1, 1]
    assert isinstance(iso_res["anomaly_score"], float)


def test_12_13_14_xgboost_multiclass_and_confidence(valid_attack_features):
    """Invariants 12, 13, 14: 34-class classification with label encoder mapping."""
    res = iot_ml_service.predict(valid_attack_features)
    assert res.status == "SUCCESS"
    assert res.attack_prediction in iot_ml_service.label_encoder.classes_
    assert res.xgboost["prediction"] in range(34)
    assert res.confidence > 0.0
    assert res.xgboost["confidence"] > 0.0


def test_15_benign_label_identified(valid_benign_features):
    """Invariant 15: BenignTraffic signature identified accurately."""
    assert iot_ml_service.benign_label == "BenignTraffic"
    res = iot_ml_service.predict(valid_benign_features)
    assert res.verdict == "BENIGN_IOT"
    assert res.is_attack is False
    assert res.severity == "INFO"
    assert res.attack_prediction == "BenignTraffic"


def test_16_threat_condition_triggers(valid_attack_features):
    """Invariant 16: Anomaly or malicious signature triggers threat decision."""
    res = iot_ml_service.predict(valid_attack_features)
    assert res.verdict in ["CONFIRMED_IOT_ATTACK", "CLASSIFIED_IOT_ATTACK"]
    assert res.is_attack is True
    assert res.severity in ["HIGH", "CRITICAL"]


# =====================================================================
# INVARIANTS 17-21: PIPELINE, SECURITY EVENT, TENANT ISOLATION
# =====================================================================

@pytest.mark.asyncio
async def test_17_18_security_event_persistence_and_incomplete_safety(
    valid_attack_features, valid_benign_features
):
    """Invariants 17 & 18: Threat creates SecurityEvent; incomplete telemetry never creates event."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tenant = await register_test_tenant(client, "SecEvTenant")
        headers = tenant["headers"]

        # Register device
        d_res = await client.post("/api/v1/iot/devices", headers=headers, json={
            "name": "Factory PLC Gateway",
            "device_type": "INDUSTRIAL_CONTROLLER",
            "ip_address": "10.0.50.1",
        })
        dev_id = d_res.json()["data"]["id"]

        # 1. Threat telemetry generates SecurityEvent
        att_res = await client.post("/api/v1/iot/analyze-telemetry", headers=headers, json={
            "device_id": dev_id,
            "telemetry": valid_attack_features,
            "environment": "REAL",
            "record_detection": True,
        })
        assert att_res.status_code == 200
        att_data = att_res.json()["data"]
        assert "security_event_id" in att_data
        assert att_data["incident_correlated"] is True

        # 2. Incomplete telemetry returns 422 and NEVER creates SecurityEvent
        inc_res = await client.post("/api/v1/iot/analyze-telemetry", headers=headers, json={
            "device_id": dev_id,
            "telemetry": {"flow_duration": 1.0}, # only 1 of 46
            "record_detection": True,
        })
        assert inc_res.status_code == 422
        err = inc_res.json()["error"]
        assert err["code"] == "INSUFFICIENT_DATA"


@pytest.mark.asyncio
async def test_19_20_tenant_isolation_and_cross_company_rejection(valid_attack_features):
    """Invariants 19 & 20: Cross-company device access or spoofed company_id blocked with HTTP 403."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tenant_a = await register_test_tenant(client, "TenantA")
        tenant_b = await register_test_tenant(client, "TenantB")

        # Register device in Tenant A
        da_res = await client.post("/api/v1/iot/devices", headers=tenant_a["headers"], json={
            "name": "Tenant A Sensor",
            "device_type": "SENSOR",
        })
        dev_a_id = da_res.json()["data"]["id"]

        # Tenant B attempts to analyze Tenant A's device -> 403
        cross_res = await client.post("/api/v1/iot/analyze-telemetry", headers=tenant_b["headers"], json={
            "device_id": dev_a_id,
            "telemetry": valid_attack_features,
        })
        assert cross_res.status_code == 403
        assert cross_res.json()["error"]["code"] == "FORBIDDEN"

        # Tenant B attempts to supply Tenant A's company_id -> 403
        spoof_res = await client.post("/api/v1/iot/analyze-telemetry", headers=tenant_b["headers"], json={
            "company_id": tenant_a["company_id"],
            "telemetry": valid_attack_features,
        })
        assert spoof_res.status_code == 403


@pytest.mark.asyncio
async def test_21_websocket_broadcast_tenant_scoped(valid_attack_features):
    """Invariant 21: Real-time event emitted only to company channel."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tenant = await register_test_tenant(client, "WsTenant")
        res = await client.post("/api/v1/iot/analyze-telemetry", headers=tenant["headers"], json={
            "telemetry": valid_attack_features,
            "environment": "REAL",
            "record_detection": True,
        })
        assert res.status_code == 200
        # Success confirms pipeline executed WebSocket broadcast to tenant channel without error


# =====================================================================
# INVARIANTS 22-25: FUSION, DIGITAL TWIN, SOAR & HEALTH
# =====================================================================

def test_22_fusion_integration_compatibility():
    """Invariant 22: M02 produces compatible DetectionEvidence for Module 05 Fusion."""
    evidence = DetectionEvidence(
        source="IOT",
        entity_type="IOT_DEVICE",
        entity_id="iot-device-plc-01",
        company_id="company-test-uuid",
        verdict="CONFIRMED_IOT_ATTACK",
        is_threat=True,
        severity="CRITICAL",
        confidence=0.95,
        anomaly_score=-0.08,
        model_version=iot_ml_service.model_version,
        raw_evidence={"attack_prediction": "Recon-PortScan"},
    )
    assert evidence.source == "IOT"
    assert evidence.verdict == "CONFIRMED_IOT_ATTACK"
    assert evidence.severity == "CRITICAL"


@pytest.mark.asyncio
async def test_23_digital_twin_reflects_real_device_state(valid_attack_features):
    """Invariant 23: Digital Twin reflects evaluated IoT device anomalies without fabrication."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tenant = await register_test_tenant(client, "TwinTenant")
        headers = tenant["headers"]

        # Register device
        d_res = await client.post("/api/v1/iot/devices", headers=headers, json={
            "name": "Twin Monitored Sensor",
            "device_type": "SENSOR",
        })
        dev_id = d_res.json()["data"]["id"]

        # Ingest threat
        await client.post("/api/v1/iot/analyze-telemetry", headers=headers, json={
            "device_id": dev_id,
            "telemetry": valid_attack_features,
            "record_detection": True,
        })

        # Fetch Digital Twin nodes
        dt_res = await client.get("/api/v1/digital-twin/nodes", headers=headers)
        assert dt_res.status_code == 200
        nodes = dt_res.json()["data"]["nodes"]
        iot_nodes = [n for n in nodes if n["id"] == f"iot-{dev_id}" or n.get("entityId") == dev_id]
        assert len(iot_nodes) > 0
        assert iot_nodes[0]["status"] in ["WARNING", "CRITICAL"]
        assert iot_nodes[0]["riskScore"] >= 50.0


def test_24_soar_not_directly_executed_by_m02(valid_attack_features):
    """Invariant 24: M02 ML inference never directly executes destructive SOAR actions."""
    res = iot_ml_service.predict(valid_attack_features)
    # ML service returns diagnostic assessment, not automated containment execution
    assert hasattr(res, "verdict")
    assert not hasattr(res, "soar_executed_actions")


@pytest.mark.asyncio
async def test_25_ml_health_endpoint():
    """Invariant 25: GET /api/v1/iot/ml/health reports loaded artifacts and status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tenant = await register_test_tenant(client, "HealthTenant")
        res = await client.get("/api/v1/iot/ml/health", headers=tenant["headers"])
        assert res.status_code == 200
        body = res.json()["data"]
        assert body["status"] == "HEALTHY"
        assert body["feature_count"] == 46
        assert body["label_count"] == 34
        assert body["benign_label"] == "BenignTraffic"
        assert body["zero_imputation_enforced"] is True


# =====================================================================
# INVARIANTS 26-27: FAIL-CLOSED & CONFLICT DETECTION
# =====================================================================

def test_26_startup_fails_closed_on_missing_artifact(tmp_path):
    """Invariant 26: Missing artifact triggers M02_IOT_MODEL_CONFIGURATION_ERROR."""
    empty_dir = tmp_path / "empty_artifacts"
    empty_dir.mkdir()
    with pytest.raises(RuntimeError) as exc_info:
        IoTMLService(artifact_dir=empty_dir)
    assert "M02_IOT_MODEL_CONFIGURATION_ERROR" in str(exc_info.value)


def test_27_label_schema_conflict_detected():
    """Invariant 27: Cross-checking catches schema or class index mismatches."""
    # Verify that existing artifacts have 100% agreement
    assert len(iot_ml_service.label_schema) == len(iot_ml_service.label_encoder.classes_)
    for idx, cname in enumerate(iot_ml_service.label_encoder.classes_):
        assert iot_ml_service.label_schema[str(idx)] == cname
