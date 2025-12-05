/**
 * Smart Filters Module
 * Provides quick access to common filter presets
 */

class SmartFilters {
  constructor() {
    this.filters = this.defineFilters();
    this.init();
  }

  init() {
    console.log('🎯 Smart Filters module initialized');
  }

  /**
   * Define available smart filters
   */
  defineFilters() {
    return [
      {
        id: 'updated-today',
        name: 'Updated Today',
        icon: '📅',
        description: 'Tickets updated in the last 24 hours',
        filter: (issue) => {
          const updated = new Date(issue.last_real_change || issue.updated || issue.created);
          const now = new Date();
          const diffHours = (now - updated) / (1000 * 60 * 60);
          return diffHours <= 24;
        }
      },
      {
        id: 'high-priority-unassigned',
        name: 'High Priority Unassigned',
        icon: '🔴',
        description: 'Critical/High priority tickets without assignee',
        filter: (issue) => {
          const isUnassigned = !issue.assignee || issue.assignee === 'Unassigned' || issue.assignee === 'No assignee';
          const isHighPriority = issue.severity === 'Critico' || issue.severity === 'Alto';
          return isUnassigned && isHighPriority;
        }
      },
      {
        id: 'needs-response',
        name: 'Needs Response',
        icon: '💬',
        description: 'Tickets with recent comments (in progress)',
        filter: (issue) => {
          return false;
        },
        disabled: true
      },
      {
        id: 'stale',
        name: 'Stale (7+ days)',
        icon: '⏰',
        description: 'Tickets without updates for 7+ days',
        filter: (issue) => {
          const updated = new Date(issue.last_real_change || issue.updated || issue.created);
          const now = new Date();
          const diffDays = (now - updated) / (1000 * 60 * 60 * 24);
          return diffDays >= 7;
        }
      },
      {
        id: 'my-assigned',
        name: 'My Assigned',
        icon: '👤',
        description: 'Tickets assigned to me',
        filter: (issue) => {
          const currentUser = window.state?.currentUser || 'You';
          return issue.assignee && issue.assignee.toLowerCase().includes(currentUser.toLowerCase());
        }
      },
      {
        id: 'critical-all',
        name: 'All Critical',
        icon: '🚨',
        description: 'All critical priority tickets',
        filter: (issue) => {
          return issue.severity === 'Critico';
        }
      },
      {
        id: 'new-today',
        name: 'Created Today',
        icon: '✨',
        description: 'Tickets created in the last 24 hours',
        filter: (issue) => {
          const created = new Date(issue.created);
          const now = new Date();
          const diffHours = (now - created) / (1000 * 60 * 60);
          return diffHours <= 24;
        }
      }
    ];
  }

  /**
   * Get all available filters
   */
  getFilters() {
    return this.filters.filter(f => !f.disabled);
  }

  /**
   * Apply a smart filter
   */
  applyFilter(filterId) {
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) {
      console.error(`Filter ${filterId} not found`);
      return;
    }

    console.log(`🎯 Applying smart filter: ${filter.name}`);

    // Get all issues from cache
    const allIssues = window.app?.issuesCache 
      ? Array.from(window.app.issuesCache.values()) 
      : [];

    if (allIssues.length === 0) {
      alert('No issues loaded. Please select a queue first.');
      return;
    }

    // Apply filter
    const filteredIssues = allIssues.filter(filter.filter);

    console.log(`✓ Filter result: ${filteredIssues.length} / ${allIssues.length} tickets`);

    // Trigger re-render with filtered issues
    if (window.renderKanbanBoard) {
      // Store original issues for restoration
      if (!window.app.originalIssues) {
        window.app.originalIssues = allIssues;
      }
      
      // Render filtered view
      window.renderKanbanBoard(filteredIssues);
      
      // Show filter badge
      this.showActiveFilterBadge(filter, filteredIssues.length, allIssues.length);
    }
  }

  /**
   * Clear active filter and restore original view
   */
  clearFilter() {
    if (window.app.originalIssues) {
      console.log('🎯 Clearing smart filter');
      window.renderKanbanBoard(window.app.originalIssues);
      window.app.originalIssues = null;
      this.hideActiveFilterBadge();
    }
  }

  /**
   * Show active filter badge in header
   */
  showActiveFilterBadge(filter, matchCount, totalCount) {
    // Remove existing badge
    this.hideActiveFilterBadge();

    const badge = document.createElement('div');
    badge.id = 'smartFilterBadge';
    badge.className = 'smart-filter-badge';
    badge.innerHTML = `
      <span class="badge-icon">${filter.icon}</span>
      <span class="badge-text">${filter.name}: ${matchCount}/${totalCount}</span>
      <button class="badge-clear" onclick="window.smartFilters.clearFilter()">✕</button>
    `;

    // Insert after header actions or in header
    const header = document.querySelector('.kanban-header') || document.querySelector('header');
    if (header) {
      header.appendChild(badge);
    }
  }

  /**
   * Hide active filter badge
   */
  hideActiveFilterBadge() {
    const badge = document.getElementById('smartFilterBadge');
    if (badge) badge.remove();
  }

  /**
   * Open smart filters menu
   */
  openMenu() {
    // Check if modal already exists
    if (document.getElementById('smartFiltersModal')) {
      return;
    }

    const filters = this.getFilters();
    
    const modal = document.createElement('div');
    modal.id = 'smartFiltersModal';
    modal.className = 'smart-filters-modal';
    modal.innerHTML = `
      <div class="smart-filters-overlay" onclick="window.smartFilters.closeMenu()"></div>
      <div class="smart-filters-content">
        <div class="smart-filters-header">
          <h2>🎯 Smart Filters</h2>
          <p class="smart-filters-subtitle">Quick access to common filter presets</p>
          <button class="smart-filters-close" onclick="window.smartFilters.closeMenu()">✕</button>
        </div>
        <div class="smart-filters-body">
          ${filters.map(filter => `
            <div class="smart-filter-item" onclick="window.smartFilters.applyFilter('${filter.id}'); window.smartFilters.closeMenu();">
              <div class="filter-icon">${filter.icon}</div>
              <div class="filter-info">
                <div class="filter-name">${filter.name}</div>
                <div class="filter-description">${filter.description}</div>
              </div>
              <div class="filter-arrow">→</div>
            </div>
          `).join('')}
        </div>
        ${window.app.originalIssues ? `
          <div class="smart-filters-footer">
            <button class="smart-filter-clear-btn" onclick="window.smartFilters.clearFilter(); window.smartFilters.closeMenu();">
              Clear Active Filter
            </button>
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
  }

  /**
   * Close smart filters menu
   */
  closeMenu() {
    const modal = document.getElementById('smartFiltersModal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  window.smartFilters = new SmartFilters();
  console.log('✅ Smart Filters ready');
});
