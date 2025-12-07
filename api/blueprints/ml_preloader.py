"""
ML Dashboard Background Preloader
==================================
Automatically detects user context and preloads ML dashboard data in background.

Flow:
1. Detect user credentials → Get primary desk
2. Find "All Open" queue (or first non-empty queue)
3. Fetch tickets in background
4. Build ML analytics
5. Cache with ZIP compression
6. Notify when ready

Benefits:
- No user interaction needed
- ML Dashboard ready instantly
- Compressed cache saves memory
- Works with existing IssueCacheManager
"""

from flask import Blueprint, jsonify, request
import logging
import gzip
import json
from datetime import datetime
from typing import Dict, List, Optional
import threading
import time

logger = logging.getLogger(__name__)

ml_preloader_bp = Blueprint('ml_preloader', __name__, url_prefix='/api/ml')

# Global state for preload status
preload_status = {
    'is_loading': False,
    'progress': 0,
    'message': 'Not started',
    'tickets_loaded': 0,
    'desk_id': None,
    'queue_id': None,
    'started_at': None,
    'completed_at': None,
    'error': None
}

# Global cache indicator - accessible by all components
cache_indicator = {
    'has_cache': False,
    'total_tickets': 0,
    'desk_id': None,
    'desk_name': None,
    'queue_id': None,
    'queue_name': None,
    'cached_at': None,
    'cache_file': 'data/cache/ml_preload_cache.json.gz',
    'metadata_file': 'data/cache/ml_cache_indicator.json'
}

# Background refresh configuration
AUTO_REFRESH_INTERVAL = 300  # 5 minutes
background_refresh_thread = None
should_refresh = False

def compress_data(data: Dict) -> bytes:
    """Compress JSON data with gzip"""
    json_str = json.dumps(data, ensure_ascii=False)
    return gzip.compress(json_str.encode('utf-8'))

def decompress_data(compressed: bytes) -> Dict:
    """Decompress gzipped JSON data"""
    json_str = gzip.decompress(compressed).decode('utf-8')
    return json.loads(json_str)

def get_user_primary_desk():
    """
    Detect user's primary service desk
    Logic: Return first desk with queues, or first desk
    """
    try:
        from utils.api_migration import get_service_desks
        desks = get_service_desks()
        
        if not desks:
            logger.warning("No service desks found")
            return None
        
        # Find first desk with queues
        for desk in desks:
            queues = desk.get('queues', [])
            if queues:
                logger.info(f"✅ Selected primary desk: {desk.get('name')} ({desk.get('id')})")
                return desk
        
        # Fallback: first desk
        return desks[0]
    except Exception as e:
        logger.error(f"Error detecting primary desk: {e}")
        return None

