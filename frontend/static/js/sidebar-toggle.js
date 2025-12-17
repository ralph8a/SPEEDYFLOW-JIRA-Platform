/**
 * SPEEDYFLOW - Sidebar Toggle Controller
 * Manejo de expansión/colapso del sidebar con modo iconos
 */
const sidebarToggleState = {
  isExpanded: true
};
// ===== INITIALIZE SIDEBAR TOGGLE =====
function initSidebarToggle() {
  const sidebarComponent = document.querySelector('.sidebar-content-component');
  const toggleBtn = document.querySelector('#sidebarToggleBtn');
  if (!sidebarComponent || !toggleBtn) return;
  // Event listener
  toggleBtn.addEventListener('click', toggleSidebar);
}
// ===== TOGGLE SIDEBAR =====
function toggleSidebar() {
  const sidebarHeader = document.querySelector('.sidebar-header-component');
  const sidebarAction = document.getElementById('sidebarActionComponent');
  const sidebarContent = document.querySelector('.sidebar-content-component');
  if (!sidebarHeader || !sidebarContent) return;
  sidebarToggleState.isExpanded = !sidebarToggleState.isExpanded;
  localStorage.setItem('sidebarExpanded', sidebarToggleState.isExpanded);
  if (sidebarToggleState.isExpanded) {
    // Expand
    sidebarHeader.classList.remove('collapsed');
    if (sidebarAction) sidebarAction.classList.remove('collapsed');
    sidebarContent.classList.remove('collapsed');
  } else {
    // Collapse (show icons only)
    sidebarHeader.classList.add('collapsed');
    if (sidebarAction) sidebarAction.classList.add('collapsed');
    sidebarContent.classList.add('collapsed');
  }
  // Trigger layout recalculation
  window.dispatchEvent(new Event('sidebarToggled'));
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
