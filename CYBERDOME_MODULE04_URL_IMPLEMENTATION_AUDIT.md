# CYBERDOME — MODULE 04 IMPLEMENTATION AUDIT
## Phishing & Malicious URL Detection Architecture Audit

**Audit Date**: October 3, 2026  
**Auditor**: Senior Python/FastAPI + Machine Learning + Cybersecurity Platform Engineer  
**Objective**: Comprehensive technical inspection of existing browser extension, web scanner, threat intelligence, detection rules, security events, incident correlation, WebSocket, digital twin, attack graph, SOAR, and audit logging before implementing Module 04.

---

## 1. Executive Summary & Existing Status

The CYBERDOME platform has three operational ML modules:
- **Module 01 (Network Anomaly Detection)**: `READY` (77 CIC-IDS2017 features, Isolation Forest + XGBoost)
- **Module 02 (IoT Anomaly Detection)**: `READY` (46 CICIoT2023 features, Isolation Forest + XGBoost)
- **Module 03 (User & Entity Behavior Analytics — UEBA)**: `READY` (30 CERT Insider Threat features, Isolation Forest + XGBoost)
- **Automated Regression Status**: 55 / 55 tests passing across Modules 01–03.
- **Frontend Build Status**: 56 / 56 pages compiling cleanly via `next build --webpack`.

Module 04 introduces **Phishing & Malicious URL Detection (`url-phishing-v1`)**, designed to seamlessly integrate lexical and structural URL ML inference with the existing scanner, threat intelligence, security rules, and browser extension into a single evidence-based decision pipeline.

---

## 2. Existing Browser Architecture Audit

### 2.1 Chrome Extension (`chrome-extension/`)
- **Manifest Version**: `3` (`chrome-extension/manifest.json`)
- **Permissions**: `["activeTab", "storage"]`
- **Host Permissions**: `["http://localhost:8000/*", "https://*.cyberdome.local/*"]`
- **Action / UI**:
  - `popup.html`: CyberDome Scanner popup with auth token input, URL target display, verdict badge (`SAFE` vs `DANGEROUS`), reputation score (`0-100`), TLS certificate status indicator, and dynamic phishing indicators list.
  - `popup.js`:
    - Reads active browser tab URL via `chrome.tabs.query({active: true, currentWindow: true})`.
    - Handles internal browser schemes (`chrome://`, `edge://`) with safe rejection.
    - Manages JWT authentication token via `chrome.storage.local.get(['cyberdome_token'])` and `set`.
    - Dispatches HTTP POST request to `http://localhost:8000/api/v1/browser/check-url` with `Authorization: Bearer <token>`.
    - Renders server-returned verdict, reasons, TLS status, and security indicators.
- **Local Caching Strategy**: Currently token is persisted in `chrome.storage.local`. Can be extended to cache evaluated URL verdicts with TTL to avoid redundant network calls during rapid browser navigation.

### 2.2 Browser Warning & Interstitial Pages
- **Frontend Safe Landing**: `src/app/training/safe-landing/page.tsx` provides safe landing for educational / simulated phishing exercises.
- **Frontend Personal URL Checker**: `src/app/(dashboard)/personal/url-check/page.tsx` provides manual URL submission and report inspection, consuming `urlSafetyService.checkUrl(query)`.
- **API Client Service**: `src/services/index.ts` (`urlSafetyService`) sends `POST ${API_BASE}/personal/url-check`.

---

## 3. Existing Web Scanner & Website Security Audit

### 3.1 Scanner Endpoints & Routers
- **`backend/app/routers/scanner.py`**:
  - `GET /api/v1/scanner/assessments/{assessment_id}`: Returns security checks (`checks`) and failed findings (`findings`).
- **`backend/app/routers/website_security.py`**:
  - `POST /api/v1/website-security/assessments`: Initiates website security assessment.
  - `GET /api/v1/website-security/assessments/{id}`: Returns scan progress, summary, and findings.
  - `GET /api/v1/website-security/discovered-assets`: Returns discovered domains, subdomains, and perimeters.
- **`backend/app/services/scan_worker.py`**:
  - Background asynchronous scan worker running `run_full_scan` via `asyncio.create_task`.
- **`backend/app/services/__init__.py`** (`run_full_scan`):
  - Step 1: `validate_target` (Blocks SSRF, loopbacks, internal RFC 1918 IPs, cloud metadata `169.254.169.254`, internal suffixes `.local`, `.internal`).
  - Step 2: `resolve_dns` (A records, MX, TXT, NS, PTR, CNAME via `dns.resolver`).
  - Step 3: `analyze_tls` (OpenSSL cert expiry, cipher suite, issuer, SANs).
  - Step 4: `analyze_http` (Status code, latency, server banner, redirects).
  - Step 5: `analyze_security_headers` (HSTS, CSP, X-Frame-Options, X-Content-Type-Options).
  - Step 6: `analyze_cookies` (Secure, HttpOnly, SameSite attributes).
  - Step 7: `detect_technologies` (CMS, web frameworks, web servers).
  - Step 8: `lookup_vulnerabilities` (CVE correlation for identified tech stacks).
  - Step 9: `generate_findings` & `calculate_risk_score`.

