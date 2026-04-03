import logging
from typing import Dict, List

import pandas as pd


logger = logging.getLogger(__name__)


def _find_customer_id_column(df: pd.DataFrame) -> str:
    # accept either naming convention because source files are inconsistent
    if "CustomerID" in df.columns:
        return "CustomerID"
    if "customerID" in df.columns:
        return "customerID"
    raise ValueError("missing required customer id column: expected 'CustomerID' or 'customerID'")


def _validate_columns(df: pd.DataFrame, required_columns: List[str]) -> None:
    # compare expected vs present columns so errors are explicit and actionable
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"missing required columns: {missing}")


def _log_drop(reason: str, before_rows: int, after_rows: int) -> None:
    # log how many rows changed so data-quality decisions are visible in pipelines
    dropped = before_rows - after_rows
    if dropped > 0:
        logger.info("dropped %s rows: %s", dropped, reason)


def load_csv(filepath: str, dataset_type: str) -> pd.DataFrame:
    # read raw data first so all cleaning rules run on a single dataframe
    df = pd.read_csv(filepath)

    # normalize dataset_type to keep cli and api callers flexible with casing
    dataset_type = dataset_type.strip().lower()
    if dataset_type not in {"retail", "churn", "credit"}:
        raise ValueError("dataset_type must be one of 'retail', 'churn', or 'credit'")

    if dataset_type == "retail":
        # normalize known kaggle retail aliases so downstream code can use one schema
        alias_map = {
            "Customer ID": "CustomerID",
            "Unit Price": "UnitPrice",
            "Price": "UnitPrice",
        }
        # rename only columns that actually exist to keep operation idempotent
        present_aliases = {k: v for k, v in alias_map.items() if k in df.columns}
        if present_aliases:
            df = df.rename(columns=present_aliases)

    customer_id_col = None
    if dataset_type in {"retail", "churn"}:
        # resolve customer id for datasets that include customer-level records
        customer_id_col = _find_customer_id_column(df)

    # enforce dataset-specific schema before transformations run
    required_by_type: Dict[str, List[str]] = {
        "retail": ["InvoiceDate", "Quantity", "UnitPrice", customer_id_col, "Country"],
        "churn": ["tenure", "MonthlyCharges", "TotalCharges", "Churn", customer_id_col],
        "credit": ["Time", "Amount", "Class"],
    }
    _validate_columns(df, required_by_type[dataset_type])

    if dataset_type in {"retail", "churn"}:
        # remove records without customer identity because they break user-level analytics
        before = len(df)
        df = df.dropna(subset=[customer_id_col])
        _log_drop("missing customer id", before, len(df))

    if dataset_type == "retail":
        # keep only positive sales to remove returns/cancellations from revenue learning
        before = len(df)
        df = df[(df["Quantity"] > 0) & (df["UnitPrice"] > 0)]
        _log_drop("non-positive quantity or unit price", before, len(df))

        # drop nulls on core revenue fields so downstream feature math is reliable
        before = len(df)
        df = df.dropna(subset=["InvoiceDate", "Quantity", "UnitPrice"])
        _log_drop("missing core retail fields", before, len(df))
    elif dataset_type == "churn":
        # convert text/blank total charges to numeric so model input is consistent
        df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")

        # fill missing total charges with median to preserve row count without skewing extremes
        missing_before = int(df["TotalCharges"].isna().sum())
        if missing_before > 0:
            median_total = float(df["TotalCharges"].median())
            df["TotalCharges"] = df["TotalCharges"].fillna(median_total)
            logger.info("filled %s TotalCharges nulls with median %.4f", missing_before, median_total)

        # remove rows missing the other core churn fields that cannot be safely imputed here
        before = len(df)
        df = df.dropna(subset=["tenure", "MonthlyCharges", "Churn"])
        _log_drop("missing core churn fields", before, len(df))
    else:
        # drop rows with missing key credit fields before fraud model training
        before = len(df)
        df = df.dropna(subset=["Time", "Amount", "Class"])
        _log_drop("missing core credit fields", before, len(df))

        # remove exact duplicates to reduce leakage and inflated fraud metrics
        before = len(df)
        df = df.drop_duplicates()
        _log_drop("duplicate credit rows", before, len(df))

    # return cleaned frame with reset index for deterministic downstream behavior
    return df.reset_index(drop=True)
