/**
 * SPEEDYFLOW - Main Application
 * Layout dinámico: Las tarjetas cambian según el número de transiciones disponibles
 * 
 * ⚠️ IMPORTANT: Card sizing must stay synchronized with CSS!
 * CSS Reference: frontend/static/css/components/cards-modals.css lines 1070-1105
 * JS Constants: frontend/static/js/constants/card-sizing.js
 * 
 * If modifying card sizes, update BOTH:
 * 1. cards-modals.css (.issue-card.card-compact/normal/expanded min-height + padding)
 * 2. card-sizing.js (CARD_SIZING constants)
 */

// Ensure CARD_SIZING is available globally (defensive check)
if (typeof CARD_SIZING === 'undefined') {
  console.warn('⚠️ CARD_SIZING not loaded - using fallback');
  window.CARD_SIZING = {
    getConfig: (count) => ({
      className: 'card-normal',
      height: 160,
      padding: 14,
      label: 'normal'
    }),
    getClass: (count) => 'card-normal'
  };
  CARD_SIZING = window.CARD_SIZING;
}

// Status display names mapping
const STATUS_DISPLAY_NAMES = {
  'open': '📋 Abierto',
  'new': '📋 Nuevo',
  'pending': '⏳ Pendiente',
  'in progress': '🔄 En Progreso',
  'in-progress': '🔄 En Progreso',
  'todo': '📝 Por Hacer',
  'doing': '🔄 Haciendo',
  'done': '✅ Completado',
  'closed': '✅ Cerrado',
  'resolved': '✅ Resuelto',
  'on hold': '⏸️ En Espera',
  'on-hold': '⏸️ En Espera',
  'blocked': '🚫 Bloqueado',
  'waiting': '⏳ Esperando',
  'in review': '👀 En Revisión',
  'in-review': '👀 En Revisión',
  'backlog': '📚 Backlog',
  'ready': '✓ Listo',
  'testing': '🧪 Pruebas',
  'deployed': '🚀 Deployed',
  'rejected': '❌ Rechazado'
};

// Function to get display name for status
function getStatusDisplayName(status) {
  if (!status) return 'Sin Estado';
  const normalized = status.toLowerCase().trim();
  return STATUS_DISPLAY_NAMES[normalized] || status;
}

const state = {
  desks: [],
  currentDesk: null,
  currentQueue: null,
  issues: [],
  issueTransitions: {},
  currentView: 'kanban',
  theme: localStorage.getItem('theme') || 'light',
  currentUser: null,
  filteredIssues: [],
  filterMode: 'all', // 'all' or 'myTickets'
  severityValues: null, // Cache for severity values from JIRA
  severityMapping: null // Mapping for severity classification
};

// ============================================================================
// CACHE UTILITIES - LocalStorage with TTL
// ============================================================================
const CacheManager = {
  TTL: 15 * 60 * 1000, // 15 minutes in milliseconds
  TRANSITIONS_TTL: 30 * 60 * 1000, // 30 minutes for transitions (rarely change)
  
  /**
   * Set item in cache with timestamp
   */
  set(key, value, ttl = null) {
    try {
      const item = {
        value: value,
        timestamp: Date.now(),
        ttl: ttl || this.TTL
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (e) {
      console.warn('⚠️ Cache write failed:', e);
    }
  },
  
  /**
   * Get item from cache if not expired
   */
  get(key) {
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      const age = Date.now() - parsed.timestamp;
      
      if (age > parsed.ttl) {
        // Expired - remove it
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      return parsed.value;
    } catch (e) {
      console.warn('⚠️ Cache read failed:', e);
      return null;
    }
  },
  
  /**
   * Clear specific cache key
   */
  remove(key) {
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (e) {
      console.warn('⚠️ Cache remove failed:', e);
    }
  },
  
  /**
   * Clear all cache entries
   */
  clear() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
      keys.forEach(k => localStorage.removeItem(k));
      console.log(`🗑️ Cleared ${keys.length} cache entries`);
    } catch (e) {
      console.warn('⚠️ Cache clear failed:', e);
    }
  },
  
  /**
   * Get cache statistics
   */
  stats() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
      const sizes = keys.map(k => {
        const item = localStorage.getItem(k);
        return item ? item.length : 0;
      });
      const totalSize = sizes.reduce((a, b) => a + b, 0);
      return {
        entries: keys.length,
        totalSizeKB: (totalSize / 1024).toFixed(2)
      };
    } catch (e) {
      return { entries: 0, totalSizeKB: 0 };
    }
  }
};

// Expose globally for debugging
window.CacheManager = CacheManager;

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  console.log('🚀 SpeedyFlow initializing...');
  setupEventListeners();
  
  // Load severity values from JIRA API
  console.log('📊 Loading severity values from JIRA...');
  await loadSeverityValues();
  
  // NOTE: Theme is now managed by ThemeManager (centralized)
  // No need to apply theme here - ThemeManager handles it from the start
  console.log('✨ Theme managed by ThemeManager');
  
  // Initialize background manager (AI backgrounds) - non-blocking
  if (typeof backgroundManager !== 'undefined' && backgroundManager.init) {
    console.log('📸 Initializing background manager...');
    // Call init() but don't await - let it run in background
    backgroundManager.init().catch(err => 
      console.warn('📸 Background manager error:', err)
    );
  }
  
  // Initialize background selector UI (for user to choose backgrounds)
  if (typeof BackgroundSelectorUI !== 'undefined') {
    console.log('🎨 Initializing Background Selector UI...');
    window.backgroundSelectorUI = new BackgroundSelectorUI();
    console.log('🎨 BackgroundSelectorUI instance created');
    window.backgroundSelectorUI.init();
    console.log('✅ Background Selector UI initialized');
    console.log('🎨 Button should now be clickable!');
  } else {
    console.error('❌ BackgroundSelectorUI class not found - did not initialize');
  }
  
  // Initialize right sidebar
  if (typeof initRightSidebar === 'function') {
    initRightSidebar();
  }
  
  // Fetch current user FIRST
  await loadCurrentUser();
  
  await loadServiceDesks();
  
  // Cargar filtros guardados si existen
  loadSavedFilters();
  
  // NOTE: Auto-selection is now handled by floating-controls.js
  // which uses the new filter selectors (serviceDeskSelectFilter, queueSelectFilter)
  
  console.log('✅ SpeedyFlow ready');
}

