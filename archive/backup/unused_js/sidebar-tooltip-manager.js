/**
 * SPEEDYFLOW - Sidebar Tooltip Manager
 * Gestiona dinámicamente los tooltips de la sidebar colapsada
 */
class SidebarTooltipManager {
  constructor() {
    this.init();
  }
  init() {
    console.log('🎯 Initializing Sidebar Tooltip Manager...');
    this.setupTooltipEvents();
  }
  setupTooltipEvents() {
    // Observar cambios en la sidebar para detectar estado colapsado
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    // Añadir event listeners para tooltips dinámicos
    const menuItems = document.querySelectorAll('.sidebar-menu-item[data-tooltip]');
    menuItems.forEach(item => {
      // Crear tooltip dinámico
      const tooltip = document.createElement('div');
      tooltip.className = 'sidebar-tooltip-dynamic';
      tooltip.textContent = item.getAttribute('data-tooltip');
      tooltip.style.cssText = `
        position: fixed;
        background: var(--glass-bg-overlay);
        backdrop-filter: var(--glass-blur-heavy);
        -webkit-backdrop-filter: var(--glass-blur-heavy);
        color: var(--text-primary);
        text-shadow: none;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 99999;
        border: var(--glass-border-medium);
        box-shadow: var(--glass-shadow-heavy);
        pointer-events: none;
        min-width: 120px;
        text-align: center;
      `;
      document.body.appendChild(tooltip);
      // Show tooltip on hover
      item.addEventListener('mouseenter', (e) => {
        if (!sidebar.classList.contains('collapsed')) return;
        const rect = item.getBoundingClientRect();
        const tooltipLeft = rect.right + 15;
        const tooltipTop = rect.top + (rect.height / 2);
        tooltip.style.left = tooltipLeft + 'px';
        tooltip.style.top = tooltipTop + 'px';
        tooltip.style.transform = 'translateY(-50%)';
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
        tooltip.classList.add('show');
        console.log(`🎯 Showing tooltip for: ${item.getAttribute('data-tooltip')} at ${tooltipLeft}, ${tooltipTop}`);
      });
      // Hide tooltip on leave
      item.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
        tooltip.classList.remove('show');
      });
    });
    console.log(`✅ Tooltip Manager initialized for ${menuItems.length} menu items`);
  }
}
// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => new SidebarTooltipManager(), 100);
  });
} else {
  setTimeout(() => new SidebarTooltipManager(), 100);
}
