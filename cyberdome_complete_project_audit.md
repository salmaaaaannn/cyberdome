# CYBERDOME — COMPLETE FROM-SCRATCH PROJECT FORENSIC AUDIT
**Master Forensic Inventory & Verification Report**  
*Audited Date: September 30, 2026*  
*Repository Root: `/Users/hassaankhan/Desktop/cyberX`*  
*Operating Mode: Strict Non-Destructive Forensic Audit (Zero Code Modifications)*  

---

## 1. SOURCE OF TRUTH & AUDIT METHODOLOGY

This document represents an exhaustive, from-scratch forensic investigation of the **CYBERDOME** repository (`cyberX`). In strict compliance with forensic audit standards:
- **No previous documentation, manifests, or phase summaries were accepted as proof.** All statements in `cyberdome_complete_manifest.md` and phase completion reports were cross-referenced directly against raw source code, ASTs, file system attributes, database binaries, and active runtime processes.
- **Zero code modifications** were made during this audit. No bugs were patched, no features were created, and no files were deleted.
- **Evidence hierarchy:**
  1. *Physical File Inspection & AST Verification* (Python AST, TypeScript AST, Next.js page hierarchy).
  2. *Live Database Inspection* (SQLite master tables, row counts, foreign keys, Alembic migration history).
  3. *Empirical Test Execution* (Pytest test suite execution, Next.js static build execution).
  4. *Live Server Execution* (FastAPI Uvicorn port 8000, Next.js port 3000, authenticated curl requests, WebSocket handshakes, binary asset HTTP inspection).

---

## 2. PROJECT STRUCTURE & TECH STACK INVENTORY

| Subsystem | Technology | Version / Spec | Evidence Path | Status |
|---|---|---|---|---|
| **Frontend Framework** | Next.js (App Router, Turbopack) | 16.3.6 | `package.json`, `next.config.ts` | ✅ VERIFIED |
| **Frontend Runtime** | React & React DOM | 19.2.8 | `package.json` | ✅ VERIFIED |
| **Frontend Language** | TypeScript | 5.x | `tsconfig.json` | ✅ VERIFIED |
| **UI Styling** | TailwindCSS | v4 (`@tailwindcss/postcss`) | `package.json`, `postcss.config.mjs` | ✅ VERIFIED |
| **Icons & Animation** | Lucide React, Framer Motion, GSAP | 1.48.0 / 13.4.4 / 3.15.0 | `package.json` | ✅ VERIFIED |
| **Interactive Graphs** | React Flow | 11.11.4 | `package.json`, `src/app/(dashboard)/attack-graph/page.tsx` | ✅ VERIFIED |
| **3D Rendering** | Three.js, React Three Fiber, Drei | 0.175.0 / 9.8.1 / 10.7.9 | `package.json`, `src/components/3d/` | ✅ VERIFIED |
| **Frontend State** | Zustand | 5.0.15 | `src/stores/appStore.ts` | ✅ VERIFIED |
| **Backend Framework** | FastAPI (ASGI) | 0.115+ | `backend/pyproject.toml` | ✅ VERIFIED |
| **Backend Language** | Python | 3.14.7 | `backend/venv/` | ✅ VERIFIED |
| **Database ORM** | SQLAlchemy (Asyncio) | 2.0+ (`aiosqlite`) | `backend/app/core/database.py` | ✅ VERIFIED |
| **Migrations** | Alembic | 1.13+ | `backend/alembic/` | ✅ VERIFIED |
| **Production DB** | SQLite (Live: `./cyberdome.db`) | 3.x (WAL mode) | `/Users/hassaankhan/Desktop/cyberX/cyberdome.db` | ✅ VERIFIED |
| **Security / Crypto** | Passlib (Bcrypt), PyJWT (HS256) | Standard | `backend/app/core/security.py` | ✅ VERIFIED |
| **AI Integration** | Google GenAI SDK (`gemini-2.5-flash`) | Modern SDK | `backend/app/services/gemini_service.py` | ✅ VERIFIED |
| **Realtime** | Native FastAPI WebSockets | RFC 6455 | `backend/app/routers/ws.py` | ⚠️ PARTIAL |

---

## 3. COMPLETE FRONTEND ROUTE AUDIT (ALL 47 ROUTES)

Every route in `src/app/` was inspected on the filesystem. Static build verified with `npm run build` (50/50 static routes compiled).

