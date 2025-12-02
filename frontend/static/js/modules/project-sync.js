/**
 * Project Sync Module
 * Handles synchronization of all project tickets to local cache
 * for improved AI pattern analysis
 */

class ProjectSync {
  constructor() {
    this.init();
  }

  init() {
    const btn = document.getElementById('syncProjectBtn');
    if (btn) {
      btn.addEventListener('click', () => this.syncMSM());
    }
    
    // Check sync status on load
    this.checkSyncStatus();
    
    // Listen for desk changes to update button label
    this.listenForDeskChanges();
  }
  
  listenForDeskChanges() {
    // Listen for desk selection changes
    const serviceDeskSelect = document.getElementById('serviceDeskSelectFilter');
    if (serviceDeskSelect) {
      serviceDeskSelect.addEventListener('change', () => {
        this.updateButtonLabel();
      });
    }
  }
  
  updateButtonLabel() {
    const btn = document.getElementById('syncProjectBtn');
    if (!btn) return;
    
    const label = btn.querySelector('.label');
    if (!label) return;
    
    // Get current desk name
    if (window.state && window.state.currentDesk) {
      const desk = window.state.desks?.find(d => d.id === window.state.currentDesk);
      if (desk) {
        const deskName = desk.name || desk.displayName || 'Desk';
        // Shorten name if too long
        const shortName = deskName.length > 15 ? deskName.substring(0, 12) + '...' : deskName;
        label.textContent = `Sync ${shortName}`;
        return;
      }
    }
    
    // Default label
    label.textContent = 'Sync Tickets';
  }

  async checkSyncStatus() {
    try {
      const response = await fetch('/api/sync/status/MSM');
      const data = await response.json();
      
      if (data.sync_status && data.sync_status.last_sync_status === 'success') {
        const lastSync = new Date(data.sync_status.last_sync_end);
        const now = new Date();
        const ageHours = (now - lastSync) / 1000 / 3600;
        
        console.log(`📊 MSM cache: ${data.sync_status.total_issues} tickets, last sync ${Math.round(ageHours)}h ago`);
        
        if (data.needs_sync) {
          console.log('⚠️ MSM cache needs refresh (>24h old)');
        }
      } else {
        console.log('📊 MSM cache: No data, sync required');
      }
    } catch (error) {
      console.log('📊 MSM cache: Status check failed');
    }
  }

  async syncMSM() {
    const btn = document.getElementById('syncProjectBtn');
    if (!btn) return;
    
    // Get desk name for display
    let deskName = 'MSM';
    if (window.state && window.state.currentDesk) {
      const desk = window.state.desks?.find(d => d.id === window.state.currentDesk);
      if (desk) {
        deskName = desk.name || desk.displayName || 'Desk seleccionado';
      }
    }
    
    // Update button state
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="icon">⏳</span><span class="label">Sincronizando...</span>';
    
    try {
      console.log(`🔄 Starting ${deskName} project sync...`);
      
      // Get service_desk_id from current state if available
      const body = {};
      if (window.state && window.state.currentDesk) {
        body.service_desk_id = window.state.currentDesk;
        console.log(`📂 Using service desk ID: ${body.service_desk_id}`);
      }
      
      const response = await fetch('/api/sync/project/MSM', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('✅ Sync completed:', data);
      
      // Show success message
      this.showToast(
        `✅ ${deskName} sincronizado`,
        `${data.total_stored} tickets sincronizados. Patrones y embeddings ML generados.`
      );
      
      // Update button
      btn.innerHTML = '<span class="icon">✅</span><span class="label">Sync Tickets</span>';
      
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }, 3000);
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      
      this.showToast(
        `❌ Error en sincronización`,
        `No se pudo sincronizar ${deskName}: ${error.message}`
      );
      
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  }

  showToast(title, message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      max-width: 400px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    toast.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${title}</div>
        <div style="font-size: 13px; color: #64748b;">${message}</div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 5 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
}

// Initialize
if (typeof window !== 'undefined') {
  window.projectSync = new ProjectSync();
  console.log('✅ Project Sync module loaded');
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
