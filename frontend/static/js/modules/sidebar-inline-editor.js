/**
 * SIDEBAR INLINE EDITOR WITH AI SUGGESTIONS
 * Integra el AI analyzer con edición inline de campos en el sidebar
 */

class SidebarInlineEditor {
  constructor() {
    this.currentIssue = null;
    this.aiSuggestions = [];
    this.editableFields = [];
    this.isEditMode = false;
    this.pendingChanges = {};
  }

  /**
   * Inicializa el editor inline para un issue
   * @param {string} issueKey - Key del issue
   */
  async initForIssue(issueKey) {
    console.log(`📝 Initializing inline editor for ${issueKey}`);
    this.currentIssue = issueKey;
    this.pendingChanges = {};
    
    // Agregar botón de AI suggestions en el sidebar
    this.addAISuggestionsButton();
  }

  /**
   * Agrega botón de AI suggestions al sidebar
   */
  addAISuggestionsButton() {
    const sidebar = document.getElementById('rightSidebar');
    if (!sidebar) return;

    // Buscar el header del sidebar
    const header = sidebar.querySelector('.sidebar-header');
    if (!header) return;

    // Verificar si ya existe
    if (document.getElementById('aiSuggestionsBtn')) return;

    // Crear botón
    const btn = document.createElement('button');
    btn.id = 'aiSuggestionsBtn';
    btn.className = 'sidebar-ai-btn';
    btn.innerHTML = '🤖 AI Analyze';
    btn.title = 'Get AI suggestions for missing fields';
    btn.onclick = () => this.loadAISuggestions();

    // Insertar antes del botón de cerrar
    const closeBtn = header.querySelector('#closeSidebarBtn');
    if (closeBtn) {
      header.insertBefore(btn, closeBtn);
    } else {
      header.appendChild(btn);
    }
  }

  /**
   * Carga y muestra sugerencias de AI
   */
  async loadAISuggestions() {
    console.log(`🤖 Loading AI suggestions for ${this.currentIssue}`);
    
    const btn = document.getElementById('aiSuggestionsBtn');
    if (btn) {
      btn.innerHTML = '⏳ Analyzing...';
      btn.disabled = true;
    }

    try {
      const response = await fetch('/api/ai/suggest-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          issue_key: this.currentIssue,
          fields_to_analyze: [
            'customfield_10125',  // Criticidad
            'priority',
            'labels',
            'assignee',
            'components',
            'description'
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.aiSuggestions = data.suggestions || [];
      
      console.log(`✅ Received ${this.aiSuggestions.length} AI suggestions`);

      if (this.aiSuggestions.length === 0) {
        this.showNoSuggestionsMessage();
      } else {
        this.enableEditMode();
        this.renderInlineSuggestions();
      }

    } catch (error) {
      console.error('❌ Error loading AI suggestions:', error);
      alert('Failed to load AI suggestions. Please try again.');
    } finally {
      if (btn) {
        btn.innerHTML = '🤖 AI Analyze';
        btn.disabled = false;
      }
    }
  }

  /**
   * Muestra mensaje cuando no hay sugerencias
   */
  showNoSuggestionsMessage() {
    const sidebar = document.getElementById('detailsPanel');
    if (!sidebar) return;

    // Crear banner temporal
    const banner = document.createElement('div');
    banner.className = 'ai-suggestions-banner success';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1)); border-radius: 12px; border-left: 4px solid #10b981; margin: 16px 0;">
        <span style="font-size: 24px;">✅</span>
        <div>
          <div style="font-weight: 600; color: #10b981; margin-bottom: 4px;">All Fields Complete!</div>
          <div style="font-size: 13px; color: #64748b;">This ticket has all required fields filled out correctly.</div>
        </div>
      </div>
    `;

    sidebar.insertBefore(banner, sidebar.firstChild);

    // Remover después de 5 segundos
    setTimeout(() => banner.remove(), 5000);
  }

  /**
   * Habilita modo de edición
   */
  enableEditMode() {
    this.isEditMode = true;
    console.log('📝 Edit mode enabled');

    // Agregar banner de sugerencias
    this.addSuggestionsBanner();
  }

  /**
   * Agrega banner con contador de sugerencias
   */
  addSuggestionsBanner() {
    const sidebar = document.getElementById('detailsPanel');
    if (!sidebar) return;

    // Remover banner existente
    const existingBanner = sidebar.querySelector('.ai-suggestions-banner');
    if (existingBanner) existingBanner.remove();

    const banner = document.createElement('div');
    banner.className = 'ai-suggestions-banner';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: linear-gradient(135deg, rgba(168,85,247,0.1), rgba(139,92,246,0.1)); border-radius: 12px; border-left: 4px solid #a855f7; margin: 16px 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 24px;">🤖</span>
          <div>
            <div style="font-weight: 600; color: #cbd5e1; margin-bottom: 4px;">AI Suggestions Ready</div>
            <div style="font-size: 13px; color: #94a3b8;">Found ${this.aiSuggestions.length} field${this.aiSuggestions.length !== 1 ? 's' : ''} to improve</div>
          </div>
        </div>
        <button class="btn-primary-sm" onclick="window.sidebarEditor.applyAllSuggestions()">
          Apply All
        </button>
      </div>
    `;

    sidebar.insertBefore(banner, sidebar.firstChild);
  }

