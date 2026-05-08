from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from sklearn.linear_model import LogisticRegression

from ml_core.mlops.monitor import detect_drift, generate_report
from ml_core.mlops.retrainer import retrain_if_needed, should_retrain
from ml_core.mlops.serializer import get_active_version, load_model, rollback, save_model
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
    evaluate_classifier,
    train_classifier,
)
from ml_core.pipeline.feature_engineer import (
    engineer_churn,
    engineer_retail,
    train_test_split_data,
)
from ml_core.pipeline.forecaster import evaluate_forecaster, save_forecaster, train_forecaster
from ml_core.pipeline.ingestor import load_csv
from ml_core.pipeline.predictor import predict
from ml_core.pipeline.selector import select_model
from ml_core.utils.vectorized_ops import (
    compute_revenue,
    flag_outliers,
    normalize,
    safe_divide,
)


def _retail_df_for_features() -> pd.DataFrame:
    # create 10 months so lag-3 features have enough rows after dropna
    dates = pd.date_range("2023-01-01", periods=10, freq="MS")
    return pd.DataFrame(
        {
            "InvoiceDate": dates.astype(str),
            "Quantity": [10, 12, 13, 11, 15, 16, 14, 18, 20, 21],
            "UnitPrice": [2.0, 2.1, 2.2, 2.1, 2.3, 2.4, 2.3, 2.5, 2.6, 2.7],
            "CustomerID": [1001] * 10,
            "Country": ["UK"] * 10,
        }
    )


def _churn_df_for_features() -> pd.DataFrame:
    # include optional categoricals so one-hot encoding path is exercised
    return pd.DataFrame(
        {
            "customerID": [f"c{i}" for i in range(1, 13)],
            "tenure": [1, 2, 3, 4, 5, 6, 10, 12, 14, 18, 20, 24],
            "MonthlyCharges": [70, 65, 80, 50, 55, 90, 60, 85, 40, 75, 68, 72],
            "TotalCharges": [70, 130, 210, 200, 275, 540, 600, 1020, 560, 1350, 1360, 1728],
            "Contract": ["Month-to-month", "One year"] * 6,
            "PaymentMethod": ["Electronic check", "Mailed check"] * 6,
            "Churn": ["Yes", "No", "Yes", "No", "No", "Yes", "No", "Yes", "No", "Yes", "No", "No"],
        }
    )


def test_ingestor_retail_drops_invalid_rows(tmp_path: Path) -> None:
    # include invalid quantity/price and missing customer id to test cleaning logic
    raw = pd.DataFrame(
        {
            "InvoiceDate": ["2023-01-01", "2023-01-02", "2023-01-03", "2023-01-04"],
            "Quantity": [5, 0, 3, 2],
            "UnitPrice": [10.0, 9.0, -1.0, 8.0],
            "CustomerID": [1, 2, 3, np.nan],
            "Country": ["UK", "UK", "UK", "UK"],
        }
    )
    csv_path = tmp_path / "retail.csv"
    raw.to_csv(csv_path, index=False)

    clean = load_csv(str(csv_path), "retail")

    # only the fully valid row should survive all filters
    assert len(clean) == 1
    assert (clean["Quantity"] > 0).all()
    assert (clean["UnitPrice"] > 0).all()


def test_ingestor_raises_on_missing_columns(tmp_path: Path) -> None:
    # omit required churn columns to verify explicit schema validation
    bad = pd.DataFrame({"tenure": [1, 2], "MonthlyCharges": [10, 20]})
    csv_path = tmp_path / "bad.csv"
    bad.to_csv(csv_path, index=False)

    with pytest.raises(ValueError):
        load_csv(str(csv_path), "churn")


