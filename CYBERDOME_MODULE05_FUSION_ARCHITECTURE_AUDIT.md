# CYBERDOME — MODULE 05 MULTI-MODEL DETECTION FUSION ENGINE
## ARCHITECTURAL AUDIT & CONTRACT VERIFICATION REPORT
**Audit Timestamp:** 2026-10-03  
**Auditor:** Senior Security Platform Engineer (Antigravity)  
**Status:** **AUDIT COMPLETE — READY FOR FUSION IMPLEMENTATION**  

---

## 1. Executive Summary
This architectural audit inspects the current CYBERDOME cybersecurity command center codebase across the four production-ready detection modules (Module 01 Network, Module 02 IoT, Module 03 UEBA, Module 04 URL), threat intelligence feeds, web scanners, deterministic rule engines, incident correlation, WebSockets, Digital Twin, Dynamic Attack Graph, SOAR, AuditLog, and tenant isolation boundaries.

The objective is to establish exact naming conventions, data structures, public interfaces, model versions, and integration touchpoints to construct **Module 05: Multi-Model Detection Fusion Engine** without breaking existing module contracts or introducing fake data.

---

## 2. Module 01–04 Contract Inspection

### 2.1 Module 01 — Network Anomaly Detection
- **Service:** `MLNetworkService` in `backend/app/services/ml_network_service.py`
- **Model Version:** `v1.0.0-cic-ids2017`
- **Benchmark:** CIC-IDS2017 (77 canonical features)
- **Artifacts:**
  - `backend/app/ml_models/network/models/network_isolation_forest.joblib`
  - `backend/app/ml_models/network/models/network_xgboost.joblib`
  - `backend/app/ml_models/network/preprocessing/scaler.joblib`
  - `backend/app/ml_models/network/preprocessing/feature_schema.json`
- **Output Schema:** `MLAnalysisResult`
  - `status`: `"SUCCESS" | "INSUFFICIENT_DATA" | "ERROR"`
  - `verdict`: `"BENIGN" | "NETWORK_ANOMALY" | "CLASSIFIED_ATTACK" | "CONFIRMED_ATTACK"`
  - `is_anomaly`: `bool`
  - `is_attack`: `bool`
  - `severity`: `"INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"`
  - `confidence`: `float` ($0.0 - 1.0$)
  - `isolation_forest`: `{"prediction": int, "is_anomaly": bool, "anomaly_score": float}`
  - `xgboost`: `{"prediction": int, "attack_type": str, "probabilities": Dict[str, float]}`
  - `environment`: `"REAL" | "SIMULATION"`
- **Router Endpoints:** `POST /api/v1/network/events`, `POST /api/v1/network/analyze`, `GET /api/v1/network/ml/health`
- **SecurityEvent Creation:** `entity_type="ASSET"`, `source="ml_network_detection"`

### 2.2 Module 02 — IoT Anomaly Detection
- **Service:** `MLIoTService` in `backend/app/services/ml_iot_service.py`
- **Model Version:** `iot-anomaly-v1`
- **Benchmark:** CICIoT2023 (46 canonical features)
- **Artifacts:**
  - `backend/app/ml_models/iot/models/iot_isolation_forest.joblib`
  - `backend/app/ml_models/iot/models/iot_xgboost.joblib`
  - `backend/app/ml_models/iot/preprocessing/scaler.joblib`
  - `backend/app/ml_models/iot/preprocessing/feature_schema.json`
- **Output Schema:** `MLIoTAnalysisResult`
  - `status`: `"SUCCESS" | "INSUFFICIENT_DATA" | "ERROR"`
  - `verdict`: `"BENIGN_IOT" | "IOT_ANOMALY" | "CLASSIFIED_IOT_ATTACK" | "CONFIRMED_IOT_ATTACK"`
  - `is_anomaly`: `bool`
  - `is_attack`: `bool`
  - `severity`: `"INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"`
  - `confidence`: `float` ($0.0 - 1.0$)
  - `environment`: `"REAL" | "SIMULATION"`
- **Router Endpoints:** `POST /api/v1/iot/events`, `POST /api/v1/iot/analyze`, `GET /api/v1/iot/ml/health`
- **SecurityEvent Creation:** `entity_type="IOT_DEVICE"`, `source="ml_iot_detection"`

