# CYBERDOME — PHASE 4 PRODUCTION SECURITY OPERATIONS PLAN
## TELEMETRY → DETECTION → REALTIME → DIGITAL TWIN → INCIDENTS → SOAR

**Date:** September 30, 2026  
**Status:** In Progress — Discovery & Implementation  
**Baseline Verification:** Next.js build passes | 37/37 backend tests pass | 3D GLB assets verified | Multi-tenant isolation verified

---

## 1. Existing Implementation Overview

### 1.1 Backend Models
- `backend/app/models/models.py`:
  - `User`: Accounts, passwords, multi-tenant company memberships, personal user support.
  - `Company`: Tenant container, domain, access codes.
  - `CompanyUser`: Tenant membership with RBAC (`ADMIN`, `EMPLOYEE`).
  - `Asset`: Core infrastructure assets (`WEBSITE`, `DOMAIN`, `SERVER`, `DATABASE`, `APPLICATION`, `CLOUD`, `IOT_DEVICE`, `NETWORK`).
  - `AuditLog`: Security audit logging with actor, company, action, timestamp, metadata.
  - `Notification` & `NotificationPreference`: Security alerts & notification settings.
- `backend/app/models/website_security.py`:
  - `WebsiteAssessment`: Passive scanning container with progress, domain, status.
  - `DiscoveredAsset`: Attack surface discovery assets.
  - `WebsiteFinding`: Scanner findings (SSL/TLS, headers, cookies, DNS).
  - `Vulnerability` & `AssetVulnerability`: CVE/CVSS/EPSS database and company-scoped asset associations.
- `backend/app/models/phase4.py`:
  - `TenantBase`: Abstract multi-tenant base with `company_id`.
  - `AgentDevice`, `NetworkEvent`, `IoTDevice`, `UEBAEvent` (`behavior_events`).
  - `Incident`, `IncidentEvent`.
  - `Report`, `SOARPlaybook`, `PlaybookExecution`.

### 1.2 Backend Routers
- `/api/v1/network`: Endpoints for `GET /events`, `POST /events`, `GET /alerts`, `GET /topology`, `GET /stats`.
- `/api/v1/iot`: Endpoints for `GET /devices`, `POST /devices`, `GET /devices/{id}`, `PATCH /devices/{id}`, `GET /anomalies`.
- `/api/v1/ueba`: Endpoints for `GET /events`, `POST /events`, `GET /anomalies`, `GET /users/{id}/profile`.
- `/api/v1/incidents`: Endpoints for `GET /`, `POST /`, `GET /{id}`, `PATCH /{id}`, `POST /{id}/events`.
- `/api/v1/soar`: Endpoints for `GET /playbooks`, `POST /playbooks`, `POST /playbooks/{id}/execute`, `GET /executions`.
- `/api/v1/digital-twin`: Endpoints for `GET /nodes` (spatial node mappings with 3D positions and telemetry).
- `/api/v1/attack-graph`: Endpoints for `GET /` (multi-tiered topology with choke points).
- `/api/v1/reports`: Endpoints for `GET /`, `POST /generate`, `GET /{id}/download`.
- `/api/v1/notifications`: Endpoints for `GET /`, `PATCH /{id}/read`.

### 1.3 Missing or Incomplete Components
1. **Telemetry Ingestion & Normalization Layer:**
   - Ingestion was basic inserts without a formal normalization service and event bus dispatch.
   - Missing `POST /api/v1/iot/events` for device telemetry streaming.
   - Telemetry models need the full specification fields (`packets`, `bytes`, `direction`, `source_port`, `destination_port`, `device_identifier`, `manufacturer`, `model`, `firmware`, `risk_score`, `last_seen`, `raw_data`, `normalized_data`).
2. **Deterministic Detection Engine & Rule Storage:**
   - No detection rule table or service executing deterministic rules against normalized security events.
   - Detections were not generated dynamically on telemetry ingestion.
3. **Incident Correlation Engine:**
   - Incidents were created only manually, not correlated automatically from bursts of security detections sharing asset/source/tenant within a time window.
4. **Authenticated Real-Time WebSocket Infrastructure:**
   - No WebSocket endpoint existed in FastAPI or client service.
   - Required: `WS /api/v1/ws?token=...` with tenant isolation and real-time pub/sub.
5. **Dashboard Real-Data Aggregation:**
   - `src/app/(dashboard)/dashboard/page.tsx` contained hardcoded KPI cards (`87/100`, `04`, `17`, `128`) and static `mockFindings` / `mockAlerts`.
   - Needs a unified real metrics endpoint `GET /api/v1/companies/dashboard-metrics`.
6. **Frontend Real-Data Connections:**
   - `/network`, `/iot`, `/ueba`, `/soar`, `/detection-rules` were either using static mock arrays or empty `useState([])` without fetching data or listening to real-time events.
7. **Digital Twin Live Binding & Real-Time State:**
   - The 3D scene needs real-time WebSocket state changes reflecting asset security status (`NORMAL`, `WARNING`, `COMPROMISED`, `OFFLINE`, `CRITICAL`).
   - The inspector panel must show real vulnerabilities, detections, and incidents for the selected entity.

