/**
 * SPEEDYFLOW - Mentions System
 * Auto-complete @mentions with user lookup, highlighting, and notifications
 */

class MentionSystem {
  constructor() {
    this.users = [];
    this.isOpen = false;
    this.selectedIndex = 0;
    this.mentionStartPos = -1;
    this.currentQuery = '';
    this.mentionedUsers = new Set();
  }

  /**
   * Initialize mentions system for a textarea
   */
  async init(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) {
      console.warn('⚠️ [Mentions] Textarea not found:', textareaId);
      return;
    }

    console.log('🎯 [Mentions] Initializing for textarea:', textareaId);
    
    // Fetch available users from API
    await this.loadUsers();
    console.log(`✅ [Mentions] ${this.users.length} users loaded and ready`);

    // Setup event listeners
    textarea.addEventListener('input', (e) => this.handleInput(e, textareaId));
    textarea.addEventListener('keydown', (e) => this.handleKeydown(e));
    // No blur listener - let dropdown stay open for clicking
    
    console.log('✅ [Mentions] Event listeners attached');
  }

  /**
   * Load users from API (cached in database with 24h TTL)
   */
  async loadUsers() {
    try {
      // Fetch from API - backend handles caching in database
      let apiUrl = '/api/users';
      const currentDesk = window.state?.currentDesk;
      if (currentDesk) {
        apiUrl += `?serviceDeskId=${currentDesk}`;
        console.log(`📋 Fetching users for Service Desk: ${currentDesk}`);
      }
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      // Handle multiple response formats
      if (Array.isArray(data)) {
        this.users = data;
      } else if (data.data?.users && Array.isArray(data.data.users)) {
        // Format: { data: { users: [...] } }
        this.users = data.data.users;
      } else if (data.users && Array.isArray(data.users)) {
        // Format: { users: [...] }
        this.users = data.users;
      } else if (data.data && Array.isArray(data.data)) {
        // Format: { data: [...] }
        this.users = data.data;
      } else {
        console.warn('⚠️ Unexpected API response format:', data);
        console.warn('Available keys:', Object.keys(data));
        this.users = [];
      }
      
      const cacheStatus = data.cached ? '(from database cache)' : '(fresh from JIRA)';
      console.log(`✅ Loaded ${this.users.length} users for mentions ${cacheStatus}`);
    } catch (error) {
      console.error('Error loading users:', error);
      this.users = [];
    }
  }

  /**
   * Handle textarea input - detect @mention
   */
  handleInput(event, textareaId) {
    const textarea = event.target;
    const cursorPos = textarea.selectionStart;
    const text = textarea.value.substring(0, cursorPos);
    
    console.log('🔍 [Mentions] Input event, text:', text, '| @ index:', text.lastIndexOf('@'));
    
    // Look for @ symbol
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex === -1) {
      this.closeMentions();
      return;
    }
    
    console.log('✅ [Mentions] @ detected, showing dropdown...');

    // Get text after @
    const beforeAt = text.substring(0, lastAtIndex);
    if (beforeAt.length > 0 && beforeAt[beforeAt.length - 1].match(/\w/)) {
      // @ is preceded by word character, not a mention
      this.closeMentions();
      return;
    }

    this.mentionStartPos = lastAtIndex;
    this.currentQuery = text.substring(lastAtIndex + 1).toLowerCase();

    // Filter users
    const matches = this.filterUsers(this.currentQuery);

    if (matches.length > 0) {
      this.showMentions(matches, textareaId);
    } else {
      this.closeMentions();
    }
  }

  /**
   * Filter users by query
   */
  filterUsers(query) {
    if (!query) return this.users.slice(0, 10); // Show first 10 if no query

    return this.users.filter(user => {
      const name = (user.displayName || user.name || '').toLowerCase();
      const email = (user.emailAddress || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    }).slice(0, 20); // Max 20 results para mejor visibilidad
  }

  /**
   * Show mention suggestions dropdown
   */
  showMentions(users, textareaId) {
    console.log('🎨 [Mentions] showMentions called with', users.length, 'users');
    
    // Remove existing dropdown
    const existing = document.getElementById('mentions-dropdown');
    if (existing) {
      console.log('🗑️ [Mentions] Removing existing dropdown');
      existing.remove();
    }

    const textarea = document.getElementById(textareaId);
    if (!textarea) {
      console.error('❌ [Mentions] Textarea not found!');
      return;
    }
    
    const rect = textarea.getBoundingClientRect();
    console.log('📍 [Mentions] Textarea position:', { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width });
    
    // Calculate position - fixed positioning relative to viewport
    const dropdownTop = rect.bottom + 5;
    const dropdownLeft = rect.left;

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'mentions-dropdown';
    dropdown.className = 'mentions-dropdown';
    
    // CRITICAL: Set all styles inline to override any CSS
    dropdown.style.cssText = `
      position: fixed !important;
      top: ${dropdownTop}px !important;
      left: ${dropdownLeft}px !important;
      width: ${rect.width}px !important;
      z-index: 9999 !important;
      background-color: white !important;
      border: 2px solid #4a90e2 !important;
      border-radius: 6px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
      max-height: 300px !important;
      overflow-y: auto !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      font-size: 12px !important;
    `;
    
    console.log('✨ [Mentions] Dropdown created with styles:', dropdown.style.cssText);

    // Add users as options
    users.forEach((user, index) => {
      const option = document.createElement('div');
      option.className = 'mention-option' + (index === 0 ? ' selected' : '');
      option.dataset.userId = user.accountId || user.id;
      option.dataset.userName = user.displayName || user.name;
      
      // Simple inline styles
      option.style.padding = '8px 12px';
      option.style.cursor = 'pointer';
      option.style.fontSize = '12px';
      option.style.color = '#333';
      option.style.borderBottom = '1px solid #eee';
      option.style.transition = 'background-color 0.15s';
      option.style.backgroundColor = index === 0 ? '#f0f0f0' : 'white';
      option.style.lineHeight = '1.4';
      
      // Just the name, nothing else
      option.textContent = user.displayName || user.name;

      // Use mousedown to prevent blur, no need for click
      option.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectMention(option, textareaId);
      });
      
      option.addEventListener('mouseenter', () => {
        this.selectOption(index, dropdown);
        option.style.backgroundColor = '#f0f0f0';
      });
      
      option.addEventListener('mouseleave', () => {
        if (!option.classList.contains('selected')) {
          option.style.backgroundColor = 'white';
        }
      });

      dropdown.appendChild(option);
    });

    // Prevent dropdown from closing on mousedown
    dropdown.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    document.body.appendChild(dropdown);
    this.isOpen = true;
    this.selectedIndex = 0;
    
    console.log('✅ [Mentions] Dropdown appended to body!');
    console.log('📊 [Mentions] Dropdown in DOM:', !!document.getElementById('mentions-dropdown'));
    console.log('📊 [Mentions] Dropdown display:', dropdown.style.display);
    console.log('📊 [Mentions] Dropdown visibility:', dropdown.style.visibility);
    console.log('📊 [Mentions] Dropdown z-index:', dropdown.style.zIndex);
  }

  /**
   * Close mentions dropdown
   */
  closeMentions() {
    const dropdown = document.getElementById('mentions-dropdown');
    if (dropdown) dropdown.remove();
    this.isOpen = false;
    this.mentionStartPos = -1;
  }

  /**
   * Select a mention option
   */
  selectMention(optionEl, textareaId) {
    const textarea = document.getElementById(textareaId);
    const userName = optionEl.dataset.userName;
    
    // Get current text and cursor position
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;

    // Replace @query with @userName
    const beforeMention = text.substring(0, this.mentionStartPos);
    const afterMention = text.substring(cursorPos);
    
    textarea.value = beforeMention + '@' + userName + ' ' + afterMention;
    textarea.selectionStart = beforeMention.length + userName.length + 2;
    textarea.selectionEnd = textarea.selectionStart;

    // Track mentioned user
    this.mentionedUsers.add(userName);

    // Close dropdown
    this.closeMentions();

    // Trigger input event for potential integrations
    textarea.dispatchEvent(new Event('input'));
  }

  /**
   * Handle keyboard navigation in dropdown
   */
  handleKeydown(event) {
    if (!this.isOpen) return;

    const dropdown = document.getElementById('mentions-dropdown');
    const options = dropdown.querySelectorAll('.mention-option');

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % options.length;
      this.selectOption(this.selectedIndex, dropdown);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + options.length) % options.length;
      this.selectOption(this.selectedIndex, dropdown);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = options[this.selectedIndex];
      this.selectMention(selected, event.target.id);
    } else if (event.key === 'Escape') {
      this.closeMentions();
    }
  }

  /**
   * Select option visually
   */
  selectOption(index, dropdown) {
    const options = dropdown.querySelectorAll('.mention-option');
    options.forEach((opt, i) => {
      opt.classList.toggle('selected', i === index);
    });
  }

  /**
   * Get mentioned users
   */
  getMentionedUsers() {
    return Array.from(this.mentionedUsers);
  }

  /**
   * Clear mentioned users
   */
  clearMentions() {
    this.mentionedUsers.clear();
  }
}

// Create global instance
window.mentionSystem = new MentionSystem();

// Export for use
window.MentionSystem = MentionSystem;
