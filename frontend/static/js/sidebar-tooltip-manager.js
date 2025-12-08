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
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        color: #374151;
        text-shadow: none;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        display: none;
        transition: all 0.2s ease;
        z-index: 999999;
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        pointer-events: none;
        min-width: 120px;
        text-align: center;
      `;
      
      document.body.appendChild(tooltip);

      // Show tooltip on hover
      item.addEventListener('mouseenter', (e) => {
        if (!sidebar.classList.contains('collapsed')) return;
        
        // Apply dark theme styles if needed
        const isDark = document.body.getAttribute('data-theme') === 'dark' || 
                      document.body.classList.contains('theme-dark');
        if (isDark) {
          tooltip.style.background = 'rgba(0, 0, 0, 0.95)';
          tooltip.style.color = 'rgba(255, 255, 255, 0.95)';
          tooltip.style.border = '1px solid rgba(255, 255, 255, 0.2)';
          tooltip.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.5)';
        } else {
          tooltip.style.background = 'rgba(255, 255, 255, 0.98)';
          tooltip.style.color = '#374151';
          tooltip.style.border = '1px solid rgba(0, 0, 0, 0.08)';
          tooltip.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
        }
        
        const rect = item.getBoundingClientRect();
        const tooltipLeft = rect.right + 15;
        const tooltipTop = rect.top + (rect.height / 2);
        
        tooltip.style.left = tooltipLeft + 'px';
        tooltip.style.top = tooltipTop + 'px';
        tooltip.style.transform = 'translateY(-50%)';
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
        tooltip.classList.add('show');
        
        console.log(`🎯 Showing tooltip for: ${item.getAttribute('data-tooltip')} at ${tooltipLeft}, ${tooltipTop}`);
      });

      // Hide tooltip on leave
      item.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
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