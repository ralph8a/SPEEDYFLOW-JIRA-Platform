/**
 * LIST VIEW TRANSITION HANDLER
 * Maneja las transiciones horizontales en la vista de lista
 * 
 * Features:
 * - Barra horizontal que aparece debajo del ticket
 * - Máximo 2 líneas de botones de transición
 * - Reutiliza la API de transiciones del sistema vertical
 * - Animación smooth al expandir/colapsar
 */
class ListViewTransitions {
  constructor() {
    this.activeBar = null; // Reference to currently open transition bar
    this.currentIssueKey = null;
    this.availableTransitions = [];
    this.isExecutingTransition = false;
    console.log('🎯 ListViewTransitions: Constructor initialized');
  }
  init() {
    console.log('🚀 ListViewTransitions: Initializing...');
    this.setupEventListeners();
    console.log('✅ ListViewTransitions: Ready');
  }
  /**
   * Setup event listeners for list view
   */
  setupEventListeners() {
    // Delegate click events for transition buttons in list view
    document.addEventListener('click', (e) => {
      // Handle transition button click (toggle bar)
      const transitionBtn = e.target.closest('.list-transition-trigger');
      if (transitionBtn) {
        e.preventDefault();
        e.stopPropagation();
        const issueKey = transitionBtn.dataset.issueKey;
        const row = transitionBtn.closest('tr');
        if (issueKey && row) {
          this.toggleTransitionBar(issueKey, row);
        }
        return;
      }
      // Handle close button
      const closeBtn = e.target.closest('.transition-bar-horizontal-close');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        this.closeActiveBar();
        return;
      }
      // Handle transition execution button
      const transitionExecBtn = e.target.closest('.transition-btn-horizontal');
      if (transitionExecBtn && !transitionExecBtn.classList.contains('loading')) {
        e.preventDefault();
        e.stopPropagation();
        const transitionId = transitionExecBtn.dataset.transitionId;
        const transitionName = transitionExecBtn.dataset.transitionName;
        if (transitionId) {
          this.executeTransition(transitionId, transitionName, transitionExecBtn);
        }
        return;
      }
    });
    // Close bar when clicking outside
    document.addEventListener('click', (e) => {
      if (this.activeBar && !e.target.closest('.transition-bar-horizontal') && 
          !e.target.closest('.list-transition-trigger')) {
        this.closeActiveBar();
      }
    });
    // ESC key closes active bar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeBar) {
        this.closeActiveBar();
      }
    });
  }
  /**
   * Toggle transition bar for a specific issue
   */
  async toggleTransitionBar(issueKey, row) {
    console.log('🔄 Toggling transition bar for:', issueKey);
    // If clicking the same row, just close
    if (this.currentIssueKey === issueKey && this.activeBar) {
      this.closeActiveBar();
      return;
    }
    // Close any existing bar first
    if (this.activeBar) {
      this.closeActiveBar();
    }
    // Store current issue
    this.currentIssueKey = issueKey;
    // Create and show bar with loading state
    this.createTransitionBar(issueKey, row);
    // Fetch transitions
    await this.fetchAndDisplayTransitions(issueKey);
  }
  /**
   * Create the horizontal transition bar DOM
   */
  createTransitionBar(issueKey, row) {
    // Get the number of columns in the table
    const colCount = row.cells.length;
    // Create a new row for the transition bar
    const transitionRow = document.createElement('tr');
    transitionRow.className = 'transition-row';
    transitionRow.dataset.issueKey = issueKey;
    // Create a single cell that spans all columns
    const transitionCell = document.createElement('td');
    transitionCell.colSpan = colCount;
    transitionCell.style.padding = '0';
    transitionCell.style.background = 'transparent';
    // Create the transition bar
    const bar = document.createElement('div');
    bar.className = 'transition-bar-horizontal show';
    bar.innerHTML = `
      <div class="transition-bar-horizontal-header">
        <div class="transition-bar-horizontal-title">
          ${SVGIcons.zap({size:16,className:'inline-icon'})} Transitions
          <span class="transition-bar-horizontal-ticket">${issueKey}</span>
        </div>
        <button class="transition-bar-horizontal-close" title="Close">${SVGIcons.close({size:14,className:'inline-icon'})}</button>
      </div>
      <div class="transition-bar-horizontal-content">
        <div class="transition-bar-horizontal-loading">
          <div class="transition-skeleton"></div>
          <div class="transition-skeleton"></div>
          <div class="transition-skeleton"></div>
        </div>
      </div>
    `;
    // Assemble the structure
    transitionCell.appendChild(bar);
    transitionRow.appendChild(transitionCell);
    // Insert the transition row right after the current row
    row.parentNode.insertBefore(transitionRow, row.nextSibling);
    // Store reference
    this.activeBar = { row, transitionRow };
    console.log('✅ Transition bar created below row for:', issueKey);
  }
  /**
   * Fetch transitions from API and display them
   */
  async fetchAndDisplayTransitions(issueKey) {
    try {
      console.log('📡 Fetching transitions for:', issueKey);
      const response = await fetch(`/api/issues/${issueKey}/transitions`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.success || !data.data || !data.data.transitions) {
        throw new Error('Invalid response format');
      }
      this.availableTransitions = data.data.transitions;
      console.log(`✅ Loaded ${this.availableTransitions.length} transitions`);
      this.displayTransitions();
    } catch (error) {
      console.error('❌ Error fetching transitions:', error);
      this.displayError(error.message);
    }
  }
  /**
   * Display transitions in the bar
   */
  displayTransitions() {
    if (!this.activeBar || !this.activeBar.transitionRow) return;
    const content = this.activeBar.transitionRow.querySelector('.transition-bar-horizontal-content');
    if (!content) return;
    if (this.availableTransitions.length === 0) {
      content.innerHTML = `
        <div class="transition-bar-horizontal-empty">
          No transitions available for this ticket
        </div>
      `;
      return;
    }
    // Generate transition buttons
    const buttonsHtml = this.availableTransitions.map(transition => `
      <button 
        class="transition-btn-horizontal"
        data-transition-id="${transition.id}"
        data-transition-name="${transition.name}"
        title="${transition.name}"
      >
        <span class="transition-btn-horizontal-content">
          ${this.getTransitionIcon(transition.name)} ${transition.name}
        </span>
      </button>
    `).join('');
    content.innerHTML = buttonsHtml;
    console.log(`✅ Displayed ${this.availableTransitions.length} transitions`);
  }
  /**
   * Display error message
   */
  displayError(message) {
    if (!this.activeBar || !this.activeBar.transitionRow) return;
    const content = this.activeBar.transitionRow.querySelector('.transition-bar-horizontal-content');
    if (!content) return;
    content.innerHTML = `
      <div class="transition-bar-horizontal-empty" style="color: #ef4444;">
        ⚠️ Error loading transitions: ${message}
      </div>
    `;
  }
  /**
   * Execute a transition
   */
  async executeTransition(transitionId, transitionName, button) {
    console.log('🎯 executeTransition called:', { transitionId, transitionName, issueKey: this.currentIssueKey });
    if (this.isExecutingTransition) {
      console.warn('⚠️ Transition already in progress');
      return;
    }
    // Find transition to check if it has required fields
    const transition = this.availableTransitions.find(t => t.id === transitionId);
    console.log('🔍 Transition found:', transition);
    if (transition?.hasFields) {
      console.log('📋 Transition requires fields - showing modal');
      const formData = await this.showFieldsModal(transition);
      if (!formData) {
        console.log('❌ Transition cancelled by user');
        return;
      }
      // Continue with formData
      this.performTransition(transitionId, transitionName, button, formData);
    } else {
      // Execute transition directly
      this.performTransition(transitionId, transitionName, button, null);
    }
  }
  async performTransition(transitionId, transitionName, button, formData = null) {
    if (this.isExecutingTransition) {
      console.warn('⚠️ Transition already in progress');
      return;
    }
    this.isExecutingTransition = true;
    button.classList.add('loading');
    console.log(`🚀 Executing transition: ${transitionName} (${transitionId}) for ${this.currentIssueKey}`);
    try {
      const requestBody = { transitionId: transitionId };
      if (formData) {
        // formData has structure { fields: {...}, comments: {...} }
        if (formData.fields && Object.keys(formData.fields).length > 0) {
          requestBody.fields = formData.fields;
        }
        // Store comments for later use (if needed)
        if (formData.comments) {
          requestBody.comments = formData.comments;
        }
      }
      console.log('📤 Request body:', requestBody);
      const response = await fetch(`/api/issues/${this.currentIssueKey}/transitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Transition failed');
      }
      console.log('✅ Transition executed successfully');
      // Show success state
      button.classList.remove('loading');
      button.classList.add('success');
      button.textContent = `✓ ${transitionName}`;
      // Wait a bit then reload
      setTimeout(() => {
        console.log('🔄 Reloading issues after transition...');
        this.closeActiveBar();
        // Trigger reload of list view
        if (window.renderView) {
          window.renderView();
        } else if (window.renderList) {
          window.renderList();
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Transition error:', error);
      button.classList.remove('loading');
      button.classList.add('error');
      // Show error notification
      if (window.showToast) {
        window.showToast(`❌ Transition failed: ${error.message}`, 'error');
      }
      // Reset button after 2 seconds
      setTimeout(() => {
        button.classList.remove('error');
        button.textContent = `${this.getTransitionIcon(transitionName)} ${transitionName}`;
      }, 2000);
    } finally {
      this.isExecutingTransition = false;
    }
  }
  /**
   * Close the active transition bar
   */
  closeActiveBar() {
    if (!this.activeBar) return;
    console.log('🚪 Closing transition bar');
    const bar = this.activeBar.transitionRow?.querySelector('.transition-bar-horizontal');
    if (bar) {
      bar.classList.remove('show');
      bar.style.animation = 'slideUp 0.2s ease';
    }
    setTimeout(() => {
      if (this.activeBar && this.activeBar.transitionRow) {
        // Remove the transition row completely
        this.activeBar.transitionRow.remove();
      }
      this.activeBar = null;
      this.currentIssueKey = null;
      this.availableTransitions = [];
    }, 200);
  }
  /**
   * Get icon for transition name
   */
  getTransitionIcon(transitionName) {
    const name = transitionName.toLowerCase();
    if (name.includes('asig') || name.includes('assign')) return '👤';
    if (name.includes('progres') || name.includes('progress')) return '🔄';
    if (name.includes('resu') || name.includes('resolve')) return '✅';
    if (name.includes('cerr') || name.includes('close') || name.includes('done')) return '✔️';
    if (name.includes('reabr') || name.includes('reopen')) return '🔓';
    if (name.includes('escal') || name.includes('escalate')) return '⬆️';
    if (name.includes('cancel')) return '🚫';
    if (name.includes('recha') || name.includes('reject')) return '❌';
    if (name.includes('apro') || name.includes('approve')) return '✓';
    if (name.includes('revi') || name.includes('review')) return '👀';
    if (name.includes('pend') || name.includes('wait')) return '⏳';
    if (name.includes('bloq') || name.includes('block')) return '🔒';
    if (name.includes('pausa') || name.includes('pause')) return '⏸️';
    return '➡️'; // Default arrow
  }
  /**
   * Show modal to collect required fields for transition
   */
  async showFieldsModal(transition) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'transition-fields-modal';
      modal.innerHTML = `
        <div class="transition-fields-overlay"></div>
        <div class="transition-fields-content">
          <div class="transition-fields-header">
            <h3>${this.getTransitionIcon(transition.name)} ${this.escapeHtml(transition.name)}</h3>
            <p>Complete los campos requeridos para esta transición</p>
          </div>
          <form class="transition-fields-form" id="transitionFieldsForm">
            ${this.renderTransitionFields(transition.fields, transition.name)}
          </form>
          <div class="transition-fields-actions">
            <button type="button" class="btn-cancel" id="cancelFieldsBtn">Cancelar</button>
            <button type="button" class="btn-submit" id="submitFieldsBtn">Ejecutar Transición</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
      const cancelBtn = modal.querySelector('#cancelFieldsBtn');
      const overlay = modal.querySelector('.transition-fields-overlay');
      const cancelHandler = () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
        resolve(null);
      };
      cancelBtn.addEventListener('click', cancelHandler);
      overlay.addEventListener('click', cancelHandler);
      const submitBtn = modal.querySelector('#submitFieldsBtn');
      submitBtn.addEventListener('click', () => {
        const formData = this.collectFormData(modal);
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
        resolve(formData);
      });
    });
  }
  /**
   * Render form fields
   */
  renderTransitionFields(fields, transitionName = '') {
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
          ${this.renderFieldInput(fieldKey, field, fieldType, transitionName)}
        </div>
      `;
    }).join('');
  }
  /**
   * Render field input
   */
  renderFieldInput(fieldKey, field, fieldType, transitionName = '') {
    const placeholder = field.required ? 'Campo requerido' : 'Opcional';
    const template = this.getSolutionTemplate(transitionName, field.name || fieldKey);
    const isTextArea = !field.allowedValues || field.allowedValues.length === 0;
    if (isTextArea && fieldType !== 'number' && fieldType !== 'boolean') {
      const hasTemplate = template !== '';
      const rows = hasTemplate ? 12 : 8;
      return `
        <div class="field-input-container">
          <textarea 
            id="field_${fieldKey}" 
            name="${fieldKey}"
            placeholder="${placeholder}"
            rows="${rows}"
            ${field.required ? 'required' : ''}>${template}</textarea>
          ${hasTemplate ? `
            <div class="field-hint">💡 Plantilla precargada - edita según necesites</div>
            <div class="field-checkbox">
              <label>
                <input type="checkbox" id="comment_${fieldKey}" name="comment_${fieldKey}" checked />
                <span>📝 Agregar también como comentario público</span>
              </label>
            </div>
          ` : ''}
        </div>
      `;
    }
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
   * Get solution template
   */
  getSolutionTemplate(transitionName = '', fieldName = '') {
    const transitionLower = transitionName.toLowerCase();
    const fieldLower = fieldName.toLowerCase();
    if ((transitionLower.includes('resolver') || transitionLower.includes('validaci') || transitionLower.includes('soluci')) &&
        fieldLower.includes('adjunt')) {
      return `📋 DETALLES DE LA SOLUCIÓN
🔍 Problema Identificado:
[Describe brevemente el problema que se encontró]
✅ Solución Aplicada:
[Explica qué se hizo para resolver el problema]
🛠️ Acciones Realizadas:
1. [Primera acción]
2. [Segunda acción]
3. [Tercera acción]
✓ Resultado:
[Confirma que el problema está resuelto]
📝 Notas Adicionales:
[Cualquier información relevante para el cliente o equipo]`;
    }
    return '';
  }
  /**
   * Collect form data
   */
  collectFormData(modal) {
    const form = modal.querySelector('#transitionFieldsForm');
    const fields = {};
    const comments = {};
    form.querySelectorAll('textarea, input[type="text"], select').forEach(input => {
      const fieldKey = input.name;
      if (fieldKey && input.value) {
        fields[fieldKey] = input.value;
      }
    });
    form.querySelectorAll('input[type="checkbox"][id^="comment_"]').forEach(checkbox => {
      if (checkbox.checked) {
        const fieldKey = checkbox.name.replace('comment_', '');
        comments[fieldKey] = true;
      }
    });
    return { fields, comments };
  }
  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
// Animation for closing
const listHorizontalTransitionStyle = document.createElement('style');
listHorizontalTransitionStyle.textContent = `
  @keyframes slideUp {
    from {
      opacity: 1;
      transform: translateY(0) scaleY(1);
    }
    to {
      opacity: 0;
      transform: translateY(-10px) scaleY(0.9);
    }
  }
`;
document.head.appendChild(listHorizontalTransitionStyle);
// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.listViewTransitions = new ListViewTransitions();
    window.listViewTransitions.init();
  });
} else {
  window.listViewTransitions = new ListViewTransitions();
  window.listViewTransitions.init();
}
console.log('📦 ListViewTransitions module loaded');
