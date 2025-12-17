// Deprecated: ML comment suggestions removed. Stubbed no-op implementation kept
// to avoid runtime errors if any legacy code references it.

if (typeof window !== 'undefined') {
  window.FlowingMVPCommentSuggestions = {
    init: () => console.log('ℹ️ [Deprecated] FlowingMVPCommentSuggestions.init() called - no-op'),
    showSuggestionsForTicket: (ticket) => console.log('ℹ️ [Deprecated] showSuggestionsForTicket called for', ticket),
    refreshSuggestions: () => console.log('ℹ️ [Deprecated] refreshSuggestions called - no-op')
  };
}

/**
 * Register with ThemeManager (with retry logic)
 */
registerWithThemeManager(retries = 3) {
  if (window.ThemeManager && window.ThemeManager.isInitialized) {
    window.ThemeManager.registerComponent(this, 'CommentSuggestions');
    console.log('✅ Comment Suggestions registered with ThemeManager');
  } else if (retries > 0) {
    // ThemeManager not ready yet, retry after a short delay
    console.log(`⏳ Waiting for ThemeManager... (${retries} retries left)`);
    setTimeout(() => this.registerWithThemeManager(retries - 1), 100);
  } else {
    // Fallback: Apply theme manually if ThemeManager not available after retries
    console.warn('⚠️ ThemeManager not available, using fallback theme detection');
    const isLight = document.body.classList.contains('theme-light');
    this.applyTheme(isLight ? 'light' : 'dark');
  }
}

/**
 * Apply theme to suggestions container
 */
