"""
ML DEPRECATED BLUEPRINT
Provides deprecation stubs for ML endpoints so they return 410 Gone while models are retained on disk.
Do NOT remove this file if you want clients to get a clear deprecation response instead of 404/500.
"""
from flask import Blueprint, jsonify
ml_deprecated_bp = Blueprint('ml_deprecated', __name__, url_prefix='/api')
DEPRECATION_MSG = {
    "success": False,
    "error": "This ML API endpoint has been deprecated and disabled. Models have been preserved. Contact the platform owner to re-enable or migrate.",
}
# AI endpoints
@ml_deprecated_bp.route('/ai/suggestions', methods=['GET'])
def ai_suggestions():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ai/analyze-queue', methods=['POST'])
def ai_analyze_queue():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ai/suggest-updates', methods=['POST'])
def ai_suggest_updates():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ai/analyze-ticket', methods=['POST'])
def ai_analyze_ticket():
    return (jsonify(DEPRECATION_MSG), 410)
# Comment suggestions (ML)
@ml_deprecated_bp.route('/ml/comments/suggestions', methods=['POST'])
def comments_suggest():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/comments/train', methods=['POST'])
def comments_train():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/comments/ml-stats', methods=['GET'])
def comments_stats():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/comments/export-training-data', methods=['POST'])
def comments_export():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/comments/cache/stats', methods=['GET'])
def comments_cache_stats():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/comments/cache/clear', methods=['POST'])
def comments_cache_clear():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/comments/record', methods=['POST'])
def comments_record():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/comments/save', methods=['POST'])
def comments_save():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/comments/stats', methods=['GET'])
def comments_db_stats():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/comments/health', methods=['GET'])
def comments_health():
    return (jsonify(DEPRECATION_MSG), 410)
# Flowing semantic / duplicates / contextual suggestions
@ml_deprecated_bp.route('/flowing/semantic-search', methods=['POST'])
def semantic_search():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/flowing/detect-duplicates', methods=['POST'])
def detect_duplicates():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/flowing/contextual-suggestions', methods=['POST'])
def contextual_suggestions():
    return (jsonify(DEPRECATION_MSG), 410)
# Flowing comments assistant (LLM)
@ml_deprecated_bp.route('/flowing/suggest-response', methods=['POST'])
def suggest_response():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/flowing/summarize-conversation', methods=['POST'])
def summarize_conversation():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/flowing/translate-comment', methods=['POST'])
def translate_comment():
    return (jsonify(DEPRECATION_MSG), 410)
# Copilot / Flowing MVP chat and docs
@ml_deprecated_bp.route('/copilot/chat', methods=['POST'])
def copilot_chat():
    return (jsonify({
        "success": False,
        "error": "Flowing MVP chat has been temporarily disabled while ML APIs are rebuilt."
    }), 410)
@ml_deprecated_bp.route('/copilot/docs/reload-jokes', methods=['POST'])
def reload_jokes():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/copilot/docs/reload-resources', methods=['POST'])
def reload_resources():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/copilot/suggest/comment', methods=['POST'])
def copilot_suggest_comment():
    return (jsonify(DEPRECATION_MSG), 410)
# Anomaly detection endpoints
@ml_deprecated_bp.route('/ml/anomalies/dashboard', methods=['GET'])
def anomalies_dashboard():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/anomalies/current', methods=['GET'])
def anomalies_current():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/anomalies/train', methods=['POST'])
def anomalies_train():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/anomalies/baseline', methods=['GET'])
def anomalies_baseline():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/anomalies/status', methods=['GET'])
def anomalies_status():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/anomalies/types', methods=['GET'])
def anomalies_types():
    return (jsonify(DEPRECATION_MSG), 410)
@ml_deprecated_bp.route('/ml/anomalies/health', methods=['GET'])
def anomalies_health():
    return (jsonify(DEPRECATION_MSG), 410)
