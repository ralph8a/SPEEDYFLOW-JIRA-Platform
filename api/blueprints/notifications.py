"""Notifications blueprint with lightweight SQLite persistence.

Endpoints:
    GET  /api/notifications                 -> list all notifications
    POST /api/notifications                 -> create notification (JSON {type, message, severity?})
    POST /api/notifications/<id>/read       -> mark a notification as read
    DELETE /api/notifications/<id>          -> delete notification
    POST /api/notifications/test            -> legacy stub (now creates a sample notification) kept for backward compatibility
"""
from flask import Blueprint, request
import logging
from utils.decorators import handle_api_error, json_response, log_request as log_decorator, require_credentials, rate_limited
from utils.db import create_notification, list_notifications as db_list, mark_notification_read, delete_notification

logger = logging.getLogger(__name__)
notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/api/notifications', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def list_notifications():
    items = db_list()
    return {'notifications': items, 'count': len(items)}


@notifications_bp.route('/api/notifications', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=20, period=60)  # creation limited
@require_credentials
def create_notification_endpoint():
    data = request.get_json(silent=True) or {}
    ntype = data.get('type') or 'generic'
    message = data.get('message') or 'No message provided'
    severity = data.get('severity') or 'info'
    rec = create_notification(ntype, message, severity)
    return {'created': True, 'notification': rec}


@notifications_bp.route('/api/notifications/<int:nid>/read', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=60, period=60)  # marking read more frequent
@require_credentials
def mark_read_endpoint(nid: int):
    rec = mark_notification_read(nid)
    if not rec:
        return {'error': 'Notification not found', 'id': nid}, 404
    return {'updated': True, 'notification': rec}


@notifications_bp.route('/api/notifications/<int:nid>', methods=['DELETE'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=20, period=60)
@require_credentials
def delete_notification_endpoint(nid: int):
    ok = delete_notification(nid)
    if not ok:
        return {'error': 'Notification not found', 'id': nid}, 404
    return {'deleted': True, 'id': nid}


# Backward compatibility test endpoint
@notifications_bp.route('/api/notifications/test', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def create_test_notification():
    rec = create_notification('test', 'Stub notification created')
    return {'created': True, 'id': rec['id'], 'message': rec['message']}
