/**
 * SPEEDYFLOW - SLA Monitor System
 * Real-time SLA tracking with live data from JIRA API
 */
class SLAMonitor {
  constructor() {
    this.slaData = {};
    this.currentIssue = null;
    this.refreshInterval = null;
  }

  /**
   * Initialize SLA Monitor for an issue
   */
  async init(issueKey) {
    if (!issueKey) return;

    this.currentIssue = issueKey;

    try {
      console.log(`🔄 Loading SLA data for ${issueKey}...`);
      const response = await fetch(`/api/issues/${issueKey}/sla`);

      if (response.ok) {
        const apiResponse = await response.json();
        console.log(`📥 Raw SLA response for ${issueKey}:`, apiResponse);

        // Extract data from wrapped response
        const slaData = apiResponse.success ? apiResponse.data : apiResponse;

        if (slaData && !slaData.is_default) {
          this.slaData[issueKey] = slaData;
          console.log(`✅ Real SLA data stored for ${issueKey}:`, this.slaData[issueKey]);
        } else {
          console.log(`❌ No real SLA data for ${issueKey}, not showing SLA Monitor`);
          this.slaData[issueKey] = null;
        }
      } else if (response.status === 404) {
        console.log(`ℹ️ No SLA data available for ${issueKey} (404)`);
        this.slaData[issueKey] = null;
      } else {
        console.log(`❌ SLA API error: ${response.status}`);
        this.slaData[issueKey] = null;
      }
    } catch (error) {
      console.error(`❌ Error loading SLA for ${issueKey}:`, error);
      this.slaData[issueKey] = null;
    }

    this.setupRefreshInterval();
    return this.slaData[issueKey];
  }

  /**
   * Render SLA display panel
   */
  renderSLAPanel(issueKey) {
    const slaData = this.slaData[issueKey];

    // If no real SLA data, return an empty container marked hidden for
    // accessibility. Avoid forcing inline `display` styles here so callers
    // (like the Flowing footer) can decide presentation via CSS/classes.
    if (!slaData) {
      console.log(`❌ No SLA data for ${issueKey}, not rendering panel`);
      const container = document.createElement('div');
      container.className = 'sla-panel-empty';
      try { container.setAttribute('aria-hidden', 'true'); } catch (e) { /* ignore */ }
      return container;
    }

    console.log(`🎨 Rendering SLA panel for ${issueKey}:`, slaData);

    const container = document.createElement('div');
    // Remove the outer `.sla-panel` wrapper — render header, cycle and footer directly
    container.className = 'sla-monitor';
    container.id = `sla-monitor-${issueKey}`;

    const cycle = slaData.cycles?.[0] || slaData;
    // Pass is_secondary flag from parent data to cycle
    cycle.is_secondary = slaData.is_secondary || false;
    console.log(`🎯 Using cycle data:`, cycle);

    container.innerHTML = `
      <div class="sla-header">
        <h3 class="sla-title">${SVGIcons.chart({ size: 18, className: 'inline-icon' })} SLA Monitor</h3>
        <button class="sla-refresh-btn" title="Refresh SLA" aria-label="Refresh SLA">
          ${SVGIcons.sync({ size: 16, className: 'sla-refresh-svg' })}
        </button>
      </div>

      <div class="sla-content">
        ${this.renderSLACycle(cycle)}
      </div>

      <div class="sla-footer">
        <span class="sla-last-updated">Updated: ${new Date().toLocaleTimeString()}</span>
      </div>
    `;

    // If the .sla-content contains no meaningful elements (only dividers), remove it to avoid extra empty container
    const contentElCheck = container.querySelector('.sla-content');
    if (contentElCheck) {
      const hasMeaningful = Boolean(contentElCheck.querySelector('.sla-cycle, .detail-row, .cycle-details, .cycle-progress'));
      if (!hasMeaningful) {
        contentElCheck.remove();
      }
    }

    // Attach refresh handler to trigger live refresh with animated SVG
    setTimeout(() => {
      const btn = container.querySelector('.sla-refresh-btn');
      const svg = container.querySelector('.sla-refresh-svg');
      if (btn && svg) {
        btn.addEventListener('click', async (e) => {
          try {
            btn.disabled = true;
            svg.classList.add('spinning');
            await this.refreshSLAData(issueKey);
          } catch (err) {
            console.error('Failed manual refresh:', err);
          } finally {
            svg.classList.remove('spinning');
            btn.disabled = false;
          }
        });
      }
    }, 0);

    // Breach prediction is handled by the dedicated `sla-predictor` module.
    // Consumers may listen to the `sla:prediction` event or call the
    // predictor directly. No DOM mutations are performed here.

    return container;
  }

