# Flowing MVP - Context-Aware AI Assistant

Sistema de asistente inteligente con detección de contexto y sugerencias en tiempo real.

## 📁 Estructura

```
flowing-mvp/
├── css/
│   ├── flowing-context-aware.css  # Estilos para modales y botones contextuales
│   └── footer.css                  # Estilos del footer flotante
│
├── js/
│   ├── context-detector.js         # Sistema de detección de contexto
│   └── footer-assistant.js         # Footer chat assistant
│
└── README.md                        # Este archivo
```

## 🎯 Componentes

### 1. Context Detector (`context-detector.js`)
**Responsabilidad**: Detectar automáticamente el contexto actual del usuario

**Contextos soportados**:
- `kanban_board` - Vista general del tablero Kanban
- `kanban_card` - Tarjeta específica en hover/focus
- `list_view` - Vista de lista de tickets
- `right_sidebar` - Sidebar con ticket abierto
- `comments_section` - Sección de comentarios activa
- `filter_bar` - Barra de filtros con focus

**API Principal**:
```javascript
window.FlowingContext.detectContext()          // Detecta contexto actual
window.FlowingContext.getSuggestions()         // Obtiene sugerencias de IA
window.FlowingContext.showSuggestionsModal()   // Muestra modal con sugerencias
```

### 2. Footer Assistant (`footer-assistant.js`)
**Responsabilidad**: Chat assistant flotante con IA

**Features**:
- Chat conversacional con historial
- Rotación automática de sugerencias
- Detección de contexto integrada
- Análisis de métricas de queue
- Formato Markdown en respuestas

**API Principal**:
```javascript
window.flowingFooter.toggle()                  // Expandir/colapsar
window.flowingFooter.askAboutTicket(key)       // Preguntar sobre ticket
window.flowingFooter.suggestActions(key)       // Sugerir acciones
window.flowingFooter.explainSLA(key)           // Explicar SLA
```

## 🎨 Clases CSS Principales

### Footer
```css
.flowing-footer                  /* Contenedor principal */
.flowing-toggle-btn              /* Botón de toggle */
.flowing-content                 /* Área de contenido */
.flowing-messages                /* Contenedor de mensajes */
.flowing-message                 /* Mensaje individual */
.flowing-input                   /* Campo de entrada */
.flowing-send-btn                /* Botón enviar */
```

### Modales Contextuales
```css
.flowing-modal                   /* Modal overlay */
.flowing-modal-content           /* Contenido del modal */
.flowing-suggestion-card         /* Tarjeta de sugerencia */
.flowing-action-btn              /* Botón de acción */
```

## 🔌 Integración con Backend

### Endpoints Utilizados

#### 1. Sugerencias Contextuales
```javascript
POST /api/flowing/contextual-suggestions
{
  "context": "kanban_board",
  "issue_key": "MSM-123",  // opcional
  "context_data": {
    "view": "kanban",
    "queue": "queue-id",
    "issueCount": 42
  }
}
```

#### 2. Búsqueda Semántica
```javascript
POST /api/flowing/semantic-search
{
  "query": "problemas de login",
  "limit": 5,
  "min_similarity": 0.5
}
```

#### 3. Detección de Duplicados
```javascript
POST /api/flowing/detect-duplicates
{
  "issue_key": "MSM-123",
  "min_similarity": 0.75
}
```

#### 4. Sugerencias de Respuesta
```javascript
POST /api/flowing/suggest-response
{
  "issue_key": "MSM-123",
  "response_type": "all",  // acknowledgment, request_info, resolution
  "tone": "professional"
}
```

#### 5. Resumen de Conversación
```javascript
POST /api/flowing/summarize-conversation
{
  "issue_key": "MSM-123",
  "max_length": 300
}
```

#### 6. Traducción de Comentarios
```javascript
POST /api/flowing/translate-comment
{
  "text": "Error al iniciar sesión",
  "target_language": "en",
  "source_language": "auto"
}
```

## 🚀 Uso

