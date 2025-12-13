/**
 * SPEEDYFLOW - Header Menu Controller
 * Manages header bar interactions: dropdown menus, theme toggle, user menu, notifications
 * 
 * IMPORTANT: Uses ThemeManager (centralized theme control) to avoid conflicts
 */

// ===== INITIALIZE FLOATING CONTROLS =====
function initHeaderMenus() {
  setupThemeToggleButton();
  setupUserMenu();
  setupNotifications();
  closeDropDownMenusOnClickOutside();
  console.log('✓ Floating controls initialized');
}

// ===== THEME TOGGLE BUTTON =====
function setupThemeToggleButton() {
  const themeBtn = document.getElementById('themeToggleBtn');
  
  if (themeBtn) {
    // Direct theme toggle on button click
    themeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Get current theme from ThemeManager or body class
      let currentTheme = 'light';
      if (window.ThemeManager && window.ThemeManager.currentTheme) {
        currentTheme = window.ThemeManager.currentTheme;
      } else if (document.body.classList.contains('theme-dark')) {
        currentTheme = 'dark';
      }
      
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      // Use ThemeManager if available (recommended)
      if (window.ThemeManager) {
        window.ThemeManager.setTheme(newTheme);
      } else {
        // Fallback: manual application
        document.documentElement.classList.remove('theme-light', 'theme-dark');
        document.body.classList.remove('theme-light', 'theme-dark');
        document.documentElement.classList.add(`theme-${newTheme}`);
        document.body.classList.add(`theme-${newTheme}`);
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // Save to localStorage
        localStorage.setItem('theme', newTheme);
        localStorage.setItem('currentTheme', newTheme);
        
        // Trigger theme change event
        window.dispatchEvent(new CustomEvent('themeChange', { detail: { theme: newTheme } }));
      }
      
      // Update transparency manager if available
      if (window.transparencyManager) {
        window.transparencyManager.currentTheme = newTheme;
        window.transparencyManager.applyTransparency();
      }
      
      // Update background manager if available
      if (window.backgroundManager) {
        window.backgroundManager.onThemeChange(newTheme);
      }
      
      console.log(`🎨 Theme switched to: ${newTheme}`);
    });
    
    console.log('✓ Theme toggle button enabled');
  }
}

// ===== USER MENU =====
function setupUserMenu() {
  // Setup header account buttons
  const headerUserMenuBtn = document.getElementById('headerUserMenuBtn');
  const headerSettingsBtn = document.getElementById('headerSettingsBtn');
  const headerHelpBtn = document.getElementById('headerHelpBtn');
  
  if (headerUserMenuBtn) {
    headerUserMenuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showProfileModal();
    });
    console.log('✓ Header profile button enabled');
  }

  if (headerSettingsBtn) {
    headerSettingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showSettingsModal();
    });
    console.log('✓ Header settings button enabled');
  }

  if (headerHelpBtn) {
    headerHelpBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showHelpModal();
    });
    console.log('✓ Header help button enabled');
  }
  
  // Update user info for display only
  updateUserInfo();
}

function showSettingsModal() {
  let panel = document.getElementById('settingsPanel');
  
  if (!panel) {
    panel = createSettingsPanel();
    document.body.appendChild(panel);
  }
  
  panel.style.display = 'flex';
  setTimeout(() => panel.classList.add('active'), 10);
  
  // Load current settings
  loadSettings();
}

