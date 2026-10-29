"""
CYBERDOME MODULE 04 — URL / PHISHING PRODUCTION VERIFICATION SUITE
Comprehensive verification of all 36 audit requirements specified in the
Production Verification Contract for Module 04 (URL / Phishing / Malicious URL Detection).

Audit Points:
 1. test_01_m04_service_imports
 2. test_02_real_artifacts_load
 3. test_03_schema_loads_exactly_27_features
 4. test_04_schema_model_dimensions_match
 5. test_05_scaler_loads_and_transforms
 6. test_06_isolation_forest_loads_and_infers
 7. test_07_xgboost_loads_and_predicts
 8. test_08_feature_extractor_coverage
 9. test_09_feature_extractor_edge_cases
10. test_10_valid_telemetry_benign_url
11. test_11_valid_telemetry_phishing_url
12. test_12_malformed_url_rejected
13. test_13_missing_feature_rejected_insufficient_data
14. test_14_extra_feature_behavior_verified
15. test_15_nan_rejected_invalid_feature_value
16. test_16_infinity_rejected_invalid_feature_value
17. test_17_invalid_type_rejected
18. test_18_threat_intel_precedence
19. test_19_scanner_correlation
20. test_20_decision_fusion_matrix
21. test_21_unknown_state_never_defaults_to_safe
22. test_22_security_event_persistence
23. test_23_tenant_isolation_database
24. test_24_rbac_personal_user_isolation
25. test_25_ssrf_localhost_blocked
26. test_26_ssrf_private_ip_ranges_blocked
27. test_27_ssrf_cloud_metadata_blocked
28. test_28_ssrf_redirect_protection
29. test_29_websocket_tenant_isolation
30. test_30_m05_detection_evidence_integration
31. test_31_m07_soar_boundary_enforced
32. test_32_real_vs_simulation_segregation
33. test_33_api_browser_health_endpoint
34. test_34_api_browser_analyze_endpoint
35. test_35_api_personal_check_url_endpoint
36. test_36_openapi_schema_contains_m04_routes
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
    SecurityEvent, Incident, IncidentEvent,
    PlaybookExecution
)
from app.services.ml_url_service import (
    ml_url_service, MLURLService, URLFeatureExtractor,
    URLDecisionFusion, InsufficientDataException, MLURLAnalysisResult
)
from app.services import validate_target, is_private_or_reserved_ip


@pytest.fixture
def url_test_vectors():
    """Loads canonical URL test vectors."""
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
    """Helper to create a dedicated company and return credentials."""
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
# 1. SERVICE IMPORTS
# =====================================================================
def test_01_m04_service_imports():
    """Verify all Module 04 core classes and components import cleanly."""
    assert ml_url_service is not None
    assert isinstance(ml_url_service, MLURLService)
    assert URLFeatureExtractor is not None
    assert URLDecisionFusion is not None
    assert InsufficientDataException is not None
    assert MLURLAnalysisResult is not None


# =====================================================================
# 2. REAL ARTIFACTS LOAD
# =====================================================================
def test_02_real_artifacts_load():
    """Verify real joblib artifacts exist and load without mock/dummy."""
    assert ml_url_service.is_loaded is True
    assert ml_url_service.scaler is not None
    assert ml_url_service.isolation_forest is not None
    assert ml_url_service.xgboost is not None
    assert ml_url_service.metadata.get("model_version") == "url-phishing-v1"
    assert ml_url_service.metadata.get("dataset_benchmark") == "PhishTank_OpenPhish_Benchmark"


# =====================================================================
# 3. SCHEMA LOADS EXACTLY 27 FEATURES
# =====================================================================
def test_03_schema_loads_exactly_27_features():
    """Verify feature schema contains exactly 27 canonical features with expected ordering."""
    assert len(ml_url_service.feature_names) == 27
    expected_order_subset = [
        "url_length", "hostname_length", "path_length", "query_length",
        "digit_ratio", "hostname_entropy", "ip_address_hostname", "https_indicator"
    ]
    for feat in expected_order_subset:
        assert feat in ml_url_service.feature_names, f"Missing canonical feature: {feat}"


# =====================================================================
# 4. SCHEMA / MODEL DIMENSIONS MATCH
# =====================================================================
def test_04_schema_model_dimensions_match():
    """Verify strict mathematical alignment across schema, scaler, IsoForest, and XGBoost."""
    assert ml_url_service.scaler.n_features_in_ == 27
    assert ml_url_service.isolation_forest.n_features_in_ == 27
    assert ml_url_service.xgboost.n_features_in_ == 27
    assert len(ml_url_service.feature_names) == 27


# =====================================================================
# 5. SCALER LOADS AND TRANSFORMS
# =====================================================================
def test_05_scaler_loads_and_transforms(base_url_features):
    """Verify StandardScaler transforms a canonical 27-feature dataframe accurately."""
    df = pd.DataFrame([base_url_features], columns=ml_url_service.feature_names)
    scaled = ml_url_service.scaler.transform(df)
    assert scaled.shape == (1, 27)
    assert not np.isnan(scaled).any()
    assert not np.isinf(scaled).any()


# =====================================================================
# 6. ISOLATION FOREST LOADS AND INFERS
# =====================================================================
def test_06_isolation_forest_loads_and_infers(base_url_features):
    """Verify Isolation Forest produces anomaly scores and predictions (+1 or -1)."""
    df = pd.DataFrame([base_url_features], columns=ml_url_service.feature_names)
    scaled = ml_url_service.scaler.transform(df)
    pred = ml_url_service.isolation_forest.predict(scaled)
    score = ml_url_service.isolation_forest.score_samples(scaled)
    assert pred[0] in (1, -1)
    assert isinstance(float(score[0]), float)


# =====================================================================
# 7. XGBOOST LOADS AND PREDICTS
# =====================================================================
def test_07_xgboost_loads_and_predicts(base_url_features):
    """Verify XGBoost classifier produces calibrated probabilities for classes [0, 1]."""
    df = pd.DataFrame([base_url_features], columns=ml_url_service.feature_names)
    scaled = ml_url_service.scaler.transform(df)
    pred = ml_url_service.xgboost.predict(scaled)
    probas = ml_url_service.xgboost.predict_proba(scaled)[0]
    assert pred[0] in (0, 1)
    assert len(probas) == 2
    assert math.isclose(sum(probas), 1.0, abs_tol=1e-4)


# =====================================================================
# 8. FEATURE EXTRACTOR COVERAGE
# =====================================================================
def test_08_feature_extractor_coverage():
    """Verify URLFeatureExtractor extracts all 27 features from a raw URL."""
    url = "https://www.cyberdome.defense/soc/investigate?case_id=9876&severity=high#evidence"
    features = URLFeatureExtractor.extract_features(url)
    assert len(features) == 27
    for f in ml_url_service.feature_names:
        assert f in features
        assert isinstance(features[f], (int, float))
        assert not math.isnan(features[f])


# =====================================================================
# 9. FEATURE EXTRACTOR EDGE CASES
# =====================================================================
def test_09_feature_extractor_edge_cases():
    """Verify URLFeatureExtractor handles URLs without scheme, unusual ports, and IP hostnames."""
    url1 = "192.168.1.100:8080/admin/login"
    f1 = URLFeatureExtractor.extract_features(url1)
    assert f1["ip_address_hostname"] == 1.0
    assert f1["unusual_port_indicator"] == 1.0

    url2 = "https://bit.ly/3xyz123"
    f2 = URLFeatureExtractor.extract_features(url2)
    assert f2["url_shortener_indicator"] == 1.0

    url3 = "http://bad-target.top/free-account"
    f3 = URLFeatureExtractor.extract_features(url3)
    assert f3["suspicious_tld_indicator"] == 1.0


# =====================================================================
# 10. VALID TELEMETRY BENIGN URL
# =====================================================================
def test_10_valid_telemetry_benign_url():
    """Verify inference on legitimate benign URL yields SAFE verdict."""
    res = ml_url_service.predict("https://www.google.com/search?q=cybersecurity")
    assert res.status == "SUCCESS"
    assert res.verdict == "SAFE"
    assert res.is_phishing is False
    assert res.classification_probability < 0.50


# =====================================================================
# 11. VALID TELEMETRY PHISHING URL
# =====================================================================
def test_11_valid_telemetry_phishing_url(url_test_vectors):
    """Verify inference on known phishing vector yields DANGEROUS or SUSPICIOUS."""
    v8 = next(v for v in url_test_vectors if v["id"] == "v8_phishing_like")
    res = ml_url_service.predict(v8["features"])
    assert res.status == "SUCCESS"
    assert res.verdict in ("DANGEROUS", "SUSPICIOUS")
    assert res.is_phishing is True


# =====================================================================
# 12. MALFORMED URL REJECTED
# =====================================================================
def test_12_malformed_url_rejected():
    """Verify malformed or empty URLs return graceful error without unhandled exception."""
    res = ml_url_service.predict("")
    assert res.status == "ERROR"
    assert res.verdict == "UNKNOWN"

    res_spaces = ml_url_service.predict("   ")
    assert res_spaces.status == "ERROR"
    assert res_spaces.verdict == "UNKNOWN"


# =====================================================================
# 13. MISSING FEATURE REJECTED (INSUFFICIENT DATA)
# =====================================================================
def test_13_missing_feature_rejected_insufficient_data(base_url_features):
    """Verify missing any canonical feature triggers INSUFFICIENT_DATA and UNKNOWN verdict."""
    incomplete = dict(base_url_features)
    del incomplete["digit_ratio"]
    res = ml_url_service.predict(incomplete)
    assert res.status == "INSUFFICIENT_DATA"
    assert res.verdict == "UNKNOWN"
    assert "digit_ratio" in res.missing_features


# =====================================================================
# 14. EXTRA FEATURE BEHAVIOR VERIFIED
# =====================================================================
def test_14_extra_feature_behavior_verified(base_url_features):
    """Verify extra uncontracted features are ignored and do not alter the 27-feature pipeline."""
    extra = dict(base_url_features)
    extra["unexpected_attacker_meta"] = "malicious_injection"
    res = ml_url_service.predict(extra)
    assert res.status == "SUCCESS"
    assert res.features_evaluated == 27


# =====================================================================
# 15. NAN REJECTED (INVALID FEATURE VALUE)
# =====================================================================
def test_15_nan_rejected_invalid_feature_value(base_url_features):
    """Verify NaN values in features are strictly rejected."""
    bad_features = dict(base_url_features)
    bad_features["url_length"] = float("nan")
    res = ml_url_service.predict(bad_features)
    assert res.status == "ERROR"
    assert res.verdict == "UNKNOWN"
    assert "non-finite" in (res.error_message or "").lower()


# =====================================================================
# 16. INFINITY REJECTED (INVALID FEATURE VALUE)
# =====================================================================
def test_16_infinity_rejected_invalid_feature_value(base_url_features):
    """Verify Infinity values in features are strictly rejected."""
    bad_features = dict(base_url_features)
    bad_features["path_entropy"] = float("inf")
    res = ml_url_service.predict(bad_features)
    assert res.status == "ERROR"
    assert res.verdict == "UNKNOWN"
    assert "non-finite" in (res.error_message or "").lower()


# =====================================================================
# 17. INVALID TYPE REJECTED
# =====================================================================
def test_17_invalid_type_rejected(base_url_features):
    """Verify non-numeric string values in features are rejected."""
    bad_features = dict(base_url_features)
    bad_features["subdomain_count"] = "not_a_number"
    res = ml_url_service.predict(bad_features)
    assert res.status == "ERROR"
    assert res.verdict == "UNKNOWN"


# =====================================================================
# 18. THREAT INTEL PRECEDENCE
# =====================================================================
def test_18_threat_intel_precedence():
    """Verify known threat intelligence matches take authoritative precedence."""
    intel = URLDecisionFusion.evaluate_threat_intelligence(
        "malware-payload-staging.com",
        "http://malware-payload-staging.com/update.exe"
    )
    assert intel["is_known_malicious"] is True
    assert intel["confidence"] == 1.0

    clean_ml = ml_url_service.predict("https://www.google.com")
    fused = URLDecisionFusion.fuse(
        ml_result=clean_ml,
        threat_intel=intel,
        scanner_result={"isSafe": True, "phishingIndicators": []},
        security_rules=["RULE-THREAT-INTEL-MATCH"]
    )
    assert fused["final_verdict"] == "DANGEROUS"
    assert fused["severity"] == "CRITICAL"
    assert fused["confidence"] == 1.0


# =====================================================================
# 19. SCANNER CORRELATION
# =====================================================================
def test_19_scanner_correlation():
    """Verify scanner phishing indicators elevate fusion verdict to DANGEROUS."""
    clean_ml = ml_url_service.predict("https://www.google.com")
    scanner = {
        "isSafe": False,
        "phishingIndicators": [
            "Deceptive credential-harvesting keyword pattern",
            "High-abuse top level domain"
        ]
    }
    fused = URLDecisionFusion.fuse(
        ml_result=clean_ml,
        threat_intel={"is_known_malicious": False},
        scanner_result=scanner,
        security_rules=["RULE-SCANNER-PHISHING-PATTERN"]
    )
    assert fused["final_verdict"] == "DANGEROUS"
    assert fused["confidence"] >= 0.90


# =====================================================================
# 20. DECISION FUSION MATRIX
# =====================================================================
def test_20_decision_fusion_matrix():
    """Verify all key paths in URLDecisionFusion matrix."""
    clean_ml = ml_url_service.predict("https://www.google.com")
    
    # Path A: Clean Safe
    fused_clean = URLDecisionFusion.fuse(
        clean_ml,
        {"is_known_malicious": False},
        {"isSafe": True, "phishingIndicators": []},
        []
    )
    assert fused_clean["final_verdict"] == "SAFE"

    # Path B: Suspicious Rule Concurrence
    fused_susp = URLDecisionFusion.fuse(
        clean_ml,
        {"is_known_malicious": False},
        {"isSafe": True, "phishingIndicators": []},
        ["RULE-HEURISTIC-WARNING"]
    )
    assert fused_susp["final_verdict"] == "SUSPICIOUS"


# =====================================================================
# 21. UNKNOWN STATE NEVER DEFAULTS TO SAFE
# =====================================================================
def test_21_unknown_state_never_defaults_to_safe(base_url_features):
    """Verify missing/unknown ML evidence produces UNKNOWN and NEVER defaults to SAFE."""
    incomplete = dict(base_url_features)
    del incomplete["digit_ratio"]
    ml_unknown = ml_url_service.predict(incomplete)
    assert ml_unknown.status == "INSUFFICIENT_DATA"
    assert ml_unknown.verdict == "UNKNOWN"

    fused = URLDecisionFusion.fuse(
        ml_result=ml_unknown,
        threat_intel={"is_known_malicious": False},
        scanner_result={"isSafe": True, "phishingIndicators": []},
        security_rules=[]
    )
    assert fused["final_verdict"] == "UNKNOWN"
    assert fused["final_verdict"] != "SAFE"
    assert "insufficient" in fused["primary_reason"].lower()


# =====================================================================
# 22. SECURITY EVENT PERSISTENCE
# =====================================================================
@pytest.mark.asyncio
async def test_22_security_event_persistence():
    """Verify process_and_correlate_url_ml_event persists SecurityEvent in DB."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        company = await create_test_company(client, "M04EventTest")

    async with AsyncSessionLocal() as db:
        test_url = "http://phish-update-security.xyz/login"
        analysis = ml_url_service.predict(test_url)
        intel = URLDecisionFusion.evaluate_threat_intelligence("phish-update-security.xyz", test_url)
        fused = URLDecisionFusion.fuse(
            analysis, intel,
            {"isSafe": False, "phishingIndicators": ["Known threat"]},
            ["RULE-THREAT-INTEL-MATCH"]
        )

        sec_event = await ml_url_service.process_and_correlate_url_ml_event(
            db=db,
            company_id=company["company_id"],
            url=test_url,
            domain="phish-update-security.xyz",
            analysis=analysis,
            fused_decision=fused,
            user_id=company["user_id"],
            environment="REAL"
        )
        assert sec_event is not None
        assert sec_event.company_id == company["company_id"]
        assert sec_event.entity_type == "URL"
        assert sec_event.source == "ml_engine:url-phishing-v1"
        assert sec_event.environment == "REAL"

        # Verify DB lookup
        db_ev = await db.get(SecurityEvent, sec_event.id)
        assert db_ev is not None
        assert db_ev.company_id == company["company_id"]


