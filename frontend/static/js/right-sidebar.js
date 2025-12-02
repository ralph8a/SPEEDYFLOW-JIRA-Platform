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
  console.log('✅ [Right Sidebar] Base initialization complete - interaction systems will load when sidebar opens');
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
  // Currently using 2-column layout - no tabs needed
  // Function kept for future extensibility
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
  
  // Load comments
  loadIssueComments(issueKey);

  // Show sidebar
  const rightSidebar = document.getElementById('rightSidebar');
  rightSidebar.style.display = 'flex';
  sidebarState.isOpen = true;

  // Add class to main-wrapper
  document.querySelector('.main-wrapper').classList.add('sidebar-open');

  // Reset to details panel
  switchPanel('detailsPanel');

  // NOW setup mention and attachment systems (after sidebar is visible)
  console.log('🔧 [Right Sidebar] Setting up interaction systems after open...');
  
  // Wait a moment for DOM to fully render, then setup
  setTimeout(() => {
    console.log('⏱️ [Right Sidebar] Waiting 200ms for DOM settlement...');
    setupMentionSystem();
    setupAttachmentsSystem();
    setupCommentShortcuts();
  }, 200);

  // Setup comment button and mentions
  const commentBtn = document.querySelector('.btn-add-comment');
  const commentTextarea = document.getElementById('commentText');
  const visibilityToggle = document.getElementById('commentInternal');
  const visibilityLabel = document.querySelector('.visibility-label');
  
  if (commentBtn) {
    // Remove previous listeners
    const newBtn = commentBtn.cloneNode(true);
    commentBtn.parentNode.replaceChild(newBtn, commentBtn);
    
    // Add new listener
    newBtn.addEventListener('click', () => postComment(issueKey));
  }
  
  // Setup visibility toggle
  if (visibilityToggle && visibilityLabel) {
    visibilityToggle.checked = false; // Reset to public
    visibilityToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        visibilityLabel.textContent = '🔒 Internal';
      } else {
        visibilityLabel.textContent = '🔓 Public';
      }
    });
  }
  
  // Attach mentions autocomplete to textarea
  if (commentTextarea && window.mentionsAutocomplete) {
    // Small delay to ensure textarea is ready
    setTimeout(() => {
      window.mentionsAutocomplete.attachTo(commentTextarea, issueKey);
    }, 100);
  }
  
  // Initialize SLA Monitor if available
  if (window.slaMonitor && typeof window.slaMonitor.init === 'function') {
    window.slaMonitor.init(issueKey).then(() => {
      // Render SLA panel in the container
      const slaContainer = document.getElementById('slaMonitorContainer');
      if (slaContainer && window.slaMonitor.slaData[issueKey]) {
        const slaPanel = window.slaMonitor.renderSLAPanel(issueKey);
        slaContainer.innerHTML = '';
        slaContainer.appendChild(slaPanel);
      }
    }).catch(err => {
      // SLA Monitor initialization failed
    });
  }
}

// ===== POPULATE ISSUE DETAILS =====
function populateIssueDetails(issue) {
  if (!issue) return;

  // Use the existing HTML elements with IDs
  document.getElementById('detailKey').textContent = issue.key || '—';
  document.getElementById('detailSummary').textContent = issue.summary || issue.fields?.summary || '—';
  
  const status = issue.status || issue.fields?.status?.name || 'Unknown';
  document.getElementById('detailStatus').textContent = status;
  
  // ===== EXTRACT SEVERITY FROM ALL POSSIBLE LOCATIONS =====
  let severity = extractFieldValue(issue, [
    'severity', 'criticidad', 'Criticidad',
    'custom_fields.customfield_10125',
    'custom_fields.Criticidad',
    'custom_fields.severity',
    'fields.severity',
    'fields.criticidad',
    'fields.customfield_10125',
    'customfield_10125'
  ]);
  
  // Render severity badge with emoji and styling
  const severityEl = document.getElementById('detailSeverity');
  if (severity) {
    const severityStyle = getSeverityStyle(severity);
    severityEl.textContent = severityStyle ? `${severityStyle.emoji} ${severity}` : severity;
    if (severityStyle) {
      severityEl.className = `severity-badge ${severityStyle.className}`;
    } else {
      severityEl.className = 'severity-badge';
    }
  } else {
    severityEl.textContent = '—';
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
  
  // ===== FETCH COMPLETE DATA FROM SERVICE DESK API =====
  fetchServiceDeskRequestDetails(issue.key);
  
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
      } catch (error) {
        // Ticket portal forms not available
      }
    })();
  }
}

