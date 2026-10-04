"""
Phase 2 — Website Security Assessment API.
Manages assessment lifecycle: create, list, get, cancel, progress.
All endpoints enforce company_id tenant isolation.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timezone
import json

from app.core.database import get_db
from app.models.models import User, CompanyUser
from app.models.website_security import (
    WebsiteAssessment, DiscoveredAsset, WebsiteFinding,
    Vulnerability, AssetVulnerability
)
from app.schemas.website_security import (
    AssessmentCreate, AssessmentOut, AssessmentDetail,
    DiscoveredAssetOut, FindingOut, ScanCheckOut,
    VulnerabilityOut, AssetVulnerabilityOut, ScanProgressOut
)
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission, create_audit_entry
)
from app.services import validate_target
from app.services.scan_worker import start_scan, cancel_scan, get_scan_progress

router = APIRouter(prefix="/website-security", tags=["Website Security"])


def _format_assessment(a: WebsiteAssessment) -> dict:
    """Convert assessment model to API response format."""
    return {
        "id": a.id,
        "companyId": a.company_id,
        "createdBy": a.created_by,
        "targetUrl": a.target_url,
        "targetDomain": a.target_domain,
        "status": a.status,
        "authorizationConfirmed": a.authorization_confirmed,
        "scanProgress": a.scan_progress,
        "errorMessage": a.error_message,
        "startedAt": a.started_at.isoformat() if a.started_at else None,
        "completedAt": a.completed_at.isoformat() if a.completed_at else None,
        "createdAt": a.created_at.isoformat(),
        "updatedAt": a.updated_at.isoformat(),
    }


def _format_asset(a: DiscoveredAsset) -> dict:
    return {
        "id": a.id,
        "companyId": a.company_id,
        "assessmentId": a.assessment_id,
        "assetType": a.asset_type,
        "name": a.name,
        "hostname": a.hostname,
        "domain": a.domain,
        "ipAddress": a.ip_address,
        "port": a.port,
        "protocol": a.protocol,
        "technology": a.technology,
        "technologyVersion": a.technology_version,
        "status": a.status,
        "source": a.source,
        "exposure": a.exposure,
        "details": a.details,
        "firstSeen": a.first_seen.isoformat(),
        "lastSeen": a.last_seen.isoformat(),
    }


def _format_finding(f: WebsiteFinding) -> dict:
    return {
        "id": f.id,
        "companyId": f.company_id,
        "assessmentId": f.assessment_id,
        "assetId": f.asset_id,
        "category": f.category,
        "checkName": f.check_name,
        "title": f.title,
        "severity": f.severity,
        "status": f.status,
        "checkStatus": f.check_status,
        "evidence": f.evidence,
        "details": f.details,
        "recommendation": f.recommendation,
        "affectedTarget": f.affected_target,
        "source": f.source,
        "createdAt": f.created_at.isoformat(),
    }


# ─── CREATE ASSESSMENT ────────────────────────────────────────────────
@router.post("/assessments")
async def create_assessment(
    data: AssessmentCreate,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("scanner.run")),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new website security assessment.
    Requires authorization confirmation and scanner.run permission.
    company_id is derived from authenticated user's membership — NEVER from frontend.
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company website security. Use /personal/url-check instead."}
        )

    # Validate target URL
    valid, domain, cleaned_url = validate_target(data.target_url)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_TARGET", "message": f"Invalid target URL: {data.target_url}"}
        )

    # Create assessment — company_id comes from membership, NOT from request body
    assessment = WebsiteAssessment(
        company_id=membership.company_id,
        created_by=user.id,
        target_url=cleaned_url,
        target_domain=domain,
        status="QUEUED",
        authorization_confirmed=True,
        authorized_by=user.id,
        authorization_timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)

    # Audit log
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="WEBSITE_ASSESSMENT_CREATED",
        result="SUCCESS",
        user_id=user.id,
        company_id=membership.company_id,
        resource_type="website_assessment",
        resource_id=assessment.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"target_url": cleaned_url, "domain": domain}
    )
    await create_audit_entry(
        db=db,
        action="TARGET_AUTHORIZED",
        result="SUCCESS",
        user_id=user.id,
        company_id=membership.company_id,
        resource_type="website_assessment",
        resource_id=assessment.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"target_url": cleaned_url, "authorized_by": user.id}
    )

    # Start background scan
    await start_scan(
        assessment_id=assessment.id,
        url=cleaned_url,
        domain=domain,
        company_id=membership.company_id,
        user_id=user.id,
    )

    return success_response(_format_assessment(assessment))


# ─── LIST ASSESSMENTS ─────────────────────────────────────────────────
@router.get("/assessments")
async def list_assessments(
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """List assessments for authenticated user's company only."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company resources."}
        )

    result = await db.execute(
        select(WebsiteAssessment)
        .where(WebsiteAssessment.company_id == membership.company_id)
        .order_by(WebsiteAssessment.created_at.desc())
    )
    assessments = result.scalars().all()
    return success_response([_format_assessment(a) for a in assessments])


