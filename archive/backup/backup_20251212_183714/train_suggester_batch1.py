#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ML Suggester - BATCH 1: Assignee + Labels
"""
import gzip
import json
import numpy as np
from pathlib import Path
from collections import Counter
import warnings
warnings.filterwarnings('ignore')
print("="*70)
print("ML SUGGESTER BATCH 1 - Assignee + Labels")
print("="*70 + "\n")
# Cargar dependencias
import spacy
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, MultiLabelBinarizer
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
assignees = []
labels_list = []
min_assignee_count = 10
min_label_count = 5
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
    # Assignee
    assignee = fields.get("assignee")
    if assignee and assignee != "Unassigned":
        assignees.append(assignee)
    else:
        assignees.append("__UNASSIGNED__")
    # Labels
    labels = fields.get("labels")
    if labels and isinstance(labels, list):
        labels_list.append(labels)
    else:
        labels_list.append([])
print(f"\n✅ {len(embeddings):,} embeddings generados\n")
X = np.array(embeddings)
print(f"Shape: {X.shape}\n")
# === MODELO 1: Assignee Suggester ===
print("="*70)
print("MODELO 1: Assignee Suggester")
print("="*70 + "\n")
assignee_counts = Counter(assignees)
valid_assignees = {a for a, c in assignee_counts.items() if c >= min_assignee_count}
print(f"Assignees validos: {len(valid_assignees)}/{len(assignee_counts)}\n")
mask_assignee = [a in valid_assignees for a in assignees]
X_assignee = X[mask_assignee]
y_assignee_raw = [a for a, m in zip(assignees, mask_assignee) if m]
print(f"Datos filtrados: {len(X_assignee):,}\n")
if len(X_assignee) > 100:
    le_assignee = LabelEncoder()
    y_assignee = le_assignee.fit_transform(y_assignee_raw)
    print(f"Clases: {len(le_assignee.classes_)}\n")
    X_train, X_test, y_train, y_test = train_test_split(
        X_assignee, y_assignee, test_size=0.2, random_state=42, stratify=y_assignee
    )
    print(f"Train: {len(X_train):,} | Test: {len(X_test):,}\n")
    model_assignee = keras.Sequential([
        layers.Input(shape=(EMBEDDING_DIM,)),
        layers.Dense(256, activation='relu'),
        layers.Dropout(0.4),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.2),
        layers.Dense(len(le_assignee.classes_), activation='softmax')
    ], name="assignee_suggester")
    model_assignee.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    checkpoint_dir = models_dir / "checkpoints"
    checkpoint_dir.mkdir(exist_ok=True)
    callbacks = [
        keras.callbacks.ModelCheckpoint(
            checkpoint_dir / "assignee_best.weights.h5",
            save_best_only=True,
            monitor='val_loss',
            verbose=1
        ),
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            verbose=1
        )
    ]
    print("Entrenando Assignee Suggester...\n")
    hist = model_assignee.fit(
        X_train, y_train,
        validation_split=0.2,
        epochs=20,
        batch_size=32,
        verbose=2,
        callbacks=callbacks
    )
    loss, acc = model_assignee.evaluate(X_test, y_test, verbose=0)
    print(f"\n✅ Test Accuracy: {acc:.4f}\n")
    model_assignee.save(models_dir / "assignee_suggester.keras")
    print(f"💾 assignee_suggester.keras\n")
    with open(models_dir / "assignee_encoder.pkl", "wb") as f:
        pickle.dump(le_assignee, f)
    print(f"💾 assignee_encoder.pkl\n")
else:
    print("⚠️ Datos insuficientes\n")
# === MODELO 2: Labels Suggester ===
print("="*70)
print("MODELO 2: Labels Suggester")
print("="*70 + "\n")
all_labels = []
for labels in labels_list:
    all_labels.extend(labels)
label_counts = Counter(all_labels)
valid_labels = {l for l, c in label_counts.items() if c >= min_label_count}
print(f"Labels validos: {len(valid_labels)}/{len(label_counts)}\n")
if len(valid_labels) > 5:
    filtered_labels = [
        [l for l in labels if l in valid_labels] 
        for labels in labels_list
    ]
    mask_labels = [len(labels) > 0 for labels in filtered_labels]
    X_labels = X[mask_labels]
    y_labels_raw = [labels for labels, m in zip(filtered_labels, mask_labels) if m]
    print(f"Datos con labels: {len(X_labels):,}\n")
    if len(X_labels) > 100:
        mlb = MultiLabelBinarizer(classes=sorted(valid_labels))
        y_labels = mlb.fit_transform(y_labels_raw)
        print(f"Shape labels: {y_labels.shape}\n")
        X_train_l, X_test_l, y_train_l, y_test_l = train_test_split(
            X_labels, y_labels, test_size=0.2, random_state=42
        )
        print(f"Train: {len(X_train_l):,} | Test: {len(X_test_l):,}\n")
        model_labels = keras.Sequential([
            layers.Input(shape=(EMBEDDING_DIM,)),
            layers.Dense(256, activation='relu'),
            layers.Dropout(0.4),
            layers.Dense(128, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(len(valid_labels), activation='sigmoid')
        ], name="labels_suggester")
        model_labels.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy', keras.metrics.Precision(), keras.metrics.Recall()]
        )
        callbacks_l = [
            keras.callbacks.ModelCheckpoint(
                checkpoint_dir / "labels_best.weights.h5",
                save_best_only=True,
                monitor='val_loss',
                verbose=1
            ),
            keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=5,
                restore_best_weights=True,
                verbose=1
            )
        ]
        print("Entrenando Labels Suggester...\n")
        hist_l = model_labels.fit(
            X_train_l, y_train_l,
            validation_split=0.2,
            epochs=20,
            batch_size=32,
            verbose=2,
            callbacks=callbacks_l
        )
        metrics = model_labels.evaluate(X_test_l, y_test_l, verbose=0)
        print(f"\n✅ Accuracy: {metrics[1]:.4f} | Precision: {metrics[2]:.4f} | Recall: {metrics[3]:.4f}\n")
        model_labels.save(models_dir / "labels_suggester.keras")
        print(f"💾 labels_suggester.keras\n")
        with open(models_dir / "labels_binarizer.pkl", "wb") as f:
            pickle.dump(mlb, f)
        print(f"💾 labels_binarizer.pkl\n")
    else:
        print("⚠️ Datos insuficientes con labels\n")
else:
    print("⚠️ Labels insuficientes\n")
print("="*70)
print("✅ BATCH 1 COMPLETADO")
print("="*70)
