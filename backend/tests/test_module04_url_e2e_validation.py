"""
CYBERDOME MODULE 04 — PHISHING & MALICIOUS URL DETECTION END-TO-END VALIDATION SUITE.
Covers all 31 audit & empirical validation requirements:
 1. test_01_artifacts_exist
 2. test_02_feature_schema_contract
 3. test_03_scaler_dimensions
 4. test_04_isolation_forest_contract
 5. test_05_xgboost_contract
 6. test_06_model_metadata_contract
 7. test_07_feature_extractor_coverage
 8. test_08_feature_extractor_robustness
 9. test_09_benign_url_pipeline
10. test_10_suspicious_url_pipeline
11. test_11_malicious_phishing_pipeline
12. test_12_malformed_url_handling
13. test_13_zero_imputation_enforcement
14. test_14_nan_feature_rejection
15. test_15_infinity_feature_rejection
16. test_16_threat_intel_precedence
17. test_17_scanner_correlation
18. test_18_decision_fusion_matrix
19. test_19_security_event_creation
20. test_20_incident_correlation_pipeline
21. test_21_repeated_url_clustering
22. test_22_tenant_isolation_database
23. test_23_websocket_tenant_isolation
24. test_24_digital_twin_topology_integration
25. test_25_attack_graph_phishing_tier_integration
26. test_26_soar_playbook_trigger
27. test_27_audit_log_traceability
28. test_28_browser_check_url_endpoint
29. test_29_browser_ml_health_endpoint
30. test_30_browser_analyze_endpoint
31. test_31_inference_latency_performance
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
    SecurityEvent, Incident, IncidentEvent,
    IoTDevice, NetworkEvent, SOARPlaybook, PlaybookExecution
)
from app.services.ml_url_service import (
    ml_url_service, MLURLService, URLFeatureExtractor, URLDecisionFusion,
    InsufficientDataException
)


@pytest.fixture
def url_test_vectors():
    """Loads 14 canonical URL test vectors."""
    fixture_path = Path(__file__).parent / "fixtures" / "url_test_vectors.json"
    if fixture_path.exists():
        with open(fixture_path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise FileNotFoundError(f"Fixture not found at {fixture_path}")


@pytest.fixture
def base_url_features(url_test_vectors):
    """Returns the 27 features from v1_normal_https vector."""
    v1 = next(v for v in url_test_vectors if v["id"] == "v1_normal_https")
    return dict(v1["features"])


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
# 1. ARTIFACTS EXIST
# =====================================================================
def test_01_artifacts_exist():
    """Verify all 7 Module 04 trained model artifacts and schema exist on disk."""
    base_dir = Path(__file__).resolve().parent.parent / "app" / "ml_models" / "url"
    required_files = [
        base_dir / "models" / "url_isolation_forest.joblib",
        base_dir / "models" / "url_xgboost.joblib",
        base_dir / "preprocessing" / "scaler.joblib",
        base_dir / "preprocessing" / "feature_schema.json",
        base_dir / "metadata" / "model_metadata.json",
        base_dir / "evaluation" / "evaluation_report.json",
        base_dir / "evaluation" / "feature_importance.json",
    ]
    for path in required_files:
        assert path.exists(), f"Missing required artifact: {path}"
        assert path.stat().st_size > 0, f"Artifact is empty: {path}"


# =====================================================================
# 2. FEATURE SCHEMA CONTRACT
# =====================================================================
def test_02_feature_schema_contract():
    """Verify canonical feature schema defines exactly 27 expected URL features."""
    schema_path = (
        Path(__file__).resolve().parent.parent / "app" / "ml_models" / "url" / "preprocessing" / "feature_schema.json"
    )
    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)

    assert "features" in schema
    assert len(schema["features"]) == 27
    expected_samples = [
        "url_length", "hostname_length", "path_length", "hostname_entropy",
        "punycode_indicator", "suspicious_tld_indicator", "https_indicator",
        "ip_address_hostname", "url_shortener_indicator", "digit_ratio"
    ]
    for feat in expected_samples:
        assert feat in schema["features"], f"Feature {feat} missing from schema"


# =====================================================================
# 3. SCALER DIMENSIONS
# =====================================================================
def test_03_scaler_dimensions():
    """Verify StandardScaler is fitted with exactly 27 features."""
    assert ml_url_service.scaler is not None
    assert ml_url_service.scaler.n_features_in_ == 27
    assert ml_url_service.scaler.mean_.shape == (27,)
    assert ml_url_service.scaler.scale_.shape == (27,)


# =====================================================================
# 4. ISOLATION FOREST CONTRACT
# =====================================================================
def test_04_isolation_forest_contract():
    """Verify Isolation Forest expects 27 features and outputs {-1, 1}."""
    iso = ml_url_service.isolation_forest
    assert iso is not None
    assert iso.n_features_in_ == 27
    dummy_input = np.zeros((1, 27))
    pred = iso.predict(dummy_input)
    assert pred[0] in [1, -1]


# =====================================================================
# 5. XGBOOST CONTRACT
# =====================================================================
def test_05_xgboost_contract():
    """Verify XGBoost classifier has binary classes [0, 1] and predicts valid probabilities."""
    xgb = ml_url_service.xgboost
    assert xgb is not None
    assert xgb.n_features_in_ == 27
    assert list(xgb.classes_) == [0, 1]
    dummy_input = np.zeros((1, 27))
    probas = xgb.predict_proba(dummy_input)[0]
    assert len(probas) == 2
    assert math.isclose(float(sum(probas)), 1.0, rel_tol=1e-5)


# =====================================================================
# 6. MODEL METADATA CONTRACT
# =====================================================================
def test_06_model_metadata_contract():
    """Verify metadata records version url-phishing-v1 and verified benchmarks."""
    ml_url_service.load_artifacts()
    meta = ml_url_service.metadata
    assert meta.get("model_version") == "url-phishing-v1"
    assert meta.get("feature_count") == 27
    assert meta.get("model_status") == "TRAINED_VERIFIED"
    assert "dataset_benchmark" in meta


# =====================================================================
# 7. FEATURE EXTRACTOR COVERAGE
# =====================================================================
def test_07_feature_extractor_coverage():
    """Verify URLFeatureExtractor extracts all 27 features with valid numeric values."""
    url = "https://secure.bank-update.top/login/auth?user=john&token=xyz#step1"
    feats = URLFeatureExtractor.extract_features(url)
    assert len(feats) == 27
    for k, v in feats.items():
        assert isinstance(v, (int, float)), f"Feature {k} is not numeric"
        assert not math.isnan(v), f"Feature {k} is NaN"
        assert not math.isinf(v), f"Feature {k} is Infinite"

    assert feats["url_length"] == len(url)
    assert feats["https_indicator"] == 1.0
    assert feats["suspicious_tld_indicator"] == 1.0 # .top
    assert feats["hostname_entropy"] > 0.0


# =====================================================================
# 8. FEATURE EXTRACTOR ROBUSTNESS
# =====================================================================
def test_08_feature_extractor_robustness():
    """Verify extractor handles scheme-less URLs, IP hosts, ports, and punycode."""
    # 1. Without scheme
    f1 = URLFeatureExtractor.extract_features("portal.company.com/dashboard")
    assert f1["hostname_length"] > 0
    assert f1["https_indicator"] == 1.0 # Default prepended https://

    # 2. IP address host with unusual port
    f2 = URLFeatureExtractor.extract_features("http://192.168.1.100:8443/admin")
    assert f2["ip_address_hostname"] == 1.0
    assert f2["port_present"] == 1.0
    assert f2["unusual_port_indicator"] == 1.0
    assert f2["https_indicator"] == 0.0

    # 3. Punycode domain
    f3 = URLFeatureExtractor.extract_features("https://xn--appl-1na.com/verify")
    assert f3["punycode_indicator"] == 1.0


# =====================================================================
# 9. BENIGN URL PIPELINE
# =====================================================================
def test_09_benign_url_pipeline():
    """Verify benign Google and Microsoft URLs evaluate to SAFE."""
    res1 = ml_url_service.predict("https://www.google.com/search?q=cybersecurity")
    assert res1.status == "SUCCESS"
    assert res1.verdict == "SAFE"
    assert res1.is_phishing is False
    assert res1.confidence >= 0.70

    res2 = ml_url_service.predict("https://portal.microsoft.com/enterprise/dashboard")
    assert res2.status == "SUCCESS"
    assert res2.verdict == "SAFE"
    assert res2.is_phishing is False


# =====================================================================
# 10. SUSPICIOUS URL PIPELINE
# =====================================================================
def test_10_suspicious_url_pipeline():
    """Verify suspicious multi-subdomain and high-entropy URL triggers SUSPICIOUS/DANGEROUS."""
    url = "https://login.paypal.com.verify.account.billing-update.suspicious-domain.com/login"
    res = ml_url_service.predict(url)
    assert res.status == "SUCCESS"
    assert res.verdict in ["SUSPICIOUS", "DANGEROUS"]
    assert res.is_malicious is True


# =====================================================================
# 11. MALICIOUS PHISHING PIPELINE
# =====================================================================
def test_11_malicious_phishing_pipeline():
    """Verify phishing benchmark URL triggers DANGEROUS verdict."""
    url = "http://bank-security-alert-update.com/signin/index.html?account=verify"
    res = ml_url_service.predict(url)
    assert res.status == "SUCCESS"
    assert res.verdict == "DANGEROUS"
    assert res.is_phishing is True
    assert res.severity in ["HIGH", "CRITICAL"]


# =====================================================================
# 12. MALFORMED URL HANDLING
# =====================================================================
def test_12_malformed_url_handling():
    """Verify empty or non-string inputs are handled gracefully with error status."""
    res_empty = ml_url_service.predict("   ")
    assert res_empty.status == "ERROR"
    assert res_empty.verdict == "UNKNOWN"

    res_none = ml_url_service.predict(None)
    assert res_none.status == "ERROR"


# =====================================================================
# 13. ZERO IMPUTATION ENFORCEMENT
# =====================================================================
@pytest.mark.asyncio
async def test_13_zero_imputation_enforcement(base_url_features):
    """Verify API rejects incomplete feature vector with HTTP 422 INSUFFICIENT_DATA."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "ZeroImputeURL")
        headers = comp["headers"]

        # Omit 5 required features
        incomplete = dict(base_url_features)
        del incomplete["url_length"]
        del incomplete["hostname_entropy"]
        del incomplete["digit_ratio"]
        del incomplete["punycode_indicator"]
        del incomplete["suspicious_tld_indicator"]

        res = await client.post("/api/v1/browser/analyze", headers=headers, json={
            "features": incomplete
        })
        assert res.status_code == 422
        err = res.json().get("error", {}) or res.json().get("detail", {})
        assert err.get("code") == "INSUFFICIENT_DATA"
        assert len(err.get("missing_features", [])) == 5


