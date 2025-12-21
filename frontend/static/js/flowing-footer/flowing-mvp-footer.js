// Footer principal de Flowing MVP

// === Helpers globales (solo acceso, no lógica de UI) ===
const attachMentionsAutocomplete = (...args) => window.attachMentionsAutocomplete?.apply(this, args);
const _stripHTML = (...args) => window.stripHTML?.apply(this, args);
const formatMessage = (...args) => window.formatMessage?.apply(this, args);
const buildEssentialFieldsHTML = (...args) => window.buildEssentialFieldsHTML?.apply(this, args);
const fetchMappingIfNeeded = (...args) => window.fetchMappingIfNeeded?.apply(this, args);
const loadCommentsForBalancedView = (...args) => window.loadCommentsForBalancedView?.apply(this, args);
const adjustCommentsHeight = (...args) => window.adjustCommentsHeight?.apply(this, args);
const formatCommentTime = (...args) => window.formatCommentTime?.apply(this, args);
const ensureCommentsModule = (...args) => window.ensureCommentsModule?.apply(this, args);

// === Clase principal completa y robusta ===
class FlowingFooter {
  constructor() {
    this.footer = document.getElementById('flowingFooter');
    this.toggleBtn = document.getElementById('footerToggleBtn');
    this.messagesContainer = document.getElementById('footerMessages');
    this.input = document.getElementById('footerInput');
    this.header = document.getElementById('footerHeader');
    this.suggestionElement = document.getElementById('flowingSuggestion');
    this.balancedView = document.getElementById('balancedContentContainer');
    this.chatView = document.getElementById('chatViewContainer');
    this.isExpanded = false;
    this.activeView = 'chat';
    this.context = {};
    this._suggestionInterval = null;
    this.init();
  }

  init() {
    this.updateViewVisibility();
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }
    // Sugerencias automáticas
    if (this.suggestionElement) {
      this.resumeSuggestionRotation();
      this.suggestionElement.addEventListener('mouseenter', () => this.pauseSuggestionRotation());
      this.suggestionElement.addEventListener('mouseleave', () => this.resumeSuggestionRotation());
    }
    // Input de mensajes (si existe)
    if (this.input) {
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
    // Listeners para helpers globales (si existen)
    if (typeof attachMentionsAutocomplete === 'function' && this.input) {
      attachMentionsAutocomplete(this.input);
    }
    // Otros listeners custom: focus, blur, etc.
    if (this.input) {
      this.input.addEventListener('focus', () => this.footer?.classList.add('input-focused'));
      this.input.addEventListener('blur', () => this.footer?.classList.remove('input-focused'));
    }
  }

  sendMessage() {
    if (!this.input || !this.messagesContainer) return;
    const text = this.input.value.trim();
    if (!text) return;
    // Formatear mensaje si hay helper
    let formatted = text;
    if (typeof formatMessage === 'function') {
      formatted = formatMessage(text);
    }
    const msgDiv = document.createElement('div');
    msgDiv.className = 'footer-message';
    msgDiv.innerHTML = `<span class="user">Tú:</span> <span class="msg">${formatted}</span>`;
    this.messagesContainer.appendChild(msgDiv);
    this.input.value = '';
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    // Evento custom para integración externa
    this.footer?.dispatchEvent(new CustomEvent('footer:messageSent', { detail: { text: formatted } }));
  }

  setActiveView(view) {
    if (!this.isExpanded && view !== 'collapsed') this.expand();
    this.activeView = view;
    this.updateViewVisibility();
  }
  switchToChatView() { this.setActiveView('chat'); }
  switchToBalancedView(issueKey) {
    this.setActiveView('balanced');
    this.loadTicketIntoBalancedView(issueKey);
    this.context.selectedIssue = issueKey;
    this.updateContextBadge();
    if (this.suggestionElement) {
      this.suggestionElement.textContent = `${issueKey} - Viewing details`;
      this.pauseSuggestionRotation();
    }
  }

