"""AI Suggestions Blueprint: Analiza tickets y sugiere actualizaciones de campos.

Endpoint:
  POST /api/ai/suggest-updates
  
Funcionalidad similar a Atlassian Intelligence:
- Analiza el contenido del ticket (summary, description, comments)
- Sugiere valores para campos vacíos o incorrectos
- Retorna una lista de cambios propuestos para revisión del usuario
"""
from flask import Blueprint, request
from typing import Any, Dict, List
import logging
import json
from utils.decorators import (
    handle_api_error,
    json_response,
    log_request as log_decorator,
    require_credentials,
    rate_limited
)

try:
    from core.api import get_api_client
    from utils.common import _make_request
except ImportError:
    def get_api_client(*_a, **_k):
        return None

logger = logging.getLogger(__name__)

ai_suggestions_bp = Blueprint('ai_suggestions', __name__)


@ai_suggestions_bp.route('/api/ai/analyze-queue', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=5, period=60)
@require_credentials
def api_analyze_queue():
    """
    Analiza tickets de la cola seleccionada usando patrones del caché global.
    
    Usa el caché completo para aprender patrones, pero solo sugiere mejoras
    para los tickets de la cola actual.
    
    🚀 CACHING: Results cached in DB with 1-3h TTL (adaptive based on queue size)
    
    Request Body:
        {
            "desk_id": "1",  # Required
            "queue_id": "46"  # Required
        }
    
    Response:
        {
            "analyzed_count": 33,
            "issues_with_suggestions": 24,
            "suggestions": [...],
            "cache_size": 1234,  # Total tickets en caché para contexto
            "cached": true,  # Whether this response came from cache
            "generated_at": "2025-01-15T10:30:00"
        }
    """
    data = request.get_json() or {}
    desk_id = data.get('desk_id')
    queue_id = data.get('queue_id', 'all')
    
    if not desk_id:
        return {'error': 'desk_id is required'}, 400
    
    # 🔍 LEVEL 3: Check backend DB cache (before expensive ML analysis)
    from utils.db import get_db
    from datetime import datetime, timedelta
    
    try:
        conn = get_db()
        cached = conn.execute("""
            SELECT data, generated_at 
            FROM ml_analysis_cache 
            WHERE service_desk_id = ? AND queue_id = ? AND expires_at > ?
        """, (desk_id, queue_id, datetime.now().isoformat())).fetchone()
        
        if cached:
            cached_data = json.loads(cached[0])
            generated_at = cached[1]
            logger.info(f"✅ Using cached ML analysis from {generated_at} (desk={desk_id}, queue={queue_id})")
            return {
                **cached_data,
                'cached': True,
                'generated_at': generated_at
            }
    except Exception as e:
        logger.warning(f"⚠️ Failed to check ML analysis cache: {e}")
    
    # 💡 Cache miss - perform expensive ML analysis
    logger.info(f"🔬 Performing fresh ML analysis (desk={desk_id}, queue={queue_id})")
    
    try:
        # PASO 1: Cargar caché global para patrones (contexto de aprendizaje)
        from utils.issue_cache import get_cache_manager
        cache = get_cache_manager()
        cache_data = cache._load_json(cache.issues_file, {})
        cached_issues = cache_data.get('issues', [])
        cache_size = len(cached_issues)
        
        logger.info(f"Using global cache with {cache_size} tickets for pattern learning")
        
        # PASO 2: Obtener issues de la COLA ACTUAL para analizar
        from core.api import load_queue_issues
        df, error = load_queue_issues(desk_id, queue_id)
        
        if error or df is None or getattr(df, 'empty', True):
            return {
                'analyzed_count': 0,
                'issues_with_suggestions': 0,
                'suggestions': [],
                'cache_size': cache_size,
                'message': 'No issues found in current queue'
            }
        
        queue_issues = df.to_dict('records')
        client = get_api_client()
        results = []
        analyzed_count = 0
        
        # PASO 3: Analizar cada issue de la COLA ACTUAL
        # (pero las sugerencias usan patrones del caché global)
        # OPTIMIZACIÓN: Limitar a primeros 50 tickets para velocidad
        max_to_analyze = 50
        queue_issues = queue_issues[:max_to_analyze]
        logger.info(f"Starting analysis of {len(queue_issues)} queue issues (limit: {max_to_analyze})")
        
        for issue_data in queue_issues:
            try:
                issue_key = issue_data.get('key') or issue_data.get('issue_key')
                if not issue_key:
                    continue
                
                analyzed_count += 1
                
                # OPTIMIZACIÓN: Obtener issue + comentarios en 1 request usando expand
                issue_url = f"{client.site}/rest/api/2/issue/{issue_key}"
                full_issue = _make_request(
                    "GET", 
                    issue_url, 
                    client.headers,
                    params={
                        'expand': 'renderedFields',
                        'fields': 'summary,description,status,priority,comment,customfield_10125,customfield_10156,customfield_10168,customfield_10169,customfield_10165'
                    }
                )
                
                if not full_issue:
                    continue
                
                fields = full_issue.get('fields', {})
                
                # Extraer comentarios desde el response (ya incluidos con expand)
                comments_text = ''
                try:
                    comment_data = fields.get('comment', {})
                    if comment_data and 'comments' in comment_data:
                        comments_list = comment_data['comments'][-10:]  # Últimos 10
                        comments_text = ' '.join([
                            c.get('body', '') if isinstance(c.get('body'), str) else ''
                            for c in comments_list
                            if c.get('body') and not c.get('author', {}).get('displayName', '').lower().startswith('jira')
                        ])
                except Exception:
                    comments_text = ''
                
                # Saltar tickets cerrados o cancelados
                status = fields.get('status', {})
                status_name = ''
                if isinstance(status, dict):
                    status_name = status.get('name', '').lower()
                else:
                    status_name = str(status).lower()
                
                # Estados que no deben recibir sugerencias
                closed_states = ['cerrado', 'closed', 'cancelado', 'cancelled', 'canceled', 'done', 'resuelto', 'resolved']
                if any(state in status_name for state in closed_states):
                    continue
                
                # Analizar y obtener sugerencias de custom fields importantes
                try:
                    suggestions = _analyze_and_suggest(
                        issue_key,
                        fields,
                        [
                            'customfield_10125',  # Criticidad
                            'customfield_10156',  # Tipo de Solicitud
                            'customfield_10168',  # Área
                            'customfield_10169',  # Plataforma
                            'customfield_10165',  # País
                            'priority'            # Priority (campo estándar)
                        ],
                        comments_text  # Pasar comentarios al análisis
                    )
                    
                    if isinstance(suggestions, list) and suggestions:
                        results.append({
                            'issue_key': issue_key,
                            'issue_summary': fields.get('summary', ''),
                            'suggestions': suggestions
                        })
                except Exception:
                    pass
                    
            except Exception:
                continue
        
        logger.info(f"Analyzed {analyzed_count} issues, found {len(results)} with suggestions")
        
        response_data = {
            'analyzed_count': analyzed_count,
            'issues_with_suggestions': len(results),
            'suggestions': results,
            'cache_size': cache_size,
            'desk_id': desk_id,
            'queue_id': queue_id,
            'cached': False,
            'generated_at': datetime.now().isoformat()
        }
        
        # 💾 Save to backend DB cache with adaptive TTL
        try:
            from core.api import load_queue_issues
            # Get queue size to determine TTL
            df_size, _ = load_queue_issues(desk_id, queue_id)
            queue_size = len(df_size) if df_size is not None and not getattr(df_size, 'empty', True) else 0
            
            # Adaptive TTL: 3h for large queues (≥50), 1h for small queues
            cache_hours = 3 if queue_size >= 50 else 1
            expires_at = datetime.now() + timedelta(hours=cache_hours)
            
            conn = get_db()
            conn.execute("""
                INSERT INTO ml_analysis_cache (service_desk_id, queue_id, data, generated_at, expires_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(service_desk_id, queue_id) DO UPDATE SET
                    data = excluded.data,
                    generated_at = excluded.generated_at,
                    expires_at = excluded.expires_at
            """, (
                desk_id, 
                queue_id, 
                json.dumps(response_data), 
                datetime.now().isoformat(), 
                expires_at.isoformat()
            ))
            conn.commit()
            
            logger.info(f"💾 Cached ML analysis in DB (TTL: {cache_hours}h, queue_size: {queue_size}, expires: {expires_at.isoformat()})")
        except Exception as e:
            logger.warning(f"⚠️ Failed to cache ML analysis: {e}")
        
        logger.info(f"Response structure: analyzed={analyzed_count}, suggestions_count={len(results)}, cache={cache_size}")
        
        return response_data
        
    except Exception as e:
        logger.error(f"Error analyzing queue: {e}")
        return {'error': str(e)}, 500