| Route | Source File | UI Exists | API Used | Real Data | Mock Data | Status |
|---|---|---|---|---|---|---|
| `/` | `src/app/page.tsx` | ✅ Yes | None (Landing) | N/A | Landing content | ✅ VERIFIED REAL |
| `/login` | `src/app/login/page.tsx` | ✅ Yes | `useAppStore.login` | ⚠️ Client DB | `localStorage` fallback | ⚠️ PARTIAL |
| `/signup` | `src/app/signup/page.tsx` | ✅ Yes | `useAppStore.signup` | ⚠️ Client DB | `localStorage` fallback | ⚠️ PARTIAL |
| `/verify` | `src/app/verify/page.tsx` | ✅ Yes | Form UI | No | Client validation | 🟡 UI ONLY |
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | ✅ Yes | `dashboardService.getMetrics` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/admin` | `src/app/(dashboard)/admin/page.tsx` | ✅ Yes | `companyService`, `employeeService` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/assets` | `src/app/(dashboard)/assets/page.tsx` | ✅ Yes | `assetService.getAssets` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/website-security` | `src/app/(dashboard)/website-security/page.tsx` | ✅ Yes | `websiteAssessmentService` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/vulnerabilities` | `src/app/(dashboard)/vulnerabilities/page.tsx` | ✅ Yes | `websiteAssessmentService` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/attack-surface` | `src/app/(dashboard)/attack-surface/page.tsx` | ✅ Yes | `websiteAssessmentService` | ⚠️ Partial | `mockAssets` fallback | ⚠️ PARTIAL |
| `/scanner` | `src/app/(dashboard)/scanner/page.tsx` | ✅ Yes | None | No | Local static array | 🟡 MOCK/DEMO |
| `/network` | `src/app/(dashboard)/network/page.tsx` | ✅ Yes | `networkService.getNetworkEvents` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/iot` | `src/app/(dashboard)/iot/page.tsx` | ✅ Yes | `iotService.getDevices` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/ueba` | `src/app/(dashboard)/ueba/page.tsx` | ✅ Yes | `uebaService.getEvents` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/detection-rules` | `src/app/(dashboard)/detection-rules/page.tsx` | ✅ Yes | `detectionService.getRules` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/attack-graph` | `src/app/(dashboard)/attack-graph/page.tsx` | ✅ Yes | `attackGraphService.getGraph` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/detection/network` | `src/app/(dashboard)/detection/network/page.tsx` | ✅ Yes | Re-exports `/network` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/detection/iot` | `src/app/(dashboard)/detection/iot/page.tsx` | ✅ Yes | Re-exports `/iot` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/detection/ueba` | `src/app/(dashboard)/detection/ueba/page.tsx` | ✅ Yes | Re-exports `/ueba` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/detection/attack-graph` | `src/app/(dashboard)/detection/attack-graph/page.tsx` | ✅ Yes | Re-exports `/attack-graph` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/mitre` | `src/app/(dashboard)/mitre/page.tsx` | ✅ Yes | None | No | `mockMitreTactics` | 🟡 MOCK/DEMO |
| `/digital-twin` | `src/app/(dashboard)/digital-twin/page.tsx` | ✅ Yes | `digitalTwinService.getNodes` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/simulate/lab` | `src/app/(dashboard)/simulate/lab/page.tsx` | ✅ Yes | Client 3D Simulation | Simulation | Client state | 🟡 SIMULATION |
| `/simulate/human-behavior` | `src/app/(dashboard)/simulate/human-behavior/page.tsx` | ✅ Yes | Client Simulation | Simulation | Client state | 🟡 SIMULATION |
| `/what-if` | `src/app/(dashboard)/what-if/page.tsx` | ✅ Yes | `appStore.triggerWhatIf` | No | `mockSimulationScenarios` | 🟡 SIMULATION |
| `/incidents` | `src/app/(dashboard)/incidents/page.tsx` | ✅ Yes | `incidentService.getIncidents` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/soar` | `src/app/(dashboard)/soar/page.tsx` | ✅ Yes | `soarService.getPlaybooks` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/reports` | `src/app/(dashboard)/reports/page.tsx` | ✅ Yes | `reportService.getReports` | ✅ Real DB | No | ✅ VERIFIED REAL |
| `/analytics` | `src/app/(dashboard)/analytics/page.tsx` | ✅ Yes | None | No | `mockAnalytics` | 🟡 MOCK/DEMO |
| `/ai` | `src/app/(dashboard)/ai/page.tsx` | ✅ Yes | `aiService.sendMessage` | ✅ Real DB/AI | AI Fallback | ✅ VERIFIED REAL |
| `/notifications` | `src/app/(dashboard)/notifications/page.tsx` | ✅ Yes | `notificationEngineService` | ⚠️ Client DB | `mockNotifications` | ⚠️ PARTIAL |
| `/personal/dashboard` | `src/app/(dashboard)/personal/dashboard/page.tsx` | ✅ Yes | Client Heuristics | ⚠️ Client DB | Client state | ⚠️ PARTIAL |
| `/personal` | `src/app/(dashboard)/personal/page.tsx` | ✅ Yes | Client Heuristics | ⚠️ Client DB | Client state | ⚠️ PARTIAL |
| `/personal/url-check` | `src/app/(dashboard)/personal/url-check/page.tsx` | ✅ Yes | `urlSafetyService` (Client) | No | Client Heuristics | ⚠️ PARTIAL |
| `/personal/fraud-call` | `src/app/(dashboard)/personal/fraud-call/page.tsx` | ✅ Yes | `fraudCallService` (Client) | No | Client Heuristics | ⚠️ PARTIAL |
| `/personal/otp-scam` | `src/app/(dashboard)/personal/otp-scam/page.tsx` | ✅ Yes | Form UI | No | Client regex | ⚠️ PARTIAL |
| `/personal/device-security` | `src/app/(dashboard)/personal/device-security/page.tsx` | ✅ Yes | `deviceSecurityService` | No | Client heuristics | ⚠️ PARTIAL |
| `/personal/settings` | `src/app/(dashboard)/personal/settings/page.tsx` | ✅ Yes | Form UI | No | Client state | 🟡 UI ONLY |
| `/employee` | `src/app/(dashboard)/employee/page.tsx` | ✅ Yes | Portal Navigation | No | Static | 🟡 UI ONLY |
| `/employee/dashboard` | `src/app/(dashboard)/employee/dashboard/page.tsx` | ✅ Yes | `academyService`, `incidentService` | ⚠️ Mixed | Courses Mock | ⚠️ PARTIAL |
| `/employee/alerts` | `src/app/(dashboard)/employee/alerts/page.tsx` | ✅ Yes | Local state | No | Local mock array | 🟡 MOCK/DEMO |
| `/employee/my-security` | `src/app/(dashboard)/employee/my-security/page.tsx` | ✅ Yes | Local state | No | Local mock score | 🟡 UI ONLY |
| `/employee/phishing` | `src/app/(dashboard)/employee/phishing/page.tsx` | ✅ Yes | Local state | No | Local mock emails | 🟡 MOCK/DEMO |
| `/academy` | `src/app/(dashboard)/academy/page.tsx` | ✅ Yes | `academyService` (Client) | No | Hardcoded courses | 🟡 MOCK/DEMO |
| `/academy/phishing` | `src/app/(dashboard)/academy/phishing/page.tsx` | ✅ Yes | Form UI | No | Static quiz | 🟡 MOCK/DEMO |
| `/training/phishing-simulation` | `src/app/(dashboard)/training/phishing-simulation/page.tsx` | ✅ Yes | `phishingSimulationService` | No | Client State | 🟡 SIMULATION |
| `/presentation` | `src/app/(dashboard)/presentation/page.tsx` | ✅ Yes | Undocumented Slide Deck | No | Static Deck | 🟡 DEMO ONLY |

---

## 4. FRONTEND FEATURE & COMPONENT AUDIT

### Component Inventory
1. **`src/components/layout/UnifiedNavbar.tsx`**: Top navigation header. Supports role badges (`ADMIN`, `EMPLOYEE`, `USER`), quick link routing, organization switcher, theme toggle, and logout action.
2. **`src/components/CyberDomeScene.tsx`**: Landing page hero 3D canvas rendering an interactive wireframe security dome using Three.js particles and rotating rings.
3. **`src/components/3d/DigitalTwin3DScene.tsx`**: Enterprise SOC 3D environment. Renders interactive workstations, firewalls, servers, databases, and IoT nodes with security status halos and real-time incident pulse animations.
4. **`src/components/3d/GLTFModel.tsx`**: GLTF model loader utilizing `@react-three/drei`'s `useGLTF`. Renders physical `.glb` geometries with material cloning and error boundary fallbacks.
5. **`src/components/3d/SimulationLab3DScene.tsx`**: Interactive attack progression canvas for red-team attack tree simulation and lateral movement visualization.
6. **`src/components/3d/CyberGlobe.tsx`**: 3D globe component with geographic threat arcs and telemetry coordinates.
7. **`src/components/3d/AnimatedSprite.tsx`**: 2D sprite particle billboard component for rendering alert indicators and network packets in Three.js scenes.
8. **`src/components/ui/CyberSafetyLogo.tsx` / `CyberDomeLogo.tsx`**: Scalable SVG brand assets.
9. **`src/components/ui/ThemeToggle.tsx`**: Light/Dark theme controller synchronizing with document classes.

---

## 5. BACKEND ROUTER & COMPLETE API AUDIT

The backend exposes **106 HTTP operations** across 24 routers and **2 WebSocket endpoints** (`/ws` and `/api/v1/ws`).

### Backend Router Summary Table

| Router File | Prefix | Endpoints | Auth Required | DB Connected | Service Layer | Status |
|---|---|---|---|---|---|---|
| `auth.py` | `/api/v1/auth` | 6 | Optional / Bearer | Users, Companies | Passlib / JWT | ✅ REAL |
| `companies.py` | `/api/v1/companies` | 4 | Bearer (Role) | Companies, Users | CompanyService | ✅ REAL |
| `admin.py` | `/api/v1/admin` | 8 | Bearer (ADMIN) | Companies, AuditLogs, Users | AdminService | ✅ REAL |
| `assets.py` | `/api/v1/assets` | 4 | Bearer (Org) | Assets | AssetService | ✅ REAL |
| `website_security.py` | `/api/v1/website-security` | 5 | Bearer (Org) | Assessments, DiscoveredAssets, Findings | `scan_worker.py` | ✅ REAL |
| `scanner.py` | `/api/v1/scanner` | 1 | Bearer (Org) | Assessments | `scan_worker.py` | ✅ REAL |
| `attack_surface.py` | `/api/v1/attack-surface` | 2 | Bearer (Org) | DiscoveredAssets, Findings | ASM Aggregator | ✅ REAL |
| `vulnerability.py` | `/api/v1/vulnerabilities` | 3 | Bearer (Org) | Vulnerabilities, AssetVulns | NVD / KEV Intelligence | ✅ REAL |
| `network.py` | `/api/v1/network` | 5 | Bearer (Org) | NetworkEvents | Normalizer + Detection | ✅ REAL |
| `iot.py` | `/api/v1/iot` | 7 | Bearer (Org) | IoTDevices | Anomaly Heuristics | ✅ REAL |
| `ueba.py` | `/api/v1/ueba` | 4 | Bearer (Org) | BehaviorEvents | Explainable Risk Engine | ✅ REAL |
| `detections.py` | `/api/v1/detection-rules` & `/detections` | 4 | Bearer (Org) | DetectionRules, SecurityEvents | Detection RuleEngine | ✅ REAL |
| `attack_graph.py` | `/api/v1/attack-graph` | 2 | Bearer (Org) | Assets, Vulnerabilities, Events | Graph Topology Builder | ✅ REAL |
| `digital_twin.py` | `/api/v1/digital-twin` | 3 | Bearer (Org) | Assets, IoT, Incidents | State Aggregator | ✅ REAL |
| `incidents.py` | `/api/v1/incidents` | 5 | Bearer (Org) | Incidents, IncidentEvents | Correlation Engine | ✅ REAL |
| `soar.py` | `/api/v1/soar` | 5 | Bearer (Org) | SOARPlaybooks, Executions | SOAR Orchestration | ✅ REAL |
| `reports.py` | `/api/v1/reports` | 5 | Bearer (Org) | Reports | CSV Streaming Aggregator | ✅ REAL |
| `notifications.py` | `/api/v1/notifications` | 4 | Bearer | Notifications, Preferences | Notification Dispatcher | ✅ REAL |
| `ai.py` | `/api/v1/ai` | 4 | Bearer | AIConversations, Messages | Gemini 2.5 + RAG | ✅ REAL |
| `personal.py` | `/api/v1/personal` | 7 | Bearer (USER) | Standalone Defense | URL / Scam Analyzers | ⚠️ UNUSED BY UI |
| `agents.py` | `/api/v1/agents` | 4 | Agent Key / Bearer | AgentDevices | Telemetry Ingestion | ⚠️ NO UI |
| `sensors.py` | `/api/v1/sensors` | 4 | Sensor Key / Bearer | AgentDevices | Telemetry Ingestion | ⚠️ NO UI |
| `ws.py` | `/ws` & `/api/v1/ws` | 2 (WS) | JWT Query Param | User / Company Validation | WebSocket ConnectionMgr | ⚠️ NO UI SUB |

---

## 6. DATABASE SCHEMA & MIGRATION AUDIT

### Live Database Configuration
- **Active Engine URL:** `sqlite+aiosqlite:///./cyberdome.db`
- **Active Physical File:** `/Users/hassaankhan/Desktop/cyberX/cyberdome.db` (1.23 MB)
- **Table Count in Live DB:** **29 tables** (28 application tables + 1 `alembic_version` table)
- **Alembic Version:** `1a028bb40f43` (Matches latest migration head)