applyTheme(theme) {
  if (!this.container) return;

  // Remove old theme classes
  this.container.classList.remove('theme-light', 'theme-dark');

  // Add new theme class
  this.container.classList.add(`theme-${theme}`);

  console.log(`✅ Applied theme-${theme} to Comment Suggestions`);
}

  /**
   * Show suggestions for a ticket
   */
  async showSuggestionsForTicket(ticket) {
  console.log('▶ Enter showSuggestionsForTicket', ticket);
  if (!this.container) {
    // If the UI panel wasn't initialized yet, try to inject it now into common places
    console.warn('🚨 Suggestions container not initialized - attempting on-the-fly injection');
    try {
      // Try right sidebar first
      const sidebar = document.getElementById('rightSidebar');
      if (sidebar) {
        this.injectSuggestionsPanel(sidebar);
      } else {
        // Try balanced view ML actions area
        const balancedActions = document.querySelector('#balancedContentContainer .right-column .comments-section');
        if (balancedActions) {
          // Create minimal container (mimic injectSuggestionsPanel structure)
          this.container = document.createElement('div');
          this.container.className = 'ml-comment-suggestions';
          this.container.innerHTML = `
              <div class="suggestions-header">
                <h3>
                  <i class="fas fa-robot"></i>
                  Sugerencias IA
                </h3>
                <button class="refresh-btn" title="Actualizar sugerencias">
                  <i class="fas fa-sync-alt"></i>
                </button>
              </div>
              <div class="suggestions-content">
                <div class="loading-state">
                  <i class="fas fa-spinner fa-spin"></i>
                  Esperando ticket...
                </div>
              </div>
            `;
          balancedActions.insertBefore(this.container, balancedActions.firstChild);
          const refreshBtn = this.container.querySelector('.refresh-btn');
          if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshSuggestions());
          this.registerWithThemeManager();
        } else {
          // Fallback: attach to document.body (visible floating panel)
          this.container = document.createElement('div');
          this.container.className = 'ml-comment-suggestions';
          this.container.style.position = 'fixed';
          this.container.style.right = '20px';
          this.container.style.bottom = '120px';
          this.container.style.zIndex = '1500';
          this.container.innerHTML = `
              <div class="suggestions-header">
                <h3>
                  <i class="fas fa-robot"></i>
                  Sugerencias IA
                </h3>
                <button class="refresh-btn" title="Actualizar sugerencias">
                  <i class="fas fa-sync-alt"></i>
                </button>
              </div>
              <div class="suggestions-content">
                <div class="loading-state">
                  <i class="fas fa-spinner fa-spin"></i>
                  Esperando ticket...
                </div>
              </div>
            `;
          document.body.appendChild(this.container);
          const refreshBtn = this.container.querySelector('.refresh-btn');
          if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshSuggestions());
          this.registerWithThemeManager();
        }
      }
    } catch (e) {
      console.warn('Could not auto-inject suggestions container:', e);
      return;
    }
  }

  const ticketKey = ticket.key || ticket.fields?.key || 'unknown';

  // Prevent concurrent calls for the same ticket
  if (this.isAnalyzing && this.currentTicket?.key === ticketKey) {
    console.log(`⏭️  Already analyzing ${ticketKey}, skipping duplicate call`);
    return;
  }

  this.currentTicket = ticket;
  const content = this.container.querySelector('.suggestions-content');

  console.log(`🎯 showSuggestionsForTicket called for: ${ticketKey}`);

  // If ticket lacks summary/description, try to fetch full details from server
  try {
    const hasSummary = ticket.summary || ticket.fields?.summary;
    const hasDescription = ticket.description || ticket.fields?.description;
    if (!hasSummary && !hasDescription) {
      console.log('🔎 Ticket incomplete, fetching full details from API for', ticketKey);
      try {
        const resp = await fetch(`/api/servicedesk/request/${encodeURIComponent(ticketKey)}`);
        if (resp.ok) {
          const apiData = await resp.json();
          const data = apiData.data || apiData;
          // Merge fetched data into ticket
          this.currentTicket = Object.assign({}, ticket, data, { fields: Object.assign({}, ticket.fields || {}, data.fields || {}) });
          ticket = this.currentTicket;
          console.log('✅ Fetched ticket details for', ticketKey);
        } else {
          console.warn('⚠️ Failed to fetch ticket details:', resp.status);
        }
      } catch (e) {
        console.warn('Could not fetch ticket details:', e);
      }
    }
  } catch (e) {
    console.warn('Error while attempting to enrich ticket before analysis:', e);
  }

  // Check cache first (with TTL validation)
  const cached = this.cachedSuggestions[ticketKey];
  const now = Date.now();
  if (cached && cached.suggestions && cached.suggestions.length > 0) {
    // Verificar si el caché aún es válido (3 horas)
    const cacheAge = now - cached.timestamp;
    if (cacheAge < this.CACHE_TTL) {
      const hoursLeft = Math.floor((this.CACHE_TTL - cacheAge) / (60 * 60 * 1000));
      const minutesLeft = Math.floor(((this.CACHE_TTL - cacheAge) % (60 * 60 * 1000)) / (60 * 1000));
      console.log(`✅ Using cached suggestions for ${ticketKey} (válido por ${hoursLeft}h ${minutesLeft}m)`);
      this.suggestions = cached.suggestions;
      this.renderSuggestions(cached.suggestions, content);
      return;
    } else {
      console.log(`⏰ Cache expired for ${ticketKey}, re-analyzing...`);
      // NO BORRAR el caché todavía - lo usaremos como respaldo si falla
      // delete this.cachedSuggestions[ticketKey];
    }
  }

  // Show analyzing state (pero solo si NO hay sugerencias previas que mostrar)
  this.isAnalyzing = true;

  // Verificar si tenemos sugerencias previas (caché válido, expirado, o en this.suggestions)
  const hasOldSuggestions = (cached?.suggestions?.length > 0) || (this.suggestions?.length > 0);
  console.log(`📦 hasOldSuggestions: ${hasOldSuggestions}, cached: ${cached?.suggestions?.length || 0}, this.suggestions: ${this.suggestions?.length || 0}`);

  if (!hasOldSuggestions) {
    // No hay sugerencias anteriores - mostrar estado de análisis limpio
    content.innerHTML = `
        <div class="analyzing-state">
          <i class="fas fa-brain"></i>
          <p><strong>Analizando ticket con IA...</strong></p>
          <small>Estamos procesando la información del ticket para generar sugerencias relevantes.</small>
          <div class="analyzing-loader">
            <div class="loader-bar"></div>
          </div>
        </div>
      `;
  } else {
    // Hay sugerencias anteriores - mantenerlas y solo mostrar indicador de actualización
    const suggestionsToKeep = cached?.suggestions || this.suggestions;
    this.renderSuggestions(suggestionsToKeep, content);

    const refreshIndicator = document.createElement('div');
    refreshIndicator.className = 'refresh-indicator';
    refreshIndicator.innerHTML = `
        <i class="fas fa-sync-alt fa-spin"></i>
        <span>Actualizando...</span>
      `;

    const header = this.container.querySelector('.suggestions-header');
    if (header) {
      header.style.position = 'relative';
      header.appendChild(refreshIndicator);
    }

    // Remover indicador después de completar
    setTimeout(() => {
      if (refreshIndicator.parentNode) refreshIndicator.remove();
    }, 30000); // Timeout de 30s
  }

  try {
    // Get suggestions from API (with AI analysis)
    console.log(`🔄 Fetching suggestions from API...`);
    const suggestions = await this.fetchSuggestionsWithAI(ticket);
    console.log(`✅ Got ${suggestions.length} suggestions from API`);
    this.suggestions = suggestions;

    // Cache the suggestions
    this.cachedSuggestions[ticketKey] = {
      suggestions: suggestions,
      timestamp: Date.now()
    };

    this.isAnalyzing = false;

    // Limpiar indicador de actualización si existe
    const refreshIndicator = this.container?.querySelector('.refresh-indicator');
    if (refreshIndicator) {
      refreshIndicator.remove();
    }

    if (suggestions.length === 0) {
      content.innerHTML = `
          <div class="no-info-state">
            <i class="fas fa-info-circle"></i>
            <p><strong>No tenemos información de este ticket</strong></p>
            <small>Estamos analizando la información actual con IA. Las sugerencias se guardarán automáticamente.</small>
          </div>
        `;
      return;
    }

    // Render suggestions
    this.renderSuggestions(suggestions, content);

  } catch (error) {
    console.error('Error fetching suggestions:', error);
    this.isAnalyzing = false;

    // Limpiar indicador de actualización si existe
    const refreshIndicator = this.container?.querySelector('.refresh-indicator');
    if (refreshIndicator) {
      refreshIndicator.remove();
    }

    // Intentar usar caché expirado como respaldo
    const expiredCache = this.cachedSuggestions[ticketKey];
    const hasCachedSuggestions = expiredCache && expiredCache.suggestions && expiredCache.suggestions.length > 0;

    // Si hay sugerencias en caché (incluso expiradas), mantenerlas
    if (hasCachedSuggestions || (this.suggestions && this.suggestions.length > 0)) {
      const suggestionsToShow = hasCachedSuggestions ? expiredCache.suggestions : this.suggestions;
      console.log('⚠️ Error al actualizar, manteniendo sugerencias anteriores');
      this.suggestions = suggestionsToShow;
      this.renderSuggestions(suggestionsToShow, content);

      // Mostrar warning arriba de las sugerencias
      const warningDiv = document.createElement('div');
      warningDiv.className = 'suggestions-warning';
      warningDiv.innerHTML = `
          <i class="fas fa-exclamation-circle"></i>
          <small>No se pudieron actualizar. Mostrando sugerencias anteriores.</small>
        `;
      content.insertBefore(warningDiv, content.firstChild);

      // Auto-ocultar warning después de 5 segundos
      setTimeout(() => {
        if (warningDiv.parentNode) {
          warningDiv.style.transition = 'opacity 0.3s';
          warningDiv.style.opacity = '0';
          setTimeout(() => warningDiv.remove(), 300);
        }
      }, 5000);
    } else {
      // Solo mostrar error si NO hay sugerencias previas de ningún tipo
      content.innerHTML = `
          <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error al generar sugerencias</p>
            <small>${error.message}</small>
            <small>💡 Tip: Verifica que Ollama esté ejecutándose: <code>ollama serve</code></small>
          </div>
        `;
    }
  }
}

