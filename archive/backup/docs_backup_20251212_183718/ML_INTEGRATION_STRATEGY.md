# 🚀 Estrategia de Integración ML en SPEEDYFLOW MVP
## 📊 Estado Actual (6 Modelos Listos)
| Modelo | Accuracy | Tamaño | Estado |
|--------|----------|--------|--------|
| Detector Duplicados | 90.12% | 0.57 MB | ✅ |
| Clasificador Prioridad | 99.64% | 0.57 MB | ✅ |
| Predictor SLA Breach | 85.29% | 0.59 MB | ✅ |
| Assignee Suggester | 23.41% | 1.42 MB | ✅ |
| Labels Suggester | 25% (P:91.67%) | 1.32 MB | ✅ |
| **Status Suggester** | **89.28%** | **0.58 MB** | ✅ |
**Total**: ~5 MB de modelos + 300 MB spaCy
---
## 🏗️ Arquitectura Recomendada: MICROSERVICIO ML
### Opción 1: **Servicio ML Independiente** (RECOMENDADO ⭐)
```
┌─────────────────────────────────────────────┐
│           SPEEDYFLOW MVP                    │
│  (Flask + HTML/CSS/JS)                      │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │     Frontend Kanban Board            │  │
│  │   (HTML + Vanilla JS + Fetch API)    │  │
│  └────────────┬─────────────────────────┘  │
│               │                             │
│               │ HTTP/REST                   │
│               ↓                             │
│  ┌──────────────────────────────────────┐  │
│  │    Backend API (Flask)               │  │
│  │  /api/issues, /api/transitions       │  │
│  └──────┬──────────────────┬────────────┘  │
│         │                  │                │
│         │ HTTP             │ HTTP           │
│         ↓                  ↓                │
│  ┌─────────────┐    ┌──────────────────┐  │
│  │ JIRA API    │    │  ML Service      │  │
│  │ (External)  │    │  Port 5001       │  │
│  └─────────────┘    └──────────────────┘  │
└─────────────────────────────────────────────┘
            ┌─────────────────────────────────┐
            │   ML Microservice (FastAPI)     │
            │   Port: 5001                    │
            │                                 │
            │  Endpoints:                     │
            │  • POST /ml/predict/duplicate   │
            │  • POST /ml/predict/priority    │
            │  • POST /ml/predict/sla-breach  │
            │  • POST /ml/suggest/assignee    │
            │  • POST /ml/suggest/labels      │
            │  • POST /ml/suggest/status      │
            │  • POST /ml/predict/all         │
            │                                 │
            │  Models (cargados en memoria):  │
            │  • 6 modelos Keras (~5MB)       │
            │  • spaCy es_core_news_md        │
            │  • Encoders/Binarizers          │
            └─────────────────────────────────┘
```
### Opción 2: **Integración Directa en Flask** (Más Simple)
```
┌────────────────────────────────────────┐
│      SPEEDYFLOW MVP (Flask)            │
│                                        │
│  Frontend → Flask Routes → ML Lib     │
│                      ↓                 │
│              SpeedyflowMLPredictor     │
│              (cargado al iniciar)      │
└────────────────────────────────────────┘
```
---
## ⚡ Comparación de Opciones
| Aspecto | Microservicio ML | Integración Directa |
|---------|-----------------|---------------------|
| **Escalabilidad** | ⭐⭐⭐⭐⭐ Escala independiente | ⭐⭐ Limitada al proceso Flask |
| **Performance** | ⭐⭐⭐⭐ HTTP overhead mínimo | ⭐⭐⭐⭐⭐ Sin overhead |
| **Mantenimiento** | ⭐⭐⭐⭐⭐ Aislado, fácil update | ⭐⭐⭐ Acoplado |
| **Memoria** | ⭐⭐⭐⭐⭐ Proceso separado | ⭐⭐ +305MB en Flask |
| **Deployment** | ⭐⭐⭐ 2 servicios | ⭐⭐⭐⭐⭐ 1 servicio |
| **Debugging** | ⭐⭐⭐⭐ Logs separados | ⭐⭐⭐ Logs mezclados |
| **Caching** | ⭐⭐⭐⭐⭐ Fácil implementar | ⭐⭐⭐ Complejo |
| **Latencia** | ~10-50ms HTTP | <1ms local |
---
## 🎯 Recomendación: MICROSERVICIO ML
### Por qué?
1. **Memoria**: spaCy + modelos = 305MB → No afectar Flask
2. **Escalabilidad**: Horizontal scaling independiente
3. **Desarrollo**: Equipo ML trabaja aislado
4. **Producción**: Restart ML sin afectar frontend
5. **Caché**: Redis/Memcached fácil de agregar
---
## 📦 Estructura de Archivos Propuesta
```
SPEEDYFLOW-JIRA-Platform/
├── api/                          # Flask Backend (Puerto 5000)
│   ├── server.py
│   ├── blueprints/
│   └── ...
│
├── /                   # ⭐ NUEVO: Microservicio ML (Puerto 5001)
│   ├── main.py                   # FastAPI app
│   ├── predictor.py              # SpeedyflowMLPredictor
│   ├── models/                   # Modelos entrenados
│   │   ├── duplicate_detector.keras
│   │   ├── priority_classifier.keras
│   │   ├── breach_predictor.keras
│   │   ├── assignee_suggester.keras
│   │   ├── labels_suggester.keras
│   │   ├── status_suggester.keras
│   │   └── *.pkl (encoders)
│   ├── cache/                    # Cache de predicciones
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── static/
│   │   └── js/
│   │       └── ml_client.js      # ⭐ Cliente JS para ML API
│   └── templates/
│
├── utils/
│   ├── ml_predictor.py           # Clase predictor (shared)
│   └── ...
│
├── scripts/                      # Scripts de entrenamiento
│   ├── train_*.py
│   └── ...
│
└── docs/
    └── ML_API.md                 # ⭐ Documentación API ML
```
---
## 🔌 API Endpoints del Microservicio ML
### 1. Predict All (Recomendado para UI)
```http
POST /ml/predict/all
Content-Type: application/json
{
  "summary": "Error en API de autenticación",
  "description": "Usuarios no pueden hacer login..."
}
Response:
{
  "duplicate_check": {
    "is_duplicate": false,
    "confidence": 0.94,
    "similar_tickets": ["MSM-1234"]
  },
  "priority": {
    "suggested": "High",
    "confidence": 0.87
  },
  "sla_breach": {
    "will_breach": true,
    "risk_level": "HIGH",
    "probability": 0.73
  },
  "assignee": {
    "suggestions": [
      {"name": "carlos.quintero", "confidence": 0.45},
      {"name": "adrian.villegas", "confidence": 0.32}
    ]
  },
  "labels": {
    "suggested": ["backend", "api", "auth"],
    "confidence": [0.82, 0.75, 0.68]
  },
  "status": {
    "next_status": "En Progreso",
    "confidence": 0.89
  }
}
```
### 2. Predict Individual (Más rápido)
```http
POST /ml/predict/priority
POST /ml/suggest/assignee
POST /ml/suggest/status
...
```
### 3. Health Check
```http
GET /ml/health
Response:
{
  "status": "healthy",
  "models_loaded": 6,
  "memory_usage": "320MB",
  "uptime": "2h 15m"
}
```
---
## 🚀 Plan de Implementación (3 Fases)
### Fase 1: Setup Microservicio (1 día)
- [ ] Crear `/` con FastAPI
- [ ] Mover modelos a `/models/`
- [ ] Implementar endpoints básicos
- [ ] Docker + docker-compose
- [ ] Pruebas locales
### Fase 2: Integración Frontend (1 día)
- [ ] Cliente JS para ML API (`ml_client.js`)
- [ ] Integrar en formulario de creación
- [ ] Mostrar sugerencias en UI
- [ ] Alertas de duplicados/SLA
### Fase 3: Optimización (1 día)
- [ ] Cache con Redis
- [ ] Rate limiting
- [ ] Batch predictions
- [ ] Monitoring (Prometheus)
- [ ] Logs estructurados
---
## 💻 Código Base del Microservicio
### `/main.py` (FastAPI)
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from predictor import SpeedyflowMLPredictor
import time
app = FastAPI(title="SPEEDYFLOW ML Service", version="1.0.0")
# CORS para frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
# Cargar modelos al iniciar
predictor = SpeedyflowMLPredictor(models_dir="./models")
class PredictRequest(BaseModel):
    summary: str
    description: str = ""
