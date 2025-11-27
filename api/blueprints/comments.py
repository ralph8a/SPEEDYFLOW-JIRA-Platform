"""Comments blueprint: encapsulates comment CRUD endpoints.

Migrated from server.py:
  GET /api/issues/<issue_key>/comments
  POST /api/issues/<issue_key>/comments
  PUT /api/issues/<issue_key>/comments/<comment_id>
  DELETE /api/issues/<issue_key>/comments/<comment_id>
"""
from flask import Blueprint, request
import logging
from datetime import datetime
from utils.decorators import handle_api_error, json_response, log_request as log_decorator, require_credentials
from utils.config import config
from utils.common import _make_request, _get_credentials, _get_auth_header

logger = logging.getLogger(__name__)

comments_bp = Blueprint('comments', __name__)

@comments_bp.route('/api/issues/<issue_key>/comments', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_get_comments(issue_key):
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    issue_response = _make_request('GET', f"{site}/rest/api/2/issue/{issue_key}", headers)
    if not issue_response:
        raise RuntimeError('Issue not found')
    fields = issue_response.get('fields') or {}
    comment_field = fields.get('comment') or fields.get('comentarios')
    comments: list[dict] = []
    if isinstance(comment_field, dict) and 'comments' in comment_field:
        for raw in comment_field['comments']:
            author = raw.get('author') or raw.get('autor') or {}
            author_name = author.get('displayName') if isinstance(author, dict) else ''
            comments.append({
                'id': raw.get('id',''),
                'author': author_name,
                'body': raw.get('body') or raw.get('cuerpo') or '',
                'created': raw.get('created') or raw.get('creado') or '',
                'updated': raw.get('updated') or raw.get('actualizado') or ''
            })
    attachments = fields.get('attachment', []) or []
    return {'comments': comments, 'attachments': attachments, 'count': len(comments)}

@comments_bp.route('/api/issues/<issue_key>/comments', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_add_comment(issue_key):
    data = request.get_json() if request.is_json else request.form.to_dict()
    comment_text = (data.get('comment') or '').strip()
    if not comment_text:
        raise ValueError('Comment text is required')
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    resp = _make_request('POST', f"{site}/rest/api/2/issue/{issue_key}/comment", headers, json={'body': comment_text})
    return {
        'message': 'Comment added successfully',
        'comment_id': resp.get('id') if isinstance(resp, dict) else None,
        'comment': resp,
        'timestamp': datetime.now().isoformat()
    }

@comments_bp.route('/api/issues/<issue_key>/comments/<comment_id>', methods=['PUT'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_update_comment(issue_key, comment_id):
    data = request.get_json() if request.is_json else request.form.to_dict()
    body_text = (data.get('body') or '').strip()
    if not body_text:
        raise ValueError('Comment body is required')
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    resp = _make_request('PUT', f"{site}/rest/api/2/issue/{issue_key}/comment/{comment_id}", headers, json={'body': body_text})
    return {'message': 'Comment updated successfully','comment_id': comment_id,'comment': resp}

@comments_bp.route('/api/issues/<issue_key>/comments/<comment_id>', methods=['DELETE'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_delete_comment(issue_key, comment_id):
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    _make_request('DELETE', f"{site}/rest/api/2/issue/{issue_key}/comment/{comment_id}", headers)
    return {'message': 'Comment deleted successfully','comment_id': comment_id}