/**
 * Called when user leaves the ticket (save cache if analyzing)
 */
onTicketLeave() {
  if (this.isAnalyzing && this.currentTicket) {
    const ticketKey = this.currentTicket.key || this.currentTicket.fields?.key;
    console.log('💾 Saving analysis progress for', ticketKey);
    // Cache is already saved in showSuggestionsForTicket
    // This is a placeholder for any cleanup needed
  }
}

/**
 * Get ALL comments from the ticket for full context analysis
 */
getAllComments() {
  const commentsList = document.getElementById('commentsList');
  if (!commentsList) return [];

  const commentElements = commentsList.querySelectorAll('.comment-item');
  const allComments = [];

  // Get ALL comments, not just last 3
  commentElements.forEach(comment => {
    const bodyElement = comment.querySelector('.comment-body');
    if (bodyElement) {
      const text = bodyElement.textContent.trim();
      if (text.length > 0) {
        allComments.push(text);
      }
    }
  });

  console.log(`📝 Analyzing ${allComments.length} comments for context`);
  return allComments;
}

  /**
   * Fetch suggestions from API with AI analysis
   */
  async fetchSuggestionsWithAI(ticket) {
  // Analyze ticket content with AI
  const summary = ticket.fields?.summary || ticket.summary || '';
  const description = ticket.fields?.description || ticket.description || '';
  const issueType = ticket.fields?.issuetype?.name || ticket.issueType || 'Unknown';
  const status = ticket.fields?.status?.name || ticket.status || 'Unknown';
  const priority = ticket.fields?.priority?.name || ticket.priority || 'Medium';

  // Get ALL comments to provide full context
  const allComments = this.getAllComments();

  // Add timeout to prevent hanging (35s max to match backend 30s + margin)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch('/api/ml/comments/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: summary,
        description: description,
        issue_type: issueType,
        status: status,
        priority: priority,
        all_comments: allComments, // TODOS los comentarios para análisis completo
        max_suggestions: 3  // Reducido de 5 a 3 para respuestas más rápidas
      }),
      signal: controller.signal
    });

    console.log('📤 [ML] POST /api/ml/comments/suggestions payload:', {
      summary: summary,
      description: description,
      issue_type: issueType,
      status: status,
      priority: priority,
      all_comments: allComments?.length || 0,
      max_suggestions: 3
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let text = '';
      try { text = await response.text(); } catch (e) { text = 'Unable to read response body'; }
      console.error('❌ [ML] /api/ml/comments/suggestions failed:', response.status, response.statusText, text);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.suggestions || [];

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('La generación de sugerencias tardó demasiado (>35s). Ollama puede estar sobrecargado.');
    }
    throw error;
  }
}

