"""
CYBERDOME — Module 03 User & Entity Behavior Analytics (UEBA) ML Service.

Inference engine for pre-trained CERT Insider Threat benchmark models:
1. StandardScaler (30 canonical behavioral features)
2. Isolation Forest (Unsupervised Behavioral Anomaly Detection: 1=Normal, -1=Anomaly)
3. XGBoost Classifier (Supervised Insider Threat Classification: 0=BENIGN, 1=THREAT)

Strict Invariants:
- Zero Retraining: Models run solely in inference mode. Never call .fit() or .fit_transform().
- Strict Completeness: Zero fake feature imputation. Missing features trigger INSUFFICIENT_DATA.
- Exact Feature Ordering: Enforced via feature_schema.json (30 features).
- Multi-Tenant Isolation: Scoped to company_id from authenticated JWT session.
- Real vs Simulation Segregation: Propagates environment tag without metric pollution.
"""

from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime, timezone
import json
import logging
import math
import uuid
import joblib
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings

logger = logging.getLogger("cyberdome.ml.ueba")


class InsufficientDataException(Exception):
    """Raised when an inference request lacks required UEBA features."""
    def __init__(self, missing_features: List[str], provided_count: int, required_count: int = 30):
        self.missing_features = missing_features
        self.provided_count = provided_count
        self.required_count = required_count
        super().__init__(
            f"Insufficient UEBA behavioral data for ML inference: missing {len(missing_features)} of {required_count} features."
        )


class MLUEBAAnalysisResult(BaseModel):
    status: str = "SUCCESS"  # SUCCESS, INSUFFICIENT_DATA, ERROR
    model_version: str = "ueba-anomaly-v1"
    dataset_benchmark: str = "CERT_Insider_Threat"
    verdict: str  # BENIGN_USER, UEBA_ANOMALY, CLASSIFIED_INSIDER_THREAT, CONFIRMED_INSIDER_THREAT
    is_anomaly: bool
    is_threat: bool
    severity: str  # INFO, LOW, MEDIUM, HIGH, CRITICAL
    confidence: float
    anomaly_score: float = 0.0
    xgboost_probability: float = 0.0
    environment: str = "REAL"  # REAL, SIMULATION
    isolation_forest: Dict[str, Any] = Field(default_factory=dict)
    xgboost: Dict[str, Any] = Field(default_factory=dict)
    features_evaluated: int = 30
    evaluated_at: str
    missing_features: Optional[List[str]] = None
    error_message: Optional[str] = None