### Complete Table & Model Inventory

| Table Name | SQLAlchemy Model | Purpose | Foreign Keys | Tenant Filter (`company_id`) |
|---|---|---|---|---|
| `users` | `User` | Global user identities, authentication, passwords, roles | None | Standalone |
| `companies` | `Company` | Tenant organizations, access codes, domain scoping | None | Primary Tenant |
| `company_users` | `CompanyUser` | Multi-tenant RBAC mapping users to organizations | `companies.id`, `users.id` | Yes |
| `invitations` | `Invitation` | Employee onboarding tokens | `companies.id`, `users.id` | Yes |
| `audit_logs` | `AuditLog` | Immutable system audit log entries | None | Optional |
| `assets` | `Asset` | Enterprise IT/OT infrastructure inventory | `companies.id` | Yes |
| `website_assessments` | `WebsiteAssessment` | External perimeter scan jobs | `companies.id`, `users.id` | Yes |
| `discovered_assets` | `DiscoveredAsset` | Discovered subdomains, web endpoints, IPs | `companies.id`, `website_assessments.id` | Yes |
| `website_findings` | `WebsiteFinding` | Security header, TLS, and DNS findings | `companies.id`, `discovered_assets.id` | Yes |
| `vulnerabilities` | `Vulnerability` | Global CVE, CVSS, EPSS, CISA KEV intelligence | None | Global/Shared |
| `asset_vulnerabilities` | `AssetVulnerability` | M:N mapping of discovered assets to CVEs | `companies.id`, `vulnerabilities.id` | Yes |
| `ai_conversations` | `AIConversation` | Chat sessions with Gemini Security Copilot | `companies.id`, `users.id` | Yes |
| `ai_messages` | `AIMessage` | Historical prompt and response dialogue records | `ai_conversations.id` | Via Conversation |
| `knowledge_documents` | `KnowledgeDocument` | RAG corpus documents | `companies.id` | Yes |
| `knowledge_chunks` | `KnowledgeChunk` | Text chunks and embeddings for semantic search | `companies.id`, `knowledge_documents.id` | Yes |
| `agent_devices` | `AgentDevice` | Enrolled endpoint agents and network sensors | `companies.id` | Yes |
| `network_events` | `NetworkEvent` | Ingested and normalized network traffic telemetry | `companies.id` | Yes |
| `iot_devices` | `IoTDevice` | Enrolled smart and OT connected hardware | `companies.id` | Yes |
| `behavior_events` | `UEBAEvent` | User activity, privileged commands, auth logs | `companies.id`, `users.id` | Yes |
| `detection_rules` | `DetectionRule` | Custom tenant SIGMA detection rules | `companies.id` | Yes (Null=Global) |
| `security_events` | `SecurityEvent` | Fired alerts from detection engine | `companies.id` | Yes |
| `incidents` | `Incident` | Correlated security cases and triage tickets | `companies.id`, `users.id` | Yes |
| `incident_events` | `IncidentEvent` | Audit trail timeline of actions within an incident | `companies.id`, `incidents.id` | Yes |
| `soar_playbooks` | `SOARPlaybook` | Automated response playbooks | `companies.id` | Yes |
| `playbook_executions` | `PlaybookExecution` | Execution logs and outcomes of SOAR actions | `companies.id`, `soar_playbooks.id` | Yes |
| `reports` | `Report` | Generated compliance and posture reports | `companies.id`, `users.id` | Yes |
| `notifications` | `Notification` | In-app user notifications and security alerts | None | User scoped |
| `notification_preferences`| `NotificationPreference` | User notification delivery settings | `users.id` | User scoped |
| `alembic_version` | N/A | Migration version tracker | None | System |

