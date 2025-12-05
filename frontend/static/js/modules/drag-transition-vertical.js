/**
 * DRAG TRANSITION VERTICAL HANDLER
 * Maneja el drag & drop de tickets con barra de transiciones vertical
 * 
 * Features:
 * - Fetch dinámico de transiciones desde JIRA API
 * - Animación de columnas que se separan
 * - Barra vertical centrada con glassmorphism
 * - Transiciones ejecutadas via API
 */

class DragTransitionVertical {
  constructor() {
    this.transitionBar = null;
    this.currentTicket = null;
    this.availableTransitions = [];
    this.isDragging = false;
    this.isExecutingTransition = false;
    this.dragStartTime = null;
    
    console.log('🎯 DragTransitionVertical: Constructor initialized');
  }
  
  init() {
    console.log('🚀 DragTransitionVertical: Initializing...');
    this.setupDragListeners();
    this.createTransitionBar();
    console.log('✅ DragTransitionVertical: Ready');
  }
  
  /**
   * Setup global drag event listeners
   */
  setupDragListeners() {
    // Dragstart: Initialize drag operation
    document.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.kanban-card');
      if (card) {
        console.log('🚀 Drag started on card:', card.dataset.issueKey);
        this.onDragStart(e, card);
      }
    });
    
    
    // Dragend: Cleanup unless executing transition or drag just started
    document.addEventListener('dragend', (e) => {
      const card = e.target.closest('.kanban-card');
      if (card && this.isDragging && !this.isExecutingTransition) {
        const dragDuration = Date.now() - this.dragStartTime;
        
        // Only cleanup if drag lasted more than 200ms (real drag, not accidental)
        if (dragDuration > 200) {
          console.log('🏁 Drag ended after', dragDuration, 'ms - cleaning up');
          this.onDragEnd();
        } else {
          console.log('⏱️ Drag too short (', dragDuration, 'ms) - ignoring dragend');
        }
      }
    });
    
    
    // Dragover: Allow drop
    document.addEventListener('dragover', (e) => {
      if (this.isDragging) {
        e.preventDefault();
      }
    });
    
    // Prevent click events during drag
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.kanban-card');
      if (card && this.isDragging) {
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
    }, true);
    
    // ESC key cancels drag
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isDragging) {
        console.log('⚠️ Drag cancelled by ESC key');
        this.cancelDrag();
      }
    });
  }
  
  /**
   * Create the transition bar DOM element
   */
  createTransitionBar() {
    if (this.transitionBar) return;
    
    this.transitionBar = document.createElement('div');
    this.transitionBar.className = 'transition-bar-vertical';
    
    // IMPORTANTE: Asegurar que esté oculto por defecto
    this.transitionBar.style.display = 'none';
    
    this.transitionBar.innerHTML = `
      <div class="transition-bar-header">
        <span class="icon">🎯</span>
        <span class="text">Drop aquí para transicionar:</span>
        <span class="issue-key" id="transitionIssueKey">—</span>
        <button class="close-button" title="Presiona ESC o suelta fuera para cancelar">✕</button>
      </div>
      <div class="transition-zones-vertical" id="transitionZonesVertical">
        <div class="transition-loading">
          <div class="spinner"></div>
          <div class="loading-text">Cargando transiciones...</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.transitionBar);
    
    // Close button handler
    const closeBtn = this.transitionBar.querySelector('.close-button');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.cancelDrag();
      });
    }
    
    console.log('✅ Transition bar created');
  }
  
  /**
   * Handle drag start event
   */
  async onDragStart(e, card) {
    // IMPORTANTE: NO llamar e.preventDefault() aquí o el drag no funcionará
    // Solo stopPropagation para evitar que abra los detalles del ticket
    e.stopPropagation();
    
    // Set drag data (required for drag to work)
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset.issueKey || '');
    }
    
    // Extract issue key from card
    const issueKey = this.extractIssueKey(card);
    
    if (!issueKey) {
      console.warn('⚠️ No issue key found on card');
      return;
    }
    
    console.log('🚀 Drag started:', issueKey);
    
    // Set state
    this.isDragging = true;
    this.dragStartTime = Date.now();
    this.currentTicket = { card, issueKey };
    
    // Add visual feedback
    card.classList.add('dragging');
    card.style.opacity = '0.5';
    
    // Activate board (columns separate)
    this.activateBoard();
    
    // Show transition bar with loading
    this.showTransitionBar(true);
    
    // Load and render transitions
    await this.loadTransitions(issueKey);
    this.renderTransitions();
  }
  
  /**
   * Extract issue key from card element
   */
  extractIssueKey(card) {
    // Try multiple strategies to find issue key
    
    // Strategy 1: data-issue-key attribute
    if (card.dataset.issueKey) {
      return card.dataset.issueKey;
    }
    
    // Strategy 2: .issue-key element
    const keyElement = card.querySelector('.issue-key');
    if (keyElement) {
      return keyElement.textContent.trim();
    }
    
    // Strategy 3: data-key attribute
    if (card.dataset.key) {
      return card.dataset.key;
    }
    
    // Strategy 4: First text content that matches JIRA key pattern (ABC-123)
    const text = card.textContent;
    const match = text.match(/[A-Z]+-\d+/);
    if (match) {
      return match[0];
    }
    
    return null;
  }
  
  /**
   * Fetch available transitions from API
   */
  async loadTransitions(issueKey) {
    try {
      console.log('📡 Fetching transitions for', issueKey);
      
      const response = await fetch(`/api/issues/${issueKey}/transitions`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Raw response:', data);
      
      // Unwrap if decorated with @json_response
      let transitions = [];
      
      if (data.transitions) {
        transitions = data.transitions;
      } else if (data.data && data.data.transitions) {
        transitions = data.data.transitions;
      } else if (Array.isArray(data)) {
        transitions = data;
      }
      
      // Map to standardized format including fields
      this.availableTransitions = transitions.map(t => ({
        id: t.id,
        name: t.name,
        targetStatus: t.to?.name || t.targetStatus || 'Unknown',
        icon: this.getIconForTransition(t.name),
        fields: t.fields || {},
        hasFields: t.fields && Object.keys(t.fields).length > 0
      }));
      
      console.log('✅ Loaded transitions:', this.availableTransitions.length);
      
    } catch (error) {
      console.error('❌ Error loading transitions:', error);
      this.availableTransitions = [];
    }
  }
  
  /**
   * Show transition bar with optional loading state
   */
  showTransitionBar(loading = false) {
    if (!this.transitionBar) return;
    
    console.log('📊 Showing transition bar');
    
    // Update issue key in header
    const issueKeyEl = document.getElementById('transitionIssueKey');
    if (issueKeyEl && this.currentTicket) {
      issueKeyEl.textContent = this.currentTicket.issueKey;
    }
    
    // Remove display:none and show bar with animation
    this.transitionBar.style.display = 'flex';
    
    setTimeout(() => {
      this.transitionBar.classList.add('show');
    }, 100);
  }
  
  /**
   * Render transitions in the bar
   */
  renderTransitions() {
    const zonesContainer = document.getElementById('transitionZonesVertical');
    if (!zonesContainer) return;
    
    // Empty state
    if (this.availableTransitions.length === 0) {
      zonesContainer.innerHTML = `
        <div class="transition-empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-text">No hay transiciones disponibles</div>
          <div class="empty-hint">Este ticket no puede cambiar de estado</div>
        </div>
      `;
      return;
    }
    
    // Render transition zones
    zonesContainer.innerHTML = this.availableTransitions.map(t => {
      const pausesSLA = this.transitionPausesSLA(t.name);
      const slaBadge = pausesSLA ? '<span class="sla-pause-badge">⏸️ Pausa SLA</span>' : '';
      
      return `
        <div class="transition-zone-vertical ${pausesSLA ? 'pauses-sla' : ''}" 
             data-transition-id="${t.id}"
             data-target-status="${this.escapeHtml(t.targetStatus)}"
             data-pauses-sla="${pausesSLA}"
             draggable="false">
          <span class="transition-icon">${t.icon}</span>
          <div class="transition-info">
            <span class="transition-name">${this.escapeHtml(t.name)}</span>
            <span class="transition-target">${this.escapeHtml(t.targetStatus)}</span>
            ${slaBadge}
          </div>
        </div>
      `;
    }).join('');
    
    // Attach event listeners to zones
    this.attachZoneListeners();
  }
  
  /**
   * Attach drag event listeners to transition zones
   */
  attachZoneListeners() {
    const zones = document.querySelectorAll('.transition-zone-vertical');
    console.log(`🎯 Attaching listeners to ${zones.length} transition zones`);
    
    zones.forEach(zone => {
      zone.setAttribute('data-droppable', 'true');
      zone.addEventListener('dragenter', (e) => this.onZoneDragEnter(e, zone));
      zone.addEventListener('dragover', (e) => this.onZoneDragOver(e));
      zone.addEventListener('dragleave', (e) => this.onZoneDragLeave(e, zone));
      zone.addEventListener('drop', (e) => this.onZoneDrop(e, zone));
    });
  }
  
  /**
   * Handle dragenter on transition zone
   */
  onZoneDragEnter(e, zone) {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Dragenter on zone:', zone.dataset.targetStatus);
    zone.classList.add('drag-over');
  }
  
  /**
   * Handle dragover on transition zone
   */
  onZoneDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }
  
  /**
   * Handle dragleave on transition zone
   */
  onZoneDragLeave(e, zone) {
    e.stopPropagation();
    if (e.target === zone) {
      zone.classList.remove('drag-over');
    }
  }
  
  /**
   * Handle drop on transition zone
   */
  async onZoneDrop(e, zone) {
    e.preventDefault();
    e.stopPropagation();
    
    const transitionId = zone.dataset.transitionId;
    const targetStatus = zone.dataset.targetStatus;
    
    console.log('🎯 DROP EVENT FIRED:', { transitionId, targetStatus });
    
    this.removeDragOverClasses();
    
    // Find transition to check if it has required fields
    const transition = this.availableTransitions.find(t => t.id === transitionId);
    
    if (transition?.hasFields) {
      console.log('📋 Transition requires fields - showing modal');
      await this.showFieldsModal(transition);
    } else {
      // Execute transition directly
      try {
        await this.executeTransition(transitionId, targetStatus);
      } finally {
        this.onDragEnd();
      }
    }
  }
  
  /**
   * Show modal to collect required fields for transition
   */
  async showFieldsModal(transition) {
    return new Promise((resolve) => {
      // Create modal
      const modal = document.createElement('div');
      modal.className = 'transition-fields-modal';
      modal.innerHTML = `
        <div class="transition-fields-overlay"></div>
        <div class="transition-fields-content">
          <div class="transition-fields-header">
            <h3>${transition.icon} ${this.escapeHtml(transition.name)}</h3>
            <p>Complete los campos requeridos para esta transición</p>
          </div>
          <form class="transition-fields-form" id="transitionFieldsForm">
            ${this.renderTransitionFields(transition.fields)}
          </form>
          <div class="transition-fields-actions">
            <button type="button" class="btn-cancel" id="cancelFieldsBtn">Cancelar</button>
            <button type="button" class="btn-submit" id="submitFieldsBtn">Ejecutar Transición</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add animation
      setTimeout(() => modal.classList.add('show'), 10);
      
      // Cancel handler
      const cancelBtn = modal.querySelector('#cancelFieldsBtn');
      const overlay = modal.querySelector('.transition-fields-overlay');
      const cancelHandler = () => {
        modal.classList.remove('show');
        setTimeout(() => {
          modal.remove();
          this.onDragEnd();
        }, 300);
        resolve(null);
      };
      
      cancelBtn.addEventListener('click', cancelHandler);
      overlay.addEventListener('click', cancelHandler);
      
      // Submit handler
      const submitBtn = modal.querySelector('#submitFieldsBtn');
      submitBtn.addEventListener('click', async () => {
        const formData = this.collectFormData(modal);
        
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
        
        try {
          await this.executeTransition(transition.id, transition.targetStatus, formData);
        } finally {
          this.onDragEnd();
        }
        
        resolve(formData);
      });
    });
  }
  
  /**
   * Render form fields based on transition field requirements
   */
  renderTransitionFields(fields) {
    const fieldKeys = Object.keys(fields);
    
    return fieldKeys.map(fieldKey => {
      const field = fields[fieldKey];
      const isRequired = field.required;
      const fieldName = field.name || fieldKey;
      const fieldType = field.schema?.type || 'string';
      
      return `
        <div class="transition-field">
          <label for="field_${fieldKey}">
            ${this.escapeHtml(fieldName)}
            ${isRequired ? '<span class="required">*</span>' : ''}
          </label>
          ${this.renderFieldInput(fieldKey, field, fieldType)}
        </div>
      `;
    }).join('');
  }
  
  /**
   * Render appropriate input for field type
   */
  renderFieldInput(fieldKey, field, fieldType) {
    const placeholder = field.required ? 'Campo requerido' : 'Opcional';
    
    // Text area for longer fields
    if (fieldKey.toLowerCase().includes('comment') || 
        fieldKey.toLowerCase().includes('descripcion') ||
        fieldKey.toLowerCase().includes('description')) {
      return `
        <textarea 
          id="field_${fieldKey}" 
          name="${fieldKey}"
          placeholder="${placeholder}"
          rows="4"
          ${field.required ? 'required' : ''}></textarea>
      `;
    }
    
    // Select for allowed values
    if (field.allowedValues && field.allowedValues.length > 0) {
      return `
        <select id="field_${fieldKey}" name="${fieldKey}" ${field.required ? 'required' : ''}>
          <option value="">Seleccione una opción</option>
          ${field.allowedValues.map(val => `
            <option value="${val.id || val.value}">${this.escapeHtml(val.name || val.value)}</option>
          `).join('')}
        </select>
      `;
    }
    
    // Default: text input
    return `
      <input 
        type="text" 
        id="field_${fieldKey}" 
        name="${fieldKey}"
        placeholder="${placeholder}"
        ${field.required ? 'required' : ''}
      />
    `;
  }
  
  /**
   * Collect form data from modal
   */
  collectFormData(modal) {
    const form = modal.querySelector('#transitionFieldsForm');
    const formData = new FormData(form);
    const fields = {};
    
    for (const [key, value] of formData.entries()) {
      if (value) {
        fields[key] = value;
      }
    }
    
    return fields;
  }
  
  /**
   * Execute transition via API
   */
  async executeTransition(transitionId, targetStatus, fields = null) {
    this.isExecutingTransition = true;
    
    // Store issue key before any async operations
    const issueKey = this.currentTicket?.issueKey;
    
    if (!issueKey) {
      console.error('❌ No issue key available for transition');
      this.isExecutingTransition = false;
      return;
    }
    
    console.log('🚀 Executing transition:', { 
      issueKey,
      transitionId, 
      targetStatus 
    });
    
    try {
      // Show loading state on bar
      this.updateTransitionBarIcon('⏳');
      
      const body = {
        transition: { id: transitionId }
      };
      
      // Add fields if provided
      if (fields && Object.keys(fields).length > 0) {
        body.fields = fields;
      }
      
      const response = await fetch(`/api/issues/${issueKey}/transitions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transition failed: ${response.status} - ${errorText}`);
      }
      
      console.log('✅ Transition successful');
      
      // Show success notification
      this.showNotification(`✅ ${issueKey} → ${targetStatus}`, 'success');
      
      // Animate card to new column
      await this.animateCardTransition(targetStatus);
      
      // Reload kanban board
      if (window.loadIssues && window.state?.currentQueue) {
        console.log('🔄 Reloading issues...');
        await window.loadIssues(window.state.currentQueue);
      }
      
    } catch (error) {
      console.error('❌ Transition error:', error);
      this.showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
      this.isExecutingTransition = false;
    }
  }
  
  /**
   * Find target column by status name
   */
  findColumnByStatus(targetStatus) {
    const columns = document.querySelectorAll('.kanban-column');
    const targetStatusLower = targetStatus.toLowerCase();
    
    for (const col of columns) {
      const colTitle = col.querySelector('.column-title, .kanban-column-title, h2, h3');
      if (colTitle) {
        const titleText = colTitle.textContent.toLowerCase();
        if (titleText.includes(targetStatusLower) || targetStatusLower.includes(titleText)) {
          return col;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Animate card flying to target column
   */
  async animateCardTransition(targetStatus) {
    if (!this.currentTicket?.card) return;
    
    const targetColumn = this.findColumnByStatus(targetStatus);
    
    if (!targetColumn) {
      console.warn('⚠️ Target column not found for status:', targetStatus);
      return;
    }
    
    console.log('🎬 Animating card to column:', targetColumn);
    
    const card = this.currentTicket.card;
    
    // Clone card for animation
    const clone = card.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.zIndex = '10000';
    clone.style.pointerEvents = 'none';
    clone.style.opacity = '1';
    
    const startRect = card.getBoundingClientRect();
    clone.style.top = `${startRect.top}px`;
    clone.style.left = `${startRect.left}px`;
    clone.style.width = `${startRect.width}px`;
    
    document.body.appendChild(clone);
    
    // Get target position
    const targetRect = targetColumn.getBoundingClientRect();
    const targetTop = targetRect.top + 80; // Below column header
    const targetLeft = targetRect.left + 20;
    
    // Animate
    const animation = clone.animate([
      {
        top: `${startRect.top}px`,
        left: `${startRect.left}px`,
        opacity: 1,
        transform: 'scale(1) rotate(0deg)'
      },
      {
        top: `${targetTop}px`,
        left: `${targetLeft}px`,
        opacity: 0.3,
        transform: 'scale(0.8) rotate(5deg)'
      }
    ], {
      duration: 800,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    });
    
    animation.onfinish = () => {
      clone.remove();
    };
    
    // Fade out original card
    card.style.transition = 'opacity 0.3s ease';
    card.style.opacity = '0';
    
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  
  /**
   * Cancel drag operation
   */
  cancelDrag() {
    console.log('❌ Drag cancelled');
    this.onDragEnd();
  }
  
  /**
   * Handle drag end event - cleanup all drag states
   */
  onDragEnd() {
    console.log('🏁 Drag ended');
    
    this.cleanupCardState();
    this.hideTransitionBar();
    this.deactivateBoard();
    this.removeDragOverClasses();
    this.resetTransitionBarIcon();
    this.clearCurrentTicket();
  }
  
  /**
   * Activate board for drag operation
   */
  activateBoard() {
    const kanbanBoard = document.querySelector('.kanban-board');
    if (kanbanBoard) {
      kanbanBoard.classList.add('drag-active');
      const columns = kanbanBoard.querySelectorAll('.kanban-column');
      console.log(`✅ Board activated - ${columns.length} columns separated`);
    } else {
      console.warn('⚠️ Kanban board not found!');
    }
  }
  
  /**
   * Cleanup card visual state
   */
  cleanupCardState() {
    if (this.currentTicket?.card) {
      this.currentTicket.card.classList.remove('dragging');
      this.currentTicket.card.style.opacity = '';
    }
    this.isDragging = false;
    this.dragStartTime = null;
  }
  
  /**
   * Hide transition bar with animation
   */
  hideTransitionBar() {
    if (!this.transitionBar) return;
    
    this.transitionBar.classList.remove('show');
    setTimeout(() => {
      this.transitionBar.style.display = 'none';
    }, 300);
  }
  
  /**
   * Deactivate board drag state
   */
  deactivateBoard() {
    const kanbanBoard = document.querySelector('.kanban-board');
    if (kanbanBoard) {
      kanbanBoard.classList.remove('drag-active');
    }
  }
  
  /**
   * Remove drag-over classes from all zones
   */
  removeDragOverClasses() {
    document.querySelectorAll('.transition-zone-vertical.drag-over').forEach(zone => {
      zone.classList.remove('drag-over');
    });
  }
  
  /**
   * Update transition bar header icon
   */
  updateTransitionBarIcon(icon) {
    const header = this.transitionBar?.querySelector('.transition-bar-header .icon');
    if (header) {
      header.textContent = icon;
    }
  }
  
  /**
   * Reset transition bar header icon to default
   */
  resetTransitionBarIcon() {
    this.updateTransitionBarIcon('🎯');
  }
  
  /**
   * Clear current ticket data
   */
  clearCurrentTicket() {
    setTimeout(() => {
      this.currentTicket = null;
      this.availableTransitions = [];
    }, 500);
  }
  
  /**
   * Check if transition pauses SLA
   */
  transitionPausesSLA(transitionName) {
    const pausingTransitions = [
      'en espera de cliente',
      'espera de cliente',
      'waiting for customer',
      'customer waiting',
      'validacion de solucion',
      'validación de solución',
      'solution validation',
      'pendiente de cliente',
      'pending customer',
      'awaiting customer',
      'customer action required'
    ];
    
    const nameLower = transitionName.toLowerCase();
    return pausingTransitions.some(pause => nameLower.includes(pause));
  }
  
  /**
   * Get icon for transition based on name
   */
  getIconForTransition(transitionName) {
    const iconMap = {
      'start': '▶️',
      'progress': '▶️',
      'comenzar': '▶️',
      'iniciar': '▶️',
      'pause': '⏸',
      'pausar': '⏸',
      'stop': '⏹',
      'detener': '⏹',
      'done': '✅',
      'complete': '✅',
      'completar': '✅',
      'finalizar': '✅',
      'close': '🔒',
      'cerrar': '🔒',
      'reopen': '🔓',
      'reabrir': '🔓',
      'waiting': '⏳',
      'wait': '⏳',
      'espera': '⏳',
      'client': '👤',
      'cliente': '👤',
      'customer': '👤',
      'external': '🔗',
      'externo': '🔗',
      'dependency': '🔗',
      'dependencia': '🔗',
      'review': '👀',
      'revisar': '👀',
      'revisión': '👀',
      'validation': '✔️',
      'validacion': '✔️',
      'validación': '✔️',
      'test': '🧪',
      'probar': '🧪',
      'deploy': '🚀',
      'desplegar': '🚀',
      'cancel': '❌',
      'cancelar': '❌',
      'reject': '❌',
      'rechazar': '❌',
      'approve': '✅',
      'aprobar': '✅',
      'block': '🚫',
      'bloquear': '🚫'
    };
    
    const name = transitionName.toLowerCase();
    
    for (const [key, icon] of Object.entries(iconMap)) {
      if (name.includes(key)) {
        return icon;
      }
    }
    
    return '🔄'; // Default icon
  }
  
  /**
   * Show notification to user
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      padding: 16px 24px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      font-weight: 600;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      z-index: 10001;
      animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      setTimeout(() => notification.remove(), 300);
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

// ============================================
// INITIALIZATION
// ============================================

if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDragTransition);
  } else {
    initDragTransition();
  }
}

function initDragTransition() {
  // Small delay to ensure other modules are loaded
  setTimeout(() => {
    window.dragTransitionVertical = new DragTransitionVertical();
    window.dragTransitionVertical.init();
    console.log('✅ Drag Transition Vertical Handler initialized');
  }, 500);
}

// Add keyframe animations to document
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