function setupEventListeners() {
  // NEW FILTER SELECTORS (from floating-controls.js)
  const serviceDeskFilterSelect = document.getElementById('serviceDeskSelectFilter');
  if (serviceDeskFilterSelect) {
    serviceDeskFilterSelect.addEventListener('change', async (e) => {
      state.currentDesk = e.target.value;
      console.log(`📂 Service Desk changed to: ${state.currentDesk}`);
      console.log(`🔍 Current state:`, { desk: state.currentDesk, queue: state.currentQueue });
      
      // Update breadcrumb with desk name
      const desk = state.desks.find(d => d.id === state.currentDesk);
      if (desk && window.headerMenus && window.headerMenus.updateBreadcrumb) {
        window.headerMenus.updateBreadcrumb(desk.name || desk.displayName, 'Select Queue');
      }
      
      // Fetch desks to find queues
      if (desk && desk.queues) {
        await loadQueues(desk.queues);
      }
      
      // Clear issues when desk changes
      state.issues = [];
      state.currentQueue = null; // Reset queue when desk changes
      renderKanban();
    });
  }

  // NEW QUEUE FILTER SELECTOR (from floating-controls.js)
  const queueFilterSelect = document.getElementById('queueSelectFilter');
  if (queueFilterSelect) {
    queueFilterSelect.addEventListener('change', async (e) => {
      state.currentQueue = e.target.value;
      console.log(`📋 Queue changed to: ${state.currentQueue}`);
      console.log(`🔍 Current state:`, { desk: state.currentDesk, queue: state.currentQueue });
      
      // Update breadcrumb with queue name
      if (state.currentQueue) {
        const desk = state.desks.find(d => d.id === state.currentDesk);
        const deskName = desk ? (desk.name || desk.displayName) : 'Select Desk';
        const queueName = e.target.options[e.target.selectedIndex].text;
        
        if (window.headerMenus && window.headerMenus.updateBreadcrumb) {
          window.headerMenus.updateBreadcrumb(deskName, queueName);
        }
      }
      
      if (state.currentDesk && state.currentQueue) {
        await loadIssues(state.currentQueue);
      }
    });
  }
  
  // Make state globally accessible for AI analyzer
  window.state = state;

  // Auto-refresh every 10 minutes
  setInterval(refreshIssues, 600000);

  // Toggle buttons (View Kanban/List)
  const toggleButtons = document.querySelectorAll('[data-view]');
  if (toggleButtons.length > 0) {
    toggleButtons.forEach(btn => {
      // addEventListener disabled - visual only mode
    });
  }

  // New ticket button
  const newTicketBtn = document.getElementById('newTicketBtn');
  if (newTicketBtn) {
    // DISABLED: newTicketBtn.addEventListener('click', () => alert('Create New Ticket - Coming soon'));
  }

  // Save filters button
  const saveFiltersBtn = document.getElementById('saveFiltersBtn');
  if (saveFiltersBtn) {
    saveFiltersBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      saveCurrentFilters();
    });
    console.log('✅ Save filters button initialized');
  }
  
  // Clear cache button
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', () => {
      console.log('🗑️ Clearing cache...');
      CacheManager.clear();
      
      // Show notification
      if (window.loadingDotsManager) {
        window.loadingDotsManager.show('Cache cleared! Reloading...');
      }
      
      // Reload current queue to fetch fresh data
      setTimeout(() => {
        if (state.currentQueue) {
          loadIssues(state.currentQueue);
        }
        if (window.loadingDotsManager) {
          window.loadingDotsManager.hide();
        }
      }, 500);
    });
  }

  // Quick action button (cloned from sidebar header)
  const quickActionBtn = document.getElementById('quickActionBtn');
  if (quickActionBtn) {
    console.log('✅ Quick action button found and initializing...');
    quickActionBtn.addEventListener('click', () => {
      console.log('⚡ Quick action triggered!');
      
      // Show notification
      if (window.loadingDotsManager) {
        window.loadingDotsManager.show('Quick action executed! ⚡');
        setTimeout(() => {
          window.loadingDotsManager.hide();
        }, 1500);
      }
      
      // TODO: Add your custom action here
      // Example: Open a modal, trigger a workflow, etc.
    });
  }
}

/**
 * Mostrar detalles del ticket en el sidebar derecho
 */
function showTicketDetails(issueKey) {
  console.log(`👁️ Opening ticket details: ${issueKey}`);
  
  // Trigger right sidebar to show details
  if (window.rightSidebar) {
    window.rightSidebar.open(issueKey);
  } else if (typeof initRightSidebar === 'function') {
    // Fallback: reinitialize right sidebar
    initRightSidebar();
    if (window.rightSidebar) {
      window.rightSidebar.open(issueKey);
    }
  } else {
    console.warn('⚠️ Right sidebar not available');
  }
}

async function loadCurrentUser() {
  // Use cached user from localStorage (set when user logs in)
  state.currentUser = localStorage.getItem('currentUser') || '';
  state.currentUserAccountId = localStorage.getItem('currentUserAccountId') || null;
  
  if (state.currentUser) {
    console.log('👤 Using cached user:', state.currentUser);
    return;
  }
  
  // Only fetch if not cached
  try {
    console.log('👤 Fetching current user from API...');
    const response = await fetch('/api/user');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const json = await response.json();
    if (json.success && json.user) {
      state.currentUser = json.user.displayName || json.user.name || json.user.accountId || '';
      state.currentUserAccountId = json.user.accountId || null;
      localStorage.setItem('currentUser', state.currentUser);
      if (state.currentUserAccountId) {
        localStorage.setItem('currentUserAccountId', state.currentUserAccountId);
      }
      console.log('✅ Current user:', state.currentUser);
    }
  } catch (error) {
    console.warn('⚠️ Could not fetch user, will use assignee info:', error.message);
    // Don't set fallback - let it remain empty
  }
}

