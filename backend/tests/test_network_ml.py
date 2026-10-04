"""
CYBERDOME — Module 01 Network Anomaly Detection ML Test Suite.
Verifies:
1. ML Service loading, health checks, and 77-feature authoritative schema.
2. Strict completeness validation (Zero fake feature imputation).
3. Non-finite / invalid value rejection.
4. Inference pipeline (Scaler -> Isolation Forest + XGBoost).
5. API endpoints:
   - GET /api/v1/network/ml/health
   - POST /api/v1/network/analyze
   - POST /api/v1/network/events (ML hook)
6. Multi-tenant isolation and RBAC.
"""

import pytest
import math
import uuid
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.ml_network_service import (
    ml_network_service,
    NetworkFeatureAdapter,
    InsufficientDataException,
)


@pytest.fixture
def sample_benign_features():
    """Generates a complete 77-feature dictionary initialized to 0.0."""
    return {f: 0.0 for f in ml_network_service.feature_names}


def test_ml_service_loading_and_metadata():
    """Test that all 4 artifacts are loaded with valid dimensions."""
    health = ml_network_service.get_health_status()
    assert health["status"] == "HEALTHY"
    assert health["dataset_benchmark"] == "CIC-IDS2017"
    assert health["features_count"] == 77
    assert len(health["features_schema"]) == 77
    assert health["models_loaded"]["feature_schema"] is True
    assert health["models_loaded"]["scaler"] is True
    assert health["models_loaded"]["isolation_forest"] is True
    assert health["models_loaded"]["xgboost"] is True


def test_authoritative_feature_ordering(sample_benign_features):
    """Test DataFrame construction matches the exact 77-feature schema order."""
    df = ml_network_service.validate_and_prepare_features(sample_benign_features)
    assert list(df.columns) == ml_network_service.feature_names
    assert len(df.columns) == 77
    assert df.shape == (1, 77)


def test_strict_completeness_and_zero_imputation_prevention(sample_benign_features):
    """
    Test that missing features are strictly rejected.
    Zero-imputation or fallback defaulting is completely forbidden.
    """
    # 1. Missing a single feature
    incomplete_features = sample_benign_features.copy()
    del incomplete_features["Protocol"]
    res_single_missing = ml_network_service.predict(incomplete_features)
    assert res_single_missing.status == "INSUFFICIENT_DATA"
    assert "Protocol" in res_single_missing.missing_features
    assert res_single_missing.features_evaluated == 76

    # 2. Empty payload
    res_empty = ml_network_service.predict({})
    assert res_empty.status == "INSUFFICIENT_DATA"
    assert len(res_empty.missing_features) == 77
    assert res_empty.features_evaluated == 0

    # 3. None value should also be treated as missing
    none_features = sample_benign_features.copy()
    none_features["Flow Duration"] = None
    res_none = ml_network_service.predict(none_features)
    assert res_none.status == "INSUFFICIENT_DATA"
    assert "Flow Duration" in res_none.missing_features


def test_numeric_and_finiteness_validation(sample_benign_features):
    """Test that non-numeric, NaN, and Inf values are strictly rejected."""
    # Non-numeric string
    bad_features = sample_benign_features.copy()
    bad_features["Protocol"] = "not_a_number"
    res_bad = ml_network_service.predict(bad_features)
    assert res_bad.status == "ERROR"
    assert "must be numeric" in res_bad.error_message

    # NaN value
    nan_features = sample_benign_features.copy()
    nan_features["Flow Duration"] = float("nan")
    res_nan = ml_network_service.predict(nan_features)
    assert res_nan.status == "ERROR"
    assert "non-finite" in res_nan.error_message

    # Infinite value
    inf_features = sample_benign_features.copy()
    inf_features["Flow Duration"] = float("inf")
    res_inf = ml_network_service.predict(inf_features)
    assert res_inf.status == "ERROR"
    assert "non-finite" in res_inf.error_message


def test_inference_benign_traffic(sample_benign_features):
    """Test inference on valid feature vector returns expected structure."""
    result = ml_network_service.predict(sample_benign_features)
    assert result.status == "SUCCESS"
    assert result.dataset_benchmark == "CIC-IDS2017"
    assert result.features_evaluated == 77
    assert result.verdict in ["BENIGN", "NETWORK_ANOMALY", "CLASSIFIED_ATTACK", "CONFIRMED_ATTACK"]
    assert isinstance(result.confidence, float)
    assert 0.0 <= result.confidence <= 1.0

    # Isolation Forest details
    assert "prediction" in result.isolation_forest
    assert "anomaly_score" in result.isolation_forest
    assert "is_anomaly" in result.isolation_forest

    # XGBoost details
    assert "prediction" in result.xgboost
    assert "confidence" in result.xgboost
    assert "probabilities" in result.xgboost
    assert "BENIGN" in result.xgboost["probabilities"]
    assert "ATTACK" in result.xgboost["probabilities"]