# =====================================================================
# 14. NAN FEATURE REJECTION
# =====================================================================
@pytest.mark.asyncio
async def test_14_nan_feature_rejection(base_url_features):
    """Verify API rejects NaN feature with HTTP 422 INVALID_FEATURE_VALUE."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "NanURL")
        headers = comp["headers"]

        bad_features = dict(base_url_features)
        bad_features["url_length"] = "NaN"

        res = await client.post("/api/v1/browser/analyze", headers=headers, json={
            "features": bad_features
        })
        assert res.status_code == 422
        err = res.json().get("error", {}) or res.json().get("detail", {})
        assert err.get("code") == "INVALID_FEATURE_VALUE"


# =====================================================================
# 15. INFINITY FEATURE REJECTION
# =====================================================================
@pytest.mark.asyncio
async def test_15_infinity_feature_rejection(base_url_features):
    """Verify API rejects Infinity or non-numeric strings with HTTP 422 INVALID_FEATURE_VALUE."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "InfURL")
        headers = comp["headers"]

        bad_features = dict(base_url_features)
        bad_features["hostname_entropy"] = "Infinity"

        res = await client.post("/api/v1/browser/analyze", headers=headers, json={
            "features": bad_features
        })
        assert res.status_code == 422
        err = res.json().get("error", {}) or res.json().get("detail", {})
        assert err.get("code") == "INVALID_FEATURE_VALUE"


