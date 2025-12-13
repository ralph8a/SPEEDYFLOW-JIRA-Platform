"""
SPEEDYFLOW ML Service - Versión Simple
Microservicio FastAPI para predicciones ML
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import logging
import random

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
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

# ==================== MODELOS ====================

class PredictRequest(BaseModel):
    summary: str = Field(..., description="Título del ticket")
    description: Optional[str] = Field(default="", description="Descripción")

class PredictionResponse(BaseModel):
    priority: str
    priority_confidence: float
    assignee: str
    assignee_confidence: float
    labels: List[str]
    estimated_resolution_hours: int
    
# ==================== ENDPOINTS ====================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "status": "🚀 SPEEDYFLOW ML Service running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health", tags=["Health"])
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ml-service",
        "port": 5001
    }

@app.post("/predict", response_model=PredictionResponse, tags=["Predictions"])
async def predict(request: PredictRequest):
    """
    Realizar predicción ML en un ticket
    
    Retorna:
    - priority: Prioridad sugerida (Low, Medium, High, Critical)
    - assignee: Usuario sugerido
    - labels: Etiquetas sugeridas
    - estimated_resolution_hours: Horas estimadas de resolución
    """
    try:
        # Lógica simple de predicción basada en palabras clave
        text = (request.summary + " " + request.description).lower()
        
        # Detectar prioridad
        if any(word in text for word in ["critico", "urgente", "caido", "down", "error"]):
            priority = "Critical"
            confidence = 0.85
        elif any(word in text for word in ["lento", "slow", "problema"]):
            priority = "High"
            confidence = 0.75
        else:
            priority = "Medium"
            confidence = 0.60
        
        # Detectar área/assignee
        if any(word in text for word in ["base datos", "database", "sql", "oracle"]):
            assignee = "database-team"
        elif any(word in text for word in ["servidor", "server", "vpn", "network"]):
            assignee = "infrastructure-team"
        elif any(word in text for word in ["frontend", "ui", "css", "html"]):
            assignee = "frontend-team"
        else:
            assignee = "support-team"
        
        # Detectar labels
        labels = []
        if "splunk" in text:
            labels.append("monitoring")
        if "cdr" in text or "telefono" in text:
            labels.append("telecom")
        if "base datos" in text or "database" in text:
            labels.append("database")
        if not labels:
            labels = ["general"]
        
        # Estimar tiempo de resolución
        if priority == "Critical":
            hours = random.randint(1, 4)
        elif priority == "High":
            hours = random.randint(4, 12)
        else:
            hours = random.randint(12, 48)
        
        return PredictionResponse(
            priority=priority,
            priority_confidence=confidence,
            assignee=assignee,
            assignee_confidence=0.70,
            labels=labels,
            estimated_resolution_hours=hours
        )
    
    except Exception as e:
        logger.error(f"Error en predicción: {e}")
        return PredictionResponse(
            priority="Medium",
            priority_confidence=0.5,
            assignee="support-team",
            assignee_confidence=0.5,
            labels=["general"],
            estimated_resolution_hours=24
        )

@app.post("/analyze", tags=["Analysis"])
async def analyze(request: PredictRequest):
    """
    Analizar ticket y retornar análisis detallado
    """
    text = (request.summary + " " + request.description).lower()
    
    analysis = {
        "summary": request.summary,
        "word_count": len(text.split()),
        "has_error_keywords": any(word in text for word in ["error", "falla", "problema"]),
        "has_urgent_keywords": any(word in text for word in ["urgente", "critico", "inmediato"]),
        "technical_keywords": [],
        "suggested_action": "Asignar a equipo correspondiente"
    }
    
    # Detectar palabras técnicas
    technical_keywords = {
        "splunk": ["splunk", "logs", "logging"],
        "database": ["base datos", "database", "sql", "oracle", "mysql"],
        "telecom": ["cdr", "pbx", "telefono", "voip"],
        "network": ["vpn", "router", "firewall", "red"]
    }
    
    for category, keywords in technical_keywords.items():
        if any(kw in text for kw in keywords):
            analysis["technical_keywords"].append(category)
    
    return analysis

@app.post("/batch-predict", tags=["Predictions"])
async def batch_predict(requests: List[PredictRequest]):
    """
    Realizar predicciones en batch
    """
    results = []
    for req in requests:
        pred = await predict(req)
        results.append(pred)
    return {"predictions": results, "count": len(results)}

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Iniciando SPEEDYFLOW ML Service en puerto 5001...")
    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")
