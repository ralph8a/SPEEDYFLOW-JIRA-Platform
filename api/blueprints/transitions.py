"""Transitions blueprint: provides issue transition listing and execution.

Endpoints:
  GET  /api/issues/<issue_key>/transitions  → List available transitions
  POST /api/issues/<issue_key>/transitions  → Execute a transition
"""
from flask import Blueprint, request
import logging
import json
from utils.decorators import handle_api_error, json_response, log_request as log_decorator, require_credentials
from utils.config import config
from utils.common import _make_request, _get_credentials, _get_auth_header
from utils.db import create_notification

logger = logging.getLogger(__name__)

transitions_bp = Blueprint('transitions', __name__)

@transitions_bp.route('/api/issues/<issue_key>/transitions', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_get_available_transitions(issue_key):
    """Get available transitions for an issue with field requirements."""
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    
    # Request with expand=transitions.fields to get field requirements
    params = {'expand': 'transitions.fields'}
    data = _make_request('GET', f"{site}/rest/api/2/issue/{issue_key}/transitions", headers, params=params)
    if not data or 'transitions' not in data:
        raise RuntimeError('Could not fetch available transitions')
    
    # Return full transition objects including fields
    out = [
        {
            'id': t.get('id'),
            'name': t.get('name'),
            'to': {
                'id': t.get('to', {}).get('id'),
                'name': t.get('to', {}).get('name')
            },
            'targetStatus': t.get('to', {}).get('name'),  # Alias for convenience
            'fields': t.get('fields', {})  # Include field requirements
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
    
    # Get current issue to know previous status and assignee
    issue_url = f"{site}/rest/api/2/issue/{issue_key}"
    issue_data = _make_request('GET', issue_url, headers)
    
    # Extract info before transition
    old_status = issue_data.get('fields', {}).get('status', {}).get('name', 'Unknown')
    assignee = issue_data.get('fields', {}).get('assignee', {})
    assignee_id = assignee.get('accountId') if assignee else None
    
    # Execute transition via JIRA API
    url = f"{site}/rest/api/2/issue/{issue_key}/transitions"
    
    try:
        _make_request('POST', url, headers, json=body)
        
        # JIRA returns 204 No Content on success
        logger.info("Transition %s executed on %s", transition_id, issue_key)
        
        # Get new status from transition data
        new_status = data.get('transition', {}).get('to', {}).get('name')
        if not new_status:
            # Try to get it from available transitions
            transitions_data = _make_request('GET', f"{site}/rest/api/2/issue/{issue_key}/transitions", headers)
            for t in transitions_data.get('transitions', []):
                if str(t.get('id')) == str(transition_id):
                    new_status = t.get('to', {}).get('name')
                    break
        
        # Create notification for assignee if status changed
        if assignee_id and new_status and new_status != old_status:
            from api.blueprints.notifications import broadcast_notification
            
            issue_summary = issue_data.get('fields', {}).get('summary', '')
            
            metadata_json = json.dumps({
                'old_status': old_status,
                'new_status': new_status,
                'issue_summary': issue_summary
            })
            
            message = f"changed status to {new_status}"
            
            rec = create_notification(
                ntype='status_change',
                message=message,
                severity='info',
                issue_key=issue_key,
                user=email,
                action='status_changed',
                metadata=metadata_json
            )
            
            # Broadcast real-time
            broadcast_notification(rec)
            
            logger.info("📬 Created status change notification for %s", assignee_id)
        
        return {
            'status': 'success',
            'issue_key': issue_key,
            'transition_id': transition_id,
            'old_status': old_status,
            'new_status': new_status,
            'message': 'Transition executed successfully'
        }
        
    except Exception as e:
        logger.error("Error executing transition on %s: %s", issue_key, str(e))
        raise
