"""
CYBERDOME — Module 02 IoT ML Production Service.

Inference engine for pre-trained CICIoT2023 benchmark models:
1. StandardScaler (46 features)
2. Isolation Forest (Unsupervised IoT Anomaly Detection: 1=Normal, -1=Anomaly)
3. XGBoost Multiclass Classifier (Supervised IoT Attack Classification: 34 classes)
4. LabelEncoder (Inverse transform for 34 multiclass intrusion signatures)
5. Dataset Feature Schema (Authoritative 46-feature schema)
6. IoT Label Schema (Authoritative 34-class label mappings)

Strict Invariants:
- Zero Retraining: Models run solely in inference mode. Never call .fit() or .fit_transform().
- Strict Completeness: Zero fake feature imputation. Missing features trigger INSUFFICIENT_DATA.
- Exact Feature Ordering: Enforced via dataset_feature_schema.json (46 features).
- Multi-Tenant Isolation: Scoped to company_id from authenticated JWT session.
- Real vs Simulation Segregation: Propagates environment tag without metric pollution.
- Fails closed on artifact or schema incompatibility (M02_IOT_MODEL_CONFIGURATION_ERROR).
"""

from typing import Dict, List, Any, Optional
from pathlib import Path
from datetime import datetime, timezone
import json
import logging
import math
import uuid
import joblib
import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.schemas.iot import IoTMLAnalysisResult, IoTMLHealthResponse

logger = logging.getLogger("cyberdome.ml.iot")


class InsufficientDataException(Exception):
    """Raised when an inference request lacks required CICIoT2023 features."""
    def __init__(
        self,
        missing_features: List[str],
        available_features: List[str],
        provided_count: int,
        required_count: int = 46,
    ):
        self.missing_features = missing_features
        self.available_features = available_features
        self.provided_count = provided_count
        self.required_count = required_count
        self.coverage_ratio = round(len(available_features) / required_count, 4) if required_count > 0 else 0.0
        super().__init__(
            f"Insufficient IoT telemetry data for ML inference: missing {len(missing_features)} "
            f"of {required_count} features (coverage: {self.coverage_ratio:.1%})."
        )


class IoTFeatureAdapter:
    """Adapter to extract and prepare 46-feature IoT flow vectors from telemetry payloads."""

    @staticmethod
    def extract_features(data: Any) -> Optional[Dict[str, Any]]:
        """
        Extract candidate 46 features from raw dictionary or nested structures.
        Supports:
        - Explicit dict under 'telemetry'
        - Explicit dict under 'features'
        - Explicit dict under 'ciciot' or 'iot_features'
        - Direct dict containing known CICIoT2023 feature keys
        """
        if not isinstance(data, dict):
            return None
        if "telemetry" in data and isinstance(data["telemetry"], dict):
            return data["telemetry"]
        if "features" in data and isinstance(data["features"], dict):
            return data["features"]
        if "ciciot" in data and isinstance(data["ciciot"], dict):
            return data["ciciot"]
        if "iot_features" in data and isinstance(data["iot_features"], dict):
            return data["iot_features"]
        # Direct dictionary containing known CICIoT2023 feature keys
        if "flow_duration" in data or "Rate" in data or "Header_Length" in data:
            return data
        return None


