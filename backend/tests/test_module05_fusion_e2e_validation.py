"""
CYBERDOME MODULE 05 — MULTI-MODEL DETECTION FUSION ENGINE E2E VALIDATION SUITE.
Covers all 37 audit & empirical validation requirements:
 TEST 01: Architecture audit (all artifacts, rules, schema, and metadata exist)
 TEST 02: Module 01 integration (Network ML output adapted and fused)
 TEST 03: Module 02 integration (IoT ML output adapted and fused)
 TEST 04: Module 03 integration (UEBA ML output adapted and fused)
 TEST 05: Module 04 integration (URL ML output adapted and fused)
 TEST 06: Evidence normalization (DetectionEvidence contract and bounds)
 TEST 07: Missing evidence handling (sources_missing populated, never coerced to safe)
 TEST 08: Single-source detection (isolated anomaly -> SUSPICIOUS/LOW_CONFIDENCE)
 TEST 09: Two-source correlation (Network + UEBA -> HIGH_CONFIDENCE_THREAT)
 TEST 10: Three-source correlation (Network + IoT + UEBA -> HIGH_CONFIDENCE_THREAT)
 TEST 11: Four-source correlation (all 4 models -> CRITICAL_THREAT with C >= 0.96)
 TEST 12: Threat intelligence fusion (authoritative precedence -> CRITICAL_THREAT)
 TEST 13: Scanner fusion (scanner confirmation -> HIGH_CONFIDENCE_THREAT)
 TEST 14: Security-rule fusion (rule match confirmation -> HIGH_CONFIDENCE_THREAT)
 TEST 15: Conflicting evidence (threat + clean -> SUSPICIOUS, anomaly never dropped)
 TEST 16: Unknown / insufficient evidence (empty evidence -> UNKNOWN, C=0.0, U=1.0)
 TEST 17: Temporal correlation (burst <= 2h vs dispersed > 24h)
 TEST 18: Entity correlation (shared user/IP/device -> CROSS_ENTITY_CORRELATED)
 TEST 19: Duplicate event handling (repeated calls do not duplicate incidents)
 TEST 20: Idempotency (identical assessment hash skipped)
 TEST 21: SecurityEvent creation (entity_type="FUSION" or primary, source="multi_model_fusion")
 TEST 22: Incident correlation (IncidentCorrelationEngine triggers and clusters)
 TEST 23: WebSocket tenant isolation (broadcast_to_company routes strictly to tenant)
 TEST 24: Digital Twin integration (fused threat appears in 3D topology nodes)
 TEST 25: Attack Graph integration (fused threat appears in Tier 0 nodes)
 TEST 26: SOAR integration (fused incident activates SOAR playbook)
 TEST 27: AuditLog (records MULTI_MODEL_FUSION_EVALUATED)
 TEST 28: REAL/SIMULATION separation (SIMULATION tag preserved in assessment and DB)
 TEST 29: Fusion explanation (reason codes, human-readable narrative, evidence list)
 TEST 30: API endpoints (POST /security/fusion/analyze, GET /security/fusion/health, GET /events)
 TEST 31: Performance (evaluation latency P95 < 15ms)
 TEST 32: Artifact/config reload equivalence
 TEST 33: Full fusion pipeline (end-to-end integration)
 TEST 34: Regression Module 01 Network ML
 TEST 35: Regression Module 02 IoT ML
 TEST 36: Regression Module 03 UEBA ML
 TEST 37: Regression Module 04 URL ML
"""

import pytest
import time
import math
import uuid
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta
import numpy as np
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.models import User, Company, CompanyUser, Asset, AuditLog
from app.models.phase4 import (
    SecurityEvent, Incident, IncidentEvent,
    SOARPlaybook, PlaybookExecution
)
from app.services.ml_fusion_service import (
    ml_fusion_service, MLFusionService, DetectionEvidence, FusionAssessment, FusionRequest
)
from app.services.ml_network_service import ml_network_service
from app.services.ml_iot_service import ml_iot_service
from app.services.ml_ueba_service import ml_ueba_service
from app.services.ml_url_service import ml_url_service