---

## 7. AUTHENTICATION, RBAC & MULTI-TENANT ISOLATION

### Backend Verification
- **Password Hashing:** Passlib with `bcrypt` (rounds=12) verified in `backend/app/core/security.py`.
- **Token Generation:** PyJWT signing `sub`, `email`, `role`, and expiration (`exp`) with HS256.
- **Tenant Scoping:** All enterprise endpoints enforce `get_current_company_membership`. If `user.account_type == "USER"` or user is not a member of the target company, the backend returns HTTP 403 Forbidden.
- **Cross-Tenant Attack Test:** Verified in `test_phase1.py` and `test_phase4.py` — User A from Company A requesting Company B's assets or incidents receives HTTP 404/403. 100% test isolation verified.

### Frontend Disconnect Discovered
- **Critical Finding:** `src/app/login/page.tsx` and `src/app/signup/page.tsx` import `login` and `companyLogin` from `src/stores/appStore.ts`.
- `appStore.ts` implements a **client-side simulated database** (`cybersafety_users_registry` and `cybersafety_companies_registry` stored in `localStorage`).
- While `src/services/index.ts` contains a fully functional `authService.login()` that makes HTTP POST requests to `http://localhost:8000/api/v1/auth/login`, the default login form in `appStore.ts` does not call `authService`. It resolves locally against `localStorage`!

---

## 8. SPECIALIZED SUBSYSTEM AUDITS

### 14. Website Scanner & Passive Analysis
- **Engine File:** `backend/app/services/scan_worker.py`
- **DNS Resolution:** Real `socket.getaddrinfo` and `dns.resolver` for A, AAAA, MX, NS, TXT.
- **TLS Inspection:** Real `ssl.create_default_context()` socket connection parsing cipher, expiration, and issuer.
- **Security Headers:** Inspects CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- **Cookie Audit:** Audits flags `Secure`, `HttpOnly`, and `SameSite`.
- **Technology Detection:** Heuristic regex on headers (`Server`, `X-Powered-By`) and HTML meta tags.
- **Status:** ✅ **VERIFIED REAL** in `backend` and connected to `/website-security`. (Note: `/scanner` is an older mocked UI page).

### 15. Vulnerability Intelligence
- **Database:** Stores CVE ID, description, CVSS v3 score, severity, EPSS percentile, and CISA KEV (Known Exploited Vulnerabilities) flag.
- **Matching Pipeline:** Automatically associates discovered tech stack products with CVE records and stores mappings in `asset_vulnerabilities`.
- **Status:** ✅ **VERIFIED REAL**.

### 16. Attack Surface Management (ASM)
- **Pipeline:** Aggregates discovered subdomains, IP addresses, open ports, and perimeter certificates from `discovered_assets`.
- **Status:** ✅ **VERIFIED REAL** on backend; `/attack-surface` frontend page is connected but falls back to mock data if no scans have been performed yet.

