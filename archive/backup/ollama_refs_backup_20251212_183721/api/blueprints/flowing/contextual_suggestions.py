"""
Flowing MVP - Context-Aware Suggestions
Sistema inteligente de sugerencias basado en el contexto del componente observado
"""
import logging
from typing import Dict, List
logger = logging.getLogger(__name__)
class FlowingContextualSuggestions:
    """
    Gestor de sugerencias contextuales para Flowing MVP
    Provee sugerencias específicas según el componente que el usuario está viendo
    """
    # Definir sugerencias por contexto
    SUGGESTIONS_BY_CONTEXT = {
        'kanban_board': {
            'title': '📊 Sugerencias para Board View',
            'suggestions': [
                {
                    'id': 'similar_tickets_board',
                    'icon': '🔍',
                    'title': 'Buscar tickets similares',
                    'description': 'Encontrar tickets relacionados en esta columna',
                    'action': 'semantic_search',
                    'priority': 1
                },
                {
                    'id': 'detect_duplicates_board',
                    'icon': '📋',
                    'title': 'Detectar duplicados',
                    'description': 'Identificar tickets duplicados en el board',
                    'action': 'detect_duplicates',
                    'priority': 2
                },
                {
                    'id': 'optimize_columns',
                    'icon': '⚡',
                    'title': 'Optimizar columnas',
                    'description': 'Sugerencias para redistribuir tickets',
                    'action': 'queue_analysis',
                    'priority': 3
                }
            ]
        },
        'kanban_card': {
            'title': '🎴 Sugerencias para Tarjeta',
            'suggestions': [
                {
                    'id': 'similar_tickets_card',
                    'icon': '🔍',
                    'title': 'Ver tickets similares',
                    'description': 'Buscar casos parecidos a este ticket',
                    'action': 'semantic_search',
                    'priority': 1
                },
                {
                    'id': 'suggest_response',
                    'icon': '💬',
                    'title': 'Sugerir respuesta',
                    'description': 'Generar respuesta automática para el cliente',
                    'action': 'suggest_response',
                    'priority': 2
                },
                {
                    'id': 'detect_duplicate_card',
                    'icon': '📋',
                    'title': '¿Es duplicado?',
                    'description': 'Verificar si existe un ticket similar',
                    'action': 'detect_duplicates',
                    'priority': 3
                }
            ]
        },
        'list_view': {
            'title': '📝 Sugerencias para List View',
            'suggestions': [
                {
                    'id': 'bulk_similar_search',
                    'icon': '🔍',
                    'title': 'Búsqueda en lote',
                    'description': 'Encontrar patrones en tickets visibles',
                    'action': 'semantic_search',
                    'priority': 1
                },
                {
                    'id': 'bulk_duplicates',
                    'icon': '📋',
                    'title': 'Duplicados masivos',
                    'description': 'Detectar duplicados en la lista completa',
                    'action': 'detect_duplicates',
                    'priority': 2
                },
                {
                    'id': 'list_insights',
                    'icon': '📊',
                    'title': 'Análisis de lista',
                    'description': 'Insights sobre los tickets actuales',
                    'action': 'queue_analysis',
                    'priority': 3
                }
            ]
        },
        'right_sidebar': {
            'title': '📄 Sugerencias para Ticket Abierto',
            'suggestions': [
                {
                    'id': 'summarize_conversation',
                    'icon': '📝',
                    'title': 'Resumir conversación',
                    'description': 'Generar resumen de todos los comentarios',
                    'action': 'summarize_conversation',
                    'priority': 1
                },
                {
                    'id': 'suggest_detailed_response',
                    'icon': '💬',
                    'title': 'Sugerir respuesta',
                    'description': 'Generar respuesta basada en el contexto',
                    'action': 'suggest_response',
                    'priority': 2
                },
                {
                    'id': 'translate_comments',
                    'icon': '🌐',
                    'title': 'Traducir comentarios',
                    'description': 'Traducir conversación a otro idioma',
                    'action': 'translate_comment',
                    'priority': 3
                },
                {
                    'id': 'find_similar_solutions',
                    'icon': '🔍',
                    'title': 'Soluciones similares',
                    'description': 'Buscar tickets con problemas parecidos',
                    'action': 'semantic_search',
                    'priority': 4
                }
            ]
        },
        'comments_section': {
            'title': '💬 Sugerencias para Comentarios',
            'suggestions': [
                {
                    'id': 'quick_response',
                    'icon': '⚡',
                    'title': 'Respuesta rápida',
                    'description': 'Generar respuesta basada en el último comentario',
                    'action': 'suggest_response',
                    'priority': 1
                },
                {
                    'id': 'translate_last_comment',
                    'icon': '🌐',
                    'title': 'Traducir comentario',
                    'description': 'Traducir el último comentario',
                    'action': 'translate_comment',
                    'priority': 2
                },
                {
                    'id': 'summarize_thread',
                    'icon': '📝',
                    'title': 'Resumir hilo',
                    'description': 'Resumen de la conversación actual',
                    'action': 'summarize_conversation',
                    'priority': 3
                }
            ]
        },
        'filter_bar': {
            'title': '🎯 Sugerencias para Filtros',
            'suggestions': [
                {
                    'id': 'queue_patterns',
                    'icon': '📊',
                    'title': 'Patrones de cola',
                    'description': 'Analizar patrones en la cola actual',
                    'action': 'queue_analysis',
                    'priority': 1
                },
                {
                    'id': 'optimize_queue',
                    'icon': '⚡',
                    'title': 'Optimizar cola',
                    'description': 'Sugerencias para mejorar la distribución',
                    'action': 'queue_analysis',
                    'priority': 2
                },
                {
                    'id': 'search_across_queues',
                    'icon': '🔍',
                    'title': 'Buscar en todas las colas',
                    'description': 'Búsqueda semántica global',
                    'action': 'semantic_search',
                    'priority': 3
                }
            ]
        }
    }
    @classmethod
    def get_suggestions_for_context(cls, context: str, issue_key: str = None, additional_data: Dict = None) -> Dict:
        """
        Obtener sugerencias para un contexto específico
        Args:
            context: El contexto actual (kanban_board, kanban_card, list_view, etc.)
            issue_key: Clave del ticket (opcional, usado para contextos de tarjeta)
            additional_data: Datos adicionales del contexto (opcional)
        Returns:
            Dict con título y lista de sugerencias
        """
        suggestions_config = cls.SUGGESTIONS_BY_CONTEXT.get(context, {
            'title': '💡 Sugerencias',
            'suggestions': []
        })
        # Enriquecer sugerencias con datos contextuales
        enriched_suggestions = []
        for suggestion in suggestions_config['suggestions']:
            enriched = suggestion.copy()
            # Agregar issue_key si está disponible
            if issue_key:
                enriched['issue_key'] = issue_key
            # Agregar datos adicionales
            if additional_data:
                enriched['context_data'] = additional_data
            enriched_suggestions.append(enriched)
        return {
            'context': context,
            'title': suggestions_config['title'],
            'suggestions': enriched_suggestions,
            'count': len(enriched_suggestions)
        }
    @classmethod
    def get_all_contexts(cls) -> List[str]:
        """Obtener lista de todos los contextos disponibles"""
        return list(cls.SUGGESTIONS_BY_CONTEXT.keys())
    @classmethod
    def get_action_endpoint(cls, action: str) -> str:
        """Mapear acción a endpoint de API"""
        action_to_endpoint = {
            'semantic_search': '/api/flowing/semantic-search',
            'detect_duplicates': '/api/flowing/detect-duplicates',
            'suggest_response': '/api/flowing/suggest-response',
            'summarize_conversation': '/api/flowing/summarize-conversation',
            'translate_comment': '/api/flowing/translate-comment',
            'queue_analysis': '/api/ml/analyze-queue'  # ML Analyzer existente
        }
        return action_to_endpoint.get(action, '/api/flowing/semantic-search')
def get_contextual_suggestions(context: str, issue_key: str = None, **kwargs) -> Dict:
    """
    Función helper para obtener sugerencias contextuales
    Usage:
        # En board view
        suggestions = get_contextual_suggestions('kanban_board')
        # En tarjeta específica
        suggestions = get_contextual_suggestions('kanban_card', issue_key='PROJ-123')
        # En sidebar con datos adicionales
        suggestions = get_contextual_suggestions(
            'right_sidebar',
            issue_key='PROJ-123',
            comment_count=5,
            status='In Progress'
        )
    """
    return FlowingContextualSuggestions.get_suggestions_for_context(
        context,
        issue_key,
        kwargs if kwargs else None
    )
