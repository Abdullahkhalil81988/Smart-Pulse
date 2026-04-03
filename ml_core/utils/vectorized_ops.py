import numpy as np


def normalize(arr: np.ndarray) -> np.ndarray:
    # convert once to float array so integer division and truncation never happen
    arr = np.asarray(arr, dtype=float)
    # find min and max in vectorized form for the whole array
    arr_min = np.min(arr)
    arr_max = np.max(arr)
    # compute denominator once to avoid recomputing in the expression
    denom = arr_max - arr_min
    # guard constant arrays because min-max normalization would divide by zero
    if denom == 0:
        # return zeros with the same shape because every value maps to the same point
        return np.zeros_like(arr, dtype=float)
    # vectorized scaling maps all values into the [0, 1] interval
    return (arr - arr_min) / denom


def compute_revenue(quantity_arr: np.ndarray, price_arr: np.ndarray) -> np.ndarray:
    # cast both inputs to arrays so multiplication is broadcasted element-wise by numpy
    quantity_arr = np.asarray(quantity_arr, dtype=float)
    price_arr = np.asarray(price_arr, dtype=float)
    # vectorized multiply computes revenue per row without python loops
    return np.multiply(quantity_arr, price_arr)


def flag_outliers(arr: np.ndarray, threshold: float = 3.0) -> np.ndarray:
    # cast to float so mean/std and z-scores are numerically stable
    arr = np.asarray(arr, dtype=float)
    # compute mean and std once across the full vector
    mean = np.mean(arr)
    std = np.std(arr)
    # avoid divide-by-zero when all values are identical
    if std == 0:
        # no variation means no value can be an outlier under z-score logic
        return np.zeros(arr.shape, dtype=bool)
    # vectorized z-score computation for every element at once
    z_scores = (arr - mean) / std
    # abs(z) > threshold marks values that are far from the center
    return np.abs(z_scores) > threshold


def safe_divide(a: np.ndarray, b: np.ndarray, fill: float = 0.0) -> np.ndarray:
    # coerce inputs to float arrays for consistent numeric behavior
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    # prefill output so zero-denominator positions already contain fallback values
    out = np.full(np.broadcast_shapes(a.shape, b.shape), fill, dtype=float)
    # numpy writes division results only where denominator is non-zero
    return np.divide(a, b, out=out, where=b != 0)
