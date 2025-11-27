"""
Test Suite for Comments & Mentions System
Phase 7: Testing & Deployment
"""

import pytest
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from comments import Comment, MentionDetector, CommentStorage, CommentManager


# ===================================================================
# COMMENT MODEL TESTS
# ===================================================================

class TestCommentModel:
    """Test Comment model class"""
    
    def test_comment_creation(self):
        """Test creating a comment"""
        comment = Comment(
            issue_key='SALES-123',
            author='john.doe',
            text='This is a test comment'
        )
        
        assert comment.issue_key == 'SALES-123'
        assert comment.author == 'john.doe'
        assert comment.text == 'This is a test comment'
        assert comment.comment_id is not None
        assert comment.timestamp is not None
        assert comment.edited is False
    
    def test_comment_with_mentions(self):
        """Test comment with mentions"""
        comment = Comment(
            issue_key='SALES-123',
            author='john.doe',
            text='Hello @jane.smith',
            mentions=['jane.smith']
        )
        
        assert 'jane.smith' in comment.mentions
        assert len(comment.mentions) == 1
    
    def test_comment_serialization(self):
        """Test comment to_dict/from_dict"""
        original = Comment(
            issue_key='SALES-123',
            author='john.doe',
            text='Test comment',
            mentions=['jane.smith']
        )
        
        # Convert to dict and back
        comment_dict = original.to_dict()
        restored = Comment.from_dict(comment_dict)
        
        assert restored.issue_key == original.issue_key
        assert restored.author == original.author
        assert restored.text == original.text
        assert restored.mentions == original.mentions
    
    def test_comment_with_parent_id(self):
        """Test reply comment with parent_id"""
        comment = Comment(
            issue_key='SALES-123',
            author='jane.smith',
            text='Reply to john',
            parent_id='parent-uuid-123'
        )
        
        assert comment.parent_id == 'parent-uuid-123'
    
    def test_comment_edit_history(self):
        """Test edit history tracking"""
        comment = Comment(
            issue_key='SALES-123',
            author='john.doe',
            text='Original text'
        )
        
        # Simulate edit
        edit_record = {
            'timestamp': datetime.utcnow().isoformat(),
            'old_text': comment.text,
            'author': 'john.doe'
        }
        comment.edit_history.append(edit_record)
        comment.text = 'Updated text'
        comment.edited = True
        
        assert comment.edited is True
        assert len(comment.edit_history) == 1
        assert comment.edit_history[0]['old_text'] == 'Original text'


# ===================================================================
# MENTION DETECTOR TESTS
# ===================================================================

class TestMentionDetector:
    """Test MentionDetector class"""
    
    def test_extract_single_mention(self):
        """Test extracting single mention"""
        text = "Hello @john.doe"
        mentions = MentionDetector.extract_mentions(text)
        
        assert len(mentions) == 1
        assert 'john.doe' in mentions
    
    def test_extract_multiple_mentions(self):
        """Test extracting multiple mentions"""
        text = "Hey @john.doe and @jane.smith, check this out"
        mentions = MentionDetector.extract_mentions(text)
        
        assert len(mentions) == 2
        assert 'john.doe' in mentions
        assert 'jane.smith' in mentions
    
    def test_extract_duplicate_mentions(self):
        """Test duplicate mentions are removed"""
        text = "Thanks @john.doe and thanks again @john.doe"
        mentions = MentionDetector.extract_mentions(text)
        
        # Should have only 1 mention (no duplicates)
        assert len(mentions) == 1
        assert mentions[0] == 'john.doe'
    
    def test_extract_no_mentions(self):
        """Test text with no mentions"""
        text = "This is a comment without mentions"
        mentions = MentionDetector.extract_mentions(text)
        
        assert len(mentions) == 0
    
    def test_format_mentions_html(self):
        """Test formatting mentions to HTML"""
        text = "Hello @john.doe"
        formatted = MentionDetector.format_mentions(text)
        
        assert '@john.doe' not in formatted
        assert 'john.doe' in formatted
        assert 'span' in formatted
        assert 'mention' in formatted
    
    def test_format_mentions_disabled(self):
        """Test formatting mentions with highlighting disabled"""
        text = "Hello @john.doe"
        formatted = MentionDetector.format_mentions(text, highlight=False)
        
        assert formatted == text
    
    def test_autocomplete_suggestions(self):
        """Test autocomplete suggestions"""
        available_users = ['john.doe', 'jane.smith', 'bob.wilson']
        
        suggestions = MentionDetector.get_autocomplete_suggestions(
            'jo', available_users
        )
        
        assert 'john.doe' in suggestions
        assert 'jane.smith' not in suggestions
    
    def test_autocomplete_empty_partial(self):
        """Test autocomplete with empty partial"""
        available_users = ['john.doe', 'jane.smith', 'bob.wilson']
        
        suggestions = MentionDetector.get_autocomplete_suggestions(
            '', available_users
        )
        
        # Should return first 5
        assert len(suggestions) <= 5
        assert suggestions[0] in available_users
    
    def test_autocomplete_max_results(self):
        """Test autocomplete returns max 5 results"""
        available_users = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7']
        
        suggestions = MentionDetector.get_autocomplete_suggestions(
            'u', available_users
        )
        
        assert len(suggestions) == 5


