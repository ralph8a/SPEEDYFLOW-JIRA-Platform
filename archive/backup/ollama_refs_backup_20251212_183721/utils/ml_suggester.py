"""
ML Suggester - Semantic Similarity Based Recommendations
=========================================================
Usa embeddings multilingües para encontrar tickets similares y sugerir
severity/priority basado en votación por mayoría.

Ventajas:
- Entiende semántica (no solo keywords)
- Multilingüe (español/inglés)
- Sin entrenamiento necesario
- Explicable (muestra tickets similares)

Tecnología:
- Sentence-BERT (paraphrase-multilingual-MiniLM-L12-v2)
- ~400MB modelo, ~500ms por predicción
"""
import json
import logging
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from collections import Counter

logger = logging.getLogger(__name__)

# Lazy imports para no cargar en cada request
_sentence_transformer = None
_cosine_similarity = None


def _get_transformer():
    """Lazy load de SentenceTransformer"""
    global _sentence_transformer
    if _sentence_transformer is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading multilingual sentence transformer model...")
            _sentence_transformer = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            logger.info("✓ Model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load sentence transformer: {e}")
            logger.error("Install with: pip install sentence-transformers")
            raise
    return _sentence_transformer


def _get_cosine_similarity():
    """Lazy load de cosine_similarity"""
    global _cosine_similarity
    if _cosine_similarity is None:
        from sklearn.metrics.pairwise import cosine_similarity
        _cosine_similarity = cosine_similarity
    return _cosine_similarity