def ensure_all_open_queue(desk: Dict) -> Dict:
    """
    Ensure "All Open" queue exists or create a virtual one
    
    JIRA Service Desk queues use JQL to define which tickets to show.
    This function GUARANTEES an "All Open" queue by:
    1. Looking for existing "All Open" / "All Tickets" queue
    2. Looking for any queue with "open" in name
    3. Creating a VIRTUAL queue with JQL for all open tickets
    
    The virtual queue is not created in JIRA, but can be used to fetch
    tickets using JQL through search_issues().
    
    Args:
        desk: Service desk dictionary with queues
    
    Returns:
        Queue dict with: id, name, jql, is_virtual flag
    """
    try:
        queues = desk.get('queues', [])
        desk_id = desk.get('id')
        desk_name = desk.get('name', 'Unknown')
        
        # Priority 1: Existing "All Open" / "All Tickets" queue
        for queue in queues:
            name = queue.get('name', '').lower()
            if 'all open' in name or 'all tickets' in name or 'todos' in name:
                logger.info(f"✅ Found All Open queue: '{queue.get('name')}' (ID: {queue.get('id')})")
                queue['is_virtual'] = False
                return queue
        
        # Priority 2: Any queue with "open" (not "closed")
        for queue in queues:
            name = queue.get('name', '').lower()
            if 'open' in name and 'closed' not in name:
                logger.info(f"✅ Found Open queue: '{queue.get('name')}' (ID: {queue.get('id')})")
                queue['is_virtual'] = False
                return queue
        
        # Priority 3: Create VIRTUAL queue with JQL for all open tickets
        logger.warning(f"⚠️ No 'All Open' queue found in desk '{desk_name}'. Creating virtual queue...")
        
        # Get project key from desk (usually desk name or first part)
        # Try to extract project key from existing queue JQLs
        project_key = None
        for queue in queues:
            jql = queue.get('jql', '')
            if 'project' in jql.lower():
                # Extract: "project = KEY" or "project in (KEY)"
                import re
                match = re.search(r'project\s*(?:=|in)\s*(?:\()?["\']?([A-Z][A-Z0-9]+)["\']?(?:\))?', jql, re.IGNORECASE)
                if match:
                    project_key = match.group(1)
                    break
        
        if not project_key:
            # Fallback: use desk name as project key (common pattern)
            project_key = desk_name.split()[0].upper()
            logger.info(f"📋 Using desk name as project key: {project_key}")
        
        # Create virtual queue with JQL for all open tickets
        virtual_queue = {
            'id': f'virtual_{desk_id}_all_open',
            'name': f'All Open Tickets ({desk_name})',
            'jql': f'project = "{project_key}" AND status NOT IN (Done, Closed, Resolved, Cancelled)',
            'is_virtual': True,
            'fields': ['summary', 'status', 'assignee', 'priority', 'created', 'updated']
        }
        
        logger.info(f"🔧 Created virtual queue: '{virtual_queue['name']}'")
        logger.info(f"🔍 JQL: {virtual_queue['jql']}")
        
        return virtual_queue
        
    except Exception as e:
        logger.error(f"❌ Error ensuring All Open queue: {e}")
        # Emergency fallback: basic virtual queue
        return {
            'id': 'virtual_fallback',
            'name': 'All Open Tickets',
            'jql': 'status NOT IN (Done, Closed, Resolved)',
            'is_virtual': True,
            'fields': ['summary', 'status', 'assignee', 'priority']
        }

