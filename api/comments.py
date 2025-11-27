#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Comments & Mentions System
Manages comments on issues with mention functionality
Phase 6: Comments & Mentions System
"""

import json
import re
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
import logging

logger = logging.getLogger(__name__)

# ===================================================================
# COMMENT MODEL
# ===================================================================

class Comment:
    """Represents a single comment on an issue"""
    
    def __init__(
        self,
        issue_key: str,
        author: str,
        text: str,
        comment_id: Optional[str] = None,
        parent_id: Optional[str] = None,
        mentions: Optional[List[str]] = None,
        timestamp: Optional[str] = None,
        edited: bool = False,
        edit_history: Optional[List[Dict]] = None
    ):
        """
        Initialize a comment
        
        Args:
            issue_key: The JIRA issue key (e.g., 'SALES-123')
            author: Username of comment author
            text: Comment text content
            comment_id: Unique comment ID (auto-generated if not provided)
            parent_id: ID of parent comment for threading
            mentions: List of mentioned usernames
            timestamp: Creation timestamp (auto-generated if not provided)
            edited: Whether comment has been edited
            edit_history: List of edit records
        """
        self.comment_id = comment_id or str(uuid.uuid4())
        self.issue_key = issue_key
        self.author = author
        self.text = text
        self.parent_id = parent_id
        self.mentions = mentions or []
        self.timestamp = timestamp or datetime.utcnow().isoformat()
        self.edited = edited
        self.edit_history = edit_history or []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert comment to dictionary"""
        return {
            'comment_id': self.comment_id,
            'issue_key': self.issue_key,
            'author': self.author,
            'text': self.text,
            'parent_id': self.parent_id,
            'mentions': self.mentions,
            'timestamp': self.timestamp,
            'edited': self.edited,
            'edit_history': self.edit_history
        }
    
    @staticmethod
    def from_dict(data: Dict) -> 'Comment':
        """Create comment from dictionary"""
        return Comment(
            issue_key=data['issue_key'],
            author=data['author'],
            text=data['text'],
            comment_id=data.get('comment_id'),
            parent_id=data.get('parent_id'),
            mentions=data.get('mentions', []),
            timestamp=data.get('timestamp'),
            edited=data.get('edited', False),
            edit_history=data.get('edit_history', [])
        )


# ===================================================================
# MENTION DETECTOR
# ===================================================================

class MentionDetector:
    """Detects and parses @mentions in comment text"""
    
    # Regex pattern for mentions: @username
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
    def format_mentions(text: str, highlight: bool = True) -> str:
        """
        Format mentions in text with HTML or markdown
        
        Args:
            text: Text with @mentions
            highlight: Whether to wrap in formatting tags
            
        Returns:
            Formatted text with mentions highlighted
        """
        if not highlight:
            return text
        
        # Replace @username with HTML span for highlighting
        def replace_mention(match):
            username = match.group(1)
            return f'<span class="mention" data-user="{username}">@{username}</span>'
        
        return re.sub(MentionDetector.MENTION_PATTERN, replace_mention, text)
    
    @staticmethod
    def get_autocomplete_suggestions(
        partial: str,
        available_users: List[str]
    ) -> List[str]:
        """
        Get mention autocomplete suggestions
        
        Args:
            partial: Partial username to match
            available_users: List of all available usernames
            
        Returns:
            List of matching usernames
        """
        if not partial:
            return available_users[:5]  # Return first 5
        
        partial_lower = partial.lower()
        matches = [u for u in available_users if u.lower().startswith(partial_lower)]
        return matches[:5]  # Return max 5 matches


# ===================================================================
# COMMENT STORAGE
# ===================================================================