### 2.3 Module 03 — User & Entity Behavior Analytics (UEBA)
- **Service:** `MLUEBAService` in `backend/app/services/ml_ueba_service.py`
- **Model Version:** `ueba-anomaly-v1` (dataset: `CERT_Insider_Threat`, 30 canonical features)
- **Artifacts:**
  - `backend/app/ml_models/ueba/models/ueba_isolation_forest.joblib`
  - `backend/app/ml_models/ueba/models/ueba_xgboost.joblib`
  - `backend/app/ml_models/ueba/preprocessing/scaler.joblib`
  - `backend/app/ml_models/ueba/preprocessing/feature_schema.json`
- **Output Schema:** `MLUEBAAnalysisResult`
  - `status`: `"SUCCESS" | "INSUFFICIENT_DATA" | "ERROR"`
  - `verdict`: `"BENIGN_USER" | "UEBA_ANOMALY" | "CLASSIFIED_INSIDER_THREAT" | "CONFIRMED_INSIDER_THREAT"`
  - `is_anomaly`: `bool`
  - `is_threat`: `bool`
  - `severity`: `"INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"`
  - `confidence`: `float` ($0.0 - 1.0$)
  - `anomaly_score`: `float`
  - `xgboost_probability`: `float`
  - `environment`: `"REAL" | "SIMULATION"`
- **Router Endpoints:** `POST /api/v1/ueba/events`, `POST /api/v1/ueba/analyze`, `GET /api/v1/ueba/ml/health`
- **SecurityEvent Creation:** `entity_type="USER"`, `source="ml_ueba_detection"`

### 2.4 Module 04 — Phishing & Malicious URL Detection
- **Service:** `MLURLService` in `backend/app/services/ml_url_service.py`
- **Model Version:** `url-phishing-v1`
- **Benchmark:** PhishTank / OpenPhish Benchmark (27 canonical features)
- **Artifacts:**
  - `backend/app/ml_models/url/models/url_isolation_forest.joblib`
  - `backend/app/ml_models/url/models/url_xgboost.joblib`
  - `backend/app/ml_models/url/preprocessing/scaler.joblib`
  - `backend/app/ml_models/url/preprocessing/feature_schema.json`
- **Output Schema:** `MLURLAnalysisResult`
  - `status`: `"SUCCESS" | "INSUFFICIENT_DATA" | "ERROR"`
  - `verdict`: `"SAFE" | "SUSPICIOUS" | "DANGEROUS" | "UNKNOWN"`
  - `is_phishing`: `bool`
  - `is_malicious`: `bool`
  - `severity`: `"INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"`
  - `confidence`: `float` ($0.0 - 1.0$)
  - `anomaly_score`: `float`
  - `classification_probability`: `float`
  - `environment`: `"REAL" | "SIMULATION"`
- **Decision Fusion Component:** `URLDecisionFusion` (fuses ML, Threat Intel, Web Scanner, Rules)
- **Router Endpoints:** `POST /api/v1/browser/check-url`, `POST /api/v1/browser/analyze`, `GET /api/v1/browser/ml/health`, `POST /api/v1/personal/url-check`
- **SecurityEvent Creation:** `entity_type="URL"` or `"DOMAIN"`, `source="ml_url_phishing_detection"`

---

## 3. Existing Security Infrastructure

### 3.1 SecurityEvent Model (`backend/app/models/phase4.py`)
- Inherits from `TenantBase` (`id`, `company_id`, timestamps).
- Columns:
  - `event_id`: source telemetry event ID
  - `rule_id`: detection/fusion rule identifier
  - `title`: human-readable alert title
  - `description`: markdown/text explanation
  - `severity`: `"INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"`
  - `confidence`: `float` (0.0 to 1.0)
  - `source`: detection origin (e.g. `multi_model_fusion`)
  - `entity_type`: `"ASSET" | "USER" | "IP" | "IOT_DEVICE" | "URL" | "DOMAIN" | "FUSION"`
  - `entity_id`: identifier of affected entity
  - `risk_score`: calculated numeric risk (0 to 100)
  - `metadata_json`: arbitrary JSON dictionary for full evidence tracking
  - `raw_data`: raw telemetry/features payload
  - `environment`: `"REAL" | "SIMULATION"`
  - `timestamp`: UTC datetime

