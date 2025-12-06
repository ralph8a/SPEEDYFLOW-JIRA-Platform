"""
Comments Blueprint V2 - Complete Renovation
============================================
Handles all comment operations with JIRA Service Desk API integration.

Features:
- Get, Add, Update, Delete comments
- Internal vs Public visibility support
- Rich text formatting (JIRA ADF format)
- Attachment support
- Mention parsing
- Error handling and validation
"""
from flask import Blueprint, request
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Any
from utils.decorators import (
    handle_api_error,
    json_response,
    log_request as log_decorator,
    require_credentials
)
from utils.config import config
from utils.common import _make_request, _get_credentials, _get_auth_header
from utils.db import create_notification

logger = logging.getLogger(__name__)

comments_v2_bp = Blueprint('comments_v2', __name__)


# ============================================================================
# MENTION DETECTION
# ============================================================================

class MentionDetector:
    """Detects and extracts @mentions from comment text"""
    
    # Regex pattern for mentions: @username (alphanumeric, dots, underscores, hyphens)
    MENTION_PATTERN = r'@([a-zA-Z0-9._-]+)'
    
    @staticmethod
    def extract_mentions(text: str) -> List[str]:
        """
        Extract all mentioned usernames from text
        
        Args:
            text: Comment text to search
            
        Returns:
            List of unique mentioned usernames (without @)
        """
        if not text:
            return []
        
        matches = re.findall(MentionDetector.MENTION_PATTERN, text)
        # Return unique mentions, preserving order
        seen = set()
        unique = []
        for match in matches:
            if match not in seen:
                unique.append(match)
                seen.add(match)
        return unique
    
    @staticmethod
    def format_mentions_html(text: str) -> str:
        """
        Format mentions in text with HTML spans for highlighting
        
        Args:
            text: Text with @mentions
            
        Returns:
            Text with mentions wrapped in <span> tags
        """
        def replace_mention(match):
            username = match.group(1)
            return f'<span class="mention" data-user="{username}">@{username}</span>'
        
        return re.sub(MentionDetector.MENTION_PATTERN, replace_mention, text)


# ============================================================================
# IMAGE PARSING FOR PREVIEW
# ============================================================================

class ImageParser:
    """Parse JIRA image syntax for inline image preview"""
    
    # JIRA image format: ![filename|options]
    # Example: ![image.jpg|width=500,alt="description"]
    IMAGE_PATTERN = r'!\[([^\|\]]+)(?:\|[^\]]*)?\]'
    
    @staticmethod
    def extract_images(text: str) -> List[str]:
        """
        Extract image filenames from JIRA format
        
        Args:
            text: Comment text with image syntax
            
        Returns:
            List of image filenames
        """
        if not text:
            return []
        
        matches = re.findall(ImageParser.IMAGE_PATTERN, text)
        return [filename.strip() for filename in matches]
    
    @staticmethod
    def render_images_html(text: str, issue_key: str, attachment_map: Dict[str, str]) -> str:
        """
        Convert JIRA image syntax to HTML img tags
        
        Args:
            text: Comment text with ![filename] syntax
            issue_key: JIRA issue key
            attachment_map: Map of filename -> attachment_id
            
        Returns:
            Text with images replaced by HTML <img> tags
        """
        if not text or not issue_key:
            return text
        
        def replace_image(match):
            filename = match.group(1).strip()
            
            # Check if it's an image file
            image_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
            file_extension = filename.split('.')[-1].lower()
            
            if file_extension in image_extensions and attachment_map:
                attachment_id = attachment_map.get(filename)
                if attachment_id:
                    image_url = f"/api/issues/{issue_key}/attachments/{attachment_id}"
                    return f'<div class="comment-inline-image"><img src="{image_url}" alt="{filename}" title="{filename}" /></div>'
            
            return match.group(0)  # Return original if not found
        
        return re.sub(ImageParser.IMAGE_PATTERN, replace_image, text)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def convert_text_to_adf(text: str) -> Dict[str, Any]:
    """
    Convert plain text to JIRA Atlassian Document Format (ADF).
    
    Args:
        text: Plain text string
        
    Returns:
        ADF document structure
    """
    if not text or not text.strip():
        # Return minimal valid ADF with empty paragraph
        return {
            "version": 1,
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": " "
                        }
                    ]
                }
            ]
        }
    
    # Split text into paragraphs
    paragraphs = text.strip().split('\n\n')
    
    content = []
    for para in paragraphs:
        if not para.strip():
            continue
            
        # Create paragraph node with text nodes for each line
        lines = para.split('\n')
        paragraph_content = []
        
        for i, line in enumerate(lines):
            if line.strip():
                paragraph_content.append({
                    "type": "text",
                    "text": line
                })
                # Add hard break between lines within paragraph
                if i < len(lines) - 1:
                    paragraph_content.append({"type": "hardBreak"})
        
        if paragraph_content:
            content.append({
                "type": "paragraph",
                "content": paragraph_content
            })
    
    # Ensure we have at least one paragraph
    if not content:
        content = [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": text.strip()
                    }
                ]
            }
        ]
    
    return {
        "version": 1,
        "type": "doc",
        "content": content
    }


