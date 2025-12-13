"""Backgrounds blueprint: dynamic background assets (AI / placeholder).

Routes:
    GET  /api/backgrounds/list      -> list cached/generated backgrounds (stub)
    POST /api/backgrounds/generate  -> generate background variants for a theme

Notes:
    - Front-end background-manager.js expects top-level keys: success, variants,
        ollama_available. Because we use the json_response decorator elsewhere but
        need top-level 'variants', we return a Flask Response directly on POST to
        avoid double-wrapping.
    - Variants include data_uri (SVG), theme, description, timestamp.
    - Placeholder implementation uses lightweight inline SVG gradients (<1KB each)
        for immediate visual feedback without external dependencies.
"""
from flask import Blueprint, request, jsonify
import logging
from datetime import datetime
from utils.decorators import handle_api_error, json_response, log_request as log_decorator

logger = logging.getLogger(__name__)
backgrounds_bp = Blueprint('backgrounds', __name__)

@backgrounds_bp.route('/api/backgrounds/list', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def list_backgrounds():
    return {'backgrounds': [], 'count': 0, 'message': 'Background assets not yet implemented'}


@backgrounds_bp.route('/api/backgrounds/generate', methods=['POST'])
@handle_api_error
@log_decorator(logging.INFO)
def generate_backgrounds():
    """Generate AI background variants for requested theme.
    Body: { "theme": "dark" | "light" }
    Response (direct jsonify, not json_response):
      { success: true, variants: [...], theme: <str>, count: <int>, ollama_available: false }
    """
    payload = request.get_json(silent=True) or {}
    theme = (payload.get('theme') or 'dark').lower().strip()
    if theme not in ('dark', 'light'):
        theme = 'dark'

    try:
        # Import the enhanced generator
        from api.ai_backgrounds import get_ai_backgrounds
        
        # Generate backgrounds (returns dict with success, variants, etc)
        result = get_ai_backgrounds(theme)
        
        # Add ollama_available flag for frontend compatibility
        result['ollama_available'] = False
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error generating backgrounds: {e}")
        # Fallback to simple placeholder if generation fails
        timestamp = datetime.utcnow().isoformat() + 'Z'
        return jsonify({
            'success': False, 
            'error': str(e),
            'variants': [],
            'count': 0,
            'ollama_available': False,
            'theme': theme,
            'timestamp': timestamp
        }), 500
