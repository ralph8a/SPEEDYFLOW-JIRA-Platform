// Deprecated: AI Queue Analyzer removed. Provide a no-op stub to avoid errors.

if (typeof window !== 'undefined') {
  window.aiQueueAnalyzer = {
    analyze: () => alert('AI features are currently disabled in this deployment.'),
    init: () => console.log('ℹ️ [Deprecated] aiQueueAnalyzer.init() called - no-op'),
    closeModal: () => {},
    showModal: () => alert('AI features are disabled'),
    renderResults: () => {}
  };
}
            <button class="btn-primary" onclick="window.aiQueueAnalyzer.applySelected()">
              Aplicar cambios seleccionados
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      this.modal = modal;
    }
    modal.style.display = 'flex';
  }

  closeModal() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }

  showLoading() {
    const content = document.getElementById('aiQueueContent');
    content.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Analizando tickets de la cola...</p>
        <small style="color: #64748b; margin-top: 8px;">Usando patrones del caché global para mejores sugerencias</small>
      </div>
    `;
  }

  showNoSuggestions(analyzedCount) {
    const content = document.getElementById('aiQueueContent');
    content.innerHTML = `
      <div class="success-state">
        <div class="success-icon">✅</div>
        <h3>Todos los tickets están correctos</h3>
        <p>Se analizaron <strong>${analyzedCount}</strong> tickets de la cola y no se encontraron campos que necesiten actualizarse.</p>
        <small style="color: #64748b; margin-top: 12px;">💡 El análisis usa patrones aprendidos de todos los tickets sincronizados.</small>
      </div>
    `;
    document.getElementById('aiQueueFooter').style.display = 'none';
  }

  showError(message) {
    const content = document.getElementById('aiQueueContent');
    content.innerHTML = `
      <div class="error-state">
        <div class="error-icon">❌</div>
        <h3>Error al analizar</h3>
        <p>${message}</p>
      </div>
    `;
    document.getElementById('aiQueueFooter').style.display = 'none';
  }

  /**
   * Show cache indicator with refresh button
   * @param {string} source - Cache source: 'memory', 'localStorage', or 'backend'
   * @param {number} age - Cache age in milliseconds
   */
  showCacheIndicator(source, age) {
    const indicator = document.getElementById('mlAnalysisCacheIndicator');
    if (!indicator) return;

    const sourceIcons = {
      memory: '💨',
      localStorage: '💾',
      backend: '📡'
    };

    const sourceLabels = {
      memory: 'En memoria',
      localStorage: 'En caché local',
      backend: 'Del servidor'
    };

    const ageText = age > 0 ? ` • ${this.formatAge(age)} atrás` : '';

    indicator.innerHTML = `
      <span style="display: flex; align-items: center; gap: 6px;">
        ${sourceIcons[source]} ${sourceLabels[source]}${ageText}
      </span>
      <button 
        onclick="window.aiQueueAnalyzer.refreshAnalysis()" 
        style="padding: 4px 8px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-size: 11px; display: flex; align-items: center; gap: 4px; transition: all 0.2s;"
        onmouseover="this.style.background='#e2e8f0'" 
        onmouseout="this.style.background='#f1f5f9'"
        title="Actualizar análisis con datos recientes"
      >
        🔄 Actualizar
      </button>
    `;
    indicator.style.display = 'flex';
  }

  /**
   * Format cache age for display
   * @param {number} ms - Age in milliseconds
   * @returns {string} Formatted age string
   */
  formatAge(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  /**
   * Refresh analysis by clearing cache and re-analyzing
   */
  async refreshAnalysis() {
    const cacheKey = `ml_analysis_${window.state?.currentDesk}_${window.state?.currentQueue}`;

    // Clear all cache levels
    if (window.mlAnalysisCache) {
      delete window.mlAnalysisCache[cacheKey];
      console.log('🗑️ Cleared memory cache for ML analysis');
    }

    if (window.CacheManager) {
      window.CacheManager.remove(cacheKey);
      console.log('🗑️ Cleared LocalStorage cache for ML analysis');
    }

    // Re-analyze with fresh data
    console.log('🔄 Refreshing ML analysis with recent data...');
    await this.analyze();
  }

  renderResults(data) {
    const content = document.getElementById('aiQueueContent');

    let html = `
      <div class="ai-results-summary">
        <p>
          🎯 <strong>${data.issues_with_suggestions}</strong> de <strong>${data.analyzed_count}</strong> 
          tickets de la cola tienen campos que pueden mejorarse
        </p>
        <small style="color: #64748b; font-size: 12px;">Análisis basado en ${data.cache_size || 'múltiples'} tickets del caché global</small>
      </div>
      <div class="ai-results-list">
    `;

    data.suggestions.forEach(issue => {
      html += `
        <div class="ai-issue-card">
          <div class="ai-issue-header">
            <span class="ai-issue-key">${issue.issue_key}</span>
            <span class="ai-issue-summary">${issue.issue_summary}</span>
          </div>
          <div class="ai-suggestions-list">
      `;

      issue.suggestions.forEach((sug, idx) => {
        const fieldId = `${issue.issue_key}_${sug.field_name}`;
        html += `
          <div class="ai-suggestion-item">
            <input type="checkbox" 
                   id="${fieldId}" 
                   data-issue="${issue.issue_key}"
                   data-field="${sug.field}"
                   data-value="${JSON.stringify(sug.suggested_value).replace(/"/g, '&quot;')}">
            <label for="${fieldId}">
              <div class="suggestion-header">
                <strong>${sug.field_label}</strong>
                <span class="confidence confidence-${this.getConfidenceClass(sug.confidence)}">
                  ${Math.round(sug.confidence * 100)}%
                </span>
              </div>
              <div class="suggestion-change">
                <span class="current-value">${sug.current_value || '(vacío)'}</span>
                <span class="arrow">→</span>
                <span class="suggested-value">${this.formatValue(sug.suggested_value)}</span>
              </div>
              <div class="suggestion-reason">${sug.reason}</div>
            </label>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `</div>`;
    content.innerHTML = html;
    document.getElementById('aiQueueFooter').style.display = 'flex';

    // Add click listeners to issue keys to open ticket details
    content.querySelectorAll('.ai-issue-key').forEach(keyElement => {
      keyElement.style.cursor = 'pointer';
      keyElement.addEventListener('click', (e) => {
        e.stopPropagation();
        const issueKey = keyElement.textContent.trim();
        console.log('🎯 Opening ticket from AI recommendations:', issueKey);

        // Close AI modal
        this.close();

        // Open ticket details
        if (typeof showTicketDetails === 'function') {
          showTicketDetails(issueKey);
        } else if (typeof openIssueDetails === 'function') {
          openIssueDetails(issueKey);
        } else if (window.rightSidebar) {
          window.rightSidebar.open(issueKey);
        }
      });
    });
  }

  getConfidenceClass(confidence) {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  formatValue(value) {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      // Handle JIRA field objects like {"value": "Crítico"} or {"name": "High"}
      if (value.value) return value.value;
      if (value.name) return value.name;
      if (value.displayName) return value.displayName;
      return JSON.stringify(value);
    }
    return value;
  }

  async applySelected() {
    const checkboxes = document.querySelectorAll('#aiQueueContent input[type="checkbox"]:checked');

    if (checkboxes.length === 0) {
      alert('Selecciona al menos un campo para actualizar');
      return;
    }

    const updates = {};
    checkboxes.forEach(cb => {
      const issueKey = cb.dataset.issue;
      const field = cb.dataset.field;
      const value = JSON.parse(cb.dataset.value);

      console.log(`🔧 Preparing update for ${issueKey}.${field}:`, value);

      if (!updates[issueKey]) {
        updates[issueKey] = { fields: {} };
      }
      updates[issueKey].fields[field] = value;
    });

    console.log('📤 Applying updates:', updates);

    // Show progress
    const footer = document.getElementById('aiQueueFooter');
    const originalFooter = footer.innerHTML;
    footer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div class="spinner"></div>
        <span>Aplicando cambios...</span>
      </div>
    `;

    // Aplicar updates
    let success = 0;
    let errors = 0;
    const errorDetails = [];

    for (const [issueKey, data] of Object.entries(updates)) {
      try {
        console.log(`🔄 Updating ${issueKey} with:`, data);

        const response = await fetch(`/api/issues/${issueKey}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Updated ${issueKey}:`, result);
          success++;
        } else {
          const errorText = await response.text();
          console.error(`❌ Failed to update ${issueKey}:`, response.status, errorText);
          errors++;
          errorDetails.push(`${issueKey}: ${response.status} ${errorText.substring(0, 100)}`);
        }
      } catch (error) {
        console.error(`❌ Error updating ${issueKey}:`, error);
        errors++;
        errorDetails.push(`${issueKey}: ${error.message}`);
      }
    }

    // Show results
    let message = `✅ ${success} tickets actualizados correctamente`;
    if (errors > 0) {
      message += `\n\n❌ ${errors} errores:\n${errorDetails.join('\n')}`;
    }

    alert(message);
    this.closeModal();

    // Refresh issues
    if (window.loadIssues && window.state && window.state.currentQueue) {
      console.log('🔄 Refreshing issues...');
      await window.loadIssues(window.state.currentQueue);
    }
  }
}

// Initialize
if (typeof window !== 'undefined') {
  window.aiQueueAnalyzer = new AIQueueAnalyzer();
  console.log('✅ AI Queue Analyzer initialized');
}
