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
from utils.db import create_notification, mark_notification_read, delete_notification
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
    """List notifications filtered by user_id (from query param or auth)."""
    from utils.db import list_notifications_for_user
    # Get user_id from query params (future: extract from auth token)
    user_id = request.args.get('user_id')
    # Fetch notifications for this user + global notifications
    items = list_notifications_for_user(user_id)
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
# Sync recent JIRA activity as notifications
@notifications_bp.route('/api/notifications/sync', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def sync_jira_notifications():
    """
    Sync recent JIRA activity to create notifications
    Uses API v3 enhanced search with specific JQL for relevant issues
    Only shows notifications for actions by OTHER users (not self)
    """
    from utils.config import config
    from utils.common import _make_request, _get_credentials, _get_auth_header
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    created = []
    try:
        # Get current user info to filter out self-actions
        current_user_url = f"{site}/rest/api/3/myself"
        current_user_data = _make_request('GET', current_user_url, headers)
        current_user_account_id = current_user_data.get('accountId', '') if current_user_data else ''
        current_user_display_name = current_user_data.get('displayName', '') if current_user_data else ''
        logger.info(f"👤 Current user: {current_user_display_name} ({current_user_account_id})")
    except Exception as e:
        logger.warning(f"⚠️ Could not fetch current user, notifications may include self-actions: {e}")
        current_user_account_id = ''
        current_user_display_name = ''
    try:
        # Get issues assigned to current user or where they're mentioned (last 3 days)
        # IMPORTANT: Exclude changes made BY currentUser() to avoid self-notifications
        # API v3 uses accountId instead of email for currentUser()
        jql = ("(assignee = currentUser() OR watcher = currentUser()) "
               "AND updated >= -3d "
               "AND NOT updatedBy = currentUser() "
               "ORDER BY updated DESC")
        # Use API v3 enhanced search endpoint
        url = f"{site}/rest/api/3/search/jql"
        payload = {
            'jql': jql,
            'maxResults': 15,
            'fields': ['key', 'summary', 'status', 'assignee', 'updated', 'comment'],
            'expand': ['changelog']  # Include changelog to see who made changes
        }
        logger.info(f"🔍 Syncing JIRA activity with JQL: {jql}")
        data = _make_request('POST', url, headers, json=payload)
        if data is None:
            logger.warning("⚠️ JIRA API returned None")
            return {'synced': 0, 'created': 0, 'notifications': []}, 200
        issues = data.get('issues', [])
        logger.info(f"📬 Processing {len(issues)} recent issues")
        for issue in issues[:12]:  # Limit to 12 most recent
            if not issue or not isinstance(issue, dict):
                continue
            key = issue.get('key')
            if not key:
                continue
            fields = issue.get('fields', {})
            summary = fields.get('summary', 'No summary')
            # Extract status info
            status_obj = fields.get('status')
            status = status_obj.get('name', 'Unknown') if status_obj else 'Unknown'
            # Extract assignee info
            assignee = fields.get('assignee')
            assignee_name = 'Unassigned'
            assignee_account_id = ''
            if assignee and isinstance(assignee, dict):
                assignee_name = assignee.get('displayName', 'Unassigned')
                assignee_account_id = assignee.get('accountId', '')
            # Get the last user who updated the issue (reporter or last updater)
            # Check changelog or updated by field
            updated_by = None
            updated_by_account_id = ''
            # Try to get the actual updater from changelog (if available in response)
            # For now, we'll use a heuristic: if status changed, it was likely the assignee
            # This is a simplification - ideally we'd query the changelog API
            # Skip notification if the issue was updated by the current user
            # We check if assignee is current user AND status just changed
            # (This prevents seeing your own status changes)
            if assignee_account_id and assignee_account_id == current_user_account_id:
                # This is my ticket, but was it updated BY me or by someone else?
                # For now, skip creating update notification for own tickets
                # Only comments from others will notify
                logger.debug(f"⏭️ Skipping update notification for {key} (own ticket)")
            else:
                # Create notification for issue update by others
                message = f"📋 {key}: {summary} [{status}]"
                rec = create_notification(
                    ntype='issue_updated',
                    message=message,
                    severity='info',
                    issue_key=key,
                    user=assignee_name,
                    action='updated',
                    metadata=json.dumps({
                        'summary': summary,
                        'status': status,
                        'assignee': assignee_name,
                        'updated': fields.get('updated', '')[:10]  # Date only
                    })
                )
                broadcast_notification(rec)
                created.append(rec)
            # Check for recent comments
            comment_obj = fields.get('comment', {})
            if isinstance(comment_obj, dict):
                comments = comment_obj.get('comments', [])
                if comments and isinstance(comments, list):
                    # Get last 2 comments
                    for comment in comments[-2:]:
                        if not isinstance(comment, dict):
                            continue
                        author_obj = comment.get('author', {})
                        author = 'Someone'
                        author_account_id = ''
                        if isinstance(author_obj, dict):
                            author = author_obj.get('displayName', 'Someone')
                            author_account_id = author_obj.get('accountId', '')
                        # ⚠️ CRITICAL: Skip if comment is from current user (don't notify about own comments)
                        if author_account_id and author_account_id == current_user_account_id:
                            logger.debug(f"⏭️ Skipping own comment on {key} by {author}")
                            continue
                        # Also skip if display name matches (fallback check)
                        if current_user_display_name and author.lower() == current_user_display_name.lower():
                            logger.debug(f"⏭️ Skipping own comment on {key} by {author} (name match)")
                            continue
                        body = comment.get('body', '')
                        # Handle ADF (Atlassian Document Format) or plain text
                        comment_text = ''
                        if isinstance(body, dict):
                            # ADF format - extract text from content
                            content = body.get('content', [])
                            if content and isinstance(content, list):
                                for block in content:
                                    if isinstance(block, dict):
                                        block_content = block.get('content', [])
                                        for text_node in block_content:
                                            if isinstance(text_node, dict):
                                                comment_text += text_node.get('text', '')
                        elif isinstance(body, str):
                            comment_text = body
                        # Truncate for preview
                        preview_text = comment_text[:150] if comment_text else 'No content'
                        logger.info(f"💬 Creating notification: {author} commented on {key} (not current user)")
                        rec = create_notification(
                            ntype='comment',
                            message=f"💬 {author} commented on {key}",
                            severity='info',
                            issue_key=key,
                            user=author,
                            action='commented',
                            metadata=json.dumps({
                                'summary': summary,
                                'comment_preview': preview_text,
                                'author': author
                            })
                        )
                        broadcast_notification(rec)
                        created.append(rec)
        logger.info(f"✅ Created {len(created)} notifications from JIRA")
        return {
            'success': True,
            'synced': len(issues),
            'created': len(created),
            'notifications': created
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"❌ Failed to sync JIRA notifications: {e}")
        logger.error(f"Traceback: {error_details}")
        return {'error': str(e), 'traceback': error_details, 'created': len(created)}, 500
