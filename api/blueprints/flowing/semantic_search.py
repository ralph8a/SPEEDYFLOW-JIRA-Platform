"""
Flowing MVP - Semantic Search
Búsqueda semántica de tickets similares y detección de duplicados
"""

from flask import Blueprint, request, jsonify
from utils.common import JiraApiError
from utils.api_migration import get_api_client
from api.blueprints.flowing.contextual_suggestions import get_contextual_suggestions
from utils.embedding_manager import get_embedding_manager
import logging

logger = logging.getLogger(__name__)

flowing_semantic_bp = Blueprint('flowing_semantic', __name__)

@flowing_semantic_bp.route('/api/flowing/contextual-suggestions', methods=['POST'])
def get_suggestions():
    """
    Obtener sugerencias contextuales basadas en el componente actual
    
    Request Body:
    {
        "context": "kanban_board|kanban_card|list_view|right_sidebar|comments_section|filter_bar",
        "issue_key": "PROJ-123",  # opcional
        "context_data": {...}      # opcional
    }
    
    Response:
    {
        "context": "kanban_board",
        "title": "📊 Sugerencias para Board View",
        "suggestions": [
            {
                "id": "similar_tickets_board",
                "icon": "🔍",
                "title": "Buscar tickets similares",
                "description": "...",
                "action": "semantic_search",
                "priority": 1
            }
        ],
        "count": 3
    }
    """
    try:
        data = request.get_json() or {}
        context = data.get('context', 'kanban_board')
        issue_key = data.get('issue_key')
        context_data = data.get('context_data', {})
        
        # Obtener sugerencias para el contexto
        suggestions = get_contextual_suggestions(
            context=context,
            issue_key=issue_key,
            **context_data
        )
        
        return jsonify(suggestions), 200
        
    except Exception as e:
        logger.error(f"Error getting contextual suggestions: {e}")
        return jsonify({
            'error': str(e),
            'context': data.get('context', 'unknown'),
            'title': '💡 Sugerencias',
            'suggestions': [],
            'count': 0
        }), 500

