"""
Ollama Client - Interfaz para interactuar con Ollama
Proporciona embeddings, generación de texto y análisis semántico
"""
import requests
import logging
import json
from typing import List, Dict, Optional, Any
from functools import lru_cache
import numpy as np
logger = logging.getLogger(__name__)
class OllamaClient:
    """Cliente para interactuar con Ollama API"""
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.timeout = 30
    def is_available(self) -> bool:
        """Verificar si Ollama está disponible"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=2)
            return response.status_code == 200
        except Exception:
            return False
    def list_models(self) -> List[str]:
        """Listar modelos disponibles en Ollama"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return [model['name'] for model in data.get('models', [])]
            return []
        except Exception as e:
            logger.error(f"Error listing Ollama models: {e}")
            return []
    def generate_embedding(self, text: str, model: str = "nomic-embed-text") -> Optional[List[float]]:
        """
        Generar embedding para un texto
        Args:
            text: Texto para generar embedding
            model: Modelo a usar (default: nomic-embed-text)
        Returns:
            Lista de floats representando el embedding o None si falla
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/embeddings",
                json={
                    "model": model,
                    "prompt": text
                },
                timeout=self.timeout
            )
            if response.status_code == 200:
                data = response.json()
                return data.get('embedding')
            else:
                logger.error(f"Ollama embedding failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return None
    def generate_embeddings_batch(self, texts: List[str], model: str = "nomic-embed-text") -> List[Optional[List[float]]]:
        """
        Generar embeddings para múltiples textos
        Args:
            texts: Lista de textos
            model: Modelo a usar
        Returns:
            Lista de embeddings
        """
        embeddings = []
        for text in texts:
            embedding = self.generate_embedding(text, model)
            embeddings.append(embedding)
        return embeddings
    def generate_text(
        self, 
        prompt: str, 
        model: str = "llama3.2",
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> Optional[str]:
        """
        Generar texto usando un modelo de Ollama
        Args:
            prompt: Prompt para el modelo
            model: Modelo a usar
            system: System prompt opcional
            temperature: Temperatura para generación (0.0-1.0)
            max_tokens: Límite de tokens opcional
        Returns:
            Texto generado o None si falla
        """
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature
                }
            }
            if system:
                payload["system"] = system
            if max_tokens:
                payload["options"]["num_predict"] = max_tokens
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.timeout
            )
            if response.status_code == 200:
                data = response.json()
                return data.get('response', '').strip()
            else:
                logger.error(f"Ollama generation failed: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error generating text: {e}")
            return None
    def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3.2",
        temperature: float = 0.7
    ) -> Optional[str]:
        """
        Chat con formato conversacional
        Args:
            messages: Lista de mensajes [{"role": "user|assistant|system", "content": "..."}]
            model: Modelo a usar
            temperature: Temperatura
        Returns:
            Respuesta del modelo
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": temperature
                    }
                },
                timeout=self.timeout
            )
            if response.status_code == 200:
                data = response.json()
                return data.get('message', {}).get('content', '').strip()
            else:
                logger.error(f"Ollama chat failed: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error in chat: {e}")
            return None
    @staticmethod
    def cosine_similarity(embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calcular similitud coseno entre dos embeddings
        Args:
            embedding1: Primer embedding
            embedding2: Segundo embedding
        Returns:
            Similitud coseno (0.0 a 1.0)
        """
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(dot_product / (norm1 * norm2))
    @staticmethod
    def cosine_similarity_batch(embedding: List[float], embeddings: List[List[float]]) -> List[float]:
        """
        Calcular similitud coseno entre un embedding y múltiples embeddings
        Args:
            embedding: Embedding de consulta
            embeddings: Lista de embeddings para comparar
        Returns:
            Lista de similitudes
        """
        vec = np.array(embedding)
        vecs = np.array(embeddings)
        dot_products = np.dot(vecs, vec)
        norms = np.linalg.norm(vecs, axis=1) * np.linalg.norm(vec)
        # Evitar división por cero
        norms = np.where(norms == 0, 1e-10, norms)
        similarities = dot_products / norms
        return similarities.tolist()
# Singleton global
_ollama_client = None
def get_ollama_client() -> OllamaClient:
    """Obtener instancia global del cliente de Ollama"""
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = OllamaClient()
    return _ollama_client
def ensure_ollama_available() -> bool:
    """
    Verificar que Ollama esté disponible
    Returns:
        True si está disponible, False otherwise
    """
    client = get_ollama_client()
    is_available = client.is_available()
    if not is_available:
        logger.warning("⚠️ Ollama no está disponible en http://localhost:11434")
        logger.warning("   Para usar funcionalidades de IA, inicia Ollama:")
        logger.warning("   $ ollama serve")
    else:
        models = client.list_models()
        logger.info(f"✅ Ollama disponible con {len(models)} modelos: {', '.join(models[:3])}")
    return is_available
