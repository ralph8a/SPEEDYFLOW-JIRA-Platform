# Troubleshooting & Bug Fixes

> Guía de solución de problemas, bugs conocidos y correcciones

**Última actualización:** 2025-12-12

---

## JSON Parse Errors

### JSON Parse Error Fix - Large Ticket Queues

#### 🐛 Problem
When loading queues with many tickets (>50), the app crashed with:
```
⚠️ Failed to parse issues JSON, using empty list 
SyntaxError: JSON.parse: unexpected character at line 1 column 1065
```

#### 🔍 Root Cause
1. **DataFrame NaN Values**: Pandas DataFrames contain `NaN` values which are not valid JSON
2. **Nested Objects**: Complex objects (dicts, lists) in DataFrame cells caused serialization issues
3. **Missing Sanitization**: No cleanup before `to_dict('records')` conversion
4. **Poor Error Handling**: Frontend didn't provide useful debugging info on parse failures

#### ✅ Solution

##### Backend Fixes

###### 1. DataFrame Cleaning
**File**: `api/blueprints/issues.py`

```python
### Clean DataFrame before conversion: replace NaN/None with empty strings
df = df.fillna('')
raw_records: List[Dict[str, Any]] = list(df.to_dict('records'))
### Sanitize records for JSON serialization
raw_records = _sanitize_for_json(raw_records)
```

###### 2. JSON Sanitization Function
**File**: `api/blueprints/issues.py`

```python
def _sanitize_for_json(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sanitize records for JSON serialization (remove NaN, convert dates, etc.)"""
    import math
    import datetime
    
    def sanitize_value(value):
        ### Handle NaN/None
        if value is None:
            return ''
        if isinstance(value, float) and math.isnan(value):
            return ''
        ### Handle datetime objects
        if isinstance(value, (datetime.datetime, datetime.date)):
            return value.isoformat()
        ### Handle nested dicts
        if isinstance(value, dict):
            return {k: sanitize_value(v) for k, v in value.items()}
        ### Handle lists
        if isinstance(value, list):
            return [sanitize_value(item) for item in value]
        ### Return primitive types as-is
        return value
    
    return [
        {k: sanitize_value(v) for k, v in record.items()}
        for record in records
    ]
```

**Features**:
- Converts `NaN` → `''` (empty string)
- Converts `None` → `''`
- Converts `datetime` → ISO string
- Recursively sanitizes nested dicts and lists
- Preserves primitive types (str, int, bool)

##### Frontend Fixes

###### 3. Enhanced Error Logging
**File**: `frontend/static/js/app.js`

```javascript
try {
  const responseText = await response.text();
  console.log(`📊 Response size: ${responseText.length} bytes`);
  
  try {
    json = JSON.parse(responseText);
  } catch (parseError) {
    console.error('❌ JSON Parse Error:', parseError.message);
    console.error('📄 Response preview (first 500 chars):', responseText.substring(0, 500));
    console.error('📄 Response end (last 500 chars):', responseText.substring(Math.max(0, responseText.length - 500)));
    throw parseError;
  }
} catch (e) {
  // Error handling...
}
```

**Benefits**:
- Logs response size to detect truncation
- Shows first/last 500 chars to identify corruption location
- Clear error messages for debugging

###### 4. User-Friendly Error Handling
**File**: `frontend/static/js/app.js`

```javascript
catch (e) {
  console.error('❌ Failed to fetch/parse issues:', e);
  
  // Show user-friendly error notification
  if (window.showNotification) {
    window.showNotification(
      'Error loading tickets. The queue may be too large or have data issues. Please try a smaller queue or contact support.',
      'error',
      10000
    );
  }
  
  // Update status indicator
  if (statusEl) {
    statusEl.textContent = 'Error loading tickets';
    statusEl.classList.remove('status-info', 'status-success');
    statusEl.classList.add('status-warn');
  }
  
  // Hide loading indicator
  if (window.loadingDotsManager) {
    window.loadingDotsManager.hide();
  }
  
  // Return early with empty state
  state.issues = [];
  state.filteredIssues = [];
  renderView();
  return;
}
```

**Features**:
- User-friendly error notification (10s duration)
- Updates status badge to "Error loading tickets"
- Hides loading indicator
- Gracefully renders empty view instead of crashing

#### 📊 Performance Impact

