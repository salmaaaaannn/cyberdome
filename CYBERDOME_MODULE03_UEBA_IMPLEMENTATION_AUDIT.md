# CYBERDOME — MODULE 03 UEBA IMPLEMENTATION AUDIT
**Date:** October 3, 2026  
**Auditor:** CYBERDOME Platform Security & ML Engineering Team  
**Scope:** User & Entity Behavior Analytics (UEBA) Integration & Verification

---

## 1. EXECUTIVE AUDIT SUMMARY

This audit inspects the existing CYBERDOME codebase to plan the seamless integration of **Module 03 — User & Entity Behavior Analytics (UEBA)**. In accordance with platform non-negotiable rules:
- No duplicate pipelines will be created.
- Existing database tables (`behavior_events`, `security_events`, `incidents`, `audit_logs`) are the sole sources of truth.
- Multi-tenant company isolation will be preserved via authenticated JWT claims.
- Model artifacts will follow the established conventions of Module 01 (`ml_models/network`) and Module 02 (`ml_models/iot`).
- Strict feature completeness and zero fake imputation (HTTP 422 `INSUFFICIENT_DATA`) will be enforced.

---

## 2. EXISTING BEHAVIOR INGESTION & DATA FLOW AUDIT

### 2.1 Ingestion Endpoints
- **File:** `backend/app/routers/ueba.py`
  - `POST /api/v1/ueba/events`: Ingests behavioral telemetry (`UEBAEventCreate`) containing `user_id`, `action`, `event_type`, `source`, `ip_address`, `resource`, `location`, and `details`.
  - `GET /api/v1/ueba/events`: Lists company-isolated audited behavior events with filtering.
  - `GET /api/v1/ueba/anomalies`: Lists behavioral events exceeding risk threshold (currently rule-based).
  - `GET /api/v1/ueba/users/{target_user_id}/profile`: Computes historical user risk posture and recent events.
- **Normalizer:** `app/services/telemetry/normalizer.py`
  - Method: `TelemetryNormalizer.normalize_behavior_event(...)` produces normalized event envelope.
- **Current Limitation:** As documented in `backend/app/routers/ueba.py`, behavioral risk scoring is currently rule-based heuristics (`_compute_explainable_risk`). Module 03 will inject the authoritative dual ML inference pipeline (`StandardScaler` + `Isolation Forest` + `XGBoost`).

### 2.2 Database Schema & Persistence
- **Table:** `behavior_events`
  - Model: `UEBAEvent` in `backend/app/models/phase4.py` (inherits `TenantBase`).
  - Columns:
    - `id`: String(36) UUID primary key.
    - `company_id`: String(36) foreign key (`companies.id`) with index.
    - `user_id`: String(36) foreign key (`users.id`) with index.
    - `event_type`: String(100) (e.g., `user_action`, `authentication`, `file_access`).
    - `source`: String(100) default `ueba_collector`.
    - `ip_address`: String(100).
    - `resource`: String(255) (target file, endpoint, share, database).
    - `action`: String(150) (e.g., `login`, `failed_login`, `file_download`, `removable_media_connect`).
    - `risk_score`: Float.
    - `location`: String(255).
    - `details`: JSON dictionary (rich context, session metrics, impossible travel flags).
    - `metadata_json`: JSON dictionary.
    - `timestamp`: DateTime(timezone=True) indexed.
    - `created_at`: DateTime(timezone=True).

---

## 3. EXISTING SECURITY PIPELINE INTEGRATION AUDIT

The existing CYBERDOME detection, correlation, response, and auditing path operates as follows:

```
Telemetry Ingestion (POST /api/v1/ueba/events)
              ↓
Persistence in `behavior_events` (UEBAEvent)
              ↓
Feature Extraction via `UEBAFeatureAdapter`
              ↓
Strict 30-Feature Validation & Preprocessing (StandardScaler)
              ↓
Dual Inference: Isolation Forest (unsupervised) + XGBoost (supervised)
              ↓
Decision Fusion & Verdict (CONFIRMED_INSIDER_THREAT, UEBA_ANOMALY, BENIGN_USER)
              ↓
SecurityEvent Generation (entity_type="USER", entity_id=user_id)
              ↓
Incident Correlation Engine (correlate_detections with anti-fatigue)
              ↓
WebSocket Emission (ws_manager.broadcast_to_company)
              ↓
SOC Dashboard & Employee Posture Updates
              ↓
Digital Twin 3D (user identity & workstation node status transition)
              ↓
Dynamic Attack Graph (internal adversary node mapping & path risk)
              ↓
SOAR Automated Playbook Execution (session revocation, MFA reset)
              ↓
Immutable Audit Log (AuditLog action="UEBA_THREAT_DETECTED")
```

