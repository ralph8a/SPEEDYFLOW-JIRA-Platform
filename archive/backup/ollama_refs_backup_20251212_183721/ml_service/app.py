"""
SPEEDYFLOW ML Service - Microservicio FastAPI simplificado
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
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
@app.get("/")
async def root():
    return {
        "service": "SPEEDYFLOW ML Service",
        "version": "1.0.0",
        "status": "operativo"
    }
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ml-service"}
@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictRequest):
    """
    Predice prioridad, asignado y labels basado en el summary del ticket
    """
    logger.info(f"Prediciendo para: {request.summary[:50]}...")
    # Demo: retornar predicciones básicas
    priority = "High" if any(word in request.summary.lower() for word in ["urgente", "critico", "error"]) else "Medium"
    confidence = 0.85 if priority == "High" else 0.72
    return PredictionResponse(
        priority=priority,
        confidence=confidence,
        suggested_assignee="dev-team@company.com",
        suggested_labels=["bug", "urgent"],
        sla_risk="HIGH" if priority == "High" else "MEDIUM"
    )
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