def preload_ml_data_background(desk_id=None, queue_id=None):
    """
    Background thread to preload ML data
    
    Args:
        desk_id: User's fixed desk (from logged session)
        queue_id: Currently selected queue (variable, can be any custom queue)
    
    Logic:
        - DESK: Fixed from logged user, doesn't change
        - QUEUE: Variable, user can select different custom queues
    """
    global preload_status
    
    try:
        preload_status['is_loading'] = True
        preload_status['progress'] = 0
        preload_status['message'] = 'Detecting user context...'
        preload_status['started_at'] = datetime.now().isoformat()
        preload_status['error'] = None
        
        logger.info("🚀 ML Preloader: Starting background preload")
        
        # Step 1: Get desk (from session or auto-detect)
        preload_status['progress'] = 10
        preload_status['message'] = 'Finding service desk...'
        
        if desk_id:
            # Use provided desk from user session
            logger.info(f"✅ Using logged user desk: {desk_id}")
            from utils.api_migration import get_service_desks
            desks = get_service_desks()
            desk = next((d for d in desks if d.get('id') == desk_id), None)
            if not desk:
                logger.warning(f"⚠️ Desk {desk_id} not found, auto-detecting...")
                desk = get_user_primary_desk()
        else:
            # Auto-detect
            logger.info("🔍 Auto-detecting primary desk...")
            desk = get_user_primary_desk()
        
        if not desk:
            raise ValueError("No service desk found")
        
        preload_status['desk_id'] = desk.get('id')
        
        # Step 2: Get queue (from session or ensure All Open exists)
        preload_status['progress'] = 20
        preload_status['message'] = 'Finding All Open queue...'
        
        if queue_id:
            # Use provided queue from user session
            logger.info(f"✅ Using user-selected queue: {queue_id}")
            queues = desk.get('queues', [])
            queue = next((q for q in queues if q.get('id') == queue_id), None)
            if not queue:
                logger.warning(f"⚠️ Queue {queue_id} not found, ensuring All Open queue...")
                queue = ensure_all_open_queue(desk)
        else:
            # Ensure All Open queue exists (or create virtual one)
            logger.info("🔍 Ensuring All Open queue exists...")
            queue = ensure_all_open_queue(desk)
        
        if not queue:
            raise ValueError(f"Could not ensure All Open queue for desk {desk.get('name')}")
        
        preload_status['queue_id'] = queue.get('id')
        
        # Log if using virtual queue
        if queue.get('is_virtual'):
            logger.info(f"📋 Using VIRTUAL queue with JQL: {queue.get('jql')}")
        
        # Step 3: Fetch tickets (regular queue or virtual JQL)
        preload_status['progress'] = 30
        preload_status['message'] = f'Fetching tickets from {queue.get("name")}...'
        
        from utils.api_migration import get_api_client
        from api.sla_api import enrich_tickets_with_sla
        
        client = get_api_client()
        
        # Check if virtual queue (uses JQL search instead of queue API)
        if queue.get('is_virtual'):
            logger.info(f"📥 Fetching tickets using JQL: {queue.get('jql')}")
            search_result = client.search_issues(
                jql=queue.get('jql'),
                fields=queue.get('fields', ['summary', 'status', 'assignee', 'priority', 'created', 'updated']),
                max_results=1000
            )
            tickets = search_result.get('issues', [])
            logger.info(f"✅ Found {len(tickets)} tickets via JQL")
        else:
            # Regular queue
            logger.info(f"📥 Fetching tickets from queue {queue.get('id')} in desk {desk.get('id')}")
            tickets = client.get_queue_issues(queue.get('id'), desk_id=desk.get('id'))
        
        if not tickets:
            logger.warning(f"⚠️ No tickets found in queue {queue.get('name')}")
            tickets = []
        
        preload_status['tickets_loaded'] = len(tickets)
        logger.info(f"✅ Loaded {len(tickets)} tickets")
        
        # Step 4: Enrich with SLA
        preload_status['progress'] = 60
        preload_status['message'] = f'Enriching {len(tickets)} tickets with SLA data...'
        
        enriched_tickets = enrich_tickets_with_sla(tickets)
        
        # Step 4.5: Extract minimal fields (OPTIMIZATION)
        preload_status['progress'] = 70
        preload_status['message'] = 'Optimizing ticket data...'
        
        from api.blueprints.ml_dashboard import (
            extract_minimal_ticket_fields,
            calculate_sla_metrics,
            calculate_priority_distribution,
            calculate_trends
        )
        
        # ⚡ Extract only minimal fields needed for ML Dashboard
        minimal_tickets = [extract_minimal_ticket_fields(t) for t in enriched_tickets]
        
        logger.info(f"⚡ Optimized: Reduced tickets to minimal fields (~90% smaller)")
        
        # Step 5: Build ML analytics
        preload_status['progress'] = 80
        preload_status['message'] = 'Building ML analytics...'
        
        ml_data = {
            'desk_id': desk.get('id'),
            'desk_name': desk.get('name'),
            'queue_id': queue.get('id'),
            'queue_name': queue.get('name'),
            'tickets': minimal_tickets,  # ⚡ Using minimal tickets
            'total_tickets': len(minimal_tickets),
            'sla_metrics': calculate_sla_metrics(minimal_tickets),
            'priority_distribution': calculate_priority_distribution(minimal_tickets),
            'trends': calculate_trends(minimal_tickets),
            'cached_at': datetime.now().isoformat()
        }
        
        # Step 6: Compress and cache
        preload_status['progress'] = 90
        preload_status['message'] = 'Compressing and caching...'
        
        # Save to cache with compression
        from pathlib import Path
        cache_dir = Path('data/cache')
        cache_dir.mkdir(parents=True, exist_ok=True)
        
        compressed_file = cache_dir / 'ml_preload_cache.json.gz'
        compressed_data = compress_data(ml_data)
        
        with open(compressed_file, 'wb') as f:
            f.write(compressed_data)
        
        original_size = len(json.dumps(ml_data))
        compressed_size = len(compressed_data)
        compression_ratio = (1 - compressed_size / original_size) * 100
        
        logger.info(f"💾 Cached {len(enriched_tickets)} tickets")
        logger.info(f"📊 Compression: {original_size:,} → {compressed_size:,} bytes ({compression_ratio:.1f}% saved)")
        
        # Save cache indicator metadata (lightweight, accessible by other components)
        global cache_indicator
        cache_indicator = {
            'has_cache': True,
            'total_tickets': len(enriched_tickets),
            'desk_id': desk['id'],
            'desk_name': desk['name'],
            'queue_id': queue['id'],
            'queue_name': queue['name'],
            'cached_at': ml_data['cached_at'],
            'cache_file': str(compressed_file),
            'metadata_file': 'data/cache/ml_cache_indicator.json',
            'file_size_bytes': compressed_size,
            'compression_ratio_percent': round(compression_ratio, 1)
        }
        
        # Save indicator to separate JSON file for easy access
        indicator_file = cache_dir / 'ml_cache_indicator.json'
        with open(indicator_file, 'w', encoding='utf-8') as f:
            json.dump(cache_indicator, f, ensure_ascii=False, indent=2)
        
        logger.info(f"📍 Cache indicator saved: {indicator_file}")
        logger.info(f"🎯 Other components can now use cached tickets: {len(enriched_tickets)} tickets from '{queue['name']}'")
        
        # Step 7: Complete
        preload_status['progress'] = 100
        preload_status['message'] = f'✅ ML Dashboard ready! {len(enriched_tickets)} tickets analyzed'
        preload_status['completed_at'] = datetime.now().isoformat()
        
        logger.info(f"✅ ML Preloader: Completed successfully")
        
    except Exception as e:
        logger.error(f"❌ ML Preloader error: {e}", exc_info=True)
        preload_status['error'] = str(e)
        preload_status['message'] = f'❌ Error: {str(e)}'
    finally:
        preload_status['is_loading'] = False

