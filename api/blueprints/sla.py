"""SLA Blueprint for SPEEDYFLOW JIRA Platform

Provides real-time SLA data from cached reports with JIRA API fallback.

Endpoints:
  GET /api/issues/<issue_key>/sla → SLA data for specific issue
  GET /api/sla/health             → System health check
"""
from flask import Blueprint
import logging
import json
import os
from datetime import datetime, UTC
from typing import Dict, Any
from utils.decorators import (handle_api_error, json_response,
                              log_request as log_decorator,
                              require_credentials)

logger = logging.getLogger(__name__)
sla_bp = Blueprint('sla', __name__)

def _format_minutes(minutes: int) -> str:
    """Convert minutes to human-readable format (e.g., '2 h 30 m')"""
    hours = minutes // 60
    mins = minutes % 60
    if hours > 0:
        return f"{hours} h {mins} m" if mins else f"{hours} h"
    return f"{mins} m"

def _get_issue_sla(issue_key: str) -> Dict[str, Any]:
    """Get SLA data from JIRA API (database cache disabled)"""
    try:
        # Database cache disabled - always fetch live from JIRA API
        # (Database should only store SLA templates, not ticket-specific state)
        
        # Try legacy JSON cache file (fallback only)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cache_file = os.path.join(base_dir, 'data', 'sla_final_report.json')

        if os.path.exists(cache_file):
            with open(cache_file, 'r', encoding='utf-8') as f:
                sla_report = json.load(f)

            # Search for ticket in SLA data
            for ticket in sla_report.get('tickets', []):
                if ticket.get('key') == issue_key:
                    # Extract SLA values (milliseconds -> minutes)
                    remaining_ms = ticket.get('remaining', 0)
                    elapsed_ms = ticket.get('elapsed', 0)
                    goal_str = ticket.get('goal', '')
                    breached = ticket.get('breached', False)

                    remaining_min = (remaining_ms // (1000 * 60)
                                     if remaining_ms > 0 else 0)
                    elapsed_min = (elapsed_ms // (1000 * 60)
                                   if elapsed_ms > 0 else 0)

                    # Parse goal string (e.g., "24 h" -> 1440 minutes)
                    goal_minutes = 1440  # Default 24h
                    if goal_str:
                        try:
                            if 'h' in goal_str:
                                hours = int(goal_str.split('h')[0].strip())
                                goal_minutes = hours * 60
                            elif 'm' in goal_str:
                                goal_minutes = int(
                                    goal_str.split('m')[0].strip())
                        except ValueError:
                            pass

                    remaining_time = (_format_minutes(remaining_min)
                                      if remaining_min > 0 else 'Overdue')

                    logger.info(f"✅ Found cached SLA data for {issue_key} in JSON file")
                    
                    # NOTE: Database caching disabled - storing ticket-specific SLA state is incorrect
                    
                    return {
                        'issue_key': issue_key,
                        'retrieved_at': datetime.now(UTC).isoformat(),
                        'sla_name': f'Service Level Agreement ({goal_str})',
                        'goal_minutes': goal_minutes,
                        'goal_duration': goal_str or _format_minutes(
                            goal_minutes),
                        'cycles': [{
                            'cycle_number': 1,
                            'elapsed_time': _format_minutes(elapsed_min),
                            'remaining_time': remaining_time,
                            'breached': breached,
                            'status': 'breached' if breached else 'ongoing'
                        }],
                        'total_cycles': 1,
                        'has_breach': breached,
                        'is_default': False,
                        'source': 'speedyflow_cache'
                    }

        # No cached data, fetch from JIRA API
        logger.info(f"No cached SLA for {issue_key}, fetching from JIRA API")
        from utils.api_migration import get_api_client
        api_client = get_api_client()

        # Get issue with all fields to extract SLA data
        response = api_client.get_issue(issue_key, expand=['*'])
        if not response:
            logger.warning(f"Could not fetch issue {issue_key} from JIRA")
            return None

        fields = response.get('fields', {})
        
        # SLA custom fields that contain ongoingCycle data
        # Priorize non "Cierre Ticket" SLAs first
        primary_sla_field_ids = [
            'customfield_10170',  # SLA's Incidente HUB
            'customfield_10181',  # SLA's Servicios Streaming
            'customfield_10182',  # SLA's Servicios Streaming (SR)
            'customfield_10183',  # SLA's Solicitud de CDRs
            'customfield_10184',  # SLA's Cotización Orden de Compra
            'customfield_10185',  # SLA's Errores Pruebas de Integración
            'customfield_10186',  # SLA's Actualización de SDK
            'customfield_10187',  # SLA's Splunk
            'customfield_10190',  # SLA's Soporte Aplicaciones
            'customfield_10259',  # SLA War Room
            'customfield_11957',  # Salud de Servicios
        ]
        
        # Secondary SLA (fallback with warning)
        secondary_sla_field_id = 'customfield_10176'  # Cierre Ticket
        
        # Collect all SLAs (primary and secondary) with their data
        all_slas = []
        
        # Gather primary SLAs first
        for field_id in primary_sla_field_ids:
            sla_field = fields.get(field_id)
            if not sla_field or not isinstance(sla_field, dict):
                continue
            
            ongoing = sla_field.get('ongoingCycle')
            if not ongoing:
                continue
            
            # Extract millis data
            elapsed = ongoing.get('elapsedTime', {})
            remaining = ongoing.get('remainingTime', {})
            goal = ongoing.get('goalDuration', {})
            
            sla_name = sla_field.get('name', 'Unknown SLA')
            goal_duration = goal.get('friendly', 'N/A')
            elapsed_time = elapsed.get('friendly', '0 m')
            remaining_time = remaining.get('friendly', 'N/A')
            breached = ongoing.get('breached', False)
            paused = ongoing.get('paused', False)
            
            # Determine status based on paused and breached states
            if paused:
                status = 'paused'
            elif breached:
                status = 'breached'
            else:
                status = 'ongoing'
            
            all_slas.append({
                'field_id': field_id,
                'is_secondary': False,
                'is_paused': paused,
                'is_breached': breached,
                'data': {
                    'issue_key': issue_key,
                    'retrieved_at': datetime.now(UTC).isoformat(),
                    'sla_name': sla_name,
                    'goal_duration': goal_duration,
                    'cycles': [{
                        'cycle_number': 1,
                        'elapsed_time': elapsed_time,
                        'remaining_time': remaining_time,
                        'breached': breached,
                        'paused': paused,
                        'status': status
                    }],
                    'total_cycles': 1,
                    'has_breach': breached,
                    'is_paused': paused,
                    'is_default': False,
                    'is_secondary': False,
                    'source': 'jira_live'
                }
            })
            
            logger.info(f"📋 Found primary SLA: {sla_name} (paused: {paused}, breached: {breached})")
        
        # Check secondary "Cierre Ticket" SLA and add to list
        sla_field = fields.get(secondary_sla_field_id)
        if sla_field and isinstance(sla_field, dict):
            ongoing = sla_field.get('ongoingCycle')
            if ongoing:
                elapsed = ongoing.get('elapsedTime', {})
                remaining = ongoing.get('remainingTime', {})
                goal = ongoing.get('goalDuration', {})
                
                sla_name = sla_field.get('name', 'Cierre Ticket')
                goal_duration = goal.get('friendly', 'N/A')
                elapsed_time = elapsed.get('friendly', '0 m')
                remaining_time = remaining.get('friendly', 'N/A')
                breached = ongoing.get('breached', False)
                paused = ongoing.get('paused', False)
                
                if paused:
                    status = 'paused'
                elif breached:
                    status = 'breached'
                else:
                    status = 'ongoing'
                
                all_slas.append({
                    'field_id': secondary_sla_field_id,
                    'is_secondary': True,
                    'is_paused': paused,
                    'is_breached': breached,
                    'data': {
                        'issue_key': issue_key,
                        'retrieved_at': datetime.now(UTC).isoformat(),
                        'sla_name': sla_name,
                        'goal_duration': goal_duration,
                        'cycles': [{
                            'cycle_number': 1,
                            'elapsed_time': elapsed_time,
                            'remaining_time': remaining_time,
                            'breached': breached,
                            'paused': paused,
                            'status': status
                        }],
                        'total_cycles': 1,
                        'has_breach': breached,
                        'is_paused': paused,
                        'is_default': False,
                        'is_secondary': True,
                        'source': 'jira_live_secondary'
                    }
                })
                
                logger.info(f"📋 Found secondary SLA: {sla_name} (paused: {paused}, breached: {breached})")
        
        # Now prioritize SLAs based on rules:
        # 1. Active (non-paused) PRIMARY SLAs first (prefer non-breached)
        # 2. Paused PRIMARY SLAs (still show them with paused status)
        # 3. Active (non-paused) SECONDARY SLA only if no primary exists
        # 4. Paused SECONDARY SLA as last resort
        
        if not all_slas:
            logger.info(f"No SLA data found for {issue_key}")
            return None
        
        # Filter and sort by priority
        active_primary = [s for s in all_slas if not s['is_paused'] and not s['is_secondary']]
        paused_primary = [s for s in all_slas if s['is_paused'] and not s['is_secondary']]
        active_secondary = [s for s in all_slas if not s['is_paused'] and s['is_secondary']]
        paused_secondary = [s for s in all_slas if s['is_paused'] and s['is_secondary']]
        
        selected = None
        
        if active_primary:
            # Use active primary SLA (prefer non-breached)
            active_primary.sort(key=lambda s: s['is_breached'])
            selected = active_primary[0]
            logger.info(f"✅ Selected active primary SLA for {issue_key}: {selected['data']['sla_name']}")
        elif paused_primary:
            # Return paused primary SLA to show paused status
            selected = paused_primary[0]
            logger.info(f"⏸️ Selected paused primary SLA for {issue_key}: {selected['data']['sla_name']}")
        elif active_secondary:
            # No primary SLA, use active secondary
            selected = active_secondary[0]
            logger.info(f"📌 Using active secondary SLA for {issue_key}: {selected['data']['sla_name']}")
        elif paused_secondary:
            # Last resort: paused secondary
            selected = paused_secondary[0]
            logger.info(f"⏸️ Using paused secondary SLA for {issue_key}: {selected['data']['sla_name']}")
        
        if selected:
            # NOTE: Database caching disabled - SLA data is already cached by JIRA API
            # and storing ticket-specific SLA state (elapsed, remaining, breached) in DB
            # is incorrect. The DB should only store SLA templates/definitions, not ticket state.
            # TODO: Implement proper sla_templates table for SLA definitions only
            return selected['data']
        
        # No SLA data found
        logger.info(f"No SLA data found for {issue_key}")
        return None

    except Exception as e:
        logger.warning(f"Failed to get SLA for {issue_key}: {e}")
        return None

