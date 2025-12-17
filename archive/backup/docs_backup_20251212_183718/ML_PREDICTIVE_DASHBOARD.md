# ML Predictive Dashboard - Documentación Completa
## 🎯 Descripción General
El **ML Predictive Dashboard** es un sistema de análisis en tiempo real que proporciona insights predictivos sobre tickets, SLA breaches, rendimiento del equipo y tendencias de resolución. Utiliza los modelos ML del **ML Priority Engine** para generar predicciones y visualizaciones interactivas.
---
## 📊 Características Principales
### 1. Overview (Vista General)
**Propósito**: Dashboard principal con métricas clave y estado del sistema
**Métricas Desplegadas**:
- **Total Tickets**: Cantidad total de tickets activos
- **Critical Tickets**: Tickets de prioridad alta/crítica
- **SLA Compliance**: Porcentaje de cumplimiento SLA
- **At Risk**: Tickets en riesgo de breach (>80% tiempo usado)
**Visualizaciones**:
- **SLA Breakdown** (Doughnut Chart):
  - 🟢 On Track: Tickets sin riesgo
  - 🟡 At Risk: Tickets usando >80% SLA
  - 🔴 Breached: Tickets con SLA vencido
- **Priority Distribution** (Bar Chart):
  - Distribución de tickets por prioridad (Highest, High, Medium, Low, etc.)
- **High-Risk Tickets List**:
  - Top 10 tickets con mayor riesgo de breach
  - Risk score, horas hasta breach, asignado
