/**
 * ML Anomaly Detection Dashboard
 * Monitors operational anomalies in ticket patterns
 */

// Import SVG Icons (if available, fallback to inline SVG)
const Icons = window.SVGIcons || null;

class AnomalyDashboard {
  constructor() {
    this.modal = null;
    this.refreshInterval = null;
    this.autoRefreshEnabled = true;
  }

  /**
   * Initialize the dashboard
   */
  init() {
    console.log('🚨 Initializing Anomaly Detection Dashboard...');
    this.createSidebarButton();
    // Check for anomalies immediately on load
    this.checkForNewAnomalies();
    // Check periodically (every 3 minutes)
    setInterval(() => this.checkForNewAnomalies(), 180000);
    
    // Listen for theme changes from ThemeManager
    if (window.ThemeManager) {
      document.addEventListener('themeChanged', (e) => {
        this.applyTheme(e.detail.theme);
      });
      // Apply current theme immediately
      this.applyTheme(window.ThemeManager.currentTheme);
    }
  }

  /**
   * Create the modal structure
   */
  createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'modal-overlay anomaly-dashboard-modal';
    this.modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h2>
            <i class="fas fa-shield-alt"></i>
            Detección de Anomalías
          </h2>
          <div class="header-actions">
            <button class="refresh-btn" title="Actualizar" aria-label="Refresh">
              ${Icons ? Icons.refresh() : this._fallbackRefreshIcon()}
            </button>
            <button class="auto-refresh-toggle" title="Auto-actualizar cada 2 minutos" aria-label="Toggle Auto-refresh">
              ${Icons ? Icons.clock() : this._fallbackClockIcon()}
            </button>
            <button class="close-btn" title="Cerrar" aria-label="Close">
              ${Icons ? Icons.close() : this._fallbackCloseIcon()}
            </button>
          </div>
        </div>
        
        <div class="modal-body">
          <!-- Summary Cards -->
          <div class="anomaly-summary">
            <div class="summary-card high">
              <div class="card-icon">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <div class="card-content">
                <h3 id="anomaly-high-count">0</h3>
                <p>Alta Prioridad</p>
              </div>
            </div>
            <div class="summary-card medium">
              <div class="card-icon">
                <i class="fas fa-exclamation-circle"></i>
              </div>
              <div class="card-content">
                <h3 id="anomaly-medium-count">0</h3>
                <p>Media Prioridad</p>
              </div>
            </div>
            <div class="summary-card info">
              <div class="card-icon">
                <i class="fas fa-chart-line"></i>
              </div>
              <div class="card-content">
                <h3 id="anomaly-total-count">0</h3>
                <p>Total Detectadas</p>
              </div>
            </div>
          </div>

          <!-- Baseline Info -->
          <div class="baseline-info">
            <h3>📊 Línea Base</h3>
            <div class="baseline-stats">
              <div class="stat">
                <span class="label">Promedio diario:</span>
                <span class="value" id="baseline-daily">-</span>
              </div>
              <div class="stat">
                <span class="label">Tickets por agente:</span>
                <span class="value" id="baseline-assignee">-</span>
              </div>
              <div class="stat">
                <span class="label">Tickets analizados:</span>
                <span class="value" id="baseline-total">-</span>
              </div>
            </div>
          </div>

          <!-- Anomalies List -->
          <div class="anomalies-container">
            <h3>🔍 Anomalías Detectadas</h3>
            <div id="anomalies-list" class="anomalies-list">
              <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                Analizando tickets...
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    // Event listeners
    this.modal.querySelector('.close-btn').addEventListener('click', () => this.hide());
    this.modal.addEventListener('click', (e) => {
      // Cerrar al hacer click en el overlay (fuera del modal-container)
      if (e.target === this.modal) {
        this.hide();
      }
    });
    this.modal.querySelector('.refresh-btn').addEventListener('click', () => this.refresh());
    this.modal.querySelector('.auto-refresh-toggle').addEventListener('click', () => this.toggleAutoRefresh());