function createSettingsPanel() {
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
            <div class="font-customization-section" style="margin-top: 24px;">
              <h4>Font Family</h4>
              <p class="section-description" style="font-size: 13px; opacity: 0.7; margin-bottom: 12px;">Choose a font combination that matches your workflow and aesthetic preferences.</p>
              <div id="fontPresetSelector"></div>
            </div>
            
            <div class="setting-item" style="margin-top: 20px;">
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
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').classList.remove('active'); setTimeout(() => this.closest('.modal-overlay').style.display='none', 300)">Cancel</button>
        <button class="btn-primary" onclick="saveSettingsFromModal()">Save Changes</button>
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

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
  
  // General
  if (settings.autoRefresh !== undefined) {
    const el = document.getElementById('autoRefresh');
    if (el) el.checked = settings.autoRefresh;
  }
  if (settings.refreshInterval) {
    const el = document.getElementById('refreshInterval');
    if (el) el.value = settings.refreshInterval;
  }
  if (settings.defaultView) {
    const el = document.getElementById('defaultView');
    if (el) el.value = settings.defaultView;
  }
  
  // Appearance
  if (settings.theme) {
    const el = document.getElementById('themeSelect');
    if (el) el.value = settings.theme;
  }
  if (settings.compactMode !== undefined) {
    const el = document.getElementById('compactMode');
    if (el) el.checked = settings.compactMode;
  }
  if (settings.showAvatars !== undefined) {
    const el = document.getElementById('showAvatars');
    if (el) el.checked = settings.showAvatars;
  }
  if (settings.animationSpeed) {
    const el = document.getElementById('animationSpeed');
    if (el) el.value = settings.animationSpeed;
  }
  
  // Notifications
  if (settings.enableNotifications !== undefined) {
    const el = document.getElementById('enableNotifications');
    if (el) el.checked = settings.enableNotifications;
  }
  if (settings.soundEnabled !== undefined) {
    const el = document.getElementById('soundEnabled');
    if (el) el.checked = settings.soundEnabled;
  }
  if (settings.notifyAssigned !== undefined) {
    const el = document.getElementById('notifyAssigned');
    if (el) el.checked = settings.notifyAssigned;
  }
  if (settings.notifyComments !== undefined) {
    const el = document.getElementById('notifyComments');
    if (el) el.checked = settings.notifyComments;
  }
  if (settings.notifyMentions !== undefined) {
    const el = document.getElementById('notifyMentions');
    if (el) el.checked = settings.notifyMentions;
  }
  
  // Advanced
  if (settings.cacheEnabled !== undefined) {
    const el = document.getElementById('cacheEnabled');
    if (el) el.checked = settings.cacheEnabled;
  }
  if (settings.debugMode !== undefined) {
    const el = document.getElementById('debugMode');
    if (el) el.checked = settings.debugMode;
  }
  
  // Initialize Font Selector
  initializeFontSelector();
  
  // Apply saved font preset
  const savedPreset = localStorage.getItem('fontPreset') || 'business';
  applyFontPreset(savedPreset);
}

// ===== FONT FAMILY SYSTEM =====

function initializeFontSelector() {
  const container = document.getElementById('fontPresetSelector');
  if (!container) {
    console.warn('⚠️ Font preset selector container not found');
    return;
  }

  // Generate font preset selector HTML
  container.innerHTML = generateFontPresetHTML();
  
  // Setup event handlers
  setupFontPresetHandlers();
  
  console.log('✅ Font selector initialized');
}