@ml_preloader_bp.route('/preload', methods=['POST'])
def trigger_preload():
    """
    Trigger ML data preload in background
    Returns immediately with status
    Body (optional):
        {
            "desk_id": "123",    # User's fixed desk (logged session)
            "queue_id": "456"    # Currently selected queue (variable, can be any custom queue)
        }
    """
    global preload_status
    
    if preload_status['is_loading']:
        return jsonify({
            'success': False,
            'message': 'Preload already in progress',
            'status': preload_status
        }), 409
    
    # Get desk/queue from request (user session)
    data = request.get_json() or {}
    desk_id = data.get('desk_id')
    queue_id = data.get('queue_id')
    
    if desk_id and queue_id:
        logger.info(f"🎯 Starting preload with user session: desk={desk_id}, queue={queue_id}")
    else:
        logger.info("🔍 Starting preload with auto-detection")
    
    # Start background thread
    thread = threading.Thread(
        target=preload_ml_data_background,
        args=(desk_id, queue_id),
        daemon=True
    )
    thread.start()
    
    return jsonify({
        'success': True,
        'message': 'ML preload started with user context' if desk_id else 'ML preload started in background',
        'status': preload_status
    })

@ml_preloader_bp.route('/preload/status', methods=['GET'])
def get_preload_status():
    """
    Get current preload status
    """
    return jsonify({
        'success': True,
        'status': preload_status
    })

