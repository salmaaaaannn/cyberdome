"""
Phase 2 — Pydantic schemas for Website Security, Attack Surface, Vulnerability Intelligence.
"""
from pydantic import BaseModel, HttpUrl, field_validator
from typing import Optional, List, Any, Dict
from datetime import datetime


# ─── Assessment Schemas ───────────────────────────────────────────────
class AssessmentCreate(BaseModel):
    target_url: str
    authorization_confirmed: bool = False

    @field_validator("target_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            v = "https://" + v
        return v

    @field_validator("authorization_confirmed")
    @classmethod
    def must_confirm(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must confirm authorization to assess the target.")
        return v


class AssessmentOut(BaseModel):
    id: str
    companyId: str
    createdBy: Optional[str] = None
    targetUrl: str
    targetDomain: str
    status: str
    authorizationConfirmed: bool
    scanProgress: Optional[Dict[str, Any]] = None
    errorMessage: Optional[str] = None
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None
    createdAt: str
    updatedAt: str


class AssessmentDetail(AssessmentOut):
    """Full assessment with nested results."""
    assets: List["DiscoveredAssetOut"] = []
    findings: List["FindingOut"] = []
    vulnerabilities: List["AssetVulnerabilityOut"] = []
    checks: List["ScanCheckOut"] = []
    recommendations: List[str] = []


# ─── Discovered Asset Schemas ─────────────────────────────────────────
class DiscoveredAssetOut(BaseModel):
    id: str
    companyId: str
    assessmentId: str
    assetType: str
    name: str
    hostname: Optional[str] = None
    domain: Optional[str] = None
    ipAddress: Optional[str] = None
    port: Optional[int] = None
    protocol: Optional[str] = None
    technology: Optional[str] = None
    technologyVersion: Optional[str] = None
    status: str
    source: str
    exposure: str
    details: Optional[str] = None
    firstSeen: str
    lastSeen: str


# ─── Finding Schemas ──────────────────────────────────────────────────
class FindingOut(BaseModel):
    id: str
    companyId: str
    assessmentId: str
    assetId: Optional[str] = None
    category: str
    checkName: str
    title: str
    severity: str
    status: str
    checkStatus: str
    evidence: Optional[str] = None
    details: Optional[str] = None
    recommendation: Optional[str] = None
    affectedTarget: Optional[str] = None
    source: str
    createdAt: str


class ScanCheckOut(BaseModel):
    """Matches the frontend WebsiteScanCheck interface."""
    id: str
    name: str
    category: str
    status: str  # PASS, WARN, FAIL
    details: str


# ─── Vulnerability Schemas ────────────────────────────────────────────
class VulnerabilityOut(BaseModel):
    id: str
    cveId: str
    title: str
    description: Optional[str] = None
    severity: str
    cvssScore: Optional[float] = None
    cvssVector: Optional[str] = None
    epssScore: Optional[float] = None
    kevStatus: bool = False
    affectedProduct: Optional[str] = None
    affectedVersion: Optional[str] = None
    fixedVersion: Optional[str] = None
    references: Optional[List[str]] = None
    publishedAt: Optional[str] = None
    source: str


class AssetVulnerabilityOut(BaseModel):
    id: str
    companyId: str
    assetId: str
    vulnerabilityId: str
    assessmentId: str
    status: str
    evidence: Optional[str] = None
    firstSeen: str
    lastSeen: str
    vulnerability: Optional[VulnerabilityOut] = None
    assetName: Optional[str] = None


# ─── Scan Progress (for WebSocket / polling) ──────────────────────────
class ScanProgressOut(BaseModel):
    assessmentId: str
    status: str
    currentStep: Optional[str] = None
    completedSteps: List[str] = []
    pendingSteps: List[str] = []
    progress: int = 0  # 0-100
    errorMessage: Optional[str] = None
