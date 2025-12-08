# -*- coding: utf-8 -*-
"""
Comment Suggestions Database with GZIP compression
Stores used suggestions and automatically compresses when 50+ entries
"""

import json
import gzip
import os
from datetime import datetime
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class SuggestionsDatabase:
    """Manages suggestion storage with automatic GZIP compression"""
    
    def __init__(self, db_path='data/cache/comment_suggestions_db.json'):
        self.db_path = Path(db_path)
        self.compressed_path = self.db_path.with_suffix('.json.gz')
        self.compression_threshold = 50
        
        # Ensure directory exists
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Load existing data
        self.data = self._load_data()
        
    def _load_data(self):
        """Load data from compressed or uncompressed file"""
        # Try compressed first
        if self.compressed_path.exists():
            try:
                with gzip.open(self.compressed_path, 'rt', encoding='utf-8') as f:
                    data = json.load(f)
                logger.info(f"✅ Loaded {len(data.get('suggestions', []))} suggestions from compressed DB")
                return data
            except Exception as e:
                logger.error(f"Error loading compressed DB: {e}")
        
        # Try uncompressed
        if self.db_path.exists():
            try:
                with open(self.db_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                logger.info(f"✅ Loaded {len(data.get('suggestions', []))} suggestions from DB")
                return data
            except Exception as e:
                logger.error(f"Error loading DB: {e}")
        
        # Return empty structure
        return {
            'suggestions': [],
            'metadata': {
                'created': datetime.now().isoformat(),
                'last_modified': datetime.now().isoformat(),
                'total_entries': 0,
                'compressed': False
            }
        }
    
    def _save_data(self, compress=False):
        """Save data to file with optional compression"""
        self.data['metadata']['last_modified'] = datetime.now().isoformat()
        self.data['metadata']['total_entries'] = len(self.data['suggestions'])
        self.data['metadata']['compressed'] = compress
        
        if compress:
            # Save compressed
            with gzip.open(self.compressed_path, 'wt', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
            
            # Remove uncompressed if exists
            if self.db_path.exists():
                self.db_path.unlink()
            
            logger.info(f"💾 Saved {len(self.data['suggestions'])} suggestions to compressed DB")
        else:
            # Save uncompressed
            with open(self.db_path, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"💾 Saved {len(self.data['suggestions'])} suggestions to DB")
    
    def add_suggestion(self, ticket_key, suggestion_text, suggestion_type, action='used'):
        """
        Add a used/copied suggestion to the database
        
        Args:
            ticket_key: JIRA ticket key (e.g., "PROJ-123")
            suggestion_text: The suggestion text
            suggestion_type: Type of suggestion (e.g., "resolution", "diagnostic")
            action: 'used' or 'copied'
        """
        entry = {
            'ticket_key': ticket_key,
            'text': suggestion_text,
            'type': suggestion_type,
            'action': action,
            'timestamp': datetime.now().isoformat(),
            'date': datetime.now().strftime('%Y-%m-%d')
        }
        
        self.data['suggestions'].append(entry)
        
        # Check if we need to compress
        total = len(self.data['suggestions'])
        should_compress = total >= self.compression_threshold
        
        if should_compress and not self.data['metadata']['compressed']:
            logger.info(f"🗜️ Reached {total} entries, compressing database...")
        
        self._save_data(compress=should_compress)
        
        return {
            'success': True,
            'total_entries': total,
            'compressed': should_compress
        }
    
    def get_stats(self):
        """Get database statistics"""
        suggestions = self.data.get('suggestions', [])
        total = len(suggestions)
        
        # Count by action
        used_count = sum(1 for s in suggestions if s.get('action') == 'used')
        copied_count = sum(1 for s in suggestions if s.get('action') == 'copied')
        
        # Count by type
        type_counts = {}
        for s in suggestions:
            stype = s.get('type', 'unknown')
            type_counts[stype] = type_counts.get(stype, 0) + 1
        
        # Recent entries (last 10)
        recent = suggestions[-10:] if suggestions else []
        
        return {
            'total_entries': total,
            'used': used_count,
            'copied': copied_count,
            'by_type': type_counts,
            'compressed': self.data['metadata']['compressed'],
            'compression_threshold': self.compression_threshold,
            'recent_entries': recent,
            'metadata': self.data['metadata']
        }
    
    def get_suggestions_for_ticket(self, ticket_key):
        """Get all suggestions used/copied for a specific ticket"""
        return [
            s for s in self.data.get('suggestions', [])
            if s.get('ticket_key') == ticket_key
        ]
    
    def cleanup_old_entries(self, days=90):
        """Remove entries older than X days"""
        from datetime import timedelta
        
        cutoff = datetime.now() - timedelta(days=days)
        cutoff_str = cutoff.isoformat()
        
        original_count = len(self.data['suggestions'])
        self.data['suggestions'] = [
            s for s in self.data['suggestions']
            if s.get('timestamp', '') >= cutoff_str
        ]
        
        removed = original_count - len(self.data['suggestions'])
        
        if removed > 0:
            logger.info(f"🧹 Cleaned up {removed} old entries (>{days} days)")
            self._save_data(compress=len(self.data['suggestions']) >= self.compression_threshold)
        
        return {
            'removed': removed,
            'remaining': len(self.data['suggestions'])
        }


# Global instance
_db_instance = None

def get_suggestions_db():
    """Get or create the global database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = SuggestionsDatabase()
    return _db_instance
