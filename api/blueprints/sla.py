"""SLA blueprint: real SLA retrieval using pre-calculated cache with fallback.

Endpoints:
  GET /api/issues/<issue_key>/sla        → Detailed SLA object
  GET /api/sla/health                    → Cache health summary

Data source: sla_data_cache.json (generated offline). If a ticket
is not found or cache missing, we fallback to priority-based default SLA.
"""
from flask import Blueprint
import logging
import json
import os
from datetime import datetime, UTC
from typing import Dict, Any
from utils.decorators import handle_api_error, json_response, log_request as log_decorator, require_credentials

logger = logging.getLogger(__name__)

sla_bp = Blueprint('sla', __name__)

_SLA_CACHE: Dict[str, Any] = {}
_SLA_SUMMARY: Dict[str, Any] = {}
_SLA_CACHE_LOADED: bool = False
_CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'sla_data_cache.json')

def _load_cache_once() -> None:
    global _SLA_CACHE_LOADED, _SLA_CACHE, _SLA_SUMMARY
    if _SLA_CACHE_LOADED:
        return
    if os.path.exists(_CACHE_FILE):
        try:
            with open(_CACHE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            _SLA_CACHE = data.get('by_ticket', {})
            _SLA_SUMMARY = data.get('summary', {})
            _SLA_CACHE_LOADED = True
            logger.info(f"[SLA] Cache loaded: {_SLA_SUMMARY.get('total_tickets', len(_SLA_CACHE))} tickets")
        except Exception as e:
            logger.warning(f"[SLA] Failed to load cache: {e}")
    else:
        logger.info("[SLA] Cache file not found; using defaults")

def _format_minutes(minutes: int) -> str:
    hours = minutes // 60
    mins = minutes % 60
    if hours > 0:
        return f"{hours} h {mins} m" if mins else f"{hours} h"
    return f"{mins} m"

def _default_sla(issue_key: str, priority: str = 'Medium') -> Dict[str, Any]:
    goal_map = {
        'CRITICAL': 240,
        'HIGHEST': 240,
        'HIGH': 480,
        'MEDIUM': 480,
        'LOW': 1440,
        'LOWEST': 1440,
    }
    goal_minutes = goal_map.get(priority.upper(), 480)
    return {
        'issue_key': issue_key,
        'retrieved_at': datetime.now(UTC).isoformat(),
        'sla_name': f'Default SLA - {priority}',
        'goal_minutes': goal_minutes,
        'goal_duration': _format_minutes(goal_minutes),
        'cycles': [
            {
                'cycle_number': 1,
                'elapsed_time': '00:00:00',
                'remaining_time': _format_minutes(goal_minutes),
                'breached': False,
                'status': 'ongoing'
            }
        ],
        'total_cycles': 1,
        'has_breach': False,
        'is_default': True,
        'source': 'default_priority'
    }

def _cache_sla_to_cycles(ticket_key: str, raw: Dict[str, Any]) -> Dict[str, Any]:
    goal_label = raw.get('goal', 'N/A')
    # Parse hours from label if possible (e.g. "24 h")
    goal_minutes = 0
    try:
        if isinstance(goal_label, str) and 'h' in goal_label:
            hours_part = goal_label.split('h')[0].strip()
            goal_minutes = int(hours_part) * 60
    except Exception:
        pass
    return {
        'issue_key': ticket_key,
        'retrieved_at': datetime.now(UTC).isoformat(),
        'sla_name': 'Cached SLA',
        'goal_minutes': goal_minutes or None,
        'goal_duration': goal_label,
        'cycles': [
            {
                'cycle_number': 1,
                'elapsed_time': raw.get('elapsed_time', '00:00:00'),
                'remaining_time': raw.get('remaining_time', '00:00:00'),
                'breached': raw.get('breached', False),
                'status': raw.get('status', 'unknown')
            }
        ],
        'total_cycles': 1,
        'has_breach': bool(raw.get('breached', False)),
        'is_default': False,
        'source': 'cache'
    }

def _get_issue_sla(issue_key: str) -> Dict[str, Any]:
    _load_cache_once()
    raw = _SLA_CACHE.get(issue_key)
    if raw:
        return _cache_sla_to_cycles(issue_key, raw)
    # Fallback default SLA (priority inference omitted due to limited data)
    return _default_sla(issue_key)

@sla_bp.route('/api/issues/<issue_key>/sla', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_issue_sla(issue_key: str):
    return _get_issue_sla(issue_key)

@sla_bp.route('/api/sla/health', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def api_sla_health():  # no credentials needed for simple health
    _load_cache_once()
    return {
        'cache_loaded': _SLA_CACHE_LOADED,
        'tickets_indexed': len(_SLA_CACHE),
        'summary': _SLA_SUMMARY,
        'cache_file_exists': os.path.exists(_CACHE_FILE)
    }
