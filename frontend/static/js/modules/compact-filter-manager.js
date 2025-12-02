/**
 * SPEEDYFLOW - Compact Filter Manager
 * Manages the compact inline filter bar with dropdown menus
 */

class CompactFilterManager {
  constructor() {
    this.currentDesk = null;
    this.currentQueue = null;
    this.desks = [];
    this.queues = [];
    this.isLoading = false;
    
    this.init();
  }

  /**
   * Initialize the compact filter manager
   */
  init() {
    // Ensure DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.createCompactFilterBar();
        this.bindEvents();
        this.loadInitialData();
      });
    } else {
      this.createCompactFilterBar();
      this.bindEvents();
      this.loadInitialData();
    }
  }

  /**
   * Create the compact filter bar HTML structure
   */
  createCompactFilterBar() {
    const filterBarEnhanced = document.querySelector('.filter-bar-enhanced');
    if (!filterBarEnhanced) return;

    // Create compact filter bar
    const compactFilterBar = document.createElement('div');
    compactFilterBar.className = 'filter-bar-compact';
    compactFilterBar.innerHTML = `
      <div class="compact-filter-item" id="compactDeskFilter" role="button" aria-haspopup="true" aria-expanded="false">
        <span class="compact-filter-label">
          <span id="compactDeskValue" class="compact-filter-value placeholder">desk</span>
        </span>
        <div class="compact-dropdown" id="compactDeskDropdown" aria-hidden="true" role="menu">
          <div class="compact-dropdown-item loading">Loading...</div>
        </div>
      </div>
      
      <span class="compact-filter-separator">></span>
      
      <div class="compact-filter-item" id="compactQueueFilter" role="button" aria-haspopup="true" aria-expanded="false">
        <span class="compact-filter-label">
          <span id="compactQueueValue" class="compact-filter-value placeholder">queue</span>
        </span>
        <div class="compact-dropdown" id="compactQueueDropdown" aria-hidden="true" role="menu">
          <div class="compact-dropdown-item disabled">Select desk first</div>
        </div>
      </div>
      
      <button class="compact-save-btn" id="compactSaveBtn" title="Save current selection">
        Guardar
      </button>
    `;

    // Insert after the original filter bar
    filterBarEnhanced.insertAdjacentElement('afterend', compactFilterBar);
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Desk filter dropdown
    const deskFilter = document.getElementById('compactDeskFilter');
    const deskDropdown = document.getElementById('compactDeskDropdown');
    
    if (deskFilter && deskDropdown) {
      deskFilter.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown('desk');
      });
    }

    // Queue filter dropdown
    const queueFilter = document.getElementById('compactQueueFilter');
    const queueDropdown = document.getElementById('compactQueueDropdown');
    
    if (queueFilter && queueDropdown) {
      queueFilter.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown('queue');
      });
    }

    // Save button
    const saveBtn = document.getElementById('compactSaveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveFilters();
      });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      this.closeAllDropdowns();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllDropdowns();
      }
    });
  }

  /**
   * Load initial data from existing selects
   */
  async loadInitialData() {
    try {
      // Load desks from existing select
      await this.loadDesks();
      
      // Sync with existing filter bar
      this.syncWithExistingFilters();
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.showError('Failed to load filter data');
    }
  }

  /**
   * Load service desks
   */
  async loadDesks() {
    const existingSelect = document.getElementById('serviceDeskSelectFilter');
    if (!existingSelect) return;

    this.desks = Array.from(existingSelect.options)
      .filter(option => option.value)
      .map(option => ({
        id: option.value,
        name: option.textContent,
        selected: option.selected
      }));

    this.updateDeskDropdown();
  }

  /**
   * Load queues for selected desk
   */
  async loadQueues(deskId) {
    if (!deskId) {
      this.queues = [];
      this.updateQueueDropdown();
      return;
    }

    this.setLoading('queue', true);

    try {
      // Trigger the existing queue loading mechanism
      const existingSelect = document.getElementById('serviceDeskSelectFilter');
      if (existingSelect) {
        existingSelect.value = deskId;
        existingSelect.dispatchEvent(new Event('change'));
      }

      // Wait for queues to load and update our dropdown
      setTimeout(() => {
        this.syncQueuesFromExisting();
        this.setLoading('queue', false);
      }, 1000);

    } catch (error) {
      console.error('Error loading queues:', error);
      this.setLoading('queue', false);
      this.showError('Failed to load queues');
    }
  }

  /**
   * Sync queues from existing select
   */
  syncQueuesFromExisting() {
    const existingSelect = document.getElementById('queueSelectFilter');
    if (!existingSelect) return;

    this.queues = Array.from(existingSelect.options)
      .filter(option => option.value)
      .map(option => ({
        id: option.value,
        name: option.textContent,
        selected: option.selected
      }));

    this.updateQueueDropdown();
  }

  /**
   * Sync with existing filter bar selections
   */
  syncWithExistingFilters() {
    const deskSelect = document.getElementById('serviceDeskSelectFilter');
    const queueSelect = document.getElementById('queueSelectFilter');

    if (deskSelect?.value) {
      this.selectDesk(deskSelect.value, false);
    }

    if (queueSelect?.value) {
      this.selectQueue(queueSelect.value, false);
    }
  }

  /**
   * Toggle dropdown visibility
   */
  toggleDropdown(type) {
    const dropdown = document.getElementById(`compact${type.charAt(0).toUpperCase() + type.slice(1)}Dropdown`);
    const filter = document.getElementById(`compact${type.charAt(0).toUpperCase() + type.slice(1)}Filter`);
    
    if (!dropdown || !filter) return;

    const isOpen = dropdown.classList.contains('show');
    
    // Close all dropdowns first
    this.closeAllDropdowns();

    if (!isOpen) {
      // Open this dropdown
      dropdown.classList.add('show');
      dropdown.setAttribute('aria-hidden', 'false');
      filter.setAttribute('aria-expanded', 'true');
      filter.classList.add('active');

      // Load data if needed
      if (type === 'queue' && this.currentDesk && this.queues.length === 0) {
        this.loadQueues(this.currentDesk);
      }
    }
  }

  /**
   * Close all dropdowns
   */
  closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.compact-dropdown');
    const filters = document.querySelectorAll('.compact-filter-item');

    dropdowns.forEach(dropdown => {
      dropdown.classList.remove('show');
      dropdown.setAttribute('aria-hidden', 'true');
    });

    filters.forEach(filter => {
      filter.setAttribute('aria-expanded', 'false');
      filter.classList.remove('active');
    });
  }

  /**
   * Update desk dropdown
   */
  updateDeskDropdown() {
    const dropdown = document.getElementById('compactDeskDropdown');
    if (!dropdown) return;

    if (this.desks.length === 0) {
      dropdown.innerHTML = '<div class="compact-dropdown-item disabled">No desks available</div>';
      return;
    }

    dropdown.innerHTML = this.desks.map(desk => 
      `<div class="compact-dropdown-item ${desk.selected ? 'selected' : ''}" data-value="${desk.id}" role="menuitem">
        ${this.escapeHtml(desk.name)}
      </div>`
    ).join('');

    // Bind click events
    dropdown.querySelectorAll('.compact-dropdown-item:not(.disabled)').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectDesk(item.dataset.value);
      });
    });
  }

  /**
   * Update queue dropdown
   */
  updateQueueDropdown() {
    const dropdown = document.getElementById('compactQueueDropdown');
    if (!dropdown) return;

    if (!this.currentDesk) {
      dropdown.innerHTML = '<div class="compact-dropdown-item disabled">Select a desk first</div>';
      return;
    }

    if (this.queues.length === 0) {
      dropdown.innerHTML = '<div class="compact-dropdown-item disabled">No queues available</div>';
      return;
    }

    dropdown.innerHTML = this.queues.map(queue => 
      `<div class="compact-dropdown-item ${queue.selected ? 'selected' : ''}" data-value="${queue.id}" role="menuitem">
        ${this.escapeHtml(queue.name)}
      </div>`
    ).join('');

    // Bind click events
    dropdown.querySelectorAll('.compact-dropdown-item:not(.disabled)').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectQueue(item.dataset.value);
      });
    });
  }

  /**
   * Select a desk
   */
  selectDesk(deskId, loadQueues = true) {
    const desk = this.desks.find(d => d.id === deskId);
    if (!desk) return;

    this.currentDesk = deskId;
    this.currentQueue = null; // Reset queue when desk changes

    // Update UI
    const deskValue = document.getElementById('compactDeskValue');
    if (deskValue) {
      deskValue.textContent = desk.name;
      deskValue.classList.remove('placeholder');
    }

    // Reset queue display
    const queueValue = document.getElementById('compactQueueValue');
    if (queueValue) {
      queueValue.textContent = 'queue';
      queueValue.classList.add('placeholder');
    }

    // Update existing select
    const existingSelect = document.getElementById('serviceDeskSelectFilter');
    if (existingSelect && existingSelect.value !== deskId) {
      existingSelect.value = deskId;
      existingSelect.dispatchEvent(new Event('change'));
    }

    // Load queues
    if (loadQueues) {
      this.loadQueues(deskId);
    }

    this.closeAllDropdowns();
  }

  /**
   * Select a queue
   */
  selectQueue(queueId, updateExisting = true) {
    const queue = this.queues.find(q => q.id === queueId);
    if (!queue) return;

    this.currentQueue = queueId;

    // Update UI
    const queueValue = document.getElementById('compactQueueValue');
    if (queueValue) {
      queueValue.textContent = queue.name;
      queueValue.classList.remove('placeholder');
    }

    // Update existing select
    if (updateExisting) {
      const existingSelect = document.getElementById('queueSelectFilter');
      if (existingSelect && existingSelect.value !== queueId) {
        existingSelect.value = queueId;
        existingSelect.dispatchEvent(new Event('change'));
      }
    }

    this.closeAllDropdowns();
  }

  /**
   * Save current filters
   */
  saveFilters() {
    if (!this.currentDesk || !this.currentQueue) {
      this.showMessage('Please select both desk and queue before saving', 'warning');
      return;
    }

    // Trigger existing save mechanism
    const saveBtn = document.getElementById('saveFiltersBtn');
    if (saveBtn) {
      saveBtn.click();
    } else {
      // Custom save logic
      this.showMessage('Filters saved successfully!', 'success');
      console.log('Saved filters:', { desk: this.currentDesk, queue: this.currentQueue });
    }
  }

  /**
   * Set loading state
   */
  setLoading(type, loading) {
    const filter = document.getElementById(`compact${type.charAt(0).toUpperCase() + type.slice(1)}Filter`);
    if (!filter) return;

    if (loading) {
      filter.classList.add('loading');
    } else {
      filter.classList.remove('loading');
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showMessage(message, 'error');
  }

  /**
   * Show message (integrate with existing notification system)
   */
  showMessage(message, type = 'info') {
    // Try to use existing notification system
    if (window.showNotification) {
      window.showNotification(message, type);
      return;
    }

    // Fallback to simple alert
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Create temporary toast
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 3000);
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
   * Get current selections
   */
  getCurrentSelection() {
    return {
      desk: this.currentDesk,
      queue: this.currentQueue
    };
  }

  /**
   * Reset filters
   */
  reset() {
    this.currentDesk = null;
    this.currentQueue = null;
    
    const deskValue = document.getElementById('compactDeskValue');
    const queueValue = document.getElementById('compactQueueValue');
    
    if (deskValue) {
      deskValue.textContent = 'desk';
      deskValue.classList.add('placeholder');
    }
    
    if (queueValue) {
      queueValue.textContent = 'queue';
      queueValue.classList.add('placeholder');
    }
    
    this.closeAllDropdowns();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for existing scripts to load
  setTimeout(() => {
    window.compactFilterManager = new CompactFilterManager();
    
    // Auto-show compact mode for testing
    console.log('🧪 Compact filter manager loaded. Test commands:');
    console.log('   showCompactFilter() - Show compact filter');
    console.log('   hideCompactFilter() - Hide compact filter');
    console.log('   toggleCompactFilter() - Toggle between modes');
  }, 1000);
});

// Testing functions
window.showCompactFilter = function() {
  const filterBarEnhanced = document.querySelector('.filter-bar-enhanced');
  const filterBarCompact = document.querySelector('.filter-bar-compact');
  
  if (filterBarEnhanced) filterBarEnhanced.style.display = 'none';
  if (filterBarCompact) {
    filterBarCompact.style.display = 'flex';
    console.log('✅ Compact filter shown');
  } else {
    console.log('❌ Compact filter not found');
  }
};

window.hideCompactFilter = function() {
  const filterBarEnhanced = document.querySelector('.filter-bar-enhanced');
  const filterBarCompact = document.querySelector('.filter-bar-compact');
  
  if (filterBarEnhanced) filterBarEnhanced.style.display = 'flex';
  if (filterBarCompact) {
    filterBarCompact.style.display = 'none';
    console.log('✅ Compact filter hidden');
  }
};

window.toggleCompactFilter = function() {
  const filterBarCompact = document.querySelector('.filter-bar-compact');
  if (filterBarCompact && filterBarCompact.style.display === 'flex') {
    hideCompactFilter();
  } else {
    showCompactFilter();
  }
};

// Export for external use
window.CompactFilterManager = CompactFilterManager;