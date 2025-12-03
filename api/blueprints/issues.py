"""Issues blueprint: encapsulates issue-related endpoints.

Endpoints migrated from server.py:
  GET /api/issues
  GET /api/issues/<queue_id>

Future additions:
  Filtering, search, transitions POST, SLA, etc.
"""
from flask import Blueprint, request
from typing import Any, Dict, List
import logging
from utils.decorators import handle_api_error, json_response, log_request as log_decorator, require_credentials, rate_limited
from utils.config import config  # noqa: F401  (may be needed later)

try:  # pragma: no cover
    from core.api import load_queue_issues  # type: ignore
except ImportError:  # pragma: no cover
    def load_queue_issues(*_a, **_k):
        return None, 'core.api unavailable'

logger = logging.getLogger(__name__)

issues_bp = Blueprint('issues', __name__)

@issues_bp.route('/api/issues', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=30, period=60)  # broadened rate limit: listing issues
@require_credentials
def api_get_issues():
    desk_id = request.args.get('desk_id')
    queue_id = request.args.get('queue_id', 'all')
    if not desk_id:
        raise ValueError('desk_id parameter is required')
    issues_accumulated: list[dict] = []
    df, error = load_queue_issues(desk_id, queue_id)
    if error:
        logger.warning(f"Queue load error: {error}")
    if df is not None and getattr(df, 'empty', True) is False:
        raw_records: List[Dict[str, Any]] = list(df.to_dict('records'))  # type: ignore
        issues_accumulated = _batch_inject_sla(raw_records)
    return {'data': issues_accumulated, 'count': len(issues_accumulated)}

@issues_bp.route('/api/issues/<queue_id>', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=30, period=60)
@require_credentials
def api_get_issues_by_queue(queue_id):
    desk_id = request.args.get('desk_id')
    if not desk_id:
        raise ValueError('desk_id parameter is required')
    df, error = load_queue_issues(desk_id, queue_id)
    # Gracefully handle empty/no-issue condition instead of 500
    if error and 'no issues' in str(error).lower():
        logger.warning(f"Queue {queue_id} returned no issues (desk {desk_id}) -> responding with empty list")
        return {'data': [], 'count': 0, 'empty': True, 'queue_id': queue_id}
    elif error:
        # Non-empty error still propagated through decorator
        raise RuntimeError(error)
    records: list[dict] = []
    if df is not None and getattr(df, 'empty', True) is False:
        raw_records: List[Dict[str, Any]] = list(df.to_dict('records'))  # type: ignore
        records = _batch_inject_sla(raw_records)
        
        # Debug: Log first record to verify customfields are present
        if records and len(records) > 0:
            first_record = records[0]
            logger.info(f"🔍 First API record keys: {list(first_record.keys())}")
            logger.info(f"   customfield_10111: {first_record.get('customfield_10111')}")
            logger.info(f"   customfield_10125: {first_record.get('customfield_10125')}")
            logger.info(f"   customfield_10141: {first_record.get('customfield_10141')}")
            logger.info(f"   customfield_10142: {first_record.get('customfield_10142')}")
            logger.info(f"   customfield_10143: {first_record.get('customfield_10143')}")
    return {'data': records, 'count': len(records)}


