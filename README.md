# 🛡️ CYBERDOME — Autonomous Cybersecurity & Threat Intelligence Platform

> **"Quiet Security" — Autonomous, Evidence-Grounded Cyber Defense for Modern Enterprises & Everyday Citizens.**

[![Python Version](https://img.shields.io/badge/Python-3.14%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15%20App%20Router-black.svg)](https://nextjs.org)
[![Three.js](https://img.shields.io/badge/Three.js-0.170-orange.svg)](https://threejs.org)
[![ML Frameworks](https://img.shields.io/badge/ML-XGBoost%20%7C%20Scikit--Learn-green.svg)](https://scikit-learn.org)
[![Test Suite](https://img.shields.io/badge/Tests-300%2B%20Passed-brightgreen.svg)](./backend/tests)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

---

## 📑 Table of Contents
1. [Platform Overview & Philosophy](#-platform-overview--philosophy)
2. [High-Level Architecture](#-high-level-architecture)
3. [Implemented & Verified Core Modules (M01 – M07)](#-implemented--verified-core-modules-m01--m07)
   - [M01: Network Traffic & Intrusion Detection (NIDS)](#m01-network-traffic--intrusion-detection-nids)
   - [M02: IoT & Smart Device Fleet Defense](#m02-iot--smart-device-fleet-defense)
   - [M03: User & Entity Behavior Analytics (UEBA)](#m03-user--entity-behavior-analytics-ueba)
   - [M04: Phishing & Malicious URL Engine](#m04-phishing--malicious-url-engine)
   - [M05: Multi-Source Detection Fusion & Incident Correlation](#m05-multi-source-detection-fusion--incident-correlation)
   - [M06: AI Security Copilot (GenAI & RAG)](#m06-ai-security-copilot-genai--rag)
   - [M07: Autonomous SOAR Response Engine](#m07-autonomous-soar-response-engine)
4. [Role-Based Portals & User Experience](#-role-based-portals--user-experience)
5. [Interactive 3D Visualizations & Digital Twin](#-interactive-3d-visualizations--digital-twin)
6. [Passive Threat Scanner & Chrome Extension](#-passive-threat-scanner--chrome-extension)
7. [Consolidated Roadmap: Next Features (M08 & M09)](#-consolidated-roadmap-next-features-m08--m09)
   - [M08: Personal Threat Guardian / AI Call Guardian](#m08-personal-threat-guardian--ai-call-guardian)
   - [M09: CodeShield AI — Git Repository Security Scanner](#m09-codeshield-ai--git-repository-security-scanner)
   - [Unified Device Integration Layer](#unified-device-integration-layer)
8. [Comprehensive Feature Inventory & Status Matrix](#-comprehensive-feature-inventory--status-matrix)
9. [Zero-Trust Multi-Tenancy & Security Invariants](#-zero-trust-multi-tenancy--security-invariants)
10. [Getting Started & Installation](#-getting-started--installation)
11. [Running Empirical Tests](#-running-empirical-tests)

---

## 🏛️ Platform Overview & Philosophy

**CYBERDOME** is a next-generation, autonomous security operations and personal protection platform built to bridge the gap between complex enterprise SOC workflows and personal citizen cybersecurity.

### Core Design Principles
* **Quiet Security Aesthetic:** High-contrast, cinematic dark palette (Deep Ink `#0C1118`, Soft Periwinkle `#8AA6D6`, Metallic White `#EAEEF5`, Warm Sand `#E4B894`, Sage Green `#A8D5BA`) paired with low-fatigue typography and glassmorphic surfaces.
* **Zero Fake Imputation:** Models run in strict inference mode. Missing or corrupted evidence yields an explicit `UNKNOWN / INSUFFICIENT_DATA` state—never a false `SAFE` verdict merely because evidence is absent.
* **Deterministic + ML Fusion:** Statistical machine learning is combined with authoritative threat intelligence feeds, passive heuristics, and rule engines to ensure calibrated, explainable detections.
* **Strict Real vs. Simulation Segregation:** Penetration simulations and controlled security awareness tests are cryptographically tagged and strictly isolated so they never pollute production SOC metrics or incident baselines.
* **Dual-Tier Protection:** A single unified backend serves both enterprise multi-tenant organizations (with strict RBAC and company-isolated data boundaries) and standalone personal users.

---

## 🏗️ High-Level Architecture

```mermaid
flowchart TD
    subgraph INGESTION["1. Telemetry Ingestion Layer"]
        NET[Network Flows]
        IOT[IoT / Smart Fleet]
        UEBA[User / Identity Activity]
        URL[Web / URL Traffic]
        EXT[Chrome Extension]
    end

    subgraph ML_ENGINES["2. Core ML Detection Engines (M01 - M04)"]
        M01["M01: NIDS (IsoForest + XGBoost)<br/>CIC-IDS2017 Benchmark"]
        M02["M02: IoT Fleet (46 Features)<br/>Aposemat IoT-23 Benchmark"]
        M03["M03: UEBA (30 Features)<br/>CERT Insider Threat Benchmark"]
        M04["M04: URL Phishing (27 Features)<br/>PhishTank / OpenPhish Benchmark"]
    end

    subgraph CORRELATION["3. Correlation & Intelligence Layer"]
        FUSION["M05: Multi-Source Decision Fusion<br/>Threat Intel + Rules + Scanner"]
        INCIDENT["Incident Correlation Engine<br/>DBSCAN / Graph Clustering & MITRE ATT&CK"]
    end

    subgraph ACTION["4. AI & Autonomous Action"]
        M06["M06: AI Security Copilot<br/>Google Gemini + Telemetry RAG"]
        M07["M07: Autonomous SOAR<br/>Playbook Execution & Guardrails"]
    end

    subgraph PRESENTATION["5. Presentation & User Experience"]
        ADMIN["Enterprise SecOps Admin Dashboard"]
        EMP["Employee Security & Awareness Portal"]
        PERS["Personal Cyber Protection Hub"]
        TWIN["3D Digital Twin & Attack Graph"]
    end

    NET --> M01
    IOT --> M02
    UEBA --> M03
    URL --> M04
    EXT --> M04

    M01 & M02 & M03 & M04 --> FUSION
    FUSION --> INCIDENT
    INCIDENT --> M06
    INCIDENT --> M07
    INCIDENT --> TWIN
    INCIDENT --> ADMIN
    INCIDENT --> EMP
    INCIDENT --> PERS
    M06 -.-> ADMIN
    M07 -.-> ADMIN
```

---

## ⚙️ Implemented & Verified Core Modules (M01 – M07)

### M01: Network Traffic & Intrusion Detection (NIDS)
* **Architecture:** Dual-model pipeline combining unsupervised **Isolation Forest** (flow anomaly detection) with a multi-class **XGBoost Classifier** (intrusion categorization).
* **Benchmark Provenance:** Trained on the **CIC-IDS2017 / NSL-KDD** distributions.
* **Flow Telemetry Processing:** Real-time ingestion of network flow statistics (packet rates, byte volume, TCP flags, flow duration, unusual port indicators).
* **Deterministic Heuristics:** Intercepts SYN floods, volumetric port sweeps, and brute-force patterns, fusing them into prioritized security findings.
* **Strict Completeness:** Enforces zero fake feature imputation; missing flow vectors trigger `INSUFFICIENT_DATA`.

### M02: IoT & Smart Device Fleet Defense
* **46-Feature IoT Telemetry Vector:** Ingests connection metrics, packet intervals, DNS requests, and protocol flags from connected enterprise smart devices.
* **Verified Production Artifacts (`backend/app/ml_artifacts/iot/`):**
  * `iot_isolation_forest.joblib`: 100 estimators, anomaly thresholding.
  * `iot_xgboost.joblib`: Supervised classifier detecting *Mirai, Gafgyt, PortScan, DDoS, C&C Beaconing, and File Downloads*.
  * `iot_scaler.joblib` & `iot_label_encoder.joblib`: Standardized feature preprocessors.
* **Digital Twin Synchronization:** Automatically maps IoT device health and risk scores directly to nodes in the 3D topology.
* **Environment Separation:** Strict database-level isolation between `REAL` hardware telemetry and `SIMULATION` test packets.

### M03: User & Entity Behavior Analytics (UEBA)
* **30-Feature Canonical Contract:** Ingests after-hours access timestamps, failed authentication spikes, sensitive file touches, mass USB mount events, and egress data volume.
* **CERT Insider Threat Benchmark:** Pre-trained Isolation Forest and XGBoost models categorize insider risks:
  * *After-Hours Data Exfiltration*
  * *Privilege Escalation & Unauthorized Root Access*
  * *Compromised Account / Impossible Travel Pattern*
* **Dynamic Baselining:** Compares individual worker telemetry against rolling organizational baselines to flag statistical deviations.
* **Strict Invariants:** Rejects NaN, Infinity, and non-numeric fields with immediate HTTP 422 validation errors.

### M04: Phishing & Malicious URL Engine
* **27 Canonical Lexical & Syntactic Features:** Shannon entropy (hostname, path, query), digit ratios, punycode flags, subdomain counts, suspicious TLD indicators, and URL shortener markers.
* **Verified Production Artifacts (`backend/app/ml_models/url/`):**
  * `url_isolation_forest.joblib`: Unsupervised lexical anomaly detector.
  * `url_xgboost.joblib`: Phishing classifier trained on **PhishTank & OpenPhish** benchmarks.
  * `scaler.joblib`: 27-feature StandardScaler.
* **Multi-Source Decision Fusion Layer:** Fuses ML predictions with authoritative local threat intelligence, passive scanner heuristic indicators, and deterministic security rules.
* **SSRF Defense:** Deep RFC 1918, link-local, loopback (`127.0.0.1`, `0.0.0.0`, `::1`), and cloud metadata (`169.254.169.254`, `metadata.google.internal`) blocking with HTTP redirect validation.

### M05: Multi-Source Detection Fusion & Incident Correlation
* **Cross-Module Evidence Normalization:** Converts findings from Network, IoT, UEBA, and URL detection into standardized `DetectionEvidence` models.
* **Incident Correlation Engine:** Graph and temporal clustering correlate disparate events sharing entities, timestamps, or IP addresses into unified, actionable **Incidents**.
* **MITRE ATT&CK Mapping:** Links events to standard MITRE tactics (*Initial Access, Execution, Persistence, Lateral Movement, Exfiltration*).
* **Kill-Chain Progression:** Tracks live attacker staging and dynamically calculates organizational blast radius.

### M06: AI Security Copilot (GenAI & RAG)
* **Google Gemini Integration:** Connects large language model reasoning to live incident telemetry.
* **Telemetry RAG (Retrieval-Augmented Generation):** Copilot responses are strictly grounded in verified incident evidence, host attributes, and organizational policies.
* **Interactive SOC Assistant:** Natural-language incident investigation, root-cause analysis, and threat hunting queries.
* **Automated Briefings:** One-click generation of executive breach summaries and actionable SOC containment checklists.

### M07: Autonomous SOAR Response Engine
* **Pre-Configured Playbooks:**
  * *Isolate Infected Host / IoT Device*
  * *Block Malicious IP / Domain on Gateway Firewall*
  * *Revoke Compromised User Session / Force Credential Reset*
  * *Quarantine Malicious URL / Email Delivery*
* **Response Policy Guardrails:** Autonomous policy engine requires explicit human-in-the-loop analyst approvals for high-impact or destructive actions.
* **Tamper-Evident Audit Trails:** Every automated execution records timestamped parameters, actor IDs, affected resources, and rollback receipts.

---

## 👥 Role-Based Portals & User Experience

| Portal | Route | Primary Audience | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **SecOps Admin Operations Center** | `/admin` | CISOs, SOC Analysts, System Admins | Executive KPI cards, real-time incident queue, employee directory & risk tracking, role assignments, audit logs, simulation builder. |
| **Employee Security Portal** | `/employee` | Corporate Staff | Personal security posture rating, assigned security simulations, monitored device status, awareness courses, zero invasive tracking. |
| **Personal Cyber Protection Hub** | `/personal` | Individual Users & Citizens | Real-time URL safety checker, fraud call & SMS scam analyzer, OTP scam defense scenarios, personal device security review. |
| **Security Simulations Lab** | `/admin/security-simulations` | SecOps & HR Trainers | Controlled internal phishing exercises (*Credential Safety, Urgent Wire Request, Suspicious Attachment*), tracking delivery, open, click, and report rates. Zero password collection. |

---

## 🌐 Interactive 3D Visualizations & Digital Twin

* **CYBERDOME 3D Monitor (`Cyberdome3DMonitor`):** A custom Three.js mechanical 3D console featuring dynamic orbital cameras, floating telemetry HUDs, live diagnostic readouts, and soundless particle flows matching the *"Quiet Security"* theme.
* **3D Digital Twin (`DigitalTwin3DScene`):** Interactive spatial representation of physical servers, switches, IoT clusters, and employee workstations. Compromised nodes pulse with real-time severity glows.
* **Global CyberGlobe (`CyberGlobe`):** Interactive 3D WebGL Earth globe visualizing active geo-distributed threats, external attack vectors, and C2 communication links.
* **Interactive Attack Graph:** Node-link directional graph illustrating attacker lateral movement paths from perimeter exposure to critical internal databases.
* **Cinematic CyberdomeLoader:** Bespoke wireframe scanner animation providing seamless visual continuity during page transitions.

---

## 🔍 Passive Threat Scanner & Chrome Extension

### Passive Website Security Scanner (`/scanner`)
* **Real DNS Analysis:** Resolves A, AAAA, MX, NS, TXT, and CNAME records.
* **TLS Certificate Inspector:** Analyzes certificate validity, issuing authority, cipher suites, expiration deadlines, and protocol versions (TLS 1.2/1.3).
* **HTTP Security Headers:** Audits `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and cookie security flags.
* **Technology & Vulnerability Discovery:** Detects CMS software, web servers, and third-party libraries passively without generating intrusive traffic.

### Chrome Browser Extension (`chrome-extension/`)
* **Manifest V3 Compliant:** Lightweight, zero-lag background service worker.
* **Active Tab Protection:** Automatically queries backend `/api/v1/browser/check-url` on navigation.
* **Interactive Popup HUD:** Shows live website trust score, detected phishing indicators, and safety certifications directly in Google Chrome.

---

## 🚀 Consolidated Roadmap: Next Features (M08 & M09)

The following upcoming modules expand CYBERDOME's defensive capabilities into personal communication protection and source code security:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     CONSOLIDATED ROADMAP ADDITIONS                     │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │   M08: Personal Threat Guardian / AI Call Guardian             │   │
│   │   • Scam Call & SMS Smishing Detection                         │   │
│   │   • Multilingual (English, Bengali, Banglish)                  │   │
│   │   • Transcript-Based Speech-to-Text Analysis                   │   │
│   │   • OTP Fraud & Impersonation Safety Guidance                  │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │   M09: CodeShield AI — Git Repository Security Scanner         │   │
│   │   • Zero-Auth Public Git URL Scanning (GitHub/GitLab/Bitbucket)│   │
│   │   • SAST AST Analysis + Exposed Secrets & API Keys             │   │
│   │   • OWASP Top 10 (SQLi, XSS, SSRF, IDOR/BOLA, JWT Audit)       │   │
│   │   • Gemini-Powered Cross-File Reasoning & Fix Generation       │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │   Unified Device Integration Layer                             │   │
│   │   • Endpoint Guardian (Laptop Agent)                           │   │
│   │   • IoT Collector (MQTT / Device Identity)                     │   │
│   │   • Network Sensor (Flow Metadata, DNS, Firewall)              │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### M08: Personal Threat Guardian / AI Call Guardian
* **Goal:** Protect individual citizens and enterprise employees from phone fraud, social engineering, OTP theft, and smishing.
* **Capabilities:**
  * Phone number reputation & fraud intelligence lookup.
  * Transcript-based conversation analysis via speech-to-text (starting with transcripts before cellular audio capture).
  * Multilingual message analysis covering English, Bengali, and Banglish idioms.
  * Real-time urgency, payment-pressure, and fake-support detection.
  * Correlation of phone numbers, SMS, and OTP-theft indicators into personal threat alerts.
* **Candidate Datasets for Training & Evaluation Pipeline:**
  * *Scam Dialogue Dataset (Hugging Face)* — Primary scam vs. legitimate dialogue classification.
  * *Multi-Agent Scam Conversation* — Multi-turn dialogue with receiver personality variations.
  * *UCI SMS Spam Collection* — Baseline spam vs. legitimate message classification.
  * *Bengali SMS Smishing Dataset* — Regional and transliterated (Banglish) fraud patterns.
  * *DailyDialog* — Normal conversation benchmarks to suppress false positives (under commercial license review).
  * *FTC Consumer Sentinel* — Reported fraud pattern reference data.
  * *ASVspoof* — Candidate for future synthetic voice and deepfake audio detection.

### M09: CodeShield AI — Git Repository Security Scanner
* **Goal:** Allow developers and security teams to paste a public Git repository URL and receive an instant, comprehensive security audit without connecting OAuth permissions.
* **Capabilities:**
  * Public GitHub, GitLab, and Bitbucket repository cloning and indexation.
  * Language, framework, and dependency version discovery.
  * Static Application Security Testing (SAST) for OWASP Top 10 vulnerabilities (SQLi, NoSQLi, XSS, SSRF, CSRF, Path Traversal, Command Injection).
  * Identity & access audits (JWT handling, session timeouts, missing RBAC/BOLA, tenant boundary violations).
  * Exposed API keys, private keys, database credentials, and secret token scanning.
  * AI-assisted cross-file contextual reasoning (using Google Gemini) with proposed code patches.
  * Generates downloadable PDF/JSON compliance reports with exact file paths and line numbers.

### Unified Device Integration Layer
* **Endpoint Guardian:** Cross-platform lightweight laptop daemon collecting authorized telemetry (process trees, login timestamps, disk encryption state).
* **IoT Collector:** MQTT and CoAP broker ingesting hardware heartbeat, firmware version, and connection logs from enterprise smart devices.
* **Network Sensor:** Passive packet-capture metadata collector forwarding sanitized NetFlow/IPFIX records to M01.

---

## 📊 Comprehensive Feature Inventory & Status Matrix

| Module / Subsystem | Scope & Function | Current Status |
| :--- | :--- | :---: |
| **M01 Network IDS** | Isolation Forest + XGBoost on CIC-IDS2017 flow data | ✅ **Verified in Workspace** |
| **M02 IoT Fleet Defense** | 46-Feature ML detection on Aposemat IoT-23 data | ✅ **Verified & Integrated** |
| **M03 UEBA Analytics** | 30-Feature Insider Threat detection on CERT benchmark | ✅ **Verified with Fixes** |
| **M04 URL / Phishing** | 27-Feature ML models + 4-Way Decision Fusion + SSRF | ✅ **Verified (36/36 Tests Passed)** |
| **M05 Fusion & Incidents** | Multi-source evidence clustering + MITRE ATT&CK mapping | ✅ **Verified in Workspace** |
| **M06 AI Security Copilot** | Google Gemini integration with Telemetry RAG | ✅ **Verified in Workspace** |
| **M07 SOAR Playbooks** | Guardrailed response automation with audit logging | ✅ **Verified in Workspace** |
| **3D Digital Twin & Scene** | Three.js interactive topology, CyberGlobe & 3D Monitor | ✅ **Verified & Themed** |
| **Role-Based Portals** | Admin SecOps, Employee Portal, Personal Protection Hub | ✅ **Verified & Built** |
| **Passive Web Scanner** | DNS, TLS, HTTP security headers, and tech detection | ✅ **Verified & Built** |
| **Chrome Extension** | Manifest V3 real-time navigation defense | ✅ **Verified & Built** |
| **M08 Call Guardian** | Scam call & SMS smishing analysis (Multilingual) | 📋 **Next on Roadmap (Datasets Reviewed)** |
| **M09 CodeShield AI** | Public Git repository security and secret scanner | 📋 **Next on Roadmap (Architecture Planned)** |
| **Device Integration Layer** | Live Endpoint Guardian, MQTT IoT collector, NetSensor | 📋 **Next on Roadmap (Ingestion Specs Ready)** |

---

## 🔒 Zero-Trust Multi-Tenancy & Security Invariants

* **Tenant Isolation:** Every enterprise entity (`SecurityEvent`, `Incident`, `Device`, `PlaybookExecution`) is strictly scoped by `company_id`. Cross-tenant queries are blocked with `HTTP 403 Forbidden`.
* **Personal User Isolation:** Personal users (`company_id = None`) operate in isolated single-user mode. Personal scans never pollute corporate correlation engines or aggregate risk scores.
* **WebSocket Isolation:** The real-time WebSocket connection manager (`ws_manager`) segregates connections into company-keyed rooms, preventing cross-tenant alert leakage.
* **Deep SSRF Defense:** All server-side network requests pass through `validate_target()` and `is_private_or_reserved_ip()`, rejecting loopback, RFC 1918 private subnets, cloud metadata addresses, and internal DNS suffixes. HTTP redirects are actively inspected before following.

---

## 🛠️ Getting Started & Installation

### Prerequisites
* **Node.js:** v18.17.0+ or v20+
* **Python:** 3.12+ (tested up to 3.14)
* **PostgreSQL / Supabase** (or SQLite for local development)

### 1. Repository Setup
```bash
git clone https://github.com/salmaaaaannn/cyberdome.git
cd cyberdome
```

### 2. Backend Setup
```bash
# Create and activate Python virtual environment
python3 -m venv backend/venv
source backend/venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Configure environment
cp .env.example .env
```

Ensure your `.env` contains:
```env
DATABASE_URL="postgresql+asyncpg://user:password@localhost:5432/cyberdome"
SECRET_KEY="your-super-secret-jwt-key"
ALGORITHM="HS256"
GEMINI_API_KEY="your-google-gemini-api-key"
NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1"
```

Start the FastAPI server:
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be accessible at: `http://localhost:8000/docs`

### 3. Frontend Setup
In a new terminal window:
```bash
# Install frontend packages
npm install

# Start Next.js development server
npm run dev
```
Open your browser at: `http://localhost:3000`

---

## 🧪 Running Empirical Tests

CYBERDOME maintains a strict verification culture: **no feature is marked complete without empirical test proof.**

```bash
# Run all verified module test suites (M01 through M07)
./backend/venv/bin/pytest backend/tests/test_module*.py -v

# Run the dedicated Module 04 URL Production Verification suite (36 tests)
./backend/venv/bin/pytest backend/tests/test_module04_url_production_verification.py -v

# Run Frontend production build check
npm run build
```

---

## 📄 License
This project is proprietary and confidential. All rights reserved by **CYBERDOME Security Engineering**.