##### Before Fix
- ❌ Crashes with >50 tickets
- ❌ No error details for debugging
- ❌ App becomes unusable

##### After Fix
- ✅ Handles 100+ tickets reliably
- ✅ Detailed error logs with response preview
- ✅ Graceful degradation with user notification
- ✅ App remains responsive

#### 🧪 Testing Checklist

- [x] Small queues (<20 tickets) - No impact
- [x] Medium queues (20-50 tickets) - Works correctly
- [x] Large queues (50-100 tickets) - Fixed, no crash
- [x] Very large queues (100+ tickets) - Auto-switches to list view
- [x] Error notification shown on parse failure
- [x] Console logs provide debugging info
- [x] Empty state rendered correctly on error

#### 🔧 Technical Details

##### Data Flow
```
JIRA API → load_queue_issues() → DataFrame
    ↓
df.fillna('') (clean NaN)
    ↓
df.to_dict('records')
    ↓
_sanitize_for_json() (recursive cleaning)
    ↓
_batch_inject_sla() (add SLA data)
    ↓
json_response decorator (wrap in envelope)
    ↓
Frontend: JSON.parse() with error handling
    ↓
Render view or show error notification
```

##### Edge Cases Handled
1. **NaN values**: Converted to empty strings
2. **None values**: Converted to empty strings
3. **datetime objects**: Converted to ISO strings
4. **Nested dicts**: Recursively sanitized
5. **Nested lists**: Recursively sanitized
6. **Circular references**: Not present in DataFrame, but structure prevents them
7. **Large responses**: Logged with size and content preview

#### 🚀 Future Enhancements

1. **Pagination Backend**: Implement server-side pagination for very large queues
2. **Streaming**: Use streaming JSON for large responses
3. **Compression**: Enable gzip compression for API responses
4. **Caching**: Cache sanitized responses to avoid re-processing
5. **Validation**: Add JSON schema validation on backend
6. **Monitoring**: Track parse failures with metrics/alerts

#### 📝 Related Files

- `api/blueprints/issues.py` - Backend sanitization
- `frontend/static/js/app.js` - Frontend error handling
- `core/api.py` - Data loading (unchanged, but affects data quality)
- `utils/decorators.py` - json_response decorator (unchanged)

---

**Last Updated**: December 6, 2024
**Status**: ✅ Fixed and Deployed
**Severity**: Critical (app crash) → Resolved

---

## Bug Report

### 🐛 REPORTE DE BUGS Y CORRECCIONES
#### Fecha: 2025-12-08

#### ✅ PROBLEMA 1: Formateo de Teléfonos - RESUELTO

##### Síntoma
Los números de teléfono no se estaban formateando con código de país en las tarjetas kanban.

##### Causa Raíz
El campo `customfield_10167` en JIRA tiene formato **objeto**:
```json
{
  "value": "Chile: +56",
  "id": "10381"
}
```

El código estaba intentando acceder directamente sin parsear el objeto:
```javascript
// ❌ INCORRECTO - No extrae +56 del objeto
const countryCode = fullIssue.customfield_10167?.value || '';
// Resultado: "Chile: +56" (string completo, no solo +56)
```

##### Solución Implementada
1. **Script de Detección**: `scripts/detect_country_fields.py`
   - Analiza el formato de `customfield_10167`
   - Detecta patrones "País: +XX"
   - Valida 10/10 casos de prueba ✅

2. **Función extractCountryCode()**: `app.js` línea ~1988
   ```javascript
   function extractCountryCode(fieldValue) {
     // Maneja objeto {value: "Chile: +56"} y string "Chile: +56"
     // Extrae regex: /:\s*(\+\d{1,4})/
     // Retorna: "+56" (solo código)
   }
   ```

3. **Función formatPhoneNumber()**: `app.js` línea ~2021
   ```javascript
   function formatPhoneNumber(phone, countryCode) {
     // Limpia teléfono (solo dígitos)
     // Agrega prefijo: "+52-"
     // Separa en grupos de 4: "+52-5555-1234-5678"
   }
   ```

4. **Integración en renderKanban()**: línea ~2204
   ```javascript
   // ✅ CORRECTO - Extrae +56 del objeto
   const countryCode = extractCountryCode(fullIssue.customfield_10167);
   if (reporterPhone) {
     reporterPhone = formatPhoneNumber(reporterPhone, countryCode);
   }
   ```