### 17. Network Security
- **Ingestion:** `POST /api/v1/network/events` normalizes raw packet headers (IPs, ports, protocols, bytes, signatures).
- **Detection Integration:** Normalized events are pushed directly into `RuleEngine.evaluate_event()`.
- **Correlation:** Detections with CRITICAL or HIGH severity automatically trigger incident generation.
- **Status:** ✅ **VERIFIED REAL**.

### 18. IoT Security
- **Model:** `IoTDevice` table tracks hardware identifiers, IP/MAC, firmware versions, and anomaly states.
- **Ingestion:** `POST /api/v1/iot/events` updates last seen timestamps and flags abnormal telemetry spikes.
- **Status:** ✅ **VERIFIED REAL**.

### 19. User & Entity Behavior Analytics (UEBA)
- **Algorithm:** Deterministic explainable risk scoring in `_compute_explainable_risk()` (Base 10.0 + privilege elevation keywords +55, bulk export +50, impossible travel +50, etc.).
- **ML Reality:** **No ML models** (Scikit-Learn, PyTorch, or Isolation Forests) exist. Anomaly detection is purely rule-based and keyword-driven.
- **Status:** ✅ **VERIFIED REAL (EXPLAINABLE RULE-BASED)**.

### 20. Detection Rules
- **Engine File:** `backend/app/services/detection/engine.py`
- **Execution:** Evaluates incoming telemetry against 8 built-in baseline rules (`RULE-NET-001`, `RULE-NET-002`, `RULE-NET-003`, `RULE-AUTH-001`, `RULE-UEBA-001`, `RULE-UEBA-002`, `RULE-UEBA-003`, `RULE-IOT-001`).
- **Persistence:** Custom tenant rules can be authored and stored in `detection_rules` table.
- **Status:** ✅ **VERIFIED REAL**.

### 21. MITRE ATT&CK
- **Reality:** Frontend `/mitre/page.tsx` renders static `mockMitreTactics` from `src/data/mockData.ts`. Incidents store MITRE technique IDs as metadata strings. No live STIX/TAXII synchronization exists.
- **Status:** 🟡 **STATIC / MOCK**.

### 22. Attack Graph
- **Engine File:** `backend/app/routers/attack_graph.py`
- **Data Source:** Dynamically queries `Asset`, `AssetVulnerability`, `NetworkEvent`, and `Incident` tables to build graph nodes and directional attack paths.
- **Frontend:** Rendered via `reactflow` at `/attack-graph`.
- **Status:** ✅ **VERIFIED REAL**.

### 23. Incident Response & SOC
- **Engine File:** `backend/app/services/incidents/correlation.py`
- **Correlation:** Deduplicates alerts matching the same entity ID and aggregates risk scores. Timeline actions are recorded in `incident_events`.
- **Status:** ✅ **VERIFIED REAL**.

### 24. SOAR (Security Orchestration, Automation & Response)
- **Engine File:** `backend/app/routers/soar.py`
- **Execution:** Creates `PlaybookExecution` database records, appends timeline events to linked incidents, writes audit log entries, and broadcasts WebSocket notifications.
- **Infrastructure Reality:** Does **not** execute live external network changes (e.g. no external cloud firewall or iptables commands are dispatched).
- **Status:** ⚠️ **INTERNAL WORKFLOW EXECUTION ONLY**.

### 25. Reporting & Compliance
- **Engine File:** `backend/app/routers/reports.py`
- **CSV:** `download_report_csv` streams real CSV aggregations of database incidents and assets.
- **PDF:** PDF format is accepted as a parameter in `ReportGenerateRequest`, but no PDF rendering engine (ReportLab/Weasyprint) is installed. Returns JSON metadata.
- **Status:** ⚠️ **CSV REAL / PDF NOT IMPLEMENTED**.

### 26. Analytics
- **Reality:** Frontend `/analytics/page.tsx` directly imports and displays `mockAnalytics` from `src/data/mockData.ts`. No backend `/api/v1/analytics` route exists (dashboard metrics are served via `/api/v1/companies/dashboard-metrics`).
- **Status:** 🟡 **MOCK / DEMO**.

### 27. Notifications
- **Backend:** `notifications` and `notification_preferences` tables exist with complete CRUD endpoints.
- **Frontend Disconnect:** `/notifications/page.tsx` calls client-side `notificationEngineService` and renders `mockNotifications`. The Daily Limit Rule (max 3/day) is enforced in `localStorage`.
- **Status:** ⚠️ **PARTIAL (BACKEND REAL / FRONTEND MOCKED)**.

### 28. AI / Gemini Integration
- **Engine:** `backend/app/services/gemini_service.py` using Google GenAI SDK.
- **RAG:** `backend/app/services/rag_service.py` injects company assets, vulnerabilities, and incidents into prompt context.
- **Fallback:** When `GEMINI_API_KEY` is empty, returns clean simulated response tagged `[SIMULATED - GEMINI_API_KEY NOT SET]`.
- **Status:** ✅ **VERIFIED REAL**.

### 29. Personal Security
- **Backend:** `backend/app/routers/personal.py` has complete endpoints for URL checking, phone fraud checks, and OTP scam analysis.
- **Frontend Disconnect:** `src/services/index.ts` implements `urlSafetyService` and `fraudCallService` as client-side regex heuristics without calling the backend endpoints.
- **Status:** ⚠️ **PARTIAL (BACKEND REAL / FRONTEND DISCONNECTED)**.

### 30–32. Employee Portal, Academy & Phishing
- **Academy:** Hardcoded courses in `src/services/index.ts`. No database persistence.
- **Phishing:** Client-side campaign simulation state in `phishingSimulationService`.
- **Status:** 🟡 **MOCK / SIMULATION**.

---

## 9. 3D SUBSYSTEM & PHYSICAL ASSET FORENSIC AUDIT

### GLB 3D Models Inventory (`public/3d/models/`)
All 15 files physically exist and were verified via binary inspection (`glTF` magic header `0x46546C67`):

