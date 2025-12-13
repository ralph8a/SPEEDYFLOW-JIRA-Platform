"""
FLOWING SEMANTIC SEARCH
Provides semantic search, duplicate detection, and contextual suggestions
Uses Ollama embeddings for intelligent issue matching
"""

from flask import Blueprint, request, jsonify
from utils.embedding_manager import get_embedding_manager, search_similar_issues
# from utils.ollama_client import get_ollama_client  # TODO: Restore when Ollama service is available
import logging

logger = logging.getLogger(__name__)

flowing_semantic_bp = Blueprint('flowing_semantic', __name__, url_prefix='/api/flowing')


@flowing_semantic_bp.route('/semantic-search', methods=['POST'])
def semantic_search():
    """
    Semantic search for similar issues
    
    Request:
        {
            "query": "Search query text",
            "top_k": 5,
            "min_similarity": 0.5
        }
    
    Response:
        {
            "results": [
                {
                    "issue_key": "MSM-123",
                    "similarity": 0.85,
                    "text_preview": "..."
                }
            ],
            "query": "original query"
        }
    """
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        top_k = data.get('top_k', 5)
        min_similarity = data.get('min_similarity', 0.5)
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        manager = get_embedding_manager()
        results = manager.find_similar_issues(
            query_text=query,
            top_k=top_k,
            min_similarity=min_similarity
        )
        
        return jsonify({
            'results': results,
            'query': query,
            'count': len(results)
        })
        
    except Exception as e:
        logger.error(f"Error in semantic_search: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@flowing_semantic_bp.route('/detect-duplicates', methods=['POST'])
def detect_duplicates():
    """
    Detect potential duplicate issues
    
    Request:
        {
            "issueKey": "MSM-123",
            "summary": "Issue summary",
            "description": "Issue description",
            "threshold": 0.75
        }
    
    Response:
        {
            "duplicates": [
                {
                    "issue_key": "MSM-456",
                    "similarity": 0.85,
                    "text_preview": "..."
                }
            ],
            "is_potential_duplicate": true,
            "confidence": 0.85
        }
    """
    try:
        data = request.get_json()
        issue_key = data.get('issueKey')
        summary = data.get('summary', '')
        description = data.get('description', '')
        threshold = data.get('threshold', 0.75)
        
        if not summary:
            return jsonify({'error': 'Summary is required'}), 400
        
        # Combine summary and description for search
        search_text = f"{summary} {description[:500]}"
        
        manager = get_embedding_manager()
        results = manager.find_similar_issues(
            query_text=search_text,
            top_k=10,
            min_similarity=threshold
        )
        
        # Filter out the current issue if provided
        if issue_key:
            results = [r for r in results if r['issue_key'] != issue_key]
        
        is_duplicate = len(results) > 0 and results[0]['similarity'] >= threshold
        confidence = results[0]['similarity'] if results else 0.0
        
        return jsonify({
            'duplicates': results[:5],  # Top 5 potential duplicates
            'is_potential_duplicate': is_duplicate,
            'confidence': confidence,
            'threshold': threshold
        })
        
    except Exception as e:
        logger.error(f"Error in detect_duplicates: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@flowing_semantic_bp.route('/contextual-suggestions', methods=['POST'])
def contextual_suggestions():
    """
    Get contextual suggestions based on current issue
    
    Request:
        {
            "issueKey": "MSM-123",
            "context": {
                "summary": "...",
                "description": "...",
                "status": "...",
                "type": "..."
            }
        }
    
    Response:
        {
            "suggestions": [
                {
                    "type": "similar_issue",
                    "title": "Similar resolved issue found",
                    "issue_key": "MSM-456",
                    "similarity": 0.85,
                    "action": "Review resolution"
                },
                {
                    "type": "field_update",
                    "title": "Suggested priority change",
                    "field": "priority",
                    "current": "Low",
                    "suggested": "High",
                    "reason": "Similar critical issues detected"
                }
            ]
        }
    """
    try:
        data = request.get_json()
        issue_key = data.get('issueKey')
        context = data.get('context', {})
        
        if not issue_key:
            return jsonify({'error': 'issueKey is required'}), 400
        
        summary = context.get('summary', '')
        description = context.get('description', '')
        
        if not summary:
            return jsonify({'error': 'Context summary is required'}), 400
        
        suggestions = []
        
        # Find similar issues
        search_text = f"{summary} {description[:500]}"
        manager = get_embedding_manager()
        similar_issues = manager.find_similar_issues(
            query_text=search_text,
            top_k=3,
            min_similarity=0.6
        )
        
        # Add similar issue suggestions
        for similar in similar_issues:
            if similar['issue_key'] != issue_key:
                suggestions.append({
                    'type': 'similar_issue',
                    'title': f'Similar issue found: {similar["issue_key"]}',
                    'issue_key': similar['issue_key'],
                    'similarity': similar['similarity'],
                    'action': 'Review for patterns or solutions',
                    'preview': similar.get('text_preview', '')[:100]
                })
        
        # Could add more suggestion types here:
        # - Field update suggestions
        # - Priority suggestions
        # - Assignment suggestions
        # etc.
        
        return jsonify({
            'suggestions': suggestions,
            'issue_key': issue_key,
            'count': len(suggestions)
        })
        
    except Exception as e:
        logger.error(f"Error in contextual_suggestions: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
