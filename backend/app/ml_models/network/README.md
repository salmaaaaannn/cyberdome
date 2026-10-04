# CYBERDOME Module 01 — Network ML Artifacts

## Overview
This directory contains pre-trained Machine Learning artifacts for **CYBERDOME Module 01: Network Anomaly Detection**.

These models were trained on the **CIC-IDS2017** benchmark dataset (Canadian Institute for Cybersecurity Intrusion Detection System benchmark).

> **Important**: Performance metrics and test splits correspond to the CIC-IDS2017 benchmark evaluation splits. CYBERDOME never claims production accuracy or synthetic zero-risk guarantees without empirical telemetry.

---

## Artifact Manifest

| Filename | Type | Framework | Input Dimension | Description |
| :--- | :--- | :--- | :--- | :--- |
| `feature_schema.json` | JSON Schema | Standard JSON | 77 Features | Authoritative ordered list of 77 CIC-IDS2017 network flow features. |
| `scaler.joblib` | Preprocessing | Scikit-Learn `StandardScaler` | 77 Features | Pre-fitted standardizer for 77-dimensional flow vectors. |
| `network_isolation_forest.joblib` | Unsupervised ML | Scikit-Learn `IsolationForest` | 77 Features | Unsupervised network anomaly detector (`1` = Normal, `-1` = Anomaly). |
| `network_xgboost.joblib` | Supervised ML | XGBoost `XGBClassifier` | 77 Features | Supervised intrusion classifier (`0` = BENIGN, `1` = ATTACK). |

---

## Strict Operational Invariants

1. **Inference Only**:
   - Models are pre-trained. The backend NEVER invokes `.fit()` or `.fit_transform()`.
   - Models run solely in evaluation/inference mode via `.transform()`, `.predict()`, `.predict_proba()`, and `.decision_function()`.

2. **Zero Fake Feature Imputation**:
   - Zero-filling missing features or defaulting via `event.get(k, 0)` is strictly forbidden.
   - If an incoming network event lacks any of the 77 required features, the service returns an explicit `INSUFFICIENT_DATA` error detailing the missing columns.

3. **Authoritative Feature Ordering**:
   - `feature_schema.json` defines the exact column ordering required by `scaler.joblib` and the models.
   - Flow data must be converted into a pandas DataFrame matching this exact column order before passing to `scaler.transform()`.

4. **Multi-Tenant Security Boundary**:
   - Inference results are tagged with the verified `company_id` from the authenticated JWT session.
   - Telemetry from one tenant cannot influence or leak into another tenant's security events.