@flowing_semantic_bp.route('/api/flowing/semantic-search', methods=['POST'])
def semantic_search():
    """
    Buscar tickets similares usando búsqueda semántica con embeddings
    
    Request body:
    {
        "query": "texto a buscar",
        "issue_key": "MSM-123",  // opcional - buscar similares a este ticket
        "queue_id": "28",         // opcional
        "limit": 5,
        "min_similarity": 0.5
    }
    
    Response:
    {
        "success": true,
        "results": [
            {
                "key": "MSM-456",
                "summary": "...",
                "status": "...",
                "assignee": "...",
                "similarity": 0.85
            }
        ],
        "": true
    }
    """
    try:
        data = request.get_json() or {}
        query = data.get('query', '')
        issue_key = data.get('issue_key')
        limit = data.get('limit', 5)
        min_similarity = data.get('min_similarity', 0.5)
        
                embedding_mgr = get_embedding_manager()
        
                if not ollama.is_available():
            logger.warning("Ollama not available, falling back to JQL search")
            # Fallback a búsqueda JQL básica
            return _fallback_jql_search(query, issue_key, limit)
        
        # Si no hay query pero sí issue_key, usar el summary del issue
        if not query and issue_key:
            issue_data = embedding_mgr.find_issue_in_cache(issue_key)
            if issue_data:
                query = embedding_mgr.get_issue_text(issue_data)
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'query or issue_key is required'
            }), 400
        
        # Buscar similares usando embeddings
        similar_issues = embedding_mgr.find_similar_issues(
            query_text=query,
            top_k=limit,
            min_similarity=min_similarity
        )
        
        # Enriquecer con datos de JIRA
        client = get_api_client()
        results = []
        
        for similar in similar_issues:
            issue_key_found = similar['issue_key']
            try:
                # Buscar datos actualizados del issue
                issue_data = embedding_mgr.find_issue_in_cache(issue_key_found)
                if issue_data:
                    fields = issue_data.get('fields', {})
                    status_obj = fields.get('status', {})
                    assignee_obj = fields.get('assignee')
                    
                    results.append({
                        'key': issue_key_found,
                        'summary': fields.get('summary', similar['text_preview']),
                        'status': status_obj.get('name', 'Unknown') if isinstance(status_obj, dict) else str(status_obj),
                        'assignee': assignee_obj.get('displayName', 'Unassigned') if isinstance(assignee_obj, dict) and assignee_obj else 'Unassigned',
                        'similarity': round(similar['similarity'], 3)
                    })
            except Exception as e:
                logger.error(f"Error enriching {issue_key_found}: {e}")
                # Incluir con datos mínimos
                results.append({
                    'key': issue_key_found,
                    'summary': similar['text_preview'],
                    'status': 'Unknown',
                    'assignee': 'Unknown',
                    'similarity': round(similar['similarity'], 3)
                })
        
        return jsonify({
            'success': True,
            'results': results,
            'count': len(results),
            '': True,
            'query': query[:100]  # Preview
        })
        
    except Exception as e:
        logger.error(f"Error in semantic search: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def _fallback_jql_search(query: str, issue_key: str, limit: int):
    """Fallback JQL search cuando Ollama no está disponible"""
    try:
        client = get_api_client()
        
        if issue_key:
            # Obtener el issue y buscar por palabras del summary
            issue = client.get_issue(issue_key)
            query = issue['fields'].get('summary', '')
        
        if not query:
            return jsonify({'success': False, 'error': 'No query available'}), 400
        
        # Extraer palabras clave
        keywords = ' '.join(query.split()[:3])  # Primeras 3 palabras
        jql = f'summary ~ "{keywords}" OR description ~ "{keywords}" ORDER BY created DESC'
        
        results = client.search_issues(jql, max_results=limit)
        
        similar_tickets = []
        for issue in results.get('issues', []):
            similar_tickets.append({
                'key': issue['key'],
                'summary': issue['fields'].get('summary', ''),
                'status': issue['fields']['status']['name'],
                'assignee': issue['fields'].get('assignee', {}).get('displayName', 'Unassigned') if issue['fields'].get('assignee') else 'Unassigned',
                'similarity': 0.70  # Placeholder para fallback
            })
        
        return jsonify({
            'success': True,
            'results': similar_tickets,
            'count': len(similar_tickets),
            '': False,
            'fallback': 'JQL search (Ollama not available)'
        })
        
    except Exception as e:
        logger.error(f"Error in fallback search: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@flowing_semantic_bp.route('/api/flowing/detect-duplicates', methods=['POST'])
def detect_duplicates():
    """
    Detectar tickets duplicados usando embeddings semánticos
    
    Request body:
    {
        "issue_key": "MSM-123",
        "min_similarity": 0.75,  // umbral para considerar duplicado
        "limit": 10
    }
    
    Response:
    {
        "success": true,
        "original_issue": "MSM-123",
        "duplicates": [...],
        "": true
    }
    """
    try:
        data = request.get_json() or {}
        issue_key = data.get('issue_key')
        min_similarity = data.get('min_similarity', 0.75)  # Mayor umbral para duplicados
        limit = data.get('limit', 10)
        
        if not issue_key:
            return jsonify({
                'success': False,
                'error': 'issue_key is required'
            }), 400
        
                embedding_mgr = get_embedding_manager()
        
        # Obtener datos del issue original
        issue_data = embedding_mgr.find_issue_in_cache(issue_key)
        if not issue_data:
            return jsonify({
                'success': False,
                'error': f'Issue {issue_key} not found in cache'
            }), 404
        
        query_text = embedding_mgr.get_issue_text(issue_data)
        
                if not ollama.is_available():
            logger.warning("Ollama not available for duplicate detection")
            return _fallback_duplicate_detection(issue_key, query_text, limit)
        
        # Buscar similares (excluyendo el original)
        similar_issues = embedding_mgr.find_similar_issues(
            query_text=query_text,
            top_k=limit + 1,  # +1 porque incluirá el original
            min_similarity=min_similarity
        )
        
        # Filtrar el issue original
        duplicates = [s for s in similar_issues if s['issue_key'] != issue_key][:limit]
        
        # Enriquecer con datos
        results = []
        for dup in duplicates:
            dup_key = dup['issue_key']
            dup_data = embedding_mgr.find_issue_in_cache(dup_key)
            
            if dup_data:
                fields = dup_data.get('fields', {})
                status_obj = fields.get('status', {})
                
                results.append({
                    'key': dup_key,
                    'summary': fields.get('summary', dup['text_preview']),
                    'status': status_obj.get('name', 'Unknown') if isinstance(status_obj, dict) else str(status_obj),
                    'similarity': round(dup['similarity'], 3),
                    'is_likely_duplicate': dup['similarity'] >= 0.85  # Alta confianza
                })
        
        return jsonify({
            'success': True,
            'original_issue': issue_key,
            'duplicates': results,
            'count': len(results),
            '': True,
            'threshold': min_similarity
        })
        
    except Exception as e:
        logger.error(f"Error detecting duplicates: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def _fallback_duplicate_detection(issue_key: str, query_text: str, limit: int):
    """Fallback para detección de duplicados sin Ollama"""
    try:
        client = get_api_client()
        
        # Extraer palabras clave del summary
        keywords = ' '.join(query_text.split()[:5])
        project_key = issue_key.split('-')[0]
        
        jql = f'project = {project_key} AND key != {issue_key} AND (summary ~ "{keywords}" OR description ~ "{keywords}")'
        
        results = client.search_issues(jql, max_results=limit)
        
        duplicates = []
        for issue in results.get('issues', []):
            duplicates.append({
                'key': issue['key'],
                'summary': issue['fields'].get('summary', ''),
                'status': issue['fields']['status']['name'],
                'similarity': 0.65,  # Placeholder conservador
                'is_likely_duplicate': False
            })
        
        return jsonify({
            'success': True,
            'original_issue': issue_key,
            'duplicates': duplicates,
            'count': len(duplicates),
            '': False,
            'fallback': 'JQL search (Ollama not available)'
        })
        
    except Exception as e:
        logger.error(f"Error in fallback duplicate detection: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
