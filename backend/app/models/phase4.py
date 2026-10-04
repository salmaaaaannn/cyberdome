from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, JSON, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum
from .models import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

# Common base class for multi-tenant tables
class TenantBase(Base):
    __abstract__ = True
    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)

class AgentStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    REVOKED = "REVOKED"

class AgentDevice(TenantBase):
    __tablename__ = "agent_devices"
    hostname = Column(String(255), nullable=False)
    os_type = Column(String(100))
    ip_address = Column(String(100))
    mac_address = Column(String(100))
    status = Column(String(50), default=AgentStatus.OFFLINE)
    last_seen = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utc_now)

class NetworkEvent(TenantBase):
    __tablename__ = "network_events"
    source_ip = Column(String(100), nullable=False, index=True)
    dest_ip = Column(String(100), nullable=False, index=True)
    destination_ip = Column(String(100), nullable=True) # Alias field for full telemetry spec
    source_port = Column(Integer, nullable=True)
    destination_port = Column(Integer, nullable=True)
    protocol = Column(String(50), default="TCP")
    direction = Column(String(20), default="INBOUND") # INBOUND, OUTBOUND, INTERNAL
    bytes = Column(Integer, default=0)
    packets = Column(Integer, default=0)
    event_type = Column(String(100), default="traffic_flow")
    severity = Column(String(20), default="INFO", index=True) # INFO, LOW, MEDIUM, HIGH, CRITICAL
    source = Column(String(100), default="network_sensor")
    action = Column(String(50), default="allow") # alert, block, allow
    signature = Column(String(255), nullable=True)
    bytes_in = Column(Integer, default=0)
    bytes_out = Column(Integer, default=0)
    raw_data = Column(JSON, nullable=True)
    normalized_data = Column(JSON, nullable=True)
    environment = Column(String(50), default="REAL", index=True) # REAL, SIMULATION
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class IoTDevice(TenantBase):
    __tablename__ = "iot_devices"
    device_identifier = Column(String(100), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    device_type = Column(String(100), default="SENSOR")
    ip_address = Column(String(100), nullable=True)
    mac_address = Column(String(100), nullable=True)
    manufacturer = Column(String(150), nullable=True)
    model = Column(String(150), nullable=True)
    firmware_version = Column(String(100), default="1.0.0")
    firmware = Column(String(100), nullable=True) # Spec alias
    status = Column(String(50), default="ONLINE")
    risk_score = Column(Float, default=0.0)
    anomalies = Column(Integer, default=0)
    last_seen = Column(DateTime(timezone=True), default=utc_now)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class UEBAEvent(TenantBase):
    __tablename__ = "behavior_events"
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(100), default="user_action")
    source = Column(String(100), default="ueba_collector")
    ip_address = Column(String(100), nullable=True)
    resource = Column(String(255), nullable=True)
    action = Column(String(150), nullable=False)
    risk_score = Column(Float, default=0.0)
    location = Column(String(255), default="Internal Network")
    details = Column(JSON, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class DetectionRule(Base):
    """Deterministic security detection rule definitions (Global or Tenant-Specific)."""
    __tablename__ = "detection_rules"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    rule_id = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="MEDIUM", nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    event_type = Column(String(100), nullable=False) # network, iot, ueba, auth
    conditions = Column(JSON, nullable=False, default=dict)
    is_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class SecurityEvent(TenantBase):
    """Normalized security events & detections produced by detection engine."""
    __tablename__ = "security_events"
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    event_id = Column(String(100), nullable=True, index=True) # Source telemetry event ID
    rule_id = Column(String(100), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="MEDIUM", nullable=False, index=True)
    confidence = Column(Float, default=1.0)
    source = Column(String(100), default="detection_engine")
    entity_type = Column(String(50), default="ASSET") # ASSET, USER, IP, IOT_DEVICE
    entity_id = Column(String(100), nullable=True)
    risk_score = Column(Float, default=50.0)
    metadata_json = Column(JSON, nullable=True)
    raw_data = Column(JSON, nullable=True)
    environment = Column(String(50), default="REAL", index=True) # REAL, SIMULATION
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class IncidentStatus(str, enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    CONTAINED = "CONTAINED"
    CONTAINMENT = "CONTAINMENT" # Alias
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class IncidentSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Incident(TenantBase):
    __tablename__ = "incidents"
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="MEDIUM", index=True)
    status = Column(String(50), default="OPEN", index=True)
    source = Column(String(100), default="DETECTION_CORRELATION")
    environment = Column(String(50), default="REAL", index=True) # REAL, SIMULATION
    detected_at = Column(DateTime(timezone=True), default=utc_now)
    assignee_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_to = Column(String(255), nullable=True)
    asset_id = Column(String(36), nullable=True)
    risk_score = Column(Float, default=60.0)
    mitre_mapping = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class IncidentEvent(TenantBase):
    __tablename__ = "incident_events"
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), default="STATUS_CHANGE")
    action = Column(String(100), nullable=True)
    actor = Column(String(255), default="System")
    description = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now)

class Report(TenantBase):
    __tablename__ = "reports"
    title = Column(String(255), nullable=False)
    type = Column(String(100), default="EXECUTIVE")
    generated_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="COMPLETED")
    url = Column(String(2048), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class SOARPlaybook(TenantBase):
    __tablename__ = "soar_playbooks"
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    trigger = Column(String(150), nullable=False)
    steps = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class PlaybookExecution(TenantBase):
    __tablename__ = "playbook_executions"
    playbook_id = Column(String(36), ForeignKey("soar_playbooks.id", ondelete="CASCADE"), nullable=False, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(50), default="SUCCESS") # PENDING, RUNNING, SUCCESS, FAILED, CANCELLED
    result = Column(JSON, default=dict)
    actor = Column(String(255), default="SOAR Automation Engine")
    started_at = Column(DateTime(timezone=True), default=utc_now)
    completed_at = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)
