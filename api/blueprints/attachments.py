"""Attachments blueprint: encapsulates attachments retrieval.

Migrated from server.py:
  GET /api/issues/<issue_key>/attachments

Future additions:
  POST upload attachment, DELETE attachment, etc.
"""
from flask import Blueprint
import logging
from utils.decorators import handle_api_error, json_response, log_request as log_decorator, require_credentials
from utils.config import config
from utils.common import _make_request, _get_credentials, _get_auth_header

logger = logging.getLogger(__name__)

attachments_bp = Blueprint('attachments', __name__)

@attachments_bp.route('/api/issues/<issue_key>/attachments', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_get_attachments(issue_key):
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    issue_response = _make_request('GET', f"{site}/rest/api/2/issue/{issue_key}", headers)
    if not issue_response or 'fields' not in issue_response:
        raise RuntimeError('Issue not found')
    atts = issue_response.get('fields', {}).get('attachment', []) or []
    formatted = [
        {
            'id': a.get('id'),
            'filename': a.get('filename'),
            'size': a.get('size'),
            'mimetype': a.get('mimeType'),
            'content_url': a.get('content'),
            'created': a.get('created'),
            'author': a.get('author', {}).get('displayName') if isinstance(a.get('author'), dict) else ''
        } for a in atts
    ]
    return {'attachments': formatted, 'count': len(formatted), 'issue_key': issue_key}
