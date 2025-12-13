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
  currentView: '', // Will be auto-selected based on ticket count on first load
  theme: localStorage.getItem('theme') || 'light',
  currentUser: null,
  filteredIssues: [],
  filterMode: 'all', // 'all' or 'myTickets'
  severityValues: null, // Cache for severity values from JIRA
  severityMapping: null, // Mapping for severity classification
  userProjectKey: null // User's configured project key from backend
};

// Make state globally accessible IMMEDIATELY to prevent "undefined" errors
// in other modules that initialize at the same time (like sidebar-actions.js)
window.state = state;

// ============================================================================
// CACHE UTILITIES - LocalStorage with TTL
// ============================================================================
const CacheManager = {
  TTL: 15 * 60 * 1000, // 15 minutes in milliseconds
  TRANSITIONS_TTL: 30 * 60 * 1000, // 30 minutes for transitions (rarely change)
  LARGE_QUEUE_TTL: 3 * 24 * 60 * 60 * 1000, // 3 days for large queues (50+ tickets)
  
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
  
    warmupOllama();
  
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
  
  // 🎯 NEW: Don't load preferred view on init - let loadIssues() auto-select
  // based on ticket count. View preference will be saved after user manually switches.
  // This ensures optimal view is selected based on data size, not last session's choice.
  state.currentView = ''; // Start empty, will be auto-selected in loadIssues()
  
  // NOTE: Auto-selection is now handled by loadIssues() function
  // which intelligently selects view based on ticket count (20 ticket threshold)
  
  // 🔐 Check if user just logged in and trigger initial filters
  checkAndApplyInitialFilters();
  
  console.log('✅ SpeedyFlow ready');
}

/**
 * Check if user just logged in and apply initial filters
 */
let isApplyingInitialFilters = false; // Prevent multiple executions

async function checkAndApplyInitialFilters() {
  const justLoggedIn = sessionStorage.getItem('speedyflow_just_logged_in');
  const initialProject = sessionStorage.getItem('speedyflow_initial_project');
  
  if (justLoggedIn === 'true' && !isApplyingInitialFilters) {
    isApplyingInitialFilters = true;
    console.log('🔐 User just logged in - waiting for desks to load...');
    console.log(`   Initial project: ${initialProject}`);
    
    // Clear flags
    sessionStorage.removeItem('speedyflow_just_logged_in');
    sessionStorage.removeItem('speedyflow_initial_project');
    
    // Wait for desks to be loaded using event listener
    await new Promise((resolve) => {
      const handleDesksLoaded = (event) => {
        console.log('✅ Desks loaded event received:', event.detail.desks.length, 'desks');
        window.removeEventListener('desksLoaded', handleDesksLoaded);
        resolve();
      };
      
      // If desks already loaded, resolve immediately
      if (state.desks.length > 0) {
        console.log('✅ Desks already loaded:', state.desks.length);
        resolve();
      } else {
        window.addEventListener('desksLoaded', handleDesksLoaded);
      }
    });
    
    // Find desk by project key (extracted from JQL) or by name
    let targetDesk = null;
    if (initialProject && state.desks.length > 0) {
      // Try to find by project key in queue JQL
      targetDesk = state.desks.find(d => {
        if (d.queues && d.queues.length > 0) {
          // Check all queues for project match
          return d.queues.some(queue => {
            const jql = queue.jql || '';
            const projectMatch = jql.match(/project\s*=\s*([A-Z]+)/i);
            return projectMatch && projectMatch[1].toUpperCase() === initialProject.toUpperCase();
          });
        }
        // Fallback: check if name contains project key
        return d.name?.toUpperCase().includes(initialProject.toUpperCase());
      });
      
      if (targetDesk) {
        console.log(`✅ Found desk for project "${initialProject}": ${targetDesk.name} (ID: ${targetDesk.id})`);
      } else {
        console.log(`⚠️ No desk found for project "${initialProject}"`);
      }
    }
    
    if (!targetDesk && state.desks.length > 0) {
      targetDesk = state.desks[0];
      console.log(`⚠️ Using fallback (first desk): ${targetDesk.name}`);
    }
    
    if (targetDesk) {
      console.log(`📍 Setting desk: ${targetDesk.name} (ID: ${targetDesk.id})`);
      
      // Set desk in filter
      const deskSelect = document.getElementById('serviceDeskSelectFilter');
      if (deskSelect) {
        deskSelect.value = targetDesk.id;
        deskSelect.dispatchEvent(new Event('change'));
      }
      
      // Wait for queues to load
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Try to find "Assigned to me" queue using JQL first, then name
      const queueSelect = document.getElementById('queueSelectFilter');
      if (queueSelect && targetDesk.queues && targetDesk.queues.length > 0) {
        let targetQueue = null;
        
        // Priority 1: Find by JQL pattern (assignee = currentUser())
        targetQueue = targetDesk.queues.find(q => 
          q.jql && /assignee\s*=\s*currentUser\(\)/i.test(q.jql)
        );
        
        // Priority 2: Find by name patterns
        if (!targetQueue) {
          const myTicketsPatterns = [
            /assigned.*to.*me/i,
            /asignado.*a.*mi/i,
            /mis.*ticket/i,
            /my.*ticket/i
          ];
          
          targetQueue = targetDesk.queues.find(q => 
            myTicketsPatterns.some(pattern => pattern.test(q.name))
          );
        }
        
        // Fallback: Use first queue
        if (!targetQueue && targetDesk.queues.length > 0) {
          targetQueue = targetDesk.queues[0];
        }
        
        if (targetQueue) {
          console.log(`✅ Auto-selecting queue: ${targetQueue.name} (ID: ${targetQueue.id})`);
          if (targetQueue.jql && /assignee\s*=\s*currentUser\(\)/i.test(targetQueue.jql)) {
            console.log(`   Matched by JQL: assignee = currentUser()`);
          }
          
          // Verify the select has this option before setting
          const optionExists = Array.from(queueSelect.options).some(opt => opt.value === targetQueue.id);
          console.log(`   Queue option exists in select: ${optionExists}`);
          
          if (optionExists) {
            queueSelect.value = targetQueue.id;
            console.log(`   Select value set to: ${queueSelect.value}`);
            queueSelect.dispatchEvent(new Event('change'));
            
            // 💾 Save as default configuration
            console.log('💾 Saving defaults to backend...');
            fetch('/api/user/setup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                project_key: initialProject,
                desk_id: targetDesk.id,
                queue_id: targetQueue.id
              })
            })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                console.log('✅ Defaults saved successfully:', data);
              } else {
                console.warn('⚠️ Failed to save defaults:', data.error);
              }
            })
            .catch(error => {
              console.error('❌ Error saving defaults:', error);
            });
          } else {
            console.error(`   ❌ Queue ${targetQueue.id} not found in select options!`);
            console.log(`   Available options:`, Array.from(queueSelect.options).map(o => `${o.value}:${o.text}`));
          }
        }
      }
      
      // Show success notification
      if (window.notificationPanel && window.notificationPanel.show) {
        window.notificationPanel.show(
          `🎯 Filtros iniciales aplicados: ${targetDesk.name}`,
          'success'
        );
      }
    }
    
    isApplyingInitialFilters = false; // Reset flag
  }
}

function setupEventListeners() {
  // 💡 Show first-time tooltip for save button
  showFirstTimeTooltip();
  
  // NOTE: ML Dashboard Button listener is now in ml-priority-badges.js
  // (registered when the button is created dynamically)

  // NEW FILTER SELECTORS (from header-menu-controller.js)
  const serviceDeskFilterSelect = document.getElementById('serviceDeskSelectFilter');
  if (serviceDeskFilterSelect) {
    serviceDeskFilterSelect.addEventListener('change', async (e) => {
      state.currentDesk = e.target.value;
      console.log(`📂 Service Desk changed to: ${state.currentDesk}`);
      console.log(`🔍 Current state:`, { desk: state.currentDesk, queue: state.currentQueue });
      
      // Update breadcrumb with desk name
      const desk = state.desks.find(d => d.id === state.currentDesk);
      console.log(`🔍 Found desk object:`, desk);
      console.log(`🔍 Desk queues:`, desk?.queues);
      
      if (desk && window.headerMenus && window.headerMenus.updateBreadcrumb) {
        window.headerMenus.updateBreadcrumb(desk.name || desk.displayName, 'Select Queue');
      }
      
      // Fetch desks to find queues
      if (desk && desk.queues) {
        console.log(`✅ Loading ${desk.queues.length} queues for desk ${desk.name}`);
        await loadQueues(desk.queues);
      } else {
        console.warn(`⚠️ No queues found for desk ${state.currentDesk}`);
      }
      
      // Clear issues when desk changes
      state.issues = [];
      state.currentQueue = null; // Reset queue when desk changes
      renderKanban();
    });
  }

  // NEW QUEUE FILTER SELECTOR (from header-menu-controller.js)
  const queueFilterSelect = document.getElementById('queueSelectFilter');
  if (queueFilterSelect) {
    queueFilterSelect.addEventListener('change', async (e) => {
      state.currentQueue = e.target.value;
      console.log(`📋 Queue changed to: ${state.currentQueue}`);
      console.log(`🔍 Current state:`, { desk: state.currentDesk, queue: state.currentQueue });
      
      // 🎯 Reset view selection to allow auto-selection based on new queue size
      state.currentView = '';
      console.log('🔄 View reset - will auto-select based on ticket count');
      
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

  // Auto-refresh every 10 minutes
  setInterval(refreshIssues, 600000);

  // Toggle buttons (View Kanban/List)
  const toggleButtons = document.querySelectorAll('[data-view]');
  if (toggleButtons.length > 0) {
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const view = btn.getAttribute('data-view');
        
        // Warn user if switching to kanban with too many tickets
        if (view === 'kanban' && state.issues && state.issues.length > 20) {
          const confirmed = confirm(
            `⚠️ Performance Warning\n\n` +
            `You have ${state.issues.length} tickets in this queue.\n\n` +
            `Kanban view may be slow with this many tickets. ` +
            `List view is recommended for better performance.\n\n` +
            `Switch to Kanban anyway?`
          );
          
          if (!confirmed) {
            return;
          }
          
          // Clear auto-switch flag if user manually switches
          state.wasAutoSwitched = false;
        }
        
        switchView(view);
      });
    });
    console.log('✅ View toggle buttons enabled');
  }

  // New ticket button functionality handled by header-menu-controller.js

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

  // Quick action button is now handled by quick-action-button.js
  // (Removed duplicate listener that was causing conflicts)
}

/**
 * Close all open modals before navigating to a ticket
 */
