"""
CYBERDOME — Module 04 Phishing & Malicious URL Detection ML Service.

Inference and Decision Fusion Engine for pre-trained PhishTank & OpenPhish benchmark models:
1. StandardScaler (27 canonical lexical and syntactic URL features)
2. Isolation Forest (Unsupervised Lexical Anomaly Detection: 1=Normal, -1=Anomaly)
3. XGBoost Classifier (Supervised Phishing / Malicious URL Classification: 0=BENIGN, 1=PHISHING)
4. Multi-Source Decision Fusion Layer: Combines ML, Scanner, Threat Intelligence, and Rules.

Strict Invariants:
- Zero Retraining: Models run solely in inference mode.
- Strict Completeness: Zero fake feature imputation. Missing features trigger INSUFFICIENT_DATA.
- Exact Feature Ordering: Enforced via feature_schema.json (27 features).
- Multi-Tenant Isolation: Scoped to company_id from authenticated JWT session.
- Real vs Simulation Segregation: Propagates environment tag without metric pollution.
"""

from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime, timezone
import json
import logging
import math
import re
import ipaddress
import uuid
import joblib
import numpy as np
import pandas as pd
from urllib.parse import urlparse
from collections import Counter
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings

logger = logging.getLogger("cyberdome.ml.url")


class InsufficientDataException(Exception):
    """Raised when an inference request lacks required URL features or cannot be parsed."""
    def __init__(self, missing_features: List[str], provided_count: int, required_count: int = 27):
        self.missing_features = missing_features
        self.provided_count = provided_count
        self.required_count = required_count
        super().__init__(
            f"Insufficient URL data for ML inference: missing {len(missing_features)} of {required_count} features."
        )


class MLURLAnalysisResult(BaseModel):
    status: str = "SUCCESS"  # SUCCESS, INSUFFICIENT_DATA, ERROR
    model_version: str = "url-phishing-v1"
    dataset_benchmark: str = "PhishTank_OpenPhish_Benchmark"
    verdict: str  # SAFE, SUSPICIOUS, DANGEROUS, UNKNOWN
    is_phishing: bool
    is_malicious: bool
    severity: str  # INFO, LOW, MEDIUM, HIGH, CRITICAL
    confidence: float
    anomaly_score: float = 0.0
    classification_probability: float = 0.0
    environment: str = "REAL"  # REAL, SIMULATION
    isolation_forest: Dict[str, Any] = Field(default_factory=dict)
    xgboost: Dict[str, Any] = Field(default_factory=dict)
    features_evaluated: int = 27
    evaluated_at: str
    missing_features: Optional[List[str]] = None
    error_message: Optional[str] = None


