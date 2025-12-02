/**
 * SPEEDYFLOW - Minimalist Filter Bar Controller
 * Handles toggle between normal and minimalist filter modes
 */

class MinimalistFilterManager {
  constructor() {
    this.isMinimalist = localStorage.getItem('filterMode') === 'minimalist';
    this.filterBar = null;
    this.toggleButton = null;
    
    this.init();
  }

  /**
   * Initialize the minimalist filter manager
   */
  init() {
    this.filterBar = document.querySelector('.filter-bar-enhanced');
    if (!this.filterBar) {
      console.warn('⚠️ Filter bar not found');
      return;
    }

    this.createToggleButton();
    this.setupEventListeners();
    this.applyMode(this.isMinimalist);
    
    console.log('✅ Minimalist Filter Manager initialized');
  }

  /**
   * Create toggle button
   */
  createToggleButton() {
    this.toggleButton = document.createElement('button');
    this.toggleButton.className = 'filter-mode-toggle';
    this.toggleButton.innerHTML = this.isMinimalist ? '📋 Expand' : '🎯 Compact';
    this.toggleButton.title = this.isMinimalist ? 'Switch to expanded filter view' : 'Switch to compact filter view';
    
    // Position relative to filter bar
    this.filterBar.style.position = 'relative';
    this.filterBar.appendChild(this.toggleButton);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', () => {
        this.toggleMode();
      });
    }

    // Monitor filter value changes to show active states
    this.monitorFilterChanges();
    
    // Handle responsive behavior
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  /**
   * Toggle between normal and minimalist modes
   */
  toggleMode() {
    this.isMinimalist = !this.isMinimalist;
    this.applyMode(this.isMinimalist);
    
    // Save preference
    localStorage.setItem('filterMode', this.isMinimalist ? 'minimalist' : 'normal');
    
    // Update button
    this.toggleButton.innerHTML = this.isMinimalist ? '📋 Expand' : '🎯 Compact';
    this.toggleButton.title = this.isMinimalist ? 'Switch to expanded filter view' : 'Switch to compact filter view';
    
    // Log change
    console.log(`🎯 Filter mode changed to: ${this.isMinimalist ? 'minimalist' : 'normal'}`);
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('filterModeChange', {
      detail: { isMinimalist: this.isMinimalist }
    }));
  }

  /**
   * Apply the specified mode
   */
  applyMode(minimalist = false) {
    if (!this.filterBar) return;

    if (minimalist) {
      this.filterBar.classList.add('minimalist');
      this.addActiveStates();
    } else {
      this.filterBar.classList.remove('minimalist');
      this.removeActiveStates();
    }

    // Update layout
    this.updateLayout();
  }

  /**
   * Monitor filter changes to show active states
   */
  monitorFilterChanges() {
    const selects = this.filterBar.querySelectorAll('.filter-select');
    
    selects.forEach(select => {
      select.addEventListener('change', () => {
        this.updateFilterStates();
      });
    });

    // Initial update
    this.updateFilterStates();
  }

  /**
   * Update active states based on filter values
   */
  updateFilterStates() {
    if (!this.isMinimalist) return;

    const filterGroups = this.filterBar.querySelectorAll('.filter-group');
    
    filterGroups.forEach(group => {
      const select = group.querySelector('.filter-select');
      if (select && select.value && select.value !== '') {
        group.classList.add('active');
      } else {
        group.classList.remove('active');
      }
    });
  }

  /**
   * Add active state monitoring
   */
  addActiveStates() {
    this.updateFilterStates();
  }

  /**
   * Remove active states
   */
  removeActiveStates() {
    const filterGroups = this.filterBar.querySelectorAll('.filter-group');
    filterGroups.forEach(group => {
      group.classList.remove('active');
    });
  }

  /**
   * Update layout after mode change
   */
  updateLayout() {
    // Force reflow to ensure smooth transitions
    this.filterBar.offsetHeight;
    
    // Trigger any dependent layout updates
    if (window.layoutManager && typeof window.layoutManager.updateLayout === 'function') {
      window.layoutManager.updateLayout();
    }
  }

  /**
   * Handle responsive behavior
   */
  handleResize() {
    const width = window.innerWidth;
    
    // Auto-switch to minimalist on small screens
    if (width < 768 && !this.isMinimalist) {
      console.log('🔄 Auto-switching to minimalist mode for mobile');
      this.applyMode(true);
      this.toggleButton.innerHTML = '📋 Expand';
    }
  }

  /**
   * Get current mode
   */
  getCurrentMode() {
    return {
      isMinimalist: this.isMinimalist,
      mode: this.isMinimalist ? 'minimalist' : 'normal'
    };
  }

  /**
   * Force mode (for external control)
   */
  setMode(minimalist = false) {
    if (this.isMinimalist !== minimalist) {
      this.toggleMode();
    }
  }

  /**
   * Show loading state for specific filter
   */
  setFilterLoading(filterSelector, loading = true) {
    const filterGroup = this.filterBar.querySelector(`${filterSelector}`).closest('.filter-group');
    if (filterGroup) {
      if (loading) {
        filterGroup.classList.add('loading');
      } else {
        filterGroup.classList.remove('loading');
      }
    }
  }

  /**
   * Add custom tooltip for compact mode
   */
  addTooltips() {
    if (!this.isMinimalist) return;

    const filterGroups = this.filterBar.querySelectorAll('.filter-group');
    
    filterGroups.forEach(group => {
      const label = group.querySelector('.filter-text')?.textContent;
      const select = group.querySelector('.filter-select');
      
      if (label && select) {
        const selectedText = select.options[select.selectedIndex]?.text || 'None selected';
        group.title = `${label}: ${selectedText}`;
      }
    });
  }

  /**
   * Update tooltips when values change
   */
  updateTooltips() {
    if (this.isMinimalist) {
      this.addTooltips();
    }
  }

  /**
   * Testing method - cycle through modes with animation
   */
  testModeSwitch() {
    console.log('🧪 Testing filter mode switch...');
    
    const originalMode = this.isMinimalist;
    
    // Switch to minimalist
    this.setMode(true);
    
    setTimeout(() => {
      // Switch back to normal
      this.setMode(false);
      
      setTimeout(() => {
        // Return to original
        this.setMode(originalMode);
        console.log('✅ Mode switch test completed');
      }, 2000);
    }, 2000);
  }

  /**
   * Performance test - measure render times
   */
  testPerformance() {
    console.log('🔬 Testing filter bar performance...');
    
    const iterations = 10;
    const results = {
      minimalist: [],
      normal: []
    };

    // Test minimalist mode
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      this.applyMode(true);
      const end = performance.now();
      results.minimalist.push(end - start);
    }

    // Test normal mode
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      this.applyMode(false);
      const end = performance.now();
      results.normal.push(end - start);
    }

    const avgMinimalist = results.minimalist.reduce((a, b) => a + b) / iterations;
    const avgNormal = results.normal.reduce((a, b) => a + b) / iterations;

    console.log(`📊 Performance Results:
      Minimalist Mode: ${avgMinimalist.toFixed(2)}ms avg
      Normal Mode: ${avgNormal.toFixed(2)}ms avg
      Performance Gain: ${((avgNormal - avgMinimalist) / avgNormal * 100).toFixed(1)}%`);
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for filter bar to be ready
  const checkFilterBar = () => {
    const filterBar = document.querySelector('.filter-bar-enhanced');
    if (filterBar) {
      window.minimalistFilterManager = new MinimalistFilterManager();
    } else {
      setTimeout(checkFilterBar, 100);
    }
  };
  
  checkFilterBar();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MinimalistFilterManager;
}