/**
 * Render suggestions in the UI
 */
renderSuggestions(suggestions, container) {
  console.log('🔧 renderSuggestions called, suggestions count:', suggestions?.length, 'container:', container);
  this.allSuggestions = suggestions;
  const displaySuggestions = suggestions.slice(0, this.displayedCount);
  const hasMore = suggestions.length > this.displayedCount;

  const html = displaySuggestions.map((sugg, index) => `
      <div class="suggestion-card" data-index="${index}">
        <div class="suggestion-header">
          <span class="suggestion-type ${sugg.type}">
            ${this.getTypeIcon(sugg.type)} ${this.getTypeLabel(sugg.type)}
          </span>
          <span class="suggestion-confidence">
            ${Math.round(sugg.confidence * 100)}%
          </span>
        </div>
        <div class="suggestion-text">
          ${this.escapeHtml(sugg.text)}
        </div>
        <div class="suggestion-actions">
          <button class="use-suggestion-btn" data-index="${index}" title="Pega el texto en el cuadro de comentarios">
            <i class="fas fa-paste"></i> Usar
          </button>
          <button class="copy-suggestion-btn" data-index="${index}" title="Copia al portapapeles">
            <i class="fas fa-copy"></i> Copiar
          </button>
        </div>
      </div>
    `).join('');

  // Add Show More button if there are more suggestions
  if (hasMore) {
    const remaining = suggestions.length - this.displayedCount;
    html += `
        <div class="show-more-container">
          <button class="show-more-btn">
            <i class="fas fa-chevron-down"></i>
            Mostrar más sugerencias (${remaining} adicionales)
          </button>
        </div>
      `;
  }

  container.innerHTML = html;
  console.log('✅ renderSuggestions injected HTML into container:', container);

  // Add event listener for Show More button
  const showMoreBtn = container.querySelector('.show-more-btn');
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', () => {
      this.displayedCount += 5;
      this.renderSuggestions(this.allSuggestions, container);
    });
  }

  // Add event listeners
  container.querySelectorAll('.use-suggestion-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      this.useSuggestion(index);
    });
  });

  container.querySelectorAll('.copy-suggestion-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      this.copySuggestion(index);
    });
  });
}

  /**
   * Use a suggestion (insert into comment box)
   */
  async useSuggestion(index) {
  const suggestion = this.suggestions[index];
  if (!suggestion) return;

  // Find comment textarea in right sidebar
  const commentBox = document.querySelector('#commentText, .comment-input textarea, #new-comment-text');
  if (commentBox) {
    // Insert text and scroll to comment area
    commentBox.value = suggestion.text;
    commentBox.focus();

    // Scroll to comment box smoothly
    commentBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Save to database
    await this.saveSuggestionToDb(suggestion, 'used');

    // Show feedback
    this.showFeedback('✅ Texto pegado en comentarios', 'success');
  } else {
    this.showFeedback('❌ No se encontró el cuadro de comentarios', 'error');
  }
}

  /**
   * Copy suggestion to clipboard
   */
  async copySuggestion(index) {
  const suggestion = this.suggestions[index];
  if (!suggestion) return;

  try {
    await navigator.clipboard.writeText(suggestion.text);

    // Save to database
    await this.saveSuggestionToDb(suggestion, 'copied');

    this.showFeedback('Copiado al portapapeles', 'success');
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    this.showFeedback('Error al copiar', 'error');
  }
}

  /**
   * Refresh suggestions for current ticket
   */
  async refreshSuggestions() {
  if (this.currentTicket) {
    await this.showSuggestionsForTicket(this.currentTicket);
  }
}