@ml_preloader_bp.route('/preload/data', methods=['GET'])
def get_preload_data():
    """
    Get cached preloaded ML data (decompressed)
    """
    try:
        from pathlib import Path
        cache_file = Path('data/cache/ml_preload_cache.json.gz')
        
        if not cache_file.exists():
            return jsonify({
                'success': False,
                'message': 'No preloaded data available. Run /api/ml/preload first.'
            }), 404
        
        # Decompress and return
        with open(cache_file, 'rb') as f:
            compressed_data = f.read()
        
        ml_data = decompress_data(compressed_data)
        
        return jsonify({
            'success': True,
            'data': ml_data,
            'cached_at': ml_data.get('cached_at'),
            'tickets_count': ml_data.get('total_tickets', 0)
        })
    except Exception as e:
        logger.error(f"Error loading preloaded data: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_preloader_bp.route('/preload/cache-info', methods=['GET'])
def get_cache_info():
    """
    Get cache indicator - lightweight metadata about cached tickets.
    Other components should check this endpoint first before loading full data.
    
    Returns:
        - has_cache: bool - Whether cache exists
        - total_tickets: int - Number of cached tickets
        - desk_id, desk_name, queue_id, queue_name - Source info
        - cached_at: timestamp
        - file_size_bytes, compression_ratio_percent
    
    Example usage:
        // Check if cache exists
        const info = await fetch('/api/ml/preload/cache-info').then(r => r.json());
        if (info.has_cache) {
            console.log(`✅ ${info.total_tickets} tickets cached from ${info.queue_name}`);
            // Use cached data...
        }
    """
    try:
        from pathlib import Path
        
        # Try to load indicator file
        indicator_file = Path('data/cache/ml_cache_indicator.json')
        
        if indicator_file.exists():
            with open(indicator_file, 'r', encoding='utf-8') as f:
                indicator = json.load(f)
            
            return jsonify({
                'success': True,
                'cache_info': indicator
            })
        else:
            # No indicator file, check if cache file exists
            cache_file = Path('data/cache/ml_preload_cache.json.gz')
            if cache_file.exists():
                # Cache exists but no indicator (legacy)
                return jsonify({
                    'success': True,
                    'cache_info': {
                        'has_cache': True,
                        'total_tickets': 0,  # Unknown
                        'message': 'Cache exists but indicator missing. Run preload again.'
                    }
                })
            else:
                # No cache at all
                return jsonify({
                    'success': True,
                    'cache_info': {
                        'has_cache': False,
                        'total_tickets': 0,
                        'message': 'No cache available. Run /api/ml/preload to create cache.'
                    }
                })
    except Exception as e:
        logger.error(f"Error getting cache info: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def background_refresh_worker():
    """
    Background worker that periodically refreshes the cache
    Runs every AUTO_REFRESH_INTERVAL seconds when enabled
    Always ensures All Open queue is available
    """
    global should_refresh, cache_indicator
    
    logger.info(f"🔄 Background refresh worker started (interval: {AUTO_REFRESH_INTERVAL}s)")
    
    while should_refresh:
        try:
            # Wait for interval
            time.sleep(AUTO_REFRESH_INTERVAL)
            
            if not should_refresh:
                break
            
            # Check if cache exists and is being used
            if cache_indicator.get('has_cache'):
                logger.info("🔄 Auto-refreshing ML cache in background...")
                
                # Ensure All Open queue exists before refresh
                desk = get_user_primary_desk()
                if desk:
                    queue = ensure_all_open_queue(desk)  # Guarantees queue or creates virtual
                    if queue:
                        # Trigger preload (will update existing cache)
                        preload_ml_data_background()
                        logger.info("✅ Background refresh completed")
                    else:
                        logger.warning("⚠️ Auto-refresh: Could not ensure All Open queue")
                else:
                    logger.warning("⚠️ Auto-refresh: No desk found")
        except Exception as e:
            logger.error(f"❌ Background refresh error: {e}")
            time.sleep(60)  # Wait 1 minute before retry
    
    logger.info("🛑 Background refresh worker stopped")

@ml_preloader_bp.route('/preload/auto-refresh', methods=['POST'])
def enable_auto_refresh():
    """
    Enable background auto-refresh of cache
    Cache will be refreshed every AUTO_REFRESH_INTERVAL seconds
    """
    global background_refresh_thread, should_refresh
    
    try:
        # Check if already running
        if should_refresh and background_refresh_thread and background_refresh_thread.is_alive():
            return jsonify({
                'success': False,
                'message': 'Auto-refresh already enabled',
                'interval_seconds': AUTO_REFRESH_INTERVAL
            }), 409
        
        # Start background worker
        should_refresh = True
        background_refresh_thread = threading.Thread(target=background_refresh_worker, daemon=True)
        background_refresh_thread.start()
        
        logger.info(f"✅ Auto-refresh enabled (every {AUTO_REFRESH_INTERVAL}s)")
        
        return jsonify({
            'success': True,
            'message': 'Auto-refresh enabled',
            'interval_seconds': AUTO_REFRESH_INTERVAL
        })
    except Exception as e:
        logger.error(f"Error enabling auto-refresh: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_preloader_bp.route('/preload/auto-refresh', methods=['DELETE'])
def disable_auto_refresh():
    """
    Disable background auto-refresh
    """
    global should_refresh
    
    should_refresh = False
    logger.info("🛑 Auto-refresh disabled")
    
    return jsonify({
        'success': True,
        'message': 'Auto-refresh disabled'
    })

@ml_preloader_bp.route('/preload/auto-refresh/status', methods=['GET'])
def get_auto_refresh_status():
    """
    Get auto-refresh status
    """
    global should_refresh, background_refresh_thread
    
    is_running = should_refresh and background_refresh_thread and background_refresh_thread.is_alive()
    
    return jsonify({
        'success': True,
        'auto_refresh': {
            'enabled': is_running,
            'interval_seconds': AUTO_REFRESH_INTERVAL,
            'next_refresh_in': AUTO_REFRESH_INTERVAL if is_running else None
        }
    })
