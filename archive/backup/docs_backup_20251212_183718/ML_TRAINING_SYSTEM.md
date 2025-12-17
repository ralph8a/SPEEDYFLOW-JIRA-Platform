# 🤖 Sistema de Guardado Automático ML - Comment Suggestions
**Fecha**: 7 de Diciembre, 2025  
**Estado**: ✅ Implementado y Funcionando
---
## 🎯 Objetivo
Cada vez que Ollama genera sugerencias de comentarios, guardar automáticamente:
- **Contexto completo**: Título, descripción, comentarios, tipo, estado, prioridad
- **Sugerencias generadas**: Texto, tipo, confianza
- **Metadata**: Timestamp, modelo usado
**Para qué**: Crear un dataset de entrenamiento que permita entrenar un modelo ML propio en el futuro.
---
## 🏗️ Arquitectura Implementada
### Componentes Nuevos
#### 1. `api/ml_training_db.py` - Base de Datos ML
```python
class MLTrainingDatabase:
    """Almacena contextos y sugerencias para entrenamiento ML"""
    def add_training_sample(
        ticket_key, ticket_summary, ticket_description,
        issue_type, status, priority, all_comments,
        suggestions, model="ollama"
    ):
        # Genera hash único para evitar duplicados
        # Guarda contexto completo + sugerencias generadas
        # Auto-comprime a GZIP después de 100 muestras
```
**Características**:
- ✅ **Detección de duplicados**: Hash MD5 del contexto
- ✅ **Compresión automática**: GZIP después de 100 muestras
- ✅ **Estadísticas detalladas**: Por tipo, estado, promedios
- ✅ **Exportación ML**: Formato listo para entrenamiento
#### 2. Integración en `ml_comment_suggestions.py`
```python
def get_suggestions(...):
    # ... genera sugerencias con Ollama ...
    # NUEVO: Guardado automático
    if final_suggestions:
        ml_db = get_ml_training_db()
        ml_db.add_training_sample(
            ticket_key=ticket_key,
            ticket_summary=ticket_summary,
            ticket_description=ticket_description,
            issue_type=issue_type,
            status=status,
            priority=priority,
            all_comments=all_comments,
            suggestions=final_suggestions,
            model="ollama-llama3.2"
        )
```
**Flujo**:
1. Usuario solicita sugerencias
2. Ollama genera respuestas
3. Sistema guarda automáticamente en DB ML
4. No bloquea respuesta al usuario (async)
#### 3. Nuevos Endpoints API
**GET `/api/ml/comments/ml-stats`** - Estadísticas
```json
{
  "success": true,
  "stats": {
    "total_samples": 2,
    "total_suggestions": 4,
    "total_comments": 5,
    "avg_suggestions_per_sample": 2.0,
    "avg_comments_per_sample": 2.5,
    "by_issue_type": {
      "Bug": 1,
      "Performance": 1
    },
    "by_status": {
      "Open": 1,
      "In Progress": 1
    },
    "compressed": false,
    "created": "2025-12-07T23:58:43.823087",
    "last_modified": "2025-12-08T00:00:29.542115"
  }
}
```
**POST `/api/ml/comments/export-training-data`** - Exportar Dataset
```json
{
  "success": true,
  "message": "Training data exported successfully",
  "path": "data/ml_models/training_dataset.json",
  "samples": 2
}
```
---
## 📊 Estructura de Datos
### Formato de Almacenamiento Interno
```json
{
  "training_samples": [
    {
      "context_hash": "a1b2c3d4e5f6...",
      "ticket_key": "PROJ-123",
      "timestamp": "2025-12-07T23:58:43.823087",
      "input": {
        "summary": "Error 404 en página principal",
        "description": "Los usuarios reportan error 404",
        "issue_type": "Bug",
        "status": "Open",
        "priority": "Critical",
        "comments": [
          "Iniciando investigación",
          "Revisar configuración del servidor"
        ],
        "comments_count": 2
      },
      "output": {
        "suggestions": [
          {
            "text": "La página principal se encuentra...",
            "type": "resolution",
            "confidence": 0.98
          }
        ],
        "suggestions_count": 3,
        "model": "ollama-llama3.2"
      }
    }
  ],
  "metadata": {
    "created": "2025-12-07T23:58:43.823087",
    "last_modified": "2025-12-08T00:00:29.542115",
    "total_samples": 2,
    "compressed": false,
    "version": "1.0"
  }
}
```
### Formato de Exportación para ML
```json
[
  {
    "input": "Error 404 en página principal Los usuarios reportan error 404 Iniciando investigación Revisar configuración",
    "metadata": {
      "issue_type": "Bug",
      "status": "Open",
      "priority": "Critical"
    },
    "output_text": "La página principal se encuentra en estado de mantenimiento...",
    "output_type": "resolution",
    "confidence": 0.98
  }
]
```
**Características del formato exportado**:
- ✅ **Input concatenado**: Summary + Description + Last 10 Comments
- ✅ **Metadata separada**: Issue type, status, priority
- ✅ **Output etiquetado**: Texto, tipo, confianza
- ✅ **Listo para fine-tuning**: Compatible con frameworks ML
---
## 🔄 Flujo Completo
### 1. Usuario solicita sugerencias
```
Frontend → POST /api/ml/comments/suggestions
```
### 2. Backend genera con Ollama
```python
# ml_comment_suggestions.py
suggestions = ollama_engine._call_ollama(prompt)
# → [{"text": "...", "type": "diagnostic", "confidence": 0.95}, ...]
```
### 3. Guardado automático
```python
# AUTOMÁTICO, no requiere acción del usuario
ml_db.add_training_sample(
    ticket_key="PROJ-123",
    # ... contexto completo ...
    suggestions=suggestions,
    model="ollama-llama3.2"
)
```
### 4. Verificación de duplicados
```python
context_hash = md5(f"{summary}|{description}|{comments}")
if context_hash in existing_samples:
    return  # Skip duplicate
```
### 5. Auto-compresión
```python
if len(samples) >= 100:
    save_compressed_gzip()
```
---
## 📈 Métricas y Estadísticas
### Estadísticas Disponibles
```python
stats = ml_db.get_stats()
```
**Retorna**:
- `total_samples`: Total de contextos únicos guardados
- `total_suggestions`: Total de sugerencias generadas
- `total_comments`: Total de comentarios analizados
- `avg_suggestions_per_sample`: Promedio de sugerencias por ticket
- `avg_comments_per_sample`: Promedio de comentarios por ticket
- `by_issue_type`: Distribución por tipo de issue
- `by_status`: Distribución por estado
- `compressed`: Si está usando compresión GZIP
- `created`: Fecha de creación de la DB
- `last_modified`: Última modificación
### Ejemplo Real
```json
{
  "total_samples": 2,
  "total_suggestions": 4,
  "total_comments": 5,
  "avg_suggestions_per_sample": 2.0,
  "avg_comments_per_sample": 2.5,
  "by_issue_type": {
    "Bug": 1,
    "Performance": 1
  },
  "by_status": {
    "Open": 1,
    "In Progress": 1
  },
  "compressed": false
}
```
---
## 🎓 Uso del Dataset para Entrenamiento ML
### Exportar Datos
```bash
curl -X POST http://127.0.0.1:5005/api/ml/comments/export-training-data
```
**Resultado**: `data/ml_models/training_dataset.json`
### Entrenar Modelo Propio
#### Opción 1: Fine-tuning de Transformer (BERT, RoBERTa)
```python
from transformers import AutoModelForSequenceClassification, Trainer
# Load dataset
with open('data/ml_models/training_dataset.json') as f:
    data = json.load(f)
# Prepare for Hugging Face
train_dataset = Dataset.from_dict({
    'text': [d['input'] for d in data],
    'label': [d['output_type'] for d in data]
})
# Fine-tune
model = AutoModelForSequenceClassification.from_pretrained('bert-base-uncased')
trainer = Trainer(model=model, train_dataset=train_dataset)
trainer.train()
```
#### Opción 2: Fine-tuning de GPT-2/LLaMA
```python
# Para generación de texto (output_text)
from transformers import GPT2LMHeadModel, Trainer
train_data = [
    f"Input: {d['input']}\nOutput: {d['output_text']}"
    for d in data
]
# Fine-tune GPT-2 en español
model = GPT2LMHeadModel.from_pretrained('gpt2-spanish')
trainer.train()
```
#### Opción 3: Clasificador Simple (scikit-learn)
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
# Vectorizar inputs
vectorizer = TfidfVectorizer(max_features=500)
X = vectorizer.fit_transform([d['input'] for d in data])
y = [d['output_type'] for d in data]
# Entrenar clasificador
clf = RandomForestClassifier()
clf.fit(X, y)
# Predecir tipo de sugerencia
prediction = clf.predict(vectorizer.transform(['Error en sistema...']))
```
---
## 🚀 Roadmap de Entrenamiento
### Fase 1: Colección de Datos (ACTUAL)
- ✅ **Sistema implementado**
- ✅ Guardado automático
- ✅ Detección de duplicados
- ✅ Compresión GZIP
- **Meta**: 500-1000 muestras
- **Tiempo estimado**: 2-4 semanas de uso normal
### Fase 2: Análisis y Limpieza
- Revisar distribución de tipos
- Balancear dataset (igual cantidad de diagnostic/action/resolution)
- Eliminar sugerencias de baja calidad (confidence < 0.7)
- Validar consistencia de datos
### Fase 3: Entrenamiento de Modelo
- **Opción A**: Fine-tune BERT multilingüe para clasificación
- **Opción B**: Fine-tune GPT-2 español para generación
- **Opción C**: Entrenar clasificador ligero (sklearn)
### Fase 4: Evaluación
- Split 80/20 train/test
- Métricas: Accuracy, F1-score, Precision, Recall
- Comparar con Ollama baseline
- **Meta**: Accuracy > 85%
### Fase 5: Despliegue
- Integrar modelo entrenado en producción
- Sistema híbrido: Modelo propio + Ollama fallback
- Monitoring de performance
---
## 📁 Estructura de Archivos
```
data/
├── cache/
│   ├── ml_training_data.json          # DB sin comprimir (<100 muestras)
│   └── ml_training_data.json.gz       # DB comprimida (100+ muestras)
└── ml_models/
    └── training_dataset.json          # Dataset exportado para ML
