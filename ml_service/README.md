# 🤖 SPEEDYFLOW ML Service

Microservicio FastAPI que unifica todos los modelos ML/IA para Flowing MVP.

## 📊 Modelos Integrados

| Modelo | Accuracy | Función |
|--------|----------|---------|
| Detector Duplicados | 90.12% | Evitar tickets repetidos |
| Clasificador Prioridad | 99.64% | Auto-completar prioridad |
| Predictor SLA Breach | 85.29% | Alertas tempranas |
| Assignee Suggester | 23.41% | Top-3 asignados |
| Labels Suggester | 25% | Multi-label suggestions |
| Status Suggester | 89.28% | Transiciones inteligentes |

## 🚀 Quick Start

### Desarrollo Local

```bash
# 1. Instalar dependencias
cd ml_service
pip install -r requirements.txt

# 2. Descargar modelo spaCy
python -m spacy download es_core_news_md

# 3. Verificar que los modelos estén en ../models/
ls ../models/

# 4. Iniciar servicio
python main.py
# O con uvicorn:
uvicorn main:app --reload --port 5001
```

### Con Docker

```bash
# Desde la raíz del proyecto
docker-compose up ml-service
```

### Con Docker Compose (Stack completo)

```bash
# Inicia Flask + ML Service
docker-compose up
```

## 📡 API Endpoints

### Health Check
```http
GET http://localhost:5001/health

Response:
{
  "status": "healthy",
  "models_loaded": 6,
  "models": ["duplicate_detector", ...],
  "memory_usage_mb": 320.5,
  "uptime_seconds": 1234
}
```

### Predicción Unificada (Recomendado)
```http
POST http://localhost:5001/ml/predict/all
Content-Type: application/json

{
  "summary": "Error en API de autenticación",
  "description": "Usuarios no pueden hacer login"
}

Response:
{
  "duplicate_check": {
    "is_duplicate": false,
    "confidence": 0.94
  },
  "priority": {
    "suggested_priority": "High",
    "confidence": 0.87,
    "probabilities": {"High": 0.87, "Medium": 0.10, ...}
  },
  "sla_breach": {
    "will_breach": true,
    "breach_probability": 0.73,
    "risk_level": "HIGH"
  },
  "assignee": {
    "suggestions": [
      {"assignee": "carlos.quintero", "confidence": 0.45},
      {"assignee": "adrian.villegas", "confidence": 0.32}
    ],
    "top_choice": {"assignee": "carlos.quintero", "confidence": 0.45}
  },
  "labels": {
    "suggested_labels": [
      {"label": "backend", "confidence": 0.82},
      {"label": "api", "confidence": 0.75}
    ],
    "count": 2
  },
  "status": {
    "suggested_status": "En Progreso",
    "confidence": 0.89,
    "probabilities": {"En Progreso": 0.89, ...}
  },
  "latency_ms": 25,
  "models_used": ["duplicate_detector", "priority_classifier", ...]
}
```

### Predicciones Individuales

```http
POST /ml/predict/duplicate
POST /ml/predict/priority
POST /ml/predict/sla-breach
POST /ml/suggest/assignee?top_k=3
POST /ml/suggest/labels?threshold=0.3
POST /ml/suggest/status
```

### Documentación Interactiva

- **Swagger UI**: http://localhost:5001/docs
- **ReDoc**: http://localhost:5001/redoc

## 🔌 Integración con Flowing MVP

### Cliente JavaScript

```javascript
// frontend/static/js/ml_client.js
class MLClient {
    constructor(baseURL = 'http://localhost:5001') {
        this.baseURL = baseURL;
    }

    async predictAll(summary, description = '') {
        const response = await fetch(`${this.baseURL}/ml/predict/all`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({summary, description})
        });
        return response.json();
    }
}

const mlClient = new MLClient();
```

### Uso en UI

