#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Pipeline ML Completo con spaCy + Keras
Dataset limpio y normalizado
"""
import gzip
import json
import numpy as np
from pathlib import Path
from collections import Counter
import warnings
warnings.filterwarnings('ignore')

print("="*70)
print("🚀 PIPELINE ML - spaCy + Keras")
print("="*70 + "\n")

# Verificar/instalar dependencias
print("📦 Verificando dependencias...\n")

try:
    import spacy
    print("✅ spaCy instalado")
except ImportError:
    print("⏳ Instalando spaCy...")
    import subprocess
    subprocess.check_call(["pip", "install", "spacy", "-q"])
    import spacy
    print("✅ spaCy instalado")

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    print(f"✅ TensorFlow {tf.__version__}")
except ImportError:
    print("⏳ Instalando TensorFlow...")
    import subprocess
    subprocess.check_call(["pip", "install", "tensorflow", "-q"])
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    print(f"✅ TensorFlow instalado")

try:
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from sklearn.metrics import classification_report, confusion_matrix
    print("✅ scikit-learn instalado")
except ImportError:
    print("⏳ Instalando scikit-learn...")
    import subprocess
    subprocess.check_call(["pip", "install", "scikit-learn", "-q"])
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from sklearn.metrics import classification_report, confusion_matrix
    print("✅ scikit-learn instalado")

# Directorios
cache_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
models_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/models")
models_dir.mkdir(exist_ok=True)

# Cargar modelo spaCy
print("\n📥 Cargando modelo spaCy español...\n")
try:
    nlp = spacy.load("es_core_news_md")
    print(f"✅ Modelo 'es_core_news_md' cargado")
except OSError:
    print("⏳ Descargando modelo 'es_core_news_md'...")
    import subprocess
    subprocess.check_call(["python", "-m", "spacy", "download", "es_core_news_md", "-q"])
    nlp = spacy.load("es_core_news_md")
    print("✅ Modelo descargado")

EMBEDDING_DIM = nlp.vocab.vectors.shape[1]
print(f"📊 Dimensión embeddings: {EMBEDDING_DIM}D\n")

# Cargar dataset limpio
print("="*70)
print("📂 CARGANDO DATASET LIMPIO")
print("="*70 + "\n")

dataset_file = cache_dir / "cleaned_ml_dataset.json.gz"
with gzip.open(dataset_file, "rt", encoding="utf-8") as f:
    tickets = json.load(f)

print(f"✅ {len(tickets):,} tickets cargados\n")

# Función para generar embeddings
def get_embedding(text, nlp, max_length=512):
    """Generar embedding con spaCy"""
    if not text or text == "":
        return np.zeros(EMBEDDING_DIM)
    
    doc = nlp(text[:max_length])
    return doc.vector

# Preparar datos
print("="*70)
print("🔄 GENERANDO EMBEDDINGS")
print("="*70 + "\n")

embeddings = []
categories = []
priorities = []
statuses = []
projects = []
breaches = []

for i, ticket in enumerate(tickets):
    if (i + 1) % 500 == 0:
        print(f"  ✓ {i + 1:,}/{len(tickets):,}")
    
    fields = ticket.get("fields", {})
    
    # Texto: summary + description
    summary = fields.get("summary", "")
    description = fields.get("description", "")
    text = f"{summary}. {description}" if description else summary
    
    # Generar embedding
    emb = get_embedding(text, nlp)
    embeddings.append(emb)
    
    # Etiquetas
    categories.append(ticket.get("_ml_category", "active"))
    priorities.append(fields.get("priority", "Unknown"))
    statuses.append(fields.get("status", "Unknown"))
    projects.append(ticket.get("_ml_project", "UNKNOWN"))
    breaches.append(ticket.get("sla", {}).get("breached", False))

print(f"\n✅ {len(embeddings):,} embeddings generados\n")

# Convertir a numpy
X = np.array(embeddings)
print(f"📊 Shape: {X.shape}\n")

# Encoders
print("🔧 Codificando etiquetas...\n")

le_category = LabelEncoder()
le_priority = LabelEncoder()
le_status = LabelEncoder()
le_project = LabelEncoder()

y_category = le_category.fit_transform(categories)
y_priority = le_priority.fit_transform(priorities)
y_status = le_status.fit_transform(statuses)
y_project = le_project.fit_transform(projects)
y_breach = np.array(breaches, dtype=int)

print(f"📋 Clases:")
print(f"  • Categorías: {len(le_category.classes_)} - {list(le_category.classes_)}")
print(f"  • Prioridades: {len(le_priority.classes_)} - {list(le_priority.classes_)[:5]}...")
print(f"  • Estados: {len(le_status.classes_)} - {list(le_status.classes_)[:5]}...")
print(f"  • Proyectos: {len(le_project.classes_)}")
print(f"  • Breaches: {sum(breaches)} positivos / {len(breaches) - sum(breaches)} negativos\n")

# Guardar encoders
import pickle
with open(models_dir / "label_encoders.pkl", "wb") as f:
    pickle.dump({
        "category": le_category,
        "priority": le_priority,
        "status": le_status,
        "project": le_project
    }, f)
print(f"💾 Encoders guardados\n")

# Split
print("="*70)
print("✂️ DIVIDIENDO DATOS (80/20)")
print("="*70 + "\n")

X_train, X_test, \
y_cat_train, y_cat_test, \
y_pri_train, y_pri_test, \
y_bre_train, y_bre_test = train_test_split(
    X, y_category, y_priority, y_breach,
    test_size=0.2,
    random_state=42,
    stratify=y_category
)

print(f"Train: {len(X_train):,}")
print(f"Test:  {len(X_test):,}\n")

# MODELO 1: Detector Duplicados/Cancelados
print("="*70)
print("🤖 MODELO 1: Detector de Duplicados/Cancelados")
print("="*70 + "\n")

model_dup = keras.Sequential([
    layers.Input(shape=(EMBEDDING_DIM,)),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(64, activation='relu'),
    layers.Dropout(0.2),
    layers.Dense(len(le_category.classes_), activation='softmax')
], name="duplicate_detector")

model_dup.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

print("🏋️ Entrenando...\n")
hist_dup = model_dup.fit(
    X_train, y_cat_train,
    validation_split=0.2,
    epochs=15,
    batch_size=32,
    verbose=2
)

loss_dup, acc_dup = model_dup.evaluate(X_test, y_cat_test, verbose=0)
print(f"\n✅ Test Accuracy: {acc_dup:.4f}\n")

# Clasificación detallada
y_pred_dup = model_dup.predict(X_test, verbose=0).argmax(axis=1)
print("📊 Classification Report:")
print(classification_report(y_cat_test, y_pred_dup, target_names=le_category.classes_))

model_dup.save(models_dir / "duplicate_detector.keras")
print(f"💾 Guardado: duplicate_detector.keras\n")

# MODELO 2: Clasificador de Prioridad  
print("="*70)
print("🤖 MODELO 2: Clasificador de Prioridad")
print("="*70 + "\n")

model_pri = keras.Sequential([
    layers.Input(shape=(EMBEDDING_DIM,)),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(64, activation='relu'),
    layers.Dropout(0.2),
    layers.Dense(len(le_priority.classes_), activation='softmax')
], name="priority_classifier")

model_pri.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

print("🏋️ Entrenando...\n")
hist_pri = model_pri.fit(
    X_train, y_pri_train,
    validation_split=0.2,
    epochs=15,
    batch_size=32,
    verbose=2
)

loss_pri, acc_pri = model_pri.evaluate(X_test, y_pri_test, verbose=0)
print(f"\n✅ Test Accuracy: {acc_pri:.4f}\n")

model_pri.save(models_dir / "priority_classifier.keras")
print(f"💾 Guardado: priority_classifier.keras\n")

# MODELO 3: Predictor SLA Breach
print("="*70)
print("🤖 MODELO 3: Predictor de Violación de SLA")
print("="*70 + "\n")

model_breach = keras.Sequential([
    layers.Input(shape=(EMBEDDING_DIM,)),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.4),
    layers.Dense(64, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(32, activation='relu'),
    layers.Dense(1, activation='sigmoid')
], name="breach_predictor")

model_breach.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=['accuracy', keras.metrics.Precision(), keras.metrics.Recall()]
)

print("🏋️ Entrenando...\n")
hist_breach = model_breach.fit(
    X_train, y_bre_train,
    validation_split=0.2,
    epochs=20,
    batch_size=32,
    verbose=2,
    class_weight={0: 1., 1: 3.}
)

metrics_breach = model_breach.evaluate(X_test, y_bre_test, verbose=0)
print(f"\n✅ Test Metrics:")
print(f"  Loss:      {metrics_breach[0]:.4f}")
print(f"  Accuracy:  {metrics_breach[1]:.4f}")
print(f"  Precision: {metrics_breach[2]:.4f}")
print(f"  Recall:    {metrics_breach[3]:.4f}\n")

model_breach.save(models_dir / "breach_predictor.keras")
print(f"💾 Guardado: breach_predictor.keras\n")

# Resumen final
print("="*70)
print("🎉 ENTRENAMIENTO COMPLETADO")
print("="*70 + "\n")

print(f"📊 Resultados:")
print(f"  1️⃣  Detector Duplicados:    {acc_dup:.2%}")
print(f"  2️⃣  Clasificador Prioridad: {acc_pri:.2%}")
print(f"  3️⃣  Predictor SLA Breach:   {metrics_breach[1]:.2%} (P:{metrics_breach[2]:.2%} R:{metrics_breach[3]:.2%})")

print(f"\n💾 Modelos en: {models_dir.absolute()}")
print(f"  • duplicate_detector.keras")
print(f"  • priority_classifier.keras")
print(f"  • breach_predictor.keras")
print(f"  • label_encoders.pkl")

print("\n" + "="*70)
print("✅ Pipeline ML completo")
print("="*70)
