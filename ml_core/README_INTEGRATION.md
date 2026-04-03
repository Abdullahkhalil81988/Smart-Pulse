# SmartPulse ml_core integration guide

this file is the handoff contract for p2 (api) and p3 (dashboard).

## install

from repo root:

```bash
python -m venv .venv
.venv/bin/python -m pip install -r ml_core/requirements.txt
```

## one-command training for p2

run all training and artifact generation in one command:

```bash
.venv/bin/python -m ml_core.pipeline.train_entrypoint \
  --retail-csv data/raw/retail/online_retail_II.csv \
  --churn-csv data/raw/churn/WA_Fn-UseC_-Telco-Customer-Churn.csv \
  --credit-csv data/raw/credit/creditcard.csv \
  --version 1
```

artifacts are saved in ml_core/models.

## p2 contract

- import path: ml_core.pipeline.predictor
- callable: predict(df, model_type)
- accepted model_type values: forecaster, classifier, anomaly
- model artifacts expected:
  - ml_core/models/forecaster_v1.joblib
  - ml_core/models/classifier_v1.joblib
  - ml_core/models/classifier_best.joblib (phase 2)
  - ml_core/models/kmeans_v1.joblib (phase 2)
  - ml_core/models/pca_v1.joblib (phase 2)
  - ml_core/models/anomaly_v1.joblib (phase 2)
  - ml_core/models/churn_scaler_v1.joblib

training datasets currently expected:
- retail: online_retail_II.csv
- churn: WA_Fn-UseC_-Telco-Customer-Churn.csv
- credit: creditcard.csv

## p3 contract

predict output keys are:

- prediction
- confidence
- model_name
- timestamp
- cluster_label
- anomaly_flag
- pca_x
- pca_y

notes:
- cluster_label is int when kmeans artifact exists, otherwise null.
- anomaly_flag is bool and defaults false if anomaly model is missing.
- pca_x and pca_y are floats when pca artifact exists, otherwise null.

## predictor behavior

- if model_type is omitted, predictor auto-detects based on dataframe columns.
- predictor runs feature engineering internally, so caller sends raw dataframe.
- classifier uses classifier_best.joblib when present, else latest classifier_v*.joblib.
- anomaly uses latest anomaly_v*.joblib and expects credit-like numeric features.

## mlops contract

- serializer sidecar metadata keeps version, accuracy, trained_at, and model_name.
- monitor drift uses kolmogorov-smirnov test per feature via scipy ks_2samp.
- retrainer increments version and updates active pointer on drifted=true.