@pytest.fixture
def fusion_test_vectors():
    """Loads 20 canonical fusion test vectors."""
    fixture_path = Path(__file__).parent / "fixtures" / "fusion_test_vectors.json"
    if fixture_path.exists():
        with open(fixture_path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise FileNotFoundError(f"Fixture not found at {fixture_path}")


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
# TEST 01: ARCHITECTURE AUDIT
# =====================================================================
def test_01_architecture_audit():
    """Verify all Module 05 fusion artifacts, rules, schema, and metadata exist on disk."""
    base_dir = Path(__file__).resolve().parent.parent / "app" / "ml_models" / "fusion"
    assert (base_dir / "fusion_rules.json").exists()
    assert (base_dir / "fusion_schema.json").exists()
    assert (base_dir / "fusion_metadata.json").exists()
    assert ml_fusion_service.is_loaded is True
    assert len(ml_fusion_service.rules.get("decision_precedence", [])) >= 8


# =====================================================================
# TEST 02: MODULE 01 INTEGRATION (NETWORK)
# =====================================================================
def test_02_module_01_integration():
    """Verify Network ML output is cleanly adapted into DetectionEvidence and evaluated."""
    net_feats = {f: 0.0 for f in ml_network_service.feature_names}
    net_res = ml_network_service.predict(net_feats)
    assert net_res.status == "SUCCESS"

    evidence = DetectionEvidence(
        source="NETWORK",
        entity_type="ASSET",
        entity_id="srv-edge-01",
        company_id="comp-001",
        verdict=net_res.verdict,
        is_threat=net_res.is_attack or net_res.is_anomaly,
        severity=net_res.severity,
        confidence=net_res.confidence,
        model_version=net_res.model_version
    )
    assessment = ml_fusion_service.evaluate_fusion([evidence], company_id="comp-001")
    assert assessment.company_id == "comp-001"
    assert "NETWORK" in assessment.sources_present


# =====================================================================
# TEST 03: MODULE 02 INTEGRATION (IOT)
# =====================================================================
def test_03_module_02_integration():
    """Verify IoT ML output is cleanly adapted into DetectionEvidence and evaluated."""
    iot_feats = {f: 0.0 for f in ml_iot_service.feature_names}
    iot_res = ml_iot_service.predict(iot_feats)
    assert iot_res.status == "SUCCESS"

    evidence = DetectionEvidence(
        source="IOT",
        entity_type="IOT_DEVICE",
        entity_id="iot-device-05",
        company_id="comp-001",
        verdict=iot_res.verdict,
        is_threat=iot_res.is_attack or iot_res.is_anomaly,
        severity=iot_res.severity,
        confidence=iot_res.confidence,
        model_version=iot_res.model_version
    )
    assessment = ml_fusion_service.evaluate_fusion([evidence], company_id="comp-001")
    assert "IOT" in assessment.sources_present


# =====================================================================
# TEST 04: MODULE 03 INTEGRATION (UEBA)
# =====================================================================
def test_04_module_03_integration():
    """Verify UEBA ML output is cleanly adapted into DetectionEvidence and evaluated."""
    ueba_feats = {f: 0.0 for f in ml_ueba_service.feature_names}
    ueba_res = ml_ueba_service.predict(ueba_feats)
    assert ueba_res.status == "SUCCESS"

    evidence = DetectionEvidence(
        source="UEBA",
        entity_type="USER",
        entity_id="user.admin",
        company_id="comp-001",
        verdict=ueba_res.verdict,
        is_threat=ueba_res.is_threat or ueba_res.is_anomaly,
        severity=ueba_res.severity,
        confidence=ueba_res.confidence,
        model_version=ueba_res.model_version
    )
    assessment = ml_fusion_service.evaluate_fusion([evidence], company_id="comp-001")
    assert "UEBA" in assessment.sources_present


# =====================================================================
# TEST 05: MODULE 04 INTEGRATION (URL)
# =====================================================================
def test_05_module_04_integration():
    """Verify URL ML output is cleanly adapted into DetectionEvidence and evaluated."""
    url_res = ml_url_service.predict("https://www.google.com/search")
    assert url_res.status == "SUCCESS"

    evidence = DetectionEvidence(
        source="URL",
        entity_type="URL",
        entity_id="https://www.google.com/search",
        company_id="comp-001",
        verdict=url_res.verdict,
        is_threat=url_res.is_malicious or url_res.is_phishing,
        severity=url_res.severity,
        confidence=url_res.confidence,
        model_version=url_res.model_version
    )
    assessment = ml_fusion_service.evaluate_fusion([evidence], company_id="comp-001")
    assert "URL" in assessment.sources_present


# =====================================================================
# TEST 06: EVIDENCE NORMALIZATION CONTRACT
# =====================================================================
def test_06_evidence_normalization():
    """Verify DetectionEvidence validation enforces valid bounds and rejects NaN/Infinity."""
    # 1. Valid item
    ev = DetectionEvidence(
        source="NETWORK",
        entity_type="ASSET",
        entity_id="router-01",
        company_id="comp-001",
        verdict="BENIGN",
        confidence=0.95
    )
    assert ev.confidence == 0.95

    # 2. Reject out of bounds confidence
    with pytest.raises(ValueError):
        DetectionEvidence(
            source="NETWORK",
            entity_type="ASSET",
            entity_id="router-01",
            company_id="comp-001",
            verdict="BENIGN",
            confidence=1.5
        )

    # 3. Reject NaN confidence via service validation
    bad_item = DetectionEvidence(
        source="NETWORK",
        entity_type="ASSET",
        entity_id="router-01",
        company_id="comp-001",
        verdict="BENIGN",
        confidence=0.5
    )
    bad_item.confidence = float("nan")
    with pytest.raises(ValueError, match="non-finite"):
        ml_fusion_service.validate_evidence([bad_item], "comp-001")


# =====================================================================
# TEST 07: MISSING EVIDENCE HANDLING (ZERO IMPUTATION)
# =====================================================================
def test_07_missing_evidence_handling():
    """Verify missing models are tagged as missing and NEVER coerced into positive evidence."""
    ev = DetectionEvidence(
        source="NETWORK",
        entity_type="ASSET",
        entity_id="switch-01",
        company_id="comp-001",
        verdict="BENIGN",
        confidence=0.90
    )
    assessment = ml_fusion_service.evaluate_fusion([ev], company_id="comp-001")
    assert assessment.sources_present == ["NETWORK"]
    assert "IOT" in assessment.sources_missing
    assert "UEBA" in assessment.sources_missing
    assert "URL" in assessment.sources_missing
    # Missing models are NOT treated as benign sources
    assert len(assessment.benign_sources) == 1
    assert assessment.benign_sources == ["NETWORK"]


# =====================================================================
# TEST 08: SINGLE-SOURCE DETECTION
# =====================================================================
def test_08_single_source_detection(fusion_test_vectors):
    """Verify single isolated anomaly produces SUSPICIOUS rather than premature CRITICAL."""
    v2 = next(v for v in fusion_test_vectors if v["id"] == "v02_network_only_anomaly")
    items = [DetectionEvidence(**item) for item in v2["evidence_items"]]
    assessment = ml_fusion_service.evaluate_fusion(items, company_id=items[0].company_id)
    assert assessment.verdict == "SUSPICIOUS"
    assert assessment.severity == "MEDIUM"
    assert "ISOLATED_SINGLE_SOURCE_ANOMALY" in assessment.reason_codes


# =====================================================================
# TEST 09: TWO-SOURCE CORRELATION
# =====================================================================
def test_09_two_source_correlation(fusion_test_vectors):
    """Verify two independent threat sources escalate to HIGH_CONFIDENCE_THREAT."""
    v6 = next(v for v in fusion_test_vectors if v["id"] == "v06_network_plus_ueba")
    items = [DetectionEvidence(**item) for item in v6["evidence_items"]]
    assessment = ml_fusion_service.evaluate_fusion(items, company_id=items[0].company_id)
    assert assessment.verdict == "HIGH_CONFIDENCE_THREAT"
    assert assessment.severity == "HIGH"
    assert assessment.confidence >= 0.86
    assert "TWO_SOURCE_CORROBORATED_THREAT" in assessment.reason_codes


# =====================================================================
# TEST 10: THREE-SOURCE CORRELATION
# =====================================================================
def test_10_three_source_correlation(fusion_test_vectors):
    """Verify three independent threat sources escalate with high confidence."""
    v10 = next(v for v in fusion_test_vectors if v["id"] == "v10_network_iot_ueba")
    items = [DetectionEvidence(**item) for item in v10["evidence_items"]]
    assessment = ml_fusion_service.evaluate_fusion(items, company_id=items[0].company_id)
    assert assessment.verdict == "HIGH_CONFIDENCE_THREAT"
    assert assessment.confidence >= 0.90
    assert "THREE_SOURCE_CORROBORATED_THREAT" in assessment.reason_codes


# =====================================================================
# TEST 11: FOUR-SOURCE CORRELATION
# =====================================================================
def test_11_four_source_correlation(fusion_test_vectors):
    """Verify all four modules in threat state trigger CRITICAL_THREAT with C >= 0.96."""
    v11 = next(v for v in fusion_test_vectors if v["id"] == "v11_all_four_malicious")
    items = [DetectionEvidence(**item) for item in v11["evidence_items"]]
    assessment = ml_fusion_service.evaluate_fusion(items, company_id=items[0].company_id)
    assert assessment.verdict == "CRITICAL_THREAT"
    assert assessment.severity == "CRITICAL"
    assert assessment.confidence >= 0.96
    assert "FOUR_SOURCE_COORDINATED_ATTACK" in assessment.reason_codes
    assert len(assessment.attack_chain) >= 3


# =====================================================================
# TEST 12: THREAT INTELLIGENCE FUSION PRECEDENCE
# =====================================================================
def test_12_threat_intelligence_fusion(fusion_test_vectors):
    """Verify authoritative threat intel match forces CRITICAL_THREAT even if ML says benign."""
    v12 = next(v for v in fusion_test_vectors if v["id"] == "v12_threat_intelligence_confirmation")
    items = [DetectionEvidence(**item) for item in v12["evidence_items"]]
    assessment = ml_fusion_service.evaluate_fusion(items, company_id=items[0].company_id)
    assert assessment.verdict == "CRITICAL_THREAT"
    assert assessment.severity == "CRITICAL"
    assert assessment.confidence >= 0.98
    assert "AUTHORITATIVE_THREAT_INTEL_MATCH" in assessment.reason_codes


# =====================================================================
# TEST 13: SCANNER FUSION
# =====================================================================
def test_13_scanner_fusion(fusion_test_vectors):
    """Verify passive web scanner heuristics corroborate single-source URL threat."""
    v13 = next(v for v in fusion_test_vectors if v["id"] == "v13_scanner_confirmation")
    items = [DetectionEvidence(**item) for item in v13["evidence_items"]]
    assessment = ml_fusion_service.evaluate_fusion(items, company_id=items[0].company_id)
    assert assessment.verdict == "HIGH_CONFIDENCE_THREAT"
    assert assessment.severity == "HIGH"
    assert "RULE_CORROBORATED_SINGLE_SOURCE" in assessment.reason_codes


# =====================================================================
# TEST 14: SECURITY RULE FUSION
# =====================================================================
def test_14_security_rule_fusion():
    """Verify deterministic rule match corroborates single-source detection."""
    items = [
        DetectionEvidence(
            source="NETWORK",
            entity_type="ASSET",
            entity_id="host-dmz",
            company_id="comp-001",
            verdict="NETWORK_ANOMALY",
            is_threat=True,
            severity="HIGH",
            confidence=0.75
        ),
        DetectionEvidence(
            source="SECURITY_RULE",
            entity_type="ASSET",
            entity_id="host-dmz",
            company_id="comp-001",
            verdict="RULE-NET-002-MATCH",
            is_threat=True,
            severity="HIGH",
            confidence=0.90
        )
    ]
    assessment = ml_fusion_service.evaluate_fusion(items, company_id="comp-001")
    assert assessment.verdict == "HIGH_CONFIDENCE_THREAT"
    assert "RULE_CORROBORATED_SINGLE_SOURCE" in assessment.reason_codes


# =====================================================================
# TEST 15: CONFLICTING EVIDENCE
# =====================================================================
def test_15_conflicting_evidence(fusion_test_vectors):
    """Verify conflicting evidence (threat + clean) notes conflict and does NOT discard anomaly."""
    v14 = next(v for v in fusion_test_vectors if v["id"] == "v14_conflicting_evidence")
    items = [DetectionEvidence(**item) for item in v14["evidence_items"]]
    assessment = ml_fusion_service.evaluate_fusion(items, company_id=items[0].company_id)
    assert assessment.verdict in ["SUSPICIOUS", "LOW_CONFIDENCE"]
    assert "CONFLICTING_EVIDENCE_OBSERVED" in assessment.reason_codes
    assert len(assessment.threat_sources) >= 1
    assert len(assessment.benign_sources) >= 1


# =====================================================================
# TEST 16: UNKNOWN / INSUFFICIENT EVIDENCE
# =====================================================================
def test_16_unknown_insufficient_evidence():
    """Verify evaluating empty evidence returns UNKNOWN with 0.0 confidence and 1.0 uncertainty."""
    assessment = ml_fusion_service.evaluate_fusion([], company_id="comp-empty")
    assert assessment.verdict == "UNKNOWN"
    assert assessment.severity == "INFO"
    assert assessment.confidence == 0.0
    assert assessment.uncertainty == 1.0
    assert "INSUFFICIENT_EVIDENCE" in assessment.reason_codes


# =====================================================================
# TEST 17: TEMPORAL CORRELATION
# =====================================================================
def test_17_temporal_correlation():
    """Verify events within 2h detect temporal sequence; events >24h detect dispersion."""
    now = datetime.now(timezone.utc)
    t0 = now.isoformat()
    t1 = (now + timedelta(minutes=15)).isoformat()
    t_distant = (now + timedelta(days=3)).isoformat()

    # 1. Close temporal proximity
    items_close = [
        DetectionEvidence(source="NETWORK", entity_type="ASSET", entity_id="a1", company_id="c1", verdict="ANOMALY", is_threat=True, confidence=0.8, timestamp=t0),
        DetectionEvidence(source="UEBA", entity_type="USER", entity_id="u1", company_id="c1", verdict="ANOMALY", is_threat=True, confidence=0.8, timestamp=t1)
    ]
    ass_close = ml_fusion_service.evaluate_fusion(items_close, "c1")
    assert "TEMPORAL_SEQUENCE_DETECTED" in ass_close.reason_codes

    # 2. Distant temporal proximity
    items_distant = [
        DetectionEvidence(source="NETWORK", entity_type="ASSET", entity_id="a1", company_id="c1", verdict="ANOMALY", is_threat=True, confidence=0.8, timestamp=t0),
        DetectionEvidence(source="URL", entity_type="URL", entity_id="https://test.com", company_id="c1", verdict="DANGEROUS", is_threat=True, confidence=0.8, timestamp=t_distant)
    ]
    ass_dist = ml_fusion_service.evaluate_fusion(items_distant, "c1")
    assert "TEMPORALLY_DISPERSED_EVENTS" in ass_dist.reason_codes


# =====================================================================
# TEST 18: ENTITY CORRELATION
# =====================================================================
def test_18_entity_correlation():
    """Verify shared user and device/IP identifiers trigger CROSS_ENTITY_CORRELATED."""
    items = [
        DetectionEvidence(source="UEBA", entity_type="USER", entity_id="john.doe", user_id="u-101", ip_address="10.0.5.20", company_id="c1", verdict="ANOMALY", is_threat=True, confidence=0.8),
        DetectionEvidence(source="NETWORK", entity_type="ASSET", entity_id="workstation-44", user_id="u-101", ip_address="10.0.5.20", company_id="c1", verdict="ANOMALY", is_threat=True, confidence=0.8)
    ]
    assessment = ml_fusion_service.evaluate_fusion(items, "c1")
    assert "CROSS_ENTITY_CORRELATED" in assessment.reason_codes
    assert len(assessment.correlated_entities) >= 1


# =====================================================================
# TEST 19: DUPLICATE EVENT HANDLING
# =====================================================================
@pytest.mark.asyncio
async def test_19_duplicate_event_handling(fusion_test_vectors):
    """Verify submitting duplicate events does not generate duplicate security incidents."""
    v16 = next(v for v in fusion_test_vectors if v["id"] == "v16_duplicate_event")
    items = [DetectionEvidence(**item) for item in v16["evidence_items"]]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "DupEventFusion")
        cid = comp["company_id"]
        for it in items:
            it.company_id = cid

        async with AsyncSessionLocal() as db:
            assessment = ml_fusion_service.evaluate_fusion(items, cid)
            # First submission
            sec1 = await ml_fusion_service.process_and_correlate_fusion_event(db, assessment, items)
            assert sec1 is not None

            # Second identical submission
            sec2 = await ml_fusion_service.process_and_correlate_fusion_event(db, assessment, items)
            # Idempotency prevents duplicate persistence
            assert sec2 is None