class URLFeatureExtractor:
    """Extracts and validates 27 canonical lexical and syntactic features from raw URL strings."""

    SUSPICIOUS_TLDS = (
        ".top", ".xyz", ".gq", ".cf", ".tk", ".work", ".click",
        ".fit", ".loan", ".buzz", ".club", ".surf", ".country", ".kim", ".science"
    )

    SHORTENER_DOMAINS = {
        "bit.ly", "t.co", "tinyurl.com", "is.gd", "buff.ly", "ow.ly", "goo.gl", "cutt.ly"
    }

    @staticmethod
    def shannon_entropy(s: str) -> float:
        if not s:
            return 0.0
        counts = Counter(s)
        total = len(s)
        return -sum((c / total) * math.log2(c / total) for c in counts.values())

    @classmethod
    def extract_features(cls, url_str: str) -> Dict[str, float]:
        """Extract all 27 canonical lexical and structural features from a URL."""
        if not url_str or not isinstance(url_str, str):
            raise ValueError("Empty or invalid URL string provided.")

        url = url_str.strip()
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower()
        path = parsed.path or ""
        query = parsed.query or ""
        fragment = parsed.fragment or ""

        # IP address check
        is_ip = 0
        try:
            ipaddress.ip_address(hostname)
            is_ip = 1
        except ValueError:
            pass

        is_puny = 1 if "xn--" in hostname else 0
        is_suspicious_tld = 1 if any(hostname.endswith(t) for t in cls.SUSPICIOUS_TLDS) else 0
        is_shortener = 1 if hostname in cls.SHORTENER_DOMAINS else 0

        port_present = 1 if parsed.port is not None else 0
        unusual_port = 1 if (parsed.port is not None and parsed.port not in (80, 443)) else 0

        num_digits = sum(c.isdigit() for c in url)
        digit_ratio = num_digits / max(1, len(url))
        num_percent = len(re.findall(r"%[0-9a-fA-F]{2}", url))
        num_special = len(re.findall(r"[^a-zA-Z0-9]", url))

        subdomains = max(0, len(hostname.split(".")) - 2) if not is_ip else 0

        return {
            "url_length": float(len(url)),
            "hostname_length": float(len(hostname)),
            "path_length": float(len(path)),
            "query_length": float(len(query)),
            "fragment_length": float(len(fragment)),
            "number_of_dots": float(url.count(".")),
            "number_of_hyphens": float(url.count("-")),
            "number_of_underscores": float(url.count("_")),
            "number_of_slashes": float(url.count("/")),
            "number_of_question_marks": float(url.count("?")),
            "number_of_equals": float(url.count("=")),
            "number_of_ampersands": float(url.count("&")),
            "number_of_percent_encoded_chars": float(num_percent),
            "number_of_digits": float(num_digits),
            "digit_ratio": float(round(digit_ratio, 4)),
            "special_character_count": float(num_special),
            "subdomain_count": float(subdomains),
            "hostname_entropy": float(round(cls.shannon_entropy(hostname), 4)),
            "path_entropy": float(round(cls.shannon_entropy(path), 4)),
            "query_entropy": float(round(cls.shannon_entropy(query), 4)),
            "ip_address_hostname": float(is_ip),
            "punycode_indicator": float(is_puny),
            "suspicious_tld_indicator": float(is_suspicious_tld),
            "https_indicator": 1.0 if parsed.scheme == "https" else 0.0,
            "port_present": float(port_present),
            "unusual_port_indicator": float(unusual_port),
            "url_shortener_indicator": float(is_shortener)
        }


