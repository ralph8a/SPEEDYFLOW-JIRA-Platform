import re
from typing import Dict, Any, List
from predictor import UnifiedMLPredictor

class CommentSuggester:
    """Extract intents from comments and produce workflow recommendations."""
    def __init__(self, predictor: UnifiedMLPredictor = None):
        self.predictor = predictor

    def extract_patterns(self, text: str) -> Dict[str, Any]:
        text_l = text.lower() if text else ''
        patterns = {
            'has_error_500': bool(re.search(r'\b500\b|\b502\b|\b504\b', text_l)),
            'mentions_sla': bool(re.search(r'\bsla\b|\bbreach\b|\bbreaching\b', text_l)),
            'cant_reproduce': bool(re.search(r"can't reproduce|cannot reproduce|can't repro|can't reproduce", text_l)),
            'needs_info': bool(re.search(r'need more info|please provide|more info|required information', text_l)),
            'mentions_fixed': bool(re.search(r'fixed|resolved|closing|closed', text_l)),
            'asks_assign': bool(re.search(r'assign to|please assign|@\w+', text_l)),
        }
        # extract mentioned ticket keys like PROJ-123
        patterns['ticket_keys'] = re.findall(r'\b[A-Z][A-Z0-9]+-\d+\b', text) or []
        # extract error codes
        patterns['error_codes'] = re.findall(r'\b(?:5\d{2})\b', text)
        return patterns

    def suggest_actions(self, summary: str, comments_text: str) -> Dict[str, Any]:
        patterns = self.extract_patterns(comments_text)
        recommendations: List[str] = []
        payload = {
            'priority': None,
            'assign_to': None,
            'labels': [],
            'next_steps': []
        }

        # Use predictor if available
        if self.predictor:
            preds = self.predictor.predict_all(summary, comments_text)
            # Map predicted priority
            try:
                payload['priority'] = preds.get('priority', {}).get('suggested_priority')
            except Exception:
                payload['priority'] = None
            # assignee
            try:
                top = preds.get('assignee', {}).get('top_choice')
                payload['assign_to'] = top.get('assignee') if top else None
            except Exception:
                payload['assign_to'] = None
            # labels
            try:
                labels = preds.get('labels', {}).get('suggested_labels', [])
                payload['labels'] = [l['label'] for l in labels][:5]
            except Exception:
                payload['labels'] = []

            # If comment_suggester model available, augment patterns
            try:
                comment_pred = self.predictor.suggest_comment_patterns(summary, comments_text)
                # merge labels
                payload['labels'] = list(dict.fromkeys(payload['labels'] + comment_pred.get('labels', [])))
                patterns['model_comment_probs'] = comment_pred.get('probabilities', {})
            except Exception:
                pass

        # Rules based on patterns
        if patterns['has_error_500']:
            recommendations.append('Check backend origin errors and increase ServiceCallout timeout; collect server logs')
            if not payload['priority']:
                payload['priority'] = 'High'
            payload['labels'].append('server-error')
            payload['next_steps'].append('Collect backend logs')

        if patterns['mentions_sla']:
            recommendations.append('Escalar por riesgo SLA; notificar on-call y añadir campo SLA remediation')
            payload['next_steps'].append('Notify on-call')
            payload['labels'].append('sla')

        if patterns['cant_reproduce'] or patterns['needs_info']:
            recommendations.append('Solicitar pasos reproducibles y payload; marcar como Needs Info')
            payload['next_steps'].append('Request reproducible steps and sample payload')

        if patterns['mentions_fixed']:
            recommendations.append('Mover a Resolved y pedir verificación de QA')
            payload['next_steps'].append('Request QA verification')

        if not recommendations:
            recommendations.append('No patterns detected; sugerir checklist básico: reproducir, logs, asignar')
            payload['next_steps'].append('Collect logs and reproduce locally')

        # deduplicate labels
        payload['labels'] = list(dict.fromkeys(payload['labels']))

        return {
            'patterns': patterns,
            'recommendations': recommendations,
            'suggestion_payload': payload
        }
