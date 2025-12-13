"""
SPEEDYFLOW ML Service - Microservicio FastAPI simplificado
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from pathlib import Path
from predictor import UnifiedMLPredictor
from chat import ChatEngine
from comment_suggester import CommentSuggester
import utils.api_migration as api_migration
from ingest_onenote import ingest_pdf_to_docs
from docs_parser import extract_endpoints_from_text, extract_playbooks_from_text
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
        app.state.chat = ChatEngine(docs_dir=str(models_path.resolve().parent / 'docs'))
        app.state.comment_suggester = CommentSuggester(predictor=app.state.predictor)
    except Exception as e:
        logger.error(f"Failed initializing predictor: {e}")
        app.state.predictor = None
        app.state.chat = ChatEngine()
        app.state.comment_suggester = CommentSuggester()

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


class ChatRequest(BaseModel):
    message: str


@app.post('/chat')
async def chat_endpoint(req: ChatRequest):
    chat = getattr(app.state, 'chat', None)
    if not chat:
        raise HTTPException(status_code=503, detail='Chat engine not available')
    return chat.answer(req.message)


class CommentSuggestRequest(BaseModel):
    issue_key: str
    summary: str
    comments: str


@app.post('/predict/comment-suggest')
async def predict_comment_suggest(req: CommentSuggestRequest):
    suggester: CommentSuggester = getattr(app.state, 'comment_suggester', None)
    if not suggester:
        raise HTTPException(status_code=503, detail='Comment suggester not available')
    result = suggester.suggest_actions(req.summary, req.comments or '')
    return result


class CommentActionRequest(BaseModel):
    issue_key: str
    action: str  # 'post_comment' | 'assign'
    comment: str = None
    assignee: str = None


@app.post('/comment/action')
async def comment_action(req: CommentActionRequest):
    # Perform actions against JIRA via api_migration
    if req.action == 'post_comment':
        if not req.comment:
            raise HTTPException(status_code=400, detail='comment required')
        res = api_migration.add_comment(req.issue_key, req.comment)
        if res is None:
            raise HTTPException(status_code=500, detail='failed to add comment')
        return {'status': 'comment_posted', 'response': res}
    elif req.action == 'assign':
        if not req.assignee:
            raise HTTPException(status_code=400, detail='assignee required')
        ok = api_migration.assign_issue(req.issue_key, req.assignee)
        if not ok:
            raise HTTPException(status_code=500, detail='failed to assign')
        return {'status': 'assigned', 'assignee': req.assignee}
    else:
        raise HTTPException(status_code=400, detail='unknown action')


@app.post('/docs/ingest')
async def docs_ingest(path: Optional[str] = None):
    """Ingest a PDF (OneNote export) into the knowledge docs folder.
    Provide absolute path on server or leave empty to return error.
    """
    if not path:
        raise HTTPException(status_code=400, detail='pdf path required')
    try:
        out = ingest_pdf_to_docs(path)
        # reload chat engine documents
        app.state.chat = ChatEngine()
        return {'status': 'ingested', 'path': out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/docs/search')
async def docs_search(q: str):
    chat = getattr(app.state, 'chat', None)
    if not chat:
        raise HTTPException(status_code=503, detail='chat engine not available')
    return chat.answer(q, top_k=5)


@app.post('/docs/extract-endpoints')
async def docs_extract_endpoints(file: Optional[str] = None):
    docs_dir = Path(__file__).resolve().parent / 'docs'
    texts = []
    if file:
        p = docs_dir / file
        if not p.exists():
            raise HTTPException(status_code=404, detail='file not found')
        texts.append(p.read_text(encoding='utf-8', errors='ignore'))
    else:
        for p in docs_dir.glob('*.txt'):
            texts.append(p.read_text(encoding='utf-8', errors='ignore'))

    full = '\n\n'.join(texts)
    endpoints = extract_endpoints_from_text(full)
    return {'endpoints': endpoints}


@app.post('/docs/extract-playbooks')
async def docs_extract_playbooks(file: Optional[str] = None):
    docs_dir = Path(__file__).resolve().parent / 'docs'
    texts = []
    if file:
        p = docs_dir / file
        if not p.exists():
            raise HTTPException(status_code=404, detail='file not found')
        texts.append(p.read_text(encoding='utf-8', errors='ignore'))
    else:
        for p in docs_dir.glob('*.txt'):
            texts.append(p.read_text(encoding='utf-8', errors='ignore'))

    full = '\n\n'.join(texts)
    playbooks = extract_playbooks_from_text(full)
    return {'playbooks': playbooks}

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