  /**
   * Renderiza sugerencias inline en los campos
   */
  renderInlineSuggestions() {
    console.log(`🎨 Rendering ${this.aiSuggestions.length} inline suggestions`);

    this.aiSuggestions.forEach(suggestion => {
      this.renderFieldSuggestion(suggestion);
    });
  }

  /**
   * Renderiza sugerencia para un campo específico
   */
  renderFieldSuggestion(suggestion) {
    const { field, field_label, current_value, suggested_value, confidence, reason } = suggestion;

    // Buscar el campo en el sidebar
    const fieldElements = document.querySelectorAll('.field-item, .detail-section');
    let fieldContainer = null;

    for (const el of fieldElements) {
      const label = el.querySelector('.field-label, .detail-label');
      if (label && label.textContent.includes(field_label)) {
        fieldContainer = el;
        break;
      }
    }

    if (!fieldContainer) {
      console.warn(`Field container not found for: ${field_label}`);
      return;
    }

    // Agregar clase para highlighting
    fieldContainer.classList.add('has-ai-suggestion');

    // Crear sugerencia inline
    const suggestionEl = document.createElement('div');
    suggestionEl.className = 'inline-ai-suggestion';
    suggestionEl.innerHTML = `
      <div class="suggestion-header">
        <span class="suggestion-icon">🤖</span>
        <span class="suggestion-label">AI Suggestion</span>
        <span class="confidence-badge" style="background: ${this.getConfidenceColor(confidence)}">
          ${Math.round(confidence * 100)}% confident
        </span>
      </div>
      <div class="suggestion-value">
        <strong>Suggested:</strong> ${this.formatSuggestionValue(suggested_value)}
      </div>
      <div class="suggestion-reason">${reason}</div>
      <div class="suggestion-actions">
        <button class="btn-suggestion-apply" onclick="window.sidebarEditor.applySuggestion('${field}', ${JSON.stringify(suggested_value).replace(/'/g, "&#39;")})">
          ✓ Apply
        </button>
        <button class="btn-suggestion-dismiss" onclick="window.sidebarEditor.dismissSuggestion('${field}')">
          ✕ Dismiss
        </button>
      </div>
    `;

    // Insertar después del valor actual
    const valueEl = fieldContainer.querySelector('.field-value, .detail-value');
    if (valueEl) {
      valueEl.after(suggestionEl);
    } else {
      fieldContainer.appendChild(suggestionEl);
    }
  }

