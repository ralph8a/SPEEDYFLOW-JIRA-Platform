"""
Issue Cache Manager - JSON Version
===================================
Descarga TODOS los tickets del proyecto MSM en un solo fetch masivo.
Los almacena en JSON y analiza patrones para mejorar sugerencias de IA.

VENTAJAS:
- Un solo archivo JSON, fácil de inspeccionar
- Sin dependencias de SQLite
- Fetch masivo (no incremental)
- Análisis de patrones en memoria

DESVENTAJAS:
- Memoria: ~100MB para 10,000 tickets
- Lectura completa cada vez
"""
import json
import gzip
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from collections import defaultdict

from utils.common import _make_request, JiraApiError

logger = logging.getLogger(__name__)


class IssueCacheManager:
    """Manages caching and analysis of JIRA issues using JSON files"""
    
    def __init__(self, cache_dir: str = "data/cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        # Use .json.gz for compressed storage
        self.issues_file = self.cache_dir / "msm_issues.json.gz"
        self.patterns_file = self.cache_dir / "patterns.json"
        self.metadata_file = self.cache_dir / "sync_metadata.json"
        self.use_compression = True  # Enable gzip compression for large files
        logger.info(f"Cache manager initialized: {self.cache_dir} (compression: {self.use_compression})")
    
    def _load_json(self, file_path: Path, default=None):
        """Load JSON file or return default (supports .gz compression)"""
        # Try compressed version first (.json.gz)
        gz_path = file_path.with_suffix(file_path.suffix + '.gz') if not str(file_path).endswith('.gz') else file_path
        
        if gz_path.exists():
            try:
                with gzip.open(gz_path, 'rt', encoding='utf-8') as f:
                    data = json.load(f)
                logger.info(f"✓ Loaded compressed JSON: {gz_path.name}")
                return data
            except Exception as e:
                logger.error(f"Error loading compressed {gz_path}: {e}")
        
        # Fallback to uncompressed version
        if file_path.exists() and not str(file_path).endswith('.gz'):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                logger.info(f"✓ Loaded uncompressed JSON: {file_path.name}")
                return data
            except Exception as e:
                logger.error(f"Error loading {file_path}: {e}")
        
        return default if default is not None else {}
    
    def _save_json(self, file_path: Path, data):
        """Save data to JSON file (with optional gzip compression)"""
        try:
            # Determine if we should compress (for large files like issues cache)
            should_compress = self.use_compression and file_path == self.issues_file
            
            if should_compress:
                # Save as compressed .json.gz
                json_str = json.dumps(data, indent=2, ensure_ascii=False)
                uncompressed_size = len(json_str.encode('utf-8'))
                
                with gzip.open(file_path, 'wt', encoding='utf-8', compresslevel=6) as f:
                    f.write(json_str)
                
                compressed_size = file_path.stat().st_size
                ratio = (1 - compressed_size / uncompressed_size) * 100
                
                logger.info(f"✓ Saved compressed JSON: {file_path.name} "
                           f"({uncompressed_size / 1024 / 1024:.1f} MB → {compressed_size / 1024 / 1024:.1f} MB, "
                           f"{ratio:.1f}% reduction)")
                print(f"💾 Compression: {uncompressed_size / 1024 / 1024:.1f} MB → {compressed_size / 1024 / 1024:.1f} MB ({ratio:.1f}% saved)")
                
                # Delete old uncompressed version if exists
                old_uncompressed = file_path.with_suffix('')
                if old_uncompressed.exists() and old_uncompressed != file_path:
                    old_uncompressed.unlink()
                    logger.info(f"🗑️  Deleted old uncompressed file: {old_uncompressed.name}")
            else:
                # Save as regular JSON (for small files like patterns, metadata)
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                logger.info(f"✓ Saved uncompressed JSON: {file_path.name}")
        except Exception as e:
            logger.error(f"Error saving {file_path}: {e}")
            raise
    
    def sync_project(self, project_key: str, api_client, service_desk_id: str = None) -> Dict:
        """
        Sync ALL issues from a project using JIRA Service Desk API
        Fetches from all queues in the service desk
        Returns: Dict with sync statistics
        """
        logger.info(f"Starting sync for project {project_key}")
        
        # Update sync metadata - start
        metadata = self._load_json(self.metadata_file, {})
        metadata[project_key] = {
            'last_sync_start': datetime.now().isoformat(),
            'last_sync_status': 'in_progress'
        }
        self._save_json(self.metadata_file, metadata)
        
        try:
            all_issues = []
            
            # If no service_desk_id provided, try to get it from project
            if not service_desk_id:
                print(f"🔍 Looking up service desk for project {project_key}...")
                project = api_client.get_project(project_key)
                if project:
                    service_desk_id = project.get("id")
                    logger.info(f"Found service desk ID: {service_desk_id}")
            
            if not service_desk_id:
                logger.error(f"Could not find service desk ID for project {project_key}")
                raise JiraApiError(f"Service desk ID not found for project {project_key}")
            
            # Get all queues for this service desk
            print(f"🔄 Fetching queues from Service Desk {service_desk_id}...")
            queues_url = f"{api_client.site}/rest/servicedeskapi/servicedesk/{service_desk_id}/queue"
            queues_response = _make_request('GET', queues_url, api_client.headers, params={'limit': 100})
            
            if not queues_response or 'values' not in queues_response:
                logger.error(f"Failed to fetch queues for service desk {service_desk_id}")
                raise JiraApiError(f"Could not fetch queues for service desk {service_desk_id}")
            
            queues = queues_response.get('values', [])
            print(f"✓ Found {len(queues)} queues")
            
            # Fetch issues from each queue
            for queue_idx, queue in enumerate(queues, 1):
                queue_id = queue.get('id')
                queue_name = queue.get('name', f'Queue {queue_id}')
                print(f"\n📋 [{queue_idx}/{len(queues)}] Fetching from queue: {queue_name}")
                
                start = 0
                limit = 50
                queue_issues = []
                
                while True:
                    print(f"  📥 Batch: {start} to {start + limit}...")
                    
                    issues_url = f"{api_client.site}/rest/servicedeskapi/servicedesk/{service_desk_id}/queue/{queue_id}/issue"
                    response = _make_request(
                        'GET',
                        issues_url,
                        api_client.headers,
                        params={'start': start, 'limit': limit}
                    )
                    
                    if response is None:
                        logger.warning(f"No response from queue {queue_id}")
                        break
                    
                    issues = response.get('values', [])
                    if not issues:
                        break
                    
                    queue_issues.extend(issues)
                    
                    # Check if there are more issues
                    is_last = response.get('isLastPage', True)
                    if is_last or len(issues) < limit:
                        break
                    
                    start += limit
                
                print(f"  ✓ Fetched {len(queue_issues)} issues from {queue_name}")
                all_issues.extend(queue_issues)
            
            print(f"\n💾 Total issues fetched: {len(all_issues)}")
            
            # Save all issues to JSON
            cache_data = {
                'project_key': project_key,
                'total_issues': len(all_issues),
                'synced_at': datetime.now().isoformat(),
                'issues': all_issues
            }
            
            self._save_json(self.issues_file, cache_data)
            logger.info(f"Saved {len(all_issues)} issues to {self.issues_file}")
            print(f"💾 Saved {len(all_issues)} issues to JSON")
            
            # Analyze patterns from cached issues
            print(f"🧠 Analyzing patterns...")
            self.analyze_patterns(project_key)
            
            # Generate ML embeddings
            print(f"🤖 Generating ML embeddings...")
            try:
                from utils.ml_suggester import get_ml_suggester
                ml_suggester = get_ml_suggester()
                
                # Convert raw issues to simplified format
                simplified_issues = [self._extract_issue_data(issue) for issue in all_issues]
                ml_suggester.index_issues(simplified_issues, force_reindex=True)
                print(f"✓ ML embeddings generated")
            except ImportError as e:
                logger.warning(f"ML suggester not available: {e}")
                print(f"⚠️ ML suggester not available (install: pip install sentence-transformers)")
            except Exception as e:
                logger.error(f"Failed to generate ML embeddings: {e}")
                print(f"⚠️ Failed to generate ML embeddings: {e}")
            
            # Update metadata - success
            metadata[project_key].update({
                'last_sync_end': datetime.now().isoformat(),
                'last_sync_status': 'success',
                'total_issues': len(all_issues)
            })
            self._save_json(self.metadata_file, metadata)
            
            logger.info(f"Sync completed successfully: {len(all_issues)} issues")
            
            return {
                'status': 'success',
                'total_stored': len(all_issues),
                'project_key': project_key,
                'cache_file': str(self.issues_file)
            }
            
        except Exception as e:
            logger.error(f"Sync failed: {e}")
            # Update metadata - error
            metadata[project_key].update({
                'last_sync_end': datetime.now().isoformat(),
                'last_sync_status': 'error',
                'error_message': str(e)
            })
            self._save_json(self.metadata_file, metadata)
            raise
    
    def _extract_issue_data(self, issue_data: Dict) -> Dict:
        """Extract normalized issue data from raw JIRA issue"""
        fields = issue_data.get('fields', {})
        
        # Extract severity from custom field
        severity = None
        custom_field_10125 = fields.get('customfield_10125')
        if custom_field_10125:
            if isinstance(custom_field_10125, dict):
                severity = custom_field_10125.get('value')
            elif isinstance(custom_field_10125, str):
                severity = custom_field_10125
        
        # Extract other fields
        priority = fields.get('priority', {})
        if isinstance(priority, dict):
            priority = priority.get('name')
        
        assignee = fields.get('assignee', {})
        if isinstance(assignee, dict):
            assignee = assignee.get('displayName')
        
        reporter = fields.get('reporter', {})
        if isinstance(reporter, dict):
            reporter = reporter.get('displayName')
        
        status = fields.get('status', {})
        if isinstance(status, dict):
            status = status.get('name')
        
        labels = fields.get('labels', [])
        
        return {
            'key': issue_data.get('key'),
            'project_key': issue_data.get('key', '').split('-')[0],
            'summary': fields.get('summary'),
            'description': fields.get('description'),
            'severity': severity,
            'priority': priority,
            'status': status,
            'assignee': assignee,
            'reporter': reporter,
            'created_at': fields.get('created'),
            'updated_at': fields.get('updated'),
            'resolved_at': fields.get('resolutiondate'),
            'labels': labels
        }
    
    def analyze_patterns(self, project_key: str):
        """Analyze issues to extract patterns (keywords -> severity/priority)"""
        logger.info(f"Analyzing patterns for {project_key}")
        
        cache_data = self._load_json(self.issues_file)
        if not cache_data or cache_data.get('project_key') != project_key:
            logger.warning(f"No cached issues found for {project_key}")
            print(f"⚠️ No cached issues found for {project_key}")
            return
        
        issues = cache_data.get('issues', [])
        
        # Analyze severity patterns
        severity_keywords = defaultdict(lambda: defaultdict(int))
        priority_keywords = defaultdict(lambda: defaultdict(int))
        
        for issue_data in issues:
            extracted = self._extract_issue_data(issue_data)
            
            summary = extracted.get('summary') or ''
            description = extracted.get('description') or ''
            labels = ' '.join(extracted.get('labels') or [])
            severity = extracted.get('severity')
            priority = extracted.get('priority')
            
            text = f"{summary} {description} {labels}".lower()
            words = text.split()
            
            # Track keyword -> severity
            if severity:
                for word in words:
                    if len(word) > 3:  # Skip short words
                        severity_keywords[word][severity] += 1
            
            # Track keyword -> priority
            if priority:
                for word in words:
                    if len(word) > 3:
                        priority_keywords[word][priority] += 1
        
        # Build patterns with confidence scores
        patterns = {
            'severity': {},
            'priority': {}
        }
        
        for keyword, severities in severity_keywords.items():
            total = sum(severities.values())
            if total >= 3:  # Minimum occurrences
                for severity, count in severities.items():
                    confidence = count / total
                    if confidence >= 0.5:  # Minimum confidence
                        if keyword not in patterns['severity']:
                            patterns['severity'][keyword] = []
                        patterns['severity'][keyword].append({
                            'value': severity,
                            'confidence': confidence,
                            'count': count
                        })
        
        for keyword, priorities in priority_keywords.items():
            total = sum(priorities.values())
            if total >= 3:
                for priority, count in priorities.items():
                    confidence = count / total
                    if confidence >= 0.5:
                        if keyword not in patterns['priority']:
                            patterns['priority'][keyword] = []
                        patterns['priority'][keyword].append({
                            'value': priority,
                            'confidence': confidence,
                            'count': count
                        })
        
        # Save patterns to JSON
        self._save_json(self.patterns_file, patterns)
        
        # Log statistics
        severity_count = sum(len(v) for v in patterns['severity'].values())
        priority_count = sum(len(v) for v in patterns['priority'].values())
        
        logger.info(f"Found {severity_count} severity patterns, {priority_count} priority patterns")
        print(f"✓ Analyzed {len(issues)} issues")
        print(f"✓ Found {severity_count} severity patterns, {priority_count} priority patterns")
        print(f"💾 Patterns saved to {self.patterns_file}")
    
    def get_suggestion_from_patterns(self, text: str, field_type: str) -> Optional[Tuple[str, float, str]]:
        """
        Get field suggestion based on learned patterns
        Returns: (value, confidence, reason) or None
        """
        if not text:
            return None
        
        patterns = self._load_json(self.patterns_file)
        if not patterns or field_type not in patterns:
            return None
        
        text_lower = text.lower()
        words = text_lower.split()
        
        # Find matching patterns
        matches = []
        for word in words:
            if len(word) > 3 and word in patterns[field_type]:
                for pattern in patterns[field_type][word]:
                    matches.append({
                        'value': pattern['value'],
                        'confidence': pattern['confidence'],
                        'count': pattern['count'],
                        'keyword': word
                    })
        
        if not matches:
            return None
        
        # Return best match
        best = max(matches, key=lambda x: (x['confidence'], x['count']))
        
        reason = f"Keyword '{best['keyword']}' suggests {best['value']} ({best['confidence']:.0%} confidence from {best['count']} occurrences)"
        
        return (best['value'], best['confidence'], reason)
    
    def get_sync_status(self, project_key: str) -> Optional[Dict]:
        """Get sync status for a project"""
        metadata = self._load_json(self.metadata_file)
        return metadata.get(project_key)
    
    def needs_sync(self, project_key: str, max_age_hours: int = 24) -> bool:
        """Check if project needs sync"""
        status = self.get_sync_status(project_key)
        if not status or not status.get('last_sync_end'):
            return True
        
        try:
            last_sync = datetime.fromisoformat(status['last_sync_end'])
            age = datetime.now() - last_sync
            return age.total_seconds() > (max_age_hours * 3600)
        except:
            return True
    
    def get_patterns(self, field_type: str = None) -> Dict:
        """Get all learned patterns"""
        patterns = self._load_json(self.patterns_file)
        if field_type:
            return patterns.get(field_type, {})
        return patterns


# Global instance
_cache_manager = None


def get_cache_manager() -> IssueCacheManager:
    """Get global cache manager instance"""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = IssueCacheManager()
    return _cache_manager
