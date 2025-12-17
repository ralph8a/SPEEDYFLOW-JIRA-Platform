"""Kanban blueprint: provides aggregated column view of issues grouped by status.
Endpoint:
  GET /api/kanban?desk_id=<id>&queue_id=<id or all>&include_empty=false
Design:
- Uses existing core.api.load_queue_issues (same source as /api/issues) to obtain DataFrame.
- Bilingual column detection for status field ("status" / "estado").
- Returns lightweight JSON (no HTML) so frontend can render.
- Applies existing SLA enrichment so cards have uniform data.
- No persistent caching here initially; relies on upstream caching strategies.
"""
from flask import Blueprint, request
from typing import Any, Dict, List
import logging
from utils.decorators import handle_api_error, json_response, log_request as log_decorator, require_credentials, rate_limited
try:  # pragma: no cover
    from core.api import load_queue_issues  # type: ignore
except ImportError:  # pragma: no cover
    def load_queue_issues(*_a, **_k):  # type: ignore
        return None, 'core.api unavailable'
try:  # pragma: no cover
    from core.helpers import find_column  # type: ignore
except ImportError:  # pragma: no cover
    def find_column(df, *names):  # type: ignore
        for n in names:
            if n in getattr(df, 'columns', []):
                return n
        return None
logger = logging.getLogger(__name__)
kanban_bp = Blueprint('kanban', __name__)
# In-memory cache with simple TTL for kanban aggregations to avoid recomputing grouping
# Keyed by (desk_id, queue_id, include_empty) -> { 'expires': ts, 'data': {...} }
_KANBAN_CACHE: Dict[str, Dict[str, Any]] = {}
_KANBAN_DEFAULT_TTL_SECONDS = 900  # 15 minutes aligns with issue cache TTL
@kanban_bp.route('/api/kanban', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=60, period=60)  # allow more calls (lightweight aggregation)
@require_credentials
def api_get_kanban():
    """Return issues grouped by status for kanban column rendering.
    Query Params:
        desk_id: required service desk identifier
        queue_id: queue identifier or 'all'
        include_empty: if 'true', include columns with zero issues
    Response Shape:
        {
          "columns": [
             {"status": "In Progress", "name": "In Progress", "count": 3, "issues": [...]},
             ...
          ],
          "total_issues": 17,
          "desk_id": "123",
          "queue_id": "46",
          "statuses": ["To Do", "In Progress", "Done"],
          "empty_columns": 0
        }
    """
    desk_id = request.args.get('desk_id')
    queue_id = request.args.get('queue_id', 'all')
    include_empty = request.args.get('include_empty', 'false').lower() == 'true'
    if not desk_id:
        raise ValueError('desk_id parameter is required')
    cache_key = f"{desk_id}:{queue_id}:{include_empty}"
    # Serve from cache if valid
    cached = _KANBAN_CACHE.get(cache_key)
    if cached and cached['expires'] > __import__('time').time():
        payload = dict(cached['data'])
        payload['cached'] = True
        return payload
    df, error = load_queue_issues(desk_id, queue_id)
    if error:
        logger.warning(f"Kanban queue load error: {error}")
    if df is None or getattr(df, 'empty', True):
        payload = {
            'columns': [],
            'total_issues': 0,
            'desk_id': desk_id,
            'queue_id': queue_id,
            'statuses': [],
            'empty_columns': 0,
            'empty': True,
        }
        _KANBAN_CACHE[cache_key] = {'expires': __import__('time').time() + _KANBAN_DEFAULT_TTL_SECONDS, 'data': payload}
        return payload
    # Detect status column bilingual naming
    status_col = find_column(df, 'status', 'estado') or 'status'
    # Basic enrichment reusing issues blueprint SLA logic
    raw_records: List[Dict[str, Any]] = list(df.to_dict('records'))  # type: ignore
    try:
        from api.blueprints.issues import _batch_inject_sla  # type: ignore
        records = _batch_inject_sla(raw_records)
    except Exception:
        records = raw_records
    # Group records by status value
    columns_map: Dict[str, List[Dict[str, Any]]] = {}
    for rec in records:
        status_val = rec.get(status_col) or rec.get('status') or rec.get('estado') or 'UNKNOWN'
        columns_map.setdefault(status_val, []).append(rec)
    # Sort statuses (preserving a common order if present)
    # Order matches actual MSM project workflow
    order_hint = [
        'Backlog', 'To Do', 'Todo', 'Pending', 'Pendiente',
        'En Progreso', 'In Progress', 'En curso', 'Doing',
        'En espera', 'En espera de cliente', 'Waiting for customer',
        'Review', 'QA', 'Testing',
        'Validación de solución', 'Solution validation', 'Validation',
        'Blocked', 'Bloqueado',
        'Cancelado', 'Cancelled', 'Canceled',
        'Done', 'Cerrado', 'Closed', 'Resolved', 'Resuelto'
    ]
    def status_sort_key(s: str) -> int:
        # Case-insensitive matching for better flexibility
        s_lower = s.lower()
        for idx, hint in enumerate(order_hint):
            if hint.lower() == s_lower:
                return idx
        return len(order_hint) + hash(s) % 1000
    sorted_statuses = sorted(columns_map.keys(), key=status_sort_key)
    columns: List[Dict[str, Any]] = []
    empty_columns = 0
    for status_val in sorted_statuses:
        issues_list = columns_map.get(status_val, [])
        if not include_empty and not issues_list:
            empty_columns += 1
            continue
        columns.append({
            'status': status_val,
            'name': status_val,
            'count': len(issues_list),
            'issues': issues_list,
        })
    total = sum(col['count'] for col in columns)
    payload = {
        'columns': columns,
        'total_issues': total,
        'desk_id': desk_id,
        'queue_id': queue_id,
        'statuses': sorted_statuses,
        'empty_columns': empty_columns,
    }
    _KANBAN_CACHE[cache_key] = {'expires': __import__('time').time() + _KANBAN_DEFAULT_TTL_SECONDS, 'data': payload}
    return payload