# ─── GET ASSESSMENT DETAIL ────────────────────────────────────────────
@router.get("/assessments/{assessment_id}")
async def get_assessment(
    assessment_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Get full assessment detail with assets, findings, and vulnerabilities."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company resources."}
        )

    result = await db.execute(
        select(WebsiteAssessment).where(
            WebsiteAssessment.id == assessment_id,
            WebsiteAssessment.company_id == membership.company_id,
        )
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Assessment not found."})

    # Get assets
    assets_result = await db.execute(
        select(DiscoveredAsset).where(
            DiscoveredAsset.assessment_id == assessment_id,
            DiscoveredAsset.company_id == membership.company_id,
        ).order_by(DiscoveredAsset.created_at)
    )
    assets = assets_result.scalars().all()

    # Get findings
    findings_result = await db.execute(
        select(WebsiteFinding).where(
            WebsiteFinding.assessment_id == assessment_id,
            WebsiteFinding.company_id == membership.company_id,
        ).order_by(WebsiteFinding.created_at)
    )
    findings = findings_result.scalars().all()

    # Get vulnerabilities with their associations
    av_result = await db.execute(
        select(AssetVulnerability).where(
            AssetVulnerability.assessment_id == assessment_id,
            AssetVulnerability.company_id == membership.company_id,
        )
    )
    asset_vulns = av_result.scalars().all()

    # Fetch full vulnerability details
    vuln_list = []
    for av in asset_vulns:
        v_result = await db.execute(
            select(Vulnerability).where(Vulnerability.id == av.vulnerability_id)
        )
        vuln = v_result.scalar_one_or_none()
        if vuln:
            vuln_list.append({
                "id": av.id,
                "companyId": av.company_id,
                "assetId": av.asset_id,
                "vulnerabilityId": av.vulnerability_id,
                "assessmentId": av.assessment_id,
                "status": av.status,
                "evidence": av.evidence,
                "firstSeen": av.first_seen.isoformat(),
                "lastSeen": av.last_seen.isoformat(),
                "vulnerability": {
                    "id": vuln.id,
                    "cveId": vuln.cve_id,
                    "title": vuln.title,
                    "description": vuln.description,
                    "severity": vuln.severity,
                    "cvssScore": vuln.cvss_score,
                    "cvssVector": vuln.cvss_vector,
                    "epssScore": vuln.epss_score,
                    "kevStatus": vuln.kev_status,
                    "affectedProduct": vuln.affected_product,
                    "affectedVersion": vuln.affected_version,
                    "fixedVersion": vuln.fixed_version,
                    "references": vuln.references,
                    "publishedAt": vuln.published_at.isoformat() if vuln.published_at else None,
                    "source": vuln.source,
                },
            })

    # Build checks list from findings (matching frontend WebsiteScanCheck interface)
    checks = []
    for f in findings:
        checks.append({
            "id": f.id,
            "name": f.check_name,
            "category": f.category,
            "status": f.check_status,
            "details": f.details or f.evidence or "",
        })

    # Build recommendations from findings with recommendations
    recommendations = []
    for f in findings:
        if f.recommendation and f.check_status in ("FAIL", "WARN"):
            recommendations.append(f.recommendation)

    # Count by type
    asset_types = {}
    for a in assets:
        asset_types[a.asset_type] = asset_types.get(a.asset_type, 0) + 1

    # Count findings by severity
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    for f in findings:
        if f.check_status in ("FAIL", "WARN"):
            severity_counts[f.severity] = severity_counts.get(f.severity, 0) + 1

    # Also count from vulnerabilities
    for v in vuln_list:
        vuln_data = v.get("vulnerability", {})
        sev = vuln_data.get("severity", "MEDIUM")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    # Count checks
    total_checks = len(checks)
    passed_checks = sum(1 for c in checks if c["status"] == "PASS")
    finding_checks = total_checks - passed_checks

    response = _format_assessment(assessment)
    response["totalObservableAssets"] = len(assets)
    response["subdomainsCount"] = asset_types.get("SUBDOMAIN", 0)
    response["servicesCount"] = asset_types.get("SERVICE", 0)
    response["technologiesCount"] = asset_types.get("TECHNOLOGY", 0)
    response["findingsCount"] = severity_counts
    response["checksCount"] = {
        "total": total_checks,
        "passed": passed_checks,
        "findings": finding_checks,
    }
    response["assets"] = [_format_asset(a) for a in assets]
    response["findings"] = [_format_finding(f) for f in findings]
    response["vulnerabilities"] = vuln_list
    response["checks"] = checks
    response["recommendations"] = recommendations
    response["isDemo"] = False

    return success_response(response)


# ─── CANCEL ASSESSMENT ────────────────────────────────────────────────
@router.post("/assessments/{assessment_id}/cancel")
async def cancel_assessment(
    assessment_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("scanner.run")),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a running assessment scan."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company resources."}
        )

    # Verify assessment belongs to company
    result = await db.execute(
        select(WebsiteAssessment).where(
            WebsiteAssessment.id == assessment_id,
            WebsiteAssessment.company_id == membership.company_id,
        )
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Assessment not found."})

    if assessment.status not in ("QUEUED", "RUNNING"):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_STATE", "message": f"Cannot cancel assessment in '{assessment.status}' state."}
        )

    cancelled = await cancel_scan(assessment_id)
    if not cancelled:
        assessment.status = "CANCELLED"
        assessment.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="WEBSITE_SCAN_CANCELLED",
        result="SUCCESS",
        user_id=user.id,
        company_id=membership.company_id,
        resource_type="website_assessment",
        resource_id=assessment_id,
        ip_address=ip,
        user_agent=ua,
    )

    return success_response({"message": "Assessment cancelled.", "id": assessment_id})


# ─── SCAN PROGRESS (Polling) ─────────────────────────────────────────
@router.get("/assessments/{assessment_id}/progress")
async def get_assessment_progress(
    assessment_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Get real-time scan progress for an assessment."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company resources."}
        )

    # Verify ownership
    result = await db.execute(
        select(WebsiteAssessment).where(
            WebsiteAssessment.id == assessment_id,
            WebsiteAssessment.company_id == membership.company_id,
        )
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Assessment not found."})

    # Try in-memory progress first (real-time), fall back to DB
    progress = get_scan_progress(assessment_id)
    if not progress:
        # Build from assessment record
        sp = assessment.scan_progress or {}
        progress = {
            "status": assessment.status,
            "current_step": sp.get("current_step"),
            "completed_steps": sp.get("completed", []),
            "pending_steps": sp.get("pending", []),
            "progress": sp.get("progress", 100 if assessment.status == "COMPLETED" else 0),
            "error_message": assessment.error_message,
        }

    return success_response({
        "assessmentId": assessment_id,
        **progress,
    })