@ai_suggestions_bp.route('/api/ai/suggest-updates', methods=['POST'])
@handle_api_error
@json_response
@log_decorator(logging.INFO)
@rate_limited(max_calls=10, period=60)  # Limit AI calls
@require_credentials
def api_suggest_field_updates():
    """
    Analiza un ticket y sugiere actualizaciones de campos.
    
    Request Body:
        {
            "issue_key": "MSM-1234",
            "fields_to_analyze": ["severity", "priority", "assignee", "labels"]
        }
    
    Response:
        {
            "issue_key": "MSM-1234",
            "suggestions": [
                {
                    "field": "severity",
                    "field_label": "Criticidad",
                    "current_value": null,
                    "suggested_value": "High",
                    "confidence": 0.85,
                    "reason": "El ticket menciona 'servicio caído' y afecta producción"
                }
            ],
            "total_suggestions": 1
        }
    """
    data = request.get_json() or {}
    issue_key = data.get('issue_key')
    fields_to_analyze = data.get('fields_to_analyze', [
        'severity', 'priority', 'assignee', 'labels', 'components'
    ])
    
    if not issue_key:
        return {'error': 'issue_key is required'}, 400
    
    try:
        client = get_api_client()
        
        # Obtener datos completos del ticket
        issue_url = f"{client.site}/rest/api/2/issue/{issue_key}"
        issue_data = _make_request("GET", issue_url, client.headers, params={
            "expand": "names,changelog"
        })
        
        if not issue_data:
            return {'error': 'Issue not found', 'issue_key': issue_key}, 404
        
        fields = issue_data.get('fields', {})
        
        # Analizar y generar sugerencias
        suggestions = _analyze_and_suggest(issue_key, fields, fields_to_analyze)
        
        return {
            'issue_key': issue_key,
            'suggestions': suggestions,
            'total_suggestions': len(suggestions),
            'analyzed_fields': fields_to_analyze
        }
        
    except Exception as e:
        logger.error(f"Error generating suggestions for {issue_key}: {e}")
        return {'error': str(e), 'issue_key': issue_key}, 500