# ===================================================================
# COMMENT STORAGE TESTS
# ===================================================================

class TestCommentStorage:
    """Test CommentStorage class"""
    
    def test_add_comment(self):
        """Test adding a comment"""
        storage = CommentStorage()
        comment = Comment('SALES-123', 'john.doe', 'Test')
        
        comment_id = storage.add_comment(comment)
        
        assert comment_id == comment.comment_id
        assert storage.get_comment(comment_id) is not None
    
    def test_get_issue_comments(self):
        """Test getting all comments for issue"""
        storage = CommentStorage()
        
        c1 = Comment('SALES-123', 'john.doe', 'First')
        c2 = Comment('SALES-123', 'jane.smith', 'Second')
        
        storage.add_comment(c1)
        storage.add_comment(c2)
        
        comments = storage.get_issue_comments('SALES-123')
        
        assert len(comments) == 2
    
    def test_get_comment_thread(self):
        """Test getting comment thread (replies)"""
        storage = CommentStorage()
        
        parent = Comment('SALES-123', 'john.doe', 'Parent')
        storage.add_comment(parent)
        
        reply1 = Comment('SALES-123', 'jane.smith', 'Reply 1', parent_id=parent.comment_id)
        reply2 = Comment('SALES-123', 'bob.wilson', 'Reply 2', parent_id=parent.comment_id)
        
        storage.add_comment(reply1)
        storage.add_comment(reply2)
        
        thread = storage.get_comment_thread(parent.comment_id)
        
        assert len(thread) == 2
    
    def test_update_comment(self):
        """Test updating a comment"""
        storage = CommentStorage()
        
        comment = Comment('SALES-123', 'john.doe', 'Original')
        storage.add_comment(comment)
        
        success = storage.update_comment(comment.comment_id, 'Updated', 'john.doe')
        
        assert success is True
        updated = storage.get_comment(comment.comment_id)
        assert updated.text == 'Updated'
        assert updated.edited is True
    
    def test_delete_comment(self):
        """Test deleting a comment"""
        storage = CommentStorage()
        
        comment = Comment('SALES-123', 'john.doe', 'To delete')
        storage.add_comment(comment)
        
        # Verify it exists
        assert storage.get_comment(comment.comment_id) is not None
        
        # Delete it
        success = storage.delete_comment(comment.comment_id)
        
        assert success is True
        assert storage.get_comment(comment.comment_id) is None
    
    def test_search_comments(self):
        """Test searching comments"""
        storage = CommentStorage()
        
        c1 = Comment('SALES-123', 'john.doe', 'Python is great')
        c2 = Comment('SALES-123', 'jane.smith', 'JavaScript is cool')
        c3 = Comment('SALES-456', 'bob.wilson', 'Python rocks')
        
        storage.add_comment(c1)
        storage.add_comment(c2)
        storage.add_comment(c3)
        
        # Search for Python in SALES-123
        results = storage.search_comments('Python', 'SALES-123')
        
        assert len(results) == 1
        assert 'Python is great' in results[0].text


# ===================================================================
# COMMENT MANAGER TESTS
# ===================================================================

