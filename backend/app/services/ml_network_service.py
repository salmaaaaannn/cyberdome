"""
CYBERDOME — Module 01 Network Anomaly Detection ML Service.

Inference engine for pre-trained CIC-IDS2017 benchmark models:
1. StandardScaler (77 features)
2. Isolation Forest (Unsupervised Anomaly Detection: 1=Normal, -1=Anomaly)
3. XGBoost Classifier (Supervised Attack Detection: 0=BENIGN, 1=ATTACK)

Strict Invariants:
- Zero Retraining: Models run solely in inference mode. Never call .fit() or .fit_transform().
- Strict Completeness: Zero fake feature imputation. Missing features trigger INSUFFICIENT_DATA.
- Exact Feature Ordering: Enforced via feature_schema.json (77 features).
- Benchmark Transparency: CIC-IDS2017 evaluation split metrics, no fabricated production certainty.
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

logger = logging.getLogger("cyberdome.ml.network")


class InsufficientDataException(Exception):
    """Raised when an inference request lacks required CIC-IDS2017 features."""
    def __init__(self, missing_features: List[str], provided_count: int, required_count: int = 77):
        self.missing_features = missing_features
        self.provided_count = provided_count
        self.required_count = required_count
        super().__init__(
            f"Insufficient telemetry data for ML inference: missing {len(missing_features)} of {required_count} features."
        )


class MLAnalysisResult(BaseModel):
    status: str = "SUCCESS"  # SUCCESS, INSUFFICIENT_DATA, ERROR
    model_version: str = "v1.0.0-cic-ids2017"
    dataset_benchmark: str = "CIC-IDS2017"
    verdict: str  # BENIGN, NETWORK_ANOMALY, CLASSIFIED_ATTACK, CONFIRMED_ATTACK
    is_anomaly: bool
    is_attack: bool
    severity: str  # INFO, LOW, MEDIUM, HIGH, CRITICAL
    confidence: float
    environment: str = "REAL"  # REAL, SIMULATION
    isolation_forest: Dict[str, Any]
    xgboost: Dict[str, Any]
    features_evaluated: int = 77
    evaluated_at: str
    missing_features: Optional[List[str]] = None
    error_message: Optional[str] = None


class NetworkFeatureAdapter:
    """Adapter to extract and prepare network flow features from various payload schemas."""

    @staticmethod
    def extract_features(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract candidate 77 features from raw dictionary or nested structures.
        Supports:
        - Explicit dict under 'features'
        - Explicit dict under 'cic_ids'
        - Direct dict containing CIC-IDS feature keys
        """
        if not isinstance(data, dict):
            return None
        if "features" in data and isinstance(data["features"], dict):
            return data["features"]
        if "cic_ids" in data and isinstance(data["cic_ids"], dict):
            return data["cic_ids"]
        # Check if direct dictionary has known CIC-IDS2017 feature keys
        if "Protocol" in data or "Flow Duration" in data:
            return data
        return None