function closeAllModals() {
  // Close Quick Triage modal
  const triageModal = document.getElementById('quickTriageModal');
  if (triageModal) {
    triageModal.style.display = 'none';
  }
  
  // Close AI Queue Analyzer modal
  const aiModal = document.getElementById('aiQueueModal');
  if (aiModal) {
    aiModal.style.display = 'none';
  }
  
  // Close Search Panel
  const searchPanel = document.getElementById('searchPanel');
  if (searchPanel) {
    searchPanel.classList.remove('active');
    searchPanel.style.display = 'none';
  }
  
  // Close AI Field Suggestions modal
  const aiSuggestionsModal = document.querySelector('.ai-suggestions-modal');
  if (aiSuggestionsModal && aiSuggestionsModal.parentElement) {
    aiSuggestionsModal.parentElement.remove();
  }
  
  // Close any other modal with class 'modal' or 'modal-container'
  document.querySelectorAll('.modal:not(#rightSidebar), .modal-container:not(.right-sidebar)').forEach(modal => {
    if (modal.style.display !== 'none') {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  });
  
  console.log('🚪 All modals closed before opening ticket');
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
          const qjql = q.jql || '';
          return { id: qid, name: qname, jql: qjql };
        }) : [];
        console.log(`📂 Desk: ${name} (ID: ${id}) - ${queues.length} queues:`, queues);
        return { id, name, displayName: name, queues, placeholder: d.placeholder || false };
      }).filter(d => d.id);
    }
    console.log('✅ Desks loaded:', state.desks.length);
    console.log('📋 All desks with queues:', state.desks);
    
    // 🎯 Dispatch event when desks are fully loaded
    window.dispatchEvent(new CustomEvent('desksLoaded', { detail: { desks: state.desks } }));
    
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
      
      // 🎯 Load user defaults from backend and apply them
      try {
        console.log('🔍 Fetching user defaults...');
        const configResponse = await fetch('/api/user/login-status');
        const configData = await configResponse.json();
        
        if (configData.success && configData.data) {
          const { desk_id, queue_id, project_key } = configData.data;
          console.log(`📌 User defaults: project_key=${project_key}, desk_id=${desk_id}, queue_id=${queue_id}`);
          
          // Store project_key in state for later use
          if (project_key) {
            state.userProjectKey = project_key;
            console.log(`✅ User project key stored in state: ${project_key}`);
          }
          
          if (desk_id) {
            const deskExists = Array.from(filterSelect.options).some(opt => opt.value === desk_id);
            if (deskExists) {
              console.log(`✅ Setting default desk: ${desk_id}`);
              filterSelect.value = desk_id;
              filterSelect.dispatchEvent(new Event('change'));
              
              // Wait for queues to load, then set default queue
              if (queue_id) {
                setTimeout(() => {
                  const queueSelect = document.getElementById('queueSelectFilter');
                  if (queueSelect) {
                    const queueExists = Array.from(queueSelect.options).some(opt => opt.value === queue_id);
                    if (queueExists) {
                      console.log(`✅ Setting default queue: ${queue_id}`);
                      queueSelect.value = queue_id;
                      queueSelect.dispatchEvent(new Event('change'));
                    }
                  }
                }, 1500);
              }
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not load user defaults:', error);
      }
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
  console.log(`🔄 loadQueues called with ${queues?.length || 0} queues:`, queues);
  
  const filterSelect = document.getElementById('queueSelectFilter');
  const statusEl = document.getElementById('filterStatus');
  
  // If queues empty, disable selectors & show status (no sample queues)
  if (!queues || !Array.isArray(queues) || queues.length === 0) {
    console.warn('⚠️ No queues to load');
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
      console.log('📋 Loading queue options:');
      queues.forEach(queue => {
        console.log(`  - Queue: ${queue.name} (ID: ${queue.id})`);
        const option = document.createElement('option');
        option.value = queue.id;
        option.textContent = queue.name;
        filterSelect.appendChild(option);
      });
      console.log(`✅ ${queues.length} queues loaded into selector`);
      
      // NOTE: Auto-selection DISABLED
      // User must manually select queue - prevents auto-loading confusion
    }
  }
  
  if (queues && Array.isArray(queues)) {
    console.log('✅ Queues loaded:', queues.length);
    // Dispatch event for header-menu-controller.js to listen
    window.dispatchEvent(new CustomEvent('queues-loaded', { detail: queues }));
  }
  if (statusEl) {
    statusEl.textContent = 'Queues loaded';
    statusEl.classList.remove('status-info');
    statusEl.classList.add('status-success');
  }
}

/**
 * Load a specific page of issues from the server
 * Used by "Load More" button to append additional pages
 */
async function loadIssuesPage(queueId, page, pageSize = 100) {
  if (!queueId) return;
  
  console.log(`📦 Loading page ${page} for queue ${queueId}...`);
  
  try {
    const offset = (page - 1) * pageSize;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(`/api/issues/${queueId}?desk_id=${state.currentDesk}&limit=${pageSize}&offset=${offset}`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'application/json'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const json = await response.json();
    const newIssues = json.data || [];
    
    console.log(`✅ Loaded ${newIssues.length} issues from page ${page}`);
    
    // Append to existing issues
    const serverPagination = state.pagination[queueId];
    if (serverPagination) {
      serverPagination.allIssuesLoaded = [...serverPagination.allIssuesLoaded, ...newIssues];
      serverPagination.currentPage = page;
      serverPagination.hasMore = newIssues.length >= pageSize;
      
      // Update state.issues with all loaded issues
      state.issues = serverPagination.allIssuesLoaded;
      state.filteredIssues = state.issues;
      
      // Update global cache
      window.app = window.app || {};
      window.app.currentIssues = state.issues;
      
      // Cache full issue data by key
      window.app.issuesCache = window.app.issuesCache || new Map();
      newIssues.forEach(issue => {
        if (issue.key) {
          window.app.issuesCache.set(issue.key, issue);
        }
      });
      
      console.log(`💾 Total issues loaded: ${serverPagination.allIssuesLoaded.length}`);
    }
    
    return newIssues;
  } catch (error) {
    console.error(`❌ Failed to load page ${page}:`, error);
    throw error;
  }
}

async function loadIssues(queueId, page = 1, pageSize = 100) {
  if (!queueId) return;
  const statusEl = document.getElementById('filterStatus');
  if (statusEl) {
    statusEl.textContent = page === 1 ? 'Loading issues...' : `Loading page ${page}...`;
    statusEl.classList.remove('status-success');
    statusEl.classList.add('status-info');
  }
  
  // Initialize pagination state if first page
  if (page === 1) {
    if (!state.pagination) {
      state.pagination = {};
    }
    state.pagination[queueId] = {
      currentPage: 1,
      pageSize: pageSize,
      totalPages: 0,
      totalIssues: 0,
      hasMore: true,
      allIssuesLoaded: []
    };
  }

  try {
    // Check cache first (use extended TTL for large queues)
    const cacheKey = `issues_${state.currentDesk}_${queueId}`;
    const cached = CacheManager.get(cacheKey);
    
    if (cached && cached.length > 0) {
      console.log(`💾 Using cached issues (${cached.length} tickets)`);
      
      // Process cached data immediately
      let allIssues = cached;
      
      // Check if this is paginated data
      if (page > 1 && state.pagination && state.pagination[queueId]) {
        // Append to existing issues
        allIssues = [...state.pagination[queueId].allIssuesLoaded, ...allIssues];
        state.pagination[queueId].allIssuesLoaded = allIssues;
        state.pagination[queueId].currentPage = page;
      }
      
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
      
      // 🎯 INTELLIGENT INITIAL VIEW SELECTION (cached path)
      // Auto-select best view based on ticket count BEFORE first render
      const AUTO_SWITCH_THRESHOLD = 20;
      if (!state.currentView || state.currentView === '') {
        // Initial load - no view set yet
        if (state.issues.length > AUTO_SWITCH_THRESHOLD) {
          state.currentView = 'list';
          console.log(`🎯 Auto-selected LIST view (${state.issues.length} tickets > ${AUTO_SWITCH_THRESHOLD}) [cached]`);
        } else {
          state.currentView = 'kanban';
          console.log(`🎯 Auto-selected KANBAN view (${state.issues.length} tickets ≤ ${AUTO_SWITCH_THRESHOLD}) [cached]`);
        }
        
        // Update view toggle button state
        document.querySelectorAll('[data-view]').forEach(btn => {
          const view = btn.getAttribute('data-view');
          if (view === state.currentView) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
          } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
          }
        });
      }
      
      // Render immediately with cached data
      renderView();
      
      if (statusEl) {
        const isLargeQueue = state.issues.length >= 50;
        if (isLargeQueue) {
          statusEl.textContent = `${state.issues.length} issue${state.issues.length!==1?'s':''} (⚡ 3-day cache)`;
          statusEl.title = 'Large queue cached for 3 days - instant loading!';
        } else {
          statusEl.textContent = `${state.issues.length} issue${state.issues.length!==1?'s':''} (cached)`;
        }
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
    
    console.log(`📡 Fetching issues for queue: ${queueId}, page: ${page}, limit: ${pageSize}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    const offset = (page - 1) * pageSize;
    const response = await fetch(`/api/issues/${queueId}?desk_id=${state.currentDesk}&limit=${pageSize}&offset=${offset}`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'application/json'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
    let json;
    try {
      const responseText = await response.text();
      console.log(`📊 Response size: ${responseText.length} bytes`);
      
      // Log first 500 chars if parse fails
      try {
        json = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError.message);
        console.error('📄 Response preview (first 500 chars):', responseText.substring(0, 500));
        console.error('📄 Response end (last 500 chars):', responseText.substring(Math.max(0, responseText.length - 500)));
        throw parseError;
      }
    } catch (e) {
      console.error('❌ Failed to fetch/parse issues:', e);
      
      // Show user-friendly error notification
      if (window.showNotification) {
        window.showNotification(
          'Error loading tickets. The queue may be too large or have data issues. Please try a smaller queue or contact support.',
          'error',
          10000
        );
      }
      
      // Update status indicator
      if (statusEl) {
        statusEl.textContent = 'Error loading tickets';
        statusEl.classList.remove('status-info', 'status-success');
        statusEl.classList.add('status-warn');
      }
      
      // Hide loading indicator
      if (window.loadingDotsManager) {
        window.loadingDotsManager.hide();
      }
      
      // Return early with empty state
      state.issues = [];
      state.filteredIssues = [];
      renderView();
      return;
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
    let currentUserAccountId = state.currentUserAccountId || localStorage.getItem('currentUserAccountId') || '';
    
    if (typeof currentUser === 'object' && currentUser !== null) {
      currentUser = currentUser.displayName || currentUser.name || '';
    }
    
    if (shouldFilterByAssignee) {
      console.log(`🔍 Filtering by assignee: "${currentUser}" (accountId: ${currentUserAccountId})`);
      
      // Debug: Log sample issues to see structure
      if (allIssues.length > 0) {
        console.log('📋 Sample issue structures (first 3):');
        allIssues.slice(0, 3).forEach(issue => {
          console.log(`  ${issue.key}:`, {
            assignee: issue.assignee,
            fields_assignee: issue.fields?.assignee,
            assigned_to: issue.assigned_to,
            asignado_a: issue.asignado_a,
            assigneeAccountId: issue.assignee?.accountId || issue.fields?.assignee?.accountId
          });
        });
      }
      
      state.filteredIssues = allIssues.length ? allIssues.filter(issue => {
        // Try different assignee field locations and formats
        const assigneeObj = issue.assignee || issue.fields?.assignee;
        const assigneeAccountId = assigneeObj?.accountId || '';
        const assigneeName = 
          assigneeObj?.displayName || 
          assigneeObj?.name ||
          issue.assigned_to ||
          issue.asignado_a ||
          '';
        
        // First priority: Match by accountId (most reliable)
        if (currentUserAccountId && assigneeAccountId) {
          const matchById = assigneeAccountId === currentUserAccountId;
          if (matchById) {
            console.log(`  ✅ ${issue.key}: Matched by accountId`);
            return true;
          }
        }
        
        // Second priority: Match by display name
        if (assigneeName && currentUser) {
          const assigneeLower = assigneeName.toLowerCase().trim();
          const userLower = currentUser.toLowerCase().trim();
          
          // Exact match
          if (assigneeLower === userLower) {
            console.log(`  ✅ ${issue.key}: Matched by exact name "${assigneeName}"`);
            return true;
          }
          
          // Partial match (contains)
          if (assigneeLower.includes(userLower) || userLower.includes(assigneeLower)) {
            console.log(`  ✅ ${issue.key}: Matched by partial name "${assigneeName}"`);
            return true;
          }
        }
        
        // No match
        return false;
      }) : [];
      
      state.issues = state.filteredIssues;
      console.log(`✅ Filtered to ${state.issues.length} tickets assigned to "${currentUser}" from ${allIssues.length} total`);
    } else {
      // Show all tickets
      state.issues = allIssues;
      state.filteredIssues = allIssues;
      console.log(`✅ Showing all ${state.issues.length} tickets`);
    }
    
    console.log(`✅ Issues loaded: ${state.issues.length}/${allIssues.length}`);
    
    // Update pagination state with response metadata
    if (json.hasOwnProperty('hasMore')) {
      if (state.pagination && state.pagination[queueId]) {
        state.pagination[queueId].hasMore = json.hasMore !== false;
        state.pagination[queueId].totalIssues = json.total || allIssues.length;
      }
    } else {
      // Determine if there might be more based on page size
      if (state.pagination && state.pagination[queueId]) {
        const pageSize = state.pagination[queueId].pageSize;
        state.pagination[queueId].hasMore = allIssues.length >= pageSize;
      }
    }
    
    // Reset SLA tracking when loading new queue
    if (state.listView) {
      state.listView.slaLoadedCount = 0;
      state.listView.slaLoadedKeys = new Set();
      state.listView.lastSlaFetch = 0;
      console.log('🔄 SLA tracking reset for new queue');
    }
    
    // 🎯 INTELLIGENT INITIAL VIEW SELECTION
    // Auto-select best view based on ticket count BEFORE first render
    const AUTO_SWITCH_THRESHOLD = 20;
    if (!state.currentView || state.currentView === '') {
      // Initial load - no view set yet
      if (state.issues.length > AUTO_SWITCH_THRESHOLD) {
        state.currentView = 'list';
        console.log(`🎯 Auto-selected LIST view (${state.issues.length} tickets > ${AUTO_SWITCH_THRESHOLD})`);
      } else {
        state.currentView = 'kanban';
        console.log(`🎯 Auto-selected KANBAN view (${state.issues.length} tickets ≤ ${AUTO_SWITCH_THRESHOLD})`);
      }
      
      // Update view toggle button state
      document.querySelectorAll('[data-view]').forEach(btn => {
        const view = btn.getAttribute('data-view');
        if (view === state.currentView) {
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        }
      });
    }
    
    // Save to cache with appropriate TTL
    const cacheTTL = allIssues.length >= 50 ? CacheManager.LARGE_QUEUE_TTL : CacheManager.TTL;
    CacheManager.set(cacheKey, allIssues, cacheTTL);
    const ttlDays = (cacheTTL / (24 * 60 * 60 * 1000)).toFixed(1);
    const ttlHours = (cacheTTL / (60 * 60 * 1000)).toFixed(1);
    
    if (allIssues.length >= 50) {
      console.log(`💾 🚀 Large queue cached for ${ttlDays} days! (${allIssues.length} tickets) - Instant loads for 3 days`);
      
      // Show notification for large queue caching
      if (typeof showNotification === 'function') {
        showNotification(`⚡ ${allIssues.length} tickets cached for 3 days - instant reloads!`, 'success');
      }
    } else {
      console.log(`💾 Cached ${allIssues.length} issues (TTL: ${ttlHours}h)`);
    }
    
    // Update breadcrumb
    if (window.headerMenus && window.headerMenus.syncQueueBreadcrumb) {
      window.headerMenus.syncQueueBreadcrumb();
    }
    
    // Actualizar info del filtro
    const filterInfo = document.getElementById('filterInfo');
    if (filterInfo) {
      filterInfo.textContent = `📊 ${state.issues.length} ticket${state.issues.length !== 1 ? 's' : ''} assigned to you`;
    }
    
    // Progressive rendering strategy for large queues
    if (allIssues.length > 20) {
      console.log(`🚀 Progressive loading: Rendering first 20 tickets immediately, ${allIssues.length - 20} in background`);
      
      // Render first 20 immediately for fast initial display
      renderView();
      
      // Load remaining tickets in background (non-blocking)
      setTimeout(() => {
        console.log(`🔄 Loading remaining ${allIssues.length - 20} tickets in background...`);
        // Trigger a re-render to show all tickets
        renderView();
      }, 100);
      
      // Load transitions lazily in background
      setTimeout(() => loadIssueTransitionsLazy(), 200);
      
      // Preload metrics and ML in background after initial render
      setTimeout(() => preloadMetricsInBackground(), 300);
      setTimeout(() => preloadMLAnalysisInBackground(), 400);
    } else {
      // For small queues, render everything immediately
      loadIssueTransitionsLazy();
      preloadMetricsInBackground();
      preloadMLAnalysisInBackground();
      renderView();
    }
    if (statusEl) {
      const isLargeQueue = allIssues.length >= 50;
      if (isLargeQueue) {
        statusEl.textContent = `${state.issues.length} issue${state.issues.length!==1?'s':''} (⚡ cached 3 days)`;
        statusEl.title = 'Large queue cached for 3 days - instant reloads!';
      } else {
        statusEl.textContent = `${state.issues.length} issue${state.issues.length!==1?'s':''}`;
      }
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout for background
    
    const response = await fetch(`/api/issues/${queueId}?desk_id=${state.currentDesk}`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'application/json'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
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
      // Update cache silently with appropriate TTL
      const cacheTTL = allIssues.length >= 50 ? CacheManager.LARGE_QUEUE_TTL : CacheManager.TTL;
      CacheManager.set(cacheKey, allIssues, cacheTTL);
      const ttlDays = (cacheTTL / (24 * 60 * 60 * 1000)).toFixed(1);
      const ttlHours = (cacheTTL / (60 * 60 * 1000)).toFixed(1);
      
      if (allIssues.length >= 50) {
        console.log(`💾 ✨ Background cache refreshed: ${allIssues.length} tickets cached for ${ttlDays} days`);
      } else {
        console.log(`💾 Cache updated with ${allIssues.length} fresh issues (TTL: ${ttlHours}h)`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Background fetch failed:', error);
  }
}

/**
 * Preload metrics in background with 3-level caching strategy
 * Level 1: Memory cache (instant)
 * Level 2: LocalStorage cache (15min/3h TTL)
 * Level 3: Backend DB cache (1h TTL)
 */
async function preloadMetricsInBackground() {
  if (!state.currentDesk || !state.currentQueue) {
    console.log('ℹ️ Skipping metrics preload: no desk/queue selected');
    return;
  }
  
  const cacheKey = `metrics_${state.currentDesk}_${state.currentQueue}`;
  
  // Level 1: Check memory cache (instant)
  if (window.metricsCache && window.metricsCache[cacheKey]) {
    const cached = window.metricsCache[cacheKey];
    const age = Date.now() - cached.timestamp;
    const ttl = state.issues.length >= 50 ? CacheManager.LARGE_QUEUE_TTL : CacheManager.TTL;
    
    if (age < ttl) {
      console.log(`💨 Metrics in memory cache (${(age / 1000).toFixed(0)}s old)`);
      return; // Already cached in memory
    }
  }
  
  // Level 2: Check LocalStorage cache
  const localCached = CacheManager.get(cacheKey);
  if (localCached) {
    console.log('💾 Metrics in LocalStorage cache');
    // Store in memory for faster access
    window.metricsCache = window.metricsCache || {};
    window.metricsCache[cacheKey] = {
      data: localCached,
      timestamp: Date.now()
    };
    return; // Already cached locally
  }
  
  // Level 3: Fetch from backend (with DB cache)
  console.log('🔄 Preloading metrics in background...');
  
  try {
    const url = `/api/reports/metrics?serviceDeskId=${state.currentDesk}&queueId=${state.currentQueue}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.data?.cached && data.data?.metrics) {
      const metrics = data.data.metrics;
      
      // Store in memory cache
      window.metricsCache = window.metricsCache || {};
      window.metricsCache[cacheKey] = {
        data: metrics,
        timestamp: Date.now()
      };
      
      // Store in LocalStorage cache
      const ttl = state.issues.length >= 50 ? CacheManager.LARGE_QUEUE_TTL : CacheManager.TTL;
      CacheManager.set(cacheKey, metrics, ttl);
      
      console.log(`✅ Metrics preloaded: ${metrics.summary?.total || 0} tickets analyzed`);
    } else if (data.data?.refresh_status) {
      console.log(`🔄 Metrics refresh in progress: ${data.data.refresh_status.progress}%`);
      // Will be available on next load from DB cache
    } else {
      console.log('ℹ️ Metrics not yet available');
    }
  } catch (error) {
    console.warn('⚠️ Background metrics preload failed:', error);
  }
}

/**
 * Preload ML analysis in background with 3-level caching strategy
 * Level 1: Memory cache (instant)
 * Level 2: LocalStorage cache (15min/3h TTL)
 * Level 3: Backend DB cache (1h TTL)
 */
async function preloadMLAnalysisInBackground() {
  if (!state.currentDesk || !state.currentQueue) {
    console.log('ℹ️ Skipping ML analysis preload: no desk/queue selected');
    return;
  }
  
  const cacheKey = `ml_analysis_${state.currentDesk}_${state.currentQueue}`;
  
  // Level 1: Check memory cache (instant)
  if (window.mlAnalysisCache && window.mlAnalysisCache[cacheKey]) {
    const cached = window.mlAnalysisCache[cacheKey];
    const age = Date.now() - cached.timestamp;
    const ttl = state.issues.length >= 50 ? CacheManager.LARGE_QUEUE_TTL : CacheManager.TTL;
    
    if (age < ttl) {
      console.log(`💨 ML Analysis in memory cache (${(age / 1000).toFixed(0)}s old)`);
      return;
    }
  }
  
  // Level 2: Check LocalStorage cache
  const localCached = CacheManager.get(cacheKey);
  if (localCached) {
    console.log('💾 ML Analysis in LocalStorage cache');
    window.mlAnalysisCache = window.mlAnalysisCache || {};
    window.mlAnalysisCache[cacheKey] = {
      data: localCached,
      timestamp: Date.now()
    };
    return;
  }
  
  // Level 3: Fetch from backend (with DB cache)
  console.log('🔄 Preloading ML analysis in background...');
  
  try {
    const response = await fetch('/api/ai/analyze-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        desk_id: state.currentDesk,
        queue_id: state.currentQueue
      })
    });
    
    const data = await response.json();
    let analysis = data.data || data;
    
    if (analysis && !analysis.error) {
      // Store in memory cache
      window.mlAnalysisCache = window.mlAnalysisCache || {};
      window.mlAnalysisCache[cacheKey] = {
        data: analysis,
        timestamp: Date.now()
      };
      
      // Store in LocalStorage cache
      const ttl = state.issues.length >= 50 ? CacheManager.LARGE_QUEUE_TTL : CacheManager.TTL;
      CacheManager.set(cacheKey, analysis, ttl);
      
      console.log(`✅ ML Analysis preloaded: ${analysis.analyzed_count || 0} tickets analyzed`);
    }
  } catch (error) {
    console.warn('⚠️ Background ML analysis preload failed:', error);
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

function autoSwitchViewIfNeeded() {
  // Force list view if more than 20 tickets
  const issueCount = state.issues?.length || 0;
  
  if (issueCount > 20 && state.currentView === 'kanban') {
    console.log(`⚡ Auto-switching to list view (${issueCount} tickets > 20)`);
    
    // Mark as auto-switched
    state.wasAutoSwitched = true;
    
    switchView('list');
    
    // Show notification with custom styling
    showAutoSwitchNotification(issueCount);
    
    return true;
  }
  
  // Clear auto-switch flag if manually switching or less than 20 tickets
  if (issueCount <= 20) {
    state.wasAutoSwitched = false;
  }
  
  return false;
}

function showAutoSwitchNotification(issueCount) {
  // Create custom notification
  const notification = document.createElement('div');
  notification.className = 'auto-switch-notification';
  notification.innerHTML = `
    <div class="auto-switch-content">
      <div class="auto-switch-icon">📊</div>
      <div class="auto-switch-text">
        <strong>List View Activated</strong>
        <p>${issueCount} tickets detected. Using list view for better performance.</p>
      </div>
      <button class="auto-switch-close" onclick="this.parentElement.parentElement.remove()">✕</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

function switchView(view) {
  console.log('🔄 Switching view to:', view);
  
  // Update state
  state.currentView = view;
  
  // Update button states
  document.querySelectorAll('[data-view]').forEach(btn => {
    if (btn.getAttribute('data-view') === view) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    }
  });
  
  // Add/remove auto-switch badge
  updateAutoSwitchBadge();
  
  // Show/hide views
  const kanbanView = document.getElementById('kanbanView');
  const listView = document.getElementById('listView');
  const boardWrapper = document.getElementById('boardWrapper');
  
  // Force layout reset by clearing both views first
  if (kanbanView) {
    kanbanView.style.display = 'none';
    kanbanView.style.height = '';
    kanbanView.style.minHeight = '';
    kanbanView.style.maxHeight = '';
    kanbanView.style.transform = '';
    kanbanView.style.opacity = '';
  }
  
  if (listView) {
    listView.style.display = 'none';
    listView.style.height = '';
    listView.style.minHeight = '';
    listView.style.maxHeight = '';
    listView.style.transform = '';
    listView.style.opacity = '';
  }
  
  // Reset scroll position when switching views
  if (boardWrapper) {
    boardWrapper.scrollTop = 0;
    boardWrapper.style.height = '';
  }
  
  // Force reflow to ensure styles are applied
  if (boardWrapper) {
    void boardWrapper.offsetHeight;
  }
  
  // Now show the selected view
  if (view === 'kanban' && kanbanView) {
    kanbanView.style.display = 'block';
    // Re-apply SLA styling when switching back to kanban
    setTimeout(() => {
      if (state.currentView === 'kanban') {
        console.log('🎨 Re-applying SLA styling after switching to kanban...');
        applySLAStyling();
      }
    }, 150);
  } else if (view === 'list' && listView) {
    listView.style.display = 'block';
  }
  
  // Render the view
  renderView();
  
  // Save preference (only if not auto-switched)
  if (!state.wasAutoSwitched) {
    localStorage.setItem('preferredView', view);
  }
}

function updateAutoSwitchBadge() {
  // Remove existing badge
  const existingBadge = document.querySelector('.auto-switch-badge');
  if (existingBadge) {
    existingBadge.remove();
  }
  
  // Add badge if auto-switched and in list view
  if (state.wasAutoSwitched && state.currentView === 'list') {
    const listBtn = document.querySelector('[data-view="list"]');
    if (listBtn && !listBtn.querySelector('.auto-switch-badge')) {
      const badge = document.createElement('span');
      badge.className = 'auto-switch-badge';
      badge.textContent = 'Auto';
      badge.title = `Automatically switched due to ${state.issues?.length || 0} tickets`;
      listBtn.appendChild(badge);
    }
  }
}

function renderView() {
  // Only auto-switch if view is already set (not initial load)
  // Initial load view is selected intelligently in loadIssues()
  if (state.currentView && state.currentView !== '') {
    const wasAutoSwitched = autoSwitchViewIfNeeded();
    
    // If auto-switched, the switchView() function already handled the render
    if (wasAutoSwitched) {
      return;
    }
  }
  
  // Control view container visibility
  const kanbanView = document.getElementById('kanbanView');
  const listView = document.getElementById('listView');
  
  if (kanbanView && listView) {
    if (state.currentView === 'kanban') {
      kanbanView.style.display = 'block';
      listView.style.display = 'none';
      renderKanban();
    } else {
      kanbanView.style.display = 'none';
      listView.style.display = 'block';
      renderList();
    }
  } else {
    // Fallback if containers don't exist yet
    if (state.currentView === 'kanban') {
      renderKanban();
    } else {
      renderList();
    }
  }
  
  // Hide loading dots after render
  if (window.loadingDotsManager) {
    window.loadingDotsManager.hide();
  }
}

/**
 * Get SLA status class for ticket key styling
 */
async function getSLAStatusClass(issueKey) {
  try {
    const response = await fetch(`/api/issues/${issueKey}/sla`);
    if (!response.ok) return '';
    
    const data = await response.json();
    if (!data.success || !data.data || !data.data.cycles || data.data.cycles.length === 0) {
      return '';
    }
    
    const cycle = data.data.cycles[0];
    const isSecondary = data.data.is_secondary || false;
    
    // IMPORTANT: Don't style tickets with only "Cierre Ticket" (secondary) SLA
    // These tickets should appear NORMAL without amber highlighting
    // Amber would incorrectly suggest a problem/warning when it's just a default SLA
    if (isSecondary) {
      return ''; // No styling for secondary-only tickets
    }
    
    // Determine SLA status class based on state from JIRA
    // Show paused status ONLY when JIRA reports paused=true
    if (cycle.paused) {
      return 'ticket-key-sla-paused';
    } else if (cycle.breached) {
      return 'ticket-key-sla-breached';
    } else if (cycle.remaining_time && cycle.remaining_time !== 'N/A') {
      // Parse remaining time to determine if it's getting close
      const remainingText = cycle.remaining_time.toLowerCase();
      if (remainingText.includes('m') && !remainingText.includes('h')) {
        // Less than 1 hour remaining - warning
        return 'ticket-key-sla-warning';
      }
      return 'ticket-key-sla-healthy';
    }
    
    return 'ticket-key-sla-healthy';
  } catch (error) {
    console.warn(`Failed to get SLA status for ${issueKey}:`, error);
    return '';
  }
}

/**
 * Extract country code from JIRA customfield_10167
 * Handles both object format {value: "Chile: +56"} and string format
 * 
 * @param {Object|string|null} fieldValue - The customfield_10167 value
 * @returns {string} Country code with + (e.g., "+56") or empty string
 */
function extractCountryCode(fieldValue) {
  if (!fieldValue) return '';
  
  // Extract value string from object or use directly
  let valueStr = '';
  if (typeof fieldValue === 'object' && fieldValue.value) {
    valueStr = fieldValue.value;
  } else if (typeof fieldValue === 'string') {
    valueStr = fieldValue;
  } else {
    return '';
  }
  
  // Match pattern "País: +XX" (e.g., "Chile: +56")
  const match = valueStr.match(/:\s*(\+\d{1,4})/);
  if (match) {
    return match[1];
  }
  
  // Fallback: find any +XX pattern
  const fallbackMatch = valueStr.match(/\+\d{1,4}/);
  if (fallbackMatch) {
    return fallbackMatch[0];
  }
  
  return '';
}

/**
 * Format phone number with country code and 4-digit separators
 * @param {string} phone - Phone number (raw)
 * @param {string} countryCode - Country code (e.g., "+52", "52", "MX")
 * @returns {string} - Formatted phone (e.g., "+52-5555-1234-5678")
 */
function formatPhoneNumber(phone, countryCode) {
  if (!phone) return '';
  
  // Clean phone number (remove non-digits)
  let cleaned = phone.replace(/\D/g, '');
  
  if (!cleaned) return '';
  
  // Handle country code
  let prefix = '';
  if (countryCode) {
    // Clean country code (remove non-digits)
    const cleanedCode = countryCode.replace(/\D/g, '');
    if (cleanedCode) {
      prefix = `+${cleanedCode}-`;
    }
  }
  
  // Split into 4-digit groups
  let formatted = '';
  for (let i = 0; i < cleaned.length; i += 4) {
    if (i > 0) formatted += '-';
    formatted += cleaned.substring(i, Math.min(i + 4, cleaned.length));
  }
  
  return prefix + formatted;
}

async function renderKanban() {
  const kanbanView = document.getElementById('kanbanView');
  
  // Use state.issues which already contains filtered issues
  const issuesToRender = state.issues;
  
  if (!issuesToRender || issuesToRender.length === 0) {
    kanbanView.innerHTML = '<p class="placeholder">No issues in this queue</p>';
    return;
  }
  
  // Progressive rendering for large datasets - adaptive thresholds
  const INITIAL_RENDER_COUNT = issuesToRender.length > 50 ? 15 : 20;
  const shouldProgressiveRender = issuesToRender.length > 25; // Lower threshold
  
  if (shouldProgressiveRender) {
    console.log(`🎭 Progressive Kanban: ${issuesToRender.length} total tickets, rendering first ${INITIAL_RENDER_COUNT} immediately`);
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
    // But filter by smart filter if active
    columnsToRender = kanbanData.statuses.map(status => {
      const column = kanbanData.columns.find(c => c.status === status);
      const columnIssues = column ? column.issues : [];
      // If smart filter is active, filter the column issues
      const filteredColumnIssues = window.app?.filteredIssues
        ? columnIssues.filter(issue => issuesToRender.some(fi => fi.key === issue.key))
        : columnIssues;
      return {
        status: status,
        issues: filteredColumnIssues
      };
    });
  } else {
    // Fallback: agrupar localmente con orden manual
    const columns = {};
    issuesToRender.forEach(issue => {
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

  let html = '<div class="kanban-board">';
  let colIndex = 0;
  const colors = ['col-blue', 'col-purple', 'col-cyan', 'col-green', 'col-red', 'col-yellow', 'col-pink', 'col-indigo', 'col-teal', 'col-orange'];

  // Render columns in chunks for better performance
  const renderColumnChunk = (columns, startIdx, chunkSize) => {
    const endIdx = Math.min(startIdx + chunkSize, columns.length);
    let chunkHtml = '';
    
    for (let i = startIdx; i < endIdx; i++) {
      const { status, issues } = columns[i];
      if (!issues || issues.length === 0) {
        console.log(`⏭️ Skipping empty column: ${status}`);
        continue;
      }
      
      console.log(`📦 Rendering column: ${status} with ${issues.length} issues`);
      
      const color = colors[colIndex % colors.length];
      colIndex++;
      
      chunkHtml += `<div class="kanban-column glassmorphic-secondary ${color}" data-status="${status}">
        <div class="kanban-column-header">
          <div class="kanban-column-title">${status}</div>
          <div class="kanban-column-count">${issues.length}</div>
        </div>
        <div class="kanban-cards">`;
      
      // Render only first 20 cards per column initially if progressive rendering
      const cardsToRender = shouldProgressiveRender && i < 2 ? issues.slice(0, INITIAL_RENDER_COUNT) : issues;
      
      cardsToRender.forEach(issue => {
        // Get full issue data from cache (includes all customfields)
        const fullIssue = window.app?.issuesCache?.get(issue.key) || issue;
      const transitions = state.issueTransitions[issue.key] || [];
      
      // Debug: Log first issue to see structure
      if (issues.indexOf(issue) === 0) {
        console.log('🔍 First issue FULL structure:');
        console.log('   All root keys:', Object.keys(fullIssue));
        console.log('   Customfield keys:', Object.keys(fullIssue).filter(k => k.startsWith('customfield')));
        console.log('   customfield_10111:', fullIssue.customfield_10111);
        console.log('   customfield_10125:', fullIssue.customfield_10125);
        console.log('   customfield_10141:', fullIssue.customfield_10141);
        console.log('   customfield_10142:', fullIssue.customfield_10142);
        console.log('   customfield_10143:', fullIssue.customfield_10143);
        if (fullIssue.fields) {
          console.log('   fields.customfield keys:', Object.keys(fullIssue.fields).filter(k => k.startsWith('customfield')).slice(0, 10));
        }
      }
      
      // ✅ Extract data from customfields (backend provides all customfields directly)
      const severity = fullIssue.severity || fullIssue.customfield_10125?.value || fullIssue.customfield_10125 || '';
      
      // Assignee from root level (backend normalized field)
      const assignee = fullIssue.assignee || 'No assignee';
      
      // Contact info from customfields (extract FIRST, needed for reporter name)
      const reporterEmail = typeof fullIssue.customfield_10141 === 'string' 
        ? fullIssue.customfield_10141 
        : (fullIssue.customfield_10141?.value || '');
      
      let reporterPhone = typeof fullIssue.customfield_10142 === 'string' 
        ? fullIssue.customfield_10142 
        : (fullIssue.customfield_10142?.value || '');
      
      // Código de país (customfield_10167) - Usar extractCountryCode() para manejar formato "Chile: +56"
      const countryCode = extractCountryCode(fullIssue.customfield_10167);
      
      // Formatear teléfono con código de país y separadores de 4 dígitos
      if (reporterPhone) {
        reporterPhone = formatPhoneNumber(reporterPhone, countryCode);
      }
      
      const reporterCompany = typeof fullIssue.customfield_10143 === 'string' 
        ? fullIssue.customfield_10143 
        : (fullIssue.customfield_10143?.value || '');
      
      // Reporter/Informer - Priority: creator > customfield_10111 (reporter is usually current user)
      let reporterObj = fullIssue.creator || fullIssue.customfield_10111;
      
      if (Array.isArray(reporterObj) && reporterObj.length > 0) {
        reporterObj = reporterObj[0]; // Take first element if array
      }
      
      // Extract reporter name with smart fallback
      let reporter = reporterObj?.displayName || reporterObj?.name || reporterObj?.emailAddress || '';
      
      // If reporter is generic "Soporte" or empty, extract real name from contact email
      if (!reporter || reporter === 'Soporte' || reporter === 'Support') {
        if (reporterEmail && reporterEmail.includes('@')) {
          // Extract name from email (e.g., "eduardo.valora@speedymovil.com" -> "Eduardo Valora")
          const namePart = reporterEmail.split('@')[0];
          const nameParts = namePart.split('.');
          reporter = nameParts
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
        }
      }
      
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

      // Calculate time since last REAL change (comment/transition/field change)
      // Use last_real_change from backend (calculated from changelog + comments)
      const lastChange = fullIssue.last_real_change || fullIssue.updated || fullIssue.fields?.updated;
      const lastChangeTime = lastChange ? new Date(lastChange) : null;
      const now = new Date();
      let timeAgo = '';
      if (lastChangeTime) {
        const diffMs = now - lastChangeTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) timeAgo = 'just now';
        else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
        else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
        else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
        else timeAgo = `${Math.floor(diffDays / 7)}w ago`;
      }

      chunkHtml += `<div class="${cardClass} kanban-card" 
                    data-issue="${issue.key}" 
                    data-issue-key="${issue.key}" 
                    draggable="true">
        <!-- HEADER: Key + Severity + Time -->
        <div class="issue-card-header">
          <div class="issue-card-key" id="key-${issue.key}">${issue.key}</div>
          ${severityBadgeHtml}
          ${timeAgo ? `<span class="issue-card-time">🕒 ${timeAgo}</span>` : ''}
          <button class="issue-details-btn" data-issue-key="${issue.key}" title="View Details">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
        
        <!-- SUMMARY (main content) -->
        <div class="issue-card-summary">${fullIssue.summary || fullIssue.fields?.summary || 'No summary'}</div>
        
        <!-- INFORMER SECTION (Reporter with all contact info) -->
        ${reporter ? `
        <div class="issue-card-informer">
          <div class="informer-name">📢 Informer: ${reporter}</div>
          ${reporterEmail ? `<div class="informer-email">📧 ${reporterEmail}</div>` : ''}
          ${reporterPhone ? `<div class="informer-phone">📱 ${reporterPhone}</div>` : ''}
          ${reporterCompany ? `<div class="informer-company">🏢 ${reporterCompany}</div>` : ''}
        </div>` : ''}
        
        <!-- ASSIGNEE SECTION -->
        <div class="issue-card-assignee">
          <span class="assignee-label">👤 Assigned:</span>
          <span class="assignee-name ${assignee === 'No assignee' ? 'assignee-unassigned' : ''}">${assignee}</span>
        </div>`;

      // Renderizar botones de transición (solo si hay espacio)
      if (transitions.length > 0 && transitions.length <= 2) {
        chunkHtml += `<div class="issue-card-actions">`;
        transitions.forEach(transition => {
          chunkHtml += `<button class="btn-transition-mini" onclick-disabled="event.stopPropagation(); transitionIssue('${issue.key}', ${transition.id})" title="${transition.name}">
            ${transition.name.substring(0, 10)}
          </button>`;
        });
        chunkHtml += `</div>`;
      }

      chunkHtml += `</div>`;
      });
      
      chunkHtml += `</div></div>`;
    }
    
    return chunkHtml;
  };
  
  // Initial render: first 3 columns or all if small
  const COLUMNS_PER_CHUNK = 3;
  html += renderColumnChunk(columnsToRender, 0, COLUMNS_PER_CHUNK);
  html += '</div>'; // Close kanban-board container

  console.log(`📋 Initial HTML length: ${html.length} characters`);
  kanbanView.innerHTML = html;
  
  // Render remaining columns in background with progressive chunking
  if (columnsToRender.length > COLUMNS_PER_CHUNK) {
    let currentColumnChunk = COLUMNS_PER_CHUNK;
    
    const renderNextColumnChunk = () => {
      if (currentColumnChunk >= columnsToRender.length) {
        console.log('✅ All Kanban columns rendered');
        return;
      }
      
      const endIdx = Math.min(currentColumnChunk + COLUMNS_PER_CHUNK, columnsToRender.length);
      const chunkHtml = renderColumnChunk(columnsToRender, currentColumnChunk, COLUMNS_PER_CHUNK);
      
      // Append to existing content (before closing </div>)
      const closingDiv = '</div>';
      if (kanbanView.innerHTML.endsWith(closingDiv)) {
        kanbanView.innerHTML = kanbanView.innerHTML.slice(0, -closingDiv.length) + chunkHtml + closingDiv;
      } else {
        kanbanView.innerHTML += chunkHtml;
      }
      
      // Re-apply effects
      if (window.transparencyManager) {
        window.transparencyManager.applyToKanbanColumns();
        window.transparencyManager.applyTransparency();
      }
      
      // Re-setup click handlers
      if (typeof setupIssueCardClickHandlers === 'function') {
        setupIssueCardClickHandlers();
      } else if (window.setupIssueCardClickHandlers) {
        window.setupIssueCardClickHandlers();
      }
      
      currentColumnChunk = endIdx;
      
      // Continue with next chunk
      if (currentColumnChunk < columnsToRender.length) {
        requestAnimationFrame(() => {
          setTimeout(renderNextColumnChunk, 60); // Shorter delay for faster loading
        });
      } else {
        // All columns rendered - re-apply SLA styling to newly added cards
        console.log('✅ All columns rendered, re-applying SLA styling...');
        setTimeout(() => applySLAStyling(), 100);
      }
    };
    
    // Start rendering additional columns
    setTimeout(() => {
      console.log(`🔄 Rendering ${columnsToRender.length - COLUMNS_PER_CHUNK} additional columns in background...`);
      renderNextColumnChunk();
    }, 100);
  }
  
  // Apply transparency effects to kanban columns after DOM settles
  // Try immediately with requestAnimationFrame
  requestAnimationFrame(() => {
    if (window.transparencyManager) {
      console.log('🎨 Applying transparency to Kanban columns (immediate)...');
      window.transparencyManager.applyToKanbanColumns();
      window.transparencyManager.applyTransparency();
    } else {
      console.warn('⚠️ Transparency manager not ready yet, retrying...');
      // Retry after 200ms if not ready
      setTimeout(() => {
        if (window.transparencyManager) {
          console.log('🎨 Applying transparency to Kanban columns (retry)...');
          window.transparencyManager.applyToKanbanColumns();
          window.transparencyManager.applyTransparency();
        } else {
          console.error('❌ Transparency manager failed to load!');
        }
      }, 200);
    }
  });
  
  applyCardLayout();
  
  // Apply SLA styling to ticket keys
  applySLAStyling();
  
  // Setup issue card click handlers (for details buttons)
  console.log('🎯 [App] About to setup click handlers...');
  
  setTimeout(() => {
    console.log('🎯 [App] Timeout fired, checking functions...');
    console.log('🎯 [App] setupIssueCardClickHandlers exists?', typeof setupIssueCardClickHandlers);
    console.log('🎯 [App] window.setupIssueCardClickHandlers exists?', typeof window.setupIssueCardClickHandlers);
    
    if (typeof setupIssueCardClickHandlers === 'function') {
      console.log('✅ [App] Calling setupIssueCardClickHandlers...');
      setupIssueCardClickHandlers();
    } else if (window.setupIssueCardClickHandlers) {
      console.log('✅ [App] Calling window.setupIssueCardClickHandlers...');
      window.setupIssueCardClickHandlers();
    } else {
      console.error('❌ [App] No setupIssueCardClickHandlers function found!');
    }
    
    // Debug: Test button existence
    const buttons = document.querySelectorAll('.issue-details-btn');
    console.log('🔍 [Debug] Found', buttons.length, 'details buttons after setup');
    buttons.forEach((btn, i) => {
      console.log(`🔍 [Debug] Button ${i + 1}:`, btn.getAttribute('data-issue-key'), 'visible:', btn.offsetParent !== null);
      
      // Force setup this button manually if needed
      if (!btn.onclick) {
        console.log('🔧 [Force] Setting up button manually:', btn.getAttribute('data-issue-key'));
        const issueKey = btn.getAttribute('data-issue-key');
        btn.onclick = function() {
          console.log('🎯 [Manual] Manual onclick for:', issueKey);
          if (window.openIssueDetails) {
            window.openIssueDetails(issueKey);
          }
        };
        btn.style.background = 'rgba(255, 0, 0, 0.5)'; // Red to identify manual setup
      }
    });
  }, 100);
}

/**
 * Apply SLA styling to all visible ticket keys
 */
async function applySLAStyling() {
  const ticketKeys = document.querySelectorAll('.issue-card-key[id^="key-"]');
  console.log(`🎨 Applying SLA styling to ${ticketKeys.length} tickets`);
  
  if (ticketKeys.length === 0) {
    console.warn('⚠️ No ticket keys found for SLA styling');
    return;
  }
  
  // Process tickets in batches to avoid overwhelming the server
  const batchSize = 5;
  for (let i = 0; i < ticketKeys.length; i += batchSize) {
    const batch = Array.from(ticketKeys).slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (keyElement) => {
      const issueKey = keyElement.textContent.trim();
      
      // Skip if already styled (has SLA class)
      if (keyElement.className.includes('ticket-key-sla-')) {
        return;
      }
      
      try {
        const slaClass = await getSLAStatusClass(issueKey);
        if (slaClass) {
          // Remove any existing SLA classes first
          keyElement.className = keyElement.className.replace(/ticket-key-sla-\w+/g, '').trim();
          keyElement.classList.add(slaClass);
          console.log(`✅ Applied ${slaClass} to ${issueKey}`);
        }
      } catch (error) {
        console.warn(`Failed to apply SLA styling to ${issueKey}:`, error);
      }
    }));
    
    // Small delay between batches to prevent rate limiting
    if (i + batchSize < ticketKeys.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

function applyCardLayout() {
  const cards = document.querySelectorAll('.issue-card');
  cards.forEach(card => {
    // Get transition count to calculate height dynamically
    const transitions = card.querySelectorAll('.btn-transition').length;
    const height = CARD_SIZING.getHeight(transitions);
    card.style.minHeight = height + 'px';
    
    // Card interactions handled by right-sidebar.js
  });
}

function transitionIssue(issueKey, transitionId) {
  console.log(`Transitioning ${issueKey} with transition ${transitionId}`);
  // Implementar lógica de transición aquí
}

/**
 * Render issues for list view - separate function to avoid interference with kanban
 */
function renderListIssues(issues) {
  if (!issues || issues.length === 0) {
    return [];
  }
  
  return issues;
}

function renderList() {
  const listView = document.getElementById('listView');
  
  // Get issues using renderListIssues to ensure proper data handling
  const issuesToRender = renderListIssues(state.issues);
  
  if (!issuesToRender || issuesToRender.length === 0) {
    listView.innerHTML = `
      <div class="list-placeholder">
        <div class="placeholder-icon">📋</div>
        <p class="placeholder-text">No issues in this queue</p>
      </div>
    `;
    return;
  }

  console.log(`📝 Rendering list view with ${issuesToRender.length} issues`);
  
  // Initialize list state if not exists
  if (!state.listView) {
    // Adaptive pageSize: smaller for better performance with large datasets
    const adaptivePageSize = issuesToRender.length > 100 ? 30 : 50;
    
    state.listView = {
      currentPage: 1,
      pageSize: adaptivePageSize,
      searchTerm: '',
      sortBy: 'created',
      sortDir: 'desc',
      slaLoadedCount: 0,
      slaLoadedKeys: new Set(),
      lastSlaFetch: 0
    };
    
    console.log(`📋 List view initialized with pageSize: ${adaptivePageSize} (${issuesToRender.length} total tickets)`);
  }
  
  // Filter issues by search term
  let filteredIssues = issuesToRender;
  if (state.listView.searchTerm) {
    const term = state.listView.searchTerm.toLowerCase();
    filteredIssues = issuesToRender.filter(issue => 
      issue.key.toLowerCase().includes(term) ||
      (issue.summary || '').toLowerCase().includes(term) ||
      (issue.assignee || '').toLowerCase().includes(term)
    );
  }
  
  // Sort issues
  filteredIssues = sortIssues(filteredIssues, state.listView.sortBy, state.listView.sortDir);
  
  // Calculate pagination
  const totalIssues = filteredIssues.length;
  const totalPages = Math.ceil(totalIssues / state.listView.pageSize);
  const startIdx = (state.listView.currentPage - 1) * state.listView.pageSize;
  const endIdx = Math.min(startIdx + state.listView.pageSize, totalIssues);
  const pageIssues = filteredIssues.slice(startIdx, endIdx);
  
  // Progressive rendering for large pages - more aggressive for better performance
  const INITIAL_LIST_RENDER = Math.min(15, Math.ceil(pageIssues.length * 0.3)); // 30% or 15 max
  const shouldProgressiveRender = pageIssues.length > INITIAL_LIST_RENDER;
  const initialRenderIssues = shouldProgressiveRender ? pageIssues.slice(0, INITIAL_LIST_RENDER) : pageIssues;
  
  if (shouldProgressiveRender) {
    console.log(`🎯 Progressive list: Rendering ${INITIAL_LIST_RENDER}/${pageIssues.length} rows immediately (~${Math.round((INITIAL_LIST_RENDER/pageIssues.length)*100)}%)`);
  }
  
  // Check if server has more pages available
  const serverPagination = state.pagination && state.pagination[state.currentQueue];
  const hasMoreServerPages = serverPagination && serverPagination.hasMore;
  const loadedFromServer = serverPagination ? serverPagination.allIssuesLoaded.length : totalIssues;
  
  let html = `
    <div class="list-container">
      <!-- Header with search and controls -->
      <div class="list-header">
        <div class="list-stats">
          <span class="stat-badge">📊 ${totalIssues} tickets loaded</span>
          ${hasMoreServerPages ? `<span class="stat-badge" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">📦 More available</span>` : ''}
          ${state.listView.searchTerm ? `<span class="stat-badge">🔍 Filtered</span>` : ''}
          <span class="stat-badge">📄 Page ${state.listView.currentPage}/${totalPages}</span>
          <label class="assignee-edit-toggle" title="Enable assignee editing">
            <input type="checkbox" id="enableAssigneeEdit" />
            <span>✏️ Edit Assignees</span>
          </label>
        </div>
        <div class="list-controls">
          <input 
            type="text" 
            class="list-search" 
            placeholder="🔍 Search tickets..." 
            value="${state.listView.searchTerm}"
            id="listSearchInput"
          />
          <select class="list-sort" id="listSortSelect">
            <option value="created-desc" ${state.listView.sortBy === 'created' && state.listView.sortDir === 'desc' ? 'selected' : ''}>📅 Newest First</option>
            <option value="created-asc" ${state.listView.sortBy === 'created' && state.listView.sortDir === 'asc' ? 'selected' : ''}>📅 Oldest First</option>
            <option value="key-asc" ${state.listView.sortBy === 'key' ? 'selected' : ''}>🔢 Key</option>
            <option value="priority-desc">⚡ Priority</option>
          </select>
        </div>
      </div>
      
      <!-- Issues table -->
      <div class="list-table-wrapper">
        <table class="issues-table">
          <thead>
            <tr>
              <th class="col-key sortable ${state.listView.sortBy === 'key' ? 'sorted sorted-' + state.listView.sortDir : ''}" data-sort="key">
                Key ${state.listView.sortBy === 'key' ? (state.listView.sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th class="col-summary sortable ${state.listView.sortBy === 'summary' ? 'sorted sorted-' + state.listView.sortDir : ''}" data-sort="summary">
                Summary ${state.listView.sortBy === 'summary' ? (state.listView.sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th class="col-status-severity sortable ${state.listView.sortBy === 'status' ? 'sorted sorted-' + state.listView.sortDir : ''}" data-sort="status">
                Status / Severity ${state.listView.sortBy === 'status' ? (state.listView.sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th class="col-sla">SLA</th>
              <th class="col-assignee sortable ${state.listView.sortBy === 'assignee' ? 'sorted sorted-' + state.listView.sortDir : ''}" data-sort="assignee">
                Assignee ${state.listView.sortBy === 'assignee' ? (state.listView.sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th class="col-created sortable ${state.listView.sortBy === 'created' ? 'sorted sorted-' + state.listView.sortDir : ''}" data-sort="created">
                Created ${state.listView.sortBy === 'created' ? (state.listView.sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody id="listViewTbody">
  `;
  
  // Render initial batch of issues
  initialRenderIssues.forEach(issue => {
    const status = issue.status || issue.fields?.status?.name || 'Unknown';
    const severity = issue.severity || issue.customfield_10125?.value || '-';
    const assignee = issue.assignee || issue.fields?.assignee?.displayName || 'Unassigned';
    const created = new Date(issue.created || issue.fields?.created);
    const createdStr = created.toLocaleDateString() + ' ' + created.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const summary = issue.summary || issue.fields?.summary || 'No summary';
    
    // Get severity color
    let severityClass = 'severity-default';
    if (severity.toLowerCase().includes('critico') || severity.toLowerCase().includes('critical')) {
      severityClass = 'severity-critical';
    } else if (severity.toLowerCase().includes('mayor') || severity.toLowerCase().includes('major')) {
      severityClass = 'severity-major';
    } else if (severity.toLowerCase().includes('menor') || severity.toLowerCase().includes('minor')) {
      severityClass = 'severity-minor';
    }
    
    // Get SLA status (will be loaded async)
    const slaId = `sla-${issue.key}`;
    
    html += `
      <tr class="issue-row" data-issue-key="${issue.key}">
        <td class="col-key">
          <span class="issue-key-link">${issue.key}</span>
        </td>
        <td class="col-summary" title="${escapeHtml(summary)}">
          <span class="issue-summary">${truncateText(summary, 80)}</span>
        </td>
        <td class="col-status-severity">
          <div class="status-severity-compact">
            <span class="status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}">${status}</span>
            <span class="severity-badge ${severityClass}">${severity}</span>
          </div>
        </td>
        <td class="col-sla">
          <div id="${slaId}" class="sla-indicator-list">
            <span class="sla-loading">⏳</span>
          </div>
        </td>
        <td class="col-assignee" data-issue-key="${issue.key}">
          <span class="assignee-display">${assignee}</span>
          <input 
            type="text" 
            class="assignee-edit-input" 
            value="${assignee}" 
            placeholder="Type user name..."
            data-issue-key="${issue.key}"
          />
        </td>
        <td class="col-created">
          <span class="created-date">${createdStr}</span>
        </td>
        <td class="col-actions">
          <button class="btn-view-details" data-issue-key="${issue.key}" title="View details">
            👁️ Details
          </button>
          <button class="list-transition-trigger" data-issue-key="${issue.key}" title="Show transitions">
            ⚡ Transitions
          </button>
        </td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="list-pagination">
        <button 
          class="pagination-btn" 
          id="listPrevBtn" 
          ${state.listView.currentPage === 1 ? 'disabled' : ''}
        >
          ⬅️ Previous
        </button>
        <span class="pagination-info">
          Showing ${startIdx + 1}-${endIdx} of ${totalIssues} loaded
        </span>
        <button 
          class="pagination-btn" 
          id="listNextBtn" 
          ${state.listView.currentPage === totalPages ? 'disabled' : ''}
        >
          Next ➡️
        </button>
      </div>
      
      <!-- Load More from Server -->
      ${hasMoreServerPages ? `
        <div class="load-more-container" style="text-align: center; padding: 20px;">
          <button 
            class="load-more-btn" 
            id="loadMoreServerBtn"
            style="padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;"
          >
            📦 Load More Tickets (100 more)
          </button>
          <p style="margin-top: 8px; color: #64748b; font-size: 13px;">
            ${loadedFromServer} tickets loaded from server
          </p>
        </div>
      ` : ''}
    </div>
  `;
  
  listView.innerHTML = html;
  
  // Render remaining issues in background with chunking for better performance
  if (shouldProgressiveRender) {
    const remainingIssues = pageIssues.slice(INITIAL_LIST_RENDER);
    const CHUNK_SIZE = 10; // Render in small chunks for smoother UI
    let currentChunk = 0;
    
    const renderNextChunk = () => {
      const startIdx = currentChunk * CHUNK_SIZE;
      const endIdx = Math.min(startIdx + CHUNK_SIZE, remainingIssues.length);
      
      if (startIdx >= remainingIssues.length) {
        console.log('✅ All background rows rendered');
        return;
      }
      
      const tbody = document.getElementById('listViewTbody');
      if (!tbody) return;
      
      const chunkIssues = remainingIssues.slice(startIdx, endIdx);
      let chunkHtml = '';
      
      chunkIssues.forEach(issue => {
        const status = issue.status || issue.fields?.status?.name || 'Unknown';
        const severity = issue.severity || issue.customfield_10125?.value || '-';
        const assignee = issue.assignee || issue.fields?.assignee?.displayName || 'Unassigned';
        const created = new Date(issue.created || issue.fields?.created);
        const createdStr = created.toLocaleDateString() + ' ' + created.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const summary = issue.summary || issue.fields?.summary || 'No summary';
        
        let severityClass = 'severity-default';
        if (severity.toLowerCase().includes('critico') || severity.toLowerCase().includes('critical')) {
          severityClass = 'severity-critical';
        } else if (severity.toLowerCase().includes('mayor') || severity.toLowerCase().includes('major')) {
          severityClass = 'severity-major';
        } else if (severity.toLowerCase().includes('menor') || severity.toLowerCase().includes('minor')) {
          severityClass = 'severity-minor';
        }
        
        chunkHtml += `
          <tr class="issue-row" data-issue-key="${issue.key}">
            <td class="col-key"><a href="#" class="issue-key-link" data-issue-key="${issue.key}">${issue.key}</a></td>
            <td class="col-summary">${summary}</td>
            <td class="col-status-severity">
              <div class="status-severity-compact">
                <span class="status-badge status-${status.toLowerCase().replace(/\\s+/g, '-')}">${status}</span>
                <span class="severity-badge ${severityClass}">${severity}</span>
              </div>
            </td>
            <td class="col-sla"><span class="sla-loading" id="sla-${issue.key}">⏳</span></td>
            <td class="col-assignee" data-issue-key="${issue.key}">
              <span class="assignee-display">${assignee}</span>
              <input type="text" class="assignee-edit-input" value="${assignee}" placeholder="Type user name..." data-issue-key="${issue.key}" />
            </td>
            <td class="col-created"><span class="created-date">${createdStr}</span></td>
            <td class="col-actions">
              <button class="btn-view-details" data-issue-key="${issue.key}" title="View details">👁️ Details</button>
              <button class="list-transition-trigger" data-issue-key="${issue.key}" title="Show transitions">⚡ Transitions</button>
            </td>
          </tr>
        `;
      });
      
      tbody.innerHTML += chunkHtml;
      
      currentChunk++;
      
      // Continue rendering next chunk
      if (endIdx < remainingIssues.length) {
        // Use requestAnimationFrame for smoother rendering
        requestAnimationFrame(() => {
          setTimeout(renderNextChunk, 50); // Small delay between chunks
        });
      } else {
        // All chunks rendered, finalize
        console.log(`✅ All ${remainingIssues.length} background rows rendered in ${currentChunk} chunks`);
        
        // Re-attach event listeners once at the end
        attachListEventListeners();
        
        // Load SLAs for remaining issues
        loadSLAForListView(remainingIssues);
      }
    };
    
    // Start rendering first chunk after short delay
    setTimeout(() => {
      console.log(`🔄 Starting background rendering: ${remainingIssues.length} rows in chunks of ${CHUNK_SIZE}...`);
      renderNextChunk();
    }, 80);
  }
  
  // Attach event listeners
  attachListEventListeners();
  
  // Setup scroll-based lazy rendering if many rows pending
  if (shouldProgressiveRender && pageIssues.length > 30) {
    setupLazyRowRendering();
  }
  
  // Load SLA data for visible issues (initial batch or all if small)
  loadSLAForListView(initialRenderIssues);
}

function attachListEventListeners() {
  // Search input
  const searchInput = document.getElementById('listSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.listView.searchTerm = e.target.value;
      state.listView.currentPage = 1; // Reset to first page
      renderList();
    });
  }
  
  // Sort select
  const sortSelect = document.getElementById('listSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const [sortBy, sortDir] = e.target.value.split('-');
      state.listView.sortBy = sortBy;
      state.listView.sortDir = sortDir || 'desc';
      renderList();
    });
  }
  
  // Sortable column headers
  document.querySelectorAll('.issues-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sortBy = th.getAttribute('data-sort');
      
      // Toggle direction if same column, otherwise default to desc
      if (state.listView.sortBy === sortBy) {
        state.listView.sortDir = state.listView.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.listView.sortBy = sortBy;
        state.listView.sortDir = 'desc';
      }
      
      renderList();
    });
  });
  
  // Pagination buttons
  const prevBtn = document.getElementById('listPrevBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.listView.currentPage > 1) {
        state.listView.currentPage--;
        renderList();
        document.querySelector('.list-table-wrapper').scrollTop = 0;
        
        // Trigger progressive SLA loading for new page
        const startIdx = (state.listView.currentPage - 1) * state.listView.pageSize;
        const endIdx = startIdx + state.listView.pageSize;
        const pageIssues = state.issues.slice(startIdx, endIdx);
        loadSLAForListView(pageIssues);
      }
    });
  }
  
  const nextBtn = document.getElementById('listNextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(
        state.issues.length / state.listView.pageSize
      );
      if (state.listView.currentPage < totalPages) {
        state.listView.currentPage++;
        renderList();
        document.querySelector('.list-table-wrapper').scrollTop = 0;
        
        // Trigger progressive SLA loading for new page
        const startIdx = (state.listView.currentPage - 1) * state.listView.pageSize;
        const endIdx = startIdx + state.listView.pageSize;
        const pageIssues = state.issues.slice(startIdx, endIdx);
        loadSLAForListView(pageIssues);
      }
    });
  }
  
  // Load More from Server button
  const loadMoreBtn = document.getElementById('loadMoreServerBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', async () => {
      const serverPagination = state.pagination[state.currentQueue];
      if (!serverPagination || !serverPagination.hasMore) return;
      
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = '⏳ Loading...';
      
      try {
        const nextPage = serverPagination.currentPage + 1;
        console.log(`📦 Loading page ${nextPage} from server...`);
        
        // Load next page and append to current issues
        await loadIssuesPage(state.currentQueue, nextPage);
        
        // Render updated view
        renderList();
      } catch (error) {
        console.error('❌ Failed to load more tickets:', error);
        showNotification('Failed to load more tickets', 'error');
      } finally {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = '📦 Load More Tickets (100 more)';
      }
    });
  }
  
  // View details buttons
  document.querySelectorAll('.btn-view-details').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const issueKey = btn.getAttribute('data-issue-key');
      if (window.openIssueDetails) {
        window.openIssueDetails(issueKey);
      }
    });
  });
  
  // Row click to view details
  document.querySelectorAll('.issue-row').forEach(row => {
    row.addEventListener('click', (e) => {
      // Don't trigger if clicking on buttons or assignee edit
      if (!e.target.closest('.btn-view-details') && 
          !e.target.closest('.list-transition-trigger') &&
          !e.target.closest('.col-assignee')) {
        const issueKey = row.getAttribute('data-issue-key');
        if (window.openIssueDetails) {
          window.openIssueDetails(issueKey);
        }
      }
    });
  });
  
  // Assignee edit toggle checkbox
  const editToggle = document.getElementById('enableAssigneeEdit');
  if (editToggle) {
    editToggle.addEventListener('change', async (e) => {
      const isEnabled = e.target.checked;
      
      // Refetch users from DB when enabling edit mode (always get fresh data)
      if (isEnabled) {
        console.log('🔄 Fetching latest users from DB...');
        try {
          const response = await fetch('/api/users');
          if (response.ok) {
            window.cachedUsers = await response.json();
            console.log('✅ Users loaded from DB:', window.cachedUsers.length);
          }
        } catch (error) {
          console.error('Error loading users:', error);
        }
      }
      
      document.querySelectorAll('.col-assignee').forEach(cell => {
        if (isEnabled) {
          cell.classList.add('edit-mode');
          // Store original value in data attribute
          const input = cell.querySelector('.assignee-edit-input');
          const display = cell.querySelector('.assignee-display');
          if (input && display) {
            input.dataset.originalValue = display.textContent.trim();
          }
        } else {
          cell.classList.remove('edit-mode');
          // Restore original value if not changed
          const input = cell.querySelector('.assignee-edit-input');
          const display = cell.querySelector('.assignee-display');
          if (input && display && input.dataset.originalValue) {
            input.value = input.dataset.originalValue;
            display.textContent = input.dataset.originalValue;
          }
          // Close any open autocomplete
          const autocomplete = document.querySelector('.assignee-autocomplete');
          if (autocomplete) autocomplete.remove();
        }
      });
    });
  }
  
  // Pre-load users when edit mode is enabled
  const editToggleCheckbox = document.getElementById('enableAssigneeEdit');
  if (editToggleCheckbox && editToggleCheckbox.checked && !window.cachedUsers) {
    // Load users in background
    fetch('/api/users').then(response => {
      if (response.ok) {
        return response.json();
      }
    }).then(users => {
      window.cachedUsers = users;
      console.log('✅ Users pre-loaded:', users.length);
    }).catch(error => {
      console.error('Error pre-loading users:', error);
    });
  }
  
  // Assignee input handling
  document.querySelectorAll('.assignee-edit-input').forEach(input => {
    let autocompleteDiv = null;
    let selectedIndex = -1;
    let allUsers = [];
    
    // Store original value on focus
    input.addEventListener('focus', (e) => {
      const display = e.target.closest('.col-assignee').querySelector('.assignee-display');
      if (display) {
        input.dataset.originalValue = display.textContent.trim();
      }
    });
    
    input.addEventListener('click', async (e) => {
      // Don't create duplicate autocomplete
      if (autocompleteDiv) return;
      
      // Create autocomplete dropdown
      autocompleteDiv = document.createElement('div');
      autocompleteDiv.className = 'assignee-autocomplete';
      
      // Position it below the input
      const rect = input.getBoundingClientRect();
      autocompleteDiv.style.top = `${rect.bottom + 2}px`;
      autocompleteDiv.style.left = `${rect.left}px`;
      autocompleteDiv.style.width = `${rect.width}px`;
      
      document.body.appendChild(autocompleteDiv);
      
      // Check if users are cached
      if (window.cachedUsers) {
        allUsers = window.cachedUsers;
        filterAndDisplayUsers(input.value);
      } else {
        autocompleteDiv.innerHTML = '<div class="assignee-loading">Loading users...</div>';
        
        // Fetch users if not cached
        try {
          const response = await fetch('/api/users');
          if (response.ok) {
            window.cachedUsers = await response.json();
            allUsers = window.cachedUsers;
            filterAndDisplayUsers(input.value);
          }
        } catch (error) {
          console.error('Error fetching users:', error);
          autocompleteDiv.innerHTML = '<div class="assignee-loading">Error loading users</div>';
          return;
        }
      }
    });
    
    input.addEventListener('input', (e) => {
      filterAndDisplayUsers(e.target.value);
    });
    
    input.addEventListener('keydown', (e) => {
      const items = autocompleteDiv ? autocompleteDiv.querySelectorAll('.assignee-autocomplete-item') : [];
      
      if (e.key === 'ArrowDown' && autocompleteDiv) {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items);
      } else if (e.key === 'ArrowUp' && autocompleteDiv) {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection(items);
      } else if (e.key === 'Enter' && autocompleteDiv) {
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          items[selectedIndex].click();
        }
      } else if (e.key === 'Escape') {
        // Restore original value
        if (input.dataset.originalValue) {
          input.value = input.dataset.originalValue;
          const display = input.closest('.col-assignee').querySelector('.assignee-display');
          if (display) {
            display.textContent = input.dataset.originalValue;
          }
        }
        
        // Close autocomplete
        if (autocompleteDiv) {
          autocompleteDiv.remove();
          autocompleteDiv = null;
        }
        
        input.blur();
      }
    });
    
    input.addEventListener('blur', (e) => {
      // Delay to allow click on autocomplete item
      setTimeout(() => {
        if (autocompleteDiv) {
          // Restore original value if nothing was selected
          if (input.value !== input.dataset.originalValue) {
            const cell = input.closest('.col-assignee');
            const issue = state.issues.find(i => i.key === cell.dataset.issueKey);
            if (issue && input.value !== issue.assignee) {
              // Value was manually typed but not from autocomplete, restore original
              input.value = input.dataset.originalValue;
            }
          }
          
          autocompleteDiv.remove();
          autocompleteDiv = null;
        }
      }, 200);
    });
    
    function filterAndDisplayUsers(query) {
      if (!autocompleteDiv) return;
      
      const filtered = allUsers.filter(user => {
        const searchStr = `${user.displayName} ${user.emailAddress}`.toLowerCase();
        return searchStr.includes(query.toLowerCase());
      }).slice(0, 10); // Limit to 10 results
      
      if (filtered.length === 0) {
        autocompleteDiv.innerHTML = '<div class="assignee-loading">No users found</div>';
        return;
      }
      
      autocompleteDiv.innerHTML = filtered.map(user => `
        <div class="assignee-autocomplete-item" data-account-id="${user.accountId}" data-display-name="${escapeHtml(user.displayName)}">
          <strong>${escapeHtml(user.displayName)}</strong><br>
          <small style="color: #64748b;">${escapeHtml(user.emailAddress || '')}</small>
        </div>
      `).join('');
      
      selectedIndex = -1;
      
      // Add click handlers
      autocompleteDiv.querySelectorAll('.assignee-autocomplete-item').forEach(item => {
        item.addEventListener('mousedown', async (e) => {
          e.preventDefault(); // Prevent blur event
          const accountId = item.getAttribute('data-account-id');
          const displayName = item.getAttribute('data-display-name');
          const issueKey = input.getAttribute('data-issue-key');
          
          // Mark as user-selected (to prevent restoration)
          input.dataset.userSelected = 'true';
          
          await updateAssignee(issueKey, accountId, displayName, input);
          
          if (autocompleteDiv) {
            autocompleteDiv.remove();
            autocompleteDiv = null;
          }
        });
      });
    }
    
    function updateSelection(items) {
      items.forEach((item, idx) => {
        if (idx === selectedIndex) {
          item.classList.add('selected');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('selected');
        }
      });
    }
  });
}

async function updateAssignee(issueKey, accountId, displayName, inputElement) {
  const cell = inputElement.closest('.col-assignee');
  const displaySpan = cell.querySelector('.assignee-display');
  
  // Show loading state
  inputElement.disabled = true;
  inputElement.value = 'Updating...';
  
  try {
    const response = await fetch(`/api/issues/${issueKey}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          assignee: { accountId: accountId }
        }
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update assignee');
    }
    
    // Update UI
    inputElement.value = displayName;
    displaySpan.textContent = displayName;
    
    // Update state
    const issue = state.issues.find(i => i.key === issueKey);
    if (issue) {
      issue.assignee = displayName;
      if (issue.fields) {
        issue.fields.assignee = { displayName: displayName, accountId: accountId };
      }
    }
    
    // Check if we need to remove from current view (Assigned to me queue)
    const currentUser = state.currentUser;
    if (currentUser && displayName !== currentUser) {
      // Get current queue name from select element
      const queueSelect = document.getElementById('queueSelect');
      const queueName = queueSelect ? queueSelect.options[queueSelect.selectedIndex]?.text || '' : '';
      
      // If this is "Assigned to me" queue, remove the ticket
      if (queueName.toLowerCase().includes('assigned to me') || 
          queueName.toLowerCase().includes('asignados a mí') ||
          queueName.toLowerCase().includes('mis tickets')) {
        // Remove from state
        state.issues = state.issues.filter(i => i.key !== issueKey);
        state.filteredIssues = state.filteredIssues.filter(i => i.key !== issueKey);
        
        // Re-render list
        renderList();
        
        showNotification('✅ Assignee updated. Ticket removed from this queue.', 'success');
        return;
      }
    }
    
    showNotification('✅ Assignee updated successfully', 'success');
    
  } catch (error) {
    console.error('Error updating assignee:', error);
    showNotification('❌ Failed to update assignee', 'error');
    
    // Restore original value
    const issue = state.issues.find(i => i.key === issueKey);
    if (issue) {
      inputElement.value = issue.assignee || 'Unassigned';
    }
  } finally {
    inputElement.disabled = false;
  }
}

/**
 * Setup lazy row rendering based on scroll position
 * Speeds up rendering by only rendering visible + buffer rows
 */
function setupLazyRowRendering() {
  const listContainer = document.querySelector('.list-view-container');
  if (!listContainer) return;
  
  let lastScrollTop = 0;
  let scrollTimeout;
  
  const handleScroll = () => {
    const scrollTop = listContainer.scrollTop;
    const scrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';
    lastScrollTop = scrollTop;
    
    // Debounce scroll events
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      // Check if near bottom (80% scrolled)
      const scrollPercentage = (scrollTop + listContainer.clientHeight) / listContainer.scrollHeight;
      
      if (scrollPercentage > 0.8 && scrollDirection === 'down') {
        // User is near bottom, ensure all rows are rendered
        const tbody = document.getElementById('listViewTbody');
        if (tbody && tbody.dataset.hasMore === 'true') {
          console.log('📜 User scrolling near bottom, ensuring all rows rendered');
        }
      }
    }, 150);
  };
  
  listContainer.addEventListener('scroll', handleScroll, { passive: true });
  
  // Store cleanup function
  if (!window.lazyRenderingCleanup) {
    window.lazyRenderingCleanup = [];
  }
  window.lazyRenderingCleanup.push(() => {
    listContainer.removeEventListener('scroll', handleScroll);
  });
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return escapeHtml(text);
  return escapeHtml(text.substring(0, maxLength)) + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
 * Show tooltip on first load to guide user about save button
 */
function showFirstTimeTooltip() {
  console.log('🔍 showFirstTimeTooltip called');
  const hasSeenTooltip = sessionStorage.getItem('speedyflow_seen_save_tooltip');
  console.log('   hasSeenTooltip:', hasSeenTooltip);
  
  if (!hasSeenTooltip) {
    const saveBtn = document.getElementById('saveFiltersBtn');
    console.log('   saveBtn found:', !!saveBtn);
    if (!saveBtn) {
      console.warn('⚠️ Save button not found!');
      return;
    }
    
    // Wait for page to settle
    setTimeout(() => {
      const tooltip = document.createElement('div');
      tooltip.id = 'first-time-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.zIndex = '999999';
      tooltip.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      tooltip.style.color = 'white';
      tooltip.style.padding = '16px 20px';
      tooltip.style.borderRadius = '12px';
      tooltip.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.5)';
      tooltip.style.width = '360px';
      tooltip.style.fontSize = '14px';
      tooltip.style.lineHeight = '1.6';
      tooltip.style.display = 'block';
      tooltip.style.transition = 'top 0.2s ease, left 0.2s ease';
      
      tooltip.innerHTML = `
        <div style="position: absolute; top: -8px; right: 20px; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 10px solid #667eea;"></div>
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <strong style="font-size: 15px;">💡 Consejo Útil</strong>
          <button id="tooltip-close" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 18px; line-height: 1; padding: 0;">×</button>
        </div>
        <p style="margin: 0;">Si los filtros predeterminados no son correctos, <strong>escoge tus filtros preferidos</strong> y presiona este botón para guardarlos como tus valores por defecto.</p>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2);">
          <small>✨ Esto actualiza tu configuración en el servidor</small>
        </div>
      `;
      
      document.body.appendChild(tooltip);
      
      // Function to update tooltip position relative to button
      const updateTooltipPosition = () => {
        const btnRect = saveBtn.getBoundingClientRect();
        tooltip.style.top = `${btnRect.bottom + 10}px`;
        tooltip.style.left = `${btnRect.right - 360}px`;
      };
      
      // Initial position
      updateTooltipPosition();
      console.log('✅ Tooltip positioned relative to button');
      
      // Update position on window resize or scroll
      const repositionHandler = () => updateTooltipPosition();
      window.addEventListener('resize', repositionHandler);
      window.addEventListener('scroll', repositionHandler, true); // useCapture for all scrolls
      
      const closeBtn = document.getElementById('tooltip-close');
      const closeTooltip = () => {
        tooltip.remove();
        window.removeEventListener('resize', repositionHandler);
        window.removeEventListener('scroll', repositionHandler, true);
        sessionStorage.setItem('speedyflow_seen_save_tooltip', 'true');
      };
      
      closeBtn.addEventListener('click', closeTooltip);
      setTimeout(closeTooltip, 15000);
    }, 2000);
  }
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
  
  // 🔄 Save to backend as user defaults
  // Extract project_key from current desk's queues JQL
  let projectKey = state.userProjectKey;
  
  if (!projectKey && state.desks && deskId) {
    const currentDesk = state.desks.find(d => d.id === deskId);
    if (currentDesk && currentDesk.queues && currentDesk.queues.length > 0) {
      // Try to find project key in any queue's JQL
      for (const queue of currentDesk.queues) {
        if (queue.jql) {
          const match = queue.jql.match(/project\s*=\s*([A-Z]+)/i);
          if (match) {
            projectKey = match[1];
            console.log(`✅ Extracted project key from JQL: ${projectKey}`);
            break;
          }
        }
      }
    }
  }
  
  // Fallback to MSM if still not found
  if (!projectKey) {
    projectKey = 'MSM';
    console.warn('⚠️ Using fallback project key: MSM');
  }
  
  console.log('💾 Saving to backend as defaults...', { projectKey, deskId, queueId });
  fetch('/api/user/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_key: projectKey,
      desk_id: deskId,
      queue_id: queueId
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Backend defaults updated successfully');
    } else {
      console.warn('⚠️ Failed to update backend defaults:', data.error);
    }
  })
  .catch(error => {
    console.error('❌ Error updating backend defaults:', error);
  });
  
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

/**
 * Sort issues array by field and direction
 */
function sortIssues(issues, sortBy, sortDir) {
  const sorted = [...issues].sort((a, b) => {
    let valA, valB;
    
    switch(sortBy) {
      case 'key':
        valA = a.key || '';
        valB = b.key || '';
        break;
      case 'summary':
        valA = (a.summary || a.fields?.summary || '').toLowerCase();
        valB = (b.summary || b.fields?.summary || '').toLowerCase();
        break;
      case 'status':
        valA = (a.status || a.fields?.status?.name || '').toLowerCase();
        valB = (b.status || b.fields?.status?.name || '').toLowerCase();
        break;
      case 'severity':
        const severityOrder = { 'critico': 4, 'critical': 4, 'mayor': 3, 'major': 3, 'menor': 2, 'minor': 2 };
        const sevA = (a.severity || a.customfield_10125?.value || '').toLowerCase();
        const sevB = (b.severity || b.customfield_10125?.value || '').toLowerCase();
        valA = severityOrder[sevA] || 1;
        valB = severityOrder[sevB] || 1;
        break;
      case 'assignee':
        valA = (a.assignee || a.fields?.assignee?.displayName || 'Unassigned').toLowerCase();
        valB = (b.assignee || b.fields?.assignee?.displayName || 'Unassigned').toLowerCase();
        break;
      case 'created':
        valA = new Date(a.created || a.fields?.created || 0).getTime();
        valB = new Date(b.created || b.fields?.created || 0).getTime();
        break;
      default:
        return 0;
    }
    
    // Compare values
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}

/**
 * Load SLA data for issues in list view with progressive loading strategy
 */
async function loadSLAForListView(issues) {
  if (!issues || issues.length === 0) return;
  
  // Throttle SLA fetches to once every 3 minutes
  const now = Date.now();
  const THREE_MINUTES = 3 * 60 * 1000;
  if (state.listView.lastSlaFetch && (now - state.listView.lastSlaFetch) < THREE_MINUTES) {
    console.log('⏳ SLA fetch throttled (3 min cooldown)');
    return;
  }
  
  // Filter out already loaded issues
  const issuesToLoad = issues.filter(issue => !state.listView.slaLoadedKeys.has(issue.key));
  if (issuesToLoad.length === 0) {
    console.log('✅ All visible SLAs already loaded');
    return;
  }
  
  // Progressive loading strategy based on current page
  let loadCount;
  if (state.listView.currentPage === 1) {
    // First page: load first 20 immediately
    loadCount = Math.min(20, issuesToLoad.length);
    console.log(`🔄 Loading first ${loadCount} SLAs immediately...`);
  } else if (state.listView.currentPage === 2) {
    // Second page: load next 20
    loadCount = Math.min(20, issuesToLoad.length);
    console.log(`🔄 Loading next ${loadCount} SLAs (page 2)...`);
  } else {
    // Page 3+: load 30 at a time
    loadCount = Math.min(30, issuesToLoad.length);
    console.log(`🔄 Loading ${loadCount} SLAs (page ${state.listView.currentPage})...`);
  }
  
  const issuesToFetch = issuesToLoad.slice(0, loadCount);
  state.listView.lastSlaFetch = now;
  
  // Load SLA data in batches of 10 to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < issuesToFetch.length; i += batchSize) {
    const batch = issuesToFetch.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (issue) => {
      try {
        const slaElement = document.getElementById(`sla-${issue.key}`);
        if (!slaElement) return;
        
        const response = await fetch(`/api/issues/${issue.key}/sla`);
        if (!response.ok) {
          slaElement.innerHTML = '<span class="sla-none">-</span>';
          state.listView.slaLoadedKeys.add(issue.key);
          return;
        }
        
        const data = await response.json();
        if (!data.success || !data.data || !data.data.cycles || data.data.cycles.length === 0) {
          slaElement.innerHTML = '<span class="sla-none">-</span>';
          state.listView.slaLoadedKeys.add(issue.key);
          return;
        }
        
        const cycle = data.data.cycles[0];
        const isSecondary = data.data.is_secondary || false;
        const slaName = cycle.name || 'SLA';
        
        let slaHtml = '';
        let statusClass = '';
        let statusIcon = '';
        let statusLabel = '';
        
        if (cycle.breached) {
          statusClass = 'sla-badge-breached';
          statusIcon = '🔴';
          statusLabel = 'Breached';
        } else if (cycle.paused) {
          statusClass = 'sla-badge-paused';
          statusIcon = '🔵';
          statusLabel = 'Paused';
        } else if (cycle.remaining_time) {
          const remaining = cycle.remaining_time;
          
          // Determine status based on remaining time
          if (remaining.includes('m') && !remaining.includes('h')) {
            // Less than an hour remaining
            statusClass = 'sla-badge-warning';
            statusIcon = '🟡';
            statusLabel = remaining;
          } else if (remaining.includes('h')) {
            const hours = parseInt(remaining);
            if (hours < 2) {
              statusClass = 'sla-badge-warning';
              statusIcon = '🟡';
              statusLabel = remaining;
            } else {
              statusClass = 'sla-badge-healthy';
              statusIcon = '🟢';
              statusLabel = remaining;
            }
          } else {
            statusClass = 'sla-badge-healthy';
            statusIcon = '🟢';
            statusLabel = remaining;
          }
        } else {
          slaElement.innerHTML = '<span class="sla-none">-</span>';
          state.listView.slaLoadedKeys.add(issue.key);
          return;
        }
        
        // Create SLA badge with name and status
        slaHtml = `
          <div class="sla-badge-container">
            <div class="sla-badge ${statusClass}" title="${slaName} - ${statusLabel}">
              <span class="sla-icon">${statusIcon}</span>
              <span class="sla-name">${slaName}</span>
            </div>
            <div class="sla-time ${statusClass}">${statusLabel}</div>
          </div>
        `;
        
        slaElement.innerHTML = slaHtml;
        state.listView.slaLoadedKeys.add(issue.key);
        state.listView.slaLoadedCount++;
        
      } catch (error) {
        console.error(`❌ Error loading SLA for ${issue.key}:`, error);
        const slaElement = document.getElementById(`sla-${issue.key}`);
        if (slaElement) {
          const errorIcon = typeof SVGIcons !== 'undefined' 
            ? SVGIcons.alert({ size: 14, className: 'inline-icon' })
            : '⚠️';
          slaElement.innerHTML = `<span class="sla-error" title="Error loading SLA">${errorIcon}</span>`;
        }
        state.listView.slaLoadedKeys.add(issue.key);
      }
    }));
    
    // Delay between batches (200ms to be gentle on API)
    if (i + batchSize < issuesToFetch.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`✅ SLA data loaded: ${issuesToFetch.length} issues (Total: ${state.listView.slaLoadedCount})`);
}

// Export openIssueDetails to global scope for onclick handlers
window.openIssueDetails = openIssueDetails;

/**
 * Warm up Ollama model in background for faster suggestions
 * First call always takes longer, this preloads the model
 */
async );
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama warmed up:', data.message);
    } else {
      console.warn('⚠️ Ollama warmup failed (not critical)');
    }
  } catch (error) {
    // Non-blocking: if warmup fails, suggestions will just take longer on first call
    console.warn('⚠️ Ollama warmup error (not critical):', error.message);
  }
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Add to body
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Refetch users from database (global utility)
 */
async function refetchUsers() {
  console.log('🔄 Refetching users from database...');
  try {
    const response = await fetch('/api/users');
    if (response.ok) {
      window.cachedUsers = await response.json();
      console.log('✅ Users refetched from DB:', window.cachedUsers.length);
      return window.cachedUsers;
    }
  } catch (error) {
    console.error('❌ Error refetching users:', error);
  }
  return null;
}

// Export to global scope
window.refetchUsers = refetchUsers;