async function loadServiceDesks() {
  try {
    // Indicate loading state
    const statusEl = document.getElementById('filterStatus');
    if (statusEl) {
      statusEl.textContent = 'Loading desks...';
      statusEl.classList.remove('status-warn');
      statusEl.classList.add('status-info');
    }
    console.log('📡 Fetching service desks...');
    const response = await fetch('/api/desks');
    const json = await response.json();
    if (!json.success) {
      console.warn('⚠️ Desks request unsuccessful:', json);
      state.desks = [];
    } else {
      // Support both legacy {data: [...]} and direct list response
  const desksRaw = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : (json.values || []));
      // Normalize desk objects to ensure .name present
      state.desks = desksRaw.map(d => {
        const id = d.id || d.serviceDeskId || d.ID || String(d.desk_id || '');
        const nameCandidates = [d.name, d.displayName, d.nombre, d.deskName, d.projectName, d.key, d.projectKey, d.title];
        const name = nameCandidates.find(n => typeof n === 'string' && n.trim()) || `Desk ${id}`;
        const queues = Array.isArray(d.queues) ? d.queues.map(q => {
          const qid = q.id || q.queueId || q.ID;
          const qNameCandidates = [q.name, q.queueName, q.nombre, q.title];
          const qname = qNameCandidates.find(n => typeof n === 'string' && n.trim()) || `Queue ${qid}`;
          return { id: qid, name: qname };
        }) : [];
        return { id, name, displayName: name, queues, placeholder: d.placeholder || false };
      }).filter(d => d.id);
    }
    console.log('✅ Desks loaded:', state.desks.length);
    
  const filterSelect = document.getElementById('serviceDeskSelectFilter');    if (!state.desks.length) {
      const statusEl = document.getElementById('filterStatus');
      if (statusEl) {
        statusEl.textContent = 'No desks available';
        statusEl.classList.remove('status-info');
        statusEl.classList.add('status-warn');
      }
      if (filterSelect) filterSelect.disabled = true;
      return; // Nothing else to populate
    }
    
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">Select Service Desk...</option>';
      state.desks.forEach(desk => {
        const option = document.createElement('option');
        option.value = desk.id;
        option.textContent = desk.name || desk.displayName || `Desk ${desk.id}`;
        if (desk.placeholder) option.classList.add('desk-placeholder');
        filterSelect.appendChild(option);
      });
    }    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">Select Service Desk...</option>';
      state.desks.forEach(desk => {
        const option = document.createElement('option');
        option.value = desk.id;
        option.textContent = desk.name || desk.displayName || `Desk ${desk.id}`;
        if (desk.placeholder) option.classList.add('desk-placeholder');
        filterSelect.appendChild(option);
      });
      
      // NOTE: Auto-selection DISABLED
      // User must manually select desk - prevents confusion when switching
      // previousCode was auto-selecting first desk, now users have control
    }
    // Update status to ready after desks loaded
    const statusReady = document.getElementById('filterStatus');
    if (statusReady) {
      statusReady.textContent = 'Desks loaded';
      statusReady.classList.remove('status-warn');
      statusReady.classList.add('status-success');
    }
  } catch (error) {
    console.error('❌ Error loading desks:', error);
    state.desks = [];
    const statusEl = document.getElementById('filterStatus');
    if (statusEl) {
      statusEl.textContent = 'Desks load error';
      statusEl.classList.remove('status-info');
      statusEl.classList.add('status-warn');
    }
  }
}

async function loadQueues(queues) {
  const filterSelect = document.getElementById('queueSelectFilter');
  const statusEl = document.getElementById('filterStatus');
  
  // If queues empty, disable selectors & show status (no sample queues)
  if (!queues || !Array.isArray(queues) || queues.length === 0) {
    if (filterSelect) filterSelect.innerHTML = '<option value="">No queues</option>';
    if (filterSelect) filterSelect.disabled = true;
    
    if (statusEl) {
      statusEl.textContent = 'No queues';
      statusEl.classList.remove('status-info');
      statusEl.classList.add('status-warn');
    }
    
    state.filteredIssues = [];
    return;
  }
  
  if (filterSelect) {
    filterSelect.innerHTML = '<option value="">Select Queue...</option>';
    
    if (queues && Array.isArray(queues)) {
      queues.forEach(queue => {
        const option = document.createElement('option');
        option.value = queue.id;
        option.textContent = queue.name;
        filterSelect.appendChild(option);
      });
      
      // NOTE: Auto-selection DISABLED
      // User must manually select queue - prevents auto-loading confusion
    }
  }
  
  if (queues && Array.isArray(queues)) {
    console.log('✅ Queues loaded:', queues.length);
    // Dispatch event for floating-controls.js to listen
    window.dispatchEvent(new CustomEvent('queues-loaded', { detail: queues }));
  }
  if (statusEl) {
    statusEl.textContent = 'Queues loaded';
    statusEl.classList.remove('status-info');
    statusEl.classList.add('status-success');
  }
}