def _analyze_and_suggest(
    issue_key: str,
    fields: Dict[str, Any],
    fields_to_analyze: List[str],
    comments_text: str = ''
) -> List[Dict[str, Any]]:
    """
    Analiza los custom fields del ticket y genera sugerencias inteligentes.
    SOLO muestra sugerencias si hay algo que mejorar (no campos vacíos por defecto).
    
    Args:
        issue_key: Clave del ticket
        fields: Campos del ticket desde JIRA API
        fields_to_analyze: Lista de field IDs a analizar (ej: ['customfield_10125', 'priority'])
        comments_text: Texto de comentarios (opcional, peso 0.3x)
        
    Returns:
        Lista de sugerencias con valores propuestos (SOLO si hay mejoras reales)
    """
    suggestions = []
    
    summary = fields.get('summary', '').lower()
    description = fields.get('description', '') or ''
    if isinstance(description, dict):
        description = description.get('content', '')
    if isinstance(description, list):
        description = ' '.join(str(item) for item in description)
    description = str(description).lower()
    
    priority = fields.get('priority', {})
    priority_value = priority.get('name') if isinstance(priority, dict) else priority
    
    # CRITICIDAD (customfield_10125) - Solo sugerir si falta O si está claramente incorrecto
    if 'customfield_10125' in fields_to_analyze:
        current_severity = fields.get('customfield_10125')
        severity_value = None
        
        if isinstance(current_severity, dict):
            severity_value = current_severity.get('value')
        
        # Solo sugerir si:
        # 1. Falta el valor Y hay indicadores claros en el texto
        # 2. El valor actual parece incorrecto según el contenido
        if not severity_value or severity_value == 'null':
            suggested_severity, confidence, reason = _suggest_severity(
                summary, description, priority_value
            )
            
            # FILTRO: Solo sugerir si confianza >= 0.8 (indicadores claros)
            if suggested_severity and confidence >= 0.8:
                suggestions.append({
                    'field': 'customfield_10125',
                    'field_name': 'severity',
                    'field_label': 'Criticidad',
                    'current_value': severity_value,
                    'suggested_value': {"value": suggested_severity},
                    'confidence': confidence,
                    'reason': reason
                })
        elif severity_value:
            # Verificar si el severity actual es incorrecto
            suggested_severity, confidence, reason = _suggest_severity(
                summary, description, priority_value
            )
            
            # Solo sugerir cambio si hay alta confianza y es diferente
            if (suggested_severity and 
                confidence >= 0.85 and 
                suggested_severity != severity_value):
                suggestions.append({
                    'field': 'customfield_10125',
                    'field_name': 'severity',
                    'field_label': 'Criticidad',
                    'current_value': severity_value,
                    'suggested_value': {"value": suggested_severity},
                    'confidence': confidence,
                    'reason': f'{reason} (actual: {severity_value} parece incorrecto)'
                })
    
    # PRIORITY ANALYSIS - Solo si falta Y hay indicadores
    if 'priority' in fields_to_analyze and not priority_value:
        suggested_priority, confidence, reason = _suggest_priority(
            summary, description
        )
        
        # FILTRO: Solo sugerir si confianza >= 0.8
        if suggested_priority and confidence >= 0.8:
            suggestions.append({
                'field': 'priority',
                'field_name': 'priority',
                'field_label': 'Prioridad',
                'current_value': None,
                'suggested_value': {"name": suggested_priority},
                'confidence': confidence,
                'reason': reason
            })
    
    # TIPO DE SOLICITUD (customfield_10156) - Usar ML para sugerir desde caché
    if 'customfield_10156' in fields_to_analyze:
        current_tipo = fields.get('customfield_10156')
        tipo_value = current_tipo.get('value') if isinstance(current_tipo, dict) else current_tipo
        
        # Construir texto para análisis (incluye comentarios con menor peso)
        text = summary + ' ' + description
        if comments_text:
            # Comentarios tienen peso 0.5x para no dominar el análisis
            text = text + ' ' + comments_text.lower()[:500]
        
        # Intentar obtener sugerencia desde ML/cache (aprende de tickets históricos)
        try:
            from utils.issue_cache import get_cache_manager
            cache = get_cache_manager()
            
            # Buscar en patrones aprendidos del caché
            tipo_sugerido = None
            confidence = 0.0
            reason = ''
            
            # Intentar ML primero (semantic similarity)
            ml_result = None
            try:
                from utils.ml_suggester import get_ml_suggester
                ml_suggester = get_ml_suggester()
                ml_suggestion = ml_suggester.suggest_field(text, 'tipo_solicitud')
                if ml_suggestion:
                    value, confidence_score, reason_text, similar_tickets = ml_suggestion
                    ml_result = {
                        'value': value,
                        'confidence': confidence_score,
                        'reason': reason_text,
                        'similar_count': len(similar_tickets)
                    }
            except Exception as e:
                logger.warning(f"ML suggestion failed: {e}")
            
            if ml_result:
                tipo_sugerido = ml_result.get('value')
                confidence = ml_result.get('confidence', 0.0)
                reason = f'ML: {ml_result.get("similar_count", 0)} similares'
            
            # Fallback: patrones de frecuencia del caché
            if not tipo_sugerido or confidence < 0.60:
                pattern_result = cache.get_suggestion_from_patterns(text, 'tipo_solicitud')
                if pattern_result and pattern_result.get('confidence', 0) >= 0.60:
                    tipo_sugerido = pattern_result.get('value')
                    confidence = pattern_result.get('confidence', 0.0)
                    reason = 'Patrón aprendido'
            
            # Fallback final: Keywords basados en contenido (umbral más bajo pero útil)
            if not tipo_sugerido or confidence < 0.60:
                # Detectar tipo basado en palabras clave comunes
                if any(kw in text for kw in ['incidente', 'caída', 'down', 'error', 'falla', 'problema']):
                    tipo_sugerido = 'Soporte HUB'
                    confidence = 0.65
                    reason = 'Detectado como incidente/problema'
                elif any(kw in text for kw in ['solicitud', 'requerimiento', 'necesito', 'favor']):
                    tipo_sugerido = 'Requerimiento'
                    confidence = 0.60
                    reason = 'Detectado como solicitud/requerimiento'
                elif any(kw in text for kw in ['consulta', 'pregunta', 'duda', 'información']):
                    tipo_sugerido = 'Consulta'
                    confidence = 0.60
                    reason = 'Detectado como consulta'
            
            # CASO 1: Campo vacío - sugerir si hay confianza (umbral reducido a 0.60)
            if not tipo_value and tipo_sugerido and confidence >= 0.60:
                suggestions.append({
                    'field': 'customfield_10156',
                    'field_name': 'tipo_solicitud',
                    'field_label': 'Tipo de Solicitud',
                    'current_value': tipo_value,
                    'suggested_value': {"value": tipo_sugerido},
                    'confidence': confidence,
                    'reason': reason
                })
            
            # CASO 2: Campo lleno pero parece incorrecto (umbral alto para evitar cambios incorrectos)
            elif tipo_value and tipo_sugerido and tipo_sugerido != tipo_value and confidence >= 0.80:
                suggestions.append({
                    'field': 'customfield_10156',
                    'field_name': 'tipo_solicitud',
                    'field_label': 'Tipo de Solicitud',
                    'current_value': tipo_value,
                    'suggested_value': {"value": tipo_sugerido},
                    'confidence': confidence,
                    'reason': f'{reason}. Actual "{tipo_value}" podría ser incorrecto'
                })
                
        except Exception as e:
            logger.warning(f"Error suggesting tipo_solicitud: {e}")
    
    # ÁREA (customfield_10168) - Sugerir si falta
    if 'customfield_10168' in fields_to_analyze:
        current_area = fields.get('customfield_10168')
        area_value = current_area.get('value') if isinstance(current_area, dict) else current_area
        
        if not area_value:
            # Detectar área basada en palabras clave (mejorado con más patrones)
            area_sugerida = None
            confidence = 0.0
            text = summary + ' ' + description
            
            if any(word in text for word in ['aplicacion', 'app', 'software', 'código', 'sistema', 'plataforma', 'web']):
                area_sugerida = 'Aplicaciones'
                confidence = 0.70
                reason = 'Detectado como problema de aplicaciones/software'
            elif any(word in text for word in ['red', 'conexión', 'vpn', 'firewall', 'internet', 'wifi', 'network']):
                area_sugerida = 'Redes'
                confidence = 0.70
                reason = 'Detectado como problema de redes/conectividad'
            elif any(word in text for word in ['servidor', 'base de datos', 'storage', 'disco', 'memoria', 'cpu']):
                area_sugerida = 'Infraestructura'
                confidence = 0.70
                reason = 'Detectado como problema de infraestructura'
            elif any(word in text for word in ['usuario', 'cuenta', 'contraseña', 'acceso', 'permiso']):
                area_sugerida = 'Seguridad'
                confidence = 0.65
                reason = 'Detectado como problema de accesos/seguridad'
            
            if area_sugerida and confidence >= 0.60:
                suggestions.append({
                    'field': 'customfield_10168',
                    'field_name': 'area',
                    'field_label': 'Área',
                    'current_value': area_value,
                    'suggested_value': {"value": area_sugerida},
                    'confidence': confidence,
                    'reason': reason
                })
    
    # PLATAFORMA (customfield_10169) - Sugerir si falta y hay evidencia
    if 'customfield_10169' in fields_to_analyze:
        current_plat = fields.get('customfield_10169')
        plat_value = current_plat.get('value') if isinstance(current_plat, dict) else current_plat
        
        if not plat_value:
            plat_sugerida = None
            confidence = 0.0
            reason = ''
            text = summary + ' ' + description
            
            # Detectar menciones explícitas de plataforma (ampliado)
            if any(kw in text for kw in ['smt', 'streaming', 'stream']):
                plat_sugerida = 'SMT'
                confidence = 0.80
                reason = 'El ticket menciona SMT/Streaming'
            elif any(kw in text for kw in ['hub', 'soporte hub']):
                plat_sugerida = 'HUB'
                confidence = 0.75
                reason = 'El ticket menciona HUB'
            elif any(kw in text for kw in ['móvil', 'celular', 'app móvil', 'android', 'ios']):
                plat_sugerida = 'Móvil'
                confidence = 0.70
                reason = 'Detectado como problema de aplicación móvil'
            elif any(kw in text for kw in ['web', 'portal', 'sitio', 'navegador']):
                plat_sugerida = 'Web'
                confidence = 0.65
                reason = 'Detectado como problema de plataforma web'
            
            # Sugerir si hay confianza razonable
            if plat_sugerida and confidence >= 0.60:
                suggestions.append({
                    'field': 'customfield_10169',
                    'field_name': 'plataforma',
                    'field_label': 'Plataforma',
                    'current_value': plat_value,
                    'suggested_value': {"value": plat_sugerida},
                    'confidence': confidence,
                    'reason': reason
                })
    
    # PAÍS (customfield_10165) - Sugerir si falta y hay evidencia
    if 'customfield_10165' in fields_to_analyze:
        current_pais = fields.get('customfield_10165')
        pais_value = current_pais.get('value') if isinstance(current_pais, dict) else current_pais
        
        if not pais_value:
            pais_sugerido = None
            confidence = 0.0
            reason = ''
            text = summary + ' ' + description
            
            # Detectar menciones de países
            if any(kw in text for kw in ['ecuador', 'ec', 'quito', 'guayaquil']):
                pais_sugerido = 'Ecuador'
                confidence = 0.85
                reason = 'El ticket menciona Ecuador'
            elif any(kw in text for kw in ['méxico', 'mexico', 'mx', 'cdmx']):
                pais_sugerido = 'México'
                confidence = 0.85
                reason = 'El ticket menciona México'
            elif any(kw in text for kw in ['colombia', 'co', 'bogotá']):
                pais_sugerido = 'Colombia'
                confidence = 0.85
                reason = 'El ticket menciona Colombia'
            elif any(kw in text for kw in ['perú', 'peru', 'pe', 'lima']):
                pais_sugerido = 'Perú'
                confidence = 0.85
                reason = 'El ticket menciona Perú'
            elif any(kw in text for kw in ['chile', 'cl', 'santiago']):
                pais_sugerido = 'Chile'
                confidence = 0.85
                reason = 'El ticket menciona Chile'
            
            # Sugerir solo con alta confianza para país
            if pais_sugerido and confidence >= 0.80:
                suggestions.append({
                    'field': 'customfield_10165',
                    'field_name': 'pais',
                    'field_label': 'País',
                    'current_value': pais_value,
                    'suggested_value': {"value": pais_sugerido},
                    'confidence': confidence,
                    'reason': reason
                })
    
    return suggestions


