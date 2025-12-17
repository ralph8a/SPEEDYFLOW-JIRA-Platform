# api/ai_endpoints.py
# Simple AI endpoints for SPEEDYFLOW
# Integrates SimpleAIEngine for ticket analysis
from flask import request, jsonify
from api.ai_engine_v2 import ai_engine
import logging
logger = logging.getLogger(__name__)
def register_ai_endpoints(app):
    """Register AI endpoints to Flask app"""
    @app.route('/api/ai/health', methods=['GET'])
    def ai_health():
        """Check AI engine health"""
        try:
            if ai_engine is None:
                return jsonify({
                    'success': False,
                    'status': 'unavailable',
                    'error': 'AI engine not initialized'
                }), 503
            health = ai_engine.health_check()
            return jsonify({
                'success': True,
                'data': health
            }), 200
        except Exception as e:
            logger.error(f"Health check error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    @app.route('/api/ai/analyze-ticket', methods=['POST'])
    def analyze_ticket_endpoint():
        """Analyze a single ticket"""
        try:
            if ai_engine is None:
                return jsonify({
                    'success': False,
                    'error': 'AI engine not initialized'
                }), 503
            data = request.json or {}
            ticket = data.get('ticket')
            if not ticket:
                return jsonify({
                    'success': False,
                    'error': 'Missing ticket data'
                }), 400
            analysis = ai_engine.analyze_ticket(ticket)
            return jsonify({
                'success': True,
                'data': analysis
            }), 200
        except Exception as e:
            logger.error(f"Ticket analysis error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    @app.route('/api/ai/find-similar', methods=['POST'])
    def find_similar_endpoint():
        """Find similar tickets"""
        try:
            if ai_engine is None:
                return jsonify({
                    'success': False,
                    'error': 'AI engine not initialized'
                }), 503
            data = request.json or {}
            ticket = data.get('ticket')
            all_tickets = data.get('all_tickets', [])
            threshold = data.get('threshold', 0.5)
            if not ticket or not all_tickets:
                return jsonify({
                    'success': False,
                    'error': 'Missing ticket or all_tickets data'
                }), 400
            similar = ai_engine.find_similar_tickets(ticket, all_tickets, threshold)
            return jsonify({
                'success': True,
                'data': {
                    'ticket_key': ticket.get('key'),
                    'similar_count': len(similar),
                    'similar_tickets': similar
                }
            }), 200
        except Exception as e:
            logger.error(f"Similar tickets error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    @app.route('/api/ai/find-duplicates', methods=['POST'])
    def find_duplicates_endpoint():
        """Find duplicate tickets in batch"""
        try:
            if ai_engine is None:
                return jsonify({
                    'success': False,
                    'error': 'AI engine not initialized'
                }), 503
            data = request.json or {}
            tickets = data.get('tickets', [])
            if not tickets:
                return jsonify({
                    'success': False,
                    'error': 'Missing tickets data'
                }), 400
            duplicates = ai_engine.find_duplicates_batch(tickets)
            return jsonify({
                'success': True,
                'data': {
                    'total_tickets': len(tickets),
                    'duplicates_found': len(duplicates),
                    'duplicates': duplicates
                }
            }), 200
        except Exception as e:
            logger.error(f"Duplicates search error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    @app.route('/api/ai/classify-tickets', methods=['POST'])
    def classify_tickets_endpoint():
        """Classify tickets by type"""
        try:
            if ai_engine is None:
                return jsonify({
                    'success': False,
                    'error': 'AI engine not initialized'
                }), 503
            data = request.json or {}
            tickets = data.get('tickets', [])
            if not tickets:
                return jsonify({
                    'success': False,
                    'error': 'Missing tickets data'
                }), 400
            classified = ai_engine.classify_tickets(tickets)
            return jsonify({
                'success': True,
                'data': {
                    'total_tickets': len(tickets),
                    'classifications': classified
                }
            }), 200
        except Exception as e:
            logger.error(f"Classification error: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    logger.info("✅ AI Endpoints registered successfully")
