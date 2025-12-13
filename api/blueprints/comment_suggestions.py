# -*- coding: utf-8 -*-
"""
API Blueprint for Comment Suggestions
Provides endpoints for getting ML-powered comment suggestions
"""

from flask import Blueprint, jsonify, request
import logging
from api.ml_comment_suggestions import (
    get_suggestion_engine,
    train_suggestion_engine,
    get_comment_suggestions
)

logger = logging.getLogger(__name__)

comment_suggestions_bp = Blueprint('comment_suggestions', __name__, url_prefix='/api/ml/comments')

@comment_suggestions_bp.route('/warmup', methods=['GET'])

@comment_suggestions_bp.route('/suggestions', methods=['POST'])
def get_suggestions():
    """
    Get AI-powered comment suggestions for a ticket.
    Uses context hash caching with 5-minute TTL.
    
    Request body:
    {
        "summary": "Ticket title",
        "description": "Ticket description",
        "issue_type": "Bug",  // optional
        "status": "Open",  // optional
        "priority": "High",  // optional
        "all_comments": [],  // optional, list of existing comments
        "max_suggestions": 5  // optional
    }
    
    Response includes:
    - cached: true if suggestions came from cache (within 5 min TTL)
    - cache_hash: first 8 chars of context hash for debugging
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        summary = data.get('summary', '')
        description = data.get('description', '')
        issue_type = data.get('issue_type', 'Unknown')
        status = data.get('status', 'Open')
        priority = data.get('priority', 'Medium')
        all_comments = data.get('all_comments', data.get('recent_comments', []))  # Support both
        max_suggestions = data.get('max_suggestions', 5)
        
        if not summary and not description:
            return jsonify({"error": "At least summary or description required"}), 400
        
        # Get AI suggestions with ALL comments context for full analysis
        engine = get_suggestion_engine()
        
        # Generate context hash to check if cached
        import hashlib
        context_str = f"{summary}|{description}|{'|'.join(all_comments or [])}"
        context_hash = hashlib.md5(context_str.encode('utf-8')).hexdigest()
        was_cached = context_hash in engine.suggestions_cache
        
        suggestions = engine.get_suggestions(
            ticket_summary=summary,
            ticket_description=description,
            issue_type=issue_type,
            status=status,
            priority=priority,
            all_comments=all_comments,
            max_suggestions=max_suggestions
        )
        
        return jsonify({
            "success": True,
            "suggestions": suggestions,
            "count": len(suggestions),
            "cached": was_cached,
            "cache_hash": context_hash[:8]  # First 8 chars for debugging
        })
        
    except Exception as e:
        logger.error(f"Error getting suggestions: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@comment_suggestions_bp.route('/train', methods=['POST'])
def train_engine():
    """
    Train the suggestion engine on historical data.
    This analyzes past comments to find patterns.
    """
    try:
        logger.info("Starting comment suggestion engine training...")
        stats = train_suggestion_engine()
        
        if not stats.get('trained'):
            return jsonify({
                "success": False,
                "error": stats.get('error', 'Training failed')
            }), 500
        
        return jsonify({
            "success": True,
            "message": "Training completed successfully",
            "stats": stats
        })
        
    except Exception as e:
        logger.error(f"Error training engine: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@comment_suggestions_bp.route('/ml-stats', methods=['GET'])
def get_ml_stats():
    """
    Get ML training database statistics.
    Shows how much data has been collected for future model training.
    Also includes suggestion cache statistics.
    """
    try:
        from api.ml_training_db import get_ml_training_db
        
        ml_db = get_ml_training_db()
        stats = ml_db.get_stats()
        
        # Also include suggestion cache stats
        engine = get_suggestion_engine()
        cache_stats = engine.get_cache_stats()
        
        return jsonify({
            "success": True,
            "ml_training_stats": stats,
            "suggestion_cache_stats": cache_stats
        })
        
    except Exception as e:
        logger.error(f"Error getting ML stats: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@comment_suggestions_bp.route('/export-training-data', methods=['POST'])
def export_training_data():
    """
    Export collected data in ML training format.
    Creates a dataset file ready for model training.
    """
    try:
        from api.ml_training_db import get_ml_training_db
        
        ml_db = get_ml_training_db()
        output_path = ml_db.export_for_training()
        
        return jsonify({
            "success": True,
            "message": "Training data exported successfully",
            "path": output_path,
            "samples": ml_db.get_stats()['total_samples']
        })
        
    except Exception as e:
        logger.error(f"Error exporting training data: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@comment_suggestions_bp.route('/cache/stats', methods=['GET'])
def get_cache_stats():
    """
    Get suggestion cache statistics.
    Shows cache size, valid/expired entries, and TTL.
    """
    try:
        engine = get_suggestion_engine()
        stats = engine.get_cache_stats()
        
        return jsonify({
            "success": True,
            "cache_stats": stats
        })
        
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@comment_suggestions_bp.route('/cache/clear', methods=['POST'])
def clear_suggestion_cache():
    """
    Clear all cached suggestions.
    Useful for testing or forcing fresh AI generation.
    """
    try:
        engine = get_suggestion_engine()
        cleared_count = engine.clear_cache()
        
        return jsonify({
            "success": True,
            "message": f"Cleared {cleared_count} cached entries",
            "cleared_count": cleared_count
        })
        
    except Exception as e:
        logger.error(f"Error clearing cache: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@comment_suggestions_bp.route('/record', methods=['POST'])
def get_status():
    """Get the current status of the suggestion engine"""
    try:
        engine = get_suggestion_engine()
        
        is_trained = bool(engine.pattern_phrases or engine.resolution_patterns)
        
        return jsonify({
            "success": True,
            "trained": is_trained,
            "action_patterns": len(engine.pattern_phrases),
            "resolution_patterns": sum(len(v) for v in engine.resolution_patterns.values()),
            "issue_types": list(engine.resolution_patterns.keys())
        })
        
    except Exception as e:
        logger.error(f"Error getting status: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@comment_suggestions_bp.route('/save', methods=['POST'])
def save_suggestion():
    """
    Save a used/copied suggestion to the database.
    
    Request body:
    {
        "ticket_key": "PROJ-123",
        "text": "Suggestion text",
        "type": "resolution",
        "action": "used"  // or "copied"
    }
    """
    try:
        from api.suggestions_db import get_suggestions_db
        
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        ticket_key = data.get('ticket_key')
        text = data.get('text')
        suggestion_type = data.get('type', 'unknown')
        action = data.get('action', 'used')
        
        if not ticket_key or not text:
            return jsonify({"error": "ticket_key and text are required"}), 400
        
        # Save to database
        db = get_suggestions_db()
        result = db.add_suggestion(ticket_key, text, suggestion_type, action)
        
        return jsonify({
            "success": True,
            "message": f"Suggestion {action} saved successfully",
            "data": result
        })
        
    except Exception as e:
        logger.error(f"Error saving suggestion: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@comment_suggestions_bp.route('/stats', methods=['GET'])
def get_suggestion_stats():
    """Get database statistics including compression status"""
    try:
        from api.suggestions_db import get_suggestions_db
        
        db = get_suggestions_db()
        stats = db.get_stats()
        
        return jsonify({
            "success": True,
            "stats": stats
        })
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@comment_suggestions_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "comment_suggestions"
    })