```javascript
// Al crear ticket
document.getElementById('summary').addEventListener('blur', async (e) => {
    const summary = e.target.value;
    const predictions = await mlClient.predictAll(summary, '');
    
    // Auto-completar prioridad
    if (predictions.priority.confidence > 0.8) {
        document.getElementById('priority').value = predictions.priority.suggested_priority;
    }
    
    // Mostrar alerta si es duplicado
    if (predictions.duplicate_check.is_duplicate) {
        showAlert('⚠️ Posible ticket duplicado');
    }
    
    // Alerta de SLA
    if (predictions.sla_breach.risk_level === 'HIGH') {
        showWarning('🚨 Alto riesgo de violar SLA');
    }
});
```

## 💾 Estructura de Archivos

```
ml_service/
├── main.py              # FastAPI app con endpoints
├── predictor.py         # Predictor unificado
├── requirements.txt     # Dependencias
├── Dockerfile          # Imagen Docker
├── README.md           # Este archivo
└── cache/              # Caché de predicciones (creado automáticamente)
```

## 📊 Performance

| Operación | Latencia | Throughput |
|-----------|----------|------------|
| Predict All | 15-30ms | 50-100 req/s |
| Single Model | 5-10ms | 200-500 req/s |
| Con Cache | 1-2ms | 1000+ req/s |

## 🔧 Configuración

### Variables de Entorno

```bash
# Puerto del servicio
PORT=5001

# Directorio de modelos
MODELS_DIR=../models

# Log level
LOG_LEVEL=INFO
```

### Caché

El servicio implementa caché en memoria para predicciones:

```http
# Limpiar caché
POST /cache/clear

# Estadísticas de caché
GET /cache/stats
```

## 🧪 Testing

```bash
# Test básico
curl http://localhost:5001/health

# Test de predicción
curl -X POST http://localhost:5001/ml/predict/all \
  -H "Content-Type: application/json" \
  -d '{"summary": "Test ticket", "description": "Testing ML service"}'

# Ver documentación interactiva
open http://localhost:5001/docs
```

## 📈 Monitoreo

### Métricas Disponibles

```http
GET /models/status

Response:
{
  "loaded_models": ["duplicate_detector", ...],
  "total_predictions": 1234,
  "avg_latency_ms": 18.5,
  "cache_size": 250
}
```

## 🐳 Deployment

### Docker Hub

```bash
# Build
docker build -t speedyflow-ml:latest .

# Run
docker run -p 5001:5001 \
  -v $(pwd)/../models:/app/models:ro \
  speedyflow-ml:latest
```

### Producción

Para producción, considerar:
- Usar Gunicorn + workers
- Configurar reverse proxy (nginx)
- Habilitar HTTPS
- Rate limiting
- Monitoring (Prometheus + Grafana)

```bash
# Con Gunicorn (más robusto)
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:5001
```

## 🔐 Seguridad

### CORS

El servicio está configurado para aceptar requests desde:
- `http://localhost:5000` (Flask backend)
- `http://localhost:3000` (Frontend dev)

Modificar en `main.py` para producción.

### Rate Limiting

TODO: Implementar rate limiting con slowapi

## 🆘 Troubleshooting

### Modelos no cargan

```bash
# Verificar que los modelos existan
ls ../models/*.keras

# Verificar permisos
chmod 644 ../models/*.keras
```

### spaCy no disponible

```bash
# Descargar modelo español
python -m spacy download es_core_news_md
```

### Out of Memory

```bash
# Reducir tamaño de caché en predictor.py
# O aumentar memoria disponible en docker-compose.yml
```

## 📝 TODO

- [ ] Agregar rate limiting
- [ ] Implementar batch predictions
- [ ] Integrar Prometheus metrics
- [ ] Agregar SimpleAIEngine
- [ ] Agregar ML Suggester (severity)
- [ ] Tests unitarios
- [ ] CI/CD pipeline

## 📄 Licencia

Interno - SPEEDYFLOW Project

## 👥 Contacto

Para soporte: [Tu contacto]
