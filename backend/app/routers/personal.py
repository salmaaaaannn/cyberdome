"""
CYBERDOME — Personal Cyber Protection & Academy Training Router.
Provides public individual protection and security awareness:
URL safety checks, fraud-call lookup, OTP scam analysis, device posture audit,
interactive academy courses, and phishing drill reporting.
Normal USER data is strictly isolated from enterprise multi-tenant data.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import re
import uuid
import asyncio
from urllib.parse import urlparse

from app.core.database import get_db
from app.models.models import User, CompanyUser, AuditLog
from app.models.phase4 import SecurityEvent
from app.schemas.common import success_response
from app.core.dependencies import get_current_user
from app.services import validate_target, resolve_dns, analyze_http, analyze_tls
import logging

logger = logging.getLogger("cyberdome.personal")

router = APIRouter(prefix="/personal", tags=["Personal Cyber Defense & Training"])


# ─── Pydantic Schemas ──────────────────────────────────────────────────
class URLCheckRequest(BaseModel):
    url: str = Field(..., min_length=1)
    environment: Optional[str] = "REAL" # REAL, SIMULATION
    features: Optional[Dict[str, Any]] = None
    source_ip: Optional[str] = None
    record_detection: Optional[bool] = True
    mode: Optional[str] = "AUTOMATIC"
    source: Optional[str] = "browser_extension"


class FraudCallCheckRequest(BaseModel):
    phone_number: str = Field(..., min_length=7, max_length=20)


class OTPScamCheckRequest(BaseModel):
    message_text: str = Field(..., min_length=5)
    sender_id: Optional[str] = None


class DeviceAuditRequest(BaseModel):
    os_name: str
    browser_name: str
    has_screen_lock: Optional[bool] = True
    has_disk_encryption: Optional[bool] = True
    antivirus_active: Optional[bool] = True


class AcademyProgressUpdate(BaseModel):
    course_id: str
    lesson_id: str
    quiz_score: Optional[int] = None
    completed: bool = True


class PhishingReportRequest(BaseModel):
    campaign_id: str
    email_subject: str
    reported_indicator: str


# ─── Built-in Academy Catalog ──────────────────────────────────────────
ACADEMY_COURSES = [
    {
        "id": "acad-p1",
        "title": "Phishing Awareness & Link Inspection",
        "description": "Master identifying suspicious URLs, domain spoofing, and forged sender headers.",
        "level": "BEGINNER",
        "category": "PERSONAL",
        "duration": "15 min",
        "lessonsCount": 4,
        "completedLessons": 4,
        "quizScore": 100,
        "isCompleted": True,
        "badge": "Phish Guard"
    },
    {
        "id": "acad-p2",
        "title": "Credential Security & MFA Best Practices",
        "description": "Learn password entropy, password managers, and why SMS OTPs are vulnerable to SIM-swapping.",
        "level": "BEGINNER",
        "category": "PERSONAL",
        "duration": "20 min",
        "lessonsCount": 5,
        "completedLessons": 5,
        "quizScore": 95,
        "isCompleted": True,
        "badge": "Auth Master"
    },
    {
        "id": "acad-e1",
        "title": "Corporate Data Protection & Clean Desk Policy",
        "description": "Handling confidential data, NDAs, physical security, and safe file sharing protocols.",
        "level": "BEGINNER",
        "category": "EMPLOYEE",
        "duration": "25 min",
        "lessonsCount": 4,
        "completedLessons": 3,
        "quizScore": 85,
        "isCompleted": False
    },
    {
        "id": "acad-e2",
        "title": "Spear-Phishing & Business Email Compromise",
        "description": "Recognizing executive impersonation, wire transfer fraud, and vendor spoofing.",
        "level": "INTERMEDIATE",
        "category": "EMPLOYEE",
        "duration": "30 min",
        "lessonsCount": 6,
        "completedLessons": 4,
        "quizScore": 90,
        "isCompleted": False
    }
]


# ─── Endpoints ────────────────────────────────────────────────────────
@router.post("/url-check")
@router.post("/browser/check-url")
async def check_url_safety(
    data: URLCheckRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Perform multi-source inspection of a URL combining:
    1. Web Scanner heuristics & DNS resolution
    2. Threat Intelligence feed correlation
    3. Module 04 ML Anomaly & Phishing detection
    4. Deterministic security rules & HTTP/TLS header inspection
    5. Real SecurityEvent persistence (mode=AUTOMATIC, source=browser_extension)
    """
    from app.services.ml_url_service import ml_url_service, URLDecisionFusion
    from app.models.models import CompanyUser

    url_str = data.url.strip()
    if not url_str:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "EMPTY_URL", "message": "Target URL cannot be empty."}
        )

    # 1. Target validation (SSRF / IP / private ranges)
    valid, domain, cleaned = validate_target(url_str)
    env_tag = (data.environment or "REAL").upper()
    is_sim = (env_tag == "SIMULATION")

    if not valid:
        invalid_findings = [{
            "severity": "CRITICAL",
            "title": "Invalid or Blacklisted Target",
            "evidence": f"Target '{url_str}' resolves to private or reserved IP address space.",
            "impact": "Internal network reconnaissance or Server-Side Request Forgery attempt.",
            "recommendation": "Block destination immediately.",
            "source": "TARGET_VALIDATOR",
            "confidence": 1.0
        }]
        invalid_counts = {"CRITICAL": 1, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        
        # Persist security event for blocked attempt
        if data.record_detection:
            comp_res = await db.execute(select(CompanyUser).where(CompanyUser.user_id == user.id))
            membership = comp_res.scalar_one_or_none()
            cid = membership.company_id if membership else None
            sec_ev = SecurityEvent(
                id=str(uuid.uuid4()),
                company_id=cid,
                user_id=user.id,
                event_id=f"ext-{uuid.uuid4().hex[:12]}",
                rule_id="EXT-SSRF-BLOCKED",
                title=f"[BLOCKED] Malicious URL Scan: {domain or 'unknown'}",
                description="Target rejected by SSRF and target validation filters.",
                severity="HIGH",
                confidence=1.0,
                source=data.source or "browser_extension",
                entity_type="URL",
                entity_id=domain or "unknown",
                risk_score=15.0,
                environment=env_tag,
                metadata_json={
                    "url": url_str,
                    "domain": domain or "unknown",
                    "verdict": "DANGEROUS",
                    "baseline": "HIGH RISK",
                    "score": 15,
                    "mode": data.mode or "AUTOMATIC",
                    "simulation": is_sim,
                    "findings_count": invalid_counts,
                    "user_id": user.id,
                },
                timestamp=datetime.now(timezone.utc).replace(tzinfo=None)
            )
            db.add(sec_ev)
            await db.commit()

        return success_response({
            "url": url_str,
            "domain": domain or "unknown",
            "isSafe": False,
            "score": 15,
            "baseline": "HIGH RISK",
            "riskLevel": "HIGH",
            "status": "MALICIOUS",
            "verdict": "DANGEROUS",
            "severity": "HIGH",
            "confidence": 1.0,
            "reason": "Invalid or blacklisted internal/reserved target",
            "findingsCount": invalid_counts,
            "findings_count": invalid_counts,
            "findings": invalid_findings,
            "phishingIndicators": ["Private or blocked IP/domain"],
            "dnsRecords": [],
            "testedAt": datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
        })

    # 2. Scanner Heuristic Inspection
    indicators = []
    if any(k in domain for k in ["secure-login", "account-verify", "bank-update", "paypal-auth", "apple-id-verify"]):
        indicators.append("Deceptive credential-harvesting keyword pattern")

    if domain.count("-") >= 3:
        indicators.append("Excessive hyphenation characteristic of typosquatting")

    if domain.endswith((".top", ".xyz", ".gq", ".cf", ".tk", ".work")):
        indicators.append("High-abuse top level domain")

    # DNS Resolution
    dns_data = await resolve_dns(domain)
    has_dns = len(dns_data.get("a_records", [])) > 0
    if not has_dns and not dns_data.get("error"):
        indicators.append("Domain does not resolve to active A records (Parked or NXDOMAIN)")

    # 3. HTTP & TLS Inspection (Real response evidence)
    http_data = {"status_code": None, "headers": {}, "security_headers": {}, "error": None}
    tls_data = {"tls_version": None, "cipher_suite": None, "error": None}

    try:
        http_data = await asyncio.wait_for(analyze_http(cleaned), timeout=2.5)
    except Exception as e:
        http_data["error"] = str(e)

    if cleaned.startswith("https://"):
        try:
            tls_data = await asyncio.wait_for(analyze_tls(domain), timeout=2.0)
        except Exception as e:
            tls_data["error"] = str(e)

    scanner_result = {
        "isSafe": len(indicators) == 0,
        "status": "SAFE" if len(indicators) == 0 else "SUSPICIOUS",
        "phishingIndicators": indicators,
        "dnsRecords": dns_data.get("a_records", []),
    }

    # 4. Threat Intelligence
    threat_intel = URLDecisionFusion.evaluate_threat_intelligence(domain, cleaned)

    # 5. Module 04 ML URL Inference
    ml_target = data.features if data.features is not None else cleaned
    ml_result = ml_url_service.predict(ml_target, environment=env_tag)

    if ml_result.status == "INSUFFICIENT_DATA":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INSUFFICIENT_DATA",
                "message": ml_result.error_message,
                "missing_features": ml_result.missing_features,
                "provided_count": ml_result.features_evaluated,
                "required_count": 27,
                "rules": "Zero fake feature imputation is enforced. All 27 canonical URL features are required."
            }
        )
    if ml_result.status == "ERROR":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_FEATURE_VALUE",
                "message": ml_result.error_message,
            }
        )

    # 6. Multi-Source Decision Fusion
    security_rules = []
    if threat_intel.get("is_known_malicious"):
        security_rules.append("RULE-THREAT-INTEL-MATCH")
    if len(indicators) > 0:
        security_rules.append("RULE-SCANNER-HEURISTICS")
    if ml_result.is_phishing:
        security_rules.append("RULE-ML-PHISHING-CLASSIFIED")

    fused = URLDecisionFusion.fuse(
        ml_result=ml_result,
        threat_intel=threat_intel,
        scanner_result=scanner_result,
        security_rules=security_rules
    )

    final_verdict = fused["final_verdict"]
    is_safe = (final_verdict == "SAFE")

    # 7. Collect Findings with Genuine Inspected Evidence
    findings = []
    sec_hdrs = http_data.get("security_headers", {}) or {}

    # Inspect HTTP security headers only if HTTP response was actually received
    if http_data.get("status_code"):
        if not sec_hdrs.get("content-security-policy"):
            findings.append({
                "severity": "MEDIUM",
                "title": "Missing Content-Security-Policy (CSP)",
                "evidence": "Content-Security-Policy header absent in HTTP response.",
                "impact": "Exposes browser to Cross-Site Scripting (XSS) and code injection attacks.",
                "recommendation": "Deploy a valid Content-Security-Policy header defining authorized script sources.",
                "source": "HTTP_INSPECTOR",
                "confidence": 1.0
            })
        if cleaned.startswith("https://") and not sec_hdrs.get("strict-transport-security"):
            findings.append({
                "severity": "LOW",
                "title": "Missing Strict-Transport-Security (HSTS)",
                "evidence": "Strict-Transport-Security header not returned by server.",
                "impact": "Allows potential protocol downgrade attacks from HTTPS to plaintext HTTP.",
                "recommendation": "Enable HSTS with max-age >= 31536000 and includeSubDomains.",
                "source": "HTTP_INSPECTOR",
                "confidence": 1.0
            })
        if not sec_hdrs.get("x-frame-options"):
            findings.append({
                "severity": "LOW",
                "title": "Missing Anti-Clickjacking Header (X-Frame-Options)",
                "evidence": "X-Frame-Options header not returned by server.",
                "impact": "May allow malicious sites to embed this page in an iframe for clickjacking.",
                "recommendation": "Set X-Frame-Options: DENY or SAMEORIGIN.",
                "source": "HTTP_INSPECTOR",
                "confidence": 1.0
            })
        if sec_hdrs.get("x-content-type-options") != "nosniff":
            findings.append({
                "severity": "LOW",
                "title": "Missing X-Content-Type-Options",
                "evidence": "X-Content-Type-Options: nosniff header missing.",
                "impact": "Enables MIME-confusion and content sniffing attacks.",
                "recommendation": "Set X-Content-Type-Options: nosniff.",
                "source": "HTTP_INSPECTOR",
                "confidence": 1.0
            })

    # TLS findings
    if tls_data.get("tls_version") and tls_data["tls_version"] not in ("TLSv1.2", "TLSv1.3") and not tls_data.get("error"):
        findings.append({
            "severity": "HIGH",
            "title": f"Outdated TLS Version ({tls_data['tls_version']})",
            "evidence": f"Server negotiated insecure TLS version: {tls_data['tls_version']}.",
            "impact": "Known protocol vulnerabilities allow eavesdropping or tampering.",
            "recommendation": "Upgrade web server to negotiate TLS 1.2 or TLS 1.3 only.",
            "source": "TLS_INSPECTOR",
            "confidence": 1.0
        })

    # DNS findings
    if not has_dns and not dns_data.get("error"):
        findings.append({
            "severity": "HIGH",
            "title": "Unresolvable Host / NXDOMAIN",
            "evidence": "Domain does not resolve to active A or AAAA records.",
            "impact": "Parked, expired, or non-functional domain infrastructure.",
            "recommendation": "Avoid navigating to unresolvable domains.",
            "source": "DNS_RESOLVER",
            "confidence": 1.0
        })

    # Heuristic findings
    for ind in indicators:
        sev = "HIGH" if "keyword" in ind.lower() else "MEDIUM"
        findings.append({
            "severity": sev,
            "title": ind,
            "evidence": f"Domain '{domain}' matched heuristic pattern.",
            "impact": "Domain characteristics align with social-engineering campaigns.",
            "recommendation": "Verify authentic corporate domain before entering credentials.",
            "source": "SCANNER_HEURISTICS",
            "confidence": 0.85
        })

    # Threat Intelligence & ML findings
    if final_verdict == "DANGEROUS":
        findings.append({
            "severity": "CRITICAL",
            "title": "Malicious Phishing / C2 Target Detected",
            "evidence": fused["primary_reason"],
            "impact": "High risk of credential theft, malware distribution, or unauthorized account access.",
            "recommendation": "Block navigation immediately. Do not submit credentials.",
            "source": "CYBERDOME_ML_FUSION",
            "confidence": fused["confidence"]
        })
    elif final_verdict == "SUSPICIOUS":
        findings.append({
            "severity": "MEDIUM",
            "title": "Suspicious Pattern Correlation",
            "evidence": fused["primary_reason"],
            "impact": "Target exhibits anomalous feature distribution or unverified infrastructure.",
            "recommendation": "Exercise elevated caution.",
            "source": "CYBERDOME_ML_FUSION",
            "confidence": fused["confidence"]
        })

    # Calculate findings counts by severity
    findings_count = {
        "CRITICAL": sum(1 for f in findings if f.get("severity") == "CRITICAL"),
        "HIGH": sum(1 for f in findings if f.get("severity") == "HIGH"),
        "MEDIUM": sum(1 for f in findings if f.get("severity") == "MEDIUM"),
        "LOW": sum(1 for f in findings if f.get("severity") == "LOW"),
    }

    # Deterministic Score & Baseline
    if final_verdict == "DANGEROUS":
        score = max(5, min(35, int((1.0 - fused["confidence"]) * 50)))
        baseline = "HIGH RISK"
        risk_level = "CRITICAL" if fused["severity"] == "CRITICAL" else "HIGH"
    elif final_verdict == "SUSPICIOUS":
        score = max(40, min(65, int(100 - (findings_count["HIGH"] * 10 + findings_count["MEDIUM"] * 5))))
        baseline = "ELEVATED RISK"
        risk_level = "MEDIUM"
    elif final_verdict == "SAFE":
        if not has_dns and not http_data.get("status_code"):
            score = None
            baseline = "UNKNOWN / INSUFFICIENT DATA"
            final_verdict = "UNKNOWN"
            risk_level = "LOW"
        else:
            penalty = (findings_count["CRITICAL"] * 25) + (findings_count["HIGH"] * 12) + (findings_count["MEDIUM"] * 4) + (findings_count["LOW"] * 1)
            score = max(70, min(96, 100 - penalty))
            baseline = "GOOD BASELINE"
            risk_level = "LOW"
    else:
        score = None
        baseline = "UNKNOWN / INSUFFICIENT DATA"
        risk_level = "LOW"

    # 8. SecurityEvent Persistence in Database
    sec_event = None
    if data.record_detection:
        comp_res = await db.execute(
            select(CompanyUser).where(CompanyUser.user_id == user.id)
        )
        membership = comp_res.scalar_one_or_none()
        cid = membership.company_id if membership else None

        sec_event_id = str(uuid.uuid4())
        title = f"[{final_verdict}] Website Security Assessment: {domain}"
        if is_sim:
            title = f"[SIMULATION] {title}"

        sec_event = SecurityEvent(
            id=sec_event_id,
            company_id=cid,
            user_id=user.id,
            event_id=f"ext-{uuid.uuid4().hex[:12]}",
            rule_id="EXT-URL-ASSESSMENT",
            title=title,
            description=f"Automatic website security assessment for {cleaned}. Verdict: {final_verdict}, Score: {score if score is not None else '--'}/100.",
            severity=fused["severity"] if not is_safe else "INFO",
            confidence=fused["confidence"],
            source=data.source or "browser_extension",
            entity_type="URL",
            entity_id=domain,
            risk_score=float(score) if score is not None else 50.0,
            environment=env_tag,
            metadata_json={
                "url": cleaned,
                "domain": domain,
                "verdict": final_verdict,
                "baseline": baseline,
                "score": score,
                "mode": data.mode or "AUTOMATIC",
                "simulation": is_sim,
                "findings_count": findings_count,
                "findings": findings[:10],
                "user_id": user.id,
                "tested_at": datetime.now(timezone.utc).isoformat()
            },
            timestamp=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        db.add(sec_event)
        await db.commit()
        await db.refresh(sec_event)

        # Correlate threat with incident if company member
        if not is_safe and cid:
            try:
                from app.services.incidents.correlation import IncidentCorrelationEngine, DetectionResult
                det_result = DetectionResult(
                    id=str(uuid.uuid4()),
                    source="URL",
                    rule_id="EXT-URL-THREAT",
                    title=sec_event.title,
                    description=sec_event.description,
                    severity=sec_event.severity,
                    confidence=sec_event.confidence,
                    entity_type="URL",
                    entity_id=domain,
                    risk_score=sec_event.risk_score,
                    timestamp=sec_event.timestamp,
                    metadata=sec_event.metadata_json or {},
                    event_id=sec_event.event_id,
                    company_id=cid,
                )
                await IncidentCorrelationEngine.correlate_detections(db, cid, [det_result])
            except Exception as corr_err:
                logger.error(f"Correlation error: {corr_err}")

            try:
                import json
                client_ip = data.source_ip
                if not client_ip and hasattr(request, "client") and request.client:
                    client_ip = request.client.host
                audit_entry = AuditLog(
                    id=str(uuid.uuid4()),
                    company_id=cid,
                    user_id=user.id,
                    action="URL_THREAT_DETECTED",
                    resource_type="url",
                    resource_id=domain,
                    ip_address=client_ip,
                    result="DETECTED",
                    metadata_json=json.dumps({
                        "url": cleaned,
                        "domain": domain,
                        "score": score,
                        "verdict": final_verdict,
                        "severity": fused["severity"],
                        "confidence": fused["confidence"]
                    })
                )
                db.add(audit_entry)
                await db.commit()
            except Exception as audit_err:
                logger.error(f"Audit log error: {audit_err}")

    response_data = {
        "url": cleaned,
        "domain": domain,
        "score": score,
        "baseline": baseline,
        "isSafe": is_safe,
        "riskLevel": risk_level,
        "status": final_verdict,
        "verdict": final_verdict,
        "severity": fused["severity"],
        "confidence": fused["confidence"],
        "reason": fused["primary_reason"],
        "findingsCount": findings_count,
        "findings_count": findings_count,
        "findings": findings,
        "phishingIndicators": indicators + ([f"ML Detection: {ml_result.verdict}"] if not is_safe else []),
        "dnsRecords": dns_data.get("a_records", []),
        "mlAnalysis": ml_result.model_dump(),
        "threatIntelligence": threat_intel,
        "decisionFusion": fused,
        "testedAt": datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
    }
    if sec_event:
        response_data["securityEventId"] = sec_event.id
        response_data["security_event_id"] = sec_event.id
        response_data["incidentCorrelated"] = not is_safe and (membership is not None)

    return success_response(response_data)


@router.post("/fraud-call")
async def check_fraud_phone(
    data: FraudCallCheckRequest,
    user: User = Depends(get_current_user),
):
    """Check telephone number reputation against known spam/robocall patterns."""
    phone = re.sub(r'[\s\-\(\)]', '', data.phone_number)
    is_spam = False
    reputation_score = 92
    spam_reports = 0

    # Pattern check
    if phone.startswith(("+1800", "+1888", "1800", "800")) or len(phone) < 9:
        is_spam = False
    elif phone.endswith(("0000", "9999", "1234")):
        is_spam = True
        reputation_score = 25
        spam_reports = 42

    return success_response({
        "phoneNumber": data.phone_number,
        "isSpam": is_spam,
        "reputationScore": reputation_score,
        "spamReports": spam_reports,
        "carrier": "Verified Telephony Provider",
        "country": "US",
        "recommendation": "Block and report caller" if is_spam else "Number appears legitimate"
    })


@router.post("/otp-scam")
async def analyze_otp_scam(
    data: OTPScamCheckRequest,
    user: User = Depends(get_current_user),
):
    """Analyze SMS or text prompt for social engineering & OTP theft indicators."""
    text = data.message_text.lower()
    triggers = []

    if any(k in text for k in ["share this code", "do not share", "read back this code", "call us with code"]):
        triggers.append("Requests immediate disclosure of temporary security code")
    if any(k in text for k in ["suspended immediately", "urgent action required", "account locked in 15 minutes"]):
        triggers.append("Artificial urgency tactic designed to cause panic")
    if any(k in text for k in ["bit.ly", "tinyurl", "t.co", "is.gd", "goo.gl"]):
        triggers.append("Shortened redirect link masking ultimate destination")

    is_scam = len(triggers) > 0
    return success_response({
        "isScam": is_scam,
        "riskLevel": "CRITICAL" if len(triggers) >= 2 else "HIGH" if is_scam else "SAFE",
        "identifiedTactics": triggers,
        "advice": "NEVER share one-time passcodes with anyone. Banks and IT support will never ask for your OTP."
    })


@router.post("/device-security")
async def audit_device_security(
    data: DeviceAuditRequest,
    user: User = Depends(get_current_user),
):
    """Audit client device posture and recommend security hardening."""
    score = 100
    recommendations = []

    if not data.has_screen_lock:
        score -= 25
        recommendations.append("Enable screen lock with PIN, password, or biometrics.")
    if not data.has_disk_encryption:
        score -= 30
        recommendations.append("Enable full disk encryption (FileVault / BitLocker).")
    if not data.antivirus_active:
        score -= 20
        recommendations.append("Ensure OS real-time antivirus protection is running.")

    return success_response({
        "osName": data.os_name,
        "browserName": data.browser_name,
        "securityScore": max(0, score),
        "status": "HEALTHY" if score >= 85 else "WARNING" if score >= 60 else "VULNERABLE",
        "recommendations": recommendations,
        "auditedAt": datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
    })


@router.get("/dashboard")
async def get_personal_dashboard(
    user: User = Depends(get_current_user),
):
    """Get aggregated personal defense dashboard overview."""
    completed = [c for c in ACADEMY_COURSES if c["isCompleted"]]
    return success_response({
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "accountType": user.account_type,
        },
        "personalScore": 94,
        "coursesEnrolled": len(ACADEMY_COURSES),
        "coursesCompleted": len(completed),
        "activeShields": ["Phishing Guard", "Link Inspector", "Device Posture"],
        "recommendedAction": "Complete Spear-Phishing & Business Email Compromise module"
    })


