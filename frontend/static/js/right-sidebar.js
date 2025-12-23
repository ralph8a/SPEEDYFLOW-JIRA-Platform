/**
 * right-sidebar.js (stub)
 *
 * The full right sidebar implementation has been archived to
 * `right-sidebar.deprecated.js`. This file intentionally contains a small
 * safe stub that preserves the public API expected by other modules while
 * avoiding any runtime DOM manipulation or heavy logic.
 */

/* eslint-disable no-unused-vars */
console.log('ℹ️ right-sidebar.js loaded as safe stub (implementation archived).');

// Lightweight no-op API to avoid breaking callers
window.rightSidebar = window.rightSidebar || {
  init: () => { /* no-op */ },
  open: () => { /* no-op */ },
  close: () => { /* no-op */ },
  setupCardHandlers: () => { /* no-op */ },
  switchPanel: () => { /* no-op */ },
  setupMentionSystem: () => { /* no-op */ },
  setupAttachmentsSystem: () => { /* no-op */ },
  setupCommentShortcuts: () => { /* no-op */ }
};

// Preserve function names expected elsewhere as safe no-ops
// Implement a lightweight openIssueDetails that delegates to the Flowing footer
// If the real footer is available, call its public API; otherwise dispatch a
// centralized CustomEvent so other modules (e.g., flowing-mvp-footer) can react.
function openIssueDetailsImpl(issueKey) {
  try {
    if (!issueKey) return;

    // Dispatch a centralized CustomEvent so any listener (Flowing MVP or others)
    // can react and open the balanced view. Right-sidebar is deprecated and
    // should not call Flowing internals directly.
    try {
      window.dispatchEvent(new CustomEvent('flowing:switchedToBalanced', { detail: issueKey }));
    } catch (e) { /* ignore */ }
  } catch (err) { /* silent */ }
}

window.openIssueDetails = window.openIssueDetails || function (issueKey) { return openIssueDetailsImpl(issueKey); };
window.closeSidebar = window.closeSidebar || function () { /* no-op */ };
window.initRightSidebar = window.initRightSidebar || function () { /* no-op */ };
window.setupMentionSystem = window.setupMentionSystem || function () { /* no-op */ };
window.setupIssueCardClickHandlers = window.setupIssueCardClickHandlers || function () { /* no-op */ };
window.setupAttachmentsSystem = window.setupAttachmentsSystem || function () { /* no-op */ };
window.setupCommentShortcuts = window.setupCommentShortcuts || function () { /* no-op */ };

/* End of stub */
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
  if (window.commentsModule && typeof window.commentsModule.formatCommentTime === 'function') {
    return window.commentsModule.formatCommentTime(dateString);
  }
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
    let icon = SVGIcons.file({ size: 18, className: 'attachment-icon-svg' });
    // Future: map specific mime -> different icons; fallback to file icon

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
          ${SVGIcons.download({ size: 18, className: 'attachment-download-svg' })}
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
  // Single canonical selector to avoid confusion
  const detailsButtons = document.querySelectorAll('.issueDetailsBtn');
  console.log('📋 [Setup] Found', detailsButtons.length, 'details buttons');

  detailsButtons.forEach((btn, index) => {
    // Robustly resolve issue key from several possible attributes or nearby elements
    const getIssueKeyFromBtn = (el) => {
      if (!el) return null;
      // direct attributes
      const candidates = [el.getAttribute('data-issue-key'), el.dataset.issueKey, el.dataset.issue, el.getAttribute('data-key'), el.getAttribute('data-issue')];
      for (const c of candidates) if (c) return c;
      // check parent card elements for common attributes
      let p = el.closest('[data-issue-key], [data-issue], [data-key]');
      if (p) return p.getAttribute('data-issue-key') || p.getAttribute('data-issue') || p.getAttribute('data-key');
      // try to find an issue key pattern in text content of element or parent
      const txt = (el.textContent || '') + ' ' + (el.closest('.card')?.textContent || '');
      const m = txt.match(/([A-Z][A-Z0-9]+-\d+)/);
      if (m) return m[1];
      return null;
    };

    const issueKey = getIssueKeyFromBtn(btn);
    console.log(`🔧 [Setup] Configuring button ${index + 1}:`, issueKey);

    // Force styling
    btn.style.cursor = 'pointer';
    btn.style.pointerEvents = 'auto';
    btn.style.zIndex = '9999';
    btn.style.position = 'relative';

    // Remove any existing listeners
    btn.onclick = null;

    // Use click with delay to avoid conflict with drag events
    btn.addEventListener('click', function (e) {
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
        if (typeof openIssueDetails === 'function' && issueKey) {
          console.log('✅ [CLICK] Calling openIssueDetails for:', issueKey);
          openIssueDetails(issueKey);
        } else if (!issueKey) {
          console.warn('⚠️ [CLICK] Could not resolve issue key for clicked button', btn);
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

// Delegated click: if user clicks attach button but setup failed earlier, retry setup
document.addEventListener('click', (e) => {
  const target = e.target.closest('#attachBtn, .comment-toolbar-btn');
  if (!target) return;
  // If attachmentsPreview exists but has no children, try setupAttachmentsSystem
  const preview = document.getElementById('attachmentsPreview');
  const list = document.getElementById('attachmentsList');
  if ((preview && (!preview.classList.contains('show') || (list && list.children.length === 0))) || !document.getElementById('attachBtn')) {
    try {
      setTimeout(() => { if (typeof setupAttachmentsSystem === 'function') setupAttachmentsSystem(); }, 80);
    } catch (err) { /* silent */ }
  }
});

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
  if (window.commentsModule && typeof window.commentsModule.setupCommentShortcuts === 'function') {
    return window.commentsModule.setupCommentShortcuts();
  }
}

// ===== EXPORT FOR USE =====
window.rightSidebar = {
  init: initRightSidebar,
  open: openIssueDetails,
  close: closeSidebar,
  setupCardHandlers: setupIssueCardClickHandlers,
  switchPanel: function () { /* no-op fallback */ },
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
window.renderKanban = function () {
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
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.issueDetailsBtn');
      if (btn && !btn.onclick) { // Only if no onclick set
        // resolve issue key robustly
        const getIssueKeyFromBtn = (el) => {
          if (!el) return null;
          const candidates = [el.getAttribute('data-issue-key'), el.dataset.issueKey, el.dataset.issue, el.getAttribute('data-key'), el.getAttribute('data-issue')];
          for (const c of candidates) if (c) return c;
          const p = el.closest('[data-issue-key], [data-issue], [data-key]');
          if (p) return p.getAttribute('data-issue-key') || p.getAttribute('data-issue') || p.getAttribute('data-key');
          const txt = (el.textContent || '') + ' ' + (el.closest('.card')?.textContent || '');
          const m = txt.match(/([A-Z][A-Z0-9]+-\d+)/);
          if (m) return m[1];
          return null;
        };

        const issueKey = getIssueKeyFromBtn(btn);

        if (issueKey) {
          console.log('🎯 [Global Backup] Click on details button:', issueKey);
          if (typeof openIssueDetails === 'function') {
            openIssueDetails(issueKey);
          } else {
            console.error('❌ [Global Backup] openIssueDetails function not found');
          }
        } else {
          console.warn('⚠️ [Global Backup] Could not resolve issue key for clicked button', btn);
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
