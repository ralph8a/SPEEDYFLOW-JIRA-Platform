/**
 * FLOWING MVP FOOTER
 * Collapsible chat assistant with context awareness
 */

class AICopilot {
  constructor() {
    this.footer = null;
    this.toggleBtn = null;
    this.closeBtn = null;
    this.messagesContainer = null;
    this.input = null;
    this.sendBtn = null;
    this.contextBadge = null;
    this.suggestionElement = null;
    this.isExpanded = false;
    this.isLoading = false;
    this.context = {
      currentDesk: null,
      currentQueue: null,
      selectedIssue: null,
      viewMode: 'kanban'
    };
    this.suggestions = [];
    this.currentSuggestionIndex = 0;
    this.suggestionInterval = null;
    this.thinkingInterval = null;
    this.thinkingIndex = 0;
    this.thinkingThoughts = [
      'Pensando en un buen café de Veracruz...',
      'Soñando con volovanes y tamalitos...',
      'Repasando los logs entre sorbo y sorbo...',
      'Recordando el aroma del café del puerto...',
      'Imaginando que el servidor trae puesto el sombrero...',
      'Contando historias de deploys valientes...',
      'Masticando una idea y pidiendo más café...'
    ];
    
    this.init();
  }

  init() {
    console.log('🤖 Initializing Flowing MVP...');
    
    // Get DOM elements
    this.footer = document.getElementById('aiCopilotFooter');
    this.toggleBtn = document.getElementById('copilotToggleBtn');
    this.closeBtn = document.getElementById('copilotCloseBtn');
    this.messagesContainer = document.getElementById('copilotMessages');
    this.input = document.getElementById('copilotInput');
    this.sendBtn = document.getElementById('copilotSendBtn');
    this.contextBadge = document.getElementById('copilotContextBadge');
    this.suggestionElement = document.getElementById('copilotSuggestion');

    if (!this.footer) {
      console.error('❌ Flowing MVP footer not found');
      return;
    }

    this.attachEventListeners();
    this.updateContext();
    this.setupContextWatcher();
    this.startSuggestionRotation();
    
    // Set initial padding
    this.adjustContentPadding(true); // Start collapsed
    
    console.log('✅ Flowing MVP ready');
  }

  attachEventListeners() {
    // Toggle button - Integrado con FlowingContext para sugerencias de IA
    this.toggleBtn?.addEventListener('click', () => {
      this.toggle();
      // Si FlowingContext está disponible, mostrar sugerencias contextuales
      if (window.FlowingContext && this.isExpanded) {
        this.showContextualSuggestions();
      }
    });
    
    // Close button
    this.closeBtn?.addEventListener('click', () => this.collapse());
    
    // Send button
    this.sendBtn?.addEventListener('click', () => this.sendMessage());
    
    // Input handling
    this.input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    this.input?.addEventListener('input', () => {
      this.input.style.height = 'auto';
      this.input.style.height = Math.min(this.input.scrollHeight, 120) + 'px';
    });
  }

  setupContextWatcher() {
    // Watch for changes in window.state (set by app.js)
    setInterval(() => {
      const oldContext = JSON.stringify(this.context);
      this.updateContext();
      const newContext = JSON.stringify(this.context);
      
      if (oldContext !== newContext) {
        console.log('🔄 Context updated:', this.context);
        this.analyzeSuggestions();
      }
    }, 1000);
  }

