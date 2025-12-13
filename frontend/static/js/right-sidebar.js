/**
 * SPEEDYFLOW - Right Sidebar Controller
 * Manejo de detalles de tickets, comentarios y actividad
 */

console.log('📥 [Load] right-sidebar.js loading...');

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
  console.log('🔍 [Right Sidebar] Opening issue details for:', issueKey);
  console.log('🔍 [Right Sidebar] Current state.issues length:', state.issues?.length || 0);
  
  // Close any open modals before opening ticket
  closeAllModals();
  
  const issue = state.issues.find(i => i.key === issueKey);
  if (!issue) {
    console.error('❌ [Right Sidebar] Issue not found:', issueKey);
    console.log('📋 [Right Sidebar] Available issues:', state.issues?.map(i => i.key) || []);
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

  // Dispatch ticketSelected event for ML features
  document.dispatchEvent(new CustomEvent('ticketSelected', {
    detail: { ticket: issue, issueKey: issueKey }
  }));

  // NOW setup mention and attachment systems (after sidebar is visible)
  console.log('🔧 [Right Sidebar] Setting up interaction systems after open...');
  
  // Wait for next paint cycle to ensure DOM is fully visible
  requestAnimationFrame(() => {
    setTimeout(() => {
      console.log('⏱️ [Right Sidebar] DOM settled, setting up systems...');
      // Mention system is now automatic via mentions-system.js (type @ in textarea)
      // setupMentionSystem(); // Disabled: button removed, auto-mention works better
      setupAttachmentsSystem();
      setupCommentShortcuts();
      
      // Now render attachments (DOM is ready and visible)
      if (sidebarState.currentIssue) {
        console.log('🎨 [Right Sidebar] Rendering attachments for:', sidebarState.currentIssue.key);
        renderAttachments(sidebarState.currentIssue);
      }

      // Initialize inline editor with AI suggestions
      if (window.sidebarEditor) {
        window.sidebarEditor.initForIssue(issueKey);
      }
    }, 100);
  });

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
      // Render SLA panel only if real data exists
      const slaContainer = document.getElementById('slaMonitorContainer');
      if (slaContainer) {
        if (window.slaMonitor.slaData[issueKey]) {
          const slaPanel = window.slaMonitor.renderSLAPanel(issueKey);
          slaContainer.innerHTML = '';
          slaContainer.appendChild(slaPanel);
        } else {
          // Hide SLA container if no real data
          slaContainer.style.display = 'none';
        }
      }
    }).catch(err => {
      console.error('SLA Monitor initialization failed:', err);
    });
  }
}

// ===== POPULATE ISSUE DETAILS =====
function populateIssueDetails(issue) {
  if (!issue) return;
  
  // Get cached data once (avoid duplicate lookups)
  const cachedIssue = window.app?.issuesCache?.get(issue.key);
  
  // Pre-populate with cached data if available
  if (cachedIssue) {
    console.log(`💾 Pre-populating with cached data for ${issue.key}`);
    
    const tempIssue = { ...issue, ...cachedIssue };
    sidebarState.currentIssue = tempIssue;
    
    // Show cached attachments immediately
    if (cachedIssue.fields?.attachment || cachedIssue.attachment) {
      requestAnimationFrame(() => {
        setTimeout(() => renderAttachments(tempIssue), 100);
      });
    }
  }
  
  // Fetch complete field structure from Service Desk API
  // (Kanban data is flat, Service Desk API has nested issue.fields.* needed for All Fields)
  console.log(`📡 Fetching complete field structure for ${issue.key}`);
  fetchServiceDeskRequestDetails(issue.key);
  
  // Initialize SLA Monitor
  if (window.slaMonitor) {
    window.slaMonitor.init(issue.key).then(() => {
      const slaContainer = document.getElementById('slaMonitorContainer');
      if (slaContainer) {
        if (window.slaMonitor.slaData[issue.key]) {
          const slaPanel = window.slaMonitor.renderSLAPanel(issue.key);
          const existingSLA = slaContainer.querySelector('.sla-panel');
          if (existingSLA) existingSLA.remove();
          slaContainer.appendChild(slaPanel);
          slaContainer.style.display = 'block';
        } else {
          // Hide SLA container if no real data
          slaContainer.style.display = 'none';
        }
      }
    }).catch(err => {
      console.error('SLA Monitor initialization failed:', err);
    });
  }
}

