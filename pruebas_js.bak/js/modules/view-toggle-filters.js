/**
 * SPEEDYFLOW - View Toggle Filters
 * Manages the view-mode style filter interface
 */

class ViewToggleFilters {
  constructor() {
    this.currentDesk = null;
    this.currentQueue = null;
    this.desks = [];
    this.queues = [];
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadDesks();
  }

  bindEvents() {
    // Service Desk Toggle
    const serviceDeskToggle = document.getElementById('serviceDeskToggle');
    if (serviceDeskToggle) {
      serviceDeskToggle.addEventListener('click', (e) => {
        if (e.target.closest('.view-btn')) {
          this.showDeskDropdown(e);
        }
      });
    }

    // Queue Toggle
    const queueToggle = document.getElementById('queueToggle');
    if (queueToggle) {
      queueToggle.addEventListener('click', (e) => {
        if (e.target.closest('.view-btn')) {
          this.showQueueDropdown(e);
        }
      });
    }

    // Save Button
    const saveBtn = document.getElementById('saveFiltersBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveFilters();
      });
    }

    // Header Toggle Buttons
    const compactBtn = document.getElementById('compactModeBtn');
    if (compactBtn) {
      compactBtn.addEventListener('click', () => {
        this.toggleCompactMode();
      });
    }

    // NOTE: ML Dashboard button (mlDashboardBtn) is handled in app.js setupEventListeners()
    // No need to attach listener here - avoid duplicate handlers

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-dropdown')) {
        this.closeAllDropdowns();
      }
    });
  }

  async loadDesks() {
    try {
      // Get desks from existing select or API
      const existingSelect = document.getElementById('serviceDeskSelectFilter');
      if (existingSelect && existingSelect.options.length > 1) {
        this.desks = Array.from(existingSelect.options)
          .filter(option => option.value)
          .map(option => ({
            id: option.value,
            name: option.textContent.trim()
          }));
      } else {
        // Fallback data
        this.desks = [
          { id: 'sd1', name: 'IT Support' },
          { id: 'sd2', name: 'HR Services' },
          { id: 'sd3', name: 'Finance' },
          { id: 'sd4', name: 'General Support' }
        ];
      }
      console.log('✅ Loaded', this.desks.length, 'service desks');
    } catch (error) {
      console.error('❌ Error loading desks:', error);
    }
  }

  async loadQueues(deskId) {
    if (!deskId) {
      this.queues = [];
      return;
    }

    try {
      // Trigger existing queue loading
      const existingSelect = document.getElementById('serviceDeskSelectFilter');
      if (existingSelect) {
        existingSelect.value = deskId;
        existingSelect.dispatchEvent(new Event('change'));
      }

      // Wait for queues to load
      setTimeout(() => {
        const queueSelect = document.getElementById('queueSelectFilter');
        if (queueSelect && queueSelect.options.length > 1) {
          this.queues = Array.from(queueSelect.options)
            .filter(option => option.value)
            .map(option => ({
              id: option.value,
              name: option.textContent.trim()
            }));
        } else {
          // Fallback data
          this.queues = [
            { id: 'q1', name: 'Incidents' },
            { id: 'q2', name: 'Service Requests' },
            { id: 'q3', name: 'Changes' },
            { id: 'q4', name: 'Problems' }
          ];
        }
        console.log('✅ Loaded', this.queues.length, 'queues for desk', deskId);
      }, 500);

    } catch (error) {
      console.error('❌ Error loading queues:', error);
    }
  }

  showDeskDropdown(event) {
    event.preventDefault();
    event.stopPropagation();

    const toggleElement = document.getElementById('serviceDeskToggle');
    if (!toggleElement) return;

    this.closeAllDropdowns();

    // Create dropdown
    const dropdown = this.createDropdown(this.desks, (desk) => {
      this.selectDesk(desk.id, desk.name);
    });

    dropdown.className = 'filter-dropdown desk-dropdown';
    toggleElement.appendChild(dropdown);

    // Position dropdown
    this.positionDropdown(dropdown, toggleElement);
  }

  showQueueDropdown(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.currentDesk) {
      this.showNotification('Please select a Service Desk first', 'warning');
      return;
    }

    const toggleElement = document.getElementById('queueToggle');
    if (!toggleElement) return;

    this.closeAllDropdowns();

    // Load queues if needed
    if (this.queues.length === 0) {
      this.loadQueues(this.currentDesk);
      setTimeout(() => {
        this.showQueueDropdown(event);
      }, 600);
      return;
    }

    // Create dropdown
    const dropdown = this.createDropdown(this.queues, (queue) => {
      this.selectQueue(queue.id, queue.name);
    });

    dropdown.className = 'filter-dropdown queue-dropdown';
    toggleElement.appendChild(dropdown);

    // Position dropdown
    this.positionDropdown(dropdown, toggleElement);
  }

  createDropdown(items, onSelect) {
    const dropdown = document.createElement('div');
    
    if (items.length === 0) {
      dropdown.innerHTML = '<div class="dropdown-item disabled">No items available</div>';
      return dropdown;
    }

    dropdown.innerHTML = items.map(item => 
      `<div class="dropdown-item" data-value="${item.id}">
        <span class="item-icon">📋</span>
        <span class="item-text">${this.escapeHtml(item.name)}</span>
      </div>`
    ).join('');

    // Bind click events
    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown-item');
      if (item && !item.classList.contains('disabled')) {
        const itemId = item.dataset.value;
        const itemData = items.find(i => i.id === itemId);
        if (itemData) {
          onSelect(itemData);
        }
      }
    });

    return dropdown;
  }

  positionDropdown(dropdown, toggleElement) {
    const rect = toggleElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = Math.min(300, dropdown.scrollHeight);

    // Check if dropdown fits below
    if (rect.bottom + dropdownHeight <= viewportHeight) {
      dropdown.style.top = '100%';
      dropdown.style.bottom = 'auto';
    } else {
      dropdown.style.top = 'auto';
      dropdown.style.bottom = '100%';
    }

    dropdown.style.left = '0';
    dropdown.style.right = 'auto';
    dropdown.style.zIndex = '1000';
  }

  selectDesk(deskId, deskName) {
    this.currentDesk = deskId;
    this.currentQueue = null;

    // Update toggle button
    const toggleBtn = document.querySelector('#serviceDeskToggle .view-btn');
    if (toggleBtn) {
      const textElement = toggleBtn.querySelector('.view-text');
      if (textElement) {
        textElement.textContent = deskName;
      }
      toggleBtn.classList.add('active');
      toggleBtn.setAttribute('aria-selected', 'true');
    }

    // Reset queue button
    const queueBtn = document.querySelector('#queueToggle .view-btn');
    if (queueBtn) {
      const queueTextElement = queueBtn.querySelector('.view-text');
      if (queueTextElement) {
        queueTextElement.textContent = 'Select Queue...';
      }
      queueBtn.classList.remove('active');
      queueBtn.setAttribute('aria-selected', 'false');
    }

    // Update hidden select
    const hiddenSelect = document.getElementById('serviceDeskSelectFilter');
    if (hiddenSelect) {
      hiddenSelect.value = deskId;
      hiddenSelect.dispatchEvent(new Event('change'));
    }

    // Load queues
    this.loadQueues(deskId);
    this.closeAllDropdowns();

    // Update breadcrumb
    const breadcrumb = document.getElementById('deskBreadcrumb');
    if (breadcrumb) {
      breadcrumb.textContent = deskName;
    }

    this.showNotification(`Selected: ${deskName}`, 'success');
  }

  selectQueue(queueId, queueName) {
    this.currentQueue = queueId;

    // Update toggle button
    const toggleBtn = document.querySelector('#queueToggle .view-btn');
    if (toggleBtn) {
      const textElement = toggleBtn.querySelector('.view-text');
      if (textElement) {
        textElement.textContent = queueName;
      }
      toggleBtn.classList.add('active');
      toggleBtn.setAttribute('aria-selected', 'true');
    }

    // Update hidden select
    const hiddenSelect = document.getElementById('queueSelectFilter');
    if (hiddenSelect) {
      hiddenSelect.value = queueId;
      hiddenSelect.dispatchEvent(new Event('change'));
    }

    this.closeAllDropdowns();

    // Update breadcrumb
    const breadcrumb = document.getElementById('queueBreadcrumb');
    if (breadcrumb) {
      breadcrumb.textContent = queueName;
    }

    this.showNotification(`Selected: ${queueName}`, 'success');
  }

  saveFilters() {
    if (!this.currentDesk || !this.currentQueue) {
      this.showNotification('Please select both Service Desk and Queue', 'warning');
      return;
    }

    // Visual feedback on diskette button
    const saveBtn = document.getElementById('saveFiltersBtn');
    if (saveBtn) {
      saveBtn.classList.add('saving');
      
      setTimeout(() => {
        saveBtn.classList.remove('saving');
      }, 800);
    }

    this.showNotification('Filters saved successfully!', 'success');

    // Trigger any existing save functionality
    const existingSaveBtn = document.querySelector('[onclick*="save"]');
    if (existingSaveBtn && existingSaveBtn !== saveBtn) {
      existingSaveBtn.click();
    }
  }

  closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.filter-dropdown');
    dropdowns.forEach(dropdown => {
      dropdown.remove();
    });
  }

  showNotification(message, type = 'info') {
    // Update status indicator
    const statusText = document.getElementById('filterStatus');
    if (statusText) {
      statusText.textContent = message;
      statusText.className = `status-text ${type}`;
      
      setTimeout(() => {
        statusText.textContent = 'Ready';
        statusText.className = 'status-text';
      }, 3000);
    }
  }

  toggleCompactMode() {
    const compactBtn = document.getElementById('compactModeBtn');
    if (!compactBtn) return;

    const isActive = compactBtn.classList.contains('active');
    
    if (isActive) {
      compactBtn.classList.remove('active');
      document.body.classList.remove('compact-mode');
      this.showNotification('Compact mode disabled', 'info');
    } else {
      compactBtn.classList.add('active');
      document.body.classList.add('compact-mode');
      this.showNotification('Compact mode enabled', 'success');
    }
  }

  // NOTE: This method is no longer used - ML Dashboard button is handled in app.js
  // Kept for backward compatibility in case other code references it
  triggerAiAnalysis() {
    console.log('⚠️ triggerAiAnalysis called from view-toggle-filters (deprecated)');
    console.log('✅ Use app.js mlDashboardBtn listener instead');
    
    // Delegate to the correct handler
    if (window.mlDashboard) {
      window.mlDashboard.show();
    }
  }

  triggerAiQueueAnalyzer() {
    const mlBtn = document.getElementById('mlAnalyzeBtn');
    if (!mlBtn) {
      return;
    }

    // Get current desk and queue from window.state
    const currentDesk = window.state?.currentDesk;
    const currentQueue = window.state?.currentQueue;
    
    if (!currentDesk || !currentQueue) {
      alert('Por favor selecciona Service Desk y Queue primero');
      return;
    }

    // Visual feedback
    mlBtn.classList.add('active');
    mlBtn.disabled = true;
    const originalHTML = mlBtn.innerHTML;
    mlBtn.innerHTML = '<span class="header-btn-icon">⏳</span><span class="header-btn-text">Analyzing...</span>';

    console.log('📤 Calling AIQueueAnalyzer.analyze()...');

    // Delegate to AIQueueAnalyzer (global instance)
    if (window.aiQueueAnalyzer) {
      // Trigger the analysis
      window.aiQueueAnalyzer.analyze()
        .catch(error => {
          console.error('❌ Analysis error:', error);
          alert(`Error: ${error.message || 'Analysis failed'}`);
        })
        .finally(() => {
          // Restore button
          mlBtn.classList.remove('active');
          mlBtn.innerHTML = originalHTML;
          mlBtn.disabled = false;
          console.log('✅ ML Analysis complete');
        });
    } else {
      console.error('❌ AIQueueAnalyzer not available');
      alert('AI Analyzer module not loaded. Please refresh the page.');
      mlBtn.classList.remove('active');
      mlBtn.innerHTML = originalHTML;
      mlBtn.disabled = false;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.viewToggleFilters = new ViewToggleFilters();
    console.log('✅ View toggle filters loaded');
    
    // Debug: Check if button exists
    const mlBtn = document.getElementById('mlAnalyzeBtn');
    console.log('🤖 ML Analyze button found:', !!mlBtn);
    if (mlBtn) {
      console.log('📌 Button is clickable:', !mlBtn.disabled);
      console.log('📌 Button HTML:', mlBtn.outerHTML.substring(0, 100));
    }
    
    // Debug: Check if AIQueueAnalyzer exists
    console.log('🧠 AIQueueAnalyzer available:', !!window.aiQueueAnalyzer);
    
    // Debug: Check window.state
    console.log('📊 window.state available:', !!window.state);
    if (window.state) {
      console.log('   - currentDesk:', window.state.currentDesk);
      console.log('   - currentQueue:', window.state.currentQueue);
    }
  }, 500);
});