### 3.2 Incident Correlation Engine (`backend/app/services/incidents/correlation.py`)
- **Method:** `IncidentCorrelationEngine.correlate_detections(db, company_id, detections: List[DetectionResult]) -> List[Incident]`
- **Sliding Window:** 2 hours (`updated_at >= utc_now() - timedelta(hours=2)`).
- **Matching Criteria:** `(Incident.asset_id == entity_id) | (Incident.title.contains(entity_id))`.
- **Deduplication:** Aggregates related detections into an existing `OPEN` or `INVESTIGATING` incident; escalates severity if incoming detection is higher.
- **Timeline Entry:** Appends an `IncidentEvent` (`action="DETECTION_CORRELATED"`).
- **Incident Creation:** If no incident exists and severity is `HIGH` or `CRITICAL`, creates new `Incident`.
- **WebSocket Broadcast:** Emits `incident_created`, `incident_updated`, and `asset_status_changed`.

### 3.3 WebSocket Manager (`backend/app/core/websocket.py`)
- **Tenant Isolation:** `broadcast_to_company(company_id, event_type, data)` filters connections strictly by `company_id`.
- Connections belonging to other companies or personal users never receive enterprise tenant alerts.

### 3.4 Digital Twin (`backend/app/routers/digital_twin.py`)
- Queries real `Asset`, `IoTDevice`, `CompanyUser` identities, and `SecurityEvent` detections where `company_id == cid`.
- Automatically maps high-severity assets, anomalous IoT devices, risky identities ($Risk \ge 30$), and URL/domain threats into 3D topology nodes.

### 3.5 Dynamic Attack Graph (`backend/app/routers/attack_graph.py`)
- Multi-tier layered topology:
  - **Tier 0 (x=80):** External Internet / Adversary & External Phishing URLs.
  - **Tier 1 (x=280):** DMZ / Gateways / Websites / Firewalls.
  - **Tier 2 (x=500):** Core Application / Routing / Servers / Identities.
  - **Tier 3 (x=720):** Internal Databases / Sensitive Storage.
- Discovers communication edges (`OBSERVED` vs `POSSIBLE_ATTACK_PATH`) and dynamically computes choke points.

### 3.6 SOAR Automation (`backend/app/models/phase4.py`, `backend/app/routers/soar.py`)
- `SOARPlaybook`: fields `name`, `trigger`, `steps`, `is_active`.
- `PlaybookExecution`: fields `playbook_id`, `incident_id`, `status`, `result`, `actor`.

### 3.7 Audit Logging (`backend/app/models/models.py`)
- `AuditLog`: fields `company_id`, `user_id`, `action`, `result`, `resource_type`, `resource_id`, `metadata_json`, `ip_address`, `timestamp`.

---

## 4. Module 05 Architectural Blueprint

Module 05 sits above the 4 specialized ML detectors and 3 contextual security streams:

```
[Network ML (CIC-IDS)] ──┐
[IoT ML (CICIoT)]       ──┼──> [Evidence Normalizer] ──> [Multi-Model Fusion Engine]
[UEBA ML (CERT)]        ──┤                                     │
[URL ML (PhishTank)]    ──┤                             ┌───────┴────────┐
[Threat Intelligence]   ──┤                             ↓                ↓
[Web Scanner Heuristics]──┤                      [Unified Verdict] [Explainability]
[Security Rules]        ──┘                             │
                                                        ↓
                                                 [SecurityEvent]
                                                        │
                                                        ↓
                                          [IncidentCorrelationEngine]
                                                        │
                         ┌──────────────────────────────┼──────────────────────────────┐
                         ↓                              ↓                              ↓
                    [WebSocket]                 [3D Digital Twin]              [Attack Graph]
                         ↓                              ↓                              ↓
                   [SOC Dashboard]               [Node Telemetry]             [Choke Point SOAR]
```

### Unified Multi-Signal Verdict Model:
- `BENIGN`: All available signals indicate clean, expected behavior.
- `LOW_CONFIDENCE`: Minor isolated anomaly without corroboration; insufficient evidence to establish malicious intent.
- `SUSPICIOUS`: Statistical anomaly observed in one or more streams with low-to-moderate threat indicators; warrants proactive monitoring.
- `HIGH_CONFIDENCE_THREAT`: Multiple independent corroborating sources confirm malicious activity (e.g. Network + UEBA, Network + URL, or threat intel confirmation).
- `CRITICAL_THREAT`: Multi-stage coordinated compromise across 3+ sources or authoritative threat intel match on active payload/C2.
- `UNKNOWN`: Insufficient data available across all evaluated models.

---

## 5. Audit Conclusion
All interfaces, schemas, and dependencies are verified. Proceeding directly with Phase 3 (Normalized Evidence Model) and Phase 4 (Multi-Model Detection Fusion Engine Implementation).
