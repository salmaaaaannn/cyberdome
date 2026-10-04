# CYBERDOME — MODULE 06 AI SECURITY COPILOT
## ARCHITECTURE AUDIT REPORT

**Audit Date:** 2026-10-03  
**Auditor:** Senior AI & Cybersecurity Platform Engineer  
**Component:** CYBERDOME AI Copilot & Generative Security Operations  
**Document ID:** `CYBERDOME-M06-AUDIT-001`  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

This architecture audit examines the existing artificial intelligence, machine learning, data storage, authentication, and orchestration infrastructure of the CYBERDOME platform prior to implementing Module 06 (AI Security Copilot).

The audit confirms:
1. **Existing AI Provider**: CYBERDOME utilizes the modern **Google GenAI SDK** (`google.genai`, v0.8.0+) with `settings.GEMINI_API_KEY` and `settings.GEMINI_MODEL` (`gemini-2.5-flash`), operating via asynchronous calls (`client.aio.models.generate_content`).
2. **Existing Service Architecture**:
   - `backend/app/services/gemini_service.py`: Contains `GeminiService` with basic system prompt formatting and content generation.
   - `backend/app/services/rag_service.py`: Contains vector/similarity search over `KnowledgeChunk` and `WebsiteFinding` models.
   - `backend/app/models/ai.py`: Declares SQLAlchemy models `AIConversation`, `AIMessage`, `KnowledgeDocument`, and `KnowledgeChunk`.
   - `backend/app/routers/ai.py`: Implements basic endpoints `/api/v1/ai/chat` and `/api/v1/ai/conversations`.
3. **Data Source of Truth**:
   - `security_events`: Multi-source detections (Network, IoT, UEBA, URL, Fusion, Rules).
   - `incidents` & `incident_events`: Correlated enterprise incidents and historical timeline actions.
   - `network_events`, `iot_devices`, `behavior_events`: Domain telemetry.
   - `soar_playbooks` & `playbook_executions`: Automated remediation actions.
   - `audit_logs`: Immutable security audit trail.
4. **Tenant Isolation & RBAC**:
   - Database tenancy is anchored on `company_id` linked via authenticated JWT tokens (`CompanyUser` membership).
   - Current RBAC distinguishes `ADMIN`, `EMPLOYEE`, and personal `USER`/`NORMAL` accounts.

---

## 2. Inventory of Audited Components

### 2.1 Backend AI Services & Routers
- **Gemini Service** (`backend/app/services/gemini_service.py`):
  - Model: `gemini-2.5-flash`
  - Integration: `from google import genai; from google.genai import types`
  - Client state: Instantiated conditionally when `settings.GEMINI_API_KEY` is present.
  - Secret safety: API key is read solely from environment variable `GEMINI_API_KEY`; never transmitted to frontend or client.
- **RAG Service** (`backend/app/services/rag_service.py`):
  - Embeddings: `text-embedding-004` (with fallback zero vector).
  - Scope: Company-isolated document chunks.
- **AI Router** (`backend/app/routers/ai.py`):
  - Current routes: `POST /ai/chat`, `GET /ai/conversations`, `GET /ai/conversations/{id}`.
  - Uses `get_current_user` and `get_current_company_membership`.

### 2.2 Security Detection & Data Pipeline (Modules 01–05)
- **Module 01 (Network ML)**: `MLNetworkService` in `backend/app/services/ml_network_service.py` (77 features).
- **Module 02 (IoT ML)**: `MLIoTService` in `backend/app/services/ml_iot_service.py` (46 features).
- **Module 03 (UEBA ML)**: `MLUEBAService` in `backend/app/services/ml_ueba_service.py` (30 features).
- **Module 04 (URL ML)**: `MLURLService` in `backend/app/services/ml_url_service.py` (20 features).
- **Module 05 (Fusion Engine)**: `MLFusionService` in `backend/app/services/ml_fusion_service.py` (Multi-source evidence synthesis, attack chain reconstruction, confidence accumulation, zero fake imputation).
- **Correlation Engine**: `IncidentCorrelationEngine` in `backend/app/services/incidents/correlation.py`.
- **SOAR Router**: `backend/app/routers/soar.py` managing `SOARPlaybook` and `PlaybookExecution`.
- **Attack Graph & Digital Twin**: `backend/app/routers/attack_graph.py` and `backend/app/routers/digital_twin.py`.
- **WebSocket Manager**: `backend/app/core/websocket.py` broadcasting isolated events to companies.

