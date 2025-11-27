"""Webhooks blueprint: in-memory webhook registration (stub).

Endpoints:
  GET  /api/webhooks              -> List registered webhooks
  POST /api/webhooks              -> Register a webhook (json: {url: str, event: str})
  DELETE /api/webhooks/<hook_id>  -> Remove a webhook

Security: POST/DELETE require credentials. GET is public for transparency.
Persistence: In-memory only (process lifetime). Future phase: durable storage.
"""
from flask import Blueprint, request
import logging
import uuid
from datetime import datetime, UTC
from utils.decorators import handle_api_error, json_response, log_request as log_decorator, require_credentials

logger = logging.getLogger(__name__)
webhooks_bp = Blueprint('webhooks', __name__)

# Simple in-memory store: {id: {id, url, event, created_at}}
_WEBHOOKS: dict[str, dict] = {}

_ALLOWED_EVENTS = {"issue.created", "issue.updated", "comment.created", "sla.breached"}

@webhooks_bp.route('/api/webhooks', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def list_webhooks():
    return {
        'webhooks': list(_WEBHOOKS.values()),
        'count': len(_WEBHOOKS),
        'allowed_events': sorted(_ALLOWED_EVENTS)
    }

@webhooks_bp.route('/api/webhooks', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def create_webhook():
    payload = request.get_json(force=True, silent=True) or {}
    url = (payload.get('url') or '').strip()
    event = (payload.get('event') or '').strip()
    if not url or not event:
        raise ValueError('url and event are required')
    if event not in _ALLOWED_EVENTS:
        raise ValueError(f'Unsupported event: {event}')
    hook_id = uuid.uuid4().hex[:12]
    record = {
        'id': hook_id,
        'url': url,
        'event': event,
        'created_at': datetime.now(UTC).isoformat(),
    }
    _WEBHOOKS[hook_id] = record
    logger.info(f"[WEBHOOKS] Registered {hook_id} -> {event} @ {url}")
    return {'created': True, 'webhook': record}

@webhooks_bp.route('/api/webhooks/<hook_id>', methods=['DELETE'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def delete_webhook(hook_id: str):
    if hook_id not in _WEBHOOKS:
        return {'deleted': False, 'error': 'Not found'}
    removed = _WEBHOOKS.pop(hook_id)
    logger.info(f"[WEBHOOKS] Deleted {hook_id}")
    return {'deleted': True, 'webhook': removed}