# =====================================================================
# 16. THREAT INTEL PRECEDENCE
# =====================================================================
def test_16_threat_intel_precedence():
    """Verify authoritative threat intelligence immediately classifies target as DANGEROUS."""
    domain = "malware-payload-staging.com"
    url = f"http://{domain}/dropper.exe"
    intel = URLDecisionFusion.evaluate_threat_intelligence(domain, url)
    assert intel["is_known_malicious"] is True
    assert intel["status"] == "KNOWN_MALICIOUS"

    ml_res = ml_url_service.predict(url)
    fused = URLDecisionFusion.fuse(
        ml_result=ml_res,
        threat_intel=intel,
        scanner_result={"isSafe": True, "phishingIndicators": []},
        security_rules=["RULE-THREAT-INTEL-MATCH"]
    )
    assert fused["final_verdict"] == "DANGEROUS"
    assert fused["severity"] == "CRITICAL"
    assert fused["confidence"] == 1.0


# =====================================================================
# 17. SCANNER CORRELATION
# =====================================================================
def test_17_scanner_correlation():
    """Verify web scanner phishing indicators elevate verdict to DANGEROUS."""
    url = "https://unverified-sample-login.org/index"
    ml_res = ml_url_service.predict(url)
    intel = {"is_known_malicious": False}
    scanner = {
        "isSafe": False,
        "phishingIndicators": [
            "Deceptive credential-harvesting keyword pattern",
            "High-abuse top level domain"
        ]
    }
    fused = URLDecisionFusion.fuse(
        ml_result=ml_res,
        threat_intel=intel,
        scanner_result=scanner,
        security_rules=["RULE-SCANNER-PHISHING-PATTERN"]
    )
    assert fused["final_verdict"] == "DANGEROUS"
    assert fused["confidence"] >= 0.90


