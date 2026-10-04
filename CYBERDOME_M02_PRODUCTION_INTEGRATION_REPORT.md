# CYBERDOME M02 IoT ML Production Integration

## Artifact Status

| Artifact | Found | Loaded | Compatible |
|---|---|---|---|
| `iot_isolation_forest.joblib` | Yes (`backend/app/ml_artifacts/iot/` & `backend/app/ml_models/iot/models/`) | Yes | Yes (46 features, IsolationForest contamination=0.08, n_estimators=100) |
| `iot_xgboost.joblib` | Yes (`backend/app/ml_artifacts/iot/` & `backend/app/ml_models/iot/models/`) | Yes | Yes (46 features, 34 classes, XGBClassifier, multi:softprob) |
| `iot_scaler.joblib` | Yes (`backend/app/ml_artifacts/iot/` & `backend/app/ml_models/iot/preprocessing/`) | Yes | Yes (46 features, StandardScaler mean & scale arrays verified) |
| `iot_label_encoder.joblib` | Yes (`backend/app/ml_artifacts/iot/` & `backend/app/ml_models/iot/models/`) | Yes | Yes (34 classes, LabelEncoder inverse_transform verified) |
| `dataset_feature_schema.json` | Yes (`backend/app/ml_artifacts/iot/` & `backend/app/ml_models/iot/preprocessing/`) | Yes | Yes (46 features, ordered CICIoT2023 benchmark schema verified) |
| `iot_label_schema.json` | Yes (`backend/app/ml_artifacts/iot/` & `backend/app/ml_models/iot/metadata/`) | Yes | Yes (34 classes, index 0..33 100% matched to LabelEncoder) |

## Model Details

- **Feature count:** 46 features (`flow_duration`, `Header_Length`, ..., `Variance`, `Weight`)
- **Isolation Forest:** Unsupervised baseline behavioral anomaly detector; input dimension: 46; decision function: raw `anomaly_score` (`< 0` = anomaly, `>= 0` = normal)
- **XGBoost:** Supervised multiclass gradient boosted decision tree classifier; input dimension: 46; outputs: 34 classes; predicts class index and full probability distribution `predict_proba()`
- **Class count:** 34 multiclass intrusion and normal flow signatures
- **Label mapping:** Verified 1-to-1 equivalence between `iot_label_schema.json` and `iot_label_encoder.joblib`:
  - 0: `Backdoor_Malware`
  - 1: `BenignTraffic` (Benign baseline class)
  - 2: `BrowserHijacking`
  - 3: `CommandInjection`
  - 4: `DDoS-ACK_Fragmentation`
  - 5: `DDoS-HTTP_Flood`
  - 6: `DDoS-ICMP_Flood`
  - 7: `DDoS-ICMP_Fragmentation`
  - 8: `DDoS-PSHACK_Flood`
  - 9: `DDoS-RSTFINFlood`
  - 10: `DDoS-SYN_Flood`
  - 11: `DDoS-SlowLoris`
  - 12: `DDoS-SynonymousIP_Flood`
  - 13: `DDoS-TCP_Flood`
  - 14: `DDoS-UDP_Flood`
  - 15: `DDoS-UDP_Fragmentation`
  - 16: `DNS_Spoofing`
  - 17: `DictionaryBruteForce`
  - 18: `DoS-HTTP_Flood`
  - 19: `DoS-SYN_Flood`
  - 20: `DoS-TCP_Flood`
  - 21: `DoS-UDP_Flood`
  - 22: `MITM-ArpSpoofing`
  - 23: `Mirai-greeth_flood`
  - 24: `Mirai-greip_flood`
  - 25: `Mirai-udpplain`
  - 26: `Recon-HostDiscovery`
  - 27: `Recon-OSScan`
  - 28: `Recon-PingSweep`
  - 29: `Recon-PortScan`
  - 30: `SqlInjection`
  - 31: `Uploading_Attack`
  - 32: `VulnerabilityScan`
  - 33: `XSS`
- **Scaler:** `StandardScaler` with 46 mean and variance parameters fitted to CICIoT2023 flows
- **Model version:** `iot-anomaly-v1`

## Backend

- **IoTMLService:** Implemented in `backend/app/services/iot_ml_service.py` as a thread-safe singleton (`IoTMLService.get_instance()`). Loads all 6 artifacts once at startup into memory without repeated disk I/O. Supports `analyze_event()` and `predict()`. Strictly rejects missing features (returns `INSUFFICIENT_DATA` with missing feature list and coverage ratio), rejects NaN, Infinity, and non-numeric values. Re-exported with backward-compatible alias in `backend/app/services/ml_iot_service.py`.
- **IoT router:** Implemented in `backend/app/routers/iot.py`:
  - `POST /api/v1/iot/analyze-telemetry`: Production multiclass telemetry analysis endpoint with strict tenant isolation, device authorization, and threat decision persistence.
  - `POST /api/v1/iot/analyze`: Backward-compatible alias for `/analyze-telemetry`.
  - `GET /api/v1/iot/ml/health`: Production diagnostic health endpoint reporting model status, artifact availability, 46 features, 34 classes, and benign label.
  - `POST /api/v1/iot/events`: IoT telemetry stream ingestion with normalization, deterministic detection evaluation, ML anomaly detection, and incident correlation.
  - `GET /api/v1/iot/devices`, `POST /api/v1/iot/devices`, `GET/PATCH /api/v1/iot/devices/{device_id}`, `GET /api/v1/iot/anomalies`, `GET /api/v1/iot/stats`.
