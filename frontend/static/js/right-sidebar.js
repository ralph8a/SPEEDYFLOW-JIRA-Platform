/**
 * SPEEDYFLOW - Right Sidebar Controller
 * Manejo de detalles de tickets, comentarios y actividad
 */

const sidebarState = {
  isOpen: false,
  currentIssue: null,
  currentPanel: 'detailsPanel'
};

// ===== INITIALIZE RIGHT SIDEBAR =====
function initRightSidebar() {
  setupSidebarEventListeners();
  setupPanelTabs();
}

// ===== SETUP EVENT LISTENERS =====
function setupSidebarEventListeners() {
  const rightSidebar = document.getElementById('rightSidebar');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  
  if (!closeSidebarBtn) return;

  // Close button
  closeSidebarBtn.addEventListener('click', closeSidebar);

  // Close on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarState.isOpen) {
      closeSidebar();
    }
  });
}

// ===== SETUP PANEL TABS =====
function setupPanelTabs() {
  // Tabs functionality no longer needed for 2-column layout
  // But keep for future Activity panel switching
  const tabs = document.querySelectorAll('.sidebar-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const panelId = e.target.dataset.panel;
      switchPanel(panelId);
    });
  });
}

// ===== SWITCH PANEL =====
function switchPanel(panelId) {
  // For future use with Activity panel
  const panels = document.querySelectorAll('.sidebar-panel');
  panels.forEach(panel => {
    panel.style.display = panel.id === panelId ? 'flex' : 'none';
  });
}

// ===== OPEN SIDEBAR WITH ISSUE =====
function openIssueDetails(issueKey) {
  const issue = state.issues.find(i => i.key === issueKey);
  if (!issue) {
    console.error('Issue not found:', issueKey);
    return;
  }

  sidebarState.currentIssue = issue;
  
  // Populate details
  populateIssueDetails(issue);
  
  // Load comments and activity
  loadIssueComments(issueKey);
  loadIssueActivity(issueKey);

  // Show sidebar
  const rightSidebar = document.getElementById('rightSidebar');
  rightSidebar.style.display = 'flex';
  sidebarState.isOpen = true;

  // Add class to main-wrapper
  document.querySelector('.main-wrapper').classList.add('sidebar-open');

  // Reset to details panel
  switchPanel('detailsPanel');

  console.log('✅ Opened issue details:', issueKey);
}

// ===== POPULATE ISSUE DETAILS =====
function populateIssueDetails(issue) {
  if (!issue) return;

  // Use the existing HTML elements with IDs
  document.getElementById('detailKey').textContent = issue.key || '—';
  document.getElementById('detailSummary').textContent = issue.summary || issue.fields?.summary || '—';
  
  const status = issue.status || issue.fields?.status?.name || 'Unknown';
  document.getElementById('detailStatus').textContent = status;
  
  // Severity (usar función centralizada de normalización)
  const rawSeverity = issue.severity || issue.fields?.customfield_10020?.value || issue.fields?.customfield_10035?.value;
  const severity = rawSeverity;
  const severityStyle = getSeverityStyle(severity);
  
  const severityEl = document.getElementById('detailSeverity');
  if (severityStyle) {
    severityEl.textContent = severity;
    severityEl.className = `severity-badge ${severityStyle.className}`;
  } else {
    severityEl.textContent = '-';
    severityEl.className = 'severity-badge severity-none';
  }
  
  const assignee = issue.assignee || issue.fields?.assignee?.displayName || issue.assigned_to || 'Unassigned';
  document.getElementById('detailAssignee').textContent = assignee;
  
  document.getElementById('detailType').textContent = issue.type || issue.fields?.issuetype?.name || '—';
  
  // Dates (format YYYY-MM-DD HH:mm)
  const created = issue.created || issue.fields?.created || '—';
  document.getElementById('detailCreated').textContent = formatDate(created);
  
  const updated = issue.updated || issue.fields?.updated || '—';
  document.getElementById('detailUpdated').textContent = formatDate(updated);
  
  // Description
  const description = issue.description || issue.fields?.description || '—';
  document.getElementById('detailDescription').textContent = description;

  // Transitions
  populateTransitions(issue.key);
  
  // Load SLA Monitor
  if (window.slaMonitor) {
    window.slaMonitor.init(issue.key);
    const slaPanel = window.slaMonitor.renderSLAPanel(issue.key);
    const slaContainer = document.getElementById('slaMonitorContainer');
    if (slaContainer) {
      const existingSLA = slaContainer.querySelector('.sla-panel');
      if (existingSLA) existingSLA.replaceWith(slaPanel);
      else slaContainer.appendChild(slaPanel);
    }
  }

  // Load Ticket Portal Forms (from ticket page)
  if (window.ticketPortalForms) {
    (async () => {
      try {
        await window.ticketPortalForms.init(issue.key, 'ticketPortalFormsContainer');
        console.log('✅ Ticket portal forms loaded for:', issue.key);
      } catch (error) {
        console.warn('⚠️ Could not load ticket portal forms:', error);
      }
    })();
  }
}

