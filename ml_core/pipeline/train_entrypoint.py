import argparse
import json
from pathlib import Path
from typing import Dict

import joblib
import numpy as np
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

from ml_core.config import MODEL_DIR
from ml_core.pipeline.advanced_models import (
    fit_pca,
    save_anomaly_detector,
    save_kmeans,
    save_pca,
    train_anomaly_detector,
    train_kmeans,
)
from ml_core.pipeline.classifier import (
    choose_and_save_best_classifier,
    save_classifier,
    train_classifier,
)
from ml_core.pipeline.feature_engineer import (
    engineer_credit,
    engineer_churn,
    engineer_retail,
    train_test_split_data,
)
from ml_core.pipeline.forecaster import evaluate_forecaster, save_forecaster, train_forecaster
from ml_core.pipeline.ingestor import load_csv


def train_all(retail_csv: str, churn_csv: str, credit_csv: str, version: int = 1) -> Dict[str, object]:
    # ingest and clean all fixed datasets before feature generation
    retail_df = load_csv(retail_csv, "retail")
    churn_df = load_csv(churn_csv, "churn")
    credit_df = load_csv(credit_csv, "credit")

    # build and split retail features for forecaster training
    X_retail, y_retail = engineer_retail(retail_df)
    Xr_train, Xr_test, yr_train, yr_test = train_test_split_data(X_retail, y_retail)

    # train and persist phase-1 forecaster model
    forecaster = train_forecaster(Xr_train, yr_train)
    forecaster_path = save_forecaster(forecaster, version=version)
    forecaster_metrics = evaluate_forecaster(forecaster, Xr_test, yr_test)

    # build and split churn features for classifier training
    X_churn, y_churn, scaler = engineer_churn(churn_df)
    Xc_train, Xc_test, yc_train, yc_test = train_test_split_data(X_churn, y_churn)

    # train and persist phase-1 logistic classifier
    classifier = train_classifier(Xc_train, yc_train)
    classifier_path = save_classifier(classifier, version=version)

    # persist scaler so p2 can reuse exact preprocessing at inference time
    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    scaler_path = model_dir / f"churn_scaler_v{version}.joblib"
    joblib.dump(scaler, scaler_path)

    # select and persist best phase-2 classifier across logistic/svm/mlp
    best_name, best_score, best_path = choose_and_save_best_classifier(X_churn, y_churn)

    # fit and persist clustering model for cluster labels
    kmeans = train_kmeans(X_churn, n_clusters=5)
    kmeans_path = save_kmeans(kmeans, version=version)

    # fit and persist pca model for 2d dashboard coordinates
    pca, _, variance_ratio = fit_pca(X_churn, n_components=2)
    pca_path = save_pca(pca, version=version)

    # build and split credit features for real anomaly/fraud detector training
    X_credit, y_credit = engineer_credit(credit_df)
    Xf_train, Xf_test, yf_train, yf_test = train_test_split_data(X_credit, y_credit)

    # train anomaly detector on labeled fraud data instead of synthetic labels
    anomaly = train_anomaly_detector(Xf_train, yf_train)
    anomaly_path = save_anomaly_detector(anomaly, version=version)

    # report fraud metrics that are robust to severe class imbalance
    fraud_preds = anomaly.predict(Xf_test)
    anomaly_metrics = {
        "accuracy": float(accuracy_score(yf_test, fraud_preds)),
        "precision": float(precision_score(yf_test, fraud_preds, zero_division=0)),
        "recall": float(recall_score(yf_test, fraud_preds, zero_division=0)),
        "f1": float(f1_score(yf_test, fraud_preds, zero_division=0)),
    }

    return {
        "forecaster_path": str(forecaster_path),
        "classifier_path": str(classifier_path),
        "classifier_best_path": str(best_path),
        "kmeans_path": str(kmeans_path),
        "pca_path": str(pca_path),
        "anomaly_path": str(anomaly_path),
        "scaler_path": str(scaler_path),
        "forecaster_metrics": forecaster_metrics,
        "best_classifier": {"name": best_name, "f1_cv": best_score},
        "pca_explained_variance_ratio": [float(v) for v in variance_ratio],
        "anomaly_metrics": anomaly_metrics,
    }


def main() -> None:
    # keep interface tiny so p2 can run training from one command
    parser = argparse.ArgumentParser(description="train all SmartPulse ml_core models")
    parser.add_argument(
        "--retail-csv",
        default="data/raw/retail/online_retail_II.csv",
        help="path to online retail csv",
    )
    parser.add_argument(
        "--churn-csv",
        default="data/raw/churn/WA_Fn-UseC_-Telco-Customer-Churn.csv",
        help="path to telco churn csv",
    )
    parser.add_argument(
        "--credit-csv",
        default="data/raw/credit/creditcard.csv",
        help="path to credit fraud csv",
    )
    parser.add_argument("--version", type=int, default=1, help="artifact version number")
    args = parser.parse_args()

    summary = train_all(
        retail_csv=args.retail_csv,
        churn_csv=args.churn_csv,
        credit_csv=args.credit_csv,
        version=args.version,
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