def convert_adf_to_text(adf: Dict[str, Any]) -> str:
    """
    Convert JIRA ADF format to plain text.
    
    Args:
        adf: ADF document structure
        
    Returns:
        Plain text string
    """
    if not isinstance(adf, dict):
        return str(adf)
    
    if adf.get('type') == 'doc':
        content = adf.get('content', [])
        paragraphs = []
        
        for node in content:
            if node.get('type') == 'paragraph':
                para_text = []
                for text_node in node.get('content', []):
                    if text_node.get('type') == 'text':
                        para_text.append(text_node.get('text', ''))
                    elif text_node.get('type') == 'hardBreak':
                        para_text.append('\n')
                paragraphs.append(''.join(para_text))
        
        return '\n\n'.join(paragraphs)
    
    return str(adf)


def notify_mentioned_users(
    issue_key: str,
    mentions: List[str],
    comment: Dict[str, Any],
    comment_author: str
) -> None:
    """
    Send notifications to users mentioned in a comment.
    
    Args:
        issue_key: JIRA issue key where comment was added
        mentions: List of mentioned usernames
        comment: Comment data (id, body, etc.)
        comment_author: Username of comment author
    """
    if not mentions:
        return
    
    comment_id = comment.get('id', '')
    comment_preview = comment.get('body', '')[:150]  # First 150 chars for preview
    
    for username in mentions:
        try:
            import json
            from api.blueprints.notifications import broadcast_notification
            
            # Build detailed notification message
            message = f"mentioned you in a comment on {issue_key}"
            
            # Store full context as metadata
            metadata_json = {
                'author': comment_author,
                'comment_preview': comment_preview,
                'full_body': comment.get('body', '')[:500]  # Store more text
            }
            
            rec = create_notification(
                ntype='mention',
                message=message,
                severity='info',
                issue_key=issue_key,
                user=comment_author,
                action='mentioned',
                metadata=json.dumps(metadata_json)
            )
            
            # Broadcast real-time
            broadcast_notification(rec)
            
            logger.info(
                f"📬 Notification sent to @{username} for mention in {issue_key}"
            )
            
        except Exception as e:
            logger.error(
                f"❌ Failed to notify @{username}: {e}"
            )


def parse_comment_for_display(
    raw_comment: Dict,
    issue_key: str = '',
    attachment_map: Dict[str, str] = None
) -> Dict[str, Any]:
    """
    Parse JIRA comment into display-friendly format.
    
    Args:
        raw_comment: Raw comment data from JIRA API
        issue_key: JIRA issue key (for image rendering)
        attachment_map: Map of filename -> attachment_id (for images)
        
    Returns:
        Parsed comment dict with standardized fields
    """
    comment_id = raw_comment.get('id', '')
    
    # Parse author
    author_obj = raw_comment.get('author', {})
    if isinstance(author_obj, dict):
        author_name = author_obj.get('displayName', 'Unknown')
        author_email = author_obj.get('emailAddress', '')
        author_id = author_obj.get('accountId', '')
    else:
        author_name = 'Unknown'
        author_email = ''
        author_id = ''
    
    # Parse body (handle both string and ADF format)
    body = raw_comment.get('body', '')
    if isinstance(body, dict):
        body = convert_adf_to_text(body)
    elif not isinstance(body, str):
        body = str(body)
    
    # Extract mentions from body
    mentions = MentionDetector.extract_mentions(body)
    
    # Extract image references
    images = ImageParser.extract_images(body)
    
    # Render images inline if attachment map provided
    body_html = body
    if issue_key and attachment_map:
        body_html = ImageParser.render_images_html(
            body, issue_key, attachment_map
        )
    
    # Parse timestamps
    created = raw_comment.get('created', '')
    updated = raw_comment.get('updated', '')
    
    # Parse visibility (internal vs public)
    visibility = raw_comment.get('jsdPublic', True)  # Default to public
    
    return {
        'id': comment_id,
        'author': author_name,
        'author_email': author_email,
        'author_id': author_id,
        'body': body,
        'body_html': body_html,
        'mentions': mentions,
        'images': images,
        'created': created,
        'updated': updated,
        'edited': updated != created if (updated and created) else False,
        'visibility': 'public' if visibility else 'internal'
    }


