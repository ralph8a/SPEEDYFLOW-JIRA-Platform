"""
ML Priority API Blueprint
=========================

Endpoints for ML-powered ticket prioritization and predictions.
"""

from flask import Blueprint, jsonify, request
import logging
from typing import Dict, List
from api.ml_priority_engine import ml_engine

logger = logging.getLogger(__name__)

ml_priority_bp = Blueprint('ml_priority', __name__, url_prefix='/api/ml')


@ml_priority_bp.route('/priority/<issue_key>', methods=['GET'])
def predict_priority(issue_key: str):
    """
    Predict priority and breach risk for a specific ticket.
    
    GET /api/ml/priority/PROJ-123
    
    Returns:
        {
            "success": true,
            "data": {
                "issue_key": "PROJ-123",
                "urgency_score": 85.5,
                "priority_level": "critical",
                "badge": "🔥",
                "breach_risk": 78.2,
                "recommended_action": "Immediate attention required",
                "reasoning": "SLA expires in 1.5h • High severity issue",
                "confidence": 0.92,
                "model_version": "1.0"
            }
        }
    """
    try:
        # Get ticket data from cache or API
        ticket = get_ticket_data(issue_key)
        
        if not ticket:
            return jsonify({
                'success': False,
                'error': f'Ticket {issue_key} not found'
            }), 404
        
        # Predict priority
        prediction = ml_engine.predict_priority(ticket)
        prediction['issue_key'] = issue_key
        
        return jsonify({
            'success': True,
            'data': prediction
        })
    
    except Exception as e:
        logger.error(f"❌ Priority prediction error for {issue_key}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ml_priority_bp.route('/batch-priority', methods=['POST'])
def batch_predict_priority():
    """
    Predict priorities for multiple tickets in batch.
    
    POST /api/ml/batch-priority
    Body: {
        "issue_keys": ["PROJ-1", "PROJ-2", "PROJ-3"],
        "tickets": [...]  // Optional: provide ticket data directly
    }
    
    Returns:
        {
            "success": true,
            "data": {
                "PROJ-1": { urgency_score: 85, ... },
                "PROJ-2": { urgency_score: 45, ... },
                ...
            },
            "stats": {
                "total": 3,
                "critical": 1,
                "high": 1,
                "medium": 1,
                "low": 0
            }
        }
    """
    try:
        data = request.get_json()
        issue_keys = data.get('issue_keys', [])
        tickets_data = data.get('tickets', [])
        
        if not issue_keys and not tickets_data:
            return jsonify({
                'success': False,
                'error': 'Provide either issue_keys or tickets'
            }), 400
        
        predictions = {}
        stats = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        
        # If tickets provided directly
        if tickets_data:
            for ticket in tickets_data:
                key = ticket.get('key')
                if key:
                    pred = ml_engine.predict_priority(ticket)
                    predictions[key] = pred
                    stats[pred['priority_level']] += 1
        
        # If only keys provided, fetch tickets
        else:
            for key in issue_keys:
                ticket = get_ticket_data(key)
                if ticket:
                    pred = ml_engine.predict_priority(ticket)
                    predictions[key] = pred
                    stats[pred['priority_level']] += 1
        
        stats['total'] = len(predictions)
        
        return jsonify({
            'success': True,
            'data': predictions,
            'stats': stats
        })
    
    except Exception as e:
        logger.error(f"❌ Batch prediction error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ml_priority_bp.route('/train', methods=['POST'])
def train_model():
    """
    Train the ML models with historical data.
    
    POST /api/ml/train
    Body: {
        "tickets": [...],  // Array of ticket objects
        "labels": [...]    // Optional: manual urgency labels
    }
    
    Returns:
        {
            "success": true,
            "message": "Models trained successfully",
            "metadata": {
                "num_tickets": 150,
                "priority_accuracy": 0.87,
                "breach_mae": 2.3
            }
        }
    """
    try:
        data = request.get_json()
        tickets = data.get('tickets', [])
        labels = data.get('labels')
        
        if len(tickets) < 50:
            return jsonify({
                'success': False,
                'error': 'Need at least 50 tickets for training'
            }), 400
        
        success = ml_engine.train_model(tickets, labels)
        
        if success:
            # Load metadata
            import json
            from pathlib import Path
            metadata_path = Path(__file__).parent.parent / 'data' / 'ml_models' / 'metadata.json'
            
            with open(metadata_path) as f:
                metadata = json.load(f)
            
            return jsonify({
                'success': True,
                'message': 'Models trained successfully',
                'metadata': metadata
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Training failed'
            }), 500
    
    except Exception as e:
        logger.error(f"❌ Training error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ml_priority_bp.route('/model-status', methods=['GET'])
def model_status():
    """
    Get current ML model status.
    
    GET /api/ml/model-status
    
    Returns:
        {
            "success": true,
            "data": {
                "is_trained": true,
                "model_version": "1.0",
                "trained_at": "2025-12-06T...",
                "num_tickets": 150,
                "sklearn_available": true
            }
        }
    """
    try:
        import json
        from pathlib import Path
        from api.ml_priority_engine import SKLEARN_AVAILABLE
        
        metadata_path = Path(__file__).parent.parent / 'data' / 'ml_models' / 'metadata.json'
        
        status = {
            'is_trained': ml_engine.is_trained,
            'sklearn_available': SKLEARN_AVAILABLE,
            'model_version': '1.0'
        }
        
        if metadata_path.exists():
            with open(metadata_path) as f:
                metadata = json.load(f)
            status.update(metadata)
        
        return jsonify({
            'success': True,
            'data': status
        })
    
    except Exception as e:
        logger.error(f"❌ Status check error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ml_priority_bp.route('/queue-analysis/<queue_id>', methods=['GET'])
def analyze_queue(queue_id: str):
    """
    Analyze an entire queue and return priority insights.
    
    GET /api/ml/queue-analysis/123?desk_id=456
    
    Returns:
        {
            "success": true,
            "data": {
                "queue_id": "123",
                "total_tickets": 45,
                "critical_count": 5,
                "high_risk_breach": 8,
                "avg_urgency": 62.5,
                "recommendations": [
                    {
                        "issue_key": "PROJ-123",
                        "urgency_score": 95,
                        "reason": "SLA expires in 30min"
                    }
                ]
            }
        }
    """
    try:
        desk_id = request.args.get('desk_id')
        
        # Fetch queue tickets
        tickets = get_queue_tickets(queue_id, desk_id)
        
        if not tickets:
            return jsonify({
                'success': False,
                'error': f'No tickets found in queue {queue_id}'
            }), 404
        
        # Analyze all tickets
        critical_count = 0
        high_risk_breach = 0
        total_urgency = 0
        recommendations = []
        
        for ticket in tickets:
            pred = ml_engine.predict_priority(ticket)
            total_urgency += pred['urgency_score']
            
            if pred['priority_level'] == 'critical':
                critical_count += 1
            
            if pred['breach_risk'] > 70:
                high_risk_breach += 1
            
            # Top 10 recommendations
            if len(recommendations) < 10:
                recommendations.append({
                    'issue_key': ticket.get('key'),
                    'urgency_score': pred['urgency_score'],
                    'breach_risk': pred['breach_risk'],
                    'reason': pred['reasoning']
                })
        
        # Sort recommendations by urgency
        recommendations.sort(key=lambda x: x['urgency_score'], reverse=True)
        
        analysis = {
            'queue_id': queue_id,
            'total_tickets': len(tickets),
            'critical_count': critical_count,
            'high_risk_breach': high_risk_breach,
            'avg_urgency': round(total_urgency / len(tickets), 2) if tickets else 0,
            'recommendations': recommendations[:10]
        }
        
        return jsonify({
            'success': True,
            'data': analysis
        })
    
    except Exception as e:
        logger.error(f"❌ Queue analysis error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# Helper functions
def get_ticket_data(issue_key: str) -> Dict:
    """Fetch ticket data from cache or API."""
    try:
        # Try to get from app.currentIssues cache first
        # Otherwise fetch from JIRA API
        from utils.jira_api import JiraAPI
        from utils.api_migration import get_api_client
        
        client = get_api_client()
        
        # Fetch issue with SLA data
        issue = client.get_issue(issue_key)
        
        if issue:
            # Enrich with SLA data
            try:
                sla_response = client.session.get(
                    f"{client.base_url}/rest/api/3/issue/{issue_key}",
                    params={'expand': 'changelog'},
                    headers=client.headers
                )
                
                if sla_response.status_code == 200:
                    issue_data = sla_response.json()
                    
                    # Get SLA separately
                    from api.blueprints.sla import get_sla_for_issue
                    sla_data = get_sla_for_issue(issue_key)
                    
                    if sla_data:
                        issue['sla'] = sla_data
                    
                    # Count comments
                    comments = issue_data.get('fields', {}).get('comment', {}).get('comments', [])
                    issue['comment_count'] = len(comments)
            except:
                pass
        
        return issue
    
    except Exception as e:
        logger.error(f"❌ Error fetching ticket {issue_key}: {e}")
        return None


def get_queue_tickets(queue_id: str, desk_id: str) -> List[Dict]:
    """Fetch all tickets from a queue."""
    try:
        from utils.api_migration import get_api_client
        
        client = get_api_client()
        tickets = client.get_queue_issues(desk_id, queue_id)
        
        return tickets if tickets else []
    
    except Exception as e:
        logger.error(f"❌ Error fetching queue {queue_id}: {e}")
        return []