  analyzeSuggestions() {
    this.suggestions = [];
    
    // Get issues from cache
    const issues = window.app?.issuesCache 
      ? Array.from(window.app.issuesCache.values()) 
      : [];

    if (issues.length === 0) {
      this.suggestions.push({
        text: 'Select a queue to get started',
        type: 'info'
      });
      return;
    }

    // Analyze overdue tickets
    const now = new Date();
    const overdueTickets = issues.filter(issue => {
      const lastChange = new Date(issue.last_real_change || issue.updated || issue.created);
      const daysSince = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
      return daysSince >= 7;
    });

    if (overdueTickets.length > 0) {
      this.suggestions.push({
        text: `${SVGIcons.alert({size:14,className:'inline-icon'})} ${overdueTickets.length} ticket${overdueTickets.length > 1 ? 's' : ''} overdue (7+ days)`,
        type: 'warning'
      });
    }

    // Analyze critical/high priority tickets
    const urgentTickets = issues.filter(issue => 
      issue.severity === 'Critico' || issue.severity === 'Alto'
    );

    if (urgentTickets.length > 0) {
      this.suggestions.push({
        text: `${SVGIcons.xCircle({size:14,className:'inline-icon'})} ${urgentTickets.length} urgent ticket${urgentTickets.length > 1 ? 's' : ''} require attention`,
        type: 'critical'
      });
    }

    // Analyze unassigned tickets
    const unassignedTickets = issues.filter(issue => 
      !issue.assignee || issue.assignee === 'Unassigned' || issue.assignee === 'No assignee'
    );

    if (unassignedTickets.length > 0) {
      this.suggestions.push({
        text: `${SVGIcons.user({size:14,className:'inline-icon'})} ${unassignedTickets.length} unassigned ticket${unassignedTickets.length > 1 ? 's' : ''} in queue`,
        type: 'info'
      });
    }

    // Analyze about to breach (3+ days)
    const aboutToBreachTickets = issues.filter(issue => {
      const lastChange = new Date(issue.last_real_change || issue.updated || issue.created);
      const daysSince = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
      return daysSince >= 3 && daysSince < 7;
    });

    if (aboutToBreachTickets.length > 0) {
      this.suggestions.push({
        text: `${SVGIcons.clock({size:14,className:'inline-icon'})} ${aboutToBreachTickets.length} ticket${aboutToBreachTickets.length > 1 ? 's' : ''} approaching SLA breach`,
        type: 'warning'
      });
    }

    // All clear message
    if (this.suggestions.length === 0) {
      this.suggestions.push({
        text: `${SVGIcons.success({size:14,className:'inline-icon'})} All tickets are up to date!`,
        type: 'success'
      });
    }

    // Add general queue info
    this.suggestions.push({
      text: `${SVGIcons.chart({size:14,className:'inline-icon'})} ${issues.length} ticket${issues.length > 1 ? 's' : ''} in current queue`,
      type: 'info'
    });
  }

  startSuggestionRotation() {
    // Initial analysis
    this.analyzeSuggestions();
    this.updateSuggestion();

    // Rotate suggestions every 6 seconds (5s visible + 1s transition)
    this.suggestionInterval = setInterval(() => {
      this.updateSuggestion();
    }, 6000);
  }

  updateSuggestion() {
    if (!this.suggestionElement || this.suggestions.length === 0) return;

    // Fade out current suggestion
    this.suggestionElement.classList.remove('visible');
    
    // Wait for fade out, then update content
    setTimeout(() => {
      // Get current suggestion
      const suggestion = this.suggestions[this.currentSuggestionIndex];
      
      // Update HTML (suggestion.text may include SVG markup)
      this.suggestionElement.innerHTML = suggestion.text;
      
      // Remove all type classes
      this.suggestionElement.classList.remove(
        'suggestion-critical',
        'suggestion-warning',
        'suggestion-info',
        'suggestion-success'
      );
      
      // Add appropriate class
      this.suggestionElement.classList.add(`suggestion-${suggestion.type}`);

      // Move to next suggestion
      this.currentSuggestionIndex = (this.currentSuggestionIndex + 1) % this.suggestions.length;
      
      // Fade in new suggestion after a brief delay
      setTimeout(() => {
        this.suggestionElement.classList.add('visible');
      }, 50);
    }, 600); // Match CSS transition duration
  }

  updateContext() {
    // Get current context from app state
    this.context = {
      currentDesk: window.state?.currentDesk || null,
      currentQueue: window.state?.currentQueue || null,
      selectedIssue: window.state?.selectedIssue || null,
      viewMode: window.state?.viewMode || 'kanban',
      issuesCount: window.app?.issuesCache?.size || 0
    };

    this.updateContextBadge();
  }

