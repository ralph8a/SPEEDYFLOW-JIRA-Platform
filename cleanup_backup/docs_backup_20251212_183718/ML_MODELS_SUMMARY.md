# 🤖 SPEEDYFLOW - Modelos ML Entrenados

## 📊 Resumen de Modelos

### ✅ **Modelos Core** (Entrenados completamente)

#### 1️⃣ **Detector de Duplicados/Cancelados**
- **Archivo**: `duplicate_detector.keras`
- **Accuracy**: 90.12%
- **Propósito**: Detectar tickets duplicados o cancelados
- **Input**: Embeddings 300D de summary + description
- **Output**: Probabilidad de ser duplicado (active vs discarded)
- **Uso**: Alertar al crear nuevos tickets

#### 2️⃣ **Clasificador de Prioridad**
- **Archivo**: `priority_classifier.keras`  
- **Accuracy**: 99.64% ⭐
- **Propósito**: Sugerir prioridad automáticamente
- **Input**: Embeddings 300D
- **Output**: 5 clases (Highest, High, Medium, Low, Lowest)
- **Uso**: Auto-completar prioridad al crear ticket

#### 3️⃣ **Predictor de SLA Breach**
- **Archivo**: `breach_predictor.keras`
- **Accuracy**: 85.29%
- **Precision**: 29.90%
- **Recall**: 11.60%
- **Propósito**: Predecir violaciones de SLA
- **Input**: Embeddings 300D
- **Output**: Probabilidad de breach + risk level
- **Uso**: Alertas tempranas de riesgo

### 🔄 **Modelos Suggester** (En entrenamiento)

#### 4️⃣ **Assignee Suggester**
- **Archivo**: `assignee_suggester.keras`
- **Clases**: 45 assignees válidos (≥10 tickets)
- **Propósito**: Recomendar asignados
- **Input**: Embeddings 300D
- **Output**: Top-3 sugerencias con confianza
- **Uso**: Sugerir mejores asignados por experiencia

#### 5️⃣ **Labels Suggester**
- **Archivo**: `labels_suggester.keras`
- **Tipo**: Multi-label classifier
- **Propósito**: Sugerir etiquetas relevantes
- **Input**: Embeddings 300D
- **Output**: Lista de labels con confianza > threshold
- **Uso**: Auto-tagging de tickets

#### 6️⃣ **Issue Type Suggester**
- **Archivo**: `issuetype_suggester.keras`
- **Propósito**: Clasificar tipo de issue
- **Input**: Embeddings 300D
- **Output**: Tipo sugerido (Task, Bug, Story, etc.)
- **Uso**: Auto-clasificación de tickets

---

## 🗂️ **Archivos Generados**

### Modelos (.keras)
```
models/
├── duplicate_detector.keras         (✅ Entrenado)
├── priority_classifier.keras        (✅ Entrenado)
├── breach_predictor.keras           (✅ Entrenado)
├── assignee_suggester.keras         (🔄 En progreso)
├── labels_suggester.keras           (🔄 En progreso)
└── issuetype_suggester.keras        (🔄 En progreso)
```

### Encoders (.pkl)
```
models/
├── label_encoders.pkl               (category, priority, status, project)
├── assignee_encoder.pkl             (45 assignees)
├── labels_binarizer.pkl             (multi-label)
└── issuetype_encoder.pkl            (tipos de issue)
```

### Checkpoints
```
models/checkpoints/
├── assignee_suggester.weights.h5
├── labels_suggester.weights.h5
└── issuetype_suggester.weights.h5
```

### Datasets
```
data/cache/
├── cleaned_ml_dataset.json.gz       (9,818 tickets normalizados)
├── cleaning_stats.json              (estadísticas de limpieza)
├── sla_metrics_with_transitions.json.gz  (12,519 ciclos SLA)
└── ml_training_metadata.json        (info del dataset)
```

---

## 📈 **Datos de Entrenamiento**

### Dataset Completo
- **Total tickets**: 9,818
  - Activos: 8,356 (85.1%)
  - Descartados: 1,462 (14.9%)
- **Con SLA**: 7,575 (77.2%)
- **Breaches**: 1,175 (12.0%)
- **Embeddings**: 300D con spaCy español

### Distribución por Proyecto
- **MSM**: 4,965 (50.6%)
- **OP**: 2,628 (26.8%)
- **QA**: 738 (7.5%)
- **DES**: 595 (6.1%)
- **AP**: 296 (3.0%)
- **IN**: 290 (3.0%)
- **Otros**: 306 (3.1%)

