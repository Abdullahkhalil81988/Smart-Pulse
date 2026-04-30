from typing import Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from ml_core.config import RANDOM_SEED, TRAIN_SPLIT


def engineer_retail(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    work_df = df.copy()
    if "Price" in work_df.columns and "UnitPrice" not in work_df.columns:
        work_df = work_df.rename(columns={"Price": "UnitPrice"})
    if "Customer ID" in work_df.columns and "CustomerID" not in work_df.columns:
        work_df = work_df.rename(columns={"Customer ID": "CustomerID"})

    work_df["InvoiceDate"] = pd.to_datetime(work_df["InvoiceDate"], errors="coerce")
    work_df = work_df.dropna(subset=["InvoiceDate"])
    work_df["revenue"] = work_df["Quantity"] * work_df["UnitPrice"]
    work_df["month"] = work_df["InvoiceDate"].dt.to_period("M").dt.to_timestamp()

    monthly = (
        work_df.groupby("month", as_index=False)["revenue"]
        .sum()
        .rename(columns={"revenue": "monthly_revenue"})
        .sort_values("month")
    )

    monthly["revenue_lag_1"] = monthly["monthly_revenue"].shift(1)
    monthly["revenue_lag_2"] = monthly["monthly_revenue"].shift(2)
    monthly["revenue_lag_3"] = monthly["monthly_revenue"].shift(3)
    monthly["rolling_mean_3"] = monthly["monthly_revenue"].shift(1).rolling(3).mean()
    monthly["rolling_std_3"] = monthly["monthly_revenue"].shift(1).rolling(3).std().fillna(0)

    feature_cols = ["revenue_lag_1", "revenue_lag_2", "revenue_lag_3", "rolling_mean_3", "rolling_std_3"]
    monthly = monthly.dropna(subset=["revenue_lag_1", "revenue_lag_2", "revenue_lag_3"])

    X = monthly[feature_cols].reset_index(drop=True)
    y = monthly["monthly_revenue"].reset_index(drop=True)
    return X, y


def engineer_churn(
    df: pd.DataFrame,
    scaler: Optional[StandardScaler] = None,
) -> Tuple[np.ndarray, np.ndarray, StandardScaler]:
    work_df = df.copy()

    base_numeric = ["tenure", "MonthlyCharges", "TotalCharges"]
    missing_base = [col for col in base_numeric if col not in work_df.columns]
    if missing_base:
        raise ValueError(f"missing required churn feature columns: {missing_base}")

    work_df["TotalCharges"] = pd.to_numeric(work_df["TotalCharges"], errors="coerce").fillna(0.0)

    excluded = {"Churn", "CustomerID", "customerID"}
    optional_cats = [
        col for col in work_df.columns
        if col not in excluded and col not in base_numeric and work_df[col].dtype == "object"
    ]

    features_df = work_df[base_numeric + optional_cats].copy()
    if optional_cats:
        features_df = pd.get_dummies(features_df, columns=optional_cats, drop_first=False)

    # use saved scaler at inference; fit a new one at training time
    if scaler is None:
        scaler = StandardScaler()
        features_df[base_numeric] = scaler.fit_transform(features_df[base_numeric])
    else:
        features_df[base_numeric] = scaler.transform(features_df[base_numeric])

    X = features_df.to_numpy(dtype=float)

    # Churn column is absent at inference time — return dummy zeros for y
    if "Churn" not in work_df.columns:
        return X, np.zeros(len(X), dtype=int), scaler

    y = work_df["Churn"].astype(str).str.strip().str.lower().map({"yes": 1, "no": 0})
    if y.isna().any():
        raise ValueError("Churn column must contain only Yes/No values")

    return X, y.to_numpy(dtype=int), scaler


def engineer_credit(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
    work_df = df.copy()
    if "Class" not in work_df.columns:
        raise ValueError("missing required credit target column: Class")

    feature_cols = [col for col in work_df.columns if col != "Class"]
    features_df = work_df[feature_cols].select_dtypes(include=[np.number]).copy()
    if features_df.empty:
        raise ValueError("credit dataset did not produce numeric feature columns")

    return features_df.to_numpy(dtype=float), work_df["Class"].to_numpy(dtype=int)


def train_test_split_data(
    X: np.ndarray, y: np.ndarray
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    return train_test_split(X, y, train_size=TRAIN_SPLIT, random_state=RANDOM_SEED)
