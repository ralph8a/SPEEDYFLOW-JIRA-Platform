#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Stable API Server (clean minimal version)
Main Flask application with modular Blueprint architecture.
"""
import sys
import os
import logging
import warnings

# Suppress Streamlit warnings before any imports
warnings.filterwarnings('ignore', message='.*ScriptRunContext.*')
warnings.filterwarnings('ignore', category=UserWarning, module='streamlit.*')

# Configure logging early to filter Streamlit warnings
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class StreamlitWarningFilter(logging.Filter):
    """Filter to suppress Streamlit ScriptRunContext warnings (safe in bare mode)"""
    def filter(self, record):
        if 'ScriptRunContext' in record.getMessage():
            return False
        if 'No runtime found' in record.getMessage():
            return False
        return True

# Apply filter to Streamlit loggers before importing
for logger_name in ['streamlit', 'streamlit.runtime', 'streamlit.runtime.scriptrunner_utils', 
                     'streamlit.runtime.caching', 'streamlit.runtime.caching.cache_data_api']:
    streamlit_logger = logging.getLogger(logger_name)
    streamlit_logger.addFilter(StreamlitWarningFilter())
    streamlit_logger.setLevel(logging.ERROR)

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
# Allow disabling ML-heavy blueprint imports via environment variable. This
# avoids importing numpy/scipy/scikit-learn on platforms without native
# build toolchains (e.g., Windows dev machines without Visual C++).
DISABLE_ML = os.getenv('SPEEDYFLOW_DISABLE_ML', '1').lower() in ('1', 'true', 'yes')

# Blueprints which are considered ML-heavy and safe to skip when DISABLE_ML is set
_SKIPPABLE_BLUEPRINTS = {
    'ai', 'anomaly_detection', 'models', 'ai_suggestions', 'comment_suggestions',
    'flowing_semantic_search', 'flowing_comments', 'flowing_comments_assistant'
}

def _safe_import_blueprint(module_path: str, symbol: str, bp_name: str | None = None):
    _log = logging.getLogger(__name__)
    if DISABLE_ML and bp_name and bp_name in _SKIPPABLE_BLUEPRINTS:
        _log.info(f"Skipping ML-heavy blueprint import: {bp_name} due to SPEEDYFLOW_DISABLE_ML")
        return None
    try:
        mod = __import__(module_path, fromlist=[symbol])
        return getattr(mod, symbol)
    except Exception as e:
        _log.debug(f"Could not import {module_path}.{symbol}: {e}")
        return None

issues_bp = _safe_import_blueprint('api.blueprints.issues', 'issues_bp')
comments_v2_bp = _safe_import_blueprint('api.blueprints.comments_v2', 'comments_v2_bp')
attachments_bp = _safe_import_blueprint('api.blueprints.attachments', 'attachments_bp')
transitions_bp = _safe_import_blueprint('api.blueprints.transitions', 'transitions_bp')
ai_bp = _safe_import_blueprint('api.blueprints.ai', 'ai_bp', bp_name='ai')
notifications_bp = _safe_import_blueprint('api.blueprints.notifications', 'notifications_bp')
exports_bp = _safe_import_blueprint('api.blueprints.exports', 'exports_bp')
automations_bp = _safe_import_blueprint('api.blueprints.automations', 'automations_bp')
backgrounds_bp = _safe_import_blueprint('api.blueprints.backgrounds', 'backgrounds_bp')
webhooks_bp = _safe_import_blueprint('api.blueprints.webhooks', 'webhooks_bp')
kanban_bp = _safe_import_blueprint('api.blueprints.kanban', 'kanban_bp')
ai_suggestions_bp = _safe_import_blueprint('api.blueprints.ai_suggestions', 'ai_suggestions_bp', bp_name='ai_suggestions')
header_suggestions_bp = _safe_import_blueprint('api.blueprints.header_suggestions', 'header_suggestions_bp')
sync_bp = _safe_import_blueprint('api.blueprints.sync', 'sync_bp')
sla_bp = _safe_import_blueprint('api.blueprints.sla', 'sla_bp')
copilot_bp = _safe_import_blueprint('api.blueprints.copilot', 'copilot_bp')
reports_bp = _safe_import_blueprint('api.blueprints.reports', 'reports_bp')
flowing_semantic_bp = _safe_import_blueprint('api.blueprints.flowing_semantic_search', 'flowing_semantic_bp', bp_name='flowing_semantic_search')
flowing_comments_bp = _safe_import_blueprint('api.blueprints.flowing_comments_assistant', 'flowing_comments_bp', bp_name='flowing_comments')
comment_suggestions_bp = _safe_import_blueprint('api.blueprints.comment_suggestions', 'comment_suggestions_bp', bp_name='comment_suggestions')
anomaly_detection_bp = _safe_import_blueprint('api.blueprints.anomaly_detection', 'anomaly_detection_bp', bp_name='anomaly_detection')
models_bp = _safe_import_blueprint('api.blueprints.models', 'models_bp', bp_name='models')

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

# Enable gzip compression for all responses (reduces payload by 70-90%)
app.config['COMPRESS_MIMETYPES'] = [
    'text/html', 'text/css', 'text/xml', 'text/plain',
    'application/json', 'application/javascript', 'application/xml'
]
app.config['COMPRESS_LEVEL'] = 6  # Compression level 1-9 (6 is good balance)
app.config['COMPRESS_MIN_SIZE'] = 500  # Only compress responses > 500 bytes

try:
    from flask_compress import Compress
    Compress(app)
    logger.info('✓ Gzip compression enabled (reduces payload by 70-90%)')
except ImportError:
    logger.warning('⚠️ flask-compress not installed, compression disabled. Install: pip install flask-compress')
    pass

# Register active blueprints
for bp_name, bp in [
    ('issues', issues_bp),
    ('comments_v2', comments_v2_bp),
    ('attachments', attachments_bp),
    ('transitions', transitions_bp),
    ('ai', ai_bp),
    ('sync', sync_bp),
    ('notifications', notifications_bp),
    ('exports', exports_bp),
    ('automations', automations_bp),
    ('backgrounds', backgrounds_bp),
    ('webhooks', webhooks_bp),
    ('kanban', kanban_bp),
    ('ai_suggestions', ai_suggestions_bp),
    ('header_suggestions', header_suggestions_bp),
    ('sla', sla_bp),
    ('copilot', copilot_bp),
    ('reports', reports_bp),
    ('flowing_semantic', flowing_semantic_bp),
    ('flowing_comments', flowing_comments_bp),
    ('comment_suggestions', comment_suggestions_bp),
    ('anomaly_detection', anomaly_detection_bp),
    ('models', models_bp),
]:
    if bp is not None:
        try:
            app.register_blueprint(bp)
            logger.info(f"Registered blueprint: {bp_name}")
        except Exception as e:
            logger.warning(f"Failed to register blueprint {bp_name}: {e}")
    else:
        logger.warning(f"Blueprint not available, skipping: {bp_name}")

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

@app.route('/icons')
def icon_gallery():
    """SVG Icons Gallery - Visual reference for all available icons"""
    return send_from_directory(STATIC_FOLDER, 'icon-gallery.html')

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
@app.route('/api/user/login-status', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def api_check_login_status():
    """Check if login credentials are needed"""
    return {
        'needs_login': config.needs_login(),
        'has_site': bool(config.jira.site),
        'has_email': bool(config.jira.email),
        'has_token': bool(config.jira.api_token),
        'project_key': config.user.project_key,
        'desk_id': config.user.desk_id,
        'queue_id': config.user.queue_id
    }

@app.route('/api/user/login', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def api_save_user_login():
    """Save user credentials and configuration"""
    from utils.config import save_user_credentials
    
    data = request.get_json() or {}
    jira_site = data.get('jira_site', '').strip().rstrip('/')
    jira_email = data.get('jira_email', '').strip()
    jira_token = data.get('jira_token', '').strip()
    project_key = data.get('project_key', '').strip().upper() if data.get('project_key') else None
    desk_id = data.get('desk_id', '').strip() if data.get('desk_id') else None
    
    # Validate required fields
    if not jira_site:
        return {'success': False, 'error': 'JIRA site URL is required'}, 400
    if not jira_email:
        return {'success': False, 'error': 'Email is required'}, 400
    if not jira_token:
        return {'success': False, 'error': 'API token is required'}, 400
    
    # Validate URL format
    if not jira_site.startswith('https://'):
        return {'success': False, 'error': 'JIRA site must start with https://'}, 400
    
    # Validate email format
    if '@' not in jira_email:
        return {'success': False, 'error': 'Invalid email format'}, 400
    
    # Save to .env and Documents
    success = save_user_credentials(jira_site, jira_email, jira_token, project_key, desk_id)
    
    if success:
        # Reload config
        from utils import config as config_module
        config_module.config = config_module.AppConfig.from_env()
        
        return {
            'success': True,
            'message': 'Credentials saved successfully',
            'saved_to': ['.env', '~/Documents/SpeedyFlow/credentials.env'],
            'reload_required': True
        }
    else:
        return {'success': False, 'error': 'Failed to save credentials'}, 500

@app.route('/api/user/setup', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def api_check_user_setup():
    """Check if user configuration is needed"""
    return {
        'needs_setup': config.needs_user_setup(),
        'project_key': config.user.project_key,
        'desk_id': config.user.desk_id
    }

@app.route('/api/user/setup', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_save_user_setup():
    """Save user configuration"""
    from utils.config import save_user_config
    
    data = request.get_json() or {}
    project_key = data.get('project_key', '').strip().upper()
    desk_id = data.get('desk_id', '').strip()
    queue_id = data.get('queue_id', '').strip()
    
    if not project_key:
        return {'success': False, 'error': 'project_key is required'}, 400
    
    # Save to .env
    success = save_user_config(project_key, desk_id, queue_id)
    
    if success:
        # Reload config
        from utils import config as config_module
        config_module.config = config_module.AppConfig.from_env()
        
        return {
            'success': True,
            'message': 'Configuration saved successfully',
            'project_key': project_key,
            'desk_id': desk_id,
            'queue_id': queue_id,
            'reload_required': False
        }
    else:
        return {'success': False, 'error': 'Failed to save configuration'}, 500

@app.route('/api/user/desk-context', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_get_user_desk_context():
    """Get user's desk context from configuration or detect automatically.
    
    Priority:
    1. USER_PROJECT_KEY from .env (configured by user)
    2. Auto-detection from user's tickets
    3. First available desk as fallback
    """
    try:
        # Priority 1: Use configured project key
        if config.user.project_key:
            logging.info(f"✅ Using configured project key: {config.user.project_key}")
            
            # Find desk by project key
            desks_response = get_service_desks()
            desks = desks_response.get('values', []) if isinstance(desks_response, dict) else []
            
            for desk in desks:
                if desk.get('projectKey') == config.user.project_key:
                    logging.info(f"✅ Found configured desk: {desk.get('id')} - {desk.get('projectName')}")
                    return {
                        'desk_id': desk.get('id'),
                        'desk_name': desk.get('projectName'),
                        'project_key': config.user.project_key,
                        'ticket_count': 0,
                        'source': 'user_config'
                    }
            
            logging.warning(f"⚠️ Configured project {config.user.project_key} not found in desks")
        
        # Fallback: Use first available desk
        desks_response = get_service_desks()
        desks = desks_response.get('values', []) if isinstance(desks_response, dict) else []
        
        if not desks:
            logging.warning("No service desks found")
            return {
                'desk_id': None,
                'desk_name': None,
                'project_key': None,
                'ticket_count': 0,
                'source': 'none',
                'needs_setup': True
            }
        
        first_desk = desks[0]
        logging.info(f"⚠️ Using fallback desk: {first_desk.get('id')} - {first_desk.get('projectName')} ({first_desk.get('projectKey')})")
        
        return {
            'desk_id': first_desk.get('id'),
            'desk_name': first_desk.get('projectName'),
            'project_key': first_desk.get('projectKey'),
            'ticket_count': 0,
            'source': 'first_available',
            'all_desks_count': len(desks),
            'needs_setup': not config.user.project_key
        }
        
    except Exception as e:
        logging.error(f"Error getting user desk context: {e}", exc_info=True)
        return {
            'desk_id': None,
            'desk_name': None,
            'project_key': None,
            'ticket_count': 0,
            'source': 'error',
            'error': str(e)
        }

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
            q_jql = q.get('jql', '')
            queues.append({'id': str(q_id), 'name': q_name, 'jql': q_jql})
        
        # Skip desks with no accessible queues (permission issues)
        if not queues:
            logger.info(f"⚠️ Skipping desk '{display_name}' (ID: {desk_id}) - No accessible queues (likely permission restriction)")
            continue
        
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
    Uses database cache (24h TTL) + fallback to JIRA APIs.
    
    Query Parameters:
        - query: Optional search query to filter users
        - serviceDeskId: Optional Service Desk ID for participants
        - forceRefresh: Force refresh from JIRA APIs (default: false)
    
    Returns:
        {
            "success": true,
            "users": [...],
            "count": 10,
            "cached": true/false
        }
    """
    from core.api import get_api_client
    from utils.db import get_users_from_db, upsert_users
    
    query = request.args.get('query', '')
    service_desk_id = request.args.get('serviceDeskId', '')
    force_refresh = request.args.get('forceRefresh', 'false').lower() == 'true'
    
    # Try to get from database cache first (unless force refresh)
    if not force_refresh:
        try:
            cached_users = get_users_from_db(service_desk_id=service_desk_id, query=query, max_age_hours=24)
            if cached_users:
                logger.info(f"✅ Returning {len(cached_users)} users from database cache")
                return {
                    'success': True,
                    'users': cached_users,
                    'count': len(cached_users),
                    'cached': True,
                    'timestamp': datetime.now().isoformat()
                }
            logger.info("📋 No valid cache found, fetching from JIRA APIs...")
        except Exception as e:
            logger.warning(f"Database cache error: {e}, fetching from JIRA APIs...")
    else:
        logger.info("🔄 Force refresh requested, fetching from JIRA APIs...")
    
    client = get_api_client()
    users_dict = {}  # Use dict to deduplicate by accountId
    
    try:
        # Fetch from both APIs in parallel
        platform_users = []
        sd_users = []
        from core.api import _make_request
        
        # Strategy 1: Platform API v3 user search
        try:
            url = f"{client.site}/rest/api/3/user/search"
            params = {
                'maxResults': 1000,  # Obtener todos los usuarios
                'query': query if query else ''
            }
            
            response = _make_request('GET', url, client.headers, params=params)
            
            if response and isinstance(response, list):
                platform_users = response
                logger.info(f"📋 Platform API returned {len(platform_users)} users")
        except Exception as e:
            logger.warning(f"Platform API user search failed: {e}")
        
        # Strategy 2: Service Desk participants
        if service_desk_id:
            try:
                sd_url = f"{client.site}/rest/servicedeskapi/servicedesk/{service_desk_id}/participants"
                sd_response = _make_request('GET', sd_url, client.headers, params={'start': 0, 'limit': 1000})
                
                if sd_response and 'values' in sd_response:
                    sd_users = sd_response.get('values', [])
                    logger.info(f"📋 Service Desk API returned {len(sd_users)} participants")
            except Exception as e:
                logger.warning(f"Service Desk API failed: {e}")
        
        # Combine both results
        for user in platform_users:
            account_id = user.get('accountId', '')
            if account_id:
                display_name = user.get('displayName', '')
                users_dict[account_id] = {
                    'accountId': account_id,
                    'displayName': display_name,
                    'emailAddress': user.get('emailAddress', ''),
                    'avatarUrl': user.get('avatarUrls', {}).get('48x48', ''),
                    'username': user.get('name', '') or display_name.lower().replace(' ', '.'),
                    'source': 'platform'
                }
        
        for user in sd_users:
            account_id = user.get('accountId', '')
            if account_id:
                display_name = user.get('displayName', '')
                if account_id in users_dict:
                    users_dict[account_id]['source'] = 'both'
                else:
                    users_dict[account_id] = {
                        'accountId': account_id,
                        'displayName': display_name,
                        'emailAddress': user.get('emailAddress', ''),
                        'avatarUrl': user.get('avatarUrls', {}).get('48x48', ''),
                        'username': user.get('name', '') or display_name.lower().replace(' ', '.'),
                        'source': 'servicedesk'
                    }
        
        logger.info(f"✅ Combined total: {len(users_dict)} unique users")
        users = list(users_dict.values())
        
        # Save to database
        try:
            from utils.db import upsert_users
            saved_count = upsert_users(users, service_desk_id=service_desk_id)
            logger.info(f"💾 Saved {saved_count} users to database")
        except Exception as e:
            logger.warning(f"Failed to save users to database: {e}")
        
        # Apply query filter if provided
        if query:
            query_lower = query.lower()
            users = [
                u for u in users
                if query_lower in u['displayName'].lower() or 
                   query_lower in u.get('emailAddress', '').lower() or
                   query_lower in u.get('username', '').lower()
            ]
        
        # Sort by displayName
        users.sort(key=lambda u: u['displayName'].lower())
        
        logger.info(f"✅ Returning {len(users)} users for mentions")
        
        return {
            'success': True,
            'users': users,
            'count': len(users),
            'cached': False,
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

@app.route('/api/users/refresh', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_refresh_users():
    """Force refresh users from JIRA APIs and update database."""
    service_desk_id = request.args.get('serviceDeskId', '')
    
    # Force refresh by calling the main endpoint with forceRefresh
    from flask import make_response
    request.args = request.args.copy()
    request.args['forceRefresh'] = 'true'
    
    result = api_get_users()
    
    return {
        'success': True,
        'message': 'Users refreshed successfully',
        'result': result
    }

@app.route('/api/users/cleanup', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_cleanup_users():
    """Clean up old users from database (older than 30 days)."""
    from utils.db import clear_old_users
    
    days = int(request.args.get('days', 30))
    deleted_count = clear_old_users(days=days)
    
    return {
        'success': True,
        'deleted': deleted_count,
        'message': f'Deleted {deleted_count} users older than {days} days'
    }

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

@app.route('/test-login', methods=['GET'])
def test_login_flow():
    """Test endpoint to simulate login flow"""
    html = '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Testing Login Flow</title>
    </head>
    <body>
        <h1>🔐 Simulating Login...</h1>
        <p>Setting sessionStorage flags and redirecting...</p>
        <script>
            // Set login flags
            sessionStorage.setItem('speedyflow_just_logged_in', 'true');
            sessionStorage.setItem('speedyflow_initial_project', 'MSM');
            
            console.log('✅ Login flags set:', {
                just_logged_in: sessionStorage.getItem('speedyflow_just_logged_in'),
                initial_project: sessionStorage.getItem('speedyflow_initial_project')
            });
            
            // Redirect to main app
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        </script>
    </body>
    </html>
    '''
    return html

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
