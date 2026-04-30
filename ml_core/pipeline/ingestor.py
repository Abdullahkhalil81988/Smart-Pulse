import logging
from typing import Dict, List

import pandas as pd

logger = logging.getLogger(__name__)


def _find_customer_id_column(df: pd.DataFrame) -> str:
    if "CustomerID" in df.columns:
        return "CustomerID"
    if "customerID" in df.columns:
        return "customerID"
    raise ValueError("missing required customer id column: expected 'CustomerID' or 'customerID'")


def _validate_columns(df: pd.DataFrame, required_columns: List[str]) -> None:
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"missing required columns: {missing}")


def _log_drop(reason: str, before: int, after: int) -> None:
    dropped = before - after
    if dropped > 0:
        logger.info("dropped %s rows: %s", dropped, reason)


def load_csv(filepath: str, dataset_type: str) -> pd.DataFrame:
    df = pd.read_csv(filepath)
    dataset_type = dataset_type.strip().lower()

    if dataset_type not in {"retail", "churn", "credit"}:
        raise ValueError("dataset_type must be one of 'retail', 'churn', or 'credit'")

    if dataset_type == "retail":
        alias_map = {"Customer ID": "CustomerID", "Unit Price": "UnitPrice", "Price": "UnitPrice"}
        present = {k: v for k, v in alias_map.items() if k in df.columns}
        if present:
            df = df.rename(columns=present)

    customer_id_col = None
    if dataset_type in {"retail", "churn"}:
        customer_id_col = _find_customer_id_column(df)

    required_by_type: Dict[str, List[str]] = {
        "retail": ["InvoiceDate", "Quantity", "UnitPrice", customer_id_col, "Country"],
        "churn":  ["tenure", "MonthlyCharges", "TotalCharges", "Churn", customer_id_col],
        "credit": ["Time", "Amount", "Class"],
    }
    _validate_columns(df, required_by_type[dataset_type])

    if dataset_type in {"retail", "churn"}:
        before = len(df)
        df = df.dropna(subset=[customer_id_col])
        _log_drop("missing customer id", before, len(df))

    if dataset_type == "retail":
        before = len(df)
        df = df[(df["Quantity"] > 0) & (df["UnitPrice"] > 0)]
        _log_drop("non-positive quantity or unit price", before, len(df))

        before = len(df)
        df = df.dropna(subset=["InvoiceDate", "Quantity", "UnitPrice"])
        _log_drop("missing core retail fields", before, len(df))

    elif dataset_type == "churn":
        df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")
        missing_tc = int(df["TotalCharges"].isna().sum())
        if missing_tc > 0:
            median_tc = float(df["TotalCharges"].median())
            df["TotalCharges"] = df["TotalCharges"].fillna(median_tc)
            logger.info("filled %s TotalCharges nulls with median %.4f", missing_tc, median_tc)

        before = len(df)
        df = df.dropna(subset=["tenure", "MonthlyCharges", "Churn"])
        _log_drop("missing core churn fields", before, len(df))

    else:
        before = len(df)
        df = df.dropna(subset=["Time", "Amount", "Class"])
        _log_drop("missing core credit fields", before, len(df))

        before = len(df)
        df = df.drop_duplicates()
        _log_drop("duplicate credit rows", before, len(df))

    return df.reset_index(drop=True)
