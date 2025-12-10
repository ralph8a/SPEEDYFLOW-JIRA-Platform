"""
SPEEDYFLOW ML Service - Microservicio FastAPI
Unifica todos los modelos ML/IA para Flowing MVP
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import time
import logging

from predictor import UnifiedMLPredictor

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="SPEEDYFLOW ML Service",
    description="Microservicio unificado de ML/IA para Flowing MVP",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS - Permitir acceso desde Flowing MVP (puerto 5000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:3000",  # Si usas frontend separado
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar predictor al iniciar
predictor = None

@app.on_event("startup")
async def startup_event():
    """Cargar modelos al iniciar el servicio"""
    global predictor
    logger.info("🚀 Iniciando SPEEDYFLOW ML Service...")
    
    try:
        predictor = UnifiedMLPredictor(models_dir="../models")
        logger.info(f"✅ Modelos cargados: {predictor.get_loaded_models()}")
    except Exception as e:
        logger.error(f"❌ Error cargando modelos: {e}")
        # Continuar sin modelos (modo degradado)
        predictor = UnifiedMLPredictor(models_dir="../models", fallback_mode=True)

@app.on_event("shutdown")
async def shutdown_event():
    """Limpiar recursos al apagar"""
    logger.info("👋 Cerrando SPEEDYFLOW ML Service...")

# ==================== MODELOS DE DATOS ====================

class PredictRequest(BaseModel):
    """Request para predicciones"""
    summary: str = Field(..., description="Título/resumen del ticket")
    description: str = Field(default="", description="Descripción detallada")
    
    class Config:
        json_schema_extra = {
            "example": {
                "summary": "Error en API de autenticación",
                "description": "Los usuarios no pueden hacer login desde la app móvil"
            }
        }

class DuplicateResponse(BaseModel):
    """Respuesta de detección de duplicados"""
    is_duplicate: bool
    confidence: float
    similar_tickets: List[str] = []

class PriorityResponse(BaseModel):
    """Respuesta de clasificación de prioridad"""
    suggested_priority: str
    confidence: float
    probabilities: Dict[str, float]

class SLABreachResponse(BaseModel):
    """Respuesta de predicción de SLA breach"""
    will_breach: bool
    breach_probability: float
    risk_level: str  # HIGH, MEDIUM, LOW

class AssigneeSuggestion(BaseModel):
    """Sugerencia de asignado"""
    assignee: str
    confidence: float

class AssigneeResponse(BaseModel):
    """Respuesta de sugerencia de asignados"""
    suggestions: List[AssigneeSuggestion]
    top_choice: Optional[AssigneeSuggestion]

class LabelSuggestion(BaseModel):
    """Sugerencia de label"""
    label: str
    confidence: float

class LabelsResponse(BaseModel):
    """Respuesta de sugerencia de labels"""
    suggested_labels: List[LabelSuggestion]
    count: int

class StatusResponse(BaseModel):
    """Respuesta de sugerencia de estado"""
    suggested_status: str
    confidence: float
    probabilities: Dict[str, float]

class UnifiedPredictionResponse(BaseModel):
    """Respuesta unificada con todas las predicciones"""
    duplicate_check: DuplicateResponse
    priority: PriorityResponse
    sla_breach: SLABreachResponse
    assignee: AssigneeResponse
    labels: LabelsResponse
    status: StatusResponse
    latency_ms: int
    models_used: List[str]

# ==================== ENDPOINTS ====================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "service": "SPEEDYFLOW ML Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "predict_all": "/ml/predict/all",
            "models_status": "/models/status"
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Predictor not initialized")
    
    return {
        "status": "healthy",
        "models_loaded": len(predictor.models),
        "models": list(predictor.models.keys()),
        "memory_usage_mb": predictor.get_memory_usage(),
        "uptime_seconds": int(time.time() - predictor.start_time)
    }

@app.get("/models/status", tags=["Models"])
async def models_status():
    """Estado de todos los modelos"""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Predictor not initialized")
    
    return {
        "loaded_models": predictor.get_loaded_models(),
        "total_predictions": predictor.prediction_count,
        "avg_latency_ms": predictor.avg_latency_ms,
        "cache_size": predictor.get_cache_size()
    }

# ==================== PREDICCIONES UNIFICADAS ====================

@app.post("/ml/predict/all", response_model=UnifiedPredictionResponse, tags=["Predictions"])
async def predict_all(request: PredictRequest):
    """
    Predicción unificada - Obtiene todas las predicciones en una sola llamada
    
    **Uso recomendado**: Llamar este endpoint al crear o editar un ticket
    
    **Retorna**:
    - Detección de duplicados
    - Clasificación de prioridad
    - Predicción de violación de SLA
    - Sugerencias de asignados
    - Sugerencias de labels
    - Sugerencia de siguiente estado
    """
    if predictor is None:
        raise HTTPException(status_code=503, detail="Predictor not available")
    
    start_time = time.time()
    
    try:
        result = predictor.predict_all(request.summary, request.description)
        latency_ms = int((time.time() - start_time) * 1000)
        
        return {
            **result,
            "latency_ms": latency_ms,
            "models_used": predictor.get_loaded_models()
        }
    
    except Exception as e:
        logger.error(f"Error en predict_all: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

# ==================== PREDICCIONES INDIVIDUALES ====================

@app.post("/ml/predict/duplicate", response_model=DuplicateResponse, tags=["Predictions"])
async def predict_duplicate(request: PredictRequest):
    """Detectar si un ticket es duplicado"""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Predictor not available")
    
    try:
        return predictor.predict_duplicate(request.summary, request.description)
    except Exception as e:
        logger.error(f"Error en predict_duplicate: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/predict/priority", response_model=PriorityResponse, tags=["Predictions"])
async def predict_priority(request: PredictRequest):
    """Sugerir prioridad del ticket"""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Predictor not available")
    
    try:
        return predictor.predict_priority(request.summary, request.description)
    except Exception as e:
        logger.error(f"Error en predict_priority: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/predict/sla-breach", response_model=SLABreachResponse, tags=["Predictions"])
async def predict_sla_breach(request: PredictRequest):
    """Predecir si habrá violación de SLA"""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Predictor not available")
    
    try:
        return predictor.predict_sla_breach(request.summary, request.description)
    except Exception as e:
        logger.error(f"Error en predict_sla_breach: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/suggest/assignee", response_model=AssigneeResponse, tags=["Suggestions"])
async def suggest_assignee(request: PredictRequest, top_k: int = 3):
    """Sugerir asignados para el ticket"""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Predictor not available")
    
    try:
        return predictor.suggest_assignee(request.summary, request.description, top_k=top_k)
    except Exception as e:
        logger.error(f"Error en suggest_assignee: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/suggest/labels", response_model=LabelsResponse, tags=["Suggestions"])
async def suggest_labels(request: PredictRequest, threshold: float = 0.3):
    """Sugerir labels/etiquetas para el ticket"""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Predictor not available")
    
    try:
        return predictor.suggest_labels(request.summary, request.description, threshold=threshold)
    except Exception as e:
        logger.error(f"Error en suggest_labels: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/suggest/status", response_model=StatusResponse, tags=["Suggestions"])
async def suggest_status(request: PredictRequest):
    """Sugerir siguiente estado del ticket"""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Predictor not available")
    
    try:
        return predictor.suggest_status(request.summary, request.description)
    except Exception as e:
        logger.error(f"Error en suggest_status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== CACHE ====================

@app.post("/cache/clear", tags=["Cache"])
async def clear_cache():
    """Limpiar caché de predicciones"""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Predictor not available")
    
    predictor.clear_cache()
    return {"message": "Cache cleared", "status": "ok"}

@app.get("/cache/stats", tags=["Cache"])
async def cache_stats():
    """Estadísticas del caché"""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Predictor not available")
    
    return {
        "cache_size": predictor.get_cache_size(),
        "cache_hits": predictor.cache_hits,
        "cache_misses": predictor.cache_misses,
        "hit_rate": predictor.cache_hits / (predictor.cache_hits + predictor.cache_misses) if (predictor.cache_hits + predictor.cache_misses) > 0 else 0
    }

# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5001,
        reload=True,  # Auto-reload durante desarrollo
        log_level="info"
    )
