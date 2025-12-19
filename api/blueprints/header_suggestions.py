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
