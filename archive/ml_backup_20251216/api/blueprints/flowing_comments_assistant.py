"""
FLOWING COMMENTS ASSISTANT
Provides AI-powered comment suggestions, summaries, and translations
Uses Ollama for intelligent comment assistance
"""
from flask import Blueprint, request, jsonify
# from utils.ollama_client import get_ollama_client  # TODO: Restore when Ollama service is available
import logging
logger = logging.getLogger(__name__)
flowing_comments_bp = Blueprint('flowing_comments', __name__, url_prefix='/api/flowing')
@flowing_comments_bp.route('/suggest-response', methods=['POST'])
def suggest_response():
    """
    Generate AI-suggested response based on conversation history
    Request:
        {
            "issueKey": "MSM-123",
            "comments": [...],
            "context": {...}
        }
    Response:
        {
            "suggestion": "Suggested comment text",
            "tone": "professional|friendly|technical",
            "confidence": 0.85
        }
    """
    try:
        data = request.get_json()
        issue_key = data.get('issueKey')
        comments = data.get('comments', [])
        context = data.get('context', {})
        if not issue_key:
            return jsonify({'error': 'issueKey is required'}), 400
        ollama = get_ollama_client()
        if not ollama.is_available():
            return jsonify({
                'error': 'AI service not available',
                'suggestion': 'Ollama service is not running'
            }), 503
        # Build conversation context
        conversation = "\n".join([
            f"{c.get('author', 'Unknown')}: {c.get('body', '')}"
            for c in comments[-5:]  # Last 5 comments
        ])
        prompt = f"""Analyze this support ticket conversation and suggest a professional response.
Ticket: {issue_key}
Recent conversation:
{conversation}
Generate a helpful, professional response that:
1. Addresses the user's concern
2. Is clear and concise
3. Maintains professional tone
4. Offers next steps if applicable
Suggested response:"""
        response_text = ollama.generate_text(
            prompt=prompt,
            model="llama3.2",
            temperature=0.7,
            max_tokens=200
        )
        if response_text:
            return jsonify({
                'suggestion': response_text,
                'tone': 'professional',
                'confidence': 0.85
            })
        else:
            return jsonify({'error': 'Failed to generate suggestion'}), 500
    except Exception as e:
        logger.error(f"Error in suggest_response: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
@flowing_comments_bp.route('/summarize-conversation', methods=['POST'])
def summarize_conversation():
    """
    Summarize a long conversation thread
    Request:
        {
            "issueKey": "MSM-123",
            "comments": [...]
        }
    Response:
        {
            "summary": "Brief summary of conversation",
            "key_points": ["point 1", "point 2", ...],
            "status": "resolved|pending|escalated"
        }
    """
    try:
        data = request.get_json()
        comments = data.get('comments', [])
        if not comments:
            return jsonify({'error': 'No comments to summarize'}), 400
        ollama = get_ollama_client()
        if not ollama.is_available():
            return jsonify({'error': 'AI service not available'}), 503
        conversation = "\n".join([
            f"{c.get('author', 'Unknown')} ({c.get('created', '')}): {c.get('body', '')}"
            for c in comments
        ])
        prompt = f"""Summarize this support ticket conversation:
{conversation}
Provide:
1. A brief 2-3 sentence summary
2. Key discussion points (bullet list)
3. Current status (resolved/pending/escalated)
Summary:"""
        summary_text = ollama.generate_text(
            prompt=prompt,
            model="llama3.2",
            temperature=0.5,
            max_tokens=300
        )
        if summary_text:
            # Parse response (simple extraction)
            lines = summary_text.split('\n')
            summary = lines[0] if lines else summary_text
            return jsonify({
                'summary': summary,
                'key_points': [],
                'status': 'pending'
            })
        else:
            return jsonify({'error': 'Failed to generate summary'}), 500
    except Exception as e:
        logger.error(f"Error in summarize_conversation: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
@flowing_comments_bp.route('/translate-comment', methods=['POST'])
def translate_comment():
    """
    Translate comment to target language
    Request:
        {
            "text": "Comment text",
            "targetLanguage": "es"
        }
    Response:
        {
            "translation": "Translated text",
            "detectedLanguage": "en"
        }
    """
    try:
        data = request.get_json()
        text = data.get('text', '')
        target_lang = data.get('targetLanguage', 'es')
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        ollama = get_ollama_client()
        if not ollama.is_available():
            return jsonify({'error': 'AI service not available'}), 503
        lang_names = {
            'es': 'Spanish',
            'en': 'English',
            'pt': 'Portuguese',
            'fr': 'French'
        }
        target_name = lang_names.get(target_lang, target_lang)
        prompt = f"""Translate the following text to {target_name}. Only provide the translation, no explanations:
{text}
Translation:"""
        translation = ollama.generate_text(
            prompt=prompt,
            model="llama3.2",
            temperature=0.3,
            max_tokens=500
        )
        if translation:
            return jsonify({
                'translation': translation.strip(),
                'detectedLanguage': 'auto'
            })
        else:
            return jsonify({'error': 'Translation failed'}), 500
    except Exception as e:
        logger.error(f"Error in translate_comment: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
