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

def get_default_queue(desk: Dict) -> Optional[Dict]:
    """
    Find "All Open" queue or first non-empty queue
    Priority:
    1. Queue with "all open" in name (case-insensitive)
    2. Queue with "open" in name
    3. First queue
    """
    try:
        queues = desk.get('queues', [])
        if not queues:
            logger.warning(f"Desk {desk.get('id')} has no queues")
            return None
        
        # Priority 1: "All Open"
        for queue in queues:
            name = queue.get('name', '').lower()
            if 'all open' in name or 'all tickets' in name:
                logger.info(f"✅ Found default queue: {queue.get('name')} ({queue.get('id')})")
                return queue
        
        # Priority 2: "Open"
        for queue in queues:
            name = queue.get('name', '').lower()
            if 'open' in name and 'closed' not in name:
                logger.info(f"✅ Found open queue: {queue.get('name')} ({queue.get('id')})")
                return queue
        
        # Fallback: first queue
        logger.info(f"⚠️ Using first queue: {queues[0].get('name')} ({queues[0].get('id')})")
        return queues[0]
    except Exception as e:
        logger.error(f"Error finding default queue: {e}")
        return None

def preload_ml_data_background():
    """
    Background thread to preload ML data
    """
    global preload_status
    
    try:
        preload_status['is_loading'] = True
        preload_status['progress'] = 0
        preload_status['message'] = 'Detecting user context...'
        preload_status['started_at'] = datetime.now().isoformat()
        preload_status['error'] = None
        
        logger.info("🚀 ML Preloader: Starting background preload")
        
        # Step 1: Detect primary desk
        preload_status['progress'] = 10
        preload_status['message'] = 'Finding primary service desk...'
        desk = get_user_primary_desk()
        
        if not desk:
            raise ValueError("No service desk found")
        
        preload_status['desk_id'] = desk.get('id')
        
        # Step 2: Find default queue
        preload_status['progress'] = 20
        preload_status['message'] = 'Finding default queue...'
        queue = get_default_queue(desk)
        
        if not queue:
            raise ValueError(f"No queues found in desk {desk.get('name')}")
        
        preload_status['queue_id'] = queue.get('id')
        
        # Step 3: Fetch tickets
        preload_status['progress'] = 30
        preload_status['message'] = f'Fetching tickets from {queue.get("name")}...'
        
        from utils.api_migration import get_api_client
        from api.sla_api import enrich_tickets_with_sla
        
        client = get_api_client()
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
        
        # Step 5: Build ML analytics
        preload_status['progress'] = 80
        preload_status['message'] = 'Building ML analytics...'
        
        from api.blueprints.ml_dashboard import (
            calculate_sla_metrics,
            calculate_priority_distribution,
            calculate_trends
        )
        
        ml_data = {
            'desk_id': desk.get('id'),
            'desk_name': desk.get('name'),
            'queue_id': queue.get('id'),
            'queue_name': queue.get('name'),
            'tickets': enriched_tickets,
            'total_tickets': len(enriched_tickets),
            'sla_metrics': calculate_sla_metrics(enriched_tickets),
            'priority_distribution': calculate_priority_distribution(enriched_tickets),
            'trends': calculate_trends(enriched_tickets),
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
    """
    global preload_status
    
    if preload_status['is_loading']:
        return jsonify({
            'success': False,
            'message': 'Preload already in progress',
            'status': preload_status
        }), 409
    
    # Start background thread
    thread = threading.Thread(target=preload_ml_data_background, daemon=True)
    thread.start()
    
    return jsonify({
        'success': True,
        'message': 'ML preload started in background',
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
