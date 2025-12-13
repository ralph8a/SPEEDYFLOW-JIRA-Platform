"""
Notifications Helper - Auto-create notifications from issue changes
Integrates with existing load_queue_issues flow
"""
import logging
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from utils.db import create_notification
from api.blueprints.notifications import broadcast_notification

logger = logging.getLogger(__name__)

# Track processed issues to avoid duplicates (in-memory cache)
_processed_issues = {}
_cache_ttl = 300  # 5 minutes

def should_create_notification(issue_key: str, last_change: str) -> bool:
    """Check if we should create a notification for this issue change"""
    now = datetime.now()
    
    # Clean old cache entries
    for key in list(_processed_issues.keys()):
        cached_time = _processed_issues[key].get('timestamp')
        if (now - cached_time).total_seconds() > _cache_ttl:
            del _processed_issues[key]
    
    # Check if already processed recently
    if issue_key in _processed_issues:
        cached_change = _processed_issues[issue_key].get('last_change')
        if cached_change == last_change:
            return False  # Same change, skip
    
    # Update cache
    _processed_issues[issue_key] = {
        'last_change': last_change,
        'timestamp': now
    }
    
    return True

def create_issue_notification(
    issue_key: str,
    summary: str,
    status: str,
    assignee: Optional[str],
    change_type: str,
    last_change: str,
    metadata: Dict[str, Any],
    user_id: Optional[str] = None
) -> Optional[Dict]:
    """
    Create and broadcast a notification for an issue change
    
    Args:
        issue_key: Issue key (e.g., "PROJ-123")
        summary: Issue summary
        status: Current status
        assignee: Assignee display name
        change_type: 'updated', 'commented', 'status_changed'
        last_change: ISO timestamp of last change
        metadata: Additional metadata dict
        user_id: Optional user ID for per-user notification (None = global)
        
    Returns:
        Created notification dict or None
    """
    try:
        # Check if we should create notification
        if not should_create_notification(issue_key, last_change):
            return None
        
        # Determine notification type and message
        if change_type == 'commented':
            ntype = 'comment'
            icon = '💬'
            message = f"{icon} New comment on {issue_key}"
        elif change_type == 'status_changed':
            ntype = 'status_change'
            icon = '🔄'
            message = f"{icon} {issue_key} → {status}"
        else:
            ntype = 'issue_updated'
            icon = '📋'
            message = f"{icon} {issue_key}: {summary}"
        
        # Add summary to metadata if not present
        if 'summary' not in metadata:
            metadata['summary'] = summary
        if 'status' not in metadata:
            metadata['status'] = status
        if 'assignee' not in metadata:
            metadata['assignee'] = assignee or 'Unassigned'
        
        # Create notification
        rec = create_notification(
            ntype=ntype,
            message=message,
            severity='info',
            issue_key=issue_key,
            user=assignee,
            action=change_type,
            metadata=json.dumps(metadata),
            user_id=user_id
        )
        
        # Broadcast via SSE
        broadcast_notification(rec)
        
        logger.debug(f"✅ Created notification for {issue_key}: {change_type}")
        return rec
        
    except Exception as e:
        logger.error(f"❌ Failed to create notification for {issue_key}: {e}")
        return None

def create_issue_notifications_for_watchers(
    issue_key: str,
    summary: str,
    status: str,
    assignee: Optional[str],
    change_type: str,
    last_change: str,
    metadata: Dict[str, Any],
    watchers: List[Dict[str, Any]]
) -> int:
    """
    Create individual notifications for each watcher of an issue.
    Skips current user if they made the change.
    
    Args:
        issue_key: Issue key
        summary: Issue summary
        status: Current status
        assignee: Assignee display name
        change_type: Type of change
        last_change: ISO timestamp
        metadata: Metadata dict
        watchers: List of watcher dicts [{accountId, displayName}, ...]
        
    Returns:
        Number of notifications created
    """
    created = 0
    
    # Get current user from metadata if available (to avoid self-notify)
    current_user_id = metadata.get('current_user_id')
    
    for watcher in watchers:
        watcher_id = watcher.get('accountId')
        watcher_name = watcher.get('displayName', 'Unknown')
        
        # Skip if this is the user who made the change
        if current_user_id and watcher_id == current_user_id:
            logger.debug(f"Skipping self-notification for {watcher_name}")
            continue
        
        # Create notification for this watcher
        notification = create_issue_notification(
            issue_key=issue_key,
            summary=summary,
            status=status,
            assignee=assignee,
            change_type=change_type,
            last_change=last_change,
            metadata=metadata.copy(),
            user_id=watcher_id
        )
        
        if notification:
            created += 1
            logger.debug(f"👁️ Notified watcher: {watcher_name} ({issue_key})")
    
    return created

