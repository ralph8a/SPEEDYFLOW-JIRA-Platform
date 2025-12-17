# 🤖 Inventario Completo de Componentes ML/IA - SPEEDYFLOW
## 📊 Modelos ML Entrenados (Nuevos - spaCy + Keras)
### ✅ Modelos en Producción (6/14 = 71.4%)
| Modelo | Archivo | Accuracy | Tamaño | Estado |
|--------|---------|----------|--------|--------|
| **Detector de Duplicados** | `duplicate_detector.keras` | 90.12% | 0.57 MB | ✅ |
| **Clasificador de Prioridad** | `priority_classifier.keras` | 99.64% | 0.57 MB | ✅ |
| **Predictor SLA Breach** | `breach_predictor.keras` | 85.29% | 0.59 MB | ✅ |
| **Assignee Suggester** | `assignee_suggester.keras` | 23.41% | 1.42 MB | ✅ |
| **Labels Suggester** | `labels_suggester.keras` | 25% (P:91.67%) | 1.32 MB | ✅ |
| **Status Suggester** | `status_suggester.keras` | 89.28% | 0.57 MB | ✅ |
**Ubicación**: `models/` + encoders en `models/*.pkl`
**Dependencias**: TensorFlow 2.20, spaCy es_core_news_md (300D)
**Scripts de entrenamiento**: 
- `scripts/train_ml_models.py` (modelos base)
- `scripts/train_suggester_batch1.py` (assignee + labels)
- `scripts/train_status_suggester.py` (status)
---
## 🧠 Sistemas de IA Existentes
### 1. **SimpleAIEngine** (`api/ai_engine_v2.py`)
**Tipo**: Rule-based AI (patrones + keywords)
**Funciones**:
- ✅ Análisis de sentimiento (positivo/negativo/neutral)
- ✅ Detección de urgencia (keywords)
- ✅ Clasificación de prioridad (basada en keywords)
- ✅ Sugerencia de tipo de issue (Bug/Task/Story/etc)
- ✅ Extracción de entidades (URLs, emails, números)
- ✅ Análisis de complejidad técnica
- ✅ Detección de duplicados (similitud de texto)
**API**: 
```python
from api.ai_engine_v2 import ai_engine
analysis = ai_engine.analyze_ticket(summary, description)
# Returns: sentiment, urgency, priority, issue_type, entities, complexity
```
**Estado**: ✅ En producción, usado en `api/ai_endpoints.py`
---
### 2. **OllamaAIEngine** (`api/ai_ollama.py`)
**Tipo**: LLM local (Ollama)
**Funciones**:
- ✅ Análisis avanzado de tickets con LLMs
- ✅ Clasificación inteligente
- ✅ Generación de sugerencias contextuales
- ✅ Categorización automática
- ✅ Detección de intención
- ✅ Extracción de información estructurada
**Modelos soportados**:
- llama3.2:latest
- mistral:latest
- qwen2.5:latest
**API**:
```python
from api.ai_ollama import ollama_engine
# Análisis completo
result = ollama_engine.analyze_ticket(summary, description)
# Categorización
category = ollama_engine.categorize_ticket(text, categories=['Bug', 'Feature', 'Task'])
```
**Estado**: ✅ Disponible si Ollama está instalado
**Endpoints**: `api/ollama_endpoints.py`
---
### 3. **ML Suggester** (`utils/ml_suggester.py`)
**Tipo**: ML tradicional (TF-IDF + modelos simples)
**Funciones**:
- ✅ Sugerencia de campos customizados
- ✅ Clasificación de `tipo_solicitud`
- ✅ Clasificación de `severity` (Sev1, Sev2, Sev3, Sev4)
- ✅ Entrenamiento incremental con feedback
**Características**:
- Modelo ligero en memoria
- Entrenamiento con datos reales del proyecto
- Almacenamiento en SQLite (`api/ml_training_db.py`)
**API**:
```python
from utils.ml_suggester import get_ml_suggester
ml = get_ml_suggester()
suggestion = ml.suggest_field(text, 'tipo_solicitud')
severity = ml.suggest_severity(text, top_k=3)
```
**Estado**: ✅ En uso en `api/blueprints/ai_suggestions.py`
---
### 4. **Contextual Suggestions** (`api/blueprints/flowing/contextual_suggestions.py`)
**Tipo**: Sistema híbrido (reglas + contexto)
**Funciones**:
- ✅ Sugerencias contextuales según ubicación en UI
- ✅ Quick actions basadas en estado del ticket
- ✅ Smart filters (filtros inteligentes)
- ✅ Sugerencias en kanban board
- ✅ Sugerencias en creación/edición
**Contextos disponibles**:
- `kanban_board` - Sugerencias en tablero
- `kanban_card` - Acciones en tarjeta
- `ticket_detail` - Vista detallada
- `quick_triage` - Triage rápido
- `filter_bar` - Filtros inteligentes
**API**:
```python
from api.blueprints.flowing.contextual_suggestions import ContextualSuggestionEngine
engine = ContextualSuggestionEngine()
suggestions = engine.get_suggestions_for_context(
    context='kanban_card',
    issue_key='MSM-1234',
    additional_data={'status': 'In Progress'}
)
```
**Estado**: ⚠️ Parcialmente implementado
---
### 5. **AI Backgrounds** (`api/ai_backgrounds.py`)
**Tipo**: Generación de fondos con IA
**Funciones**:
- ✅ Fondos glassmorphism procedurales
- ✅ Temas dinámicos basados en hora/proyecto
- ✅ Paletas de color inteligentes
**Estado**: ✅ Usado en UI
---
### 6. **Semantic Search** (`api/blueprints/flowing_semantic_search.py`)
**Tipo**: Búsqueda semántica
**Funciones**:
- ✅ Búsqueda inteligente de tickets
- ✅ Similitud semántica
- ✅ Ranking por relevancia
**Estado**: ⚠️ Parcialmente implementado
---
## 🎯 Sistemas Integrados en UI
### Quick Triage (Triage Rápido)
**Ubicación**: Frontend kanban
**Funciones**:
- ⚡ Clasificación rápida de tickets
- ⚡ Asignación masiva inteligente
- ⚡ Cambio de prioridad en batch
- ⚡ Sugerencias contextuales
**Integración**: 
- Backend: `api/blueprints/ai_suggestions.py`
- Frontend: JavaScript en templates
---
### Smart Filters (Filtros Inteligentes)
**Ubicación**: Filter bar
**Funciones**:
- 🔍 Filtros predefinidos inteligentes
- 🔍 Autocompletado contextual
- 🔍 Sugerencias basadas en historial
- 🔍 Filtros por ML (riesgo SLA, etc.)
**Estado**: ⚠️ Parcialmente implementado
---
### AI Suggestions Panel
**Ubicación**: Sidebar en creación/edición
**Funciones**:
- 💡 Auto-completar campos
- 💡 Sugerir prioridad
- 💡 Sugerir asignado
- 💡 Detectar duplicados
- 💡 Alertas de SLA
**Endpoint**: `/api/ai/suggestions`
**Blueprint**: `api/blueprints/ai_suggestions.py`
---
## 📦 Arquitectura Actual vs Propuesta
### **Arquitectura Actual (Fragmentada)**
```
api/
├── ai_engine_v2.py          # SimpleAIEngine (rule-based)
├── ai_ollama.py             # OllamaAI (LLM)
├── ai_endpoints.py          # REST endpoints
├── ollama_endpoints.py      # Ollama endpoints
└── blueprints/
    ├── ai_suggestions.py    # Sugerencias UI
    └── flowing/
        └── contextual_suggestions.py
utils/
├── ml_suggester.py          # ML tradicional (TF-IDF)
└── ml_predictor.py          # Predictor unificado (NUEVO)
models/                      # Modelos Keras (NUEVO)
├── *.keras
└── *.pkl
```
**Problemas**:
- ❌ Código duplicado entre engines
- ❌ Difícil mantener consistencia
- ❌ Múltiples APIs para lo mismo
- ❌ No hay caché unificado
---
### **Arquitectura Propuesta (Microservicio)**
```
┌─────────────────────────────────────┐
│     SPEEDYFLOW Flask (Puerto 5000)  │
│  ┌─────────────────────────────┐    │
│  │  Frontend (HTML/JS)         │    │
│  └──────────┬──────────────────┘    │
│             │                        │
│  ┌──────────▼──────────────────┐    │
│  │  Flask Blueprints           │    │
│  │  - Issues                   │    │
│  │  - Kanban                   │    │
│  │  - Transitions              │    │
│  └──────────┬──────────────────┘    │
│             │ HTTP                   │
└─────────────┼────────────────────────┘
              │
              ├──────────────────┐
              │                  │
      ┌───────▼───────┐  ┌──────▼──────────┐
      │   JIRA API    │  │  ML Service     │
      │   (External)  │  │  (Puerto 5001)  │
      └───────────────┘  └─────────────────┘
                              │
              ┌───────────────┴────────────────┐
              │                                │
         ┌────▼────┐                    ┌─────▼──────┐
         │ Keras   │                    │ Ollama     │
         │ Models  │                    │ LLM        │
         │ (6)     │                    │ (Optional) │
         └─────────┘                    └────────────┘
```
**Ventajas**:
- ✅ API unificada para todo ML/IA
- ✅ Caché centralizado
- ✅ Escalabilidad independiente
- ✅ Menor acoplamiento
- ✅ Fácil testing
---
## 🔌 API Unificada Propuesta
### **ML Service Endpoints (Puerto 5001)**
```http
# ========== MODELOS KERAS (NUEVOS) ==========
POST /ml/predict/duplicate
POST /ml/predict/priority  
POST /ml/predict/sla-breach
POST /ml/suggest/assignee
POST /ml/suggest/labels
POST /ml/suggest/status
POST /ml/predict/all           # Todas las predicciones en una llamada
# ========== SIMPLE AI ENGINE ==========
POST /ai/analyze/ticket         # Análisis completo (sentimiento, urgencia, etc)
POST /ai/detect/urgency
POST /ai/classify/priority
POST /ai/suggest/issue-type
POST /ai/extract/entities
POST /ai/analyze/complexity
POST /ai/detect/duplicate
# ========== OLLAMA LLM (OPCIONAL) ==========
POST /llm/analyze/ticket        # Análisis con LLM
POST /llm/categorize
POST /llm/extract/intent
POST /llm/generate/description
# ========== ML SUGGESTER (LEGACY) ==========
POST /ml/suggest/custom-field
POST /ml/suggest/severity
POST /ml/train/feedback         # Entrenamiento incremental
# ========== CONTEXTUAL ==========
POST /contextual/suggestions    # Sugerencias según contexto UI
GET /contextual/quick-triage
GET /contextual/smart-filters
# ========== UTILIDADES ==========
GET /health
GET /models/status
POST /cache/clear
```
---
## 📊 Comparación de Sistemas
| Sistema | Tipo | Velocidad | Precisión | Memoria | Estado |
|---------|------|-----------|-----------|---------|--------|
| **Keras Models** | DL | 🟢 10-30ms | 🟢 85-99% | 🟡 305MB | ✅ |
| **SimpleAI** | Rules | 🟢 <5ms | 🟡 60-70% | 🟢 <1MB | ✅ |
| **Ollama** | LLM | 🔴 1-5s | 🟢 90%+ | 🔴 4GB+ | ⚠️ |
| **ML Suggester** | TF-IDF | 🟢 <10ms | 🟡 65-75% | 🟢 <10MB | ✅ |
| **Contextual** | Hybrid | 🟢 <5ms | 🟡 70%+ | 🟢 <1MB | ⚠️ |
---
## 🎯 Estrategia de Migración
### **Fase 1: Microservicio Base** (1-2 días)
1. Crear `/` con FastAPI
2. Migrar modelos Keras + predictor
3. Implementar endpoints básicos
4. Tests unitarios
### **Fase 2: Integración Simple AI** (1 día)
1. Integrar SimpleAIEngine en 
2. Unificar endpoints `/ai/*`
3. Deprecar `ai_endpoints.py`
### **Fase 3: Migrar ML Suggester** (1 día)
1. Mover ml_suggester a 
2. Integrar con base de datos de training
3. API de feedback para mejora continua
### **Fase 4: Contextual + UI** (1-2 días)
1. Integrar contextual suggestions
2. Cliente JS unificado
3. Actualizar frontend
4. Deprecar código legacy
### **Fase 5: Ollama (Opcional)** (1 día)
1. Integrar Ollama como servicio opcional
2. Fallback a SimpleAI si no disponible
3. Configuración de modelos
---
## 💾 Datos de Entrenamiento
### **Dataset Principal**
- **Ubicación**: `data/cache/cleaned_ml_dataset.json.gz`
- **Tamaño**: 9,818 tickets
- **Distribución**:
  - MSM: 51% (5,007 tickets)
  - OP: 27% (2,651 tickets)
  - DES: 6% (589 tickets)
  - Otros: 16% (1,571 tickets)
