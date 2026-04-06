from typing import Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from ml_core.config import RANDOM_SEED, TRAIN_SPLIT


def engineer_retail(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    # copy input so feature work never mutates the caller's dataframe
    work_df = df.copy()

    # parse invoice dates to datetime so monthly grouping is reliable
    work_df["InvoiceDate"] = pd.to_datetime(work_df["InvoiceDate"], errors="coerce")
    # drop rows where dates failed parsing because they cannot be placed on a timeline
    work_df = work_df.dropna(subset=["InvoiceDate"])

    # compute row-level revenue first to keep the monthly rollup simple and explicit
    work_df["revenue"] = work_df["Quantity"] * work_df["UnitPrice"]

    # bucket to month start so all transactions in a month collapse into one point
    work_df["month"] = work_df["InvoiceDate"].dt.to_period("M").dt.to_timestamp()

    # aggregate monthly totals as the target signal for forecasting
    monthly = (
        work_df.groupby("month", as_index=False)["revenue"]
        .sum()
        .rename(columns={"revenue": "monthly_revenue"})
        .sort_values("month")
    )

    # build lag features so the model learns from previous revenue history
    monthly["revenue_lag_1"] = monthly["monthly_revenue"].shift(1)
    monthly["revenue_lag_2"] = monthly["monthly_revenue"].shift(2)
    monthly["revenue_lag_3"] = monthly["monthly_revenue"].shift(3)

    # drop first rows with incomplete lag history because they are not trainable
    monthly = monthly.dropna(subset=["revenue_lag_1", "revenue_lag_2", "revenue_lag_3"])

    # return lag matrix and target vector in aligned index order
    X = monthly[["revenue_lag_1", "revenue_lag_2", "revenue_lag_3"]].reset_index(drop=True)
    y = monthly["monthly_revenue"].reset_index(drop=True)
    return X, y


def engineer_churn(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, StandardScaler]:
    # copy input so this transformation pipeline is side-effect free
    work_df = df.copy()

    # keep core numeric predictors required by the contract
    base_numeric = ["tenure", "MonthlyCharges", "TotalCharges"]
    missing_base = [col for col in base_numeric if col not in work_df.columns]
    if missing_base:
        raise ValueError(f"missing required churn feature columns: {missing_base}")

    # collect optional categorical predictors if they exist in the incoming payload
    excluded = {"Churn", "CustomerID", "customerID"}
    optional_cats = [
        col
        for col in work_df.columns
        if col not in excluded and col not in base_numeric and work_df[col].dtype == "object"
    ]

    # assemble feature frame with required numeric fields plus optional categories
    feature_cols = base_numeric + optional_cats
    features_df = work_df[feature_cols].copy()

    # one-hot encode categoricals so linear models can consume them
    if optional_cats:
        features_df = pd.get_dummies(features_df, columns=optional_cats, drop_first=False)

    # fit scaler on required numeric columns to keep them on comparable ranges
    scaler = StandardScaler()
    features_df[base_numeric] = scaler.fit_transform(features_df[base_numeric])

    # encode churn labels to binary so metrics and classifiers work consistently
    if "Churn" not in work_df.columns:
        raise ValueError("missing required target column: Churn")
    y = (
        work_df["Churn"]
        .astype(str)
        .str.strip()
        .str.lower()
        .map({"yes": 1, "no": 0})
    )
    if y.isna().any():
        raise ValueError("Churn column must contain only Yes/No values")

    # return dense model-ready arrays plus fitted scaler for reuse in inference
    X = features_df.to_numpy(dtype=float)
    return X, y.to_numpy(dtype=int), scaler


def engineer_credit(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
    # copy input so feature extraction never mutates caller-owned data
    work_df = df.copy()

    # require target column because this path is strictly for supervised fraud training
    if "Class" not in work_df.columns:
        raise ValueError("missing required credit target column: Class")

    # keep all numeric predictors except target to match kaggle credit dataset schema
    feature_cols = [col for col in work_df.columns if col != "Class"]
    features_df = work_df[feature_cols].select_dtypes(include=[np.number]).copy()
    if features_df.empty:
        raise ValueError("credit dataset did not produce numeric feature columns")

    # return dense arrays for model training and evaluation
    X = features_df.to_numpy(dtype=float)
    y = work_df["Class"].to_numpy(dtype=int)
    return X, y


def train_test_split_data(
    X: np.ndarray, y: np.ndarray
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    # enforce global reproducibility and split ratio from central config
    return train_test_split(
        X,
        y,
        train_size=TRAIN_SPLIT,
        random_state=RANDOM_SEED,
    )
