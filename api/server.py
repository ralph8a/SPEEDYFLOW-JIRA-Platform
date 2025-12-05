#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Stable API Server (clean minimal version)
Main Flask application with modular Blueprint architecture.
"""
import sys
import os
import logging
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, send_from_directory, render_template
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.config import config  # noqa: E402
from utils.decorators import (  # noqa: E402
    handle_api_error,
    json_response,
    log_request as log_decorator,
    require_credentials
)
from utils.api_migration import (  # noqa: E402
    get_service_desks,
    get_queues,
    get_current_user
)
from utils.db import init_db  # noqa: E402

# Blueprint imports
from api.blueprints.issues import issues_bp  # noqa: E402
from api.blueprints.comments_v2 import comments_v2_bp  # noqa: E402
from api.blueprints.attachments import attachments_bp  # noqa: E402
from api.blueprints.transitions import transitions_bp  # noqa: E402
from api.blueprints.ai import ai_bp  # noqa: E402
from api.blueprints.notifications import notifications_bp  # noqa: E402
from api.blueprints.exports import exports_bp  # noqa: E402
from api.blueprints.automations import automations_bp  # noqa: E402
from api.blueprints.backgrounds import backgrounds_bp  # noqa: E402
from api.blueprints.webhooks import webhooks_bp  # noqa: E402
from api.blueprints.kanban import kanban_bp  # noqa: E402
from api.blueprints.ai_suggestions import ai_suggestions_bp  # noqa: E402
from api.blueprints.sync import sync_bp  # noqa: E402
from api.blueprints.sla import sla_bp  # noqa: E402
from api.blueprints.copilot import copilot_bp  # noqa: E402

try:  # pragma: no cover
    from core.api import (  # type: ignore
        get_dashboard_summary,
        list_available_queues,
        list_available_projects,
    )
except ImportError:  # pragma: no cover
    # Stubs for when core package is unavailable
    def _stub(_name):
        return lambda *args, **kwargs: [] if 'list_available' in _name else {
            'total_issues': 0,
            'unassigned_count': 0,
            'critical_issues': 0,
            'reporter_issues_count': 0,
            'by_status': {},
            'by_assignee': {},
            'by_desk': {},
        }

    get_dashboard_summary = _stub('get_dashboard_summary')
    list_available_queues = _stub('list_available_queues')
    list_available_projects = _stub('list_available_projects')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_FOLDER = os.path.join(BASE_DIR, 'frontend', 'static')
TEMPLATE_FOLDER = os.path.join(BASE_DIR, 'frontend', 'templates')

app = Flask(
    __name__,
    static_folder=STATIC_FOLDER,
    static_url_path='/static',
    template_folder=TEMPLATE_FOLDER
)
init_db()
CORS(app)

# Register active blueprints
app.register_blueprint(issues_bp)
app.register_blueprint(comments_v2_bp)
app.register_blueprint(attachments_bp)
app.register_blueprint(transitions_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(sync_bp)
app.register_blueprint(notifications_bp)
app.register_blueprint(exports_bp)
app.register_blueprint(automations_bp)
app.register_blueprint(backgrounds_bp)
app.register_blueprint(webhooks_bp)
app.register_blueprint(kanban_bp)
app.register_blueprint(ai_suggestions_bp)
app.register_blueprint(sla_bp)
app.register_blueprint(copilot_bp)

# In-memory cache for desks aggregation (initialized empty)
DESKS_CACHE = {
    'data': None,
    'expires': datetime.utcnow(),
    'updated': None,
}

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(STATIC_FOLDER, 'favicon.ico', mimetype='image/vnd.microsoft.icon')

# Primary UI: Flask template (Streamlit UI deprecated)
def _render_index():
    """Internal helper to render the main UI template with graceful fallback.

    Centralizes logic used by both '/' and '/app' routes to avoid duplication.
    """
    import time
    try:
        # Add timestamp for cache busting
        timestamp = int(time.time())
        return render_template('index.html', timestamp=timestamp)
    except Exception:  # pragma: no cover - extremely unlikely missing template
        return send_from_directory(TEMPLATE_FOLDER, 'index.html')

@app.route('/')
def root_index():
    return _render_index()

@app.route('/app')
def app_alias():
    return _render_index()

@app.before_request
def _log_req():
    if not request.path.startswith('/static'):
        logger.debug(f"📨 {request.method} {request.path}")

@app.after_request
def add_cache_headers(response):
    """Add cache-busting headers to prevent JavaScript/CSS/HTML caching issues"""
    if request.path.endswith('.js') or request.path.endswith('.css') or request.path.endswith('.html') or request.path == '/' or request.path == '/app':
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

# Dashboard -----------------------------------------------------------
@app.route('/api/dashboard/summary', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def api_dashboard_summary():
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

# Queues / Desks ------------------------------------------------------
@app.route('/api/queues', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_get_queues():
    queues = list_available_queues() or []
    return {'queues': queues, 'count': len(queues)}

@app.route('/api/desks', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_get_desks_with_queues():
    """Fetch JIRA Service Desks with their queues (aggregated) and cache in memory.

    Response (wrapped by json_response): a LIST of desk objects:
      [{ id: <str>, name: <str>, queues: [{ id: <str>, name: <str> }, ...] }, ...]

    Caching:
      In-memory TTL (config.cache.default_ttl, max bounded by config.cache.max_ttl).
      Query param refresh=1 forces cache bypass & rebuild.

    Implementation details:
      - Uses compatibility layer functions get_service_desks() / get_queues() from utils.api_migration
      - Each queue object simplified to id + name
      - Gracefully handles failures returning [] (handle_api_error decorator converts exceptions)
    """
    # Module-level cache store (created lazily on first request)
    global DESKS_CACHE
    now = datetime.utcnow()
    ttl_seconds = min(getattr(config.cache, 'default_ttl', 300), getattr(config.cache, 'max_ttl', 3600))
    force_refresh = request.args.get('refresh') == '1'

    if not force_refresh and DESKS_CACHE.get('data') and DESKS_CACHE.get('expires') > now:
        return DESKS_CACHE['data']

    svc_resp = get_service_desks()
    raw_desks = svc_resp.get('values', []) or []
    aggregated = []
    for d in raw_desks:
        desk_id = d.get('id') or d.get('serviceDeskId') or d.get('ID')
        if desk_id is None:
            continue
        # Extended bilingual + alternate name derivation
        name_candidates = [
            d.get('name'), d.get('displayName'), d.get('nombre'), d.get('deskName'),
            d.get('projectName'), d.get('key'), d.get('projectKey'), d.get('title'),
        ]
        name = next((n for n in name_candidates if isinstance(n, str) and n.strip()), None)
        placeholder_used = False
        if not name:
            name = f"Desk {desk_id}"
            placeholder_used = True
        display_name = name.strip()
        # Fetch queues for this desk (ignore errors -> empty list)
        # Cast desk_id to int if numeric for API call compatibility
        desk_id_for_call = int(desk_id) if isinstance(desk_id, (int, str)) and str(desk_id).isdigit() else desk_id
        raw_queues = get_queues(desk_id_for_call).get('values', []) or []
        queues = []
        for q in raw_queues:
            q_id = q.get('id') or q.get('queueId') or q.get('ID')
            if q_id is None:
                continue
            q_name_candidates = [q.get('name'), q.get('queueName'), q.get('nombre'), q.get('title')]
            q_name = next((qn for qn in q_name_candidates if isinstance(qn, str) and qn.strip()), None) or f"Queue {q_id}"
            queues.append({'id': str(q_id), 'name': q_name})
        # Provide both name and displayName and flag if placeholder
        aggregated.append({'id': str(desk_id), 'name': display_name, 'displayName': display_name, 'placeholder': placeholder_used, 'queues': queues})
        if placeholder_used:
            logger.warning(f"Desk {desk_id} missing expected name fields; using placeholder. Raw keys: {list(d.keys())}")

    # No fallback injection: if Jira returns zero desks, UI will reflect empty state.

    DESKS_CACHE['data'] = aggregated
    DESKS_CACHE['expires'] = now + timedelta(seconds=ttl_seconds)
    DESKS_CACHE['updated'] = now.isoformat()

    return aggregated

@app.route('/api/desks/cache', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def api_get_desks_cache_meta():
    """Lightweight introspection endpoint for in-memory desks cache.
    Returns metadata only (no refresh logic here).
    Useful for diagnostics / UI indicators.
    """
    global DESKS_CACHE
    now = datetime.utcnow()
    expires = DESKS_CACHE.get('expires')
    data = DESKS_CACHE.get('data') or []
    remaining = max(0, int((expires - now).total_seconds())) if expires else 0
    return {
        'count': len(data),
        'expires': expires.isoformat() if expires else None,
        'seconds_remaining': remaining,
        'updated': DESKS_CACHE.get('updated'),
        'cached': bool(data) and remaining > 0,
    }

# Issues / Comments / Attachments now provided by registered blueprints.

# Transitions endpoint migrated to blueprint (transitions_bp)

# User / Projects -----------------------------------------------------
@app.route('/api/user', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_get_user():
    """Return authenticated JIRA user info (no local fallback)."""
    user = get_current_user()
    # Ensure timestamp and success meta
    return {
        'success': True,
        'user': user,
        'timestamp': datetime.now().isoformat()
    }

@app.route('/api/users', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_get_users():
    """
    Get list of users for mentions system.
    
    Query Parameters:
        - query: Optional search query to filter users
        - maxResults: Maximum results to return (default: 50)
    
    Returns:
        {
            "success": true,
            "users": [
                {
                    "accountId": "...",
                    "displayName": "John Doe",
                    "emailAddress": "john@example.com",
                    "avatarUrl": "...",
                    "username": "john.doe"
                }
            ],
            "count": 10
        }
    """
    from core.api import get_api_client
    
    query = request.args.get('query', '')
    max_results = int(request.args.get('maxResults', 50))
    
    client = get_api_client()
    
    try:
        # Use JIRA Platform API v3 user search
        url = f"{client.site}/rest/api/3/user/search"
        params = {
            'maxResults': max_results
        }
        
        if query:
            params['query'] = query
        
        from core.api import _make_request
        response = _make_request('GET', url, client.headers, params=params)
        
        users = []
        if response and isinstance(response, list):
            for user in response:
                account_id = user.get('accountId', '')
                if account_id:
                    display_name = user.get('displayName', '')
                    # Build username from available fields
                    username = (
                        user.get('name', '') or
                        user.get('key', '') or
                        display_name.lower().replace(' ', '.')
                    )
                    
                    users.append({
                        'accountId': account_id,
                        'displayName': display_name,
                        'emailAddress': user.get('emailAddress', ''),
                        'avatarUrl': user.get('avatarUrls', {}).get('48x48', ''),
                        'username': username
                    })
        
        return {
            'success': True,
            'users': users,
            'count': len(users),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        return {
            'success': False,
            'error': str(e),
            'users': [],
            'count': 0
        }, 500

@app.route('/api/projects', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def api_get_projects():
    projects = list_available_projects() or []
    return {'projects': projects, 'count': len(projects)}

@app.route('/api/severity/values', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def api_get_severity_values():
    """Get available severity values from JIRA"""
    from core.api import get_severity_values
    severity_values = get_severity_values()
    return {'severity_values': severity_values, 'count': len(severity_values)}

# Enrichment APIs using Service Desk API only -------------------------
@app.route('/api/enrichment/issue/<issue_key>', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def api_enrich_issue(issue_key):
    """Enrich issue data using Service Desk API and JIRA REST API (no hardcoded data)"""
    from core.api import get_api_client, _make_request
    import json
    
    try:
        client = get_api_client()
        
        # Get issue details from JIRA REST API
        issue_url = f"{client.site}/rest/api/2/issue/{issue_key}"
        issue_response = _make_request("GET", issue_url, client.headers, params={
            "expand": "names,schema,operations,editmeta,changelog,versionedRepresentations"
        })
        
        if not issue_response:
            return {'error': 'Issue not found', 'issue_key': issue_key}, 404
            
        # Extract only the fields we need from real API data
        fields = issue_response.get('fields', {})
        enriched_data = {}
        
        # Get assignee from API (no fallbacks)
        if fields.get('assignee'):
            enriched_data['assignee'] = fields['assignee'].get('displayName')
        
        # Get reporter from API (no fallbacks)  
        if fields.get('reporter'):
            enriched_data['reporter'] = fields['reporter'].get('displayName')
            enriched_data['reporterEmail'] = fields['reporter'].get('emailAddress')
        
        # Get reporter contact info from custom fields
        if fields.get('customfield_10141'):  # Email
            enriched_data['reporterEmail'] = fields['customfield_10141']
        if fields.get('customfield_10142'):  # Phone
            enriched_data['reporterPhone'] = fields['customfield_10142']
        if fields.get('customfield_10143'):  # Empresa (Company)
            enriched_data['reporterCompany'] = fields['customfield_10143']
        
        # Get description from API (no fallbacks)
        if fields.get('description'):
            enriched_data['description'] = fields['description']
        
        # Get summary from API (no fallbacks)
        if fields.get('summary'):
            enriched_data['summary'] = fields['summary']
            
        # Get status from API (no fallbacks)
        if fields.get('status'):
            enriched_data['status'] = fields['status'].get('name')
            
        # Get issue type from API (no fallbacks)
        if fields.get('issuetype'):
            enriched_data['type'] = fields['issuetype'].get('name')
            
        # Get dates from API (no fallbacks)
        if fields.get('created'):
            enriched_data['created'] = fields['created']
        if fields.get('updated'):
            enriched_data['updated'] = fields['updated']
            
        # Extract severity from custom fields using dictionary
        severity = _extract_severity_from_fields(fields)
        if severity:
            enriched_data['severity'] = severity
            
        return {
            'success': True,
            'issue_key': issue_key,
            'enriched_data': enriched_data,
            'severity_detected': severity is not None,
            'source': 'jira_rest_api'
        }
        
    except Exception as e:
        logger.error(f"Error enriching issue {issue_key}: {e}")
        return {'error': str(e), 'issue_key': issue_key}, 500

def _extract_severity_from_fields(fields):
    """Extract severity from JIRA fields using known custom field IDs"""
    try:
        # Priority list of severity field IDs (from CUSTOM_FIELDS_REFERENCE.json)
        severity_field_ids = [
            'customfield_10125',  # Criticidad (MSM project - PRIMARY)
            'customfield_10020',  # Alternative severity field
            'customfield_10138',  # Criticality
            'customfield_10129',  # Alternate severity
            'customfield_10048',  # Another common one
        ]
        
        # Try each severity field ID
        for field_id in severity_field_ids:
            if field_id in fields and fields[field_id] is not None:
                value = fields[field_id]
                extracted = _extract_field_value(value)
                if extracted:
                    logger.info(f"Severity found in {field_id}: {extracted}")
                    return str(extracted)
        
        # Fallback: check standard severity field
        if 'severity' in fields and fields['severity']:
            return _extract_field_value(fields['severity'])
            
        return None
    except Exception as e:
        logger.error(f"Error extracting severity: {e}")
        return None

def _extract_field_value(value):
    """Extract meaningful value from JIRA field objects"""
    if not value:
        return None
        
    if isinstance(value, str):
        return value
    elif isinstance(value, (int, float)):
        return value
    elif isinstance(value, dict):
        # Extract most meaningful value from JIRA objects (prioritize name for better readability)
        for key in ['name', 'displayName', 'value', 'key']:
            if key in value and value[key]:
                return value[key]
        return str(value)
    elif isinstance(value, list) and value:
        # Handle arrays (extract first item)
        first_item = value[0]
        return _extract_field_value(first_item)
    else:
        return str(value)

@app.route('/api/enrichment/custom-fields/<issue_key>', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def api_get_custom_fields(issue_key):
    """Get custom fields for issue using auto-generated dictionary (enhanced version)"""
    from core.api import get_api_client, _make_request
    import json
    import os
    
    try:
        client = get_api_client()
        
        # Load auto-generated custom fields dictionary if available
        custom_fields_dict = None
        dict_path = 'custom_fields_dictionary.json'
        if os.path.exists(dict_path):
            try:
                with open(dict_path, 'r', encoding='utf-8') as f:
                    custom_fields_dict = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load custom fields dictionary: {e}")
        
        # Create field mapping (use dictionary if available, otherwise fetch from API)
        field_mapping = {}
        if custom_fields_dict and 'mappings' in custom_fields_dict:
            field_mapping = custom_fields_dict['mappings']['id_to_name']
            logger.info(f"Using auto-generated dictionary with {len(field_mapping)} fields")
        else:
            # Fallback: get fields from API
            fields_url = f"{client.site}/rest/api/2/field"
            fields_response = _make_request("GET", fields_url, client.headers)
            
            if not fields_response:
                return {'error': 'Could not get field definitions'}, 500
                
            for field in fields_response:
                if field.get('custom') and field.get('name'):
                    field_mapping[field['id']] = field.get('name')
        
        # Get issue to extract custom field values
        issue_url = f"{client.site}/rest/api/2/issue/{issue_key}"
        issue_response = _make_request("GET", issue_url, client.headers)
        
        if not issue_response:
            return {'error': 'Issue not found'}, 404
            
        fields = issue_response.get('fields', {})
        custom_fields = {}
        
        # Extract custom fields dynamically using enhanced processing
        for field_id, value in fields.items():
            if field_id.startswith('customfield_') and value is not None:
                # Get field name from mapping
                field_name = field_mapping.get(field_id, field_id)
                
                # Process value to extract meaningful content
                processed_value = _extract_field_value(value)
                
                if processed_value is not None:
                    # Store by ID always
                    custom_fields[field_id] = processed_value
                    
                    # Also store by name if it's different from ID
                    if field_name != field_id:
                        custom_fields[field_name.lower()] = processed_value
        
        # Add metadata about field processing
        response = {
            'success': True,
            'issue_key': issue_key,
            'custom_fields': custom_fields,
            'field_count': len(custom_fields),
            'source': 'enhanced_dictionary' if custom_fields_dict else 'jira_field_api',
            'dictionary_available': custom_fields_dict is not None
        }
        
        # Add category hints if dictionary is available
        if custom_fields_dict and 'categories' in custom_fields_dict:
            response['field_categories'] = {
                'severity_priority': [f['id'] for f in custom_fields_dict['categories'].get('severity_priority', [])],
                'reporter_contact': [f['id'] for f in custom_fields_dict['categories'].get('reporter_contact', [])],
                'technical_info': [f['id'] for f in custom_fields_dict['categories'].get('technical_info', [])]
            }
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting custom fields for {issue_key}: {e}")
        return {'error': str(e)}, 500

@app.route('/api/enrichment/field-definitions', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def api_get_field_definitions():
    """Get all available field definitions from JIRA (for dynamic field mapping)"""
    from core.api import get_api_client, _make_request
    
    try:
        client = get_api_client()
        
        # Get field definitions
        fields_url = f"{client.site}/rest/api/2/field"
        fields_response = _make_request("GET", fields_url, client.headers)
        
        if not fields_response:
            return {'error': 'Could not get field definitions'}, 500
            
        # Filter and organize fields
        custom_fields = []
        system_fields = []
        
        for field in fields_response:
            field_info = {
                'id': field.get('id'),
                'name': field.get('name'),
                'custom': field.get('custom', False),
                'searchable': field.get('searchable', False),
                'navigable': field.get('navigable', False)
            }
            
            if field.get('custom'):
                custom_fields.append(field_info)
            else:
                system_fields.append(field_info)
        
        return {
            'success': True,
            'custom_fields': custom_fields,
            'system_fields': system_fields,
            'total_custom': len(custom_fields),
            'total_system': len(system_fields),
            'source': 'jira_field_api'
        }
        
    except Exception as e:
        logger.error(f"Error getting field definitions: {e}")
        return {'error': str(e)}, 500

# Health & Docs -------------------------------------------------------
@app.route('/health', methods=['GET'])
def health(): return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

@app.route('/api', methods=['GET'])
def api_docs():
    return jsonify({
        'success': True,
        'status': 'API Server Running ✅',
        'version': '2.0.0-rebuilt',
        'endpoints': {
            'ui': ['GET /', 'GET /app'],
            'dashboard': ['GET /api/dashboard/summary'],
            'queues': ['GET /api/queues', 'GET /api/desks', 'GET /api/desks?refresh=1', 'GET /api/desks/cache'],
            'issues': ['GET /api/issues', 'GET /api/issues/<queue_id>', 'GET /api/issues/<issue_key>/transitions', 'GET /api/issues/<issue_key>/sla'],
            'comments': ['GET /api/issues/<issue_key>/comments', 'POST /api/issues/<issue_key>/comments', 'PUT /api/issues/<issue_key>/comments/<comment_id>', 'DELETE /api/issues/<issue_key>/comments/<comment_id>'],
            'attachments': ['GET /api/issues/<issue_key>/attachments'],
            'ai': ['GET /api/ai/suggestions'],
            'sla': ['GET /api/issues/<issue_key>/sla', 'GET /api/sla/health'],
            'notifications': ['GET /api/notifications', 'POST /api/notifications', 'POST /api/notifications/<id>/read', 'DELETE /api/notifications/<id>', 'POST /api/notifications/test'],
            'exports': ['GET /api/exports/issues?format=<csv|json>'],
            'automations': ['GET /api/automations/health', 'POST /api/automations/run'],
            'backgrounds': ['GET /api/backgrounds/list'],
            'webhooks': ['GET /api/webhooks', 'POST /api/webhooks', 'DELETE /api/webhooks/<hook_id>'],
            'user': ['GET /api/user'],
            'projects': ['GET /api/projects'],
            'severity': ['GET /api/severity/values'],
            'enrichment': ['GET /api/enrichment/issue/<issue_key>', 'GET /api/enrichment/custom-fields/<issue_key>', 'GET /api/enrichment/field-definitions'],
            'health': ['GET /health']
        },
    'pending_restoration': []
    })

@app.errorhandler(404)
def not_found(error): return jsonify({'success': False, 'error': 'Endpoint not found', 'path': request.path}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal error: {error}")
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

if __name__ == '__main__':
    PORT = 5005
    logger.info(f"🚀 Starting Stable API Server on {PORT}")
    app.run(host='127.0.0.1', port=PORT, debug=False, threaded=True, use_reloader=False)
