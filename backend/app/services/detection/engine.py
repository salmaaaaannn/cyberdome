"""
CYBERDOME — Deterministic Detection Engine.
Evaluates normalized security events against deterministic, explainable security rules.
NO black-box or opaque ML. Every detection contains an explainable reason.
Persists matched detections as SecurityEvents and emits real-time WebSocket alerts.
"""
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import uuid
import logging
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.phase4 import DetectionRule, SecurityEvent
from app.core.websocket import ws_manager

logger = logging.getLogger("cyberdome.detection")

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

class DetectionResult(BaseModel):
    id: str
    company_id: str
    event_id: Optional[str] = None
    rule_id: str
    title: str
    description: str
    severity: str
    confidence: float
    source: str
    entity_type: str
    entity_id: Optional[str] = None
    risk_score: float
    timestamp: datetime
    metadata: Dict[str, Any]

# Standard baseline deterministic rules loaded automatically if DB rules not yet seeded
BASELINE_RULES = [
    {
        "rule_id": "RULE-NET-001",
        "name": "Unusual Port Activity",
        "description": "Traffic flow targeted high-risk unauthorized or administrative ports (4444, 1337, 31337, 6667, 8888, 9001).",
        "severity": "HIGH",
        "event_type": "network",
        "conditions": {"ports": [4444, 1337, 31337, 6667, 8888, 9001]}
    },
    {
        "rule_id": "RULE-NET-002",
        "name": "Known Malicious Indicator / C2 Signature",
        "description": "Network payload signature matched known adversary C2 beacon or intrusion signature.",
        "severity": "CRITICAL",
        "event_type": "network",
        "conditions": {"action": "alert"}
    },
    {
        "rule_id": "RULE-NET-003",
        "name": "Suspicious Network Connection",
        "description": "Automated firewall blocked unauthorized cross-segment or ingress network packet flow.",
        "severity": "HIGH",
        "event_type": "network",
        "conditions": {"action": "block"}
    },
    {
        "rule_id": "RULE-AUTH-001",
        "name": "Repeated Failed Login Attempts",
        "description": "Consecutive authentication failures or credential spray signature identified.",
        "severity": "HIGH",
        "event_type": "auth",
        "conditions": {"keywords": ["failed_login", "failed_mfa", "brute_force", "password_spray"]}
    },
    {
        "rule_id": "RULE-UEBA-001",
        "name": "Abnormal Login Behavior / Impossible Travel",
        "description": "Session established across distant geographic coordinates faster than physical travel speeds.",
        "severity": "CRITICAL",
        "event_type": "ueba",
        "conditions": {"flag": "impossible_travel"}
    },
    {
        "rule_id": "RULE-UEBA-002",
        "name": "Privilege Escalation Attempt",
        "description": "Unauthorized administrative elevation command execution (sudo / admin role alteration / shadow copy).",
        "severity": "CRITICAL",
        "event_type": "ueba",
        "conditions": {"keywords": ["sudo", "privilege_escalation", "admin_role_grant", "pass_the_hash", "mimikatz"]}
    },
    {
        "rule_id": "RULE-UEBA-003",
        "name": "Unusual Access Pattern / Data Exfiltration",
        "description": "Bulk data export or unexpected volume exfiltration beyond user standard baseline.",
        "severity": "HIGH",
        "event_type": "ueba",
        "conditions": {"keywords": ["bulk_download", "mass_export", "exfiltration", "data_dump"]}
    },
    {
        "rule_id": "RULE-IOT-001",
        "name": "IoT Device Anomaly",
        "description": "Connected smart or OT device registered anomalous telemetry or unexpected communication behavior.",
        "severity": "HIGH",
        "event_type": "iot",
        "conditions": {"min_anomalies": 1}
    },
]

