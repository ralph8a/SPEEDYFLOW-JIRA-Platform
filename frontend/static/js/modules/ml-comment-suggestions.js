/**
 * ML Comment Suggestions Module
 * Shows AI-powered comment suggestions in the ticket sidebar
 */

class CommentSuggestionsUI {
  constructor() {
    this.container = null;
    this.currentTicket = null;
    this.suggestions = [];
    this.allSuggestions = []; // All available suggestions
    this.displayedCount = 5; // Number currently displayed
    this.cachedSuggestions = {}; // Cache: { ticketKey: { suggestions: [], timestamp: Date } }
    this.isAnalyzing = false;
    this.CACHE_TTL = 3 * 60 * 60 * 1000; // 3 horas en milisegundos
  }

  /**
   * Initialize the suggestions UI in the sidebar
   */
  init() {
    console.log('🤖 Initializing Comment Suggestions UI...');
    
    // Wait for sidebar to be ready
    this.waitForSidebar();
  }

  /**
   * Wait for right sidebar element to be available
   */
  waitForSidebar() {
    const checkSidebar = setInterval(() => {
      const sidebar = document.getElementById('rightSidebar');
      if (sidebar) {
        clearInterval(checkSidebar);
        // Wait for sidebar to actually open with content
        this.observeSidebarOpen(sidebar);
      }
    }, 500);
  }

  /**
   * Observe when sidebar opens and inject panel
   */
  observeSidebarOpen(sidebar) {
    // Check when sidebar opens via MutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          if (sidebar.style.display === 'flex' && !this.container) {
            this.injectSuggestionsPanel(sidebar);
          }
        }
      });
    });

    observer.observe(sidebar, { attributes: true });
  }

  /**
   * Inject the suggestions panel into the right sidebar
   */
  injectSuggestionsPanel(sidebar) {
    // Create suggestions container
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

    // Find attachments section and insert after it in the left column
    const attachmentsSection = sidebar.querySelector('#attachmentsSection');
    if (attachmentsSection) {
      // Insert after attachments section in left column
      attachmentsSection.parentNode.insertBefore(this.container, attachmentsSection.nextSibling);
    } else {
      // Fallback: find detail-group-all-fields and insert after
      const ticketInfoSection = sidebar.querySelector('.detail-group-all-fields');
      if (ticketInfoSection) {
        ticketInfoSection.parentNode.insertBefore(this.container, ticketInfoSection.nextSibling);
      } else {
        console.warn('Could not find proper injection point for suggestions');
      }
    }

    // Add event listeners
    const refreshBtn = this.container.querySelector('.refresh-btn');
    refreshBtn.addEventListener('click', () => this.refreshSuggestions());

    // Register with ThemeManager for automatic theme updates
    this.registerWithThemeManager();

    console.log('✅ Comment Suggestions panel injected into right sidebar after ticket info');
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
    if (!this.container) {
      console.warn('Suggestions container not initialized');
      return;
    }

    this.currentTicket = ticket;
    const content = this.container.querySelector('.suggestions-content');
    const ticketKey = ticket.key || ticket.fields?.key || 'unknown';

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
        delete this.cachedSuggestions[ticketKey];
      }
    }

    // Show analyzing state
    this.isAnalyzing = true;
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

    try {
      // Get suggestions from API (with AI analysis)
      const suggestions = await this.fetchSuggestionsWithAI(ticket);
      this.suggestions = suggestions;

      // Cache the suggestions
      this.cachedSuggestions[ticketKey] = {
        suggestions: suggestions,
        timestamp: Date.now()
      };

      this.isAnalyzing = false;

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
      
      // Si ya hay sugerencias en caché, mantenerlas y solo mostrar warning
      if (this.suggestions && this.suggestions.length > 0) {
        console.log('⚠️ Error al actualizar, manteniendo sugerencias anteriores');
        this.renderSuggestions(this.suggestions, content);
        
        // Mostrar warning en lugar de error completo
        const warningDiv = document.createElement('div');
        warningDiv.className = 'suggestions-warning';
        warningDiv.innerHTML = `
          <i class="fas fa-exclamation-circle"></i>
          <small>No se pudieron actualizar las sugerencias. Mostrando últimas disponibles.</small>
        `;
        content.insertBefore(warningDiv, content.firstChild);
      } else {
        // Solo mostrar error si no hay sugerencias previas
        content.innerHTML = `
          <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error al generar sugerencias</p>
            <small>${error.message}</small>
            <small style="display: block; margin-top: 8px; color: #f59e0b;">💡 Tip: Si ves mensaje de Ollama, verifica que esté ejecutándose: <code>ollama serve</code></small>
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

    // Add timeout to prevent hanging (25s max to match backend 20s + margin)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    
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
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.suggestions || [];
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('La generación de sugerencias tardó demasiado (>25s). Ollama puede estar sobrecargado.');
      }
      throw error;
    }
  }

  /**
   * Render suggestions in the UI
   */
  renderSuggestions(suggestions, container) {
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

// Hook into ticket selection
document.addEventListener('ticketSelected', (event) => {
  const ticket = event.detail?.ticket;
  if (ticket && window.commentSuggestionsUI) {
    window.commentSuggestionsUI.showSuggestionsForTicket(ticket);
  }
});
