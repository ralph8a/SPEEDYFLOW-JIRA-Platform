"""AI blueprint: provides stub AI suggestions endpoint.

Endpoint:
  GET /api/ai/suggestions?text=...&limit=5

Returns deterministic placeholder suggestions until real model integration
is restored. Designed to be fast and safe.
"""
from flask import Blueprint, request
import logging
from datetime import datetime, UTC
from utils.decorators import handle_api_error, json_response, log_request as log_decorator, require_credentials, rate_limited

logger = logging.getLogger(__name__)

ai_bp = Blueprint('ai', __name__)

_BASE_SUGGESTIONS = [
    "Clarify customer impact in description.",
    "Add reproduction steps for faster triage.",
    "Link related JIRA issues to improve context.",
    "Attach a screenshot of the error.",
    "Specify environment (prod/staging/local).",
    "Add acceptance criteria for completion.",
]

@ai_bp.route('/api/ai/suggestions', methods=['GET'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=3, period=10)  # allow 3 calls per 10s window (test-friendly)
@require_credentials
def api_ai_suggestions():
    text = (request.args.get('text') or '').strip()
    limit = int(request.args.get('limit') or 5)
    limit = max(1, min(limit, 10))  # constrain
    base = _BASE_SUGGESTIONS[:]
    if text:
        lowered = text.lower()[:60]
        base.insert(0, f"Summarize core problem: {lowered[:40]}…")
    suggestions = base[:limit]
    return {
        'generated_at': datetime.now(UTC).isoformat(),
        'count': len(suggestions),
        'input_length': len(text),
        'suggestions': suggestions,
        'model': 'stub-v1',
        'cached': False
    }
