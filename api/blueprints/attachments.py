"""Attachments blueprint: encapsulates attachments retrieval.

Migrated from server.py:
  GET /api/issues/<issue_key>/attachments
  GET /api/issues/<issue_key>/attachments/<attachment_id> (content proxy)

Future additions:
  POST upload attachment, DELETE attachment, etc.
"""
from flask import Blueprint, Response
import logging
import requests
from utils.decorators import (
    handle_api_error,
    json_response,
    log_request as log_decorator,
    require_credentials
)
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
    """Get all attachments for an issue (metadata only)."""
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    url = f"{site}/rest/api/2/issue/{issue_key}"
    issue_response = _make_request('GET', url, headers)
    
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
            'author': (
                a.get('author', {}).get('displayName')
                if isinstance(a.get('author'), dict) else ''
            )
        } for a in atts
    ]
    return {
        'attachments': formatted,
        'count': len(formatted),
        'issue_key': issue_key
    }

@attachments_bp.route(
    '/api/issues/<issue_key>/attachments/<attachment_id>',
    methods=['GET']
)
@handle_api_error
@log_decorator(logging.INFO)
@require_credentials
def api_get_attachment_content(issue_key, attachment_id):
    """
    Get attachment binary content (for inline image preview).
    Proxies the JIRA attachment content with authentication.
    
    Returns:
        Binary content with appropriate content-type header
    """
    site, email, api_token = _get_credentials(config)
    
    # Get attachment metadata
    headers = _get_auth_header(email, api_token)
    attachment_url = f"{site}/rest/api/2/attachment/{attachment_id}"
    
    attachment_data = _make_request('GET', attachment_url, headers)
    
    if not attachment_data:
        return Response(
            'Attachment not found',
            status=404,
            content_type='text/plain'
        )
    
    # Get content URL
    content_url = attachment_data.get('content', '')
    mime_type = attachment_data.get(
        'mimeType',
        'application/octet-stream'
    )
    filename = attachment_data.get('filename', 'attachment')
    
    if not content_url:
        return Response(
            'Attachment content URL not found',
            status=404,
            content_type='text/plain'
        )
    
    logger.info(
        f"Fetching attachment: {filename} ({attachment_id}) "
        f"for {issue_key}"
    )
    
    # Fetch actual content with authentication
    try:
        auth = (email, api_token)
        content_response = requests.get(
            content_url,
            auth=auth,
            timeout=30
        )
        content_response.raise_for_status()
        
        # Return content with proper headers
        return Response(
            content_response.content,
            content_type=mime_type,
            headers={
                'Content-Disposition': f'inline; filename="{filename}"',
                'Cache-Control': 'public, max-age=3600'  # 1 hour
            }
        )
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch attachment content: {e}")
        return Response(
            f'Failed to fetch attachment: {str(e)}',
            status=500,
            content_type='text/plain'
        )
