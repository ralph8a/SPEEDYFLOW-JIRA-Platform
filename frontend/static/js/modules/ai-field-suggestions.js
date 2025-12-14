// ai-field-suggestions removed — placeholder file. No-op. Delete if you want it gone entirely.
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

// ai-field-suggestions: module removed; no global initializer to avoid creating globals.