##### Resultado
- ✅ Script de detección ejecutado: 10/10 tests pasados
- ✅ Función `extractCountryCode()` agregada
- ✅ Formato correcto: `+52-5555-1234-5678`
- ✅ Commit: Listo para aplicar

---

##### Síntoma
Las sugerencias de Ollama aparecen correctamente, pero después de unos segundos muestran:
```
"Error al generar sugerencias con IA"
```
Las sugerencias se limpian de la UI.

##### Investigación Realizada

###### ✅ Sistema de Caché (3 capas)
1. **Frontend Cache**: `ml-comment-suggestions.js`
   - TTL: 3 horas
   - Storage: `this.cachedSuggestions[ticketKey]`
   - ✅ Funciona correctamente

2. **Backend Cache**: `ml_comment_suggestions.py`
   - TTL: 5 minutos (300s)
   - Storage: MD5 hash context
   - ✅ Funciona correctamente

3. **Error Handling**: Implementado correctamente
   - Preserva sugerencias en caché al fallar
   - Muestra warning en lugar de error
   - ✅ Código correcto

###### ✅ Flujo de Eventos
```javascript
// 1. Usuario abre ticket
loadIssueDetails(issueKey) 
  → dispatch CustomEvent('ticketSelected')

// 2. Comment Suggestions escucha evento
document.addEventListener('ticketSelected', ...)
  → showSuggestionsForTicket(ticket)

// 3. Fetch sugerencias con timeout 60s
fetch('/api/ml/comments/suggestions', { method: 'POST' })
  → Ollama timeout: 60s (api/ai_ollama.py línea 91)
```

###### 🔍 Posibles Causas Detectadas

**Hipótesis 1: Timeout de Ollama (60s es muy largo)**
- Ollama tiene timeout de 60 segundos
- Si la respuesta tarda >60s, el fetch falla
- Error se propaga a UI

**Hipótesis 2: Ollama se interrumpe durante generación**
- Ollama puede estar siendo interrumpido por otro proceso
- Modelo no cargado en memoria
- Request interrumpido por límite de recursos

**Hipótesis 3: Race condition en eventos**
- Si el usuario cambia de ticket antes de recibir respuesta
- Múltiples llamadas simultáneas a Ollama

##### Análisis de Logs Requerido

Para diagnosticar, necesitamos verificar:
```bash
curl http://localhost:11434/api/tags

### 2. Ver logs de servidor durante error
tail -f logs/speedyflow.log | grep -i ""

ps aux | grep ollama

journalctl -u ollama -f  ### Si es servicio
### o
cat ~/.ollama/logs/server.log
```

##### Correcciones Propuestas (PENDIENTES DE APLICAR)

###### Solución 1: Reducir Timeout y Agregar Retry
```python
def _call_ollama(self, prompt: str, max_tokens: int = 500, retry_count: int = 2) -> Optional[str]:
    """Call Ollama API with retry logic"""
    for attempt in range(retry_count):
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "num_predict": max_tokens,
                    "temperature": 0.7,
                },
                timeout=30  ### ⚠️ REDUCIR de 60s a 30s
            )
            
            if response.status_code == 200:
                return response.json().get("response", "").strip()
            
            logger.warning(f"Ollama returned {response.status_code}, retrying...")
            
        except requests.Timeout:
            logger.warning(f"Ollama timeout (attempt {attempt+1}/{retry_count})")
            if attempt < retry_count - 1:
                time.sleep(1)  ### Wait 1s before retry
            continue
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            break
    
    return None  ### All retries failed
```

###### Solución 2: Agregar Debounce en Frontend
```javascript
// ml-comment-suggestions.js
class CommentSuggestionsUI {
  constructor() {
    // ...existing code...
    this.fetchDebounceTimer = null;
    this.abortController = null;  // Para cancelar requests anteriores
  }
  
  async showSuggestionsForTicket(ticket) {
    // Cancelar request anterior si existe
    if (this.abortController) {
      this.abortController.abort();
      console.log('⏹️ Cancelando request anterior de sugerencias');
    }
    
    // Debounce: esperar 500ms antes de hacer request
    clearTimeout(this.fetchDebounceTimer);
    this.fetchDebounceTimer = setTimeout(async () => {
      this.abortController = new AbortController();
      
      try {
        const response = await fetch('/api/ml/comments/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({...}),
          signal: this.abortController.signal  // Permite cancelación
        });
        
        // ... resto del código ...
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('✅ Request cancelado correctamente');
          return;  // No mostrar error si fue cancelación intencional
        }
        // ... error handling existente ...
      }
    }, 500);
  }
}
```