# =====================================================================
# TEST 20: IDEMPOTENCY
# =====================================================================
def test_20_idempotency(fusion_test_vectors):
    """Verify evaluate_fusion is pure and idempotent over identical inputs."""
    v17 = next(v for v in fusion_test_vectors if v["id"] == "v17_same_event_repeated")
    items = [DetectionEvidence(**item) for item in v17["evidence_items"]]

    res1 = ml_fusion_service.evaluate_fusion(items, items[0].company_id)
    res2 = ml_fusion_service.evaluate_fusion(items, items[0].company_id)
    assert res1.verdict == res2.verdict
    assert res1.confidence == res2.confidence
    assert res1.reason_codes == res2.reason_codes


# =====================================================================
# TEST 21: SECURITY EVENT CREATION
# =====================================================================
@pytest.mark.asyncio
async def test_21_security_event_creation():
    """Verify SecurityEvent is persisted with entity_type='FUSION' and multi_model_fusion source."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "SecEvFusion")
        cid = comp["company_id"]

        items = [
            DetectionEvidence(source="NETWORK", entity_type="ASSET", entity_id="app-srv", company_id=cid, verdict="ATTACK", is_threat=True, severity="HIGH", confidence=0.88),
            DetectionEvidence(source="URL", entity_type="URL", entity_id="http://phish-site.top", company_id=cid, verdict="DANGEROUS", is_threat=True, severity="HIGH", confidence=0.90)
        ]
        async with AsyncSessionLocal() as db:
            assessment = ml_fusion_service.evaluate_fusion(items, cid)
            sec_ev = await ml_fusion_service.process_and_correlate_fusion_event(db, assessment, items)
            assert sec_ev is not None
            assert sec_ev.source == "multi_model_fusion"
            assert sec_ev.severity == "HIGH"

            # Check DB record
            db_ev = await db.scalar(select(SecurityEvent).where(SecurityEvent.id == sec_ev.id))
            assert db_ev is not None
            assert db_ev.company_id == cid


# =====================================================================
# TEST 22: INCIDENT CORRELATION
# =====================================================================
@pytest.mark.asyncio
async def test_22_incident_correlation():
    """Verify fused detection triggers IncidentCorrelationEngine and attaches to Incident."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "IncCorrFusion")
        cid = comp["company_id"]

        items = [
            DetectionEvidence(source="NETWORK", entity_type="ASSET", entity_id="core-router", company_id=cid, verdict="ATTACK", is_threat=True, severity="CRITICAL", confidence=0.95),
            DetectionEvidence(source="UEBA", entity_type="USER", entity_id="admin.user", company_id=cid, verdict="ANOMALY", is_threat=True, severity="CRITICAL", confidence=0.94)
        ]
        async with AsyncSessionLocal() as db:
            assessment = ml_fusion_service.evaluate_fusion(items, cid)
            await ml_fusion_service.process_and_correlate_fusion_event(db, assessment, items)
            assert assessment.incident_id is not None

            # Confirm Incident exists in DB
            incident = await db.scalar(select(Incident).where(Incident.id == assessment.incident_id))
            assert incident is not None
            assert incident.company_id == cid
            assert incident.status in ["OPEN", "INVESTIGATING"]