/**
 * Get icon for suggestion type
 */
getTypeIcon(type) {
  const icons = {
    'resolution': '✅',
    'action': '🔧',
    'diagnostic': '🔍'
  };
  return icons[type] || '💡';
}

/**
 * Get label for suggestion type
 */
getTypeLabel(type) {
  const labels = {
    'resolution': 'Resolución',
    'action': 'Acción',
    'diagnostic': 'Diagnóstico'
  };
  return labels[type] || 'Sugerencia';
}

  /**
   * Save suggestion to database
   */
  async saveSuggestionToDb(suggestion, action) {
  try {
    const ticketKey = this.currentTicket?.key || this.currentTicket?.fields?.key || 'unknown';

    await fetch('/api/ml/comments/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ticket_key: ticketKey,
        text: suggestion.text,
        type: suggestion.type,
        action: action
      })
    });

    console.log(`💾 Suggestion ${action} saved to database`);
  } catch (error) {
    console.error('Error saving suggestion to DB:', error);
    // Don't show error to user - this is background operation
  }
}

/**
 * Show feedback message
 */
showFeedback(message, type = 'info') {
  // Create toast notification
  const toast = document.createElement('div');
  toast.className = `feedback-toast ${type}`;
  toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      ${message}
    `;
  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove after 3s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Escape HTML to prevent XSS
 */
escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
}

// Global instance
window.commentSuggestionsUI = new CommentSuggestionsUI();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.commentSuggestionsUI.init();
  });
} else {
  window.commentSuggestionsUI.init();
}

// Hook into ticket selection (with debouncing to prevent multiple calls)
let ticketSelectedDebounce = null;
let lastProcessedTicket = null;

document.addEventListener('ticketSelected', (event) => {
  const ticket = event.detail?.ticket;
  const ticketKey = ticket?.key || ticket?.fields?.key;

  if (!ticket || !window.commentSuggestionsUI) {
    console.log('🚫 ticketSelected event ignored - no ticket or UI not ready');
    return;
  }

  // If container not yet initialized, try to inject into balanced view on-the-fly
  if (!window.commentSuggestionsUI.container) {
    try {
      const balancedActions = document.querySelector('#balancedContentContainer .right-column .comments-section');
      if (balancedActions) {
        console.log('ℹ️ Injecting suggestions panel into balanced view on ticketSelected');
        const inst = window.commentSuggestionsUI;
        inst.container = document.createElement('div');
        inst.container.className = 'ml-comment-suggestions';
        inst.container.innerHTML = `
          <div class="suggestions-header">
            <h3>
              <i class="fas fa-robot"></i>
              Sugerencias IA
            </h3>
            <button class="refresh-btn" title="Actualizar sugerencias">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
          <div class="suggestions-content">
            <div class="loading-state">
              <i class="fas fa-spinner fa-spin"></i>
              Esperando ticket...
            </div>
          </div>
        `;
        balancedActions.insertBefore(inst.container, balancedActions.firstChild);
        const refreshBtn = inst.container.querySelector('.refresh-btn');
        refreshBtn.addEventListener('click', () => inst.refreshSuggestions());
        inst.registerWithThemeManager();
      }
      else {
        // Last-resort: attach to document body so suggestions are available even if balanced view not rendered
        console.log('⚠️ Balanced actions not found — injecting suggestions panel into document.body as fallback');
        const inst = window.commentSuggestionsUI;
        inst.container = document.createElement('div');
        inst.container.className = 'ml-comment-suggestions';
        inst.container.style.position = 'fixed';
        inst.container.style.right = '20px';
        inst.container.style.bottom = '120px';
        inst.container.style.zIndex = '1500';
        inst.container.innerHTML = `
          <div class="suggestions-header">
            <h3>
              <i class="fas fa-robot"></i>
              Sugerencias IA
            </h3>
            <button class="refresh-btn" title="Actualizar sugerencias">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
          <div class="suggestions-content">
            <div class="loading-state">
              <i class="fas fa-spinner fa-spin"></i>
              Esperando ticket...
            </div>
          </div>
        `;
        document.body.appendChild(inst.container);
        const refreshBtn2 = inst.container.querySelector('.refresh-btn');
        refreshBtn2.addEventListener('click', () => inst.refreshSuggestions());
        inst.registerWithThemeManager();
      }
    } catch (e) {
      console.warn('Could not inject suggestions panel on ticketSelected:', e);
    }
  }

  console.log(`📨 ticketSelected event received for: ${ticketKey}`);

  // Prevent processing same ticket multiple times in quick succession
  if (lastProcessedTicket === ticketKey && ticketSelectedDebounce) {
    console.log(`⏭️  Skipping duplicate ticketSelected for ${ticketKey}`);
    clearTimeout(ticketSelectedDebounce);
  }

  // Debounce to prevent rapid-fire calls
  ticketSelectedDebounce = setTimeout(() => {
    console.log(`✅ Processing ticketSelected for ${ticketKey}`);
    lastProcessedTicket = ticketKey;
    window.commentSuggestionsUI.showSuggestionsForTicket(ticket);

    // Clear last processed after 2 seconds (allow re-fetch if user closes and reopens same ticket)
    setTimeout(() => {
      if (lastProcessedTicket === ticketKey) {
        lastProcessedTicket = null;
      }
    }, 2000);
  }, 300); // 300ms debounce
});
