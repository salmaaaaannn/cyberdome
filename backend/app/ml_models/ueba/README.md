# CYBERDOME Module 03 — UEBA Anomaly Detection Artifacts
Model Version: `ueba-anomaly-v1`
Benchmark Dataset: `CERT Insider Threat (r4.2/r5.2 representation)`
Features: 30 standardized behavioral metrics

## Artifacts Inventory
- `models/ueba_isolation_forest.joblib`: Unsupervised anomaly detection model (Size: 342.9 KB)
- `models/ueba_xgboost.joblib`: Supervised gradient boosted insider threat classifier (Size: 14.2 KB)
- `preprocessing/scaler.joblib`: StandardScaler fitted exclusively on training split (Size: 1.5 KB)
- `preprocessing/feature_schema.json`: Canonical schema defining authoritative 30 feature order
- `metadata/model_metadata.json`: Model hyperparameters, metrics, and training provenance
- `evaluation/evaluation_report.json`: Held-out test evaluation metrics and confusion matrices
- `evaluation/feature_importance.json`: Top predictive behavioral features by XGBoost gain

## Performance Summary
- Isolation Forest F1: 0.9050
- XGBoost F1: 1.0000
- XGBoost ROC-AUC: 1.0000
