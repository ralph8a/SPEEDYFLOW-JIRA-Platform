"""
Flowing Context - Saved Suggestions Storage
Simple file-backed CRUD for saved FlowingContext suggestions.

Endpoints:
  GET  /api/flowing/saved-suggestions
  POST /api/flowing/saved-suggestions  (create)
  PUT  /api/flowing/saved-suggestions/<id> (update)
  DELETE /api/flowing/saved-suggestions/<id>

This is intentionally minimal and safe for local development.
"""
import json
import os
import logging
import uuid
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

flowing_storage_bp = Blueprint('flowing_storage', __name__, url_prefix='/api/flowing-storage')

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '..', '..', 'data')
# Normalize
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data'))
if not os.path.exists(DATA_DIR):
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
    except Exception:
        pass

STORE_FILE = os.path.join(DATA_DIR, 'flowing_suggestions.json')

def _read_store():
    if not os.path.exists(STORE_FILE):
        return []
    try:
        with open(STORE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f) or []
    except Exception as e:
        logger.warning('Could not read flowing suggestions store: %s', e)
        return []

def _write_store(items):
    try:
        with open(STORE_FILE, 'w', encoding='utf-8') as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error('Error writing flowing suggestions store: %s', e)
        return False


@flowing_storage_bp.route('/saved-suggestions', methods=['GET'])
def list_saved_suggestions():
    logger.info('flowing_storage: list_saved_suggestions called; path=%s', request.path)
    items = _read_store()
    return jsonify({'success': True, 'items': items, 'count': len(items)})


@flowing_storage_bp.route('/saved-suggestions', methods=['POST'])
def create_saved_suggestion():
    logger.info('flowing_storage: create_saved_suggestion called; path=%s', request.path)
    data = request.get_json() or {}
    items = _read_store()
    new_id = data.get('id') or str(uuid.uuid4())
    entry = {
        'id': new_id,
        'title': data.get('title', '').strip(),
        'description': data.get('description', '').strip(),
        'icon': data.get('icon', '').strip() or '💡',
        'action': data.get('action', '').strip() or '',
        'priority': int(data.get('priority', 0)),
        'meta': data.get('meta') or {}
    }
    # Replace if exists
    items = [it for it in items if it.get('id') != new_id]
    items.append(entry)
    ok = _write_store(items)
    if not ok:
        return jsonify({'success': False, 'error': 'Could not write store'}), 500
    return jsonify({'success': True, 'item': entry}), 201


@flowing_storage_bp.route('/saved-suggestions/<string:item_id>', methods=['PUT'])
def update_saved_suggestion(item_id):
    logger.info('flowing_storage: update_saved_suggestion called; id=%s path=%s', item_id, request.path)
    data = request.get_json() or {}
    items = _read_store()
    updated = None
    for i, it in enumerate(items):
        if it.get('id') == item_id:
            it['title'] = data.get('title', it.get('title', ''))
            it['description'] = data.get('description', it.get('description', ''))
            it['icon'] = data.get('icon', it.get('icon', ''))
            it['action'] = data.get('action', it.get('action', ''))
            it['priority'] = int(data.get('priority', it.get('priority', 0)))
            it['meta'] = data.get('meta', it.get('meta', {}))
            items[i] = it
            updated = it
            break

    if not updated:
        return jsonify({'success': False, 'error': 'Not found'}), 404

    ok = _write_store(items)
    if not ok:
        return jsonify({'success': False, 'error': 'Could not write store'}), 500

    return jsonify({'success': True, 'item': updated})


@flowing_storage_bp.route('/saved-suggestions/<string:item_id>', methods=['DELETE'])
def delete_saved_suggestion(item_id):
    logger.info('flowing_storage: delete_saved_suggestion called; id=%s path=%s', item_id, request.path)
    items = _read_store()
    new_items = [it for it in items if it.get('id') != item_id]
    if len(new_items) == len(items):
        return jsonify({'success': False, 'error': 'Not found'}), 404
    ok = _write_store(new_items)
    if not ok:
        return jsonify({'success': False, 'error': 'Could not write store'}), 500
    return jsonify({'success': True, 'deleted': item_id})
