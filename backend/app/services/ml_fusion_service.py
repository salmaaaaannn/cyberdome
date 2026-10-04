"""
CYBERDOME MODULE 05 — MULTI-MODEL DETECTION FUSION ENGINE
Integrates and synthesizes evidence streams from:
1. Module 01: Network Anomaly Detection (v1.0.0-cic-ids2017)
2. Module 02: IoT Anomaly Detection (iot-anomaly-v1)
3. Module 03: UEBA Behavior Analytics (ueba-anomaly-v1)
4. Module 04: Phishing & Malicious URL Detection (url-phishing-v1)
5. Authoritative Threat Intelligence
6. Web Scanner Passive DNS & Heuristics
7. Deterministic Security Rules

Produces an explainable, unified security assessment with zero fake data fabrication,
temporal correlation, entity correlation, and real-time security pipeline integration.
"""

from typing import Dict, List, Any, Optional, Set
from datetime import datetime, timezone, timedelta
import math
import uuid
import json
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.phase4 import SecurityEvent, Incident, IncidentEvent
from app.models.models import AuditLog, CompanyUser
from app.services.detection.engine import DetectionResult
from app.services.incidents.correlation import IncidentCorrelationEngine
from app.core.websocket import ws_manager

logger = logging.getLogger("cyberdome.ml.fusion")


def utc_now_str() -> str:
    return datetime.now(timezone.utc).isoformat()


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ─── Pydantic Contracts ───────────────────────────────────────────────

class DetectionEvidence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str  # NETWORK, IOT, UEBA, URL, THREAT_INTELLIGENCE, WEB_SCANNER, SECURITY_RULE
    entity_type: str  # ASSET, USER, IP, IOT_DEVICE, URL, DOMAIN, ENDPOINT, NETWORK
    entity_id: str
    timestamp: str = Field(default_factory=utc_now_str)
    company_id: str
    user_id: Optional[str] = None
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    verdict: str
    is_threat: bool = False
    severity: str = "INFO"  # INFO, LOW, MEDIUM, HIGH, CRITICAL
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    anomaly_score: Optional[float] = None
    model_version: Optional[str] = None
    raw_evidence: Dict[str, Any] = Field(default_factory=dict)
    environment: str = "REAL"  # REAL, SIMULATION
    source_event_id: Optional[str] = None


class FusionAssessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    verdict: str  # BENIGN, LOW_CONFIDENCE, SUSPICIOUS, HIGH_CONFIDENCE_THREAT, CRITICAL_THREAT, UNKNOWN
    severity: str  # INFO, LOW, MEDIUM, HIGH, CRITICAL
    confidence: float = Field(ge=0.0, le=1.0)
    uncertainty: float = Field(ge=0.0, le=1.0)
    environment: str = "REAL"  # REAL, SIMULATION
    sources_present: List[str]
    sources_missing: List[str]
    threat_sources: List[str]
    benign_sources: List[str]
    primary_entity: Dict[str, str]
    correlated_entities: List[Dict[str, str]]
    attack_chain: List[Dict[str, Any]]
    reason_codes: List[str]
    explanation: str
    evaluated_at: str
    security_event_id: Optional[str] = None
    incident_id: Optional[str] = None
    soar_playbook_triggered: Optional[str] = None
    model_version: str = "fusion-v1"


class FusionRequest(BaseModel):
    company_id: Optional[str] = None
    evidence_items: List[DetectionEvidence]
    environment: Optional[str] = "REAL"
    record_detection: Optional[bool] = True
    entity_context: Optional[Dict[str, Any]] = None


# ─── Multi-Model Fusion Service ───────────────────────────────────────