---

## 2. Target Architecture & Implementation Strategy

```
REAL TELEMETRY (Network / IoT / UEBA)
      ↓
INGESTION API (/api/v1/{network,iot,ueba}/events)
      ↓
NORMALIZATION SERVICE (backend/app/services/telemetry/normalizer.py)
      ↓
POSTGRESQL / SQLALCHEMY (Tenant-Isolated Models)
      ↓
DETERMINISTIC DETECTION ENGINE (backend/app/services/detection/engine.py)
      ↓
SECURITY EVENTS / DETECTIONS (detection_events table)
      ↓
INCIDENT CORRELATION ENGINE (backend/app/services/incidents/correlation.py)
      ↓
REALTIME EVENT BUS (backend/app/core/websocket.py)
      ↓
WEBSOCKET LAYER (/api/v1/ws — Tenant Isolated)
      ↓
┌─────────────────┬──────────────────┬─────────────────┐
│ Realtime        │ Digital Twin     │ SOC Incidents   │
│ Dashboard & UIs │ 3D Live State    │ & Safe SOAR     │
└─────────────────┴──────────────────┴─────────────────┘
```

---

## 3. Files to Modify & Files to Create

### Backend:
- **Modify:** `backend/app/models/phase4.py` — Complete fields for `NetworkEvent`, `IoTDevice`, `UEBAEvent`, `Incident`, `IncidentEvent`, `SOARPlaybook`, `PlaybookExecution`; add `DetectionRule` and `SecurityEvent`.
- **Create:** `backend/app/core/websocket.py` — Authenticated connection manager with tenant isolation.
- **Create:** `backend/app/services/telemetry/normalizer.py` — Telemetry normalization.
- **Create:** `backend/app/services/detection/engine.py` — Deterministic detection rules & engine.
- **Create:** `backend/app/services/incidents/correlation.py` — Incident correlation service.
- **Create:** `backend/app/routers/ws.py` — WebSocket route (`/api/v1/ws`).
- **Create:** `backend/app/routers/detections.py` — Detection rules and security events API.
- **Modify:** `backend/app/routers/network.py` — Integrate normalization, detection, and WebSocket dispatch.
- **Modify:** `backend/app/routers/iot.py` — Support IoT telemetry events, normalization, and WebSocket updates.
- **Modify:** `backend/app/routers/ueba.py` — Ingest behavioral events with explainable detection.
- **Modify:** `backend/app/routers/companies.py` — Add `/dashboard-metrics` endpoint with real aggregations.
- **Modify:** `backend/app/routers/digital_twin.py` — Enrich node details with real incidents, detections, vulnerabilities, and last events.
- **Modify:** `backend/app/main.py` — Register WebSocket and Detections routers.
- **Modify/Create:** `backend/alembic/versions/` — Migration script for Phase 4 schema changes.

### Frontend:
- **Modify:** `src/services/index.ts` — Add `soarService`, `detectionService`, `dashboardService`, and WebSocket subscription helper.
- **Create:** `src/hooks/useRealtimeEvents.ts` — React hook connecting to authenticated WebSocket with auto-reconnect and tenant isolation.
- **Modify:** `src/app/(dashboard)/dashboard/page.tsx` — Connect to real metrics, open vulnerabilities, and real findings (no hardcoded mock data).
- **Modify:** `src/app/(dashboard)/network/page.tsx` — Load real network telemetry, wire filters, and listen to real-time events.
- **Modify:** `src/app/(dashboard)/iot/page.tsx` — Load real IoT devices, wire status updates and real-time events.
- **Modify:** `src/app/(dashboard)/ueba/page.tsx` — Load real behavior events, anomaly scoring, and explainable insights.
- **Modify:** `src/app/(dashboard)/soar/page.tsx` — Connect to real playbooks and execution history.
- **Modify:** `src/app/(dashboard)/detection-rules/page.tsx` — Connect to real backend detection rules.
- **Modify:** `src/app/(dashboard)/digital-twin/page.tsx` — Bind real-time WebSocket state changes to 3D entities and show full real evidence in inspector.

---

## 4. Test & Verification Plan
1. **Backend Tests (`backend/tests/test_phase4.py`):**
   - Network event creation, validation, and normalization.
   - IoT device registration and IoT event ingestion.
   - Behavior event creation with explainable risk evaluation.
   - Company isolation: Company A cannot read or receive Company B telemetry.
   - Detection rule matching on suspicious network/identity patterns.
   - Security event creation and persistence.
   - Incident correlation: grouping multiple alerts into an incident candidate.
   - Incident lifecycle updates and timeline events.
   - WebSocket authentication and message isolation.
   - SOAR safe playbook execution and audit logging.
   - Dashboard metrics calculation from real DB records.
2. **End-to-End Test (`backend/tests/test_phase4_e2e.py`):**
   - 13-step full integration flow from company creation to telemetry, detection, incident, websocket emission, digital twin update, and SOAR execution.
3. **Regression Tests:**
   - Existing 37/37 tests must continue passing (`pytest backend/tests`).
   - Next.js production build must compile cleanly (`npm run build`).
