"""Transitions blueprint: provides issue transition listing and execution.

Endpoints:
  GET  /api/issues/<issue_key>/transitions  → List available transitions
  POST /api/issues/<issue_key>/transitions  → Execute a transition
"""
from flask import Blueprint, request
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
    """Get available transitions for an issue."""
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    data = _make_request('GET', f"{site}/rest/api/2/issue/{issue_key}/transitions", headers)
    if not data or 'transitions' not in data:
        raise RuntimeError('Could not fetch available transitions')
    
    # Return full transition objects for better client-side handling
    out = [
        {
            'id': t.get('id'),
            'name': t.get('name'),
            'to': {
                'id': t.get('to', {}).get('id'),
                'name': t.get('to', {}).get('name')
            },
            'targetStatus': t.get('to', {}).get('name')  # Alias for convenience
        } for t in data.get('transitions', [])
    ]
    return {'transitions': out, 'count': len(out)}


@transitions_bp.route('/api/issues/<issue_key>/transitions', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_execute_transition(issue_key):
    """
    Execute a transition on an issue.
    
    Request Body:
        {
            "transition": {
                "id": "31"
            },
            "fields": {},      # Optional
            "update": {}       # Optional
        }
    """
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    
    data = request.get_json() or {}
    
    # Validate transition ID
    transition = data.get('transition', {})
    transition_id = transition.get('id')
    
    if not transition_id:
        return {'error': 'transition.id is required'}, 400
    
    logger.info(f"Executing transition {transition_id} on {issue_key}")
    
    # Build request body
    body = {
        'transition': {'id': str(transition_id)}
    }
    
    # Add optional fields
    if 'fields' in data:
        body['fields'] = data['fields']
    
    if 'update' in data:
        body['update'] = data['update']
    
    # Execute transition via JIRA API
    url = f"{site}/rest/api/2/issue/{issue_key}/transitions"
    
    try:
        response = _make_request('POST', url, headers, json=body)
        
        # JIRA returns 204 No Content on success (response will be None)
        logger.info(f"✅ Transition {transition_id} executed on {issue_key}")
        
        return {
            'status': 'success',
            'issue_key': issue_key,
            'transition_id': transition_id,
            'message': 'Transition executed successfully'
        }
        
    except Exception as e:
        logger.error(f"Error executing transition on {issue_key}: {e}")
        raise