async function loadIssues(queueId) {
  if (!queueId) return;
  const statusEl = document.getElementById('filterStatus');
  if (statusEl) {
    statusEl.textContent = 'Loading issues...';
    statusEl.classList.remove('status-success');
    statusEl.classList.add('status-info');
  }

  try {
    // Check cache first
    const cacheKey = `issues_${state.currentDesk}_${queueId}`;
    const cached = CacheManager.get(cacheKey);
    
    if (cached && cached.length > 0) {
      console.log(`💾 Using cached issues (${cached.length} tickets)`);
      
      // Process cached data immediately
      const allIssues = cached;
      window.app = window.app || {};
      window.app.currentIssues = allIssues;
      
      // Cache full issue data by key for sidebar use
      window.app.issuesCache = window.app.issuesCache || new Map();
      allIssues.forEach(issue => {
        if (issue.key) {
          window.app.issuesCache.set(issue.key, issue);
        }
      });
      console.log(`💾 Cached ${window.app.issuesCache.size} issues with full data (from cache)`);
      
      // Apply filter mode
      const shouldFilterByAssignee = state.filterMode === 'myTickets';
      if (shouldFilterByAssignee) {
        let currentUser = state.currentUser || localStorage.getItem('currentUser') || '';
        if (typeof currentUser === 'object' && currentUser !== null) {
          currentUser = currentUser.displayName || currentUser.name || '';
        }
        state.filteredIssues = allIssues.filter(issue => {
          const assignee = 
            issue.assignee?.displayName || 
            issue.assignee?.name ||
            issue.fields?.assignee?.displayName ||
            issue.fields?.assignee?.name ||
            issue.assigned_to ||
            issue.asignado_a ||
            '';
          if (!assignee) return false;
          return assignee.toLowerCase() === currentUser.toLowerCase() ||
                 assignee.toLowerCase().includes(currentUser.toLowerCase());
        });
        state.issues = state.filteredIssues;
      } else {
        state.issues = allIssues;
        state.filteredIssues = allIssues;
      }
      
      // Render immediately with cached data
      renderView();
      
      if (statusEl) {
        statusEl.textContent = `${state.issues.length} issue${state.issues.length!==1?'s':''} (cached)`;
        statusEl.classList.remove('status-info','status-warn');
        statusEl.classList.add('status-success');
      }
      
      // Load transitions in background (lazy)
      loadIssueTransitionsLazy();
      
      // Still fetch fresh data in background to update cache
      fetchIssuesBackground(queueId, cacheKey);
      return;
    }
    
    // Show loading dots only if not using cache
    if (window.loadingDotsManager) {
      window.loadingDotsManager.show('Loading tickets');
    }
    
    console.log('📡 Fetching issues for queue:', queueId);
    const response = await fetch(`/api/issues/${queueId}?desk_id=${state.currentDesk}`);
    let json;
    try {
      json = await response.json();
    } catch (e) {
      console.warn('⚠️ Failed to parse issues JSON, using empty list', e);
      json = {};
    }
    // Unwrap nested response: json_response decorator wraps original dict under data
    // Original issues blueprint returns { data: [...], count: N }
    let allIssuesWrapper = json.data || json.payload || json.result || json; // attempt generic wrapper
    let allIssues = [];
    if (Array.isArray(allIssuesWrapper)) {
      allIssues = allIssuesWrapper;
    } else if (allIssuesWrapper && Array.isArray(allIssuesWrapper.data)) {
      allIssues = allIssuesWrapper.data;
    } else if (Array.isArray(json.issues)) {
      allIssues = json.issues;
    } else if (Array.isArray(json.values)) {
      allIssues = json.values;
    }
    if (!Array.isArray(allIssues)) {
      console.warn('⚠️ issues payload not array after unwrapping, normalizing to []. Raw object keys:', Object.keys(json));
      allIssues = [];
    }
    // Preserve raw issues for kanban fallback
    window.app = window.app || {};
    window.app.currentIssues = allIssues;
    
    // Cache full issue data by key for sidebar use
    window.app.issuesCache = window.app.issuesCache || new Map();
    allIssues.forEach(issue => {
      if (issue.key) {
        window.app.issuesCache.set(issue.key, issue);
      }
    });
    console.log(`💾 Cached ${window.app.issuesCache.size} issues with full data`);
    // Check filter mode
    const shouldFilterByAssignee = state.filterMode === 'myTickets';
    
    console.log(`🔍 Filter mode: ${state.filterMode}, All issues length: ${allIssues.length}`);
    
    // Apply assignee filter only if in "My Tickets" mode
    let currentUser = state.currentUser || localStorage.getItem('currentUser') || '';
    if (typeof currentUser === 'object' && currentUser !== null) {
      currentUser = currentUser.displayName || currentUser.name || '';
    }
    
    if (shouldFilterByAssignee) {
      console.log(`🔍 Filtering by assignee: "${currentUser}"`);
      
      // Debug: Log sample issue to see structure
      if (allIssues.length > 0) {
        console.log('📋 Sample issue structure:', {
          key: allIssues[0].key,
          assignee: allIssues[0].assignee,
          fields_assignee: allIssues[0].fields?.assignee,
          assigned_to: allIssues[0].assigned_to,
          asignado_a: allIssues[0].asignado_a
        });
      }
      
      state.filteredIssues = allIssues.length ? allIssues.filter(issue => {
        // Try different assignee field locations
        const assignee = 
          issue.assignee?.displayName || 
          issue.assignee?.name ||
          issue.fields?.assignee?.displayName ||
          issue.fields?.assignee?.name ||
          issue.assigned_to ||
          issue.asignado_a ||
          '';
        
        // Debug log for each issue
        if (assignee) {
          console.log(`  Issue ${issue.key}: assignee="${assignee}", user="${currentUser}", match=${assignee.toLowerCase().includes(currentUser.toLowerCase())}`);
        }
        
        // Exact match or partial match
        if (!assignee) return false;
        
        return assignee.toLowerCase() === currentUser.toLowerCase() ||
               assignee.toLowerCase().includes(currentUser.toLowerCase());
      }) : [];
      
      state.issues = state.filteredIssues;
      console.log(`✅ Filtered to ${state.issues.length} tickets assigned to ${currentUser} from ${allIssues.length} total`);
    } else {
      // Show all tickets
      state.issues = allIssues;
      state.filteredIssues = allIssues;
      console.log(`✅ Showing all ${state.issues.length} tickets`);
    }
    
    console.log(`✅ Issues loaded: ${state.issues.length}/${allIssues.length}`);
    
    // Save to cache (reuse cacheKey from line 519)
    CacheManager.set(cacheKey, allIssues);
    console.log(`💾 Cached ${allIssues.length} issues`);
    
    // Update breadcrumb
    if (window.headerMenus && window.headerMenus.syncQueueBreadcrumb) {
      window.headerMenus.syncQueueBreadcrumb();
    }
    
    // Actualizar info del filtro
    const filterInfo = document.getElementById('filterInfo');
    if (filterInfo) {
      filterInfo.textContent = `📊 ${state.issues.length} ticket${state.issues.length !== 1 ? 's' : ''} assigned to you`;
    }
    
    // Cargar transiciones de forma lazy (solo cuando se necesiten)
    loadIssueTransitionsLazy();
    
    renderView();
    if (statusEl) {
      statusEl.textContent = `${state.issues.length} issue${state.issues.length!==1?'s':''}`;
      statusEl.classList.remove('status-info','status-warn');
      statusEl.classList.add('status-success');
    }
    
    // Auto-save current filters to session (for quick restore)
    if (state.currentDesk && state.currentQueue) {
      const filters = {
        desk: {
          id: state.currentDesk,
          name: document.getElementById('serviceDeskSelectFilter')?.options[document.getElementById('serviceDeskSelectFilter')?.selectedIndex]?.text || ''
        },
        queue: {
          id: state.currentQueue,
          name: document.getElementById('queueSelectFilter')?.options[document.getElementById('queueSelectFilter')?.selectedIndex]?.text || ''
        },
        view: state.currentView || 'kanban',
        filterMode: state.filterMode || 'all',
        timestamp: new Date().toISOString()
      };
      sessionStorage.setItem('currentFilters', JSON.stringify(filters));
      console.log('💾 Auto-saved current filters to session');
    }
  } catch (error) {
  console.error('❌ Error loading issues:', error);
  state.issues = [];
  state.filteredIssues = [];
    if (statusEl) {
  statusEl.textContent = 'Failed to load issues';
      statusEl.classList.remove('status-info');
      statusEl.classList.add('status-warn');
    }
  }
}