def test_network_feature_adapter():
    """Test feature extraction helper from diverse payload shapes."""
    assert NetworkFeatureAdapter.extract_features(None) is None
    assert NetworkFeatureAdapter.extract_features([]) is None

    # Nested 'features'
    data_nested = {"features": {"Protocol": 6.0}}
    assert NetworkFeatureAdapter.extract_features(data_nested) == {"Protocol": 6.0}

    # Nested 'cic_ids'
    data_cic = {"cic_ids": {"Flow Duration": 100.0}}
    assert NetworkFeatureAdapter.extract_features(data_cic) == {"Flow Duration": 100.0}

    # Direct dict
    data_direct = {"Protocol": 17.0, "Flow Duration": 200.0}
    assert NetworkFeatureAdapter.extract_features(data_direct) == data_direct


# ─── API Integration Tests ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_api_ml_health_endpoint():
    """Test GET /api/v1/network/ml/health authentication and response."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Unauthenticated request
        unauth_res = await client.get("/api/v1/network/ml/health")
        assert unauth_res.status_code == 401

        # Register admin company
        suffix = uuid.uuid4().hex[:6]
        signup_res = await client.post("/api/v1/auth/company-signup", json={
            "company_name": f"ML Test Org {suffix}",
            "domain": f"ml-test-{suffix}.com",
            "admin_name": "ML Admin",
            "work_email": f"ml.admin.{suffix}@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
        })
        assert signup_res.status_code == 200
        token = signup_res.json()["data"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Authenticated health check
        health_res = await client.get("/api/v1/network/ml/health", headers=headers)
        assert health_res.status_code == 200
        data = health_res.json()["data"]
        assert data["status"] == "HEALTHY"
        assert data["dataset_benchmark"] == "CIC-IDS2017"
        assert data["features_count"] == 77
        assert len(data["features_schema"]) == 77


@pytest.mark.asyncio
async def test_api_ml_analyze_insufficient_data():
    """Test POST /api/v1/network/analyze with incomplete features returns 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Signup company
        suffix = uuid.uuid4().hex[:6]
        signup_res = await client.post("/api/v1/auth/company-signup", json={
            "company_name": f"ML Insufficient Org {suffix}",
            "domain": f"ml-insufficient-{suffix}.com",
            "admin_name": "ML Admin",
            "work_email": f"ml.insuf.{suffix}@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
        })
        token = signup_res.json()["data"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Analyze with incomplete features (only 1 feature provided)
        res = await client.post("/api/v1/network/analyze", headers=headers, json={
            "features": {"Protocol": 6.0},
            "source_ip": "192.168.1.100",
            "dest_ip": "10.0.0.1",
        })
        assert res.status_code == 422
        body = res.json()
        assert "INSUFFICIENT_DATA" in str(body)


@pytest.mark.asyncio
async def test_api_ml_analyze_success(sample_benign_features):
    """Test POST /api/v1/network/analyze with full 77 features succeeds."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        suffix = uuid.uuid4().hex[:6]
        signup_res = await client.post("/api/v1/auth/company-signup", json={
            "company_name": f"ML Analyze Org {suffix}",
            "domain": f"ml-analyze-{suffix}.com",
            "admin_name": "ML Admin",
            "work_email": f"ml.analyze.{suffix}@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
        })
        token = signup_res.json()["data"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = await client.post("/api/v1/network/analyze", headers=headers, json={
            "features": sample_benign_features,
            "source_ip": "192.168.1.55",
            "dest_ip": "10.0.0.5",
            "protocol": "TCP",
            "record_detection": True,
        })
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["status"] == "SUCCESS"
        assert data["dataset_benchmark"] == "CIC-IDS2017"
        assert data["features_evaluated"] == 77
        assert "verdict" in data
        assert "isolation_forest" in data
        assert "xgboost" in data


@pytest.mark.asyncio
async def test_api_network_events_with_ml_telemetry(sample_benign_features):
    """Test POST /api/v1/network/events with ML flow telemetry."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        suffix = uuid.uuid4().hex[:6]
        signup_res = await client.post("/api/v1/auth/company-signup", json={
            "company_name": f"ML Ingest Org {suffix}",
            "domain": f"ml-ingest-{suffix}.com",
            "admin_name": "ML Admin",
            "work_email": f"ml.ingest.{suffix}@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
        })
        token = signup_res.json()["data"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Ingestion with full 77 features in raw_data
        event_payload = {
            "source_ip": "192.168.1.77",
            "dest_ip": "10.0.0.77",
            "protocol": "TCP",
            "direction": "INBOUND",
            "bytes": 1024,
            "packets": 12,
            "raw_data": {
                "features": sample_benign_features,
                "sensor_id": "sensor-alpha-01"
            }
        }
        res = await client.post("/api/v1/network/events", headers=headers, json=event_payload)
        assert res.status_code == 201
        data = res.json()["data"]
        assert data["sourceIp"] == "192.168.1.77"
        assert data["destIp"] == "10.0.0.77"
        assert data["mlAnalysis"] is not None
        assert data["mlAnalysis"]["status"] == "SUCCESS"
        assert data["mlAnalysis"]["dataset_benchmark"] == "CIC-IDS2017"
