"""
SPEEDYFLOW ML Service - Microservicio FastAPI simplificado
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from pathlib import Path
from predictor import UnifiedMLPredictor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SPEEDYFLOW ML Service",
    description="Microservicio de ML/IA para Flowing MVP",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class PredictRequest(BaseModel):
    summary: str
    description: Optional[str] = None

class PredictionResponse(BaseModel):
    priority: str
    confidence: float
    suggested_assignee: Optional[str] = None
    suggested_labels: List[str] = []
    sla_risk: str

@app.on_event("startup")
async def startup():
    logger.info("🚀 SPEEDYFLOW ML Service iniciado en puerto 5001")
    # Initialize unified predictor (models directory: ml_service/models)
    models_path = Path(__file__).resolve().parent / "models"
    try:
        app.state.predictor = UnifiedMLPredictor(models_dir=str(models_path), fallback_mode=True)
    except Exception as e:
        logger.error(f"Failed initializing predictor: {e}")
        app.state.predictor = None

@app.get("/")
async def root():
    return {
        "service": "SPEEDYFLOW ML Service",
        "version": "1.0.0",
        "status": "operativo"
    }

@app.get("/health")
async def health():
    predictor = getattr(app.state, 'predictor', None)
    models_loaded = predictor.get_loaded_models() if predictor else []
    mem = predictor.get_memory_usage() if predictor else None
    return {"status": "healthy", "service": "ml-service", "models_loaded": models_loaded, "memory_mb": mem}


@app.get("/models")
async def list_models():
    predictor = getattr(app.state, 'predictor', None)
    if not predictor:
        raise HTTPException(status_code=503, detail="Predictor not available")
    return {"models": predictor.get_loaded_models(), "cache_size": predictor.get_cache_size()}


@app.post("/models/reload")
async def reload_models():
    predictor = getattr(app.state, 'predictor', None)
    if not predictor:
        raise HTTPException(status_code=503, detail="Predictor not available")
    predictor._load_models()
    return {"status": "reloaded", "models": predictor.get_loaded_models()}

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictRequest):
    """
    Predice prioridad, asignado y labels basado en el summary del ticket
    """
    logger.info(f"Prediciendo para: {request.summary[:50]}...")
    
    predictor = getattr(app.state, 'predictor', None)
    if predictor:
        result = predictor.predict_priority(request.summary, request.description or "")
        assignee = predictor.suggest_assignee(request.summary, request.description or "")
        labels = predictor.suggest_labels(request.summary, request.description or "")
        sla = predictor.predict_sla_breach(request.summary, request.description or "")
        return PredictionResponse(
            priority=result.get('suggested_priority', 'Medium'),
            confidence=result.get('confidence', 0.5),
            suggested_assignee=assignee.get('top_choice', {}).get('assignee') if assignee.get('top_choice') else None,
            suggested_labels=[l['label'] for l in labels.get('suggested_labels', [])],
            sla_risk=sla.get('risk_level', 'MEDIUM')
        )
    # Fallback simple heuristic
    priority = "High" if any(word in request.summary.lower() for word in ["urgente", "critico", "error"]) else "Medium"
    confidence = 0.85 if priority == "High" else 0.72
    return PredictionResponse(
        priority=priority,
        confidence=confidence,
        suggested_assignee="dev-team@company.com",
        suggested_labels=["bug", "urgent"],
        sla_risk="HIGH" if priority == "High" else "MEDIUM"
    )


class FullTicket(BaseModel):
    summary: str
    description: Optional[str] = None
    issue_type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    created: Optional[str] = None
    reporter: Optional[str] = None


@app.post('/predict/unified')
async def predict_unified(ticket: FullTicket) -> Dict[str, Any]:
    predictor = getattr(app.state, 'predictor', None)
    if not predictor:
        raise HTTPException(status_code=503, detail='Predictor not available')
    result = predictor.predict_all(ticket.summary, ticket.description or "")
    return result


@app.post('/predict/priority')
async def predict_priority(ticket: FullTicket):
    predictor = getattr(app.state, 'predictor', None)
    if not predictor:
        raise HTTPException(status_code=503, detail='Predictor not available')
    return predictor.predict_priority(ticket.summary, ticket.description or "")


@app.post('/predict/assignee')
async def predict_assignee(ticket: FullTicket):
    predictor = getattr(app.state, 'predictor', None)
    if not predictor:
        raise HTTPException(status_code=503, detail='Predictor not available')
    return predictor.suggest_assignee(ticket.summary, ticket.description or "")


@app.post('/predict/labels')
async def predict_labels(ticket: FullTicket):
    predictor = getattr(app.state, 'predictor', None)
    if not predictor:
        raise HTTPException(status_code=503, detail='Predictor not available')
    return predictor.suggest_labels(ticket.summary, ticket.description or "")


@app.post('/predict/status')
async def predict_status(ticket: FullTicket):
    predictor = getattr(app.state, 'predictor', None)
    if not predictor:
        raise HTTPException(status_code=503, detail='Predictor not available')
    return predictor.suggest_status(ticket.summary, ticket.description or "")


@app.post('/predict/duplicates')
async def predict_duplicates(ticket: FullTicket):
    predictor = getattr(app.state, 'predictor', None)
    if not predictor:
        raise HTTPException(status_code=503, detail='Predictor not available')
    return predictor.predict_duplicate(ticket.summary, ticket.description or "")


@app.post('/predict/sla-breach')
async def predict_sla(ticket: FullTicket):
    predictor = getattr(app.state, 'predictor', None)
    if not predictor:
        raise HTTPException(status_code=503, detail='Predictor not available')
    return predictor.predict_sla_breach(ticket.summary, ticket.description or "")

@app.post("/predict-batch")
async def predict_batch(requests: List[PredictRequest]):
    """
    Predice para múltiples tickets
    """
    results = []
    for req in requests:
        result = await predict(req)
        results.append(result)
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5002)