def process_issue_for_notifications(issue: Dict, enriched_data: Dict) -> None:
    """
    Process a single issue and create notifications if needed
    Called from load_queue_issues after enrichment
    Uses watchers to determine who should receive notifications
    
    Args:
        issue: Issue dict from Service Desk API
        enriched_data: Enriched data dict from JIRA API
    """
    try:
        issue_key = issue.get('key')
        if not issue_key or issue_key not in enriched_data:
            return
        
        enriched = enriched_data[issue_key]
        
        # Extract data
        summary = issue.get('summary', 'No summary')
        status = issue.get('status', {}).get('name', 'Unknown')
        assignee_obj = issue.get('assignee')
        assignee = None
        if assignee_obj and isinstance(assignee_obj, dict):
            assignee = assignee_obj.get('displayName')
        
        # Check if there are watchers
        watcher_count = enriched.get('watcher_count', 0)
        is_watching = enriched.get('is_watching', False)
        
        # Skip if no watchers (nobody to notify)
        if watcher_count == 0 and not is_watching:
            return
        
        last_change = enriched.get('last_real_change')
        if not last_change:
            return  # No recent changes
        
        # Check if change is recent (last 24 hours)
        try:
            change_time = datetime.fromisoformat(
                last_change.replace('Z', '+00:00')
            )
            now = datetime.now(change_time.tzinfo)
            hours_ago = (now - change_time).total_seconds() / 3600
            
            if hours_ago > 24:
                return  # Too old, skip
                
        except Exception as e:
            logger.debug(f"Failed to parse date for {issue_key}: {e}")
            return
        
        # Determine change type
        change_type = 'updated'
        metadata = {
            'last_change': last_change,
            'hours_ago': round(hours_ago, 1)
        }
        
        # Check if there are recent comments
        comments_count = enriched.get('comment_count', 0)
        if comments_count > 0:
            change_type = 'commented'
            metadata['comment_count'] = comments_count
        
        # Check changelog for status changes
        if enriched.get('had_changelog'):
            change_type = 'status_changed'
        
        # Fetch watchers and create per-user notifications
        try:
            from core.api import fetch_watchers_batch
            watchers_map = fetch_watchers_batch([issue_key])
            watchers = watchers_map.get(issue_key, [])
            
            if watchers:
                # Create notification for each watcher
                created = create_issue_notifications_for_watchers(
                    issue_key=issue_key,
                    summary=summary,
                    status=status,
                    assignee=assignee,
                    change_type=change_type,
                    last_change=last_change,
                    metadata=metadata,
                    watchers=watchers
                )
                logger.debug(f"📬 Created {created} notifications for watchers")
            else:
                # No watchers, create global notification
                create_issue_notification(
                    issue_key=issue_key,
                    summary=summary,
                    status=status,
                    assignee=assignee,
                    change_type=change_type,
                    last_change=last_change,
                    metadata=metadata
                )
        except Exception as watcher_err:
            # Fallback: create global notification
            logger.warning(f"Failed to fetch watchers: {watcher_err}")
            create_issue_notification(
                issue_key=issue_key,
                summary=summary,
                status=status,
                assignee=assignee,
                change_type=change_type,
                last_change=last_change,
                metadata=metadata
            )
        
    except Exception as e:
        logger.error(f"Error processing {issue.get('key')} for notif: {e}")

def process_issues_batch_for_notifications(
    issues: List[Dict],
    enriched_data: Dict
) -> int:
    """
    Process a batch of issues and create notifications
    
    Args:
        issues: List of issue dicts from Service Desk API
        enriched_data: Dict of enriched data keyed by issue_key
        
    Returns:
        Number of notifications created
    """
    created_count = 0
    
    for issue in issues:
        try:
            process_issue_for_notifications(issue, enriched_data)
            created_count += 1
        except Exception as e:
            logger.debug(f"Skipped notification for {issue.get('key')}: {e}")
            continue
    
    if created_count > 0:
        logger.info(f"📬 Created {created_count} notifications from batch")
    
    return created_count