def _inject_sla_stub(issue: dict) -> dict:
    """Attach SLA data to an issue record extracting real-time data from customfields.
    Falls back gracefully if SLA data not available.
    """
    if not isinstance(issue, dict):
        return issue
    if 'sla_agreements' in issue:
        return issue
    issue_key = issue.get('key') or issue.get('issue_key')
    if not issue_key:
        return issue
    
    # Extract real-time SLA data from customfields (customfield_10170, customfield_10176, etc.)
    fields = issue.get('fields', {})
    sla_cycles = []
    
    # SLA custom fields that contain ongoingCycle data
    sla_field_ids = [
        'customfield_10170',  # SLA's Incidente HUB
        'customfield_10176',  # Cierre Ticket
        'customfield_10181',  # SLA's Servicios Streaming
        'customfield_10182',  # SLA's Servicios Streaming (SR)
        'customfield_10183',  # SLA's Solicitud de CDRs
        'customfield_10184',  # SLA's Cotización Orden de Compra
        'customfield_10185',  # SLA's Errores Pruebas de Integración
        'customfield_10186',  # SLA's Actualización de SDK
        'customfield_10187',  # SLA's Splunk
        'customfield_10190',  # SLA's Soporte Aplicaciones
        'customfield_10259',  # SLA War Room
        'customfield_11957',  # Salud de Servicios
    ]
    
    for field_id in sla_field_ids:
        sla_field = fields.get(field_id)
        if not sla_field or not isinstance(sla_field, dict):
            continue
        
        ongoing = sla_field.get('ongoingCycle')
        if not ongoing:
            continue
        
        # Extract millis data
        elapsed = ongoing.get('elapsedTime', {})
        remaining = ongoing.get('remainingTime', {})
        goal = ongoing.get('goalDuration', {})
        
        cycle = {
            'sla_name': sla_field.get('name', 'Unknown SLA'),
            'goal_duration': goal.get('friendly', 'N/A'),
            'goal_minutes': goal.get('millis', 0) // 60000 if goal.get('millis') else 0,
            'elapsed_time': elapsed.get('friendly', '00:00:00'),
            'elapsed_time_millis': elapsed.get('millis', 0),
            'remaining_time': remaining.get('friendly', 'N/A'),
            'remaining_time_millis': remaining.get('millis', 0),
            'breached': ongoing.get('breached', False),
            'paused': ongoing.get('paused', False),
            'started_on': ongoing.get('startTime', {}).get('epochMillis'),
            'status': 'breached' if ongoing.get('breached') else 'ongoing'
        }
        sla_cycles.append(cycle)
    
    # If we found real-time SLA data, use it
    if sla_cycles:
        issue['sla_agreements'] = {
            'cycles': sla_cycles,
            'total_cycles': len(sla_cycles),
            'has_breach': any(c.get('breached') for c in sla_cycles),
            'source': 'real-time',
            'is_default': False,
        }
        return issue
    
    # Fallback to cache-based SLA if no real-time data
    try:
        from api.blueprints.sla import _get_issue_sla  # type: ignore
        sla = _get_issue_sla(issue_key)
        issue['sla_agreements'] = {
            'sla_name': sla.get('sla_name'),
            'goal_duration': sla.get('goal_duration'),
            'goal_minutes': sla.get('goal_minutes'),
            'cycles': sla.get('cycles', []),
            'total_cycles': sla.get('total_cycles'),
            'has_breach': sla.get('has_breach'),
            'source': sla.get('source'),
            'is_default': sla.get('is_default'),
        }
    except Exception:
        pass
    return issue