def test_feature_engineer_outputs_and_scaler() -> None:
    # retail path should return aligned lag+rolling features and targets
    retail_df = _retail_df_for_features()
    X_retail, y_retail = engineer_retail(retail_df)
    assert X_retail.shape[1] == 5  # lag1, lag2, lag3, rolling_mean3, rolling_std3
    assert len(X_retail) == len(y_retail)

    # churn path should return numeric arrays and fitted scaler
    churn_df = _churn_df_for_features()
    X_churn, y_churn, scaler = engineer_churn(churn_df)
    assert isinstance(X_churn, np.ndarray)
    assert isinstance(y_churn, np.ndarray)
    assert X_churn.shape[0] == y_churn.shape[0]
    assert hasattr(scaler, "mean_")

    # split helper should preserve row count and expected output tuple size
    X_train, X_test, y_train, y_test = train_test_split_data(X_churn, y_churn)
    assert X_train.shape[0] + X_test.shape[0] == X_churn.shape[0]
    assert y_train.shape[0] + y_test.shape[0] == y_churn.shape[0]


def test_forecaster_train_and_evaluate_keys() -> None:
    # generate train/test slices from engineered retail features
    retail_df = _retail_df_for_features()
    X, y = engineer_retail(retail_df)
    X_train, X_test, y_train, y_test = train_test_split_data(X, y)

    model = train_forecaster(X_train, y_train)
    metrics = evaluate_forecaster(model, X_test, y_test)

    assert hasattr(model, "predict")
    assert set(metrics.keys()) == {"mae", "rmse", "r2"}


def test_classifier_train_and_evaluate_keys() -> None:
    # train and score logistic classifier on synthetic churn data
    churn_df = _churn_df_for_features()
    X, y, _ = engineer_churn(churn_df)
    X_train, X_test, y_train, y_test = train_test_split_data(X, y)

    model = train_classifier(X_train, y_train)
    metrics = evaluate_classifier(model, X_test, y_test)

    assert isinstance(model, LogisticRegression)
    assert set(metrics.keys()) == {
        "accuracy",
        "precision",
        "recall",
        "f1",
        "confusion_matrix",
    }


def test_predict_returns_required_schema(tmp_path: Path, monkeypatch) -> None:
    # redirect model dir to tmp so this test never pollutes the production models folder
    monkeypatch.setattr("ml_core.config.MODEL_DIR", str(tmp_path))
    monkeypatch.setattr("ml_core.pipeline.predictor.MODEL_DIR", str(tmp_path))
    monkeypatch.setattr("ml_core.pipeline.forecaster.MODEL_DIR", str(tmp_path))

    retail_df = _retail_df_for_features()
    X, y = engineer_retail(retail_df)
    model = train_forecaster(X, y)
    save_forecaster(model, version=1)

    output = predict(retail_df, model_type="forecaster")

    assert set(output.keys()) == {
        "prediction",
        "confidence",
        "model_name",
        "timestamp",
        "cluster_label",
        "anomaly_flag",
        "pca_x",
        "pca_y",
        "historical_data",
    }