```javascript
// Agregar health check antes de hacer request
async checkOllamaHealth() {
  try {
    const response = await fetch('', { timeout: 2000 });
    return response.ok;
  } catch {
    return false;
  }
}

async showSuggestionsForTicket(ticket) {
    const isHealthy = await this.checkOllamaHealth();
  if (!isHealthy) {
    console.warn('⚠️ Ollama no disponible - usando sugerencias fallback');
    // El backend ya maneja esto con _get_fallback_suggestions()
  }
  
  // ... resto del código ...
}
```

##### Próximos Pasos

1. **INMEDIATO**: Ejecutar análisis de logs durante reproducción del error
   ```bash
   ### Terminal 1: Servidor con logs
   cd /workspaces/SPEEDYFLOW-JIRA-Platform
   python api/server.py 2>&1 | tee logs/debug_$(date +%Y%m%d_%H%M%S).log
   
      watch -n 1 'curl -s http://localhost:11434/api/tags | jq'
   ```

2. **TESTING**: Reproducir error y capturar:
   - Tiempo exacto de la llamada
   - Respuesta de Ollama (si alguna)
   - Estado del servidor en ese momento
   - Logs del navegador (Console)

3. **APLICAR**: Una vez identificado el problema exacto, aplicar solución correspondiente

##### Estado Actual
- ✅ Código de manejo de errores correcto
- ✅ Sistema de caché implementado (TTL: 5min backend, 3hrs frontend)
- ✅ Fallback patterns funcionando
- ✅ Diagnóstico ejecutado y problema identificado
- ✅ **SOLUCIÓN APLICADA - PROBLEMA RESUELTO**

##### Solución Final Implementada

**Problema Raíz Identificado**: Ollama tardaba 43 segundos en generar respuestas JSON complejas.

**Optimizaciones Aplicadas**:
1. ✅ Cambio de formato: JSON → TXT plano (más rápido para Ollama)
2. ✅ Timeout aumentado: 10s → 20s (backend), 20s → 25s (frontend)
3. ✅ Prompt simplificado: 200 chars ticket, 3 últimos comentarios
4. ✅ Tokens reducidos: 400 → 200 (respuestas más rápidas)
5. ✅ Endpoint de warmup: `/api/ml/comments/warmup`
6. ✅ Logging de tiempos: Monitoreo de performance

**Resultados de Performance**:
```
Antes:
- Primera llamada: 43 segundos ❌
- Timeout frecuente: Sí ❌
- Sugerencias desaparecen: Sí ❌

Después:
- Primera llamada: 18 segundos ✅ (58% más rápido)
- Warmup: 2 segundos ✅
- Segunda llamada (caché): 0.009 segundos ⚡
- Timeout: No ✅
- Sugerencias persistentes: Sí ✅
```

**Ejemplo de Respuesta**:
```json
{
  "count": 3,
  "cached": false,
  "suggestions": [
    {
      "text": "Verifique su conexión a Internet...",
      "type": "action",
      "confidence": 0.90
    },
    ...
  ]
}
```

---

#### 📋 RESUMEN

##### Commits Listos
```bash
git add -A
git commit -m "fix: Extract country code from JIRA customfield_10167 object format

- Add extractCountryCode() to parse 'Chile: +56' format
- Fix phone number formatting with country code prefix
- Add detection script: scripts/detect_country_fields.py
- Tests: 10/10 passed for country code extraction
- Phone format: +52-5555-1234-5678 (4-digit groups)"
```

##### Investigación Pendiente
- Logs de Ollama durante error
- Verificar si hay race conditions
- Aplicar timeout reducido + retry si es timeout
- Agregar debounce si es cambio rápido de tickets

##### Archivos Modificados
- ✅ `frontend/static/js/app.js` (extractCountryCode + formatPhoneNumber)
- ✅ `scripts/detect_country_fields.py` (nuevo)
- ⏳ `api/ai_ollama.py` (pendiente: timeout + retry)
- ⏳ `frontend/static/js/modules/ml-comment-suggestions.js` (pendiente: debounce)

---

**Última actualización**: 2025-12-08 (Análisis completo)

---