/**
 * Enriquecer datos de tickets usando SOLO APIs reales (Service Desk + JIRA REST)
 * NO usa datos hardcodeados - solo busquedas alternativas con APIs
 */
// ============================================================================
// DEPRECATED: enrichIssuesWithCustomFields - REMOVED FOR PERFORMANCE
// Backend now sends all necessary data in /api/issues - no enrichment needed
// ============================================================================
async function enrichIssuesWithCustomFields() {
  // DEPRECATED: Esta función ha sido ELIMINADA para mejorar performance
  // El backend ya envía todos los datos necesarios en /api/issues
  console.warn('⚠️ enrichIssuesWithCustomFields() is deprecated - backend sends complete data');
  
  // REMOVED: All enrichment logic removed - backend sends complete data
  return;
}

/**
 * Background fetch to update cache without blocking UI
 */
async function fetchIssuesBackground(queueId, cacheKey) {
  try {
    console.log('🔄 Fetching fresh issues in background...');
    const response = await fetch(`/api/issues/${queueId}?desk_id=${state.currentDesk}`);
    const json = await response.json();
    
    let allIssuesWrapper = json.data || json.payload || json.result || json;
    let allIssues = [];
    if (Array.isArray(allIssuesWrapper)) {
      allIssues = allIssuesWrapper;
    } else if (allIssuesWrapper && Array.isArray(allIssuesWrapper.data)) {
      allIssues = allIssuesWrapper.data;
    } else if (Array.isArray(json.issues)) {
      allIssues = json.issues;
    } else if (Array.isArray(json.values)) {
      allIssues = json.values;
    }
    
    if (allIssues.length > 0) {
      // Update cache silently
      CacheManager.set(cacheKey, allIssues);
      console.log(`💾 Cache updated with ${allIssues.length} fresh issues`);
    }
  } catch (error) {
    console.warn('⚠️ Background fetch failed:', error);
  }
}

/**
 * Lazy load transitions - only when needed (on drag hover or details view)
 * Uses cache with 30 minute TTL
 */
async function loadIssueTransitionsLazy() {
  // Don't block - load in background
  setTimeout(async () => {
    try {
      console.log('🔄 Loading transitions lazily...');
      
      // Load only for visible issues (first 20)
      const visibleIssues = state.issues.slice(0, 20);
      
      const promises = visibleIssues.map(async (issue) => {
        try {
          // Check cache first
          const cacheKey = `transitions_${issue.key}`;
          const cached = CacheManager.get(cacheKey);
          
          if (cached) {
            state.issueTransitions[issue.key] = cached;
            return;
          }
          
          // Fetch if not cached
          const response = await fetch(`/api/issues/${issue.key}/transitions`);
          const json = await response.json();
          const transitions = json.transitions || [];
          
          state.issueTransitions[issue.key] = transitions;
          
          // Cache with longer TTL (transitions rarely change)
          CacheManager.set(cacheKey, transitions, CacheManager.TRANSITIONS_TTL);
        } catch (error) {
          state.issueTransitions[issue.key] = [];
        }
      });
      
      await Promise.all(promises);
      console.log(`✅ Loaded transitions for ${visibleIssues.length} visible issues (lazy + cached)`);
    } catch (error) {
      console.error('❌ Error loading transitions:', error);
    }
  }, 500); // Delay 500ms to not block initial render
}

/**
 * Load transitions for specific issue on-demand
 */
async function loadTransitionsForIssue(issueKey) {
  if (state.issueTransitions[issueKey]) {
    return state.issueTransitions[issueKey];
  }
  
  try {
    // Check cache
    const cacheKey = `transitions_${issueKey}`;
    const cached = CacheManager.get(cacheKey);
    
    if (cached) {
      state.issueTransitions[issueKey] = cached;
      return cached;
    }
    
    // Fetch
    const response = await fetch(`/api/issues/${issueKey}/transitions`);
    const json = await response.json();
    const transitions = json.transitions || [];
    
    state.issueTransitions[issueKey] = transitions;
    CacheManager.set(cacheKey, transitions, CacheManager.TRANSITIONS_TTL);
    
    return transitions;
  } catch (error) {
    console.error(`Error loading transitions for ${issueKey}:`, error);
    return [];
  }
}

// Expose globally for drag-drop system
window.loadTransitionsForIssue = loadTransitionsForIssue;

// Función normalizeSeverity eliminada - usar severity directamente

/**
 * Carga los valores de severity desde JIRA API
 * @returns {Promise<void>}
 */
async function loadSeverityValues() {
  if (state.severityValues) {
    return; // Ya cargado
  }
  
  try {
    const response = await fetch('/api/severity/values');
    const data = await response.json();
    
    if (data.success && data.severity_values) {
      state.severityValues = data.severity_values;
      
      // Crear mapeo dinámico basado en los valores de JIRA
      state.severityMapping = createSeverityMapping(data.severity_values);
      
      console.log(`✅ Loaded ${data.severity_values.length} severity values from JIRA`);
    } else {
      console.warn('⚠️  No severity values returned from API - no fallback used');
      state.severityMapping = null;
    }
  } catch (error) {
    console.error('❌ Error loading severity values:', error);
    state.severityMapping = null;
  }
}

/**
 * Crea mapeo dinámico de severity basado en valores de JIRA
 * @param {Array} severityValues - Valores de severity desde JIRA
 * @returns {Object} - Mapeo de severity
 */
function createSeverityMapping(severityValues) {
  const mapping = {};
  
  severityValues.forEach(severity => {
    const name = severity.name.toLowerCase();
    let level, emoji, className;
    
    // Clasificación dinámica basada en nombres comunes
    if (name.includes('critical') || name.includes('blocker') || name.includes('highest')) {
      level = 1;
      className = 'severity-critical';
      emoji = '🔴';
    } else if (name.includes('high') || name.includes('urgent') || name.includes('major')) {
      level = 2;
      className = 'severity-high';
      emoji = '🟠';
    } else if (name.includes('low') || name.includes('minor') || name.includes('lowest') || name.includes('trivial')) {
      level = 4;
      className = 'severity-low';
      emoji = '🟢';
    } else {
      level = 3;
      className = 'severity-medium';
      emoji = '🟡';
    }
    
    mapping[severity.name] = {
      id: severity.id,
      name: severity.name,
      level: level,
      className: className,
      emoji: emoji,
      description: severity.description || '',
      field_id: severity.field_id
    };
  });
  
  console.log(`✅ Created dynamic severity mapping with ${Object.keys(mapping).length} entries`);
  return mapping;
}