class MLFusionService:
    _instance: Optional["MLFusionService"] = None

    CORE_DETECTORS = ["NETWORK", "IOT", "UEBA", "URL"]
    CONTEXT_SOURCES = ["THREAT_INTELLIGENCE", "WEB_SCANNER", "SECURITY_RULE"]
    ALL_VALID_SOURCES = set(CORE_DETECTORS + CONTEXT_SOURCES)

    SEVERITY_WEIGHTS = {
        "INFO": 10,
        "LOW": 25,
        "MEDIUM": 50,
        "HIGH": 75,
        "CRITICAL": 95,
    }

    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent / "ml_models" / "fusion"
        self.rules_path = self.base_dir / "fusion_rules.json"
        self.schema_path = self.base_dir / "fusion_schema.json"
        self.meta_path = self.base_dir / "fusion_metadata.json"

        self.rules: Dict[str, Any] = {}
        self.metadata: Dict[str, Any] = {}
        self.is_loaded: bool = False
        self._processed_events: Set[str] = set()

        self.load_configuration()

    @classmethod
    def get_instance(cls) -> "MLFusionService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_configuration(self) -> None:
        """Load deterministic fusion rules and schema from artifacts."""
        try:
            if self.rules_path.exists():
                with open(self.rules_path, "r", encoding="utf-8") as f:
                    self.rules = json.load(f)
            if self.meta_path.exists():
                with open(self.meta_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
            self.is_loaded = True
            logger.info("Module 05 Multi-Model Detection Fusion Engine loaded successfully.")
        except Exception as exc:
            logger.error("Failed to load Module 05 fusion configuration: %s", exc)
            self.is_loaded = False

    def validate_evidence(self, items: List[DetectionEvidence], target_company_id: Optional[str] = None) -> str:
        """
        Validate incoming evidence items. Enforces:
        - Non-empty evidence
        - Finite numeric values for confidence and anomaly scores (rejects NaN/Infinity)
        - Company isolation: all items must match target company_id
        """
        if not items:
            raise ValueError("Evidence items list cannot be empty.")

        resolved_cid = target_company_id or items[0].company_id
        if not resolved_cid:
            raise ValueError("company_id is required for fusion evidence evaluation.")

        for item in items:
            if item.company_id != resolved_cid:
                raise ValueError(
                    f"Cross-tenant evidence detected: expected company '{resolved_cid}', got '{item.company_id}'"
                )

            # Check confidence validity
            if math.isnan(item.confidence) or math.isinf(item.confidence):
                raise ValueError(f"Invalid non-finite confidence value: {item.confidence}")
            if not (0.0 <= item.confidence <= 1.0):
                raise ValueError(f"Confidence out of bounds [0.0, 1.0]: {item.confidence}")

            # Check anomaly_score validity if provided
            if item.anomaly_score is not None:
                if math.isnan(item.anomaly_score) or math.isinf(item.anomaly_score):
                    raise ValueError(f"Invalid non-finite anomaly_score: {item.anomaly_score}")

            # Validate source name
            src_upper = item.source.upper()
            if src_upper not in self.ALL_VALID_SOURCES:
                raise ValueError(f"Unknown evidence source '{item.source}'. Supported: {self.ALL_VALID_SOURCES}")

        return resolved_cid

    def evaluate_fusion(
        self,
        evidence_items: List[DetectionEvidence],
        company_id: Optional[str] = None,
        environment: str = "REAL",
    ) -> FusionAssessment:
        """
        Synthesizes multiple detection signals into a single unified security assessment.
        Applies deterministic precedence, temporal grouping, entity correlation, and explainability.
        Missing models are marked as NOT_AVAILABLE and NEVER coerced into positive evidence.
        """
        eval_time = utc_now_str()
        env_tag = (environment or "REAL").upper()

        # Handle empty evidence gracefully
        if not evidence_items:
            cid = company_id or "unknown"
            return FusionAssessment(
                company_id=cid,
                verdict="UNKNOWN",
                severity="INFO",
                confidence=0.0,
                uncertainty=1.0,
                environment=env_tag,
                sources_present=[],
                sources_missing=self.CORE_DETECTORS,
                threat_sources=[],
                benign_sources=[],
                primary_entity={"entity_type": "UNKNOWN", "entity_id": "NONE"},
                correlated_entities=[],
                attack_chain=[],
                reason_codes=["INSUFFICIENT_EVIDENCE"],
                explanation="No detection evidence provided for multi-model evaluation.",
                evaluated_at=eval_time,
            )

        # Validate evidence
        resolved_cid = self.validate_evidence(evidence_items, company_id)

        # Track distinct sources
        sources_present = sorted(list({item.source.upper() for item in evidence_items}))
        sources_missing = [s for s in self.CORE_DETECTORS if s not in sources_present]

        threat_items = [e for e in evidence_items if self._is_item_threat(e)]
        benign_items = [e for e in evidence_items if not self._is_item_threat(e)]

        threat_sources = sorted(list({item.source.upper() for item in threat_items}))
        benign_sources = sorted(list({item.source.upper() for item in benign_items if item.source.upper() not in threat_sources}))

        # 1. Temporal Analysis
        reason_codes = []
        is_temporally_correlated = self._analyze_temporal_proximity(evidence_items, reason_codes)

        # 2. Entity Correlation
        primary_entity, correlated_entities = self._correlate_entities(evidence_items, reason_codes)

        # 3. Threat Intelligence Precedence Check
        ti_matches = [
            e for e in evidence_items
            if e.source.upper() == "THREAT_INTELLIGENCE" and (e.is_threat or "MALICIOUS" in e.verdict.upper())
        ]
        has_ti_match = len(ti_matches) > 0

        # Check for Security Rule or Scanner confirmation
        has_rule = any(e.source.upper() == "SECURITY_RULE" and e.is_threat for e in evidence_items)
        has_scanner = any(e.source.upper() == "WEB_SCANNER" and e.is_threat for e in evidence_items)

        # 4. Multi-Source Decision Fusion Matrix
        verdict = "BENIGN"
        severity = "INFO"
        confidence = 0.5
        attack_chain = []

        ml_threat_sources = sorted(list({item.source.upper() for item in threat_items if item.source.upper() in self.CORE_DETECTORS}))

        if has_ti_match:
            # Rule 1: Threat Intelligence Match Precedence
            reason_codes.append("AUTHORITATIVE_THREAT_INTEL_MATCH")
            verdict = "CRITICAL_THREAT"
            severity = "CRITICAL"
            confidence = 0.99
            explanation = "Authoritative threat intelligence match confirmed active malicious target or payload."
        elif len(threat_sources) >= 4 or len(ml_threat_sources) >= 4:
            # Rule 2: 4-Source Coordinated Attack
            reason_codes.append("FOUR_SOURCE_COORDINATED_ATTACK")
            verdict = "CRITICAL_THREAT"
            severity = "CRITICAL"
            confidence = self._accumulate_confidence(threat_items, base_floor=0.96)
            explanation = (
                f"Full multi-engine convergence: 4 independent detection sources ({', '.join(threat_sources)}) "
                "simultaneously confirmed anomalous and malicious behavior."
            )
        elif len(threat_sources) == 3 or len(ml_threat_sources) == 3:
            # Rule 3: 3-Source Corroborated Threat
            reason_codes.append("THREE_SOURCE_CORROBORATED_THREAT")
            has_crit = any(e.severity.upper() == "CRITICAL" for e in threat_items)
            verdict = "HIGH_CONFIDENCE_THREAT"
            severity = "CRITICAL" if has_crit else "HIGH"
            confidence = self._accumulate_confidence(threat_items, base_floor=0.92)
            explanation = (
                f"High-confidence threat: 3 independent detection sources ({', '.join(threat_sources)}) "
                "corroborated anomalous activity across network, endpoint, and behavioral domains."
            )
        elif len(ml_threat_sources) == 1 and (has_rule or has_scanner):
            # Rule 5: Security Rule or Scanner Corroborated Single Source
            single_src = ml_threat_sources[0]
            reason_codes.append("RULE_CORROBORATED_SINGLE_SOURCE")
            verdict = "HIGH_CONFIDENCE_THREAT"
            severity = "HIGH"
            confidence = max(threat_items[0].confidence, 0.82)
            explanation = (
                f"Single ML model ({single_src}) threat was corroborated by deterministic security rules or passive scanner heuristics."
            )
        elif len(threat_sources) == 2 or len(ml_threat_sources) == 2:
            # Rule 4: 2-Source Cross-Domain Threat
            reason_codes.append("TWO_SOURCE_CORROBORATED_THREAT")
            verdict = "HIGH_CONFIDENCE_THREAT"
            severity = "HIGH"
            confidence = self._accumulate_confidence(threat_items, base_floor=0.86)
            explanation = (
                f"Multi-model cross-domain correlation: 2 independent sources ({', '.join(threat_sources)}) "
                "corroborated suspicious activity targeting the same asset or identity."
            )
        elif len(threat_sources) == 1:
            # Rule 5b: 1-Source Threat
            single_src = threat_sources[0]
            max_threat_sev = max(
                (e.severity.upper() for e in threat_items),
                key=lambda s: self.SEVERITY_WEIGHTS.get(s, 0)
            )

            if has_rule or has_scanner:
                reason_codes.append("RULE_CORROBORATED_SINGLE_SOURCE")
                verdict = "HIGH_CONFIDENCE_THREAT"
                severity = "HIGH"
                confidence = max(threat_items[0].confidence, 0.82)
                explanation = (
                    f"Single ML model ({single_src}) threat was corroborated by deterministic security rules or passive scanner heuristics."
                )
            elif max_threat_sev in ["HIGH", "CRITICAL"]:
                reason_codes.append("ISOLATED_SINGLE_SOURCE_ANOMALY")
                verdict = "SUSPICIOUS"
                severity = "MEDIUM"
                confidence = max(threat_items[0].confidence, 0.70)
                explanation = (
                    f"Isolated single-source detection from {single_src} flagged elevated anomaly. "
                    "Awaiting cross-domain corroboration before escalating to confirmed threat."
                )
            else:
                reason_codes.append("ISOLATED_LOW_SEVERITY_SIGNAL")
                verdict = "LOW_CONFIDENCE"
                severity = "LOW"
                confidence = max(threat_items[0].confidence, 0.55)
                explanation = (
                    f"Low/medium anomaly observed exclusively in {single_src} without external corroboration."
                )
        else:
            # Rule 6: 0 Threat Sources
            if len(benign_items) > 0:
                reason_codes.append("ALL_SOURCES_CLEAN")
                verdict = "BENIGN"
                severity = "INFO"
                confidence = float(sum(e.confidence for e in benign_items) / len(benign_items))
                explanation = (
                    f"All evaluated security models ({', '.join(sources_present)}) reported normal, expected behavior."
                )
            else:
                reason_codes.append("INSUFFICIENT_EVIDENCE")
                verdict = "UNKNOWN"
                severity = "INFO"
                confidence = 0.0
                explanation = "Insufficient telemetry signals across all evaluated models."

        # Check for Conflicting Evidence
        if len(threat_sources) > 0 and len(benign_sources) > 0:
            reason_codes.append("CONFLICTING_EVIDENCE_OBSERVED")

        # 5. Attack Chain Reconstruction
        if verdict in ["HIGH_CONFIDENCE_THREAT", "CRITICAL_THREAT", "SUSPICIOUS"]:
            attack_chain = self._reconstruct_attack_chain(threat_items)

        # 6. Uncertainty Calculation
        # Uncertainty is proportional to missing models and evidence divergence
        coverage_ratio = len(sources_present) / len(self.CORE_DETECTORS)
        uncertainty = round(max(0.0, 1.0 - (confidence * coverage_ratio)), 4)

        return FusionAssessment(
            company_id=resolved_cid,
            verdict=verdict,
            severity=severity,
            confidence=round(confidence, 4),
            uncertainty=uncertainty,
            environment=env_tag,
            sources_present=sources_present,
            sources_missing=sources_missing,
            threat_sources=threat_sources,
            benign_sources=benign_sources,
            primary_entity=primary_entity,
            correlated_entities=correlated_entities,
            attack_chain=attack_chain,
            reason_codes=sorted(list(set(reason_codes))),
            explanation=explanation,
            evaluated_at=eval_time,
        )

    async def process_and_correlate_fusion_event(
        self,
        db: AsyncSession,
        assessment: FusionAssessment,
        source_evidence: List[DetectionEvidence],
        user_id: Optional[str] = None,
        source_ip: Optional[str] = None,
    ) -> Optional[SecurityEvent]:
        """
        Persists a fused SecurityEvent (entity_type="FUSION"), correlates into an Incident
        via IncidentCorrelationEngine, broadcasts tenant-isolated WebSocket alert, and records AuditLog.
        Implements idempotency to ensure repeated calls do not spawn redundant incidents.
        """
        # Idempotency check using assessment ID and evidence hashes
        evidence_keys = sorted([e.id or f"{e.source}:{e.entity_id}" for e in source_evidence])
        fusion_hash = f"{assessment.company_id}:{'-'.join(evidence_keys)}"

        if fusion_hash in self._processed_events:
            logger.info("Skipping duplicate fusion event processing for hash: %s", fusion_hash)
            return None
        self._processed_events.add(fusion_hash)

        now_dt = utc_now()
        sec_event_id = str(uuid.uuid4())
        assessment.security_event_id = sec_event_id

        # 1. Create SecurityEvent
        title_prefix = f"[{assessment.verdict}]"
        if assessment.environment == "SIMULATION":
            title_prefix = f"[SIMULATION] {title_prefix}"

        entity_type = assessment.primary_entity.get("entity_type", "FUSION")
        entity_id = assessment.primary_entity.get("entity_id", "multi-asset-fusion")

        meta_json = {
            "module": "multi_model_detection_fusion",
            "model_version": assessment.model_version,
            "verdict": assessment.verdict,
            "severity": assessment.severity,
            "confidence": assessment.confidence,
            "uncertainty": assessment.uncertainty,
            "environment": assessment.environment,
            "sources_present": assessment.sources_present,
            "threat_sources": assessment.threat_sources,
            "reason_codes": assessment.reason_codes,
            "attack_chain": assessment.attack_chain,
            "contributing_evidence": [
                {
                    "id": e.id,
                    "source": e.source,
                    "entity_id": e.entity_id,
                    "verdict": e.verdict,
                    "severity": e.severity,
                    "confidence": e.confidence
                } for e in source_evidence
            ]
        }

        sec_event = SecurityEvent(
            id=sec_event_id,
            company_id=assessment.company_id,
            event_id=assessment.id,
            rule_id=assessment.reason_codes[0] if assessment.reason_codes else "FUSION-CORRELATED",
            title=f"{title_prefix} Multi-Model Threat Convergence: {entity_id}",
            description=assessment.explanation,
            severity=assessment.severity,
            confidence=assessment.confidence,
            source="multi_model_fusion",
            entity_type=entity_type,
            entity_id=entity_id,
            risk_score=float(self.SEVERITY_WEIGHTS.get(assessment.severity, 50)),
            environment=assessment.environment,
            metadata_json=meta_json,
            timestamp=now_dt,
            created_at=now_dt,
        )
        db.add(sec_event)
        await db.flush()

        # 2. Correlate with Incidents if severity warrants
        correlated_incident = None
        if assessment.verdict in ["HIGH_CONFIDENCE_THREAT", "CRITICAL_THREAT", "SUSPICIOUS"]:
            det_result = DetectionResult(
                id=sec_event_id,
                company_id=assessment.company_id,
                event_id=assessment.id,
                rule_id=sec_event.rule_id,
                title=sec_event.title,
                description=assessment.explanation,
                severity=assessment.severity,
                confidence=assessment.confidence,
                source="multi_model_fusion",
                entity_type=entity_type,
                entity_id=entity_id,
                risk_score=sec_event.risk_score,
                timestamp=now_dt,
                metadata={
                    "environment": assessment.environment,
                    "verdict": assessment.verdict,
                    "threat_sources": assessment.threat_sources,
                    "attack_chain": assessment.attack_chain,
                }
            )
            affected_incidents = await IncidentCorrelationEngine.correlate_detections(
                db=db,
                company_id=assessment.company_id,
                detections=[det_result]
            )
            if affected_incidents:
                correlated_incident = affected_incidents[0]
                assessment.incident_id = correlated_incident.id

        # 3. Broadcast Real-time WebSocket Alert to Tenant Channel
        try:
            await ws_manager.broadcast_to_company(
                company_id=assessment.company_id,
                event_type="fusion_threat_detected",
                data={
                    "id": sec_event.id,
                    "title": sec_event.title,
                    "verdict": assessment.verdict,
                    "severity": assessment.severity,
                    "confidence": assessment.confidence,
                    "uncertainty": assessment.uncertainty,
                    "threat_sources": assessment.threat_sources,
                    "primary_entity": assessment.primary_entity,
                    "attack_chain": assessment.attack_chain,
                    "incident_id": assessment.incident_id,
                    "environment": assessment.environment,
                    "timestamp": now_dt.isoformat(),
                }
            )
        except Exception as ws_err:
            logger.error("Failed to broadcast fusion alert over WebSocket: %s", ws_err)

        # 4. Create Audit Log
        try:
            audit = AuditLog(
                company_id=assessment.company_id,
                user_id=user_id,
                action="MULTI_MODEL_FUSION_EVALUATED",
                result="DETECTED" if assessment.verdict != "BENIGN" else "CLEAN",
                resource_type="fusion",
                resource_id=entity_id,
                ip_address=source_ip,
                metadata_json=json.dumps({
                    "verdict": assessment.verdict,
                    "severity": assessment.severity,
                    "confidence": assessment.confidence,
                    "threat_sources": assessment.threat_sources,
                    "security_event_id": sec_event.id,
                    "incident_id": assessment.incident_id,
                    "environment": assessment.environment,
                }),
                timestamp=now_dt
            )
            db.add(audit)
            await db.commit()
            await db.refresh(sec_event)
        except Exception as audit_err:
            logger.error("Failed to record fusion audit log: %s", audit_err)

        return sec_event

    def get_health_status(self) -> Dict[str, Any]:
        """Diagnostic health telemetry for Module 05."""
        return {
            "status": "HEALTHY" if self.is_loaded else "DEGRADED",
            "module": "multi_model_detection_fusion",
            "model_version": "fusion-v1",
            "engine": "Deterministic Multi-Source Evidence Fusion",
            "supported_sources": list(self.ALL_VALID_SOURCES),
            "core_detectors": self.CORE_DETECTORS,
            "rules_loaded": len(self.rules.get("decision_precedence", [])),
            "zero_imputation_enforced": True,
            "missing_model_handling": "NOT_AVAILABLE (never coerced to safe)",
            "tenant_isolated": True,
            "idempotency_cache_size": len(self._processed_events),
        }

    # ─── Helper Methods ───────────────────────────────────────────────

    def _is_item_threat(self, item: DetectionEvidence) -> bool:
        if item.is_threat:
            return True
        v = (item.verdict or "").upper()
        if any(term in v for term in ["ANOMALY", "ATTACK", "THREAT", "DANGEROUS", "SUSPICIOUS", "MALICIOUS"]):
            return True
        if item.severity.upper() in ["HIGH", "CRITICAL"]:
            return True
        return False

    def _accumulate_confidence(self, items: List[DetectionEvidence], base_floor: float = 0.85) -> float:
        """
        Independent evidence accumulation: C = 1 - product(1 - c_i).
        Bounded by base_floor and 0.999.
        """
        unconf = 1.0
        for item in items:
            c = min(0.99, max(0.1, item.confidence))
            unconf *= (1.0 - c)
        accumulated = 1.0 - unconf
        return float(round(max(base_floor, min(0.999, accumulated)), 4))

    def _analyze_temporal_proximity(self, items: List[DetectionEvidence], reason_codes: List[str]) -> bool:
        """Examines timestamps of contributing events to detect temporal bursts vs dispersed events."""
        timestamps = []
        for it in items:
            try:
                dt = datetime.fromisoformat(it.timestamp.replace("Z", "+00:00"))
                timestamps.append(dt)
            except Exception:
                continue

        if len(timestamps) < 2:
            return False

        timestamps.sort()
        delta_sec = (timestamps[-1] - timestamps[0]).total_seconds()

        if delta_sec <= 7200:  # 2 hours
            reason_codes.append("TEMPORAL_SEQUENCE_DETECTED")
            return True
        elif delta_sec > 86400:  # 24 hours
            reason_codes.append("TEMPORALLY_DISPERSED_EVENTS")
            return False
        return False

    def _correlate_entities(
        self, items: List[DetectionEvidence], reason_codes: List[str]
    ) -> tuple[Dict[str, str], List[Dict[str, str]]]:
        """Identifies primary affected entity and correlated cross-domain entities."""
        entities = []
        user_ids = {it.user_id for it in items if it.user_id}
        device_ids = {it.device_id for it in items if it.device_id}
        ips = {it.ip_address for it in items if it.ip_address}
        entity_ids = {it.entity_id for it in items if it.entity_id}

        if len(user_ids) > 0 and (len(device_ids) > 0 or len(ips) > 0):
            reason_codes.append("CROSS_ENTITY_CORRELATED")

        for it in items:
            entities.append({"entity_type": it.entity_type, "entity_id": it.entity_id})

        primary = entities[0] if entities else {"entity_type": "UNKNOWN", "entity_id": "NONE"}
        # Prioritize USER or ASSET as primary entity if present
        for e in entities:
            if e["entity_type"] in ["USER", "ASSET", "IOT_DEVICE"]:
                primary = e
                break

        unique_correlated = []
        seen = set()
        for e in entities:
            key = f"{e['entity_type']}:{e['entity_id']}"
            if key not in seen:
                seen.add(key)
                unique_correlated.append(e)

        return primary, unique_correlated

    def _reconstruct_attack_chain(self, threat_items: List[DetectionEvidence]) -> List[Dict[str, Any]]:
        """Reconstructs ordered attack sequence across Initial Access -> Execution -> C2/Impact."""
        chain = []
        sources = {t.source.upper(): t for t in threat_items}

        step = 1
        # Step 1: Ingress / Initial Access (URL / Web Phishing)
        if "URL" in sources:
            chain.append({
                "step": step,
                "phase": "Initial Access",
                "source": "URL Detection",
                "entity": sources["URL"].entity_id,
                "details": f"Deceptive or weaponized URL target accessed: {sources['URL'].entity_id}",
            })
            step += 1

        # Step 2: Credential Access / Identity Compromise (UEBA)
        if "UEBA" in sources:
            chain.append({
                "step": step,
                "phase": "Credential Abuse & Insider Activity",
                "source": "UEBA Analytics",
                "entity": sources["UEBA"].user_id or sources["UEBA"].entity_id,
                "details": f"Anomalous authentication burst or after-hours data access by {sources['UEBA'].entity_id}",
            })
            step += 1

        # Step 3: Command & Control / Data Flow (Network Anomaly)
        if "NETWORK" in sources:
            chain.append({
                "step": step,
                "phase": "Command & Control / Exfiltration",
                "source": "Network ML",
                "entity": sources["NETWORK"].entity_id,
                "details": f"High-volume anomalous flow or suspicious protocol signature on {sources['NETWORK'].entity_id}",
            })
            step += 1

        # Step 4: Endpoint / Device Manipulation (IoT Anomaly)
        if "IOT" in sources:
            chain.append({
                "step": step,
                "phase": "Lateral Movement / Device Manipulation",
                "source": "IoT Anomaly ML",
                "entity": sources["IOT"].device_id or sources["IOT"].entity_id,
                "details": f"Anomalous telemetry or firmware beacon deviation on {sources['IOT'].entity_id}",
            })
            step += 1

        return chain


# Singleton instance
ml_fusion_service = MLFusionService.get_instance()
