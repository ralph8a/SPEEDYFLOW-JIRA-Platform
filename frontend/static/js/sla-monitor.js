/**
 * SPEEDYFLOW - SLA Monitor System
 * Real-time SLA tracking for individual issues and queue-wide monitoring
 */

class SLAMonitor {
  constructor() {
    this.slaData = {};
    this.currentIssue = null;
    this.refreshInterval = null;
    this.slaCache = {};
    this.thresholds = {
      critical: { breachPercent: 10, color: '#ef4444', label: 'Critical' },
      warning: { breachPercent: 25, color: '#f97316', label: 'Warning' },
      caution: { breachPercent: 50, color: '#fb923c', label: 'Caution' },
      healthy: { breachPercent: 100, color: '#22c55e', label: 'Healthy' }
    };
  }

  /**
   * Initialize SLA Monitor for an issue
   * Uses cached slaData from issue.sla_agreements (no API call needed)
   */
  async init(issueKey, slaData = null) {
    if (!issueKey) return;
    
    this.currentIssue = issueKey;
    
    // Always use provided SLA data (comes from kanban cache)
    // SLA data is already loaded in /api/issues endpoint via _batch_inject_sla
    if (slaData && Object.keys(slaData).length > 0) {
      this.slaData[issueKey] = slaData;
      this.slaCache[issueKey] = { data: slaData, timestamp: Date.now() };
    } else {
      // No SLA data available (rare case)
      this.slaData[issueKey] = this.getDefaultSLA();
    }
    
    this.setupRefreshInterval();
    return this.slaData[issueKey];
  }

  /**
   * Render SLA display for right sidebar
   */
  renderSLAPanel(issueKey) {
    const slaData = this.slaData[issueKey] || this.getDefaultSLA();
    const container = document.createElement('div');
    container.className = 'sla-panel';
    container.id = `sla-panel-${issueKey}`;

    const cycles = slaData.cycles || [slaData];
    
    container.innerHTML = `
      <div class="sla-header">
        <h3 class="sla-title">📊 SLA Monitor</h3>
        <button class="sla-refresh-btn" title="Refresh SLA">🔄</button>
      </div>

      <div class="sla-content">
        ${cycles.map((cycle, idx) => this.renderSLACycle(cycle, idx + 1)).join('')}
      </div>

      <div class="sla-footer">
        <span class="sla-last-updated">Updated: just now</span>
        <span class="sla-legend">
          <span class="legend-item"><span class="dot green"></span> On Track</span>
          <span class="legend-item"><span class="dot yellow"></span> Warning</span>
          <span class="legend-item"><span class="dot red"></span> Breached</span>
        </span>
      </div>
    `;

    // Refresh button disabled - visual only
    // refreshBtn.addEventListener('click', ...

    return container;
  }

