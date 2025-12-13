# -*- coding: utf-8 -*-
"""
ML Comment Suggestion Engine
Analyzes ticket comments to suggest common responses and patterns.
"""

import os
import json
import gzip
import logging
import hashlib
from typing import List, Dict, Tuple, Optional
from collections import Counter, defaultdict
from datetime import datetime
import re

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Import ML training database
from api.ml_training_db import get_ml_training_db

logger = logging.getLogger(__name__)

class CommentSuggestionEngine:
    """
    Suggests common comment templates based on ticket history.
    Uses TF-IDF and pattern matching to find relevant suggestions.
    """
    
    def __init__(self, cache_path: str = "data/cache/msm_issues.json.gz"):
        self.cache_path = cache_path
        self.vectorizer = TfidfVectorizer(
            max_features=500,
            ngram_range=(1, 3),
            min_df=2,
            stop_words='english'
        )
        self.comment_templates: List[Dict] = []
        self.pattern_phrases: List[str] = []
        self.resolution_patterns: Dict[str, List[str]] = defaultdict(list)
        
        # Cache for suggestions (context_hash -> {suggestions, timestamp})
        self.suggestions_cache: Dict[str, Dict] = {}
        self.cache_ttl: int = 300  # 5 minutes TTL
        
    def _generate_context_hash(self, ticket_summary: str, ticket_description: str, all_comments: List[str]) -> str:
        """Generate MD5 hash from ticket context for cache key"""
        context_str = f"{ticket_summary}|{ticket_description}|{'|'.join(all_comments or [])}"
        return hashlib.md5(context_str.encode('utf-8')).hexdigest()
    
    def _get_cached_suggestions(self, context_hash: str) -> Optional[List[Dict]]:
        """Get suggestions from cache if not expired"""
        if context_hash not in self.suggestions_cache:
            return None
        
        cached = self.suggestions_cache[context_hash]
        cached_time = cached.get('timestamp', 0)
        current_time = datetime.now().timestamp()
        
        # Check if cache is still valid (within TTL)
        if current_time - cached_time > self.cache_ttl:
            # Cache expired, remove it
            del self.suggestions_cache[context_hash]
            logger.debug(f"🕒 Cache expired for hash {context_hash[:8]}...")
            return None
        
        logger.info(f"✅ Cache hit for hash {context_hash[:8]}... (age: {int(current_time - cached_time)}s)")
        return cached.get('suggestions')
    
    def _cache_suggestions(self, context_hash: str, suggestions: List[Dict]) -> None:
        """Save suggestions to cache with timestamp"""
        self.suggestions_cache[context_hash] = {
            'suggestions': suggestions,
            'timestamp': datetime.now().timestamp()
        }
        logger.debug(f"💾 Cached {len(suggestions)} suggestions with hash {context_hash[:8]}...")
    
    def clear_cache(self) -> int:
        """Clear all cached suggestions. Returns number of entries cleared."""
        count = len(self.suggestions_cache)
        self.suggestions_cache.clear()
        logger.info(f"🗑️ Cleared {count} cached suggestion entries")
        return count
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        current_time = datetime.now().timestamp()
        valid_entries = sum(
            1 for cached in self.suggestions_cache.values()
            if current_time - cached.get('timestamp', 0) <= self.cache_ttl
        )
        return {
            'total_entries': len(self.suggestions_cache),
            'valid_entries': valid_entries,
            'expired_entries': len(self.suggestions_cache) - valid_entries,
            'ttl_seconds': self.cache_ttl
        }
    
    def load_tickets(self) -> List[Dict]:
        """Load tickets from cache"""
        if not os.path.exists(self.cache_path):
            logger.warning(f"Cache file not found: {self.cache_path}")
            return []
        
        try:
            with gzip.open(self.cache_path, 'rt', encoding='utf-8') as f:
                data = json.load(f)
                tickets = data.get('issues', [])
                logger.info(f"✅ Loaded {len(tickets)} tickets from cache")
                return tickets
        except Exception as e:
            logger.error(f"Error loading tickets: {e}")
            return []
    
    def extract_comment_patterns(self, tickets: List[Dict]) -> None:
        """
        Extract common comment patterns from resolved tickets.
        Identifies phrases like "Please attach...", "Check if...", etc.
        """
        action_phrases = []
        resolution_comments = defaultdict(list)
        
        for ticket in tickets:
            try:
                # Get ticket type/category
                issue_type = ticket.get('fields', {}).get('issuetype', {}).get('name', 'Unknown')
                status = ticket.get('fields', {}).get('status', {}).get('name', 'Unknown')
                
                # Extract comments
                comments_data = ticket.get('fields', {}).get('comment', {})
                comments = comments_data.get('comments', []) if isinstance(comments_data, dict) else []
                
                for comment in comments:
                    body = comment.get('body', '')
                    if not body or len(body) < 20:
                        continue
                    
                    # Extract action phrases (common patterns)
                    if self._contains_action_pattern(body):
                        action_phrases.append(body)
                    
                    # Store resolution-related comments
                    if status in ['Done', 'Resolved', 'Closed', 'Cerrado', 'Resuelto']:
                        resolution_comments[issue_type].append(body)
                        
            except Exception as e:
                logger.debug(f"Error processing ticket: {e}")
                continue
        
        # Store top patterns
        self.pattern_phrases = self._extract_top_patterns(action_phrases)
        self.resolution_patterns = {
            k: self._extract_top_patterns(v[:50])  # Top 50 per type
            for k, v in resolution_comments.items()
        }
        
        logger.info(f"✅ Extracted {len(self.pattern_phrases)} action patterns")
        logger.info(f"✅ Extracted resolution patterns for {len(self.resolution_patterns)} issue types")
    
    def _contains_action_pattern(self, text: str) -> bool:
        """Check if text contains common action phrases"""
        action_keywords = [
            'please', 'por favor', 'adjunta', 'attach', 'verifica', 'check',
            'revisa', 'review', 'confirma', 'confirm', 'asegúrate', 'make sure',
            'necesito', 'need', 'requiere', 'require', 'puedes', 'can you'
        ]
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in action_keywords)
    
    def _extract_top_patterns(self, texts: List[str], top_n: int = 10) -> List[str]:
        """Extract most common patterns from texts using TF-IDF"""
        if not texts:
            return []
        
        try:
            # Fit TF-IDF
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            
            # Get feature names
            feature_names = self.vectorizer.get_feature_names_out()
            
            # Calculate average TF-IDF scores
            avg_scores = np.asarray(tfidf_matrix.mean(axis=0)).flatten()
            
            # Get top features
            top_indices = avg_scores.argsort()[-top_n:][::-1]
            top_phrases = [feature_names[i] for i in top_indices]
            
            # Return original sentences containing top phrases
            top_sentences = []
            for phrase in top_phrases[:5]:  # Top 5 phrases
                for text in texts:
                    if phrase in text.lower() and len(text) < 300:
                        top_sentences.append(text.strip())
                        break
            
            return top_sentences[:top_n]
        except Exception as e:
            logger.error(f"Error extracting patterns: {e}")
            return texts[:top_n]
    
    def train(self) -> Dict[str, any]:
        """
        Train the suggestion engine by analyzing historical comments.
        Returns training statistics.
        """
        logger.info("🚀 Training Comment Suggestion Engine...")
        start_time = datetime.now()
        
        # Load tickets
        tickets = self.load_tickets()
        if not tickets:
            return {"error": "No tickets found", "trained": False}
        
        # Extract patterns
        self.extract_comment_patterns(tickets)
        
        # Calculate stats
        duration = (datetime.now() - start_time).total_seconds()
        
        stats = {
            "trained": True,
            "tickets_analyzed": len(tickets),
            "action_patterns": len(self.pattern_phrases),
            "resolution_patterns": sum(len(v) for v in self.resolution_patterns.values()),
            "issue_types": list(self.resolution_patterns.keys()),
            "training_duration_seconds": round(duration, 2),
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Training complete in {duration:.2f}s")
        logger.info(f"   - {stats['action_patterns']} action patterns")
        logger.info(f"   - {stats['resolution_patterns']} resolution patterns")
        
        return stats
    
    def get_suggestions(
        self, 
        ticket_summary: str,
        ticket_description: str,
        issue_type: str = "Unknown",
        status: str = "Open",
        priority: str = "Medium",
        all_comments: List[str] = None,
        max_suggestions: int = 5
    ) -> List[Dict[str, str]]:
        """
        Get AI-powered comment suggestions for a ticket.
        
        Args:
            ticket_summary: Ticket title/summary
            ticket_description: Ticket description
            issue_type: Type of issue (Bug, Task, etc.)
            status: Current ticket status
            priority: Ticket priority
            all_comments: List of ALL comments for full context analysis
            max_suggestions: Maximum number of suggestions to return
            
        Returns:
            List of suggestion dicts with 'text', 'type', and 'confidence' keys
        """
        # Generate context hash for caching
        context_hash = self._generate_context_hash(ticket_summary, ticket_description, all_comments or [])
        
        # Check cache first
        cached_suggestions = self._get_cached_suggestions(context_hash)
        if cached_suggestions is not None:
            logger.info(f"📦 Returning {len(cached_suggestions)} cached suggestions")
            return cached_suggestions
        
        # Cache miss - generate new suggestions
        logger.info(f"🔄 Cache miss - generating new suggestions for hash {context_hash[:8]}...")
        suggestions = []
        
        # Combine ticket text
        ticket_text = f"{ticket_summary} {ticket_description}".lower()
        
        # Analyze ALL comments for complete context
        comments_text = " ".join(all_comments or []).lower()
        
        # Log for debugging
        if all_comments:
            logger.info(f"📝 Analyzing {len(all_comments)} comments for suggestions")
            if len(all_comments) > 0:
                logger.debug(f"Last comment: {all_comments[-1][:100]}...")
        
        # 1. Get context-aware AI suggestions first (highest quality)
        generic_suggestions = self._get_generic_suggestions(ticket_text, status, priority, comments_text, all_comments)
        suggestions.extend(generic_suggestions[:max_suggestions])
        
        # 2. Get resolution-specific suggestions (if trained and available)
        if issue_type in self.resolution_patterns and len(suggestions) < max_suggestions:
            for pattern in self.resolution_patterns[issue_type][:2]:
                if len(suggestions) >= max_suggestions:
                    break
                suggestions.append({
                    "text": pattern,
                    "type": "resolution",
                    "confidence": 0.8
                })
        
        # 3. Get general action suggestions from patterns (if trained)
        if self.pattern_phrases and len(suggestions) < max_suggestions:
            for phrase in self.pattern_phrases[:2]:
                if len(suggestions) >= max_suggestions:
                    break
                suggestions.append({
                    "text": phrase,
                    "type": "action",
                    "confidence": 0.7
                })
        
        # Sort by confidence
        suggestions.sort(key=lambda x: x['confidence'], reverse=True)
        
        final_suggestions = suggestions[:max_suggestions]
        
        # Cache suggestions before saving to ML DB
        if final_suggestions:
            self._cache_suggestions(context_hash, final_suggestions)
        
        # Save to ML training database (async, non-blocking)
        if final_suggestions:
            try:
                ml_db = get_ml_training_db()
                # Use ticket_summary as ticket_key if no key provided
                ticket_key = ticket_summary.split()[0] if ticket_summary else "UNKNOWN"
                ml_db.add_training_sample(
                    ticket_key=ticket_key,
                    ticket_summary=ticket_summary,
                    ticket_description=ticket_description,
                    issue_type=issue_type,
                    status=status,
                    priority=priority,
                    all_comments=all_comments or [],
                    suggestions=final_suggestions,
                    model=""
                )
            except Exception as e:
                logger.error(f"Error saving to ML training DB: {e}")
        
        return final_suggestions
    
    def _get_fallback_suggestions(self, ticket_text: str, status: str = "", comments_text: str = "", all_comments: List[str] = None) -> List[Dict[str, str]]:
        """Generate pattern-based suggestions when Ollama is not available"""
        suggestions = []
        ticket_lower = ticket_text.lower()
        
        # Detectar si hay intención de cierre o falta de respuesta
        closure_keywords = ['cierre', 'cerrar', 'close', 'resolver', 'resolved', 'completado', 'finished']
        no_response_keywords = ['sin respuesta', 'no response', 'no contesta', 'no answer', 'sin reply']
        
        has_closure_intent = any(kw in comments_text for kw in closure_keywords)
        has_no_response = any(kw in comments_text for kw in no_response_keywords)
        
        # Calcular días desde último comentario (si available)
        days_since_last_comment = 0
        if all_comments and len(all_comments) > 0:
            # Estimación simple: si hay más de 3 comentarios y status no es resuelto
            if len(all_comments) > 3 and status.lower() not in ['done', 'closed', 'resolved', 'cerrado']:
                days_since_last_comment = 2  # Simulación, en producción calcular desde timestamp
        
        # SUGERENCIA PRIORITARIA: Llamar al informer si no hay respuesta
        if (has_closure_intent or has_no_response) or days_since_last_comment >= 2:
            suggestions.append({
                "text": "📞 **Recomendación**: El informer no ha respondido. Considera llamarlo para verificar el estado del ticket. El número de teléfono se encuentra en la sección de información del ticket.",
                "type": "action",
                "confidence": 0.95
            })
        
        # Sugerencias generales basadas en keywords
        if 'error' in ticket_lower or 'exception' in ticket_lower:
            suggestions.append({
                "text": "Por favor adjunta los logs completos del error y el stacktrace para poder diagnosticar el problema.",
                "type": "diagnostic",
                "confidence": 0.90
            })
        
        if 'login' in ticket_lower or 'autenticación' in ticket_lower:
            suggestions.append({
                "text": "He verificado las credenciales. ¿Puedes confirmar el usuario y método de autenticación que estás utilizando?",
                "type": "diagnostic",
                "confidence": 0.88
            })
        
        if 'lento' in ticket_lower or 'performance' in ticket_lower or 'slow' in ticket_lower:
            suggestions.append({
                "text": "Estoy revisando las métricas de rendimiento. ¿Puedes especificar en qué momento del día ocurre la lentitud?",
                "type": "diagnostic",
                "confidence": 0.87
            })
        
        if 'database' in ticket_lower or 'bd' in ticket_lower or 'query' in ticket_lower:
            suggestions.append({
                "text": "Revisaré los registros de la base de datos. ¿El error ocurre con todas las consultas o solo con una específica?",
                "type": "diagnostic",
                "confidence": 0.86
            })
        
        # Sugerencia de cierre si parece resuelto
        if 'funciona' in ticket_lower or 'resuelto' in ticket_lower or 'working' in ticket_lower:
            suggestions.append({
                "text": "Me alegra que el problema se haya resuelto. Procederé a cerrar este ticket. Si necesitas algo más, no dudes en contactarnos.",
                "type": "resolution",
                "confidence": 0.92
            })
        
        # Si no hay sugerencias específicas, dar una genérica
        if len(suggestions) == 0:
            suggestions.append({
                "text": "Gracias por reportar este inconveniente. Estoy revisando la información proporcionada y te contactaré con más detalles pronto.",
                "type": "diagnostic",
                "confidence": 0.75
            })
        
        return suggestions[:5]  # Máximo 5 sugerencias
    
    def _get_generic_suggestions(self, ticket_text: str, status: str = "", priority: str = "", comments_text: str = "", all_comments: List[str] = None) -> List[Dict[str, str]]:
        """Get AI-powered suggestions using Ollama with fallback to pattern-based suggestions"""
        suggestions = []
        
        if not ollama_engine.is_available:
            logger.warning("⚠️ Ollama not available - using pattern-based fallback")
            return self._get_fallback_suggestions(ticket_text, status, comments_text, all_comments)
        
        # Prepare context for AI analysis
        comments_context = ""
        if all_comments and len(all_comments) > 0:
            # Use last 3-5 comments with more context
            recent_comments = all_comments[-5:] if len(all_comments) > 5 else all_comments
            comments_context = "\n\nHistorial de comentarios:\n" + "\n".join([f"- {c[:150]}" for c in recent_comments])
        
        # Create improved prompt for more detailed and contextual suggestions
        prompt = f"""Eres un agente de soporte técnico experto. Analiza este ticket y genera 3 sugerencias de comentarios profesionales y detallados basados en el contexto.

Ticket: {ticket_text[:300]}
Estado actual: {status}
Prioridad: {priority}{comments_context}

Genera SOLAMENTE 3 comentarios de seguimiento profesionales. Cada comentario debe:
- Ser específico al problema descrito
- Incluir acciones concretas o diagnóstico
- Tener entre 50-150 caracteres
- NO incluir texto introductorio

Formato (una sugerencia por línea):
1. [comentario profesional y específico]
2. [comentario profesional y específico]
3. [comentario profesional y específico]"""
        
        try:
            logger.info("🤖 Generating AI suggestions with Ollama (timeout: 30s, TXT format)...")
            response = ollama_engine._call_ollama(prompt, max_tokens=400, timeout=30)
            
            if response:
                # Parse TXT response (faster than JSON)
                try:
                    # Split by lines and extract suggestions
                    lines = [line.strip() for line in response.split('\n') if line.strip()]
                    
                    # Filter: only keep lines that start with numbering (1., 2., 3., 1), etc.)
                    import re
                    for line in lines:
                        # Match lines that start with: 1., 2., 3., or "1)", or "- ", or "* "
                        if re.match(r'^[\d\-\*]+[\.\)]\s+', line):
                            # Remove numbering (1., 2., 3., -, *, etc.)
                            clean_line = re.sub(r'^[\d\-\*]+[\.\)]\s+', '', line).strip()
                            
                            # Remove quotes if present
                            clean_line = clean_line.strip('"').strip("'")
                            
                            # Validate: must be at least 30 chars and not be intro text
                            if len(clean_line) > 30 and not any(intro in clean_line.lower() for intro in [
                                'aquí te dejo', 'aqui te dejo', 'te dejo tres', 'tres respuestas',
                                'opciones de respuesta', 'respuestas cortas', 'claro,', 'entendido'
                            ]):
                                suggestions.append({
                                    "text": clean_line,
                                    "type": "action",
                                    "confidence": 0.90
                                })
                                logger.debug(f"✅ Extracted suggestion: {clean_line[:60]}...")
                                
                                if len(suggestions) >= 3:
                                    break
                    
                    if suggestions:
                        logger.info(f"✅ Generated {len(suggestions)} AI suggestions (TXT format)")
                        return suggestions
                    else:
                        logger.warning(f"No valid suggestions extracted from response. Raw: {response[:150]}")
                except Exception as e:
                    logger.error(f"Failed to parse Ollama TXT response: {e}")
                    logger.debug(f"Raw response: {response[:200]}")
        
        except Exception as e:
            logger.error(f"Error generating AI suggestions: {e}")
        
        return [{
            "text": "Please describe the issue in detail",
            "type": "diagnostic",
            "confidence": 0.5
        }]

# Singleton instance
_engine_instance: Optional[CommentSuggestionEngine] = None

def get_suggestion_engine() -> CommentSuggestionEngine:
    """Get or create the global suggestion engine instance"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = CommentSuggestionEngine()
    return _engine_instance

def train_suggestion_engine() -> Dict[str, any]:
    """Train the suggestion engine (convenience function)"""
    engine = get_suggestion_engine()
    return engine.train()

def get_comment_suggestions(
    ticket_summary: str,
    ticket_description: str,
    issue_type: str = "Unknown",
    max_suggestions: int = 3
) -> List[Dict[str, str]]:
    """Get comment suggestions (convenience function)"""
    engine = get_suggestion_engine()
    
    # Train if not already trained
    if not engine.pattern_phrases and not engine.resolution_patterns:
        logger.info("Engine not trained, training now...")
        train_suggestion_engine()
    
    return engine.get_suggestions(
        ticket_summary,
        ticket_description,
        issue_type,
        max_suggestions
    )
