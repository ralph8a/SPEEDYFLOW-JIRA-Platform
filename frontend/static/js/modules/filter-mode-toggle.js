/**
 * SPEEDYFLOW - Filter Mode Toggle
 * Toggle between normal and compact filter modes
 */

class FilterModeToggle {
  constructor() {
    this.currentMode = this.loadMode();
    this.init();
  }

  /**
   * Initialize the toggle system
   */
  init() {
    this.createToggleButton();
    this.applyMode(this.currentMode);
  }

  /**
   * Create toggle button
   */
  createToggleButton() {
    const filterBar = document.querySelector('.filter-bar-enhanced');
    if (!filterBar) return;

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'filterModeToggle';
    toggleBtn.className = 'filter-mode-toggle-btn';
    toggleBtn.title = 'Toggle filter mode';
    toggleBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
      </svg>
    `;

    // Add styles
    toggleBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 6px;
      padding: 6px;
      cursor: pointer;
      color: #1f2937;
      transition: all 0.2s ease;
      z-index: 10;
    `;

    // Hover effect
    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.background = 'rgba(59, 130, 246, 0.15)';
      toggleBtn.style.transform = 'scale(1.05)';
    });

    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.background = 'rgba(59, 130, 246, 0.1)';
      toggleBtn.style.transform = 'scale(1)';
    });

    // Click handler
    toggleBtn.addEventListener('click', () => {
      this.toggleMode();
    });

    // Add to filter bar
    filterBar.style.position = 'relative';
    filterBar.appendChild(toggleBtn);
  }

  /**
   * Toggle between modes
   */
  toggleMode() {
    this.currentMode = this.currentMode === 'normal' ? 'compact' : 'normal';
    this.applyMode(this.currentMode);
    this.saveMode(this.currentMode);
  }

  /**
   * Apply filter mode
   */
  applyMode(mode) {
    const filterBarEnhanced = document.querySelector('.filter-bar-enhanced');
    let filterBarCompact = document.querySelector('.filter-bar-compact');
    const toggleBtn = document.getElementById('filterModeToggle');

    if (!filterBarEnhanced) return;

    // Ensure compact filter bar exists
    if (!filterBarCompact && window.compactFilterManager) {
      // Wait for compact filter to be created
      setTimeout(() => this.applyMode(mode), 100);
      return;
    }

    if (mode === 'compact') {
      // Hide normal filter bar
      filterBarEnhanced.style.display = 'none';
      
      // Show compact filter bar
      if (filterBarCompact) {
        filterBarCompact.style.display = 'flex';
      } else {
        // Force creation if needed
        if (window.compactFilterManager) {
          window.compactFilterManager.createCompactFilterBar();
          filterBarCompact = document.querySelector('.filter-bar-compact');
          if (filterBarCompact) {
            filterBarCompact.style.display = 'flex';
          }
        }
      }
      
      // Update toggle button icon
      if (toggleBtn) {
        toggleBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
          </svg>
        `;
        toggleBtn.title = 'Switch to normal filter';
      }
      
    } else {
      // Show normal filter bar
      filterBarEnhanced.style.display = 'flex';
      
      // Hide compact filter bar
      if (filterBarCompact) {
        filterBarCompact.style.display = 'none';
      }
      
      // Update toggle button icon
      if (toggleBtn) {
        toggleBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        `;
        toggleBtn.title = 'Switch to compact filter';
      }
    }

    this.currentMode = mode;
  }

  /**
   * Save mode to localStorage
   */
  saveMode(mode) {
    localStorage.setItem('speedyflow_filter_mode', mode);
  }

  /**
   * Load mode from localStorage
   */
  loadMode() {
    return localStorage.getItem('speedyflow_filter_mode') || 'normal';
  }

  /**
   * Get current mode
   */
  getCurrentMode() {
    return this.currentMode;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.filterModeToggle = new FilterModeToggle();
    
    // Auto-enable compact mode for testing
    setTimeout(() => {
      if (window.filterModeToggle) {
        console.log('🔧 Filter mode toggle ready. Current mode:', window.filterModeToggle.getCurrentMode());
        // Uncomment to auto-switch to compact mode:
        // window.filterModeToggle.applyMode('compact');
      }
    }, 1000);
  }, 500);
});

// Export for external use
window.FilterModeToggle = FilterModeToggle;