"""
Notification Service - Handles all notification operations
Real-time event management, filtering, prioritization, and persistence
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import uuid
from enum import Enum

class NotificationCategory(Enum):
    """Notification categories"""
    ISSUE_CREATED = "issue_created"
    ISSUE_UPDATED = "issue_updated"
    ISSUE_ASSIGNED = "issue_assigned"
    COMMENT_ADDED = "comment_added"
    MENTION = "mention"
    STATUS_CHANGED = "status_changed"
    PRIORITY_CHANGED = "priority_changed"

class NotificationPriority(Enum):
    """Notification priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class Notification:
    """Notification data model"""
    
    def __init__(
        self,
        notification_type: str,
        category: NotificationCategory,
        priority: NotificationPriority,
        message: str,
        data: Dict[str, Any],
        user_id: Optional[str] = None
    ):
        self.id = str(uuid.uuid4())
        self.type = notification_type
        self.category = category.value
        self.priority = priority.value
        self.message = message
        self.data = data
        self.user_id = user_id
        self.acknowledged = False
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'type': self.type,
            'category': self.category,
            'priority': self.priority,
            'message': self.message,
            'data': self.data,
            'acknowledged': self.acknowledged,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'relative_time': self._get_relative_time()
        }
    
    def _get_relative_time(self) -> str:
        """Get relative time string (e.g., '5m ago')"""
        delta = datetime.utcnow() - self.created_at
        
        if delta.seconds < 60:
            return f"{delta.seconds}s ago"
        elif delta.seconds < 3600:
            minutes = delta.seconds // 60
            return f"{minutes}m ago"
        elif delta.seconds < 86400:
            hours = delta.seconds // 3600
            return f"{hours}h ago"
        else:
            days = delta.days
            return f"{days}d ago"

class NotificationService:
    """Service for managing notifications"""
    
    def __init__(self, max_notifications: int = 500):
        self.notifications: List[Notification] = []
        self.max_notifications = max_notifications
    
    def create_notification(
        self,
        notification_type: str,
        category: NotificationCategory,
        priority: NotificationPriority,
        message: str,
        data: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Notification:
        """Create and store a notification"""
        notification = Notification(
            notification_type=notification_type,
            category=category,
            priority=priority,
            message=message,
            data=data,
            user_id=user_id
        )
        
        self.notifications.insert(0, notification)
        
        # Keep max size
        if len(self.notifications) > self.max_notifications:
            self.notifications = self.notifications[:self.max_notifications]
        
        return notification
    
    def get_notifications(
        self,
        limit: int = 50,
        offset: int = 0,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        acknowledged: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """Get notifications with optional filtering"""
        results = self.notifications
        
        # Filter by category
        if category:
            results = [n for n in results if n.category == category]
        
        # Filter by priority
        if priority:
            results = [n for n in results if n.priority == priority]
        
        # Filter by acknowledged status
        if acknowledged is not None:
            results = [n for n in results if n.acknowledged == acknowledged]
        
        # Apply pagination
        paginated = results[offset:offset + limit]
        
        return [n.to_dict() for n in paginated]
    
    def get_notification(self, notification_id: str) -> Optional[Dict[str, Any]]:
        """Get single notification by ID"""
        for n in self.notifications:
            if n.id == notification_id:
                return n.to_dict()
        return None
    
    def acknowledge_notification(self, notification_id: str) -> bool:
        """Mark notification as acknowledged"""
        for n in self.notifications:
            if n.id == notification_id:
                n.acknowledged = True
                n.updated_at = datetime.utcnow()
                return True
        return False
    
    def acknowledge_all(self) -> int:
        """Acknowledge all unacknowledged notifications"""
        count = 0
        for n in self.notifications:
            if not n.acknowledged:
                n.acknowledged = True
                n.updated_at = datetime.utcnow()
                count += 1
        return count
    
    def delete_notification(self, notification_id: str) -> bool:
        """Delete notification by ID"""
        for i, n in enumerate(self.notifications):
            if n.id == notification_id:
                self.notifications.pop(i)
                return True
        return False
    
    def clear_old_notifications(self, days: int = 30) -> int:
        """Clear notifications older than X days"""
        cutoff = datetime.utcnow() - timedelta(days=days)
        original_count = len(self.notifications)
        
        self.notifications = [
            n for n in self.notifications
            if n.created_at > cutoff
        ]
        
        return original_count - len(self.notifications)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get notification statistics"""
        unread = [n for n in self.notifications if not n.acknowledged]
        
        priority_counts = {
            'critical': len([n for n in self.notifications if n.priority == 'critical']),
            'high': len([n for n in self.notifications if n.priority == 'high']),
            'medium': len([n for n in self.notifications if n.priority == 'medium']),
            'low': len([n for n in self.notifications if n.priority == 'low']),
        }
        
        category_counts = {}
        for cat in NotificationCategory:
            count = len([n for n in self.notifications if n.category == cat.value])
            if count > 0:
                category_counts[cat.value] = count
        
        return {
            'total': len(self.notifications),
            'unread': len(unread),
            'read': len(self.notifications) - len(unread),
            'by_priority': priority_counts,
            'by_category': category_counts,
            'oldest': self.notifications[-1].created_at.isoformat() if self.notifications else None,
            'newest': self.notifications[0].created_at.isoformat() if self.notifications else None
        }
    
    def get_by_priority(self, priority: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get notifications by priority level"""
        results = [n for n in self.notifications if n.priority == priority]
        return [n.to_dict() for n in results[:limit]]
    
    def get_by_category(self, category: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get notifications by category"""
        results = [n for n in self.notifications if n.category == category]
        return [n.to_dict() for n in results[:limit]]
    
    def get_unread(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get unread notifications"""
        results = [n for n in self.notifications if not n.acknowledged]
        return [n.to_dict() for n in results[:limit]]
    
    def set_retention_limit(self, user_id: str, retention_limit: int) -> bool:
        """Set user's notification retention preference (Phase 6.1)"""
        # Ensure retention limit is within valid range
        if retention_limit not in [10, 20, 50, 100, 200, 500]:
            return False
        
        if not hasattr(self, 'user_retention_settings'):
            self.user_retention_settings = {}
        
        self.user_retention_settings[user_id] = {
            'retention': retention_limit,
            'set_at': datetime.now().isoformat()
        }
        # NOTE: Do NOT mutate the global notifications list here. Retention is a
        # per-user preference and should be enforced when serving data to that
        # user (or stored client-side). Trimming the global list here removes
        # notifications for all users and can lead to missing/old notifications.
        return True
    
    def get_retention_limit(self, user_id: str) -> int:
        """Get user's notification retention preference (Phase 6.1)"""
        if hasattr(self, 'user_retention_settings') and user_id in self.user_retention_settings:
            return self.user_retention_settings[user_id]['retention']
        return 20  # Default to 20
    
    def search(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search notifications by message"""
        query_lower = query.lower()
        results = [
            n for n in self.notifications
            if query_lower in n.message.lower()
        ]
        return [n.to_dict() for n in results[:limit]]

# Global notification service instance
_notification_service = NotificationService()

def get_notification_service() -> NotificationService:
    """Get global notification service instance"""
    return _notification_service