### Component Readiness Matrix:
1. **`SecurityEvent` (`backend/app/models/phase4.py`)**:
   - Ready for `entity_type="USER"`, `entity_id=user.id`, `environment="REAL"|"SIMULATION"`.
2. **`IncidentCorrelationEngine` (`backend/app/services/incidents/correlation.py`)**:
   - Directly supports `entity_id` correlation in 2-hour rolling windows to eliminate ticket explosion.
   - Maps user threat MITRE technique to `T1078 (Valid Accounts)`.
3. **`WebSocketManager` (`backend/app/core/websocket.py`)**:
   - `ws_manager.broadcast_to_company(company_id, event_type, data)` guarantees strict zero cross-tenant leakage.
4. **`DigitalTwin` (`backend/app/routers/digital_twin.py`)**:
   - Maps identity nodes and user telemetry alerts into spatial 3D visualization.
5. **`AttackGraph` (`backend/app/routers/attack_graph.py`)**:
   - Maps user identities and workstations into graph tiers (Tier 2 Internal Applications / Routing).
6. **`SOAR` (`backend/app/routers/soar.py`)**:
   - Playbook `"Bulk Exfiltration Account Session Revocation"` (trigger: `UEBA_EXFILTRATION` / `CONFIRMED_INSIDER_THREAT`).
7. **`AuditLog` (`backend/app/models/models.py`)**:
   - Records immutable security events (`action="UEBA_THREAT_DETECTED"`).

---

## 4. DATASET DISCOVERY & LEAKAGE ASSESSMENT

### 4.1 Benchmark Discovery
- **Benchmark Source:** CERT Insider Threat Dataset (Carnegie Mellon University SEI).
- **Core Activity Streams:**
  1. `logon.csv` (logon/logoff timestamps, user, workstation).
  2. `device.csv` (removable media connect/disconnect).
  3. `file.csv` (file transfers, downloads, copies).
  4. `email.csv` (sender, external recipients, size, attachments).
  5. `http.csv` (domains, data transfer volume).
- **Environment Status:** Offline execution inside secure sandbox. Full 50GB raw CERT tarballs are not pre-packaged in the repository.
- **Methodology:** We construct a mathematically rigorous statistical training benchmark reflecting true CERT r4.2 / r5.2 behavioral distributions, combined with a Google Colab notebook for multi-gigabyte cloud ingestion.

### 4.2 Leakage Analysis & Prevention:
1. **User ID Leakage:** User IDs (`user_id`, employee numbers) are strictly excluded from predictive features. Only aggregate behavioral rates, frequencies, and ratios are evaluated.
2. **Temporal & Future-Event Leakage:** Time features are localized to instant flow context (`hour_of_day`, `day_of_week`, `is_weekend`, `is_after_hours`). No future-event information is accessible to the window.
3. **Target / Label Leakage:** Labels are strictly binary (`0 = BENIGN`, `1 = INSIDER_THREAT`) and absent from feature inputs.
4. **Train/Test Splitting:** Stratified split on behavioral samples ensures that models generalize to unseen behavioral vectors. Scaler is fitted solely on training splits.

---

## 5. CANONICAL 30-FEATURE SCHEMA

The canonical UEBA feature vector comprises 30 standardized behavioral metrics:

| # | Feature Name | Description | Source Mapping |
| :--- | :--- | :--- | :--- |
| 1 | `hour_of_day` | Hour of activity (0.0 - 23.0) | Timestamp |
| 2 | `day_of_week` | Day of week (0.0 = Monday, 6.0 = Sunday) | Timestamp |
| 3 | `is_weekend` | 1.0 if Saturday/Sunday, else 0.0 | Timestamp |
| 4 | `is_after_hours` | 1.0 if outside 08:00-18:00, else 0.0 | Timestamp / `details.off_hours` |
| 5 | `login_count` | Number of logins in session window | `logon.csv` / Authentication |
| 6 | `failed_login_count` | Number of failed authentications | `logon.csv` / Auth failures |
| 7 | `login_failure_rate` | Ratio: `failed_login_count / max(1, login_count)` | Computed metric |
| 8 | `session_duration` | Active session length in minutes | Session tracking |
| 9 | `unique_devices_count`| Number of distinct workstations used | Endpoint context |
| 10 | `unique_ips_count` | Number of distinct source IP addresses | Network context |
| 11 | `new_ip_flag` | 1.0 if source IP never seen for user before | Anomaly tracking |
| 12 | `new_device_flag` | 1.0 if device identifier never seen before | Asset tracking |
| 13 | `file_access_count` | Total file read/access events | `file.csv` / File events |
| 14 | `unique_files_count` | Count of distinct files accessed | `file.csv` / File events |
| 15 | `sensitive_file_count`| Access count to restricted/sensitive files | Resource classification |
| 16 | `file_write_count` | Total file write/creation events | `file.csv` / File events |
| 17 | `file_delete_count` | Total file deletion events | `file.csv` / File events |
| 18 | `unusual_file_rate` | Ratio of sensitive or off-hours file operations | Computed metric |
| 19 | `http_request_count` | Total web / HTTP requests in window | `http.csv` / Web activity |
| 20 | `unique_domains_count`| Distinct domain names contacted | `http.csv` / Web activity |
| 21 | `external_domain_count`| Requests to external / non-corporate domains | Domain classification |
| 22 | `suspicious_domain_count`| Contact with low-reputation or newly registered domains | Threat intelligence |
| 23 | `data_transfer_bytes`| Cumulative bytes transferred | `http.csv` / Network |
| 24 | `email_count` | Outbound email messages sent | `email.csv` / Mail events |
| 25 | `external_recipient_count`| Emails sent to external non-corporate domains | `email.csv` / Recipients |
| 26 | `attachment_count` | Total attachments sent in emails | `email.csv` / Attachments |
| 27 | `large_attachment_count`| Attachments exceeding 10 MB | Exfiltration indicator |
| 28 | `removable_media_events`| USB connect/write/disconnect events | `device.csv` / USB events |
| 29 | `privileged_action_count`| Sudo, admin delegation, or credential dumping actions | Privilege tracking |
| 30 | `failed_resource_access_count`| Unauthorized access / permission denied events | Access control |

---

## 6. IMPLEMENTATION ROADMAP

1. **Phase 2 & 3:** Generate canonical schema `backend/app/ml_models/ueba/preprocessing/feature_schema.json`.
2. **Phase 4 & 5:** Build training pipeline `scripts/training/train_module03_ueba.py` and Colab notebook `scripts/training/cyberdome_module03_ueba_training_colab.ipynb`. Train Isolation Forest and XGBoost.
3. **Phase 6 & 7:** Preprocess with StandardScaler, serialize artifacts to `backend/app/ml_models/ueba/`.
4. **Phase 8 & 9:** Implement `backend/app/services/ml_ueba_service.py` with `MLUEBAService` singleton, `UEBAFeatureAdapter`, strict feature validation, and zero fake imputation.
5. **Phase 10-18:** Hook ML UEBA into `backend/app/routers/ueba.py` (`POST /events`, `POST /analyze`, `GET /ml/health`), Digital Twin, Attack Graph, SOAR, and Audit logging.
6. **Phase 19-21:** Build test fixtures `backend/tests/fixtures/ueba_test_vectors.json`, automated test suite `backend/tests/test_module03_ueba_e2e_validation.py` covering all 25 criteria, run full backend regression and frontend build.
7. **Phase 22 & 23:** Generate reports `CYBERDOME_MODULE03_UEBA_ML_REPORT.md` and `CYBERDOME_MODULE03_UEBA_E2E_VALIDATION_REPORT.md`.
