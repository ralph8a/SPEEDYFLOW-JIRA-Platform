# api/ai_api.py
# Phase 7: AI/ML API Endpoints for SpeedyForce
# Provides REST endpoints for all AI features

from flask import Blueprint, request, jsonify
from datetime import datetime
import sys
import os

# Add current directory to path for relative imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai_engine import AIEngine

# Create blueprint
ai_blueprint = Blueprint('ai', __name__, url_prefix='/api/ai')

# Initialize AI engine
ai_engine = AIEngine()

# ============================================================================
# DUPLICATE DETECTION ENDPOINT
# ============================================================================

@ai_blueprint.route('/find-duplicates', methods=['POST'])
def find_duplicates():
    """Find duplicate or similar tickets"""
    try:
        data = request.json
        
        title = data.get('title', '')
        description = data.get('description', '')
        all_tickets = data.get('all_tickets', [])
        threshold = data.get('threshold', 0.35)
        
        if not title or not all_tickets:
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields: title, all_tickets'
            }), 400
        
        result = ai_engine.find_duplicates(title, description, all_tickets, threshold)
        
        return jsonify({
            'status': 'success',
            'data': result,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ============================================================================
# SMART SEARCH ENDPOINT
# ============================================================================

@ai_blueprint.route('/search', methods=['GET'])
def smart_search():
    """Get smart search suggestions"""
    try:
        user_id = request.args.get('user_id', 'anonymous')
        search_term = request.args.get('q', '')
        
        # Note: In production, fetch all_tickets from database
        all_tickets = request.args.get('all_tickets', [])
        
        if not search_term:
            return jsonify({
                'status': 'error',
                'message': 'Missing search term (q parameter)'
            }), 400
        
        result = ai_engine.get_search_suggestions(user_id, search_term, all_tickets)
        
        return jsonify({
            'status': 'success',
            'data': result,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ============================================================================
# WORKFLOW AUTOMATION ENDPOINT
# ============================================================================

@ai_blueprint.route('/workflow-suggest', methods=['POST'])
def suggest_workflow():
    """Get workflow automation suggestions"""
    try:
        data = request.json
        
        ticket = data.get('ticket', {})
        comments = data.get('comments', [])
        
        if not ticket:
            return jsonify({
                'status': 'error',
                'message': 'Missing required field: ticket'
            }), 400
        
        result = ai_engine.suggest_workflow_actions(ticket, comments)
        
        return jsonify({
            'status': 'success',
            'data': result,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ============================================================================
# AI PREVIEW ENDPOINT
# ============================================================================

@ai_blueprint.route('/preview/<ticket_id>', methods=['GET'])
def get_preview(ticket_id):
    """Get AI preview for ticket hover"""
    try:
        # Note: In production, fetch from database
        ticket = request.args.get('ticket', {})
        comments = request.args.get('comments', [])
        all_tickets = request.args.get('all_tickets', [])
        
        if not ticket:
            return jsonify({
                'status': 'error',
                'message': 'Missing ticket data'
            }), 400
        
        result = ai_engine.generate_ticket_preview(ticket, comments, all_tickets)
        
        return jsonify({
            'status': 'success',
            'data': result,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ============================================================================
# RELATED TICKETS ENDPOINT
# ============================================================================

@ai_blueprint.route('/related-tickets/<ticket_id>', methods=['GET'])
def get_related_tickets(ticket_id):
    """Get related tickets for a given ticket"""
    try:
        # Note: In production, fetch from database
        ticket = request.args.get('ticket', {})
        all_tickets = request.args.get('all_tickets', [])
        limit = request.args.get('limit', 5, type=int)
        
        if not ticket:
            return jsonify({
                'status': 'error',
                'message': 'Missing ticket data'
            }), 400
        
        related = ai_engine.find_related_tickets(ticket, all_tickets, limit)
        
        return jsonify({
            'status': 'success',
            'data': {
                'ticket_id': ticket_id,
                'related_tickets': related,
                'count': len(related)
            },
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ============================================================================
# CACHE MANAGEMENT ENDPOINTS
# ============================================================================

@ai_blueprint.route('/cache/clear', methods=['POST'])
def clear_cache():
    """Clear AI cache"""
    try:
        ai_engine.clear_cache()
        
        return jsonify({
            'status': 'success',
            'message': 'Cache cleared',
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@ai_blueprint.route('/cache/stats', methods=['GET'])
def cache_stats():
    """Get cache statistics"""
    try:
        stats = ai_engine.get_cache_stats()
        
        return jsonify({
            'status': 'success',
            'data': stats,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ============================================================================
# BATCH ENDPOINT
# ============================================================================

@ai_blueprint.route('/batch', methods=['POST'])
def batch_analysis():
    """Analyze multiple tickets at once"""
    try:
        data = request.json
        
        tickets = data.get('tickets', [])
        action = data.get('action', 'preview')  # preview, duplicates, related
        
        if not tickets:
            return jsonify({
                'status': 'error',
                'message': 'Missing tickets'
            }), 400
        
        results = []
        
        if action == 'duplicates':
            for ticket in tickets:
                result = ai_engine.find_duplicates(
                    ticket.get('title', ''),
                    ticket.get('description', ''),
                    data.get('all_tickets', [])
                )
                results.append({
                    'ticket_id': ticket.get('id'),
                    'result': result
                })
        
        elif action == 'related':
            for ticket in tickets:
                related = ai_engine.find_related_tickets(
                    ticket,
                    data.get('all_tickets', [])
                )
                results.append({
                    'ticket_id': ticket.get('id'),
                    'related': related
                })
        
        return jsonify({
            'status': 'success',
            'data': {
                'action': action,
                'tickets_processed': len(tickets),
                'results': results
            },
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ============================================================================
# HEALTH CHECK
# ============================================================================

@ai_blueprint.route('/health', methods=['GET'])
def health_check():
    """Health check for AI service"""
    return jsonify({
        'status': 'healthy',
        'service': 'AI/ML Engine',
        'version': '1.0.0',
        'features': [
            'Duplicate Detection',
            'Smart Search',
            'Workflow Automation',
            'AI Preview',
            'Related Tickets'
        ],
        'timestamp': datetime.now().isoformat()
    }), 200


# ============================================================================
# DOCUMENTATION ENDPOINT
# ============================================================================

@ai_blueprint.route('/docs', methods=['GET'])
def get_docs():
    """Get API documentation"""
    return jsonify({
        'service': 'SpeedyForce AI/ML Engine',
        'version': '1.0.0',
        'endpoints': {
            'find_duplicates': {
                'method': 'POST',
                'path': '/api/ai/find-duplicates',
                'description': 'Find duplicate or similar tickets',
                'params': {
                    'title': 'Ticket title (required)',
                    'description': 'Ticket description',
                    'all_tickets': 'Array of tickets to compare against',
                    'threshold': 'Similarity threshold (0-1, default 0.35)'
                }
            },
            'smart_search': {
                'method': 'GET',
                'path': '/api/ai/search?q=term&user_id=id',
                'description': 'Get smart search suggestions'
            },
            'workflow_suggest': {
                'method': 'POST',
                'path': '/api/ai/workflow-suggest',
                'description': 'Get workflow automation suggestions'
            },
            'preview': {
                'method': 'GET',
                'path': '/api/ai/preview/<ticket_id>',
                'description': 'Get AI preview for ticket hover'
            },
            'related_tickets': {
                'method': 'GET',
                'path': '/api/ai/related-tickets/<ticket_id>',
                'description': 'Get related/similar tickets'
            },
            'cache_clear': {
                'method': 'POST',
                'path': '/api/ai/cache/clear',
                'description': 'Clear AI cache'
            },
            'cache_stats': {
                'method': 'GET',
                'path': '/api/ai/cache/stats',
                'description': 'Get cache statistics'
            }
        }
    }), 200
