"""
CYBERDOME — Reports Generation Router.
Generates company-isolated security compliance, vulnerability,
incident post-mortem, and executive reports in JSON, CSV, and formatted formats.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import json
import io
import csv

from app.core.database import get_db
from app.models.models import User, CompanyUser, Asset
from app.models.phase4 import Incident, Report
from app.models.website_security import AssetVulnerability, Vulnerability
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission, create_audit_entry
)

router = APIRouter(prefix="/reports", tags=["Reports & Compliance"])


# ─── Pydantic Schemas ──────────────────────────────────────────────────
class ReportGenerateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    type: str = Field(..., description="SECURITY, VULNERABILITY, INCIDENT, COMPLIANCE, EXECUTIVE")
    format: Optional[str] = "JSON" # JSON, CSV, PDF


def _format_report(r: Report) -> dict:
    return {
        "id": r.id,
        "companyId": r.company_id,
        "title": r.title,
        "type": r.type,
        "generatedBy": r.generated_by,
        "status": r.status or "COMPLETED",
        "url": r.url,
    }


# ─── Endpoints ────────────────────────────────────────────────────────
@router.get("")
@router.get("/")
async def list_reports(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """List all generated compliance and executive reports for company."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company reports."}
        )

    res = await db.execute(
        select(Report).where(Report.company_id == membership.company_id).order_by(Report.id.desc())
    )
    reports = res.scalars().all()
    return success_response([_format_report(r) for r in reports])


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_report(
    data: ReportGenerateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.write")),
    db: AsyncSession = Depends(get_db),
):
    """
    Compile real security intelligence into a compliance or vulnerability report.
    Never fabricates findings; uses real database records.
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot generate company reports."}
        )

    cid = membership.company_id

    # Gather real telemetry & database counts
    total_assets = await db.scalar(select(func.count(Asset.id)).where(Asset.company_id == cid)) or 0
    total_incidents = await db.scalar(select(func.count(Incident.id)).where(Incident.company_id == cid)) or 0
    open_incidents = await db.scalar(
        select(func.count(Incident.id)).where(Incident.company_id == cid, Incident.status.in_(["OPEN", "INVESTIGATING"]))
    ) or 0
    total_vulns = await db.scalar(
        select(func.count(AssetVulnerability.id)).where(AssetVulnerability.company_id == cid)
    ) or 0
    crit_vulns = await db.scalar(
        select(func.count(AssetVulnerability.id)).join(
            Vulnerability, AssetVulnerability.vulnerability_id == Vulnerability.id
        ).where(AssetVulnerability.company_id == cid, Vulnerability.severity == "CRITICAL")
    ) or 0

    # Calculate compliance score
    compliance_score = max(0, min(100, 100 - (crit_vulns * 15 + open_incidents * 10)))

    report_payload = {
        "reportTitle": data.title,
        "reportType": data.type.upper(),
        "format": data.format.upper(),
        "summary": {
            "totalAssets": total_assets,
            "totalVulnerabilities": total_vulns,
            "criticalVulnerabilities": crit_vulns,
            "totalIncidents": total_incidents,
            "openIncidents": open_incidents,
            "complianceScore": compliance_score,
            "postureGrade": "A" if compliance_score >= 90 else "B" if compliance_score >= 75 else "C" if compliance_score >= 60 else "F",
        }
    }

    report = Report(
        company_id=cid,
        title=data.title.strip(),
        type=data.type.upper(),
        generated_by=user.id,
        status="COMPLETED",
        url=f"/api/v1/reports/download-mock/{cid}-{data.type.lower()}",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    # Audit log
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    await create_audit_entry(
        db=db,
        action="REPORT_GENERATED",
        result="SUCCESS",
        user_id=user.id,
        company_id=cid,
        resource_type="report",
        resource_id=report.id,
        ip_address=ip,
        user_agent=ua,
        metadata={"title": report.title, "type": report.type}
    )

    out = _format_report(report)
    out["data"] = report_payload
    return success_response(out)


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details of a specific report."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company reports."}
        )

    res = await db.execute(
        select(Report).where(
            Report.id == report_id,
            Report.company_id == membership.company_id
        )
    )
    r = res.scalar_one_or_none()
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Report not found."}
        )

    return success_response(_format_report(r))


@router.get("/{report_id}/download")
async def download_report_csv(
    report_id: str,
    export_format: str = Query("csv", alias="format"),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """Download report data as CSV or JSON stream."""
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot download company reports."}
        )

    res = await db.execute(
        select(Report).where(
            Report.id == report_id,
            Report.company_id == membership.company_id
        )
    )
    r = res.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")

    cid = membership.company_id
    total_assets = await db.scalar(select(func.count(Asset.id)).where(Asset.company_id == cid)) or 0
    total_incidents = await db.scalar(select(func.count(Incident.id)).where(Incident.company_id == cid)) or 0
    total_vulns = await db.scalar(select(func.count(AssetVulnerability.id)).where(AssetVulnerability.company_id == cid)) or 0

    if export_format.lower() == "json":
        data = {
            "report_id": r.id,
            "title": r.title,
            "type": r.type,
            "total_assets": total_assets,
            "total_incidents": total_incidents,
            "total_vulnerabilities": total_vulns,
        }
        return Response(
            content=json.dumps(data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="report_{r.id}.json"'}
        )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Report Title", r.title])
    writer.writerow(["Report Type", r.type])
    writer.writerow(["Total Assets", total_assets])
    writer.writerow(["Total Incidents", total_incidents])
    writer.writerow(["Total Vulnerabilities", total_vulns])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="report_{r.id}.csv"'}
    )