// ===== FETCH SERVICE DESK REQUEST DETAILS =====
function fetchServiceDeskRequestDetails(issueKey) {
  console.log('🔍 Fetching Service Desk details for:', issueKey);
  
  // Show loading state
  const container = document.getElementById('allFieldsContainer');
  if (container) {
    container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">⏳ Loading all fields...</p>';
  }
  
  // Fetch from Service Desk API endpoint
  fetch(`/api/servicedesk/request/${issueKey}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('✅ Service Desk data received:', data);
      
      // Merge Service Desk data with existing issue data
      const completeIssue = {
        ...sidebarState.currentIssue,
        ...data,
        fields: {
          ...sidebarState.currentIssue?.fields,
          ...data.fields
        }
      };
      
      // Update current issue in state
      sidebarState.currentIssue = completeIssue;
      
      // Populate all fields with complete data
      populateAllFields(completeIssue);
    })
    .catch(error => {
      console.error('❌ Error fetching Service Desk details:', error);
      
      // Fallback to existing issue data
      if (sidebarState.currentIssue) {
        populateAllFields(sidebarState.currentIssue);
      } else {
        const container = document.getElementById('allFieldsContainer');
        if (container) {
          container.innerHTML = '<p style="text-align: center; padding: 20px; color: #f00;">⚠️ Error loading fields</p>';
        }
      }
    });
}

// ===== LOAD COMMENTS =====
function loadIssueComments(issueKey) {
  const commentsList = document.getElementById('commentsList');
  const commentCount = document.getElementById('commentCount');

  if (!commentsList) {
    return;
  }

  // Show loading state
  commentsList.innerHTML = '<p class="loading">Loading comments...</p>';

  // Fetch from V2 API (includes body_html with rendered images)
  fetch(`/api/v2/issues/${issueKey}/comments`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      
      // Handle different response formats
      // Backend wraps in: {success: true, data: {comments: [...], attachments: [...]}
      let comments = [];
      
      // Check if wrapped by json_response decorator
      if (data.success && data.data) {
        // data.data contains the actual response from the endpoint
        if (Array.isArray(data.data.comments)) {
          comments = data.data.comments;
        } else if (Array.isArray(data.data)) {
          comments = data.data;
        }
      } else if (Array.isArray(data)) {
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
        
        // Get text content (V1 uses 'body', V2 might use 'text' or 'body_html')
        let text = comment.body_html || comment.body || comment.text || '';
        
        // Check if it's plain text (needs escaping) or already HTML
        const isHtml = text.includes('<') && (text.includes('</') || text.includes('/>'));
        if (!isHtml) {
          // Escape plain text but preserve newlines
          text = text.replace(/&/g, '&amp;')
                     .replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;')
                     .replace(/\n/g, '<br>');
        }
        
        const initials = author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const commentId = comment.id || index;
        
        // Extract visibility if present (for internal comments)
        const isInternal = comment.visibility === 'internal' || comment.jsdPublic === false;
        const visibilityBadge = isInternal ? '<span class="comment-visibility-badge internal">🔒 Internal</span>' : '';

        html += `
          <div class="comment ${isInternal ? 'internal' : ''}" data-comment-id="${commentId}">
            <div class="comment-avatar">${initials}</div>
            <div class="comment-content">
              <div class="comment-header">
                <span class="comment-author">${author}</span>
                <span class="comment-time">${time}</span>
                ${visibilityBadge}
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


// ===== POST COMMENT =====
function postComment(issueKey) {
  const textarea = document.getElementById('commentText');
  if (!textarea) {
    return;
  }

  const text = textarea.value.trim();
  if (!text) {
    alert('Please enter a comment');
    return;
  }

  // Get visibility setting
  const internalCheckbox = document.getElementById('commentInternal');
  const isInternal = internalCheckbox ? internalCheckbox.checked : false;

  // Show loading state
  const btn = document.querySelector('.btn-add-comment');
  if (!btn) {
    return;
  }
  
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Posting...';

  // Call API V2 (better formatting and image support)
  fetch(`/api/v2/issues/${issueKey}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      body: text,
      internal: isInternal,
      format: 'text'
    })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      
      // Check if wrapped by json_response decorator
      const success = data.success || (data.data && data.data.id) || data.id;
      
      if (success) {
        textarea.value = '';
        
        // Reset visibility to public
        const internalCheckbox = document.getElementById('commentInternal');
        if (internalCheckbox) {
          internalCheckbox.checked = false;
          const visibilityLabel = document.querySelector('.visibility-label');
          if (visibilityLabel) visibilityLabel.textContent = '🔓 Public';
        }
        
        // Update comment count
        const countBadge = document.getElementById('commentCount');
        if (countBadge) {
          const currentCount = parseInt(countBadge.textContent) || 0;
          countBadge.textContent = currentCount + 1;
        }
        
        // Reload comments
        loadIssueComments(issueKey);
      } else {
        alert('Failed to post comment');
      }
    })
    .catch(error => {
      alert(`Error posting comment: ${error.message}`);
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

// ===== EXTRACT FIELD VALUE FROM NESTED PATHS =====
function extractFieldValue(obj, paths) {
  if (!obj) return null;
  
  for (const path of paths) {
    const parts = path.split('.');
    let value = obj;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        value = null;
        break;
      }
    }
    
    // Extract value from object if needed
    if (value && typeof value === 'object') {
      value = value.value || value.name || null;
    }
    
    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }
  
  return null;
}

// ===== POPULATE ALL FIELDS DYNAMICALLY =====
function populateAllFields(issue) {
  const container = document.getElementById('allFieldsContainer');
  if (!container) {
    console.warn('⚠️ allFieldsContainer not found');
    return;
  }
  
  const fields = extractAllFields(issue);
  
  if (fields.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No additional fields</p>';
    return;
  }
  
  let html = '<div class="all-fields-grid">';
  
  fields.forEach(field => {
    html += `
      <div class="field-item">
        <div class="field-label">${field.label}</div>
        <div class="field-value">${formatFieldValue(field.value, field.type)}</div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// ===== EXTRACT ALL RELEVANT FIELDS =====
function extractAllFields(issue) {
  const fields = [];
  const seenKeys = new Set(); // Track already added fields
  
  const excludeFields = new Set([
    'key', 'summary', 'status', 'assignee', 'type', 'created', 'updated', 
    'description', 'transitions', 'comments', 'attachment', 'worklog',
    'expand', 'self', 'id', 'changelog', 'operations', 'editmeta', 'names', 'schema',
    'issuetype', 'statuscategory', 'statusCategory', 'lastViewed', 'watches',
    'issuelinks', 'subtasks', 'parent', 'aggregatetimespent', 'aggregatetimeoriginalestimate',
    'aggregatetimeestimate', 'aggregateprogress', 'progress', 'workratio', 'avatarUrls',
    'timetracking', 'security', 'votes', 'watches'
  ]);
  
  // Check if value is meaningful (not null, empty, or just structural)
  const hasValue = (val) => {
    if (val === null || val === undefined || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'object') {
      // SLA objects with ongoingCycle have millis data - KEEP them
      if (val.ongoingCycle && val.ongoingCycle.elapsedTime) return true;
      // Other SLA structure without data - skip
      if (val._links || val.completedCycles !== undefined || val.slaDisplayFormat) return false;
      // Empty objects
      if (Object.keys(val).length === 0) return false;
      // Has meaningful data
      if (val.name || val.displayName || val.value) return true;
    }
    if (typeof val === 'number' && val === 0) return false;
    return true;
  };
  
  const fieldMappings = {
    'priority': '⚡ Priority',
    'reporter': '📢 Reporter',
    'labels': '🏷️ Labels',
    'components': '🧩 Components',
    'fixVersions': '🔖 Fix Versions',
    'affectsVersions': '🐛 Affects Versions',
    'environment': '🖥️ Environment',
    'duedate': '📅 Due Date',
    'resolutiondate': '✅ Resolution Date',
    'timespent': '⏱️ Time Spent',
    'timeestimate': '⏰ Time Estimate',
    'timeoriginalestimate': '🕐 Original Estimate',
    'project': '📁 Project',
    'creator': '👤 Creator',
    'resolution': '✔️ Resolution',
    // Custom fields common in Service Desk
    'customfield_10125': '🚨 Severity/Criticidad',
    'customfield_10061': '📋 Workflow History',
    'customfield_10020': '🏃 Sprint',
    'customfield_10016': '📊 Story Points',
    'customfield_10037': '📖 Epic Link',
    'customfield_10010': '🎯 Request Type',
    'customfield_10015': '📆 Start Date',
    'customfield_10030': '🏢 Organization',
    'customfield_10040': '📱 Phone',
    'customfield_10050': '✉️ Email',
    'customfield_10060': '🌐 URL',
    'customfield_10070': '💼 Business Unit',
    'customfield_10080': '🎫 Service Request',
    'customfield_10090': '⚙️ Configuration',
    'customfield_10100': '🔗 External Link'
  };
  
  // Extract from issue.fields
  if (issue.fields) {
    Object.entries(issue.fields).forEach(([key, value]) => {
      if (excludeFields.has(key) || !hasValue(value) || seenKeys.has(key)) return;
      
      const label = fieldMappings[key] || humanizeFieldName(key);
      const fieldType = detectFieldType(value);
      
      fields.push({ label, value, type: fieldType, key });
      seenKeys.add(key);
    });
  }
  
  // Extract from issue.custom_fields
  if (issue.custom_fields) {
    Object.entries(issue.custom_fields).forEach(([key, value]) => {
      if (!hasValue(value) || seenKeys.has(key)) return;
      
      const label = fieldMappings[key] || humanizeFieldName(key);
      const fieldType = detectFieldType(value);
      
      fields.push({ label, value, type: fieldType, key });
      seenKeys.add(key);
    });
  }
  
  // Extract from Service Desk requestFieldValues
  if (issue.serviceDesk && issue.serviceDesk.requestFieldValues) {
    Object.entries(issue.serviceDesk.requestFieldValues).forEach(([key, value]) => {
      if (!hasValue(value) || seenKeys.has(key)) return;
      
      const label = fieldMappings[key] || humanizeFieldName(key);
      const fieldType = detectFieldType(value);
      
      fields.push({ label, value, type: fieldType, key });
      seenKeys.add(key);
    });
  }
  
  // Extract from Service Desk currentStatus
  if (issue.serviceDesk && issue.serviceDesk.currentStatus) {
    const status = issue.serviceDesk.currentStatus;
    if (hasValue(status.status) && !seenKeys.has('serviceDesk.currentStatus')) {
      fields.push({
        label: '🔄 Service Desk Status',
        value: status.status,
        type: 'string',
        key: 'serviceDesk.currentStatus'
      });
      seenKeys.add('serviceDesk.currentStatus');
    }
  }
  
  // Extract SLA data with millis
  if (issue.slaData && Array.isArray(issue.slaData)) {
    issue.slaData.forEach((sla, idx) => {
      if (!sla || !sla.name) return;
      
      const key = `sla_${idx}_${sla.name}`;
      if (seenKeys.has(key)) return;
      
      fields.push({
        label: `⏱️ ${sla.name}`,
        value: sla,
        type: 'sla',
        key
      });
      seenKeys.add(key);
    });
  }
  
  console.log(`📊 Extracted ${fields.length} fields from issue ${issue.key}`);
  console.log('Fields:', fields.map(f => f.label).join(', '));
  
  // Sort by label (SLAs at bottom)
  fields.sort((a, b) => {
    const aIsSla = a.label.startsWith('⏱️');
    const bIsSla = b.label.startsWith('⏱️');
    
    if (aIsSla && !bIsSla) return 1;
    if (!aIsSla && bIsSla) return -1;
    
    return a.label.localeCompare(b.label);
  });
  
  return fields;
}

// ===== HUMANIZE FIELD NAME =====
function humanizeFieldName(fieldName) {
  return fieldName
    .replace(/^customfield_\d+/, 'Custom Field')
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\b\w/g, l => l.toUpperCase());
}

// ===== DETECT FIELD TYPE =====
function detectFieldType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') {
    // SLA objects with ongoing cycle and millis data
    if (value.ongoingCycle && value.ongoingCycle.elapsedTime) return 'sla';
    // Other SLA structure objects
    if (value._links || value.completedCycles !== undefined || value.slaDisplayFormat) return 'sla_empty';
    // User objects
    if (value.displayName && value.accountId) return 'user';
    if (value.displayName) return 'user';
    // Select/dropdown values
    if (value.value && !value.id) return 'select';
    // Named objects (project, components, etc)
    if (value.name && value.id) return 'object';
    if (value.name) return 'object';
    return 'object';
  }
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) return 'date';
    if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'date';
    if (value.length > 150) return 'text';
    return 'string';
  }
  return 'unknown';
}

