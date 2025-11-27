#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Retry utilities for API requests
"""
import functools
import time
from typing import Callable, Any, Optional
import logging

logger = logging.getLogger(__name__)

def with_retry(
    max_retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,)
) -> Callable:
    """Retry decorator with exponential backoff"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            retries = 0
            current_delay = delay
            
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    retries += 1
                    if retries == max_retries:
                        raise e
                    
                    logger.warning(
                        f"Attempt {retries}/{max_retries} failed: {str(e)}. "
                        f"Retrying in {current_delay} seconds..."
                    )
                    
                    time.sleep(current_delay)
                    current_delay *= backoff
            
            return None
        return wrapper
    return decorator