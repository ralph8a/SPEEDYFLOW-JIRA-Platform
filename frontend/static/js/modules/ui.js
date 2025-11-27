/**
 * UI Rendering Module
 * Handles all UI rendering and DOM updates
 * SalesJIRA Application
 */

import { escapeHTML, formatRelativeTime, groupBy, $ } from '../utils/helpers.js';
import { getFilteredIssues, getCurrentView } from '../core/state.js';
import { logger } from '../utils/helpers.js';

// ============================================================
// SLA CACHE MANAGEMENT
// ============================================================

// In-memory SLA cache with 5-minute TTL
let slaCache = {
  data: null,
  timestamp: null,
  TTL: 5 * 60 * 1000  // 5 minutes
};

/**
 * Get SLA configuration from cache or API
 * @param {string} queueId - Queue ID
 * @param {string} deskId - Desk ID
 * @returns {Promise<Object>} SLA targets { critical, high, medium, low } in minutes
 */
async function getSLATargets(queueId, deskId) {
  // Check cache validity
  if (slaCache.data && slaCache.timestamp) {
    const cacheAge = Date.now() - slaCache.timestamp;
    if (cacheAge < slaCache.TTL) {
      logger.debug('Using cached SLA targets');
      return slaCache.data;
    }
  }

  try {
    logger.info(`Fetching SLA targets from API for queue ${queueId}`);
    const response = await fetch(`/api/sla?queue_id=${encodeURIComponent(queueId)}&desk_id=${encodeURIComponent(deskId)}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success && result.sla_targets) {
      // Cache the result
      slaCache.data = result.sla_targets;
      slaCache.timestamp = Date.now();
      logger.info('SLA targets cached successfully');
      return result.sla_targets;
    }
  } catch (error) {
    logger.error(`Error fetching SLA targets: ${error.message}`);
  }

  // Return defaults if API fails
  logger.warn('Using default SLA targets (API unavailable)');
  return {
    critical: 240,    // 4 hours
    high: 240,        // 4 hours
    medium: 480,      // 8 hours
    low: 1440         // 24 hours
  };
}

/**
 * Clear SLA cache (e.g., when switching queues)
 */
function clearSLACache() {
  slaCache.data = null;
  slaCache.timestamp = null;
  logger.debug('SLA cache cleared');
}

// ============================================================
// KANBAN VIEW RENDERING
// ============================================================

/**
 * Render kanban board view
 * @param {Array} issues - Issues to render
 * @param {HTMLElement} container - Container element
 */
export function renderKanbanBoard(issuesOrColumns, container) {
  // Accept either raw issues array (legacy) or kanban payload { columns: [...] }
  let columnsPayload = [];
  if (Array.isArray(issuesOrColumns)) {
    // Legacy fallback: group locally
    const grouped = groupBy(issuesOrColumns, 'status');
    columnsPayload = Object.entries(grouped).map(([status, arr]) => ({ status, name: status, count: arr.length, issues: arr }));
  } else if (issuesOrColumns && Array.isArray(issuesOrColumns.columns)) {
    columnsPayload = issuesOrColumns.columns;
  }

  if (!columnsPayload.length) {
    container.innerHTML = '<div class="empty-state">📭 No issues found</div>';
    return;
  }

  let html = '';
  for (const col of columnsPayload) {
    html += `
      <div class="kanban-column" data-status="${escapeHTML(col.status)}">
        <div class="kanban-column-header">
          <span class="kanban-column-title">${escapeHTML(col.name)}</span>
          <span class="kanban-column-count">${col.count}</span>
        </div>
        <div class="kanban-cards">
          ${(col.issues || []).map(issue => renderIssueCard(issue)).join('')}
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
  logger.debug(`Rendered kanban with ${columnsPayload.reduce((a,c)=>a+c.count,0)} issues across ${columnsPayload.length} columns`);
}

export async function fetchAndRenderKanban({ deskId, queueId, container, includeEmpty = false }) {
  if (!deskId) return;
  const q = queueId || 'all';
  const params = new URLSearchParams({ desk_id: deskId, queue_id: q });
  if (includeEmpty) params.set('include_empty', 'true');
  let data = null;
  try {
    const res = await fetch(`/api/kanban?${params.toString()}`, { credentials: 'include' });
    data = await res.json();
  } catch (e) {
    logger.error('Kanban fetch failed; falling back to legacy issues grouping', e);
    // Fallback: if global issues exist in app state, reuse
    if (window.app && Array.isArray(window.app.currentIssues)) {
      data = { columns: Object.entries(groupBy(window.app.currentIssues, 'status')).map(([status, arr]) => ({ status, name: status, count: arr.length, issues: arr })) };
    }
  }
  renderKanbanBoard(data, container);
}

/**
 * Render a single issue card
 * @param {Object} issue - Issue object
 * @returns {string} HTML string
 */
export function renderIssueCard(issue) {
  const statusClass = getStatusClass(issue.status);
  const priorityClass = issue.priority ? `priority-${issue.priority.toLowerCase()}` : '';
  
  // Format dates
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };
  
  const createdDate = formatDate(issue.created);
  const updatedDate = formatDate(issue.updated);

  return `
    <div class="issue-card" data-key="${escapeHTML(issue.key)}">
      <div class="issue-key">${escapeHTML(issue.key)}</div>
      <div class="issue-summary">${escapeHTML(issue.summary || 'No summary')}</div>
      <div class="issue-meta">
        <span class="status-badge ${statusClass}">${escapeHTML(issue.status)}</span>
        ${issue.priority ? `<span class="priority-badge ${priorityClass}">${escapeHTML(issue.priority)}</span>` : ''}
        <span>👤 ${escapeHTML(issue.assignee || 'Unassigned')}</span>
      </div>
      <div class="issue-dates">
        ${createdDate ? `<span class="date-badge">📅 Created: ${createdDate}</span>` : ''}
        ${updatedDate ? `<span class="date-badge">🔄 Updated: ${updatedDate}</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * Extract SLA display info from JIRA SLA custom field
 * @param {Object} issue - Issue object
 * @returns {Object} Display info with HTML
 */
function getSLADisplayInfo(issue) {
  // SLA display not available yet
  return { html: '' };
}

function calculateSLA(issue) {
  if (!issue.created) {
    return { class: 'sla-unknown', icon: '❓', text: 'No SLA' };
  }

  const createdTime = new Date(issue.created);
  const now = new Date();
  const ageMinutes = (now - createdTime) / (1000 * 60);
  
  // SLA targets based on priority
  let slaMinutes = 480; // Default: 8 hours (Medium)
  if (issue.priority?.toLowerCase() === 'high' || issue.priority?.toLowerCase() === 'critical') {
    slaMinutes = 240; // 4 hours
  } else if (issue.priority?.toLowerCase() === 'low') {
    slaMinutes = 1440; // 24 hours
  }

  const remainingMinutes = slaMinutes - ageMinutes;

  if (remainingMinutes < 0) {
    // SLA breached
    const breachedHours = Math.floor(Math.abs(remainingMinutes) / 60);
    return {
      class: 'sla-breached',
      icon: '⛔',
      text: `${breachedHours}h overdue`
    };
  } else if (remainingMinutes < 60) {
    // Critical: less than 1 hour
    return {
      class: 'sla-critical',
      icon: '🔴',
      text: `${Math.floor(remainingMinutes)}m left`
    };
  } else if (remainingMinutes < 240) {
    // Warning: less than 4 hours
    return {
      class: 'sla-warning',
      icon: '🟡',
      text: `${Math.floor(remainingMinutes / 60)}h left`
    };
  } else {
    // Healthy: more than 4 hours
    return {
      class: 'sla-healthy',
      icon: '✅',
      text: `${Math.floor(remainingMinutes / 60)}h left`
    };
  }
}

/**
 * Get CSS class for status
 * @param {string} status - Issue status
 * @returns {string} CSS class name
 */
function getStatusClass(status) {
  if (!status) return 'status-open';
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('closed') || s.includes('resolved')) return 'status-done';
  if (s.includes('progress') || s.includes('working')) return 'status-progress';
  return 'status-open';
}

// ============================================================
// LIST VIEW RENDERING
// ============================================================

/**
 * Render list view
 * @param {Array} issues - Issues to render
 * @param {HTMLElement} container - Container element
 */
export function renderListView(issues, container) {
  if (!issues || issues.length === 0) {
    container.innerHTML = '<div class="empty-state">📭 No issues found</div>';
    return;
  }

  const grouped = groupBy(issues, 'status');
  let html = '';

  for (const [status, statusIssues] of Object.entries(grouped)) {
    html += `
      <div class="list-group">
        <div class="list-group-header">
          <div class="list-group-header-title">
            <span class="list-group-header-icon">▶</span>
            <span>${escapeHTML(status)} (${statusIssues.length})</span>
          </div>
        </div>
        <div class="list-group-content">
          ${statusIssues.map(issue => renderListItem(issue)).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  logger.debug(`Rendered list view with ${issues.length} issues`);
}

/**
 * Render a single list item
 * @param {Object} issue - Issue object
 * @returns {string} HTML string
 */
function renderListItem(issue) {
  const priorityClass = issue.priority ? `priority-${issue.priority.toLowerCase()}` : '';

  return `
    <div class="list-issue" data-key="${escapeHTML(issue.key)}">
      <div class="list-issue-left">
        <span class="list-issue-key">${escapeHTML(issue.key)}</span>
        <span class="list-issue-summary">${escapeHTML(issue.summary || 'No summary')}</span>
      </div>
      <div class="list-issue-right">
        <span>${escapeHTML(issue.assignee || 'Unassigned')}</span>
        ${issue.priority ? `<span class="priority-badge ${priorityClass}">${escapeHTML(issue.priority)}</span>` : ''}
      </div>
    </div>
  `;
}

// ============================================================
// MODAL RENDERING
// ============================================================

/**
 * Render issue details in right sidebar
 * @param {Object} issue - Issue object
 */
export function renderIssueModal(issue) {
  if (!issue) return;

  const panelIssueKey = document.getElementById('panelIssueKey');
  if (panelIssueKey) {
    panelIssueKey.textContent = issue.key;
  }
  
  // Render summary in header
  const panelSummary = document.getElementById('panelSummary');
  if (panelSummary) {
    panelSummary.innerHTML = `<div class="summary-text">${escapeHTML(issue.summary || 'No summary')}</div>`;
  }
  
  // Helper function to get badge class
  const getPriorityBadgeClass = (priority) => {
    if (!priority) return 'priority-low';
    return `priority-${priority.toLowerCase().replace(/\s+/g, '-')}`;
  };
  
  const bodyHTML = `
    <!-- 2-Column Layout: Details | Comments -->
    <div class="sidebar-grid-2col">
      <!-- LEFT COLUMN: Details -->
      <div class="details-column">
        <!-- Key Details Row: Status | Priority | Assignee -->
        <div class="key-details-row">
          <div class="detail-item-compact">
            <div class="detail-label">Status</div>
            <div class="detail-value">
              <span class="status-badge ${getStatusClass(issue.status)}">${escapeHTML(issue.status || 'Unknown')}</span>
            </div>
          </div>
          <div class="detail-item-compact">
            <div class="detail-label">Priority</div>
            <div class="detail-value">
              ${issue.priority ? `<span class="priority-badge ${getPriorityBadgeClass(issue.priority)}">${escapeHTML(issue.priority)}</span>` : '<span class="priority-badge priority-none">None</span>'}
            </div>
          </div>
          <div class="detail-item-compact">
            <div class="detail-label">Assignee</div>
            <div class="detail-value">${escapeHTML(issue.assignee || 'Unassigned')}</div>
          </div>
        </div>

        <!-- Secondary Details Row: Reporter | Issue Type | Created -->
        <div class="key-details-row">
          <div class="detail-item-compact">
            <div class="detail-label">Reporter</div>
            <div class="detail-value">${escapeHTML(issue.reporter || 'Unknown')}</div>
          </div>
          <div class="detail-item-compact">
            <div class="detail-label">Type</div>
            <div class="detail-value">${escapeHTML(issue.issue_type || 'Task')}</div>
          </div>
          <div class="detail-item-compact">
            <div class="detail-label">Created</div>
            <div class="detail-value">${issue.created ? formatRelativeTime(issue.created) : 'Unknown'}</div>
          </div>
        </div>
        
        <!-- Additional Details Row: Updated -->
        <div class="key-details-row">
          <div class="detail-item-compact">
            <div class="detail-label">Updated</div>
            <div class="detail-value">${issue.updated ? formatRelativeTime(issue.updated) : 'Unknown'}</div>
          </div>
        </div>

        <!-- Description Section (if exists) -->
        ${issue.description ? `
          <div class="detail-card description-section">
            <div class="description-header" onclick="app.toggleDescription(this)">
              <span class="description-toggle">
                <span class="description-toggle-icon">▼</span>
                Description
              </span>
            </div>
            <div class="description-body" style="display: block;">
              <div class="description-content">${escapeHTML(issue.description)}</div>
            </div>
          </div>
        ` : ''}

        <!-- Transitions Section (Full Width) -->
        <div class="transitions-section">
          <div class="transitions-title">Workflow</div>
          <div class="action-dropdown">
            <div class="dropdown-menu" id="transitions-menu-${escapeHTML(issue.key)}" style="display: none;"></div>
            <button class="transitions-button" onclick="app.toggleTransitionsMenu(event, '${escapeHTML(issue.key)}')">
              <span class="transitions-icon">→</span>
              <span class="transitions-label">Change Status</span>
            </button>
          </div>
        </div>

        <!-- Actions Section -->
        <div class="actions-section">
          <div class="actions-title">Actions</div>
          <div class="actions-grid">
            <div class="action-item">
              <button class="action-button" onclick="app.exportToOneNote(event, '${escapeHTML(issue.key)}')">
                <span class="action-icon">📔</span>
                <span class="action-label">Export to OneNote</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Comments -->
      <div class="panel-comments-section">
        <div class="panel-comments-title">💬 Comments</div>
        <div id="commentFormContainer">
          <div class="loading"><div class="loading-spinner"></div></div>
        </div>
        <div id="issueComments">
          <div class="loading"><div class="loading-spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  const panelBody = document.getElementById('panelBody');
  if (panelBody) {
    panelBody.innerHTML = bodyHTML;
  }

  const panel = document.getElementById('issueDetailsPanel');
  if (panel) {
    panel.classList.add('open');
  }
  
  logger.debug(`Rendered sidebar for issue ${issue.key}`);
}

/**
 * Close issue details panel
 */
export function closeIssueModal() {
  const panel = document.getElementById('issueDetailsPanel');
  if (panel) {
    panel.classList.remove('open');
  }
}

// ============================================================
// STATS/DASHBOARD RENDERING
// ============================================================

/**
 * Render dashboard statistics
 * @param {Object} stats - Statistics object
 * @param {HTMLElement} container - Container element
 */
export function renderDashboardStats(stats, container) {
  const html = `
    <div class="stat-card">
      <div class="stat-value">${stats.total || 0}</div>
      <div class="stat-label">Total Issues</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.open || 0}</div>
      <div class="stat-label">Open</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.inProgress || 0}</div>
      <div class="stat-label">In Progress</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.done || 0}</div>
      <div class="stat-label">Done</div>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Update dashboard stats from issues
 * @param {Array} issues - Issues array
 */
export function updateDashboardStats(issues) {
  const stats = {
    total: issues.length,
    open: issues.filter(i => !i.status || !i.status.toLowerCase().includes('done')).length,
    inProgress: issues.filter(i => i.status && i.status.toLowerCase().includes('progress')).length,
    done: issues.filter(i => i.status && i.status.toLowerCase().includes('done')).length,
  };

  const totalIssues = document.getElementById('totalIssues');
  if (totalIssues) totalIssues.textContent = stats.total;

  const openIssues = document.getElementById('openIssues');
  if (openIssues) openIssues.textContent = stats.open;

  const inProgressIssues = document.getElementById('inProgressIssues');
  if (inProgressIssues) inProgressIssues.textContent = stats.inProgress;

  const doneIssues = document.getElementById('doneIssues');
  if (doneIssues) doneIssues.textContent = stats.done;
}

// ============================================================
// FILTER UI RENDERING
// ============================================================

/**
 * Update assignee filter dropdown
 * @param {Array} issues - Issues array
 */
export function updateAssigneeFilter(issues) {
  const select = document.getElementById('assigneeFilter');
  if (!select) return;

  const assignees = [...new Set(issues.map(i => i.assignee).filter(Boolean))].sort();

  // Clear existing options
  while (select.options.length > 1) {
    select.remove(1);
  }

  // Add assignee options
  assignees.forEach(assignee => {
    const option = document.createElement('option');
    option.value = assignee;
    option.textContent = assignee;
    select.appendChild(option);
  });
}

/**
 * Update priority filter dropdown
 * @param {Array} issues - Issues array
 */
export function updatePriorityFilter(issues) {
  const select = document.getElementById('priorityFilter');
  if (!select) return;

  const priorities = [...new Set(issues.map(i => i.priority).filter(Boolean))].sort();

  // Clear existing options
  while (select.options.length > 1) {
    select.remove(1);
  }

  // Add priority options
  priorities.forEach(priority => {
    const option = document.createElement('option');
    option.value = priority;
    option.textContent = priority;
    select.appendChild(option);
  });
}

// ============================================================
// LOADING & ERROR STATES
// ============================================================

/**
 * Show loading state in container
 * @param {HTMLElement} container - Container element
 * @param {string} message - Loading message
 */
export function showLoading(container, message = 'Loading...') {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  if (container) {
    container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>${escapeHTML(message)}</p>
      </div>
    `;
  }
}

/**
 * Show error message
 * @param {string} message - Error message
 * @param {HTMLElement} container - Container element (optional)
 */
export function showError(message, container = null) {
  const errorHTML = `<div class="error">${escapeHTML(message)}</div>`;
  
  if (container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    if (container) {
      container.innerHTML = errorHTML;
    }
  } else {
    const $errorContainer = $('#errorContainer');
    $errorContainer.html(errorHTML);
    setTimeout(() => $errorContainer.empty(), 5000);
  }
  
  logger.error(message);
}

/**
 * Clear error messages
 */
export function clearErrors() {
  $('#errorContainer').empty();
}

// ============================================================
// EMPTY STATE RENDERING
// ============================================================

/**
 * Show empty state
 * @param {HTMLElement} container - Container element
 * @param {string} message - Empty state message
 * @param {string} icon - Icon emoji
 */
export function showEmptyState(container, message = 'No items found', icon = '📭') {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-text">${escapeHTML(message)}</div>
      </div>
    `;
  }
}

// ============================================================
// MAIN RENDER FUNCTION
// ============================================================

/**
 * Render issues based on current view
 */
export function renderIssues() {
  const issues = getFilteredIssues();
  const view = getCurrentView();

  if (view === 'kanban') {
    const container = document.getElementById('kanbanView');
    if (container) {
      renderKanbanBoard(issues, container);
    }
  } else {
    const container = document.getElementById('listView');
    if (container) {
      renderListView(issues, container);
    }
  }

  updateDashboardStats(issues);
}

/**
 * Show a notification message to the user
 * @param {string} message - Message to display
 * @param {string} type - Notification type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showNotification(message, type = 'info', duration = 3000) {
  // Create notification container if it doesn't exist
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  container.appendChild(notification);

  // Remove notification after duration
  const timeoutId = setTimeout(() => {
    notification.classList.add('closing');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, duration);

  // Remove on click
  notification.addEventListener('click', () => {
    clearTimeout(timeoutId);
    notification.classList.add('closing');
    setTimeout(() => {
      notification.remove();
    }, 300);
  });
}

