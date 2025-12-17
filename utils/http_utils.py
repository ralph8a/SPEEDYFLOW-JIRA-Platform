# -*- coding: utf-8 -*-
"""
HTTP Utilities Module
Centralized HTTP request handling and retry logic
"""
import logging
import time
from functools import wraps
from typing import Callable, Optional, Dict, Any
logger = logging.getLogger(__name__)
def retry_on_error(max_retries: int = 3, delay: float = 1.0, backoff_factor: float = 2.0):
    """
    Decorator for retrying operations on failure with exponential backoff
    Args:
        max_retries: Maximum number of retry attempts (default: 3)
        delay: Initial delay between retries in seconds (default: 1.0)
        backoff_factor: Multiplier for delay after each retry (default: 2.0)
    Returns:
        Decorated function with retry logic
    Example:
        @retry_on_error(max_retries=3, delay=1.0)
        def fetch_data():
            return api_call()
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            last_error = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_retries - 1:
                        wait_time = delay * (backoff_factor ** attempt)
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_retries} failed for {func.__name__}: {e}. "
                            f"Retrying in {wait_time:.2f}s..."
                        )
                        time.sleep(wait_time)
                    else:
                        logger.error(
                            f"All {max_retries} attempts failed for {func.__name__}: {e}"
                        )
            raise last_error
        return wrapper
    return decorator
def retry_on_http_error(
    max_retries: int = 3, 
    delay: float = 1.0,
    retry_on_status: Optional[list] = None
):
    """
    Decorator for retrying HTTP requests on specific status codes
    Args:
        max_retries: Maximum number of retry attempts
        delay: Initial delay between retries
        retry_on_status: List of HTTP status codes to retry on (default: [429, 502, 503, 504])
    Returns:
        Decorated function with HTTP-specific retry logic
    Example:
        @retry_on_http_error(retry_on_status=[429, 503])
        def api_request():
            return requests.get(url)
    """
    if retry_on_status is None:
        retry_on_status = [429, 502, 503, 504]  # Rate limit, bad gateway, service unavailable, gateway timeout
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            import requests
            last_error = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except requests.exceptions.HTTPError as e:
                    last_error = e
                    status_code = e.response.status_code if e.response else None
                    # Only retry on specific status codes
                    if status_code not in retry_on_status:
                        raise
                    if attempt < max_retries - 1:
                        wait_time = delay * (2 ** attempt)
                        logger.warning(
                            f"HTTP {status_code} error in {func.__name__}. "
                            f"Retrying in {wait_time:.2f}s... ({attempt + 1}/{max_retries})"
                        )
                        time.sleep(wait_time)
                    else:
                        logger.error(
                            f"All {max_retries} attempts failed for {func.__name__} with HTTP {status_code}"
                        )
                except Exception as e:
                    # Non-HTTP errors are re-raised immediately
                    raise
            raise last_error
        return wrapper
    return decorator
def log_api_call(level: str = "DEBUG"):
    """
    Decorator for logging API calls with timing information
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
    Returns:
        Decorated function with logging
    Example:
        @log_api_call(level="INFO")
        def fetch_issues():
            return api.get_issues()
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            func_name = func.__name__
            log_func = getattr(logger, level.lower(), logger.debug)
            log_func(f"Starting {func_name}")
            try:
                result = func(*args, **kwargs)
                elapsed = time.time() - start_time
                log_func(f"Completed {func_name} in {elapsed:.2f}s")
                return result
            except Exception as e:
                elapsed = time.time() - start_time
                logger.error(f"Failed {func_name} after {elapsed:.2f}s: {e}")
                raise
        return wrapper
    return decorator
def rate_limit(calls: int, period: float):
    """
    Decorator to rate limit function calls
    Args:
        calls: Maximum number of calls allowed
        period: Time period in seconds
    Returns:
        Decorated function with rate limiting
    Example:
        @rate_limit(calls=10, period=60)  # Max 10 calls per minute
        def api_request():
            return api.fetch()
    """
    import threading
    from collections import deque
    lock = threading.Lock()
    call_times = deque()
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            with lock:
                now = time.time()
                # Remove old calls outside the time window
                while call_times and call_times[0] < now - period:
                    call_times.popleft()
                # Check if we've exceeded the rate limit
                if len(call_times) >= calls:
                    sleep_time = period - (now - call_times[0])
                    if sleep_time > 0:
                        logger.warning(
                            f"Rate limit reached for {func.__name__}. "
                            f"Sleeping for {sleep_time:.2f}s"
                        )
                        time.sleep(sleep_time)
                        # Clean up again after sleeping
                        now = time.time()
                        while call_times and call_times[0] < now - period:
                            call_times.popleft()
                # Record this call
                call_times.append(time.time())
            return func(*args, **kwargs)
        return wrapper
    return decorator