// ===== POPULATE TRANSITIONS =====
function populateTransitions(issueKey) {
  const transitions = state.issueTransitions[issueKey] || [];
  const transitionsEl = document.getElementById('detailTransitions');

  if (transitions.length === 0) {
    transitionsEl.innerHTML = '<p class="no-transitions">No transitions available</p>';
    return;
  }

  let html = '';
  transitions.forEach(transition => {
    html += `<button class="btn-transition" onclick="performTransition('${issueKey}', ${transition.id}, '${transition.name}')">
      ${transition.name}
    </button>`;
  });
  transitionsEl.innerHTML = html;
}

// ===== LOAD COMMENTS =====
function loadIssueComments(issueKey) {
  const commentsList = document.getElementById('commentsList');
  const commentCount = document.getElementById('commentCount');

  if (!commentsList) {
    console.warn('Comments list element not found');
    return;
  }

  // Show loading state
  commentsList.innerHTML = '<p class="loading">Loading comments...</p>';

  // Fetch from API
  fetch(`/api/issues/${issueKey}/comments`)
    .then(response => response.json())
    .then(data => {
      // Handle different response formats
      let comments = [];
      if (Array.isArray(data)) {
        comments = data;
      } else if (data.data && Array.isArray(data.data)) {
        comments = data.data;
      } else if (data.comments && Array.isArray(data.comments)) {
        comments = data.comments;
      } else if (data.result && Array.isArray(data.result)) {
        comments = data.result;
      } else {
        comments = [];
      }

      if (!Array.isArray(comments)) {
        console.warn('Comments is not an array:', comments);
        comments = [];
      }

      if (comments.length === 0) {
        commentsList.innerHTML = '<p class="no-comments">No comments yet</p>';
        if (commentCount) commentCount.textContent = '(0)';
        return;
      }

      if (commentCount) commentCount.textContent = `(${comments.length})`;

      let html = '';
      comments.forEach((comment, index) => {
        const author = comment.author?.displayName || comment.author || 'Unknown';
        const time = formatCommentTime(comment.created || comment.timestamp);
        const text = comment.body || comment.text || '';
        const initials = author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const commentId = comment.id || index;

        html += `
          <div class="comment" data-comment-id="${commentId}">
            <div class="comment-avatar">${initials}</div>
            <div class="comment-content">
              <div class="comment-header">
                <span class="comment-author">${author}</span>
                <span class="comment-time">${time}</span>
              </div>
              <div class="comment-text">${text}</div>
              <div class="comment-actions">
                <button class="comment-action-btn" title="Reply">↩️ Reply</button>
                <button class="comment-action-btn" title="Like">👍 Like</button>
              </div>
            </div>
          </div>
        `;
      });
      commentsList.innerHTML = html;
      setupCommentEventListeners(issueKey);
      
      // Initialize mentions system on comment textarea
      if (window.mentionSystem) {
        window.mentionSystem.init('commentText');
      }
    })
    .catch(error => {
      console.error('Error loading comments:', error);
      commentsList.innerHTML = '<p class="error">Failed to load comments</p>';
    });
}

// ===== SETUP COMMENT EVENT LISTENERS =====
function setupCommentEventListeners(issueKey) {
  const actionBtns = document.querySelectorAll('.comment-action-btn');
  actionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const comment = e.target.closest('.comment');
      const commentId = comment.dataset.commentId;
      const action = e.target.textContent.trim().split(' ')[1];
      
      if (action.includes('Reply')) {
        const textarea = document.getElementById('commentText');
        if (textarea) {
          textarea.focus();
          textarea.placeholder = `Reply to comment #${commentId}...`;
        }
      }
    });
  });
}