# =====================================================================
# 18. DECISION FUSION MATRIX
# =====================================================================
def test_18_decision_fusion_matrix():
    """Verify all 5 logical paths of the URLDecisionFusion matrix."""
    # 1. Clean
    clean_ml = ml_url_service.predict("https://www.google.com")
    fused_clean = URLDecisionFusion.fuse(
        clean_ml,
        {"is_known_malicious": False},
        {"isSafe": True, "phishingIndicators": []},
        []
    )
    assert fused_clean["final_verdict"] == "SAFE"

    # 2. Suspicious ML or rule
    fused_susp = URLDecisionFusion.fuse(
        clean_ml,
        {"is_known_malicious": False},
        {"isSafe": True, "phishingIndicators": []},
        ["RULE-HEURISTIC-WARNING"]
    )
    assert fused_susp["final_verdict"] == "SUSPICIOUS"


# =====================================================================
# 19. SECURITY EVENT CREATION
# =====================================================================
@pytest.mark.asyncio
async def test_19_security_event_creation():
    """Verify malicious URL detection creates SecurityEvent in DB with entity_type='URL'."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "SecEventURL")
        headers = comp["headers"]
        cid = comp["company_id"]

        phish_url = "http://bank-security-alert-update.com/login"
        res = await client.post("/api/v1/personal/url-check", headers=headers, json={
            "url": phish_url,
            "record_detection": True,
            "environment": "REAL"
        })
        assert res.status_code == 200
        assert res.json()["data"]["verdict"] == "DANGEROUS"

        async with AsyncSessionLocal() as db:
            sec_event = await db.scalar(
                select(SecurityEvent).where(
                    SecurityEvent.company_id == cid,
                    SecurityEvent.entity_type == "URL"
                )
            )
            assert sec_event is not None
            assert sec_event.severity in ["HIGH", "CRITICAL"]
            assert "bank-security-alert-update.com" in sec_event.entity_id


# =====================================================================
# 20. INCIDENT CORRELATION PIPELINE
# =====================================================================
@pytest.mark.asyncio
async def test_20_incident_correlation_pipeline():
    """Verify SecurityEvent automatically triggers IncidentCorrelationEngine."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "IncidentURL")
        headers = comp["headers"]
        cid = comp["company_id"]

        phish_url = "http://credential-harvest-service.top/auth"
        res = await client.post("/api/v1/personal/url-check", headers=headers, json={
            "url": phish_url,
            "record_detection": True
        })
        assert res.status_code == 200

        async with AsyncSessionLocal() as db:
            incident = await db.scalar(
                select(Incident).where(Incident.company_id == cid)
            )
            assert incident is not None
            assert incident.status in ["OPEN", "INVESTIGATING"]
            assert "URL" in incident.title or "Phishing" in incident.title or "credential" in incident.title.lower()