class IoTMLService:
    """
    Production IoT ML Service for Module 02.
    Loads real pre-trained artifacts once at startup:
    - StandardScaler (46 features)
    - Isolation Forest (46 features)
    - XGBoost Classifier (46 features, 34 multiclass output)
    - Label Encoder (34 classes)
    - Feature Schema (46 features)
    - Label Schema (34 classes)
    """

    _instance: Optional["IoTMLService"] = None

    def __init__(self, artifact_dir: Optional[Path] = None):
        self.model_version = "iot-anomaly-v1"
        self.dataset_benchmark = "CICIoT2023"
        self._custom_artifact_dir = artifact_dir is not None

        # Determine artifact location
        if artifact_dir is not None:
            self.base_dir = artifact_dir
        else:
            primary_dir = Path(__file__).resolve().parent.parent / "ml_artifacts" / "iot"
            fallback_dir = Path(__file__).resolve().parent.parent / "ml_models" / "iot"
            if primary_dir.exists() and (primary_dir / "iot_xgboost.joblib").exists():
                self.base_dir = primary_dir
            else:
                self.base_dir = fallback_dir

        self.feature_names: List[str] = []
        self.label_schema: Dict[str, str] = {}
        self.scaler = None
        self.isolation_forest = None
        self.xgboost = None
        self.label_encoder = None
        self.benign_label: str = "BenignTraffic"
        self.benign_class_index: int = 1
        self.is_loaded: bool = False

        self._load_artifacts()

    @classmethod
    def get_instance(cls) -> "IoTMLService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _find_artifact_path(self, filenames: List[str], subdirs: List[str]) -> Path:
        """Helper to resolve artifact file path across root and subdirectories."""
        # Check base_dir directly
        for fname in filenames:
            p = self.base_dir / fname
            if p.exists():
                return p
        # Check subdirectories
        for subdir in subdirs:
            for fname in filenames:
                p = self.base_dir / subdir / fname
                if p.exists():
                    return p
        if getattr(self, "_custom_artifact_dir", False):
            raise FileNotFoundError(
                f"M02_IOT_MODEL_CONFIGURATION_ERROR: Artifact {filenames[0]} missing in custom directory {self.base_dir}"
            )
        # Fallback to backend/app/ml_artifacts/iot
        alt_base = Path(__file__).resolve().parent.parent / "ml_artifacts" / "iot"
        for fname in filenames:
            p = alt_base / fname
            if p.exists():
                return p
        # Fallback to backend/app/ml_models/iot
        alt_models = Path(__file__).resolve().parent.parent / "ml_models" / "iot"
        for subdir in ["", "models", "preprocessing", "metadata"]:
            for fname in filenames:
                p = (alt_models / subdir / fname) if subdir else (alt_models / fname)
                if p.exists():
                    return p
        raise FileNotFoundError(
            f"M02_IOT_MODEL_CONFIGURATION_ERROR: Artifact {filenames[0]} missing in {self.base_dir}"
        )

    def _load_artifacts(self) -> None:
        """Loads and strictly validates all 6 artifacts into memory once at startup."""
        logger.info("Initializing CYBERDOME Module 02 IoT ML Service from %s...", self.base_dir)

        try:
            # 1. Feature Schema (dataset_feature_schema.json or feature_schema.json)
            schema_path = self._find_artifact_path(
                ["dataset_feature_schema.json", "feature_schema.json"],
                ["preprocessing", "metadata"]
            )
            with open(schema_path, "r", encoding="utf-8") as f:
                schema_content = json.load(f)
                if isinstance(schema_content, list):
                    self.feature_names = schema_content
                elif isinstance(schema_content, dict) and "features" in schema_content:
                    self.feature_names = schema_content["features"]
                else:
                    raise ValueError(f"Invalid feature schema format in {schema_path}")

            if len(self.feature_names) != 46:
                raise ValueError(
                    f"M02_IOT_MODEL_CONFIGURATION_ERROR: Expected exactly 46 features, found {len(self.feature_names)}"
                )

            # 2. Label Schema (iot_label_schema.json)
            label_schema_path = self._find_artifact_path(
                ["iot_label_schema.json", "label_schema.json"],
                ["metadata", "preprocessing"]
            )
            with open(label_schema_path, "r", encoding="utf-8") as f:
                self.label_schema = json.load(f)

            if len(self.label_schema) != 34:
                raise ValueError(
                    f"M02_IOT_MODEL_CONFIGURATION_ERROR: Expected 34 label classes, found {len(self.label_schema)}"
                )

            # 3. Label Encoder (iot_label_encoder.joblib)
            encoder_path = self._find_artifact_path(
                ["iot_label_encoder.joblib", "label_encoder.joblib"],
                ["models", "preprocessing"]
            )
            self.label_encoder = joblib.load(encoder_path)
            encoder_classes = list(getattr(self.label_encoder, "classes_", []))
            if len(encoder_classes) != 34:
                raise ValueError(
                    f"ARTIFACT_SCHEMA_CONFLICT: Label encoder classes count ({len(encoder_classes)}) != 34"
                )

            # Cross-check label encoder with label schema
            for idx, cname in enumerate(encoder_classes):
                expected_cname = self.label_schema.get(str(idx))
                if expected_cname is not None and expected_cname != cname:
                    raise ValueError(
                        f"ARTIFACT_SCHEMA_CONFLICT: Encoder class {idx}='{cname}' != Schema '{expected_cname}'"
                    )

            # Verify Benign label
            benign_matches = [idx for idx, c in enumerate(encoder_classes) if c.lower() == "benigntraffic"]
            if not benign_matches:
                raise ValueError("M02_LABEL_SCHEMA_CONFLICT: Could not locate 'BenignTraffic' class in label encoder")
            self.benign_class_index = benign_matches[0]
            self.benign_label = encoder_classes[self.benign_class_index]

            # 4. Scaler (iot_scaler.joblib or scaler.joblib)
            scaler_path = self._find_artifact_path(
                ["iot_scaler.joblib", "scaler.joblib"],
                ["preprocessing"]
            )
            self.scaler = joblib.load(scaler_path)
            if getattr(self.scaler, "n_features_in_", None) != 46:
                raise ValueError(
                    f"M02_IOT_MODEL_CONFIGURATION_ERROR: Scaler n_features_in_ expected 46, got {getattr(self.scaler, 'n_features_in_', None)}"
                )

            # 5. Isolation Forest (iot_isolation_forest.joblib)
            iso_path = self._find_artifact_path(
                ["iot_isolation_forest.joblib"],
                ["models"]
            )
            self.isolation_forest = joblib.load(iso_path)
            if getattr(self.isolation_forest, "n_features_in_", None) != 46:
                raise ValueError(
                    f"M02_IOT_MODEL_CONFIGURATION_ERROR: Isolation Forest n_features_in_ expected 46, got {getattr(self.isolation_forest, 'n_features_in_', None)}"
                )

            # 6. XGBoost Classifier (iot_xgboost.joblib)
            xgb_path = self._find_artifact_path(
                ["iot_xgboost.joblib"],
                ["models"]
            )
            self.xgboost = joblib.load(xgb_path)
            if getattr(self.xgboost, "n_features_in_", None) != 46:
                raise ValueError(
                    f"M02_IOT_MODEL_CONFIGURATION_ERROR: XGBoost n_features_in_ expected 46, got {getattr(self.xgboost, 'n_features_in_', None)}"
                )
            if getattr(self.xgboost, "n_classes_", None) != 34:
                raise ValueError(
                    f"M02_IOT_MODEL_CONFIGURATION_ERROR: XGBoost n_classes_ expected 34, got {getattr(self.xgboost, 'n_classes_', None)}"
                )

            self.is_loaded = True
            logger.info(
                "CYBERDOME Module 02 IoT ML Service initialized successfully (46 features, 34 multiclass labels, benign='%s').",
                self.benign_label
            )

        except Exception as e:
            self.is_loaded = False
            logger.critical("Failed to load CYBERDOME Module 02 IoT ML artifacts: %s", e)
            raise RuntimeError(f"M02_IOT_MODEL_CONFIGURATION_ERROR: {e}") from e

    def get_health_status(self) -> Dict[str, Any]:
        """Returns diagnostic health and loaded metadata."""
        classes_list = [str(c) for c in getattr(self.label_encoder, "classes_", [])]
        return {
            "status": "HEALTHY" if self.is_loaded else "DEGRADED",
            "module": "iot_anomaly_detection",
            "model_version": self.model_version,
            "dataset_benchmark": self.dataset_benchmark,
            "artifacts_loaded": {
                "scaler": self.scaler is not None,
                "isolation_forest": self.isolation_forest is not None,
                "xgboost": self.xgboost is not None,
                "label_encoder": self.label_encoder is not None,
                "schema": len(self.feature_names) == 46,
                "label_schema": len(self.label_schema) == 34,
            },
            "feature_count": len(self.feature_names),
            "label_count": len(classes_list),
            "features": self.feature_names,
            "classes": classes_list,
            "benign_label": self.benign_label,
            "zero_imputation_enforced": True,
            "environment_support": ["REAL", "SIMULATION"],
        }

    def validate_and_prepare_features(self, raw_features: Dict[str, Any]) -> pd.DataFrame:
        """
        Validates feature completeness (all 46 required) and builds DataFrame in authoritative schema order.
        Strictly forbids zero fake imputation.
        Rejects non-numeric, NaN, and Infinity.
        """
        if not isinstance(raw_features, dict):
            raise ValueError("Telemetry features must be a dictionary.")

        missing = []
        found_features = {}
        feature_vector = {}

        # Case-insensitive resolution for flexibility while verifying every feature name
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

        available_features = list(found_features.keys())

        if missing:
            raise InsufficientDataException(
                missing_features=missing,
                available_features=available_features,
                provided_count=len(available_features),
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

    def analyze_event(self, event_data: Dict[str, Any], environment: str = "REAL") -> IoTMLAnalysisResult:
        """
        Main inference entrypoint according to Hard Execution Contract.
        Accepts raw telemetry dictionary, validates 46 features, scales, and runs:
        - Isolation Forest (unsupervised)
        - XGBoost Multiclass (supervised, 34 classes)
        """
        return self.predict(event_data, environment=environment)

    def predict(self, raw_features: Dict[str, Any], environment: str = "REAL") -> IoTMLAnalysisResult:
        """
        Executes dual IoT ML inference over 46-feature vector.
        Inference only: never modifies weights or retrains.
        """
        now_str = datetime.now(timezone.utc).isoformat()
        env_tag = (environment or "REAL").upper()

        if not self.is_loaded:
            return IoTMLAnalysisResult(
                status="ERROR",
                prediction="UNKNOWN",
                anomaly_score=0.0,
                attack_prediction="UNKNOWN",
                confidence=0.0,
                model_version=self.model_version,
                feature_count=len(self.feature_names),
                data_quality="INVALID",
                verdict="EVALUATION_ERROR",
                is_anomaly=False,
                is_attack=False,
                severity="INFO",
                environment=env_tag,
                features_evaluated=0,
                evaluated_at=now_str,
                error_message="M02 IoT ML models are not loaded in memory.",
            )

        # Step 1: Strict validation
        try:
            df = self.validate_and_prepare_features(raw_features)
        except InsufficientDataException as ide:
            return IoTMLAnalysisResult(
                status="INSUFFICIENT_DATA",
                prediction="UNKNOWN",
                anomaly_score=0.0,
                attack_prediction="UNKNOWN",
                confidence=0.0,
                model_version=self.model_version,
                feature_count=len(self.feature_names),
                data_quality="INSUFFICIENT",
                verdict="INSUFFICIENT_DATA",
                is_anomaly=False,
                is_attack=False,
                severity="INFO",
                environment=env_tag,
                isolation_forest={},
                xgboost={},
                features_evaluated=ide.provided_count,
                evaluated_at=now_str,
                missing_features=ide.missing_features,
                available_features=ide.available_features,
                expected_feature_count=ide.required_count,
                received_feature_count=ide.provided_count,
                coverage_ratio=ide.coverage_ratio,
                error_message=str(ide),
            )
        except Exception as exc:
            return IoTMLAnalysisResult(
                status="ERROR",
                prediction="UNKNOWN",
                anomaly_score=0.0,
                attack_prediction="UNKNOWN",
                confidence=0.0,
                model_version=self.model_version,
                feature_count=len(self.feature_names),
                data_quality="INVALID",
                verdict="EVALUATION_ERROR",
                is_anomaly=False,
                is_attack=False,
                severity="INFO",
                environment=env_tag,
                isolation_forest={},
                xgboost={},
                features_evaluated=0,
                evaluated_at=now_str,
                error_message=str(exc),
            )

        # Step 2: Scaling
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
                "Unsupervised IoT baseline behavioral deviation detected."
                if is_iso_anomaly else "IoT flow falls within learned steady-state distribution."
            ),
        }

        # Step 4: XGBoost Multiclass Classification (supervised, 34 classes)
        xgb_pred_raw = int(self.xgboost.predict(scaled_features)[0])
        xgb_probs = self.xgboost.predict_proba(scaled_features)[0]

        # Map class index through label encoder
        attack_label = str(self.label_encoder.inverse_transform([xgb_pred_raw])[0])
        selected_confidence = float(xgb_probs[xgb_pred_raw])
        is_xgb_attack = bool(attack_label.lower() != self.benign_label.lower())

        # Top 5 probabilities for explanation and transparency
        classes_all = list(self.label_encoder.classes_)
        top_indices = np.argsort(xgb_probs)[::-1][:5]
        top_probs = {classes_all[i]: round(float(xgb_probs[i]), 6) for i in top_indices}

        xgb_result = {
            "prediction": xgb_pred_raw,
            "label": attack_label,
            "is_attack": is_xgb_attack,
            "confidence": round(selected_confidence, 6),
            "probabilities": top_probs,
            "description": (
                f"Supervised gradient boosted tree classified signature: {attack_label}."
                if is_xgb_attack else "Flow attributes match benign IoT device communication profile."
            ),
        }

        # Step 5: Threat Decision & Verdict Synthesis
        if is_xgb_attack and is_iso_anomaly:
            verdict = "CONFIRMED_IOT_ATTACK"
            severity = "CRITICAL"
            prediction = "ATTACK"
            confidence = round(max(selected_confidence, 0.90), 4)
        elif is_xgb_attack:
            verdict = "CLASSIFIED_IOT_ATTACK"
            severity = "HIGH" if selected_confidence >= 0.85 else "MEDIUM"
            prediction = "ATTACK"
            confidence = round(selected_confidence, 4)
        elif is_iso_anomaly:
            verdict = "IOT_ANOMALY"
            severity = "MEDIUM" if iso_score < -0.10 else "LOW"
            prediction = "ANOMALY"
            confidence = round(min(0.85, 0.50 + abs(iso_score)), 4)
        else:
            verdict = "BENIGN_IOT"
            severity = "INFO"
            prediction = "NORMAL"
            confidence = round(selected_confidence, 4)

        return IoTMLAnalysisResult(
            status="SUCCESS",
            prediction=prediction,
            anomaly_score=round(iso_score, 6),
            attack_prediction=attack_label,
            confidence=confidence,
            model_version=self.model_version,
            feature_count=len(self.feature_names),
            data_quality="COMPLETE",
            dataset_benchmark=self.dataset_benchmark,
            verdict=verdict,
            is_anomaly=is_iso_anomaly,
            is_attack=is_xgb_attack,
            severity=severity,
            environment=env_tag,
            isolation_forest=iso_result,
            xgboost=xgb_result,
            features_evaluated=len(self.feature_names),
            evaluated_at=now_str,
        )

    async def process_and_correlate_iot_ml_event(
        self,
        db: AsyncSession,
        company_id: str,
        device_id: str,
        device_name: str,
        analysis: IoTMLAnalysisResult,
        device_ip: Optional[str] = None,
        environment: str = "REAL",
    ) -> Optional[Any]:
        """
        Creates SecurityEvent, correlates into Incident, updates device posture,
        emits WebSocket alert to tenant channel, and records immutable audit log.
        """
        if not (analysis.is_anomaly or analysis.is_attack):
            return None

        from app.models.phase4 import SecurityEvent, IoTDevice
        from app.services.incidents.correlation import IncidentCorrelationEngine, DetectionResult
        from app.core.websocket import ws_manager

        now_dt = datetime.now(timezone.utc).replace(tzinfo=None)
        env_tag = (environment or "REAL").upper()
        sec_event_id = str(uuid.uuid4())

        title_prefix = f"[{analysis.verdict}]"
        if env_tag == "SIMULATION":
            title_prefix = f"[SIMULATION] {title_prefix}"

        meta_with_env = {
            "module": "iot_anomaly_detection",
            "model_version": analysis.model_version,
            "verdict": analysis.verdict,
            "prediction": analysis.prediction,
            "attack_prediction": analysis.attack_prediction,
            "anomaly_score": analysis.anomaly_score,
            "confidence": analysis.confidence,
            "isolation_forest": analysis.isolation_forest,
            "xgboost": analysis.xgboost,
            "environment": env_tag,
            "device_id": device_id,
            "device_name": device_name,
            "device_ip": device_ip,
        }

        sec_event = SecurityEvent(
            id=sec_event_id,
            event_id=sec_event_id,
            company_id=company_id,
            rule_id=f"IOT-ML-{analysis.verdict}",
            title=f"{title_prefix} IoT Device Threat Detected on {device_name}",
            description=(
                f"Machine Learning IoT threat detection: {analysis.verdict} ({analysis.attack_prediction}) "
                f"on {device_name} ({device_ip or 'unknown IP'}). "
                f"Model confidence: {analysis.confidence:.2%}, "
                f"Isolation Forest score: {analysis.anomaly_score:.4f}."
            ),
            severity=analysis.severity,
            confidence=analysis.confidence,
            source=f"ml_engine:{self.model_version}",
            entity_type="IOT_DEVICE",
            entity_id=device_id,
            risk_score=float(analysis.confidence * 100.0),
            metadata_json=meta_with_env,
            environment=env_tag,
            timestamp=now_dt,
            created_at=now_dt,
        )
        db.add(sec_event)
        await db.commit()
        await db.refresh(sec_event)

        # Update IoTDevice state in database
        dev_res = await db.execute(
            select(IoTDevice).where(IoTDevice.id == device_id, IoTDevice.company_id == company_id)
        )
        device = dev_res.scalar_one_or_none()
        if device:
            device.status = "CRITICAL" if analysis.severity == "CRITICAL" else "WARNING"
            device.risk_score = max(device.risk_score or 0.0, float(analysis.confidence * 100.0))
            device.anomalies = (device.anomalies or 0) + 1
            device.last_seen = now_dt
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
            logger.error("Failed to correlate IoT ML detection into incident: %s", corr_exc)

        # Real-time WebSocket emission to tenant channel
        try:
            await ws_manager.broadcast_to_company(
                company_id=company_id,
                event_type="iot_ml_detection_created",
                data={
                    "id": sec_event.id,
                    "title": sec_event.title,
                    "severity": sec_event.severity,
                    "verdict": analysis.verdict,
                    "prediction": analysis.prediction,
                    "attack_prediction": analysis.attack_prediction,
                    "confidence": sec_event.confidence,
                    "anomaly_score": analysis.anomaly_score,
                    "environment": env_tag,
                    "deviceId": device_id,
                    "deviceName": device_name,
                    "deviceIp": device_ip,
                    "timestamp": now_dt.isoformat(),
                }
            )
        except Exception as ws_exc:
            logger.error("Failed to broadcast IoT ML detection WebSocket event: %s", ws_exc)

        # Immutable Audit Log
        try:
            from app.core.dependencies import create_audit_entry
            await create_audit_entry(
                db=db,
                action="IOT_ML_THREAT_DETECTED",
                result="DETECTED",
                company_id=company_id,
                resource_type="iot_device",
                resource_id=device_id,
                ip_address=device_ip,
                metadata={
                    "verdict": analysis.verdict,
                    "attack_prediction": analysis.attack_prediction,
                    "severity": sec_event.severity,
                    "confidence": sec_event.confidence,
                    "environment": env_tag,
                    "device_name": device_name,
                }
            )
        except Exception as audit_exc:
            logger.error("Failed to create audit log for IoT ML detection: %s", audit_exc)

        return sec_event


# Singleton instance
iot_ml_service = IoTMLService.get_instance()