### Inclusión en HTML
```html
<!-- CSS -->
<link rel="stylesheet" href="/static/flowing-mvp/css/footer.css">
<link rel="stylesheet" href="/static/flowing-mvp/css/flowing-context-aware.css">

<!-- JavaScript -->
<script src="/static/flowing-mvp/js/footer-assistant.js"></script>
<script src="/static/flowing-mvp/js/context-detector.js"></script>
```

### HTML del Footer
```html
<div id="flowingFooter" class="flowing-footer collapsed">
  <button id="flowingToggleBtn" class="flowing-toggle-btn">
    <span class="flowing-icon flowing-sf-logo">SF</span>
    <div class="flowing-info">
      <span class="flowing-label">Flowing MVP</span>
      <span class="flowing-suggestion">Analyzing your queue...</span>
    </div>
    <span class="flowing-chevron">▲</span>
  </button>
  
  <div class="flowing-content">
    <!-- Header, messages, input -->
  </div>
</div>
```

## 🔧 Configuración

### Detección de Contexto
```javascript
// Personalizar intervalos de detección
FlowingContext.setupContextDetection();

// Detectar manualmente
const context = FlowingContext.detectContext();
console.log('Contexto actual:', context);
```

### Sugerencias del Footer
```javascript
// Cambiar intervalo de rotación
flowingFooter.startSuggestionRotation(5000); // 5 segundos

// Agregar mensaje programáticamente
flowingFooter.addMessage('Hola!', 'user');
flowingFooter.addMessage('¿En qué puedo ayudarte?', 'assistant');
```

## 🎯 Estados y Eventos

### Estados del Footer
- `collapsed` - Footer minimizado
- `expanded` - Footer expandido
- `loading` - Esperando respuesta de IA

### Eventos Personalizados
```javascript
// Detectar cambio de contexto
document.addEventListener('flowingContextChange', (e) => {
  console.log('Nuevo contexto:', e.detail.context);
});

// Detectar apertura de footer
document.addEventListener('flowingFooterOpened', () => {
  console.log('Footer abierto');
});
```

## 🐛 Debugging

### Console Logs
```javascript
// Habilitar logs detallados
window.FlowingContext.debug = true;
window.flowingFooter.debug = true;

// Ver contexto actual
console.log(window.FlowingContext.currentContext);
console.log(window.FlowingContext.contextData);

// Ver estado del footer
console.log(window.flowingFooter.isExpanded);
console.log(window.flowingFooter.context);
```

### Verificar Integración
```javascript
// Verificar que componentes están cargados
if (window.FlowingContext) console.log('✅ Context Detector loaded');
if (window.flowingFooter) console.log('✅ Footer Assistant loaded');
```

## 📝 Notas de Desarrollo

### Dependencias
- Ollama (opcional) - Para IA real, fallback a templates
- NumPy (backend) - Para similitud vectorial
- JIRA API - Para datos de tickets

### Performance
- Detección de contexto: ~50ms
- Búsqueda semántica: ~500ms (con embeddings)
- Generación de respuestas: ~2-4s (con Ollama)

### Fallbacks
- Sin Ollama → Templates predefinidos
- Sin embeddings → Búsqueda JQL básica
- Sin conexión → Sugerencias offline

## 🔄 Migraciones Recientes

### De AI Copilot a Flowing Footer
- ~~`aiCopilotFooter`~~ → `flowingFooter`
- ~~`ai-copilot-footer`~~ → `flowing-footer`
- ~~`copilot-*`~~ → `flowing-*`
- ~~`AICopilot`~~ → `FlowingFooter`

## 📚 Documentación Adicional

- [OLLAMA_SETUP_GUIDE.md](../../OLLAMA_SETUP_GUIDE.md) - Setup de Ollama
- [FLOWING_MVP_CONTEXTUAL_SUGGESTIONS.md](../../docs/FLOWING_MVP_CONTEXTUAL_SUGGESTIONS.md) - Arquitectura completa
- [API Blueprints](../../api/blueprints/) - Endpoints backend

---

**Última actualización**: Diciembre 6, 2025  
**Versión**: 2.0 (Post-refactor)  
**Status**: ✅ Production Ready
