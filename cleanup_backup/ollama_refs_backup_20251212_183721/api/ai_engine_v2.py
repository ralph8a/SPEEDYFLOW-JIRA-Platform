# api/ai_engine_v2.py
# Simple & Robust AI Engine for SPEEDYFLOW
# No external AI dependencies - pure Python logic
# Ready for OpenAI/Claude/Gemini integration

from datetime import datetime, timedelta
from difflib import SequenceMatcher
from collections import defaultdict
import json
import re
from typing import List, Dict, Optional, Tuple

class SimpleAIEngine:
    """Simple AI engine with proven functionality"""
    
    def __init__(self):
        self.cache = {}
        self.cache_ttl = 3600  # 1 hour
        self.analyzed_tickets = {}
        
    def get_cache_key(self, ticket_id: str) -> str:
        """Generate cache key"""
        return f"analysis_{ticket_id}"
    
    def is_cache_valid(self, key: str) -> bool:
        """Check if cache is still valid"""
        if key not in self.cache:
            return False
        stored_time = self.cache[key].get('timestamp')
        if not stored_time:
            return False
        elapsed = (datetime.now() - stored_time).total_seconds()
        return elapsed < self.cache_ttl
    
    # ========================================================================
    # TEXT ANALYSIS
    # ========================================================================
    
    def extract_keywords(self, text: str, min_length: int = 3) -> List[str]:
        """Extract meaningful keywords from text"""
        if not text:
            return []
        
        # Convert to lowercase and remove special chars
        text = text.lower()
        
        # Remove common stop words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these',
            'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
            'who', 'when', 'where', 'why', 'how'
        }
        
        # Split into words and filter
        words = re.findall(r'\w+', text)
        keywords = [
            w for w in words 
            if len(w) >= min_length and w not in stop_words
        ]
        
        return list(set(keywords))  # Remove duplicates
    
    def calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate text similarity (0-1)"""
        if not text1 or not text2:
            return 0.0
        
        ratio = SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
        return round(ratio, 3)
    
    def find_similar_tickets(self, ticket: Dict, all_tickets: List[Dict], 
                            threshold: float = 0.5) -> List[Dict]:
        """Find similar tickets based on content"""
        similar = []
        
        ticket_text = f"{ticket.get('summary', '')} {ticket.get('description', '')}"
        ticket_keywords = set(self.extract_keywords(ticket_text))
        
        for other in all_tickets:
            if other.get('key') == ticket.get('key'):  # Skip same ticket
                continue
            
            other_text = f"{other.get('summary', '')} {other.get('description', '')}"
            other_keywords = set(self.extract_keywords(other_text))
            
            # Calculate keyword overlap
            if not ticket_keywords:
                keyword_score = 0
            else:
                overlap = len(ticket_keywords & other_keywords)
                keyword_score = overlap / len(ticket_keywords)
            
            # Calculate text similarity
            text_score = self.calculate_similarity(ticket_text, other_text)
            
            # Weighted average (40% keywords, 60% text)
            final_score = (keyword_score * 0.4) + (text_score * 0.6)
            
            if final_score >= threshold:
                similar.append({
                    'key': other.get('key'),
                    'summary': other.get('summary'),
                    'similarity': round(final_score, 3),
                    'status': other.get('status')
                })
        
        # Sort by similarity descending
        similar.sort(key=lambda x: x['similarity'], reverse=True)
        return similar[:10]  # Return top 10
    
    # ========================================================================
    # TICKET ANALYSIS
    # ========================================================================
    
    def analyze_priority_keywords(self, text: str) -> Dict:
        """Analyze if text contains priority-related keywords"""
        high_priority_words = {
            'urgent', 'critical', 'critical issue', 'critical error',
            'broken', 'down', 'offline', 'crash', 'fail', 'emergency',
            'asap', 'immediately', 'now', 'severe', 'major'
        }
        
        medium_priority_words = {
            'important', 'soon', 'needed', 'required', 'issue',
            'problem', 'help', 'need', 'please', 'quickly'
        }
        
        text_lower = text.lower()
        
        high_count = sum(1 for word in high_priority_words if word in text_lower)
        medium_count = sum(1 for word in medium_priority_words if word in text_lower)
        
        return {
            'high_priority_indicators': high_count,
            'medium_priority_indicators': medium_count,
            'suggested_priority': 'High' if high_count > 0 else ('Medium' if medium_count > 0 else 'Low')
        }
    
    def analyze_ticket_type(self, ticket: Dict) -> Dict:
        """Suggest ticket type based on content"""
        summary = ticket.get('summary', '').lower()
        description = ticket.get('description', '').lower()
        text = f"{summary} {description}"
        
        type_keywords = {
            'Bug': ['bug', 'error', 'broken', 'crash', 'fail', 'not working', 'issue'],
            'Feature Request': ['add', 'feature', 'new', 'implement', 'request', 'enhancement', 'wish'],
            'Improvement': ['improve', 'optimize', 'faster', 'better', 'performance', 'refactor'],
            'Documentation': ['document', 'doc', 'readme', 'guide', 'explain', 'howto'],
            'Question': ['how', 'what', 'why', 'help', 'support', 'assistance']
        }
        
        scores = {}
        for issue_type, keywords in type_keywords.items():
            score = sum(1 for kw in keywords if kw in text)
            if score > 0:
                scores[issue_type] = score
        
        suggested_type = max(scores, key=scores.get) if scores else 'Task'
        
        return {
            'suggested_type': suggested_type,
            'confidence': round(max(scores.values()) / 5 if scores else 0, 3),
            'type_scores': scores
        }
    
    def generate_summary(self, ticket: Dict) -> str:
        """Generate a brief summary of the ticket"""
        summary = ticket.get('summary', 'No summary')
        description = ticket.get('description', '')[:200]  # First 200 chars
        status = ticket.get('status', 'Unknown')
        assignee = ticket.get('assignee', 'Unassigned')
        
        return f"{summary} | {description}... | Status: {status} | Assigned to: {assignee}"
    
    def analyze_ticket(self, ticket: Dict) -> Dict:
        """Comprehensive ticket analysis"""
        cache_key = self.get_cache_key(ticket.get('key', ''))
        
        if self.is_cache_valid(cache_key):
            return self.cache[cache_key]['data']
        
        text = f"{ticket.get('summary', '')} {ticket.get('description', '')}"
        
        analysis = {
            'ticket_key': ticket.get('key'),
            'summary': self.generate_summary(ticket),
            'keywords': self.extract_keywords(text),
            'priority_analysis': self.analyze_priority_keywords(text),
            'type_analysis': self.analyze_ticket_type(ticket),
            'analysis_timestamp': datetime.now().isoformat(),
            'character_count': len(text),
            'word_count': len(text.split())
        }
        
        # Cache result
        self.cache[cache_key] = {
            'data': analysis,
            'timestamp': datetime.now()
        }
        
        return analysis
    
    # ========================================================================
    # BATCH OPERATIONS
    # ========================================================================
    
    def find_duplicates_batch(self, tickets: List[Dict]) -> List[Dict]:
        """Find duplicate tickets in batch"""
        duplicates = []
        
        for i, ticket in enumerate(tickets):
            if not ticket.get('summary'):
                continue
            
            similar = self.find_similar_tickets(ticket, tickets, threshold=0.6)
            if similar:
                duplicates.append({
                    'ticket_key': ticket.get('key'),
                    'summary': ticket.get('summary'),
                    'similar_tickets': similar,
                    'match_count': len(similar)
                })
        
        return duplicates
    
    def classify_tickets(self, tickets: List[Dict]) -> Dict:
        """Classify tickets by type"""
        classified = defaultdict(list)
        
        for ticket in tickets:
            analysis = self.analyze_ticket(ticket)
            ticket_type = analysis['type_analysis']['suggested_type']
            
            classified[ticket_type].append({
                'key': ticket.get('key'),
                'summary': ticket.get('summary'),
                'confidence': analysis['type_analysis']['confidence']
            })
        
        return dict(classified)
    
    # ========================================================================
    # HEALTH CHECK
    # ========================================================================
    
    def health_check(self) -> Dict:
        """Check engine status"""
        return {
            'status': 'healthy',
            'cache_entries': len(self.cache),
            'cache_ttl': self.cache_ttl,
            'version': '2.0',
            'timestamp': datetime.now().isoformat()
        }


# Singleton instance
ai_engine = SimpleAIEngine()