### 3.2 URL Check Router (`backend/app/routers/browser.py` & `personal.py`)
- `POST /api/v1/browser/check-url` and `POST /api/v1/personal/url-check`:
  - Validates target via `validate_target(url)`.
  - Performs passive heuristic checks:
    - Credential-harvesting keywords (`secure-login`, `account-verify`, `bank-update`, `paypal-auth`, `apple-id-verify`).
    - Excessive hyphenation (`count("-") >= 3`).
    - High-abuse TLDs (`.top`, `.xyz`, `.gq`, `.cf`, `.tk`, `.work`).
    - DNS A-record resolution check (identifies parked domains or NXDOMAIN).

---

## 4. Security Pipeline & Backend Core Audit

### 4.1 SecurityEvent Model (`backend/app/models/phase4.py`)
- Table: `security_events`
- Multi-tenant column: `company_id` (ForeignKey to `companies.id`, indexed).
- Entity Types: `ASSET`, `USER`, `IP`, `IOT_DEVICE`, and for Module 04: `URL` / `DOMAIN`.
- Severity: `INFO`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- Confidence: `0.0` to `1.0`.
- Environment: `REAL` vs `SIMULATION`.
- Metadata: `metadata_json` stores full evidence (ML analysis, scanner details, threat intelligence, rules matched).

### 4.2 IncidentCorrelationEngine (`backend/app/services/incidents/correlation.py`)
- Searches for open or investigating incidents on `(Incident.asset_id == entity_id) | (Incident.title.contains(entity_id))` within a 2-hour window.
- If match found: appends `IncidentEvent(action="DETECTION_CORRELATED")`, escalates severity if higher, updates timestamp, broadcasts `incident_updated` via WebSocket.
- If no match found: generates a consolidated new `Incident` with risk score and MITRE technique mapping.

### 4.3 WebSocket Manager (`backend/app/core/websocket.py`)
- Bounded to `company_id`. Method `broadcast_to_company(company_id, event_type, data)` guarantees strict tenant channel isolation.

### 4.4 3D Digital Twin & Dynamic Attack Graph
- **Digital Twin** (`backend/app/routers/digital_twin.py`):
  - Visualizes real assets, IoT devices, user identities, and perimeters.
  - URL threats affecting enterprise users or external domain perimeters can be mapped directly into topological perimeter / gateway / identity nodes.
- **Attack Graph** (`backend/app/routers/attack_graph.py`):
  - Visualizes 4-tier attack paths (Tier 0: External Internet Adversary, Tier 1: Inbound Ingress / Perimeters, Tier 2: Internal Hosts & Users, Tier 3: Sensitive Databases).
  - Malicious URLs / external adversary domains naturally map to Tier 0 / Tier 1 ingress attack paths with elevated threat probability.

### 4.5 SOAR & Audit Logging
- **SOAR** (`backend/app/routers/soar.py`):
  - Supports triggers like `MALICIOUS_URL_DETECTED` or `PHISHING_ATTEMPT_BLOCKED` to execute automated response playbooks (e.g. Domain Quarantine, User Notification, Threat Intel Blocklist Update).
- **Audit Logging** (`backend/app/core/dependencies.py`):
  - `create_audit_entry(action="MALICIOUS_URL_DETECTED", resource_type="url", ...)` writes immutable compliance logs to the database.

---

## 5. Architectural Invariants for Module 04

1. **Zero Retraining Mode**: Models will run exclusively in inference mode.
2. **Zero Fake Imputation**: Missing or unparseable URLs fail fast with HTTP 422 `INSUFFICIENT_DATA` or `INVALID_URL`.
3. **Deterministic Feature Ordering**: 27 canonical lexical and syntactic features mapped via `feature_schema.json`.
4. **Explainable Decision Fusion**:
   - Authoritative Threat Intelligence (known malicious) $\rightarrow$ `DANGEROUS`
   - Active Scanner Detection (malicious payload / credential phishing pattern) $\rightarrow$ `DANGEROUS`
   - ML High-Confidence Anomaly + Classifier Threat $\rightarrow$ `DANGEROUS`
   - ML Anomaly or Heuristic Suspicion $\rightarrow$ `SUSPICIOUS`
   - Clean ML + Clean Scanner + Clean Threat Intel $\rightarrow$ `SAFE`
   - Unresolvable or Incomplete $\rightarrow$ `UNKNOWN`
5. **No Data Fabrication**: No synthetic domain ages, fake CVEs, or fabricated threat scores.
6. **Strict Multi-Tenant Isolation**: Bounded by JWT `company_id`.

---

## 6. Audit Verdict

The CYBERDOME codebase has clean, modular extension points. The existing web scanner, DNS resolution, heuristic checks, `SecurityEvent` schema, `IncidentCorrelationEngine`, and `chrome-extension` are ready for Module 04 integration without creating parallel systems.
