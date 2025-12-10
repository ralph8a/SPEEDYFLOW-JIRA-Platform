#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ML Suggester - Status Only (Optimizado)
"""
import gzip
import json
import numpy as np
from pathlib import Path
from collections import Counter
import warnings
warnings.filterwarnings('ignore')

print("="*70)
print("ML SUGGESTER - Status Classifier")
print("="*70 + "\n")

# Cargar dependencias
import spacy
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import pickle

print(f"✅ spaCy | TensorFlow {tf.__version__} | scikit-learn\n")

# Directorios
cache_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
models_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/models")
models_dir.mkdir(exist_ok=True)

# Cargar spaCy sin NER (más rápido)
print("Cargando spaCy (sin NER para mayor velocidad)...\n")
nlp = spacy.load("es_core_news_md", disable=["ner"])
EMBEDDING_DIM = 300

# Cargar dataset limpio
print("="*70)
print("CARGANDO DATASET")
print("="*70 + "\n")

dataset_file = cache_dir / "cleaned_ml_dataset.json.gz"
with gzip.open(dataset_file, "rt", encoding="utf-8") as f:
    tickets = json.load(f)

print(f"✅ {len(tickets):,} tickets cargados\n")

# Función para embedding (optimizada)
def get_embedding(text):
    if not text or text == "":
        return np.zeros(EMBEDDING_DIM)
    # Limitar longitud para evitar procesamiento lento
    doc = nlp(text[:256])  # Reducido de 512 a 256
    return doc.vector

# Preparar datos
print("="*70)
print("PREPARANDO DATOS")
print("="*70 + "\n")

embeddings = []
statuses = []

print("Generando embeddings...\n")

for i, ticket in enumerate(tickets):
    if (i + 1) % 500 == 0:  # Print más frecuente
        print(f"  {i + 1:,}/{len(tickets):,}")
    
    fields = ticket.get("fields", {})
    
    # Texto (solo summary para velocidad)
    summary = fields.get("summary", "")
    
    # Embedding
    emb = get_embedding(summary)
    embeddings.append(emb)
    
    # Status
    statuses.append(fields.get("status", "Unknown"))

print(f"\n✅ {len(embeddings):,} embeddings generados\n")

X = np.array(embeddings)
print(f"Shape: {X.shape}\n")

# === Status Suggester ===
print("="*70)
print("STATUS SUGGESTER")
print("="*70 + "\n")

# Filtrar estados frecuentes
status_counts = Counter(statuses)
min_status_count = 20
valid_statuses = {s for s, c in status_counts.items() if c >= min_status_count}

print(f"Estados originales: {len(status_counts)}")
print(f"Estados validos (>={min_status_count}): {len(valid_statuses)}\n")

print("Top 10 estados:")
for status, count in status_counts.most_common(10):
    print(f"  {status:35} {count:5,} tickets")
print()

if len(valid_statuses) > 3:
    # Filtrar datos
    mask_status = [s in valid_statuses for s in statuses]
    X_status = X[mask_status]
    y_status_raw = [s for s, m in zip(statuses, mask_status) if m]
    
    print(f"Datos filtrados: {len(X_status):,}\n")
    
    # Encodificar
    le_status = LabelEncoder()
    y_status = le_status.fit_transform(y_status_raw)
    
    print(f"Clases: {len(le_status.classes_)}")
    print(f"  {list(le_status.classes_)}\n")
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X_status, y_status, 
        test_size=0.2, 
        random_state=42, 
        stratify=y_status
    )
    
    print(f"Train: {len(X_train):,} | Test: {len(X_test):,}\n")
    
    # Modelo (más simple y rápido)
    model_status = keras.Sequential([
        layers.Input(shape=(EMBEDDING_DIM,)),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.2),
        layers.Dense(len(le_status.classes_), activation='softmax')
    ], name="status_suggester")
    
    model_status.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # Checkpoints
    checkpoint_dir = models_dir / "checkpoints"
    checkpoint_dir.mkdir(exist_ok=True)
    
    callbacks = [
        keras.callbacks.ModelCheckpoint(
            checkpoint_dir / "status_best.weights.h5",
            save_best_only=True,
            monitor='val_loss',
            verbose=1,
            save_weights_only=True
        ),
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=4,
            restore_best_weights=True,
            verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=2,
            min_lr=0.00001,
            verbose=1
        )
    ]
    
    print("Entrenando Status Suggester...\n")
    
    try:
        hist = model_status.fit(
            X_train, y_train,
            validation_split=0.2,
            epochs=15,
            batch_size=64,  # Batch más grande = más rápido
            verbose=2,
            callbacks=callbacks
        )
        
        # Evaluar
        loss, acc = model_status.evaluate(X_test, y_test, verbose=0)
        print(f"\n✅ Test Accuracy: {acc:.4f}\n")
        
        # Guardar modelo
        model_status.save(models_dir / "status_suggester.keras")
        print(f"💾 status_suggester.keras\n")
        
        # Guardar encoder
        with open(models_dir / "status_encoder.pkl", "wb") as f:
            pickle.dump(le_status, f)
        print(f"💾 status_encoder.pkl\n")
        
        # Mostrar matriz de confusión simplificada
        print("="*70)
        print("ANÁLISIS DE PREDICCIONES")
        print("="*70 + "\n")
        
        y_pred = model_status.predict(X_test, verbose=0).argmax(axis=1)
        
        # Top estados correctos vs predichos
        from sklearn.metrics import classification_report
        
        print("Reporte por estado:\n")
        report = classification_report(
            y_test, y_pred, 
            target_names=le_status.classes_,
            zero_division=0
        )
        print(report)
        
        print("="*70)
        print("✅ STATUS SUGGESTER COMPLETADO")
        print("="*70)
        
    except Exception as e:
        print(f"\n❌ Error durante entrenamiento: {e}")
        print("Guardando modelo parcial...\n")
        model_status.save(models_dir / "status_suggester_partial.keras")
        raise

else:
    print("⚠️ Estados insuficientes para entrenar\n")

print("\n" + "="*70)
print("✅ PROCESO COMPLETO")
print("="*70)