def test_predict_classifier_with_phase2_outputs(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr("ml_core.config.MODEL_DIR", str(tmp_path))
    monkeypatch.setattr("ml_core.pipeline.predictor.MODEL_DIR", str(tmp_path))
    monkeypatch.setattr("ml_core.pipeline.classifier.MODEL_DIR", str(tmp_path))
    monkeypatch.setattr("ml_core.pipeline.advanced_models.MODEL_DIR", str(tmp_path))

    churn_df = _churn_df_for_features()
    X, y, _ = engineer_churn(churn_df)
    best_name, best_score, best_path = choose_and_save_best_classifier(X, y)
    assert best_name in {"logistic", "svm", "mlp", "random_forest", "gradient_boosting"}
    assert isinstance(best_score, float)
    assert best_path.exists()

    kmeans = train_kmeans(X)
    save_kmeans(kmeans, version=1)

    pca, _, _ = fit_pca(X)
    save_pca(pca, version=1)

    anomaly_labels = (np.abs((X[:, 0] - np.mean(X[:, 0])) / (np.std(X[:, 0]) + 1e-9)) > 1.0).astype(int)
    anomaly = train_anomaly_detector(X, anomaly_labels)
    save_anomaly_detector(anomaly, version=1)

    output = predict(churn_df, model_type="classifier")
    assert set(output.keys()) == {
        "prediction",
        "confidence",
        "model_name",
        "timestamp",
        "cluster_label",
        "anomaly_flag",
        "pca_x",
        "pca_y",
        "historical_data",
    }
    assert output["cluster_label"] is None or isinstance(output["cluster_label"], int)
    assert isinstance(output["anomaly_flag"], bool)
    assert output["pca_x"] is None or isinstance(output["pca_x"], float)
    assert output["pca_y"] is None or isinstance(output["pca_y"], float)


def test_selector_classification_includes_phase2_candidates() -> None:
    # verify selector returns one of the expected classifier candidates
    churn_df = _churn_df_for_features()
    X, y, _ = engineer_churn(churn_df)
    result = select_model(X, y, task="classification")

    assert result["best_model_name"] in {"LogisticRegression", "SVC", "MLPClassifier", "RandomForest", "GradientBoosting"}
    assert isinstance(result["best_score"], float)
    assert len(result["all_scores"]) == 5


def test_serializer_save_load_and_rollback(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr("ml_core.config.MODEL_DIR", str(tmp_path))
    monkeypatch.setattr("ml_core.mlops.serializer.MODEL_DIR", str(tmp_path))

    retail_df = _retail_df_for_features()
    X, y = engineer_retail(retail_df)
    model = train_forecaster(X, y)

    result = save_model(model=model, model_name="forecaster", accuracy=0.9, version=11)
    assert result["model_path"].exists()
    assert result["metadata_path"].exists()
    assert result["active_path"].exists()

    loaded = load_model("forecaster", 11)
    assert "model" in loaded
    assert "metadata" in loaded
    assert loaded["metadata"]["version"] == 11

    rolled = rollback("forecaster", 11)
    assert rolled["rolled_back"] is True
    assert get_active_version("forecaster") == 11


def test_monitor_report_and_drift_detection() -> None:
    # generate report from counts and ensure drift detector returns required fields
    report = generate_report(error_count=2, total_count=10, drift_score=0.12, model_version="v3")
    assert report["error_rate"] == 0.2
    assert report["prediction_count"] == 10

    train = np.array([[1.0, 2.0], [1.1, 2.1], [0.9, 1.9], [1.2, 2.2]])
    live = np.array([[3.0, 4.0], [3.1, 4.1], [2.9, 3.9], [3.2, 4.2]])
    drift = detect_drift(live, train)

    assert set(drift.keys()) == {"drifted", "p_values", "min_p_value"}
    assert isinstance(drift["drifted"], bool)
    assert isinstance(drift["p_values"], list)
    assert isinstance(drift["min_p_value"], float)


def test_retrainer_flow(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr("ml_core.config.MODEL_DIR", str(tmp_path))
    monkeypatch.setattr("ml_core.mlops.serializer.MODEL_DIR", str(tmp_path))

    no_drift = {"drifted": False}
    assert should_retrain(no_drift) is False
    result = retrain_if_needed(no_drift, np.array([[1.0], [2.0]]), np.array([1.0, 2.0]), "forecaster", 2)
    assert result == {"retrained": False, "new_version": 2}

    yes_drift = {"drifted": True}
    X = np.array([[1.0], [2.0], [3.0], [4.0], [5.0]])
    y = np.array([2.0, 4.0, 6.0, 8.0, 10.0])
    retrained = retrain_if_needed(yes_drift, X, y, "forecaster", 3)
    assert retrained["retrained"] is True
    assert retrained["new_version"] == 4


def test_vectorized_ops_edge_cases() -> None:
    # constant arrays should normalize to zeros instead of dividing by zero
    normalized = normalize(np.array([5.0, 5.0, 5.0]))
    assert np.allclose(normalized, np.array([0.0, 0.0, 0.0]))

    # safe_divide should fill denominator-zero positions with fallback value
    divided = safe_divide(np.array([1.0, 2.0, 3.0]), np.array([1.0, 0.0, 3.0]), fill=-1.0)
    assert np.allclose(divided, np.array([1.0, -1.0, 1.0]))

    # compute_revenue and outlier flaggers should run on vectorized inputs
    revenue = compute_revenue(np.array([2, 3]), np.array([10, 5]))
    assert np.allclose(revenue, np.array([20.0, 15.0]))

    outliers = flag_outliers(np.array([1.0, 1.0, 1.0, 100.0]), threshold=1.5)
    assert outliers.dtype == bool
    assert outliers.shape == (4,)
