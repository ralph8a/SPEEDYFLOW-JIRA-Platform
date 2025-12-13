# 📍 Comment Suggestions - Nueva Ubicación en UI

## Estructura Visual del Right Sidebar

```
╔══════════════════════════════════════════════════════════════════════════╗
║                         RIGHT SIDEBAR (Ticket Details)                    ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ╔═══════════════════════╗  ╔════════════════════════════════════════╗  ║
║  ║   LEFT COLUMN         ║  ║   RIGHT COLUMN                         ║  ║
║  ║   (Detalles)          ║  ║   (Comentarios)                        ║  ║
║  ╠═══════════════════════╣  ╠════════════════════════════════════════╣  ║
║  ║                       ║  ║                                        ║  ║
║  ║ ⏱️ SLA Monitor         ║  ║ 💬 Comments (12)                       ║  ║
║  ║ ┌───────────────────┐ ║  ║ ┌────────────────────────────────────┐ ║  ║
║  ║ │ Time remaining:   │ ║  ║ │ Comment 1                          │ ║  ║
║  ║ │ 2h 45m           │ ║  ║ │ Comment 2                          │ ║  ║
║  ║ └───────────────────┘ ║  ║ │ Comment 3                          │ ║  ║
║  ║                       ║  ║ └────────────────────────────────────┘ ║  ║
║  ║ 📋 Ticket Information ║  ║                                        ║  ║
║  ║ ┌───────────────────┐ ║  ║ ┌────────────────────────────────────┐ ║  ║
║  ║ │ ⭐ Essential       │ ║  ║ │ 📎 Attach  |  @ Mention  |  🔓    │ ║  ║
║  ║ │ 📋 Details        │ ║  ║ ├────────────────────────────────────┤ ║  ║
║  ║ │ ⚙️ Technical      │ ║  ║ │                                    │ ║  ║
║  ║ ├───────────────────┤ ║  ║ │  [Comment textarea]                │ ║  ║
║  ║ │ Status: Open      │ ║  ║ │                                    │ ║  ║
║  ║ │ Priority: High    │ ║  ║ │                                    │ ║  ║
║  ║ │ Assignee: John    │ ║  ║ ├────────────────────────────────────┤ ║  ║
║  ║ └───────────────────┘ ║  ║ │     [Post Comment]                 │ ║  ║
║  ║                       ║  ║ └────────────────────────────────────┘ ║  ║
║  ║ 📎 Attachments (3)    ║  ║                                        ║  ║
║  ║ ┌───────────────────┐ ║  ║                                        ║  ║
║  ║ │ screenshot.png    │ ║  ║                                        ║  ║
║  ║ │ log.txt          │ ║  ║                                        ║  ║
║  ║ │ report.pdf       │ ║  ║                                        ║  ║
║  ║ └───────────────────┘ ║  ║                                        ║  ║
║  ║                       ║  ║                                        ║  ║
║  ║ ┏━━━━━━━━━━━━━━━━━━━┓ ║  ║                                        ║  ║
║  ║ ┃ 🤖 Sugerencias IA  ┃ ║  ║                                        ║  ║
║  ║ ┃   (NUEVA SECCIÓN) ┃ ║  ║                                        ║  ║
║  ║ ┗━━━━━━━━━━━━━━━━━━━┛ ║  ║                                        ║  ║
║  ║ ┌───────────────────┐ ║  ║                                        ║  ║
║  ║ │ 🧠 Analizando...  │ ║  ║                                        ║  ║
║  ║ │                   │ ║  ║                                        ║  ║
║  ║ │ O BIEN:           │ ║  ║                                        ║  ║
║  ║ │                   │ ║  ║                                        ║  ║
║  ║ │ ✅ RESOLUTION     │ ║  ║                                        ║  ║
║  ║ │ "He revisado..."  │ ║  ║                                        ║  ║
║  ║ │ [Usar] [Copiar]   │ ║  ║                                        ║  ║
║  ║ │                   │ ║  ║                                        ║  ║
║  ║ │ 🔧 ACTION         │ ║  ║                                        ║  ║
║  ║ │ "Entiendo el..."  │ ║  ║                                        ║  ║
║  ║ │ [Usar] [Copiar]   │ ║  ║                                        ║  ║
║  ║ └───────────────────┘ ║  ║                                        ║  ║
║  ║                       ║  ║                                        ║  ║
║  ╚═══════════════════════╝  ╚════════════════════════════════════════╝  ║
║                                                                           ║
╚══════════════════════════════════════════════════════════════════════════╝
```

## 🎯 Punto de Inyección

