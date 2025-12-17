/**
 * SPEEDYFLOW ML Client - Cliente JavaScript para integrar ML Service
 * 
 * Uso:
 * const mlClient = new MLClient('http://localhost:5001');
 * const predictions = await mlClient.predictAll(summary, description);
 */
class FlowingMVPMLClient {
    constructor() {
        // no defaults here; call FlowingMVPMLClient.configure({ baseURL }) to enable
        this.baseURL = null;
        this.configured = false;
    }
    static configure(opts = {}) {
        if (!window.flowingMvpMlClient) window.flowingMvpMlClient = new FlowingMVPMLClient();
        if (opts.baseURL) window.flowingMvpMlClient.baseURL = opts.baseURL;
        window.flowingMvpMlClient.configured = true;
        console.log('✅ [FlowingMVP ML] Frontend client configured', opts);
        return window.flowingMvpMlClient;
    }
    /**
     * Obtener todas las predicciones en una llamada
     * @param {string} summary - Resumen/título del ticket
     * @param {string} description - Descripción detallada
     * @returns {Promise<Object>} Predicciones completas
     */
    async predictAll(summary, description = '') {
        // Do not perform network calls if client is not configured
        if (!this.configured || !this.baseURL) {
            console.warn('⚠️ [FlowingMVP ML] Frontend predictAll called but client not configured. Returning empty predictions.');
            return {
                priority: null,
                duplicate_check: { is_duplicate: false, confidence: 0 },
                sla_breach: { will_breach: false, breach_probability: 0, risk_level: 'LOW' },
                assignee: { suggestions: [], top_choice: null },
                labels: { suggested_labels: [], count: 0 }
            };
        }
        const startTime = performance.now();
        try {
            const response = await fetch(`${this.baseURL}/predict/unified`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary, description }) });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const latency = Math.round(performance.now() - startTime);
            console.log(`✅ [FlowingMVP ML] Predictions received in ${latency}ms`);
            return data;
        } catch (error) {
            console.error('❌ [FlowingMVP ML] Error fetching predictions:', error);
            throw error;
        }
    }
    /**
     * Verificar duplicados
     */
    async checkDuplicate(summary, description = '') {
        if (!this.configured || !this.baseURL) {
            console.warn('⚠️ [FlowingMVP ML] checkDuplicate called but client not configured. Returning default.');
            return { is_duplicate: false, confidence: 0, similar_tickets: [] };
        }
        try {
            const response = await fetch(`${this.baseURL}/predict/duplicates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary, description }) });
            return await response.json();
        } catch (error) {
            console.error('❌ [FlowingMVP ML] Error checking duplicate:', error);
            return { is_duplicate: false, confidence: 0, similar_tickets: [] };
        }
    }
    /**
     * Sugerir prioridad
     */
    async suggestPriority(summary, description = '') {
        if (!this.configured || !this.baseURL) {
            console.warn('⚠️ [FlowingMVP ML] suggestPriority called but client not configured. Returning default.');
            return { suggested_priority: 'Medium', confidence: 0 };
        }
        try {
            const response = await fetch(`${this.baseURL}/predict/priority`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary, description }) });
            return await response.json();
        } catch (error) {
            console.error('❌ [FlowingMVP ML] Error suggesting priority:', error);
            return { suggested_priority: 'Medium', confidence: 0 };
        }
    }
    /**
     * Predecir violación de SLA
     */
    async predictSLABreach(summary, description = '') {
        if (!this.configured || !this.baseURL) {
            console.warn('⚠️ [FlowingMVP ML] predictSLABreach called but client not configured. Returning default.');
            return { will_breach: false, breach_probability: 0, risk_level: 'LOW' };
        }
        try {
            const response = await fetch(`${this.baseURL}/predict/sla-breach`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary, description }) });
            return await response.json();
        } catch (error) {
            console.error('❌ [FlowingMVP ML] Error predicting SLA breach:', error);
            return { will_breach: false, breach_probability: 0, risk_level: 'LOW' };
        }
    }
    /**
     * Sugerir asignados
     */
    async suggestAssignee(summary, description = '', topK = 3) {
        if (!this.configured || !this.baseURL) {
            console.warn('⚠️ [FlowingMVP ML] suggestAssignee called but client not configured. Returning default.');
            return { suggestions: [], top_choice: null };
        }
        try {
            const response = await fetch(`${this.baseURL}/predict/assignee`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary, description }) });
            return await response.json();
        } catch (error) {
            console.error('❌ [FlowingMVP ML] Error suggesting assignee:', error);
            return { suggestions: [], top_choice: null };
        }
    }
    /**
     * Sugerir labels
     */
    async suggestLabels(summary, description = '', threshold = 0.3) {
        if (!this.configured || !this.baseURL) {
            console.warn('⚠️ [FlowingMVP ML] suggestLabels called but client not configured. Returning default.');
            return { suggested_labels: [], count: 0 };
        }
        try {
            const response = await fetch(`${this.baseURL}/predict/labels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary, description }) });
            return await response.json();
        } catch (error) {
            console.error('❌ [FlowingMVP ML] Error suggesting labels:', error);
            return { suggested_labels: [], count: 0 };
        }
    }
    /**
     * Sugerir siguiente estado
     */
    async suggestStatus(summary, description = '') {
        if (!this.configured || !this.baseURL) {
            console.warn('⚠️ [FlowingMVP ML] suggestStatus called but client not configured. Returning default.');
            return { suggested_status: 'Unknown', confidence: 0 };
        }
        try {
            const response = await fetch(`${this.baseURL}/predict/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary, description }) });
            return await response.json();
        } catch (error) {
            console.error('❌ [FlowingMVP ML] Error suggesting status:', error);
            return { suggested_status: 'Unknown', confidence: 0 };
        }
    }
    /**
     * Health check del servicio
     */
    async healthCheck() {
        if (!this.configured || !this.baseURL) {
            console.warn('⚠️ [FlowingMVP ML] healthCheck called but client not configured. Returning unavailable.');
            return { status: 'unavailable' };
        }
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return await response.json();
        } catch (error) {
            console.error('❌ [FlowingMVP ML] Service unavailable:', error);
            return { status: 'unavailable' };
        }
    }
    /**
     * Limpiar caché local
     */
    clearCache() {
        // noop - no client-side cache by default in restructured client
        console.log('ℹ️ [FlowingMVP ML] clearCache() noop (no cache)');
    }
}
// ==================== UI HELPERS ====================
/**
 * Helper para auto-completar campos con sugerencias ML
 */
class FlowingMVPMLUI {
    constructor(mlClient) {
        this.mlClient = mlClient;
        this.suggestionBadges = new Map();
    }
    /**
     * Inicializar sugerencias ML en formulario de ticket
     * @param {string} summaryFieldId - ID del campo summary
     * @param {string} descriptionFieldId - ID del campo description
     */
    initTicketForm(summaryFieldId, descriptionFieldId) {
        const summaryField = document.getElementById(summaryFieldId);
        const descriptionField = document.getElementById(descriptionFieldId);
        if (!summaryField) {
            console.warn('⚠️ [ML] Summary field not found');
            return;
        }
        // Debounce para evitar requests excesivos
        let debounceTimer;
        const debounceDelay = 800;
        const fetchSuggestions = async () => {
            const summary = summaryField.value.trim();
            const description = descriptionField ? descriptionField.value.trim() : '';
            if (summary.length < 10) return; // Mínimo 10 caracteres
            try {
                const predictions = await this.mlClient.predictAll(summary, description);
                this.applyPredictions(predictions);
            } catch (error) {
                console.error('❌ [ML] Error fetching suggestions:', error);
            }
        };
        summaryField.addEventListener('blur', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(fetchSuggestions, debounceDelay);
        });
        if (descriptionField) {
            descriptionField.addEventListener('blur', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(fetchSuggestions, debounceDelay);
            });
        }
    }
    /**
     * Aplicar predicciones ML a la UI
     */
    applyPredictions(predictions) {
        // 1. Auto-completar prioridad
        if (predictions.priority && predictions.priority.confidence > 0.8) {
            this.autofillPriority(predictions.priority);
        }
        // 2. Mostrar alerta de duplicados
        if (predictions.duplicate_check && predictions.duplicate_check.is_duplicate) {
            this.showDuplicateAlert(predictions.duplicate_check);
        }
        // 3. Alerta de riesgo SLA
        if (predictions.sla_breach && predictions.sla_breach.risk_level === 'HIGH') {
            this.showSLAWarning(predictions.sla_breach);
        }
        // 4. Sugerir asignados
        if (predictions.assignee && predictions.assignee.suggestions.length > 0) {
            this.suggestAssignees(predictions.assignee);
        }
        // 5. Sugerir labels
        if (predictions.labels && predictions.labels.count > 0) {
            this.suggestLabels(predictions.labels);
        }
    }
    /**
     * Auto-completar prioridad
     */
    autofillPriority(priorityData) {
        const priorityField = document.getElementById('priority') ||
            document.querySelector('[name="priority"]');
        if (!priorityField) return;
        priorityField.value = priorityData.suggested_priority;
        this.showSuggestionBadge(priorityField, '🤖 Sugerido por IA', priorityData.confidence);
    }
    /**
     * Mostrar alerta de duplicado
     */
    showDuplicateAlert(duplicateData) {
        const alertHTML = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>⚠️ Posible ticket duplicado</strong>
                <p>Confianza: ${(duplicateData.confidence * 100).toFixed(0)}%</p>
                ${duplicateData.similar_tickets.length > 0 ?
                `<p>Similares: ${duplicateData.similar_tickets.join(', ')}</p>` : ''}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        this.showAlert(alertHTML);
    }
    /**
     * Mostrar advertencia de SLA
     */
    showSLAWarning(slaData) {
        const warningHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-clock"></i>
                <strong>🚨 Alto riesgo de violar SLA</strong>
                <p>Probabilidad: ${(slaData.breach_probability * 100).toFixed(0)}%</p>
                <p>Nivel de riesgo: <span class="badge bg-danger">${slaData.risk_level}</span></p>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        this.showAlert(warningHTML);
    }
    /**
     * Sugerir asignados
     */
    suggestAssignees(assigneeData) {
        const assigneeField = document.getElementById('assignee') ||
            document.querySelector('[name="assignee"]');
        if (!assigneeField) return;
        // Si es un select, agregar opciones con badges de confianza
        if (assigneeField.tagName === 'SELECT') {
            assigneeData.suggestions.forEach((suggestion, index) => {
                const confidence = (suggestion.confidence * 100).toFixed(0);
                const option = document.createElement('option');
                option.value = suggestion.assignee;
                option.text = `${suggestion.assignee} (${confidence}% ML)`;
                if (index === 0) {
                    assigneeField.prepend(option);
                    option.selected = true;
                }
            });
        }
    }
    /**
     * Sugerir labels
     */
    suggestLabels(labelsData) {
        const labelsContainer = document.getElementById('suggested-labels');
        if (!labelsContainer) return;
        labelsContainer.innerHTML = '<strong>🏷️ Labels sugeridos:</strong><br>';
        labelsData.suggested_labels.forEach(label => {
            const confidence = (label.confidence * 100).toFixed(0);
            const badge = document.createElement('span');
            badge.className = 'badge bg-info me-2 mb-2';
            badge.innerHTML = `${label.label} (${confidence}%)`;
            badge.style.cursor = 'pointer';
            badge.onclick = () => this.addLabel(label.label);
            labelsContainer.appendChild(badge);
        });
    }
    /**
     * Agregar label al campo
     */
    addLabel(labelText) {
        const labelsField = document.getElementById('labels') ||
            document.querySelector('[name="labels"]');
        if (!labelsField) return;
        const currentLabels = labelsField.value.split(',').map(l => l.trim()).filter(Boolean);
        if (!currentLabels.includes(labelText)) {
            currentLabels.push(labelText);
            labelsField.value = currentLabels.join(', ');
        }
    }
    /**
     * Mostrar badge de sugerencia
     */
    showSuggestionBadge(field, text, confidence) {
        const badge = document.createElement('span');
        badge.className = 'badge bg-success ms-2';
        badge.innerHTML = `${text} (${(confidence * 100).toFixed(0)}%)`;
        // Insertar después del campo
        field.parentNode.insertBefore(badge, field.nextSibling);
        // Auto-remover después de 5 segundos
        setTimeout(() => badge.remove(), 5000);
    }
    /**
     * Mostrar alerta
     */
    showAlert(html) {
        let alertContainer = document.getElementById('ml-alerts');
        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.id = 'ml-alerts';
            alertContainer.className = 'ml-alerts-container';
            document.body.insertBefore(alertContainer, document.body.firstChild);
        }
        alertContainer.innerHTML += html;
    }
}
// ==================== EXPORT ====================
// Crear instancia global si no existe
if (typeof window !== 'undefined') {
    window.FlowingMVPMLClient = FlowingMVPMLClient;
    window.FlowingMVPMLUI = FlowingMVPMLUI;
    // Instancia lista para usar (legacy default kept)
    window.flowingMvpMlClient = new FlowingMVPMLClient();
    window.flowingMvpMlUI = new FlowingMVPMLUI(window.flowingMvpMlClient);
    console.log('✅ [FlowingMVP ML] Client initialized (frontend copy)');
}