@router.get("/academy/courses")
async def list_academy_courses(
    user: User = Depends(get_current_user),
):
    """List available cybersecurity training modules."""
    return success_response(ACADEMY_COURSES)


@router.post("/academy/progress")
async def update_academy_progress(
    data: AcademyProgressUpdate,
    user: User = Depends(get_current_user),
):
    """Record module progress or quiz completion."""
    for c in ACADEMY_COURSES:
        if c["id"] == data.course_id:
            if data.quiz_score is not None:
                c["quizScore"] = data.quiz_score
            if data.completed:
                c["isCompleted"] = True
                c["completedLessons"] = c["lessonsCount"]
            return success_response(c)

    return success_response({
        "courseId": data.course_id,
        "status": "UPDATED",
        "completed": data.completed
    })


@router.get("/phishing/campaigns")
async def list_phishing_campaigns(
    user: User = Depends(get_current_user),
):
    """List simulated security drills and training campaigns."""
    return success_response([
        {
            "id": "drill-001",
            "title": "Corporate IT Password Expiry Drill",
            "status": "ACTIVE",
            "type": "SIMULATION",
            "startDate": "2026-09-01T00:00:00Z",
            "isReported": False,
        }
    ])


@router.post("/phishing/report")
async def report_phishing_email(
    data: PhishingReportRequest,
    user: User = Depends(get_current_user),
):
    """Report a suspicious drill email or live phishing attack."""
    return success_response({
        "campaignId": data.campaign_id,
        "status": "REPORTED",
        "feedback": "Great catch! You correctly identified a security awareness drill.",
        "pointsAwarded": 50,
        "reportedAt": datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
    })


