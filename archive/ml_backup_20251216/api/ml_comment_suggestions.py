"""Lightweight Comment Suggestions engine

This module provides a simple, reliable suggestions engine that does NOT
attempt to train or call heavy external AI services at runtime. It uses
pre-baked templates and keyword heuristics so the `/api/ml/comments/suggestions`
endpoint is deterministic and fast for UI integration.
"""

from __future__ import annotations

import hashlib
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)


DEFAULT_TEMPLATES: Dict[str, List[Dict[str, object]]] = {
    "diagnostic": [
        {"text": "Gracias por el reporte. ¿Puedes indicar los pasos exactos para reproducirlo?", "confidence": 0.9},
        {"text": "Por favor adjunta los logs relevantes y el stacktrace para investigar más a fondo.", "confidence": 0.88},
        {"text": "¿Sucede en todos los entornos o solo en producción?", "confidence": 0.85}
    ],
    "action": [
        {"text": "He escalado este ticket al equipo de backend para revisión detallada.", "confidence": 0.86},
        {"text": "Por favor verifica si el problema persiste en una sesión incógnita y comparte resultados.", "confidence": 0.82}
    ],
    "resolution": [
        {"text": "Me alegra confirmar que el problema quedó resuelto. Procederé a cerrar el ticket.", "confidence": 0.9}
    ]
}


class SimpleSuggestionEngine:
    def __init__(self, templates_path: Optional[str] = None):
        self.templates = DEFAULT_TEMPLATES.copy()
        self.cache: Dict[str, Dict] = {}
        self.cache_ttl_seconds = 60 * 60 * 3  # 3 hours

        # Try load templates file if provided
        if templates_path:
            try:
                p = Path(templates_path)
                if p.exists():
                    data = json.loads(p.read_text(encoding='utf-8'))
                    # expect format: {type: [ {text, confidence}, ... ]}
                    for k, v in data.items():
                        if isinstance(v, list):
                            self.templates[k] = v
                    logger.info('Loaded suggestion templates from %s', templates_path)
            except Exception as e:
                logger.warning('Could not load templates from %s: %s', templates_path, e)

    def _context_hash(self, summary: str, description: str, comments: Optional[List[str]] = None) -> str:
        s = f"{summary}|{description}|{'|'.join(comments or [])}"
        return hashlib.md5(s.encode('utf-8')).hexdigest()

    def get_suggestions(self, summary: str, description: str, issue_type: str = 'Unknown', status: str = 'Open', priority: str = 'Medium', all_comments: Optional[List[str]] = None, max_suggestions: int = 3) -> List[Dict[str, object]]:
        key = self._context_hash(summary or '', description or '', all_comments or [])
        now = datetime.utcnow().timestamp()
        cached = self.cache.get(key)
        if cached and now - cached.get('timestamp', 0) < self.cache_ttl_seconds:
            logger.debug('Returning cached suggestions for %s', key[:8])
            return cached['suggestions'][:max_suggestions]

        text = f"{summary or ''} {description or ''} {' '.join(all_comments or [])}".lower()
        suggestions: List[Dict[str, object]] = []

        # Heuristic rules
        if any(w in text for w in ['error', 'exception', 'stacktrace', 'traceback']):
            suggestions.extend(self.templates.get('diagnostic', [])[:2])

        if any(w in text for w in ['login', 'auth', 'autentic', 'token']):
            suggestions.append({"text": "Por favor confirma el usuario y el método de autenticación utilizado.", "confidence": 0.88})

        if any(w in text for w in ['slow', 'lento', 'performance']):
            suggestions.append({"text": "Indica horario y pasos para reproducir la lentitud; adjunta métricas si es posible.", "confidence": 0.86})

        # If ticket indicates resolved
        if any(w in text for w in ['resuelto', 'solucionado', 'funciona', 'fixed']):
            suggestions.insert(0, {"text": "El problema parece resuelto. Procederé a cerrar el ticket si no hay más comentarios.", "confidence": 0.92})

        # Fallback: use top templates
        if not suggestions:
            # pick a mix of diagnostic and action templates
            candidates = (self.templates.get('diagnostic', []) + self.templates.get('action', []))
            suggestions = candidates[:max_suggestions]

        # Normalize to have type and text
        normalized: List[Dict[str, object]] = []
        for s in suggestions:
            if isinstance(s, dict) and 'text' in s:
                typ = s.get('type') or ('diagnostic' if 'diagnostic' in s.get('text', '').lower() else 'action')
                normalized.append({"text": s['text'], "type": typ, "confidence": float(s.get('confidence', 0.8))})
            else:
                normalized.append({"text": str(s), "type": 'diagnostic', "confidence": 0.75})

        # Deduplicate by text
        seen = set()
        deduped = []
        for item in normalized:
            t = item['text'].strip()
            if t in seen: continue
            seen.add(t)
            deduped.append(item)
            if len(deduped) >= max_suggestions: break

        # Cache and return
        self.cache[key] = {"suggestions": deduped, "timestamp": datetime.utcnow().timestamp()}
        return deduped


# Singleton
_engine: Optional[SimpleSuggestionEngine] = None


def get_suggestion_engine() -> SimpleSuggestionEngine:
    global _engine
    if _engine is None:
        # Allow optional templates file via env var
        tpl = None
        try:
            from utils.config import config
            tpl = getattr(config, 'comment_templates_path', None)
        except Exception:
            tpl = None
        _engine = SimpleSuggestionEngine(templates_path=tpl)
    return _engine


def train_suggestion_engine() -> Dict[str, object]:
    """Placeholder: training is done offline. Return current engine stats."""
    engine = get_suggestion_engine()
    return {"trained": True, "templates_loaded": {k: len(v) for k, v in engine.templates.items()}}


def get_comment_suggestions(ticket_summary: str, ticket_description: str, issue_type: str = "Unknown", max_suggestions: int = 3) -> List[Dict[str, object]]:
    engine = get_suggestion_engine()
    return engine.get_suggestions(ticket_summary, ticket_description, issue_type, max_suggestions=max_suggestions)

