"""
Predictor Unificado - Integra todos los modelos ML/IA de SPEEDYFLOW
"""
import numpy as np
from pathlib import Path
import pickle
import time
import hashlib
import psutil
import logging
from typing import Dict, List, Optional, Any
from functools import lru_cache

logger = logging.getLogger(__name__)

class UnifiedMLPredictor:
    """
    Predictor unificado que integra:
    - Modelos Keras (6 modelos)
    - SimpleAIEngine (rule-based)
    - ML Suggester (TF-IDF)
    """
    
    def __init__(self, models_dir: str = "../models", fallback_mode: bool = False):
        self.models_dir = Path(models_dir)
        self.models = {}
        self.encoders = {}
        self.nlp = None
        self.fallback_mode = fallback_mode
        self.start_time = time.time()
        
        # Métricas
        self.prediction_count = 0
        self.cache_hits = 0
        self.cache_misses = 0
        self.avg_latency_ms = 0
        self._cache = {}
        
        # Cargar modelos
        self._load_models()
    
    def _load_models(self):
        """Cargar todos los modelos disponibles"""
        logger.info("Cargando modelos ML...")
        
        # Prepare list of keras model filenames (defined even if TF not available)
        keras_models = {
            'duplicate_detector': 'duplicate_detector.keras',
            'priority_classifier': 'priority_classifier.keras',
            'breach_predictor': 'breach_predictor.keras',
            'assignee_suggester': 'assignee_suggester.keras',
            'labels_suggester': 'labels_suggester.keras',
            'status_suggester': 'status_suggester.keras',
            'comment_suggester': 'comment_suggester.keras',
        }

        # 1. Cargar spaCy (necesario para embeddings)
        try:
            import spacy
            # try loading both Spanish and English models
            try:
                self.nlp_es = spacy.load("es_core_news_md", disable=["ner"])
                logger.info("✅ spaCy Spanish model loaded")
            except Exception:
                self.nlp_es = None
                logger.warning("spaCy Spanish model not available")
            try:
                self.nlp_en = spacy.load("en_core_web_md", disable=["ner"])
                logger.info("✅ spaCy English model loaded")
            except Exception:
                self.nlp_en = None
                logger.warning("spaCy English model not available")
            # prefer Spanish if available for legacy behavior
            self.nlp = self.nlp_es or self.nlp_en
            logger.info("✅ spaCy loaded (preferred model set)")
            # try to load sentence-transformers multilingual model for better embeddings
            try:
                from sentence_transformers import SentenceTransformer
                self.st_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
                logger.info("✅ sentence-transformers multilingual model loaded")
            except Exception as e:
                self.st_model = None
                logger.warning(f"sentence-transformers not available: {e}")
        except Exception as e:
            logger.warning(f"⚠️ spaCy no disponible: {e}")
            if not self.fallback_mode:
                raise
        
        # 2. Cargar TensorFlow/Keras
        try:
            import tensorflow as tf
            from tensorflow import keras
            
            
            for name, filename in keras_models.items():
                path = self.models_dir / filename
                if path.exists():
                    try:
                        self.models[name] = keras.models.load_model(path)
                        logger.info(f"✅ {name} cargado")
                    except Exception as e:
                        logger.warning(f"⚠️ Error cargando {name}: {e}")
                else:
                    logger.warning(f"⚠️ {name} no encontrado en {path}")
            
        except Exception as e:
            logger.warning(f"⚠️ TensorFlow no disponible: {e}")
            if not self.fallback_mode:
                raise
        
        # 3. Cargar encoders/binarizers
        encoders_map = {
            'label_encoders': 'label_encoders.pkl',
            'assignee_encoder': 'assignee_encoder.pkl',
            'labels_binarizer': 'labels_binarizer.pkl',
            'status_encoder': 'status_encoder.pkl',
            'comment_labels_binarizer': 'comment_labels_binarizer.pkl',
        }
        
        for name, filename in encoders_map.items():
            path = self.models_dir / filename
            if path.exists():
                try:
                    with open(path, 'rb') as f:
                        self.encoders[name] = pickle.load(f)
                    logger.info(f"✅ {name} cargado")
                except Exception as e:
                    logger.warning(f"⚠️ Error cargando {name}: {e}")
        
        logger.info(f"📊 Modelos cargados: {len(self.models)}/{len(keras_models)}")
    
    def get_embedding(self, text: str, max_length: int = 512) -> np.ndarray:
        """Generar embedding de texto con spaCy"""
        if not text:
            return np.zeros(300)
        # try language detection
        lang = None
        try:
            from langdetect import detect
            lang = detect(text)
        except Exception:
            # fallback heuristic: accented chars -> es
            lang = 'es' if re.search(r'[\u00C0-\u017F]', text) else 'en'
        # Prefer sentence-transformers if available
        if getattr(self, 'st_model', None):
            try:
                vec = self.st_model.encode([text], show_progress_bar=False)[0]
                return vec
            except Exception:
                pass

        if lang and lang.startswith('es') and getattr(self, 'nlp_es', None):
            doc = self.nlp_es(str(text)[:max_length])
        elif lang and lang.startswith('en') and getattr(self, 'nlp_en', None):
            doc = self.nlp_en(str(text)[:max_length])
        elif getattr(self, 'nlp', None):
            doc = self.nlp(str(text)[:max_length])
        else:
            return np.zeros(300)

        return doc.vector
    
    def _get_cache_key(self, summary: str, description: str) -> str:
        """Generar key para caché"""
        text = f"{summary}|{description}"
        return hashlib.md5(text.encode()).hexdigest()
    
    def _check_cache(self, cache_key: str) -> Optional[Dict]:
        """Verificar si existe en caché"""
        if cache_key in self._cache:
            self.cache_hits += 1
            return self._cache[cache_key]
        self.cache_misses += 1
        return None
    
    def _save_cache(self, cache_key: str, result: Dict):
        """Guardar en caché"""
        # Máximo 1000 items en caché
        if len(self._cache) > 1000:
            # Eliminar 25% más antiguos
            keys_to_remove = list(self._cache.keys())[:250]
            for key in keys_to_remove:
                del self._cache[key]
        
        self._cache[cache_key] = result
    
    def predict_duplicate(self, summary: str, description: str = "") -> Dict:
        """Detectar duplicados"""
        if 'duplicate_detector' not in self.models:
            return {
                "is_duplicate": False,
                "confidence": 0.0,
                "similar_tickets": []
            }
        
        text = f"{summary}. {description}" if description else summary
        emb = self.get_embedding(text).reshape(1, -1)
        
        pred = self.models['duplicate_detector'].predict(emb, verbose=0)[0]
        
        # Decodificar con label_encoders
        if 'label_encoders' in self.encoders and 'category' in self.encoders['label_encoders']:
            category_encoder = self.encoders['label_encoders']['category']
            classes = category_encoder.classes_
            probas = {classes[i]: float(pred[i]) for i in range(len(classes))}
            predicted = classes[np.argmax(pred)]
        else:
            probas = {"active": float(pred[0]), "discarded": float(pred[1]) if len(pred) > 1 else 0.0}
            predicted = "active" if pred[0] > 0.5 else "discarded"
        
        return {
            "is_duplicate": predicted == "discarded",
            "confidence": max(probas.values()),
            "similar_tickets": []  # TODO: Implementar búsqueda de similares
        }
    
    def predict_priority(self, summary: str, description: str = "") -> Dict:
        """Sugerir prioridad"""
        if 'priority_classifier' not in self.models:
            return {
                "suggested_priority": "Medium",
                "confidence": 0.5,
                "probabilities": {}
            }
        
        text = f"{summary}. {description}" if description else summary
        emb = self.get_embedding(text).reshape(1, -1)
        
        pred = self.models['priority_classifier'].predict(emb, verbose=0)[0]
        
        # Decodificar
        if 'label_encoders' in self.encoders and 'priority' in self.encoders['label_encoders']:
            priority_encoder = self.encoders['label_encoders']['priority']
            classes = priority_encoder.classes_
            predicted = classes[np.argmax(pred)]
            confidence = float(pred[np.argmax(pred)])
            probas = {classes[i]: float(pred[i]) for i in range(len(classes))}
        else:
            predicted = "Medium"
            confidence = 0.5
            probas = {}
        
        return {
            "suggested_priority": predicted,
            "confidence": confidence,
            "probabilities": probas
        }
    
    def predict_sla_breach(self, summary: str, description: str = "") -> Dict:
        """Predecir violación de SLA"""
        if 'breach_predictor' not in self.models:
            return {
                "will_breach": False,
                "breach_probability": 0.0,
                "risk_level": "LOW"
            }
        
        text = f"{summary}. {description}" if description else summary
        emb = self.get_embedding(text).reshape(1, -1)
        
        pred = self.models['breach_predictor'].predict(emb, verbose=0)[0][0]
        
        risk_level = "HIGH" if pred > 0.7 else "MEDIUM" if pred > 0.4 else "LOW"
        
        return {
            "will_breach": pred > 0.5,
            "breach_probability": float(pred),
            "risk_level": risk_level
        }
    
    def suggest_assignee(self, summary: str, description: str = "", top_k: int = 3) -> Dict:
        """Sugerir asignados"""
        if 'assignee_suggester' not in self.models:
            return {
                "suggestions": [],
                "top_choice": None
            }
        
        text = f"{summary}. {description}" if description else summary
        emb = self.get_embedding(text).reshape(1, -1)
        
        pred = self.models['assignee_suggester'].predict(emb, verbose=0)[0]
        
        if 'assignee_encoder' in self.encoders:
            encoder = self.encoders['assignee_encoder']
            classes = encoder.classes_
            top_indices = np.argsort(pred)[-top_k:][::-1]
            
            suggestions = [
                {
                    "assignee": classes[i],
                    "confidence": float(pred[i])
                }
                for i in top_indices
            ]
        else:
            suggestions = []
        
        return {
            "suggestions": suggestions,
            "top_choice": suggestions[0] if suggestions else None
        }
    
    def suggest_labels(self, summary: str, description: str = "", threshold: float = 0.3) -> Dict:
        """Sugerir labels"""
        if 'labels_suggester' not in self.models:
            return {
                "suggested_labels": [],
                "count": 0
            }
        
        text = f"{summary}. {description}" if description else summary
        emb = self.get_embedding(text).reshape(1, -1)
        
        pred = self.models['labels_suggester'].predict(emb, verbose=0)[0]
        
        if 'labels_binarizer' in self.encoders:
            binarizer = self.encoders['labels_binarizer']
            classes = binarizer.classes_
            
            suggested = [
                {
                    "label": classes[i],
                    "confidence": float(pred[i])
                }
                for i in range(len(pred))
                if pred[i] > threshold
            ]
            suggested.sort(key=lambda x: x['confidence'], reverse=True)
        else:
            suggested = []
        
        return {
            "suggested_labels": suggested,
            "count": len(suggested)
        }
    
    def suggest_status(self, summary: str, description: str = "") -> Dict:
        """Sugerir siguiente estado"""
        if 'status_suggester' not in self.models:
            return {
                "suggested_status": "Unknown",
                "confidence": 0.0,
                "probabilities": {}
            }
        
        text = f"{summary}. {description}" if description else summary
        emb = self.get_embedding(text).reshape(1, -1)
        
        pred = self.models['status_suggester'].predict(emb, verbose=0)[0]
        
        if 'status_encoder' in self.encoders:
            encoder = self.encoders['status_encoder']
            classes = encoder.classes_
            predicted = classes[np.argmax(pred)]
            confidence = float(pred[np.argmax(pred)])
            probas = {classes[i]: float(pred[i]) for i in range(len(classes))}
        else:
            predicted = "Unknown"
            confidence = 0.0
            probas = {}
        
        return {
            "suggested_status": predicted,
            "confidence": confidence,
            "probabilities": probas
        }

    def suggest_comment_patterns(self, summary: str, comments: str = "", threshold: float = 0.5) -> Dict:
        """Predict conversation/comment patterns (multi-label)"""
        if 'comment_suggester' not in self.models:
            return {"labels": [], "probabilities": {}}

        text = f"{summary}. {comments}" if comments else summary
        emb = self.get_embedding(text).reshape(1, -1)

        pred = self.models['comment_suggester'].predict(emb, verbose=0)[0]

        labels = []
        probas = {}
        if 'comment_labels_binarizer' in self.encoders:
            mlb = self.encoders['comment_labels_binarizer']
            classes = mlb.classes_
            for i, p in enumerate(pred):
                probas[classes[i]] = float(p)
                if p >= threshold:
                    labels.append(classes[i])
        else:
            # fallback: top-k
            top_indices = (-pred).argsort()[:3]
            for i in top_indices:
                probas[str(i)] = float(pred[i])
                labels.append(str(i))

        return {"labels": labels, "probabilities": probas}
    
    def predict_all(self, summary: str, description: str = "") -> Dict:
        """Obtener todas las predicciones de una vez"""
        # Verificar caché
        cache_key = self._get_cache_key(summary, description)
        cached = self._check_cache(cache_key)
        if cached:
            return cached
        
        # Generar todas las predicciones
        result = {
            "duplicate_check": self.predict_duplicate(summary, description),
            "priority": self.predict_priority(summary, description),
            "sla_breach": self.predict_sla_breach(summary, description),
            "assignee": self.suggest_assignee(summary, description),
            "labels": self.suggest_labels(summary, description),
            "status": self.suggest_status(summary, description)
        }
        
        # Guardar en caché
        self._save_cache(cache_key, result)
        
        # Actualizar métricas
        self.prediction_count += 1
        
        return result
    
    def get_loaded_models(self) -> List[str]:
        """Listar modelos cargados"""
        return list(self.models.keys())
    
    def get_memory_usage(self) -> float:
        """Obtener uso de memoria en MB"""
        process = psutil.Process()
        return process.memory_info().rss / 1024 / 1024
    
    def get_cache_size(self) -> int:
        """Tamaño del caché"""
        return len(self._cache)
    
    def clear_cache(self):
        """Limpiar caché"""
        self._cache.clear()
        logger.info("Cache cleared")