// ===== FORMAT FIELD VALUE =====
function formatFieldValue(value, type) {
  if (!value && value !== 0 && value !== false) return '—';
  
  switch (type) {
    case 'sla':
      // SLA objects with ongoing cycle - show elapsed and remaining millis
      if (value.ongoingCycle) {
        const elapsed = value.ongoingCycle.elapsedTime;
        const remaining = value.ongoingCycle.remainingTime;
        const paused = value.ongoingCycle.paused || false;
        
        const elapsedMs = elapsed?.millis || 0;
        const remainingMs = remaining?.millis || 0;
        
        const elapsedHrs = (elapsedMs / (1000 * 60 * 60)).toFixed(1);
        const remainingHrs = (remainingMs / (1000 * 60 * 60)).toFixed(1);
        
        const pausedBadge = paused ? '<span style="color: #f59e0b; font-weight: bold;"> ⏸️ PAUSED</span>' : '';
        
        return `<div style="font-size: 11px;">
          <strong>${value.name || 'SLA'}</strong>${pausedBadge}<br>
          <span style="color: #3b82f6;">⏱️ Elapsed: ${elapsedHrs}h (${elapsedMs.toLocaleString()}ms)</span><br>
          <span style="color: ${remainingMs < 0 ? '#ef4444' : '#10b981'};">⏰ Remaining: ${remainingHrs}h (${remainingMs.toLocaleString()}ms)</span>
        </div>`;
      }
      return value.name || 'SLA Object';
    
    case 'sla_empty':
      // Empty SLA structure - skip
      return '—';
    
    case 'user':
      return value.displayName || value.name || value.emailAddress || '—';
    
    case 'select':
      return value.value || value.name || '—';
    
    case 'array':
      if (value.length === 0) return '—';
      return value.map(item => {
        if (typeof item === 'object') {
          return item.name || item.value || item.displayName || JSON.stringify(item);
        }
        return item;
      }).join(', ');
    
    case 'date':
      return formatDate(value);
    
    case 'boolean':
      return value ? '✅ Yes' : '❌ No';
    
    case 'number':
      return value.toLocaleString();
    
    case 'text':
      const escaped = String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<div class="field-text-long">${escaped.substring(0, 250)}${escaped.length > 250 ? '...' : ''}</div>`;
    
    case 'object':
      if (value.name) return value.name;
      if (value.displayName) return value.displayName;
      if (value.value) return value.value;
      // Try to show something meaningful
      const str = JSON.stringify(value);
      if (str.length < 50) return str;
      return str.substring(0, 80) + '...';
    
    default:
      return String(value);
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

// ===== SETUP MENTIONS SYSTEM =====
function setupMentionSystem() {
  console.log('🔧 [Mentions] Setting up mention system...');
  
  // Check if sidebar exists
  const rightSidebar = document.getElementById('rightSidebar');
  console.log('📍 [Mentions] rightSidebar exists:', !!rightSidebar);
  
  // Search for elements globally
  const mentionBtn = document.getElementById('mentionBtn');
  const mentionsDropdown = document.getElementById('mentionsDropdown');
  const mentionsSearch = document.getElementById('mentionsSearch');
  const mentionsList = document.getElementById('mentionsList');
  const commentText = document.getElementById('commentText');

  console.log('📍 [Mentions] mentionBtn found:', !!mentionBtn);
  console.log('📍 [Mentions] mentionsDropdown found:', !!mentionsDropdown);
  console.log('📍 [Mentions] mentionsSearch found:', !!mentionsSearch);
  console.log('📍 [Mentions] mentionsList found:', !!mentionsList);
  console.log('📍 [Mentions] commentText found:', !!commentText);
  
  // List all elements in the sidebar
  if (rightSidebar) {
    const allIds = rightSidebar.querySelectorAll('[id]');
    console.log('📊 [Mentions] IDs in sidebar:', Array.from(allIds).map(el => el.id));
  }
  
  // Also try searching within sidebar specifically
  if (rightSidebar && !mentionBtn) {
    console.log('🔍 [Mentions] Searching within sidebar...');
    const btnInSidebar = rightSidebar.querySelector('#mentionBtn');
    console.log('📍 [Mentions] mentionBtn in sidebar:', !!btnInSidebar);
  }

  if (!mentionBtn || !mentionsDropdown) {
    console.warn('⚠️ [Mentions] Required elements not found - aborting setup');
    console.log('Full document structure check:');
    console.log('mentionBtn in doc:', document.getElementById('mentionBtn'));
    console.log('mentionsDropdown in doc:', document.getElementById('mentionsDropdown'));
    
    // Debug: check if they're maybe in the sidebar but with different query
    if (rightSidebar) {
      console.log('🔍 [Mentions] Attempting querySelectorAll...');
      const btnByClass = rightSidebar.querySelector('.comment-toolbar-btn');
      console.log('📍 Found button by class:', !!btnByClass, btnByClass?.id);
      const dropdownByClass = rightSidebar.querySelector('.mentions-dropdown');
      console.log('📍 Found dropdown by class:', !!dropdownByClass, dropdownByClass?.id);
    }
    return;
  }

  console.log('✅ [Mentions] Elements found, attaching listeners...');

  // Clone the button to remove all previous event listeners
  const newMentionBtn = mentionBtn.cloneNode(true);
  mentionBtn.parentNode.replaceChild(newMentionBtn, mentionBtn);
  
  // Get reference to the new button
  const freshMentionBtn = document.getElementById('mentionBtn');
  const mentionsDropdownFresh = document.getElementById('mentionsDropdown');
  const mentionsSearchFresh = document.getElementById('mentionsSearch');

  freshMentionBtn.addEventListener('click', () => {
    console.log('🖱️ [Mentions] Mention button clicked');
    const isOpen = mentionsDropdownFresh.classList.contains('show');
    if (isOpen) {
      mentionsDropdownFresh.classList.remove('show');
    } else {
      mentionsDropdownFresh.classList.add('show');
      mentionsSearchFresh.focus();
      loadAvailableUsers();
    }
  });

  mentionsSearchFresh.addEventListener('input', (e) => {
    filterMentions(e.target.value);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mentions-dropdown') && !e.target.closest('#mentionBtn')) {
      mentionsDropdownFresh.classList.remove('show');
    }
  });
  
  console.log('✅ [Mentions] Setup complete');
}

function loadAvailableUsers() {
  const mentionsList = document.getElementById('mentionsList');
  
  if (!sidebarState.currentIssue) {
    console.warn('⚠️ [Mentions] No current issue - cannot load users');
    return;
  }
  
  const issueKey = sidebarState.currentIssue.key;
  console.log('🔄 [Mentions] Fetching users for issue:', issueKey);
  
  // Fetch from API endpoint
  fetch(`/api/v2/issues/${issueKey}/mentions/users`)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      console.log('✅ [Mentions] Loaded users:', data.users?.length || 0);
      
      if (!data.users || data.users.length === 0) {
        mentionsList.innerHTML = '<div class="mention-item" style="color: #999; padding: 8px;">No users available</div>';
        return;
      }
      
      // Map API users to display format
      const users = data.users.map(user => ({
        id: user.accountId || user.username,
        name: user.displayName || user.username || 'Unknown',
        email: user.emailAddress || ''
      }));
      
      mentionsList.innerHTML = users.map((user, idx) => `
        <div class="mention-item" data-mention="${user.name}" data-id="${user.id}" data-index="${idx}">
          <strong>${user.name}</strong>
          ${user.email ? `<div style="font-size: 10px; opacity: 0.6;">${user.email}</div>` : ''}
        </div>
      `).join('');

      // Attach click handlers to each user
      document.querySelectorAll('.mention-item').forEach(item => {
        item.addEventListener('click', () => {
          const userName = item.dataset.mention;
          const commentText = document.getElementById('commentText');
          if (commentText) {
            commentText.value += `@${userName} `;
            commentText.focus();
          }
          const dropdown = document.getElementById('mentionsDropdown');
          if (dropdown) dropdown.classList.remove('show');
        });
      });
    })
    .catch(err => {
      console.error('❌ [Mentions] Error loading users:', err);
      mentionsList.innerHTML = `<div class="mention-item" style="color: #f00; padding: 8px;">Error loading users</div>`;
    });
}

function filterMentions(query) {
  const mentionItems = document.querySelectorAll('.mention-item');
  mentionItems.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(query.toLowerCase()) ? 'block' : 'none';
  });
}

// ===== SETUP ATTACHMENTS SYSTEM =====
function setupAttachmentsSystem() {
  console.log('🔧 [Attachments] Setting up attachments system...');
  
  const rightSidebar = document.getElementById('rightSidebar');
  console.log('📍 [Attachments] rightSidebar exists:', !!rightSidebar);
  
  const attachBtn = document.getElementById('attachBtn');
  const attachmentsPreview = document.getElementById('attachmentsPreview');
  const attachmentsList = document.getElementById('attachmentsList');

  console.log('📍 [Attachments] attachBtn found:', !!attachBtn);
  console.log('📍 [Attachments] attachmentsPreview found:', !!attachmentsPreview);
  console.log('📍 [Attachments] attachmentsList found:', !!attachmentsList);
  
  // Try searching within sidebar
  if (rightSidebar && !attachBtn) {
    console.log('🔍 [Attachments] Searching within sidebar...');
    const btnInSidebar = rightSidebar.querySelector('#attachBtn');
    const previewInSidebar = rightSidebar.querySelector('#attachmentsPreview');
    console.log('📍 [Attachments] attachBtn in sidebar:', !!btnInSidebar);
    console.log('📍 [Attachments] attachmentsPreview in sidebar:', !!previewInSidebar);
  }

  if (!attachBtn || !attachmentsPreview) {
    console.warn('⚠️ [Attachments] Required elements not found - aborting setup');
    console.log('Full document structure check:');
    console.log('attachBtn in doc:', document.getElementById('attachBtn'));
    console.log('attachmentsPreview in doc:', document.getElementById('attachmentsPreview'));
    
    // Debug: try finding by class
    if (rightSidebar) {
      console.log('🔍 [Attachments] Attempting querySelectorAll...');
      const buttons = rightSidebar.querySelectorAll('.comment-toolbar-btn');
      console.log('📍 Found buttons by class:', buttons.length);
      buttons.forEach((btn, idx) => {
        console.log(`  Button ${idx}:`, btn.id, btn.textContent);
      });
    }
    return;
  }

  console.log('✅ [Attachments] Elements found, attaching listeners...');

  // Clone the button to remove all previous event listeners
  const newAttachBtn = attachBtn.cloneNode(true);
  attachBtn.parentNode.replaceChild(newAttachBtn, attachBtn);
  
  // Get reference to the new button
  const freshAttachBtn = document.getElementById('attachBtn');

  freshAttachBtn.addEventListener('click', () => {
    console.log('🖱️ [Attachments] Attach button clicked');
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '*/*';
    
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      console.log('📂 [Attachments] Files selected:', files.length);
      addAttachments(files);
      attachmentsPreview.classList.add('show');
    });

    fileInput.click();
  });
  
  console.log('✅ [Attachments] Setup complete');
}

let attachedFiles = [];

function addAttachments(files) {
  const attachmentsList = document.getElementById('attachmentsList');
  const attachmentsPreview = document.getElementById('attachmentsPreview');

  attachedFiles.push(...files);

  let html = '';
  attachedFiles.forEach((file, idx) => {
    html += `
      <div class="attachment-item">
        <span class="attachment-name" title="${file.name}">📄 ${file.name}</span>
        <button class="attachment-remove" data-index="${idx}">✕</button>
      </div>
    `;
  });

  attachmentsList.innerHTML = html;

  // Setup remove buttons
  document.querySelectorAll('.attachment-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      attachedFiles.splice(idx, 1);
      if (attachedFiles.length === 0) {
        attachmentsPreview.classList.remove('show');
      } else {
        addAttachments([]);
      }
    });
  });
}

// ===== SETUP COMMENT KEYBOARD SHORTCUTS =====
function setupCommentShortcuts() {
  const commentText = document.getElementById('commentText');
  
  if (!commentText) return;

  commentText.addEventListener('keydown', (e) => {
    // Ctrl+Enter or Cmd+Enter to post
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      document.querySelector('.btn-add-comment')?.click();
    }
  });
}

// ===== EXPORT FOR USE =====
window.rightSidebar = {
  init: initRightSidebar,
  open: openIssueDetails,
  close: closeSidebar,
  setupCardHandlers: setupIssueCardClickHandlers,
  switchPanel,
  setupMentionSystem,
  setupAttachmentsSystem,
  setupCommentShortcuts
};

// Export functions globally for direct access
window.openIssueDetails = openIssueDetails;
window.closeSidebar = closeSidebar;
window.initRightSidebar = initRightSidebar;
window.setupMentionSystem = setupMentionSystem;
window.setupAttachmentsSystem = setupAttachmentsSystem;
window.setupCommentShortcuts = setupCommentShortcuts;

// Hook into app.js render functions
const originalRenderKanban = window.renderKanban;
window.renderKanban = function() {
  originalRenderKanban?.call(this);
  setupIssueCardClickHandlers();
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    console.log('🔧 [Right Sidebar] DOMContentLoaded - Initializing...');
    initRightSidebar();
    console.log('✅ [Right Sidebar] initRightSidebar() completed');
    
    // Initialize mentions system
    if (window.MentionSystem && !window.mentionSystem) {
      window.mentionSystem = new MentionSystem();
    }
  }, 100);
});

// Also call immediately if DOM is already loaded
if (document.readyState === 'loading') {
  console.log('📄 [Right Sidebar] DOM still loading, will init on DOMContentLoaded');
} else {
  console.log('📄 [Right Sidebar] DOM already loaded, initializing immediately...');
  setTimeout(() => {
    initRightSidebar();
    console.log('✅ [Right Sidebar] Immediate init completed');
  }, 100);
}
