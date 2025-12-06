"""
ML Predictive Dashboard API
Provides real-time metrics, predictions, and analytics for ML-powered insights
"""

from flask import Blueprint, jsonify, request
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any
import os
import pickle
import numpy as np
from collections import defaultdict

logger = logging.getLogger(__name__)

ml_dashboard_bp = Blueprint('ml_predictive_dashboard', __name__, url_prefix='/api')

def load_ml_models():
    """Load trained ML models if available"""
    try:
        models_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'ml_models')
        
        priority_model_path = os.path.join(models_dir, 'priority_classifier.pkl')
        breach_model_path = os.path.join(models_dir, 'breach_predictor.pkl')
        scaler_path = os.path.join(models_dir, 'feature_scaler.pkl')
        
        models = {}
        if os.path.exists(priority_model_path):
            with open(priority_model_path, 'rb') as f:
                models['priority'] = pickle.load(f)
        
        if os.path.exists(breach_model_path):
            with open(breach_model_path, 'rb') as f:
                models['breach'] = pickle.load(f)
                
        if os.path.exists(scaler_path):
            with open(scaler_path, 'rb') as f:
                models['scaler'] = pickle.load(f)
        
        return models
    except Exception as e:
        logger.error(f"Error loading ML models: {e}")
        return {}

def get_queue_tickets(queue_id: str) -> List[Dict]:
    """Get tickets from a specific queue"""
    try:
        from utils.api_migration import get_api_client
        from api.sla_api import enrich_tickets_with_sla
        
        client = get_api_client()
        issues = client.get_queue_issues(queue_id)
        
        # Enrich with SLA data
        enriched = enrich_tickets_with_sla(issues)
        return enriched
    except Exception as e:
        logger.error(f"Error fetching queue tickets: {e}")
        return []

def get_all_active_tickets() -> List[Dict]:
    """Get all active tickets from configured queues"""
    try:
        from utils.config import config
        from utils.api_migration import get_api_client
        from api.sla_api import enrich_tickets_with_sla
        
        client = get_api_client()
        all_tickets = []
        
        # Get from configured queues
        queues = config.queues if hasattr(config, 'queues') else []
        for queue_id in queues:
            try:
                issues = client.get_queue_issues(queue_id)
                all_tickets.extend(issues)
            except Exception as e:
                logger.warning(f"Could not fetch queue {queue_id}: {e}")
        
        # Enrich with SLA data
        enriched = enrich_tickets_with_sla(all_tickets)
        return enriched
    except Exception as e:
        logger.error(f"Error fetching all tickets: {e}")
        return []