---
### 2. Breach Forecast (Predicción de Breaches)
**Propósito**: Predicción proactiva de SLA breaches en las próximas 24-48 horas
**Datos Mostrados**:
- **Predicted Breaches**: Cantidad de breaches esperados
- **High Risk Tickets**: Tickets con >80% riesgo
**Timeline de Predicciones**:
Cada predicción incluye:
- **Ticket Key**: Link clickeable al ticket
- **Risk Score**: 0-100% (crítico >80, alto 60-80, medio 40-60)
- **Hours to Breach**: Tiempo estimado hasta breach
- **Predicted Breach Time**: Hora exacta estimada
- **Current Assignee**: Responsable actual
- **Priority**: Prioridad del ticket
- **Recommended Action**: Acción sugerida automáticamente
**Acciones Recomendadas**:
- Risk >90%: "URGENT: Escalate immediately (Xh to breach)"
- Risk >70%: "Prioritize now (Xh to breach)"
- Risk >50%: "Monitor closely (Xh to breach)"
- Risk <50%: "On track"
---
### 3. Performance Trends (Tendencias de Rendimiento)
**Propósito**: Análisis histórico de 7 días del rendimiento del equipo
**Gráficas Incluidas**:
#### Ticket Volume (Line Chart)
- **Created**: Tickets creados por día
- **Resolved**: Tickets resueltos por día
- **Insight**: Detecta acumulación (created > resolved)
#### SLA Compliance Trend (Line Chart)
- **Porcentaje diario de cumplimiento SLA**
- **Rango**: 0-100%
- **Threshold**: <90% = problema
#### Average Resolution Time (Bar Chart)
- **Tiempo promedio de resolución por día (horas)**
- **Insight**: Detecta días con resolución lenta
**Período**: Últimos 7 días (configurable con parámetro `?days=N`)
---
### 4. Team Workload (Carga de Trabajo del Equipo)
**Propósito**: Análisis de distribución de trabajo entre agentes
**Métricas Generales**:
- **Active Agents**: Cantidad de agentes con tickets asignados
- **Avg Tickets/Agent**: Promedio de tickets por agente
- **Balance Score**: 0-100% (100 = perfectamente balanceado)
**Por Agente**:
Cada card muestra:
- **Nombre del agente**
- **Assigned Tickets**: Total asignado
- **🔥 Critical**: Tickets de alta prioridad
- **⚠️ At Risk**: Tickets en riesgo de breach
- **📊 SLA Used**: Porcentaje promedio de tiempo SLA usado
**Color Coding de Workload**:
- 🟢 Low: 0-5 tickets
- 🔵 Medium: 6-10 tickets
- 🟡 High: 11-15 tickets
- 🔴 Overloaded: >15 tickets
**Balance Score**:
- 100: Carga perfectamente distribuida
- 80-100: Buena distribución
- 60-79: Desbalanceado
- <60: Requiere redistribución
---
## 🔌 API Endpoints
### 1. GET `/api/ml/dashboard/overview`
**Descripción**: Obtiene métricas generales del dashboard
**Query Parameters**:
- `queue_id` (opcional): Filtrar por queue específico
**Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_tickets": 42,
      "critical_tickets": 8,
      "models_trained": true,
      "predictions_available": true,
      "last_updated": "2025-12-06T12:00:00"
    },
    "sla": {
      "total_tickets": 42,
      "breached": 3,
      "at_risk": 7,
      "on_track": 32,
      "compliance_rate": 92.9
    },
    "breach_predictions": [
      {
        "ticket_key": "PROJ-123",
        "risk_score": 85,
        "hours_to_breach": 2.5
      }
    ],
    "priority_distribution": {
      "Highest": 5,
      "High": 12,
      "Medium": 20,
      "Low": 5
    },
    "trends": {
      "tickets_last_24h": 15,
      "tickets_last_week": 80,
      "avg_per_day": 11.4
    }
  }
}
```
---
### 2. GET `/api/ml/dashboard/predictions`
**Descripción**: Estadísticas de predicciones ML y rendimiento de modelos
**Query Parameters**:
- `queue_id` (opcional)
**Response**:
```json
{
  "success": true,
  "data": {
    "model_info": {
      "priority_accuracy": 88.5,
      "breach_mae": 2.3,
      "trained_on": "2025-12-01T10:00:00",
      "training_samples": 500
    },
    "prediction_stats": {
      "total_predictions": 42,
      "high_confidence": 35,
      "avg_urgency_score": 65
    },
    "confidence_distribution": {
      "high": 60,
      "medium": 30,
      "low": 10
    }
  }
}
```
---
### 3. GET `/api/ml/dashboard/breach-forecast`
**Descripción**: Predicción de breaches en próximas horas
**Query Parameters**:
- `hours` (default: 24): Ventana de predicción (24-48h recomendado)
- `queue_id` (opcional)
**Response**:
```json
{
  "success": true,
  "data": {
    "forecast_period_hours": 24,
    "predicted_breaches": 5,
    "high_risk_tickets": 3,
    "forecast": [
      {
        "ticket_key": "PROJ-456",
        "summary": "Critical bug in production",
        "risk_score": 95,
        "hours_to_breach": 1.5,
        "predicted_breach_time": "2025-12-06T14:30:00",
        "current_assignee": "John Doe",
        "priority": "Highest",
        "recommended_action": "URGENT: Escalate immediately (1.5h to breach)"
      }
    ]
  }
}
```
---
### 4. GET `/api/ml/dashboard/performance-trends`
**Descripción**: Tendencias de rendimiento histórico
**Query Parameters**:
- `days` (default: 7): Días de historia
- `queue_id` (opcional)
**Response**:
```json
{
  "success": true,
  "data": {
    "dates": ["2025-11-30", "2025-12-01", "2025-12-02", ...],
    "tickets_created": [10, 12, 8, 15, 9, 11, 14],
    "tickets_resolved": [8, 10, 12, 13, 10, 9, 12],
    "sla_compliance": [95, 92, 88, 90, 94, 96, 93],
    "avg_resolution_time": [24.5, 28.3, 22.1, 26.7, 23.9, 25.2, 24.8]
  }
}
```
---
### 5. GET `/api/ml/dashboard/team-workload`
**Descripción**: Análisis de carga de trabajo por agente
**Query Parameters**:
- `queue_id` (opcional)
**Response**:
```json
{
  "success": true,
  "data": {
    "team_stats": [
      {
        "assignee": "John Doe",
        "assigned_tickets": 12,
        "critical_tickets": 3,
        "at_risk_tickets": 2,
        "avg_sla_time_used": 65.5,
        "total_sla_hours": 240
      }
    ],
    "balance_score": 78.5,
    "total_agents": 5,
    "avg_tickets_per_agent": 8.4
  }
}
```
---
## 🎨 Frontend Components
### MLDashboard Class
**Ubicación**: `frontend/static/js/ml-dashboard.js`
**Métodos Principales**:
```javascript
// Inicializar dashboard
window.mlDashboard.init();
// Mostrar modal
window.mlDashboard.show();
// Ocultar modal
window.mlDashboard.hide();
// Cargar datos
window.mlDashboard.loadDashboardData();
// Cambiar tab
window.mlDashboard.switchTab('forecast');
// Auto-refresh (cada 5 minutos)
window.mlDashboard.startAutoRefresh();
window.mlDashboard.stopAutoRefresh();
```
**Event Listeners**:
- Click en botón `#mlDashboardBtn` → abre modal
- Click en `.ml-dashboard-close` → cierra modal
- Click fuera del modal → cierra modal
- Click en tabs → cambia vista
- Toggle auto-refresh → activa/desactiva refresco
---
## 🎨 Estilos y Diseño
### Glassmorphism Design
**Ubicación**: `frontend/static/css/components/ml-dashboard.css`
**Características**:
- Background: `rgba(30, 30, 40, 0.95)` con blur(20px)
- Borders: `rgba(255, 255, 255, 0.1)`
- Shadows: `rgba(0, 0, 0, 0.5)`
- Animations: fadeIn, slideUp, pulse, spin
**Color Coding**:
- 🔴 Critical (>80): `rgba(239, 68, 68, ...)`
- 🟠 High (60-80): `rgba(245, 158, 11, ...)`
- 🔵 Medium (40-60): `rgba(59, 130, 246, ...)`
- 🟢 Low (<40): `rgba(16, 185, 129, ...)`
**Responsive Breakpoints**:
- Desktop: `>1200px` - 2 columnas de charts
- Tablet: `768px-1200px` - 1 columna de charts
- Mobile: `<768px` - diseño vertical, tabs scrollables
---
## 🚀 Uso e Integración
### Abrir Dashboard
1. Click en botón `🎯` en header (al lado de Help)
2. Modal aparece con glassmorphism effect
3. Dashboard carga datos automáticamente
### Navegación
- **Tab Overview**: Vista principal con métricas
- **Tab Forecast**: Predicciones de breaches
- **Tab Trends**: Gráficas históricas
- **Tab Team**: Análisis de workload
### Filtrado
- Si hay queue/desk seleccionado en UI principal, dashboard filtra por ese contexto
- Sin filtro: muestra todos los tickets activos
### Auto-Refresh
- Por defecto: Activado (cada 5 minutos)
- Toggle en header del dashboard para activar/desactivar
- Preferencia guardada en `localStorage`
---
## ⚙️ Configuración
### Backend
**Archivo**: `api/blueprints/ml_dashboard.py`
**Configurables**:
```python
# TTL de cache (si se agrega caching)
CACHE_TTL = 300  # 5 minutos
# Límite de tickets en overview
MAX_BREACH_PREDICTIONS = 50
# Ventana de forecast por defecto
DEFAULT_FORECAST_HOURS = 24
# Días de historia por defecto
DEFAULT_TREND_DAYS = 7
```
### Frontend
**Archivo**: `frontend/static/js/ml-dashboard.js`
**Configurables**:
```javascript
// Intervalo de auto-refresh (milisegundos)
this.refreshInterval = 5 * 60 * 1000; // 5 minutos
// Auto-refresh por defecto
this.autoRefresh = true;
```
---
## 🔧 Troubleshooting
### Dashboard No Carga Datos
**Problema**: Modal se abre pero no muestra métricas
**Soluciones**:
1. Verificar que modelos ML estén entrenados: `/api/ml/model-status`
2. Verificar credenciales JIRA en `.env`
3. Revisar logs del servidor: `logs/server.log`
4. Verificar console del browser para errores JS
### Charts No Renderizan
**Problema**: Espacios vacíos donde deberían estar gráficas
**Soluciones**:
1. Verificar que Chart.js se cargó: `console.log(window.Chart)`
2. Verificar que data llegó: Ver Network tab en DevTools
3. Clear cache del browser y recargar
4. Verificar que canvas IDs son correctos
### Auto-Refresh No Funciona
**Problema**: Dashboard no se actualiza automáticamente
**Soluciones**:
1. Verificar toggle está activado
2. Verificar que no hay errores en console
3. Verificar `localStorage.getItem('ml_dashboard_auto_refresh')`
4. Recargar página
### Errores 500 en API
**Problema**: Endpoints retornan error 500
**Soluciones**:
1. Verificar que blueprints están registrados en `api/server.py`
2. Verificar imports de dependencias (numpy, pandas)
3. Verificar que `data/ml_models/` existe
4. Revisar stack trace en `logs/server.log`
---
## 📈 Performance
### Tiempos de Respuesta
- **Overview**: ~500ms (con 50 tickets)
- **Breach Forecast**: ~800ms (predicciones ML)
- **Performance Trends**: ~300ms (queries simples)
- **Team Workload**: ~400ms (agrupación pandas)
### Optimizaciones Aplicadas
- ✅ Batch loading de predicciones (no 1 por 1)
- ✅ Cache de 5 minutos en frontend
- ✅ Lazy loading de tabs (solo carga cuando se activa)
- ✅ Limit de 50 predicciones en overview
- ✅ Progressive rendering de charts
### Recomendaciones
- Para queues >100 tickets: aumentar TTL de cache
- Para equipos >20 agentes: paginar resultados
- Para history >30 días: implementar agregación semanal
---
## 🔮 Futuras Mejoras
### Corto Plazo (v2.0)
- [ ] Export de reportes a PDF/Excel
- [ ] Email notifications de breaches predichos
- [ ] Configuración de umbrales personalizados
- [ ] Filtros avanzados (por prioridad, assignee, etc.)
### Mediano Plazo (v3.0)
- [ ] Predicción de tiempo de resolución
- [ ] Recomendaciones de reasignación automática
- [ ] Integration con Slack/Teams
- [ ] Historical comparison (week-over-week)
### Largo Plazo (v4.0)
- [ ] Machine Learning continuo (retraining automático)
- [ ] Anomaly detection en métricas
- [ ] Predictive capacity planning
- [ ] Custom dashboards configurables por usuario
---
## 📚 Referencias
### Dependencias
- **Chart.js 4.4.0**: Visualizaciones (CDN)
- **Flask Blueprint**: Backend routing
- **NumPy/Pandas**: Data analysis
- **ML Priority Engine**: Predicciones
### Archivos Relacionados
- Backend: `api/blueprints/ml_dashboard.py` (589 líneas)
- Frontend: `frontend/static/js/ml-dashboard.js` (650+ líneas)
- Styles: `frontend/static/css/components/ml-dashboard.css` (800+ líneas)
- HTML: `frontend/templates/index.html` (modal markup)
### Documentación Externa
- [Chart.js Docs](https://www.chartjs.org/docs/latest/)
- [Flask Blueprints](https://flask.palletsprojects.com/en/2.3.x/blueprints/)
- [ML Priority Engine Docs](docs/ML_PRIORITY_ENGINE.md)
---
## 📞 Soporte
**Issues**: [GitHub Issues](https://github.com/ralph8a/SPEEDYFLOW-JIRA-Platform/issues)  
**Docs**: `docs/ML_PREDICTIVE_DASHBOARD.md`  
**Demo**: Abrir SPEEDYFLOW → Click en 🎯 en header
---
**Última Actualización**: Diciembre 6, 2025  
**Versión**: 1.0.0  
**Status**: ✅ Production Ready
