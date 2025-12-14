// sidebar-inline-editor removed — placeholder file. No-op.
// If you want this file removed from the repo entirely, delete it.
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

      // Actualizar el modal de ML si está abierto
      this.refreshMLAnalysisModal();

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

    // Actualizar el modal de ML si está abierto
    this.refreshMLAnalysisModal();
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

  /**
   * Actualiza el modal de ML analysis después de aplicar cambios
   */
  refreshMLAnalysisModal() {
    console.log('🔄 Refreshing ML analysis modal...');
    
    // Si el modal de Smart Functions está abierto, recalcular
    if (window.smartFunctionsModal && window.smartFunctionsModal.isOpen) {
      console.log('📊 Recalculating ML analysis stats');
      
      // Disparar evento personalizado para actualizar
      const event = new CustomEvent('mlAnalysisUpdate', {
        detail: { issueKey: this.currentIssue }
      });
      document.dispatchEvent(event);
    }
  }
}

// No initialization — module removed
