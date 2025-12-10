#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ML Suggester - BATCH 2: IssueType + Status + Project
"""
import gzip
import json
import numpy as np
from pathlib import Path
from collections import Counter
import warnings
warnings.filterwarnings('ignore')

print("="*70)
print("ML SUGGESTER BATCH 2 - IssueType + Status + Project")
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

# Cargar spaCy
nlp = spacy.load("es_core_news_md")
EMBEDDING_DIM = 300

# Cargar dataset limpio
print("="*70)
print("CARGANDO DATASET")
print("="*70 + "\n")

dataset_file = cache_dir / "cleaned_ml_dataset.json.gz"
with gzip.open(dataset_file, "rt", encoding="utf-8") as f:
    tickets = json.load(f)

print(f"✅ {len(tickets):,} tickets cargados\n")

# Función para embedding
def get_embedding(text):
    if not text or text == "":
        return np.zeros(EMBEDDING_DIM)
    doc = nlp(text[:512])
    return doc.vector

# Preparar datos
print("="*70)
print("PREPARANDO DATOS")
print("="*70 + "\n")

embeddings = []
issue_types = []
statuses = []
projects = []

print("Generando embeddings...\n")

for i, ticket in enumerate(tickets):
    if (i + 1) % 1000 == 0:
        print(f"  {i + 1:,}/{len(tickets):,}")
    
    fields = ticket.get("fields", {})
    
    # Texto
    summary = fields.get("summary", "")
    description = fields.get("description", "")
    text = f"{summary}. {description}" if description else summary
    
    # Embedding
    emb = get_embedding(text)
    embeddings.append(emb)
    
    # Campos
    issue_types.append(fields.get("issuetype", "Unknown"))
    statuses.append(fields.get("status", "Unknown"))
    projects.append(ticket.get("_ml_project", "UNKNOWN"))

print(f"\n✅ {len(embeddings):,} embeddings generados\n")

X = np.array(embeddings)
print(f"Shape: {X.shape}\n")

checkpoint_dir = models_dir / "checkpoints"
checkpoint_dir.mkdir(exist_ok=True)

# === MODELO 1: Issue Type Suggester ===
print("="*70)
print("MODELO 1: Issue Type Suggester")
print("="*70 + "\n")

le_issuetype = LabelEncoder()
y_issuetype = le_issuetype.fit_transform(issue_types)

print(f"Tipos: {len(le_issuetype.classes_)} - {list(le_issuetype.classes_)}\n")

X_train, X_test, y_train, y_test = train_test_split(
    X, y_issuetype, test_size=0.2, random_state=42, stratify=y_issuetype
)

print(f"Train: {len(X_train):,} | Test: {len(X_test):,}\n")

model_issuetype = keras.Sequential([
    layers.Input(shape=(EMBEDDING_DIM,)),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(64, activation='relu'),
    layers.Dropout(0.2),
    layers.Dense(len(le_issuetype.classes_), activation='softmax')
], name="issuetype_suggester")

model_issuetype.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

callbacks = [
    keras.callbacks.ModelCheckpoint(
        checkpoint_dir / "issuetype_best.weights.h5",
        save_best_only=True,
        monitor='val_loss',
        verbose=1
    ),
    keras.callbacks.EarlyStopping(
        monitor='val_loss',
        patience=3,
        restore_best_weights=True,
        verbose=1
    )
]

print("Entrenando Issue Type Suggester...\n")

hist = model_issuetype.fit(
    X_train, y_train,
    validation_split=0.2,
    epochs=15,
    batch_size=32,
    verbose=2,
    callbacks=callbacks
)

loss, acc = model_issuetype.evaluate(X_test, y_test, verbose=0)
print(f"\n✅ Test Accuracy: {acc:.4f}\n")

model_issuetype.save(models_dir / "issuetype_suggester.keras")
print(f"💾 issuetype_suggester.keras\n")

with open(models_dir / "issuetype_encoder.pkl", "wb") as f:
    pickle.dump(le_issuetype, f)
print(f"💾 issuetype_encoder.pkl\n")

# === MODELO 2: Status Suggester ===
print("="*70)
print("MODELO 2: Status Suggester")
print("="*70 + "\n")

# Filtrar estados frecuentes
status_counts = Counter(statuses)
min_status_count = 20
valid_statuses = {s for s, c in status_counts.items() if c >= min_status_count}

print(f"Estados validos: {len(valid_statuses)}/{len(status_counts)}\n")

if len(valid_statuses) > 3:
    mask_status = [s in valid_statuses for s in statuses]
    X_status = X[mask_status]
    y_status_raw = [s for s, m in zip(statuses, mask_status) if m]
    
    print(f"Datos filtrados: {len(X_status):,}\n")
    
    le_status = LabelEncoder()
    y_status = le_status.fit_transform(y_status_raw)
    
    print(f"Clases: {len(le_status.classes_)}\n")
    
    X_train_s, X_test_s, y_train_s, y_test_s = train_test_split(
        X_status, y_status, test_size=0.2, random_state=42, stratify=y_status
    )
    
    print(f"Train: {len(X_train_s):,} | Test: {len(X_test_s):,}\n")
    
    model_status = keras.Sequential([
        layers.Input(shape=(EMBEDDING_DIM,)),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.2),
        layers.Dense(len(le_status.classes_), activation='softmax')
    ], name="status_suggester")
    
    model_status.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    callbacks_s = [
        keras.callbacks.ModelCheckpoint(
            checkpoint_dir / "status_best.weights.h5",
            save_best_only=True,
            monitor='val_loss',
            verbose=1
        ),
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=3,
            restore_best_weights=True,
            verbose=1
        )
    ]
    
    print("Entrenando Status Suggester...\n")
    
    hist_s = model_status.fit(
        X_train_s, y_train_s,
        validation_split=0.2,
        epochs=15,
        batch_size=32,
        verbose=2,
        callbacks=callbacks_s
    )
    
    loss_s, acc_s = model_status.evaluate(X_test_s, y_test_s, verbose=0)
    print(f"\n✅ Test Accuracy: {acc_s:.4f}\n")
    
    model_status.save(models_dir / "status_suggester.keras")
    print(f"💾 status_suggester.keras\n")
    
    with open(models_dir / "status_encoder.pkl", "wb") as f:
        pickle.dump(le_status, f)
    print(f"💾 status_encoder.pkl\n")
else:
    print("⚠️ Estados insuficientes\n")

# === MODELO 3: Project Classifier ===
print("="*70)
print("MODELO 3: Project Classifier")
print("="*70 + "\n")

le_project = LabelEncoder()
y_project = le_project.fit_transform(projects)

print(f"Proyectos: {len(le_project.classes_)} - {list(le_project.classes_)[:10]}...\n")

X_train_p, X_test_p, y_train_p, y_test_p = train_test_split(
    X, y_project, test_size=0.2, random_state=42, stratify=y_project
)

print(f"Train: {len(X_train_p):,} | Test: {len(X_test_p):,}\n")

model_project = keras.Sequential([
    layers.Input(shape=(EMBEDDING_DIM,)),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(64, activation='relu'),
    layers.Dropout(0.2),
    layers.Dense(len(le_project.classes_), activation='softmax')
], name="project_classifier")

model_project.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

callbacks_p = [
    keras.callbacks.ModelCheckpoint(
        checkpoint_dir / "project_best.weights.h5",
        save_best_only=True,
        monitor='val_loss',
        verbose=1
    ),
    keras.callbacks.EarlyStopping(
        monitor='val_loss',
        patience=3,
        restore_best_weights=True,
        verbose=1
    )
]

print("Entrenando Project Classifier...\n")

hist_p = model_project.fit(
    X_train_p, y_train_p,
    validation_split=0.2,
    epochs=15,
    batch_size=32,
    verbose=2,
    callbacks=callbacks_p
)

loss_p, acc_p = model_project.evaluate(X_test_p, y_test_p, verbose=0)
print(f"\n✅ Test Accuracy: {acc_p:.4f}\n")

model_project.save(models_dir / "project_classifier.keras")
print(f"💾 project_classifier.keras\n")

with open(models_dir / "project_encoder.pkl", "wb") as f:
    pickle.dump(le_project, f)
print(f"💾 project_encoder.pkl\n")

print("="*70)
print("✅ BATCH 2 COMPLETADO")
print("="*70)
