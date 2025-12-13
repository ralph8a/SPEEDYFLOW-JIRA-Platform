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
    limit = request.args.get('limit', type=int, default=200)  # Default: 200 tickets max
    offset = request.args.get('offset', type=int, default=0)  # Pagination offset
    
    if not desk_id:
        raise ValueError('desk_id parameter is required')
    
    # Enforce reasonable limits to prevent timeout
    if limit > 500:
        limit = 500
        logger.warning(f"Limit capped at 500 tickets (requested: {limit})")
    
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
        # Clean DataFrame before conversion: replace NaN/None with empty strings
        df = df.fillna('')
        raw_records: List[Dict[str, Any]] = list(df.to_dict('records'))  # type: ignore
        # Sanitize records for JSON serialization
        raw_records = _sanitize_for_json(raw_records)
        records = _batch_inject_sla(raw_records)
        
        # Optimize payload: Remove large 'fields' object for list view (keep only essential data)
        # The 'fields' object can be 10-50KB per issue, removing it reduces payload by 80-90%
        records = _optimize_payload(records)
        
        # Debug: Log first record to verify customfields are present
        if records and len(records) > 0:
            first_record = records[0]
            logger.info(f"🔍 First API record keys: {list(first_record.keys())}")
            logger.info(f"   customfield_10111: {first_record.get('customfield_10111')}")
            logger.info(f"   customfield_10125: {first_record.get('customfield_10125')}")
            logger.info(f"   customfield_10141: {first_record.get('customfield_10141')}")
            logger.info(f"   customfield_10142: {first_record.get('customfield_10142')}")
            logger.info(f"   customfield_10143: {first_record.get('customfield_10143')}")
    
    # Apply pagination (slice records)
    total_records = len(records)
    paginated_records = records[offset:offset + limit]
    has_more = (offset + limit) < total_records
    
    logger.info(f"📄 Pagination: offset={offset}, limit={limit}, total={total_records}, returned={len(paginated_records)}, hasMore={has_more}")
    
    return {
        'data': paginated_records,
        'count': len(paginated_records),
        'total': total_records,
        'hasMore': has_more,
        'offset': offset,
        'limit': limit
    }


def _inject_sla_stub(issue: dict) -> dict:
    """Attach SLA data to issue using simplified SLA service"""
    if not isinstance(issue, dict) or 'sla_agreements' in issue:
        return issue
    
    issue_key = issue.get('key') or issue.get('issue_key')
    if not issue_key:
        return issue
    
    try:
        from api.blueprints.sla import _get_issue_sla
        sla_data = _get_issue_sla(issue_key)
        if sla_data:
            issue['sla_agreements'] = sla_data
    except Exception:
        # Graceful fallback - issue remains without SLA data
        pass
    
    return issue


