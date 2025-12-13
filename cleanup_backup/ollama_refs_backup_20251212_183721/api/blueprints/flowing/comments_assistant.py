"""
Flowing MVP - Comments Assistant
Asistente inteligente para comentarios: generar respuestas, resumir, traducir
"""

from flask import Blueprint, request, jsonify
from utils.common import JiraApiError
from utils.api_migration import get_api_client
from utils.ollama_client import get_ollama_client
import logging

logger = logging.getLogger(__name__)

flowing_comments_bp = Blueprint('flowing_comments', __name__)


@flowing_comments_bp.route('/api/flowing/suggest-response', methods=['POST'])
def suggest_response():
    """
    Generar sugerencias de respuesta inteligentes usando Ollama
    
    Request body:
    {
        "issue_key": "MSM-123",
        "response_type": "acknowledgment|request_info|resolution|custom",
        "last_comment": "optional last comment text",
        "tone": "professional|friendly|technical"
    }
    
    Response:
    {
        "success": true,
        "suggestions": [
            {"type": "acknowledgment", "text": "...", "tone": "friendly"},
            {"type": "request_info", "text": "...", "tone": "professional"},
            {"type": "resolution", "text": "...", "tone": "professional"}
        ],
        "using_ollama": true
    }
    """
    try:
        data = request.get_json() or {}
        issue_key = data.get('issue_key')
        response_type = data.get('response_type', 'all')
        last_comment = data.get('last_comment', '')
        tone = data.get('tone', 'professional')
        
        if not issue_key:
            return jsonify({
                'success': False,
                'error': 'issue_key is required'
            }), 400
        
        client = get_api_client()
        ollama = get_ollama_client()
        
        # Obtener el ticket
        issue = client.get_issue(issue_key)
        summary = issue['fields'].get('summary', '')
        description = str(issue['fields'].get('description', ''))[:500]
        
        suggestions = []
        
        # Si Ollama está disponible, generar respuestas con IA
        if ollama.is_available():
            logger.info(f"Generating AI responses for {issue_key} with Ollama")
            
            # Contexto base
            context = f"Ticket: {summary}\nDescripción: {description}"
            if last_comment:
                context += f"\nÚltimo comentario: {last_comment}"
            
            # Generar respuesta de confirmación
            if response_type in ['all', 'acknowledgment']:
                prompt = f"{context}\n\nGenera una respuesta breve y {tone} para confirmar que recibimos el ticket y estamos trabajando en él. Máximo 2 oraciones."
                ack_text = ollama.generate_text(
                    prompt=prompt,
                    model="llama3.2",
                    system="Eres un asistente de soporte técnico profesional. Genera respuestas claras y concisas.",
                    temperature=0.7,
                    max_tokens=150
                )
                if ack_text:
                    suggestions.append({
                        'type': 'acknowledgment',
                        'text': ack_text,
                        'tone': 'friendly'
                    })
            
            # Generar solicitud de información
            if response_type in ['all', 'request_info']:
                prompt = f"{context}\n\n Genera una pregunta {tone} para solicitar más información que nos ayude a resolver el problema. Sé específico sobre qué información necesitas. Máximo 2 oraciones."
                info_text = ollama.generate_text(
                    prompt=prompt,
                    model="llama3.2",
                    system="Eres un asistente de soporte técnico que necesita información adicional para diagnosticar problemas.",
                    temperature=0.6,
                    max_tokens=150
                )
                if info_text:
                    suggestions.append({
                        'type': 'request_info',
                        'text': info_text,
                        'tone': 'professional'
                    })
            
            # Generar mensaje de resolución
            if response_type in ['all', 'resolution']:
                prompt = f"{context}\n\nGenera un mensaje {tone} informando que el problema ha sido resuelto y pidiendo confirmación al usuario. Máximo 2 oraciones."
                resolution_text = ollama.generate_text(
                    prompt=prompt,
                    model="llama3.2",
                    system="Eres un asistente de soporte técnico que informa sobre resoluciones de problemas.",
                    temperature=0.7,
                    max_tokens=150
                )
                if resolution_text:
                    suggestions.append({
                        'type': 'resolution',
                        'text': resolution_text,
                        'tone': 'professional'
                    })
            
            return jsonify({
                'success': True,
                'suggestions': suggestions,
                'count': len(suggestions),
                'using_ollama': True,
                'issue_key': issue_key
            })
        
        else:
            # Fallback a templates
            logger.warning("Ollama not available, using template responses")
            
            suggestions.append({
                'type': 'acknowledgment',
                'text': f'Hola, gracias por reportar "{summary}". Estamos revisando tu caso y te mantendremos actualizado.',
                'tone': 'friendly'
            })
            
            suggestions.append({
                'type': 'request_info',
                'text': f'Para ayudarte mejor con "{summary}", ¿podrías proporcionar más detalles sobre cuándo comenzó el problema?',
                'tone': 'professional'
            })
            
            suggestions.append({
                'type': 'resolution',
                'text': 'Hemos revisado tu caso y aplicado una solución. ¿Podrías confirmar si el problema se ha resuelto?',
                'tone': 'professional'
            })
            
            return jsonify({
                'success': True,
                'suggestions': suggestions,
                'count': len(suggestions),
                'using_ollama': False,
                'fallback': 'Template responses (Ollama not available)',
                'issue_key': issue_key
            })
        
    except JiraApiError as e:
        logger.error(f"JIRA API error in suggest response: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Error in suggest response: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@flowing_comments_bp.route('/api/flowing/summarize-conversation', methods=['POST'])
def summarize_conversation():
    """
    Resumir conversación de un ticket usando Ollama
    
    Request body:
    {
        "issue_key": "MSM-123",
        "max_length": 300  // opcional
    }
    
    Response:
    {
        "success": true,
        "summary": "Resumen de la conversación...",
        "comment_count": 8,
        "key_points": ["punto 1", "punto 2"],
        "using_ollama": true
    }
    """
    try:
        data = request.get_json() or {}
        issue_key = data.get('issue_key')
        max_length = data.get('max_length', 300)
        
        if not issue_key:
            return jsonify({
                'success': False,
                'error': 'issue_key is required'
            }), 400
        
        client = get_api_client()
        ollama = get_ollama_client()
        
        # Obtener issue y comentarios
        issue = client.get_issue(issue_key)
        summary_text = issue['fields'].get('summary', '')
        description = str(issue['fields'].get('description', ''))[:300]
        comments = client.get_issue_comments(issue_key)
        
        if not comments:
            return jsonify({
                'success': True,
                'summary': 'No hay comentarios para resumir.',
                'comment_count': 0,
                'key_points': [],
                'using_ollama': False
            })
        
        comment_count = len(comments)
        authors = set(c.get('author', {}).get('displayName', 'Unknown') for c in comments)
        
        # Si Ollama está disponible, generar resumen inteligente
        if ollama.is_available():
            logger.info(f"Generating AI summary for {issue_key} with {comment_count} comments")
            
            # Construir contexto de comentarios (últimos 10)
            recent_comments = comments[-10:] if len(comments) > 10 else comments
            conversation = []
            
            for comment in recent_comments:
                author = comment.get('author', {}).get('displayName', 'Unknown')
                body = comment.get('body', '')
                conversation.append(f"{author}: {body[:200]}")
            
            conversation_text = "\n".join(conversation)
            
            # Generar resumen con Ollama
            prompt = f"""Ticket: {summary_text}
Descripción: {description}

Conversación ({comment_count} comentarios):
{conversation_text}

Genera un resumen conciso de esta conversación de soporte técnico. Incluye:
1. El problema principal
2. Las soluciones intentadas
3. El estado actual
Máximo {max_length} palabras."""
            
            summary = ollama.generate_text(
                prompt=prompt,
                model="llama3.2",
                system="Eres un asistente que resume conversaciones de soporte técnico de forma clara y concisa.",
                temperature=0.5,
                max_tokens=max_length
            )
            
            if summary:
                # Generar puntos clave
                key_points_prompt = f"{conversation_text}\n\nExtrae 3-5 puntos clave de esta conversación en formato de lista."
                key_points_text = ollama.generate_text(
                    prompt=key_points_prompt,
                    model="llama3.2",
                    system="Extrae los puntos clave más importantes de conversaciones técnicas.",
                    temperature=0.3,
                    max_tokens=200
                )
                
                # Parsear puntos clave
                key_points = []
                if key_points_text:
                    for line in key_points_text.split('\n'):
                        line = line.strip()
                        if line and (line.startswith('-') or line.startswith('•') or line.startswith('*') or line[0].isdigit()):
                            # Limpiar bullets y números
                            point = line.lstrip('-•*0123456789. ').strip()
                            if point:
                                key_points.append(point)
                
                return jsonify({
                    'success': True,
                    'summary': summary,
                    'comment_count': comment_count,
                    'participants': list(authors),
                    'key_points': key_points[:5],  # Max 5 puntos
                    'using_ollama': True,
                    'issue_key': issue_key
                })
        
        # Fallback a resumen básico
        logger.warning("Ollama not available, using basic summary")
        
        summary = f"Conversación con {comment_count} comentarios de {len(authors)} participantes sobre: {summary_text}"
        
        key_points = [
            f"Total de comentarios: {comment_count}",
            f"Participantes: {', '.join(list(authors)[:3])}",
            f"Última actualización: {comments[-1].get('created', 'N/A')}" if comments else "Sin actualizaciones"
        ]
        
        return jsonify({
            'success': True,
            'data': {
                'issue_key': issue_key,
                'summary': summary,
                'key_points': key_points,
                'comment_count': comment_count
            }
        })
        
    except JiraApiError as e:
        logger.error(f"JIRA API error in summarize conversation: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Error in summarize conversation: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@flowing_comments_bp.route('/api/flowing/translate-comment', methods=['POST'])
def translate_comment():
    """
    Traducir comentario usando Ollama
    
    Request body:
    {
        "text": "texto a traducir",
        "issue_key": "MSM-123",  // opcional - para contexto
        "target_language": "es|en|pt|fr|de",
        "source_language": "auto"  // opcional
    }
    
    Response:
    {
        "success": true,
        "original_text": "...",
        "translated_text": "...",
        "source_language": "es",
        "target_language": "en",
        "using_ollama": true
    }
    """
    try:
        data = request.get_json() or {}
        text = data.get('text', '')
        issue_key = data.get('issue_key')
        target_lang = data.get('target_language', 'en')
        source_lang = data.get('source_language', 'auto')
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'text is required'
            }), 400
        
        ollama = get_ollama_client()
        
        # Mapeo de códigos de idioma a nombres
        language_names = {
            'es': 'español',
            'en': 'inglés',
            'pt': 'portugués',
            'fr': 'francés',
            'de': 'alemán'
        }
        
        target_name = language_names.get(target_lang, target_lang)
        
        # Si Ollama está disponible, traducir con IA
        if ollama.is_available():
            logger.info(f"Translating text to {target_lang} with Ollama")
            
            # Detectar idioma fuente si es 'auto'
            if source_lang == 'auto':
                detect_prompt = f"¿En qué idioma está escrito este texto? Responde solo con el nombre del idioma.\n\nTexto: {text[:200]}"
                detected = ollama.generate_text(
                    prompt=detect_prompt,
                    model="llama3.2",
                    system="Eres un detector de idiomas.",
                    temperature=0.1,
                    max_tokens=20
                )
                source_lang = detected.strip().lower() if detected else 'desconocido'
            
            # Traducir
            translate_prompt = f"Traduce el siguiente texto a {target_name}. Mantén el tono y formato original. Solo responde con la traducción, sin explicaciones.\n\nTexto: {text}"
            
            translated_text = ollama.generate_text(
                prompt=translate_prompt,
                model="llama3.2",
                system=f"Eres un traductor profesional especializado en traducir a {target_name}. Traduce de forma natural y precisa.",
                temperature=0.3,
                max_tokens=len(text.split()) * 3  # Estimación de tokens necesarios
            )
            
            if translated_text:
                return jsonify({
                    'success': True,
                    'original_text': text,
                    'translated_text': translated_text,
                    'source_language': source_lang,
                    'target_language': target_lang,
                    'using_ollama': True
                })
        
        # Fallback - traducción básica (solo para demo)
        logger.warning("Ollama not available, using placeholder translation")
        
        translated_text = f"[Translated to {target_name}]: {text}"
        
        return jsonify({
            'success': True,
            'data': {
                'original': text,
                'translated': translated_text,
                'target_language': target_lang
            }
        })
        
    except Exception as e:
        logger.error(f"Error in translate comment: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
