#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ML Suggester - Recomendación de campos con spaCy + Keras
Sugiere: assignee, labels, components basándose en summary + description
"""
import gzip
import json
import numpy as np
from pathlib import Path
from collections import Counter
import warnings
warnings.filterwarnings('ignore')

print("="*70)
print("🤖 ML SUGGESTER - Recomendación de Campos")
print("="*70 + "\n")

# Cargar dependencias
try:
    import spacy
    nlp = spacy.load("es_core_news_md")
    print("✅ spaCy cargado")
except:
    print("❌ Error: Ejecuta train_ml_models.py primero para instalar spaCy")
    exit(1)

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    print(f"✅ TensorFlow {tf.__version__}")
except:
    print("❌ TensorFlow no disponible")
    exit(1)

try:
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder, MultiLabelBinarizer
    from sklearn.metrics import classification_report
    print("✅ scikit-learn cargado\n")
except:
    print("❌ scikit-learn no disponible")
    exit(1)

# Directorios
cache_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
models_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/models")
models_dir.mkdir(exist_ok=True)

EMBEDDING_DIM = 300

# Cargar dataset limpio
print("="*70)
print("📂 CARGANDO DATASET")
print("="*70 + "\n")

dataset_file = cache_dir / "cleaned_ml_dataset.json.gz"
with gzip.open(dataset_file, "rt", encoding="utf-8") as f:
    tickets = json.load(f)

print(f"✅ {len(tickets):,} tickets cargados\n")

# Función para embedding (optimizada - usa solo summary)
def get_embedding(text, nlp):
    if not text or text == "":
        return np.zeros(EMBEDDING_DIM)
    
    # Solo procesar summary (primeras 100 palabras)
    text = str(text)[:300]
    doc = nlp(text)
    return doc.vector

# Preparar datos para ML Suggester
print("="*70)
print("🔄 PREPARANDO DATOS PARA SUGERENCIAS")
print("="*70 + "\n")

embeddings = []
assignees = []
labels_list = []
projects = []
statuses = []
issue_types = []

# Filtros de calidad
min_assignee_count = 10  # Mínimo 10 tickets por assignee para ser considerado
min_label_count = 5      # Mínimo 5 usos por label

print("🔍 Extrayendo campos de sugerencia...\n")

for i, ticket in enumerate(tickets):
    if (i + 1) % 1000 == 0:
        print(f"  ✓ {i + 1:,}/{len(tickets):,}")
    
    fields = ticket.get("fields", {})
    
    # Texto
    summary = fields.get("summary", "")
    description = fields.get("description", "")
    text = f"{summary}. {description}" if description else summary
    
    # Embedding
    emb = get_embedding(text, nlp)
    embeddings.append(emb)
    
    # Assignee (normalizado)
    assignee = fields.get("assignee")
    if assignee and assignee != "Unassigned":
        assignees.append(assignee)
    else:
        assignees.append("__UNASSIGNED__")
    
    # Labels (lista)
    labels = fields.get("labels")
    if labels and isinstance(labels, list):
        labels_list.append(labels)
    else:
        labels_list.append([])
    
    # Otros campos útiles
    projects.append(ticket.get("_ml_project", "UNKNOWN"))
    statuses.append(fields.get("status", "Unknown"))
    issue_types.append(fields.get("issuetype", "Unknown"))

print(f"\n✅ {len(embeddings):,} embeddings generados\n")

# Convertir a numpy
X = np.array(embeddings)
print(f"📊 Shape embeddings: {X.shape}\n")

# === MODELO 1: Sugerencia de Assignee ===
print("="*70)
print("🤖 MODELO 1: Sugerencia de Assignee")
print("="*70 + "\n")

# Filtrar assignees frecuentes
assignee_counts = Counter(assignees)
valid_assignees = {a for a, c in assignee_counts.items() if c >= min_assignee_count}

print(f"📊 Assignees originales: {len(assignee_counts)}")
print(f"📊 Assignees válidos (≥{min_assignee_count} tickets): {len(valid_assignees)}\n")

# Filtrar datos
mask_assignee = [a in valid_assignees for a in assignees]
X_assignee = X[mask_assignee]
y_assignee_raw = [a for a, m in zip(assignees, mask_assignee) if m]

print(f"📊 Datos filtrados: {len(X_assignee):,} tickets\n")

if len(X_assignee) > 100:
    # Codificar
    le_assignee = LabelEncoder()
    y_assignee = le_assignee.fit_transform(y_assignee_raw)
    
    print(f"📋 Clases de assignees: {len(le_assignee.classes_)}")
    print(f"   Top 10: {list(le_assignee.classes_)[:10]}\n")
    
    # Split
    X_train_a, X_test_a, y_train_a, y_test_a = train_test_split(
        X_assignee, y_assignee,
        test_size=0.2,
        random_state=42,
        stratify=y_assignee
    )
    
    print(f"Train: {len(X_train_a):,} | Test: {len(X_test_a):,}\n")
    
    # Modelo
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
        metrics=['accuracy']  # Removido TopK por incompatibilidad con sparse
    )
    
    # Callbacks con checkpoint
    checkpoint_path = models_dir / "checkpoints" / "assignee_suggester.weights.h5"
    checkpoint_path.parent.mkdir(exist_ok=True)
    
    callbacks = [
        keras.callbacks.ModelCheckpoint(
            checkpoint_path,
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
    
    print("🏋️ Entrenando Assignee Suggester...\n")
    try:
        hist_a = model_assignee.fit(
            X_train_a, y_train_a,
            validation_split=0.2,
            epochs=20,
            batch_size=32,
            verbose=2,
            callbacks=callbacks
        )
    except Exception as e:
        print(f"❌ Error durante entrenamiento: {e}\n")
        print("💾 Intentando guardar modelo parcial...\n")
        model_assignee.save(models_dir / "assignee_suggester_partial.keras")
        raise
    
    loss_a, acc_a = model_assignee.evaluate(X_test_a, y_test_a, verbose=0)
    print(f"\n✅ Test Loss: {loss_a:.4f}")
    print(f"✅ Test Accuracy: {acc_a:.4f}\n")
    
    metrics_a = (loss_a, acc_a)
    
    # Guardar
    model_assignee.save(models_dir / "assignee_suggester.keras")
    print(f"💾 Guardado: assignee_suggester.keras\n")
    
    # Guardar encoder
    import pickle
    with open(models_dir / "assignee_encoder.pkl", "wb") as f:
        pickle.dump(le_assignee, f)
    print(f"💾 Guardado: assignee_encoder.pkl\n")
else:
    print("⚠️ Insuficientes datos para entrenar modelo de assignee\n")

# === MODELO 2: Sugerencia de Labels (Multi-label) ===
print("="*70)
print("🤖 MODELO 2: Sugerencia de Labels")
print("="*70 + "\n")

# Extraer labels frecuentes
all_labels = []
for labels in labels_list:
    all_labels.extend(labels)

label_counts = Counter(all_labels)
valid_labels = {l for l, c in label_counts.items() if c >= min_label_count}

print(f"📊 Labels originales: {len(label_counts)}")
print(f"📊 Labels válidos (≥{min_label_count} usos): {len(valid_labels)}")
print(f"   Top 10: {[l for l, _ in label_counts.most_common(10)]}\n")

if len(valid_labels) > 5:
    # Filtrar labels válidos
    filtered_labels = [
        [l for l in labels if l in valid_labels] 
        for labels in labels_list
    ]
    
    # Filtrar tickets que tienen al menos 1 label válido
    mask_labels = [len(labels) > 0 for labels in filtered_labels]
    X_labels = X[mask_labels]
    y_labels_raw = [labels for labels, m in zip(filtered_labels, mask_labels) if m]
    
    print(f"📊 Datos con labels: {len(X_labels):,} tickets\n")
    
    if len(X_labels) > 100:
        # Binarizar (multi-label)
        mlb = MultiLabelBinarizer(classes=sorted(valid_labels))
        y_labels = mlb.fit_transform(y_labels_raw)
        
        print(f"📋 Shape labels: {y_labels.shape}\n")
        
        # Split
        X_train_l, X_test_l, y_train_l, y_test_l = train_test_split(
            X_labels, y_labels,
            test_size=0.2,
            random_state=42
        )
        
        print(f"Train: {len(X_train_l):,} | Test: {len(X_test_l):,}\n")
        
        # Modelo multi-label
        model_labels = keras.Sequential([
            layers.Input(shape=(EMBEDDING_DIM,)),
            layers.Dense(256, activation='relu'),
            layers.Dropout(0.4),
            layers.Dense(128, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(len(valid_labels), activation='sigmoid')  # sigmoid para multi-label
        ], name="labels_suggester")
        
        model_labels.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy', keras.metrics.Precision(), keras.metrics.Recall()]
        )
        
        # Callbacks con checkpoint
        checkpoint_path_l = models_dir / "checkpoints" / "labels_suggester.weights.h5"
        checkpoint_path_l.parent.mkdir(exist_ok=True)
        
        callbacks_l = [
            keras.callbacks.ModelCheckpoint(
                checkpoint_path_l,
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
        
        print("🏋️ Entrenando Labels Suggester...\n")
        try:
            hist_l = model_labels.fit(
                X_train_l, y_train_l,
                validation_split=0.2,
                epochs=20,
                batch_size=32,
                verbose=2,
                callbacks=callbacks_l
            )
        except Exception as e:
            print(f"❌ Error durante entrenamiento: {e}\n")
            print("💾 Intentando guardar modelo parcial...\n")
            model_labels.save(models_dir / "labels_suggester_partial.keras")
            raise
        
        metrics_l = model_labels.evaluate(X_test_l, y_test_l, verbose=0)
        print(f"\n✅ Test Metrics:")
        print(f"  Accuracy:  {metrics_l[1]:.4f}")
        print(f"  Precision: {metrics_l[2]:.4f}")
        print(f"  Recall:    {metrics_l[3]:.4f}\n")
        
        # Guardar
        model_labels.save(models_dir / "labels_suggester.keras")
        print(f"💾 Guardado: labels_suggester.keras\n")
        
        # Guardar binarizer
        import pickle
        with open(models_dir / "labels_binarizer.pkl", "wb") as f:
            pickle.dump(mlb, f)
        print(f"💾 Guardado: labels_binarizer.pkl\n")
    else:
        print("⚠️ Insuficientes datos con labels\n")
else:
    print("⚠️ Insuficientes labels frecuentes\n")

# === MODELO 3: Sugerencia de Issue Type ===
print("="*70)
print("🤖 MODELO 3: Sugerencia de Issue Type")
print("="*70 + "\n")

le_issuetype = LabelEncoder()
y_issuetype = le_issuetype.fit_transform(issue_types)

print(f"📋 Tipos de issue: {len(le_issuetype.classes_)}")
print(f"   Clases: {list(le_issuetype.classes_)}\n")

# Split
X_train_i, X_test_i, y_train_i, y_test_i = train_test_split(
    X, y_issuetype,
    test_size=0.2,
    random_state=42,
    stratify=y_issuetype
)

print(f"Train: {len(X_train_i):,} | Test: {len(X_test_i):,}\n")

# Modelo
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

# Callbacks con checkpoint
checkpoint_path_i = models_dir / "checkpoints" / "issuetype_suggester.weights.h5"
checkpoint_path_i.parent.mkdir(exist_ok=True)

callbacks_i = [
    keras.callbacks.ModelCheckpoint(
        checkpoint_path_i,
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

print("🏋️ Entrenando Issue Type Suggester...\n")
try:
    hist_i = model_issuetype.fit(
        X_train_i, y_train_i,
        validation_split=0.2,
        epochs=15,
        batch_size=32,
        verbose=2,
        callbacks=callbacks_i
    )
except Exception as e:
    print(f"❌ Error durante entrenamiento: {e}\n")
    print("💾 Intentando guardar modelo parcial...\n")
    model_issuetype.save(models_dir / "issuetype_suggester_partial.keras")
    raise

loss_i, acc_i = model_issuetype.evaluate(X_test_i, y_test_i, verbose=0)
print(f"\n✅ Test Accuracy: {acc_i:.4f}\n")

# Guardar
model_issuetype.save(models_dir / "issuetype_suggester.keras")
print(f"💾 Guardado: issuetype_suggester.keras\n")

# Guardar encoder
import pickle
with open(models_dir / "issuetype_encoder.pkl", "wb") as f:
    pickle.dump(le_issuetype, f)
print(f"💾 Guardado: issuetype_encoder.pkl\n")

# Resumen final
print("="*70)
print("🎉 ML SUGGESTER COMPLETADO")
print("="*70 + "\n")

print("📊 Modelos entrenados:")
if 'acc_a' in locals():
    print(f"  1️⃣  Assignee Suggester:   {acc_a:.2%}")
if 'metrics_l' in locals():
    print(f"  2️⃣  Labels Suggester:     Acc:{metrics_l[1]:.2%} P:{metrics_l[2]:.2%} R:{metrics_l[3]:.2%}")
if 'acc_i' in locals():
    print(f"  3️⃣  Issue Type Suggester: {acc_i:.2%}")

print(f"\n💾 Ubicación: {models_dir.absolute()}")
if 'metrics_a' in locals():
    print(f"  • assignee_suggester.keras")
    print(f"  • assignee_encoder.pkl")
if 'metrics_l' in locals():
    print(f"  • labels_suggester.keras")
    print(f"  • labels_binarizer.pkl")
print(f"  • issuetype_suggester.keras")
print(f"  • issuetype_encoder.pkl")

print("\n" + "="*70)
print("✅ ML Suggester listo para usar")
print("="*70)