  updateViewVisibility() {
    if (this.header) this.header.style.display = '';
    if (!this.isExpanded || this.activeView === 'collapsed') {
      if (this.chatView) this.chatView.style.display = 'none';
      if (this.balancedView) this.balancedView.style.display = 'none';
      if (this.input) this.input.style.display = 'none';
      if (this.messagesContainer) this.messagesContainer.style.display = 'none';
      if (this.suggestionElement) this.suggestionElement.style.display = '';
      return;
    }
    if (this.activeView === 'chat') {
      if (this.chatView) this.chatView.style.display = '';
      if (this.input) this.input.style.display = '';
      if (this.messagesContainer) this.messagesContainer.style.display = '';
      if (this.balancedView) this.balancedView.style.display = 'none';
      if (this.suggestionElement) this.suggestionElement.style.display = '';
      return;
    }
    if (this.activeView === 'balanced') {
      if (this.balancedView) this.balancedView.style.display = '';
      if (this.chatView) this.chatView.style.display = 'none';
      if (this.input) this.input.style.display = 'none';
      if (this.messagesContainer) this.messagesContainer.style.display = 'none';
      if (this.suggestionElement) this.suggestionElement.style.display = 'none';
      return;
    }
  }

  expand() {
    this.footer?.classList.remove('collapsed');
    this.isExpanded = true;
    if (!this.activeView || this.activeView === 'collapsed') {
      this.activeView = 'chat';
    }
    this.updateViewVisibility();
    this.footer?.dispatchEvent(new CustomEvent('footer:expanded'));
  }
  collapse() {
    this.footer?.classList.add('collapsed');
    this.isExpanded = false;
    this.activeView = 'collapsed';
    this.updateViewVisibility();
    this.footer?.dispatchEvent(new CustomEvent('footer:collapsed'));
  }
  toggle() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  // === Métodos utilitarios y lógica completa restaurada ===
  updateContext(context = {}) {
    this.context = { ...this.context, ...context };
    this.updateContextBadge();
  }

  updateContextBadge() {
    if (!this.header) return;
    let badge = this.header.querySelector('.context-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'context-badge';
      this.header.appendChild(badge);
    }
    badge.textContent = this.context.selectedIssue ? `Ticket: ${this.context.selectedIssue}` : '';
    badge.style.display = this.context.selectedIssue ? '' : 'none';
  }

  loadTicketIntoBalancedView(issueKey) {
    if (!this.balancedView) return;
    // Limpia y carga datos del ticket
    this.balancedView.innerHTML = '<div class="loading">Cargando detalles...</div>';
    // Simulación: fetchMappingIfNeeded, buildEssentialFieldsHTML, loadCommentsForBalancedView
    if (typeof fetchMappingIfNeeded === 'function') fetchMappingIfNeeded(issueKey);
    if (typeof buildEssentialFieldsHTML === 'function') {
      const html = buildEssentialFieldsHTML(issueKey);
      if (html) this.balancedView.innerHTML = html;
    }
    if (typeof loadCommentsForBalancedView === 'function') loadCommentsForBalancedView(issueKey, this.balancedView);
    if (typeof adjustCommentsHeight === 'function') adjustCommentsHeight(this.balancedView);
  }

  pauseSuggestionRotation() {
    if (this._suggestionInterval) {
      clearInterval(this._suggestionInterval);
      this._suggestionInterval = null;
    }
  }
  resumeSuggestionRotation() {
    if (!this.suggestionElement) return;
    this.pauseSuggestionRotation();
    const suggestions = [
      '¿Sabías que puedes filtrar por estado?',
      'Haz clic en un ticket para ver detalles.',
      'Usa el chat para colaborar con tu equipo.',
      '¡Prueba la vista balanceada para análisis!',
    ];
    let idx = 0;
    this._suggestionInterval = setInterval(() => {
      this.suggestionElement.textContent = suggestions[idx % suggestions.length];
      idx++;
    }, 6000);
  }

  // === API pública ===
  public_expand = () => this.expand();
  public_collapse = () => this.collapse();
  public_switchToChatView = () => this.switchToChatView();
  public_switchToBalancedView = (issueKey) => this.switchToBalancedView(issueKey);
  public_updateContext = (context) => this.updateContext(context);
  public_resumeSuggestionRotation = () => this.resumeSuggestionRotation();
  public_pauseSuggestionRotation = () => this.pauseSuggestionRotation();
  // ...otros métodos públicos según necesidad...
}

/**
 * Instancia global del footer para pruebas y acceso desde consola.
 * Métodos públicos:
 *   _flowingFooter.public_expand()
 *   _flowingFooter.public_collapse()
 *   _flowingFooter.public_switchToChatView()
 *   _flowingFooter.public_switchToBalancedView(issueKey)
 *   _flowingFooter.public_updateContext({selectedIssue: 'KEY'})
 *   _flowingFooter.public_resumeSuggestionRotation()
 *   _flowingFooter.public_pauseSuggestionRotation()
 */
window._flowingFooter = new FlowingFooter();