### Completitud de Campos
- Summary: 100%
- Status: 100%
- Priority: 100%
- Description: 93.2%
- Assignee: 90.7%
- Comments: 99.2%

---

## 🎯 **Casos de Uso en SPEEDYFLOW**

### 1. Al Crear Nuevo Ticket
```python
predictions = ml_predictor.predict_all(summary, description)

# Detectar duplicados
if predictions['duplicate_check']['is_duplicate']:
    show_alert("⚠️ Posible duplicado detectado")
    suggest_similar_tickets()

# Auto-completar campos
set_priority(predictions['priority']['suggested_priority'])
set_issuetype(predictions['issuetype']['suggested_type'])
add_labels(predictions['labels']['suggested_labels'])

# Sugerir asignados
show_assignee_suggestions(predictions['assignee']['suggestions'][:3])
```

### 2. Alertas Proactivas
```python
# Predecir riesgo de SLA
sla_risk = predictions['sla_breach']

if sla_risk['risk_level'] == 'HIGH':
    show_warning("🚨 Alto riesgo de violar SLA")
    suggest_actions([
        "Reasignar a equipo disponible",
        "Escalar prioridad",
        "Notificar al PM"
    ])
```

### 3. Dashboard ML
```python
# Métricas en tiempo real
daily_predictions = [
    predict_sla_breach(ticket) 
    for ticket in get_open_tickets()
]

show_metrics({
    "high_risk_tickets": count_high_risk(daily_predictions),
    "predicted_breaches_24h": sum(p['will_breach'] for p in daily_predictions),
    "avg_confidence": mean(p['confidence'] for p in daily_predictions)
})
```

---

## 🔧 **API de Uso**

### Inicialización
```python
from utils.ml_predictor import SpeedyflowMLPredictor

predictor = SpeedyflowMLPredictor()
```

### Métodos Disponibles
```python
# Detectar duplicados
result = predictor.predict_duplicate(summary, description)
# → {"is_duplicate": bool, "confidence": float, "probabilities": dict}

# Sugerir prioridad
result = predictor.predict_priority(summary, description)
# → {"suggested_priority": str, "confidence": float, "probabilities": dict}

# Predecir SLA breach
result = predictor.predict_sla_breach(summary, description)
# → {"will_breach": bool, "breach_probability": float, "risk_level": str}

# Sugerir assignee
result = predictor.suggest_assignee(summary, description, top_k=3)
# → {"suggestions": [{assignee, confidence}, ...], "top_choice": dict}

# Sugerir labels
result = predictor.suggest_labels(summary, description, threshold=0.3)
# → {"suggested_labels": [{label, confidence}, ...], "count": int}

# Sugerir tipo de issue
result = predictor.suggest_issuetype(summary, description)
# → {"suggested_type": str, "confidence": float, "probabilities": dict}

# Todas las predicciones de una vez
results = predictor.predict_all(summary, description)
# → {duplicate_check, priority, sla_breach, assignee, labels, issuetype}
```

---

## 📊 **Métricas de Rendimiento**

### Modelos Core
| Modelo | Accuracy | Precision | Recall | F1-Score |
|--------|----------|-----------|--------|----------|
| Duplicate Detector | 90.12% | 67% (discarded) | 66% | 0.67 |
| Priority Classifier | 99.64% | >99% | >99% | >0.99 |
| SLA Breach Predictor | 85.29% | 29.90% | 11.60% | 0.17 |

### Interpretación
- **Priority**: Excelente (99.64%) - Listo para producción
- **Duplicate**: Bueno (90%) - Útil con confirmación humana
- **SLA Breach**: Desbalanceado - Recall bajo pero útil para alertas tempranas

---

## 🚀 **Próximos Pasos**

### Corto Plazo
1. ✅ Completar entrenamiento de Suggester models
2. ⏳ Integrar con API Flask/FastAPI
3. ⏳ Crear endpoints REST para predicciones
4. ⏳ Añadir UI en frontend

### Mediano Plazo
1. Reentrenar SLA Breach con class balancing
2. Añadir modelo de similaridad de tickets
3. Implementar recomendaciones de comentarios
4. A/B testing en producción

### Largo Plazo
1. Fine-tuning con feedback de usuarios
2. Modelo de estimación de tiempo
3. Detección de anomalías
4. NLP avanzado con transformers

---

**Última actualización**: 9 de diciembre, 2025  
**Estado**: 3/6 modelos completos, 3/6 en entrenamiento  
**Dataset**: 9,818 tickets, 300D embeddings
