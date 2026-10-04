"""
Phase 2 — Background Scan Worker.
Manages scan job lifecycle, persists results to database.
Uses asyncio.create_task for non-blocking scan execution.
"""
import asyncio
import logging
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import AsyncSessionLocal
from app.models.website_security import (
    WebsiteAssessment, DiscoveredAsset, WebsiteFinding,
    Vulnerability, AssetVulnerability
)
from app.models.models import AuditLog
from app.services import run_full_scan, SCAN_STEPS

logger = logging.getLogger("cyberdome.scan_worker")

# In-memory store for active scan tasks (assessment_id -> asyncio.Task)
_active_scans: Dict[str, asyncio.Task] = {}

# In-memory scan progress store for polling
_scan_progress: Dict[str, Dict[str, Any]] = {}


def get_scan_progress(assessment_id: str) -> Optional[Dict[str, Any]]:
    """Get current scan progress for polling."""
    return _scan_progress.get(assessment_id)


async def start_scan(assessment_id: str, url: str, domain: str, company_id: str, user_id: str):
    """Launch a background scan task."""
    if assessment_id in _active_scans:
        logger.warning(f"Scan already running for assessment {assessment_id}")
        return

    task = asyncio.create_task(
        _execute_scan(assessment_id, url, domain, company_id, user_id)
    )
    _active_scans[assessment_id] = task
    _scan_progress[assessment_id] = {
        "status": "RUNNING",
        "current_step": "target_validation",
        "completed_steps": [],
        "pending_steps": list(SCAN_STEPS),
        "progress": 0,
        "error_message": None,
    }


async def cancel_scan(assessment_id: str) -> bool:
    """Cancel a running scan."""
    task = _active_scans.get(assessment_id)
    if task and not task.done():
        task.cancel()
        # Update DB
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(WebsiteAssessment).where(WebsiteAssessment.id == assessment_id)
            )
            assessment = result.scalar_one_or_none()
            if assessment:
                assessment.status = "CANCELLED"
                assessment.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
                await db.commit()
        _scan_progress.pop(assessment_id, None)
        _active_scans.pop(assessment_id, None)
        return True
    return False


