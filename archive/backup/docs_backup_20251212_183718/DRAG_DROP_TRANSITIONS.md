# 🎯 Drag & Drop Transitions - Barra Vertical
## 📋 Descripción
Sistema de transiciones de tickets mediante **drag & drop** con barra vertical flotante que emerge entre las columnas del kanban. Las transiciones disponibles se obtienen dinámicamente de JIRA según el workflow del ticket.
## ✨ Características
- ✅ **Transiciones Dinámicas**: Obtiene transiciones disponibles desde JIRA API
- ✅ **UI Original**: Barra vertical centrada que emerge entre columnas
- ✅ **Glassmorphism**: Estilo moderno con backdrop blur y transparencias
- ✅ **Animaciones Fluidas**: Columnas que se separan, cards que vuelan a destino
- ✅ **Feedback Visual**: Hover effects, drag-over states, notificaciones
- ✅ **Iconos Contextuales**: Emojis automáticos según tipo de transición
- ✅ **Responsive**: Adaptable a móviles y tablets
## 🎨 Concepto Visual
```
ESTADO NORMAL:
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│  TODO   │  │ PROGRESS│  │ REVIEW  │  │  DONE   │
├─────────┤  ├─────────┤  ├─────────┤  ├─────────┤
│ [Card]  │  │ [Card]  │  │         │  │ [Card]  │
│ [Card]  │  │         │  │         │  │         │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
DRAG START → Columnas se separan:
┌─────────┐         ╔═══════════╗         ┌─────────┐
│  TODO   │         ║ 🎯 DROP   ║         │ PROGRESS│
├─────────┤         ║  AQUÍ:    ║         ├─────────┤
│ [Card]  │    ←    ║           ║    →    │ [Card]  │
│ [Card]  │         ║ ▶️ Start  ║         │         │
└─────────┘         ║ ⏸ Pause   ║         └─────────┘
                    ║ 👤 Wait   ║
┌─────────┐         ║ 🔗 Depend ║         ┌─────────┐
│ REVIEW  │         ║ ✅ Done   ║         │  DONE   │
├─────────┤         ║ 🔒 Close  ║         ├─────────┤
│         │         ╚═══════════╝         │ [Card]  │
└─────────┘                               └─────────┘
```
## 🚀 Uso
### 1. Drag Start
- Toma una tarjeta de ticket
- Las columnas se separan automáticamente (300ms ease-out)
- Aparece la barra de transiciones centrada
### 2. Ver Transiciones
- La barra muestra todas las transiciones válidas para ese ticket
- Cada transición tiene:
  - Icono contextual (🎯 automático según nombre)
  - Nombre de la transición
  - Estado destino