def _suggest_severity(
    summary: str,
    description: str,
    priority: str
) -> tuple[str, float, str]:
    """
    Sugiere nivel de severidad basado en el contenido.
    PRIORIDAD 1: ML (semantic similarity con embeddings)
    PRIORIDAD 2: Patrones aprendidos del historial
    PRIORIDAD 3: Keywords estáticos
    
    Returns:
        (suggested_value, confidence, reason)
    """
    text = f"{summary} {description}"
    
    # PRIORIDAD 1: ML semantic similarity (con timeout para velocidad)
    try:
        from utils.ml_suggester import get_ml_suggester
        ml_suggester = get_ml_suggester()
        
        if ml_suggester.is_ready():
            ml_result = ml_suggester.suggest_severity(text, top_k=5)
            
            if ml_result:
                value, confidence, reason, similar_tickets = ml_result
                return value, confidence, f"ML: {reason}"
    except (ImportError, Exception):
        pass
    
    # PRIORIDAD 2: Intentar usar patrones aprendidos del historial
    try:
        from utils.issue_cache import get_cache_manager
        cache = get_cache_manager()
        pattern_suggestion = cache.get_suggestion_from_patterns(text, 'severity')
        
        if pattern_suggestion:
            value, confidence, reason = pattern_suggestion
            return value, confidence, f"Pattern: {reason}"
    except Exception:
        pass
    
    # FALLBACK: Keywords estáticos (si no hay patrones)
    text_lower = text.lower()
    
    # CRITICAL indicators
    critical_keywords = [
        'caído', 'down', 'outage', 'producción', 'production',
        'crítico', 'critical', 'urgente', 'urgent', 'bloqueante',
        'no funciona', 'not working', 'offline', 'error grave'
    ]
    
    # HIGH indicators  
    high_keywords = [
        'falla', 'error', 'problema grave', 'afecta', 'affects',
        'importante', 'high', 'alto', 'degradado', 'degraded'
    ]
    
    # MEDIUM indicators
    medium_keywords = [
        'lento', 'slow', 'mejora', 'improvement', 'optimización',
        'medium', 'medio', 'normal'
    ]
    
    # LOW indicators
    low_keywords = [
        'pregunta', 'question', 'duda', 'consulta', 'información',
        'low', 'bajo', 'menor', 'cosmético', 'cosmetic'
    ]
    
    # Check keywords
    if any(kw in text_lower for kw in critical_keywords):
        return 'Crítico', 0.9, 'Contiene indicadores de severidad crítica'
    elif any(kw in text_lower for kw in high_keywords):
        return 'Mayor', 0.85, 'Contiene indicadores de severidad alta'
    elif any(kw in text_lower for kw in medium_keywords):
        return 'Normal', 0.7, 'Parece un problema de severidad media'
    elif any(kw in text_lower for kw in low_keywords):
        return 'Menor', 0.75, 'Parece una consulta o problema menor'
    
    # Fallback to priority
    if priority:
        priority_lower = str(priority).lower()
        if 'critical' in priority_lower or 'highest' in priority_lower:
            return 'Crítico', 0.7, f'Basado en prioridad: {priority}'
        elif 'high' in priority_lower:
            return 'Mayor', 0.7, f'Basado en prioridad: {priority}'
        elif 'medium' in priority_lower:
            return 'Normal', 0.65, f'Basado en prioridad: {priority}'
        elif 'low' in priority_lower:
            return 'Menor', 0.65, f'Basado en prioridad: {priority}'
    
    return 'Normal', 0.5, 'Valor por defecto (sin indicadores claros)'


