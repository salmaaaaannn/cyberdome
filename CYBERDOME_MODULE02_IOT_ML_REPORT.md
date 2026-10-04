# CYBERDOME MODULE 02 — IoT ANOMALY DETECTION ML REPORT

**System:** CYBERDOME Enterprise Cyber Defense Platform  
**Module:** Module 02 — IoT Anomaly Detection  
**Model Version:** `iot-anomaly-v1`  
**Benchmark Dataset:** CICIoT2023 (Canadian Institute for Cybersecurity)  
**Artifact Directory (Colab / Drive):** `/content/drive/MyDrive/CYBERDOME_ML_Artifacts/Module02_IoT/`  
**Local Artifact Directory:** [`backend/app/ml_models/iot/`](file:///Users/hassaankhan/Desktop/cyberX/backend/app/ml_models/iot/)  
**Date:** October 3, 2026  
**Status:** **TRAINING_COMPLETE**

---

## 1. EXECUTIVE SUMMARY

CYBERDOME Module 02 IoT Anomaly Detection (`iot-anomaly-v1`) provides high-throughput, dual-engine threat detection tailored specifically for IoT and Operational Technology (OT) assets—such as smart meters, IP surveillance cameras, medical devices, sensors, and industrial gateways.

Module 02 operates independently from Module 01 (Network Flow Detection) while following the exact same security principles:
1. **Dual Inference Engine:** Combines unsupervised statistical baseline profiling (Scikit-Learn `IsolationForest`) with supervised intrusion classification (`XGBClassifier`).
2. **Zero Fake Feature Imputation:** If incoming IoT telemetry lacks any of the 46 canonical features, the engine rejects with `INSUFFICIENT_DATA` rather than zero-filling or fabricating metrics.
3. **Multi-Tenant & Environment Isolation:** Preserves `environment = REAL` vs `SIMULATION` across inference and downstream event handling.
4. **Leakage-Resistant Architecture:** Explicitly eliminates identity, temporal, and hardware hardware artifacts (IPs, MACs, timestamps) from training boundaries.

---

## 2. DATASET DESCRIPTION

* **Primary Benchmark Dataset:** **CICIoT2023** (University of New Brunswick)
* **Emulated Infrastructure:** 105 IoT devices across 16 different categories (cameras, motion sensors, microcontrollers, smart home hubs).
* **Attack Breadth:** 33 distinct cyber-attack scenarios categorized into 7 major classes:
  1. **DDoS:** 12 sub-attacks (SYN Flood, UDP Flood, ICMP Flood, SlowLoris, HTTP Flood, Fragmentation, etc.)
  2. **DoS:** 4 sub-attacks (UDP Flood, TCP Flood, SYN Flood, HTTP Flood)
  3. **Reconnaissance:** 5 sub-attacks (Host Discovery, OS Scan, Port Scan, Ping Sweep, Vulnerability Scan)
  4. **Web-Based Attacks:** 6 sub-attacks (SQLi, Command Injection, XSS, Backdoors, Uploading Attack)
  5. **Brute Force:** Dictionary Brute Force against Telnet/SSH
  6. **Spoofing:** ARP Poisoning, DNS Spoofing
  7. **Mirai Botnet:** GRE/IP floods, GRE/Ethernet floods, UDP plain floods
  8. **Benign Traffic:** Steady-state IoT device communication (MQTT, CoAP, HTTP, DNS, keep-alives)

---

## 3. DATASET STATISTICS

* **Total Samples Evaluated:** `15,000`
* **Feature Count:** `46` continuous and protocol indicator features
* **Total Schema Columns:** `49` (46 features + `label` + `category` + `binary_label`)
* **Class Balance:**
  * **Benign Baseline Flows:** `3,000` (20.0%)
  * **Malicious Threat Flows:** `12,000` (80.0%)
* **Distribution Across Attack Categories:**
  * DDoS: 4,800 flows (32.0%)
  * DoS: 2,400 flows (16.0%)
  * Reconnaissance: 1,800 flows (12.0%)
  * Mirai Botnet: 1,200 flows (8.0%)
  * Brute Force: 600 flows (4.0%)
  * Spoofing: 600 flows (4.0%)
  * Web Attacks: 600 flows (4.0%)

---

## 4. DATA CLEANING

Rigorous validation was performed prior to any model training:
* **Duplicate Detection:** Identified and removed cross-flow duplicates based on 46 feature signatures.
* **Missing Value (NaN) & Non-Finite (Inf) Handling:** Scanned all continuous metrics; non-finite rows are purged from training and rejected with HTTP 400/422 in inference.
* **Zero-Variance Columns:** Constant columns across uniform telemetry streams were flagged and analyzed.
* **Data Volume Accounting:**
  * Original rows: `15,000`
  * Removed duplicates: `0`
  * Removed invalid/non-finite rows: `0`
  * Final rows retained for partitioning: `15,000`

---

## 5. LEAKAGE ANALYSIS

To prevent the model from learning synthetic testbed artifacts instead of genuine attack behaviors, potential leakage sources were audited:

| Feature / Artifact | Action Taken | Reason for Removal / Exclusion |
| :--- | :--- | :--- |
| **Source IP Address** | **Excluded** | Fixed testbed subnet assignments (`192.168.0.x`) cause models to memorize host identities rather than behavioral flow dynamics. |
| **Destination IP Address** | **Excluded** | Target IoT node IP memorization causes severe overfitting to specific testbed victim IPs. |
| **Source / Destination MAC** | **Excluded** | Hardware vendor OUI tags leak device manufacturer identities into classification boundaries. |
| **Timestamps / Epoch** | **Excluded** | Attacks executed at scheduled times (e.g. afternoon batches) leak temporal correlation rather than traffic structure. |
| **Filename / Partition ID** | **Excluded** | Attack scenarios clustered by filename create cross-split identity leakage when rows are randomly shuffled. |

---

## 6. FEATURE ENGINEERING

The 46 canonical features of CICIoT2023 map directly into 4 operational dimensions viable in CYBERDOME's IoT telemetry pipeline:

1. **Traffic Volumetrics & Rates (11 features):**
   * `flow_duration`, `Duration`, `Rate`, `Srate`, `Drate`, `Tot sum`, `Min`, `Max`, `AVG`, `Std`, `Tot size`, `Number`
2. **Network Protocol Indicators (13 features):**
   * `Protocol Type`, `TCP`, `UDP`, `ICMP`, `HTTP`, `HTTPS`, `DNS`, `Telnet`, `SMTP`, `SSH`, `IRC`, `DHCP`, `ARP`, `IPv`, `LLC`
3. **TCP Flag Counters & Headers (13 features):**
   * `Header_Length`, `fin_flag_number`, `syn_flag_number`, `rst_flag_number`, `psh_flag_number`, `ack_flag_number`, `ece_flag_number`, `cwr_flag_number`, `ack_count`, `syn_count`, `fin_count`, `urg_count`, `rst_count`
4. **Flow Dynamics & Dispersion (6 features):**
   * `IAT` (Inter-Arrival Time), `Magnitue`, `Radius`, `Covariance`, `Variance`, `Weight`

---

## 7. SPLIT STRATEGY

* **Methodology:** Leakage-resistant stratified partitioning preserving attack category distribution across splits.
* **Partitions:**
  * **Train Set (60%):** `8,996` rows (used for fitting Scaler, Isolation Forest on Benign subset, and XGBoost).
  * **Validation Set (20%):** `2,998` rows (used for threshold tuning and early stopping).
  * **Test Set (20%):** `3,006` rows (untouched holdout evaluated only after all hyperparameters were frozen).

---

## 8. MODEL 1 — ISOLATION FOREST (UNSUPERVISED)

* **Objective:** Detect out-of-distribution behavioral anomalies without requiring labeled attack examples.
* **Training Corpus:** Trained strictly on the **Benign baseline split** (`y == 0`) representing steady-state IoT behavior.
* **Hyperparameters:** `n_estimators = 100`, `contamination = 0.08`, `random_state = 42`.
* **Decision Boundary:** Cutoff threshold `0.0`. Positive scores represent in-distribution normal flows; negative scores represent statistical anomalies.
* **Validation & Test Metrics:**
  * Precision: `0.9761` (97.61%)
  * Recall: `1.0000` (100.00%)
  * F1 Score: `0.9879` (98.79%)
  * False Positive Rate (FPR): `0.0983` (9.83% false alarm rate on benign flows)

---

## 9. MODEL 2 — XGBOOST (SUPERVISED)

* **Objective:** High-confidence classification of known IoT attack families and botnet behaviors.
* **Training Corpus:** Trained on the complete training set with `scale_pos_weight` to account for benign/malicious imbalance.
* **Hyperparameters:** `max_depth = 6`, `n_estimators = 120`, `learning_rate = 0.08`, `subsample = 0.8`, `colsample_bytree = 0.8`.
* **Validation & Test Metrics:**
  * Precision: `1.0000` (100.00%)
  * Recall: `1.0000` (100.00%)
  * F1 Score: `1.0000` (100.00%)
  * False Positive Rate (FPR): `0.0000` (0.00%)
  * ROC-AUC: `1.0000`
  * PR-AUC: `1.0000`

---

## 10. MODEL COMPARISON

| Evaluation Metric | Isolation Forest (Unsupervised) | XGBoost Classifier (Supervised) | Operational Role in CYBERDOME |
| :--- | :---: | :---: | :--- |
| **Precision** | `0.9761` | `1.0000` | Precision prevents SOC alert fatigue |
| **Recall** | `1.0000` | `1.0000` | Recall ensures zero missed intrusions |
| **F1 Score** | `0.9879` | `1.0000` | Harmonic balance between precision & recall |
| **False Positive Rate** | `0.0983` (9.83%) | `0.0000` (0.00%) | IF produces expected baseline noise; XGB filters it |
| **ROC-AUC** | N/A (One-Class) | `1.0000` | Discriminative ranking power |
| **Primary Strength** | Detects novel/zero-day IoT anomalies | Extremely high precision on known botnet signatures | **Ensemble Verdict (`CONFIRMED_IOT_ATTACK`)** |

---

## 11. CONFUSION MATRICES

### Isolation Forest (Test Set: 3,006 samples)
* **True Negatives (TN):** `541` (Benign correctly identified as Normal)
* **False Positives (FP):** `59` (Benign flagged as Anomaly, 9.83% FPR)
* **False Negatives (FN):** `0` (Attacks missed as Normal)
* **True Positives (TP):** `2,406` (Attacks correctly identified as Anomaly)

### XGBoost (Test Set: 3,006 samples)
* **True Negatives (TN):** `600` (Benign correctly classified)
* **False Positives (FP):** `0` (Zero benign flows misclassified as attack)
* **False Negatives (FN):** `0` (Zero attacks missed)
* **True Positives (TP):** `2,406` (All attacks correctly classified)

*Visualizations stored under [`backend/app/ml_models/iot/evaluation/`](file:///Users/hassaankhan/Desktop/cyberX/backend/app/ml_models/iot/evaluation/): `confusion_matrix_if.png`, `confusion_matrix_xgb.png`.*

---

## 12. ERROR ANALYSIS & TOP FAILURE PATTERNS

While the test set yielded near-zero classification errors due to the distinct volumetric nature of CICIoT2023 attacks, real-world deployment presents known edge-case vulnerabilities:

1. **Top False Positive Risk:**
   * High-volume streaming IoT camera video bursts (RTSP/HTTPS) exhibiting elevated packet rates and payload variance that can trigger Isolation Forest anomaly alerts.
2. **Top False Negative Risk:**
   * Low-and-slow stealthy reconnaissance scans where an adversary probes fewer than 2 ports per minute, evading volumetric thresholds.
3. **Evasion Risk:**
   * Fragmented ICMP ping floods engineered with micro-bursts resembling normal device heartbeat telemetry.

---

## 13. FEATURE IMPORTANCE (TOP 10 FEATURES)

Extracted from the trained XGBoost model (`feature_importance.json`):

1. **`Radius` (65.84%):** Dispersion radius of packet sizes within the flow window.
2. **`IAT` (24.00%):** Packet Inter-Arrival Time mean (collapses from milliseconds in benign flows to microseconds under DDoS/DoS).
3. **`Rate` (4.20%):** Flow packet transmission frequency.
4. **`Header_Length` (2.32%):** Cumulative protocol header size.
5. **`Covariance` (1.39%):** Multi-dimensional covariance across packet sizes and arrival timings.
6. **`Magnitue` (0.91%):** Root mean square magnitude of flow metrics.
7. **`Number` (0.54%):** Absolute packet count per flow record.
8. **`Tot sum` (0.28%):** Total byte sum transmitted.
9. **`Max` (0.27%):** Maximum observed packet size in the flow.
10. **`Tot size` (0.19%):** Total flow payload footprint.

---

## 14. THRESHOLD SELECTION

* **Isolation Forest Threshold:** Set to `0.0` on the Scikit-Learn `decision_function` output. Flows with score $< 0.0$ are flagged as anomalous.
* **XGBoost Decision Threshold:** Standard sigmoid probability cutoff at `0.50`. Detections with $p \ge 0.90$ are escalated to `CRITICAL` severity; $0.75 \le p < 0.90$ are mapped to `HIGH`.

---

## 15. ARTIFACT VALIDATION & SERIALIZATION REPRODUCIBILITY

* **Serialization Verification:** The model serialization test reloaded all artifacts from disk and compared predictions on test samples:
  $$\text{prediction\_before\_save} \equiv \text{prediction\_after\_reload}$$
  *Result: Identical verdict, probability, and anomaly scores confirmed.*

### Artifact Manifest:
```
backend/app/ml_models/iot/
├── data/
├── models/
│   ├── iot_isolation_forest.joblib (1.65 MB)
│   └── iot_xgboost.joblib (105 KB)
├── preprocessing/
│   ├── scaler.joblib (2.4 KB)
│   └── feature_schema.json (817 B)
├── metadata/
│   └── model_metadata.json (2.9 KB)
├── evaluation/
│   ├── evaluation_report.json (1.4 KB)
│   ├── feature_importance.json (1.0 KB)
│   ├── summary.json (708 B)
│   ├── confusion_matrix_if.png
│   └── confusion_matrix_xgb.png
└── reports/
```

---

## 16. INFERENCE CONTRACT

Implemented in [`train_module02_iot.py`](file:///Users/hassaankhan/Desktop/cyberX/scripts/training/train_module02_iot.py#L318-L388):

```python
def predict_iot(raw_features: Dict[str, Any], environment: str = "REAL") -> Dict[str, Any]:
    """
    Executes IoT inference over the 46-feature schema.
    Returns structured verdict, confidence, and severity.
    """
```

### Sample Output Structure:
```json
{
  "model_version": "iot-anomaly-v1",
  "verdict": "CONFIRMED_IOT_ATTACK",
  "is_anomaly": true,
  "is_attack": true,
  "confidence": 0.9421,
  "isolation_score": -0.1842,
  "xgboost_probability": 0.9421,
  "severity": "CRITICAL",
  "environment": "REAL",
  "processed_at": "2026-10-03T16:22:26.543210+00:00"
}
```

---

## 17. PERFORMANCE BENCHMARKS

* **Startup Artifact Load Time:** `14.2 ms`
* **Single-Sample Inference Latency:** `11.77 ms` average across 50 sequential runs.
* **Throughput Capacity:** ~85 single-flow evaluations per second per CPU core without batching.

---

## 18. LIMITATIONS & PRODUCTION REALITIES

1. **Benchmark vs Production Warning:**
   The reported ROC-AUC = 1.0000 is an empirical benchmark on the structured CICIoT2023 dataset. Real physical enterprise IoT deployments experience device firmware diversity, transient sensor dropouts, and proprietary IoT protocols (Zigbee, Modbus, BACnet) not fully captured by raw TCP/IP/UDP metrics.
2. **Flow Sensor Prerequisite:**
   Raw packets from physical IoT Wi-Fi or Ethernet taps must pass through an IoT flow parser (such as Zeek IoT analyzer or CICFlowMeter) to extract the 46 features before invoking the CYBERDOME API.

---

## 19. REPRODUCIBILITY

* **Python Version:** 3.14.7
* **Scikit-Learn Version:** 1.6.1 / 1.9.1 compatible
* **XGBoost Version:** 3.4.1
* **Pandas Version:** 2.3.2
* **Numpy Version:** 2.2.3
* **Seed:** `42` (deterministic)

---

## 20. RECOMMENDED BACKEND INTEGRATION

To integrate Module 02 into the active CYBERDOME platform without altering existing architecture:
1. Create `app/services/ml_iot_service.py` adhering to the same singleton structure as `MLNetworkService`.
2. Connect `POST /api/v1/iot/events` in `app/routers/iot.py` to evaluate the 46-feature vector.
3. Automatically correlate detected attacks into `SecurityEvent` and `Incident` records bound to the targeted `IoTDevice`.
4. Update Digital Twin node status (`ONLINE` $\rightarrow$ `COMPROMISED`) and trigger SOAR dynamic 802.1X VLAN isolation.

---

```
============================================================
MODULE 02 STATUS
============================================================
TRAINING_COMPLETE
============================================================
```
