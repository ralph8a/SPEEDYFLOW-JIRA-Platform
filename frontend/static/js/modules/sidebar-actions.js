/**
 * SIDEBAR ACTIONS
 * Maneja la funcionalidad de todos los botones de la sidebar
 */

class SidebarActions {
  constructor() {
    this.initialized = false;
    this.notificationsPanel = null;
    this.userDropdown = null;
    
    // Background cache for sidebar data
    this.cache = {
      currentUser: null,
      serviceDesks: null,
      notifications: [],
      starred: [],
      lastRefresh: null
    };
    
    // Start background caching immediately
    this.startBackgroundCaching();
  }

  /**
   * Start background caching of sidebar data
   */
  startBackgroundCaching() {
    console.log('💾 Starting background cache for sidebar...');
    
    // Cache current user immediately
    this.cacheCurrentUser();
    
    // Cache service desks
    this.cacheServiceDesks();
    
    // Cache notifications periodically
    this.cacheNotifications();
    
    // Cache users for autocomplete (global cache)
    this.cacheUsers();
    
    // Refresh cache every 5 minutes
    setInterval(() => {
      this.refreshCache();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Cache current user data in background
   */
  async cacheCurrentUser() {
    try {
      const response = await fetch('/api/user');
      const json = await response.json();
      
      if (json.success && json.user) {
        this.cache.currentUser = json.user;
        console.log('💾 Cached current user:', json.user.displayName);
        
        // Store in window state for immediate access
        if (window.state) {
          window.state.currentUser = json.user.displayName || json.user.name;
          window.state.currentUserAccountId = json.user.accountId;
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to cache current user:', error);
    }
  }
  
  /**
   * Cache service desks data in background
   */
  async cacheServiceDesks() {
    try {
      const response = await fetch('/api/desks');
      const json = await response.json();
      
      if (json.success) {
        this.cache.serviceDesks = json.data || json;
        console.log('💾 Cached service desks:', this.cache.serviceDesks.length);
      }
    } catch (error) {
      console.warn('⚠️ Failed to cache service desks:', error);
    }
  }
  
  /**
   * Cache notifications in background
   */
  async cacheNotifications() {
    try {
      // Simulate notifications API (replace with actual endpoint)
      this.cache.notifications = [];
      console.log('💾 Cached notifications: 0');
    } catch (error) {
      console.warn('⚠️ Failed to cache notifications:', error);
    }
  }
  
  /**
   * Cache users for autocomplete in background
   */
  async cacheUsers(forceRefresh = false) {
    try {
      if (window.cachedUsers && !forceRefresh) {
        console.log('💾 Users already cached:', window.cachedUsers.length);
        return;
      }
      
      console.log('🔄 Fetching users from database...');
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        window.cachedUsers = users;
        console.log('💾 Cached users for autocomplete:', users.length);
      }
    } catch (error) {
      console.warn('⚠️ Failed to cache users:', error);
    }
  }
  
  /**
   * Refresh all cached data
   */
  async refreshCache() {
    console.log('🔄 Refreshing sidebar cache...');
    this.cache.lastRefresh = new Date();
    
    await Promise.all([
      this.cacheCurrentUser(),
      this.cacheServiceDesks(),
      this.cacheNotifications(),
      this.cacheUsers()
    ]);
    
    console.log('✅ Sidebar cache refreshed');
  }
  
  /**
   * Get cached data (instant access)
   */
  getCachedUser() {
    return this.cache.currentUser;
  }
  
  getCachedServiceDesks() {
    return this.cache.serviceDesks;
  }
  
  getCachedNotifications() {
    return this.cache.notifications;
  }

  /**
   * Inicializa todos los event listeners de la sidebar
   */
  init() {
    if (this.initialized) return;

    console.log('🎮 Initializing Sidebar Actions...');

    // Primary Actions
    this.initNewTicketButton();
    
    // Navigation
    this.initNavigationItems();
    
    // Utilities
    this.initSearchButton();
    this.initReportsButton();
    this.initNotificationsButton();
    this.initRefreshButton();
    
    // Account
    this.initSettingsButton();
    this.initHelpCenterButton();
    this.initUserMenuButton();
    this.initLogoutButton();

    this.initialized = true;
    console.log('✅ Sidebar Actions initialized');
  }

  /**
   * Botón: Create Ticket
   */
  initNewTicketButton() {
    const btn = document.getElementById('newTicketBtn');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🎫 Create New Ticket clicked');
      this.showNotification('Create Ticket', 'Feature coming soon!', 'info');
    });
  }

  /**
   * Navigation: My Tickets, All Tickets, Starred
   */
  initNavigationItems() {
    const navItems = document.querySelectorAll('.sidebar-section[aria-label="Navigation"] .sidebar-menu-item:not(#newTicketBtn)');
    
    navItems.forEach((item, index) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all navigation items (excluding Create Ticket)
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // Add active to clicked navigation item
        item.classList.add('active');
        
        const label = item.querySelector('.label')?.textContent || '';
        console.log(`📂 Navigation: ${label}`);
        
        // Handle different navigation types (excluding Create Ticket button)
        switch(index) {
          case 0: // My Tickets
            this.filterMyTickets();
            break;
          case 1: // All Tickets
            this.filterAllTickets();
            break;
          case 2: // Starred
            this.filterStarredTickets();
            break;
        }
      });
    });
  }

  /**
   * Filter: My Tickets
   * Auto-selects the current user's desk and "assigned to me" queue
   */
  async filterMyTickets() {
    console.log('🔍 Filtering: My Tickets');
    
    try {
      // Set filter mode to myTickets
      if (window.state) {
        window.state.filterMode = 'myTickets';
        console.log('✅ Set filter mode to: myTickets');
      }
      
      // Get current user from cache (instant) or API (fallback)
      let currentUser = this.getCachedUser();
      
      if (currentUser) {
        console.log('💾 Using cached user data:', currentUser.displayName);
        currentUser = currentUser.displayName || currentUser.name;
      } else {
        console.log('⚠️ Cache not ready, fetching user...');
        currentUser = await this.getCurrentUserInfo();
      }
      
      if (!currentUser) {
        this.showNotification('My Tickets', 'No se pudo detectar el usuario actual. Intenta refrescar la página.', 'warning');
        return;
      }

      console.log('✅ Current user detected:', currentUser);
      
      // Store current user in state
      if (window.state) {
        window.state.currentUser = currentUser;
      }

      // Auto-select user's desk and "assigned to me" queue
      const selected = await this.autoSelectUserDeskAndQueue(currentUser);
      
      if (selected) {
        // Reload issues to apply the filter
        console.log(`🔄 Reloading issues for queue: ${window.state.currentQueue}`);
        await window.loadIssues(window.state.currentQueue);
        
        const issueCount = window.state?.issues?.length || 0;
        this.showNotification('My Tickets', `Showing ${issueCount} ticket${issueCount !== 1 ? 's' : ''} assigned to ${currentUser}`, 'success');
      } else {
        this.showNotification('My Tickets', 'Could not find "Assigned to me" queue. Please select Service Desk and Queue manually.', 'warning');
      }
      
    } catch (error) {
      console.error('❌ Error in filterMyTickets:', error);
      this.showNotification('My Tickets', 'Error al configurar vista personal. Intenta refrescar.', 'error');
    }
  }

  /**
   * Get current user information from API
   */
  async getCurrentUserInfo() {
    try {
      // Check memory cache first (instant)
      if (this.cache.currentUser) {
        const userName = this.cache.currentUser.displayName || this.cache.currentUser.name;
        console.log('💾 Using cached user from memory:', userName);
        return userName;
      }
      
      // Check window state cache second (should be a string)
      if (window.state?.currentUser) {
        const userName = typeof window.state.currentUser === 'string' 
          ? window.state.currentUser 
          : (window.state.currentUser.displayName || window.state.currentUser.name);
        console.log('💾 Using cached user from state:', userName);
        return userName;
      }
      
      // Check localStorage third
      const cachedUser = localStorage.getItem('currentUser');
      if (cachedUser) {
        console.log('📦 Using cached user from localStorage:', cachedUser);
        return cachedUser;
      }

      // Fetch from API (last resort)
      console.log('🌐 Fetching user from API...');
      const response = await fetch('/api/user');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.user) {
        const userName = data.user.displayName || data.user.name || data.user.accountId;
        
        console.log('✅ Fetched user from API:', userName);
        
        // Cache in memory
        this.cache.currentUser = data.user;
        
        // Cache in state
        if (!window.state) window.state = {};
        window.state.currentUser = userName;
        window.state.currentUserAccountId = data.user.accountId;
        
        // Cache in localStorage
        localStorage.setItem('currentUser', userName);
        if (data.user.accountId) {
          localStorage.setItem('currentUserAccountId', data.user.accountId);
        }
        
        return userName;
      }
      
      throw new Error('Invalid user response');
      
    } catch (error) {
      console.error('❌ Error fetching current user:', error);
      
      // Fallback: try to get from existing tickets
      const issues = window.state?.issues || [];
      const assignedIssue = issues.find(i => i.assignee || i.asignado_a);
      
      if (assignedIssue) {
        const fallbackUser = typeof assignedIssue.assignee === 'string' 
          ? assignedIssue.assignee 
          : (assignedIssue.assignee?.displayName || assignedIssue.asignado_a);
        
        if (fallbackUser && fallbackUser !== 'Unassigned') {
          console.log('🔄 Using fallback user from tickets:', fallbackUser);
          return fallbackUser;
        }
      }
      
      return null;
    }
  }

  /**
   * Auto-select the user's desk and queue from .env configuration
   * Uses USER_DESK_ID and USER_QUEUE_ID from backend, searches queue by JQL
   */
  async autoSelectUserDeskAndQueue(currentUser) {
    try {
      console.log('🔍 Auto-selecting desk and queue for:', currentUser);

      // Get desk context from backend (.env configuration)
      const contextResponse = await fetch('/api/user/desk-context');
      if (!contextResponse.ok) {
        throw new Error(`Failed to fetch desk context: ${contextResponse.status}`);
      }

      const contextData = await contextResponse.json();
      console.log('📋 Desk context from backend:', contextData);
      
      const { desk_id, queue_id, source } = contextData;
      
      // Check if we have valid configuration
      if (!desk_id) {
        console.warn('⚠️ No desk configured in .env (USER_DESK_ID)');
        return false;
      }

      // Get user profile for accountId
      const userResponse = await fetch('/api/user');
      if (!userResponse.ok) {
        throw new Error(`Failed to fetch user profile: ${userResponse.status}`);
      }

      const userData = await userResponse.json();
      const userProfile = userData.user || userData;
      const userAccountId = userProfile.accountId;

      console.log(`✅ User accountId: ${userAccountId}, config source: ${source}`);

      // Get available desks to validate desk_id
      let desks = this.getCachedServiceDesks();
      if (!desks || desks.length === 0) {
        console.log('⚠️ Fetching desks from API...');
        const desksResponse = await fetch('/api/desks');
        if (!desksResponse.ok) {
          throw new Error(`Failed to fetch desks: ${desksResponse.status}`);
        }

        const desksData = await desksResponse.json();
        desks = desksData.data || desksData.desks || desksData;

        if (!Array.isArray(desks)) {
          console.error('❌ Desks response is not an array:', desksData);
          desks = [];
        }
      }

      // Find the configured desk
      const userDesk = desks.find(d => String(d.id) === String(desk_id));
      
      if (!userDesk) {
        console.error(`❌ Configured desk_id ${desk_id} not found in available desks`);
        return false;
      }

      console.log(`📂 Using configured desk: ${userDesk.name || userDesk.displayName} (ID: ${desk_id})`);

      // Find the queue - either from config or search by JQL
      let targetQueue = null;
      const queues = userDesk.queues || [];

      if (queue_id) {
        // Use configured queue_id
        targetQueue = queues.find(q => String(q.id) === String(queue_id));
        
        if (targetQueue) {
          console.log(`📋 Using configured queue: ${targetQueue.name} (ID: ${queue_id})`);
          console.log(`📝 Queue JQL: ${targetQueue.jql || 'N/A'}`);
        } else {
          console.warn(`⚠️ Configured queue_id ${queue_id} not found in desk`);
        }
      }

      // If no queue configured or not found, search by JQL for user's tickets
      if (!targetQueue) {
        console.log('🔍 Searching for queue with JQL that includes user tickets (assignee OR reporter)...');
        
        // Priority 1: Look for queue with JQL that includes both assignee and reporter
        targetQueue = queues.find(q => {
          const jql = (q.jql || '').toLowerCase();
          // Check if JQL contains patterns for both assignee and reporter
          const hasAssignee = jql.includes('assignee') || jql.includes('assigned');
          const hasReporter = jql.includes('reporter') || jql.includes('creator');
          return hasAssignee && hasReporter;
        });

        if (targetQueue) {
          console.log(`✅ Found queue with assignee AND reporter JQL: ${targetQueue.name}`);
        }

        // Priority 2: Look for "My Tickets" or similar named queues
        if (!targetQueue) {
          targetQueue = queues.find(q => {
            const queueName = (q.name || '').toLowerCase();
            return queueName.includes('my tickets') ||
                   queueName.includes('mis tickets') ||
                   queueName.includes('my issues') ||
                   queueName.includes('mis incidencias');
          });

          if (targetQueue) {
            console.log(`✅ Found queue by name pattern: ${targetQueue.name}`);
          }
        }

        // Priority 3: Look for "assigned to me" queue
        if (!targetQueue) {
          targetQueue = queues.find(q => {
            const queueName = (q.name || '').toLowerCase();
            const jql = (q.jql || '').toLowerCase();
            return queueName.includes('assigned to me') || 
                   queueName.includes('asignado a mí') ||
                   queueName.includes('asignado a mi') ||
                   jql.includes('assignee = currentuser()') ||
                   jql.includes('assignee=currentuser()');
          });

          if (targetQueue) {
            console.log(`✅ Found "assigned to me" queue: ${targetQueue.name}`);
          }
        }

        // Last resort: use first queue
        if (!targetQueue && queues.length > 0) {
          targetQueue = queues[0];
          console.log(`⚠️ No matching queue found, using first available: ${targetQueue.name}`);
        }
      }

      if (!targetQueue) {
        console.error('❌ No queue available in desk');
        return false;
      }

      console.log(`📋 Final queue: ${targetQueue.name} (ID: ${targetQueue.id})`);
      console.log(`📝 Queue JQL: ${targetQueue.jql || 'N/A'}`);

      // Update UI selects
      const deskSelect = document.getElementById('serviceDeskSelectFilter');
      const queueSelect = document.getElementById('queueSelectFilter');

      if (deskSelect) {
        deskSelect.value = desk_id;
        const changeEvent = new Event('change', { bubbles: true });
        deskSelect.dispatchEvent(changeEvent);

        if (window.state) {
          window.state.currentDesk = desk_id;
        }

        console.log('✅ Updated desk select to:', desk_id);
      }

      // Wait for queue dropdown to populate
      await new Promise(resolve => setTimeout(resolve, 500));

      if (queueSelect) {
        queueSelect.value = targetQueue.id;
        const changeEvent = new Event('change', { bubbles: true });
        queueSelect.dispatchEvent(changeEvent);

        if (window.state) {
          window.state.currentQueue = targetQueue.id;
        }

        console.log('✅ Updated queue select to:', targetQueue.id);
      }

      return true;

    } catch (error) {
      console.error('❌ Error in autoSelectUserDeskAndQueue:', error);
      return false;
    }
  }

  /**
   * Select desk in UI
   */
  async selectDesk(desk) {
    const deskSelect = document.getElementById('deskSelect');
    if (deskSelect && desk) {
      deskSelect.value = desk.id;
      
      // Trigger change event to load queues
      const event = new Event('change', { bubbles: true });
      deskSelect.dispatchEvent(event);
      
      // Update state
      if (window.state) {
        window.state.currentDesk = desk;
      }
      
      console.log('✅ Auto-selected desk:', desk.name);
    }
  }

  /**
   * Select queue in UI  
   */
  async selectQueue(queue) {
    // Wait a bit for queues to load after desk selection
    setTimeout(() => {
      const queueSelect = document.getElementById('queueSelect');
      if (queueSelect && queue) {
        queueSelect.value = queue.id;
        
        // Trigger change event to load issues
        const event = new Event('change', { bubbles: true });
        queueSelect.dispatchEvent(event);
        
        // Update state
        if (window.state) {
          window.state.currentQueue = queue;
        }
        
        console.log('✅ Auto-selected queue:', queue.name);
      }
    }, 500);
  }

  /**
   * Filter: All Tickets
   */
  async filterAllTickets() {
    console.log('🔍 Filtering: All Tickets');
    
    // Set filter mode to all
    if (window.state) {
      window.state.filterMode = 'all';
      console.log('✅ Set filter mode to: all');
    }
    
    // Clear all filters using FilterManager
    if (window.filterManager && typeof window.filterManager.clearAllFilters === 'function') {
      window.filterManager.clearAllFilters();
    } else {
      // Direct fallback
      const inputs = document.querySelectorAll('.filter-bar input, .filter-bar select');
      inputs.forEach(input => {
        if (input.type === 'checkbox') {
          input.checked = false;
        } else {
          input.value = '';
        }
      });
      
      // Trigger filter update
      if (window.filterManager && typeof window.filterManager.applyFilters === 'function') {
        window.filterManager.applyFilters();
      }
    }
    
    // Reload issues to show all tickets
    if (window.loadIssues && window.state?.currentQueue) {
      console.log(`🔄 Reloading issues for queue: ${window.state.currentQueue}`);
      await window.loadIssues(window.state.currentQueue);
      
      const totalCount = window.state?.issues?.length || 0;
      this.showNotification('All Tickets', `Showing all ${totalCount} tickets`, 'success');
    } else {
      console.warn('⚠️ No queue selected. Please select a Service Desk and Queue first.');
      this.showNotification('All Tickets', 'Please select a Service Desk and Queue first', 'warning');
    }
  }

  /**
   * Filter: Starred Tickets
   */
  filterStarredTickets() {
    console.log('⭐ Filtering: Starred Tickets');
    
    // Get starred tickets from localStorage
    const starred = JSON.parse(localStorage.getItem('starredTickets') || '[]');
    
    if (starred.length === 0) {
      this.showNotification('Starred Tickets', 'No starred tickets yet. Click the star icon on any ticket to add it.', 'info');
      return;
    }
    
    // Apply custom filter for starred tickets
    if (window.filterManager) {
      // Store starred filter
      window.filterManager.customFilters = window.filterManager.customFilters || {};
      window.filterManager.customFilters.starred = (issue) => starred.includes(issue.key);
      window.filterManager.applyFilters();
      
      const filteredCount = window.state.filteredIssues?.length || 0;
      this.showNotification('Starred Tickets', `Showing ${filteredCount} starred ticket(s)`, 'success');
    } else {
      this.showNotification('Starred Tickets', 'Filter system not ready', 'warning');
    }
  }

  /**
   * Botón: Search
   */
  initSearchButton() {
    // Find by text content
    const items = document.querySelectorAll('.sidebar-section[aria-label="Utilities"] .sidebar-menu-item');
    const searchBtn = Array.from(items).find(item => item.textContent.includes('Search'));
    
    if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🔍 Search clicked');
        this.openAdvancedSearch();
      });
    }
  }

  /**
   * Open Advanced Search
   */
  async openAdvancedSearch() {
    // Refetch users for fresh data
    await this.cacheUsers(true);
    
    let panel = document.getElementById('searchPanel');
    
    if (!panel) {
      panel = this.createAdvancedSearch();
      document.body.appendChild(panel);
    }
    
    panel.style.display = 'flex';
    setTimeout(() => {
      panel.classList.add('active');
      panel.querySelector('#searchKeyword').focus();
    }, 10);
  }

  /**
   * Create Advanced Search Panel
   */
  createAdvancedSearch() {
    const panel = document.createElement('div');
    panel.id = 'searchPanel';
    panel.className = 'modal-overlay';
    panel.innerHTML = `
      <div class="modal-container search-modal">
        <div class="modal-header">
          <h2>🔍 Advanced Search</h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').classList.remove('active'); setTimeout(() => this.closest('.modal-overlay').style.display='none', 300)">&times;</button>
        </div>
        <div class="modal-body">
          <div class="search-form">
            <div class="search-field" style="position: relative;">
              <label for="searchKeyword">🔎 Keyword</label>
              <input type="text" id="searchKeyword" placeholder="Search in summary, description..." autocomplete="off">
              <div id="searchSuggestions" class="search-suggestions" style="display: none;"></div>
            </div>
            
            <div class="search-row">
              <div class="search-field">
                <label for="searchStatus">Status</label>
                <select id="searchStatus" multiple>
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              
              <div class="search-field">
                <label for="searchPriority">Priority</label>
                <select id="searchPriority" multiple>
                  <option value="">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            
            <div class="search-row">
              <div class="search-field" style="position: relative;">
                <label for="searchAssignee">Assignee</label>
                <input type="text" id="searchAssignee" placeholder="Assignee name..." autocomplete="off">
                <div id="assigneeSuggestions" class="search-suggestions" style="display: none;"></div>
              </div>
              
              <div class="search-field" style="position: relative;">
                <label for="searchReporter">Reporter</label>
                <input type="text" id="searchReporter" placeholder="Reporter name..." autocomplete="off">
                <div id="reporterSuggestions" class="search-suggestions" style="display: none;"></div>
              </div>
            </div>
            
            <div class="search-row">
              <div class="search-field">
                <label for="searchDateFrom">Date From</label>
                <input type="date" id="searchDateFrom">
              </div>
              
              <div class="search-field">
                <label for="searchDateTo">Date To</label>
                <input type="date" id="searchDateTo">
              </div>
            </div>
            
            <div class="search-field">
              <label for="searchLabels">Labels (comma-separated)</label>
              <input type="text" id="searchLabels" placeholder="bug, feature, urgent...">
            </div>
            
            <div class="search-actions">
              <button class="btn-secondary" onclick="window.sidebarActions.clearSearch()">Clear</button>
              <button class="btn-primary" onclick="window.sidebarActions.performSearch()">Search</button>
            </div>
          </div>
          
          <div class="search-results" id="searchResults" style="display: none;">
            <h3>Search Results (<span id="resultCount">0</span>)</h3>
            <div id="resultsList" class="results-list"></div>
          </div>
        </div>
      </div>
    `;
    
    // Enter key to search
    panel.querySelector('#searchKeyword').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });
    
    // Initialize autocomplete for search fields
    this.initSearchAutocomplete(panel);
    
    return panel;
  }

  /**
   * Initialize autocomplete for search fields
   */
  initSearchAutocomplete(panel) {
    const keywordInput = panel.querySelector('#searchKeyword');
    const assigneeInput = panel.querySelector('#searchAssignee');
    const reporterInput = panel.querySelector('#searchReporter');
    
    const keywordSuggestions = panel.querySelector('#searchSuggestions');
    const assigneeSuggestions = panel.querySelector('#assigneeSuggestions');
    const reporterSuggestions = panel.querySelector('#reporterSuggestions');
    
    // Keyword autocomplete (suggest from ticket summaries and keys)
    keywordInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) {
        keywordSuggestions.style.display = 'none';
        return;
      }
      
      const suggestions = this.getKeywordSuggestions(query);
      this.displaySuggestions(keywordSuggestions, suggestions, (value) => {
        keywordInput.value = value;
        keywordSuggestions.style.display = 'none';
        keywordInput.focus();
      });
    });
    
    // Assignee autocomplete (instant with cache)
    let assigneeDebounceTimer;
    assigneeInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) {
        assigneeSuggestions.style.display = 'none';
        return;
      }
      
      clearTimeout(assigneeDebounceTimer);
      this.showLoadingSuggestions(assigneeSuggestions);
      
      assigneeDebounceTimer = setTimeout(async () => {
        const suggestions = await this.getUserSuggestionsFromDB(query);
        this.displaySuggestions(assigneeSuggestions, suggestions, (value) => {
          assigneeInput.value = value;
          assigneeSuggestions.style.display = 'none';
          assigneeInput.focus();
        });
      }, 100);
    });
    
    // Reporter autocomplete (instant with cache)
    let reporterDebounceTimer;
    reporterInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) {
        reporterSuggestions.style.display = 'none';
        return;
      }
      
      clearTimeout(reporterDebounceTimer);
      this.showLoadingSuggestions(reporterSuggestions);
      
      reporterDebounceTimer = setTimeout(async () => {
        const suggestions = await this.getUserSuggestionsFromDB(query);
        this.displaySuggestions(reporterSuggestions, suggestions, (value) => {
          reporterInput.value = value;
          reporterSuggestions.style.display = 'none';
          reporterInput.focus();
        });
      }, 100);
    });
    
    // Close suggestions on click outside
    document.addEventListener('click', (e) => {
      if (!keywordInput.contains(e.target) && !keywordSuggestions.contains(e.target)) {
        keywordSuggestions.style.display = 'none';
      }
      if (!assigneeInput.contains(e.target) && !assigneeSuggestions.contains(e.target)) {
        assigneeSuggestions.style.display = 'none';
      }
      if (!reporterInput.contains(e.target) && !reporterSuggestions.contains(e.target)) {
        reporterSuggestions.style.display = 'none';
      }
    });
  }

  /**
   * Get keyword suggestions from tickets
   */
  getKeywordSuggestions(query) {
    if (!window.state?.issues || window.state.issues.length === 0) {
      return [];
    }
    
    const queryLower = query.toLowerCase();
    const suggestions = new Set();
    const ticketMatches = [];
    
    // Get ticket key matches (exact start match has highest priority)
    window.state.issues.forEach(issue => {
      const key = issue.key || '';
      if (key.toLowerCase().startsWith(queryLower)) {
        ticketMatches.push({
          type: 'ticket',
          value: key,
          label: `${key} - ${(issue.summary || '').substring(0, 50)}...`,
          priority: 1
        });
      }
    });
    
    // Get summary word matches
    window.state.issues.forEach(issue => {
      const summary = issue.summary || '';
      const words = summary.split(/\s+/);
      
      words.forEach(word => {
        if (word.length >= 3 && word.toLowerCase().includes(queryLower)) {
          suggestions.add(word);
        }
      });
    });
    
    // Convert suggestions to array with metadata
    const wordSuggestions = Array.from(suggestions).slice(0, 5).map(word => ({
      type: 'word',
      value: word,
      label: word,
      priority: 2
    }));
    
    // Combine and sort by priority
    const allSuggestions = [...ticketMatches.slice(0, 5), ...wordSuggestions];
    return allSuggestions.slice(0, 10);
  }

  /**
   * Get user suggestions from database (async)
   */
  async getUserSuggestionsFromDB(query) {
    try {
      let users = [];
      
      // Use global cache if available (instant)
      if (window.cachedUsers) {
        const lowerQuery = query.toLowerCase();
        users = window.cachedUsers.filter(user => {
          const searchStr = `${user.displayName || ''} ${user.emailAddress || ''}`.toLowerCase();
          return searchStr.includes(lowerQuery);
        });
        console.log(`✅ Found ${users.length} users from cache (instant)`);
      } else {
        // Fallback to API if cache not ready
        const serviceDeskId = window.state?.serviceDeskId || '';
        const response = await fetch(`/api/users?query=${encodeURIComponent(query)}&serviceDeskId=${serviceDeskId}`);
        
        if (!response.ok) {
          console.warn('Failed to fetch users from DB, falling back to empty list');
          return [];
        }
        
        const result = await response.json();
        
        // The response is wrapped in {success, data: {users: [...], count, cached}}
        if (!result.success || !result.data || !result.data.users) {
          console.warn('Invalid response structure from /api/users:', result);
          return [];
        }
        
        users = result.data.users;
        console.log(`✅ Found ${users.length} users from API`);
      }
      
      // Format users for suggestions
      return users.slice(0, 10).map(user => ({
        type: 'user',
        value: user.displayName || user.name || user.emailAddress,
        label: user.displayName || user.name || user.emailAddress,
        icon: '👤',
        accountId: user.accountId
      }));
      
    } catch (error) {
      console.error('Error fetching user suggestions:', error);
      return [];
    }
  }

  /**
   * Display suggestions in dropdown
   */
  displaySuggestions(container, suggestions, onSelect) {
    if (suggestions.length === 0) {
      container.innerHTML = '<div class="suggestion-item" style="cursor: default; opacity: 0.6;">No se encontraron resultados</div>';
      container.style.display = 'block';
      return;
    }
    
    container.innerHTML = suggestions.map(sug => {
      const icon = sug.icon || (sug.type === 'ticket' ? '🎫' : sug.type === 'user' ? '👤' : '🔍');
      return `
        <div class="suggestion-item" data-value="${sug.value}">
          <span class="suggestion-icon">${icon}</span>
          <span class="suggestion-label">${sug.label}</span>
        </div>
      `;
    }).join('');
    
    container.style.display = 'block';
    
    // Add click listeners
    container.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        onSelect(item.dataset.value);
      });
    });
  }

  /**
   * Show loading indicator in suggestions
   */
  showLoadingSuggestions(container) {
    container.innerHTML = `
      <div class="suggestion-item" style="cursor: default;">
        <span class="suggestion-icon">⏳</span>
        <span class="suggestion-label">Buscando...</span>
      </div>
    `;
    container.style.display = 'block';
  }

  /**
   * Perform Search
   */
  performSearch() {
    const keyword = document.getElementById('searchKeyword').value.toLowerCase().trim();
    const status = Array.from(document.getElementById('searchStatus').selectedOptions).map(o => o.value).filter(v => v);
    const priority = Array.from(document.getElementById('searchPriority').selectedOptions).map(o => o.value).filter(v => v);
    const assignee = document.getElementById('searchAssignee').value.toLowerCase().trim();
    const reporter = document.getElementById('searchReporter').value.toLowerCase().trim();
    const dateFrom = document.getElementById('searchDateFrom').value;
    const dateTo = document.getElementById('searchDateTo').value;
    const labels = document.getElementById('searchLabels').value.toLowerCase().split(',').map(l => l.trim()).filter(l => l);
    
    if (!window.state || !window.state.issues) {
      this.showNotification('Search', 'No tickets loaded', 'warning');
      return;
    }
    
    // Filter issues
    const results = window.state.issues.filter(issue => {
      // Keyword search
      if (keyword) {
        const searchIn = `${issue.key} ${issue.summary} ${issue.description || ''}`.toLowerCase();
        if (!searchIn.includes(keyword)) return false;
      }
      
      // Status filter
      if (status.length > 0 && !status.includes(issue.status?.toLowerCase())) return false;
      
      // Priority filter
      if (priority.length > 0 && !priority.includes(issue.priority?.toLowerCase())) return false;
      
      // Assignee filter
      if (assignee && !issue.assignee?.toLowerCase().includes(assignee)) return false;
      
      // Reporter filter
      if (reporter && !issue.reporter?.toLowerCase().includes(reporter)) return false;
      
      // Date filters (if date field exists)
      if (dateFrom && issue.created) {
        const issueDate = new Date(issue.created);
        if (issueDate < new Date(dateFrom)) return false;
      }
      if (dateTo && issue.created) {
        const issueDate = new Date(issue.created);
        if (issueDate > new Date(dateTo)) return false;
      }
      
      // Labels filter
      if (labels.length > 0 && issue.labels) {
        const issueLabels = issue.labels.map(l => l.toLowerCase());
        if (!labels.some(label => issueLabels.includes(label))) return false;
      }
      
      return true;
    });
    
    // Display results
    this.displaySearchResults(results);
  }

  /**
   * Display Search Results
   */
  displaySearchResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    const resultsList = document.getElementById('resultsList');
    const resultCount = document.getElementById('resultCount');
    
    resultCount.textContent = results.length;
    resultsContainer.style.display = 'block';
    
    if (results.length === 0) {
      resultsList.innerHTML = '<p class="no-results">No tickets match your search criteria</p>';
      return;
    }
    
    resultsList.innerHTML = results.map(issue => `
      <div class="result-item" onclick="window.sidebarActions.openTicketFromSearch('${issue.key}')">
        <div class="result-header">
          <strong>${issue.key}</strong>
          <span class="result-status">${issue.status || 'Unknown'}</span>
        </div>
        <div class="result-summary">${issue.summary || 'No summary'}</div>
        <div class="result-meta">
          <span>👤 ${issue.assignee || 'Unassigned'}</span>
          <span>🏷️ ${issue.priority || 'None'}</span>
        </div>
      </div>
    `).join('');
    
    this.showNotification('Search Complete', `Found ${results.length} ticket(s)`, 'success');
  }

  /**
   * Open Ticket from Search
   */
  openTicketFromSearch(issueKey) {
    // Close all modals (search, AI analyzer, etc)
    closeAllModals();
    
    // Open ticket details (use unified handler)
    if (typeof showTicketDetails === 'function') {
      showTicketDetails(issueKey);
    } else if (window.flowingFooter && typeof window.flowingFooter.switchToBalancedView === 'function') {
      window.flowingFooter.switchToBalancedView(issueKey);
    } else {
      console.warn('No handler available to open ticket details for', issueKey);
    }
  }

  /**
   * Clear Search
   */
  clearSearch() {
    document.getElementById('searchKeyword').value = '';
    document.getElementById('searchStatus').selectedIndex = 0;
    document.getElementById('searchPriority').selectedIndex = 0;
    document.getElementById('searchAssignee').value = '';
    document.getElementById('searchReporter').value = '';
    document.getElementById('searchDateFrom').value = '';
    document.getElementById('searchDateTo').value = '';
    document.getElementById('searchLabels').value = '';
    
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.style.display = 'none';
    
    document.getElementById('searchKeyword').focus();
  }

  /**
   * Botón: Reports
   */
  initReportsButton() {
    const items = document.querySelectorAll('.sidebar-section[aria-label="Utilities"] .sidebar-menu-item');
    const reportsBtn = Array.from(items).find(item => item.textContent.includes('Reports'));
    
    if (reportsBtn) {
      reportsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('📊 Reports clicked');
        this.openReportsDashboard();
      });
    }
  }

  /**
   * Open Reports Dashboard
   */
  openReportsDashboard() {
    let panel = document.getElementById('reportsPanel');
    
    if (!panel) {
      panel = this.createReportsDashboard();
      document.body.appendChild(panel);
    }
    
    panel.style.display = 'flex';
    setTimeout(() => panel.classList.add('active'), 10);
    
    // Generate reports
    this.generateReports();
  }

  /**
   * Create Reports Dashboard (Compact Version)
   */
  createReportsDashboard() {
    const panel = document.createElement('div');
    panel.id = 'reportsPanel';
    panel.className = 'modal-overlay';
    panel.innerHTML = `
      <div class="modal-container reports-modal-compact">
        <div class="modal-header">
          <h2>📊 Metrics & Insights</h2>
          <div id="metricsCacheIndicator" style="display: none; align-items: center; gap: 8px; margin-left: auto; margin-right: 8px; font-size: 12px; color: #64748b;"></div>
          <div class="header-actions">
            <button class="btn-icon" onclick="window.sidebarActions.showComparisonModal()" title="Compare Periods"><span>📊</span></button>
            <button class="btn-icon" onclick="window.sidebarActions.showDateFilterModal()" title="Date Range"><span>📅</span></button>
            <button class="btn-icon" onclick="window.sidebarActions.refreshReports()" title="Refresh"><span>🔄</span></button>
            <button class="modal-close" onclick="this.closest('.modal-overlay').classList.remove('active'); setTimeout(() => this.closest('.modal-overlay').style.display='none', 300)">&times;</button>
          </div>
        </div>
        <div class="modal-body">
          <div id="reportsLoading" class="reports-loading" style="display: none;">
            <div class="spinner"></div>
            <p>Generating intelligent metrics...</p>
          </div>
          
          <!-- AI Insights Section -->
          <div id="insightsSection" class="insights-section" style="display: none;">
            <h3>💡 Smart Insights</h3>
            <div id="insightsList" class="insights-list"></div>
          </div>
          
          <!-- Period Comparison -->
          <div id="comparisonSection" class="comparison-section" style="display: none;">
            <div class="comparison-card">
              <span class="comparison-label">This Month</span>
              <span class="comparison-value" id="currentMonthValue">-</span>
              <span class="comparison-change" id="comparisonChange">-</span>
            </div>
          </div>
          
          <!-- Compact Metrics Grid -->
          <div class="metrics-compact-grid">
            <div class="metric-card">
              <span class="metric-icon">📋</span>
              <div class="metric-content">
                <div class="metric-value" id="totalTickets">-</div>
                <div class="metric-label">Total</div>
              </div>
            </div>
            <div class="metric-card">
              <span class="metric-icon">🔄</span>
              <div class="metric-content">
                <div class="metric-value" id="openTickets">-</div>
                <div class="metric-label">Open</div>
              </div>
            </div>
            <div class="metric-card">
              <span class="metric-icon">✅</span>
              <div class="metric-content">
                <div class="metric-value" id="closedTickets">-</div>
                <div class="metric-label">Closed</div>
              </div>
            </div>
            <div class="metric-card">
              <span class="metric-icon">⏱️</span>
              <div class="metric-content">
                <div class="metric-value" id="avgResolutionTime">-</div>
                <div class="metric-label">Avg. Time</div>
              </div>
            </div>
          </div>
          
          <!-- Trend Chart (7 days) -->
          <div class="chart-compact">
            <h3>📈 Last 7 Days Trend</h3>
            <div id="trendChart" class="chart-container-compact"></div>
          </div>
          
          <!-- Quick Stats -->
          <div class="quick-stats">
            <div class="stat-row">
              <span class="stat-label">By Status</span>
              <div id="statusQuickStats" class="stat-pills"></div>
            </div>
            <div class="stat-row">
              <span class="stat-label">By Priority</span>
              <div id="priorityQuickStats" class="stat-pills"></div>
            </div>
            <div class="stat-row">
              <span class="stat-label">Top Assignees</span>
              <div id="assigneeQuickStats" class="stat-pills"></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="footer-left">
            <button class="btn-secondary btn-sm" onclick="window.sidebarActions.exportReport('csv')">📥 CSV</button>
            <button class="btn-secondary btn-sm" onclick="window.sidebarActions.exportReport('json')">📄 JSON</button>
            <button class="btn-secondary btn-sm" onclick="window.sidebarActions.exportReport('excel')">📊 Excel</button>
          </div>
          <button class="btn-primary btn-sm" onclick="this.closest('.modal-overlay').classList.remove('active'); setTimeout(() => this.closest('.modal-overlay').style.display='none', 300)">Close</button>
        </div>
      </div>
    `;
    
    // Add compact styles
    this.addCompactReportsStyles();
    
    return panel;
  }
  
  /**
   * Add Compact Reports Styles
   */
  addCompactReportsStyles() {
    if (document.getElementById('compactReportsStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'compactReportsStyles';
    style.textContent = `
      .reports-modal-compact {
        max-width: 700px;
        max-height: 85vh;
      }
      
      .modal-header .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        padding: 4px 8px;
        border-radius: 6px;
        transition: background 0.2s;
      }
      
      .btn-icon:hover {
        background: rgba(255,255,255,0.1);
      }
      
      .reports-loading {
        text-align: center;
        padding: 40px 20px;
      }
      
      .spinner {
        border: 3px solid rgba(255,255,255,0.1);
        border-top: 3px solid #4a90e2;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .insights-section {
        margin-bottom: 24px;
        padding: 16px;
        background: rgba(74, 144, 226, 0.1);
        border-radius: 8px;
        border-left: 3px solid #4a90e2;
      }
      
      .insights-section h3 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
      }
      
      .insights-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .insight-item {
        padding: 8px 12px;
        background: rgba(255,255,255,0.05);
        border-radius: 6px;
        font-size: 12px;
        display: flex;
        align-items: start;
        gap: 8px;
      }
      
      .insight-item.warning {
        background: rgba(255, 193, 7, 0.1);
        border-left: 2px solid #ffc107;
      }
      
      .insight-item.success {
        background: rgba(76, 175, 80, 0.1);
        border-left: 2px solid #4caf50;
      }
      
      .insight-item.info {
        background: rgba(33, 150, 243, 0.1);
        border-left: 2px solid #2196f3;
      }
      
      .metrics-compact-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }
      
      .metric-card {
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        padding: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .metric-icon {
        font-size: 20px;
      }
      
      .metric-content {
        flex: 1;
      }
      
      .metric-value {
        font-size: 20px;
        font-weight: 700;
        line-height: 1;
        margin-bottom: 4px;
      }
      
      .metric-label {
        font-size: 11px;
        opacity: 0.7;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .chart-compact {
        margin-bottom: 20px;
      }
      
      .chart-compact h3 {
        font-size: 14px;
        margin-bottom: 12px;
        font-weight: 600;
      }
      
      .chart-container-compact {
        height: 120px;
        background: rgba(255,255,255,0.03);
        border-radius: 8px;
        padding: 12px;
        display: flex;
        align-items: flex-end;
        gap: 8px;
        justify-content: space-between;
      }
      
      .chart-bar {
        flex: 1;
        background: linear-gradient(to top, #4a90e2, #64b5f6);
        border-radius: 4px 4px 0 0;
        min-height: 20px;
        position: relative;
        transition: all 0.3s;
      }
      
      .chart-bar:hover {
        background: linear-gradient(to top, #2196f3, #64b5f6);
        transform: translateY(-2px);
      }
      
      .chart-bar-label {
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 9px;
        opacity: 0.6;
        white-space: nowrap;
      }
      
      .quick-stats {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .stat-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .stat-label {
        font-size: 11px;
        opacity: 0.7;
        min-width: 80px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .stat-pills {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      
      .stat-pill {
        padding: 4px 10px;
        background: rgba(255,255,255,0.08);
        border-radius: 12px;
        font-size: 11px;
        white-space: nowrap;
      }
      
      .btn-sm {
        padding: 6px 12px;
        font-size: 12px;
      }
      
      .modal-footer {
        display: flex;
        gap: 12px;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .footer-left {
        display: flex;
        gap: 8px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Generate Reports (with Smart Backend)
   */
  async generateReports() {
    const loadingEl = document.getElementById('reportsLoading');
    
    try {
      // Get current service desk and queue
      const serviceDeskId = window.state?.currentDesk || '4';
      const queueId = window.state?.currentQueue || '';
      
      const cacheKey = `metrics_${serviceDeskId}_${queueId}`;
      
      // 🚀 LEVEL 1: Check memory cache (INSTANT - <1ms)
      if (window.metricsCache && window.metricsCache[cacheKey]) {
        const cached = window.metricsCache[cacheKey];
        const age = Date.now() - cached.timestamp;
        const maxAge = window.state?.issues?.length >= 50 ? 3 * 60 * 60 * 1000 : 15 * 60 * 1000;
        
        if (age < maxAge) {
          console.log(`💨 Using memory cache (${(age / 1000).toFixed(0)}s old) - INSTANT LOAD`);
          if (loadingEl) loadingEl.style.display = 'none';
          this.renderCompactMetrics(cached.data);
          this.showMetricsCacheIndicator('memory', age);
          return;
        }
      }
      
      // 🏃 LEVEL 2: Check LocalStorage (FAST - <10ms)
      const localCached = window.CacheManager?.get(cacheKey);
      if (localCached) {
        console.log('💾 Using LocalStorage cache - FAST LOAD');
        if (loadingEl) loadingEl.style.display = 'none';
        
        // Store in memory for next time
        window.metricsCache = window.metricsCache || {};
        window.metricsCache[cacheKey] = {
          data: localCached,
          timestamp: Date.now()
        };
        
        this.renderCompactMetrics(localCached);
        this.showMetricsCacheIndicator('localStorage', 0);
        return;
      }
      
      // 📡 LEVEL 3: Fetch from backend (NETWORK - ~500ms)
      console.log(`📊 Fetching intelligent metrics for desk=${serviceDeskId}, queue=${queueId}`);
      if (loadingEl) loadingEl.style.display = 'block';
      
      let url = `/api/reports/metrics?serviceDeskId=${serviceDeskId}`;
      if (queueId) url += `&queueId=${queueId}`;
      
      // Add date range filters if available
      if (window.state?.dateRange) {
        url += `&startDate=${window.state.dateRange.startDate}&endDate=${window.state.dateRange.endDate}`;
        console.log(`📅 Applying date filter: ${window.state.dateRange.startDate} to ${window.state.dateRange.endDate}`);
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (loadingEl) loadingEl.style.display = 'none';
      
      if (data.cached && data.metrics) {
        // Backend returned cached metrics (from DB)
        console.log('✅ Using backend cached metrics');
        
        // Store in BOTH caches for next time
        // Memory cache (LEVEL 1 - instant)
        window.metricsCache = window.metricsCache || {};
        window.metricsCache[cacheKey] = {
          data: data.metrics,
          timestamp: Date.now()
        };
        
        // LocalStorage cache (LEVEL 2 - fast)
        const ttl = window.state?.issues?.length >= 50 ? 3 * 60 * 60 * 1000 : 15 * 60 * 1000;
        if (window.CacheManager) {
          window.CacheManager.set(cacheKey, data.metrics, ttl);
        }
        
        console.log(`💾 Cached metrics in memory + localStorage (TTL: ${(ttl / (60 * 60 * 1000)).toFixed(1)}h)`);
        
        this.renderCompactMetrics(data.metrics);
        this.showMetricsCacheIndicator('backend', 0);
      } else if (data.refresh_status) {
        // Background refresh in progress
        console.log('🔄 Metrics refresh in progress:', data.refresh_status);
        this.showRefreshProgress(data.refresh_status);
        
        // Poll for completion
        this.pollMetricsRefresh(serviceDeskId, queueId);
      } else {
        console.warn('⚠️ Unexpected response format');
        this.showEmptyState();
      }
      
    } catch (error) {
      console.error('❌ Failed to load metrics:', error);
      if (loadingEl) loadingEl.style.display = 'none';
      this.showEmptyState();
    }
  }
  
  /**
   * Render Compact Metrics
   */
  renderCompactMetrics(metrics) {
    const summary = metrics.summary || {};
    const trends = metrics.trends || {};
    const performance = metrics.performance || {};
    const insights = metrics.insights || [];
    
    // Update metric cards
    document.getElementById('totalTickets').textContent = summary.total || 0;
    document.getElementById('openTickets').textContent = summary.open || 0;
    document.getElementById('closedTickets').textContent = summary.closed || 0;
    
    const avgHours = performance.avg_resolution_hours || 0;
    const avgText = avgHours < 1 ? '<1h' : 
                    avgHours < 24 ? `${Math.round(avgHours)}h` :
                    `${Math.round(avgHours / 24)}d`;
    document.getElementById('avgResolutionTime').textContent = avgText;
    
    // Render insights
    if (insights.length > 0) {
      const insightsSection = document.getElementById('insightsSection');
      const insightsList = document.getElementById('insightsList');
      insightsSection.style.display = 'block';
      insightsList.innerHTML = insights.map(insight => `
        <div class="insight-item ${insight.type}">
          <div>
            <strong>${insight.title}:</strong> ${insight.message}
            ${insight.metric ? `<br><span style="opacity:0.7; font-size:11px;">${insight.metric}</span>` : ''}
          </div>
        </div>
      `).join('');
    }
    
    // Render 7-day trend
    if (trends.last_7_days) {
      this.renderTrendChart(trends.last_7_days);
    }
    
    // Render quick stats
    if (summary.by_status) {
      this.renderQuickStats('statusQuickStats', summary.by_status);
    }
    if (summary.by_priority) {
      this.renderQuickStats('priorityQuickStats', summary.by_priority);
    }
    if (summary.by_assignee) {
      this.renderQuickStats('assigneeQuickStats', summary.by_assignee, 5);
    }
  }
  
  /**
   * Render Trend Chart (7 days)
   */
  renderTrendChart(trendData) {
    const container = document.getElementById('trendChart');
    if (!container) return;
    
    // Check if Chart.js is available
    if (typeof Chart !== 'undefined') {
      // Use Chart.js for interactive charts
      container.innerHTML = '<canvas id="trendChartCanvas" style="max-height: 200px;"></canvas>';
      const canvas = document.getElementById('trendChartCanvas');
      const ctx = canvas.getContext('2d');
      
      const labels = trendData.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      });
      
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Created',
              data: trendData.map(d => d.created),
              backgroundColor: 'rgba(74, 144, 226, 0.6)',
              borderColor: 'rgba(74, 144, 226, 1)',
              borderWidth: 1
            },
            {
              label: 'Resolved',
              data: trendData.map(d => d.resolved),
              backgroundColor: 'rgba(76, 175, 80, 0.6)',
              borderColor: 'rgba(76, 175, 80, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            x: {
              ticks: {
                color: 'rgba(255, 255, 255, 0.7)'
              },
              grid: {
                display: false
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: 'rgba(255, 255, 255, 0.8)',
                font: { size: 11 }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y}`;
                }
              }
            }
          }
        }
      });
    } else {
      // Fallback to basic HTML bars
      const maxValue = Math.max(...trendData.map(d => Math.max(d.created, d.resolved)));
      
      container.innerHTML = trendData.map(day => {
        const createdHeight = maxValue > 0 ? (day.created / maxValue * 100) : 0;
        const date = new Date(day.date);
        const label = date.toLocaleDateString('en', { weekday: 'short' });
        
        return `
          <div class="chart-bar" style="height: ${createdHeight}%" title="${day.date}: ${day.created} created, ${day.resolved} resolved">
            <div class="chart-bar-label">${label}</div>
          </div>
        `;
      }).join('');
    }
  }
  
  /**
   * Render Quick Stats Pills
   */
  renderQuickStats(containerId, data, limit = 10) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const entries = Object.entries(data).slice(0, limit);
    container.innerHTML = entries.map(([key, value]) => 
      `<span class="stat-pill">${key}: <strong>${value}</strong></span>`
    ).join('');
  }
  
  /**
   * Show Refresh Progress
   */
  showRefreshProgress(status) {
    const loadingEl = document.getElementById('reportsLoading');
    if (loadingEl) {
      loadingEl.style.display = 'block';
      loadingEl.innerHTML = `
        <div class="spinner"></div>
        <p>${status.status || 'Generating'} (${status.progress || 0}%)</p>
      `;
    }
  }
  
  /**
   * Poll Metrics Refresh
   */
  async pollMetricsRefresh(serviceDeskId, queueId, attempts = 0) {
    if (attempts >= 30) {
      console.warn('⚠️ Metrics refresh timeout');
      this.showEmptyState();
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      let url = `/api/reports/metrics?serviceDeskId=${serviceDeskId}`;
      if (queueId) url += `&queueId=${queueId}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.cached && data.metrics) {
        this.renderCompactMetrics(data.metrics);
      } else if (data.refresh_status && data.refresh_status.status !== 'completed') {
        this.showRefreshProgress(data.refresh_status);
        this.pollMetricsRefresh(serviceDeskId, queueId, attempts + 1);
      }
    } catch (error) {
      console.error('❌ Poll error:', error);
    }
  }
  
  /**
   * Show Empty State
   */
  showEmptyState() {
    document.getElementById('totalTickets').textContent = '0';
    document.getElementById('openTickets').textContent = '0';
    document.getElementById('closedTickets').textContent = '0';
    document.getElementById('avgResolutionTime').textContent = '-';
  }
  
  /**
   * Refresh Reports
   */
  async refreshReports() {
    const serviceDeskId = window.state?.currentDesk || '4';
    const queueId = window.state?.currentQueue || '';
    
    let url = `/api/reports/metrics?serviceDeskId=${serviceDeskId}&forceRefresh=true`;
    if (queueId) url += `&queueId=${queueId}`;
    
    const loadingEl = document.getElementById('reportsLoading');
    if (loadingEl) loadingEl.style.display = 'block';
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.refresh_status) {
        this.showRefreshProgress(data.refresh_status);
        this.pollMetricsRefresh(serviceDeskId, queueId);
      }
    } catch (error) {
      console.error('❌ Failed to refresh:', error);
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }
  
  /**
   * Show Comparison Modal
   */
  async showComparisonModal() {
    const serviceDeskId = window.state?.currentDesk || '4';
    const queueId = window.state?.currentQueue || '';
    
    try {
      let url = `/api/reports/compare?serviceDeskId=${serviceDeskId}`;
      if (queueId) url += `&queueId=${queueId}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.success) {
        this.showNotification('Comparison Error', data.error || 'Failed to load comparison', 'error');
        return;
      }
      
      // Update comparison section
      const section = document.getElementById('comparisonSection');
      if (section) {
        section.style.display = 'block';
        
        const card = section.querySelector('.comparison-card');
        if (card) {
          const currentValue = data.comparison.current_month?.total_issues || 0;
          const growthPercent = data.comparison.growth_percent || 0;
          const trend = data.comparison.trend || 'stable';
          
          const trendIcon = trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';
          const trendColor = trend === 'up' ? '#4caf50' : trend === 'down' ? '#f44336' : '#ff9800';
          
          card.innerHTML = `
            <h4>Period Comparison</h4>
            <div style="display: flex; gap: 20px; margin-top: 12px;">
              <div style="flex: 1;">
                <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">Current Month</div>
                <div style="font-size: 24px; font-weight: 700;">${currentValue}</div>
              </div>
              <div style="flex: 1;">
                <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">Growth</div>
                <div style="font-size: 24px; font-weight: 700; color: ${trendColor};">
                  ${trendIcon} ${growthPercent > 0 ? '+' : ''}${growthPercent.toFixed(1)}%
                </div>
              </div>
            </div>
          `;
        }
      }
      
      this.showNotification('Comparison Loaded', 'Period comparison updated', 'success');
    } catch (error) {
      console.error('❌ Comparison error:', error);
      this.showNotification('Comparison Error', 'Failed to load comparison data', 'error');
    }
  }
  
  /**
   * Show Date Filter Modal
   */
  showDateFilterModal() {
    const existingModal = document.getElementById('dateFilterModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'dateFilterModal';
    modal.className = 'modal-overlay active';
    modal.style.display = 'flex';
    
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    modal.innerHTML = `
      <div class="modal-content reports-modal-compact" style="max-width: 400px;">
        <div class="modal-header">
          <h2>📅 Date Range Filter</h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label for="startDate" style="display: block; margin-bottom: 6px; font-size: 12px; opacity: 0.8;">Start Date</label>
              <input type="date" id="startDate" value="${thirtyDaysAgo}" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff;">
            </div>
            <div>
              <label for="endDate" style="display: block; margin-bottom: 6px; font-size: 12px; opacity: 0.8;">End Date</label>
              <input type="date" id="endDate" value="${today}" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff;">
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn-secondary btn-sm" onclick="window.sidebarActions.applyDatePreset('today')">Today</button>
              <button class="btn-secondary btn-sm" onclick="window.sidebarActions.applyDatePreset('week')">Last 7 Days</button>
              <button class="btn-secondary btn-sm" onclick="window.sidebarActions.applyDatePreset('month')">Last 30 Days</button>
              <button class="btn-secondary btn-sm" onclick="window.sidebarActions.applyDatePreset('quarter')">Last 90 Days</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn-primary btn-sm" onclick="window.sidebarActions.applyDateFilter()">Apply Filter</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
  
  /**
   * Apply Date Preset
   */
  applyDatePreset(preset) {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate;
    
    switch (preset) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'quarter':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default:
        return;
    }
    
    document.getElementById('startDate').value = startDate;
    document.getElementById('endDate').value = endDate;
  }
  
  /**
   * Apply Date Filter
   */
  async applyDateFilter() {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    
    if (!startDate || !endDate) {
      this.showNotification('Invalid Date', 'Please select both start and end dates', 'warning');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      this.showNotification('Invalid Date', 'Start date must be before end date', 'warning');
      return;
    }
    
    // Close date filter modal
    document.getElementById('dateFilterModal')?.remove();
    
    // Store date range in session state
    if (!window.state) window.state = {};
    window.state.dateRange = { startDate, endDate };
    
    // Regenerate reports with date filter
    this.showNotification('Applying Filter', `Loading data from ${startDate} to ${endDate}`, 'info');
    await this.generateReports();
  }
  
  /**
   * Calculate average resolution time from issues
   */
  calculateAvgResolutionTime(issues) {
    const resolvedIssues = issues.filter(i => {
      const status = (i.status || i.estado || '').toLowerCase();
      return status.includes('done') || status.includes('closed') || 
             status.includes('resolved') || status.includes('completado');
    });
    
    if (resolvedIssues.length === 0) return '0h';
    
    let totalHours = 0;
    let validCount = 0;
    
    resolvedIssues.forEach(issue => {
      const created = issue.created || issue.createdDate;
      const resolved = issue.resolutiondate || issue.updated;
      
      if (created && resolved) {
        const createdDate = new Date(created);
        const resolvedDate = new Date(resolved);
        const diffMs = resolvedDate - createdDate;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffHours > 0 && diffHours < 8760) { // Max 1 year
          totalHours += diffHours;
          validCount++;
        }
      }
    });
    
    if (validCount === 0) return 'N/A';
    
    const avgHours = totalHours / validCount;
    
    if (avgHours < 1) {
      return `${Math.round(avgHours * 60)}m`;
    } else if (avgHours < 24) {
      return `${Math.round(avgHours)}h`;
    } else {
      const days = Math.round(avgHours / 24);
      return `${days}d`;
    }
  }

  /**
   * Render Status Chart
   */
  renderStatusChart(issues) {
    const statusCounts = {};
    issues.forEach(issue => {
      const status = issue.status || issue.estado || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    const chart = document.getElementById('statusChart');
    if (!chart) return;
    
    const total = issues.length;
    
    if (total === 0) {
      chart.innerHTML = '<p class="no-data">No data available</p>';
      return;
    }
    
    chart.innerHTML = Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([status, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        const statusClass = status.toLowerCase().replace(/\s+/g, '-');
        return `
          <div class="chart-bar">
            <div class="chart-label">${this.escapeHtml(status)}</div>
            <div class="chart-bar-container">
              <div class="chart-bar-fill status-${statusClass}" style="width: ${percentage}%"></div>
            </div>
            <div class="chart-value">${count} (${percentage}%)</div>
          </div>
        `;
      }).join('');
  }

  /**
   * Render Priority Chart
   */
  renderPriorityChart(issues) {
    const priorityCounts = {};
    issues.forEach(issue => {
      const priority = issue.priority || issue.prioridad || 'None';
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    });
    
    const chart = document.getElementById('priorityChart');
    if (!chart) return;
    
    const total = issues.length;
    
    if (total === 0) {
      chart.innerHTML = '<p class="no-data">No data available</p>';
      return;
    }
    
    // Priority color mapping
    const priorityColors = {
      'critical': '#dc2626',
      'highest': '#dc2626',
      'high': '#f59e0b',
      'medium': '#3b82f6',
      'low': '#10b981',
      'lowest': '#6b7280',
      'none': '#9ca3af'
    };
    
    chart.innerHTML = Object.entries(priorityCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([priority, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        const priorityKey = priority.toLowerCase();
        const color = priorityColors[priorityKey] || '#3b82f6';
        return `
          <div class="chart-bar">
            <div class="chart-label">${this.escapeHtml(priority)}</div>
            <div class="chart-bar-container">
              <div class="chart-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
            </div>
            <div class="chart-value">${count} (${percentage}%)</div>
          </div>
        `;
      }).join('');
  }

  /**
   * Render Assignee Chart
   */
  renderAssigneeChart(issues) {
    const assigneeCounts = {};
    issues.forEach(issue => {
      const assignee = issue.assignee || issue.asignado_a || 'Unassigned';
      assigneeCounts[assignee] = (assigneeCounts[assignee] || 0) + 1;
    });
    
    const chart = document.getElementById('assigneeChart');
    if (!chart) return;
    
    const total = issues.length;
    
    if (total === 0) {
      chart.innerHTML = '<p class="no-data">No data available</p>';
      return;
    }
    
    chart.innerHTML = Object.entries(assigneeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([assignee, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        return `
          <div class="chart-bar">
            <div class="chart-label">${this.escapeHtml(assignee)}</div>
            <div class="chart-bar-container">
              <div class="chart-bar-fill" style="width: ${percentage}%; background: linear-gradient(90deg, #3b82f6, #8b5cf6);"></div>
            </div>
            <div class="chart-value">${count} tickets (${percentage}%)</div>
          </div>
        `;
      }).join('');
  }

  /**
   * Render Recent Activity
   */
  renderRecentActivity(issues) {
    const activity = document.getElementById('recentActivity');
    if (!activity) return;
    
    if (!issues || issues.length === 0) {
      activity.innerHTML = '<p class="no-data">No recent activity</p>';
      return;
    }
    
    // Sort by updated date (most recent first)
    const sortedIssues = [...issues].sort((a, b) => {
      const dateA = new Date(a.updated || a.actualizado || a.created || 0);
      const dateB = new Date(b.updated || b.actualizado || b.created || 0);
      return dateB - dateA;
    });
    
    const recent = sortedIssues.slice(0, 5).map(issue => {
      const key = issue.key || 'N/A';
      const summary = issue.summary || issue.resumen || 'No summary';
      const assignee = issue.assignee || issue.asignado_a || 'Unassigned';
      const status = issue.status || issue.estado || 'Unknown';
      const updated = issue.updated || issue.actualizado;
      const timeAgo = updated ? this.getTimeAgo(new Date(updated)) : '';
      
      return `
        <div class="activity-item">
          <span class="activity-icon">📋</span>
          <div class="activity-content">
            <strong>${this.escapeHtml(key)}</strong>
            <p>${this.escapeHtml(summary)}</p>
            <small>
              👤 ${this.escapeHtml(assignee)} • 
              📊 ${this.escapeHtml(status)}
              ${timeAgo ? ` • 🕐 ${timeAgo}` : ''}
            </small>
          </div>
        </div>
      `;
    }).join('');
    
    activity.innerHTML = recent;
  }
  
  /**
   * Get time ago string
   */
  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Apply quick filter helper
   */
  applyQuickFilter(filterType, value) {
    if (!window.filterManager) {
      console.warn('FilterManager not available');
      return;
    }

    // Clear other filters first
    const inputs = document.querySelectorAll('.filter-bar input:not([type="checkbox"]), .filter-bar select');
    inputs.forEach(input => input.value = '');

    // Apply specific filter based on type
    let filterInput;
    switch (filterType) {
      case 'assignee':
        filterInput = document.getElementById('assigneeFilterInput') || 
                     document.querySelector('input[placeholder*="Assignee"]') ||
                     document.querySelector('input[placeholder*="Asignado"]') ||
                     document.querySelector('.filter-input[placeholder*="assignee" i]');
        break;
      case 'status':
        filterInput = document.getElementById('statusFilterSelect') ||
                     document.querySelector('select.status-filter') ||
                     document.querySelector('#statusSelectFilter');
        break;
      case 'priority':
        filterInput = document.getElementById('priorityFilterSelect') ||
                     document.querySelector('select.priority-filter') ||
                     document.querySelector('#prioritySelectFilter');
        break;
    }

    if (filterInput) {
      filterInput.value = value;
      // Trigger filter application
      if (typeof window.filterManager.applyFilters === 'function') {
        window.filterManager.applyFilters();
      }
    } else {
      console.warn(`Filter input not found for type: ${filterType}`);
    }
  }

  /**
   * Export Report (Enhanced)
   */
  async exportReport(format = 'csv') {
    const serviceDeskId = window.state?.currentDesk || '4';
    const queueId = window.state?.currentQueue || '';
    
    try {
      let url = `/api/reports/export/${format}?serviceDeskId=${serviceDeskId}`;
      if (queueId) url += `&queueId=${queueId}`;
      
      // Add date range filters if available
      if (window.state?.dateRange) {
        url += `&startDate=${window.state.dateRange.startDate}&endDate=${window.state.dateRange.endDate}`;
      }
      
      const response = await fetch(url);
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `speedyflow_report_${new Date().getTime()}.${format}`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
        
        this.showNotification('Report Exported', `${format.toUpperCase()} file downloaded successfully`, 'success');
      } else {
        const error = await response.json();
        this.showNotification('Export Failed', error.error || 'Failed to export report', 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      this.showNotification('Export Error', 'Failed to download report', 'error');
    }
  }

  /**
   * Generate CSV
   */
  generateCSV(issues) {
    const headers = ['Key', 'Summary', 'Status', 'Priority', 'Assignee'];
    const rows = issues.map(issue => [
      issue.key,
      issue.summary || '',
      issue.status || '',
      issue.priority || '',
      issue.assignee || ''
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  /**
   * Botón: Notifications
   */
  initNotificationsButton() {
    // NOTE: Button handler is now managed by notifications-panel.js
    // This prevents duplicate event listeners
    console.log('✅ Notifications button initialization skipped (handled by notifications-panel.js)');
  }

  /**
   * Create Notifications Panel
   */
  createNotificationsPanel() {
    const panel = document.createElement('div');
    panel.id = 'notificationsPanel';
    panel.className = 'notifications-panel';
    panel.innerHTML = `
      <div class="notifications-header">
        <h3>🔔 Notifications</h3>
        <button class="close-btn" onclick="const p = this.closest('.notifications-panel'); p.classList.remove('active'); setTimeout(() => p.style.display='none', 300);">&times;</button>
      </div>
      <div class="notifications-body">
        <div class="notification-item unread">
          <span class="notification-icon">📋</span>
          <div class="notification-content">
            <strong>New ticket assigned</strong>
            <p>MSM-6891 has been assigned to you</p>
            <small>2 minutes ago</small>
          </div>
        </div>
        <div class="notification-item unread">
          <span class="notification-icon">💬</span>
          <div class="notification-content">
            <strong>New comment</strong>
            <p>Someone commented on MSM-6885</p>
            <small>15 minutes ago</small>
          </div>
        </div>
        <div class="notification-item">
          <span class="notification-icon">✅</span>
          <div class="notification-content">
            <strong>Ticket updated</strong>
            <p>MSM-6863 status changed to Done</p>
            <small>1 hour ago</small>
          </div>
        </div>
      </div>
      <div class="notifications-footer">
        <button class="btn-text">Mark all as read</button>
        <button class="btn-text">View all</button>
      </div>
    `;
    
    return panel;
  }

  /**
   * Botón: Refresh
   */
  initRefreshButton() {
    const btn = document.getElementById('refreshBtn');
    if (!btn) return;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('🔄 Refresh clicked');
      
      // Add spinning animation
      const icon = btn.querySelector('.icon');
      if (icon) {
        icon.style.animation = 'spin 1s linear';
      }
      
      // Reload data
      await this.refreshData();
      
      // Remove animation
      setTimeout(() => {
        if (icon) icon.style.animation = '';
      }, 1000);
      
      this.showNotification('Refresh', 'Data refreshed successfully', 'success');
    });
  }

  /**
   * Refresh Data
   */
  async refreshData() {
    console.log('🔄 Refreshing data...');
    
    // Refresh sidebar cache in background
    await this.refreshCache();
    
    // Clear browser cache
    if (window.CacheManager) {
      window.CacheManager.clear();
      console.log('🗑️ Cleared browser cache');
    }
    
    // Reload issues
    if (typeof window.loadIssuesForQueue === 'function' && window.state?.currentQueue) {
      await window.loadIssuesForQueue(window.state.currentDesk, window.state.currentQueue);
    } else if (typeof window.loadIssues === 'function' && window.state?.currentQueue) {
      await window.loadIssues(window.state.currentQueue);
    }
    
    // Reload service desks if function exists
    if (typeof window.loadServiceDesks === 'function') {
      await window.loadServiceDesks();
    }
  }

  /**
   * Botón: Settings
   */
  initSettingsButton() {
    const items = document.querySelectorAll('.sidebar-section[aria-label="Account"] .sidebar-menu-item');
    const settingsBtn = Array.from(items).find(item => item.textContent.includes('Settings'));
    
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('⚙️ Settings clicked');
        this.openSettingsPanel();
      });
    }
  }

  /**
   * Open Settings Panel
   */
  openSettingsPanel() {
    let panel = document.getElementById('settingsPanel');
    
    if (!panel) {
      panel = this.createSettingsPanel();
      document.body.appendChild(panel);
    }
    
    panel.style.display = 'flex';
    setTimeout(() => panel.classList.add('active'), 10);
    
    // Load current settings
    this.loadSettings();
  }

  /**
   * Create Settings Panel
   */
  createSettingsPanel() {
    const panel = document.createElement('div');
    panel.id = 'settingsPanel';
    panel.className = 'modal-overlay';
    panel.innerHTML = `
      <div class="modal-container settings-modal">
        <div class="modal-header">
          <h2>⚙️ Settings</h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').classList.remove('active'); setTimeout(() => this.closest('.modal-overlay').style.display='none', 300)">&times;</button>
        </div>
        <div class="modal-body">
          <div class="settings-tabs">
            <button class="settings-tab active" data-tab="general">General</button>
            <button class="settings-tab" data-tab="appearance">Appearance</button>
            <button class="settings-tab" data-tab="notifications">Notifications</button>
            <button class="settings-tab" data-tab="advanced">Advanced</button>
          </div>
          
          <div class="settings-content">
            <!-- General Settings -->
            <div class="settings-panel active" data-panel="general">
              <h3>General Settings</h3>
              <div class="setting-item">
                <label for="autoRefresh">Auto-refresh tickets</label>
                <input type="checkbox" id="autoRefresh" checked>
              </div>
              <div class="setting-item">
                <label for="refreshInterval">Refresh interval (seconds)</label>
                <input type="number" id="refreshInterval" value="60" min="10" max="300">
              </div>
              <div class="setting-item">
                <label for="defaultView">Default view</label>
                <select id="defaultView">
                  <option value="kanban">Kanban Board</option>
                  <option value="list">List View</option>
                </select>
              </div>
            </div>
            
            <!-- Appearance Settings -->
            <div class="settings-panel" data-panel="appearance">
              <h3>Appearance</h3>
              <div class="setting-item">
                <label for="themeSelect">Theme</label>
                <select id="themeSelect">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto (System)</option>
                </select>
              </div>
              
              <!-- Font Family Customization -->
              <div class="font-customization-section">
                <h4>Font Family</h4>
                <p class="section-description">Choose a font combination that matches your workflow and aesthetic preferences.</p>
                <div id="fontPresetSelector"></div>
              </div>
              
              <div class="setting-item">
                <label for="compactMode">Compact mode</label>
                <input type="checkbox" id="compactMode">
              </div>
              <div class="setting-item">
                <label for="showAvatars">Show user avatars</label>
                <input type="checkbox" id="showAvatars" checked>
              </div>
              <div class="setting-item">
                <label for="animationSpeed">Animation speed</label>
                <select id="animationSpeed">
                  <option value="fast">Fast</option>
                  <option value="normal">Normal</option>
                  <option value="slow">Slow</option>
                </select>
              </div>
            </div>
            
            <!-- Notifications Settings -->
            <div class="settings-panel" data-panel="notifications">
              <h3>Notification Preferences</h3>
              <div class="setting-item">
                <label for="enableNotifications">Enable notifications</label>
                <input type="checkbox" id="enableNotifications" checked>
              </div>
              <div class="setting-item">
                <label for="soundEnabled">Enable sound</label>
                <input type="checkbox" id="soundEnabled">
              </div>
              <div class="setting-item">
                <label for="notifyAssigned">Notify when assigned</label>
                <input type="checkbox" id="notifyAssigned" checked>
              </div>
              <div class="setting-item">
                <label for="notifyComments">Notify on comments</label>
                <input type="checkbox" id="notifyComments" checked>
              </div>
              <div class="setting-item">
                <label for="notifyMentions">Notify on mentions</label>
                <input type="checkbox" id="notifyMentions" checked>
              </div>
            </div>
            
            <!-- Advanced Settings -->
            <div class="settings-panel" data-panel="advanced">
              <h3>Advanced Settings</h3>
              <div class="setting-item">
                <label for="cacheEnabled">Enable caching</label>
                <input type="checkbox" id="cacheEnabled" checked>
              </div>
              <div class="setting-item">
                <label for="debugMode">Debug mode</label>
                <input type="checkbox" id="debugMode">
              </div>
              <div class="setting-item">
                <label>Clear cache</label>
                <button class="btn-secondary" onclick="localStorage.clear(); location.reload()">Clear All Data</button>
              </div>
              <div class="setting-item">
                <label>Export settings</label>
                <button class="btn-secondary" onclick="window.sidebarActions.exportSettings()">Export</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').classList.remove('active'); setTimeout(() => this.closest('.modal-overlay').style.display='none', 300)">Cancel</button>
          <button class="btn-primary" onclick="window.sidebarActions.saveSettings()">Save Changes</button>
        </div>
      </div>
    `;
    
    // Tab switching
    panel.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update tabs
        panel.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update panels
        panel.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
        panel.querySelector(`[data-panel="${tabName}"]`).classList.add('active');
      });
    });
    
    return panel;
  }

  /**
   * Load Settings from localStorage
   */
  loadSettings() {
    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
    
    // General
    if (settings.autoRefresh !== undefined) {
      document.getElementById('autoRefresh').checked = settings.autoRefresh;
    }
    if (settings.refreshInterval) {
      document.getElementById('refreshInterval').value = settings.refreshInterval;
    }
    if (settings.defaultView) {
      document.getElementById('defaultView').value = settings.defaultView;
    }
    
    // Appearance
    if (settings.theme) {
      document.getElementById('themeSelect').value = settings.theme;
    }
    if (settings.compactMode !== undefined) {
      document.getElementById('compactMode').checked = settings.compactMode;
    }
    if (settings.showAvatars !== undefined) {
      document.getElementById('showAvatars').checked = settings.showAvatars;
    }
    if (settings.animationSpeed) {
      document.getElementById('animationSpeed').value = settings.animationSpeed;
    }
    
    // Initialize font family selector
    this.initializeFontSelector();
    
    // Apply saved font preset
    const savedPreset = localStorage.getItem('fontPreset') || 'business';
    this.applyFontPreset(savedPreset);
    
    // Notifications
    if (settings.enableNotifications !== undefined) {
      document.getElementById('enableNotifications').checked = settings.enableNotifications;
    }
    if (settings.soundEnabled !== undefined) {
      document.getElementById('soundEnabled').checked = settings.soundEnabled;
    }
    if (settings.notifyAssigned !== undefined) {
      document.getElementById('notifyAssigned').checked = settings.notifyAssigned;
    }
    if (settings.notifyComments !== undefined) {
      document.getElementById('notifyComments').checked = settings.notifyComments;
    }
    if (settings.notifyMentions !== undefined) {
      document.getElementById('notifyMentions').checked = settings.notifyMentions;
    }
    
    // Advanced
    if (settings.cacheEnabled !== undefined) {
      document.getElementById('cacheEnabled').checked = settings.cacheEnabled;
    }
    if (settings.debugMode !== undefined) {
      document.getElementById('debugMode').checked = settings.debugMode;
    }
  }

  /**
   * Save Settings
   */
  saveSettings() {
    const settings = {
      // General
      autoRefresh: document.getElementById('autoRefresh').checked,
      refreshInterval: parseInt(document.getElementById('refreshInterval').value),
      defaultView: document.getElementById('defaultView').value,
      
      // Appearance
      theme: document.getElementById('themeSelect').value,
      compactMode: document.getElementById('compactMode').checked,
      showAvatars: document.getElementById('showAvatars').checked,
      animationSpeed: document.getElementById('animationSpeed').value,
      
      // Notifications
      enableNotifications: document.getElementById('enableNotifications').checked,
      soundEnabled: document.getElementById('soundEnabled').checked,
      notifyAssigned: document.getElementById('notifyAssigned').checked,
      notifyComments: document.getElementById('notifyComments').checked,
      notifyMentions: document.getElementById('notifyMentions').checked,
      
      // Advanced
      cacheEnabled: document.getElementById('cacheEnabled').checked,
      debugMode: document.getElementById('debugMode').checked
    };
    
    localStorage.setItem('userSettings', JSON.stringify(settings));
    
    // Apply theme if changed
    if (settings.theme !== 'auto') {
      document.body.className = `theme-${settings.theme}`;
      localStorage.setItem('theme', settings.theme);
    }
    
    // Close modal
    const panel = document.getElementById('settingsPanel');
    panel.classList.remove('active');
    setTimeout(() => panel.style.display = 'none', 300);
    
    this.showNotification('Settings Saved', 'Your preferences have been updated', 'success');
  }

  /**
   * Export Settings
   */
  exportSettings() {
    const settings = localStorage.getItem('userSettings') || '{}';
    const blob = new Blob([settings], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speedyflow-settings-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showNotification('Settings Exported', 'Settings file downloaded', 'success');
  }

  /**
   * Botón: Help Center
   */
  initHelpCenterButton() {
    const items = document.querySelectorAll('.sidebar-section[aria-label="Account"] .sidebar-menu-item');
    const helpBtn = Array.from(items).find(item => item.textContent.includes('Help'));
    
    if (helpBtn) {
      helpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('❔ Help Center clicked');
        
        // Open help documentation
        window.open('https://github.com/speedyflow/docs', '_blank');
      });
    }
  }

  /**
   * Botón: User Menu
   */
  initUserMenuButton() {
    const btn = document.getElementById('userMenuBtn');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('👤 User Menu clicked');
      
      // Toggle user dropdown
      this.toggleUserDropdown();
    });
  }

  /**
   * Toggle User Dropdown
   */
  toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown) {
      console.warn('User dropdown not found');
      return;
    }
    
    const isExpanded = dropdown.classList.contains('active');
    
    if (isExpanded) {
      dropdown.classList.remove('active');
      dropdown.setAttribute('aria-hidden', 'true');
    } else {
      dropdown.classList.add('active');
      dropdown.setAttribute('aria-hidden', 'false');
      
      // Update user info
      this.updateUserDropdown();
    }
  }

  /**
   * Update User Dropdown with current user info
   */
  updateUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown || !window.state?.currentUser) return;
    
    const userName = dropdown.querySelector('.user-dropdown-header h4');
    const userEmail = dropdown.querySelector('.user-dropdown-header p');
    
    if (userName) {
      userName.textContent = window.state.currentUser;
    }
    
    if (userEmail && window.state.currentUserAccountId) {
      userEmail.textContent = window.state.currentUserAccountId;
    }
  }

  /**
   * Botón: Logout
   */
  initLogoutButton() {
    const btn = document.getElementById('logoutBtn');
    if (!btn) return;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('🚪 Logout clicked');
      
      // Confirm logout
      if (confirm('Are you sure you want to logout?')) {
        await this.logout();
      }
    });
  }

  /**
   * Logout
   */
  async logout() {
    console.log('🚪 Logging out...');
    
    // Clear localStorage
    localStorage.clear();
    
    // Clear session
    if (typeof window.state !== 'undefined') {
      window.state.currentUser = null;
      window.state.currentUserAccountId = null;
    }
    
    // Redirect to login or home
    this.showNotification('Logout', 'Logged out successfully', 'success');
    
    // Reload page after short delay
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }

  /**
   * Show Notification Toast
   */
  showNotification(title, message, type = 'info') {
    console.log(`📢 ${title}: ${message}`);
    
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${this.getToastIcon(type)}</div>
      <div class="toast-content">
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
    `;
    
    // Add to body
    document.body.appendChild(toast);
    
    // Show with animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Initialize Font Selector
   */
  initializeFontSelector() {
    const container = document.getElementById('fontPresetSelector');
    if (!container) {
      console.warn('⚠️ Font preset selector container not found');
      return;
    }

    // Generate font preset selector HTML directly
    const selectorHTML = this.generateFontPresetHTML();
    container.innerHTML = selectorHTML;
    
    // Setup event handlers
    this.setupFontPresetHandlers();
    
    console.log('✅ Font selector initialized');
  }

  /**
   * Generate Font Preset Selector HTML
   */
  generateFontPresetHTML() {
    return `
      <div class="font-preset-selector">
        <div class="font-preset-option" data-preset="business">
          <div class="preset-header">
            <h4>Business Classic</h4>
            <span class="preset-badge default">Default</span>
          </div>
          <div class="preset-fonts">
            <span class="font-ui">Segoe UI</span> + <span class="font-content">Georgia</span>
          </div>
          <p class="preset-description">Familiar and professional - Perfect for corporate environments</p>
        </div>
        
        <div class="font-preset-option" data-preset="modern">
          <div class="preset-header">
            <h4>Modern Professional</h4>
            <span class="preset-badge tech">Tech</span>
          </div>
          <div class="preset-fonts">
            <span class="font-ui">Inter</span> + <span class="font-content">Source Serif Pro</span>
          </div>
          <p class="preset-description">Clean and technological - Optimized for digital interfaces</p>
        </div>
        
        <div class="font-preset-option" data-preset="corporate">
          <div class="preset-header">
            <h4>Corporate Executive</h4>
            <span class="preset-badge premium">Premium</span>
          </div>
          <div class="preset-fonts">
            <span class="font-ui">IBM Plex Sans</span> + <span class="font-content">Playfair Display</span>
          </div>
          <p class="preset-description">Elegant and executive - Sophisticated corporate design</p>
        </div>
        
        <div class="font-preset-option" data-preset="creative">
          <div class="preset-header">
            <h4>Creative Studio</h4>
            <span class="preset-badge creative">Creative</span>
          </div>
          <div class="preset-fonts">
            <span class="font-ui">Poppins</span> + <span class="font-content">Crimson Text</span>
          </div>
          <p class="preset-description">Approachable and creative - Perfect for innovative teams</p>
        </div>
      </div>
    `;
  }

  /**
   * Setup Font Preset Event Handlers
   */
  setupFontPresetHandlers() {
    const options = document.querySelectorAll('.font-preset-option');
    
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        const presetId = option.getAttribute('data-preset');
        this.applyFontPreset(presetId);
        
        // Update active state
        options.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
      });
    });
    
    // Load current preset
    const currentPreset = localStorage.getItem('fontPreset') || 'business';
    const currentOption = document.querySelector(`[data-preset="${currentPreset}"]`);
    if (currentOption) {
      currentOption.classList.add('active');
    }
  }

  /**
   * Apply Font Preset
   */
  applyFontPreset(presetId) {
    // Remove existing preset classes
    const presets = ['business', 'modern', 'corporate', 'creative'];
    presets.forEach(preset => {
      document.body.classList.remove(`font-preset-${preset}`);
      document.documentElement.classList.remove(`font-preset-${preset}`);
    });
    
    // Apply new preset
    document.body.classList.add(`font-preset-${presetId}`);
    document.documentElement.classList.add(`font-preset-${presetId}`);
    
    // Save to localStorage
    localStorage.setItem('fontPreset', presetId);
    
    // Log adaptation details
    this.logFontAdaptation(presetId);
    
    console.log(`✅ Font preset applied: ${presetId}`);
  }

  /**
   * Show cache indicator with refresh button for Metrics
   * @param {string} source - Cache source: 'memory', 'localStorage', or 'backend'
   * @param {number} age - Cache age in milliseconds
   */
  showMetricsCacheIndicator(source, age) {
    const indicator = document.getElementById('metricsCacheIndicator');
    if (!indicator) return;
    
    const sourceIcons = {
      memory: '💨',
      localStorage: '💾',
      backend: '📡'
    };
    
    const sourceLabels = {
      memory: 'En memoria',
      localStorage: 'En caché local',
      backend: 'Del servidor'
    };
    
    const ageText = age > 0 ? ` • ${this.formatCacheAge(age)} atrás` : '';
    
    indicator.innerHTML = `
      <span style="display: flex; align-items: center; gap: 6px;">
        ${sourceIcons[source]} ${sourceLabels[source]}${ageText}
      </span>
      <button 
        onclick="window.sidebarActions.refreshReports()" 
        style="padding: 4px 8px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-size: 11px; display: flex; align-items: center; gap: 4px; transition: all 0.2s;"
        onmouseover="this.style.background='#e2e8f0'" 
        onmouseout="this.style.background='#f1f5f9'"
        title="Actualizar métricas con datos recientes"
      >
        🔄 Actualizar
      </button>
    `;
    indicator.style.display = 'flex';
  }
  
  /**
   * Format cache age for display
   * @param {number} ms - Age in milliseconds
   * @returns {string} Formatted age string
   */
  formatCacheAge(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  /**
   * Log Font Adaptation Details
   */
  logFontAdaptation(presetId) {
    const adaptations = {
      'business': 'Segoe UI + Georgia → Aptos + Century (0.95x line-height, +0.005em spacing)',
      'modern': 'Inter + Source Serif Pro → Aptos + Century (1.02x line-height, -0.002em spacing)',
      'corporate': 'IBM Plex + Playfair → Aptos + Century (1.05x line-height, +0.008em spacing)',
      'creative': 'Poppins + Crimson Text → Aptos + Century (1.08x line-height, +0.003em spacing)'
    };

    console.log(`🎨 Font Adaptation: ${adaptations[presetId]}`);
  }

  /**
   * Get Toast Icon
   */
  getToastIcon(type) {
    const icons = {
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'info': 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.sidebarActions = new SidebarActions();
    window.sidebarActions.init();
  });
} else {
  window.sidebarActions = new SidebarActions();
  window.sidebarActions.init();
}