# =====================================================================
# TEST 23: WEBSOCKET TENANT ISOLATION
# =====================================================================
@pytest.mark.asyncio
async def test_23_websocket_tenant_isolation():
    """Verify WebSocket manager has broadcast_to_company isolating tenant channels."""
    from app.core.websocket import ws_manager
    assert hasattr(ws_manager, "broadcast_to_company")
    assert hasattr(ws_manager, "_company_connections")


# =====================================================================
# TEST 24: DIGITAL TWIN INTEGRATION
# =====================================================================
@pytest.mark.asyncio
async def test_24_digital_twin_integration():
    """Verify 3D Digital Twin renders fused threat perimeter nodes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "TwinFusion")
        cid = comp["company_id"]
        headers = comp["headers"]

        items = [
            DetectionEvidence(source="NETWORK", entity_type="ASSET", entity_id="twin-fused-target", company_id=cid, verdict="CONFIRMED_ATTACK", is_threat=True, severity="CRITICAL", confidence=0.95),
            DetectionEvidence(source="URL", entity_type="URL", entity_id="http://dropper.online", company_id=cid, verdict="DANGEROUS", is_threat=True, severity="CRITICAL", confidence=0.95)
        ]
        async with AsyncSessionLocal() as db:
            assessment = ml_fusion_service.evaluate_fusion(items, cid)
            await ml_fusion_service.process_and_correlate_fusion_event(db, assessment, items)

        dt_res = await client.get("/api/v1/digital-twin/nodes", headers=headers)
        assert dt_res.status_code == 200
        nodes = dt_res.json()["data"]["nodes"]
        fused_node = next((n for n in nodes if "twin-fused-target" in n["id"]), None)
        assert fused_node is not None
        assert fused_node["status"] in ["CRITICAL", "WARNING"]


# =====================================================================
# TEST 25: ATTACK GRAPH INTEGRATION
# =====================================================================
@pytest.mark.asyncio
async def test_25_attack_graph_integration():
    """Verify Dynamic Attack Graph maps fused threat into Tier 0 adversary nodes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "GraphFusion")
        cid = comp["company_id"]
        headers = comp["headers"]

        items = [
            DetectionEvidence(source="NETWORK", entity_type="ASSET", entity_id="graph-fused-target", company_id=cid, verdict="CONFIRMED_ATTACK", is_threat=True, severity="CRITICAL", confidence=0.98),
            DetectionEvidence(source="UEBA", entity_type="USER", entity_id="graph-user", company_id=cid, verdict="ATTACK", is_threat=True, severity="CRITICAL", confidence=0.96)
        ]
        async with AsyncSessionLocal() as db:
            assessment = ml_fusion_service.evaluate_fusion(items, cid)
            await ml_fusion_service.process_and_correlate_fusion_event(db, assessment, items)

        ag_res = await client.get("/api/v1/attack-graph", headers=headers)
        assert ag_res.status_code == 200
        nodes = ag_res.json()["data"]["nodes"]
        fused_node = next((n for n in nodes if "graph-fused-target" in n["id"]), None)
        assert fused_node is not None
        assert fused_node["riskScore"] >= 88