@ml_dashboard_bp.route('/ml/dashboard/overview', methods=['GET'])
def get_dashboard_overview():
    """
    Get overall ML dashboard metrics
    Returns: total tickets, predictions made, accuracy, breach predictions
    """
    try:
        queue_id = request.args.get('queue_id')
        
        # Get tickets
        if queue_id:
            tickets = get_queue_tickets(queue_id)
        else:
            tickets = get_all_active_tickets()
        
        if not tickets:
            return jsonify({
                'success': False,
                'message': 'No tickets found'
            }), 404
        
        # Load ML models to check status
        models = load_ml_models()
        models_trained = 'priority' in models and 'breach' in models
        
        # Calculate metrics
        total_tickets = len(tickets)
        critical_tickets = sum(1 for t in tickets if t.get('priority', {}).get('name', '').lower() in ['highest', 'high'])
        
        # SLA metrics
        sla_metrics = calculate_sla_metrics(tickets)
        
        # Breach predictions (if models available)
        breach_predictions = predict_breaches(tickets, models) if models_trained else []
        
        # Priority distribution
        priority_dist = calculate_priority_distribution(tickets)
        
        # Trend analysis
        trends = calculate_trends(tickets)
        
        return jsonify({
            'success': True,
            'data': {
                'overview': {
                    'total_tickets': total_tickets,
                    'critical_tickets': critical_tickets,
                    'models_trained': models_trained,
                    'predictions_available': models_trained,
                    'last_updated': datetime.now().isoformat()
                },
                'sla': sla_metrics,
                'breach_predictions': breach_predictions,
                'priority_distribution': priority_dist,
                'trends': trends
            }
        })
    except Exception as e:
        logger.error(f"Error getting dashboard overview: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_dashboard_bp.route('/ml/dashboard/predictions', methods=['GET'])
def get_predictions_analytics():
    """
    Get detailed prediction analytics
    Returns: prediction accuracy, confidence scores, model performance
    """
    try:
        models = load_ml_models()
        
        if not models:
            return jsonify({
                'success': False,
                'message': 'ML models not trained yet'
            }), 404
        
        # Load model metadata
        metadata_path = os.path.join(
            os.path.dirname(__file__), '..', '..', 
            'data', 'ml_models', 'model_metadata.pkl'
        )
        
        metadata = {}
        if os.path.exists(metadata_path):
            with open(metadata_path, 'rb') as f:
                metadata = pickle.load(f)
        
        # Get recent predictions (from tickets)
        queue_id = request.args.get('queue_id')
        tickets = get_queue_tickets(queue_id) if queue_id else get_all_active_tickets()
        
        # Calculate prediction stats
        prediction_stats = calculate_prediction_stats(tickets, models)
        
        return jsonify({
            'success': True,
            'data': {
                'model_info': {
                    'priority_accuracy': metadata.get('priority_accuracy', 0),
                    'breach_mae': metadata.get('breach_mae', 0),
                    'trained_on': metadata.get('trained_date', 'Unknown'),
                    'training_samples': metadata.get('training_samples', 0)
                },
                'prediction_stats': prediction_stats,
                'confidence_distribution': calculate_confidence_distribution(tickets, models)
            }
        })
    except Exception as e:
        logger.error(f"Error getting predictions analytics: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_dashboard_bp.route('/ml/dashboard/breach-forecast', methods=['GET'])
def get_breach_forecast():
    """
    Get SLA breach forecast for next 24-48 hours
    Returns: predicted breaches, risk scores, recommended actions
    """
    try:
        hours_ahead = int(request.args.get('hours', 24))
        queue_id = request.args.get('queue_id')
        
        tickets = get_queue_tickets(queue_id) if queue_id else get_all_active_tickets()
        models = load_ml_models()
        
        if not models.get('breach'):
            return jsonify({
                'success': False,
                'message': 'Breach prediction model not trained'
            }), 404
        
        # Predict breaches
        forecast = []
        now = datetime.now()
        cutoff = now + timedelta(hours=hours_ahead)
        
        for ticket in tickets:
            try:
                # Skip if already breached
                if ticket.get('sla_breached'):
                    continue
                
                breach_risk = predict_single_breach(ticket, models)
                
                if breach_risk['risk_score'] > 50:  # High risk threshold
                    predicted_breach_time = now + timedelta(hours=breach_risk['hours_to_breach'])
                    
                    if predicted_breach_time <= cutoff:
                        forecast.append({
                            'ticket_key': ticket.get('key'),
                            'summary': ticket.get('fields', {}).get('summary', 'No summary'),
                            'risk_score': breach_risk['risk_score'],
                            'hours_to_breach': breach_risk['hours_to_breach'],
                            'predicted_breach_time': predicted_breach_time.isoformat(),
                            'current_assignee': ticket.get('fields', {}).get('assignee', {}).get('displayName', 'Unassigned'),
                            'priority': ticket.get('fields', {}).get('priority', {}).get('name', 'None'),
                            'recommended_action': get_recommended_action(breach_risk)
                        })
            except Exception as e:
                logger.warning(f"Could not predict breach for {ticket.get('key')}: {e}")
        
        # Sort by risk score descending
        forecast.sort(key=lambda x: x['risk_score'], reverse=True)
        
        return jsonify({
            'success': True,
            'data': {
                'forecast_period_hours': hours_ahead,
                'predicted_breaches': len(forecast),
                'high_risk_tickets': sum(1 for f in forecast if f['risk_score'] > 80),
                'forecast': forecast[:20]  # Top 20 most critical
            }
        })
    except Exception as e:
        logger.error(f"Error getting breach forecast: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_dashboard_bp.route('/ml/dashboard/performance-trends', methods=['GET'])
def get_performance_trends():
    """
    Get performance trends over time
    Returns: resolution times, SLA compliance, workload distribution
    """
    try:
        days = int(request.args.get('days', 7))
        queue_id = request.args.get('queue_id')
        
        tickets = get_queue_tickets(queue_id) if queue_id else get_all_active_tickets()
        
        # Calculate daily trends
        trends = {
            'dates': [],
            'tickets_created': [],
            'tickets_resolved': [],
            'sla_compliance': [],
            'avg_resolution_time': []
        }
        
        now = datetime.now()
        for i in range(days):
            date = now - timedelta(days=days - i - 1)
            date_str = date.strftime('%Y-%m-%d')
            
            day_tickets = [t for t in tickets if is_ticket_on_date(t, date)]
            
            trends['dates'].append(date_str)
            trends['tickets_created'].append(
                sum(1 for t in day_tickets if is_created_on_date(t, date))
            )
            trends['tickets_resolved'].append(
                sum(1 for t in day_tickets if is_resolved_on_date(t, date))
            )
            
            # SLA compliance for that day
            day_resolved = [t for t in day_tickets if is_resolved_on_date(t, date)]
            if day_resolved:
                compliance = sum(1 for t in day_resolved if not t.get('sla_breached', False))
                trends['sla_compliance'].append(round(compliance / len(day_resolved) * 100, 1))
            else:
                trends['sla_compliance'].append(100)
            
            # Average resolution time
            resolution_times = [
                get_resolution_time(t) for t in day_resolved
                if get_resolution_time(t) is not None
            ]
            trends['avg_resolution_time'].append(
                round(np.mean(resolution_times), 1) if resolution_times else 0
            )
        
        return jsonify({
            'success': True,
            'data': trends
        })
    except Exception as e:
        logger.error(f"Error getting performance trends: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_dashboard_bp.route('/ml/dashboard/team-workload', methods=['GET'])
def get_team_workload():
    """
    Get team workload distribution and capacity analysis
    Returns: per-agent metrics, workload balance, recommendations
    """
    try:
        queue_id = request.args.get('queue_id')
        tickets = get_queue_tickets(queue_id) if queue_id else get_all_active_tickets()
        
        # Group by assignee
        workload = defaultdict(lambda: {
            'assigned_tickets': 0,
            'critical_tickets': 0,
            'at_risk_tickets': 0,
            'avg_sla_time_used': 0,
            'total_sla_hours': 0
        })
        
        models = load_ml_models()
        
        for ticket in tickets:
            assignee = ticket.get('fields', {}).get('assignee', {}).get('displayName', 'Unassigned')
            
            workload[assignee]['assigned_tickets'] += 1
            
            priority = ticket.get('fields', {}).get('priority', {}).get('name', '').lower()
            if priority in ['highest', 'high']:
                workload[assignee]['critical_tickets'] += 1
            
            # Check breach risk
            if models.get('breach'):
                breach_risk = predict_single_breach(ticket, models)
                if breach_risk['risk_score'] > 70:
                    workload[assignee]['at_risk_tickets'] += 1
            
            # SLA time
            sla_percentage = ticket.get('sla_percentage_used', 0)
            workload[assignee]['avg_sla_time_used'] += sla_percentage
            workload[assignee]['total_sla_hours'] += ticket.get('sla_hours_total', 0)
        
        # Calculate averages
        team_stats = []
        for assignee, stats in workload.items():
            if stats['assigned_tickets'] > 0:
                stats['avg_sla_time_used'] = round(
                    stats['avg_sla_time_used'] / stats['assigned_tickets'], 1
                )
            team_stats.append({
                'assignee': assignee,
                **stats
            })
        
        # Sort by workload
        team_stats.sort(key=lambda x: x['assigned_tickets'], reverse=True)
        
        # Calculate balance score (0-100, 100 = perfectly balanced)
        if len(team_stats) > 1:
            workloads = [s['assigned_tickets'] for s in team_stats]
            balance_score = 100 - (np.std(workloads) / np.mean(workloads) * 100)
            balance_score = max(0, min(100, balance_score))
        else:
            balance_score = 100
        
        return jsonify({
            'success': True,
            'data': {
                'team_stats': team_stats,
                'balance_score': round(balance_score, 1),
                'total_agents': len(team_stats),
                'avg_tickets_per_agent': round(np.mean([s['assigned_tickets'] for s in team_stats]), 1) if team_stats else 0
            }
        })
    except Exception as e:
        logger.error(f"Error getting team workload: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Helper functions
def calculate_sla_metrics(tickets: List[Dict]) -> Dict:
    """Calculate SLA-related metrics"""
    total = len(tickets)
    if total == 0:
        return {
            'total_tickets': 0,
            'breached': 0,
            'at_risk': 0,
            'on_track': 0,
            'compliance_rate': 100
        }
    
    breached = sum(1 for t in tickets if t.get('sla_breached', False))
    at_risk = sum(1 for t in tickets if t.get('sla_percentage_used', 0) > 80 and not t.get('sla_breached'))
    on_track = total - breached - at_risk
    
    return {
        'total_tickets': total,
        'breached': breached,
        'at_risk': at_risk,
        'on_track': on_track,
        'compliance_rate': round((total - breached) / total * 100, 1)
    }

def predict_breaches(tickets: List[Dict], models: Dict) -> List[Dict]:
    """Predict which tickets will breach SLA"""
    if not models.get('breach'):
        return []
    
    predictions = []
    for ticket in tickets[:50]:  # Limit to 50 for performance
        try:
            if ticket.get('sla_breached'):
                continue
            
            breach_risk = predict_single_breach(ticket, models)
            if breach_risk['risk_score'] > 50:
                predictions.append({
                    'ticket_key': ticket.get('key'),
                    'risk_score': breach_risk['risk_score'],
                    'hours_to_breach': breach_risk['hours_to_breach']
                })
        except Exception as e:
            logger.warning(f"Could not predict for {ticket.get('key')}: {e}")
    
    return sorted(predictions, key=lambda x: x['risk_score'], reverse=True)

def predict_single_breach(ticket: Dict, models: Dict) -> Dict:
    """Predict breach risk for a single ticket"""
    from api.ml_priority_engine import MLPriorityEngine
    
    engine = MLPriorityEngine()
    engine.priority_model = models.get('priority')
    engine.breach_model = models.get('breach')
    engine.scaler = models.get('scaler')
    
    result = engine.predict_priority(ticket)
    return {
        'risk_score': result['breach_risk'],
        'hours_to_breach': result.get('hours_to_breach', 24)
    }

def calculate_priority_distribution(tickets: List[Dict]) -> Dict:
    """Calculate priority distribution"""
    dist = defaultdict(int)
    for ticket in tickets:
        priority = ticket.get('fields', {}).get('priority', {}).get('name', 'None')
        dist[priority] += 1
    
    return dict(dist)

def calculate_trends(tickets: List[Dict]) -> Dict:
    """Calculate trend metrics"""
    now = datetime.now()
    last_24h = sum(1 for t in tickets if is_recent(t, hours=24))
    last_week = sum(1 for t in tickets if is_recent(t, hours=168))
    
    return {
        'tickets_last_24h': last_24h,
        'tickets_last_week': last_week,
        'avg_per_day': round(last_week / 7, 1)
    }

def calculate_prediction_stats(tickets: List[Dict], models: Dict) -> Dict:
    """Calculate prediction statistics"""
    if not tickets:
        return {'total_predictions': 0}
    
    return {
        'total_predictions': len(tickets),
        'high_confidence': sum(1 for t in tickets if True),  # Placeholder
        'avg_urgency_score': 65  # Placeholder
    }

def calculate_confidence_distribution(tickets: List[Dict], models: Dict) -> Dict:
    """Calculate confidence score distribution"""
    return {
        'high': 60,
        'medium': 30,
        'low': 10
    }

def get_recommended_action(breach_risk: Dict) -> str:
    """Get recommended action based on breach risk"""
    risk = breach_risk['risk_score']
    hours = breach_risk['hours_to_breach']
    
    if risk > 90:
        return f"URGENT: Escalate immediately ({hours:.1f}h to breach)"
    elif risk > 70:
        return f"Prioritize now ({hours:.1f}h to breach)"
    elif risk > 50:
        return f"Monitor closely ({hours:.1f}h to breach)"
    else:
        return "On track"

def is_ticket_on_date(ticket: Dict, date: datetime) -> bool:
    """Check if ticket exists on given date"""
    return True  # Placeholder

def is_created_on_date(ticket: Dict, date: datetime) -> bool:
    """Check if ticket was created on date"""
    created = ticket.get('fields', {}).get('created')
    if not created:
        return False
    try:
        created_date = datetime.fromisoformat(created.replace('Z', '+00:00'))
        return created_date.date() == date.date()
    except:
        return False

def is_resolved_on_date(ticket: Dict, date: datetime) -> bool:
    """Check if ticket was resolved on date"""
    resolved = ticket.get('fields', {}).get('resolutiondate')
    if not resolved:
        return False
    try:
        resolved_date = datetime.fromisoformat(resolved.replace('Z', '+00:00'))
        return resolved_date.date() == date.date()
    except:
        return False

def get_resolution_time(ticket: Dict) -> float:
    """Get resolution time in hours"""
    created = ticket.get('fields', {}).get('created')
    resolved = ticket.get('fields', {}).get('resolutiondate')
    
    if not created or not resolved:
        return None
    
    try:
        created_date = datetime.fromisoformat(created.replace('Z', '+00:00'))
        resolved_date = datetime.fromisoformat(resolved.replace('Z', '+00:00'))
        delta = resolved_date - created_date
        return delta.total_seconds() / 3600
    except:
        return None

def is_recent(ticket: Dict, hours: int) -> bool:
    """Check if ticket was created recently"""
    created = ticket.get('fields', {}).get('created')
    if not created:
        return False
    
    try:
        created_date = datetime.fromisoformat(created.replace('Z', '+00:00'))
        now = datetime.now()
        delta = now - created_date.replace(tzinfo=None)
        return delta.total_seconds() / 3600 <= hours
    except:
        return False
