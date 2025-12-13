# -*- coding: utf-8 -*-
"""
Common Utilities Module
Provides shared functionality across modules
"""

import requests
import streamlit as st
from streamlit.components.v1 import html as st_html
from functools import wraps
import logging
import base64
import json
from datetime import datetime, timezone
from typing import Tuple, Dict, Optional, List, Any, Union
import pandas as pd
import re
from requests.exceptions import RequestException

# Project type labels
TYPE_LABELS = {
    "software": "Software",
    "service_desk": "Service Management",
    "service management": "Service Management",
    "business": "Business",
}

logger = logging.getLogger(__name__)

# Custom exception for JIRA API errors
class JiraApiError(Exception):
    """Custom exception for JIRA API errors"""
    def __init__(self, message: str, status_code: Optional[int] = None, response: Optional[dict] = None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)

def invalidate_api_cache():
    """
    Invalidate all API-related caches.
    Should be called when authentication changes or on manual refresh.
    """
    try:
        st.cache_data.clear()
        logging.info("All API caches cleared successfully")
    except Exception as e:
        logging.error(f"Error clearing cache: {e}")

def api_error_handler(func):
    """
    Decorator to handle API errors consistently
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except requests.exceptions.RequestException as e:
            logging.error(f"API request failed: {str(e)}")
            raise RuntimeError(f"Error en la comunicación con JIRA: {str(e)}")
        except ValueError as e:
            logging.error(f"API response parsing failed: {str(e)}")
            raise RuntimeError(f"Error procesando respuesta de JIRA: {str(e)}")
        except Exception as e:
            logging.error(f"Unexpected error in API call: {str(e)}")
            raise
    return wrapper

def _safe_rerun():
    try:
        st.rerun()
    except AttributeError:
        try:
            st.experimental_rerun()
        except AttributeError:
            pass

def _normalize_url(u: str) -> str:
    """
    Normalize a URL by ensuring correct schema and removing trailing slashes
    
    Args:
        u: URL to normalize
        
    Returns:
        Normalized URL
    """
    u = (u or "").strip()
    if not u:
        return u
    if u.endswith("/"):
        u = u[:-1]
    if not (u.startswith("http://") or u.startswith("https://")):
        u = "https://" + u
    return u

def _get_credentials(config) -> Tuple[str, str, str]:
    """
    Get JIRA credentials from config
    
    Args:
        config: Config object containing JIRA settings
        
    Returns:
        Tuple of (site URL, email, API token)
    """
    site = (config.jira.site or "https://speedymovil.atlassian.net").rstrip("/")
    email = config.jira.email or ""
    api_token = config.jira.api_token or ""
    return site, email, api_token

def _get_auth_header(email: str, api_token: str) -> Dict[str, str]:
    """
    Generate Basic auth header for JIRA API
    
    Args:
        email: JIRA account email
        api_token: JIRA API token
        
    Returns:
        Dict with Authorization and Accept headers
    """
    if not email or not api_token:
        logger.warning("Missing email or api_token for JIRA auth")
        return {}

    credentials = f"{email}:{api_token}".encode("utf-8")
    encoded = base64.b64encode(credentials).decode("utf-8")
    return {
        "Authorization": f"Basic {encoded}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

def _make_request(method: str, url: str, headers: Dict[str, str], **kwargs) -> Optional[Dict]:
    """
    Make HTTP request to JIRA API
    
    Args:
        method: HTTP method (GET, POST, etc)
        url: Request URL
        headers: Request headers
        **kwargs: Additional request parameters
        
    Returns:
        JSON response data or None if request fails
        
    Note: 403 Forbidden errors (permission issues) are silently skipped
    """
    try:
        # Normalize params: convert list values (e.g., fields=['a','b']) to comma-separated strings
        params = kwargs.get('params')
        if isinstance(params, dict):
            normalized = {}
            for k, v in params.items():
                if isinstance(v, (list, tuple)):
                    normalized[k] = ",".join(map(str, v))
                else:
                    normalized[k] = v
            kwargs['params'] = normalized

        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            timeout=30,
            **kwargs
        )
        response.raise_for_status()
        try:
            return response.json()
        except ValueError:
            # Empty response or non-JSON (e.g., 204 No Content). Return None so callers can handle it.
            logging.debug(f"Non-JSON response for {method} {url}: '{response.text[:200]}'")
            return None
    except requests.exceptions.HTTPError as e:
        # Check if it's a 403 Forbidden error
        error_msg = str(e)
        if "403" in error_msg:
            # 403 errors (permission denied) are expected for some endpoints
            # Log at debug level only
            logging.debug(f"Permission denied (403) for {method} {url}")
        else:
            # Log other HTTP errors normally
            logging.error(f"Request failed: {e}")
        return None
    except requests.exceptions.RequestException as e:
        logging.error(f"Request failed: {e}")
        return None

def reproducir_beep():
    """
    Play an audio beep using Web Audio API
    
    Uses JavaScript to create a short sine wave beep sound
    with frequency 880Hz and duration 0.3s
    """
    st_html(
        """
        <script>
            (function() {
                try {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    const ctx = new AudioContext();
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.type = "sine";
                    o.frequency.value = 880;
                    o.connect(g);
                    g.connect(ctx.destination);
                    g.gain.setValueAtTime(0.0001, ctx.currentTime);
                    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
                    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
                    o.start();
                    o.stop(ctx.currentTime + 0.30);
                } catch(e) {
                    console.log(e);
                }
            })();
        </script>
        """,
        height=0
    )

def _label_tipo(type_key: Optional[str]) -> str:
    """
    Get a human readable label for an issue type
    
    Args:
        type_key: Issue type key
        
    Returns:
        Formatted type label
    """
    tk = (type_key or "").lower()
    if tk in TYPE_LABELS:
        return TYPE_LABELS[tk]
    return tk.capitalize() if tk else "N/D"

def _icono_proyecto(avatar_urls: Optional[Dict[str, str]]) -> str:
    """
    Get the best available project icon URL
    
    Args:
        avatar_urls: Dictionary of avatar URLs keyed by size
        
    Returns:
        Best available icon URL
    """
    au = avatar_urls or {}
    return au.get("24x24") or au.get("16x16") or au.get("32x32") or au.get("48x48") or ""

def find_column(df: pd.DataFrame, *names: str) -> Optional[str]:
    """
    Find first matching column name from alternatives
    
    Args:
        df: DataFrame to search in
        *names: Variable number of column names to look for
        
    Returns:
        First matching column name or None if none found
    """
    for name in names:
        if name in df.columns:
            return name
    return None

def extract_project_key(url: str) -> str:
    """
    Extract JIRA project key from queue URL or browse URL
    
    Args:
        url: URL to extract project key from
        
    Returns:
        Extracted project key or "UNKNOWN" if not found
    """
    if not url:
        return "UNKNOWN"

    # Try /projects/ pattern first (service desk)
    match = re.search(r"/projects/([A-Z0-9_]+)", url, re.IGNORECASE)
    if match:
        return match.group(1).upper()

    # Try /browse/ pattern
    match = re.search(r"/browse/([A-Z0-9_]+)", url, re.IGNORECASE)
    if match:
        return match.group(1).upper()

    # Try /jira/servicedesk/ pattern
    match = re.search(r"/servicedesk/projects/([A-Z0-9_]+)", url, re.IGNORECASE)
    if match:
        return match.group(1).upper()

    # If nothing found, try to extract from URL as last resort
    parts = url.split('/')
    for part in parts:
        if len(part) >= 2 and len(part) <= 10 and part.isupper():
            return part

    return "UNKNOWN"
