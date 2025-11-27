/**
 * Mentions/Autocomplete Module - REDESIGNED
 * Simple, reliable @mention detection and team member suggestions
 * 
 * Usage: 
 *   window.mentions.init() - Initialize mentions system
 *   window.mentions.attachTo(textarea) - Attach mention listeners to textarea
 */

const mentionsModule = (() => {
  let teamMembers = [];
  let currentPopup = null;
  let currentTextarea = null;
  let isFetchingMembers = false;
  
  // Popup management - more robust with separate concerns
  const popupManager = {
    element: null,
    selectedIndex: 0,
    suggestions: [],
    
    /**
     * Create or get popup element
     */
    getPopup() {
      if (!this.element) {
        this.element = document.createElement('div');
        this.element.className = 'mention-popup';
        this.element.style.display = 'none';
        document.body.appendChild(this.element);
        
        // Single persistent click handler at popup level
        this.element.addEventListener('click', (e) => this.handleItemClick(e));
        
        console.log('✅ Popup element created with persistent click handler');
      }
      return this.element;
    },
    
    /**
     * Handle click on popup items
     */
    handleItemClick(e) {
      const mentionItem = e.target.closest('.mention-item');
      if (!mentionItem) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const name = mentionItem.dataset.name;
      console.log('🖱️ Mention item clicked:', name);
      
      insertMention(currentTextarea, name);
    },
    
    /**
     * Render popup with suggestions
     */
    render(suggestions, searchTerm) {
      this.suggestions = suggestions;
      this.selectedIndex = 0;
      
      let html = '<div class="mention-list">';
      suggestions.slice(0, 8).forEach((member, index) => {
        const isFirst = index === 0;
        html += `
          <div class="mention-item ${isFirst ? 'selected' : ''}" 
               data-name="${member.name}" 
               data-index="${index}">
            <span class="mention-icon">👤</span>
            <span class="mention-name">${highlightSearch(member.name, searchTerm)}</span>
            ${member.source ? `<span class="mention-type">${member.source}</span>` : ''}
          </div>
        `;
      });
      html += '</div>';
      
      this.element.innerHTML = html;
      this.element.classList.add('mention-popup');
      this.element.style.display = 'block';
      
      console.log(`📢 Rendered ${suggestions.length} mention items`);
    },
    
    /**
     * Position popup below textarea
     */
    position(textarea) {
      const rect = textarea.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Set position using inline styles (dynamic values)
      this.element.style.position = 'fixed';
      this.element.style.left = (rect.left + scrollLeft) + 'px';
      this.element.style.top = (rect.bottom + scrollTop + 5) + 'px';
      this.element.style.width = Math.max(rect.width, 250) + 'px';
      this.element.style.display = 'block';
    },
    
    /**
     * Select item by index
     */
    selectByIndex(index) {
      const items = this.element.querySelectorAll('.mention-item');
      if (!items[index]) return;
      
      items.forEach(item => item.classList.remove('selected'));
      items[index].classList.add('selected');
      items[index].scrollIntoView({ block: 'nearest' });
      
      this.selectedIndex = index;
    },
    
    /**
     * Get selected item name
     */
    getSelectedName() {
      const selected = this.element.querySelector('.mention-item.selected');
      return selected?.dataset.name;
    },
    
    /**
     * Close popup
     */
    close() {
      if (this.element) {
        this.element.style.display = 'none';
      }
    }
  };
  
  /**
   * Initialize the mentions system
   * Don't fetch here - fetch on first use instead
   */
  async function init() {
    console.log('🔄 Mentions system initialized (will fetch members on first use)');
  }

  /**
   * Fetch team members from API (with caching)
   */
  async function ensureTeamMembers() {
    // Return cached members if already fetched
    if (teamMembers.length > 0) {
      console.log('✅ Using cached team members:', teamMembers.length);
      return teamMembers;
    }

    // Prevent multiple simultaneous fetches
    if (isFetchingMembers) {
      console.log('⏳ Already fetching team members, waiting...');
      while (isFetchingMembers) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return teamMembers;
    }

    isFetchingMembers = true;

    try {
      // Use window.api.getMentionableUsers which is exported from api.js
      if (!window.api?.getMentionableUsers) {
        console.warn('⚠️ getMentionableUsers function not available');
        isFetchingMembers = false;
        return [];
      }

      console.log('📤 Fetching team members via window.api.getMentionableUsers()...');
      const response = await window.api.getMentionableUsers();
      console.log('📥 API Response:', response);
      
      if (response?.users && Array.isArray(response.users)) {
        teamMembers = response.users
          .filter(u => u.name && u.name !== 'Unassigned')
          .map(u => ({
            name: u.name || u.displayName || 'Unknown',
            displayName: u.displayName || u.name,
            email: u.email || '',
            source: u.source || 'team'
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        
        console.log(`✅ Successfully fetched ${teamMembers.length} team members:`, teamMembers.slice(0, 5));
      } else {
        console.warn('⚠️ Invalid API response format:', response);
        teamMembers = [];
      }
    } catch (error) {
      console.error('❌ Failed to fetch team members:', error);
      teamMembers = [];
    } finally {
      isFetchingMembers = false;
    }

    return teamMembers;
  }

  // ==================== TEXTAREA ATTACHMENT ====================

  /**
   * Attach mention listeners to a textarea
   */
  function attachTo(textarea) {
    if (!textarea) return;
    
    textarea.addEventListener('input', handleInput);
    textarea.addEventListener('keydown', handleKeydown);
    textarea.addEventListener('blur', () => closePopup());
    
    console.log('✅ Mention listeners attached to textarea');
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Handle input events - detect @mention pattern
   */
  async function handleInput(event) {
    const textarea = event.target;
    const text = textarea.value;
    const cursor = textarea.selectionStart;
    const textBefore = text.substring(0, cursor);

    // Look for @word pattern before cursor
    const match = textBefore.match(/@([a-zA-Z0-9]*)$/);
    
    if (match) {
      // Ensure we have team members before filtering
      const members = await ensureTeamMembers();

      const searchTerm = match[1].toLowerCase();
      
      // Filter members based on search term
      const filtered = searchTerm.length > 0 
        ? members.filter(m => m.name.toLowerCase().startsWith(searchTerm))
        : members.slice(0, 10); // Show first 10 if just @

      if (filtered.length > 0) {
        currentTextarea = textarea;
        const popup = popupManager.getPopup();
        popupManager.render(filtered, searchTerm);
        popupManager.position(textarea);
      } else {
        popupManager.close();
      }
    } else {
      popupManager.close();
    }
  }

  /**
   * Handle keyboard navigation in popup
   */
  function handleKeydown(event) {
    const popup = popupManager.element;
    if (!popup || popup.style.display === 'none') return;

    const items = Array.from(popup.querySelectorAll('.mention-item'));
    if (items.length === 0) return;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = (popupManager.selectedIndex + 1) % items.length;
        popupManager.selectByIndex(nextIndex);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prevIndex = popupManager.selectedIndex <= 0 ? items.length - 1 : popupManager.selectedIndex - 1;
        popupManager.selectByIndex(prevIndex);
        break;
      }
      case 'Enter':
      case 'Tab': {
        event.preventDefault();
        const name = popupManager.getSelectedName();
        if (name) {
          insertMention(currentTextarea, name);
        }
        break;
      }
      case 'Escape': {
        event.preventDefault();
        popupManager.close();
        break;
      }
    }
  }

  // ==================== POPUP MANAGEMENT ====================

  /**
   * Highlight search term in suggestion text
   */
  function highlightSearch(text, searchTerm) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  // ==================== INSERTION ====================

  /**
   * Insert mention into textarea and close popup
   */
  function insertMention(textarea, name) {
    const text = textarea.value;
    const cursor = textarea.selectionStart;
    const before = text.substring(0, cursor);

    // Find @ position
    const atIndex = before.lastIndexOf('@');
    if (atIndex === -1) {
      console.warn('❌ Could not find @ for mention');
      return;
    }

    // Build new text: everything before @, then @name and space, then everything after cursor
    const beforeAt = text.substring(0, atIndex);
    const after = text.substring(cursor);
    const replacementText = `@${name} `;
    const newText = beforeAt + replacementText + after;

    textarea.value = newText;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    // Move cursor to after the inserted mention and space
    const newCursor = beforeAt.length + replacementText.length;
    textarea.selectionStart = textarea.selectionEnd = newCursor;

    popupManager.close();
    textarea.focus();

    console.log(`✅ Mentioned: @${name}`);
  }

  // ==================== PUBLIC API ====================
  
  return {
    init,
    attachTo,
    closePopup: () => popupManager.close(),
    getTeamMembers: () => [...teamMembers]
  };
})();

// Export as default for ES6 module systems
export default mentionsModule;