// ===== FETCH SERVICE DESK REQUEST DETAILS =====
function fetchServiceDeskRequestDetails(issueKey) {
  console.log('🔍 Fetching Service Desk details for:', issueKey);
  
  // Show loading state in active tab
  const activeTab = document.querySelector('.fields-tab-content.active');
  if (activeTab) {
    activeTab.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">⏳ Loading all fields...</p>';
  }
  
  // Fetch from Service Desk API endpoint
  fetch(`/api/servicedesk/request/${issueKey}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(response => {
      console.log('✅ Service Desk data received:', response);
      
      // Extract data from wrapper if present
      const data = response.data || response;
      
      // Merge Service Desk data with existing issue data
      const completeIssue = {
        ...sidebarState.currentIssue,
        ...data,
        fields: {
          ...sidebarState.currentIssue?.fields,
          ...data.fields
        }
      };
      
      // Data merged successfully
      
      // Update state and render
      sidebarState.currentIssue = completeIssue;
      populateAllFields(completeIssue);
      renderAttachments(completeIssue);
    })
    .catch(error => {
      console.error('❌ Error fetching Service Desk details:', error);
      
      // Fallback to existing issue data
      if (sidebarState.currentIssue) {
        populateAllFields(sidebarState.currentIssue);
      } else {
        const activeTab = document.querySelector('.fields-tab-content.active');
        if (activeTab) {
          const errorIcon = typeof SVGIcons !== 'undefined' 
            ? SVGIcons.alert({ size: 16, className: 'inline-icon' })
            : '⚠️';
          activeTab.innerHTML = `<p style="text-align: center; padding: 20px; color: #f00;">${errorIcon} Error loading fields</p>`;
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
        
        // Process and clean up the comment text
        text = processCommentText(text);
        
        const initials = author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const commentId = comment.id || index;
        
        // Extract visibility if present (for internal comments)
        const isInternal = comment.visibility === 'internal' || comment.jsdPublic === false;
        const visibilityBadge = isInternal ? '<span class="comment-visibility-badge internal">🔒 Internal</span>' : '';

        html += `
          <div class="comment ${isInternal ? 'internal' : ''}" data-comment-id="${commentId}" data-author="${author}">
            <div class="comment-avatar">${initials}</div>
            <div class="comment-content">
              <div class="comment-header">
                <span class="comment-author">${author}</span>
                <span class="comment-time">${time}</span>
                ${visibilityBadge}
              </div>
              <div class="comment-text">${text}</div>
              <div class="comment-actions">
                <button class="comment-action-btn" title="Reply to ${author}">↩️ Reply</button>
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

// ===== GET ISSUE ATTACHMENTS =====
function getIssueAttachments(issue) {
  if (!issue) return [];
  
  let attachments = [];
  
  if (issue.fields && Array.isArray(issue.fields.attachment)) {
    attachments = issue.fields.attachment;
  } else if (Array.isArray(issue.attachment)) {
    attachments = issue.attachment;
  } else if (Array.isArray(issue.attachments)) {
    attachments = issue.attachments;
  }
  
  return attachments || [];
}

// ===== FORMAT FILE SIZE =====
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== GET FILE ICON =====
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const iconMap = {
    'pdf': '📄', 'doc': '📝', 'docx': '📝', 'xls': '📊', 'xlsx': '📊',
    'txt': '📃', 'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️',
    'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'webp': '🖼️'
  };
  return iconMap[ext] || '📎';
}

// ===== PROCESS COMMENT TEXT =====
function processCommentText(text) {
  if (!text) return '';
  
  // Check if it's plain text (needs escaping) or already HTML
  const isHtml = text.includes('<') && (text.includes('</') || text.includes('/>'));
  if (!isHtml) {
    // Escape plain text but preserve newlines
    text = text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/\n/g, '<br>');
  }
  
  // Remove attachment references from comment text since they are shown in dedicated section
  // Remove JIRA-style attachment references like !image-123.png!, !document.pdf!, etc.
  text = text.replace(/!([^!]*\.(png|jpg|jpeg|gif|webp|pdf|doc|docx|xls|xlsx|txt|zip|rar|7z|svg))[^!]*!/gi, 
    (match) => {
      // Simply remove the reference - attachments are shown separately
      return '';
    });
  
  // Process markdown-style image links ![alt](url) - keep these as they are legitimate markdown  
  text = text.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, 
    (match, altText, url) => {
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
      if (isImage) {
        return `<img src="${url}" alt="${altText}" style="max-width: 100%; cursor: pointer;" onclick="window.open('${url}', '_blank')" />`;
      } else {
        return `<a href="${url}" target="_blank">${altText}</a>`;
      }
    });
  
  // Clean up duplicate user initials/names that appear on separate lines
  // Remove standalone initials (2-3 uppercase letters on their own line)
  text = text.replace(/^[A-Z]{2,3}(\s*<br\s*\/?>|\s*$)/gm, '');
  
  // Remove standalone full names that might be duplicated
  text = text.replace(/^[A-Z][a-z]+ [A-Z][a-z]+(\s*<br\s*\/?>|\s*$)/gm, '');
  
  // Remove lines that are just email addresses or usernames
  text = text.replace(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\s*<br\s*\/?>|\s*$)/gm, '');
  
  // Clean up "SC" or similar service initials that might appear
  text = text.replace(/^(SC|SG|Admin|User)(\s*<br\s*\/?>|\s*$)/gm, '');
  
  // Clean up multiple consecutive <br> tags
  text = text.replace(/(<br\s*\/?>){3,}/gi, '<br><br>');
  
  // Remove leading/trailing <br> tags
  text = text.replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/gi, '');
  
  // Remove empty lines at start/end
  text = text.trim();
  
  return text;
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
          // Get the author name from the comment dataset
          const authorName = comment.dataset.author || '';
          
          // Auto-mention the author in the textarea
          if (authorName) {
            const mention = `@${authorName} `;
            // If textarea is empty or doesn't already have this mention, add it
            if (!textarea.value.includes(mention)) {
              textarea.value = mention + textarea.value;
            }
          }
          
          textarea.focus();
          // Move cursor to end of text
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          textarea.placeholder = `Reply to ${authorName}...`;
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

  // Notify ML features about ticket leave (for cache save)
  if (window.commentSuggestionsUI && sidebarState.currentIssue) {
    window.commentSuggestionsUI.onTicketLeave();
  }

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
  const fields = extractAllFields(issue);
  
  if (fields.length === 0) {
    document.getElementById('tab-essential').innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No fields</p>';
    return;
  }
  
  // Categorize fields by importance
  const essentialFields = [];
  const detailFields = [];
  const technicalFields = [];
  
  fields.forEach(field => {
    const priority = getFieldPriority(field.label);
    if (priority <= 15) {
      essentialFields.push(field);
    } else if (priority <= 100) {
      detailFields.push(field);
    } else {
      technicalFields.push(field);
    }
  });
  
  // Render each tab
  renderFieldsInTab('tab-essential', essentialFields);
  renderFieldsInTab('tab-details', detailFields);
  renderFieldsInTab('tab-technical', technicalFields);
  
  // Setup tab switching (ensure it's called)
  console.log('🎨 Setting up tab switching after render...');
  setTimeout(() => setupTabSwitching(), 100);
}