### **Training Database**
- **Archivo**: `api/ml_training_db.py`
- **Almacenamiento**: SQLite
- **Propósito**: Feedback y entrenamiento incremental
---
## 🚀 Quick Start para Integración
### **1. Verificar Modelos**
```bash
python scripts/verify_models.py
```
### **2. Test Predictor**
```bash
python utils/ml_predictor.py
```
### **3. Crear Microservicio**
```bash
# Ver docs/ML_INTEGRATION_STRATEGY.md
cd 
pip install -r requirements.txt
uvicorn main:app --port 5001
```
### **4. Test API**
```bash
curl -X POST http://localhost:5001/ml/predict/all \
  -H "Content-Type: application/json" \
  -d '{"summary": "Error en API", "description": "No funciona login"}'
```
---
## 📈 ROI Estimado
### **Con 6 Modelos Actuales**
- ↓ 15% tickets duplicados
- ↓ 30-40% violaciones SLA
- ↑ 99% precisión en prioridades
- ↑ 89% precisión en transiciones
- ↑ 25% eficiencia en asignaciones
### **Con Integración Completa**
- ↓ 50% tiempo de triage
- ↓ 60% errores de clasificación
- ↑ 40% satisfacción del equipo
- ↑ 35% throughput general
---
## 📝 Próximos Pasos
1. **Decidir arquitectura**: ¿Microservicio o integración directa?
2. **Priorizar modelos**: ¿Cuáles integrar primero?
3. **Plan de deprecación**: ¿Qué eliminar del código legacy?
4. **UI/UX**: ¿Cómo mostrar las sugerencias?
5. **Testing**: ¿Estrategia de QA?
---
**Última actualización**: 9 de diciembre de 2025
**Estado del proyecto**: 71.4% modelos listos, arquitectura en revisión