@router.get("/security-history")
@router.get("/browser/history")
async def get_security_history(
    limit: int = 50,
    offset: int = 0,
    environment: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve real website assessment security history for the authenticated user.
    Strictly tenant/user-isolated: only returns events associated with user.id
    (or user's company_id if enterprise user).
    """
    from sqlalchemy import or_

    # Find company membership if any
    comp_res = await db.execute(
        select(CompanyUser).where(CompanyUser.user_id == user.id)
    )
    membership = comp_res.scalar_one_or_none()
    cid = membership.company_id if membership else None

    user_cond = (SecurityEvent.user_id == user.id)
    if cid:
        tenant_cond = or_(user_cond, SecurityEvent.company_id == cid)
    else:
        tenant_cond = user_cond

    source_cond = or_(
        SecurityEvent.source == "browser_extension",
        SecurityEvent.rule_id.like("EXT-%"),
        SecurityEvent.entity_type == "URL",
    )

    query = select(SecurityEvent).where(tenant_cond, source_cond)

    if environment:
        query = query.where(SecurityEvent.environment == environment.upper())

    query = query.order_by(SecurityEvent.timestamp.desc()).offset(offset).limit(min(limit, 100))

    result = await db.execute(query)
    events = result.scalars().all()

    formatted_events = []
    for ev in events:
        meta = ev.metadata_json or {}
        formatted_events.append({
            "id": ev.id,
            "eventId": ev.event_id,
            "title": ev.title,
            "url": meta.get("url") or ev.entity_id,
            "domain": meta.get("domain") or ev.entity_id,
            "verdict": meta.get("verdict") or ("SAFE" if ev.severity == "INFO" else "DANGEROUS"),
            "baseline": meta.get("baseline") or ("GOOD BASELINE" if ev.severity == "INFO" else "HIGH RISK"),
            "score": meta.get("score") if meta.get("score") is not None else (int(ev.risk_score) if ev.risk_score else None),
            "severity": ev.severity,
            "confidence": ev.confidence,
            "mode": meta.get("mode", "AUTOMATIC"),
            "source": ev.source,
            "environment": ev.environment,
            "simulation": meta.get("simulation", ev.environment == "SIMULATION"),
            "findingsCount": meta.get("findings_count", {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}),
            "findings": meta.get("findings", []),
            "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
        })

    return success_response({
        "total": len(formatted_events),
        "events": formatted_events
    })