function renderFieldsInTab(tabId, fields) {
  const container = document.getElementById(tabId);
  if (!container) return;
  
  if (fields.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No fields in this category</p>';
    return;
  }
  
  let html = '<div class="all-fields-grid">';
  
  fields.forEach(field => {
    // Detectar si es campo con texto largo (expandible con click)
    // Incluye description, notas, análisis, y cualquier texto > 200 caracteres
    const isLongTextField = field.key === 'description' || 
                           field.key === 'customfield_10149' || 
                           field.key === 'customfield_10151' || 
                           field.label.toLowerCase().includes('description') ||
                           field.label.toLowerCase().includes('descripcion') ||
                           field.label.toLowerCase().includes('summary') ||
                           field.label.toLowerCase().includes('notes') ||
                           field.label.toLowerCase().includes('notas') ||
                           field.label.toLowerCase().includes('comments') ||
                           field.label.toLowerCase().includes('details') ||
                           field.label.toLowerCase().includes('análisis') ||
                           field.label.toLowerCase().includes('resolución') ||
                           (field.type === 'text' && String(field.value).length > 200);
    
    let itemClass = 'field-item';
    let valueClass = 'field-value';
    
    // Todos los campos largos usan el mismo sistema (full-width + expandible)
    if (isLongTextField) {
      itemClass += ' field-item-full';
      valueClass += ' field-value-long';
    }
    
    html += `
      <div class="${itemClass}" data-field="${field.key}">
        <div class="field-label">${field.label}</div>
        <div class="${valueClass}">${formatFieldValue(field.value, field.type, field.issueKey)}</div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function setupTabSwitching() {
  const tabs = document.querySelectorAll('.fields-tab');
  const contents = document.querySelectorAll('.fields-tab-content');
  
  // Remove old listeners by cloning (prevent duplicate listeners)
  tabs.forEach((tab, index) => {
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);
    
    newTab.addEventListener('click', () => {
      const targetTab = newTab.dataset.tab;
      
      console.log('🔄 Switching to tab:', targetTab);
      
      // Remove active class from all tabs and contents
      document.querySelectorAll('.fields-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.fields-tab-content').forEach(c => c.classList.remove('active'));
      
      // Add active to selected
      newTab.classList.add('active');
      const targetContent = document.getElementById(`tab-${targetTab}`);
      if (targetContent) {
        targetContent.classList.add('active');
        console.log('✅ Tab activated:', targetTab);
      } else {
        console.error('❌ Tab content not found:', `tab-${targetTab}`);
      }
    });
  });
  
  console.log('✅ Tab switching initialized for', tabs.length, 'tabs');
}

function getFieldPriority(label) {
  const priorityMap = {
    'Description': 0, '📝 Description': 0,
    '🚨 Criticidad': 1, '🎫 Tipo de Solicitud': 2, '📂 Área': 3,
    '💻 Plataforma': 4, '🏢 Empresa': 5, '📦 Producto': 6,
    '✉️ Email': 10, '📱 Phone': 11, '🌎 País': 12, '📞 País/Código': 13,
    '⚡ Priority': 20, '✔️ Resolution': 21, '📅 Due Date': 22, '✅ Resolution Date': 23,
    '📝 Notas/Análisis': 30, '✅ Resolución': 31,
    '🎯 Request Type': 200, '🌐 Language': 201, '📁 Issue Category': 202,
  };
  return priorityMap[label] || 100;
}

// ===== EXTRACT ALL RELEVANT FIELDS =====
function extractAllFields(issue) {
  const fields = [];
  const seenKeys = new Set(); // Track already added fields
  
  const excludeFields = new Set([
    // Technical/structural fields to hide (keep everything else visible in All Fields)
    'transitions', 'comments', 'attachment', 'worklog',
    'expand', 'self', 'id', 'changelog', 'operations', 'editmeta', 'names', 'schema',
    'statuscategory', 'statusCategory', 'lastViewed', 'watches',
    'issuelinks', 'subtasks', 'parent', 'aggregatetimespent', 'aggregatetimeoriginalestimate',
    'aggregatetimeestimate', 'aggregateprogress', 'progress', 'workratio', 'avatarUrls',
    'timetracking', 'security', 'votes',
    
    // Redundant fields (already shown in kanban card or sidebar header)
    'key', 'summary', 'status', 'assignee', 'reporter', 'created', 'updated',
    'issuetype',
    
    // Numeric fields that are always 0.0 (unused SLA/tracking fields)
    'customfield_10027', 'customfield_10028', 'customfield_10029', 'customfield_10030',
    'customfield_10041', 'customfield_10042', 'customfield_10196', 'customfield_10197',
    'customfield_10198', 'customfield_10205', 'customfield_10206', 'customfield_10218',
    'customfield_10221', 'customfield_10224', 'customfield_10227', 'customfield_10230',
    'customfield_10233', 'customfield_10236', 'customfield_10237', 'customfield_10238',
    'customfield_10239', 'customfield_10240', 'customfield_10241', 'customfield_10242',
    'customfield_10249', 'customfield_10279', 'customfield_10280', 'customfield_10289',
    'customfield_10292', 'customfield_10295', 'customfield_10301', 'customfield_10341',
    'customfield_10677', 'customfield_10717', 'customfield_10718', 'customfield_10719',
    'customfield_10720', 'customfield_10733', 'customfield_10734',
    
    // Empty/unused system fields
    'customfield_10002', 'customfield_10019', 'customfield_10124',
    'customfield_10148', 'customfield_10157', 'customfield_10159'
  ]);
  
  // Check if value is meaningful (not null, empty, or just structural)
  const hasValue = (val) => {
    if (val === null || val === undefined) return false;
    if (val === '' && typeof val === 'string') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'object') {
      // Description with ADF content
      if (val.content && Array.isArray(val.content)) return true;
      // SLA objects with ongoingCycle have millis data - KEEP them
      if (val.ongoingCycle && (val.ongoingCycle.elapsedTime || val.ongoingCycle.remainingTime)) return true;
      // Request Type object - KEEP it
      if (val._links && val._links.self && val._links.self.includes('requesttype')) return true;
      // Other SLA structure without data - skip
      if (val._links || (val.completedCycles !== undefined && val.ongoingCycle === undefined) || val.slaDisplayFormat) return false;
      // Empty objects
      if (Object.keys(val).length === 0) return false;
      // Has meaningful data
      if (val.name || val.displayName || val.value) return true;
    }
    if (typeof val === 'number' && val === 0) return false;
    return true;
  };
  
  // Field mappings from CUSTOM_FIELDS_REFERENCE.json
  const fieldMappings = {
    // Standard JIRA fields
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
    
    // Form fields (Request-type form fields)
    'customfield_10125': '🚨 Criticidad',
    'customfield_10156': '🎫 Tipo de Solicitud',
    'customfield_10168': '📂 Área',
    'customfield_10169': '💻 Plataforma',
    'customfield_10143': '🏢 Empresa',
    'customfield_10144': '📦 Producto',
    'customfield_10149': '📝 Notas/Análisis',
    'customfield_10151': '✅ Resolución',
    'customfield_10165': '🌎 País',
    'customfield_10167': '📞 País/Código',
    
    // Contact info fields
    'customfield_10141': '✉️ Email',
    'customfield_10142': '📱 Phone',
    'customfield_10111': '👤 Reporter/Informador',
    
    // System fields
    'customfield_10010': '🎯 Request Type',
    'customfield_10061': '📋 Status Transition Log',
    'customfield_10110': '📁 Issue Category',
    'customfield_10115': '🌐 Language',
    'customfield_10166': '🌍 Country (Alternative)',
    'customfield_10024': '🕐 Timestamp',
    
    // SLA fields (links to SLA definitions)
    'customfield_10170': '⏱️ SLA\'s Incidente HUB',
    'customfield_10176': '🔒 Cierre Ticket',
    'customfield_10181': '📺 SLA\'s Servicios Streaming',
    'customfield_10182': '📺 SLA\'s Servicios Streaming (SR)',
    'customfield_10183': '📊 SLA\'s Solicitud de CDRs Captura Logs',
    'customfield_10184': '💰 SLA\'s Cotización Orden de Compra',
    'customfield_10185': '🐛 SLA\'s Errores Pruebas de Integración',
    'customfield_10186': '🔄 SLA\'s Actualización de SDK',
    'customfield_10187': '📈 SLA\'s Splunk',
    'customfield_10190': '🛠️ SLA\'s Soporte Aplicaciones',
    'customfield_10259': '🚨 SLA War Room',
    'customfield_11957': '💚 Salud de Servicios',
    
    // Other common fields
    'customfield_10020': '🏃 Sprint',
    'customfield_10016': '📊 Story Points',
    'customfield_10037': '📖 Epic Link'
  };
  
  // SLA custom field IDs (primary and secondary)
  const slaFieldIds = [
    'customfield_10170', // SLA's Incidente HUB
    'customfield_10176', // Cierre Ticket (secondary)
    'customfield_10181', // SLA's Servicios Streaming
    'customfield_10182', // SLA's Servicios Streaming (SR)
    'customfield_10183', // SLA's Solicitud de CDRs
    'customfield_10184', // SLA's Cotización Orden de Compra
    'customfield_10185', // SLA's Errores Pruebas de Integración
    'customfield_10186', // SLA's Actualización de SDK
    'customfield_10187', // SLA's Splunk
    'customfield_10190', // SLA's Soporte Aplicaciones
    'customfield_10259', // SLA War Room
    'customfield_11957'  // Salud de Servicios
  ];
  
  // Helper to extract fields from an object
  const extractFields = (obj, checkExcluded = false) => {
    if (!obj) return;
    Object.entries(obj).forEach(([key, value]) => {
      if ((checkExcluded && excludeFields.has(key)) || !hasValue(value) || seenKeys.has(key)) return;
      
      // 🔍 FILTER SLA FIELDS: Only show SLAs with active ongoingCycle
      if (slaFieldIds.includes(key)) {
        // Skip SLA fields that don't have an ongoingCycle
        if (!value || typeof value !== 'object' || !value.ongoingCycle) {
          console.log(`⏭️ Skipping ${key} - no active ongoingCycle`);
          return;
        }
        console.log(`✅ Including ${key} - has active ongoingCycle:`, value.name);
        
        // Mark secondary SLA (Cierre Ticket - customfield_10176)
        if (key === 'customfield_10176') {
          value._isSecondarySLA = true;
        }
      }
      
      fields.push({ 
        label: fieldMappings[key] || humanizeFieldName(key),
        value, 
        type: detectFieldType(value), 
        key 
      });
      seenKeys.add(key);
    });
  };
  
  // Add description explicitly first (priority 0)
  if (issue.fields?.description || issue.description) {
    const desc = issue.fields?.description || issue.description;
    if (hasValue(desc)) {
      fields.push({
        label: '📝 Description',
        value: desc,
        type: detectFieldType(desc),
        key: 'description'
      });
      seenKeys.add('description');
    }
  }
  
  // Extract from multiple sources
  extractFields(issue.fields, true); // Check excluded fields
  extractFields(issue.custom_fields);
  extractFields(issue.serviceDesk?.requestFieldValues);
  
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
  
  // Total: ${fields.length} fields extracted
  
  // Define priority order for important fields
  const priorityOrder = {
    // Tier 0: Description (most important, full width)
    'Description': 0,
    '📝 Description': 0,
    
    // Tier 1: Critical business info (top)
    '🚨 Criticidad': 1,
    '🎫 Tipo de Solicitud': 2,
    '📂 Área': 3,
    '💻 Plataforma': 4,
    '🏢 Empresa': 5,
    '📦 Producto': 6,
    
    // Tier 2: Contact & location
    '✉️ Email': 10,
    '📱 Phone': 11,
    '🌎 País': 12,
    '📞 País/Código': 13,
    
    // Tier 3: Status & resolution
    '⚡ Priority': 20,
    '✔️ Resolution': 21,
    '📅 Due Date': 22,
    '✅ Resolution Date': 23,
    
    // Tier 4: Notes & analysis (show full width)
    '📝 Notas/Análisis': 30,
    '✅ Resolución': 31,
    
    // Tier 5: Other fields
    // (unlisted fields get 100)
    
    // Tier 6: System/technical fields (bottom)
    '🎯 Request Type': 200,
    '🌐 Language': 201,
    '📁 Issue Category': 202,
  };
  
  // Sort by priority
  fields.sort((a, b) => {
    const aPriority = priorityOrder[a.label] || 100;
    const bPriority = priorityOrder[b.label] || 100;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Same priority: alphabetical
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
    // Description with ADF content
    if (value.content && Array.isArray(value.content)) return 'description';
    // Request Type (customfield_10010)
    if (value._links && value._links.self && value._links.self.includes('requesttype')) return 'request_type';
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
    if (value.length > 200) return 'text';
    return 'string';
  }
  return 'unknown';
}

// ===== FORMAT FIELD VALUE =====
function formatFieldValue(value, type, issueKey) {
  if (!value && value !== 0 && value !== false) return '—';
  
  switch (type) {
    case 'description':
      // Atlassian Document Format (ADF) - extract text content
      if (value.content && Array.isArray(value.content)) {
        let text = '';
        const extractText = (node) => {
          if (node.type === 'text') {
            text += node.text;
          } else if (node.content) {
            node.content.forEach(extractText);
          }
        };
        value.content.forEach(extractText);
        const escaped = text.trim()
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
        return `<div class="field-text-long">${escaped || '—'}</div>`;
      }
      return String(value);
    
    case 'request_type':
      // Request Type - create button to customer portal
      const requestTypeName = value.name || 'View Request';
      const portalUrl = value._links?.web || '#';
      return `<a href="${portalUrl}" target="_blank" class="request-type-button" title="Open in Customer Portal">
                <span class="icon">🎫</span>
                <span class="text">${requestTypeName}</span>
                <span class="external">↗</span>
              </a>`;
    
    case 'sla':
      // SLA objects with ongoing cycle - show elapsed and remaining millis
      if (value.ongoingCycle) {
        const elapsed = value.ongoingCycle.elapsedTime;
        const remaining = value.ongoingCycle.remainingTime;
        const paused = value.ongoingCycle.paused || false;
        const breached = value.ongoingCycle.breached || false;
        
        const elapsedMs = elapsed?.millis || 0;
        const remainingMs = remaining?.millis || 0;
        
        const elapsedHrs = (elapsedMs / (1000 * 60 * 60)).toFixed(1);
        const remainingHrs = (remainingMs / (1000 * 60 * 60)).toFixed(1);
        
        // Check if this is marked as secondary SLA (by field ID customfield_10176)
        const slaName = value.name || 'SLA';
        const isSecondarySLA = value._isSecondarySLA === true;
        
        const pausedBadge = paused ? '<span style="color: #f59e0b; font-weight: bold;"> ⏸️ PAUSED</span>' : '';
        const secondaryBadge = isSecondarySLA ? '<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; margin-left: 4px;">⚠️ FALLBACK</span>' : '';
        const breachedBadge = breached ? '<span style="color: #ef4444; font-weight: bold;"> 🔴 BREACHED</span>' : '';
        
        const statusColor = breached ? '#ef4444' : (remainingMs < 0 ? '#ef4444' : '#10b981');
        const nameColor = isSecondarySLA ? '#f59e0b' : (breached ? '#ef4444' : '#1e293b');
        
        return `<div style="font-size: 11px;">
          <strong style="color: ${nameColor};">${slaName}</strong>${secondaryBadge}${pausedBadge}${breachedBadge}<br>
          <span style="color: #3b82f6;">⏱️ Elapsed: ${elapsedHrs}h (${elapsedMs.toLocaleString()}ms)</span><br>
          <span style="color: ${statusColor};">⏰ Remaining: ${remainingHrs}h (${remainingMs.toLocaleString()}ms)</span>
          ${isSecondarySLA ? '<br><span style="color: #f59e0b; font-size: 10px;">⚠️ No primary SLA available for this ticket type</span>' : ''}
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
      // Mostrar TODO el texto sin truncar
      const escaped = String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return escaped;
    
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

// ===== RENDER ATTACHMENTS =====
function renderAttachments(issue) {
  const attachmentsSection = document.getElementById('attachmentsSection');
  const attachmentsContainer = document.getElementById('existingAttachmentsContainer');
  const attachmentCountLabel = document.getElementById('attachmentCountLabel');
  
  if (!attachmentsSection || !attachmentsContainer) return;
  
  // Extract attachments from issue.fields.attachment (JIRA API v3 standard location)
  let attachments = [];
  
  if (issue.fields && Array.isArray(issue.fields.attachment)) {
    attachments = issue.fields.attachment;
  } else if (Array.isArray(issue.attachment)) {
    attachments = issue.attachment;
  } else if (Array.isArray(issue.attachments)) {
    attachments = issue.attachments;
  }
  
  if (!attachments || attachments.length === 0) {
    attachmentsSection.style.display = 'none';
    return;
  }
  
  // Show section and update count
  attachmentsSection.style.display = 'block';
  attachmentCountLabel.textContent = `(${attachments.length})`;
  
  // Render attachments list
  let html = '<div class="attachments-grid">';
  
  attachments.forEach((attachment, index) => {
    const filename = attachment.filename || attachment.name || `attachment_${index}`;
    const size = formatFileSize(attachment.size);
    const created = formatDate(attachment.created);
    const author = attachment.author?.displayName || attachment.author || 'Unknown';
    const url = attachment.content || attachment.url || '#';
    const thumbnail = attachment.thumbnail || null;
    const mimeType = attachment.mimeType || 'application/octet-stream';
    
    // Determine if it's an image and should show preview
    const isImage = mimeType.startsWith('image/');
    
    // Determine icon based on MIME type (only for non-images)
    let icon = '📄';
    if (!isImage) {
      if (mimeType.startsWith('video/')) icon = '🎥';
      else if (mimeType.startsWith('audio/')) icon = '🎵';
      else if (mimeType.includes('pdf')) icon = '📕';
      else if (mimeType.includes('word') || mimeType.includes('document')) icon = '📝';
      else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) icon = '📊';
      else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) icon = '📊';
      else if (mimeType.includes('zip') || mimeType.includes('compressed')) icon = '📦';
    }
    
    html += `
      <div class="attachment-card">
        <div class="attachment-icon">
          ${isImage && thumbnail ? 
            `<img src="${thumbnail}" alt="${filename}" class="attachment-thumbnail" onclick="window.open('${url}', '_blank')" style="cursor: pointer;">` : 
            icon
          }
        </div>
        <div class="attachment-details">
          <a href="${url}" target="_blank" class="attachment-filename" title="${filename}">
            ${filename}
          </a>
          <div class="attachment-meta">
            <span class="attachment-size">${size}</span>
            <span class="attachment-separator">•</span>
            <span class="attachment-author">${author}</span>
          </div>
          <div class="attachment-date">${created}</div>
        </div>
        <a href="${url}" download="${filename}" class="attachment-download" title="Download">
          ⬇️
        </a>
      </div>
    `;
  });
  
  html += '</div>';
  attachmentsContainer.innerHTML = html;
}

// ===== INTEGRATION WITH KANBAN CARDS =====
function setupIssueCardClickHandlers() {
  console.log('🔧 [Setup] ===== EXECUTING setupIssueCardClickHandlers =====');
  
  // Setup details buttons with proper drag and drop compatibility
  const detailsButtons = document.querySelectorAll('.issue-details-btn');
  console.log('📋 [Setup] Found', detailsButtons.length, 'details buttons');
  
  detailsButtons.forEach((btn, index) => {
    const issueKey = btn.getAttribute('data-issue-key');
    console.log(`🔧 [Setup] Configuring button ${index + 1}:`, issueKey);
    
    // Force styling
    btn.style.cursor = 'pointer';
    btn.style.pointerEvents = 'auto';
    btn.style.zIndex = '9999';
    btn.style.position = 'relative';
    
    // Remove any existing listeners
    btn.onclick = null;
    
    // Use click with delay to avoid conflict with drag events
    btn.addEventListener('click', function(e) {
      console.log('🎯 [CLICK] Details button clicked for:', issueKey);
      
      // Check if we're in the middle of a drag operation
      if (window.dragTransitionVertical && window.dragTransitionVertical.isDragging) {
        console.log('⚠️ [CLICK] Drag in progress, ignoring button click');
        return;
      }
      
      // Stop propagation to prevent card events
      e.stopPropagation();
      e.preventDefault();
      
      // Small delay to ensure it's a deliberate click, not part of drag
      setTimeout(() => {
        if (typeof openIssueDetails === 'function') {
          console.log('✅ [CLICK] Calling openIssueDetails for:', issueKey);
          openIssueDetails(issueKey);
        } else {
          console.error('❌ [CLICK] openIssueDetails function not found');
        }
      }, 50);
    });
    
    console.log('✅ [Setup] Button configured with mousedown handler for:', issueKey);
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
console.log('🌍 [Global] Exporting right-sidebar functions to window...');
window.openIssueDetails = openIssueDetails;
window.closeSidebar = closeSidebar;
window.initRightSidebar = initRightSidebar;
window.setupMentionSystem = setupMentionSystem;
window.setupIssueCardClickHandlers = setupIssueCardClickHandlers;
console.log('✅ [Global] Functions exported:', {
  openIssueDetails: typeof window.openIssueDetails,
  setupIssueCardClickHandlers: typeof window.setupIssueCardClickHandlers
});
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
    
    // Simple global backup (no stopPropagation)
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('.issue-details-btn');
      if (btn && !btn.onclick) { // Only if no onclick set
        const issueKey = btn.getAttribute('data-issue-key');
        
        if (issueKey) {
          console.log('🎯 [Global Backup] Click on details button:', issueKey);
          
          if (typeof openIssueDetails === 'function') {
            openIssueDetails(issueKey);
          } else {
            console.error('❌ [Global Backup] openIssueDetails function not found');
          }
        }
      }
    });
    
  }, 100);
});

// Also call immediately if DOM is already loaded
if (document.readyState === 'loading') {
  console.log('📄 [Right Sidebar] DOM still loading, will init on DOMContentLoaded');
} else {
  console.log('📄 [Right Sidebar] DOM already loaded, initializing immediately...');
}

// ===== FIELD EXPANSION REMOVED =====
// Text fields now display complete content by default without truncation

// Also call immediately if DOM is already loaded (continued from above)
if (document.readyState !== 'loading') {
  setTimeout(() => {
    initRightSidebar();
    console.log('✅ [Right Sidebar] Immediate init completed');
    
    // Initialize tab switching after sidebar is ready
    console.log('📋 Initializing tabs immediately...');
    setTimeout(() => setupTabSwitching(), 100);
  }, 100);
}

// Initialize tab switching early (for static HTML tabs)
setTimeout(() => {
  console.log('📋 Early tab initialization...');
  setupTabSwitching();
}, 500);
