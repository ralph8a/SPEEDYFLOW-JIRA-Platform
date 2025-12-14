# Guía: Comment Suggestions (MVP)

Resumen rápido
- Propósito: proveer sugerencias de comentarios asistidas por ML/IA para tickets (MVP).
- Alcance MVP: generación de 3 sugerencias por ticket, botones "Usar" y "Copiar", persistencia básica (guardar acción: used/copy).
- Dependencias opcionales: Ollama local (recomendado) o motor interno.

## 1) Arquitectura (alto nivel)
 - Frontend: `frontend/static/js/modules/ml-comment-suggestions.js` escucha evento `ticketSelected`, renderiza la sección en la Balanced View (Flowing MVP) y llama al backend.
- Backend: endpoints bajo `/api/ml/comments/*` que reciben contexto (summary, description, all_comments) y devuelven sugerencias JSON.
- Caché: frontend TTL ~3h por ticket (in-memory JS), backend TTL configurable (p. ej. 5 min) para evitar recomputes.

## 2) Endpoints (ejemplos)
- POST /api/ml/comments/suggestions
  Request JSON:
  {
    "summary": "...",
    "description": "...",
    "issue_type": "Bug",
    "status": "Open",
    "priority": "High",
    "all_comments": ["coment1","coment2"],
    "max_suggestions": 3
  }
  Response JSON (ejemplo):
  {
    "count": 3,
    "cached": false,
    "suggestions": [
      {"text": "...","type":"resolution","confidence":0.95},
      ...
    ]
  }

- POST /api/ml/comments/save
  Guardar interacción (used/copied) para métricas/feedback.
  Request JSON: { "ticket_key":"PROJ-1", "text":"...", "type":"resolution", "action":"used" }

- GET /api/ml/comments/status
  Devuelve estado del motor (trained, last_training, healthy).

## 3) Integración frontend (puntos clave)
- Evento: `document.dispatchEvent(new CustomEvent('ticketSelected', { detail: { ticket } }))` debe dispararse al abrir un ticket.
 - Render location: la UI ahora se integra en la Balanced View del Flowing MVP; el módulo debe buscar el contenedor principal de la Balanced View (por ejemplo `.balanced-view`) y renderizar allí la sección `.ml-comment-suggestions`.
 - IDs/Clases a comprobar:
  - Balanced view contenedor: `.balanced-view` (o el contenedor principal de detalles del ticket en la implementación Flowing).
  - Lista de comentarios (para contexto): `#commentsList` con elementos `.comment-item` y `.comment-body`.
  - Input de comentario (para "Usar"): `#commentText`, `.comment-input textarea` o `#new-comment-text`.
- Debounce/Cancelación: el frontend debe implementar debounce (300-500ms) y usar AbortController para cancelar requests previos si el usuario cambia de ticket.

## 4) Comportamiento UI (MVP)
- Mostrar 3 sugerencias iniciales.
- Mostrar estado "Analizando..." si no hay cache.
- Si existe cache válida, mostrar inmediatamente y refrescar en background.
- Botones:
  - Usar: pega texto en el comment box y guarda acción 'used'.
  - Copiar: copia al portapapeles y guarda acción 'copied'.
- Mostrar "Mostrar más" si hay > displayedCount (cargar +5 cada vez).

## 5) Caché y resiliencia
- Frontend cache TTL recomendado: 3 horas (en memoria). Permitir fallback a cache expirado si el backend falla.
- Backend cache TTL recomendado: 5 minutos (por contexto hash).
- Timeouts: frontend ~30s-35s máximo por request; backend y motor IA con retry limitado.
- Fallback: si motor IA no disponible, devolver sugerencias fallback (opcional) o mostrar mensaje claro al usuario.

## 6) Theme / Estilos
- Clase contenedor: `.ml-comment-suggestions`.
- Para temas: añadir `theme-light` o `theme-dark` a `.ml-comment-suggestions` (ThemeManager o body class).
- CSS principal: `frontend/static/css/ml-features.css` contiene estilos para cards, estados (loading/error), toast feedback y modo claro/oscur.

## 7) Requisitos y despliegue local (rápido)
1) Instalar dependencias Python:
```bash
pip install -r requirements.txt
```
2) (Opcional) Instalar Ollama y modelo local si usas ese backend:
```bash
# ejemplo (sistema):
ollama pull llama2
ollama serve
```
3) Ejecutar servidor SpeedyFlow:
```bash
python run_server.py
```
4) Probar endpoint (curl):
```bash
curl -sS -X POST http://127.0.0.1:5005/api/ml/comments/suggestions \
  -H 'Content-Type: application/json' \
  -d '{"summary":"Error 500","description":"...","all_comments":[],"max_suggestions":3}' | jq
```

## 8) Troubleshooting rápido
- Si no aparece panel:
  - Confirmar que `ticketSelected` se disparó.
  - Confirmar existencia del contenedor Balanced View (p. ej. `.balanced-view`) y punto de renderizado apropiado.
  - Revisar consola del navegador para errores JS.
- Si requests fallan:
  - Ver `GET /api/ml/comments/status`.
  - Revisar logs del servidor (`logs/speedyflow.log`).
  - Ver si motor IA está corriendo (p. ej. Ollama en puerto 11434).
- Timeouts frecuentes → reducir max_tokens o simplificar prompt, agregar retry.

## 9) Seguridad y privacidad
- Mantener datos en local si se usa Ollama para privacidad.
- No enviar datos de tickets a terceros sin consentimiento.
- Si se habilita un motor externo, documentar claramente variables de entorno y opciones.

## 10) Notas para desarrolladores
- Mantener backwards compatibility: backend puede aceptar `recent_comments` o `all_comments`.
- Registrar métricas de uso (usadas/copiadas) para retroalimentación y mejora del modelo.
- Tests de integración: añadir test que simule `ticketSelected` y que el endpoint responda con sugerencias.

---

Archivo creado: `archive/docs/guides/COMMENT_SUGGESTIONS_REFERENCE.md`
Si quieres que reemplace o combine con el archivo existente `OLLAMA_COMMENT_SUGGESTIONS.md`, lo hago a continuación.
