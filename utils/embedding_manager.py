"""
Embedding Manager - Gestor de embeddings para búsqueda semántica
Cachea embeddings de tickets y proporciona búsqueda por similitud
"""

import json
import gzip
import logging
import os
from typing import List, Dict, Optional, Tuple
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

# Ruta al cache de embeddings
EMBEDDINGS_CACHE_PATH = Path(__file__).parent.parent / "data" / "cache" / "embeddings.json"
ISSUES_CACHE_PATH = Path(__file__).parent.parent / "data" / "cache" / "msm_issues.json.gz"  # Compressed cache

class EmbeddingManager:
    """Gestor de embeddings con cache persistente.

    NOTE: Ollama/embedding provider has been disabled in this deployment.
    All embedding-related methods will log a warning and return empty/None.
    """

    def __init__(self):
        # embeddings feature disabled flag
        self.embeddings_enabled = False
        self.embeddings_cache: Dict[str, Dict] = {}
        self.load_cache()
    
    def load_cache(self):
        """Cargar cache de embeddings desde disco"""
        if EMBEDDINGS_CACHE_PATH.exists():
            try:
                with open(EMBEDDINGS_CACHE_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.embeddings_cache = data.get('embeddings', {})
                    logger.info(f"✅ Loaded {len(self.embeddings_cache)} cached embeddings")
            except Exception as e:
                logger.error(f"Error loading embeddings cache: {e}")
                self.embeddings_cache = {}
        else:
            logger.info("No embeddings cache found, will create new one")
            self.embeddings_cache = {}
    
    def save_cache(self):
        """Guardar cache de embeddings a disco"""
        try:
            EMBEDDINGS_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(EMBEDDINGS_CACHE_PATH, 'w', encoding='utf-8') as f:
                json.dump({
                    'embeddings': self.embeddings_cache,
                    'updated_at': datetime.now().isoformat(),
                    'count': len(self.embeddings_cache)
                }, f, ensure_ascii=False, indent=2)
            logger.info(f"✅ Saved {len(self.embeddings_cache)} embeddings to cache")
        except Exception as e:
            logger.error(f"Error saving embeddings cache: {e}")
    
    def get_issue_text(self, issue: Dict) -> str:
        """
        Extraer texto relevante de un issue para embedding
        
        Args:
            issue: Dict con datos del issue
        
        Returns:
            Texto concatenado para embedding
        """
        parts = []
        
        # Summary (más importante)
        if 'summary' in issue:
            parts.append(issue['summary'])
        elif 'fields' in issue and 'summary' in issue['fields']:
            parts.append(issue['fields']['summary'])
        
        # Description
        if 'description' in issue and issue['description']:
            parts.append(str(issue['description'])[:500])  # Limitar a 500 chars
        elif 'fields' in issue and 'description' in issue['fields']:
            desc = issue['fields']['description']
            if desc:
                parts.append(str(desc)[:500])
        
        # Type
        if 'issue_type' in issue:
            parts.append(f"Type: {issue['issue_type']}")
        elif 'fields' in issue and 'issuetype' in issue['fields']:
            issue_type = issue['fields']['issuetype']
            if isinstance(issue_type, dict):
                parts.append(f"Type: {issue_type.get('name', '')}")
        
        return ' | '.join(parts)
    
    def get_embedding(self, issue_key: str, issue_data: Optional[Dict] = None) -> Optional[List[float]]:
        """
        Obtener embedding para un issue
        
        Args:
            issue_key: Key del issue (ej: MSM-123)
            issue_data: Datos del issue (opcional, se busca en cache si no se provee)
        
        Returns:
            Embedding o None si falla
        """
        # Verificar cache
        if issue_key in self.embeddings_cache:
            cached = self.embeddings_cache[issue_key]
            return cached.get('embedding')
        
        # Si no hay datos del issue, intentar cargarlos
        if not issue_data:
            issue_data = self.find_issue_in_cache(issue_key)
            if not issue_data:
                logger.warning(f"Issue {issue_key} not found in cache")
                return None
        
        # Generar embedding
        text = self.get_issue_text(issue_data)
        if not text:
            logger.warning(f"No text extracted for {issue_key}")
            return None

        # Embedding provider disabled — do not attempt generation
        return None
    
    def find_issue_in_cache(self, issue_key: str) -> Optional[Dict]:
        """
        Buscar issue en el cache de issues
        
        Args:
            issue_key: Key del issue
        
        Returns:
            Datos del issue o None
        """
        # Try compressed version first
        if ISSUES_CACHE_PATH.exists():
            try:
                with gzip.open(ISSUES_CACHE_PATH, 'rt', encoding='utf-8') as f:
                    data = json.load(f)
                    issues = data.get('issues', [])
                    
                    for issue in issues:
                        if issue.get('key') == issue_key:
                            return issue
            except Exception as e:
                logger.error(f"Error reading compressed issues cache: {e}")
        
        # Fallback to uncompressed version
        uncompressed_path = ISSUES_CACHE_PATH.with_suffix('')
        if uncompressed_path.exists():
            try:
                with open(uncompressed_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    issues = data.get('issues', [])
                    
                    for issue in issues:
                        if issue.get('key') == issue_key:
                            return issue
            except Exception as e:
                logger.error(f"Error reading uncompressed issues cache: {e}")
        
        return None
    
    def find_similar_issues(
        self,
        query_text: str,
        top_k: int = 5,
        min_similarity: float = 0.5,
        filter_keys: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Buscar issues similares a un texto de consulta
        
        Args:
            query_text: Texto de búsqueda
            top_k: Cantidad de resultados a retornar
            min_similarity: Similitud mínima (0.0-1.0)
            filter_keys: Lista de issue keys para filtrar (opcional)
        
        Returns:
            Lista de issues similares con scores
        """
        # Embeddings disabled — return empty results
        return []
        
        # Calcular similitudes
        results = []
        for issue_key, cached in self.embeddings_cache.items():
            # Filtrar si es necesario
            if filter_keys and issue_key not in filter_keys:
                continue
            
            embedding = cached.get('embedding')
            if not embedding:
                continue
            
            similarity = self.ollama.cosine_similarity(query_embedding, embedding)
            
            if similarity >= min_similarity:
                results.append({
                    'issue_key': issue_key,
                    'similarity': similarity,
                    'text_preview': cached.get('text', '')
                })
        
        # Ordenar por similitud y tomar top_k
        results.sort(key=lambda x: x['similarity'], reverse=True)
        return results[:top_k]
    
    def generate_embeddings_for_all_issues(self, limit: Optional[int] = None):
        """
        Generar embeddings para todos los issues en cache
        
        Args:
            limit: Límite de issues a procesar (None = todos)
        """
        if not ISSUES_CACHE_PATH.exists():
            logger.error("Issues cache not found")
            return
        
        # Embeddings disabled — nothing to do
        return
        
        try:
            with open(ISSUES_CACHE_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                issues = data.get('issues', [])
            
            total = len(issues) if not limit else min(len(issues), limit)
            logger.info(f"🚀 Generating embeddings for {total} issues...")
            
            processed = 0
            skipped = 0
            
            for i, issue in enumerate(issues[:total] if limit else issues):
                issue_key = issue.get('key')
                if not issue_key:
                    continue
                
                # Skip si ya existe
                if issue_key in self.embeddings_cache:
                    skipped += 1
                    continue
                
                # Generar embedding
                self.get_embedding(issue_key, issue)
                processed += 1
                
                # Guardar cada 100 issues
                if processed % 100 == 0:
                    self.save_cache()
                    logger.info(f"  Progress: {processed}/{total} ({skipped} skipped)")
            
            # Guardar final
            self.save_cache()
            logger.info(f"✅ Completed: {processed} generated, {skipped} skipped")
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")

# Singleton global
_embedding_manager = None

def get_embedding_manager() -> EmbeddingManager:
    """Obtener instancia global del gestor de embeddings"""
    global _embedding_manager
    if _embedding_manager is None:
        _embedding_manager = EmbeddingManager()
    return _embedding_manager

def search_similar_issues(query: str, top_k: int = 5, min_similarity: float = 0.5) -> List[Dict]:
    """
    Helper function para buscar issues similares
    
    Args:
        query: Texto de búsqueda
        top_k: Cantidad de resultados
        min_similarity: Similitud mínima
    
    Returns:
        Lista de issues similares
    """
    manager = get_embedding_manager()
    return manager.find_similar_issues(query, top_k, min_similarity)