### 2.3 Frontend Integration
- **Route**: `src/app/(dashboard)/ai/page.tsx`
- **Service**: `aiService` in `src/services/index.ts` connecting to `/api/v1/ai/chat`.
- **Design Tokens**: Standard CYBERDOME dark aesthetic (`#050607`, `#0D1117`, `#11161D`, Cyber Red `#FF1744`, AI Purple `#A855F7`).

---

## 3. Gap Analysis for Module 06 Requirements

| Requirement | Current Status | Required Extension for Module 06 |
|:---|:---|:---|
| **Intent Detection** | None (unclassified queries) | Controlled classifier for 18 intent categories |
| **Context Resolver** | Basic RAG over text chunks | Deep resolver across `incidents`, `security_events`, ML services, attack graph, SOAR |
| **Grounded Answering** | Freeform prompt | RAG prompt with explicit `DATA UNAVAILABLE` and zero-hallucination guardrails |
| **Evidence Citations** | Missing structured citations | Formal syntax `[Incident: ...]`, `[SecurityEvent: ...]`, `[Fusion: ...]` |
| **SOAR Safety** | Direct execution in SOAR router | Two-step protocol: AI proposes $\to$ Human reviews $\to$ Authorized execution |
| **Prompt Injection Defense** | Standard prompt concatenation | Strict XML delimiter tags separating system, context, untrusted telemetry, and user input |
| **Role-Based Scoping** | Basic user check | Explicit RBAC: Employee queries restricted to personal scope; Admins to company scope |
| **Executive Synthesis** | None | Dedicated executive summary & incident report generators |
| **Failure Handling** | Basic try/catch | Graceful fallback when Gemini is offline or unconfigured (`AI_SERVICE_UNAVAILABLE`) |

---

## 4. Architectural Decisions for Implementation

1. **Reuse Existing Gemini Service**: Do NOT install another LLM provider or replace `GeminiService`. Extend `GeminiService` with robust fallback mock/offline reasoning when `GEMINI_API_KEY` is unset or times out, ensuring deterministic local testing and zero downtime in sandboxed environments.
2. **Build `AICopilotService` as the Central Orchestrator**:
   Create `backend/app/services/ai_copilot_service.py` to coordinate:
   - Request authentication and tenant resolution.
   - Intent classification (`_classify_intent`).
   - Security data retrieval via `SecurityContextResolver` (bounded queries across live DB).
   - Sanitization and untrusted data wrapping (prompt injection mitigation).
   - Grounded prompt formulation and Gemini communication.
   - Post-generation citation extraction, action proposal detection, and audit logging.
3. **SOAR Safety & Human Approval Gate**:
   - Proposed playbooks are drafted as structured action plans (`DRAFT_PLAYBOOK`).
   - Destructive actions require explicit verification via `POST /api/v1/ai/actions/approve`.
   - The AI never directly calls `db.commit()` on executable playbooks without approval.
4. **Full Endpoint Suite in `backend/app/routers/ai.py`**:
   - Maintain backward compatibility with `/api/v1/ai/chat`.
   - Add `/api/v1/ai/copilot/chat` for extended structured responses.
   - Add `/api/v1/ai/incidents/{incident_id}/explain`.
   - Add `/api/v1/ai/investigate`.
   - Add `/api/v1/ai/posture`.
   - Add `/api/v1/ai/executive-summary`.
   - Add `/api/v1/ai/playbooks/draft`.
   - Add `/api/v1/ai/actions/approve`.
   - Add `/api/v1/ai/health`.

**Audit Conclusion:** The CYBERDOME architecture is well-positioned for Module 06 integration. Proceed to implementation.