// ===== LOAD ACTIVITY =====
function loadIssueActivity(issueKey) {
  const timeline = document.getElementById('activityTimeline');

  if (!timeline) return;

  // Show loading state
  timeline.innerHTML = '<p class="loading">Loading activity...</p>';

  // Fetch from API (optional endpoint - may not exist)
  fetch(`/api/issues/${issueKey}/activity`)
    .then(response => {
      if (!response.ok && response.status === 404) {
        // Activity endpoint not available - show no activity message
        timeline.innerHTML = '<p class="no-activity">Activity tracking not available</p>';
        return null;
      }
      return response.json();
    })
    .then(data => {
      if (!data) return;
      const activities = data.data || data.activity || [];

      if (activities.length === 0) {
        timeline.innerHTML = '<p class="no-activity">No activity yet</p>';
        return;
      }

      let html = '';
      activities.forEach(activity => {
        const title = activity.title || activity.action || 'Activity';
        const description = activity.description || activity.details || '';
        const time = formatCommentTime(activity.timestamp || activity.created);

        html += `
          <div class="activity-item">
            <div class="activity-icon">📝</div>
            <div class="activity-content">
              <div class="activity-title">${title}</div>
              ${description ? `<div class="activity-description">${description}</div>` : ''}
              <div class="activity-time">${time}</div>
            </div>
          </div>
        `;
      });
      timeline.innerHTML = html;
    })
    .catch(error => {
      console.error('Error loading activity:', error);
      timeline.innerHTML = '<p class="error">Failed to load activity</p>';
    });
}


// ===== POST COMMENT =====
function postComment(issueKey) {
  const textarea = document.getElementById('commentText');
  if (!textarea) {
    console.warn('Comment textarea not found');
    return;
  }

  const text = textarea.value.trim();
  if (!text) {
    alert('Please enter a comment');
    return;
  }

  // Show loading state
  const btn = textarea.parentElement.querySelector('.btn-add-comment');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Posting...';

  // Call API
  fetch(`/api/issues/${issueKey}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success || data.id) {
        textarea.value = '';
        loadIssueComments(issueKey); // Reload comments
      } else {
        alert('Failed to post comment');
      }
    })
    .catch(error => {
      console.error('Error posting comment:', error);
      alert('Error posting comment');
    })
    .finally(() => {
      btn.disabled = false;
      btn.textContent = originalText;
    });
}

// ===== CLOSE SIDEBAR =====
function closeSidebar() {
  const rightSidebar = document.getElementById('rightSidebar');
  const mainWrapper = document.querySelector('.main-wrapper');

  // Add closing animation
  rightSidebar.classList.add('closing');

  // Remove classes after animation
  setTimeout(() => {
    rightSidebar.style.display = 'none';
    rightSidebar.classList.remove('closing');
    mainWrapper.classList.remove('sidebar-open');
    sidebarState.isOpen = false;
    sidebarState.currentIssue = null;
  }, 300);
}

// ===== PERFORM TRANSITION =====
function performTransition(issueKey, transitionId, transitionName) {
  if (confirm(`Are you sure you want to transition to "${transitionName}"?`)) {
    console.log(`Transitioning ${issueKey} to ${transitionName}`);
    // TODO: Call API to perform transition
    alert(`✅ Transitioned to "${transitionName}" (coming soon)`);
  }
}

// ===== FORMAT DATE =====
function formatDate(dateString) {
  if (!dateString || dateString === '—') return '—';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

// ===== FORMAT COMMENT TIME (relative) =====
function formatCommentTime(dateString) {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return date.toLocaleDateString('en-US');
  } catch {
    return dateString;
  }
}


// ===== INTEGRATION WITH KANBAN CARDS =====
function setupIssueCardClickHandlers() {
  // Re-attach handlers after Kanban re-render
  document.querySelectorAll('.issue-card').forEach(card => {
    card.addEventListener('click', () => {
      const issueKey = card.dataset.issue;
      openIssueDetails(issueKey);
    });

    // Prevent drag when clicking on card
    card.style.cursor = 'pointer';
  });
}

// ===== EXPORT FOR USE =====
window.rightSidebar = {
  init: initRightSidebar,
  open: openIssueDetails,
  close: closeSidebar,
  setupCardHandlers: setupIssueCardClickHandlers,
  switchPanel
};

// Export functions globally for direct access
window.openIssueDetails = openIssueDetails;
window.closeSidebar = closeSidebar;
window.initRightSidebar = initRightSidebar;

// Hook into app.js render functions
const originalRenderKanban = window.renderKanban;
window.renderKanban = function() {
  originalRenderKanban?.call(this);
  setupIssueCardClickHandlers();
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initRightSidebar();
    
    // Initialize mentions system
    if (window.MentionSystem && !window.mentionSystem) {
      window.mentionSystem = new MentionSystem();
      console.log('✅ Mentions system initialized');
    }
  }, 100);
});