class MLSuggester:
    """ML-based suggester using semantic similarity"""
    
    def __init__(self, cache_dir: str = "data/cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.embeddings_file = self.cache_dir / "embeddings.npy"
        self.embeddings_metadata_file = self.cache_dir / "embeddings_metadata.json"
        
        self.embeddings = None
        self.issues_data = None
        self.model = None
        
        logger.info(f"ML Suggester initialized: {self.cache_dir}")
    
    def _load_embeddings_cache(self) -> bool:
        """Load pre-computed embeddings from cache"""
        if not self.embeddings_file.exists() or not self.embeddings_metadata_file.exists():
            return False
        
        try:
            self.embeddings = np.load(self.embeddings_file)
            with open(self.embeddings_metadata_file, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            self.issues_data = metadata['issues_data']
            
            logger.info(f"✓ Loaded {len(self.issues_data)} embeddings from cache")
            return True
        except Exception as e:
            logger.error(f"Failed to load embeddings cache: {e}")
            return False
    
    def _save_embeddings_cache(self):
        """Save embeddings to cache"""
        try:
            np.save(self.embeddings_file, self.embeddings)
            
            metadata = {
                'total_issues': len(self.issues_data),
                'created_at': str(np.datetime64('now')),
                'issues_data': self.issues_data
            }
            
            with open(self.embeddings_metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)
            
            logger.info(f"✓ Saved {len(self.issues_data)} embeddings to cache")
        except Exception as e:
            logger.error(f"Failed to save embeddings cache: {e}")
    
    def index_issues(self, issues: List[Dict], force_reindex: bool = False):
        """
        Create embedding index from issues
        
        Args:
            issues: List of issue dicts with 'summary', 'description', 'severity', 'priority'
            force_reindex: Force recomputation even if cache exists
        """
        # Try loading from cache first
        if not force_reindex and self._load_embeddings_cache():
            return
        
        logger.info(f"Indexing {len(issues)} issues...")
        print(f"🧠 Generating embeddings for {len(issues)} tickets...")
        
        # Initialize model
        if self.model is None:
            self.model = _get_transformer()
        
        # Extract text and metadata
        texts = []
        self.issues_data = []
        
        for issue in issues:
            summary = issue.get('summary', '')
            description = issue.get('description', '')
            
            # Combine summary + description (limit description to avoid too long texts)
            text = f"{summary} {description[:500] if description else ''}"
            texts.append(text)
            
            # Store metadata
            self.issues_data.append({
                'key': issue.get('key'),
                'summary': summary,
                'severity': issue.get('severity'),
                'priority': issue.get('priority'),
                'status': issue.get('status'),
                'created_at': issue.get('created_at')
            })
        
        # Generate embeddings (batch processing con batch_size para velocidad)
        logger.info("Encoding texts to embeddings...")
        self.embeddings = self.model.encode(
            texts,
            batch_size=64,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        
        # Save to cache
        self._save_embeddings_cache()
        
        logger.info(f"✓ Indexed {len(issues)} issues")
        print(f"✓ Embeddings generated and cached")
    
    def suggest_field(
        self,
        text: str,
        field_type: str,
        top_k: int = 10,
        min_confidence: float = 0.3
    ) -> Optional[Tuple[str, float, str, List[Dict]]]:
        """
        Suggest field value based on similar tickets
        
        Args:
            text: Issue summary + description
            field_type: 'severity' or 'priority'
            top_k: Number of similar tickets to consider
            min_confidence: Minimum confidence threshold
        
        Returns:
            (value, confidence, reason, similar_tickets) or None
        """
        if self.embeddings is None or self.issues_data is None:
            logger.warning("Embeddings not loaded. Call index_issues() first.")
            return None
        
        # Initialize model if needed
        if self.model is None:
            self.model = _get_transformer()
        
        # Encode query text
        query_embedding = self.model.encode([text], convert_to_numpy=True)
        
        # Calculate similarities
        cosine_sim = _get_cosine_similarity()
        similarities = cosine_sim(query_embedding, self.embeddings)[0]
        
        # Get top K similar tickets
        top_indices = similarities.argsort()[-top_k:][::-1]
        top_similarities = similarities[top_indices]
        
        similar_tickets = []
        for idx, sim in zip(top_indices, top_similarities):
            ticket = self.issues_data[idx].copy()
            ticket['similarity'] = float(sim)
            similar_tickets.append(ticket)
        
        # Filter tickets with valid field values
        valid_tickets = [
            t for t in similar_tickets 
            if t.get(field_type) is not None and t['similarity'] > 0.3
        ]
        
        if not valid_tickets:
            logger.debug(f"No similar tickets found for {field_type}")
            return None
        
        # Vote by majority (weighted by similarity)
        weighted_votes = {}
        total_weight = 0
        
        for ticket in valid_tickets:
            value = ticket[field_type]
            weight = ticket['similarity']
            
            if value not in weighted_votes:
                weighted_votes[value] = 0
            weighted_votes[value] += weight
            total_weight += weight
        
        # Get winner
        if not weighted_votes:
            return None
        
        winner = max(weighted_votes.items(), key=lambda x: x[1])
        value = winner[0]
        confidence = winner[1] / total_weight if total_weight > 0 else 0
        
        if confidence < min_confidence:
            logger.debug(f"Confidence too low: {confidence:.2f} < {min_confidence}")
            return None
        
        # Build explanation
        count = sum(1 for t in valid_tickets if t[field_type] == value)
        avg_similarity = np.mean([t['similarity'] for t in valid_tickets if t[field_type] == value])
        
        reason = f"Based on {count}/{len(valid_tickets)} similar tickets (avg similarity: {avg_similarity:.0%})"
        
        # Return top 3 most similar tickets for explanation
        explanation_tickets = [
            {
                'key': t['key'],
                'summary': t['summary'],
                'similarity': f"{t['similarity']:.0%}",
                field_type: t.get(field_type)
            }
            for t in valid_tickets[:3]
        ]
        
        logger.info(f"Suggested {field_type}={value} with confidence {confidence:.0%}")
        
        return (value, confidence, reason, explanation_tickets)
    
    def suggest_severity(self, text: str, top_k: int = 10) -> Optional[Tuple[str, float, str, List[Dict]]]:
        """Suggest severity based on similar tickets"""
        return self.suggest_field(text, 'severity', top_k)
    
    def suggest_priority(self, text: str, top_k: int = 10) -> Optional[Tuple[str, float, str, List[Dict]]]:
        """Suggest priority based on similar tickets"""
        return self.suggest_field(text, 'priority', top_k)
    
    def is_ready(self) -> bool:
        """Check if suggester is ready to make predictions"""
        return self.embeddings is not None and self.issues_data is not None


# Global instance
_ml_suggester = None


def get_ml_suggester() -> MLSuggester:
    """Get global ML suggester instance"""
    global _ml_suggester
    if _ml_suggester is None:
        _ml_suggester = MLSuggester()
    return _ml_suggester