def _batch_inject_sla(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Vectorized SLA enrichment: resolves all SLA entries with one cache access.
    Falls back to per-record injection only if batch fails.
    """
    if not records:
        return records
    try:
        from api.blueprints.sla import _load_cache_once, _SLA_CACHE, _get_issue_sla  # type: ignore
        _load_cache_once()  # ensure cache is populated
        enriched: List[Dict[str, Any]] = []
        for rec in records:
            if 'sla_agreements' in rec:
                enriched.append(rec)
                continue
            key = rec.get('key') or rec.get('issue_key')
            if not key:
                enriched.append(rec)
                continue
            if key in _SLA_CACHE:
                sla = _get_issue_sla(key)
                rec['sla_agreements'] = {
                    'sla_name': sla.get('sla_name'),
                    'goal_duration': sla.get('goal_duration'),
                    'goal_minutes': sla.get('goal_minutes'),
                    'cycles': sla.get('cycles', []),
                    'total_cycles': sla.get('total_cycles'),
                    'has_breach': sla.get('has_breach'),
                    'source': sla.get('source'),
                    'is_default': sla.get('is_default'),
                }
            else:
                # Fallback default for unknown key
                sla = _get_issue_sla(key)
                rec['sla_agreements'] = {
                    'sla_name': sla.get('sla_name'),
                    'goal_duration': sla.get('goal_duration'),
                    'goal_minutes': sla.get('goal_minutes'),
                    'cycles': sla.get('cycles', []),
                    'total_cycles': sla.get('total_cycles'),
                    'has_breach': sla.get('has_breach'),
                    'source': sla.get('source'),
                    'is_default': sla.get('is_default'),
                }
            enriched.append(rec)
        return enriched
    except Exception as e:
        logger.warning(f"Batch SLA enrichment failed, falling back to per-record: {e}")
        return [_inject_sla_stub(r) for r in records]


@issues_bp.route('/api/issues/<issue_key>/activity', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=30, period=60)
@require_credentials
def api_get_issue_activity(issue_key):
    """
    Get issue activity (changelog and comments)
    
    GET /api/issues/<issue_key>/activity
    """
    try:
        from core.api import get_api_client
        from utils.common import _make_request
        
        client = get_api_client()
        
        # Obtener changelog
        changelog_url = f"{client.site}/rest/api/2/issue/{issue_key}?expand=changelog"
        changelog_response = _make_request("GET", changelog_url, client.headers)
        changelog = changelog_response.get('changelog', {}).get('histories', [])
        
        # Obtener comentarios
        comments_url = f"{client.site}/rest/api/2/issue/{issue_key}/comment"
        comments_response = _make_request("GET", comments_url, client.headers)
        comments = comments_response.get('comments', [])
        
        # Combinar y ordenar por fecha
        activity = []
        
        for entry in changelog:
            activity.append({
                'type': 'changelog',
                'created': entry.get('created'),
                'author': entry.get('author', {}).get('displayName', 'Unknown'),
                'items': entry.get('items', [])
            })
        
        for comment in comments:
            activity.append({
                'type': 'comment',
                'created': comment.get('created'),
                'author': comment.get('author', {}).get('displayName', 'Unknown'),
                'body': comment.get('body', '')
            })
        
        # Ordenar por fecha descendente
        activity.sort(key=lambda x: x.get('created', ''), reverse=True)
        
        logger.info(f"✅ Retrieved {len(activity)} activity entries for {issue_key}")
        
        return {
            'success': True,
            'issue_key': issue_key,
            'activity': activity,
            'count': len(activity)
        }
        
    except Exception as e:
        logger.error(f"Error getting activity for {issue_key}: {e}")
        return {'error': str(e), 'issue_key': issue_key}, 500


@issues_bp.route('/api/servicedesk/request/<issue_key>', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=50, period=60)
@require_credentials
def api_get_servicedesk_request(issue_key):
    """
    Get complete Service Desk request details with ALL fields
    
    GET /api/servicedesk/request/<issue_key>
    
    Returns complete issue data from both JIRA API and Service Desk API
    """
    try:
        from core.api import get_api_client
        from utils.common import _make_request
        
        client = get_api_client()
        
        # First get standard JIRA issue data
        jira_url = f"{client.site}/rest/api/2/issue/{issue_key}"
        jira_data = _make_request("GET", jira_url, client.headers)
        
        # Then try to get Service Desk specific data
        try:
            # Get Service Desk request details
            # (includes custom fields and portal data)
            sd_url = f"{client.site}/rest/servicedeskapi/request/{issue_key}"
            sd_data = _make_request("GET", sd_url, client.headers)
            
            # Get SLA data with millis
            sla_data = {}
            try:
                sla_url = (
                    f"{client.site}/rest/servicedeskapi/"
                    f"request/{issue_key}/sla"
                )
                sla_response = _make_request("GET", sla_url, client.headers)
                sla_data = sla_response.get('values', [])
            except Exception as sla_err:
                logger.debug(f"SLA data not available: {sla_err}")
            
            # Merge both datasets
            merged_data = {
                **jira_data,
                'serviceDesk': sd_data,
                'slaData': sla_data,
                'fields': {
                    **jira_data.get('fields', {}),
                    **sd_data.get('requestFieldValues', {}),
                }
            }
            
            logger.info(
                f"✅ Retrieved complete Service Desk data for {issue_key}"
            )
            return merged_data
            
        except Exception as sd_error:
            logger.warning(
                f"Service Desk API failed for {issue_key}, "
                f"using JIRA data only: {sd_error}"
            )
            return jira_data
        
    except Exception as e:
        logger.error(f"Error getting Service Desk request {issue_key}: {e}")
        return {'error': str(e), 'issue_key': issue_key}, 500


@issues_bp.route('/api/issues/<issue_key>', methods=['PUT'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=20, period=60)
@require_credentials
def api_update_issue(issue_key):
    """
    Update issue fields
    
    PUT /api/issues/<issue_key>
    Body: {"fields": {"customfield_10125": {"value": "Mayor"}}}
    """
    try:
        from core.api import get_api_client
        from utils.common import _make_request
        
        data = request.get_json() or {}
        fields = data.get('fields', {})
        
        if not fields:
            return {'error': 'No fields provided to update'}, 400
        
        client = get_api_client()
        url = f"{client.site}/rest/api/2/issue/{issue_key}"
        
        _make_request("PUT", url, client.headers, json={"fields": fields})
        
        logger.info(
            f"✅ Updated issue {issue_key} fields: "
            f"{list(fields.keys())}"
        )
        
        return {
            'success': True,
            'issue_key': issue_key,
            'updated_fields': list(fields.keys())
        }
        
    except Exception as e:
        logger.error(f"Error updating issue {issue_key}: {e}")
        return {'error': str(e), 'issue_key': issue_key}, 500
