/**
 * SIDEBAR COLLAPSE SYSTEM
 * Handles sidebar collapse/expand functionality and auto-collapse on actions
 */

class SidebarCollapse {
  constructor() {
    this.sidebar = document.getElementById('sidebar');
    this.sidebarToggle = document.getElementById('sidebarToggle');
    this.isCollapsed = false;
    this.autoCollapseDelay = 500; // ms after action

    this.init();
  }

  /**
   * Initialize sidebar collapse system
   */
  init() {
    if (!this.sidebar || !this.sidebarToggle) {
      console.warn('Sidebar or toggle button not found');
      return;
    }

    // Load collapse state from localStorage
    this.loadState();

    // Attach toggle button listener
    this.sidebarToggle.addEventListener('click', () => this.toggle());

    // Attach listeners to action buttons
    this.attachActionListeners();

    // Listen for window resize to handle responsive behavior
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * Toggle sidebar collapse/expand
   */
  toggle() {
    if (this.isCollapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  /**
   * Collapse the sidebar
   */
  collapse() {
    if (this.isCollapsed) return;

    this.sidebar.classList.add('collapsed');
    this.isCollapsed = true;
    this.saveState();

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('sidebarCollapsed'));
  }

  /**
   * Expand the sidebar
   */
  expand() {
    if (!this.isCollapsed) return;

    this.sidebar.classList.remove('collapsed');
    this.isCollapsed = false;
    this.saveState();

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('sidebarExpanded'));
  }

  /**
   * Auto-collapse sidebar after action (with delay)
   */
  autoCollapse() {
    // Only auto-collapse on desktop (not mobile)
    if (window.innerWidth < 768) return;

    // Simple collapse without animation flicker
    setTimeout(() => {
      this.collapse();
    }, this.autoCollapseDelay);
  }

  /**
   * Attach listeners to action buttons
   */
  attachActionListeners() {
    // New Ticket button
    const newTicketBtn = document.querySelector('button[onclick="app.newTicket()"]');
    if (newTicketBtn) {
      newTicketBtn.addEventListener('click', () => this.autoCollapse());
    }

    // Queue selection change
    const queueSelect = document.getElementById('queueSelect');
    if (queueSelect) {
      queueSelect.addEventListener('change', () => {
        // Small delay to let the action complete
        setTimeout(() => this.autoCollapse(), 100);
      });
    }

    // Service Desk selection change
    const deskSelect = document.getElementById('serviceDeskSelect');
    if (deskSelect) {
      deskSelect.addEventListener('change', () => {
        setTimeout(() => this.autoCollapse(), 100);
      });
    }

    // Refresh button
    const refreshBtn = document.querySelector('button[onclick="app.refreshData()"]');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        setTimeout(() => this.autoCollapse(), 300);
      });
    }

    // Theme toggle
    const themeBtn = document.querySelector('button[onclick="app.toggleDarkMode()"]');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        setTimeout(() => this.autoCollapse(), 100);
      });
    }

    // If there's a close/apply button in modals, also trigger collapse
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-close') || 
          e.target.classList.contains('modal-submit')) {
        setTimeout(() => this.autoCollapse(), 100);
      }
    });
  }

  /**
   * Save collapse state to localStorage
   */
  saveState() {
    // Disabled - don't persist state
    // localStorage.setItem('sidebarCollapsed', JSON.stringify(this.isCollapsed));
  }

  /**
   * Load collapse state from localStorage
   */
  loadState() {
    // Disabled - always start expanded
    // const saved = localStorage.getItem('sidebarCollapsed');
    // if (saved !== null) {
    //   this.isCollapsed = JSON.parse(saved);
    //   if (this.isCollapsed) {
    //     this.sidebar.classList.add('collapsed');
    //   }
    // }
    this.isCollapsed = false;
  }

  /**
   * Handle window resize for responsive behavior
   */
  handleResize() {
    // On mobile, always collapse
    if (window.innerWidth < 768) {
      if (!this.isCollapsed) {
        this.collapse();
      }
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.sidebarCollapse = new SidebarCollapse();
  });
} else {
  window.sidebarCollapse = new SidebarCollapse();
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SidebarCollapse;
}
