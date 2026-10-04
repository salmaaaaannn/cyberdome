"""
CYBERDOME — Telemetry Normalization Layer.
Normalizes diverse raw telemetry (network, IoT, behavioral) into a standardized
security event model for deterministic detection rules and incident correlation.
Preserves raw data for forensic investigation without data loss.
"""
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import uuid

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

class TelemetryNormalizer:
    @staticmethod
    def normalize_network_event(
        company_id: str,
        source_ip: str,
        dest_ip: str,
        protocol: str = "TCP",
        action: str = "allow",
        severity: str = "INFO",
        source_port: Optional[int] = None,
        dest_port: Optional[int] = None,
        bytes_count: int = 0,
        packets: int = 0,
        signature: Optional[str] = None,
        raw_data: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Convert network packet/flow telemetry into normalized security event."""
        ts = timestamp or utc_now()
        ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts)
        
        # Calculate baseline risk score based on action, severity, and signature presence
        risk_score = 10.0
        sev_upper = severity.upper()
        if sev_upper == "CRITICAL":
            risk_score = 90.0
        elif sev_upper == "HIGH":
            risk_score = 75.0
        elif sev_upper == "MEDIUM":
            risk_score = 50.0
        elif sev_upper == "LOW":
            risk_score = 25.0

        if action.lower() in ["alert", "block"]:
            risk_score = max(risk_score, 65.0)

        # High risk ports
        suspicious_ports = {4444, 1337, 31337, 6667, 8888, 9001}
        if (dest_port and dest_port in suspicious_ports) or (source_port and source_port in suspicious_ports):
            risk_score = max(risk_score, 80.0)

        return {
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "timestamp": ts_str,
            "source": "network",
            "event_type": "network_traffic",
            "severity": sev_upper,
            "entity_type": "IP",
            "entity_id": dest_ip,
            "risk_score": float(risk_score),
            "metadata": {
                "source_ip": source_ip,
                "dest_ip": dest_ip,
                "source_port": source_port,
                "dest_port": dest_port,
                "protocol": protocol.upper() if protocol else "TCP",
                "action": action.lower() if action else "allow",
                "signature": signature,
                "bytes": bytes_count,
                "packets": packets,
            },
            "raw_data": raw_data or {
                "source_ip": source_ip,
                "dest_ip": dest_ip,
                "protocol": protocol,
                "action": action,
                "signature": signature,
            }
        }

    @staticmethod
    def normalize_iot_event(
        company_id: str,
        device_id: str,
        device_name: str,
        device_type: str,
        ip_address: Optional[str] = None,
        event_type: str = "iot_telemetry",
        severity: str = "INFO",
        anomalies: int = 0,
        firmware: Optional[str] = None,
        raw_data: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Convert IoT device telemetry and heartbeat into normalized event."""
        ts = timestamp or utc_now()
        ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts)
        risk_score = min(100.0, 15.0 + (anomalies * 25.0))
        if severity.upper() in ["HIGH", "CRITICAL"]:
            risk_score = max(risk_score, 80.0)

        return {
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "timestamp": ts_str,
            "source": "iot",
            "event_type": event_type,
            "severity": severity.upper(),
            "entity_type": "IOT_DEVICE",
            "entity_id": device_id,
            "risk_score": float(risk_score),
            "metadata": {
                "device_id": device_id,
                "device_name": device_name,
                "device_type": device_type,
                "ip_address": ip_address,
                "firmware": firmware,
                "anomalies": anomalies,
            },
            "raw_data": raw_data or {
                "device_id": device_id,
                "device_name": device_name,
                "anomalies": anomalies,
            }
        }

    @staticmethod
    def normalize_behavior_event(
        company_id: str,
        user_id: Optional[str],
        action: str,
        risk_score: float = 0.0,
        location: Optional[str] = None,
        ip_address: Optional[str] = None,
        resource: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Convert user or service account behavior into normalized security event."""
        ts = timestamp or utc_now()
        ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts)
        
        severity = "INFO"
        if risk_score >= 80.0:
            severity = "CRITICAL"
        elif risk_score >= 60.0:
            severity = "HIGH"
        elif risk_score >= 40.0:
            severity = "MEDIUM"
        elif risk_score >= 20.0:
            severity = "LOW"

        return {
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "timestamp": ts_str,
            "source": "ueba",
            "event_type": "user_behavior",
            "severity": severity,
            "entity_type": "USER",
            "entity_id": user_id or "anonymous",
            "risk_score": float(risk_score),
            "metadata": {
                "action": action,
                "location": location or "Internal Network",
                "ip_address": ip_address,
                "resource": resource,
                "details": details or {},
            },
            "raw_data": {
                "user_id": user_id,
                "action": action,
                "location": location,
                "details": details,
            }
        }