def _suggest_priority(summary: str, description: str) -> tuple[str, float, str]:
    """Sugiere prioridad basada en el contenido."""
    text = f"{summary} {description}".lower()
    
    if any(kw in text for kw in ['crítico', 'urgente', 'caído', 'production']):
        return 'Highest', 0.9, 'Indica urgencia crítica'
    elif any(kw in text for kw in ['importante', 'grave', 'bloqueante']):
        return 'High', 0.8, 'Indica alta prioridad'
    elif any(kw in text for kw in ['normal', 'regular']):
        return 'Medium', 0.7, 'Prioridad estándar'
    elif any(kw in text for kw in ['menor', 'pregunta', 'consulta']):
        return 'Low', 0.75, 'Prioridad baja'
    
    return 'Medium', 0.5, 'Prioridad por defecto'


def _suggest_labels(
    summary: str,
    description: str,
    current_labels: List[str]
) -> List[str]:
    """Sugiere labels basado en el contenido."""
    text = f"{summary} {description}".lower()
    suggested = []
    
    # Detect technology/platform
    tech_map = {
        'smt': ['smt', 'speedy mobile'],
        'hub': ['hub', 'integration'],
        'api': ['api', 'rest', 'endpoint'],
        'database': ['database', 'db', 'sql', 'query'],
        'frontend': ['frontend', 'ui', 'interface', 'web'],
        'backend': ['backend', 'server', 'service'],
        'mobile': ['mobile', 'app', 'android', 'ios'],
    }
    
    for label, keywords in tech_map.items():
        if any(kw in text for kw in keywords) and label not in current_labels:
            suggested.append(label)
    
    # Detect issue type
    if any(kw in text for kw in ['error', 'bug', 'falla']) and 'bug' not in current_labels:
        suggested.append('bug')
    
    if any(kw in text for kw in ['mejora', 'improvement', 'feature']) and 'enhancement' not in current_labels:
        suggested.append('enhancement')
    
    return suggested[:3]  # Limit to 3 suggestions
