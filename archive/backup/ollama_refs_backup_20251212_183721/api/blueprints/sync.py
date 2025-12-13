"""
Sync Blueprint: Manages issue synchronization and caching
"""
from flask import Blueprint, request
import logging
from utils.decorators import (
    handle_api_error,
    json_response,
    log_request as log_decorator,
    require_credentials,
    rate_limited
)

logger = logging.getLogger(__name__)

sync_bp = Blueprint('sync', __name__)


@sync_bp.route('/api/sync/project/<project_key>', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=1, period=300)  # Max 1 sync every 5 minutes
@require_credentials
def api_sync_project(project_key):
    """
    Sync all issues from a project to local cache using Service Desk API.
    
    POST /api/sync/project/MSM
    Body (optional): {"service_desk_id": "4"}
    
    Response:
        {
            "project_key": "MSM",
            "total_fetched": 1234,
            "total_stored": 1234,
            "sync_start": "2025-11-28T10:00:00",
            "sync_end": "2025-11-28T10:05:00",
            "status": "success"
        }
    """
    from core.api import get_api_client
    from utils.issue_cache import get_cache_manager
    
    try:
        client = get_api_client()
        cache = get_cache_manager()
        
        # Get optional service_desk_id from request body
        data = request.get_json() or {}
        service_desk_id = data.get('service_desk_id')
        
        result = cache.sync_project(project_key, client, service_desk_id)
        
        return result
        
    except Exception as e:
        logger.error(f"Sync failed for {project_key}: {e}")
        return {'error': str(e), 'project_key': project_key}, 500


@sync_bp.route('/api/sync/status/<project_key>', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_sync_status(project_key):
    """
    Get sync status for a project.
    
    GET /api/sync/status/MSM
    """
    from utils.issue_cache import get_cache_manager
    
    try:
        cache = get_cache_manager()
        status = cache.get_sync_status(project_key)
        needs_sync = cache.needs_sync(project_key)
        
        return {
            'project_key': project_key,
            'sync_status': status,
            'needs_sync': needs_sync
        }
        
    except Exception as e:
        logger.error(f"Failed to get sync status: {e}")
        return {'error': str(e)}, 500


@sync_bp.route('/api/sync/patterns/<project_key>', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_get_patterns(project_key):
    """
    Get learned patterns for a project.
    
    GET /api/sync/patterns/MSM?field_type=severity
    """
    from utils.issue_cache import get_cache_manager
    
    field_type = request.args.get('field_type', 'severity')
    
    try:
        cache = get_cache_manager()
        conn = cache.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT keyword, suggested_value, confidence, occurrence_count
            FROM issue_patterns
            WHERE pattern_type = ?
            ORDER BY confidence DESC, occurrence_count DESC
            LIMIT 100
        """, (field_type,))
        
        patterns = []
        for row in cursor.fetchall():
            patterns.append({
                'keyword': row['keyword'],
                'suggested_value': row['suggested_value'],
                'confidence': row['confidence'],
                'occurrence_count': row['occurrence_count']
            })
        
        return {
            'project_key': project_key,
            'field_type': field_type,
            'patterns': patterns,
            'total_patterns': len(patterns)
        }
        
    except Exception as e:
        logger.error(f"Failed to get patterns: {e}")
        return {'error': str(e)}, 500
