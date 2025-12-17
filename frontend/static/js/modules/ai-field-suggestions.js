/**
 * AI FIELD SUGGESTIONS MODULE
 * Implementa funcionalidad similar a Atlassian Intelligence
 * Analiza tickets y sugiere actualizaciones de campos
 */

// Deprecated: AI Field Suggestions removed. Stubbed implementation to avoid network calls.

if (typeof window !== 'undefined') {
  window.aiFieldSuggestions = {
    showSuggestionsModal: (issueKey) => alert('AI field suggestions are disabled in this deployment.'),
    init: () => console.log('ℹ️ [Deprecated] aiFieldSuggestions.init() called - no-op'),
    closeModal: () => {}
  };
}

  /**
   * Crea el modal de sugerencias
   */
  createModal() {
    // Remover modal existente si hay
    const existingModal = document.getElementById('aiSuggestionsModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'aiSuggestionsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-container ai-suggestions-modal">
        <div class="modal-header">
          <div class="modal-title-section">
            <span class="modal-icon">🤖</span>
            <h2 class="modal-title">Actualiza los campos que sugiere Atlassian Intelligence</h2>
          </div>
          <button class="modal-close" onclick="window.aiSuggestions.closeModal()">×</button>
        </div>
        <div class="modal-subtitle">
          <span class="badge badge-info">✨ Priorización</span>
          <span class="modal-issue-key">${this.currentIssue}</span>
        </div>
        <div class="modal-body" id="aiSuggestionsContent">
          <!-- Content will be injected here -->
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="window.aiSuggestions.closeModal()">
            Cancelar
          </button>
          <button class="btn-primary" id="applyAISuggestionsBtn" disabled>
            <span class="btn-icon">✨</span>
            <span class="btn-text">Actualizar campos</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;

    // Event listeners
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    });

    const applyBtn = modal.querySelector('#applyAISuggestionsBtn');
    applyBtn.addEventListener('click', () => this.applySuggestions());
  }

  /**
   * Muestra estado de carga
   */
  showLoadingState() {
    const content = document.getElementById('aiSuggestionsContent');
    content.innerHTML = `
      <div class="ai-loading-state">
        <div class="ai-spinner"></div>
        <p class="ai-loading-text">Analizando ticket con Atlassian Intelligence...</p>
        <p class="ai-loading-subtext">Buscando campos que se puedan mejorar</p>
      </div>
    `;
  }

  /**
   * Muestra estado de error
   */
  showErrorState(errorMessage) {
    const content = document.getElementById('aiSuggestionsContent');
    content.innerHTML = `
      <div class="ai-error-state">
        <span class="error-icon">⚠️</span>
        <h3>No se pudieron obtener sugerencias</h3>
        <p class="error-message">${this.escapeHtml(errorMessage)}</p>
        <button class="btn-secondary" onclick="window.aiSuggestions.closeModal()">
          Cerrar
        </button>
      </div>
    `;
  }

  /**
   * Renderiza las sugerencias
   */
  renderSuggestions() {
    const content = document.getElementById('aiSuggestionsContent');
    
    if (this.suggestions.length === 0) {
      content.innerHTML = `
        <div class="ai-empty-state">
          <span class="empty-icon">✅</span>
          <h3>Todo se ve bien</h3>
          <p>No se encontraron campos que mejorar en este ticket.</p>
        </div>
      `;
      return;
    }

    let html = '<div class="ai-suggestions-list">';
    
    this.suggestions.forEach((suggestion, index) => {
      const suggestionId = `suggestion-${index}`;
      const isSelected = this.selectedSuggestions.has(index);
      const confidencePercent = Math.round(suggestion.confidence * 100);
      const confidenceClass = this.getConfidenceClass(suggestion.confidence);
      
      html += `
        <div class="ai-suggestion-card ${isSelected ? 'selected' : ''}" data-index="${index}">
          <div class="suggestion-header">
            <div class="suggestion-checkbox">
              <input 
                type="checkbox" 
                id="${suggestionId}" 
                ${isSelected ? 'checked' : ''}
                onchange="window.aiSuggestions.toggleSuggestion(${index})"
              />
              <label for="${suggestionId}"></label>
            </div>
            <div class="suggestion-info">
              <div class="suggestion-field-name">
                ${this.escapeHtml(suggestion.field_label)}
              </div>
              <div class="suggestion-confidence ${confidenceClass}">
                <span class="confidence-icon">🎯</span>
                <span class="confidence-value">${confidencePercent}% confianza</span>
              </div>
            </div>
          </div>
          <div class="suggestion-change">
            <div class="change-item">
              <span class="change-label">Valor actual:</span>
              <span class="change-value current">
                ${this.formatValue(suggestion.current_value)}
              </span>
            </div>
            <div class="change-arrow">→</div>
            <div class="change-item">
              <span class="change-label">Valor sugerido:</span>
              <span class="change-value suggested">
                ${this.formatValue(suggestion.suggested_value)}
              </span>
            </div>
          </div>
          <div class="suggestion-reason">
            <span class="reason-icon">💡</span>
            <span class="reason-text">${this.escapeHtml(suggestion.reason)}</span>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    content.innerHTML = html;

    // Actualizar botón
    this.updateApplyButton();
  }

  /**
   * Toggle de selección de sugerencia
   */
  toggleSuggestion(index) {
    if (this.selectedSuggestions.has(index)) {
      this.selectedSuggestions.delete(index);
    } else {
      this.selectedSuggestions.add(index);
    }

    // Actualizar UI
    const card = this.modal.querySelector(`[data-index="${index}"]`);
    if (card) {
      card.classList.toggle('selected');
    }

    this.updateApplyButton();
  }

  /**
   * Actualiza el estado del botón de aplicar
   */
  updateApplyButton() {
    const applyBtn = this.modal.querySelector('#applyAISuggestionsBtn');
    const count = this.selectedSuggestions.size;
    
    if (count > 0) {
      applyBtn.disabled = false;
      applyBtn.querySelector('.btn-text').textContent = 
        `Actualizar ${count} campo${count > 1 ? 's' : ''}`;
    } else {
      applyBtn.disabled = true;
      applyBtn.querySelector('.btn-text').textContent = 'Actualizar campos';
    }
  }

  /**
   * Aplica las sugerencias seleccionadas
   */
  async applySuggestions() {
    if (this.selectedSuggestions.size === 0) {
      return;
    }

    const applyBtn = this.modal.querySelector('#applyAISuggestionsBtn');
    const originalText = applyBtn.querySelector('.btn-text').textContent;
    
    // Mostrar loading
    applyBtn.disabled = true;
    applyBtn.querySelector('.btn-text').textContent = 'Aplicando...';
    applyBtn.classList.add('loading');

    try {
      const selectedSuggestionsList = Array.from(this.selectedSuggestions)
        .map(index => this.suggestions[index]);

      // Preparar updates para JIRA API
      const fields = {};
      selectedSuggestionsList.forEach(suggestion => {
        fields[suggestion.field] = this.prepareFieldValue(suggestion);
      });

      // Actualizar ticket via API
      const response = await fetch(`/api/issues/${this.currentIssue}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ fields })
      });

      if (!response.ok) {
        throw new Error(`Failed to update issue: ${response.statusText}`);
      }

      console.log(`✅ Successfully updated ${this.selectedSuggestions.size} fields`);

      // Mostrar notificación de éxito
      this.showSuccessNotification(this.selectedSuggestions.size);

      // Cerrar modal
      this.closeModal();

      // Recargar datos del ticket
      if (window.app && typeof window.app.refreshCurrentIssue === 'function') {
        window.app.refreshCurrentIssue();
      }

    } catch (error) {
      console.error('❌ Error applying suggestions:', error);
      
      // Restaurar botón
      applyBtn.disabled = false;
      applyBtn.querySelector('.btn-text').textContent = originalText;
      applyBtn.classList.remove('loading');
      
      // Mostrar error
      alert(`Error al actualizar los campos: ${error.message}`);
    }
  }

  /**
   * Prepara el valor del campo para la API de JIRA
   */
  prepareFieldValue(suggestion) {
    const { field_name, suggested_value } = suggestion;
    
    // Severity/Criticidad - usar el value para customfield
    if (field_name === 'severity') {
      return { value: suggested_value };
    }
    
    // Priority - usar name
    if (field_name === 'priority') {
      return { name: suggested_value };
    }
    
    // Labels - array simple
    if (field_name === 'labels') {
      return Array.isArray(suggested_value) ? suggested_value : [suggested_value];
    }
    
    // Assignee - usar accountId o name
    if (field_name === 'assignee') {
      return { name: suggested_value };
    }
    
    // Default: retornar valor tal cual
    return suggested_value;
  }

  /**
   * Muestra notificación de éxito
   */
  showSuccessNotification(count) {
    if (window.notificationSystem) {
      window.notificationSystem.show({
        type: 'success',
        title: 'Campos actualizados',
        message: `Se actualizaron ${count} campo${count > 1 ? 's' : ''} exitosamente`,
        duration: 4000
      });
    }
  }

  /**
   * Cierra el modal
   */
  closeModal() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    this.currentIssue = null;
    this.suggestions = [];
    this.selectedSuggestions.clear();
  }

  /**
   * Obtiene clase CSS para nivel de confianza
   */
  getConfidenceClass(confidence) {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  }

  /**
   * Formatea valor para mostrar
   */
  formatValue(value) {
    if (value === null || value === undefined || value === '') {
      return '<span class="value-empty">Sin valor</span>';
    }
    
    if (Array.isArray(value)) {
      return value.map(v => `<span class="badge">${this.escapeHtml(v)}</span>`).join(' ');
    }
    
    return this.escapeHtml(String(value));
  }

  /**
   * Escapa HTML para prevenir XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Inicializar instancia global
if (typeof window !== 'undefined') {
  try {
    window.aiSuggestions = new AIFieldSuggestions();
    console.log('✅ AI Field Suggestions module loaded successfully');
    console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.aiSuggestions)));
  } catch (error) {
    console.error('❌ Failed to initialize AI Field Suggestions:', error);
  }
}