class URLDecisionFusion:
    """
    Evidence-based decision fusion combining:
    1. ML Inference Result (Isolation Forest + XGBoost)
    2. Threat Intelligence (Known malicious domains/IPs/URLs)
    3. Web Scanner Findings (Passive DNS, cert validity, keywords)
    4. Deterministic Security Rules
    """

    KNOWN_MALICIOUS_DOMAINS = {
        "malware-payload-staging.com",
        "phish-update-security.xyz",
        "free-iphone-scam-login.xyz",
        "credential-harvest-service.top",
        "c2-stealth-beacon.online",
        "bank-security-alert-update.com"
    }

    @classmethod
    def evaluate_threat_intelligence(cls, domain: str, url: str) -> Dict[str, Any]:
        """Check target against known local threat intelligence feeds."""
        dom_clean = domain.lower().strip()
        is_known = dom_clean in cls.KNOWN_MALICIOUS_DOMAINS or any(
            m in url.lower() for m in ["c2-stealth", "malware-payload", "free-iphone-scam"]
        )
        return {
            "source": "CYBERDOME Threat Intel Feed",
            "is_known_malicious": is_known,
            "status": "KNOWN_MALICIOUS" if is_known else "UNKNOWN",
            "threat_category": "Phishing / C2 Distribution" if is_known else None,
            "confidence": 1.0 if is_known else 0.0
        }

    @classmethod
    def fuse(
        cls,
        ml_result: MLURLAnalysisResult,
        threat_intel: Dict[str, Any],
        scanner_result: Dict[str, Any],
        security_rules: List[str]
    ) -> Dict[str, Any]:
        """Combine all four independent security evidence streams into a final verdict."""
        # 1. Authoritative Threat Intelligence precedence
        if threat_intel.get("is_known_malicious"):
            return {
                "final_verdict": "DANGEROUS",
                "severity": "CRITICAL",
                "confidence": 1.0,
                "primary_reason": f"Target domain matched authoritative threat intelligence: {threat_intel.get('threat_category', 'Malicious')}",
                "evidence": {
                    "threat_intelligence": threat_intel,
                    "ml": ml_result.model_dump(),
                    "scanner": scanner_result,
                    "rules_triggered": security_rules or ["RULE-THREAT-INTEL-MATCH"]
                }
            }

        # 2. Scanner Confirmed Malicious / Phishing Indicators
        scanner_indicators = scanner_result.get("phishingIndicators") or scanner_result.get("indicators") or []
        scanner_malicious = not scanner_result.get("isSafe", True) and len(scanner_indicators) >= 2

        if scanner_malicious:
            return {
                "final_verdict": "DANGEROUS",
                "severity": "HIGH",
                "confidence": 0.95,
                "primary_reason": f"Web scanner detected multiple deceptive phishing indicators: {', '.join(scanner_indicators[:2])}",
                "evidence": {
                    "threat_intelligence": threat_intel,
                    "ml": ml_result.model_dump(),
                    "scanner": scanner_result,
                    "rules_triggered": security_rules or ["RULE-SCANNER-PHISHING-PATTERN"]
                }
            }

        # 3. ML Model Confirmed Malicious
        if ml_result.verdict == "DANGEROUS":
            return {
                "final_verdict": "DANGEROUS",
                "severity": ml_result.severity,
                "confidence": ml_result.confidence,
                "primary_reason": (
                    f"Machine Learning classification identified high-probability phishing/malicious URL "
                    f"({ml_result.classification_probability:.2%}) with structural anomaly deviation."
                ),
                "evidence": {
                    "threat_intelligence": threat_intel,
                    "ml": ml_result.model_dump(),
                    "scanner": scanner_result,
                    "rules_triggered": security_rules
                }
            }

        # 4. Suspicious Concurrence
        if (
            ml_result.verdict == "SUSPICIOUS"
            or not scanner_result.get("isSafe", True)
            or len(scanner_indicators) > 0
            or len(security_rules) > 0
        ):
            return {
                "final_verdict": "SUSPICIOUS",
                "severity": "MEDIUM",
                "confidence": max(ml_result.confidence, 0.70),
                "primary_reason": "Multiple independent heuristic and behavioral indicators detected.",
                "evidence": {
                    "threat_intelligence": threat_intel,
                    "ml": ml_result.model_dump(),
                    "scanner": scanner_result,
                    "rules_triggered": security_rules
                }
            }

        # 5. Inconclusive / Insufficient Evidence handling (never assume SAFE when evidence is missing)
        if ml_result.verdict == "UNKNOWN" or ml_result.status in ("INSUFFICIENT_DATA", "ERROR"):
            return {
                "final_verdict": "UNKNOWN",
                "severity": "LOW",
                "confidence": 0.0,
                "primary_reason": (
                    "Inconclusive assessment: ML evidence is insufficient, incomplete or unavailable. "
                    "Safety cannot be verified without complete evidence."
                ),
                "evidence": {
                    "threat_intelligence": threat_intel,
                    "ml": ml_result.model_dump(),
                    "scanner": scanner_result,
                    "rules_triggered": security_rules or ["RULE-INSUFFICIENT-EVIDENCE"]
                }
            }

        # 6. Clean / Safe
        return {
            "final_verdict": "SAFE",
            "severity": "INFO",
            "confidence": ml_result.confidence,
            "primary_reason": "No malicious indicators observed across ML, scanner, or threat intelligence feeds.",
            "evidence": {
                "threat_intelligence": threat_intel,
                "ml": ml_result.model_dump(),
                "scanner": scanner_result,
                "rules_triggered": []
            }
        }