  /**
   * Render individual SLA cycle
   */
  renderSLACycle(cycle, cycleNumber) {
    const status = this.calculateCycleStatus(cycle);
    const breachPercent = this.calculateBreachPercent(cycle);
    const statusClass = status.level; // 'critical', 'warning', 'caution', 'healthy'
    
    return `
      <div class="sla-cycle sla-cycle-${statusClass}">
        <div class="cycle-header">
          <span class="cycle-name">${cycle.sla_name || `SLA Cycle ${cycleNumber}`}</span>
          <span class="cycle-status ${statusClass}" title="${status.label}">
            ${status.icon} ${status.label}
          </span>
        </div>

        <div class="cycle-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(breachPercent, 100)}%"></div>
          </div>
          <span class="progress-percent">${breachPercent.toFixed(0)}%</span>
        </div>

        <div class="cycle-details">
          <div class="detail-row">
            <span class="detail-label">Goal:</span>
            <span class="detail-value">${cycle.goal_duration || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Elapsed:</span>
            <span class="detail-value">${cycle.elapsed_time || '00:00:00'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Remaining:</span>
            <span class="detail-value ${breachPercent > 100 ? 'breached' : ''}">${cycle.remaining_time || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Paused:</span>
            <span class="detail-value">${cycle.paused ? '⏸️ Yes' : '▶️ No'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Start:</span>
            <span class="detail-value">${this.formatDate(cycle.started_on || Date.now())}</span>
          </div>
        </div>

        ${cycle.breached ? `
          <div class="breach-warning">
            ⚠️ SLA Breached on ${this.formatDate(cycle.breached_at || Date.now())}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Calculate SLA cycle status
   */
  calculateCycleStatus(cycle) {
    const breachPercent = this.calculateBreachPercent(cycle);
    
    if (cycle.breached || breachPercent > 100) {
      return { level: 'critical', label: 'Breached', icon: '🔴' };
    } else if (breachPercent > 75) {
      return { level: 'warning', label: 'Warning', icon: '🟠' };
    } else if (breachPercent > 50) {
      return { level: 'caution', label: 'Caution', icon: '🟡' };
    } else {
      return { level: 'healthy', label: 'On Track', icon: '🟢' };
    }
  }

  /**
   * Calculate what percent of SLA time has been used
   */
  calculateBreachPercent(cycle) {
    if (!cycle.goal_minutes) return 0;
    
    let elapsedMinutes = 0;
    
    // Try to parse elapsed_time format: "HH:MM:SS"
    if (cycle.elapsed_time) {
      const parts = cycle.elapsed_time.split(':').map(p => parseInt(p) || 0);
      elapsedMinutes = (parts[0] || 0) * 60 + (parts[1] || 0) + (parts[2] || 0) / 60;
    }
    
    // If elapsed_time not available, calculate from timestamp
    if (elapsedMinutes === 0 && cycle.started_on) {
      const startTime = new Date(cycle.started_on).getTime();
      elapsedMinutes = (Date.now() - startTime) / (1000 * 60);
    }

    return (elapsedMinutes / cycle.goal_minutes) * 100;
  }

  /**
   * Get default SLA when not available
   */
  getDefaultSLA() {
    return {
      sla_name: 'Standard SLA',
      goal_duration: '8 hours',
      goal_minutes: 480,
      elapsed_time: '00:00:00',
      remaining_time: '8 hours',
      breached: false,
      status: 'ongoing',
      started_on: Date.now(),
      cycles: [],
      is_default: true
    };
  }

  /**
   * Format date to readable format
   */
  formatDate(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${date.toLocaleDateString()} ${hours}:${minutes}`;
  }

  /**
   * Setup auto-refresh interval - DISABLED
   * We use cached SLA data from kanban board instead of polling API
   */
  setupRefreshInterval() {
    // No-op: refresh disabled, we use cached data
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Update SLA display in DOM
   */
  updateSLADisplay() {
    if (!this.currentIssue) return;
    
    const panel = document.getElementById(`sla-panel-${this.currentIssue}`);
    if (panel) {
      const newPanel = this.renderSLAPanel(this.currentIssue);
      panel.replaceWith(newPanel);
    }
  }

  /**
   * Get queue-wide SLA summary
   */
  async getQueueSLASummary(queueId) {
    try {
      const response = await fetch(`/api/sla?queue_id=${queueId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error loading queue SLA summary:', error);
      return { slas: [], summary: {} };
    }
  }

  /**
   * Render queue-wide SLA dashboard
   */
  renderQueueDashboard(slaData) {
    const container = document.createElement('div');
    container.className = 'sla-queue-dashboard';

    const onTrack = slaData.summary?.healthy || 0;
    const warning = slaData.summary?.warning || 0;
    const breached = slaData.summary?.breached || 0;
    const total = onTrack + warning + breached;

    container.innerHTML = `
      <div class="queue-dashboard-header">
        <h3>Queue SLA Summary</h3>
      </div>

      <div class="queue-stats">
        <div class="stat green">
          <span class="stat-value">${onTrack}</span>
          <span class="stat-label">On Track</span>
        </div>
        <div class="stat yellow">
          <span class="stat-value">${warning}</span>
          <span class="stat-label">Warning</span>
        </div>
        <div class="stat red">
          <span class="stat-value">${breached}</span>
          <span class="stat-label">Breached</span>
        </div>
      </div>

      <div class="queue-compliance">
        <div class="compliance-metric">
          <span class="metric-label">Compliance Rate:</span>
          <span class="metric-value">${((onTrack / (total || 1)) * 100).toFixed(1)}%</span>
        </div>
        <div class="compliance-bar">
          <div class="bar-segment green" style="width: ${(onTrack / (total || 1)) * 100}%"></div>
          <div class="bar-segment yellow" style="width: ${(warning / (total || 1)) * 100}%"></div>
          <div class="bar-segment red" style="width: ${(breached / (total || 1)) * 100}%"></div>
        </div>
      </div>

      <div class="queue-details">
        <table class="sla-table">
          <thead>
            <tr>
              <th>Issue</th>
              <th>SLA</th>
              <th>Status</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            ${(slaData.slas || []).slice(0, 5).map(sla => `
              <tr class="sla-row">
                <td class="issue-key">${sla.issue_key}</td>
                <td class="sla-name">${sla.sla_name}</td>
                <td class="sla-status status-${sla.status}">${sla.status}</td>
                <td class="time-remaining">${sla.remaining_time || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    return container;
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

// Create global instance
window.slaMonitor = new SLAMonitor();

// Export for use
window.SLAMonitor = SLAMonitor;
