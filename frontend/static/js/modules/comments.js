/**
 * Comments Module
 * Handles all comment operations: fetching, rendering, creating, editing, deleting
 * Integrates with API and state management
 */

const createCommentsModule = (() => {
  // Note: api, state, and logger are expected to be available in window scope
  // They are imported in app.js and made globally available

  let selectedAttachments = [];

  /**
   * Fetch comments for an issue
   */
  async function fetchComments(issueKey) {
    try {
      if (!window.api) throw new Error('API module not available');
      if (!window.logger) throw new Error('Logger not available');

      window.logger.debug(`📥 Fetching comments for: ${issueKey}`);
      const response = await window.api.getComments(issueKey);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load comments');
      }

      const commentList = response.comments || response.data || [];
      const attachments = response.attachments || [];
      const attachmentMap = response.attachment_map || {}; // filename → id mapping
      window.logger.info(`✅ Loaded ${commentList.length} comments for ${issueKey}`);
      window.logger.debug(`📎 Found ${attachments.length} attachments for ${issueKey}`);
      return { comments: commentList, attachments, attachmentMap };
    } catch (error) {
      window.logger?.error(`❌ Failed to fetch comments: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse and render images from comment body text
   * Supports JIRA format: ![filename|options]
   * Uses attachment map to convert filenames to attachment IDs for proxy URLs
   */
  function renderImagesFromBody(bodyText, issueKey, attachmentMap) {
    if (!bodyText) return '';

    let html = bodyText;
    
    // Match JIRA image syntax: ![filename|options] where filename is the attachment
    // Example: ![WhatsApp Image 2025-11-14 at 11.27.50 AM-20251114-172803.jpeg|width=997,alt="..."]
    html = html.replace(/!\[([^\|\]]+)(?:\|[^\]]*)?]/g, (match, filename) => {
      // Get the clean filename (without query parameters)
      const cleanFilename = filename.trim();
      
      // Check if this looks like an image file
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
      const fileExtension = cleanFilename.split('.').pop().toLowerCase();
      
      if (imageExtensions.includes(fileExtension) && issueKey && attachmentMap) {
        // Look up the attachment ID from the map
        const attachmentId = attachmentMap[cleanFilename];
        if (attachmentId) {
          // Build URL using the attachment proxy with the ID
          const imageUrl = `/api/issues/${issueKey}/attachments/${attachmentId}`;
          return `<div class="comment-inline-image"><img src="${imageUrl}" alt="${cleanFilename}" title="${cleanFilename}" /></div>`;
        }
      }
      
      return match; // Return original if not a recognized image or no mapping found
    });
    
    return html;
  }

  /**
   * Render comments list
   */
  function renderCommentsList(commentList, container, issueKey = '', attachmentMap = {}) {
    if (!container) {
      window.logger?.warn('⚠️ Comments container not found');
      return;
    }

    if (!commentList || commentList.length === 0) {
      container.innerHTML = `
        <div class="comments-empty">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      `;
      return;
    }

    const sortedComments = [...commentList].sort((a, b) => {
      const dateA = new Date(a.created || 0);
      const dateB = new Date(b.created || 0);
      return dateB - dateA;
    });

    let html = '<div class="comments-list">';

    sortedComments.forEach((comment, index) => {
      const authorInitial = (comment.author?.[0] || '?').toUpperCase();
      const createdDate = formatCommentDate(comment.created);
      const body = sanitizeHTML(comment.body || '');
      const bodyWithImages = renderImagesFromBody(body, issueKey, attachmentMap);
            html += `
        <div class="comment" data-comment-id="${comment.id || index}">
          <div class="comment-header">
            <div class="comment-author">
              <div class="comment-author-avatar" title="${comment.author || 'Unknown'}">${authorInitial}</div>
              <div class="comment-author-info">
                <span class="comment-author-name">${comment.author || 'Unknown'}</span>
                <span class="comment-date" title="${comment.created || ''}">${createdDate}</span>
              </div>
            </div>
            <div class="comment-actions">
              <button class="comment-action-btn" title="Reply" data-action="reply">
                <span>💬</span>
              </button>
              <button class="comment-action-btn" title="Edit" data-action="edit">
                <span>✏️</span>
              </button>
              <button class="comment-action-btn" title="Delete" data-action="delete">
                <span>🗑️</span>
              </button>
            </div>
          </div>
          <div class="comment-body">
            ${bodyWithImages}
          </div>
          ${comment.updated && comment.updated !== comment.created ? `
            <div class="comment-footer">
              <small class="comment-edited">Edited ${formatCommentDate(comment.updated)}</small>
            </div>
          ` : ''}
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    attachCommentEventListeners(container);
    window.logger?.debug(`✅ Rendered ${commentList.length} comments`);
  }

  /**
   * Render comment form
   */
  function renderCommentForm(container, issueKey) {
    if (!container) {
      window.logger?.warn('⚠️ Comment form container not found');
      return;
    }


    container.innerHTML = `
      <div class="comment-form">
        <h3>Add Comment</h3>
        <div class="comment-visibility">
          <label class="visibility-option">
            <input type="radio" name="commentVisibility" value="customer" checked />
            <span>Response to customer</span>
          </label>
          <label class="visibility-option">
            <input type="radio" name="commentVisibility" value="internal" />
            <span>Internal note</span>
          </label>
        </div>
        <textarea 
          id="commentInput" 
          class="comment-textarea" 
          placeholder="Share your thoughts... (Type @ to mention team members)"
          rows="4"
        ></textarea>
        <div class="mention-help">
          💡 Tip: Type @ to mention team members. Use ↑↓ arrows to navigate, Enter to select
        </div>
        <div class="form-actions">
          <div class="action-row">
            <button class="btn btn-primary" id="submitCommentBtn">📤 Post Comment</button>
            <button class="btn btn-secondary" id="cancelCommentBtn">✕ Cancel</button>
            <label class="attachment-picker" for="commentAttachmentInput">
              <span>📎 Attach</span>
            </label>
          </div>
          <input
            type="file"
            id="commentAttachmentInput"
            multiple
            aria-label="Attach files to comment"
            style="display: none;"
          />
          <div id="commentAttachmentPreview" class="comment-attachment-preview empty">
            <span class="attachment-placeholder">No files selected</span>
          </div>
        </div>
      </div>
    `;

    clearSelectedAttachments();

    // Attach form listeners
    const submitBtn = document.getElementById('submitCommentBtn');
    const cancelBtn = document.getElementById('cancelCommentBtn');
    const textarea = document.getElementById('commentInput');

    if (submitBtn) {
      submitBtn.addEventListener('click', () => submitComment(issueKey, textarea));
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => clearCommentForm(textarea));
    }

    const attachmentInput = document.getElementById('commentAttachmentInput');
    const attachmentPreview = document.getElementById('commentAttachmentPreview');

    if (attachmentInput) {
      attachmentInput.addEventListener('change', handleAttachmentInputChange);
    }

    if (attachmentPreview) {
      attachmentPreview.addEventListener('click', handleAttachmentPreviewClick);
    }

    // Attach mention listeners
    if (textarea && window.mentions) {
      window.mentions.attachTo(textarea);
    }

    window.logger?.debug('✅ Rendered comment form');
  }

  /**
   * Submit new comment
   */
  async function submitComment(issueKey, textarea) {
    const body = textarea?.value?.trim();
    const visibility = getCommentVisibility();

    if (!body) {
      window.logger?.warn('⚠️ Comment body is empty');
      return;
    }

    try {
      window.logger?.debug(`📤 Submitting comment for: ${issueKey}`);
      await uploadAttachments(issueKey);
      const response = await window.api.addComment(issueKey, {
        body,
        internal: visibility === 'internal'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to post comment');
      }

      window.logger?.info('✅ Comment posted successfully');
      
      // Clear form
      clearCommentForm(textarea);
      
      // Refresh comments
      await refreshComments(issueKey);
    } catch (error) {
      window.logger?.error(`❌ Failed to submit comment: ${error.message}`);
      showCommentError(textarea?.parentElement, error.message);
    }
  }

  /**
   * Edit comment
   */
  async function editComment(issueKey, commentId, newBody) {
    try {
      window.logger?.debug(`📝 Editing comment: ${commentId}`);
      
      const response = await window.api.updateComment(issueKey, commentId, { body: newBody });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update comment');
      }

      window.logger?.info('✅ Comment updated successfully');
      await refreshComments(issueKey);
    } catch (error) {
      window.logger?.error(`❌ Failed to edit comment: ${error.message}`);
      showCommentError(document.body, error.message);
    }
  }

  /**
   * Delete comment
   */
  async function deleteComment(issueKey, commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      window.logger?.debug(`🗑️ Deleting comment: ${commentId}`);
      
      const response = await window.api.deleteComment(issueKey, commentId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete comment');
      }

      window.logger?.info('✅ Comment deleted successfully');
      await refreshComments(issueKey);
    } catch (error) {
      window.logger?.error(`❌ Failed to delete comment: ${error.message}`);
      showCommentError(document.body, error.message);
    }
  }

  /**
   * Refresh comments display
   */
  async function refreshComments(issueKey) {
    try {
      const { comments: commentList } = await fetchComments(issueKey);
      const container = document.getElementById('issueComments');
      if (container) {
        renderCommentsList(commentList, container);
      }
    } catch (error) {
      window.logger?.error(`❌ Failed to refresh comments: ${error.message}`);
    }
  }

  /**
   * Clear comment form
   */
  function clearCommentForm(textarea) {
    if (textarea) {
      textarea.value = '';
      textarea.focus();
    }
    clearSelectedAttachments();
    resetCommentVisibility();
    const submitBtn = document.getElementById('submitCommentBtn');
    if (submitBtn) {
      submitBtn.textContent = 'Post Comment';
      delete submitBtn.dataset.editCommentId;
      delete submitBtn.dataset.editIssueKey;
    }
    window.logger?.debug('✅ Comment form cleared');
  }

  function getCommentVisibility() {
    const radios = document.getElementsByName('commentVisibility');
    for (const radio of radios) {
      if (radio.checked) return radio.value;
    }
    return 'customer';
  }

  function resetCommentVisibility() {
    const radios = document.getElementsByName('commentVisibility');
    for (const radio of radios) {
      radio.checked = radio.value === 'customer';
    }
  }

  /**
   * Show comment error
   */
  function showCommentError(container, message) {
    if (!container) return;

    const errorEl = document.createElement('div');
    errorEl.className = 'comment-error';
    errorEl.textContent = `❌ ${message}`;
    container.prepend(errorEl);

    setTimeout(() => errorEl.remove(), 5000);
  }

  /**
   * Format comment date for display
   */
  function formatCommentDate(dateString) {
    if (!dateString) return '';

    try {
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

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch (error) {
      window.logger?.warn(`⚠️ Failed to format date: ${dateString}`);
      return dateString;
    }
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  function sanitizeHTML(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
  }

  function handleAttachmentInputChange(event) {
    const files = Array.from(event?.target?.files || []);
    selectedAttachments = files.map(file => ({ file, uploaded: false }));
    renderAttachmentPreview();
    window.logger?.debug(`📎 Selected ${files.length} attachment(s)`);
  }

  function handleAttachmentPreviewClick(event) {
    const clicked = event.target.closest('[data-action="remove-attachment"]');
    if (!clicked) return;
    const index = Number(clicked.dataset.index);
    if (!Number.isNaN(index)) {
      removeAttachment(index);
    }
  }

  function renderAttachmentPreview() {
    const preview = document.getElementById('commentAttachmentPreview');
    if (!preview) return;

    if (!selectedAttachments.length) {
      preview.classList.add('empty');
      preview.innerHTML = '<span class="attachment-placeholder">No files selected</span>';
      return;
    }

    preview.classList.remove('empty');
    preview.innerHTML = selectedAttachments.map((entry, index) => {
      const safeName = sanitizeHTML(entry.file?.name || 'attachment');
      const statusBadge = entry.uploaded ? '<span class="attachment-chip-status">uploaded</span>' : '';
      return `
        <div class="attachment-chip" data-index="${index}">
          <span>${safeName}</span>
          ${statusBadge}
          <button
            type="button"
            class="attachment-chip-close"
            data-action="remove-attachment"
            data-index="${index}"
            aria-label="Remove attachment"
          >×</button>
        </div>
      `;
    }).join('');
  }

  function removeAttachment(index) {
    selectedAttachments = selectedAttachments.filter((_, idx) => idx !== index);
    renderAttachmentPreview();
  }

  function clearSelectedAttachments() {
    selectedAttachments = [];
    const attachmentInput = document.getElementById('commentAttachmentInput');
    if (attachmentInput) {
      attachmentInput.value = '';
    }
    renderAttachmentPreview();
  }

  async function uploadAttachments(issueKey) {
    const pending = selectedAttachments.filter(entry => !entry.uploaded);
    if (!pending.length) return;
    if (!window.api?.uploadAttachment) {
      throw new Error('Attachment upload API is unavailable');
    }

    for (const entry of pending) {
      const result = await window.api.uploadAttachment(issueKey, entry.file);
      if (!result?.success) {
        const errMsg = result?.error || 'Attachment upload failed';
        throw new Error(errMsg);
      }
      entry.uploaded = true;
      window.logger?.info(`📎 Uploaded ${entry.file.name}`);
    }

    renderAttachmentPreview();
  }

  /**
   * Attach event listeners to comment actions
   */
  function attachCommentEventListeners(container) {
    const buttons = container.querySelectorAll('.comment-action-btn');

    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const commentEl = btn.closest('.comment');
        const commentId = commentEl?.dataset.commentId;
        const issueKey = window.state?.getSelectedIssue()?.key;

        window.logger?.debug(`🎯 Comment action: ${action} (ID: ${commentId})`);

        switch (action) {
          case 'reply':
            handleReplyComment(commentId, commentEl);
            break;
          case 'edit':
            handleEditComment(commentId, commentEl, issueKey);
            break;
          case 'delete':
            handleDeleteComment(commentId, issueKey);
            break;
          default:
            window.logger?.warn(`⚠️ Unknown action: ${action}`);
        }
      });
    });
  }

  /**
   * Handle reply to comment
   */
  function handleReplyComment(commentId, commentEl) {
    window.logger?.debug(`💬 Reply to comment: ${commentId}`);
    // Highlight the comment
    commentEl?.classList.add('comment-highlighted');
    // Focus comment input
    const textarea = document.getElementById('commentInput');
    if (textarea) {
      textarea.focus();
      textarea.value = `@${commentEl?.querySelector('.comment-author-name')?.textContent || 'Unknown'} `;
    }
  }

  /**
   * Handle edit comment
   */
  function handleEditComment(commentId, commentEl, issueKey) {
    window.logger?.debug(`✏️ Edit comment: ${commentId}`);
    const body = commentEl?.querySelector('.comment-body')?.textContent;
    const textarea = document.getElementById('commentInput');

    if (textarea) {
      textarea.value = body || '';
      textarea.focus();

      // Change submit button to "Update"
      const submitBtn = document.getElementById('submitCommentBtn');
      if (submitBtn) {
        submitBtn.textContent = 'Update Comment';
        submitBtn.dataset.editCommentId = commentId;
        submitBtn.dataset.editIssueKey = issueKey;
      }
    }
  }

  /**
   * Handle delete comment
   */
  function handleDeleteComment(commentId, issueKey) {
    window.logger?.debug(`🗑️ Delete comment: ${commentId}`);
    deleteComment(issueKey, commentId);
  }

  // ==================== PUBLIC API ====================
  return {
    fetchComments,
    renderCommentsList,
    renderCommentForm,
    submitComment,
    editComment,
    deleteComment,
    refreshComments,
    formatCommentDate,
  };
})();

// Export as default for ES6 module systems
export default createCommentsModule;