class MLURLService:
    _instance: Optional["MLURLService"] = None

    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent / "ml_models" / "url"
        self.feature_schema_path = self.base_dir / "preprocessing" / "feature_schema.json"
        self.scaler_path = self.base_dir / "preprocessing" / "scaler.joblib"
        self.iso_path = self.base_dir / "models" / "url_isolation_forest.joblib"
        self.xgb_path = self.base_dir / "models" / "url_xgboost.joblib"
        self.meta_path = self.base_dir / "metadata" / "model_metadata.json"

        self.feature_names: List[str] = []
        self.scaler: Optional[StandardScaler] = None
        self.isolation_forest: Optional[IsolationForest] = None
        self.xgboost: Optional[xgb.XGBClassifier] = None
        self.metadata: Dict[str, Any] = {}
        self.is_loaded: bool = False

        self.load_artifacts()

    @classmethod
    def get_instance(cls) -> "MLURLService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_artifacts(self) -> None:
        """Load all model artifacts and canonical schema."""
        try:
            if not self.feature_schema_path.exists():
                logger.warning("Feature schema not found at %s", self.feature_schema_path)
                return

            with open(self.feature_schema_path, "r", encoding="utf-8") as f:
                schema_data = json.load(f)
                self.feature_names = schema_data.get("features", [])

            if self.scaler_path.exists():
                self.scaler = joblib.load(self.scaler_path)

            if self.iso_path.exists():
                self.isolation_forest = joblib.load(self.iso_path)

            if self.xgb_path.exists():
                self.xgboost = joblib.load(self.xgb_path)

            if self.meta_path.exists():
                with open(self.meta_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)

            if self.scaler and self.isolation_forest and self.xgboost and self.feature_names:
                self.is_loaded = True
                logger.info(
                    "CYBERDOME Module 04 URL ML artifacts loaded successfully. Features: %d",
                    len(self.feature_names)
                )
        except Exception as exc:
            logger.error("Failed to load Module 04 URL ML artifacts: %s", exc)
            self.is_loaded = False

    def validate_and_prepare_features(self, features: Dict[str, Any]) -> pd.DataFrame:
        """
        Validate incoming features against the strict 27-feature canonical contract.
        Rejects missing features with InsufficientDataException (Zero Fake Imputation).
        Rejects NaN, Infinity, and non-numeric values.
        """
        if not self.feature_names:
            raise RuntimeError("Module 04 feature schema is not loaded.")

        missing = [f for f in self.feature_names if f not in features or features[f] is None]
        if missing:
            raise InsufficientDataException(
                missing_features=missing,
                provided_count=len(features),
                required_count=len(self.feature_names)
            )

        row = {}
        for feat in self.feature_names:
            val = features[feat]
            try:
                fval = float(val)
                if math.isnan(fval) or math.isinf(fval):
                    raise ValueError(f"Feature '{feat}' contains invalid non-finite value: {val}")
                row[feat] = fval
            except (ValueError, TypeError) as conv_err:
                raise ValueError(f"Feature '{feat}' has invalid numeric value '{val}': {conv_err}")

        df = pd.DataFrame([row], columns=self.feature_names)
        return df

    def predict(
        self,
        target: Any,
        environment: str = "REAL"
    ) -> MLURLAnalysisResult:
        """
        Perform inference for a raw URL string or pre-extracted feature dictionary.
        Executes both Isolation Forest and XGBoost in pure inference mode.
        """
        eval_time = datetime.now(timezone.utc).isoformat()
        env_tag = (environment or "REAL").upper()

        if not self.is_loaded:
            self.load_artifacts()
            if not self.is_loaded:
                return MLURLAnalysisResult(
                    status="ERROR",
                    verdict="UNKNOWN",
                    is_phishing=False,
                    is_malicious=False,
                    severity="LOW",
                    confidence=0.0,
                    environment=env_tag,
                    evaluated_at=eval_time,
                    error_message="Module 04 URL ML models are not initialized or loaded."
                )

        # Handle raw URL string vs feature dict
        if isinstance(target, str):
            if not target.strip():
                return MLURLAnalysisResult(
                    status="ERROR",
                    verdict="UNKNOWN",
                    is_phishing=False,
                    is_malicious=False,
                    severity="LOW",
                    confidence=0.0,
                    environment=env_tag,
                    evaluated_at=eval_time,
                    error_message="Empty URL string provided."
                )
            try:
                features_dict = URLFeatureExtractor.extract_features(target)
            except Exception as extract_err:
                return MLURLAnalysisResult(
                    status="ERROR",
                    verdict="UNKNOWN",
                    is_phishing=False,
                    is_malicious=False,
                    severity="LOW",
                    confidence=0.0,
                    environment=env_tag,
                    evaluated_at=eval_time,
                    error_message=f"Failed to extract features from URL: {extract_err}"
                )
        elif isinstance(target, dict):
            features_dict = target
        else:
            return MLURLAnalysisResult(
                status="ERROR",
                verdict="UNKNOWN",
                is_phishing=False,
                is_malicious=False,
                severity="LOW",
                confidence=0.0,
                environment=env_tag,
                evaluated_at=eval_time,
                error_message="Target must be a raw URL string or a dictionary of 27 features."
            )

        # Strict validation
        try:
            df = self.validate_and_prepare_features(features_dict)
        except InsufficientDataException as ide:
            return MLURLAnalysisResult(
                status="INSUFFICIENT_DATA",
                verdict="UNKNOWN",
                is_phishing=False,
                is_malicious=False,
                severity="LOW",
                confidence=0.0,
                environment=env_tag,
                features_evaluated=ide.provided_count,
                missing_features=ide.missing_features,
                evaluated_at=eval_time,
                error_message=str(ide)
            )
        except ValueError as ve:
            return MLURLAnalysisResult(
                status="ERROR",
                verdict="UNKNOWN",
                is_phishing=False,
                is_malicious=False,
                severity="LOW",
                confidence=0.0,
                environment=env_tag,
                evaluated_at=eval_time,
                error_message=str(ve)
            )

        # Scale features
        try:
            X_scaled = self.scaler.transform(df)
        except Exception as scale_err:
            return MLURLAnalysisResult(
                status="ERROR",
                verdict="UNKNOWN",
                is_phishing=False,
                is_malicious=False,
                severity="LOW",
                confidence=0.0,
                environment=env_tag,
                evaluated_at=eval_time,
                error_message=f"Scaling failed: {scale_err}"
            )

        # 1. Isolation Forest inference
        iso_pred = int(self.isolation_forest.predict(X_scaled)[0]) # 1 = normal, -1 = anomaly
        iso_score = float(self.isolation_forest.score_samples(X_scaled)[0])
        is_anomaly = bool(iso_pred == -1)

        # 2. XGBoost inference
        xgb_probas = self.xgboost.predict_proba(X_scaled)[0]
        xgb_pred = int(self.xgboost.predict(X_scaled)[0])
        phishing_prob = float(xgb_probas[1]) if len(xgb_probas) > 1 else float(xgb_pred)
        is_threat = bool(xgb_pred == 1 or phishing_prob >= 0.50)

        # Decision Fusion between IsoForest & XGBoost
        if is_threat and is_anomaly:
            verdict = "DANGEROUS"
            severity = "CRITICAL"
            confidence = max(phishing_prob, 0.85)
            is_mal = True
        elif is_threat and not is_anomaly:
            verdict = "DANGEROUS"
            severity = "HIGH"
            confidence = max(phishing_prob, 0.75)
            is_mal = True
        elif is_anomaly and phishing_prob >= 0.15:
            verdict = "SUSPICIOUS"
            severity = "MEDIUM"
            confidence = max(phishing_prob, 0.65)
            is_mal = True
        else:
            verdict = "SAFE"
            severity = "INFO"
            confidence = float(1.0 - phishing_prob)
            is_mal = False

        return MLURLAnalysisResult(
            status="SUCCESS",
            model_version="url-phishing-v1",
            dataset_benchmark="PhishTank_OpenPhish_Benchmark",
            verdict=verdict,
            is_phishing=is_threat,
            is_malicious=is_mal,
            severity=severity,
            confidence=float(round(confidence, 4)),
            anomaly_score=float(round(iso_score, 4)),
            classification_probability=float(round(phishing_prob, 4)),
            environment=env_tag,
            isolation_forest={
                "prediction": iso_pred,
                "is_anomaly": is_anomaly,
                "anomaly_score": float(round(iso_score, 4)),
            },
            xgboost={
                "prediction": xgb_pred,
                "probabilities": {
                    "BENIGN": float(round(xgb_probas[0], 4)),
                    "PHISHING": float(round(xgb_probas[1], 4)),
                },
                "phishing_probability": float(round(phishing_prob, 4)),
            },
            features_evaluated=len(self.feature_names),
            evaluated_at=eval_time
        )

    async def process_and_correlate_url_ml_event(
        self,
        db: AsyncSession,
        company_id: str,
        url: str,
        domain: str,
        analysis: MLURLAnalysisResult,
        fused_decision: Dict[str, Any],
        user_id: Optional[str] = None,
        source_ip: Optional[str] = None,
        environment: str = "REAL"
    ) -> Optional[Any]:
        """
        Persists a SecurityEvent for malicious/phishing URLs, correlates into an Incident,
        broadcasts real-time tenant WebSocket alert, and records an immutable Audit Log.
        """
        from app.models.models import CompanyUser, User
        from app.models.phase4 import SecurityEvent
        from app.services.incidents.correlation import IncidentCorrelationEngine, DetectionResult
        from app.core.websocket import ws_manager

        now_dt = datetime.now(timezone.utc).replace(tzinfo=None)
        env_tag = (environment or "REAL").upper()
        sec_event_id = str(uuid.uuid4())

        final_verdict = fused_decision.get("final_verdict", analysis.verdict)
        severity = fused_decision.get("severity", analysis.severity)
        confidence = fused_decision.get("confidence", analysis.confidence)
        reason = fused_decision.get("primary_reason", "Malicious URL threat detected.")

        title_prefix = f"[{final_verdict}]"
        if env_tag == "SIMULATION":
            title_prefix = f"[SIMULATION] {title_prefix}"

        meta_with_env = {
            "module": "url_phishing_detection",
            "model_version": "url-phishing-v1",
            "url": url,
            "domain": domain,
            "verdict": final_verdict,
            "environment": env_tag,
            "fused_decision": fused_decision,
            "ml_analysis": analysis.model_dump(),
            "user_id": user_id,
            "source_ip": source_ip,
        }

        sec_event = SecurityEvent(
            id=sec_event_id,
            event_id=sec_event_id,
            company_id=company_id,
            rule_id=f"URL-ML-{final_verdict}",
            title=f"{title_prefix} Malicious URL Detected: {domain}",
            description=(
                f"URL Security Engine verdict: {final_verdict} for domain '{domain}'. "
                f"Reason: {reason}. Confidence: {confidence:.2%}. Target: {url}"
            ),
            severity=severity,
            confidence=confidence,
            source="ml_engine:url-phishing-v1",
            entity_type="URL",
            entity_id=domain or url,
            risk_score=float(confidence * 100.0),
            metadata_json=meta_with_env,
            environment=env_tag,
            timestamp=now_dt,
            created_at=now_dt,
        )
        db.add(sec_event)
        await db.commit()
        await db.refresh(sec_event)

        # Correlate into Incident
        det_result = DetectionResult(
            id=sec_event.id,
            rule_id=sec_event.rule_id,
            title=sec_event.title,
            description=sec_event.description,
            severity=sec_event.severity,
            confidence=sec_event.confidence,
            source=sec_event.source,
            entity_type=sec_event.entity_type,
            entity_id=sec_event.entity_id,
            risk_score=sec_event.risk_score,
            timestamp=now_dt,
            metadata=meta_with_env,
            event_id=sec_event.event_id,
            company_id=company_id,
        )

        try:
            await IncidentCorrelationEngine.correlate_detections(
                db, company_id, [det_result]
            )
        except Exception as corr_exc:
            logger.error("Failed to correlate URL detection into incident: %s", corr_exc)

        # Real-time WebSocket emission to tenant channel
        try:
            await ws_manager.broadcast_to_company(
                company_id=company_id,
                event_type="url_threat_detected",
                data={
                    "id": sec_event.id,
                    "title": sec_event.title,
                    "severity": sec_event.severity,
                    "verdict": final_verdict,
                    "confidence": sec_event.confidence,
                    "environment": env_tag,
                    "url": url,
                    "domain": domain,
                    "userId": user_id,
                    "sourceIp": source_ip,
                    "timestamp": now_dt.isoformat(),
                }
            )
        except Exception as ws_exc:
            logger.error("Failed to broadcast URL detection WebSocket event: %s", ws_exc)

        # Immutable Audit Log
        try:
            from app.core.dependencies import create_audit_entry
            await create_audit_entry(
                db=db,
                action="URL_THREAT_DETECTED",
                result="DETECTED",
                company_id=company_id,
                resource_type="url",
                resource_id=domain or url,
                ip_address=source_ip,
                metadata={
                    "verdict": final_verdict,
                    "severity": sec_event.severity,
                    "confidence": sec_event.confidence,
                    "environment": env_tag,
                    "url": url,
                    "domain": domain,
                }
            )
        except Exception as audit_exc:
            logger.error("Failed to create audit log for URL detection: %s", audit_exc)

        return sec_event

    def get_health_status(self) -> Dict[str, Any]:
        """Return diagnostic health check for Module 04 artifacts."""
        return {
            "status": "HEALTHY" if self.is_loaded else "DEGRADED",
            "module": "url_phishing_detection",
            "model_version": "url-phishing-v1",
            "dataset_benchmark": "PhishTank_OpenPhish_Benchmark",
            "feature_count": len(self.feature_names),
            "artifacts_loaded": {
                "scaler": self.scaler is not None,
                "isolation_forest": self.isolation_forest is not None,
                "xgboost": self.xgboost is not None,
                "schema": len(self.feature_names) == 27,
            },
            "zero_imputation_enforced": True,
            "decision_fusion_ready": True
        }


# Singleton instance
ml_url_service = MLURLService.get_instance()