function generateFontPresetHTML() {
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

function setupFontPresetHandlers() {
  const options = document.querySelectorAll('.font-preset-option');
  
  options.forEach(option => {
    option.addEventListener('click', (e) => {
      const presetId = option.getAttribute('data-preset');
      applyFontPreset(presetId);
      
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

function applyFontPreset(presetId) {
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
  logFontAdaptation(presetId);
  
  console.log(`✅ Font preset applied: ${presetId}`);
}

function logFontAdaptation(presetId) {
  const adaptations = {
    'business': 'Segoe UI + Georgia → Aptos + Century (0.95x line-height, +0.005em spacing)',
    'modern': 'Inter + Source Serif Pro → Aptos + Century (1.02x line-height, -0.002em spacing)',
    'corporate': 'IBM Plex + Playfair → Aptos + Century (1.05x line-height, +0.008em spacing)',
    'creative': 'Poppins + Crimson Text → Aptos + Century (1.08x line-height, +0.003em spacing)'
  };

  console.log(`🎨 Font Adaptation: ${adaptations[presetId]}`);
}

function saveSettingsFromModal() {
  const settings = {
    autoRefresh: document.getElementById('autoRefresh')?.checked,
    refreshInterval: document.getElementById('refreshInterval')?.value,
    defaultView: document.getElementById('defaultView')?.value,
    theme: document.getElementById('themeSelect')?.value,
    compactMode: document.getElementById('compactMode')?.checked,
    showAvatars: document.getElementById('showAvatars')?.checked,
    animationSpeed: document.getElementById('animationSpeed')?.value,
    enableNotifications: document.getElementById('enableNotifications')?.checked,
    soundEnabled: document.getElementById('soundEnabled')?.checked,
    notifyAssigned: document.getElementById('notifyAssigned')?.checked,
    notifyComments: document.getElementById('notifyComments')?.checked,
    notifyMentions: document.getElementById('notifyMentions')?.checked,
    cacheEnabled: document.getElementById('cacheEnabled')?.checked,
    debugMode: document.getElementById('debugMode')?.checked
  };
  
  localStorage.setItem('userSettings', JSON.stringify(settings));
  
  // Close modal
  const panel = document.getElementById('settingsPanel');
  if (panel) {
    panel.classList.remove('active');
    setTimeout(() => panel.style.display = 'none', 300);
  }
  
  // Apply theme if changed
  if (settings.theme) {
    document.body.className = settings.theme === 'dark' ? 'theme-dark' : '';
  }
  
  console.log('Settings saved:', settings);
}

function showHelpModal() {
  let modal = document.getElementById('helpModal');
  
  if (!modal) {
    modal = createHelpModal();
    document.body.appendChild(modal);
  }
  
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

function createHelpModal() {
  const modal = document.createElement('div');
  modal.id = 'helpModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container help-modal">
      <div class="modal-header">
        <h2>❔ Help Center</h2>
        <button class="modal-close" onclick="this.closest('.modal-overlay').classList.remove('active'); setTimeout(() => this.closest('.modal-overlay').style.display='none', 300)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="help-section">
          <h3>🚀 Quick Start</h3>
          <ul>
            <li>Select a <strong>Service Desk</strong> from the sidebar dropdown</li>
            <li>Choose a <strong>Queue</strong> to view tickets</li>
            <li>Use the <strong>Kanban Board</strong> to organize tickets by status</li>
            <li>Click on any ticket to view details and add comments</li>
          </ul>
        </div>
        
        <div class="help-section">
          <h3>⌨️ Keyboard Shortcuts</h3>
          <ul>
            <li><kbd>Ctrl</kbd> + <kbd>K</kbd> - Quick search</li>
            <li><kbd>Esc</kbd> - Close modals/panels</li>
            <li><kbd>R</kbd> - Refresh tickets</li>
            <li><kbd>N</kbd> - New ticket</li>
          </ul>
        </div>
        
        <div class="help-section">
          <h3>🎨 Features</h3>
          <ul>
            <li><strong>Quick Triage:</strong> Identifies tickets requiring immediate attention (3+ days old)</li>
            <li><strong>AI Suggestions:</strong> ML-powered insights and field recommendations</li>
            <li><strong>Glassmorphism:</strong> Modern transparent UI with backdrop blur effects</li>
            <li><strong>Real-time Updates:</strong> Auto-refresh to stay synced with JIRA</li>
          </ul>
        </div>
        
        <div class="help-section">
          <h3>📚 Resources</h3>
          <ul>
            <li><a href="https://github.com/speedyflow/docs" target="_blank">Documentation</a></li>
            <li><a href="https://github.com/speedyflow/docs/issues" target="_blank">Report an Issue</a></li>
            <li><a href="mailto:support@speedyflow.com">Contact Support</a></li>
          </ul>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-primary" onclick="this.closest('.modal-overlay').classList.remove('active'); setTimeout(() => this.closest('.modal-overlay').style.display='none', 300)">Got it!</button>
      </div>
    </div>
  `;
  
  return modal;
}

function updateUserInfo() {
  const userName = localStorage.getItem('currentUser') || 'User';
  const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
  const fullName = localStorage.getItem('userFullName') || 'John Doe';

  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');
  const userFullNameEl = document.getElementById('userFullName');

  if (userNameEl) userNameEl.textContent = userName;
  if (userEmailEl) userEmailEl.textContent = userEmail;
  if (userFullNameEl) userFullNameEl.textContent = fullName;

  // Update avatar initials
  const initials = fullName.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  const avatars = document.querySelectorAll('.user-avatar, .user-avatar-large');
  avatars.forEach(avatar => {
    if (initials) avatar.textContent = initials;
  });
}

function handleUserMenuAction(action) {
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes('settings')) {
    console.log('Opening settings...');
    showSettingsModal();
  } else if (actionLower.includes('profile')) {
    console.log('Opening profile...');
    showProfileModal();
  } else if (actionLower.includes('password')) {
    console.log('Opening password change...');
    showPasswordChangeModal();
  } else if (actionLower.includes('help')) {
    console.log('Opening help...');
    window.open('/help', '_blank');
  } else if (actionLower.includes('documentation')) {
    console.log('Opening documentation...');
    window.open('/docs', '_blank');
  }
}

function showProfileModal() {
  // Get user data from state or API
  const userData = window.state?.user || {
    name: 'User',
    email: 'user@example.com',
    role: 'Agent',
    department: 'Support',
    joined: new Date().toISOString()
  };

  // Calculate user stats
  const issues = window.state?.issues || [];
  const userIssues = issues.filter(i => 
    (i.assignee || i.asignado_a || '').toLowerCase().includes(userData.name.toLowerCase())
  );
  const completedIssues = userIssues.filter(i => {
    const status = (i.status || i.estado || '').toLowerCase();
    return status.includes('done') || status.includes('closed') || status.includes('resolved');
  });

  const initials = userData.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const joinDate = new Date(userData.joined).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let modal = document.getElementById('profileModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'profileModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-container profile-modal">
        <div class="modal-header">
          <h2>👤 User Profile</h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').classList.remove('active'); setTimeout(() => this.closest('.modal-overlay').style.display='none', 300)">&times;</button>
        </div>
        <div class="modal-body">
          <div class="profile-content">
            <div class="profile-header">
              <div class="profile-avatar">${initials}</div>
              <div class="profile-info">
                <div class="profile-name">${userData.name}</div>
                <div class="profile-email">${userData.email}</div>
              </div>
            </div>
            
            <div class="profile-field">
              <label>Role</label>
              <div class="profile-field-value">${userData.role}</div>
            </div>
            
            <div class="profile-field">
              <label>Department</label>
              <div class="profile-field-value">${userData.department}</div>
            </div>
            
            <div class="profile-field">
              <label>Member Since</label>
              <div class="profile-field-value">${joinDate}</div>
            </div>
            
            <div class="profile-stats">
              <div class="profile-stat">
                <div class="profile-stat-value">${userIssues.length}</div>
                <div class="profile-stat-label">Assigned</div>
              </div>
              <div class="profile-stat">
                <div class="profile-stat-value">${completedIssues.length}</div>
                <div class="profile-stat-label">Completed</div>
              </div>
              <div class="profile-stat">
                <div class="profile-stat-value">${userIssues.length - completedIssues.length}</div>
                <div class="profile-stat-label">Active</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="showPasswordChangeModal()">🔑 Change Password</button>
          <button class="btn-primary" onclick="this.closest('.modal-overlay').classList.remove('active'); setTimeout(() => this.closest('.modal-overlay').style.display='none', 300)">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    // Update existing modal data
    modal.querySelector('.profile-avatar').textContent = initials;
    modal.querySelector('.profile-name').textContent = userData.name;
    modal.querySelector('.profile-email').textContent = userData.email;
    modal.querySelector('.profile-field-value:nth-of-type(1)').textContent = userData.role;
    modal.querySelector('.profile-field-value:nth-of-type(2)').textContent = userData.department;
    modal.querySelector('.profile-field-value:nth-of-type(3)').textContent = joinDate;
    modal.querySelectorAll('.profile-stat-value')[0].textContent = userIssues.length;
    modal.querySelectorAll('.profile-stat-value')[1].textContent = completedIssues.length;
    modal.querySelectorAll('.profile-stat-value')[2].textContent = userIssues.length - completedIssues.length;
  }

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

function showPasswordChangeModal() {
  alert('Password change - Coming soon 🔑');
}

function logout() {
  if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
    localStorage.clear();
    window.location.href = '/logout';
  }
}

// ===== NOTIFICATIONS =====
function setupNotifications() {
  // Notifications disabled - visual only mode
  console.log('Notifications disabled - visual only');
  // Just show badge count for display
  updateNotificationBadge(3);
}

function updateNotificationBadge(count) {
  const badge = document.querySelector('.notification-badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function showNotificationsPanel() {
  console.log('Notifications panel - Coming soon');
  alert('Notifications panel - Coming soon 🔔');
}

// ===== SEARCH (DISABLED - Not used in current version) =====
/*
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.querySelector('.btn-search');
  
  if (!searchInput) return;

  // Search on enter
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value);
    }
  });

  // Search on button click
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      performSearch(searchInput.value);
    });
  }

  // Real-time filtering (opcional)
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length > 0) {
      filterIssuesRealtime(query);
    } else {
      // Reset to all issues
      if (typeof renderView === 'function') renderView();
    }
  });
}

function performSearch(query) {
  console.log('Searching for:', query);
  if (query.length === 0) {
    renderView();
    return;
  }

  // Filter issues based on search query
  filterIssuesRealtime(query);
}

function filterIssuesRealtime(query) {
  const filtered = state.issues.filter(issue => {
    const key = issue.key?.toLowerCase() || '';
    const summary = (issue.summary || issue.fields?.summary || '').toLowerCase();
    const assignee = (issue.assignee || issue.fields?.assignee?.displayName || '').toLowerCase();
    
    return key.includes(query) || summary.includes(query) || assignee.includes(query);
  });

  // Temporarily replace state.issues for rendering
  const backup = state.issues;
  state.issues = filtered;
  renderView();
  state.issues = backup;
}
*/

// ===== CLOSE DROPDOWNS ON CLICK OUTSIDE =====
function closeDropDownMenusOnClickOutside() {
  document.addEventListener('click', (e) => {
    // Reserved for future dropdown menus if needed
  });
}

// ===== BREADCRUMB UPDATE =====
function updateBreadcrumb(deskName, queueName) {
  const deskBreadcrumb = document.querySelector('.breadcrumb-item:first-of-type');
  const queueBreadcrumb = document.getElementById('queueBreadcrumb');
  
  if (deskBreadcrumb) deskBreadcrumb.textContent = deskName || 'Desk';
  if (queueBreadcrumb) queueBreadcrumb.textContent = queueName || 'Queue';
}

// ===== QUEUE BREADCRUMB SYNC =====
function syncQueueBreadcrumb() {
  const queueSelect = document.getElementById('queueSelect');
  if (queueSelect) {
    const selectedOption = queueSelect.options[queueSelect.selectedIndex];
    if (selectedOption) {
      updateBreadcrumb(
        'Servicios a Cliente',
        selectedOption.textContent
      );
    }
  }
}

// ===== EXPORT FOR USE =====
window.headerMenus = {
  init: initHeaderMenus,
  updateUserInfo,
  updateNotificationBadge,
  updateBreadcrumb,
  syncQueueBreadcrumb
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initHeaderMenus();
  }, 100);
});
