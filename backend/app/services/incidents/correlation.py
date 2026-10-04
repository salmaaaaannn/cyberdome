"""
CYBERDOME — Incident Correlation Engine.
Correlates security detection events across assets, users, and time windows.
Avoids alert fatigue by aggregating related detections into a single traceable Incident
with an audit-ready timeline, instead of creating redundant incidents for every telemetry packet.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import logging

from app.models.phase4 import Incident, IncidentEvent, IncidentStatus
from app.models.models import AuditLog
from app.services.detection.engine import DetectionResult
from app.core.websocket import ws_manager

logger = logging.getLogger("cyberdome.correlation")

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

SEVERITY_ORDER = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}

class IncidentCorrelationEngine:
    @staticmethod
    async def correlate_detections(
        db: AsyncSession,
        company_id: str,
        detections: List[DetectionResult]
    ) -> List[Incident]:
        """
        Process incoming detection results, correlate with open incidents or create new incident candidates.
        """
        if not detections:
            return []

        affected_incidents = []
        time_window = utc_now() - timedelta(hours=2)

        for det in detections:
            # Only correlate noteworthy security detections
            if det.severity.upper() not in ["MEDIUM", "HIGH", "CRITICAL"]:
                continue

            entity_id = det.entity_id or "unknown_entity"

            # 1. Search for existing OPEN or INVESTIGATING incident on this entity in past 2 hours
            stmt = select(Incident).where(
                Incident.company_id == company_id,
                Incident.status.in_(["OPEN", "INVESTIGATING"]),
                (Incident.asset_id == entity_id) | (Incident.title.contains(entity_id)),
                Incident.updated_at >= time_window
            ).order_by(Incident.updated_at.desc())

            res = await db.execute(stmt)
            existing_incident = res.scalars().first()

            if existing_incident:
                # Correlate detection into existing incident timeline
                timeline_entry = IncidentEvent(
                    company_id=company_id,
                    incident_id=existing_incident.id,
                    event_type="DETECTION_CORRELATED",
                    action="DETECTION_CORRELATED",
                    actor="Incident Correlation Engine",
                    description=f"Correlated detection: {det.title} ({det.severity}) via rule {det.rule_id}.",
                    details=det.description,
                    metadata_json={
                        "detection_id": det.id,
                        "rule_id": det.rule_id,
                        "source": det.source,
                        "risk_score": det.risk_score
                    },
                    timestamp=utc_now()
                )
                db.add(timeline_entry)

                # Escalate severity if incoming detection is higher
                curr_rank = SEVERITY_ORDER.get(existing_incident.severity, 1)
                det_rank = SEVERITY_ORDER.get(det.severity.upper(), 1)
                if det_rank > curr_rank:
                    existing_incident.severity = det.severity.upper()

                existing_incident.updated_at = utc_now()
                await db.commit()
                await db.refresh(existing_incident)

                # Notify via WebSocket
                await ws_manager.broadcast_to_company(
                    company_id=company_id,
                    event_type="incident_updated",
                    data={
                        "id": existing_incident.id,
                        "title": existing_incident.title,
                        "severity": existing_incident.severity,
                        "status": existing_incident.status,
                        "environment": getattr(existing_incident, "environment", "REAL") or "REAL",
                        "updated_at": existing_incident.updated_at.isoformat(),
                        "correlated_detection": det.title
                    }
                )
                affected_incidents.append(existing_incident)

            elif det.severity.upper() in ["HIGH", "CRITICAL"]:
                # 2. No open incident found and severity is high/critical -> Create single new incident
                env_tag = (det.metadata.get("environment") or "REAL").upper() if det.metadata else "REAL"
                new_incident = Incident(
                    company_id=company_id,
                    title=f"Incident: {det.title} on {entity_id}",
                    description=det.description or f"Suspicious activity detected matching rule {det.rule_id}.",
                    severity=det.severity.upper(),
                    status="OPEN",
                    source="DETECTION_CORRELATION",
                    environment=env_tag,
                    asset_id=entity_id,
                    risk_score=det.risk_score,
                    detected_at=utc_now(),
                    mitre_mapping=[
                        {"technique": "T1071", "tactic": "Command and Control", "name": "Application Layer Protocol"}
                    ] if "network" in det.source else [
                        {"technique": "T1078", "tactic": "Defense Evasion", "name": "Valid Accounts"}
                    ],
                    created_at=utc_now(),
                    updated_at=utc_now()
                )
                db.add(new_incident)
                await db.flush()

                # Add initial timeline event
                init_event = IncidentEvent(
                    company_id=company_id,
                    incident_id=new_incident.id,
                    event_type="INCIDENT_CREATED",
                    action="INCIDENT_CREATED",
                    actor="Incident Correlation Engine",
                    description=f"Incident opened following detection '{det.title}' on {entity_id}.",
                    details=f"Detection Rule {det.rule_id} triggered with confidence {det.confidence}.",
                    metadata_json={"detection_id": det.id, "rule_id": det.rule_id, "environment": env_tag},
                    timestamp=utc_now()
                )
                db.add(init_event)

                # Create audit log
                audit = AuditLog(
                    company_id=company_id,
                    user_id=None,
                    action="INCIDENT_AUTOMATED_CORRELATION",
                    result="SUCCESS",
                    resource_type="incident",
                    resource_id=new_incident.id,
                    metadata_json=f'{{"rule_id": "{det.rule_id}", "severity": "{det.severity}", "environment": "{env_tag}"}}',
                    timestamp=utc_now()
                )
                db.add(audit)
                await db.commit()
                await db.refresh(new_incident)

                # Notify via WebSocket
                await ws_manager.broadcast_to_company(
                    company_id=company_id,
                    event_type="incident_created",
                    data={
                        "id": new_incident.id,
                        "title": new_incident.title,
                        "severity": new_incident.severity,
                        "status": new_incident.status,
                        "environment": env_tag,
                        "asset_id": new_incident.asset_id,
                        "created_at": new_incident.created_at.isoformat()
                    }
                )

                # Broadcast asset status change so Digital Twin updates immediately
                await ws_manager.broadcast_to_company(
                    company_id=company_id,
                    event_type="asset_status_changed",
                    data={
                        "asset_id": entity_id,
                        "status": "CRITICAL" if det.severity.upper() == "CRITICAL" else "WARNING",
                        "environment": env_tag,
                        "incident_id": new_incident.id
                    }
                )

                affected_incidents.append(new_incident)

        return affected_incidents
