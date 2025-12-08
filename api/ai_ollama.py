# api/ai_ollama.py
# Ollama Integration - Local LLaMA 2 AI (FREE & OFFLINE)
# No API costs, no internet required, runs locally

import requests
import logging
from typing import Optional, Dict, List
import json

logger = logging.getLogger(__name__)

class OllamaAIEngine:
    """
    Ollama AI Engine - Uses local LLaMA 2 model
    
    Requirements:
    - Ollama installed: https://ollama.ai
    - Run: ollama pull llama2
    - Run: ollama serve (in background)
    
    That's it! No API keys, no costs, completely offline.
    """
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.model = None
        self.is_available = self._check_availability()
        
        if self.is_available:
            # Auto-detect available model
            self.model = self._get_available_model()
            logger.info(f"✅ Ollama AI Engine initialized - Model: {self.model}")
        else:
            logger.warning("⚠️ Ollama not available. Install: ollama.ai")
    
    def _check_availability(self) -> bool:
        """Check if Ollama is running"""
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=2
            )
            return response.status_code == 200
        except:
            return False
    
    def _get_available_model(self) -> str:
        """Get the first available model from Ollama"""
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=2
            )
            if response.status_code == 200:
                data = response.json()
                models = data.get('models', [])
                if models:
                    # Priority: llama3.2 > llama2 > first available
                    for model in models:
                        model_name = model.get('name', '')
                        if 'llama3.2' in model_name:
                            logger.info(f"🤖 Selected model: {model_name}")
                            return model_name
                    for model in models:
                        model_name = model.get('name', '')
                        if 'llama' in model_name.lower():
                            logger.info(f"🤖 Selected model: {model_name}")
                            return model_name
                    # Fallback to first available
                    first_model = models[0].get('name', 'llama2')
                    logger.info(f"🤖 Selected model: {first_model}")
                    return first_model
        except Exception as e:
            logger.error(f"Error detecting Ollama model: {e}")
        
        # Default fallback
        return "llama2"
    
    def _call_ollama(self, prompt: str, max_tokens: int = 500, timeout: int = 20) -> Optional[str]:
        """Call Ollama API with prompt"""
        import time
        start_time = time.time()
        
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "num_predict": max_tokens,
                    "temperature": 0.7,
                },
                timeout=timeout
            )
            
            elapsed = time.time() - start_time
            logger.info(f"⏱️ Ollama response in {elapsed:.2f}s")
            
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "").strip()
            else:
                logger.error(f"Ollama error: {response.status_code}")
                return None
                
        except requests.exceptions.ConnectionError:
            logger.error("Cannot connect to Ollama. Make sure: ollama serve is running")
            return None
        except Exception as e:
            logger.error(f"Ollama call error: {e}")
            return None
    
    # ========================================================================
    # TICKET ANALYSIS
    # ========================================================================
    
    def analyze_ticket_with_ai(self, ticket: Dict) -> Dict:
        """Analyze ticket using Ollama AI"""
        if not self.is_available:
            return {
                'success': False,
                'error': 'Ollama not available',
                'hint': 'Install Ollama from https://ollama.ai and run: ollama serve'
            }
        
        try:
            summary = ticket.get('summary', '')
            description = ticket.get('description', '')
            
            prompt = f"""Analyze this JIRA ticket and provide a brief assessment:

SUMMARY: {summary}

DESCRIPTION: {description}

Provide:
1. Main issue identified
2. Suggested priority (Low/Medium/High/Critical)
3. Recommended ticket type (Bug/Feature/Improvement/Question)
4. Suggested action (1-2 sentences)

Keep it concise and actionable."""
            
            response = self._call_ollama(prompt, max_tokens=300)
            
            if response:
                return {
                    'success': True,
                    'analysis': response,
                    'ticket_key': ticket.get('key')
                }
            else:
                return {
                    'success': False,
                    'error': 'No response from Ollama'
                }
                
        except Exception as e:
            logger.error(f"AI analysis error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # ========================================================================
    # DUPLICATE DETECTION
    # ========================================================================
    
    def find_duplicates_with_ai(self, ticket: Dict, similar_tickets: List[Dict]) -> Dict:
        """Use AI to verify if tickets are really duplicates"""
        if not self.is_available or not similar_tickets:
            return {
                'success': False,
                'error': 'Ollama not available or no similar tickets'
            }
        
        try:
            ticket_text = f"{ticket.get('summary')} - {ticket.get('description', '')}"
            
            similar_text = "\n".join([
                f"- {t.get('key')}: {t.get('summary')}"
                for t in similar_tickets[:5]  # Top 5
            ])
            
            prompt = f"""Compare these tickets for duplication:

ORIGINAL TICKET:
{ticket_text}

SIMILAR TICKETS:
{similar_text}

Which ones are TRUE DUPLICATES? (Same issue, different reporters)
List by ticket key. Explain why (1-2 words per ticket)."""
            
            response = self._call_ollama(prompt, max_tokens=200)
            
            if response:
                return {
                    'success': True,
                    'duplicates_analysis': response,
                    'ticket_key': ticket.get('key'),
                    'tickets_checked': len(similar_tickets)
                }
            else:
                return {
                    'success': False,
                    'error': 'No response from Ollama'
                }
                
        except Exception as e:
            logger.error(f"Duplicate detection error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # ========================================================================
    # SUMMARY GENERATION
    # ========================================================================
    
    def generate_ticket_summary(self, ticket: Dict) -> Dict:
        """Generate AI summary of ticket"""
        if not self.is_available:
            return {
                'success': False,
                'error': 'Ollama not available'
            }
        
        try:
            summary = ticket.get('summary', '')
            description = ticket.get('description', '')
            comments = ticket.get('comments', [])
            
            comments_text = "\n".join([
                f"- {c.get('author')}: {c.get('body', '')[:100]}"
                for c in comments[:5]  # Last 5 comments
            ])
            
            prompt = f"""Summarize this JIRA ticket in 2-3 sentences:

TITLE: {summary}

DESCRIPTION: {description}

RECENT COMMENTS:
{comments_text}

Provide a clear, actionable summary."""
            
            response = self._call_ollama(prompt, max_tokens=150)
            
            if response:
                return {
                    'success': True,
                    'summary': response,
                    'ticket_key': ticket.get('key')
                }
            else:
                return {
                    'success': False,
                    'error': 'No response from Ollama'
                }
                
        except Exception as e:
            logger.error(f"Summary generation error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # ========================================================================
    # RESPONSE GENERATION
    # ========================================================================
    
    def generate_response_suggestion(self, ticket: Dict) -> Dict:
        """Generate suggested response to ticket"""
        if not self.is_available:
            return {
                'success': False,
                'error': 'Ollama not available'
            }
        
        try:
            summary = ticket.get('summary', '')
            description = ticket.get('description', '')
            status = ticket.get('status', 'Open')
            
            prompt = f"""Generate a professional response to this support ticket:

STATUS: {status}
SUMMARY: {summary}
DESCRIPTION: {description}

Write a helpful, professional response (2-3 sentences). Be empathetic and actionable."""
            
            response = self._call_ollama(prompt, max_tokens=200)
            
            if response:
                return {
                    'success': True,
                    'suggested_response': response,
                    'ticket_key': ticket.get('key')
                }
            else:
                return {
                    'success': False,
                    'error': 'No response from Ollama'
                }
                
        except Exception as e:
            logger.error(f"Response generation error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # ========================================================================
    # HEALTH CHECK
    # ========================================================================
    
    def health_check(self) -> Dict:
        """Check Ollama status"""
        return {
            'status': 'available' if self.is_available else 'unavailable',
            'model': self.model,
            'base_url': self.base_url,
            'available': self.is_available,
            'setup_url': 'https://ollama.ai',
            'setup_command': 'ollama pull llama2 && ollama serve'
        }


# Singleton instance
ollama_engine = OllamaAIEngine()
