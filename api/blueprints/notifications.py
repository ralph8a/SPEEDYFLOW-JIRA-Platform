"""Notifications blueprint with lightweight SQLite persistence and real-time SSE.

Endpoints:
    GET  /api/notifications                 -> list all notifications
    GET  /api/notifications/stream          -> SSE stream for real-time updates
    POST /api/notifications                 -> create notification (JSON {type, message, severity?})
    POST /api/notifications/<id>/read       -> mark a notification as read
    DELETE /api/notifications/<id>          -> delete notification
    POST /api/notifications/test            -> legacy stub (now creates a sample notification) kept for backward compatibility
"""
from flask import Blueprint, request, Response
import logging
import json
import queue
import threading
from utils.decorators import handle_api_error, json_response, log_request as log_decorator, require_credentials, rate_limited
from utils.db import create_notification, list_notifications as db_list, mark_notification_read, delete_notification

logger = logging.getLogger(__name__)
notifications_bp = Blueprint('notifications', __name__)

# SSE broadcasting system
sse_clients = []
sse_clients_lock = threading.Lock()

def broadcast_notification(notification):
    """Broadcast notification to all connected SSE clients."""
    with sse_clients_lock:
        for client_queue in sse_clients:
            try:
                client_queue.put_nowait(notification)
            except queue.Full:
                logger.warning("Client queue full, skipping notification")
            except Exception as e:
                logger.error("Error broadcasting to client: %s", str(e))


@notifications_bp.route('/api/notifications/stream', methods=['GET'])
@require_credentials
def notifications_stream():
    """SSE endpoint for real-time notification updates."""
    def generate():
        client_queue = queue.Queue(maxsize=50)
        with sse_clients_lock:
            sse_clients.append(client_queue)
        
        logger.info("📡 New SSE client connected")
        
        try:
            # Send initial connection event
            conn_msg = '{"type": "connected", "message": "Connected"}'
            yield f"data: {conn_msg}\n\n"
            
            while True:
                try:
                    # Wait for notification with timeout
                    notification = client_queue.get(timeout=30)
                    
                    # Send notification as SSE event
                    event_data = json.dumps(notification)
                    yield f"data: {event_data}\n\n"
                    
                except queue.Empty:
                    # Send keepalive comment every 30 seconds
                    yield ": keepalive\n\n"
                    
        except GeneratorExit:
            logger.info("📡 SSE client disconnected")
        finally:
            with sse_clients_lock:
                if client_queue in sse_clients:
                    sse_clients.remove(client_queue)
    
    return Response(generate(), mimetype='text/event-stream', headers={
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
        'Connection': 'keep-alive'
    })


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
    
    # Broadcast to SSE clients
    broadcast_notification(rec)
    
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
    
    # Broadcast to SSE clients
    broadcast_notification(rec)
    
    return {'created': True, 'id': rec['id'], 'message': rec['message']}
