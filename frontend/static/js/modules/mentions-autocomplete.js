/**
 * Mentions Autocomplete Module
 * Handles @mention autocomplete functionality in textareas
 */

const createMentionsAutocomplete = (() => {
  let activeTextarea = null;
  let autocompleteDropdown = null;
  let mentionableUsers = [];
  let currentIssueKey = '';
  let currentQuery = '';
  let selectedIndex = 0;

  /**
   * Initialize mentions system
   */
  function init() {
    // Create dropdown element
    createDropdown();
    window.logger?.debug('✅ Mentions autocomplete initialized');
  }

  /**
   * Create autocomplete dropdown element
   */
  function createDropdown() {
    if (autocompleteDropdown) return;

    autocompleteDropdown = document.createElement('div');
    autocompleteDropdown.className = 'mentions-autocomplete-dropdown';
    autocompleteDropdown.style.display = 'none';
    autocompleteDropdown.innerHTML = '<div class="mentions-loading">Loading...</div>';
    document.body.appendChild(autocompleteDropdown);
  }

  /**
   * Attach mention autocomplete to a textarea
   */
  function attachTo(textarea, issueKey) {
    if (!textarea) {
      console.warn('⚠️ Cannot attach mentions: textarea not found');
      return;
    }

    console.log(`🔧 Attaching mentions to textarea for ${issueKey}`, {
      textareaId: textarea.id,
      textareaValue: textarea.value.substring(0, 50),
      hasDropdown: !!autocompleteDropdown
    });

    currentIssueKey = issueKey;
    activeTextarea = textarea;

    // Remove old listeners to avoid duplicates
    textarea.removeEventListener('input', handleInput);
    textarea.removeEventListener('keydown', handleKeydown);
    textarea.removeEventListener('blur', handleBlur);

    // Add event listeners
    textarea.addEventListener('input', handleInput);
    textarea.addEventListener('keydown', handleKeydown);
    textarea.addEventListener('blur', handleBlur);

    console.log(`✅ Mentions attached to textarea for ${issueKey}`);
  }

  /**
   * Handle textarea input
   */
  function handleInput(event) {
    const textarea = event.target;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);

    // Check if we're typing a mention
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9._-]*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      currentQuery = query;
      console.log(`🔍 Mention detected: @${query} (issue: ${currentIssueKey})`);
      showAutocomplete(textarea, query);
    } else {
      hideAutocomplete();
    }
  }

  /**
   * Handle keyboard navigation
   */
  function handleKeydown(event) {
    if (!autocompleteDropdown || autocompleteDropdown.style.display === 'none') {
      return;
    }

    const items = autocompleteDropdown.querySelectorAll('.mention-item');

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items);
        break;

      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection(items);
        break;

      case 'Enter':
      case 'Tab':
        if (items.length > 0 && selectedIndex >= 0) {
          event.preventDefault();
          selectUser(items[selectedIndex]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        hideAutocomplete();
        break;
    }
  }

  /**
   * Handle textarea blur (with delay for click events)
   */
  function handleBlur() {
    setTimeout(() => {
      hideAutocomplete();
    }, 200);
  }

  /**
   * Fetch mentionable users from API
   */
  async function fetchMentionableUsers(issueKey, query = '') {
    try {
      const url = `/api/v2/issues/${issueKey}/mentions/users?query=${encodeURIComponent(query)}`;
      console.log(`📡 Fetching mentionable users: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
      });

      console.log(`📡 Mentions API response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`📥 Mentions API data:`, data);

      if (data.success || data.data?.success) {
        // Handle wrapped response from json_response decorator
        const users = data.users || data.data?.users || [];
        mentionableUsers = users;
        console.log(`✅ Fetched ${mentionableUsers.length} mentionable users`);
        return mentionableUsers;
      }

      console.warn('⚠️ API response missing success flag:', data);
      return [];
    } catch (error) {
      console.error(`❌ Failed to fetch mentionable users: ${error.message}`);
      return [];
    }
  }

  /**
   * Show autocomplete dropdown
   */
  async function showAutocomplete(textarea, query) {
    if (!currentIssueKey) {
      window.logger?.warn('⚠️ No issue key set for mentions');
      return;
    }

    // Fetch users
    const users = await fetchMentionableUsers(currentIssueKey, query);

    if (users.length === 0) {
      hideAutocomplete();
      return;
    }

    // Render dropdown
    renderDropdown(users, query);

    // Position dropdown
    positionDropdown(textarea);

    // Show dropdown
    autocompleteDropdown.style.display = 'block';
    selectedIndex = 0;
    updateSelection(autocompleteDropdown.querySelectorAll('.mention-item'));
  }

  /**
   * Render autocomplete dropdown
   */
  function renderDropdown(users, query) {
    const queryLower = query.toLowerCase();
    const filteredUsers = users.filter(user => {
      const displayName = (user.displayName || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      const email = (user.emailAddress || '').toLowerCase();
      return displayName.includes(queryLower) ||
             username.includes(queryLower) ||
             email.includes(queryLower);
    });

    if (filteredUsers.length === 0) {
      autocompleteDropdown.innerHTML = '<div class="mentions-empty">No users found</div>';
      return;
    }

    let html = '<div class="mentions-list">';
    filteredUsers.slice(0, 10).forEach((user, index) => {
      const initial = (user.displayName || '?')[0].toUpperCase();
      html += `
        <div class="mention-item" data-index="${index}" data-username="${user.username || user.displayName}">
          <div class="mention-avatar" style="background-image: url('${user.avatarUrl || ''}')">
            ${user.avatarUrl ? '' : initial}
          </div>
          <div class="mention-info">
            <div class="mention-name">${user.displayName || 'Unknown'}</div>
            <div class="mention-email">${user.emailAddress || ''}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    autocompleteDropdown.innerHTML = html;

    // Attach click listeners
    const items = autocompleteDropdown.querySelectorAll('.mention-item');
    items.forEach(item => {
      item.addEventListener('click', () => selectUser(item));
    });
  }

  /**
   * Position dropdown above textarea (not below)
   */
  function positionDropdown(textarea) {
    const rect = textarea.getBoundingClientRect();
    const dropdownHeight = autocompleteDropdown.offsetHeight || 200;
    
    // Position above textarea with small gap
    const top = rect.top - dropdownHeight - 8;
    const left = rect.left;
    
    autocompleteDropdown.style.position = 'fixed';
    autocompleteDropdown.style.left = `${left}px`;
    autocompleteDropdown.style.top = `${Math.max(10, top)}px`;
    autocompleteDropdown.style.width = `${Math.min(280, rect.width)}px`;
  }

  /**
   * Update visual selection in dropdown
   */
  function updateSelection(items) {
    items.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  /**
   * Select a user from autocomplete
   */
  function selectUser(item) {
    if (!activeTextarea) return;

    const username = item.dataset.username;
    const textarea = activeTextarea;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const textAfterCursor = textarea.value.substring(cursorPos);

    // Replace @query with @username
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9._-]*)$/);
    if (mentionMatch) {
      const mentionStart = cursorPos - mentionMatch[0].length;
      const newText = textarea.value.substring(0, mentionStart) +
                      `@${username} ` +
                      textAfterCursor;
      textarea.value = newText;

      // Move cursor after the mention
      const newCursorPos = mentionStart + username.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);

      // Trigger input event for other listeners
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      window.logger?.info(`✅ Mentioned user: @${username}`);
    }

    hideAutocomplete();
  }

  /**
   * Hide autocomplete dropdown
   */
  function hideAutocomplete() {
    if (autocompleteDropdown) {
      autocompleteDropdown.style.display = 'none';
    }
    selectedIndex = 0;
  }

  // Public API
  return {
    init,
    attachTo,
    hideAutocomplete,
    fetchMentionableUsers
  };
})();

// Export to window and initialize immediately
if (typeof window !== 'undefined') {
  window.mentionsAutocomplete = createMentionsAutocomplete;
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🔄 Initializing mentions autocomplete...');
      window.mentionsAutocomplete.init();
    });
  } else {
    console.log('🔄 Initializing mentions autocomplete...');
    window.mentionsAutocomplete.init();
  }
}