class DetectionEngine:
    @staticmethod
    async def evaluate_event(
        db: AsyncSession,
        normalized_event: Dict[str, Any]
    ) -> List[DetectionResult]:
        """
        Evaluate a normalized telemetry event against deterministic detection rules.
        Saves matched detections to database and dispatches real-time WebSocket alerts.
        """
        company_id = normalized_event["company_id"]
        source = normalized_event.get("source", "")
        meta = normalized_event.get("metadata", {})
        results: List[DetectionResult] = []

        # 1. Fetch enabled rules for company (or global rules with company_id is NULL)
        stmt = select(DetectionRule).where(
            (DetectionRule.company_id == company_id) | (DetectionRule.company_id.is_(None)),
            DetectionRule.is_enabled == True
        )
        res = await db.execute(stmt)
        rules = res.scalars().all()

        active_rules = []
        if rules:
            for r in rules:
                active_rules.append({
                    "rule_id": r.rule_id,
                    "name": r.name,
                    "description": r.description,
                    "severity": r.severity,
                    "event_type": r.event_type,
                    "conditions": r.conditions or {}
                })
        else:
            active_rules = BASELINE_RULES

        # 2. Rule evaluation logic
        for rule in active_rules:
            matched = False
            rule_id = rule["rule_id"]

            if source == "network" and rule["event_type"] == "network":
                # Check ports
                dest_port = meta.get("dest_port")
                src_port = meta.get("source_port")
                target_ports = rule["conditions"].get("ports", [])
                if target_ports and ((dest_port in target_ports) or (src_port in target_ports)):
                    matched = True

                # Check action (alert/block)
                req_action = rule["conditions"].get("action")
                if req_action and meta.get("action", "").lower() == req_action.lower():
                    matched = True

                # Check signature
                sig = (meta.get("signature") or "").lower()
                if sig and any(k in sig for k in ["c2", "beacon", "exploit", "trojan", "malware", "shell", "probe", "scan"]):
                    matched = True

            elif source == "ueba" and rule["event_type"] in ["ueba", "auth"]:
                action_text = (meta.get("action") or "").lower()
                details = meta.get("details") or {}
                keywords = rule["conditions"].get("keywords", [])

                if any(k in action_text for k in keywords):
                    matched = True
                if rule["conditions"].get("flag") == "impossible_travel" and (details.get("impossible_travel") or "impossible" in action_text):
                    matched = True

            elif source == "iot" and rule["event_type"] == "iot":
                anomalies = meta.get("anomalies", 0)
                min_anom = rule["conditions"].get("min_anomalies", 1)
                if anomalies >= min_anom or normalized_event.get("severity") in ["HIGH", "CRITICAL"]:
                    matched = True

            if matched:
                det_id = str(uuid.uuid4())
                detection = DetectionResult(
                    id=det_id,
                    company_id=company_id,
                    event_id=normalized_event.get("id"),
                    rule_id=rule_id,
                    title=rule["name"],
                    description=rule["description"],
                    severity=rule["severity"],
                    confidence=1.0,
                    source=f"rule_engine:{rule_id}",
                    entity_type=normalized_event.get("entity_type", "ASSET"),
                    entity_id=normalized_event.get("entity_id"),
                    risk_score=normalized_event.get("risk_score", 70.0),
                    timestamp=utc_now(),
                    metadata={
                        "rule_name": rule["name"],
                        "matched_conditions": rule["conditions"],
                        "telemetry_source": source,
                        "evidence": meta
                    }
                )
                results.append(detection)

                # Persist detection in database
                sec_event = SecurityEvent(
                    id=det_id,
                    company_id=company_id,
                    event_id=detection.event_id,
                    rule_id=detection.rule_id,
                    title=detection.title,
                    description=detection.description,
                    severity=detection.severity,
                    confidence=detection.confidence,
                    source=detection.source,
                    entity_type=detection.entity_type,
                    entity_id=detection.entity_id,
                    risk_score=detection.risk_score,
                    metadata_json=detection.metadata,
                    raw_data=normalized_event.get("raw_data"),
                    timestamp=detection.timestamp,
                )
                db.add(sec_event)

                # Emit real-time WebSocket event to the tenant
                await ws_manager.broadcast_to_company(
                    company_id=company_id,
                    event_type="detection_created",
                    data={
                        "id": detection.id,
                        "rule_id": detection.rule_id,
                        "title": detection.title,
                        "severity": detection.severity,
                        "entity_id": detection.entity_id,
                        "timestamp": detection.timestamp.isoformat(),
                        "description": detection.description,
                    }
                )

        if results:
            await db.commit()

        return results