**ANTES**: Intentaba inyectarse en `#commentsPanel` (columna derecha)

**AHORA**: Se inyecta después de `#attachmentsSection` (columna izquierda)

```javascript
// Código de inyección
const attachmentsSection = sidebar.querySelector('#attachmentsSection');
if (attachmentsSection) {
  // Inserta DESPUÉS de attachments en la misma columna
  attachmentsSection.parentNode.insertBefore(this.container, attachmentsSection.nextSibling);
}
```

## 📱 Estados Visuales

### Estado 1: Esperando Ticket
```
┌─────────────────────┐
│  🤖 Sugerencias IA  │
├─────────────────────┤
│   ⏳ Esperando...   │
│                     │
└─────────────────────┘
```

### Estado 2: Analizando con IA
```
┌─────────────────────┐
│  🤖 Sugerencias IA  │
├─────────────────────┤
│   🧠                │
│                     │
│ Analizando ticket   │
│    con IA...        │
│                     │
│ Estamos procesando  │
│ la información...   │
│                     │
│ ▓▓▓▓░░░░░░░░░░░    │ ← Loader animado
└─────────────────────┘
```

### Estado 3: Sugerencias Disponibles
```
┌─────────────────────┐
│  🤖 Sugerencias IA  │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ ✅ DIAGNOSTIC   │ │
│ │ 95% confidence  │ │
│ ├─────────────────┤ │
│ │ He revisado el  │ │
│ │ error y necesito│ │
│ │ más información.│ │
│ │ Por favor...    │ │
│ ├─────────────────┤ │
│ │ [Usar] [Copiar] │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ 🔧 ACTION       │ │
│ │ 91% confidence  │ │
│ ├─────────────────┤ │
│ │ Entiendo el     │ │
│ │ problema de...  │ │
│ ├─────────────────┤ │
│ │ [Usar] [Copiar] │ │
│ └─────────────────┘ │
└─────────────────────┘
```

### Estado 4: Sin Información
```
┌─────────────────────┐
│  🤖 Sugerencias IA  │
├─────────────────────┤
│   ℹ️                │
│                     │
│ No tenemos          │
│ información de      │
│ este ticket         │
│                     │
│ Estamos analizando  │
│ la información...   │
└─────────────────────┘
```

## 🔄 Flujo Completo

```
1. Usuario abre ticket
        ↓
2. ticketSelected event → ml-comment-suggestions.js
        ↓
3. showSuggestionsForTicket()
        ↓
4. Verificar caché
   ├─ Si existe → Renderizar inmediato (instantáneo)
   └─ Si no existe → Continuar
        ↓
5. Mostrar estado "Analizando..."
        ↓
6. POST /api/ml/comments/suggestions
   {
     summary: "...",
     description: "...",
     issue_type: "Bug",
     status: "Open",
     priority: "High",
     max_suggestions: 5
   }
        ↓
7. Backend analiza contenido
   - Detecta keywords (error, performance, login, etc.)
   - Calcula confianza (82%-95%)
   - Genera 5 sugerencias contextuales
        ↓
8. Renderizar sugerencias
   - Cards con badges de tipo
   - Botones "Usar" y "Copiar"
   - Porcentaje de confianza
        ↓
9. Guardar en caché
   cachedSuggestions[ticketKey] = {
     suggestions: [...],
     timestamp: Date.now()
   }
        ↓
10. Usuario cierra ticket
        ↓
11. onTicketLeave() persiste caché
```

## 🎨 Jerarquía Visual

```
Columna Izquierda (Prioridad de arriba a abajo):

1. ⏱️ SLA Monitor           ← Más importante (tiempo crítico)
2. 📋 Ticket Information    ← Información esencial
3. 📎 Attachments           ← Archivos adjuntos
4. 🤖 Sugerencias IA        ← NUEVA SECCIÓN (contexto adicional)

Columna Derecha:

1. 💬 Comments              ← Historial de conversación
2. ✍️ Comment Input         ← Área de escritura
```

## ✨ Ventajas de la Nueva Ubicación

✅ **Contexto visual**: Usuario ve detalles del ticket Y sugerencias juntos  
✅ **No interfiere**: No compite con el área de comentarios  
✅ **Flujo natural**: Abajo de información estática, antes de escribir  
✅ **Scroll intuitivo**: Se descubre al revisar detalles del ticket  
✅ **Consistencia**: Todas las secciones informativas en columna izquierda  

---

**Ubicación Final**: Right Sidebar → Left Column → Después de Attachments  
**Visible**: Al abrir cualquier ticket  
**Comportamiento**: Análisis automático → Caché → Reutilización instantánea
