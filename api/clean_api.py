"""Consolidated clean API blueprint

This module exposes a compact set of actively used endpoints in a single
blueprint. It re-uses stable helpers from `utils` and `core` and aims to
remove duplicated test/noise code paths. It is intentionally minimal and
safe — it prefers to call existing core helpers when available and falls
back to graceful stubs when they are not.

Endpoints included (minimal):
- GET /api/dashboard/summary
- GET /api/user/login-status
- POST /api/user/login
- GET /api/queues
- GET /api/desks
- GET /api/issues
- GET /api/issues/<queue_id>
- GET /api/issues/<issue_key>/activity
- PUT /api/issues/<issue_key>

The goal is to provide a single importable blueprint that can be used for
smoke-tests or as a light-weight stable API surface.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List

from flask import Blueprint, request

from utils.decorators import (
    handle_api_error,
    json_response,
    log_request as log_decorator,
    require_credentials,
)
from utils.config import config

logger = logging.getLogger(__name__)

clean_bp = Blueprint('clean_api', __name__)


def _sanitize_for_json(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    import math
    import datetime as _dt

    def sanitize_value(value):
        if value is None:
            return ''
        if isinstance(value, float) and math.isnan(value):
            return ''
        if isinstance(value, (_dt.datetime, _dt.date)):
            return value.isoformat()
        if isinstance(value, dict):
            return {k: sanitize_value(v) for k, v in value.items()}
        if isinstance(value, list):
            return [sanitize_value(v) for v in value]
        return value

    return [{k: sanitize_value(v) for k, v in rec.items()} for rec in records]


def _optimize_payload(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    essential_fields = {
        'key', 'summary', 'status', 'severity', 'assignee', 'assignee_id',
        'created', 'updated', 'resolved', 'description', 'issue_type',
        'labels', 'components', 'sla_agreements', 'last_real_change',
        'watcher_count', 'is_watching', 'comment_count', 'reporter', 'creator'
    }
    optimized = []
    for rec in records:
        out = {}
        for k, v in rec.items():
            if k in essential_fields or k.startswith('customfield_'):
                out[k] = v
        optimized.append(out)
    return optimized


@clean_bp.route('/api/dashboard/summary', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def dashboard_summary():
    try:
        from core.api import get_dashboard_summary  # type: ignore
    except Exception:
        def get_dashboard_summary():
            return {}
    data = get_dashboard_summary() or {}
    desk_data = data.get('by_desk', {})
    return {
        'total_issues': data.get('total_issues', 0),
        'unassigned_count': data.get('unassigned_count', 0),
        'critical_issues': data.get('critical_issues', 0),
        'reporter_issues_count': data.get('reporter_issues_count', 0),
        'desk_count': len(desk_data) if isinstance(desk_data, (dict, list)) else 0,
        'by_status': data.get('by_status', {}),
        'by_assignee': data.get('by_assignee', {}),
        'by_desk': desk_data,
    }


@clean_bp.route('/api/user/login-status', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def login_status():
    return {
        'needs_login': config.needs_login(),
        'has_site': bool(config.jira.site),
        'has_email': bool(config.jira.email),
        'has_token': bool(config.jira.api_token),
        'project_key': config.user.project_key,
        'desk_id': config.user.desk_id,
        'queue_id': config.user.queue_id
    }


@clean_bp.route('/api/user/login', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def save_user_login():
    from utils.config import save_user_credentials
    data = request.get_json() or {}
    jira_site = data.get('jira_site', '').strip().rstrip('/')
    jira_email = data.get('jira_email', '').strip()
    jira_token = data.get('jira_token', '').strip()
    project_key = data.get('project_key', '').strip().upper() if data.get('project_key') else None
    desk_id = data.get('desk_id', '').strip() if data.get('desk_id') else None
    if not jira_site:
        return {'success': False, 'error': 'JIRA site URL is required'}, 400
    if not jira_email:
        return {'success': False, 'error': 'Email is required'}, 400
    if not jira_token:
        return {'success': False, 'error': 'API token is required'}, 400
    if not jira_site.startswith('https://'):
        return {'success': False, 'error': 'JIRA site must start with https://'}, 400
    if '@' not in jira_email:
        return {'success': False, 'error': 'Invalid email format'}, 400
    success = save_user_credentials(jira_site, jira_email, jira_token, project_key, desk_id)
    if success:
        from utils import config as config_module
        config_module.config = config_module.AppConfig.from_env()
        return {'success': True, 'message': 'Credentials saved successfully', 'reload_required': True}
    return {'success': False, 'error': 'Failed to save credentials'}, 500


@clean_bp.route('/api/queues', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def get_queues():
    try:
        from core.api import list_available_queues  # type: ignore
    except Exception:
        def list_available_queues():
            return []
    queues = list_available_queues() or []
    return {'queues': queues, 'count': len(queues)}


@clean_bp.route('/api/desks', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def get_desks():
    try:
        from utils.api_migration import get_service_desks, get_queues
    except Exception:
        def get_service_desks():
            return {'values': []}
        def get_queues(desk_id):
            return {'values': []}
    now = datetime.utcnow()
    svc_resp = get_service_desks()
    raw_desks = svc_resp.get('values', []) or []
    aggregated = []
    for d in raw_desks:
        desk_id = d.get('id') or d.get('serviceDeskId') or d.get('ID')
        queues_resp = get_queues(desk_id) or {}
        qvals = queues_resp.get('values', []) or []
        queues = [{'id': q.get('id'), 'name': q.get('name')} for q in qvals]
        aggregated.append({'id': desk_id, 'name': d.get('projectName') or d.get('name'), 'queues': queues})
    return {'desks': aggregated, 'count': len(aggregated)}


@clean_bp.route('/api/issues', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def list_issues():
    desk_id = request.args.get('desk_id')
    queue_id = request.args.get('queue_id', 'all')
    if not desk_id:
        raise ValueError('desk_id parameter is required')
    try:
        from core.api import load_queue_issues  # type: ignore
    except Exception:
        def load_queue_issues(*a, **k):
            return None, 'core.api unavailable'
    df, error = load_queue_issues(desk_id, queue_id)
    results = []
    if df is not None and getattr(df, 'empty', True) is False:
        raw = list(df.fillna('').to_dict('records'))  # type: ignore
        raw = _sanitize_for_json(raw)
        results = _optimize_payload(raw)
    return {'data': results, 'count': len(results)}


@clean_bp.route('/api/issues/<queue_id>', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def list_issues_by_queue(queue_id):
    desk_id = request.args.get('desk_id')
    limit = request.args.get('limit', type=int, default=200)
    offset = request.args.get('offset', type=int, default=0)
    if not desk_id:
        raise ValueError('desk_id parameter is required')
    try:
        from core.api import load_queue_issues  # type: ignore
    except Exception:
        def load_queue_issues(*a, **k):
            return None, 'core.api unavailable'
    df, error = load_queue_issues(desk_id, queue_id)
    if error and 'no issues' in str(error).lower():
        return {'data': [], 'count': 0, 'empty': True, 'queue_id': queue_id}
    if error:
        raise RuntimeError(error)
    records = []
    if df is not None and getattr(df, 'empty', True) is False:
        raw = list(df.fillna('').to_dict('records'))  # type: ignore
        raw = _sanitize_for_json(raw)
        records = _optimize_payload(raw)
    total = len(records)
    paginated = records[offset:offset + limit]
    has_more = (offset + limit) < total
    return {
        'data': paginated,
        'count': len(paginated),
        'total': total,
        'hasMore': has_more,
        'offset': offset,
        'limit': limit
    }


@clean_bp.route('/api/issues/<issue_key>/activity', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def issue_activity(issue_key):
    try:
        from core.api import get_api_client
        from utils.common import _make_request
        client = get_api_client()
        changelog_url = f"{client.site}/rest/api/2/issue/{issue_key}?expand=changelog"
        changelog_response = _make_request('GET', changelog_url, client.headers)
        changelog = changelog_response.get('changelog', {}).get('histories', [])
        comments_url = f"{client.site}/rest/api/2/issue/{issue_key}/comment"
        comments_response = _make_request('GET', comments_url, client.headers)
        comments = comments_response.get('comments', [])
        activity = []
        for entry in changelog:
            activity.append({'type': 'changelog', 'created': entry.get('created'), 'author': entry.get('author', {}).get('displayName', 'Unknown'), 'items': entry.get('items', [])})
        for c in comments:
            activity.append({'type': 'comment', 'created': c.get('created'), 'author': c.get('author', {}).get('displayName', 'Unknown'), 'body': c.get('body', '')})
        activity.sort(key=lambda x: x.get('created', ''), reverse=True)
        return {'success': True, 'issue_key': issue_key, 'activity': activity, 'count': len(activity)}
    except Exception as e:
        logger.error(f"Error getting activity for {issue_key}: {e}")
        return {'error': str(e), 'issue_key': issue_key}, 500


@clean_bp.route('/api/issues/<issue_key>', methods=['PUT'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def update_issue(issue_key):
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
        issue_url = f"{client.site}/rest/api/2/issue/{issue_key}"
        old_issue = _make_request('GET', issue_url, client.headers)
        old_assignee = old_issue.get('fields', {}).get('assignee', {})
        old_assignee_id = old_assignee.get('accountId') if old_assignee else None
        _make_request('PUT', issue_url, client.headers, json={'fields': fields})
        if 'assignee' in fields:
            new_assignee = fields.get('assignee', {})
            new_assignee_id = new_assignee.get('accountId') if new_assignee else None
            if new_assignee_id and new_assignee_id != old_assignee_id:
                from api.blueprints.notifications import broadcast_notification
                issue_summary = old_issue.get('fields', {}).get('summary', '')
                assigner_email = config.jira.email
                metadata_json = json.dumps({'issue_summary': issue_summary, 'assigner': assigner_email, 'previous_assignee': old_assignee.get('displayName') if old_assignee else 'Unassigned'})
                rec = create_notification(
                    ntype='assignment',
                    message=f'assigned {issue_key} to you',
                    severity='info',
                    issue_key=issue_key,
                    user=assigner_email,
                    action='assigned',
                    metadata=metadata_json
                )
                broadcast_notification(rec)
        return {'success': True, 'issue_key': issue_key, 'updated_fields': list(fields.keys())}
    except Exception as e:
        logger.error(f"Error updating issue {issue_key}: {e}")
        return {'error': str(e), 'issue_key': issue_key}, 500


# --- Comments / Mentions endpoints (delegate to comments_v2 blueprint) ---
@clean_bp.route('/api/issues/<issue_key>/comments', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def get_comments(issue_key):
    try:
        from api.blueprints.comments_v2 import get_comments_v2
        return get_comments_v2(issue_key)
    except Exception as e:
        logger.debug(f"comments_v2 unavailable: {e}")
        return {'error': 'comments module unavailable', 'issue_key': issue_key}, 501


@clean_bp.route('/api/issues/<issue_key>/comments', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def post_comment(issue_key):
    try:
        from api.blueprints.comments_v2 import add_comment_v2
        return add_comment_v2(issue_key)
    except Exception as e:
        logger.debug(f"comments_v2.add unavailable: {e}")
        return {'error': 'comments module unavailable', 'issue_key': issue_key}, 501


@clean_bp.route('/api/issues/<issue_key>/comments/<comment_id>', methods=['PUT'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def put_comment(issue_key, comment_id):
    try:
        from api.blueprints.comments_v2 import update_comment_v2
        return update_comment_v2(issue_key, comment_id)
    except Exception as e:
        logger.debug(f"comments_v2.update unavailable: {e}")
        return {'error': 'comments module unavailable', 'issue_key': issue_key}, 501


@clean_bp.route('/api/issues/<issue_key>/comments/<comment_id>', methods=['DELETE'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def delete_comment(issue_key, comment_id):
    try:
        from api.blueprints.comments_v2 import delete_comment_v2
        return delete_comment_v2(issue_key, comment_id)
    except Exception as e:
        logger.debug(f"comments_v2.delete unavailable: {e}")
        return {'error': 'comments module unavailable', 'issue_key': issue_key}, 501


@clean_bp.route('/api/issues/<issue_key>/comments/count', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def comments_count(issue_key):
    try:
        from api.blueprints.comments_v2 import get_comment_count_v2
        return get_comment_count_v2(issue_key)
    except Exception as e:
        logger.debug(f"comments_v2.count unavailable: {e}")
        return {'error': 'comments module unavailable', 'issue_key': issue_key}, 501


@clean_bp.route('/api/issues/<issue_key>/mentions', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def get_mentions(issue_key):
    try:
        from api.blueprints.comments_v2 import get_mentionable_users
        return get_mentionable_users(issue_key)
    except Exception as e:
        logger.debug(f"comments_v2.mentions unavailable: {e}")
        return {'error': 'mentions unavailable', 'issue_key': issue_key}, 501


# --- SLA endpoints (delegate to sla blueprint) ---
@clean_bp.route('/api/issues/<issue_key>/sla', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def get_issue_sla(issue_key):
    try:
        from api.blueprints.sla import api_issue_sla
        return api_issue_sla(issue_key)
    except Exception as e:
        logger.debug(f"sla module unavailable: {e}")
        return {'error': 'sla module unavailable', 'issue_key': issue_key}, 501


# --- Attachments endpoints (delegate to attachments blueprint) ---
@clean_bp.route('/api/attachments/<issue_key>', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def list_attachments(issue_key):
    try:
        from api.blueprints.attachments import api_get_attachments
        return api_get_attachments(issue_key)
    except Exception as e:
        logger.debug(f"attachments module unavailable: {e}")
        return {'error': 'attachments module unavailable', 'issue_key': issue_key}, 501


@clean_bp.route('/api/attachments/<issue_key>/<attachment_id>', methods=['GET'])
@handle_api_error
@log_decorator(logging.INFO)
@require_credentials
def get_attachment_content(issue_key, attachment_id):
    try:
        from api.blueprints.attachments import api_get_attachment_content
        return api_get_attachment_content(issue_key, attachment_id)
    except Exception as e:
        logger.debug(f"attachments.content unavailable: {e}")
        return {'error': 'attachments content unavailable', 'issue_key': issue_key}, 501


# Backwards-compatible routes (v2 / legacy paths)
@clean_bp.route('/api/v2/issues/<issue_key>/comments', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def get_comments_v2_route(issue_key):
    return get_comments(issue_key)


@clean_bp.route('/api/v2/issues/<issue_key>/comments', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def post_comment_v2_route(issue_key):
    return post_comment(issue_key)


@clean_bp.route('/api/v2/issues/<issue_key>/comments/<comment_id>', methods=['PUT'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def put_comment_v2_route(issue_key, comment_id):
    return put_comment(issue_key, comment_id)


@clean_bp.route('/api/v2/issues/<issue_key>/comments/<comment_id>', methods=['DELETE'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def delete_comment_v2_route(issue_key, comment_id):
    return delete_comment(issue_key, comment_id)


@clean_bp.route('/api/v2/issues/<issue_key>/comments/count', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def comments_count_v2_route(issue_key):
    return comments_count(issue_key)


@clean_bp.route('/api/v2/issues/<issue_key>/mentions/users', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def get_mentions_v2_route(issue_key):
    return get_mentions(issue_key)


@clean_bp.route('/api/issues/<issue_key>/attachments', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def list_attachments_legacy(issue_key):
    return list_attachments(issue_key)


@clean_bp.route('/api/issues/<issue_key>/attachments/<attachment_id>', methods=['GET'])
@handle_api_error
@log_decorator(logging.INFO)
@require_credentials
def get_attachment_content_legacy(issue_key, attachment_id):
    return get_attachment_content(issue_key, attachment_id)
