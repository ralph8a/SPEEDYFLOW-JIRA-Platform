#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Decorators - Common decorators for API handlers
Centralizes error handling, parameter validation, and logging
"""

import logging
from functools import wraps
from flask import request, jsonify
from datetime import datetime
import time

# In-memory rate limit state: { (identifier, path): [count, window_start_ts] }
_RATE_LIMIT_STATE: dict[tuple[str, str], list] = {}

logger = logging.getLogger(__name__)

def handle_api_error(f):
    """
    Decorator to handle API errors consistently
    - Wraps all exceptions in standardized response
    - Logs errors automatically
    - Returns consistent error format
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            logger.warning(f"Configuration error in {f.__name__}: {e}")
            return jsonify({
                'success': False,
                'error': f"Configuration error: {str(e)}",
                'code': 'CONFIG_ERROR',
                'timestamp': datetime.now().isoformat()
            }), 400
        except KeyError as e:
            logger.warning(f"Missing key in {f.__name__}: {e}")
            return jsonify({
                'success': False,
                'error': f"Missing required data: {str(e)}",
                'code': 'MISSING_DATA',
                'timestamp': datetime.now().isoformat()
            }), 400
        except Exception as e:
            logger.error(f"Error in {f.__name__}: {e}", exc_info=True)
            return jsonify({
                'success': False,
                'error': str(e),
                'code': 'INTERNAL_ERROR',
                'timestamp': datetime.now().isoformat()
            }), 500
    return decorated_function

def require_params(*param_names):
    """
    Decorator to validate required query/form parameters
    Usage:
        @require_params('desk_id', 'queue_id')
        def my_handler():
            desk_id = request.args.get('desk_id')  # Already validated
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            missing = []
            for param in param_names:
                if not request.args.get(param):
                    missing.append(param)
            
            if missing:
                return jsonify({
                    'success': False,
                    'error': f"Missing required parameters: {', '.join(missing)}",
                    'code': 'MISSING_PARAMS',
                    'required': missing,
                    'timestamp': datetime.now().isoformat()
                }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def log_request(level=logging.INFO):
    """
    Decorator to log API requests
    Usage:
        @log_request(level=logging.DEBUG)
        def my_handler():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            logger.log(level, f"📨 {request.method} {request.path}")
            if request.args:
                logger.log(level, f"   Query params: {dict(request.args)}")
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def json_response(f):
    """
    Decorator to ensure consistent JSON response format
    Wraps return values in success response if not already formatted
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        result = f(*args, **kwargs)
        
        # If already a tuple (response, status_code), return as-is
        if isinstance(result, tuple):
            return result
        
        # If already jsonified, return as-is
        if hasattr(result, '__class__') and 'Response' in str(result.__class__):
            return result
        
        # Otherwise wrap in success response
        return jsonify({
            'success': True,
            'data': result,
            'timestamp': datetime.now().isoformat()
        }), 200
    return decorated_function

def require_credentials(f):
    """Decorator to ensure JIRA credentials are configured.
    - Validates presence of site, email, api_token loaded via utils.common._get_credentials
    - Raises ValueError (caught by handle_api_error) if missing
    - Optionally injects credentials into function via kwargs if it accepts them
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            from utils.common import _get_credentials
            from utils.config import config
            site, email, api_token = _get_credentials(config)
        except Exception as e:
            raise ValueError(f"Unable to load JIRA credentials: {e}")
        if not (site and email and api_token):
            raise ValueError("JIRA credentials not configured (site/email/api_token missing)")
        # Inject if function expects them (duck-typing by parameter names)
        import inspect
        sig = inspect.signature(f)
        param_names = sig.parameters.keys()
        if 'site' in param_names:
            kwargs.setdefault('site', site)
        if 'email' in param_names:
            kwargs.setdefault('email', email)
        if 'api_token' in param_names:
            kwargs.setdefault('api_token', api_token)
        return f(*args, **kwargs)
    return decorated_function

def rate_limited(max_calls: int = 60, period: int = 60, identifier_header: str | None = None):
    """Fixed-window rate limiting decorator.
    Args:
        max_calls: allowed calls per period window.
        period: window length in seconds.
        identifier_header: optional header to identify client (e.g. X-API-Key).
    Behavior:
        - Key: (identifier, request.path)
        - If exceeded, returns 429 with RATE_LIMIT code JSON.
    Notes:
        - In-memory only; resets on process restart.
        - Future: migrate to Redis or token bucket for smooth limiting.
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            ident = None
            if identifier_header:
                ident = request.headers.get(identifier_header)
            if not ident:
                ident = request.remote_addr or 'unknown'
            key = (ident, request.path)
            now = time.time()
            state = _RATE_LIMIT_STATE.get(key)
            if state is None:
                _RATE_LIMIT_STATE[key] = [1, now]
            else:
                count, start_ts = state
                if now - start_ts <= period:
                    if count >= max_calls:
                        return jsonify({
                            'success': False,
                            'error': 'Rate limit exceeded',
                            'code': 'RATE_LIMIT',
                            'limit': max_calls,
                            'period': period,
                            'identifier': ident,
                            'timestamp': datetime.now().isoformat()
                        }), 429
                    state[0] = count + 1
                else:
                    _RATE_LIMIT_STATE[key] = [1, now]
            return f(*args, **kwargs)
        return wrapped
    return decorator

# Backwards compatibility wrapper: previous code used `rate_limit` with
# parameter names (max_requests, window_seconds). Normalize to new names.
def rate_limit(*args, **kwargs):  # noqa: D401 - simple adapter
    if 'max_requests' in kwargs and 'max_calls' not in kwargs:
        kwargs['max_calls'] = kwargs.pop('max_requests')
    if 'window_seconds' in kwargs and 'period' not in kwargs:
        kwargs['period'] = kwargs.pop('window_seconds')
    return rate_limited(*args, **kwargs)
