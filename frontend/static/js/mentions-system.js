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
    if (!textarea) return;

    // Fetch available users from API
    await this.loadUsers();

    // Setup event listeners
    textarea.addEventListener('input', (e) => this.handleInput(e, textareaId));
    textarea.addEventListener('keydown', (e) => this.handleKeydown(e));
    textarea.addEventListener('blur', () => this.closeMentions());
  }

  /**
   * Load users from API with 7-day cache
   */
  async loadUsers() {
    try {
      // Check cache first (7-day TTL)
      const cacheKey = 'mentions_users_cache';
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const { users, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
          
          if (age < maxAge) {
            this.users = users;
            console.log(`✅ Loaded ${this.users.length} users for mentions (from cache, ${Math.floor(age / 86400000)} days old)`);
            return;
          }
        } catch (e) {
          // Invalid cache, proceed to fetch
          console.log('⚠️ Invalid cache, fetching fresh users');
        }
      }
      
      // Fetch from API
      const response = await fetch('/api/users');
      const data = await response.json();
      
      // Handle both flat array and wrapped response formats
      if (Array.isArray(data)) {
        this.users = data;
      } else if (data.users && Array.isArray(data.users)) {
        this.users = data.users;
      } else if (data.data && Array.isArray(data.data)) {
        this.users = data.data;
      } else {
        console.warn('⚠️ Unexpected API response format:', data);
        this.users = [];
      }
      
      // Save to cache
      localStorage.setItem(cacheKey, JSON.stringify({
        users: this.users,
        timestamp: Date.now()
      }));
      
      console.log(`✅ Loaded ${this.users.length} users for mentions (fresh from API)`);
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
    
    // Look for @ symbol
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex === -1) {
      this.closeMentions();
      return;
    }

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
    if (!query) return this.users.slice(0, 5); // Show first 5 if no query

    return this.users.filter(user => {
      const name = (user.displayName || user.name || '').toLowerCase();
      const email = (user.emailAddress || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    }).slice(0, 5); // Max 5 results
  }

  /**
   * Show mention suggestions dropdown
   */
  showMentions(users, textareaId) {
    // Remove existing dropdown
    const existing = document.getElementById('mentions-dropdown');
    if (existing) existing.remove();

    const textarea = document.getElementById(textareaId);
    const rect = textarea.getBoundingClientRect();

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'mentions-dropdown';
    dropdown.className = 'mentions-dropdown';
    dropdown.style.position = 'fixed';
    dropdown.style.top = (rect.bottom + 5) + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = rect.width + 'px';

    // Add users as options
    users.forEach((user, index) => {
      const option = document.createElement('div');
      option.className = 'mention-option' + (index === 0 ? ' selected' : '');
      option.dataset.userId = user.accountId || user.id;
      option.dataset.userName = user.displayName || user.name;
      option.innerHTML = `
        <div class="mention-avatar">👤</div>
        <div class="mention-info">
          <div class="mention-name">${user.displayName || user.name}</div>
          <div class="mention-email">${user.emailAddress || ''}</div>
        </div>
      `;

      option.addEventListener('click', () => this.selectMention(option, textareaId));
      option.addEventListener('mouseenter', () => this.selectOption(index, dropdown));

      dropdown.appendChild(option);
    });

    document.body.appendChild(dropdown);
    this.isOpen = true;
    this.selectedIndex = 0;
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
