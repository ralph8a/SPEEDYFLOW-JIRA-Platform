# api/ollama_endpoints.py
# Ollama AI Endpoints for SalesJIRA
# FREE LOCAL AI - No API costs, no internet required

from flask import request, jsonify
import logging

logger = logging.getLogger(__name__)

def register_ollama_endpoints(app):
    """Register Ollama AI endpoints to Flask app"""
    
    # Import engines INSIDE function to avoid circular imports
    try:
        from api.ai_ollama import ollama_engine
        from api.ai_engine_v2 import ai_engine
    except ImportError as e:
        logger.error(f"❌ Failed to import engines: {e}")
        return
    
    @app.route('/api/ollama/health', methods=['GET'])
    def ollama_health():
        """Check Ollama AI availability"""
        try:
            health = ollama_engine.health_check()
            status_code = 200 if health['available'] else 503
            
            return jsonify({
                'success': health['available'],
                'data': health
            }), status_code
            
        except Exception as e:
            logger.error(f"Ollama health check error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/ollama/analyze-ticket', methods=['POST'])
    def ollama_analyze_ticket():
        """Analyze ticket with Ollama AI"""
        try:
            data = request.json or {}
            ticket = data.get('ticket')
            
            if not ticket:
                return jsonify({
                    'success': False,
                    'error': 'Missing ticket data'
                }), 400
            
            if not ollama_engine.is_available:
                return jsonify({
                    'success': False,
                    'error': 'Ollama not available',
                    'hint': 'Install: https://ollama.ai, Run: ollama pull llama2 && ollama serve'
                }), 503
            
            result = ollama_engine.analyze_ticket_with_ai(ticket)
            
            return jsonify({
                'success': result.get('success', False),
                'data': result
            }), 200 if result.get('success') else 500
            
        except Exception as e:
            logger.error(f"Ollama analysis error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/ollama/find-duplicates', methods=['POST'])
    def ollama_find_duplicates():
        """Verify duplicates with Ollama AI"""
        try:
            data = request.json or {}
            ticket = data.get('ticket')
            tickets = data.get('all_tickets', [])
            
            if not ticket or not tickets:
                return jsonify({
                    'success': False,
                    'error': 'Missing ticket or all_tickets data'
                }), 400
            
            if not ollama_engine.is_available:
                return jsonify({
                    'success': False,
                    'error': 'Ollama not available'
                }), 503
            
            # First use simple engine to find similar
            similar = ai_engine.find_similar_tickets(ticket, tickets, threshold=0.5)
            
            # Then verify with AI
            if similar:
                result = ollama_engine.find_duplicates_with_ai(ticket, similar)
                return jsonify({
                    'success': result.get('success', False),
                    'data': result
                }), 200 if result.get('success') else 500
            else:
                return jsonify({
                    'success': True,
                    'data': {
                        'ticket_key': ticket.get('key'),
                        'message': 'No similar tickets found',
                        'similar_count': 0
                    }
                }), 200
            
        except Exception as e:
            logger.error(f"Ollama duplicate detection error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/ollama/summarize-ticket', methods=['POST'])
    def ollama_summarize():
        """Generate AI summary of ticket"""
        try:
            data = request.json or {}
            ticket = data.get('ticket')
            
            if not ticket:
                return jsonify({
                    'success': False,
                    'error': 'Missing ticket data'
                }), 400
            
            if not ollama_engine.is_available:
                return jsonify({
                    'success': False,
                    'error': 'Ollama not available'
                }), 503
            
            result = ollama_engine.generate_ticket_summary(ticket)
            
            return jsonify({
                'success': result.get('success', False),
                'data': result
            }), 200 if result.get('success') else 500
            
        except Exception as e:
            logger.error(f"Ollama summary error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/ollama/suggest-response', methods=['POST'])
    def ollama_suggest_response():
        """Generate suggested response to ticket"""
        try:
            data = request.json or {}
            ticket = data.get('ticket')
            
            if not ticket:
                return jsonify({
                    'success': False,
                    'error': 'Missing ticket data'
                }), 400
            
            if not ollama_engine.is_available:
                return jsonify({
                    'success': False,
                    'error': 'Ollama not available'
                }), 503
            
            result = ollama_engine.generate_response_suggestion(ticket)
            
            return jsonify({
                'success': result.get('success', False),
                'data': result
            }), 200 if result.get('success') else 500
            
        except Exception as e:
            logger.error(f"Ollama response generation error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    logger.info("✅ Ollama AI Endpoints registered successfully")
