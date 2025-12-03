/**
 * Quick Action Button Controller
 * Manages the quick action button menu with Quick Triage and Smart Filters
 */

(function() {
  'use strict';

  let menuOpen = false;

  /**
   * Initialize quick action button
   */
  function initQuickActionButton() {
    const btn = document.getElementById('quickActionBtn');
    if (!btn) {
      console.error('Quick action button not found');
      return;
    }

    console.log('✅ Quick action button found, initializing...');

    // Click handler
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleQuickActionMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (menuOpen && !e.target.closest('.quick-action-menu')) {
        closeQuickActionMenu();
      }
    });

    // Listen for metrics updates
    document.addEventListener('metricsUpdated', function() {
      updateButtonBadge();
    });

    // Initial badge update
    setTimeout(updateButtonBadge, 3000);

    console.log('✅ Quick action button initialized');
  }

  /**
   * Toggle quick action menu
   */
  function toggleQuickActionMenu() {
    if (menuOpen) {
      closeQuickActionMenu();
    } else {
      openQuickActionMenu();
    }
  }

  /**
   * Update button badge with total count
   */
  function updateButtonBadge() {
    const metrics = window.smartMetrics || { triageCount: 0, needsResponseCount: 0, mlSuggestionsCount: 0 };
    const totalCount = metrics.triageCount + metrics.needsResponseCount + metrics.mlSuggestionsCount;
    
    const btn = document.getElementById('quickActionBtn');
    if (!btn) return;

    // Remove existing badge
    const existingBadge = btn.querySelector('.quick-action-btn-badge');
    if (existingBadge) existingBadge.remove();

    // Add badge if count > 0
    if (totalCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'quick-action-btn-badge';
      badge.textContent = totalCount;
      btn.appendChild(badge);
    }
  }

  /**
   * Open quick action menu
   */
  function openQuickActionMenu() {
    // Check if menu already exists
    if (document.getElementById('quickActionMenu')) {
      return;
    }

    const btn = document.getElementById('quickActionBtn');
    const btnRect = btn.getBoundingClientRect();

    const menu = document.createElement('div');
    menu.id = 'quickActionMenu';
    menu.className = 'quick-action-menu';
    menu.style.cssText = `
      position: fixed;
      top: ${btnRect.bottom + 8}px;
      left: ${btnRect.left}px;
      z-index: 9998;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      padding: 8px;
      min-width: 240px;
      animation: slideIn 0.2s ease;
    `;

    // Get metrics from background analytics
    const metrics = window.smartMetrics || { triageCount: 0, needsResponseCount: 0, mlSuggestionsCount: 0 };
    
    const triageBadge = metrics.triageCount > 0 ? `<span class="menu-item-badge">${metrics.triageCount}</span>` : '';
    const needsResponseBadge = metrics.needsResponseCount > 0 ? `<span class="menu-item-badge">${metrics.needsResponseCount}</span>` : '';
    const mlBadge = metrics.mlSuggestionsCount > 0 ? `<span class="menu-item-badge">${metrics.mlSuggestionsCount}</span>` : '';

    menu.innerHTML = `
      <div class="quick-action-menu-header">
        <span class="menu-header-icon">🧠</span>
        <span class="menu-header-text">Smart Functions</span>
      </div>
      <div class="quick-action-menu-item" onclick="window.quickTriage.open(); document.getElementById('quickActionMenu').remove();">
        <div class="menu-item-icon">⚡</div>
        <div class="menu-item-content">
          <div class="menu-item-title">Quick Triage ${triageBadge}</div>
          <div class="menu-item-description">View urgent & unassigned tickets</div>
        </div>
      </div>
      <div class="quick-action-menu-item" onclick="window.smartFilters.openMenu(); document.getElementById('quickActionMenu').remove();">
        <div class="menu-item-icon">🎯</div>
        <div class="menu-item-content">
          <div class="menu-item-title">Smart Filters ${needsResponseBadge}</div>
          <div class="menu-item-description">Quick access to filter presets</div>
        </div>
      </div>
      <div class="quick-action-menu-item" onclick="if (window.AIQueueAnalyzer) { window.AIQueueAnalyzer.analyzeQueue(); document.getElementById('quickActionMenu').remove(); } else { alert('AI Queue Analyzer not available'); }">
        <div class="menu-item-icon">🤖</div>
        <div class="menu-item-content">
          <div class="menu-item-title">Analyze with ML ${mlBadge}</div>
          <div class="menu-item-description">AI-powered queue insights</div>
        </div>
      </div>
    `;

    // Add CSS if not exists
    if (!document.getElementById('quickActionMenuStyles')) {
      const style = document.createElement('style');
      style.id = 'quickActionMenuStyles';
      style.textContent = `
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .quick-action-menu-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px 6px;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 4px;
        }

        .menu-header-icon {
          font-size: 16px;
        }

        .menu-header-text {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .quick-action-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .quick-action-menu-item:hover {
          background: #f3f4f6;
        }

        .menu-item-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .menu-item-content {
          flex: 1;
        }

        .menu-item-title {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 2px;
        }

        .menu-item-description {
          font-size: 12px;
          color: #6b7280;
        }

        .menu-item-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
          margin-left: 6px;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
          animation: badgePulse 2s ease-in-out infinite;
        }

        @keyframes badgePulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        /* Dark theme support */
        .dark-theme .quick-action-menu {
          background: #1f2937 !important;
          border: 1px solid #374151 !important;
        }

        .dark-theme .quick-action-menu-header {
          border-color: #374151 !important;
        }

        .dark-theme .menu-header-text {
          color: #9ca3af !important;
        }

        .dark-theme .quick-action-menu-item:hover {
          background: #111827 !important;
        }

        .dark-theme .menu-item-title {
          color: #f9fafb !important;
        }

        .dark-theme .menu-item-description {
          color: #9ca3af !important;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(menu);
    menuOpen = true;

    console.log('📋 Quick action menu opened');
  }

  /**
   * Close quick action menu
   */
  function closeQuickActionMenu() {
    const menu = document.getElementById('quickActionMenu');
    if (menu) {
      menu.style.animation = 'slideOut 0.2s ease';
      setTimeout(() => menu.remove(), 200);
    }
    menuOpen = false;
    
    // Refresh badge after closing menu (metrics might have changed)
    updateButtonBadge();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickActionButton);
  } else {
    initQuickActionButton();
  }

  console.log('✅ Quick action button controller loaded');
})();