async def _execute_scan(assessment_id: str, url: str, domain: str, company_id: str, user_id: str):
    """Execute the full scan pipeline and persist results."""
    try:
        # Update status to RUNNING
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(WebsiteAssessment).where(WebsiteAssessment.id == assessment_id)
            )
            assessment = result.scalar_one_or_none()
            if not assessment:
                logger.error(f"Assessment {assessment_id} not found")
                return

            assessment.status = "RUNNING"
            assessment.started_at = datetime.now(timezone.utc).replace(tzinfo=None)
            assessment.scan_progress = {
                "current_step": "target_validation",
                "completed": [],
                "pending": list(SCAN_STEPS),
            }
            await db.commit()

            # Create audit log
            db.add(AuditLog(
                user_id=user_id,
                company_id=company_id,
                action="WEBSITE_SCAN_STARTED",
                resource_type="website_assessment",
                resource_id=assessment_id,
                result="SUCCESS",
                metadata_json=json.dumps({"target_url": url, "domain": domain}),
                timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
            ))
            await db.commit()

        # Progress callback for real-time updates
        async def progress_callback(current_step: str, completed: list, pending: list):
            total = len(SCAN_STEPS)
            done = len(completed)
            pct = int((done / total) * 100) if total > 0 else 0

            _scan_progress[assessment_id] = {
                "status": "RUNNING",
                "current_step": current_step,
                "completed_steps": completed,
                "pending_steps": pending,
                "progress": pct,
                "error_message": None,
            }

            # Update assessment progress in DB
            async with AsyncSessionLocal() as db:
                res = await db.execute(
                    select(WebsiteAssessment).where(WebsiteAssessment.id == assessment_id)
                )
                a = res.scalar_one_or_none()
                if a:
                    a.scan_progress = {
                        "current_step": current_step,
                        "completed": completed,
                        "pending": pending,
                        "progress": pct,
                    }
                    await db.commit()

        # Run the full scan
        scan_result = await run_full_scan(url, domain, progress_callback)

        # Persist results
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                select(WebsiteAssessment).where(WebsiteAssessment.id == assessment_id)
            )
            assessment = res.scalar_one_or_none()
            if not assessment:
                return

            if scan_result.get("error"):
                assessment.status = "FAILED"
                assessment.error_message = scan_result["error"]
                assessment.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
                assessment.scan_progress = {
                    "current_step": None,
                    "completed": [],
                    "pending": [],
                    "progress": 0,
                }
                await db.commit()

                db.add(AuditLog(
                    user_id=user_id,
                    company_id=company_id,
                    action="WEBSITE_SCAN_FAILED",
                    resource_type="website_assessment",
                    resource_id=assessment_id,
                    result="FAILED",
                    metadata_json=json.dumps({"error": scan_result["error"]}),
                    timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
                ))
                await db.commit()
                return

            # ── Persist discovered assets ──
            asset_id_map = {}  # local key -> db asset id
            for idx, asset_data in enumerate(scan_result.get("discovered_assets", [])):
                asset = DiscoveredAsset(
                    company_id=company_id,
                    assessment_id=assessment_id,
                    asset_type=asset_data.get("asset_type", "UNKNOWN"),
                    name=asset_data.get("name", "Unknown"),
                    hostname=asset_data.get("hostname"),
                    domain=asset_data.get("domain"),
                    ip_address=asset_data.get("ip_address"),
                    port=asset_data.get("port"),
                    protocol=asset_data.get("protocol"),
                    technology=asset_data.get("technology"),
                    technology_version=asset_data.get("technology_version"),
                    source=asset_data.get("source", "SCANNER"),
                    exposure=asset_data.get("exposure", "PUBLIC"),
                    details=asset_data.get("details"),
                    status="ACTIVE",
                )
                db.add(asset)
                await db.flush()
                asset_id_map[idx] = asset.id

                db.add(AuditLog(
                    user_id=user_id,
                    company_id=company_id,
                    action="ASSET_DISCOVERED",
                    resource_type="discovered_asset",
                    resource_id=asset.id,
                    result="SUCCESS",
                    metadata_json=json.dumps({
                        "asset_type": asset.asset_type,
                        "name": asset.name,
                        "assessment_id": assessment_id
                    }),
                    timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
                ))

            # ── Persist findings ──
            for finding_data in scan_result.get("findings", []):
                finding = WebsiteFinding(
                    company_id=company_id,
                    assessment_id=assessment_id,
                    category=finding_data.get("category", "GENERAL"),
                    check_name=finding_data.get("check_name", ""),
                    title=finding_data.get("title", ""),
                    severity=finding_data.get("severity", "INFO"),
                    status="OPEN" if finding_data.get("check_status") in ("FAIL", "WARN") else "RESOLVED",
                    check_status=finding_data.get("check_status", "PASS"),
                    evidence=finding_data.get("evidence"),
                    details=finding_data.get("details"),
                    recommendation=finding_data.get("recommendation"),
                    affected_target=finding_data.get("affected_target"),
                    source=finding_data.get("source", "SCANNER"),
                )
                db.add(finding)

            # ── Persist vulnerabilities ──
            # First, find the domain asset for linking
            domain_asset_id = None
            for idx, a_data in enumerate(scan_result.get("discovered_assets", [])):
                if a_data.get("asset_type") == "DOMAIN":
                    domain_asset_id = asset_id_map.get(idx)
                    break

            for vuln_data in scan_result.get("vulnerabilities", []):
                cve_id = vuln_data.get("cve_id", "")
                if not cve_id:
                    continue

                # Check if vulnerability already exists in global table
                existing = await db.execute(
                    select(Vulnerability).where(Vulnerability.cve_id == cve_id)
                )
                vuln = existing.scalar_one_or_none()

                if not vuln:
                    vuln = Vulnerability(
                        cve_id=cve_id,
                        title=vuln_data.get("title", cve_id),
                        description=vuln_data.get("description"),
                        severity=vuln_data.get("severity", "MEDIUM"),
                        cvss_score=vuln_data.get("cvss_score"),
                        cvss_vector=vuln_data.get("cvss_vector"),
                        epss_score=vuln_data.get("epss_score"),
                        kev_status=vuln_data.get("kev_status", False),
                        affected_product=vuln_data.get("affected_product"),
                        affected_version=vuln_data.get("affected_version"),
                        references=vuln_data.get("references"),
                        published_at=_parse_datetime(vuln_data.get("published_at")),
                        source=vuln_data.get("source", "NVD"),
                    )
                    db.add(vuln)
                    await db.flush()
                else:
                    # Update EPSS/KEV if newer data available
                    if vuln_data.get("epss_score") is not None:
                        vuln.epss_score = vuln_data["epss_score"]
                    if vuln_data.get("kev_status"):
                        vuln.kev_status = True
                    vuln.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

                # Create company-scoped asset-vulnerability association
                if domain_asset_id:
                    av = AssetVulnerability(
                        company_id=company_id,
                        asset_id=domain_asset_id,
                        vulnerability_id=vuln.id,
                        assessment_id=assessment_id,
                        status="OPEN",
                        evidence=f"Technology match: {vuln_data.get('affected_product', '')}",
                    )
                    db.add(av)

                    db.add(AuditLog(
                        user_id=user_id,
                        company_id=company_id,
                        action="VULNERABILITY_DISCOVERED",
                        resource_type="vulnerability",
                        resource_id=vuln.id,
                        result="SUCCESS",
                        metadata_json=json.dumps({
                            "cve_id": cve_id,
                            "severity": vuln_data.get("severity"),
                            "assessment_id": assessment_id,
                        }),
                        timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
                    ))

            # Mark assessment complete
            assessment.status = "COMPLETED"
            assessment.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
            assessment.scan_progress = {
                "current_step": None,
                "completed": list(SCAN_STEPS),
                "pending": [],
                "progress": 100,
            }
            await db.commit()

            db.add(AuditLog(
                user_id=user_id,
                company_id=company_id,
                action="WEBSITE_SCAN_COMPLETED",
                resource_type="website_assessment",
                resource_id=assessment_id,
                result="SUCCESS",
                metadata_json=json.dumps({
                    "target_url": url,
                    "domain": domain,
                    "assets_found": len(scan_result.get("discovered_assets", [])),
                    "findings_count": len(scan_result.get("findings", [])),
                    "vulnerabilities_count": len(scan_result.get("vulnerabilities", [])),
                }),
                timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
            ))
            await db.commit()

        # Update progress store
        _scan_progress[assessment_id] = {
            "status": "COMPLETED",
            "current_step": None,
            "completed_steps": list(SCAN_STEPS),
            "pending_steps": [],
            "progress": 100,
            "error_message": None,
        }

    except asyncio.CancelledError:
        logger.info(f"Scan {assessment_id} was cancelled")
        _scan_progress[assessment_id] = {
            "status": "CANCELLED",
            "current_step": None,
            "completed_steps": [],
            "pending_steps": [],
            "progress": 0,
            "error_message": "Scan cancelled by user",
        }
    except Exception as e:
        logger.error(f"Scan worker error for {assessment_id}: {e}", exc_info=True)
        _scan_progress[assessment_id] = {
            "status": "FAILED",
            "current_step": None,
            "completed_steps": [],
            "pending_steps": [],
            "progress": 0,
            "error_message": str(e),
        }
        # Update DB status
        try:
            async with AsyncSessionLocal() as db:
                res = await db.execute(
                    select(WebsiteAssessment).where(WebsiteAssessment.id == assessment_id)
                )
                assessment = res.scalar_one_or_none()
                if assessment:
                    assessment.status = "FAILED"
                    assessment.error_message = str(e)
                    assessment.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
                    await db.commit()
        except Exception:
            pass
    finally:
        _active_scans.pop(assessment_id, None)


def _parse_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    """Parse ISO datetime string to datetime object."""
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return None