```
---
## 🧪 Testing
### 1. Generar Muestras
```bash
# Generar sugerencia (guarda automáticamente)
curl -X POST http://127.0.0.1:5005/api/ml/comments/suggestions \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Error en login",
    "description": "Usuarios no pueden acceder",
    "issue_type": "Bug",
    "status": "Open",
    "priority": "High",
    "all_comments": ["Revisando logs"],
    "max_suggestions": 3
  }'
```
### 2. Ver Estadísticas
```bash
curl http://127.0.0.1:5005/api/ml/comments/ml-stats
```
### 3. Exportar Dataset
```bash
curl -X POST http://127.0.0.1:5005/api/ml/comments/export-training-data
```
### 4. Verificar Archivo
```bash
cat data/ml_models/training_dataset.json | jq '.[0]'
```
---
## 🐛 Troubleshooting
### "Error saving to ML training DB"
```python
# Check logs
tail -f /tmp/speedyflow.log | grep "ML training"
```
### Dataset no crece
```python
# Verify hashing works
from api.ml_training_db import get_ml_training_db
ml_db = get_ml_training_db()
print(ml_db.get_stats())
```
### Duplicados no se detectan
```python
# Check context hash
import hashlib
context = f"{summary}|{description}|{'|'.join(comments)}"
hash_value = hashlib.md5(context.encode()).hexdigest()
print(f"Hash: {hash_value}")
```
---
## ✅ Verificación de Funcionamiento
**Prueba realizada**:
```bash
# 1. Generé sugerencia para "Error 404"
# 2. Generé la misma sugerencia (duplicado)
# 3. Generé sugerencia para "Sistema lento"
# Resultado:
# - total_samples: 2 (duplicado omitido) ✅
# - by_issue_type: Bug: 1, Performance: 1 ✅
# - avg_suggestions_per_sample: 2.0 ✅
```
---
## 📊 Estado Actual
**Base de Datos ML**:
- ✅ Implementada y funcionando
- ✅ Guardado automático activo
- ✅ Detección de duplicados operativa
- ✅ Compresión GZIP configurada (100+ muestras)
- ✅ Endpoints de estadísticas y exportación funcionando
**Muestras Actuales**: 2 (recién iniciado)
**Próximo Paso**: Usar la aplicación normalmente para acumular 500-1000 muestras
---
**Servidor**: http://127.0.0.1:5005  
**Ollama**: ✅ Auto-iniciado con modelo llama3.2:latest  
**ML Training DB**: ✅ Guardando automáticamente  
**Última actualización**: 8 de Diciembre, 2025 00:00 UTC
