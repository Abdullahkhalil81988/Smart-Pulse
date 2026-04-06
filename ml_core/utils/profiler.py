import time
import tracemalloc
from typing import Any, Callable, Dict


def profile(func: Callable[..., Any], *args: Any) -> Dict[str, Any]:
    # start high-resolution wall-clock timing before the function executes
    start_time = time.perf_counter()
    # start tracemalloc to capture python-level memory allocations during this call
    tracemalloc.start()
    # run the target function and keep its return value for the caller
    result = func(*args)
    # read current and peak bytes; we care about peak as worst-case memory usage
    _, peak_bytes = tracemalloc.get_traced_memory()
    # stop tracing to avoid leaking profiler state into later calls
    tracemalloc.stop()
    # end timing after execution so we measure total function runtime
    end_time = time.perf_counter()

    # convert bytes to megabytes for easier reading in logs and dashboards
    memory_mb = peak_bytes / (1024 * 1024)
    # package metrics and original result together for downstream use
    return {
        "time_sec": end_time - start_time,
        "memory_mb": memory_mb,
        "result": result,
    }


def print_benchmark(model_name: str, profile_result: Dict[str, Any]) -> None:
    # standardize benchmark output so logs are easy to scan across models
    print(
        f"[{model_name}] time: {profile_result['time_sec']:.3f}s | "
        f"memory: {profile_result['memory_mb']:.1f}MB"
    )
