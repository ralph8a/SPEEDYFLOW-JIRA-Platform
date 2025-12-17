# -*- coding: utf-8 -*-
"""
ML Training Database for Comment Suggestions
Stores Ollama contexts and generated suggestions for future ML training
"""
import json
import gzip
import os
from datetime import datetime
from pathlib import Path
import logging
import hashlib
logger = logging.getLogger(__name__)
class MLTrainingDatabase:
    """Stores AI-generated suggestions with full context for ML training"""
    def __init__(self, db_path='data/cache/ml_training_data.json'):
        self.db_path = Path(db_path)
        self.compressed_path = self.db_path.with_suffix('.json.gz')
        self.compression_threshold = 100  # Compress after 100 entries
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
                logger.info(f"✅ Loaded {len(data.get('training_samples', []))} ML training samples from compressed DB")
                return data
            except Exception as e:
                logger.error(f"Error loading compressed ML DB: {e}")
        # Try uncompressed
        if self.db_path.exists():
            try:
                with open(self.db_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                logger.info(f"✅ Loaded {len(data.get('training_samples', []))} ML training samples")
                return data
            except Exception as e:
                logger.error(f"Error loading ML DB: {e}")
        # Return empty structure
        return {
            'training_samples': [],
            'metadata': {
                'created': datetime.now().isoformat(),
                'last_modified': datetime.now().isoformat(),
                'total_samples': 0,
                'compressed': False,
                'version': '1.0'
            }
        }
    def _save_data(self, compress=False):
        """Save data to file with optional compression"""
        self.data['metadata']['last_modified'] = datetime.now().isoformat()
        self.data['metadata']['total_samples'] = len(self.data['training_samples'])
        self.data['metadata']['compressed'] = compress
        if compress:
            # Save compressed
            with gzip.open(self.compressed_path, 'wt', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
            # Remove uncompressed if exists
            if self.db_path.exists():
                self.db_path.unlink()
            logger.info(f"💾 Saved {len(self.data['training_samples'])} ML training samples to compressed DB")
        else:
            # Save uncompressed
            with open(self.db_path, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
            logger.info(f"💾 Saved {len(self.data['training_samples'])} ML training samples to DB")
    def _generate_context_hash(self, ticket_summary, ticket_description, comments):
        """Generate unique hash for context to avoid duplicates"""
        context_str = f"{ticket_summary}|{ticket_description}|{'|'.join(comments or [])}"
        return hashlib.md5(context_str.encode('utf-8')).hexdigest()
    def add_training_sample(
        self,
        ticket_key: str,
        ticket_summary: str,
        ticket_description: str,
        issue_type: str,
        status: str,
        priority: str,
        all_comments: list,
        suggestions: list,
        model: str = ""
    ):
        """
        Add a training sample with full context and AI-generated suggestions
        Args:
            ticket_key: JIRA ticket key (e.g., "PROJ-123")
            ticket_summary: Ticket title
            ticket_description: Ticket description
            issue_type: Type (Bug, Task, etc.)
            status: Current status
            priority: Priority level
            all_comments: List of all comments
            suggestions: List of AI-generated suggestions
            model: Model used (default: "")
        """
        # Generate context hash to avoid duplicates
        context_hash = self._generate_context_hash(ticket_summary, ticket_description, all_comments or [])
        # Check if this exact context already exists
        existing = next((s for s in self.data['training_samples'] if s.get('context_hash') == context_hash), None)
        if existing:
            logger.debug(f"⏭️ Skipping duplicate context for {ticket_key}")
            return
        # Create training sample
        sample = {
            'context_hash': context_hash,
            'ticket_key': ticket_key,
            'timestamp': datetime.now().isoformat(),
            'input': {
                'summary': ticket_summary,
                'description': ticket_description,
                'issue_type': issue_type,
                'status': status,
                'priority': priority,
                'comments': all_comments or [],
                'comments_count': len(all_comments or [])
            },
            'output': {
                'suggestions': suggestions,
                'suggestions_count': len(suggestions),
                'model': model
            }
        }
        # Add to database
        self.data['training_samples'].append(sample)
        # Check if compression is needed
        total = len(self.data['training_samples'])
        should_compress = total >= self.compression_threshold
        # Save
        self._save_data(compress=should_compress)
        logger.info(f"✅ Added ML training sample for {ticket_key} (Total: {total})")
    def get_stats(self):
        """Get database statistics"""
        samples = self.data['training_samples']
        # Calculate stats
        total = len(samples)
        if total == 0:
            return {
                'total_samples': 0,
                'compressed': False
            }
        # Count by issue type
        by_type = {}
        for sample in samples:
            issue_type = sample['input'].get('issue_type', 'Unknown')
            by_type[issue_type] = by_type.get(issue_type, 0) + 1
        # Count by status
        by_status = {}
        for sample in samples:
            status = sample['input'].get('status', 'Unknown')
            by_status[status] = by_status.get(status, 0) + 1
        # Average suggestions per sample
        total_suggestions = sum(s['output'].get('suggestions_count', 0) for s in samples)
        avg_suggestions = total_suggestions / total if total > 0 else 0
        # Average comments per sample
        total_comments = sum(s['input'].get('comments_count', 0) for s in samples)
        avg_comments = total_comments / total if total > 0 else 0
        return {
            'total_samples': total,
            'by_issue_type': by_type,
            'by_status': by_status,
            'total_suggestions': total_suggestions,
            'avg_suggestions_per_sample': round(avg_suggestions, 2),
            'total_comments': total_comments,
            'avg_comments_per_sample': round(avg_comments, 2),
            'compressed': self.data['metadata'].get('compressed', False),
            'created': self.data['metadata'].get('created'),
            'last_modified': self.data['metadata'].get('last_modified')
        }
    def export_for_training(self, output_path='data/ml_models/training_dataset.json'):
        """
        Export data in a format suitable for ML training
        Returns path to exported file
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        # Format for ML training
        training_data = []
        for sample in self.data['training_samples']:
            # Create input features
            input_text = f"{sample['input']['summary']} {sample['input']['description']}"
            if sample['input']['comments']:
                input_text += " " + " ".join(sample['input']['comments'][-10:])  # Last 10 comments
            # Create labeled outputs
            for suggestion in sample['output']['suggestions']:
                training_data.append({
                    'input': input_text,
                    'metadata': {
                        'issue_type': sample['input']['issue_type'],
                        'status': sample['input']['status'],
                        'priority': sample['input']['priority']
                    },
                    'output_text': suggestion['text'],
                    'output_type': suggestion['type'],
                    'confidence': suggestion.get('confidence', 0.5)
                })
        # Save
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(training_data, f, indent=2, ensure_ascii=False)
        logger.info(f"📦 Exported {len(training_data)} training examples to {output_path}")
        return str(output_path)
# Singleton instance
_ml_db_instance = None
def get_ml_training_db():
    """Get or create the global ML training database instance"""
    global _ml_db_instance
    if _ml_db_instance is None:
        _ml_db_instance = MLTrainingDatabase()
    return _ml_db_instance