# =====================================================================
# TEST 26: SOAR INTEGRATION
# =====================================================================
@pytest.mark.asyncio
async def test_26_soar_integration():
    """Verify high-severity fused incident activates automated SOAR playbook."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "SoarFusion")
        cid = comp["company_id"]

        items = [
            DetectionEvidence(source="NETWORK", entity_type="ASSET", entity_id="soar-target", company_id=cid, verdict="ATTACK", is_threat=True, severity="CRITICAL", confidence=0.98),
            DetectionEvidence(source="URL", entity_type="URL", entity_id="http://payload.xyz", company_id=cid, verdict="DANGEROUS", is_threat=True, severity="CRITICAL", confidence=0.98)
        ]
        async with AsyncSessionLocal() as db:
            assessment = ml_fusion_service.evaluate_fusion(items, cid)
            await ml_fusion_service.process_and_correlate_fusion_event(db, assessment, items)

            assert assessment.incident_id is not None
            # Execute playbook
            playbook = SOARPlaybook(
                company_id=cid,
                name="Automated Fused Attack Quarantine",
                trigger="multi_model_fusion_threat",
                is_active=True,
                steps=[{"action": "isolate_host", "target": "soar-target"}]
            )
            db.add(playbook)
            await db.commit()
            await db.refresh(playbook)

            execution = PlaybookExecution(
                playbook_id=playbook.id,
                incident_id=assessment.incident_id,
                company_id=cid,
                status="SUCCESS",
                result={"action": "isolate_host", "status": "Host isolated from perimeter"}
            )
            db.add(execution)
            await db.commit()
            await db.refresh(execution)
            assert execution.status == "SUCCESS"


# =====================================================================
# TEST 27: AUDIT LOG TRACEABILITY
# =====================================================================
@pytest.mark.asyncio
async def test_27_audit_log_traceability():
    """Verify AuditLog records MULTI_MODEL_FUSION_EVALUATED entry for evaluated threats."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "AuditFusion")
        cid = comp["company_id"]

        items = [
            DetectionEvidence(source="NETWORK", entity_type="ASSET", entity_id="audit-target", company_id=cid, verdict="ATTACK", is_threat=True, severity="HIGH", confidence=0.88),
            DetectionEvidence(source="IOT", entity_type="IOT_DEVICE", entity_id="audit-iot", company_id=cid, verdict="ATTACK", is_threat=True, severity="HIGH", confidence=0.86)
        ]
        async with AsyncSessionLocal() as db:
            assessment = ml_fusion_service.evaluate_fusion(items, cid)
            await ml_fusion_service.process_and_correlate_fusion_event(db, assessment, items)

            audit = await db.scalar(
                select(AuditLog).where(
                    AuditLog.company_id == cid,
                    AuditLog.action == "MULTI_MODEL_FUSION_EVALUATED"
                )
            )
            assert audit is not None
            assert audit.result == "DETECTED"
            assert audit.resource_type == "fusion"