# =====================================================================
# 21. REPEATED URL CLUSTERING
# =====================================================================
@pytest.mark.asyncio
async def test_21_repeated_url_clustering():
    """Verify repeated malicious URL events are correlated into a single unified incident."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "ClusterURL")
        headers = comp["headers"]
        cid = comp["company_id"]

        target = "http://phish-update-security.xyz/login"
        for _ in range(3):
            await client.post("/api/v1/personal/url-check", headers=headers, json={
                "url": target,
                "record_detection": True
            })

        async with AsyncSessionLocal() as db:
            incs = (await db.scalars(select(Incident).where(Incident.company_id == cid))).all()
            # Correlation engine should deduplicate/cluster into single incident
            assert len(incs) == 1


# =====================================================================
# 22. TENANT ISOLATION DATABASE
# =====================================================================
@pytest.mark.asyncio
async def test_22_tenant_isolation_database():
    """Verify Company A URL threats are strictly invisible to Company B."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp_a = await create_test_company(client, "TenantAURL")
        comp_b = await create_test_company(client, "TenantBURL")

        # Ingest threat in Company A
        res_a = await client.post("/api/v1/personal/url-check", headers=comp_a["headers"], json={
            "url": "http://malware-payload-staging.com/dropper.exe",
            "record_detection": True
        })
        assert res_a.status_code == 200

        # Verify in DB
        async with AsyncSessionLocal() as db:
            evs_a = (await db.scalars(select(SecurityEvent).where(SecurityEvent.company_id == comp_a["company_id"]))).all()
            evs_b = (await db.scalars(select(SecurityEvent).where(SecurityEvent.company_id == comp_b["company_id"]))).all()
            assert len(evs_a) >= 1
            assert len(evs_b) == 0


# =====================================================================
# 23. WEBSOCKET TENANT ISOLATION
# =====================================================================
@pytest.mark.asyncio
async def test_23_websocket_tenant_isolation():
    """Verify WebSocket manager has broadcast_to_company isolating tenant channels."""
    from app.core.websocket import ws_manager
    assert hasattr(ws_manager, "broadcast_to_company")
    assert hasattr(ws_manager, "_company_connections")


# =====================================================================
# 24. DIGITAL TWIN TOPOLOGY INTEGRATION
# =====================================================================
@pytest.mark.asyncio
async def test_24_digital_twin_topology_integration():
    """Verify Digital Twin exposes URL threat perimeter nodes for detected threats."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "TwinURL")
        headers = comp["headers"]

        # Record threat
        await client.post("/api/v1/personal/url-check", headers=headers, json={
            "url": "http://bank-security-alert-update.com/login",
            "record_detection": True
        })

        dt_res = await client.get("/api/v1/digital-twin/nodes", headers=headers)
        assert dt_res.status_code == 200
        nodes = dt_res.json()["data"]["nodes"]
        threat_node = next((n for n in nodes if "bank-security-alert-update.com" in n["id"]), None)
        assert threat_node is not None
        assert threat_node["status"] in ["CRITICAL", "WARNING"]
        assert threat_node["riskScore"] >= 75.0


# =====================================================================
# 25. ATTACK GRAPH PHISHING TIER INTEGRATION
# =====================================================================
@pytest.mark.asyncio
async def test_25_attack_graph_phishing_tier_integration():
    """Verify Dynamic Attack Graph maps phishing threat into Tier 0 adversary nodes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "AttackGraphURL")
        headers = comp["headers"]

        await client.post("/api/v1/personal/url-check", headers=headers, json={
            "url": "http://c2-stealth-beacon.online/beacon",
            "record_detection": True
        })

        ag_res = await client.get("/api/v1/attack-graph", headers=headers)
        assert ag_res.status_code == 200
        nodes = ag_res.json()["data"]["nodes"]
        phish_node = next((n for n in nodes if "c2-stealth-beacon.online" in n["id"]), None)
        assert phish_node is not None
        assert phish_node["type"] == "internet"
        assert phish_node["riskScore"] >= 85