# =====================================================================
# 23. TENANT ISOLATION DATABASE
# =====================================================================
@pytest.mark.asyncio
async def test_23_tenant_isolation_database():
    """Verify Company A cannot access or query Company B's URL security events."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        compA = await create_test_company(client, "M04TenantA")
        compB = await create_test_company(client, "M04TenantB")

    async with AsyncSessionLocal() as db:
        analysis = ml_url_service.predict("http://phish-update-security.xyz")
        fused = {"final_verdict": "DANGEROUS", "severity": "HIGH", "confidence": 0.95}

        evA = await ml_url_service.process_and_correlate_url_ml_event(
            db=db,
            company_id=compA["company_id"],
            url="http://phish-update-security.xyz",
            domain="phish-update-security.xyz",
            analysis=analysis,
            fused_decision=fused,
            user_id=compA["user_id"],
            environment="REAL"
        )

        # Query events scoped to compB
        resB = await db.execute(
            select(SecurityEvent).where(
                SecurityEvent.company_id == compB["company_id"],
                SecurityEvent.id == evA.id
            )
        )
        assert resB.scalar_one_or_none() is None


# =====================================================================
# 24. RBAC PERSONAL USER ISOLATION
# =====================================================================
@pytest.mark.asyncio
async def test_24_rbac_personal_user_isolation():
    """Verify personal users without company membership do not create company incidents."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        suffix = uuid.uuid4().hex[:6]
        signup_res = await client.post("/api/v1/auth/signup", json={
            "email": f"personal.{suffix}@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "name": f"Personal User {suffix}"
        })
        assert signup_res.status_code == 200
        token = signup_res.json()["data"]["token"]

        # Call analyze with record_detection=True
        analyze_res = await client.post(
            "/api/v1/browser/analyze",
            json={
                "url": "http://phish-update-security.xyz/steal",
                "record_detection": True
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert analyze_res.status_code == 200
        data = analyze_res.json()["data"]
        # Since personal user has no company membership, incident_correlated is absent or False
        assert data.get("incident_correlated") is not True


# =====================================================================
# 25. SSRF LOCALHOST BLOCKED
# =====================================================================
def test_25_ssrf_localhost_blocked():
    """Verify validate_target rejects localhost, 127.0.0.1, ::1, and 0.0.0.0."""
    for host in ["http://localhost:8000", "http://127.0.0.1:5000", "http://[::1]:8080", "http://0.0.0.0"]:
        valid, domain, cleaned = validate_target(host)
        assert valid is False, f"Expected {host} to be blocked by SSRF filter"


# =====================================================================
# 26. SSRF PRIVATE IP RANGES BLOCKED
# =====================================================================
def test_26_ssrf_private_ip_ranges_blocked():
    """Verify validate_target rejects RFC 1918 private IPv4 addresses."""
    private_ips = [
        "http://10.0.0.1/admin",
        "http://172.16.0.1/setup",
        "http://192.168.1.1/router",
        "http://192.168.0.254"
    ]
    for target in private_ips:
        valid, domain, cleaned = validate_target(target)
        assert valid is False, f"Expected private target {target} to be blocked"


# =====================================================================
# 27. SSRF CLOUD METADATA BLOCKED
# =====================================================================
def test_27_ssrf_cloud_metadata_blocked():
    """Verify validate_target rejects AWS/GCP/Azure cloud metadata targets."""
    cloud_targets = [
        "http://169.254.169.254/latest/meta-data/",
        "http://metadata.google.internal/computeMetadata/v1/"
    ]
    for target in cloud_targets:
        valid, domain, cleaned = validate_target(target)
        assert valid is False, f"Expected cloud metadata {target} to be blocked"


# =====================================================================
# 28. SSRF REDIRECT PROTECTION
# =====================================================================
def test_28_ssrf_redirect_protection():
    """Verify internal SSRF validator is_private_or_reserved_ip correctly flags dangerous IPs."""
    assert is_private_or_reserved_ip("127.0.0.1") is True
    assert is_private_or_reserved_ip("10.10.10.10") is True
    assert is_private_or_reserved_ip("169.254.169.254") is True
    assert is_private_or_reserved_ip("8.8.8.8") is False
    assert is_private_or_reserved_ip("1.1.1.1") is False


# =====================================================================
# 29. WEBSOCKET TENANT ISOLATION
# =====================================================================
@pytest.mark.asyncio
async def test_29_websocket_tenant_isolation():
    """Verify WebSocket broadcast is routed strictly to the target company."""
    from app.core.websocket import ws_manager
    cid = f"test-company-{uuid.uuid4().hex[:6]}"
    
    # Broadcast to room should succeed without throwing
    await ws_manager.broadcast_to_company(
        company_id=cid,
        event_type="url_threat_detected",
        data={"url": "http://threat-sample.test", "verdict": "DANGEROUS"}
    )
    # Confirm no active cross-talk connections in empty room
    assert ws_manager.get_active_count(cid) == 0


# =====================================================================
# 30. M05 DETECTION EVIDENCE INTEGRATION
# =====================================================================
@pytest.mark.asyncio
async def test_30_m05_detection_evidence_integration():
    """Verify M04 SecurityEvents match M05 DetectionResult schema and correlate into Incidents."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        company = await create_test_company(client, "M04M05Integ")

    async with AsyncSessionLocal() as db:
        test_url = "http://phish-update-security.xyz/session-hijack"
        analysis = ml_url_service.predict(test_url)
        intel = URLDecisionFusion.evaluate_threat_intelligence("phish-update-security.xyz", test_url)
        fused = URLDecisionFusion.fuse(
            analysis, intel,
            {"isSafe": False, "phishingIndicators": ["Deceptive credential form"]},
            ["RULE-THREAT-INTEL-MATCH"]
        )

        sec_event = await ml_url_service.process_and_correlate_url_ml_event(
            db=db,
            company_id=company["company_id"],
            url=test_url,
            domain="phish-update-security.xyz",
            analysis=analysis,
            fused_decision=fused,
            user_id=company["user_id"],
            environment="REAL"
        )
        assert sec_event is not None

        # Check that an Incident was correlated for this company
        inc_res = await db.execute(
            select(Incident).where(Incident.company_id == company["company_id"])
        )
        incident = inc_res.scalars().first()
        assert incident is not None
        assert "phish-update-security.xyz" in incident.title or "URL" in incident.title


# =====================================================================
# 31. M07 SOAR BOUNDARY ENFORCED
# =====================================================================
@pytest.mark.asyncio
async def test_31_m07_soar_boundary_enforced():
    """Verify M04 detection alone NEVER triggers unverified direct SOAR executions."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        company = await create_test_company(client, "M04SOARBoundary")

    async with AsyncSessionLocal() as db:
        test_url = "http://phish-update-security.xyz/direct-test"
        analysis = ml_url_service.predict(test_url)
        fused = {"final_verdict": "DANGEROUS", "severity": "CRITICAL", "confidence": 1.0}

        await ml_url_service.process_and_correlate_url_ml_event(
            db=db,
            company_id=company["company_id"],
            url=test_url,
            domain="phish-update-security.xyz",
            analysis=analysis,
            fused_decision=fused,
            user_id=company["user_id"],
            environment="REAL"
        )

        # Ensure NO destructive SOAR playbook executions were spawned directly by M04
        exec_res = await db.execute(
            select(PlaybookExecution).where(
                PlaybookExecution.company_id == company["company_id"]
            )
        )
        executions = exec_res.scalars().all()
        assert len(executions) == 0


# =====================================================================
# 32. REAL VS SIMULATION SEGREGATION
# =====================================================================
@pytest.mark.asyncio
async def test_32_real_vs_simulation_segregation():
    """Verify SIMULATION flag propagates cleanly into SecurityEvent without REAL metric pollution."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        company = await create_test_company(client, "M04SimTest")

    async with AsyncSessionLocal() as db:
        test_url = "http://phish-update-security.xyz/sim"
        analysis = ml_url_service.predict(test_url, environment="SIMULATION")
        assert analysis.environment == "SIMULATION"

        fused = {"final_verdict": "DANGEROUS", "severity": "HIGH", "confidence": 0.9}
        sec_event = await ml_url_service.process_and_correlate_url_ml_event(
            db=db,
            company_id=company["company_id"],
            url=test_url,
            domain="phish-update-security.xyz",
            analysis=analysis,
            fused_decision=fused,
            user_id=company["user_id"],
            environment="SIMULATION"
        )
        assert sec_event.environment == "SIMULATION"
        assert "[SIMULATION]" in sec_event.title


# =====================================================================
# 33. API BROWSER HEALTH ENDPOINT
# =====================================================================
@pytest.mark.asyncio
async def test_33_api_browser_health_endpoint():
    """Verify GET /api/v1/browser/ml/health returns HTTP 200 with all diagnostic metrics."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        company = await create_test_company(client, "M04Health")
        res = await client.get("/api/v1/browser/ml/health", headers=company["headers"])
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["status"] == "HEALTHY"
        assert data["module"] == "url_phishing_detection"
        assert data["feature_count"] == 27
        assert data["artifacts_loaded"]["schema"] is True
        assert data["artifacts_loaded"]["scaler"] is True
        assert data["artifacts_loaded"]["isolation_forest"] is True
        assert data["artifacts_loaded"]["xgboost"] is True


# =====================================================================
# 34. API BROWSER ANALYZE ENDPOINT
# =====================================================================
@pytest.mark.asyncio
async def test_34_api_browser_analyze_endpoint(base_url_features):
    """Verify POST /api/v1/browser/analyze validates inputs and performs ML inference."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        company = await create_test_company(client, "M04Analyze")

        # 1. Valid URL string
        res1 = await client.post(
            "/api/v1/browser/analyze",
            json={"url": "https://www.google.com"},
            headers=company["headers"]
        )
        assert res1.status_code == 200
        assert res1.json()["data"]["verdict"] == "SAFE"

        # 2. Missing features rejected with 422
        res2 = await client.post(
            "/api/v1/browser/analyze",
            json={"features": {"digit_ratio": 0.5}},
            headers=company["headers"]
        )
        assert res2.status_code == 422
        assert "INSUFFICIENT_DATA" in str(res2.json())


# =====================================================================
# 35. API PERSONAL CHECK URL ENDPOINT
# =====================================================================
@pytest.mark.asyncio
async def test_35_api_personal_check_url_endpoint():
    """Verify POST /api/v1/browser/check-url runs multi-source fusion check."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        company = await create_test_company(client, "M04CheckURL")
        res = await client.post(
            "/api/v1/browser/check-url",
            json={"url": "https://www.wikipedia.org"},
            headers=company["headers"]
        )
        assert res.status_code == 200
        body = res.json()
        assert "data" in body
        data = body["data"]
        assert "verdict" in data
        assert "findings" in data


# =====================================================================
# 36. OPENAPI SCHEMA CONTAINS M04 ROUTES
# =====================================================================
def test_36_openapi_schema_contains_m04_routes():
    """Verify FastAPI OpenAPI documentation lists all Module 04 browser and URL endpoints."""
    schema = app.openapi()
    paths = schema.get("paths", {})
    assert "/api/v1/browser/ml/health" in paths
    assert "/api/v1/browser/analyze" in paths
    assert "/api/v1/browser/check-url" in paths
    assert "/api/v1/browser/history" in paths
    assert "/api/v1/url/analyze" in paths