### 3. Ejecutar Transición
- Arrastra sobre la transición deseada
- La zona se ilumina (drag-over effect)
- Suelta el mouse para ejecutar
- El ticket vuela animadamente a su nueva columna
### 4. Confirmación
- Notificación de éxito/error
- Board se recarga con nuevos datos
## 📁 Archivos del Sistema
### Frontend - CSS
```
frontend/static/css/components/transition-bar-vertical.css
```
- Estilos glassmorphism para la barra
- Animaciones de columnas y transiciones
- Hover effects y drag-over states
- Responsive breakpoints
### Frontend - JavaScript
```
frontend/static/js/modules/drag-transition-vertical.js
```
- `DragTransitionVertical` class principal
- Event listeners para drag/drop
- Fetch de transiciones desde API
- Animaciones de cards
- Notificaciones de usuario
### Backend - API
```
api/blueprints/transitions.py
```
**Endpoints:**
- `GET /api/issues/<issue_key>/transitions` - Lista transiciones disponibles
- `POST /api/issues/<issue_key>/transitions` - Ejecuta una transición
### Integración
```
frontend/templates/index.html
```
- Carga de CSS: `<link href="transition-bar-vertical.css">`
- Carga de JS: `<script src="drag-transition-vertical.js">`
## 🔧 API Reference
### GET /api/issues/{issue_key}/transitions
**Response:**
```json
{
  "transitions": [
    {
      "id": "31",
      "name": "Start Progress",
      "to": {
        "id": "3",
        "name": "In Progress"
      },
      "targetStatus": "In Progress"
    }
  ],
  "count": 5
}
```
### POST /api/issues/{issue_key}/transitions
**Request Body:**
```json
{
  "transition": {
    "id": "31"
  },
  "fields": {},     // Opcional
  "update": {}      // Opcional
}
```
**Response:**
```json
{
  "status": "success",
  "issue_key": "MSM-1234",
  "transition_id": "31",
  "message": "Transition executed successfully"
}
```
## 🎨 Personalización
### Iconos de Transiciones
Los iconos se asignan automáticamente según el nombre de la transición en `getIconForTransition()`:
```javascript
const iconMap = {
  'start': '▶️',
  'pause': '⏸',
  'done': '✅',
  'close': '🔒',
  'waiting': '⏳',
  'client': '👤',
  'external': '🔗',
  'review': '👀',
  // ...
};
```
**Para agregar nuevos iconos:**
1. Edita `drag-transition-vertical.js`
2. Agrega entrada al `iconMap`
3. Usa palabras clave que aparezcan en los nombres de transiciones
### Colores y Estilos
**Cambiar colores de la barra:**
```css
/* En transition-bar-vertical.css */
.transition-bar-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```
**Cambiar animación de columnas:**
```css
.kanban-board.drag-active .kanban-column:nth-child(-n+2) {
  transform: translateX(-140px); /* Ajustar distancia */
}
```
## 🐛 Troubleshooting
### Las cards no son draggables
**Solución:** Verifica que `app.js` agregue los atributos:
```javascript
draggable="true"
data-issue-key="${issue.key}"
class="kanban-card"
```
### La barra no aparece
**Solución:** 
1. Verifica que el CSS esté cargado: `transition-bar-vertical.css`
2. Check console: debe ver `✅ Drag Transition Vertical Handler initialized`
3. Verifica que `drag-transition-vertical.js` esté cargado después de `app.js`
### Transiciones no se ejecutan
**Solución:**
1. Check console para errores de API
2. Verifica credentials en `.env`
3. Confirma que el endpoint `/api/issues/{key}/transitions` responde
4. Verifica que `transitions.py` blueprint esté registrado en Flask
### Animación se ve entrecortada
**Solución:**
1. Agrega `will-change: transform` a las columnas:
```css
.kanban-column {
  will-change: transform;
}
```
2. Reduce `backdrop-filter` blur si el performance es bajo
## 📊 Performance
- **Fetch de transiciones**: ~100-300ms (cacheable en futuro)
- **Animación de columnas**: 300ms ease-out
- **Animación de card**: 800ms cubic-bezier
- **Render de barra**: <50ms (DOM manipulation mínimo)
## 🔮 Roadmap
- [ ] Cache de transiciones por tipo de ticket
- [ ] Atajos de teclado (Esc para cancelar)
- [ ] Batch transitions (múltiples tickets)
- [ ] Transiciones condicionales (campos requeridos)
- [ ] Historico de transiciones recientes
- [ ] Drag & drop entre columnas directamente (alternativo)
## 📝 Notas Técnicas
### Por qué Vertical vs Horizontal
- ✅ Scroll vertical es más natural
- ✅ Más espacio para transiciones (8+ caben cómodamente)
- ✅ Se integra visualmente al board
- ✅ Menos movimiento de mouse
### Diferencias con Otros Apps
- **Trello/Asana**: Solo drag entre columnas predefinidas
- **ClickUp**: Popup con botones (no drag & drop)
- **Monday.com**: Menú contextual (no visual durante drag)
- **SpeedyFlow**: Barra vertical con TODAS las transiciones JIRA visibles durante drag
## 🎓 Referencias
- JIRA API: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-post
- Glassmorphism: https://css.glass/
- Web Animations API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
---
**Creado por**: SpeedyFlow Team  
**Versión**: 1.0.0  
**Fecha**: Diciembre 2025