// Fallback mapping eliminado - usar solo valores reales de JIRA

/**
 * Determina la clase CSS y emoji para severity usando mapeo dinámico
 * @param {string} severity - Severity normalizado
 * @returns {object} - {className, emoji}
 */
function getSeverityStyle(severity) {
  // Si severity es null/undefined, no mostrar badge
  if (!severity) {
    return null;
  }
  
  if (!state.severityMapping) {
    // Si no hay mapeo, usar lógica básica
    const severityStr = severity.toLowerCase();
    if (severityStr.includes('critical') || severityStr.includes('highest')) {
      return { className: 'severity-critical', emoji: '🔴' };
    } else if (severityStr.includes('high') || severityStr.includes('urgent')) {
      return { className: 'severity-high', emoji: '🟠' };
    } else if (severityStr.includes('low') || severityStr.includes('lowest')) {
      return { className: 'severity-low', emoji: '🟢' };
    } else {
      return { className: 'severity-medium', emoji: '🟡' };
    }
  }
  
  // Usar mapeo dinámico
  const mapping = state.severityMapping[severity];
  if (mapping) {
    return { className: mapping.className, emoji: mapping.emoji };
  }
  
  // Buscar por coincidencia parcial
  for (const [key, value] of Object.entries(state.severityMapping)) {
    if (key.toLowerCase().includes(severity.toLowerCase()) || 
        severity.toLowerCase().includes(key.toLowerCase())) {
      return { className: value.className, emoji: value.emoji };
    }
  }
  
  // Fallback final
  return { className: 'severity-medium', emoji: '🟡' };
}

async function refreshIssues() {
  if (state.currentQueue) {
    await loadIssues(state.currentQueue);
  }
}

function renderView() {
  if (state.currentView === 'kanban') {
    renderKanban();
  } else {
    renderList();
  }
  
  // Hide loading dots after render
  if (window.loadingDotsManager) {
    window.loadingDotsManager.hide();
  }
}