def _sanitize_for_json(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sanitize records for JSON serialization (remove NaN, convert dates, etc.)"""
    import math
    import datetime
    
    def sanitize_value(value):
        # Handle NaN/None
        if value is None:
            return ''
        if isinstance(value, float) and math.isnan(value):
            return ''
        # Handle datetime objects
        if isinstance(value, (datetime.datetime, datetime.date)):
            return value.isoformat()
        # Handle nested dicts
        if isinstance(value, dict):
            return {k: sanitize_value(v) for k, v in value.items()}
        # Handle lists
        if isinstance(value, list):
            return [sanitize_value(item) for item in value]
        # Return primitive types as-is
        return value
    
    return [
        {k: sanitize_value(v) for k, v in record.items()}
        for record in records
    ]


def _optimize_payload(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Optimize payload by removing large unnecessary fields.
    Reduces response size by 80-90% for large queues.
    
    Strategy:
    - Remove the entire 'fields' object (10-50KB per issue)
    - Keep only essential top-level fields
    - Keep all customfield_* for functionality
    """
    optimized = []
    
    # Essential fields to keep at top level
    essential_fields = {
        'key', 'summary', 'status', 'severity', 'assignee', 'assignee_id',
        'created', 'updated', 'resolved', 'description', 'issue_type',
        'labels', 'components', 'sla_agreements', 'last_real_change',
        'watcher_count', 'is_watching', 'comment_count', 'reporter', 'creator'
    }
    
    for record in records:
        optimized_record = {}
        
        # Copy essential fields
        for key, value in record.items():
            # Keep essential fields or customfield_* fields
            if key in essential_fields or key.startswith('customfield_'):
                optimized_record[key] = value
        
        # Remove the large 'fields' object entirely
        # Frontend doesn't need it for list/kanban view
        # It will be fetched separately when opening issue details
        
        optimized.append(optimized_record)
    
    # Log size reduction
    if records and optimized:
        original_keys = len(records[0].keys())
        optimized_keys = len(optimized[0].keys())
        logger.info(f"⚡ Payload optimized: {original_keys} → {optimized_keys} fields per issue")
    
    return optimized


def _batch_inject_sla(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Batch SLA enrichment using simplified SLA service"""
    if not records:
        return records
    
    try:
        return [_inject_sla_stub(record) for record in records]
    except Exception as e:
        logger.warning(f"Batch SLA enrichment failed: {e}")
        return records


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
        from utils.db import create_notification
        import json
        
        data = request.get_json() or {}
        fields = data.get('fields', {})
        
        if not fields:
            return {'error': 'No fields provided to update'}, 400
        
        client = get_api_client()
        
        # Get current issue state before update
        issue_url = f"{client.site}/rest/api/2/issue/{issue_key}"
        old_issue = _make_request("GET", issue_url, client.headers)
        
        old_assignee = old_issue.get('fields', {}).get('assignee', {})
        old_assignee_id = old_assignee.get('accountId') if old_assignee else None
        
        # Update issue
        _make_request("PUT", issue_url, client.headers, json={"fields": fields})
        
        logger.info(
            f"✅ Updated issue {issue_key} fields: "
            f"{list(fields.keys())}"
        )
        
        # Check if assignee changed
        if 'assignee' in fields:
            new_assignee = fields.get('assignee', {})
            new_assignee_id = new_assignee.get('accountId') if new_assignee else None
            
            # Create notification if assignee changed and there's a new assignee
            if new_assignee_id and new_assignee_id != old_assignee_id:
                from api.blueprints.notifications import broadcast_notification
                
                issue_summary = old_issue.get('fields', {}).get('summary', '')
                
                # Get the user who made the change (from auth)
                from utils.config import config
                assigner_email = config.jira.email
                
                metadata_json = json.dumps({
                    'issue_summary': issue_summary,
                    'assigner': assigner_email,
                    'previous_assignee': old_assignee.get('displayName') if old_assignee else 'Unassigned'
                })
                
                message = f"assigned {issue_key} to you"
                
                rec = create_notification(
                    ntype='assignment',
                    message=message,
                    severity='info',
                    issue_key=issue_key,
                    user=assigner_email,
                    action='assigned',
                    metadata=metadata_json
                )
                
                # Broadcast real-time
                broadcast_notification(rec)
                
                logger.info(f"📬 Created assignment notification for {new_assignee_id}")
        
        return {
            'success': True,
            'issue_key': issue_key,
            'updated_fields': list(fields.keys())
        }
        
    except Exception as e:
        logger.error(f"Error updating issue {issue_key}: {e}")
        return {'error': str(e), 'issue_key': issue_key}, 500


@issues_bp.route('/api/search/issues', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=20, period=60)
@require_credentials
def api_search_issues():
    """
    Search issues using JQL query
    
    GET /api/search/issues?jql=assignee=currentUser()&maxResults=5
    
    Returns:
        {
            'issues': [...],
            'total': int,
            'maxResults': int,
            'startAt': int
        }
    """
    from utils.api_migration import get_api_client
    
    jql = request.args.get('jql', '')
    max_results = request.args.get('maxResults', type=int, default=50)
    start_at = request.args.get('startAt', type=int, default=0)
    
    if not jql:
        raise ValueError('jql parameter is required')
    
    # Limit maxResults to prevent abuse
    max_results = min(max_results, 100)
    
    try:
        client = get_api_client()
        
        # Search using JIRA API (uses /rest/api/2/search)
        response = client.search_issues(
            jql=jql,
            fields=['key', 'summary', 'status', 'assignee', 'reporter', 'created', 'updated', 'priority', 'issuetype'],
            max_results=max_results,
            start_at=start_at
        )
        
        logger.info(f"🔍 JQL search: '{jql}' returned {len(response.get('issues', []))} results")
        
        return {
            'issues': response.get('issues', []),
            'total': response.get('total', 0),
            'maxResults': response.get('maxResults', max_results),
            'startAt': response.get('startAt', start_at)
        }
        
    except Exception as e:
        logger.error(f"Error searching issues with JQL '{jql}': {e}")
        return {'error': str(e), 'jql': jql}, 500