  updateContextBadge() {
    if (!this.contextBadge) return;

    const icon = this.contextBadge.querySelector('.context-icon');
    const text = this.contextBadge.querySelector('.context-text');

    if (this.context.selectedIssue) {
      icon.textContent = '🎯';
      text.textContent = `Ticket: ${this.context.selectedIssue}`;
    } else if (this.context.currentQueue) {
      icon.textContent = '📋';
      text.textContent = `Queue: ${this.context.currentQueue} (${this.context.issuesCount} tickets)`;
    } else if (this.context.currentDesk) {
      icon.textContent = '🏢';
      text.textContent = `Desk: ${this.context.currentDesk}`;
    } else {
      icon.textContent = '📌';
      text.textContent = 'No context';
    }
  }

  toggle() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  expand() {
    this.footer?.classList.remove('collapsed');
    this.isExpanded = true;
    this.input?.focus();
    
    // Adjust content padding for expanded footer
    this.adjustContentPadding(false);
    
    console.log('🤖 Flowing MVP expanded');
  }

  collapse() {
    this.footer?.classList.add('collapsed');
    this.isExpanded = false;
    
    // Adjust content padding for collapsed footer
    this.adjustContentPadding(true);
    
    console.log('🤖 Flowing MVP collapsed');
  }

  adjustContentPadding(isCollapsed) {
    const kanbanView = document.getElementById('kanbanView');
    const boardWrapper = document.querySelector('.board-wrapper');
    const rightSidebar = document.getElementById('rightSidebar');
    
    const padding = isCollapsed ? '65px' : '70px';
    
    if (kanbanView) kanbanView.style.paddingBottom = padding;
    if (boardWrapper) boardWrapper.style.paddingBottom = padding;
    if (rightSidebar) rightSidebar.style.paddingBottom = padding;
  }