@app.post("/ml/predict/all")
async def predict_all(req: PredictRequest):
    start = time.time()
    predictions = predictor.predict_all(req.summary, req.description)
    elapsed = time.time() - start
    return {
        **predictions,
        "latency_ms": int(elapsed * 1000)
    }
@app.get("/ml/health")
async def health():
    return {
        "status": "healthy",
        "models_loaded": len(predictor.models)
    }
```
### `frontend/static/js/ml_client.js`
```javascript
class MLClient {
    constructor(baseURL = 'http://localhost:5001') {
        this.baseURL = baseURL;
    }
    async predictAll(summary, description) {
        const response = await fetch(`${this.baseURL}/ml/predict/all`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({summary, description})
        });
        return response.json();
    }
    async checkDuplicate(summary, description) {
        const data = await this.predictAll(summary, description);
        return data.duplicate_check;
    }
}
const mlClient = new MLClient();
```
---
## 🎨 UI Integration Examples
### 1. Auto-complete en Creación de Ticket
```javascript
// Al escribir summary
document.getElementById('summary').addEventListener('blur', async (e) => {
    const summary = e.target.value;
    const predictions = await mlClient.predictAll(summary, '');
    // Auto-rellenar prioridad
    if (predictions.priority.confidence > 0.8) {
        document.getElementById('priority').value = predictions.priority.suggested;
        showSuggestionBadge('Prioridad sugerida por IA');
    }
    // Sugerir asignados
    const assigneeSelect = document.getElementById('assignee');
    predictions.assignee.suggestions.slice(0, 3).forEach(a => {
        const option = new Option(`${a.name} (${(a.confidence*100).toFixed(0)}%)`, a.name);
        assigneeSelect.add(option);
    });
});
```
### 2. Alerta de Duplicados
```javascript
async function checkForDuplicates(summary, description) {
    const dup = await mlClient.checkDuplicate(summary, description);
    if (dup.is_duplicate && dup.confidence > 0.7) {
        showAlert({
            type: 'warning',
            title: '⚠️ Posible ticket duplicado',
            message: `Similar a: ${dup.similar_tickets.join(', ')}`,
            buttons: ['Continuar', 'Ver similares']
        });
    }
}
```
### 3. Badge de Riesgo SLA
```javascript
async function showSLARisk(summary, description) {
    const sla = await mlClient.predictAll(summary, description).sla_breach;
    if (sla.risk_level === 'HIGH') {
        const badge = document.createElement('span');
        badge.className = 'badge badge-danger';
        badge.innerHTML = '🚨 Alto riesgo de violar SLA';
        document.getElementById('ticket-header').appendChild(badge);
    }
}
```
---
## 📊 Performance Esperado
| Operación | Latencia | Throughput |
|-----------|----------|------------|
| Predict All | 15-30ms | 50-100 req/s |
| Single Model | 5-10ms | 200-500 req/s |
| Con Cache | 1-2ms | 1000+ req/s |
---
## 🐳 Docker Setup
### `/Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Descargar spaCy model
RUN python -m spacy download es_core_news_md
# Copiar código
COPY . .
EXPOSE 5001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5001"]
```
### `docker-compose.yml`
```yaml
version: '3.8'
services:
  speedyflow:
    build: ./api
    ports:
      - "5000:5000"
    depends_on:
      - ml-service
  ml-service:
    build: ./
    ports:
      - "5001:5001"
    environment:
      - MODELS_DIR=/app/models
    volumes:
      - ./models:/app/models
```
---
## ✅ Ventajas Clave
1. **Zero Downtime**: Actualizar ML sin reiniciar Flask
2. **Escalabilidad**: Load balancer → N instancias ML
3. **Caché Inteligente**: Redis con TTL por tipo de predicción
4. **Monitoring**: Métricas ML separadas de Flask
5. **Desarrollo**: Equipos trabajan en paralelo
6. **Testing**: Unit tests ML aislados
---
## 🎯 Siguiente Paso
¿Qué prefieres implementar primero?
**Opción A**: Microservicio ML completo (FastAPI + Docker)
**Opción B**: Integración directa en Flask (más rápido)
**Opción C**: Primero crear cliente JS + mock API
Mi recomendación: **Opción A** para un MVP profesional y escalable.