# ============================================================================
# API ENDPOINTS
# ============================================================================

@comments_v2_bp.route('/api/v2/issues/<issue_key>/comments', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def get_comments_v2(issue_key):
    """
    Get all comments for an issue with attachments for image preview.
    
    Query Parameters:
        - expand: Optional fields to expand (e.g., 'renderedBody')
        - orderBy: Sort order (created, -created)
        
    Returns:
        {
            "success": true,
            "comments": [...],
            "attachments": [...],
            "attachment_map": {"filename.jpg": "12345"},
            "count": 10,
            "issue_key": "MSM-1234"
        }
    """
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    
    # Get query parameters
    expand = request.args.get('expand', '')
    order_by = request.args.get('orderBy', 'created')
    
    # Fetch issue data with attachments in single request
    issue_url = f"{site}/rest/api/2/issue/{issue_key}"
    issue_params = {'fields': 'attachment'}
    
    logger.info(f"Fetching issue and attachments for {issue_key}")
    issue_response = _make_request('GET', issue_url, headers, params=issue_params)
    
    # Extract attachments
    attachments = []
    attachment_map = {}
    if issue_response and 'fields' in issue_response:
        atts = issue_response.get('fields', {}).get('attachment', []) or []
        for att in atts:
            att_id = att.get('id', '')
            filename = att.get('filename', '')
            attachments.append({
                'id': att_id,
                'filename': filename,
                'size': att.get('size', 0),
                'mimetype': att.get('mimeType', ''),
                'content_url': att.get('content', ''),
                'created': att.get('created', ''),
                'author': att.get('author', {}).get('displayName', '')
                         if isinstance(att.get('author'), dict) else ''
            })
            if att_id and filename:
                attachment_map[filename] = att_id
    
    # Build comments URL
    url = f"{site}/rest/api/2/issue/{issue_key}/comment"
    params = {}
    if expand:
        params['expand'] = expand
    if order_by:
        params['orderBy'] = order_by
    
    logger.info(f"Fetching comments for {issue_key}")
    
    # Make request
    response = _make_request('GET', url, headers, params=params)
    
    if not response:
        return {
            'success': False,
            'error': 'Failed to fetch comments',
            'comments': [],
            'attachments': attachments,
            'attachment_map': attachment_map,
            'count': 0,
            'issue_key': issue_key
        }
    
    # Parse comments with attachment map for image rendering
    raw_comments = response.get('comments', [])
    parsed_comments = [
        parse_comment_for_display(c, issue_key, attachment_map)
        for c in raw_comments
    ]
    
    logger.info(
        f"Retrieved {len(parsed_comments)} comments and "
        f"{len(attachments)} attachments for {issue_key}"
    )
    
    return {
        'success': True,
        'comments': parsed_comments,
        'attachments': attachments,
        'attachment_map': attachment_map,
        'count': len(parsed_comments),
        'issue_key': issue_key,
        'total': response.get('total', len(parsed_comments))
    }


@comments_v2_bp.route('/api/v2/issues/<issue_key>/comments', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def add_comment_v2(issue_key):
    """
    Add a new comment to an issue.
    
    Request Body:
        {
            "body": "Comment text",
            "internal": false,  // Optional: internal note vs public
            "format": "text"    // Optional: "text" or "adf"
        }
        
    Returns:
        {
            "success": true,
            "comment": {...},
            "comment_id": "12345"
        }
    """
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    
    # Parse request
    data = request.get_json() if request.is_json else {}
    comment_text = data.get('body', '').strip()
    is_internal = data.get('internal', False)
    format_type = data.get('format', 'text')
    
    if not comment_text:
        return {
            'success': False,
            'error': 'Comment body is required'
        }, 400
    
    # Extract mentions before processing
    mentions = MentionDetector.extract_mentions(comment_text)
    
    # Build comment payload
    payload = {}
    
    # Convert text to appropriate format - API v3 requires ADF
    if format_type == 'adf':
        # Assume already in ADF format (dict)
        if isinstance(comment_text, dict):
            payload['body'] = comment_text
        else:
            # If string, convert to ADF
            payload['body'] = convert_text_to_adf(comment_text)
    else:
        # Plain text - convert to ADF
        payload['body'] = convert_text_to_adf(comment_text)
    
    # Set visibility for Service Desk using API v3 properties structure
    # API v3 uses "properties" array for Service Desk visibility
    if not is_internal:
        # Public comment (visible to customers)
        payload['properties'] = [
            {
                "key": "sd.public.comment",
                "value": {"internal": False}
            }
        ]
    else:
        # Internal comment (only agents can see)
        payload['properties'] = [
            {
                "key": "sd.public.comment",
                "value": {"internal": True}
            }
        ]
    
    visibility_str = 'internal' if is_internal else 'public'
    logger.info(f"Adding {visibility_str} comment to {issue_key}")
    if mentions:
        logger.info(f"📢 Mentions detected: {', '.join(mentions)}")
    
    # Log the payload for debugging
    import json
    logger.info(f"📝 Comment payload: {json.dumps(payload, indent=2)}")
    
    # Make request using API v3 for better Service Desk support
    url = f"{site}/rest/api/3/issue/{issue_key}/comment"
    response = _make_request('POST', url, headers, json=payload)
    
    if not response:
        return {
            'success': False,
            'error': 'Failed to add comment'
        }, 500
    
    # Parse response
    parsed_comment = parse_comment_for_display(response)
    
    logger.info(f"✅ Comment added successfully: {parsed_comment['id']}")
    
    # Send notifications to mentioned users
    if mentions:
        notify_mentioned_users(
            issue_key=issue_key,
            mentions=mentions,
            comment=parsed_comment,
            comment_author=parsed_comment.get('author', 'Unknown')
        )
    
    return {
        'success': True,
        'comment': parsed_comment,
        'comment_id': parsed_comment['id'],
        'mentions': mentions,
        'message': 'Comment added successfully',
        'timestamp': datetime.now().isoformat()
    }


@comments_v2_bp.route('/api/v2/issues/<issue_key>/comments/<comment_id>', methods=['PUT'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def update_comment_v2(issue_key, comment_id):
    """
    Update an existing comment.
    
    Request Body:
        {
            "body": "Updated comment text",
            "format": "text"  // Optional: "text" or "adf"
        }
        
    Returns:
        {
            "success": true,
            "comment": {...},
            "message": "Comment updated successfully"
        }
    """
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    
    # Parse request
    data = request.get_json() if request.is_json else {}
    comment_text = data.get('body', '').strip()
    format_type = data.get('format', 'text')
    
    if not comment_text:
        return {
            'success': False,
            'error': 'Comment body is required'
        }, 400
    
    # Build payload
    payload = {}
    
    if format_type == 'adf':
        payload['body'] = comment_text
    else:
        payload['body'] = convert_text_to_adf(comment_text)
    
    logger.info(f"Updating comment {comment_id} on {issue_key}")
    
    # Make request
    url = f"{site}/rest/api/2/issue/{issue_key}/comment/{comment_id}"
    response = _make_request('PUT', url, headers, json=payload)
    
    if not response:
        return {
            'success': False,
            'error': 'Failed to update comment'
        }, 500
    
    # Parse response
    parsed_comment = parse_comment_for_display(response)
    
    logger.info(f"✅ Comment updated successfully: {comment_id}")
    
    return {
        'success': True,
        'comment': parsed_comment,
        'comment_id': comment_id,
        'message': 'Comment updated successfully'
    }


@comments_v2_bp.route('/api/v2/issues/<issue_key>/comments/<comment_id>', methods=['DELETE'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def delete_comment_v2(issue_key, comment_id):
    """
    Delete a comment.
    
    Returns:
        {
            "success": true,
            "message": "Comment deleted successfully"
        }
    """
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    
    logger.info(f"Deleting comment {comment_id} from {issue_key}")
    
    # Make request
    url = f"{site}/rest/api/2/issue/{issue_key}/comment/{comment_id}"
    _make_request('DELETE', url, headers)
    
    logger.info(f"✅ Comment deleted successfully: {comment_id}")
    
    return {
        'success': True,
        'comment_id': comment_id,
        'message': 'Comment deleted successfully'
    }


@comments_v2_bp.route('/api/v2/issues/<issue_key>/comments/count', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.DEBUG)
@require_credentials
def get_comment_count_v2(issue_key):
    """
    Get comment count for an issue (lightweight).
    
    Returns:
        {
            "success": true,
            "count": 5,
            "issue_key": "MSM-1234"
        }
    """
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    
    # Get issue with only comment field
    url = f"{site}/rest/api/2/issue/{issue_key}"
    params = {'fields': 'comment'}
    
    response = _make_request('GET', url, headers, params=params)
    
    if not response:
        return {
            'success': False,
            'error': 'Failed to get comment count',
            'count': 0
        }
    
    fields = response.get('fields', {})
    comment_field = fields.get('comment', {})
    total = comment_field.get('total', 0)
    
    return {
        'success': True,
        'count': total,
        'issue_key': issue_key
    }


@comments_v2_bp.route(
    '/api/v2/issues/<issue_key>/mentions/users',
    methods=['GET']
)
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def get_mentionable_users(issue_key):
    """
    Get list of users that can be mentioned in comments.
    Uses multiple JIRA APIs for comprehensive user list.
    
    Query Parameters:
        - query: Optional search query to filter users
        
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
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    
    # Get query parameter
    query = request.args.get('query', '')
    
    logger.info(
        f"📡 Fetching mentionable users for {issue_key} "
        f"(query: '{query}')"
    )
    
    all_users = {}  # Use dict to deduplicate by accountId
    
    # Strategy 1: Get assignable users (JIRA Platform API v2)
    try:
        url = f"{site}/rest/api/2/user/assignable/search"
        params = {
            'issueKey': issue_key,
            'maxResults': 50
        }
        
        if query:
            params['query'] = query
        
        response = _make_request('GET', url, headers, params=params)
        
        if response and isinstance(response, list):
            for user in response:
                account_id = user.get('accountId', '')
                if account_id and account_id not in all_users:
                    # Build username from available fields
                    username = (
                        user.get('name', '') or
                        user.get('key', '') or
                        user.get('displayName', '').lower().replace(' ', '.')
                    )
                    
                    all_users[account_id] = {
                        'accountId': account_id,
                        'displayName': user.get('displayName', ''),
                        'emailAddress': user.get('emailAddress', ''),
                        'avatarUrl': (
                            user.get('avatarUrls', {}).get('48x48', '')
                        ),
                        'username': username
                    }
            
            logger.info(
                f"  ✅ Found {len(response)} users from assignable API"
            )
    except Exception as e:
        logger.warning(f"  ⚠️ Assignable users API failed: {e}")
    
    # Strategy 2: Search users in project (JIRA Platform API v3)
    if query and len(all_users) < 20:
        try:
            url = f"{site}/rest/api/3/user/search"
            params = {
                'query': query,
                'maxResults': 30
            }
            
            response = _make_request('GET', url, headers, params=params)
            
            if response and isinstance(response, list):
                for user in response:
                    account_id = user.get('accountId', '')
                    if account_id and account_id not in all_users:
                        display_name = user.get('displayName', '')
                        username = display_name.lower().replace(' ', '.')
                        
                        all_users[account_id] = {
                            'accountId': account_id,
                            'displayName': display_name,
                            'emailAddress': user.get('emailAddress', ''),
                            'avatarUrl': (
                                user.get('avatarUrls', {}).get('48x48', '')
                            ),
                            'username': username
                        }
                
                logger.info(
                    f"  ✅ Found {len(response)} additional users "
                    f"from search API"
                )
        except Exception as e:
            logger.warning(f"  ⚠️ User search API failed: {e}")
    
    # Strategy 3: Get Service Desk customers (if it's a service desk issue)
    try:
        # Extract project key from issue_key (e.g., "MSM-123" -> "MSM")
        project_key = issue_key.split('-')[0]
        
        # Try to get service desk ID
        sd_url = f"{site}/rest/servicedeskapi/servicedesk"
        sd_response = _make_request('GET', sd_url, headers)
        
        if sd_response and 'values' in sd_response:
            for desk in sd_response['values']:
                if desk.get('projectKey') == project_key:
                    desk_id = desk.get('id')
                    
                    # Get customers from this service desk
                    customers_url = (
                        f"{site}/rest/servicedeskapi/servicedesk/"
                        f"{desk_id}/organization"
                    )
                    params = {'maxResults': 30}
                    customers_response = _make_request(
                        'GET', customers_url, headers, params=params
                    )
                    
                    if customers_response and 'values' in customers_response:
                        logger.info("  Found service desk customers")
                    break
    except (KeyError, ValueError, TypeError) as e:
        logger.debug("  Service desk API not available: %s", str(e))
    
    # Convert to list and sort by displayName
    users_list = list(all_users.values())
    users_list.sort(key=lambda u: u.get('displayName', '').lower())
    
    # If query provided, filter results client-side for better matching
    if query:
        query_lower = query.lower()
        users_list = [
            u for u in users_list
            if query_lower in u.get('displayName', '').lower()
            or query_lower in u.get('emailAddress', '').lower()
            or query_lower in u.get('username', '').lower()
        ]
    
    logger.info(
        "✅ Returning %d mentionable users for %s",
        len(users_list), issue_key
    )
    
    return {
        'success': True,
        'users': users_list[:50],  # Limit to 50 for performance
        'count': len(users_list[:50]),
        'issue_key': issue_key
    }
