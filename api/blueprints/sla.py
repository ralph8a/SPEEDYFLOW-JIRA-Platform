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
    """Get SLA data from JIRA API by fetching issue and extracting SLA fields"""
    try:
        # First try cached report
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

                    logger.info(f"✅ Found cached SLA data for {issue_key}")
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
        sla_field_ids = [
            'customfield_10170',  # SLA's Incidente HUB
            'customfield_10176',  # Cierre Ticket
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
        
        for field_id in sla_field_ids:
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
            
            logger.info(f"✅ Found live SLA data for {issue_key}: {sla_name} (paused: {paused})")
            
            return {
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
                'source': 'jira_live'
            }

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
    
    return {
        'status': 'healthy' if cache_exists else 'degraded',
        'cache_file_exists': cache_exists,
        'tickets_indexed': tickets_count,
        'cache_file': cache_file
    }
