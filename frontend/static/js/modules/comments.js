/**
 * Comments Module
 * Centralized functions for loading, rendering and posting comments
 */
(function(){
  function formatCommentTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function processCommentText(text) {
    if (!text) return '';
    const isHtml = text.includes('<') && (text.includes('</') || text.includes('/>'));
    if (!isHtml) {
      text = text.replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;')
                 .replace(/\n/g, '<br>');
    }
    text = text.replace(/!([^!]*\.(png|jpg|jpeg|gif|webp|pdf|doc|docx|xls|xlsx|txt|zip|rar|7z|svg))[^!]*!/gi, '');
    text = text.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, (m, alt, url) => {
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
      if (isImage) {
        return `<img src="${url}" alt="${alt}" style="max-width:100%; cursor:pointer;" onclick="window.open('${url}','_blank')" />`;
      }
      return `<a href="${url}" target="_blank">${alt}</a>`;
    });
    text = text.replace(/^[A-Z]{2,3}(\s*<br\s*\/?>|\s*$)/gm, '');
    text = text.replace(/^[A-Z][a-z]+ [A-Z][a-z]+(\s*<br\s*\/?>|\s*$)/gm, '');
    text = text.replace(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\s*<br\s*\/?>|\s*$)/gm, '');
    text = text.replace(/^(SC|SG|Admin|User)(\s*<br\s*\/?>|\s*$)/gm, '');
    text = text.replace(/(<br\s*\/?>){3,}/gi, '<br><br>');
    text = text.replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/gi, '');
    return text.trim();
  }

  async function loadIssueComments(issueKey, opts = {}) {
    // opts: {listSelector, countSelector}
    // support opts.order: 'asc' (oldest first) or 'desc' (newest first)
    const listSel = opts.listSelector || '#commentsList';
    const countSel = opts.countSelector || '#commentCount';
    const commentsList = document.querySelector(listSel);
    const commentCount = document.querySelector(countSel);
    if (!commentsList) return;
    commentsList.innerHTML = '<p class="loading">Loading comments...</p>';
    try {
      const resp = await fetch(`/api/v2/issues/${issueKey}/comments`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      let comments = [];
      if (data.success && data.data) {
        if (Array.isArray(data.data.comments)) comments = data.data.comments;
        else if (Array.isArray(data.data)) comments = data.data;
      } else if (Array.isArray(data)) comments = data;
      else if (data.data && Array.isArray(data.data)) comments = data.data;
      else if (data.comments && Array.isArray(data.comments)) comments = data.comments;
      else if (data.result && Array.isArray(data.result)) comments = data.result;
      if (!Array.isArray(comments)) comments = [];
      if (comments.length === 0) {
        commentsList.innerHTML = '<p class="no-comments">No comments yet</p>';
        if (commentCount) commentCount.textContent = '(0)';
        return;
      }
      if (commentCount) commentCount.textContent = `(${comments.length})`;
      let html = '';
      // Optionally reverse order to show newest first
      const order = (opts.order || 'asc').toLowerCase();
      const iter = order === 'desc' ? comments.slice().reverse() : comments;

      iter.forEach((comment, index) => {
        const author = comment.author?.displayName || comment.author || 'Unknown';
        const time = formatCommentTime(comment.created || comment.timestamp);
        let text = comment.body_html || comment.body || comment.text || '';
        text = processCommentText(text);
        const initials = author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
        const commentId = comment.id || index;
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
                <button class="comment-action-btn reply">↩️ Reply</button>
                <button class="comment-action-btn like">👍 Like</button>
              </div>
            </div>
          </div>
        `;
      });
      commentsList.innerHTML = html;
      setupCommentEventListeners(issueKey, {listSelector: listSel});
      // If newest-first, ensure top of list (newest) is visible just under composer
      try {
        commentsList.scrollTop = 0;
      } catch (e) { /* ignore */ }
    } catch (err) {
      commentsList.innerHTML = '<p class="error">Failed to load comments</p>';
    }
  }

  function setupCommentEventListeners(issueKey, opts = {}) {
    const listSel = opts.listSelector || '#commentsList';
    const container = document.querySelector(listSel);
    if (!container) return;
    const actionBtns = container.querySelectorAll('.comment-action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const comment = e.target.closest('.comment');
        if (!comment) return;
        const authorName = comment.dataset.author || '';
        if (btn.classList.contains('reply')) {
          const textarea = document.querySelector(opts.textareaSelector || '#commentText');
          if (textarea) {
            const mention = `@${authorName} `;
            if (!textarea.value.includes(mention)) textarea.value = mention + textarea.value;
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            textarea.placeholder = `Reply to ${authorName}...`;
          }
        }
      });
    });
  }

  async function postComment(issueKey, opts = {}) {
    // opts: {textareaSelector, internalCheckboxSelector, listSelector, countSelector, format}
    const taSel = opts.textareaSelector || '#commentText';
    const checkboxSel = opts.internalCheckboxSelector || '#commentInternal';
    const listSel = opts.listSelector || '#commentsList';
    const countSel = opts.countSelector || '#commentCount';
    const textarea = document.querySelector(taSel);
    if (!textarea) return { success:false, message:'No textarea' };
    const text = textarea.value.trim();
    if (!text) return { success:false, message:'Empty' };
    const internalCheckbox = document.querySelector(checkboxSel);
    const isInternal = internalCheckbox ? internalCheckbox.checked : false;
    try {
      const btn = document.querySelector(opts.buttonSelector || '.btn-add-comment');
      const originalText = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Posting...'; }
      const response = await fetch(`/api/v2/issues/${issueKey}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text, internal: isInternal, format: opts.format || 'text' })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const success = data.success || (data.data && data.data.id) || data.id;
      if (success) {
        textarea.value = '';
        if (internalCheckbox) { internalCheckbox.checked = false; const vis = document.querySelector(opts.visibilityLabelSelector || '.visibility-label'); if (vis) vis.textContent = '🔓 Public'; }
        if (countSel) { const countEl = document.querySelector(countSel); if (countEl) { const cur = parseInt(countEl.textContent.replace(/[^0-9]/g,'')) || 0; countEl.textContent = `(${cur+1})`; } }
        // reload
        await loadIssueComments(issueKey, {listSelector: listSel, countSelector: countSel});
        return { success:true };
      }
      return { success:false, message:'API failed' };
    } catch (err) {
      console.error('postComment error', err);
      return { success:false, message: err.message };
    } finally {
      const btn = document.querySelector(opts.buttonSelector || '.btn-add-comment');
      if (btn) { btn.disabled = false; btn.textContent = originalText || 'Add Comment'; }
    }
  }

  function setupCommentShortcuts() {
    const commentText = document.getElementById('commentText');
    if (!commentText) return;
    commentText.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.querySelector('.btn-add-comment')?.click();
      }
    });
  }

  // Expose
  window.commentsModule = {
    formatCommentTime,
    processCommentText,
    loadIssueComments,
    setupCommentEventListeners,
    postComment,
    setupCommentShortcuts
  };
})();
