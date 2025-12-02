/**
 * SPEEDYFLOW - Enhanced Header Interactions
 * Menús desplegables, theme bubble y user menu
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
  const userMenuBtn = document.getElementById('userMenuBtn');
  
  if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showProfileModal();
    });
    console.log('✓ User profile button enabled');
  }
  
  // Update user info for display only
  updateUserInfo();
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

function showSettingsModal() {
  alert('Settings panel - Coming soon ⚙️');
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
  // TODO: Implementar panel de notificaciones
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
    const userDropdown = document.getElementById('userDropdown');
    const userMenuBtn = document.getElementById('userMenuBtn');

    // Close user menu (if implemented)
    if (userDropdown && userMenuBtn && 
        !userDropdown.contains(e.target) && 
        !userMenuBtn.contains(e.target)) {
      userDropdown.style.display = 'none';
    }
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
