#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
API de Inferencia ML - SPEEDYFLOW
Usar modelos entrenados para hacer predicciones en tiempo real
"""
import numpy as np
from pathlib import Path
import pickle
class SpeedyflowMLPredictor:
    """Predictor unificado para todos los modelos ML de SPEEDYFLOW"""
    def __init__(self, models_dir="C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/models"):
        self.models_dir = Path(models_dir)
        self.models = {}
        self.encoders = {}
        self.nlp = None
        self._load_models()
    def _load_models(self):
        """Cargar todos los modelos y encoders"""
        try:
            import spacy
            self.nlp = spacy.load("es_core_news_md")
            print("✅ spaCy cargado")
        except:
            print("❌ Error: spaCy no disponible")
            return
        try:
            import tensorflow as tf
            from tensorflow import keras
            # Cargar modelos
            models_to_load = {
                'duplicate_detector': 'duplicate_detector.keras',
                'priority_classifier': 'priority_classifier.keras',
                'breach_predictor': 'breach_predictor.keras',
                'assignee_suggester': 'assignee_suggester.keras',
                'labels_suggester': 'labels_suggester.keras',
                'issuetype_suggester': 'issuetype_suggester.keras'
            }
            for name, filename in models_to_load.items():
                path = self.models_dir / filename
                if path.exists():
                    self.models[name] = keras.models.load_model(path)
                    print(f"✅ {name} cargado")
            # Cargar encoders
            encoders_to_load = {
                'label_encoders': 'label_encoders.pkl',
                'assignee_encoder': 'assignee_encoder.pkl',
                'labels_binarizer': 'labels_binarizer.pkl',
                'issuetype_encoder': 'issuetype_encoder.pkl'
            }
            for name, filename in encoders_to_load.items():
                path = self.models_dir / filename
                if path.exists():
                    with open(path, 'rb') as f:
                        self.encoders[name] = pickle.load(f)
                    print(f"✅ {name} cargado")
            print("\n✅ Todos los modelos cargados correctamente\n")
        except Exception as e:
            print(f"❌ Error cargando modelos: {e}")
    def get_embedding(self, text, max_length=512):
        """Generar embedding de texto"""
        if not text or not self.nlp:
            return np.zeros(300)
        doc = self.nlp(str(text)[:max_length])
        return doc.vector
    def predict_duplicate(self, summary, description=""):
        """Detectar si un ticket es duplicado/cancelado"""
        if 'duplicate_detector' not in self.models:
            return {"error": "Modelo no disponible"}
        text = f"{summary}. {description}" if description else summary
        emb = self.get_embedding(text).reshape(1, -1)
        pred = self.models['duplicate_detector'].predict(emb, verbose=0)[0]
        category_encoder = self.encoders.get('label_encoders', {}).get('category')
        if category_encoder:
            classes = category_encoder.classes_
            probas = {classes[i]: float(pred[i]) for i in range(len(classes))}
            predicted = classes[np.argmax(pred)]
        else:
            probas = {"active": float(pred[0]), "discarded": float(pred[1])}
            predicted = "active" if pred[0] > pred[1] else "discarded"
        return {
            "is_duplicate": predicted == "discarded",
            "confidence": max(probas.values()),
            "probabilities": probas
        }
    def predict_priority(self, summary, description=""):
        """Sugerir prioridad"""
        if 'priority_classifier' not in self.models:
            return {"error": "Modelo no disponible"}
        text = f"{summary}. {description}" if description else summary
        emb = self.get_embedding(text).reshape(1, -1)
        pred = self.models['priority_classifier'].predict(emb, verbose=0)[0]
        priority_encoder = self.encoders.get('label_encoders', {}).get('priority')
        if priority_encoder:
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
    def predict_sla_breach(self, summary, description=""):
        """Predecir si habrá violación de SLA"""
        if 'breach_predictor' not in self.models:
            return {"error": "Modelo no disponible"}
        text = f"{summary}. {description}" if description else summary
        emb = self.get_embedding(text).reshape(1, -1)
        pred = self.models['breach_predictor'].predict(emb, verbose=0)[0][0]
        return {
            "will_breach": pred > 0.5,
            "breach_probability": float(pred),
            "risk_level": "HIGH" if pred > 0.7 else "MEDIUM" if pred > 0.4 else "LOW"
        }
    def suggest_assignee(self, summary, description="", top_k=3):
        """Sugerir asignados"""
        if 'assignee_suggester' not in self.models:
            return {"error": "Modelo no disponible"}
        text = f"{summary}. {description}" if description else summary
        emb = self.get_embedding(text).reshape(1, -1)
        pred = self.models['assignee_suggester'].predict(emb, verbose=0)[0]
        assignee_encoder = self.encoders.get('assignee_encoder')
        if assignee_encoder:
            classes = assignee_encoder.classes_
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
    def suggest_labels(self, summary, description="", threshold=0.3):
        """Sugerir labels"""
        if 'labels_suggester' not in self.models:
            return {"error": "Modelo no disponible"}
        text = f"{summary}. {description}" if description else summary
        emb = self.get_embedding(text).reshape(1, -1)
        pred = self.models['labels_suggester'].predict(emb, verbose=0)[0]
        labels_binarizer = self.encoders.get('labels_binarizer')
        if labels_binarizer:
            classes = labels_binarizer.classes_
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
    def suggest_issuetype(self, summary, description=""):
        """Sugerir tipo de issue"""
        if 'issuetype_suggester' not in self.models:
            return {"error": "Modelo no disponible"}
        text = f"{summary}. {description}" if description else summary
        emb = self.get_embedding(text).reshape(1, -1)
        pred = self.models['issuetype_suggester'].predict(emb, verbose=0)[0]
        issuetype_encoder = self.encoders.get('issuetype_encoder')
        if issuetype_encoder:
            classes = issuetype_encoder.classes_
            predicted = classes[np.argmax(pred)]
            confidence = float(pred[np.argmax(pred)])
            probas = {classes[i]: float(pred[i]) for i in range(len(classes))}
        else:
            predicted = "Task"
            confidence = 0.5
            probas = {}
        return {
            "suggested_type": predicted,
            "confidence": confidence,
            "probabilities": probas
        }
    def predict_all(self, summary, description=""):
        """Obtener todas las predicciones de una vez"""
        return {
            "duplicate_check": self.predict_duplicate(summary, description),
            "priority": self.predict_priority(summary, description),
            "sla_breach": self.predict_sla_breach(summary, description),
            "assignee": self.suggest_assignee(summary, description),
            "labels": self.suggest_labels(summary, description),
            "issuetype": self.suggest_issuetype(summary, description)
        }
# Ejemplo de uso
if __name__ == "__main__":
    print("="*70)
    print("🤖 SPEEDYFLOW ML PREDICTOR - Demo")
    print("="*70 + "\n")
    # Inicializar predictor
    predictor = SpeedyflowMLPredictor()
    # Ejemplo de ticket
    example_summary = "Error en API de autenticación - usuarios no pueden hacer login"
    example_description = "Los usuarios reportan que no pueden iniciar sesión. El error aparece intermitentemente en producción."
    print(f"📋 Ticket de ejemplo:")
    print(f"   Summary: {example_summary}")
    print(f"   Description: {example_description}\n")
    # Obtener todas las predicciones
    print("🔮 Predicciones:\n")
    predictions = predictor.predict_all(example_summary, example_description)
    print("1️⃣  Detector de Duplicados:")
    dup = predictions['duplicate_check']
    if 'error' not in dup:
        print(f"   ¿Es duplicado? {dup['is_duplicate']}")
        print(f"   Confianza: {dup['confidence']:.2%}\n")
    print("2️⃣  Prioridad Sugerida:")
    pri = predictions['priority']
    if 'error' not in pri:
        print(f"   Prioridad: {pri['suggested_priority']}")
        print(f"   Confianza: {pri['confidence']:.2%}\n")
    print("3️⃣  Riesgo de SLA:")
    sla = predictions['sla_breach']
    if 'error' not in sla:
        print(f"   ¿Violará SLA? {sla['will_breach']}")
        print(f"   Riesgo: {sla['risk_level']} ({sla['breach_probability']:.2%})\n")
    print("4️⃣  Asignados Sugeridos:")
    asg = predictions['assignee']
    if 'error' not in asg and asg['suggestions']:
        for i, sug in enumerate(asg['suggestions'][:3], 1):
            print(f"   {i}. {sug['assignee']} ({sug['confidence']:.2%})")
        print()
    print("5️⃣  Labels Sugeridos:")
    lbl = predictions['labels']
    if 'error' not in lbl and lbl['suggested_labels']:
        for i, sug in enumerate(lbl['suggested_labels'][:5], 1):
            print(f"   {i}. {sug['label']} ({sug['confidence']:.2%})")
        print()
    print("6️⃣  Tipo de Issue:")
    typ = predictions['issuetype']
    if 'error' not in typ:
        print(f"   Tipo: {typ['suggested_type']}")
        print(f"   Confianza: {typ['confidence']:.2%}\n")
    print("="*70)
    print("✅ Demo completado")
    print("="*70)