@sla_bp.route('/api/issues/<issue_key>/sla', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_issue_sla(issue_key: str):
    """Get SLA data for specific issue"""
    sla_data = _get_issue_sla(issue_key)
    if sla_data is None:
        # Return 404 when no real SLA data exists
        from flask import jsonify
        return jsonify({
            'success': False,
            'error': 'No SLA data available for this issue',
            'issue_key': issue_key
        }), 404
    return sla_data

@sla_bp.route('/api/sla/health', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def api_sla_health():
    """SLA system health check"""
    from utils.db import get_db
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cache_file = os.path.join(base_dir, 'data', 'sla_final_report.json')
    
    cache_exists = os.path.exists(cache_file)
    tickets_count = 0
    
    if cache_exists:
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                tickets_count = len(data.get('tickets', []))
        except (IOError, json.JSONDecodeError):
            pass
    
    # Check database cache
    conn = get_db()
    db_count = conn.execute("SELECT COUNT(*) as count FROM slas").fetchone()['count']
    db_breached = conn.execute("SELECT COUNT(*) as count FROM slas WHERE breached = 1 AND expires_at > datetime('now')").fetchone()['count']
    
    return {
        'status': 'healthy',
        'cache_file_exists': cache_exists,
        'tickets_indexed': tickets_count,
        'cache_file': cache_file,
        'database_cache': {
            'total_slas': db_count,
            'breached_count': db_breached,
            'enabled': True
        }
    }

@sla_bp.route('/api/sla/breached', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_breached_slas():
    """Get all breached SLAs (database cache disabled - endpoint returns empty)"""
    from flask import request
    
    # Database SLA caching disabled - this endpoint no longer functions
    # TODO: Implement by fetching live from JIRA API if needed
    service_desk_id = request.args.get('serviceDeskId', '')
    
    return {
        'success': True,
        'count': 0,
        'breached_slas': [],
        'service_desk_id': service_desk_id if service_desk_id else 'all',
        'note': 'Database SLA caching disabled. Use /api/issues/{key}/sla for live data.'
    }

@sla_bp.route('/api/sla/cache/clear', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@require_credentials
def api_clear_sla_cache():
    """Clear expired SLA cache entries (database cache disabled - endpoint does nothing)"""
    
    # Database SLA caching disabled - this endpoint no longer has any effect
    # SLA data is always fetched live from JIRA API
    
    return {
        'success': True,
        'deleted_count': 0,
        'message': 'Database SLA caching disabled. No cache to clear.'
    }
