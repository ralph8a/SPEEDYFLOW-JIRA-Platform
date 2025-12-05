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
   * Refresh all cached data
   */
  async refreshCache() {
    console.log('🔄 Refreshing sidebar cache...');
    this.cache.lastRefresh = new Date();
    
    await Promise.all([
      this.cacheCurrentUser(),
      this.cacheServiceDesks(),
      this.cacheNotifications()
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
   * Auto-select the user's desk and "assigned to me" queue
   * Uses multiple strategies: user groups, project keys from tickets, and queue analysis
   */
  async autoSelectUserDeskAndQueue(currentUser) {
    try {
      console.log('🔍 Auto-selecting desk and queue for:', currentUser);
      
      // Get user profile with groups
      const userResponse = await fetch('/api/user');
      if (!userResponse.ok) {
        throw new Error(`Failed to fetch user profile: ${userResponse.status}`);
      }
      
      const userData = await userResponse.json();
      const userProfile = userData.user || userData;
      const userGroups = userProfile.groups || [];
      const userAccountId = userProfile.accountId;
      
      console.log('👤 User profile:', {
        name: userProfile.displayName,
        accountId: userAccountId,
        groups: userGroups.map(g => g.name || g)
      });
      
      // Get available desks
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
        
        console.log(`✅ Fetched ${desks.length} desks from API`);
      } else {
        console.log(`💾 Using cached ${desks.length} desk(s)`);
      }
      
      if (desks.length === 0) {
        console.warn('⚠️ No desks available');
        return false;
      }

      console.log('📋 Available desks:', desks.map(d => ({ 
        id: d.id, 
        name: d.name || d.displayName,
        projectKey: d.projectKey || d.key
      })));

      // Strategy 1: Match project key from existing tickets
      let userDesk = null;
      let assignedQueue = null;
      
      // Check if there are any loaded tickets to extract project key
      const existingIssues = window.state?.issues || [];
      if (existingIssues.length > 0) {
        // Get project keys from tickets assigned to this user
        const userTickets = existingIssues.filter(issue => {
          const assignee = issue.assignee || issue.asignado_a || issue.fields?.assignee;
          const assigneeId = assignee?.accountId;
          const assigneeName = assignee?.displayName || assignee?.name || assignee;
          
          return (userAccountId && assigneeId === userAccountId) ||
                 (assigneeName && assigneeName.toLowerCase().includes(currentUser.toLowerCase()));
        });
        
        if (userTickets.length > 0) {
          // Extract project key from ticket key (e.g., "MSM-123" -> "MSM")
          const firstTicket = userTickets[0];
          const ticketKey = firstTicket.key || firstTicket.id || '';
          const projectKey = ticketKey.split('-')[0];
          
          console.log(`🎫 Found user ticket: ${ticketKey}, project key: ${projectKey}`);
          
          // Find desk matching this project key
          userDesk = desks.find(desk => {
            const deskKey = desk.projectKey || desk.key || '';
            const deskName = (desk.name || desk.displayName || '').toUpperCase();
            return deskKey === projectKey || deskName.includes(projectKey);
          });
          
          if (userDesk) {
            console.log(`✅ Found desk matching project key "${projectKey}": ${userDesk.name || userDesk.displayName}`);
          }
        }
      }

      // Strategy 2: Match desk name with user groups
      if (!userDesk) {
        console.log('🔍 Strategy 2: Matching desk with user groups...');
        
        for (const group of userGroups) {
          const groupName = (group.name || group).toLowerCase();
          
          const matchingDesk = desks.find(desk => {
            const deskName = (desk.name || desk.displayName || '').toLowerCase();
            // Match if desk name contains group name or vice versa
            return deskName.includes(groupName) || groupName.includes(deskName);
          });
          
          if (matchingDesk) {
            userDesk = matchingDesk;
            console.log(`✅ Found desk matching user group "${group.name || group}": ${userDesk.name || userDesk.displayName}`);
            break;
          }
        }
      }

      // Strategy 3: Check each desk's "Assigned to me" queue for user tickets
      if (!userDesk) {
        console.log('🔍 Strategy 3: Checking desks for user tickets...');
        
        for (const desk of desks) {
          const queues = desk.queues || [];
          
          const foundQueue = queues.find(queue => {
            const queueName = (queue.name || '').toLowerCase();
            return queueName.includes('assigned to me') ||
                   queueName.includes('asignado a mí') ||
                   queueName.includes('asignado a mi') ||
                   queueName.includes('mis tickets') ||
                   queueName.includes('my tickets');
          });

          if (foundQueue) {
            // Quick check: fetch a few issues from this queue
            try {
              const issuesResponse = await fetch(`/api/queue/${foundQueue.id}/issues?maxResults=10`);
              if (issuesResponse.ok) {
                const issuesData = await issuesResponse.json();
                const issues = issuesData.data || issuesData.issues || issuesData || [];
                
                // Check if any tickets are assigned to this user
                const hasUserTickets = issues.some(issue => {
                  const assignee = issue.assignee || issue.asignado_a || issue.fields?.assignee;
                  const assigneeId = assignee?.accountId;
                  return userAccountId && assigneeId === userAccountId;
                });
                
                if (hasUserTickets) {
                  userDesk = desk;
                  assignedQueue = foundQueue;
                  console.log(`✅ Found desk with user tickets: ${desk.name || desk.displayName}`);
                  break;
                }
              }
            } catch (error) {
              console.log(`⚠️ Could not check queue ${foundQueue.name}:`, error.message);
            }
          }
        }
      }

      // Find "Assigned to me" queue in selected desk
      if (userDesk && !assignedQueue) {
        const queues = userDesk.queues || [];
        assignedQueue = queues.find(queue => {
          const queueName = (queue.name || '').toLowerCase();
          return queueName.includes('assigned to me') ||
                 queueName.includes('asignado a mí') ||
                 queueName.includes('asignado a mi') ||
                 queueName.includes('mis tickets') ||
                 queueName.includes('my tickets');
        });
        
        // Fallback to first queue if no "Assigned to me" found
        if (!assignedQueue && queues.length > 0) {
          assignedQueue = queues[0];
          console.log(`⚠️ No "Assigned to me" queue found, using first queue: ${assignedQueue.name}`);
        }
      }

      // Last resort: use first desk
      if (!userDesk) {
        userDesk = desks[0];
        const queues = userDesk.queues || [];
        assignedQueue = queues[0];
        console.log(`⚠️ Using first available desk: ${userDesk.name || userDesk.displayName}`);
      }

      if (!assignedQueue) {
        console.warn('⚠️ No queues found');
        return false;
      }

      console.log(`📂 Final selection - Desk: ${userDesk.name || userDesk.displayName} (${userDesk.id})`);
      console.log(`📋 Final selection - Queue: ${assignedQueue.name} (${assignedQueue.id})`);

      // Update UI selects
      const deskSelect = document.getElementById('serviceDeskSelectFilter');
      const queueSelect = document.getElementById('queueSelectFilter');
      
      if (deskSelect) {
        deskSelect.value = userDesk.id;
        const changeEvent = new Event('change', { bubbles: true });
        deskSelect.dispatchEvent(changeEvent);
        
        if (window.state) {
          window.state.currentDesk = userDesk.id;
        }
        
        console.log('✅ Updated desk select to:', userDesk.id);
      }
      
      // Wait for queue dropdown to populate
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (queueSelect) {
        queueSelect.value = assignedQueue.id;
        const changeEvent = new Event('change', { bubbles: true });
        queueSelect.dispatchEvent(changeEvent);
        
        if (window.state) {
          window.state.currentQueue = assignedQueue.id;
        }
        
        console.log('✅ Updated queue select to:', assignedQueue.id);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Error auto-selecting desk and queue:', error);
      console.error('Stack trace:', error.stack);
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
  openAdvancedSearch() {
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
            <div class="search-field">
              <label for="searchKeyword">🔎 Keyword</label>
              <input type="text" id="searchKeyword" placeholder="Search in summary, description..." autocomplete="off">
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
              <div class="search-field">
                <label for="searchAssignee">Assignee</label>
                <input type="text" id="searchAssignee" placeholder="Assignee name...">
              </div>
              
              <div class="search-field">
                <label for="searchReporter">Reporter</label>
                <input type="text" id="searchReporter" placeholder="Reporter name...">
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
    
    return panel;
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
    // Close search modal
    const panel = document.getElementById('searchPanel');
    panel.classList.remove('active');
    setTimeout(() => panel.style.display = 'none', 300);
    
    // Open ticket details
    if (typeof showTicketDetails === 'function') {
      showTicketDetails(issueKey);
    } else if (window.rightSidebar) {
      window.rightSidebar.open(issueKey);
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
   * Create Reports Dashboard
   */
  createReportsDashboard() {
    const panel = document.createElement('div');
    panel.id = 'reportsPanel';
    panel.className = 'modal-overlay';
    panel.innerHTML = `
      <div class="modal-container reports-modal">
        <div class="modal-header">
          <h2>📊 Reports & Analytics</h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').classList.remove('active'); setTimeout(() => this.closest('.modal-overlay').style.display='none', 300)">&times;</button>
        </div>
        <div class="modal-body">
          <div class="reports-grid">
            <!-- Summary Cards -->
            <div class="report-card summary-card">
              <h3>📋 Total Tickets</h3>
              <div class="report-value" id="totalTickets">0</div>
              <div class="report-change">Last 7 days</div>
            </div>
            
            <div class="report-card summary-card">
              <h3>🔄 In Progress</h3>
              <div class="report-value" id="inProgressTickets">0</div>
              <div class="report-change">Active now</div>
            </div>
            
            <div class="report-card summary-card">
              <h3>✅ Completed</h3>
              <div class="report-value" id="completedTickets">0</div>
              <div class="report-change">This week</div>
            </div>
            
            <div class="report-card summary-card">
              <h3>⏱️ Avg. Resolution Time</h3>
              <div class="report-value" id="avgResolutionTime">0h</div>
              <div class="report-change">Last 30 days</div>
            </div>
            
            <!-- Status Distribution -->
            <div class="report-card chart-card">
              <h3>Status Distribution</h3>
              <div id="statusChart" class="chart-container"></div>
            </div>
            
            <!-- Priority Distribution -->
            <div class="report-card chart-card">
              <h3>Priority Distribution</h3>
              <div id="priorityChart" class="chart-container"></div>
            </div>
            
            <!-- Assignee Distribution -->
            <div class="report-card chart-card full-width">
              <h3>Tickets by Assignee</h3>
              <div id="assigneeChart" class="chart-container"></div>
            </div>
            
            <!-- Recent Activity -->
            <div class="report-card activity-card full-width">
              <h3>Recent Activity</h3>
              <div id="recentActivity" class="activity-list"></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="window.sidebarActions.exportReport()">📥 Export CSV</button>
          <button class="btn-secondary" onclick="window.sidebarActions.exportReport('pdf')">📄 Export PDF</button>
          <button class="btn-primary" onclick="this.closest('.modal-overlay').classList.remove('active'); setTimeout(() => this.closest('.modal-overlay').style.display='none', 300)">Close</button>
        </div>
      </div>
    `;
    
    return panel;
  }

  /**
   * Generate Reports
   */
  async generateReports() {
    let issues = [];
    
    // Try to get issues from state first
    if (window.state && window.state.issues && window.state.issues.length > 0) {
      issues = window.state.issues;
    } else if (window.state && window.state.filteredIssues && window.state.filteredIssues.length > 0) {
      issues = window.state.filteredIssues;
    } else {
      // Try to load from API
      console.log('📊 No issues in state, loading from API...');
      try {
        const response = await fetch('/api/issues');
        if (response.ok) {
          const data = await response.json();
          issues = data.issues || data || [];
        }
      } catch (error) {
        console.error('❌ Failed to load issues for reports:', error);
      }
    }
    
    if (issues.length === 0) {
      console.warn('⚠️ No issues data available for reports');
      // Show empty state in reports
      document.getElementById('totalTickets').textContent = '0';
      document.getElementById('inProgressTickets').textContent = '0';
      document.getElementById('completedTickets').textContent = '0';
      document.getElementById('avgResolutionTime').textContent = '0h';
      return;
    }
    
    console.log(`📊 Generating reports for ${issues.length} issues`);
    
    // Total tickets
    document.getElementById('totalTickets').textContent = issues.length;
    
    // In Progress - check multiple status variations
    const inProgress = issues.filter(i => {
      const status = (i.status || i.estado || '').toLowerCase();
      return status.includes('progress') || status.includes('progreso') || 
             status.includes('in process') || status.includes('working');
    }).length;
    document.getElementById('inProgressTickets').textContent = inProgress;
    
    // Completed - check multiple status variations
    const completed = issues.filter(i => {
      const status = (i.status || i.estado || '').toLowerCase();
      return status.includes('done') || status.includes('closed') || 
             status.includes('resolved') || status.includes('completado') ||
             status.includes('cerrado');
    }).length;
    document.getElementById('completedTickets').textContent = completed;
    
    // Calculate actual average resolution time
    const avgTime = this.calculateAvgResolutionTime(issues);
    document.getElementById('avgResolutionTime').textContent = avgTime;
    
    // Status Distribution
    this.renderStatusChart(issues);
    
    // Priority Distribution
    this.renderPriorityChart(issues);
    
    // Assignee Distribution
    this.renderAssigneeChart(issues);
    
    // Recent Activity
    this.renderRecentActivity(issues);
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
   * Export Report
   */
  exportReport(format = 'csv') {
    if (!window.state || !window.state.issues) return;
    
    const issues = window.state.issues;
    
    if (format === 'csv') {
      const csv = this.generateCSV(issues);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${new Date().getTime()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showNotification('Report Exported', 'CSV file downloaded', 'success');
    } else {
      this.showNotification('PDF Export', 'PDF export coming soon!', 'info');
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
