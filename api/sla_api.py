#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
SLA API Blueprint - Handles all SLA-related endpoints
Separates SLA logic from main server.py for cleanliness and modularity
"""
from flask import Blueprint, jsonify
import os
import json
import logging
logger = logging.getLogger(__name__)
# Create blueprint
sla_bp = Blueprint('sla', __name__, url_prefix='/api')
# Global SLA cache
SLA_BY_SERVICE_DESK = {}
SLA_SUMMARY = {'total_slas_found': 0}
def enrich_tickets_with_sla(tickets):
    """
    Enrich tickets with SLA data.
    For ML Preloader, this is a no-op since SLA data is fetched on-demand.
    Returns tickets unchanged.
    """
    logger.info(f"⚡ Skipping SLA enrichment for {len(tickets)} tickets (fetched on-demand)")
    return tickets
def load_sla_cache():
    """Load pre-calculated SLA data from JSON file"""
    global SLA_BY_SERVICE_DESK, SLA_SUMMARY
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sla_cache_file = os.path.join(base_path, 'sla_data_cache.json')
    if os.path.exists(sla_cache_file):
        try:
            with open(sla_cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                SLA_BY_SERVICE_DESK.clear()
                SLA_BY_SERVICE_DESK.update(data.get('by_service_desk', {}))
                SLA_SUMMARY.clear()
                SLA_SUMMARY.update(data.get('summary', {}))
                logger.info(f"[SLA] Cache loaded: {len(SLA_BY_SERVICE_DESK)} desks, {SLA_SUMMARY.get('total_slas_found', 0)} SLAs")
                return True
        except Exception as e:
            logger.error(f"[SLA] Error loading cache: {e}")
            return False
    else:
        logger.warning(f"[SLA] Cache file not found: {sla_cache_file}")
        return False
def get_default_sla_for_priority(priority):
    """Get default SLA based on priority"""
    priority_upper = (priority or 'Normal').upper()
    defaults = {
        'CRITICAL': {'goal_minutes': 240, 'label': '4 hours'},
        'HIGHEST': {'goal_minutes': 240, 'label': '4 hours'},
        'HIGH': {'goal_minutes': 480, 'label': '8 hours'},
        'MEDIUM': {'goal_minutes': 480, 'label': '8 hours'},
        'LOW': {'goal_minutes': 1440, 'label': '24 hours'},
        'LOWEST': {'goal_minutes': 1440, 'label': '24 hours'},
    }
    config = defaults.get(priority_upper, defaults['MEDIUM'])
    return {
        'sla_name': f'Default SLA - {priority}',
        'goal_duration': config['label'],
        'goal_minutes': config['goal_minutes'],
        'elapsed_time': '00:00:00',
        'remaining_time': config['label'],
        'breached': False,
        'status': 'ongoing',
        'is_default': True,
        'cycle_number': 1
    }
@sla_bp.route('/ticket-sla/<issue_key>', methods=['GET'])
def get_ticket_sla(issue_key):
    """
    Get SLA for a ticket
    Priority order:
    1. Pre-calculated SLA from cache
    2. Real SLA from JIRA API (optional)
    3. Default SLA based on priority
    """
    try:
        logger.info(f"[SLA] Fetching SLA for {issue_key}")
        logger.info(f"[SLA] Cache size: {len(SLA_BY_SERVICE_DESK)}")
        # STEP 1: Search pre-calculated cache
        for desk_key, desk_data in SLA_BY_SERVICE_DESK.items():
            if 'queues' in desk_data:
                for queue_id, queue_data in desk_data['queues'].items():
                    if 'issues' in queue_data:
                        if issue_key in queue_data['issues']:
                            sla_list = queue_data['issues'][issue_key]
                            logger.info(f"[SLA] Found pre-calculated SLA for {issue_key}")
                            if sla_list and len(sla_list) > 0:
                                sla_data = sla_list[0]
                                cycles = []
                                if 'cycles' in sla_data:
                                    for cycle in sla_data['cycles']:
                                        cycles.append({
                                            'sla_name': sla_data.get('sla_name', 'SLA'),
                                            'cycle_number': cycle.get('cycle_number', 1),
                                            'goal_duration': cycle.get('goal_duration', 'N/A'),
                                            'elapsed_time': cycle.get('elapsed_time', '00:00:00'),
                                            'remaining_time': cycle.get('remaining_time', 'N/A'),
                                            'breached': cycle.get('breached', False),
                                            'status': cycle.get('status', 'ongoing'),
                                            'is_default': False
                                        })
                                if cycles:
                                    return jsonify({
                                        'success': True,
                                        'source': 'pre_calculated_sla',
                                        'sla': {
                                            'sla_name': sla_data.get('sla_name', 'SLA'),
                                            'goal_duration': sla_data.get('goal_duration', 'N/A'),
                                            'cycles': cycles,
                                            'total_cycles': len(cycles),
                                            'has_breach': any(c['breached'] for c in cycles)
                                        }
                                    }), 200
        # STEP 2: Default SLA by priority
        logger.info(f"[SLA] Using default SLA for {issue_key}")
        default_cycle = get_default_sla_for_priority('Medium')
        return jsonify({
            'success': True,
            'source': 'default_sla_by_priority',
            'sla': {
                'sla_name': default_cycle['sla_name'],
                'goal_duration': default_cycle['goal_duration'],
                'cycles': [default_cycle],
                'total_cycles': 1,
                'has_breach': False,
                'note': 'Default SLA assigned based on priority'
            }
        }), 200
    except Exception as e:
        logger.error(f"[SLA] Error: {e}")
        import traceback
        traceback.print_exc()
        logger.error(f"[SLA] Full traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500
@sla_bp.route('/sla/health', methods=['GET'])
def sla_health():
    """Check SLA system health"""
    return jsonify({
        'status': 'ok',
        'sla_cache_loaded': len(SLA_BY_SERVICE_DESK) > 0,
        'desks': len(SLA_BY_SERVICE_DESK),
        'total_slas': SLA_SUMMARY.get('total_slas_found', 0)
    }), 200
