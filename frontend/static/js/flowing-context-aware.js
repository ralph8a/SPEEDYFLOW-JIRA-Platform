/**
 * Flowing MVP - Context-Aware Suggestions
 * Sistema que detecta el contexto actual y muestra sugerencias relevantes de IA
 * Se integra con el footer de AI Copilot existente
 */

window.FlowingContext = {
    // Estado actual
    currentContext: null,
    activeIssueKey: null,
    contextData: {},
    
    // Configuración de contextos
    contexts: {
        KANBAN_BOARD: 'kanban_board',
        KANBAN_CARD: 'kanban_card',
        LIST_VIEW: 'list_view',
        RIGHT_SIDEBAR: 'right_sidebar',
        COMMENTS_SECTION: 'comments_section',
        FILTER_BAR: 'filter_bar'
    },
    
    /**
     * Detectar el contexto actual basado en el estado de la UI
     */
    detectContext() {
        const state = window.state || {};
        
        // Sidebar abierto con un ticket
        if (state.rightSidebarOpen && state.activeIssueKey) {
            this.currentContext = this.contexts.RIGHT_SIDEBAR;
            this.activeIssueKey = state.activeIssueKey;
            
            // Verificar si hay focus en comentarios
            if (document.activeElement?.closest('.comments-section')) {
                this.currentContext = this.contexts.COMMENTS_SECTION;
            }
            
            return this.currentContext;
        }
        
        // Board view activo
        if (state.currentView === 'kanban') {
            // Verificar si hay una tarjeta siendo hover/focused
            const hoveredCard = document.querySelector('.kanban-card:hover, .kanban-card.focused');
            if (hoveredCard) {
                this.currentContext = this.contexts.KANBAN_CARD;
                this.activeIssueKey = hoveredCard.dataset.issueKey;
            } else {
                this.currentContext = this.contexts.KANBAN_BOARD;
                this.activeIssueKey = null;
            }
            return this.currentContext;
        }
        
        // List view activo
        if (state.currentView === 'list') {
            this.currentContext = this.contexts.LIST_VIEW;
            this.activeIssueKey = null;
            return this.currentContext;
        }
        
        // Filter bar tiene focus
        if (document.activeElement?.closest('.filter-bar-enhanced')) {
            this.currentContext = this.contexts.FILTER_BAR;
            this.activeIssueKey = null;
            return this.currentContext;
        }
        
        // Contexto por defecto según vista
        this.currentContext = state.currentView === 'list' ? 
            this.contexts.LIST_VIEW : this.contexts.KANBAN_BOARD;
        this.activeIssueKey = null;
        
        return this.currentContext;
    },
    
    /**
     * Obtener datos adicionales del contexto
     */
    getContextData() {
        const state = window.state || {};
        const data = {
            view: state.currentView,
            queue: state.selectedQueue,
            issueCount: state.issues?.length || 0,
            filters: state.activeFilters || {}
        };
        
        // Si hay un ticket activo, agregar su información
        if (this.activeIssueKey && state.issues) {
            const issue = state.issues.find(i => i.key === this.activeIssueKey);
            if (issue) {
                data.issueStatus = issue.status;
                data.issueType = issue.type;
                data.issuePriority = issue.priority;
                data.commentCount = issue.commentCount || 0;
            }
        }
        
        this.contextData = data;
        return data;
    },
    
    /**
     * Obtener sugerencias para el contexto actual
     */
    async getSuggestions() {
        const context = this.detectContext();
        const contextData = this.getContextData();
        
        try {
            const response = await fetch('/api/flowing/contextual-suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    context: context,
                    issue_key: this.activeIssueKey,
                    context_data: contextData
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const suggestions = await response.json();
            return suggestions;
        } catch (error) {
            console.error('Error fetching contextual suggestions:', error);
            return this.getFallbackSuggestions(context);
        }
    },
    
    /**
     * Sugerencias de respaldo (fallback) si la API falla
     */
    getFallbackSuggestions(context) {
        const fallbacks = {
            [this.contexts.KANBAN_BOARD]: {
                title: '📊 Sugerencias para Board',
                suggestions: [
                    { id: 'similar', icon: '🔍', title: 'Buscar similares', action: 'semantic_search' },
                    { id: 'duplicates', icon: '📋', title: 'Detectar duplicados', action: 'detect_duplicates' }
                ]
            },
            [this.contexts.LIST_VIEW]: {
                title: '📝 Sugerencias para Lista',
                suggestions: [
                    { id: 'bulk_search', icon: '🔍', title: 'Búsqueda en lote', action: 'semantic_search' },
                    { id: 'bulk_duplicates', icon: '📋', title: 'Duplicados masivos', action: 'detect_duplicates' }
                ]
            },
            [this.contexts.RIGHT_SIDEBAR]: {
                title: '📄 Sugerencias',
                suggestions: [
                    { id: 'summarize', icon: '📝', title: 'Resumir', action: 'summarize_conversation' },
                    { id: 'suggest', icon: '💬', title: 'Sugerir respuesta', action: 'suggest_response' },
                    { id: 'translate', icon: '🌐', title: 'Traducir', action: 'translate_comment' }
                ]
            }
        };
        
        return fallbacks[context] || { title: '💡 Sugerencias', suggestions: [] };
    },
    
    /**
     * Renderizar el botón flotante de sugerencias
     */
    renderFloatingButton() {
        // Remover botón existente si hay
        const existing = document.getElementById('flowing-fab');
        if (existing) existing.remove();
        
        // Crear botón flotante
        const fab = document.createElement('div');
        fab.id = 'flowing-fab';
        fab.className = 'flowing-fab';
        fab.innerHTML = `
            <button class="fab-button" id="flowing-fab-btn">
                <span class="fab-icon">✨</span>
                <span class="fab-text">Flowing AI</span>
            </button>
        `;
        
        document.body.appendChild(fab);
        
        // Event listener
        const btn = document.getElementById('flowing-fab-btn');
        btn.addEventListener('click', () => this.showSuggestionsModal());
    },
    
    /**
     * Mostrar modal con sugerencias
     */
    async showSuggestionsModal() {
        const suggestions = await this.getSuggestions();
        
        // Crear modal
        const modal = document.createElement('div');
        modal.id = 'flowing-suggestions-modal';
        modal.className = 'flowing-modal';
        modal.innerHTML = `
            <div class="flowing-modal-content">
                <div class="flowing-modal-header">
                    <h3>${suggestions.title}</h3>
                    <button class="flowing-modal-close" onclick="FlowingContext.closeModal()">×</button>
                </div>
                <div class="flowing-modal-body">
                    <div class="context-info">
                        <span class="context-badge">${this.getContextLabel()}</span>
                        ${this.activeIssueKey ? `<span class="issue-badge">${this.activeIssueKey}</span>` : ''}
                    </div>
                    <div class="suggestions-grid">
                        ${this.renderSuggestions(suggestions.suggestions)}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animación de entrada
        setTimeout(() => modal.classList.add('show'), 10);
    },
    
    /**
     * Renderizar lista de sugerencias
     */
    renderSuggestions(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            return '<p class="no-suggestions">No hay sugerencias disponibles para este contexto</p>';
        }
        
        return suggestions.map(suggestion => `
            <div class="suggestion-card" data-action="${suggestion.action}" data-id="${suggestion.id}">
                <div class="suggestion-icon">${suggestion.icon}</div>
                <div class="suggestion-content">
                    <h4 class="suggestion-title">${suggestion.title}</h4>
                    <p class="suggestion-description">${suggestion.description || ''}</p>
                </div>
                <button class="suggestion-action-btn" onclick="FlowingContext.executeSuggestion('${suggestion.action}', '${suggestion.id}')">
                    Ejecutar
                </button>
            </div>
        `).join('');
    },
    
    /**
     * Obtener etiqueta legible del contexto
     */
    getContextLabel() {
        const labels = {
            [this.contexts.KANBAN_BOARD]: 'Board View',
            [this.contexts.KANBAN_CARD]: 'Tarjeta',
            [this.contexts.LIST_VIEW]: 'List View',
            [this.contexts.RIGHT_SIDEBAR]: 'Ticket Abierto',
            [this.contexts.COMMENTS_SECTION]: 'Comentarios',
            [this.contexts.FILTER_BAR]: 'Filtros'
        };
        return labels[this.currentContext] || 'Desconocido';
    },
    
    /**
     * Cerrar modal
     */
    closeModal() {
        const modal = document.getElementById('flowing-suggestions-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    },
    
    /**
     * Ejecutar una sugerencia
     */
    async executeSuggestion(action, suggestionId) {
        console.log('Executing suggestion:', action, suggestionId);
        
        // Cerrar modal
        this.closeModal();
        
        // Mostrar loading
        this.showLoadingState(action);
        
        // Mapear acción a endpoint
        const endpoints = {
            'semantic_search': '/api/flowing/semantic-search',
            'detect_duplicates': '/api/flowing/detect-duplicates',
            'suggest_response': '/api/flowing/suggest-response',
            'summarize_conversation': '/api/flowing/summarize-conversation',
            'translate_comment': '/api/flowing/translate-comment',
            'queue_analysis': '/api/ml/analyze-queue'
        };
        
        const endpoint = endpoints[action];
        if (!endpoint) {
            console.error('Unknown action:', action);
            this.showError('Acción no reconocida');
            return;
        }
        
        try {
            // Preparar payload según la acción
            const payload = this.buildPayload(action);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            this.showResult(action, result);
            
        } catch (error) {
            console.error('Error executing suggestion:', error);
            this.showError('Error al ejecutar la sugerencia');
        } finally {
            this.hideLoadingState();
        }
    },
    
    /**
     * Construir payload para la acción
     */
    buildPayload(action) {
        const payload = {
            issue_key: this.activeIssueKey,
            context: this.currentContext,
            ...this.contextData
        };
        
        // Agregar datos específicos según la acción
        if (action === 'semantic_search') {
            const issue = window.state?.issues?.find(i => i.key === this.activeIssueKey);
            payload.query = issue?.summary || '';
            payload.queue_id = window.state?.selectedQueue;
        }
        
        if (action === 'suggest_response') {
            payload.response_type = 'acknowledgment';
        }
        
        if (action === 'translate_comment') {
            payload.target_language = 'en';
        }
        
        return payload;
    },
    
    /**
     * Mostrar estado de carga
     */
    showLoadingState(action) {
        const toast = document.createElement('div');
        toast.id = 'flowing-loading-toast';
        toast.className = 'flowing-toast loading';
        toast.innerHTML = `
            <div class="toast-content">
                <div class="spinner"></div>
                <span>Procesando...</span>
            </div>
        `;
        document.body.appendChild(toast);
    },
    
    /**
     * Ocultar estado de carga
     */
    hideLoadingState() {
        const toast = document.getElementById('flowing-loading-toast');
        if (toast) toast.remove();
    },
    
    /**
     * Mostrar resultado
     */
    showResult(action, result) {
        const modal = document.createElement('div');
        modal.id = 'flowing-result-modal';
        modal.className = 'flowing-modal show';
        modal.innerHTML = `
            <div class="flowing-modal-content">
                <div class="flowing-modal-header">
                    <h3>✨ Resultado</h3>
                    <button class="flowing-modal-close" onclick="FlowingContext.closeResultModal()">×</button>
                </div>
                <div class="flowing-modal-body">
                    ${this.formatResult(action, result)}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    /**
     * Formatear resultado según el tipo de acción
     */
    formatResult(action, result) {
        if (action === 'semantic_search' || action === 'detect_duplicates') {
            return this.formatSearchResults(result);
        }
        
        if (action === 'suggest_response') {
            return this.formatSuggestionResults(result);
        }
        
        if (action === 'summarize_conversation') {
            return this.formatSummary(result);
        }
        
        if (action === 'translate_comment') {
            return this.formatTranslation(result);
        }
        
        return `<pre>${JSON.stringify(result, null, 2)}</pre>`;
    },
    
    formatSearchResults(result) {
        if (!result.results || result.results.length === 0) {
            return '<p>No se encontraron resultados similares</p>';
        }
        
        return `
            <div class="search-results">
                ${result.results.map(item => `
                    <div class="result-item">
                        <div class="result-header">
                            <a href="#" onclick="window.state.showIssue('${item.key}')">${item.key}</a>
                            <span class="similarity-badge">${(item.similarity * 100).toFixed(0)}%</span>
                        </div>
                        <p class="result-summary">${item.summary}</p>
                        <div class="result-meta">
                            <span>${item.status}</span>
                            <span>${item.assignee || 'Sin asignar'}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    formatSuggestionResults(result) {
        if (!result.suggestions || result.suggestions.length === 0) {
            return '<p>No se generaron sugerencias</p>';
        }
        
        return `
            <div class="response-suggestions">
                ${result.suggestions.map((suggestion, index) => `
                    <div class="response-option">
                        <div class="response-header">
                            <span class="response-type">${suggestion.type}</span>
                            <button onclick="FlowingContext.copyResponse(${index})" class="copy-btn">Copiar</button>
                        </div>
                        <div class="response-text" id="response-${index}">${suggestion.text}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    formatSummary(result) {
        return `
            <div class="summary-result">
                <h4>Resumen de la conversación</h4>
                <p>${result.summary}</p>
                <div class="summary-meta">
                    <span>📊 ${result.comment_count} comentarios analizados</span>
                </div>
            </div>
        `;
    },
    
    formatTranslation(result) {
        return `
            <div class="translation-result">
                <div class="original-text">
                    <h4>Original:</h4>
                    <p>${result.original_text}</p>
                </div>
                <div class="translated-text">
                    <h4>Traducción (${result.target_language}):</h4>
                    <p>${result.translated_text}</p>
                </div>
            </div>
        `;
    },
    
    /**
     * Copiar respuesta al portapapeles
     */
    copyResponse(index) {
        const responseText = document.getElementById(`response-${index}`).textContent;
        navigator.clipboard.writeText(responseText).then(() => {
            this.showToast('Respuesta copiada al portapapeles');
        });
    },
    
    /**
     * Cerrar modal de resultado
     */
    closeResultModal() {
        const modal = document.getElementById('flowing-result-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    },
    
    /**
     * Mostrar toast de notificación
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'flowing-toast success';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
    
    /**
     * Mostrar error
     */
    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'flowing-toast error';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
    
    /**
     * Inicializar sistema
     */
    init() {
        console.log('Initializing Flowing Context-Aware System...');
        
        // NOTA: Botón flotante deshabilitado - usar el footer de AI Copilot existente
        // this.renderFloatingButton();
        
        // Detectar cambios de contexto
        this.setupContextDetection();
        
        console.log('Flowing Context-Aware System initialized (without FAB button)');
    },
    
    /**
     * Configurar detección automática de cambios de contexto
     */
    setupContextDetection() {
        // Detectar cambios en el view
        if (window.state) {
            const originalSetView = window.state.setView || function() {};
            window.state.setView = (...args) => {
                originalSetView.apply(window.state, args);
                setTimeout(() => this.detectContext(), 100);
            };
        }
        
        // Detectar apertura/cierre de sidebar
        document.addEventListener('click', (e) => {
            if (e.target.closest('.kanban-card') || 
                e.target.closest('.list-row') ||
                e.target.closest('.sidebar-close')) {
                setTimeout(() => this.detectContext(), 100);
            }
        });
        
        // Detectar cambios de focus
        document.addEventListener('focusin', () => {
            setTimeout(() => this.detectContext(), 50);
        });
    }
};

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.FlowingContext.init());
} else {
    window.FlowingContext.init();
}
