/**
 * SPEEDYFLOW - Sidebar Toggle Controller
 * Manejo de expansión/colapso del sidebar
 */

const sidebarToggleState = {
  isExpanded: true
};

// ===== INITIALIZE SIDEBAR TOGGLE =====
function initSidebarToggle() {
  // Sidebar toggle disabled - visual only
  console.log('Sidebar toggle disabled - visual only');
}

// ===== TOGGLE SIDEBAR =====
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const toggleIcon = document.querySelector('.toggle-icon');

  sidebarToggleState.isExpanded = !sidebarToggleState.isExpanded;
  localStorage.setItem('sidebarExpanded', sidebarToggleState.isExpanded);

  if (sidebarToggleState.isExpanded) {
    // Expand
    sidebar.style.width = 'var(--sidebar-width)';
    sidebar.style.minWidth = 'var(--sidebar-width)';
    toggleIcon.textContent = '◀';
    sidebar.classList.remove('collapsed');
  } else {
    // Collapse
    sidebar.style.width = '60px';
    sidebar.style.minWidth = '60px';
    toggleIcon.textContent = '▶';
    sidebar.classList.add('collapsed');
  }

  // Animate icon
  toggleIcon.style.transform = sidebarToggleState.isExpanded ? 'rotateY(0)' : 'rotateY(180deg)';
}

// ===== RESTORE SIDEBAR STATE =====
function restoreSidebarState() {
  const isExpanded = localStorage.getItem('sidebarExpanded') !== 'false';
  
  if (!isExpanded) {
    sidebarToggleState.isExpanded = true;
    toggleSidebar();
  }
}

// ===== EXPORT FOR USE =====
window.sidebarToggle = {
  init: initSidebarToggle,
  toggle: toggleSidebar,
  restore: restoreSidebarState
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initSidebarToggle();
    restoreSidebarState();
  }, 100);
});