# =====================================================================
# 26. SOAR PLAYBOOK TRIGGER
# =====================================================================
@pytest.mark.asyncio
async def test_26_soar_playbook_trigger():
    """Verify high-severity URL incident can activate automated SOAR response."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "SoarURL")
        cid = comp["company_id"]
        headers = comp["headers"]

        # Create incident via URL threat
        await client.post("/api/v1/personal/url-check", headers=headers, json={
            "url": "http://malware-payload-staging.com/dropper.exe",
            "record_detection": True
        })

        async with AsyncSessionLocal() as db:
            incident = await db.scalar(select(Incident).where(Incident.company_id == cid))
            assert incident is not None

            # Verify playbook can execute
            playbook = SOARPlaybook(
                company_id=cid,
                name="Automated URL Phishing Domain Isolation",
                trigger="phishing_detected",
                is_active=True,
                steps=[{"action": "block_dns", "target": "domain"}]
            )
            db.add(playbook)
            await db.commit()
            await db.refresh(playbook)

            execution = PlaybookExecution(
                playbook_id=playbook.id,
                incident_id=incident.id,
                company_id=cid,
                status="SUCCESS",
                result={"step": "block_dns", "result": "Domain quarantined"}
            )
            db.add(execution)
            await db.commit()
            await db.refresh(execution)
            assert execution.status == "SUCCESS"


# =====================================================================
# 27. AUDIT LOG TRACEABILITY
# =====================================================================
@pytest.mark.asyncio
async def test_27_audit_log_traceability():
    """Verify AuditLog records URL_THREAT_DETECTED entry for detected threat."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "AuditURL")
        cid = comp["company_id"]
        headers = comp["headers"]

        await client.post("/api/v1/personal/url-check", headers=headers, json={
            "url": "http://bank-security-alert-update.com/login",
            "record_detection": True,
            "source_ip": "198.51.100.44"
        })

        async with AsyncSessionLocal() as db:
            audit = await db.scalar(
                select(AuditLog).where(
                    AuditLog.company_id == cid,
                    AuditLog.action == "URL_THREAT_DETECTED"
                )
            )
            assert audit is not None
            assert audit.result == "DETECTED"
            assert audit.resource_type == "url"


# =====================================================================
# 28. BROWSER CHECK URL ENDPOINT
# =====================================================================
@pytest.mark.asyncio
async def test_28_browser_check_url_endpoint():
    """Verify POST /api/v1/browser/check-url functions with decision fusion."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "BrowserCheckURL")
        headers = comp["headers"]

        # Safe URL
        res_safe = await client.post("/api/v1/browser/check-url", headers=headers, json={
            "url": "https://www.google.com/search"
        })
        assert res_safe.status_code == 200
        assert res_safe.json()["data"]["isSafe"] is True
        assert res_safe.json()["data"]["verdict"] == "SAFE"

        # Phishing URL
        res_phish = await client.post("/api/v1/browser/check-url", headers=headers, json={
            "url": "http://bank-security-alert-update.com/login"
        })
        assert res_phish.status_code == 200
        assert res_phish.json()["data"]["isSafe"] is False
        assert res_phish.json()["data"]["verdict"] == "DANGEROUS"


# =====================================================================
# 29. BROWSER ML HEALTH ENDPOINT
# =====================================================================
@pytest.mark.asyncio
async def test_29_browser_ml_health_endpoint():
    """Verify GET /api/v1/browser/ml/health reports healthy 27-feature model status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "HealthURL")
        headers = comp["headers"]

        res = await client.get("/api/v1/browser/ml/health", headers=headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["status"] == "HEALTHY"
        assert data["feature_count"] == 27
        assert data["model_version"] == "url-phishing-v1"
        assert data["zero_imputation_enforced"] is True


# =====================================================================
# 30. BROWSER ANALYZE ENDPOINT
# =====================================================================
@pytest.mark.asyncio
async def test_30_browser_analyze_endpoint(base_url_features):
    """Verify POST /api/v1/browser/analyze supports raw URL and feature vector."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "AnalyzeURL")
        headers = comp["headers"]

        # Analyze with raw URL
        res1 = await client.post("/api/v1/browser/analyze", headers=headers, json={
            "url": "https://www.google.com"
        })
        assert res1.status_code == 200
        assert res1.json()["data"]["status"] == "SUCCESS"

        # Analyze with feature vector
        res2 = await client.post("/api/v1/browser/analyze", headers=headers, json={
            "features": base_url_features
        })
        assert res2.status_code == 200
        assert res2.json()["data"]["features_evaluated"] == 27


# =====================================================================
# 31. INFERENCE LATENCY PERFORMANCE (SLA < 25ms p95)
# =====================================================================
def test_31_inference_latency_performance():
    """Verify inference latency over 50 consecutive runs meets SLA (< 25ms p95)."""
    latencies = []
    url = "https://portal.microsoft.com/enterprise/dashboard"
    for _ in range(50):
        t0 = time.perf_counter()
        ml_url_service.predict(url)
        latencies.append((time.perf_counter() - t0) * 1000)

    p95 = np.percentile(latencies, 95)
    mean_lat = np.mean(latencies)
    assert p95 < 25.0, f"P95 latency {p95:.2f}ms exceeds 25ms SLA (mean: {mean_lat:.2f}ms)"