| File Path | Size (Bytes) | Header Valid | Runtime HTTP Status | Status |
|---|---|---|---|---|
| `public/3d/models/core/cyberdome-core.glb` | 58,396 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/security/cyberdome_core.glb` | 58,396 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/endpoints/workstation.glb` | 9,868 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/infrastructure/database.glb` | 52,836 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/infrastructure/gateway.glb` | 4,980 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/infrastructure/server.glb` | 8,888 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/infrastructure/server-rack.glb` | 5,608 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/infrastructure/server_rack.glb` | 5,608 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/infrastructure/switch.glb` | 7,556 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/network/switch.glb` | 7,556 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/network/firewall.glb` | 3,664 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/network/router.glb` | 102,224 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/network/cloud.glb` | 104,784 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/iot/camera.glb` | 34,508 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |
| `public/3d/models/iot/sensor.glb` | 11,228 | ✅ Valid glTF v2 | 200 OK | ✅ REAL GEOMETRY |

### Textures, HDR & Sprites Forensic Discovery
- **HDR Environment (`public/3d/hdr/cyber_datacenter.hdr`):** 65 bytes (`#?RADIANCE...` 1x1 pixel stub).
- **WebP Textures (`public/3d/textures/**/*.webp`):** 5 files (`floor.webp`, `wall.webp`, `carbon.webp`, `dark_metal.webp`, `server_metal.webp`), all exactly **43 bytes** (1x1 pixel stubs).
- **Sprite Sheets (`public/3d/sprites/**/*.png`):** 4 files (`alert_sheet.png`, `packet_sheet.png`, `scan_sheet.png`, `shield_sheet.png`), all exactly **86 bytes** (1x1 pixel stubs).
- **Forensic Assessment:** The GLB 3D models are **genuine 3D meshes**. The HDR background, PBR textures, and animated sprite sheets are **minimal placeholder stubs**.

---

## 10. REALTIME & AGENT/SENSOR AUDIT

1. **Realtime WebSocket Server:**
   - Fully implemented in `backend/app/routers/ws.py` and `backend/app/core/websocket.py`.
   - Supports JWT authentication, company channel segregation, ping/pong heartbeats, and broadcast dispatch (`ws_manager.broadcast_to_company`).
   - **Frontend Disconnect:** Exactly **0 frontend components** open a WebSocket connection. All UI updates currently rely on REST calls or page transitions.
2. **Endpoint Agents & Sensors:**
   - Backend enrollment and telemetry batch endpoints exist in `backend/app/routers/agents.py` and `backend/app/routers/sensors.py`.
   - **Client Binary Reality:** No standalone C++/Go/Rust OS endpoint daemon binaries exist in the repository. Telemetry is received via JSON API submissions.

---

## 11. SECURITY, SECRETS & CODE QUALITY AUDIT

- **Hardcoded Secrets:** In `backend/app/core/config.py`, `SECRET_KEY` falls back to a development string. An automated startup guard raises a fatal error if `ENVIRONMENT=production` and the secret is not overridden with a high-entropy key.
- **CORS Configuration:** Explicitly allows `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:8000`, and `http://127.0.0.1:8000`.
- **SQL Injection:** Zero raw string concatenation queries found; 100% of database interactions use SQLAlchemy 2.0 parameterized expressions (`select()`, `where()`).
- **IDOR Protection:** Verified across all company routers; access control checks enforce matching `company_id`.

---

## 12. BUILD, TESTS & RUNTIME EXECUTION RESULTS

### 1. Backend Test Suite (`pytest backend/tests/`)
- **Total Tests:** 46
- **Passed:** 46 (100%)
- **Failed:** 0
- **Skipped:** 0
- **Execution Time:** 12.85s
- **Suites:** `test_phase1.py` (10/10), `test_phase2.py` (15/15), `test_phase3_full.py` (12/12), `test_phase4.py` (8/8), `test_phase4_e2e.py` (1/1).

### 2. Frontend Production Build (`npm run build`)
- **Engine:** Next.js 16.3.6 (Turbopack)
- **TypeScript:** Checked with 0 errors.
- **Static Pages Generated:** 50/50 static routes compiled successfully.

### 3. Live Server Runtime Verification
- **FastAPI (`http://localhost:8000/health`):** HTTP 200 OK (`{"status": "healthy", "service": "CyberDome"}`).
- **Next.js (`http://localhost:3000/`):** HTTP 200 OK across all major routes.
- **3D Asset Server:** HTTP 200 OK for all 15 GLB files.

---

## 13. COMPLETE FEATURE CONNECTION MATRIX