  // Prediction logic migrated to `frontend/static/js/modules/sla-predictor.js`.

  /**
   * Render SLA cycle
   */
  renderSLACycle(cycle) {
    console.log(`🔍 Rendering cycle:`, cycle);
    console.log(`🔍 Goal duration: ${cycle.goal_duration}`);
    console.log(`🔍 Elapsed time: ${cycle.elapsed_time}`);
    console.log(`🔍 Remaining time: ${cycle.remaining_time}`);

    // Determine status - check paused first, then breached
    let statusIcon, statusClass, statusLabel;

    if (cycle.paused) {
      statusIcon = SVGIcons.pause({ size: 12, className: 'inline-icon' });
      statusClass = 'paused';
      statusLabel = 'Paused';
    } else if (cycle.breached) {
      statusIcon = SVGIcons.xCircle({ size: 12, className: 'inline-icon' });
      statusClass = 'breached';
      statusLabel = 'Breached';
    } else {
      statusIcon = SVGIcons.success({ size: 12, className: 'inline-icon' });
      statusClass = 'healthy';
      statusLabel = 'On Track';
    }

    // Check if this is a secondary SLA (Cierre Ticket)
    const isSecondary = cycle.is_secondary || false;

    return `
      <div class="sla-cycle sla-cycle-${statusClass}">
        <div class="cycle-header">
          <span class="cycle-name">${cycle.sla_name || 'Service Level Agreement'}</span>
          <span class="cycle-status ${statusClass}">
            ${statusIcon} ${statusLabel}
          </span>
        </div>

        <div class="cycle-details">
          <div class="detail-row">
            <span class="detail-label">Goal:</span>
            <span class="detail-value">${cycle.goal_duration || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Elapsed:</span>
            <span class="detail-value">${cycle.elapsed_time || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Remaining:</span>
            <span class="detail-value ${cycle.breached ? 'breached' : ''}">
              ${cycle.remaining_time || 'N/A'}
            </span>
          </div>
        </div>

        ${isSecondary ? `
          <div class="secondary-sla-warning">
            ⚠️ Using "Cierre Ticket" SLA (No primary SLA available)
          </div>
        ` : ''}
        
        ${cycle.paused ? `
          <div class="pause-notice">
            ⏸️ SLA is currently paused
          </div>
        ` : cycle.breached ? `
          <div class="breach-warning">
            ⚠️ SLA has been breached
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Setup auto-refresh interval
   */
  setupRefreshInterval() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh every 10 minutes
    this.refreshInterval = setInterval(() => {
      if (this.currentIssue) {
        this.refreshSLAData(this.currentIssue);
      }
    }, 600000); // 10 minutes = 600,000 ms
  }

  /**
   * Refresh SLA data from API
   */
  async refreshSLAData(issueKey) {
    try {
      const response = await fetch(`/api/issues/${issueKey}/sla`);

      if (response.ok) {
        const apiResponse = await response.json();
        const slaData = apiResponse.success ? apiResponse.data : apiResponse;

        if (slaData) {
          this.slaData[issueKey] = slaData;

          // Update UI if panel exists
          const panel = document.querySelector(`#sla-panel-${issueKey}`);
          if (panel) {
            const newPanel = this.renderSLAPanel(issueKey);
            panel.replaceWith(newPanel);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to refresh SLA for ${issueKey}:`, error);
    }
  }

  /**
   * Cleanup and stop monitoring
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.slaData = {};
    this.currentIssue = null;
  }
}

// Global instance
window.slaMonitor = new SLAMonitor();