    console.log('✅ Anomaly Dashboard modal created');
  }

  /**
   * Create sidebar button to open dashboard
   */
  createSidebarButton() {
    // Find the sidebar menu
    const sidebarMenu = document.querySelector('.sidebar-menu');
    if (!sidebarMenu) {
      console.warn('Sidebar menu not found, skipping button creation');
      return;
    }

    // Create button matching sidebar style
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sidebar-menu-item';
    button.id = 'anomalyDashboardBtn';
    button.setAttribute('aria-label', 'Anomaly Detection');
    button.setAttribute('data-tooltip', 'Anomaly Detection');
    button.innerHTML = `
      <span class="icon">🛡️</span>
      <span class="label">Anomalías</span>
      <span class="anomaly-badge" style="display: none;">0</span>
    `;
    button.addEventListener('click', () => this.show());

    // Insert after notifications button
    const notificationsBtn = document.getElementById('notificationsBtn');
    if (notificationsBtn && notificationsBtn.parentNode) {
      notificationsBtn.parentNode.insertBefore(button, notificationsBtn.nextSibling);
    } else {
      // Fallback: add to end
      sidebarMenu.appendChild(button);
    }

    this.sidebarButton = button;
    console.log('✅ Anomaly Dashboard button added to sidebar');
  }

  /**
   * Show the dashboard
   */
  async show() {
    console.log('🔍 show() called');
    console.log('   this.modal exists:', !!this.modal);
    console.log('   this.modal in DOM:', this.modal && document.body.contains(this.modal));
    
    if (!this.modal) {
      console.error('❌ Modal element not found! Recreating...');
      this.createModal();
    }
    
    if (!document.body.contains(this.modal)) {
      console.warn('⚠️ Modal not in DOM! Re-appending...');
      document.body.appendChild(this.modal);
    }
    
    console.log('   Setting display to flex...');
    this.modal.style.display = 'flex';
    console.log('   Display after set:', this.modal.style.display);
    
    setTimeout(() => {
      console.log('   Adding active class...');
      this.modal.classList.add('active');
      console.log('   Modal classes:', this.modal.className);
    }, 10);

    // Load data
    await this.loadDashboardData();

    // Mark anomalies as seen
    this.hasSeenAnomalies = true;
    const badge = this.sidebarButton?.querySelector('.anomaly-badge');
    if (badge) {
      badge.classList.remove('pulse-alert');
    }

    // Start auto-refresh if enabled
    if (this.autoRefreshEnabled) {
      this.startAutoRefresh();
    }
    
    console.log('✅ show() completed');
  }

  /**
   * Hide the dashboard
   */
  hide() {
    this.modal.classList.remove('active');
    setTimeout(() => this.modal.style.display = 'none', 300);

    // Stop auto-refresh
    this.stopAutoRefresh();
  }

  /**
   * Refresh dashboard data
   */
  async refresh() {
    const refreshBtn = this.modal.querySelector('.refresh-btn i');
    refreshBtn.classList.add('fa-spin');

    await this.loadDashboardData();

    setTimeout(() => refreshBtn.classList.remove('fa-spin'), 500);
  }

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh() {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    const btn = this.modal.querySelector('.auto-refresh-toggle');
    
    if (this.autoRefreshEnabled) {
      btn.classList.add('active');
      this.startAutoRefresh();
    } else {
      btn.classList.remove('active');
      this.stopAutoRefresh();
    }
  }

  /**
   * Start auto-refresh (every 2 minutes)
   */
  startAutoRefresh() {
    this.stopAutoRefresh(); // Clear existing
    this.refreshInterval = setInterval(() => {
      this.loadDashboardData();
    }, 120000); // 2 minutes
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Load dashboard data from API
   */
  async loadDashboardData() {
    try {
      const response = await fetch('/api/ml/anomalies/dashboard');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      const data = result.data;

      // Update summary cards
      document.getElementById('anomaly-high-count').textContent = data.anomalies.high;
      document.getElementById('anomaly-medium-count').textContent = data.anomalies.medium;
      document.getElementById('anomaly-total-count').textContent = data.anomalies.total;

      // Update baseline
      document.getElementById('baseline-daily').textContent = 
        `${data.baseline.avg_daily_tickets} tickets/día`;
      document.getElementById('baseline-assignee').textContent = 
        `${data.baseline.avg_tickets_per_assignee} tickets`;
      document.getElementById('baseline-total').textContent = 
        data.baseline.total_tickets_analyzed.toLocaleString();

      // Render anomalies
      this.renderAnomalies(data.anomalies.details);

      // Update sidebar badge
      this.updateSidebarBadge(data.anomalies.high);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showError('Error al cargar datos de anomalías');
    }
  }

  /**
   * Render anomalies list
   */
  renderAnomalies(anomalies) {
    const container = document.getElementById('anomalies-list');

    if (anomalies.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>No se detectaron anomalías</p>
          <small>Todo está funcionando dentro de los parámetros normales</small>
        </div>
      `;
      return;
    }

    // Sort by severity
    const sorted = anomalies.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const html = sorted.map(anomaly => `
      <div class="anomaly-card ${anomaly.severity}">
        <div class="anomaly-header">
          <span class="anomaly-type">
            ${this.getTypeIcon(anomaly.type)} ${this.getTypeLabel(anomaly.type)}
          </span>
          <span class="anomaly-severity ${anomaly.severity}">
            ${anomaly.severity === 'high' ? '🔴 Alta' : '🟡 Media'}
          </span>
        </div>
        <div class="anomaly-message">
          ${this.escapeHtml(anomaly.message)}
        </div>
        ${this.renderAnomalyDetails(anomaly)}
      </div>
    `).join('');

    container.innerHTML = html;
  }

  /**
   * Render additional anomaly details
   */
  renderAnomalyDetails(anomaly) {
    let details = '';

    if (anomaly.ticket_key) {
      details += `<div class="detail"><strong>Ticket:</strong> ${anomaly.ticket_key}</div>`;
    }
    if (anomaly.assignee) {
      details += `<div class="detail"><strong>Asignado:</strong> ${anomaly.assignee}</div>`;
    }
    if (anomaly.value !== undefined) {
      details += `<div class="detail"><strong>Valor:</strong> ${anomaly.value}</div>`;
    }
    if (anomaly.threshold !== undefined) {
      details += `<div class="detail"><strong>Umbral:</strong> ${anomaly.threshold}</div>`;
    }
    
    // Show detected tickets if available (clickeable links to JIRA)
    if (anomaly.tickets && Array.isArray(anomaly.tickets) && anomaly.tickets.length > 0) {
      const jiraBaseUrl = window.location.origin.includes('localhost') 
        ? 'https://your-domain.atlassian.net/browse' 
        : `${window.location.origin}/browse`;
      
      const externalIcon = Icons ? Icons.externalLink({ size: 12, className: 'ticket-external-icon' }) : 
        `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>`;
      
      const ticketsList = anomaly.tickets.slice(0, 10).map(key => 
        `<a href="${jiraBaseUrl}/${key}" target="_blank" class="ticket-key-link" title="Abrir ${key} en JIRA">
          ${externalIcon}
          ${key}
        </a>`
      ).join(' ');
      details += `<div class="detail tickets-list"><strong>Tickets detectados (click para abrir):</strong><br>${ticketsList}</div>`;
    }

    return details ? `<div class="anomaly-details">${details}</div>` : '';
  }

  /**
   * Update sidebar badge count
   */
  updateSidebarBadge(highCount) {
    if (!this.sidebarButton) return;

    const badge = this.sidebarButton.querySelector('.anomaly-badge');
    if (highCount > 0) {
      badge.textContent = highCount;
      badge.style.display = 'inline-block';
      // Add pulse animation for new anomalies
      badge.classList.add('pulse-alert');
      // Show notification if there are new high priority anomalies
      if (!this.hasSeenAnomalies) {
        this.showAnomalyNotification(highCount);
      }
    } else {
      badge.style.display = 'none';
      badge.classList.remove('pulse-alert');
    }
  }

  /**
   * Get icon for anomaly type
   */
  getTypeIcon(type) {
    const icons = {
      'creation_spike': '📈',
      'assignment_overload': '⚠️',
      'unassigned_tickets': '❓',
      'stalled_ticket': '🐌',
      'issue_type_spike': '📊'
    };
    return icons[type] || '🔍';
  }

  /**
   * Get label for anomaly type
   */
  getTypeLabel(type) {
    const labels = {
      'creation_spike': 'Pico de Creación',
      'assignment_overload': 'Sobrecarga de Asignación',
      'unassigned_tickets': 'Tickets Sin Asignar',
      'stalled_ticket': 'Ticket Estancado',
      'issue_type_spike': 'Pico de Tipo'
    };
    return labels[type] || type;
  }

  /**
   * Show error message
   */
  showError(message) {
    const container = document.getElementById('anomalies-list');
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Check for new anomalies without opening modal
   */
  async checkForNewAnomalies() {
    try {
      const response = await fetch('/api/ml/anomalies/dashboard');
      if (!response.ok) return;

      const result = await response.json();
      const data = result.data;

      // Update badge silently
      this.updateSidebarBadge(data.anomalies.high);

    } catch (error) {
      console.error('Error checking anomalies:', error);
    }
  }

  /**
   * Apply theme to modal
   */
  applyTheme(theme) {
    if (!this.modal) return;
    
    const container = this.modal.querySelector('.modal-container');
    if (container) {
      container.classList.remove('theme-light', 'theme-dark');
      container.classList.add(`theme-${theme}`);
      console.log(`🎨 Anomaly Dashboard theme applied: ${theme}`);
    }
  }

  /**
   * Show notification for new anomalies
   */
  showAnomalyNotification(count) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'feedback-toast show anomaly-alert';
    toast.innerHTML = `
      <i class="fas fa-shield-alt"></i>
      <span><strong>🚨 ${count} Anomalía${count > 1 ? 's' : ''} Detectada${count > 1 ? 's' : ''}</strong><br>
      <small>Alta prioridad - Click para ver detalles</small></span>
    `;
    toast.style.cursor = 'pointer';
    toast.onclick = () => {
      this.show();
      toast.remove();
      this.hasSeenAnomalies = true;
    };

    document.body.appendChild(toast);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 10000);
  }

  /**
   * Fallback icons if SVGIcons module not loaded
   */
  _fallbackRefreshIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
    </svg>`;
  }

  _fallbackClockIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>`;
  }

  _fallbackCloseIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;
  }
}

// Global instance
window.anomalyDashboard = new AnomalyDashboard();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.anomalyDashboard.init();
  });
} else {
  window.anomalyDashboard.init();
}