class CommentStorage:
    """In-memory storage for comments (can be extended to database)"""
    
    def __init__(self):
        """Initialize storage"""
        self.comments: Dict[str, Comment] = {}  # comment_id -> Comment
        self.issue_comments: Dict[str, List[str]] = {}  # issue_key -> [comment_ids]
    
    def add_comment(self, comment: Comment) -> str:
        """
        Add a comment to storage
        
        Args:
            comment: Comment object to store
            
        Returns:
            Comment ID
        """
        # Store comment
        self.comments[comment.comment_id] = comment
        
        # Add to issue's comment list
        if comment.issue_key not in self.issue_comments:
            self.issue_comments[comment.issue_key] = []
        self.issue_comments[comment.issue_key].append(comment.comment_id)
        
        logger.info(f"✓ Comment created: {comment.comment_id} on {comment.issue_key}")
        return comment.comment_id
    
    def get_comment(self, comment_id: str) -> Optional[Comment]:
        """Get comment by ID"""
        return self.comments.get(comment_id)
    
    def get_issue_comments(self, issue_key: str) -> List[Comment]:
        """
        Get all comments for an issue
        
        Args:
            issue_key: JIRA issue key
            
        Returns:
            List of Comment objects sorted by timestamp
        """
        comment_ids = self.issue_comments.get(issue_key, [])
        comments = [self.comments[cid] for cid in comment_ids if cid in self.comments]
        # Sort by timestamp
        comments.sort(key=lambda c: c.timestamp)
        return comments
    
    def get_comment_thread(self, parent_id: str) -> List[Comment]:
        """
        Get all replies to a comment (comment thread)
        
        Args:
            parent_id: Parent comment ID
            
        Returns:
            List of reply Comment objects
        """
        replies = [c for c in self.comments.values() if c.parent_id == parent_id]
        replies.sort(key=lambda c: c.timestamp)
        return replies
    
    def update_comment(self, comment_id: str, text: str, author: str) -> bool:
        """
        Update comment text
        
        Args:
            comment_id: Comment to update
            text: New text
            author: User making the edit
            
        Returns:
            True if successful, False otherwise
        """
        comment = self.comments.get(comment_id)
        if not comment:
            return False
        
        # Store edit in history
        edit_record = {
            'timestamp': datetime.utcnow().isoformat(),
            'old_text': comment.text,
            'author': author
        }
        comment.edit_history.append(edit_record)
        
        # Update comment
        comment.text = text
        comment.edited = True
        comment.mentions = MentionDetector.extract_mentions(text)
        
        logger.info(f"✓ Comment updated: {comment_id}")
        return True
    
    def delete_comment(self, comment_id: str) -> bool:
        """
        Delete a comment
        
        Args:
            comment_id: Comment to delete
            
        Returns:
            True if successful, False otherwise
        """
        comment = self.comments.get(comment_id)
        if not comment:
            return False
        
        # Remove from storage
        del self.comments[comment_id]
        
        # Remove from issue's comment list
        if comment.issue_key in self.issue_comments:
            self.issue_comments[comment.issue_key].remove(comment_id)
        
        logger.info(f"✓ Comment deleted: {comment_id}")
        return True
    
    def search_comments(
        self,
        query: str,
        issue_key: Optional[str] = None
    ) -> List[Comment]:
        """
        Search comments by text
        
        Args:
            query: Search query
            issue_key: Optional issue to limit search
            
        Returns:
            List of matching comments
        """
        results = []
        query_lower = query.lower()
        
        # Search in specified issue or all issues
        if issue_key:
            comments = self.get_issue_comments(issue_key)
        else:
            comments = list(self.comments.values())
        
        for comment in comments:
            if query_lower in comment.text.lower():
                results.append(comment)
        
        return results


# ===================================================================
# COMMENT MANAGER
# ===================================================================