  async sendMessage() {
    if (this.isLoading) return;

    const message = this.input?.value.trim();
    if (!message) return;

    // Clear input
    this.input.value = '';
    this.input.style.height = 'auto';

    // Add user message
    this.addMessage('user', message);

    // Show loading
    this.isLoading = true;
    this.sendBtn.disabled = true;
    const loadingMsg = this.addMessage('assistant', '', true);

    // Start rotating Veracruzian "thinking" thoughts while loading
    if (loadingMsg) {
      const contentNode = loadingMsg.querySelector('.message-content');
      if (contentNode) {
        let idx = 0;
        contentNode.innerHTML = `<p><em>${this.thinkingThoughts[idx]}</em></p>`;
        this.thinkingInterval = setInterval(() => {
          idx = (idx + 1) % this.thinkingThoughts.length;
          contentNode.innerHTML = `<p><em>${this.thinkingThoughts[idx]}</em></p>`;
        }, 700);
      }
    }

    try {
      // Background intent detection: if user message implies docs extraction/ingest,
      // call the relevant endpoints in background without requiring slash-commands.
      const msgLower = message.toLowerCase();
      const intents = [];

      // detect endpoint extraction intents
      if (/\b(endpoint|endpoints|punto de entrada|puntos de entrada|api endpoints|extraer endpoints|extrae endpoints)\b/.test(msgLower)) {
        intents.push(fetch('/api/copilot/docs/extract-endpoints', {
          method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({})
        }).then(r => r.json()).then(j => ({type: 'endpoints', data: j})).catch(() => null));
      }

      // detect playbook extraction intents
      if (/\b(playbook|playbooks|procedimiento|procedimientos|extract playbooks|extraer playbooks|extrae playbooks)\b/.test(msgLower)) {
        intents.push(fetch('/api/copilot/docs/extract-playbooks', {
          method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({})
        }).then(r => r.json()).then(j => ({type: 'playbooks', data: j})).catch(() => null));
      }

      // detect SLA-related intents
      if (/\b(sla|breach|breached|incumpl|vencim|deadline|tiempo restante|riesgo|brecha|plazo|a punto de)\b/.test(msgLower)) {
        if (this.context.selectedIssue) {
          const issue = this.context.selectedIssue;
          intents.push(fetch(`/api/ticket-sla/${encodeURIComponent(issue)}`, { method: 'GET' })
            .then(r => r.json()).then(j => ({ type: 'sla_issue', data: j, issue })).catch(() => null));
        } else {
          intents.push(fetch('/api/sla/health', { method: 'GET' })
            .then(r => r.json()).then(j => ({ type: 'sla_health', data: j })).catch(() => null));
        }
      }

      // detect user-related intents (who, usuarios, asignar)
      if (/\b(usuario|usuarios|user|who|quién|quien|asignado|asignar|buscar usuario|find user)\b/.test(msgLower)) {
        const q = encodeURIComponent(message);
        intents.push(fetch(`/api/users?query=${q}`, { method: 'GET' })
          .then(r => r.json()).then(j => ({ type: 'users', data: j })).catch(() => null));
      }

      // detect severity/priorities intents
      if (/\b(severity|severidad|prioridad|critico|alto|mayor|baja|low|high)\b/.test(msgLower)) {
        // call a safe test endpoint that returns severity mappings
        intents.push(fetch('/api/severity/test', { method: 'GET' })
          .then(r => r.json()).then(j => ({ type: 'severity', data: j })).catch(() => null));
      }

      // (Ingest functionality removed) — we no longer auto-ingest documents

      // Execute intents in background and show lightweight notifications when they finish
      if (intents.length > 0) {
        Promise.all(intents).then(results => {
          results.forEach(res => {
            if (!res) return;
            if (res.type === 'endpoints' && res.data) {
              const count = (res.data.endpoints || []).length || 0;
              this.addMessage('assistant', `He buscado endpoints en segundo plano y encontré ${count} elementos.`);
            }
            if (res.type === 'playbooks' && res.data) {
              const count = (res.data.playbooks || []).length || 0;
              this.addMessage('assistant', `He extraído playbooks en segundo plano: ${count} encontrados.`);
            }
            if (res.type === 'sla_issue' && res.data) {
              const sla = res.data.sla || {};
              const hasBreach = sla.has_breach || sla.has_breach === true;
              const cycles = sla.cycles || [];
              const first = cycles[0] || {};
              this.addMessage('assistant', `SLA para ${res.issue}: ${sla.sla_name || ''} — Breach: ${hasBreach ? 'Sí' : 'No'} — Ciclos: ${cycles.length} — Tiempo restante ejemplo: ${first.remaining_time || 'N/A'}`);
            }
            if (res.type === 'sla_health' && res.data) {
              this.addMessage('assistant', `Estado SLA: ${res.data.status || 'unknown'} — Cache cargada: ${res.data.sla_cache_loaded ? 'sí' : 'no'} — Desks: ${res.data.desks || 0}`);
            }
            if (res.type === 'users' && res.data) {
              const list = Array.isArray(res.data) ? res.data : (res.data.users || res.data.data || []);
              const names = (list || []).slice(0,5).map(u => u.displayName || u.name || u).join(', ');
              this.addMessage('assistant', `Usuarios encontrados: ${names || 'No se encontraron usuarios relevantes.'}`);
            }
            if (res.type === 'severity' && res.data) {
              const msg = (res.data.message || 'Severity info') + '\n' + (JSON.stringify(res.data.data || res.data, null, 2)).slice(0,500);
              this.addMessage('assistant', `Información de severidad (resumen): ${msg}`);
            }
          });
        }).catch(() => {});
      }

      // Default: send to chat endpoint
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          context: this.context
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Remove loading message and stop thinking rotation
      if (this.thinkingInterval) {
        clearInterval(this.thinkingInterval);
        this.thinkingInterval = null;
      }
      loadingMsg?.remove();

      // Add assistant response with Veracruzian signature
      const veracruzNames = ['Güero','Güera','Pachi','Chuy','Toño'];
      const rand = veracruzNames[Math.floor(Math.random()*veracruzNames.length)];
      const assistantText = (data.response || 'Sorry, I encountered an error.') + `\n\n— ${rand}`;
      this.addMessage('assistant', assistantText);

      // If a ticket is selected, fetch ML comment suggestions and show them
      if (this.context.selectedIssue) {
        try {
          const suggestResp = await fetch('/api/copilot/suggest/comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ summary: window.app?.issuesCache?.get(this.context.selectedIssue)?.summary || '', comments: '' })
          });
          if (suggestResp.ok) {
            const sdata = await suggestResp.json();
            if (sdata && (sdata.labels || sdata.probabilities)) {
              const sugText = `Suggested comment labels: ${ (sdata.labels || []).join(', ') }`;
              this.addMessage('assistant', `💡 ML suggestions: ${sugText} — ${rand}`);
            }
          }
        } catch (e) {
          console.warn('Comment suggestion failed', e);
        }
      }
      
    } catch (error) {
      console.error('❌ Flowing MVP error:', error);
      loadingMsg?.remove();
      this.addMessage('assistant', '❌ Sorry, I encountered an error. Please try again.');
    } finally {
      this.isLoading = false;
      this.sendBtn.disabled = false;
    }
  }

  addMessage(role, content, isLoading = false) {
    if (!this.messagesContainer) return null;

    const messageDiv = document.createElement('div');
    messageDiv.className = `copilot-message ${role}${isLoading ? ' loading' : ''}`;
    
    const avatar = role === 'user' ? '👤' : 'SF';
    const avatarClass = role === 'user' ? '' : 'copilot-sf-logo';
    
    messageDiv.innerHTML = `
      <div class="message-avatar ${avatarClass}">${avatar}</div>
      <div class="message-content">
        ${isLoading ? '<p>Thinking...</p>' : this.formatMessage(content)}
      </div>
    `;

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
    
    return messageDiv;
  }

  formatMessage(content) {
    // Convert markdown-style formatting to HTML
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // Convert bullet points
    if (formatted.includes('- ') || formatted.includes('• ')) {
      const lines = formatted.split('</p><p>');
      formatted = lines.map(line => {
        if (line.includes('- ') || line.includes('• ')) {
          const items = line.split(/<br>/).filter(l => l.trim());
          const listItems = items.map(item => {
            const cleaned = item.replace(/^[•\-]\s*/, '').trim();
            return cleaned ? `<li>${cleaned}</li>` : '';
          }).join('');
          return `<ul>${listItems}</ul>`;
        }
        return line;
      }).join('</p><p>');
    }

    // Wrap in paragraph if not already wrapped
    if (!formatted.startsWith('<p>') && !formatted.startsWith('<ul>')) {
      formatted = `<p>${formatted}</p>`;
    }

    return formatted;
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  // Public API for external usage
  askAboutTicket(issueKey) {
    this.expand();
    this.input.value = `Tell me about ticket ${issueKey}`;
    this.input.focus();
  }

  suggestActions(issueKey) {
    this.expand();
    this.input.value = `What should I do with ticket ${issueKey}?`;
    this.sendMessage();
  }

  explainSLA(issueKey) {
    this.expand();
    this.input.value = `Explain the SLA status for ${issueKey}`;
    this.sendMessage();
  }

  /**
   * Mostrar sugerencias contextuales usando FlowingContext
   * Integra las capacidades de IA real del sistema Flowing
   */
  async showContextualSuggestions() {
    if (!window.FlowingContext) {
      console.warn('FlowingContext not available');
      return;
    }

    try {
      // Obtener sugerencias contextuales
      const suggestions = await window.FlowingContext.getSuggestions();
      
      if (!suggestions || !suggestions.suggestions || suggestions.suggestions.length === 0) {
        return;
      }

      // Mostrar mensaje con sugerencias
      const suggestionsList = suggestions.suggestions.map(s => 
        `• ${s.icon || '💡'} ${s.title}`
      ).join('\n');

      this.addMessage(
        `**${suggestions.title || 'Sugerencias Contextuales'}**\n\n${suggestionsList}\n\n_Click en "✨ Flowing AI" en cualquier sugerencia para ejecutarla._`,
        'assistant'
      );
    } catch (error) {
      console.error('Error showing contextual suggestions:', error);
    }
  }
}

// Exponer FlowingContext globalmente para integración con footer
if (typeof FlowingContext !== 'undefined') {
  window.FlowingContext = FlowingContext;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  window.aiCopilot = new AICopilot();
  console.log('✅ Flowing MVP loaded');
});
