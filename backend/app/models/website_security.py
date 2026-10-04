"""
Phase 2 — Website Security, Attack Surface, and Vulnerability Intelligence Models.
All records are company-scoped via company_id for multi-tenant isolation.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, Float, Integer,
    ForeignKey, Index, UniqueConstraint, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class WebsiteAssessment(Base):
    """Unified assessment container linking target, attack surface, scanner, and vulns."""
    __tablename__ = "website_assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_url = Column(String(2048), nullable=False)
    target_domain = Column(String(255), nullable=False, index=True)
    status = Column(String(20), default="QUEUED", nullable=False)  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    authorization_confirmed = Column(Boolean, default=False, nullable=False)
    authorized_by = Column(String(36), nullable=True)
    authorization_timestamp = Column(DateTime, nullable=True)
    # Scan progress tracking
    scan_progress = Column(JSON, nullable=True)  # {"step": "dns", "completed": ["target_validation", "dns"], "pending": [...]}
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    discovered_assets = relationship("DiscoveredAsset", back_populates="assessment", cascade="all, delete-orphan")
    findings = relationship("WebsiteFinding", back_populates="assessment", cascade="all, delete-orphan")
    asset_vulnerabilities = relationship("AssetVulnerability", back_populates="assessment", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_assessment_company_created", "company_id", "created_at"),
        Index("ix_assessment_company_status", "company_id", "status"),
        Index("ix_assessment_company_domain", "company_id", "target_domain"),
    )


class DiscoveredAsset(Base):
    """Assets discovered during attack surface analysis — subdomains, IPs, services, technologies, certs."""
    __tablename__ = "discovered_assets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    assessment_id = Column(String(36), ForeignKey("website_assessments.id", ondelete="CASCADE"), nullable=False)
    asset_type = Column(String(50), nullable=False)  # DOMAIN, SUBDOMAIN, IP, SERVICE, ENDPOINT, WEBSITE, CERTIFICATE, TECHNOLOGY
    name = Column(String(512), nullable=False)
    hostname = Column(String(255), nullable=True)
    domain = Column(String(255), nullable=True)
    ip_address = Column(String(100), nullable=True)
    port = Column(Integer, nullable=True)
    protocol = Column(String(20), nullable=True)  # tcp, udp, https, http
    technology = Column(String(255), nullable=True)
    technology_version = Column(String(100), nullable=True)
    status = Column(String(20), default="ACTIVE", nullable=False)
    source = Column(String(50), default="SCANNER", nullable=False)  # SCANNER, DNS, TLS, HTTP
    exposure = Column(String(20), default="PUBLIC", nullable=False)  # PUBLIC, RESTRICTED, INTERNAL
    details = Column(Text, nullable=True)
    first_seen = Column(DateTime, default=utc_now, nullable=False)
    last_seen = Column(DateTime, default=utc_now, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    assessment = relationship("WebsiteAssessment", back_populates="discovered_assets")
    vulnerabilities = relationship("AssetVulnerability", back_populates="asset", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_dasset_company", "company_id"),
        Index("ix_dasset_assessment", "assessment_id"),
        Index("ix_dasset_company_type", "company_id", "asset_type"),
        Index("ix_dasset_domain", "domain"),
    )


class WebsiteFinding(Base):
    """Scanner findings — security header issues, TLS misconfigs, cookie problems, etc."""
    __tablename__ = "website_findings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    assessment_id = Column(String(36), ForeignKey("website_assessments.id", ondelete="CASCADE"), nullable=False)
    asset_id = Column(String(36), ForeignKey("discovered_assets.id", ondelete="SET NULL"), nullable=True)
    category = Column(String(50), nullable=False)  # HTTPS, TLS, CERTIFICATE, HEADERS, DNS, COOKIES, REDIRECT, TECHNOLOGY
    check_name = Column(String(255), nullable=False)
    title = Column(String(512), nullable=False)
    severity = Column(String(20), nullable=False)  # INFO, LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(20), default="OPEN", nullable=False)  # OPEN, IN_REVIEW, RESOLVED, FALSE_POSITIVE
    check_status = Column(String(10), default="FAIL", nullable=False)  # PASS, WARN, FAIL
    evidence = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    affected_target = Column(String(512), nullable=True)
    source = Column(String(50), default="SCANNER", nullable=False)  # SCANNER, VULNERABILITY, ATTACK_SURFACE
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    assessment = relationship("WebsiteAssessment", back_populates="findings")

    __table_args__ = (
        Index("ix_finding_company", "company_id"),
        Index("ix_finding_assessment", "assessment_id"),
        Index("ix_finding_company_severity", "company_id", "severity"),
        Index("ix_finding_company_status", "company_id", "status"),
    )


class Vulnerability(Base):
    """Global vulnerability knowledge base — CVE/CVSS/EPSS/KEV data. NOT company-scoped."""
    __tablename__ = "vulnerabilities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    cve_id = Column(String(30), unique=True, index=True, nullable=False)
    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), nullable=False)  # INFO, LOW, MEDIUM, HIGH, CRITICAL
    cvss_score = Column(Float, nullable=True)
    cvss_vector = Column(String(255), nullable=True)
    epss_score = Column(Float, nullable=True)
    kev_status = Column(Boolean, default=False, nullable=False)  # CISA Known Exploited Vulnerabilities
    affected_product = Column(String(255), nullable=True)
    affected_version = Column(String(255), nullable=True)
    fixed_version = Column(String(255), nullable=True)
    references = Column(JSON, nullable=True)  # List of reference URLs
    published_at = Column(DateTime, nullable=True)
    modified_at = Column(DateTime, nullable=True)
    source = Column(String(50), default="NVD", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    asset_associations = relationship("AssetVulnerability", back_populates="vulnerability", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_vuln_severity", "severity"),
        Index("ix_vuln_cve", "cve_id"),
    )


class AssetVulnerability(Base):
    """Company-scoped association between a discovered asset and a known vulnerability."""
    __tablename__ = "asset_vulnerabilities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    asset_id = Column(String(36), ForeignKey("discovered_assets.id", ondelete="CASCADE"), nullable=False)
    vulnerability_id = Column(String(36), ForeignKey("vulnerabilities.id", ondelete="CASCADE"), nullable=False)
    assessment_id = Column(String(36), ForeignKey("website_assessments.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="OPEN", nullable=False)  # OPEN, IN_REVIEW, RESOLVED, FALSE_POSITIVE
    evidence = Column(Text, nullable=True)
    first_seen = Column(DateTime, default=utc_now, nullable=False)
    last_seen = Column(DateTime, default=utc_now, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    asset = relationship("DiscoveredAsset", back_populates="vulnerabilities")
    vulnerability = relationship("Vulnerability", back_populates="asset_associations")
    assessment = relationship("WebsiteAssessment", back_populates="asset_vulnerabilities")

    __table_args__ = (
        Index("ix_av_company", "company_id"),
        Index("ix_av_company_assessment", "company_id", "assessment_id"),
        Index("ix_av_asset", "asset_id"),
        UniqueConstraint("asset_id", "vulnerability_id", "assessment_id", name="uq_asset_vuln_assessment"),
    )