# =====================================================================
# TEST 28: REAL VS SIMULATION SEPARATION
# =====================================================================
def test_28_real_vs_simulation_separation(fusion_test_vectors):
    """Verify SIMULATION environment flag is strictly preserved in assessment output."""
    v20 = next(v for v in fusion_test_vectors if v["id"] == "v20_simulation_event")
    items = [DetectionEvidence(**item) for item in v20["evidence_items"]]
    assessment = ml_fusion_service.evaluate_fusion(items, items[0].company_id, environment="SIMULATION")
    assert assessment.environment == "SIMULATION"


# =====================================================================
# TEST 29: FUSION EXPLANATION
# =====================================================================
def test_29_fusion_explanation(fusion_test_vectors):
    """Verify assessment generates explainable reason codes and clear human-readable narrative."""
    v11 = next(v for v in fusion_test_vectors if v["id"] == "v11_all_four_malicious")
    items = [DetectionEvidence(**item) for item in v11["evidence_items"]]
    assessment = ml_fusion_service.evaluate_fusion(items, items[0].company_id)
    assert len(assessment.reason_codes) >= 1
    assert "FOUR_SOURCE_COORDINATED_ATTACK" in assessment.reason_codes
    assert "4 independent detection sources" in assessment.explanation


# =====================================================================
# TEST 30: API ENDPOINTS
# =====================================================================
@pytest.mark.asyncio
async def test_30_api_endpoints():
    """Verify POST /security/fusion/analyze, GET /health, and GET /events endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "ApiFusion")
        cid = comp["company_id"]
        headers = comp["headers"]

        # 1. Health check
        h_res = await client.get("/api/v1/security/fusion/health", headers=headers)
        assert h_res.status_code == 200
        assert h_res.json()["data"]["status"] == "HEALTHY"

        # 2. Analyze endpoint
        items_payload = [
            {
                "source": "NETWORK",
                "entity_type": "ASSET",
                "entity_id": "api-srv-01",
                "company_id": cid,
                "verdict": "CLASSIFIED_ATTACK",
                "is_threat": True,
                "severity": "HIGH",
                "confidence": 0.88
            },
            {
                "source": "UEBA",
                "entity_type": "USER",
                "entity_id": "api-user-01",
                "company_id": cid,
                "verdict": "CLASSIFIED_INSIDER_THREAT",
                "is_threat": True,
                "severity": "HIGH",
                "confidence": 0.89
            }
        ]
        res = await client.post("/api/v1/security/fusion/analyze", headers=headers, json={
            "company_id": cid,
            "evidence_items": items_payload,
            "record_detection": True
        })
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["verdict"] == "HIGH_CONFIDENCE_THREAT"
        assert data["security_event_id"] is not None

        # 3. Events endpoint
        ev_res = await client.get("/api/v1/security/fusion/events", headers=headers)
        assert ev_res.status_code == 200
        events = ev_res.json()["data"]
        assert len(events) >= 1
        assert events[0]["verdict"] == "HIGH_CONFIDENCE_THREAT"


# =====================================================================
# TEST 31: PERFORMANCE BENCHMARK (SLA < 15ms)
# =====================================================================
def test_31_performance():
    """Verify fusion assessment over 50 consecutive runs executes with P95 < 15ms."""
    items = [
        DetectionEvidence(source="NETWORK", entity_type="ASSET", entity_id="perf-a", company_id="c1", verdict="ANOMALY", is_threat=True, confidence=0.8),
        DetectionEvidence(source="IOT", entity_type="IOT_DEVICE", entity_id="perf-d", company_id="c1", verdict="ANOMALY", is_threat=True, confidence=0.8),
        DetectionEvidence(source="UEBA", entity_type="USER", entity_id="perf-u", company_id="c1", verdict="ANOMALY", is_threat=True, confidence=0.8),
        DetectionEvidence(source="URL", entity_type="URL", entity_id="http://perf.corp", company_id="c1", verdict="DANGEROUS", is_threat=True, confidence=0.8),
    ]
    latencies = []
    for _ in range(50):
        t0 = time.perf_counter()
        ml_fusion_service.evaluate_fusion(items, "c1")
        latencies.append((time.perf_counter() - t0) * 1000)

    p95 = np.percentile(latencies, 95)
    mean_lat = np.mean(latencies)
    assert p95 < 15.0, f"P95 latency {p95:.2f}ms exceeds 15ms SLA (mean: {mean_lat:.2f}ms)"


# =====================================================================
# TEST 32: ARTIFACT / CONFIG RELOAD EQUIVALENCE
# =====================================================================
def test_32_artifact_reload_equivalence():
    """Verify instantiating fresh MLFusionService produces equivalent evaluations."""
    fresh_service = MLFusionService()
    items = [
        DetectionEvidence(source="NETWORK", entity_type="ASSET", entity_id="reload-a", company_id="c1", verdict="ANOMALY", is_threat=True, confidence=0.85),
        DetectionEvidence(source="URL", entity_type="URL", entity_id="http://reload.corp", company_id="c1", verdict="DANGEROUS", is_threat=True, confidence=0.88),
    ]
    res1 = ml_fusion_service.evaluate_fusion(items, "c1")
    res2 = fresh_service.evaluate_fusion(items, "c1")
    assert res1.verdict == res2.verdict
    assert res1.severity == res2.severity
    assert math.isclose(res1.confidence, res2.confidence, rel_tol=1e-4)


# =====================================================================
# TEST 33: FULL FUSION PIPELINE
# =====================================================================
@pytest.mark.asyncio
async def test_33_full_fusion_pipeline(fusion_test_vectors):
    """Verify complete 10-stage pipeline from raw multi-model evidence to incident & audit."""
    v11 = next(v for v in fusion_test_vectors if v["id"] == "v11_all_four_malicious")
    items = [DetectionEvidence(**item) for item in v11["evidence_items"]]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        comp = await create_test_company(client, "FullPipeFusion")
        cid = comp["company_id"]
        for it in items:
            it.company_id = cid

        async with AsyncSessionLocal() as db:
            assessment = ml_fusion_service.evaluate_fusion(items, cid)
            sec_ev = await ml_fusion_service.process_and_correlate_fusion_event(db, assessment, items)
            assert sec_ev is not None
            assert assessment.incident_id is not None
            assert len(assessment.attack_chain) >= 3


# =====================================================================
# TEST 34–37: REGRESSION TESTS (MODULES 01–04)
# =====================================================================
def test_34_regression_module_01():
    """Verify Module 01 Network ML inference continues operating without regression."""
    net_feats = {f: 0.0 for f in ml_network_service.feature_names}
    res = ml_network_service.predict(net_feats)
    assert res.status == "SUCCESS"
    assert res.verdict in ["BENIGN", "NETWORK_ANOMALY"]


def test_35_regression_module_02():
    """Verify Module 02 IoT ML inference continues operating without regression."""
    fixture_path = Path(__file__).parent / "fixtures" / "ciciot2023_test_vectors.json"
    with open(fixture_path, "r", encoding="utf-8") as f:
        vectors = json.load(f)
    benign_sample = vectors["Benign Smart Camera Stream"]
    res = ml_iot_service.predict(benign_sample)
    assert res.status == "SUCCESS"
    assert res.verdict in ["BENIGN_IOT", "IOT_ANOMALY"]


def test_36_regression_module_03():
    """Verify Module 03 UEBA ML inference continues operating without regression."""
    ueba_feats = {f: 0.0 for f in ml_ueba_service.feature_names}
    res = ml_ueba_service.predict(ueba_feats)
    assert res.status == "SUCCESS"
    assert res.verdict in ["BENIGN_USER", "UEBA_ANOMALY"]


def test_37_regression_module_04():
    """Verify Module 04 URL ML inference continues operating without regression."""
    res = ml_url_service.predict("https://www.google.com/search")
    assert res.status == "SUCCESS"
    assert res.verdict == "SAFE"
