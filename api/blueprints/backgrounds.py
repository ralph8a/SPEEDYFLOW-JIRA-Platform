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
import os
import json

logger = logging.getLogger(__name__)
backgrounds_bp = Blueprint('backgrounds', __name__)

@backgrounds_bp.route('/api/backgrounds/list', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
def list_backgrounds():
    # Serve pre-generated/static backgrounds manifest from frontend/static/backgrounds/generated/manifest.json
    try:
        base = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))  # repo root/api/blueprints -> repo root
        manifest_path = os.path.join(base, 'frontend', 'static', 'backgrounds', 'generated', 'manifest.json')
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r', encoding='utf-8') as fh:
                manifest = json.load(fh)
            variants = manifest.get('variants', [])
            return {'success': True, 'variants': variants, 'count': len(variants), 'generated_at': manifest.get('generated_at')}
        else:
            return {'success': True, 'variants': [], 'count': 0, 'message': 'No manifest found'}
    except Exception as e:
        logger.error(f"Failed to read backgrounds manifest: {e}")
        return {'success': False, 'variants': [], 'count': 0, 'error': str(e)}

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

    # Background generation is intentionally disabled in this deployment.
    # Clients should use the static manifest at /static/backgrounds/generated/manifest.json or
    # call GET /api/backgrounds/list to retrieve available backgrounds.
    return jsonify({
        'success': False,
        'error': 'Background generation disabled. Use static backgrounds in /static/backgrounds',
        'variants': [],
        'count': 0,
        'theme': theme
    }), 410