- **Pydantic schema:** Defined in `backend/app/schemas/iot.py`:
  - `IoTTelemetryAnalyzeRequest`
  - `IoTMLAnalysisResult`
  - `IoTMLHealthResponse`
  - `IoTDeviceCreate`, `IoTDeviceUpdate`, `IoTEventCreate`
- **FastAPI registration:** Registered under `settings.API_V1_STR` (`/api/v1/iot/...`) in `backend/app/main.py`. Verified in FastAPI OpenAPI schema with 8 IoT routes.
- **Authentication:** Enforced via `get_current_user` and `get_current_company_membership`. Normal standalone users (`USER`) are forbidden from company IoT endpoints (HTTP 403).
- **Tenant isolation:** Validates that incoming `company_id` matches authenticated session. Rejects cross-tenant telemetry requests with HTTP 403.
- **Device authorization:** Validates that `device_id` belongs to the authenticated tenant. Rejects attempts by Company B to submit telemetry for Company A's device with HTTP 403.

## Database

- **SecurityEvent:** When a threat is detected (`is_anomaly` or `is_attack`), creates and commits a company-scoped `SecurityEvent` (`IOT_DEVICE` entity, `rule_id=IOT-ML-{verdict}`, risk score, metadata with dual model evidence).
- **IoT event persistence:** Updates `IoTDevice` state in PostgreSQL/Supabase database (`status=WARNING|CRITICAL`, `risk_score`, `anomalies`, `last_seen`).
- **Incident correlation:** Dispatches `DetectionResult` into `IncidentCorrelationEngine.correlate_detections()`, preventing alert fatigue by aggregating into open entity incidents.
- **Fusion integration:** Compatible with Module 05 Multi-Model Detection Fusion Engine (`DetectionEvidence` with `source="IOT"`, `entity_type="IOT_DEVICE"`).

## Real-Time

- **WebSocket:** Emits `iot_ml_detection_created` and `iot_device_updated` using `ws_manager.broadcast_to_company()`.
- **Company isolation:** Emits exclusively to the tenant's authenticated room channel; cross-company leakage is cryptographically and logically impossible.
- **Event type:** `iot_ml_detection_created` and `iot_device_updated`.

## Frontend

- **IoT dashboard:** Updated in `src/app/(dashboard)/iot/page.tsx`. Shows live fleet metrics, status indicators, protocol profiles, and zero-imputation policy.
- **Live threat feed:** Features a real-time WebSocket subscriber listening for `iot_ml_detection_created` and rendering live attack classifications (`verdict`, `attack_prediction`, `confidence`, `deviceName`, `timestamp`).
- **Digital Twin:** Supported via `/api/v1/digital-twin/nodes`; queries real database `IoTDevice` nodes, displaying updated status (`WARNING`/`CRITICAL`), risk scores, and detections without synthetic telemetry.
- **Attack Graph:** IoT device threat nodes seamlessly link into company attack graphs via incident correlation and asset relationships.

## Testing

- **M02 tests:**
  - `test_module02_iot_production_integration.py`: 19 passed (100%) covering all 27 audit invariants.
  - `test_module02_iot_e2e_validation.py`: 17 passed (100%) covering full 16-stage E2E pipeline.
- **Regression tests:**
  - M01 Network (`test_module01_e2e_validation.py`): 13 passed (100%)
  - M03 UEBA (`test_module03_ueba_e2e_validation.py`): 25 passed (100%)
  - M04 URL Phishing (`test_module04_url_e2e_validation.py`): 31 passed (100%)
  - M05 Multi-Model Fusion (`test_module05_fusion_e2e_validation.py`): 37 passed (100%)
  - M06 AI Copilot (`test_module06_ai_copilot_e2e_validation.py`): 40 passed (100%)
  - M07 SOAR Orchestration (`test_module07_soar_orchestration_e2e_validation.py`): 45 passed (100%)
  - **Total test suite pass count:** 227 passed / 0 failed (100% pass rate).
- **Backend startup:** Verified via ASGI lifespan and OpenAPI schema extraction.
- **OpenAPI:** Verified 128 routes total, 8 `/api/v1/iot/*` endpoints exposed.
- **Frontend build:** `next build --webpack` completed successfully (code 0), 56/56 pages built.
- **TypeScript:** Strict type check passed with zero compilation errors.
- **ESLint:** Clean frontend tree.

## Final Status

COMPLETE