class MLNetworkService:
    _instance: Optional["MLNetworkService"] = None

    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent / "ml_models" / "network"
        self.feature_schema_path = self.base_dir / "feature_schema.json"
        self.scaler_path = self.base_dir / "scaler.joblib"
        self.iso_path = self.base_dir / "network_isolation_forest.joblib"
        self.xgb_path = self.base_dir / "network_xgboost.joblib"

        self.feature_names: List[str] = []
        self.scaler = None
        self.isolation_forest = None
        self.xgboost = None

        self.is_loaded: bool = False
        self.load_error: Optional[str] = None
        self.loaded_at: Optional[datetime] = None

        self._load_artifacts()

    @classmethod
    def get_instance(cls) -> "MLNetworkService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_artifacts(self) -> None:
        """Load and validate all 4 artifacts from disk."""
        try:
            logger.info("Loading CYBERDOME Module 01 Network ML artifacts...")

            # 1. Feature Schema
            if not self.feature_schema_path.exists():
                raise FileNotFoundError(f"Missing feature schema at {self.feature_schema_path}")
            with open(self.feature_schema_path, "r", encoding="utf-8") as f:
                self.feature_names = json.load(f)

            if len(self.feature_names) != 77:
                raise ValueError(
                    f"Feature schema must contain exactly 77 features, found {len(self.feature_names)}"
                )

            # 2. Scaler
            if not self.scaler_path.exists():
                raise FileNotFoundError(f"Missing scaler at {self.scaler_path}")
            self.scaler = joblib.load(self.scaler_path)

            # 3. Isolation Forest
            if not self.iso_path.exists():
                raise FileNotFoundError(f"Missing Isolation Forest at {self.iso_path}")
            self.isolation_forest = joblib.load(self.iso_path)

            # 4. XGBoost
            if not self.xgb_path.exists():
                raise FileNotFoundError(f"Missing XGBoost model at {self.xgb_path}")
            self.xgboost = joblib.load(self.xgb_path)

            self.is_loaded = True
            self.load_error = None
            self.loaded_at = datetime.now(timezone.utc)
            logger.info("CYBERDOME Network ML artifacts loaded successfully (77 features).")

        except Exception as exc:
            self.is_loaded = False
            self.load_error = str(exc)
            logger.error("Failed to load Network ML artifacts: %s", exc)

    def get_health_status(self) -> Dict[str, Any]:
        """Return diagnostic health and capability status of the ML service."""
        return {
            "status": "HEALTHY" if self.is_loaded else "UNHEALTHY",
            "enabled": settings.NETWORK_ML_ENABLED,
            "model_version": settings.NETWORK_ML_MODEL_VERSION,
            "dataset_benchmark": "CIC-IDS2017",
            "features_count": len(self.feature_names),
            "features_schema": self.feature_names,
            "models_loaded": {
                "feature_schema": len(self.feature_names) == 77,
                "scaler": self.scaler is not None,
                "isolation_forest": self.isolation_forest is not None,
                "xgboost": self.xgboost is not None,
            },
            "loaded_at": self.loaded_at.isoformat() if self.loaded_at else None,
            "load_error": self.load_error,
        }

    def validate_and_prepare_features(self, raw_features: Dict[str, Any]) -> pd.DataFrame:
        """
        Validates feature completeness against the authoritative 77-feature schema.
        ZERO fake feature imputation: if any feature is missing, raises InsufficientDataException.
        Rejects non-numeric, NaN, or Inf values.
        Returns a single-row DataFrame with columns in exact schema order.
        """
        if not self.is_loaded:
            raise RuntimeError(f"Network ML service is not loaded: {self.load_error}")

        missing = []
        feature_vector = {}

        found_features = {}
        protocol_aliases = {"tcp": 6.0, "udp": 17.0, "icmp": 1.0, "gre": 47.0, "esp": 50.0}

        for feat in self.feature_names:
            val = None
            if feat in raw_features and raw_features[feat] is not None:
                val = raw_features[feat]
            else:
                # Also check case-insensitive or stripped variants
                for k in raw_features.keys():
                    if k.strip().lower() == feat.strip().lower():
                        if raw_features[k] is not None:
                            val = raw_features[k]
                        break

            if val is None:
                missing.append(feat)
            else:
                found_features[feat] = val

        # Missing features take precedence: zero fake imputation
        if missing:
            raise InsufficientDataException(
                missing_features=missing,
                provided_count=len(raw_features),
                required_count=len(self.feature_names),
            )

        # Validate numeric types and finiteness on complete feature set
        for feat in self.feature_names:
            val = found_features[feat]
            if feat.lower() == "protocol" and isinstance(val, str) and val.strip().lower() in protocol_aliases:
                numeric_val = protocol_aliases[val.strip().lower()]
            else:
                try:
                    numeric_val = float(val)
                except (ValueError, TypeError):
                    raise ValueError(f"Feature '{feat}' must be numeric, got: {val!r}")

            if math.isnan(numeric_val) or math.isinf(numeric_val):
                raise ValueError(f"Feature '{feat}' contains invalid non-finite value: {numeric_val}")

            feature_vector[feat] = numeric_val

        # Build DataFrame strictly in authoritative schema order
        df = pd.DataFrame([feature_vector], columns=self.feature_names)
        return df

    def predict(self, raw_features: Dict[str, Any], environment: str = "REAL") -> MLAnalysisResult:
        """
        Executes ML inference over 77-feature vector.
        Inference only: never calls .fit() or modifies model state.
        Preserves environment tag (REAL vs SIMULATION).
        """
        now_str = datetime.now(timezone.utc).isoformat()
        env_tag = (environment or "REAL").upper()

        # Step 1: Strict validation & dataframe construction
        try:
            df = self.validate_and_prepare_features(raw_features)
        except InsufficientDataException as ide:
            return MLAnalysisResult(
                status="INSUFFICIENT_DATA",
                model_version=settings.NETWORK_ML_MODEL_VERSION,
                dataset_benchmark="CIC-IDS2017",
                verdict="INSUFFICIENT_TELEMETRY",
                is_anomaly=False,
                is_attack=False,
                severity="INFO",
                confidence=0.0,
                environment=env_tag,
                isolation_forest={},
                xgboost={},
                features_evaluated=ide.provided_count,
                evaluated_at=now_str,
                missing_features=ide.missing_features,
                error_message=str(ide),
            )
        except Exception as exc:
            return MLAnalysisResult(
                status="ERROR",
                model_version=settings.NETWORK_ML_MODEL_VERSION,
                dataset_benchmark="CIC-IDS2017",
                verdict="EVALUATION_ERROR",
                is_anomaly=False,
                is_attack=False,
                severity="INFO",
                confidence=0.0,
                environment=env_tag,
                isolation_forest={},
                xgboost={},
                features_evaluated=0,
                evaluated_at=now_str,
                error_message=str(exc),
            )

        # Step 2: Scaling
        scaled_features = self.scaler.transform(df)

        # Step 3: Isolation Forest Inference
        # 1 = Normal, -1 = Anomaly
        iso_pred_raw = int(self.isolation_forest.predict(scaled_features)[0])
        iso_score = float(self.isolation_forest.decision_function(scaled_features)[0])
        is_iso_anomaly = bool(iso_pred_raw == -1)

        iso_result = {
            "prediction": iso_pred_raw,
            "label": "ANOMALY" if is_iso_anomaly else "NORMAL",
            "is_anomaly": is_iso_anomaly,
            "anomaly_score": round(iso_score, 6),
            "description": (
                "Unsupervised statistical deviation detected across multi-dimensional flow metrics."
                if is_iso_anomaly else "Flow falls within learned normal distribution bounds."
            ),
        }

        # Step 4: XGBoost Supervised Inference
        # 0 = BENIGN, 1 = ATTACK
        xgb_pred_raw = int(self.xgboost.predict(scaled_features)[0])
        xgb_probs = self.xgboost.predict_proba(scaled_features)[0]
        xgb_classes = [int(c) for c in getattr(self.xgboost, "classes_", [0, 1])]

        prob_dict = {}
        for c, p in zip(xgb_classes, xgb_probs):
            key = "ATTACK" if c == 1 else "BENIGN"
            prob_dict[key] = round(float(p), 6)

        is_xgb_attack = bool(xgb_pred_raw == 1)
        xgb_confidence = float(xgb_probs[xgb_pred_raw])

        xgb_result = {
            "prediction": xgb_pred_raw,
            "label": "ATTACK" if is_xgb_attack else "BENIGN",
            "is_attack": is_xgb_attack,
            "confidence": round(xgb_confidence, 6),
            "probabilities": prob_dict,
            "description": (
                "Supervised gradient boosted decision tree matched malicious intrusion flow patterns."
                if is_xgb_attack else "Flow classified as benign network traffic."
            ),
        }

        # Step 5: Ensemble Decision & Severity Assignment
        is_overall_anomaly = is_iso_anomaly or is_xgb_attack

        if is_xgb_attack and is_iso_anomaly:
            verdict = "CONFIRMED_ATTACK"
            severity = "CRITICAL"
            overall_confidence = max(xgb_confidence, 0.90)
        elif is_xgb_attack:
            verdict = "CLASSIFIED_ATTACK"
            severity = "HIGH" if xgb_confidence >= 0.80 else "MEDIUM"
            overall_confidence = xgb_confidence
        elif is_iso_anomaly:
            verdict = "NETWORK_ANOMALY"
            severity = "MEDIUM" if iso_score < -0.05 else "LOW"
            overall_confidence = min(0.92, max(0.55, 0.50 - iso_score))
        else:
            verdict = "BENIGN"
            severity = "INFO"
            overall_confidence = xgb_confidence

        return MLAnalysisResult(
            status="SUCCESS",
            model_version=settings.NETWORK_ML_MODEL_VERSION,
            dataset_benchmark="CIC-IDS2017",
            verdict=verdict,
            is_anomaly=is_overall_anomaly,
            is_attack=is_xgb_attack,
            severity=severity,
            confidence=round(overall_confidence, 4),
            environment=env_tag,
            isolation_forest=iso_result,
            xgboost=xgb_result,
            features_evaluated=77,
            evaluated_at=now_str,
        )

    async def process_and_correlate_ml_event(
        self,
        db: AsyncSession,
        company_id: str,
        event_id: Optional[str],
        source_ip: str,
        dest_ip: Optional[str],
        analysis: MLAnalysisResult,
        raw_payload: Optional[Dict[str, Any]] = None,
        environment: Optional[str] = None,
    ):
        """
        Integrates ML anomaly detection into the CYBERDOME security pipeline:
        - Persists SecurityEvent linked to company_id and tagged with environment (REAL vs SIMULATION)
        - Correlates with IncidentCorrelationEngine into tenant Incidents
        - Dispatches real-time WebSocket alerts
        - Links with Digital Twin monitored assets
        """
        if not (analysis.is_anomaly or analysis.is_attack):
            return None

        from app.models.models import Asset
        from app.models.phase4 import SecurityEvent
        from app.services.detection.engine import DetectionResult
        from app.services.incidents.correlation import IncidentCorrelationEngine
        from app.core.websocket import ws_manager

        env_tag = (environment or analysis.environment or "REAL").upper()

        # Identify target asset if IP belongs to an inventoried asset
        asset_stmt = select(Asset).where(
            Asset.company_id == company_id,
            (Asset.ip_address == source_ip) | (Asset.ip_address == dest_ip)
        )
        asset_res = await db.execute(asset_stmt)
        matched_asset = asset_res.scalars().first()

        entity_id = matched_asset.id if matched_asset else source_ip
        entity_type = "ASSET" if matched_asset else "IP"

        sec_event_id = str(uuid.uuid4())
        now_dt = datetime.now(timezone.utc).replace(tzinfo=None)

        sec_event = SecurityEvent(
            id=sec_event_id,
            company_id=company_id,
            event_id=event_id,
            rule_id=f"ML-NET-{analysis.verdict}",
            title=f"[{env_tag}] ML Anomaly Detected: {analysis.verdict} ({analysis.xgboost.get('label', 'ATTACK')})" if env_tag == "SIMULATION" else f"ML Anomaly Detected: {analysis.verdict} ({analysis.xgboost.get('label', 'ATTACK')})",
            description=(
                f"[{env_tag}] CYBERDOME ML Engine ({analysis.model_version}) detected anomalous network traffic "
                f"from {source_ip} to {dest_ip or 'destination'}. "
                f"Confidence: {analysis.confidence:.1%}. Severity: {analysis.severity}."
            ),
            severity=analysis.severity,
            confidence=analysis.confidence,
            source=f"ml_engine:{analysis.model_version}",
            entity_type=entity_type,
            entity_id=entity_id,
            risk_score=round(analysis.confidence * 100.0, 1),
            metadata_json=analysis.model_dump(),
            raw_data=raw_payload,
            environment=env_tag,
            timestamp=now_dt,
        )
        db.add(sec_event)
        await db.commit()
        await db.refresh(sec_event)

        # Correlate with Incident Correlation Engine
        meta_with_env = analysis.model_dump()
        meta_with_env["environment"] = env_tag
        det_result = DetectionResult(
            id=sec_event.id,
            company_id=company_id,
            event_id=event_id,
            rule_id=sec_event.rule_id,
            title=sec_event.title,
            description=sec_event.description,
            severity=sec_event.severity,
            confidence=sec_event.confidence,
            source=sec_event.source,
            entity_type=entity_type,
            entity_id=entity_id,
            risk_score=sec_event.risk_score,
            timestamp=now_dt,
            metadata=meta_with_env,
        )

        try:
            await IncidentCorrelationEngine.correlate_detections(
                db, company_id, [det_result]
            )
        except Exception as corr_exc:
            logger.error("Failed to correlate ML detection into incident: %s", corr_exc)

        # Real-time WebSocket notification to company channel
        try:
            await ws_manager.broadcast_to_company(
                company_id=company_id,
                event_type="ml_detection_created",
                data={
                    "id": sec_event.id,
                    "title": sec_event.title,
                    "severity": sec_event.severity,
                    "verdict": analysis.verdict,
                    "confidence": sec_event.confidence,
                    "environment": env_tag,
                    "source_ip": source_ip,
                    "dest_ip": dest_ip,
                    "entity_id": entity_id,
                    "entity_type": entity_type,
                    "timestamp": now_dt.isoformat(),
                }
            )
        except Exception as ws_exc:
            logger.error("Failed to broadcast ML detection WebSocket event: %s", ws_exc)

        # Immutable Audit Log entry for security detection
        try:
            from app.core.dependencies import create_audit_entry
            await create_audit_entry(
                db=db,
                action="ML_THREAT_DETECTED",
                result="DETECTED",
                company_id=company_id,
                resource_type="security_event",
                resource_id=sec_event.id,
                ip_address=dest_ip or source_ip,
                metadata={
                    "verdict": analysis.verdict,
                    "severity": sec_event.severity,
                    "confidence": sec_event.confidence,
                    "environment": env_tag,
                    "source_ip": source_ip,
                    "dest_ip": dest_ip,
                }
            )
        except Exception as audit_exc:
            logger.error("Failed to create audit log for ML detection: %s", audit_exc)

        return sec_event


# Singleton instance
ml_network_service = MLNetworkService.get_instance()
