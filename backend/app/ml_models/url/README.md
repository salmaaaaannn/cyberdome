# CYBERDOME Module 04 — Phishing & Malicious URL Detection Models
**Model Version**: `url-phishing-v1`  
**Dataset Benchmark**: PhishTank & OpenPhish Benchmark Representation  
**Feature Count**: 27 Canonical Lexical & Structural Features  

## Preprocessing & Models
- `preprocessing/scaler.joblib`: StandardScaler fitted on 27 canonical features
- `preprocessing/feature_schema.json`: Strict feature order definition
- `models/url_isolation_forest.joblib`: Unsupervised anomaly detection
- `models/url_xgboost.joblib`: Supervised phishing/malicious classifier
- `metadata/model_metadata.json`: Model provenance, hyperparameters, and leakage checks
- `evaluation/evaluation_report.json`: Held-out benchmark metrics
- `evaluation/feature_importance.json`: Ranked feature predictive weights

## Disclaimer
BENCHMARK RESULT — NOT GUARANTEED PRODUCTION OR ZERO-DAY ACCURACY.
