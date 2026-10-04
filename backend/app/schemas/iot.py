"""
CYBERDOME — Module 02 IoT Pydantic Schemas.
Multi-tenant IoT and OT Device Management and Real-Time ML Inference Schemas.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class IoTDeviceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    device_identifier: Optional[str] = None
    device_type: Optional[str] = "SENSOR"  # CAMERA, SENSOR, GATEWAY, INDUSTRIAL_CONTROLLER, SMART_PLUG
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    firmware_version: Optional[str] = "v1.0.0"
    firmware: Optional[str] = None
    status: Optional[str] = "ONLINE"
    risk_score: Optional[float] = 0.0


class IoTDeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_identifier: Optional[str] = None
    device_type: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    firmware_version: Optional[str] = None
    firmware: Optional[str] = None
    status: Optional[str] = None
    anomalies: Optional[int] = None
    risk_score: Optional[float] = None


class IoTEventCreate(BaseModel):
    device_id: Optional[str] = None
    device_identifier: Optional[str] = None
    name: Optional[str] = "IoT Device"
    device_type: Optional[str] = "SENSOR"
    ip_address: Optional[str] = None
    event_type: Optional[str] = "heartbeat"
    severity: Optional[str] = "INFO"
    anomalies: Optional[int] = 0
    firmware: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None
    environment: Optional[str] = "REAL"  # REAL, SIMULATION
    features: Optional[Dict[str, Any]] = None


class IoTTelemetryAnalyzeRequest(BaseModel):
    company_id: Optional[str] = Field(None, description="Optional tenant company ID (must match authenticated caller)")
    device_id: Optional[str] = Field(None, description="IoT device ID")
    device_name: Optional[str] = Field("IoT Device", description="Device name")
    telemetry: Optional[Dict[str, Any]] = Field(None, description="Dictionary containing the 46 CICIoT2023 flow features")
    features: Optional[Dict[str, Any]] = Field(None, description="Alias for telemetry features dictionary")
    ip_address: Optional[str] = Field(None, description="Device IP address")
    environment: Optional[str] = Field("REAL", description="Environment: REAL or SIMULATION")
    record_detection: Optional[bool] = Field(True, description="Whether to persist SecurityEvent on threat")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional contextual metadata")


# Alias for backward compatibility
IoTMLAnalyzeRequest = IoTTelemetryAnalyzeRequest


class IoTMLAnalysisResult(BaseModel):
    status: str = "SUCCESS"  # SUCCESS, INSUFFICIENT_DATA, ERROR
    prediction: str = "NORMAL"  # NORMAL, ANOMALY, ATTACK
    anomaly_score: float = 0.0
    attack_prediction: str = "BenignTraffic"
    confidence: float = 0.0
    model_version: str = "iot-anomaly-v1"
    feature_count: int = 46
    data_quality: str = "COMPLETE"  # COMPLETE, INSUFFICIENT, INVALID
    dataset_benchmark: str = "CICIoT2023"
    verdict: str = "BENIGN_IOT"  # BENIGN_IOT, IOT_ANOMALY, CLASSIFIED_IOT_ATTACK, CONFIRMED_IOT_ATTACK
    is_anomaly: bool = False
    is_attack: bool = False
    severity: str = "INFO"  # INFO, LOW, MEDIUM, HIGH, CRITICAL
    environment: str = "REAL"  # REAL, SIMULATION
    isolation_forest: Dict[str, Any] = Field(default_factory=dict)
    xgboost: Dict[str, Any] = Field(default_factory=dict)
    features_evaluated: int = 46
    evaluated_at: str
    missing_features: Optional[List[str]] = None
    available_features: Optional[List[str]] = None
    expected_feature_count: Optional[int] = 46
    received_feature_count: Optional[int] = None
    coverage_ratio: Optional[float] = None
    error_message: Optional[str] = None
    security_event_id: Optional[str] = None
    incident_correlated: Optional[bool] = None


class IoTMLHealthResponse(BaseModel):
    status: str = "HEALTHY"
    module: str = "iot_anomaly_detection"
    model_version: str = "iot-anomaly-v1"
    dataset_benchmark: str = "CICIoT2023"
    artifacts_loaded: Dict[str, bool]
    feature_count: int = 46
    label_count: int = 34
    features: List[str]
    classes: List[str]
    benign_label: str = "BenignTraffic"
    zero_imputation_enforced: bool = True
    environment_support: List[str] = ["REAL", "SIMULATION"]