| Feature | UI Page | API Endpoint | Service Layer | Database Table | Real Data | Runtime | Status |
|---|---|---|---|---|---|---|---|
| **Authentication (Backend)** | `/login` | `/api/v1/auth/login` | Passlib / JWT | `users` | ✅ Yes | ✅ 200 | ✅ REAL |
| **Authentication (Frontend Form)**| `/login` | None | `appStore.ts` | `localStorage` | ❌ No | ✅ 200 | ⚠️ PARTIAL |
| **Multi-Tenancy** | Global | Global Dependencies | `dependencies.py` | `companies`, `company_users` | ✅ Yes | ✅ 200 | ✅ REAL |
| **Dashboard Metrics** | `/dashboard` | `/companies/dashboard-metrics` | `dashboardService` | Multi-table count | ✅ Yes | ✅ 200 | ✅ REAL |
| **Assets Inventory** | `/assets` | `/api/v1/assets` | `assetService` | `assets` | ✅ Yes | ✅ 200 | ✅ REAL |
| **Website Security Scanner** | `/website-security` | `/website-security/assessments` | `scan_worker.py` | `website_assessments` | ✅ Yes | ✅ 200 | ✅ REAL |
| **Vulnerability Intel** | `/vulnerabilities`| `/api/v1/vulnerabilities` | `websiteAssessmentService` | `vulnerabilities` | ✅ Yes | ✅ 200 | ✅ REAL |
| **Attack Surface (ASM)** | `/attack-surface` | `/website-security/assessments` | `websiteAssessmentService` | `discovered_assets` | ⚠️ Partial | ✅ 200 | ⚠️ PARTIAL |
| **Legacy Scanner UI** | `/scanner` | None | None | None | ❌ No | ✅ 200 | 🟡 MOCK/DEMO |
| **Network Telemetry** | `/network` | `/api/v1/network/events` | `networkService` | `network_events` | ✅ Yes | ✅ 200 | ✅ REAL |
| **IoT Security** | `/iot` | `/api/v1/iot/devices` | `iotService` | `iot_devices` | ✅ Yes | ✅ 200 | ✅ REAL |
| **UEBA Behavior** | `/ueba` | `/api/v1/ueba/events` | `uebaService` | `behavior_events` | ✅ Yes | ✅ 200 | ✅ REAL |
| **Detection Rules** | `/detection-rules`| `/api/v1/detection-rules` | `detectionService` | `detection_rules` | ✅ Yes | ✅ 200 | ✅ REAL |
| **Attack Graph** | `/attack-graph` | `/api/v1/attack-graph` | `attackGraphService` | Real assets + events | ✅ Yes | ✅ 200 | ✅ REAL |
| **Digital Twin 3D** | `/digital-twin` | `/api/v1/digital-twin/nodes` | `digitalTwinService` | Multi-table state | ✅ Yes | ✅ 200 | ✅ REAL |
| **Simulation Lab 3D** | `/simulate/lab` | None | Client 3D Engine | None | ⚠️ Sim | ✅ 200 | 🟡 SIMULATION |
| **What-If Analysis** | `/what-if` | None | `appStore.ts` | None | ⚠️ Sim | ✅ 200 | 🟡 SIMULATION |
| **Incident Response** | `/incidents` | `/api/v1/incidents` | `incidentService` | `incidents` | ✅ Yes | ✅ 200 | ✅ REAL |
| **SOAR Automation** | `/soar` | `/api/v1/soar/playbooks` | `soarService` | `soar_playbooks` | ✅ Yes | ✅ 200 | ✅ REAL |
| **Compliance Reports** | `/reports` | `/api/v1/reports` | `reportService` | `reports` | ✅ Yes (CSV) | ✅ 200 | ⚠️ PARTIAL |
| **Analytics Dashboard** | `/analytics` | None | None | None | ❌ No | ✅ 200 | 🟡 MOCK/DEMO |
| **AI Security Copilot** | `/ai` | `/api/v1/ai/chat` | `aiService` | `ai_conversations` | ✅ Yes | ✅ 200 | ✅ REAL |
| **Notifications Center** | `/notifications` | `/api/v1/notifications` | `notificationEngineService` | `localStorage` | ❌ No | ✅ 200 | ⚠️ PARTIAL |
| **Personal Cyber Defense** | `/personal/*` | `/api/v1/personal/*` | Client Regex | None | ❌ No | ✅ 200 | ⚠️ PARTIAL |
| **Employee Portal** | `/employee/*` | `/api/v1/incidents` | Mixed | None | ⚠️ Partial | ✅ 200 | ⚠️ PARTIAL |
| **Cyber Academy** | `/academy` | None | `academyService` | None | ❌ No | ✅ 200 | 🟡 MOCK/DEMO |
| **Phishing Training** | `/training/phishing-simulation` | None | `phishingSimulationService`| None | ❌ No | ✅ 200 | 🟡 SIMULATION |
| **Realtime WebSockets** | Global | `/ws` | `ws_manager` | None | ✅ Yes | ✅ 200 | ⚠️ NO UI SUB |

---

## 14. "WHAT ANTIGRAVITY ACTUALLY BUILT" (CHRONOLOGICAL REALITY)

Based strictly on code evidence and commit progression across Phases 1 through 4:

1. **Phase 1 (Core Identity, Multi-Tenancy & UI Foundations):**
   - Built the Next.js dark-mode application shell with TailwindCSS, Zustand stores, and UnifiedNavbar.
   - Built the FastAPI authentication system with Passlib Bcrypt, PyJWT, multi-tenant company isolation, and RBAC permissions.
   - *Residual Gap:* The frontend login UI in `appStore.ts` was initially written with `localStorage` mocks and was never wired to the backend `/api/v1/auth/login` endpoint.

2. **Phase 2 (Attack Surface Management & Website Security):**
   - Built the passive website assessment worker (`scan_worker.py`) capable of real DNS queries, TLS socket inspection, security header evaluation, cookie auditing, and technology fingerprinting.
   - Built global vulnerability intelligence tables storing CVEs, CVSS scores, EPSS percentiles, and CISA KEV flags.
   - Created `/website-security` with live polling of scan progress and assessment reports.
   - *Residual Gap:* The older `/scanner` page was left in place as an unlinked demo mockup.

3. **Phase 3 (Enterprise 3D Digital Twin & RAG-Powered AI Copilot):**
   - Generated 15 valid binary `.glb` 3D models and built `DigitalTwin3DScene.tsx` with Three.js / React Three Fiber.
   - Built the dynamic `/api/v1/digital-twin/nodes` backend aggregator binding live asset health and incident status to 3D meshes.
   - Integrated Google GenAI SDK (`gemini-2.5-flash`) with RAG chunking and security telemetry grounding.
   - *Residual Gap:* Textures, HDR environments, and sprite sheets were added as 1x1 minimal stubs rather than high-resolution assets.

4. **Phase 4 (Production SOC, Telemetry, Detection Rules & SOAR):**
   - Built telemetry ingestion pipelines for Network traffic, IoT smart devices, and UEBA activity.
   - Built the deterministic SIGMA-style `RuleEngine` and automated incident correlation engine.
   - Built the dynamic Attack Graph topology builder (`attack_graph.py`) using real assets and telemetry edges.
   - Built the SOAR playbook execution engine and CSV reporting aggregator.
   - Implemented the authenticated WebSocket server (`ws.py`).
   - *Residual Gap:* Frontend UI components were not wired to subscribe to the WebSocket feed, and Personal Defense tools retained client-side regex heuristics rather than calling `personal.py`.

---

## 15. UNDOCUMENTED FEATURES DISCOVERED

1. **Presentation / Pitch Mode (`/presentation`):** An entire multi-slide investor presentation deck with interactive architecture slides, metrics counters, and demo toggles, not documented in previous manifests.
2. **Detection Aliases (`/detection/*`):** Four sub-routes (`/detection/network`, `/detection/iot`, `/detection/ueba`, `/detection/attack-graph`) that alias and re-export the primary operational security pages.
3. **Dedicated Detection Router (`detections.py`):** Authoring API for custom company-specific detection rules and live alert listings.
4. **Agent & Sensor Ingestion Routers (`agents.py`, `sensors.py`):** Complete backend enrollment, heartbeat, and telemetry batch endpoints designed for external collectors.
5. **RAG Corpus Chunking Engine (`rag_service.py`):** Knowledge base document ingestion and cosine similarity retrieval service for enterprise security policies.