async function renderKanban() {
  const kanbanView = document.getElementById('kanbanView');
  
  if (state.issues.length === 0) {
    kanbanView.innerHTML = '<p class="placeholder">No issues in this queue</p>';
    return;
  }

  // Usar endpoint /api/kanban del backend para obtener orden correcto
  let kanbanData = null;
  try {
    const params = new URLSearchParams({
      desk_id: state.currentDesk,
      queue_id: state.currentQueue || 'all'
    });
    const response = await fetch(`/api/kanban?${params.toString()}`);
    if (response.ok) {
      kanbanData = await response.json();
      console.log('✅ Kanban data from backend:', kanbanData.columns?.length, 'columns');
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch kanban from backend, falling back to local grouping:', error);
  }

  // Si el backend respondió con columnas ordenadas, usarlas
  let columnsToRender = [];
  if (kanbanData && kanbanData.columns && kanbanData.statuses) {
    // Usar columnas del backend (ya ordenadas)
    columnsToRender = kanbanData.statuses.map(status => {
      const column = kanbanData.columns.find(c => c.status === status);
      return {
        status: status,
        issues: column ? column.issues : []
      };
    });
  } else {
    // Fallback: agrupar localmente con orden manual
    const columns = {};
    state.issues.forEach(issue => {
      const currentStatus = issue.status || issue.fields?.status?.name || 'Sin Estado';
      if (!columns[currentStatus]) columns[currentStatus] = [];
      columns[currentStatus].push(issue);
    });

    const statusOrder = [
      'Backlog', 'To Do', 'Todo', 'Pending', 'Pendiente',
      'En Progreso', 'In Progress', 'En curso', 'Doing',
      'En espera', 'En espera de cliente', 'Waiting for customer',
      'Review', 'QA', 'Testing',
      'Validación de solución', 'Solution validation', 'Validation',
      'Blocked', 'Bloqueado',
      'Cancelado', 'Cancelled', 'Canceled',
      'Done', 'Cerrado', 'Closed', 'Resolved', 'Resuelto'
    ];

    const sortedStatuses = Object.keys(columns).sort((a, b) => {
      const indexA = statusOrder.findIndex(s => s.toLowerCase() === a.toLowerCase());
      const indexB = statusOrder.findIndex(s => s.toLowerCase() === b.toLowerCase());
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    columnsToRender = sortedStatuses.map(status => ({
      status: status,
      issues: columns[status]
    }));
  }

  let html = '';
  let colIndex = 0;
  const colors = ['col-blue', 'col-purple', 'col-cyan', 'col-green', 'col-red', 'col-yellow', 'col-pink', 'col-indigo', 'col-teal', 'col-orange'];

  columnsToRender.forEach(({ status, issues }) => {
    if (!issues || issues.length === 0) return; // Skip empty columns
    const color = colors[colIndex % colors.length];
    colIndex++;
    
    html += `<div class="kanban-column glassmorphic-secondary ${color}" data-status="${status}">
      <div class="kanban-column-header">
        <div class="kanban-column-title">${status}</div>
        <div class="kanban-column-count">${issues.length}</div>
      </div>
      <div class="kanban-cards">`;

    issues.forEach(issue => {
      // Get full issue data from cache (includes all customfields)
      const fullIssue = window.app?.issuesCache?.get(issue.key) || issue;
      const transitions = state.issueTransitions[issue.key] || [];
      
      // Debug: Log first issue to see structure
      if (issues.indexOf(issue) === 0) {
        console.log('🔍 First issue structure:', {
          key: fullIssue.key,
          severity: fullIssue.severity,
          customfield_10125: fullIssue.customfield_10125,
          customfield_10111: fullIssue.customfield_10111,
          customfield_10141: fullIssue.customfield_10141,
          customfield_10142: fullIssue.customfield_10142,
          customfield_10143: fullIssue.customfield_10143,
          fields_keys: fullIssue.fields ? Object.keys(fullIssue.fields).filter(k => k.startsWith('custom')).slice(0, 5) : []
        });
      }
      
      // ✅ Extract data from customfields (backend provides all customfields directly)
      const severity = fullIssue.severity || fullIssue.customfield_10125?.value || fullIssue.customfield_10125 || '';
      const assignee = fullIssue.fields?.assignee?.displayName || 'No assignee';
      
      // Reporter/Informer from customfield_10111
      const reporterObj = fullIssue.customfield_10111;
      const reporter = reporterObj?.displayName || reporterObj?.name || reporterObj || '';
      
      // Contact info from customfields
      const reporterEmailObj = fullIssue.customfield_10141;
      const reporterEmail = reporterEmailObj?.value || reporterEmailObj || '';
      
      const reporterPhoneObj = fullIssue.customfield_10142;
      const reporterPhone = reporterPhoneObj?.value || reporterPhoneObj || '';
      
      const reporterCompanyObj = fullIssue.customfield_10143;
      const reporterCompany = reporterCompanyObj?.value || reporterCompanyObj || '';
      
      // Determinación dinámica de clase basada en transiciones
      // IMPORTANT: Uses CARD_SIZING constants synchronized with CSS
      let cardClass = 'issue-card';
      const cardConfig = CARD_SIZING.getConfig(transitions.length);
      cardClass += ' ' + cardConfig.className;

      // ✅ Determinar estilo de severity con función centralizada
      const severityStyle = getSeverityStyle(severity);

      const severityBadgeHtml = severityStyle ? 
        `<span class="severity-badge ${severityStyle.className}" title="Severity: ${severity}">
           ${severityStyle.emoji} ${severity}
         </span>` : '';

      // Calculate time since last update
      const updated = fullIssue.fields?.updated || fullIssue.updated;
      const updatedTime = updated ? new Date(updated) : null;
      const now = new Date();
      let timeAgo = '';
      if (updatedTime) {
        const diffMs = now - updatedTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) timeAgo = 'just now';
        else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
        else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
        else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
        else timeAgo = `${Math.floor(diffDays / 7)}w ago`;
      }

      html += `<div class="${cardClass} kanban-card" 
                    data-issue="${issue.key}" 
                    data-issue-key="${issue.key}" 
                    draggable="true"
                    onclick="openIssueDetails('${issue.key}')">
        <!-- HEADER: Key + Severity Badge + Time -->
        <div class="issue-card-header">
          <div class="issue-card-key">${issue.key}</div>
          ${severityBadgeHtml}
          ${timeAgo ? `<span class="issue-card-time" title="Last updated: ${updated}">🕒 ${timeAgo}</span>` : ''}
        </div>
        
        <!-- SUMMARY (main content) -->
        <div class="issue-card-summary">${fullIssue.summary || fullIssue.fields?.summary || 'No summary'}</div>
        
        <!-- METADATA: Reporter + Severidad -->
        <div class="issue-card-metadata">
          ${reporter ? `<span class="meta-reporter" title="Reporter: ${reporter}${reporterEmail ? ' - ' + reporterEmail : ''}${reporterPhone ? ' - ' + reporterPhone : ''}">📢 ${reporter.split(' ')[0]}</span>` : ''}
          ${severity && severity !== 'Medium' && severity !== 'Baja' ? `<span class="meta-priority priority-${severity.toLowerCase()}" title="Severidad: ${severity}">${severity}</span>` : ''}
        </div>
        
        
        <!-- FOOTER: Assignee + Company (if exists) -->
        <div class="issue-card-footer">
          <span class="assignee ${assignee === 'No assignee' ? 'assignee-unassigned' : ''}" title="Assigned to: ${assignee}">👤 ${assignee.split(' ')[0]}</span>
          ${reporterCompany ? `<span class="company-badge" title="Company: ${reporterCompany}">🏢 ${reporterCompany.substring(0, 15)}</span>` : ''}
        </div>`;

      // Renderizar botones de transición (solo si hay espacio)
      if (transitions.length > 0 && transitions.length <= 2) {
        html += `<div class="issue-card-actions">`;
        transitions.forEach(transition => {
          html += `<button class="btn-transition-mini" onclick-disabled="event.stopPropagation(); transitionIssue('${issue.key}', ${transition.id})" title="${transition.name}">
            ${transition.name.substring(0, 10)}
          </button>`;
        });
        html += `</div>`;
      }

      html += `</div>`;
    });

    html += `</div></div>`;
  });

  kanbanView.innerHTML = html;
  
  // Apply transparency effects to kanban columns
  if (window.transparencyManager) {
    window.transparencyManager.applyToKanbanColumns();
  }
  
  applyCardLayout();
}

function applyCardLayout() {
  const cards = document.querySelectorAll('.issue-card');
  cards.forEach(card => {
    // Get transition count to calculate height dynamically
    const transitions = card.querySelectorAll('.btn-transition').length;
    const height = CARD_SIZING.getHeight(transitions);
    card.style.minHeight = height + 'px';
    
    // Add click listener to open sidebar
    // DISABLED: card.addEventListener('click', (e) => {
    //   // Avoid triggering when clicking transition buttons
    //   if (e.target.closest('.btn-transition')) {
    //     return;
    //   }
    //   
    //   const issueKey = card.dataset.issue;
    //   if (issueKey && typeof openIssueDetails === 'function') {
    //     openIssueDetails(issueKey);
    //   }
    // });
    
    // Add hover effect
    // DISABLED: card.addEventListener('mouseenter', () => {
    //   card.style.transform = 'translateY(-4px)';
    //   card.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
    // });
    
    // DISABLED: card.addEventListener('mouseleave', () => {
    //   card.style.transform = 'translateY(0)';
    //   card.style.boxShadow = '';
    // });
  });
}


function transitionIssue(issueKey, transitionId) {
  console.log(`Transitioning ${issueKey} with transition ${transitionId}`);
  // Implementar lógica de transición aquí
}

function renderList() {
  const listView = document.getElementById('listView');
  
  if (state.issues.length === 0) {
    listView.innerHTML = '<p class="placeholder">No issues in this queue</p>';
    return;
  }

  let html = `
    <table class="issues-table">
      <thead>
        <tr>
          <th>Key</th>
          <th>Summary</th>
          <th>Status</th>
          <th>Severity</th>
          <th>Assignee</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  state.issues.forEach(issue => {
    const status = issue.status || issue.fields?.status?.name || 'Unknown';
    const severity = issue.severity;
    const assignee = issue.assignee || issue.fields?.assignee?.displayName || 'Unassigned';
    const transitions = state.issueTransitions[issue.key] || [];
    
    html += `
      <tr>
        <td>${issue.key}</td>
        <td>${issue.summary || issue.fields?.summary || 'No summary'}</td>
        <td>${status}</td>
        <td>${severity || '-'}</td>
        <td>${assignee}</td>
        <td>${transitions.length} actions</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  listView.innerHTML = html;
}

/**
 * ==================== SLA INDICATOR FUNCTIONS ====================
 * Calculate and display SLA progress on ticket cards
 */

function calculateSLAStatus(issue) {
  /**
   * Calculates SLA status from issue data
   * Returns: { percentage, status, timeRemaining, elapsed, goal, breached }
   */
  try {
    // Mock SLA data - replace with real API call if needed
    const created = new Date(issue.created || issue.fields?.created);
    const now = new Date();
    
    // Default SLA: 24 hours for response, 48 hours for resolution
    const slaHours = 24;
    const slaMs = slaHours * 60 * 60 * 1000;
    
    const deadline = new Date(created.getTime() + slaMs);
    const elapsedMs = now.getTime() - created.getTime();
    const remainingMs = deadline.getTime() - now.getTime();
    
    const percentage = Math.min(100, Math.max(0, (elapsedMs / slaMs) * 100));
    const breached = remainingMs < 0;
    
    // Determine status
    let status = 'healthy';
    if (breached) {
      status = 'breached';
    } else if (percentage > 80) {
      status = 'critical';
    } else if (percentage > 60) {
      status = 'warning';
    } else if (percentage > 40) {
      status = 'caution';
    }
    
    return {
      percentage: Math.round(percentage),
      status,
      timeRemaining: formatMs(remainingMs),
      elapsed: formatMs(elapsedMs),
      goal: `${slaHours}h`,
      breached
    };
  } catch (e) {
    console.error('Error calculating SLA:', e);
    return null;
  }
}

function formatMs(ms) {
  /**
   * Formats milliseconds to human readable time
   * Returns: "2h 30m", "45m", "10s", etc.
   */
  if (ms < 0) return 'OVERDUE';
  
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/**
 * Guardar filtros seleccionados en localStorage
 */
function saveCurrentFilters() {
  console.log('💾 Attempting to save filters...');
  
  const deskSelect = document.getElementById('serviceDeskSelectFilter');
  const queueSelect = document.getElementById('queueSelectFilter');
  
  // Get current values from selects (more reliable than state)
  const deskId = deskSelect?.value || state.currentDesk;
  const queueId = queueSelect?.value || state.currentQueue;
  
  console.log('Current filter values:', {
    deskId,
    queueId,
    stateDeskId: state.currentDesk,
    stateQueueId: state.currentQueue
  });
  
  // Validate that filters are selected
  if (!deskId || !queueId || deskId === '' || queueId === '') {
    console.warn('⚠️ Cannot save filters: desk or queue not selected');
    console.log('Desk select:', deskSelect?.value, 'Queue select:', queueSelect?.value);
    
    if (window.loadingDotsManager) {
      window.loadingDotsManager.show('⚠️ Please select a Service Desk and Queue first');
      setTimeout(() => window.loadingDotsManager.hide(), 2000);
    }
    return;
  }
  
  const filters = {
    desk: {
      id: deskId,
      name: deskSelect?.options[deskSelect?.selectedIndex]?.text || 'Not selected'
    },
    queue: {
      id: queueId,
      name: queueSelect?.options[queueSelect?.selectedIndex]?.text || 'Not selected'
    },
    view: state.currentView || 'kanban',
    filterMode: state.filterMode || 'all',
    timestamp: new Date().toISOString()
  };
  
  console.log('💾 Saving filters:', filters);
  
  localStorage.setItem('savedFilters', JSON.stringify(filters));
  
  // Also save to session for persistence during session
  sessionStorage.setItem('currentFilters', JSON.stringify(filters));
  
  // Visual feedback
  const btn = document.getElementById('saveFiltersBtn');
  if (btn) {
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = '';
    }, 2000);
  }
  
  // Show success notification
  if (window.loadingDotsManager) {
    window.loadingDotsManager.show(`💾 Filters saved: ${filters.desk.name} - ${filters.queue.name}`);
    setTimeout(() => window.loadingDotsManager.hide(), 2000);
  }
  
  console.log('💾 Filtros guardados:', filters);
}

/**
 * Cargar filtros guardados desde localStorage
 */
function loadSavedFilters() {
  // Try session first (more recent), then localStorage
  let saved = sessionStorage.getItem('currentFilters') || localStorage.getItem('savedFilters');
  if (!saved) {
    console.log('ℹ️ No saved filters found');
    return;
  }
  
  try {
    const filters = JSON.parse(saved);
    console.log('📂 Loading saved filters:', filters);
    
    // Check if filters are not too old (more than 7 days)
    if (filters.timestamp) {
      const savedDate = new Date(filters.timestamp);
      const daysDiff = (new Date() - savedDate) / (1000 * 60 * 60 * 24);
      if (daysDiff > 7) {
        console.log('⚠️ Saved filters are too old, skipping auto-load');
        return;
      }
    }
    
    // Auto-seleccionar desk si está disponible
    if (filters.desk?.id) {
      const deskSelect = document.getElementById('serviceDeskSelectFilter');
      if (deskSelect) {
        deskSelect.value = filters.desk.id;
        state.currentDesk = filters.desk.id;
        
        // Trigger desk change to load queues
        const changeEvent = new Event('change', { bubbles: true });
        deskSelect.dispatchEvent(changeEvent);
      }
    }
    
    // Auto-seleccionar queue si está disponible
    if (filters.queue?.id) {
      setTimeout(() => {
        const queueSelect = document.getElementById('queueSelectFilter');
        if (queueSelect) {
          queueSelect.value = filters.queue.id;
          state.currentQueue = filters.queue.id;
          
          // Trigger queue change to load issues
          const changeEvent = new Event('change', { bubbles: true });
          queueSelect.dispatchEvent(changeEvent);
        }
      }, 500); // Dar tiempo a que carguen las queues
    }
  } catch (error) {
    console.error('Error al cargar filtros guardados:', error);
  }
}

// Export openIssueDetails to global scope for onclick handlers
window.openIssueDetails = openIssueDetails;
