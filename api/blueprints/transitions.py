"""Transitions blueprint: provides issue transition listing.

Endpoint migrated from server.py:
  GET /api/issues/<issue_key>/transitions

Future work: POST transition execution.
"""
from flask import Blueprint
import logging
from utils.decorators import handle_api_error, json_response, log_request as log_decorator, require_credentials
from utils.config import config
from utils.common import _make_request, _get_credentials, _get_auth_header

logger = logging.getLogger(__name__)

transitions_bp = Blueprint('transitions', __name__)

@transitions_bp.route('/api/issues/<issue_key>/transitions', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_get_available_transitions(issue_key):
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    data = _make_request('GET', f"{site}/rest/api/2/issue/{issue_key}/transitions", headers)
    if not data or 'transitions' not in data:
        raise RuntimeError('Could not fetch available transitions')
    out = [
        {
            'id': t.get('id'),
            'name': t.get('name'),
            'to': t.get('to', {}).get('name')
        } for t in data.get('transitions', [])
    ]
    return {'transitions': out, 'count': len(out)}