class TestCommentManager:
    """Test CommentManager class"""
    
    def test_create_comment(self):
        """Test creating a comment through manager"""
        manager = CommentManager()
        
        comment_id, error = manager.create_comment(
            'SALES-123', 'john.doe', 'Test comment'
        )
        
        assert error is None
        assert comment_id is not None
    
    def test_create_comment_empty_text(self):
        """Test creating comment with empty text fails"""
        manager = CommentManager()
        
        comment_id, error = manager.create_comment(
            'SALES-123', 'john.doe', ''
        )
        
        assert comment_id is None
        assert error is not None
    
    def test_create_comment_with_mentions(self):
        """Test creating comment automatically extracts mentions"""
        manager = CommentManager()
        
        comment_id, error = manager.create_comment(
            'SALES-123', 'john.doe', 'Hello @jane.smith'
        )
        
        assert error is None
        
        # Get comment and verify mentions
        comments, _ = manager.get_comments('SALES-123')
        assert len(comments) == 1
        assert 'jane.smith' in comments[0]['mentions']
    
    def test_get_comments(self):
        """Test getting comments for issue"""
        manager = CommentManager()
        
        manager.create_comment('SALES-123', 'john.doe', 'Comment 1')
        manager.create_comment('SALES-123', 'jane.smith', 'Comment 2')
        
        comments, error = manager.get_comments('SALES-123')
        
        assert error is None
        assert len(comments) == 2
    
    def test_get_comment_threads(self):
        """Test getting organized comment threads"""
        manager = CommentManager()
        
        # Create parent
        parent_id, _ = manager.create_comment('SALES-123', 'john.doe', 'Parent')
        
        # Create replies
        manager.create_comment('SALES-123', 'jane.smith', 'Reply 1', parent_id)
        manager.create_comment('SALES-123', 'bob.wilson', 'Reply 2', parent_id)
        
        threads, error = manager.get_comment_threads('SALES-123')
        
        assert error is None
        assert parent_id in threads
        assert len(threads[parent_id]['replies']) == 2
    
    def test_update_comment(self):
        """Test updating a comment"""
        manager = CommentManager()
        
        comment_id, _ = manager.create_comment(
            'SALES-123', 'john.doe', 'Original'
        )
        
        success, error = manager.update_comment(
            comment_id, 'Updated', 'john.doe'
        )
        
        assert success is True
        assert error is None
    
    def test_update_comment_wrong_author(self):
        """Test only author can update comment"""
        manager = CommentManager()
        
        comment_id, _ = manager.create_comment(
            'SALES-123', 'john.doe', 'Original'
        )
        
        # Try to update as different user
        success, error = manager.update_comment(
            comment_id, 'Updated', 'jane.smith'
        )
        
        assert success is False
        assert error is not None
    
    def test_delete_comment(self):
        """Test deleting a comment"""
        manager = CommentManager()
        
        comment_id, _ = manager.create_comment(
            'SALES-123', 'john.doe', 'To delete'
        )
        
        success, error = manager.delete_comment(comment_id, 'john.doe')
        
        assert success is True
        assert error is None
    
    def test_delete_comment_wrong_author(self):
        """Test only author can delete comment"""
        manager = CommentManager()
        
        comment_id, _ = manager.create_comment(
            'SALES-123', 'john.doe', 'To delete'
        )
        
        # Try to delete as different user
        success, error = manager.delete_comment(comment_id, 'jane.smith')
        
        assert success is False
        assert error is not None
    
    def test_get_mention_suggestions(self):
        """Test getting mention suggestions"""
        manager = CommentManager()
        
        suggestions = manager.get_mention_suggestions('jo')
        
        assert len(suggestions) > 0
        # Should have username starting with 'jo'
        assert any(u.startswith('jo') for u in suggestions)
    
    def test_get_mentioned_users(self):
        """Test getting all mentioned users on issue"""
        manager = CommentManager()
        
        manager.create_comment('SALES-123', 'john.doe', '@jane.smith hello')
        manager.create_comment('SALES-123', 'jane.smith', '@bob.wilson reply')
        
        mentions = manager.get_mentioned_users('SALES-123')
        
        assert 'jane.smith' in mentions
        assert 'bob.wilson' in mentions
    
    def test_get_user_mentions(self):
        """Test finding all mentions of a specific user"""
        manager = CommentManager()
        
        manager.create_comment('SALES-123', 'john.doe', 'Hey @jane.smith')
        manager.create_comment('SALES-456', 'bob.wilson', 'Check this @jane.smith')
        
        mentions = manager.get_user_mentions('jane.smith')
        
        assert len(mentions) == 2
    
    def test_export_comments(self):
        """Test exporting comments as JSON"""
        manager = CommentManager()
        
        manager.create_comment('SALES-123', 'john.doe', 'Comment 1')
        manager.create_comment('SALES-123', 'jane.smith', 'Comment 2')
        
        json_str, error = manager.export_comments('SALES-123')
        
        assert error is None
        assert 'SALES-123' in json_str
        assert 'Comment 1' in json_str
        assert 'Comment 2' in json_str


