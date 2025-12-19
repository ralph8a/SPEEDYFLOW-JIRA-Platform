from flask import Blueprint, request
from typing import Any, Dict
from utils.decorators import handle_api_error, json_response, log_request as log_decorator, require_credentials
from utils.db import (
    create_header_suggestion,
    list_header_suggestions,
    get_header_suggestion,
    update_header_suggestion,
    delete_header_suggestion
)
try:
    from core.api import get_api_client
    from utils.common import _make_request
except Exception:
    get_api_client = None
    _make_request = None

try:
    from utils.ml_suggester import get_ml_suggester
except Exception:
    get_ml_suggester = None

header_suggestions_bp = Blueprint('header_suggestions', __name__)

@header_suggestions_bp.route('/api/header-suggestions', methods=['GET'])
@handle_api_error
@json_response
@log_decorator()
def api_list_header_suggestions():
    active = request.args.get('active')
    active_only = True if active is None or active.lower() != 'false' else False
    items = list_header_suggestions(active_only=active_only)
    return {'items': items, 'count': len(items)}


@header_suggestions_bp.route('/api/header-suggestions/<int:nid>', methods=['GET'])
@handle_api_error
@json_response
@log_decorator()
def api_get_header_suggestion(nid):
    item = get_header_suggestion(nid)
    if not item:
        return {'error': 'Not found'}, 404
    return item


@header_suggestions_bp.route('/api/header-suggestions', methods=['POST'])
@handle_api_error
@json_response
@log_decorator()
@require_credentials
def api_create_header_suggestion():
    data = request.get_json() or {}
    title = data.get('title')
    if not title:
        return {'error': 'title is required'}, 400
    desc = data.get('description')
    action = data.get('action')
    metadata = data.get('metadata')
    active = 1 if data.get('active', True) else 0
    item = create_header_suggestion(title=title, description=desc, action=action, metadata=metadata, active=active)
    return item, 201


@header_suggestions_bp.route('/api/header-suggestions/<int:nid>', methods=['PUT', 'PATCH'])
@handle_api_error
@json_response
@log_decorator()
@require_credentials
def api_update_header_suggestion(nid):
    data = request.get_json() or {}
    item = update_header_suggestion(nid, data)
    if not item:
        return {'error': 'Not found or no changes'}, 404
    return item


@header_suggestions_bp.route('/api/header-suggestions/<int:nid>', methods=['DELETE'])
@handle_api_error
@json_response
@log_decorator()
@require_credentials
def api_delete_header_suggestion(nid):
    ok = delete_header_suggestion(nid)
    return {'deleted': ok}


@header_suggestions_bp.route('/api/header-suggestions/generate', methods=['POST'])
@handle_api_error
@json_response
@log_decorator()
@require_credentials
def api_generate_header_suggestions():
    """Generate header suggestions using available ML models (no generative scripts).

    Request body:
      { "issue_key": "PROJ-123" }
    Or:
      { "text": "short summary or description" }

    This endpoint calls existing, pre-trained models (utils.ml_suggester) and
    stores generated header suggestions in the DB via create_header_suggestion().
    """
    data = request.get_json() or {}
    issue_key = data.get('issue_key')
    text = data.get('text')

    if not issue_key and not text:
        return {'error': 'issue_key or text is required'}, 400

    source_text = text or ''
    if issue_key:
        # Try to fetch issue fields
        if get_api_client and _make_request:
            try:
                client = get_api_client()
                issue_url = f"{client.site}/rest/api/2/issue/{issue_key}"
                issue_data = _make_request('GET', issue_url, client.headers, params={'fields': 'summary,description'})
                if issue_data and isinstance(issue_data, dict):
                    fields = issue_data.get('fields', {})
                    summary = fields.get('summary', '') or ''
                    description = fields.get('description', '') or ''
                    if isinstance(description, dict):
                        # try to extract text
                        description = str(description.get('content', ''))
                    source_text = (summary + ' ' + description).strip()
            except Exception as e:
                # fallback to provided text if any
                source_text = source_text or ''

    created = []

    # Use ml_suggester to obtain deterministic model suggestions
    if get_ml_suggester:
        try:
            sug = get_ml_suggester()
            # Suggest priority
            try:
                p = sug.suggest_priority(source_text)
                if p:
                    value, confidence, reason, similar = p
                    title = f"Set priority → {value}"
                    desc = f"Confidence: {confidence:.2f}. {reason}"
                    action = { 'field': 'priority', 'value': value }
                    item = create_header_suggestion(title=title, description=desc, action=str(action), metadata=str({'issue_key': issue_key}))
                    created.append(item)
            except Exception:
                pass

            # Suggest severity
            try:
                s = sug.suggest_severity(source_text)
                if s:
                    value, confidence, reason, similar = s
                    title = f"Set severity → {value}"
                    desc = f"Confidence: {confidence:.2f}. {reason}"
                    action = { 'field': 'customfield_10125', 'value': value }
                    item = create_header_suggestion(title=title, description=desc, action=str(action), metadata=str({'issue_key': issue_key}))
                    created.append(item)
            except Exception:
                pass
        except Exception as e:
            # ML suggester failed; return error
            return {'error': f'Models unavailable: {e}'}, 503
    else:
        return {'error': 'No ML suggester available'}, 503

    return {'created': created, 'count': len(created)}