  /**
   * Aplica una sugerencia individual
   */
  async applySuggestion(field, suggestedValue) {
    console.log(`✓ Applying suggestion for ${field}:`, suggestedValue);

    try {
      // Preparar el valor según el tipo de campo
      const fieldUpdate = this.prepareFieldUpdate(field, suggestedValue);

      // Llamar al API para actualizar
      const response = await fetch(`/api/issues/${this.currentIssue}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fields: fieldUpdate })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`✅ Field ${field} updated successfully`);

      // Remover la sugerencia de la UI
      this.removeSuggestionUI(field);

      // Actualizar el valor en la UI
      this.updateFieldValue(field, suggestedValue);

      // Mostrar notificación de éxito
      this.showSuccessNotification(field);

    } catch (error) {
      console.error(`❌ Error applying suggestion for ${field}:`, error);
      alert(`Failed to update ${field}. Please try again.`);
    }
  }

  /**
   * Aplica todas las sugerencias de una vez
   */
  async applyAllSuggestions() {
    console.log(`🚀 Applying all ${this.aiSuggestions.length} suggestions`);

    const btn = document.querySelector('.ai-suggestions-banner button');
    if (btn) {
      btn.innerHTML = '⏳ Applying...';
      btn.disabled = true;
    }

    let successCount = 0;
    let failCount = 0;

    for (const suggestion of this.aiSuggestions) {
      try {
        await this.applySuggestion(suggestion.field, suggestion.suggested_value);
        successCount++;
      } catch (error) {
        console.error(`Failed to apply suggestion for ${suggestion.field}:`, error);
        failCount++;
      }
    }

    console.log(`✅ Applied ${successCount}/${this.aiSuggestions.length} suggestions`);

    // Remover el banner
    const banner = document.querySelector('.ai-suggestions-banner');
    if (banner) banner.remove();

    // Mostrar resultado
    alert(`Successfully applied ${successCount} of ${this.aiSuggestions.length} suggestions!`);

    // Recargar el sidebar
    if (window.openIssueDetails) {
      window.openIssueDetails(this.currentIssue);
    }
  }

  /**
   * Descarta una sugerencia
   */
  dismissSuggestion(field) {
    console.log(`✕ Dismissing suggestion for ${field}`);
    this.removeSuggestionUI(field);

    // Remover de la lista
    this.aiSuggestions = this.aiSuggestions.filter(s => s.field !== field);

    // Si no quedan sugerencias, remover el banner
    if (this.aiSuggestions.length === 0) {
      const banner = document.querySelector('.ai-suggestions-banner');
      if (banner) banner.remove();
    }
  }

  /**
   * Prepara el valor del campo para la actualización
   */
  prepareFieldUpdate(field, value) {
    const update = {};

    // Manejar diferentes tipos de campos
    if (field.startsWith('customfield_')) {
      // Custom fields como criticidad
      if (typeof value === 'string') {
        update[field] = { value: value };
      } else {
        update[field] = value;
      }
    } else if (field === 'priority') {
      update[field] = { name: value };
    } else if (field === 'assignee') {
      update[field] = { accountId: value };
    } else if (field === 'labels') {
      update[field] = Array.isArray(value) ? value : [value];
    } else if (field === 'components') {
      update[field] = Array.isArray(value) ? value.map(v => ({ name: v })) : [{ name: value }];
    } else {
      update[field] = value;
    }

    return update;
  }

  /**
   * Formatea el valor sugerido para mostrar
   */
  formatSuggestionValue(value) {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return value.name || value.value || JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Obtiene color según la confianza
   */
  getConfidenceColor(confidence) {
    if (confidence >= 0.9) return 'rgba(16,185,129,0.2)';
    if (confidence >= 0.7) return 'rgba(59,130,246,0.2)';
    return 'rgba(245,158,11,0.2)';
  }

  /**
   * Remueve la UI de sugerencia de un campo
   */
  removeSuggestionUI(field) {
    const fieldElements = document.querySelectorAll('.field-item, .detail-section');
    
    for (const el of fieldElements) {
      const suggestion = el.querySelector('.inline-ai-suggestion');
      if (suggestion) {
        const applyBtn = suggestion.querySelector('.btn-suggestion-apply');
        if (applyBtn && applyBtn.onclick && applyBtn.onclick.toString().includes(field)) {
          suggestion.remove();
          el.classList.remove('has-ai-suggestion');
          break;
        }
      }
    }
  }

  /**
   * Actualiza el valor del campo en la UI
   */
  updateFieldValue(field, newValue) {
    const fieldElements = document.querySelectorAll('.field-item, .detail-section');
    
    for (const el of fieldElements) {
      const label = el.querySelector('.field-label, .detail-label');
      if (label && label.textContent.includes(field)) {
        const valueEl = el.querySelector('.field-value, .detail-value');
        if (valueEl) {
          valueEl.textContent = this.formatSuggestionValue(newValue);
          valueEl.classList.add('field-updated');
          
          // Remover highlight después de 3 segundos
          setTimeout(() => valueEl.classList.remove('field-updated'), 3000);
        }
        break;
      }
    }
  }

  /**
   * Muestra notificación de éxito
   */
  showSuccessNotification(field) {
    // Usar el sistema de notificaciones si está disponible
    if (window.showNotification) {
      window.showNotification(`✅ ${field} updated successfully`, 'success');
    }
  }
}

// Inicializar globalmente
if (typeof window !== 'undefined') {
  window.sidebarEditor = new SidebarInlineEditor();
  console.log('✅ Sidebar Inline Editor initialized');
}