class UEBAFeatureAdapter:
    """Adapter to extract and prepare 30-feature behavioral vectors from raw activity payloads."""

    @staticmethod
    def extract_features(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract candidate 30 features from raw dictionary or nested structures.
        Supports:
        - Explicit dict under 'features'
        - Explicit dict under 'ueba_features' or 'behavior_features'
        - Direct dict containing known UEBA feature keys (e.g. 'hour_of_day', 'file_access_count')
        """
        if not isinstance(data, dict):
            return None
        if "features" in data and isinstance(data["features"], dict):
            return data["features"]
        if "ueba_features" in data and isinstance(data["ueba_features"], dict):
            return data["ueba_features"]
        if "behavior_features" in data and isinstance(data["behavior_features"], dict):
            return data["behavior_features"]
        if "hour_of_day" in data or "file_access_count" in data or "removable_media_events" in data:
            return data
        return None


class MLUEBAService:
    _instance: Optional["MLUEBAService"] = None

    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent / "ml_models" / "ueba"
        self.feature_schema_path = self.base_dir / "preprocessing" / "feature_schema.json"
        self.scaler_path = self.base_dir / "preprocessing" / "scaler.joblib"
        self.iso_path = self.base_dir / "models" / "ueba_isolation_forest.joblib"
        self.xgb_path = self.base_dir / "models" / "ueba_xgboost.joblib"
        self.metadata_path = self.base_dir / "metadata" / "model_metadata.json"

        self.feature_names: List[str] = []
        self.scaler = None
        self.isolation_forest = None
        self.xgboost = None
        self.metadata = {}

        self._load_artifacts()

    @classmethod
    def get_instance(cls) -> "MLUEBAService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_artifacts(self) -> None:
        """Loads all four artifacts into memory once at startup."""
        logger.info("Initializing CYBERDOME Module 03 UEBA ML Service...")

        # 1. Feature Schema
        if not self.feature_schema_path.exists():
            raise FileNotFoundError(f"UEBA Feature schema missing: {self.feature_schema_path}")
        with open(self.feature_schema_path, "r", encoding="utf-8") as f:
            schema_data = json.load(f)
            self.feature_names = schema_data.get("features", [])
        if len(self.feature_names) != 30:
            raise ValueError(f"Expected exactly 30 UEBA features, found {len(self.feature_names)}")

        # 2. Scaler
        if not self.scaler_path.exists():
            raise FileNotFoundError(f"Scaler missing: {self.scaler_path}")
        self.scaler = joblib.load(self.scaler_path)
        if getattr(self.scaler, "n_features_in_", None) != 30:
            raise ValueError(f"Scaler features mismatch: expected 30, got {getattr(self.scaler, 'n_features_in_', None)}")

        # 3. Isolation Forest
        if not self.iso_path.exists():
            raise FileNotFoundError(f"Isolation Forest artifact missing: {self.iso_path}")
        self.isolation_forest = joblib.load(self.iso_path)
        if getattr(self.isolation_forest, "n_features_in_", None) != 30:
            raise ValueError(f"Isolation Forest features mismatch: expected 30, got {getattr(self.isolation_forest, 'n_features_in_', None)}")

        # 4. XGBoost Classifier
        if not self.xgb_path.exists():
            raise FileNotFoundError(f"XGBoost artifact missing: {self.xgb_path}")
        self.xgboost = joblib.load(self.xgb_path)
        if getattr(self.xgboost, "n_features_in_", None) != 30:
            raise ValueError(f"XGBoost features mismatch: expected 30, got {getattr(self.xgboost, 'n_features_in_', None)}")

        # 5. Metadata
        if self.metadata_path.exists():
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

        self.is_loaded = True
        logger.info("CYBERDOME Module 03 UEBA ML Service loaded successfully (30 features).")

    def get_health_status(self) -> Dict[str, Any]:
        """Returns diagnostic health and loaded metadata."""
        return {
            "status": "HEALTHY",
            "module": "ueba_anomaly_detection",
            "model_version": "ueba-anomaly-v1",
            "dataset_benchmark": "CERT_Insider_Threat",
            "artifacts_loaded": {
                "scaler": self.scaler is not None,
                "isolation_forest": self.isolation_forest is not None,
                "xgboost": self.xgboost is not None,
                "schema": len(self.feature_names) == 30,
            },
            "feature_count": len(self.feature_names),
            "features": self.feature_names,
            "classes": [int(c) for c in getattr(self.xgboost, "classes_", [0, 1])],
            "zero_imputation_enforced": True,
            "environment_support": ["REAL", "SIMULATION"],
        }

    def validate_and_prepare_features(self, raw_features: Dict[str, Any]) -> pd.DataFrame:
        """
        Validates feature completeness (all 30 required) and builds DataFrame in authoritative schema order.
        Strictly forbids zero fake imputation.
        Rejects non-numeric, NaN, and Infinity.
        """
        if not isinstance(raw_features, dict):
            raise ValueError("Behavioral telemetry features must be a dictionary.")

        missing = []
        found_features = {}
        feature_vector = {}

        for feat in self.feature_names:
            val = None
            if feat in raw_features and raw_features[feat] is not None:
                val = raw_features[feat]
            else:
                for k in raw_features.keys():
                    if k.strip().lower() == feat.strip().lower():
                        if raw_features[k] is not None:
                            val = raw_features[k]
                        break

            if val is None:
                missing.append(feat)
            else:
                found_features[feat] = val

        if missing:
            raise InsufficientDataException(
                missing_features=missing,
                provided_count=len(raw_features),
                required_count=len(self.feature_names),
            )

        for feat in self.feature_names:
            val = found_features[feat]
            try:
                numeric_val = float(val)
            except (ValueError, TypeError):
                raise ValueError(f"Feature '{feat}' must be numeric, got: {val!r}")

            if math.isnan(numeric_val) or math.isinf(numeric_val):
                raise ValueError(f"Feature '{feat}' contains invalid non-finite value: {numeric_val}")

            feature_vector[feat] = numeric_val

        df = pd.DataFrame([feature_vector], columns=self.feature_names)
        return df

    def predict(self, raw_features: Dict[str, Any], environment: str = "REAL") -> MLUEBAAnalysisResult:
        """
        Executes dual UEBA ML inference over 30-feature vector.
        Inference only: never modifies weights or retrains.
        """
        now_str = datetime.now(timezone.utc).isoformat()
        env_tag = (environment or "REAL").upper()

        # Step 1: Strict feature validation
        try:
            df = self.validate_and_prepare_features(raw_features)
        except InsufficientDataException as ide:
            return MLUEBAAnalysisResult(
                status="INSUFFICIENT_DATA",
                model_version="ueba-anomaly-v1",
                dataset_benchmark="CERT_Insider_Threat",
                verdict="INSUFFICIENT_DATA",
                is_anomaly=False,
                is_threat=False,
                severity="INFO",
                confidence=0.0,
                environment=env_tag,
                features_evaluated=ide.provided_count,
                evaluated_at=now_str,
                missing_features=ide.missing_features,
                error_message=str(ide),
            )
        except Exception as exc:
            return MLUEBAAnalysisResult(
                status="ERROR",
                model_version="ueba-anomaly-v1",
                dataset_benchmark="CERT_Insider_Threat",
                verdict="EVALUATION_ERROR",
                is_anomaly=False,
                is_threat=False,
                severity="INFO",
                confidence=0.0,
                environment=env_tag,
                features_evaluated=0,
                evaluated_at=now_str,
                error_message=str(exc),
            )

        # Step 2: StandardScaler transformation
        scaled_features = self.scaler.transform(df)

        # Step 3: Isolation Forest (unsupervised)
        iso_pred_raw = int(self.isolation_forest.predict(scaled_features)[0])
        iso_score = float(self.isolation_forest.decision_function(scaled_features)[0])
        is_iso_anomaly = bool(iso_pred_raw == -1)

        iso_result = {
            "prediction": iso_pred_raw,
            "label": "ANOMALY" if is_iso_anomaly else "NORMAL",
            "is_anomaly": is_iso_anomaly,
            "anomaly_score": round(iso_score, 6),
            "description": (
                "Unsupervised user behavioral baseline deviation detected (off-hours / unusual resource pattern)."
                if is_iso_anomaly else "User activity conforms to standard behavioral baseline distribution."
            ),
        }

        # Step 4: XGBoost Classifier (supervised)
        xgb_pred_raw = int(self.xgboost.predict(scaled_features)[0])
        xgb_probs = self.xgboost.predict_proba(scaled_features)[0]
        xgb_classes = [int(c) for c in getattr(self.xgboost, "classes_", [0, 1])]

        prob_dict = {}
        for c, p in zip(xgb_classes, xgb_probs):
            key = "THREAT" if c == 1 else "BENIGN"
            prob_dict[key] = round(float(p), 6)

        is_xgb_threat = bool(xgb_pred_raw == 1)
        xgb_confidence = float(xgb_probs[xgb_pred_raw])

        xgb_result = {
            "prediction": xgb_pred_raw,
            "label": "THREAT" if is_xgb_threat else "BENIGN",
            "is_threat": is_xgb_threat,
            "confidence": round(xgb_confidence, 6),
            "probabilities": prob_dict,
            "description": (
                "Supervised gradient boosted decision tree matched insider threat exfiltration / privilege signature."
                if is_xgb_threat else "Activity profile aligns with standard employee work patterns."
            ),
        }

        # Step 5: Decision Fusion
        if is_xgb_threat and is_iso_anomaly:
            verdict = "CONFIRMED_INSIDER_THREAT"
            severity = "CRITICAL"
            confidence = round(max(xgb_confidence, 0.92), 4)
        elif is_xgb_threat:
            verdict = "CLASSIFIED_INSIDER_THREAT"
            severity = "HIGH" if xgb_confidence >= 0.85 else "MEDIUM"
            confidence = round(xgb_confidence, 4)
        elif is_iso_anomaly:
            verdict = "UEBA_ANOMALY"
            severity = "MEDIUM" if iso_score < -0.10 else "LOW"
            confidence = round(min(0.85, 0.50 + abs(iso_score)), 4)
        else:
            verdict = "BENIGN_USER"
            severity = "INFO"
            confidence = round(xgb_probs[0], 4)

        return MLUEBAAnalysisResult(
            status="SUCCESS",
            model_version="ueba-anomaly-v1",
            dataset_benchmark="CERT_Insider_Threat",
            verdict=verdict,
            is_anomaly=is_iso_anomaly,
            is_threat=is_xgb_threat,
            severity=severity,
            confidence=confidence,
            anomaly_score=round(iso_score, 6),
            xgboost_probability=round(float(xgb_probs[1]), 6),
            environment=env_tag,
            isolation_forest=iso_result,
            xgboost=xgb_result,
            features_evaluated=len(self.feature_names),
            evaluated_at=now_str,
        )

    async def process_and_correlate_ueba_ml_event(
        self,
        db: AsyncSession,
        company_id: str,
        user_id: str,
        user_name: str,
        analysis: MLUEBAAnalysisResult,
        source_ip: Optional[str] = None,
        resource: Optional[str] = None,
        environment: str = "REAL",
    ) -> Optional[Any]:
        """
        Creates SecurityEvent, correlates into Incident, updates user risk profile,
        emits WebSocket alert, and records immutable audit log.
        """
        if not (analysis.is_anomaly or analysis.is_threat):
            return None

        from app.models.models import CompanyUser, User
        from app.models.phase4 import SecurityEvent
        from app.services.incidents.correlation import IncidentCorrelationEngine, DetectionResult
        from app.core.websocket import ws_manager

        now_dt = datetime.now(timezone.utc).replace(tzinfo=None)
        env_tag = (environment or "REAL").upper()
        sec_event_id = str(uuid.uuid4())

        title_prefix = f"[{analysis.verdict}]"
        if env_tag == "SIMULATION":
            title_prefix = f"[SIMULATION] {title_prefix}"

        meta_with_env = {
            "module": "ueba_anomaly_detection",
            "model_version": "ueba-anomaly-v1",
            "verdict": analysis.verdict,
            "isolation_forest": analysis.isolation_forest,
            "xgboost": analysis.xgboost,
            "environment": env_tag,
            "user_id": user_id,
            "user_name": user_name,
            "source_ip": source_ip,
            "resource": resource,
        }

        sec_event = SecurityEvent(
            id=sec_event_id,
            event_id=sec_event_id,
            company_id=company_id,
            rule_id=f"UEBA-ML-{analysis.verdict}",
            title=f"{title_prefix} Insider Threat Detected for {user_name}",
            description=(
                f"Machine Learning UEBA threat detection: {analysis.verdict} on user {user_name} ({user_id}). "
                f"XGBoost probability: {analysis.xgboost.get('probabilities', {}).get('THREAT', 0.0):.2%}, "
                f"Isolation Forest score: {analysis.isolation_forest.get('anomaly_score', 0.0):.4f}."
            ),
            severity=analysis.severity,
            confidence=analysis.confidence,
            source="ml_engine:ueba-anomaly-v1-cert",
            entity_type="USER",
            entity_id=user_id,
            risk_score=float(analysis.confidence * 100.0),
            metadata_json=meta_with_env,
            environment=env_tag,
            timestamp=now_dt,
            created_at=now_dt,
        )
        db.add(sec_event)
        await db.commit()
        await db.refresh(sec_event)

        # Update CompanyUser risk level in database if membership exists
        mem_res = await db.execute(
            select(CompanyUser).where(CompanyUser.user_id == user_id, CompanyUser.company_id == company_id)
        )
        membership = mem_res.scalar_one_or_none()
        if membership:
            membership.risk_score = max(membership.risk_score or 0.0, float(analysis.confidence * 100.0))
            membership.risk_level = "CRITICAL" if analysis.severity == "CRITICAL" else "HIGH" if analysis.severity == "HIGH" else "MEDIUM"
            membership.calculated_at = now_dt
            membership.evidence_count = (membership.evidence_count or 0) + 1
            await db.commit()

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
            logger.error("Failed to correlate UEBA detection into incident: %s", corr_exc)

        # Real-time WebSocket emission to tenant channel
        try:
            await ws_manager.broadcast_to_company(
                company_id=company_id,
                event_type="ueba_threat_detected",
                data={
                    "id": sec_event.id,
                    "title": sec_event.title,
                    "severity": sec_event.severity,
                    "verdict": analysis.verdict,
                    "confidence": sec_event.confidence,
                    "environment": env_tag,
                    "userId": user_id,
                    "userName": user_name,
                    "sourceIp": source_ip,
                    "resource": resource,
                    "timestamp": now_dt.isoformat(),
                }
            )
        except Exception as ws_exc:
            logger.error("Failed to broadcast UEBA detection WebSocket event: %s", ws_exc)

        # Immutable Audit Log
        try:
            from app.core.dependencies import create_audit_entry
            await create_audit_entry(
                db=db,
                action="UEBA_THREAT_DETECTED",
                result="DETECTED",
                company_id=company_id,
                resource_type="user",
                resource_id=user_id,
                ip_address=source_ip,
                metadata={
                    "verdict": analysis.verdict,
                    "severity": sec_event.severity,
                    "confidence": sec_event.confidence,
                    "environment": env_tag,
                    "user_name": user_name,
                }
            )
        except Exception as audit_exc:
            logger.error("Failed to create audit log for UEBA detection: %s", audit_exc)

        return sec_event


# Singleton instance
ml_ueba_service = MLUEBAService.get_instance()
