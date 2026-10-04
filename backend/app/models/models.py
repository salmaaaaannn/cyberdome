import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, ForeignKey,
    UniqueConstraint, Index, Float, Integer, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None).replace(tzinfo=None)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    account_type = Column(String(20), default="PERSONAL", nullable=False) # 'PERSONAL' or 'COMPANY'
    status = Column(String(20), default="ACTIVE", nullable=False) # 'ACTIVE', 'SUSPENDED', 'PENDING', 'LOCKED'
    email_verified = Column(Boolean, default=False, nullable=False)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    mfa_secret = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    last_login_at = Column(DateTime, nullable=True)

    # Relationships
    company_memberships = relationship("CompanyUser", back_populates="user", cascade="all, delete-orphan")
    notification_preferences = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Company(Base):
    __tablename__ = "companies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_name = Column(String(255), nullable=False)
    domain = Column(String(255), unique=True, index=True, nullable=False)
    industry = Column(String(100), nullable=True)
    size = Column(String(50), nullable=True)
    security_contact = Column(String(255), nullable=True)
    access_code_hash = Column(String(255), nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False) # 'ACTIVE', 'SUSPENDED', 'PENDING'
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    members = relationship("CompanyUser", back_populates="company", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="company", cascade="all, delete-orphan")
    invitations = relationship("Invitation", back_populates="company", cascade="all, delete-orphan")

class CompanyUser(Base):
    __tablename__ = "company_users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), default="EMPLOYEE", nullable=False) # 'ADMIN', 'MANAGER', 'EMPLOYEE'
    status = Column(String(20), default="ACTIVE", nullable=False) # 'ACTIVE', 'SUSPENDED', 'INVITED', 'DEACTIVATED'
    department = Column(String(100), nullable=True)
    
    # Employee Risk Engine Data
    risk_score = Column(Float, default=0.0, nullable=False)
    risk_level = Column(String(20), default="SECURE", nullable=False) # SECURE, LOW, MEDIUM, HIGH, CRITICAL
    calculated_at = Column(DateTime, nullable=True)
    evidence_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("company_id", "user_id", name="uq_company_user"),
    )

    company = relationship("Company", back_populates="members")
    user = relationship("User", back_populates="company_memberships")

class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False)
    role = Column(String(20), default="EMPLOYEE", nullable=False) # 'ADMIN', 'EMPLOYEE'
    token = Column(String(100), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=True)
    status = Column(String(20), default="PENDING", nullable=False) # 'PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'
    expires_at = Column(DateTime, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    company = relationship("Company", back_populates="invitations")

class Asset(Base):
    __tablename__ = "assets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    asset_type = Column(String(50), nullable=False) # 'WEBSITE', 'DOMAIN', 'SERVER', 'DATABASE', 'APPLICATION', 'CLOUD', 'IOT_DEVICE', 'NETWORK'
    hostname = Column(String(255), nullable=True)
    ip_address = Column(String(100), nullable=True)
    domain = Column(String(255), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)
    criticality = Column(String(50), default="HIGH", nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    company = relationship("Company", back_populates="assets")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=True, index=True)
    company_id = Column(String(36), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=True)
    resource_id = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    result = Column(String(20), nullable=False) # 'SUCCESS', 'DENIED', 'FAILED'
    metadata_json = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=False, index=True)
    company_id = Column(String(36), nullable=True, index=True) # Null for Normal Users
    type = Column(String(50), nullable=False) # 'ALERT', 'SECURITY', 'SYSTEM', 'TRAINING'
    severity = Column(String(50), nullable=False) # 'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    channel = Column(String(20), default="WEB", nullable=False) # 'WEB', 'EMAIL', 'SMS'
    status = Column(String(20), default="UNREAD", nullable=False) # 'UNREAD', 'READ', 'ARCHIVED'
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    email_alerts = Column(Boolean, default=True, nullable=False)
    sms_alerts = Column(Boolean, default=False, nullable=False)
    web_alerts = Column(Boolean, default=True, nullable=False)
    critical_only = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="notification_preferences")

class EmployeeSecuritySimulation(Base):
    __tablename__ = "employee_security_simulations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False) # 'EMAIL', 'MESSAGE'
    target_users = Column(JSON, nullable=False) # List of user IDs or groups
    content = Column(Text, nullable=False) # Payload/Template
    status = Column(String(20), default="DRAFT", nullable=False) # 'DRAFT', 'RUNNING', 'COMPLETED', 'CANCELED'
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

class SimulationEvent(Base):
    __tablename__ = "simulation_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    simulation_id = Column(String(36), ForeignKey("employee_security_simulations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False) # 'SIMULATION_SENT', 'DELIVERED', 'OPENED', 'LINK_CLICKED', 'REPORTED', 'IGNORED'
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)