# ===================================================================
# INTEGRATION TESTS
# ===================================================================

class TestCommentIntegration:
    """Integration tests for complete workflows"""
    
    def test_comment_lifecycle(self):
        """Test complete comment lifecycle: create, read, update, delete"""
        manager = CommentManager()
        
        # Create
        comment_id, _ = manager.create_comment(
            'SALES-123', 'john.doe', 'Initial comment'
        )
        assert comment_id is not None
        
        # Read
        comments, _ = manager.get_comments('SALES-123')
        assert len(comments) == 1
        assert comments[0]['text'] == 'Initial comment'
        
        # Update
        success, _ = manager.update_comment(
            comment_id, 'Updated comment', 'john.doe'
        )
        assert success is True
        
        # Verify update
        comments, _ = manager.get_comments('SALES-123')
        assert comments[0]['text'] == 'Updated comment'
        assert comments[0]['edited'] is True
        
        # Delete
        success, _ = manager.delete_comment(comment_id, 'john.doe')
        assert success is True
        
        # Verify deletion
        comments, _ = manager.get_comments('SALES-123')
        assert len(comments) == 0
    
    def test_threaded_comments_workflow(self):
        """Test threaded comment workflow: parent and replies"""
        manager = CommentManager()
        
        # Create parent
        parent_id, _ = manager.create_comment(
            'SALES-123', 'john.doe', 'Main discussion'
        )
        
        # Create replies
        reply1_id, _ = manager.create_comment(
            'SALES-123', 'jane.smith', 'I agree', parent_id
        )
        reply2_id, _ = manager.create_comment(
            'SALES-123', 'bob.wilson', 'Me too', parent_id
        )
        
        # Get threads
        threads, _ = manager.get_comment_threads('SALES-123')
        
        assert parent_id in threads
        assert len(threads[parent_id]['replies']) == 2
        assert any(r['comment_id'] == reply1_id for r in threads[parent_id]['replies'])
        assert any(r['comment_id'] == reply2_id for r in threads[parent_id]['replies'])
    
    def test_mention_workflow(self):
        """Test mention detection and tracking workflow"""
        manager = CommentManager()
        
        # Create comment with mentions
        comment_id, _ = manager.create_comment(
            'SALES-123', 'john.doe',
            'Hey @jane.smith and @bob.wilson, check this out'
        )
        
        # Get mentioned users
        mentions = manager.get_mentioned_users('SALES-123')
        assert 'jane.smith' in mentions
        assert 'bob.wilson' in mentions
        
        # Get mentions of specific user
        jane_mentions = manager.get_user_mentions('jane.smith')
        assert len(jane_mentions) > 0
        assert jane_mentions[0]['issue_key'] == 'SALES-123'
    
    def test_search_workflow(self):
        """Test search functionality"""
        manager = CommentManager()
        
        # Create multiple comments
        manager.create_comment('SALES-123', 'john.doe', 'Python is great')
        manager.create_comment('SALES-123', 'jane.smith', 'JavaScript is cool')
        manager.create_comment('SALES-456', 'bob.wilson', 'Python rocks')
        
        # Search
        results = manager.storage.search_comments('Python', 'SALES-123')
        
        assert len(results) == 1
        assert 'Python is great' in results[0].text


# ===================================================================
# PERFORMANCE TESTS
# ===================================================================

class TestPerformance:
    """Performance tests"""
    
    def test_create_many_comments(self):
        """Test creating many comments efficiently"""
        manager = CommentManager()
        
        import time
        start = time.time()
        
        for i in range(100):
            manager.create_comment(
                'SALES-123', f'user{i}', f'Comment {i}'
            )
        
        elapsed = time.time() - start
        
        # Should complete in under 1 second
        assert elapsed < 1.0
        
        # Verify all created
        comments, _ = manager.get_comments('SALES-123')
        assert len(comments) == 100
    
    def test_get_comments_performance(self):
        """Test retrieving many comments efficiently"""
        manager = CommentManager()
        
        # Create 100 comments
        for i in range(100):
            manager.create_comment('SALES-123', 'user', f'Comment {i}')
        
        import time
        start = time.time()
        
        for _ in range(10):
            manager.get_comments('SALES-123')
        
        elapsed = time.time() - start
        
        # Should complete 10 retrievals in under 1 second
        assert elapsed < 1.0


# ===================================================================
# RUN TESTS
# ===================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
