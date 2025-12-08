# 🐛 REPORTE DE BUGS Y CORRECCIONES
## Fecha: 2025-12-08

## ✅ PROBLEMA 1: Formateo de Teléfonos - RESUELTO

### Síntoma
Los números de teléfono no se estaban formateando con código de país en las tarjetas kanban.

### Causa Raíz
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

### Solución Implementada
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

### Resultado
- ✅ Script de detección ejecutado: 10/10 tests pasados
- ✅ Función `extractCountryCode()` agregada
- ✅ Formato correcto: `+52-5555-1234-5678`
- ✅ Commit: Listo para aplicar

---

## ⚠️ PROBLEMA 2: Sugerencias Ollama Desaparecen - EN INVESTIGACIÓN

### Síntoma
Las sugerencias de Ollama aparecen correctamente, pero después de unos segundos muestran:
```
"Error al generar sugerencias con IA"
```
Las sugerencias se limpian de la UI.

### Investigación Realizada

#### ✅ Sistema de Caché (3 capas)
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

#### ✅ Flujo de Eventos
```javascript
// 1. Usuario abre ticket
openIssueDetails(issueKey) 
  → dispatch CustomEvent('ticketSelected')

// 2. Comment Suggestions escucha evento
document.addEventListener('ticketSelected', ...)
  → showSuggestionsForTicket(ticket)

// 3. Fetch sugerencias con timeout 60s
fetch('/api/ml/comments/suggestions', { method: 'POST' })
  → Ollama timeout: 60s (api/ai_ollama.py línea 91)
```

#### 🔍 Posibles Causas Detectadas

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

### Análisis de Logs Requerido

Para diagnosticar, necesitamos verificar:
```bash
# 1. Verificar estado de Ollama
curl http://localhost:11434/api/tags

# 2. Ver logs de servidor durante error
tail -f logs/speedyflow.log | grep -i "ollama\|suggestions\|error"

# 3. Verificar si Ollama se interrumpe
ps aux | grep ollama

# 4. Verificar logs de Ollama
journalctl -u ollama -f  # Si es servicio
# o
cat ~/.ollama/logs/server.log
```

### Correcciones Propuestas (PENDIENTES DE APLICAR)

#### Solución 1: Reducir Timeout y Agregar Retry
```python
# api/ai_ollama.py línea 84
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
                timeout=30  # ⚠️ REDUCIR de 60s a 30s
            )
            
            if response.status_code == 200:
                return response.json().get("response", "").strip()
            
            logger.warning(f"Ollama returned {response.status_code}, retrying...")
            
        except requests.Timeout:
            logger.warning(f"Ollama timeout (attempt {attempt+1}/{retry_count})")
            if attempt < retry_count - 1:
                time.sleep(1)  # Wait 1s before retry
            continue
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            break
    
    return None  # All retries failed
```

#### Solución 2: Agregar Debounce en Frontend
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

#### Solución 3: Monitoreo de Estado de Ollama
```javascript
// Agregar health check antes de hacer request
async checkOllamaHealth() {
  try {
    const response = await fetch('/api/ollama/health', { timeout: 2000 });
    return response.ok;
  } catch {
    return false;
  }
}

async showSuggestionsForTicket(ticket) {
  // Verificar que Ollama está disponible
  const isHealthy = await this.checkOllamaHealth();
  if (!isHealthy) {
    console.warn('⚠️ Ollama no disponible - usando sugerencias fallback');
    // El backend ya maneja esto con _get_fallback_suggestions()
  }
  
  // ... resto del código ...
}
```

### Próximos Pasos

1. **INMEDIATO**: Ejecutar análisis de logs durante reproducción del error
   ```bash
   # Terminal 1: Servidor con logs
   cd /workspaces/SPEEDYFLOW-JIRA-Platform
   python api/server.py 2>&1 | tee logs/debug_$(date +%Y%m%d_%H%M%S).log
   
   # Terminal 2: Monitorear Ollama
   watch -n 1 'curl -s http://localhost:11434/api/tags | jq'
   ```

2. **TESTING**: Reproducir error y capturar:
   - Tiempo exacto de la llamada
   - Respuesta de Ollama (si alguna)
   - Estado del servidor en ese momento
   - Logs del navegador (Console)

3. **APLICAR**: Una vez identificado el problema exacto, aplicar solución correspondiente

### Estado Actual
- ✅ Código de manejo de errores correcto
- ✅ Sistema de caché implementado
- ✅ Fallback patterns funcionando
- ⚠️ Necesita logs para diagnóstico definitivo
- ⏳ Soluciones propuestas listas para aplicar

---

## 📋 RESUMEN

### Commits Listos
```bash
git add -A
git commit -m "fix: Extract country code from JIRA customfield_10167 object format

- Add extractCountryCode() to parse 'Chile: +56' format
- Fix phone number formatting with country code prefix
- Add detection script: scripts/detect_country_fields.py
- Tests: 10/10 passed for country code extraction
- Phone format: +52-5555-1234-5678 (4-digit groups)"
```

### Investigación Pendiente
- Logs de Ollama durante error
- Verificar si hay race conditions
- Aplicar timeout reducido + retry si es timeout
- Agregar debounce si es cambio rápido de tickets

### Archivos Modificados
- ✅ `frontend/static/js/app.js` (extractCountryCode + formatPhoneNumber)
- ✅ `scripts/detect_country_fields.py` (nuevo)
- ⏳ `api/ai_ollama.py` (pendiente: timeout + retry)
- ⏳ `frontend/static/js/modules/ml-comment-suggestions.js` (pendiente: debounce)

---

**Última actualización**: 2025-12-08 (Análisis completo)