class CommentManager:
    """High-level comment management"""
    
    def __init__(self):
        """Initialize manager"""
        self.storage = CommentStorage()
        self.mention_detector = MentionDetector()
        # In real app, would load from database
    
    def create_comment(
        self,
        issue_key: str,
        author: str,
        text: str,
        parent_id: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Create a new comment
        
        Args:
            issue_key: JIRA issue key
            author: Comment author username
            text: Comment text
            parent_id: Optional parent comment ID for replies
            
        Returns:
            Tuple of (comment_id, error_message)
        """
        try:
            if not text or not text.strip():
                return None, "Comment text cannot be empty"
            
            if not issue_key or not author:
                return None, "Issue key and author required"
            
            # Extract mentions
            mentions = self.mention_detector.extract_mentions(text)
            
            # Create comment
            comment = Comment(
                issue_key=issue_key,
                author=author,
                text=text.strip(),
                parent_id=parent_id,
                mentions=mentions
            )
            
            # Store comment
            comment_id = self.storage.add_comment(comment)
            
            logger.info(f"✓ Comment created: {comment_id}")
            return comment_id, None
            
        except Exception as e:
            logger.error(f"❌ Error creating comment: {e}")
            return None, str(e)
    
    def get_comments(self, issue_key: str) -> Tuple[Optional[List[Dict]], Optional[str]]:
        """
        Get all comments for an issue
        
        Args:
            issue_key: JIRA issue key
            
        Returns:
            Tuple of (comments_list, error_message)
        """
        try:
            comments = self.storage.get_issue_comments(issue_key)
            comment_dicts = [c.to_dict() for c in comments]
            return comment_dicts, None
        except Exception as e:
            logger.error(f"❌ Error getting comments: {e}")
            return None, str(e)
    
    def get_comment_threads(self, issue_key: str) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Get comments organized as threads (parent + replies)
        
        Args:
            issue_key: JIRA issue key
            
        Returns:
            Tuple of (threads_dict, error_message)
        """
        try:
            comments = self.storage.get_issue_comments(issue_key)
            
            # Organize into threads (parent comments with their replies)
            threads = {}
            for comment in comments:
                if not comment.parent_id:  # Root-level comment
                    thread_data = comment.to_dict()
                    thread_data['replies'] = []
                    
                    # Get replies
                    replies = self.storage.get_comment_thread(comment.comment_id)
                    thread_data['replies'] = [r.to_dict() for r in replies]
                    
                    threads[comment.comment_id] = thread_data
            
            return threads, None
        except Exception as e:
            logger.error(f"❌ Error getting comment threads: {e}")
            return None, str(e)
    
    def update_comment(
        self,
        comment_id: str,
        text: str,
        author: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Update a comment
        
        Args:
            comment_id: Comment to update
            text: New text
            author: User making the edit
            
        Returns:
            Tuple of (success, error_message)
        """
        try:
            if not text or not text.strip():
                return False, "Comment text cannot be empty"
            
            # Verify author owns comment
            comment = self.storage.get_comment(comment_id)
            if not comment:
                return False, "Comment not found"
            
            if comment.author != author:
                return False, "Only comment author can edit"
            
            # Update comment
            success = self.storage.update_comment(comment_id, text.strip(), author)
            return success, None if success else "Update failed"
            
        except Exception as e:
            logger.error(f"❌ Error updating comment: {e}")
            return False, str(e)
    
    def delete_comment(self, comment_id: str, author: str) -> Tuple[bool, Optional[str]]:
        """
        Delete a comment
        
        Args:
            comment_id: Comment to delete
            author: User making the deletion
            
        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Verify author owns comment
            comment = self.storage.get_comment(comment_id)
            if not comment:
                return False, "Comment not found"
            
            if comment.author != author:
                return False, "Only comment author can delete"
            
            # Delete comment
            success = self.storage.delete_comment(comment_id)
            return success, None if success else "Deletion failed"
            
        except Exception as e:
            logger.error(f"❌ Error deleting comment: {e}")
            return False, str(e)
    
    def get_mention_suggestions(
        self,
        partial: str,
        available_users: Optional[List[str]] = None
    ) -> List[str]:
        """
        Get mention autocomplete suggestions
        
        Args:
            partial: Partial username
            available_users: List of available users
            
        Returns:
            List of suggested usernames
        """
        if available_users is None:
            available_users = ['john.doe', 'jane.smith', 'bob.wilson', 
                             'alice.johnson', 'charlie.brown']
        
        return self.mention_detector.get_autocomplete_suggestions(partial, available_users)
    
    def get_mentioned_users(self, issue_key: str) -> List[str]:
        """
        Get all users mentioned in comments on an issue
        
        Args:
            issue_key: JIRA issue key
            
        Returns:
            List of unique usernames mentioned
        """
        comments = self.storage.get_issue_comments(issue_key)
        all_mentions = set()
        for comment in comments:
            all_mentions.update(comment.mentions)
        return sorted(list(all_mentions))
    
    def get_user_mentions(self, username: str) -> List[Dict]:
        """
        Get all places where a user is mentioned
        
        Args:
            username: Username to search for
            
        Returns:
            List of comment dictionaries containing the mention
        """
        results = []
        for comment in self.storage.comments.values():
            if username in comment.mentions:
                results.append({
                    'comment': comment.to_dict(),
                    'issue_key': comment.issue_key
                })
        return results
    
    def export_comments(self, issue_key: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Export comments as JSON
        
        Args:
            issue_key: JIRA issue key
            
        Returns:
            Tuple of (json_string, error_message)
        """
        try:
            comments = self.storage.get_issue_comments(issue_key)
            export_data = {
                'issue_key': issue_key,
                'comments': [c.to_dict() for c in comments],
                'export_timestamp': datetime.utcnow().isoformat()
            }
            return json.dumps(export_data, indent=2), None
        except Exception as e:
            logger.error(f"❌ Error exporting comments: {e}")
            return None, str(e)


# ===================================================================
# GLOBAL INSTANCE
# ===================================================================

comment_manager = CommentManager()
