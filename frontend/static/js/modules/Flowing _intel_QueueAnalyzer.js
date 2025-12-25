/**
 * AI Queue Analyzer Module
 * Analiza todos los tickets de la cola actual y muestra solo los que necesitan mejoras
 * Similar a Atlassian Intelligence
 */

class AIQueueAnalyzer {
  constructor() {
    console.log('🧠 Initializing AIQueueAnalyzer...');
    this.modal = null;
    this.results = null;
    this.selectedUpdates = new Map(); // Map<issueKey, Set<fieldName>>
    this.init();
  }

  init() {
    console.log('🔗 Setting up AIQueueAnalyzer event listeners...');
    this.attachButton();
    console.log('✅ AIQueueAnalyzer initialized successfully');
  }

  attachButton() {
    // Try primary and known fallback buttons
    const primaryBtn = document.getElementById('mlAnalyzeBtn');
    const fallbackBtn = document.getElementById('aiAnalyzeBtn');
    const quickActionBtn = document.getElementById('quickActionBtn');

    const btn = primaryBtn || fallbackBtn || quickActionBtn;
    if (btn) {
      console.log(`✅ Found analysis button (${btn.id})`);
      btn.addEventListener('click', () => {
        console.log(`🖱️ ${btn.id} clicked`);
        this.analyze();
      });
    } else {
      console.warn('⚠️ No analysis button found (expected mlAnalyzeBtn / aiAnalyzeBtn / quickActionBtn)');
    }
  }

  async analyze() {
    // Require desk/queue selection
    if (!window.state || !window.state.currentDesk || !window.state.currentQueue) {
      alert('Por favor selecciona un Service Desk y una Cola primero');
      console.error('❌ Missing desk or queue:', { desk: window.state?.currentDesk, queue: window.state?.currentQueue });
      return;
    }

    console.log('🧠 Starting ML analysis:', { desk: window.state.currentDesk, queue: window.state.currentQueue });

    const cacheKey = `ml_analysis_${window.state.currentDesk}_${window.state.currentQueue}`;

    this.showModal();

    // 🚀 LEVEL 1: Check memory cache (INSTANT - <1ms)
    if (window.mlAnalysisCache && window.mlAnalysisCache[cacheKey]) {
      const cached = window.mlAnalysisCache[cacheKey];
      const age = Date.now() - cached.timestamp;
      const maxAge = window.state?.issues?.length >= 50 ? 3 * 60 * 60 * 1000 : 15 * 60 * 1000;

      if (age < maxAge) {
        console.log(`💨 Using memory cache (${(age / 1000).toFixed(0)}s old) - INSTANT LOAD`);
        this.results = cached.data;
        this.renderResults(this.results);
        this.showCacheIndicator('memory', age);
        return;
      }
    }

    // 🏃 LEVEL 2: Check LocalStorage (FAST - <10ms)
    const localCached = window.CacheManager?.get(cacheKey);
    if (localCached) {
      console.log('💾 Using LocalStorage cache - FAST LOAD');

      // Store in memory for next time
      window.mlAnalysisCache = window.mlAnalysisCache || {};
      window.mlAnalysisCache[cacheKey] = {
        data: localCached,
        timestamp: Date.now()
      };

      this.results = localCached;
      this.renderResults(this.results);
      this.showCacheIndicator('localStorage', 0);
      return;
    }

    // 📡 LEVEL 3: Fetch from backend (NETWORK - ~500ms)
    console.log('📡 Fetching from backend...');
    this.showLoading();

    try {
      const body = {
        desk_id: window.state.currentDesk,
        queue_id: window.state.currentQueue
      };

      console.log('📤 Sending request to /api/ai/analyze-queue:', body);

      const response = await fetch('/api/ai/analyze-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ HTTP Error:', response.status, error);
        throw new Error(`HTTP ${response.status}`);
      }

      let data = await response.json();
      console.log('✅ AI Analysis Response:', data);

      // El decorador @json_response envuelve la respuesta en {success, data, timestamp}
      // Extraer los datos reales si están envueltos
      if (data.success && data.data) {
        console.log('📦 Unwrapping response from json_response decorator');
        data = data.data;
      }

      console.log('✅ Processed data:', data);
      console.log('📊 Response keys:', Object.keys(data));
      this.results = data;

      // Verificar si hay error en la respuesta
      if (data.error) {
        console.error('❌ API returned error:', data.error);
        this.showError(data.error);
        return;
      }

      // Store in ALL cache levels for next time
      const cacheKey = `ml_analysis_${window.state.currentDesk}_${window.state.currentQueue}`;

      // Memory cache (LEVEL 1)
      window.mlAnalysisCache = window.mlAnalysisCache || {};
      window.mlAnalysisCache[cacheKey] = {
        data: data,
        timestamp: Date.now()
      };

      // LocalStorage cache (LEVEL 2)
      const ttl = window.state?.issues?.length >= 50 ? 3 * 60 * 60 * 1000 : 15 * 60 * 1000;
      if (window.CacheManager) {
        window.CacheManager.set(cacheKey, data, ttl);
      }

      console.log(`💾 Cached ML analysis in memory + localStorage (TTL: ${(ttl / (60 * 60 * 1000)).toFixed(1)}h)`);
      this.showCacheIndicator('backend', 0);

      // Validar estructura de datos
      if (!data.suggestions || !Array.isArray(data.suggestions)) {
        console.error('❌ Invalid response structure:', data);
        console.error('   Expected suggestions to be array but got:', typeof data.suggestions);
        this.showError(`Respuesta inválida del servidor. suggestions=${typeof data.suggestions}. Ver consola.`);
        return;
      }

      if (data.issues_with_suggestions === 0) {
        console.log('✅ No suggestions needed for any tickets');
        this.showNoSuggestions(data.analyzed_count);
      } else {
        console.log(`✅ Found ${data.issues_with_suggestions} tickets with suggestions`);
        this.renderResults(data);
      }

    } catch (error) {
      console.error('❌ Analysis Error:', error);
      this.showError(error.message || 'Unknown error occurred');
    }
  }

  showModal() {
    let modal = document.getElementById('aiQueueModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'aiQueueModal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-container ai-queue-modal">
          <div class="modal-header">
            <div class="modal-title-section">
              <span class="modal-icon">🧠</span>
              <h2 class="modal-title">Sugerencias de ML para la cola</h2>
              <small style="color: #64748b; font-size: 12px; font-weight: normal; margin-left: 8px;">Machine Learning con patrones globales</small>
            </div>
            <div id="mlAnalysisCacheIndicator" style="display: none; align-items: center; gap: 8px; margin-left: auto; margin-right: 16px; font-size: 12px; color: #64748b;"></div>
            <button class="modal-close" onclick="window.aiQueueAnalyzer.closeModal()">×</button>
          </div>
          <div class="modal-body" id="aiQueueContent"></div>
          <div class="modal-footer" id="aiQueueFooter" style="display:none">
            <button class="btn-secondary" onclick="window.aiQueueAnalyzer.closeModal()">
              Cancelar
            </button>
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

        // Open ticket details (prefer orchestrator / canonical loader)
        if (typeof showTicketDetails === 'function') {
          showTicketDetails(issueKey);
        } else if (typeof window.loadIssueDetails === 'function') {
          window.loadIssueDetails(issueKey);
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