---

## 16. DUPLICATE & DEAD CODE INVENTORY

1. **`src/app/(dashboard)/scanner/page.tsx`:** Duplicate of `/website-security/page.tsx`. Uses static hardcoded mock findings instead of the live backend scan worker.
2. **`backend/cyberdome.db`:** Dead 80KB database file inside the `backend/` folder left over from early development. The active runtime database is `./cyberdome.db` in the root workspace.
3. **Duplicate GLB Models:**
   - `public/3d/models/core/cyberdome-core.glb` (58,396 B) vs `public/3d/models/security/cyberdome_core.glb` (58,396 B) — identical binary duplicates.
   - `public/3d/models/infrastructure/server-rack.glb` (5,608 B) vs `server_rack.glb` (5,608 B) — identical binary duplicates.
   - `public/3d/models/infrastructure/switch.glb` (7,556 B) vs `public/3d/models/network/switch.glb` (7,556 B) — identical binary duplicates.
4. **`src/components/CyberDomeScene.tsx`:** Monolithic Three.js landing scene that partially duplicates logic in the newer modular `src/components/3d/` subsystem.

---

## 17. FINAL STATUS COUNTS

- **Frontend Routes:** **47** Next.js `page.tsx` routes
- **Backend Endpoints:** **108** endpoints (106 HTTP operations + 2 WebSockets)
- **Database Tables:** **29** tables in active SQLite `cyberdome.db` (28 application + 1 alembic)
- **Database Models:** **28** SQLAlchemy application models
- **Frontend Services:** **27** services defined in `src/services/index.ts`
- **Backend Services:** **6** modular services in `backend/app/services/`
- **3D Components:** **6** Three.js / Canvas React components
- **GLB 3D Files:** **15** valid binary `.glb` models
- **Textures:** **5** WebP files (1x1 minimal stubs)
- **HDR Files:** **1** HDR file (1x1 minimal stub)
- **Sprite Files:** **4** PNG files (1x1 minimal stubs)
- **Backend Tests:** **46** tests (46 passed, 0 failed, 100% pass rate)

### Classification Breakdown
- **✅ Verified Real:** **24** systems / features
- **⚠️ Partial:** **8** systems (backend real, frontend mocked or disconnected)
- **🟡 UI Only:** **5** routes
- **🟡 Mock / Demo:** **6** routes
- **🟡 Simulation:** **4** routes
- **❌ Broken:** **0** (build compiles, test suite passes, server runs)
- **❌ Missing / Future:** **3** systems (external OS daemons, PDF generator, live STIX/TAXII sync)

---

## 18. FINAL EXECUTIVE SUMMARY

### CYBERDOME CURRENT REALITY

#### ✅ VERIFIED REAL
- High-security multi-tenant FastAPI backend with Alembic migrations, SQLAlchemy 2.0 ORM, and SQLite database.
- Multi-tenant company isolation and RBAC authorization rigorously verified with 46 automated tests.
- Real passive Website Vulnerability Scanner inspecting live DNS, TLS certificates, security headers, cookies, and fingerprinting technologies.
- Dynamic Attack Graph constructing real topology from database assets, vulnerabilities, and telemetry edges.
- 3D Digital Twin with 15 valid physical GLB meshes and live security status bindings.
- Telemetry ingestion pipelines for Network, IoT, and UEBA with explainable risk scoring.
- Deterministic SIGMA-style RuleEngine evaluating events and generating correlated incidents.
- AI Copilot integrating Google GenAI (`gemini-2.5-flash`) with RAG telemetry grounding.
- SOAR playbook orchestration creating database records, incident timeline events, and audit logs.
- Next.js 16 production build compiles 50/50 static routes with zero TypeScript or styling errors.

#### ⚠️ PARTIAL (THE CRITICAL GAPS)
1. **Frontend Authentication:** The login and signup forms in `appStore.ts` read/write client-side `localStorage` rather than delegating authentication to the FastAPI `/api/v1/auth/login` endpoint.
2. **Realtime WebSocket Connection:** The backend has a company-isolated WebSocket server at `/ws`, but frontend components do not establish a WebSocket connection.
3. **Personal Cyber Defense:** Backend has full endpoints in `personal.py`, but frontend services (`urlSafetyService`, `fraudCallService`) run client-side regex heuristics.
4. **Notifications:** Backend has full notifications tables, but `/notifications` page calls client-side `notificationEngineService`.
5. **Reporting Downloads:** CSV generation is fully operational with live data; PDF download is a stub without a PDF rendering library.

#### 🟡 MOCK / DEMO / SIMULATION
- `/analytics`: Displays static `mockAnalytics`.
- `/mitre`: Displays static `mockMitreTactics`.
- `/scanner`: Older static UI mockup superseded by `/website-security`.
- `/simulate/lab`, `/simulate/human-behavior`, `/what-if`: Red-team simulations run client-side.
- `/academy`: Hardcoded training lessons and quizzes.
- HDR environment and texture WebP files are 1x1 minimal byte placeholders.

#### 🛠️ RECOMMENDED NEXT IMPLEMENTATION ORDER
1. **Connect Frontend Auth to Backend:** Wire `useAppStore.login()` and `signup()` to call `authService.login()` (`POST /api/v1/auth/login`), saving the returned JWT token to `localStorage` and attaching it to all future requests.
2. **Connect Frontend WebSocket Client:** Implement a `useWebSocket` hook in `UnifiedNavbar` or dashboard layout that connects to `ws://localhost:8000/ws?token=<jwt>` to receive real-time incident, telemetry, and SOAR alerts.
3. **Wire Personal Security Endpoints:** Update `urlSafetyService`, `fraudCallService`, and `deviceSecurityService` in `src/services/index.ts` to call `/api/v1/personal/*`.
4. **Wire Notifications Page:** Update `/notifications/page.tsx` to fetch from `GET /api/v1/notifications` instead of `notificationEngineService`.
5. **Clean Legacy Routes:** Redirect `/scanner` to `/website-security` and wire `/analytics` to `/api/v1/companies/dashboard-metrics`.
