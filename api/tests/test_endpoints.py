import pytest
import io
import os
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

# ── sample CSVs as strings ────────────────────────────────

CHURN_CSV = """customerID,tenure,MonthlyCharges,TotalCharges,Contract,PaymentMethod,Churn
c001,12,70.50,846.00,Month-to-month,Electronic check,Yes
c002,24,55.20,1324.80,One year,Mailed check,No
c003,6,89.99,539.94,Month-to-month,Credit card,Yes
c004,36,45.00,1620.00,Two year,Bank transfer,No
c005,3,99.99,299.97,Month-to-month,Electronic check,Yes
c006,48,60.00,2880.00,Two year,Mailed check,No"""

RETAIL_CSV = """InvoiceNo,CustomerID,Country,InvoiceDate,Quantity,UnitPrice
INV001,1001,UK,2023-01-15,10,25.99
INV002,1002,UK,2023-01-20,5,15.50
INV003,1001,UK,2023-02-10,8,25.99
INV004,1003,Germany,2023-02-14,12,10.00
INV005,1002,UK,2023-03-05,6,15.50
INV006,1001,UK,2023-03-18,9,25.99
INV007,1004,France,2023-04-02,15,8.75
INV008,1003,Germany,2023-04-22,11,10.00
INV009,1002,UK,2023-05-08,7,15.50
INV010,1001,UK,2023-05-25,10,25.99
INV011,1004,France,2023-06-10,20,8.75
INV012,1003,Germany,2023-06-28,13,10.00
INV013,1001,UK,2023-07-05,8,25.99
INV014,1002,UK,2023-07-19,5,15.50
INV015,1004,France,2023-08-02,18,8.75"""

BAD_CSV = """col1,col2
1,2
3,4"""

# ── /health ───────────────────────────────────────────────

def test_health_returns_200():
    response = client.get("/health")
    assert response.status_code == 200

def test_health_returns_correct_keys():
    response = client.get("/health")
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert data["status"] == "ok"

# ── /datasets/status ──────────────────────────────────────

def test_dataset_status_returns_200():
    response = client.get("/api/v1/datasets/status")
    assert response.status_code == 200

def test_dataset_status_has_correct_keys():
    response = client.get("/api/v1/datasets/status")
    data = response.json()
    assert "retail_csv_found" in data
    assert "churn_csv_found" in data
    assert "credit_csv_found" in data

# ── /predict valid inputs ────────────────────────────────

def test_predict_classifier_with_churn_csv():
    # only run if model artifact exists
    if not os.path.exists("ml_core/models/classifier_best.joblib"):
        pytest.skip("classifier_best.joblib not found — run /train first")

    response = client.post(
        "/api/v1/predict?model_type=classifier",
        files={"file": ("churn_test.csv", CHURN_CSV.encode(), "text/csv")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert "confidence" in data
    assert "model_name" in data
    assert "timestamp" in data
    assert "anomaly_flag" in data
    assert isinstance(data["prediction"], float)
    assert 0.0 <= data["confidence"] <= 1.0

def test_predict_forecaster_with_retail_csv():
    if not os.path.exists("ml_core/models/forecaster_v1.joblib"):
        pytest.skip("forecaster_v1.joblib not found — run /train first")

    response = client.post(
        "/api/v1/predict?model_type=forecaster",
        files={"file": ("retail_test.csv", RETAIL_CSV.encode(), "text/csv")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert isinstance(data["prediction"], float)
    assert data["confidence"] == 1.0

def test_predict_auto_detects_forecaster():
    if not os.path.exists("ml_core/models/forecaster_v1.joblib"):
        pytest.skip("forecaster_v1.joblib not found — run /train first")

    # no model_type — should auto-detect from columns
    response = client.post(
        "/api/v1/predict",
        files={"file": ("retail_test.csv", RETAIL_CSV.encode(), "text/csv")}
    )
    assert response.status_code == 200
    assert response.json()["model_name"].startswith("forecaster")

def test_predict_auto_detects_classifier():
    if not os.path.exists("ml_core/models/classifier_best.joblib"):
        pytest.skip("classifier_best.joblib not found — run /train first")

    response = client.post(
        "/api/v1/predict",
        files={"file": ("churn_test.csv", CHURN_CSV.encode(), "text/csv")}
    )
    assert response.status_code == 200
    assert "classifier" in response.json()["model_name"]

# ── /predict invalid inputs ───────────────────────────────

def test_predict_rejects_non_csv():
    response = client.post(
        "/api/v1/predict",
        files={"file": ("data.txt", b"some text", "text/plain")}
    )
    assert response.status_code == 400
    assert "CSV" in response.json()["detail"]

def test_predict_rejects_empty_csv():
    response = client.post(
        "/api/v1/predict",
        files={"file": ("empty.csv", b"", "text/csv")}
    )
    assert response.status_code == 400

def test_predict_rejects_invalid_model_type():
    response = client.post(
        "/api/v1/predict?model_type=invalid_model",
        files={"file": ("churn_test.csv", CHURN_CSV.encode(), "text/csv")}
    )
    assert response.status_code == 400
    assert "model_type" in response.json()["detail"]

def test_predict_rejects_wrong_columns():
    if not os.path.exists("ml_core/models/classifier_best.joblib"):
        pytest.skip("classifier_best.joblib not found — run /train first")

    # churn model expects churn columns — passing bad CSV should fail
    response = client.post(
        "/api/v1/predict?model_type=classifier",
        files={"file": ("bad.csv", BAD_CSV.encode(), "text/csv")}
    )
    assert response.status_code in [400, 500]

# ── /report ───────────────────────────────────────────────

def test_report_returns_200():
    response = client.get("/api/v1/report")
    assert response.status_code == 200

def test_report_has_correct_keys():
    response = client.get("/api/v1/report")
    data = response.json()
    assert "last_training" in data
    assert "model_artifacts" in data
    assert "artifact_count" in data
    assert "model_metadata" in data

def test_report_artifact_count_matches_list():
    response = client.get("/api/v1/report")
    data = response.json()
    assert data["artifact_count"] == len(data["model_artifacts"])