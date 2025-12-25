/**
 * SPEEDYFLOW - SLA Monitor System
 * Real-time SLA tracking with live data from JIRA API
 */
class SLAMonitor {
  constructor() {
    this.slaData = {};
    this.currentIssue = null;
    this.refreshInterval = null;
    // store ML predictions separately to avoid clobbering real SLA shapes
    this.predictions = {};
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
    // Kick off an asynchronous prediction fetch (do not block init)
    try { this.predictBreachAndPublish(issueKey); } catch (e) { /* ignore */ }
    return this.slaData[issueKey];
  }

  /**
   * Call the pure SLA predictor module (if present), store result and
   * publish a `sla:prediction` event so consumers (UI) can react.
   * This method is intentionally tolerant: predictors may be absent.
   */
  async predictBreachAndPublish(issueKey, ticketData = null) {
    if (!issueKey) return null;
    try {
      const predictor = (typeof window !== 'undefined' && (window.slaPredictor || window.slaBreachRisk)) || null;
      if (!predictor) return null;

      // Prefer the new API name `predictBreach`, fall back to legacy `predictSlaBreach`.
      const predictFn = (typeof predictor.predictBreach === 'function')
        ? predictor.predictBreach.bind(predictor)
        : (typeof predictor.predictSlaBreach === 'function') ? predictor.predictSlaBreach.bind(predictor) : null;
      if (!predictFn) return null;

      // Try to obtain ticket data locally to supply richer input to the predictor
      let ticketData = null;
      try {
        if (typeof window !== 'undefined') {
          // common app caches
          if (window.state && Array.isArray(window.state.issues)) {
            ticketData = window.state.issues.find(i => String(i.key) === String(issueKey)) || ticketData;
          }
          if (!ticketData && window.app && window.app.issuesCache && typeof window.app.issuesCache.get === 'function') {
            try { ticketData = await window.app.issuesCache.get(issueKey); } catch (__) { /* ignore */ }
          }
        }
      } catch (e) { /* ignore */ }

      // If we still don't have ticket data, fetch a minimal representation (non-blocking is fine)
      if (!ticketData) {
        try {
          const resp = await fetch(`/api/servicedesk/request/${issueKey}`);
          if (resp && resp.ok) {
            const d = await resp.json();
            ticketData = d?.data || d;
          }
        } catch (e) { /* ignore */ }
      }

      // Small heuristic: skip ML call for obviously closed/resolved tickets
      try {
        const status = ticketData && (ticketData.status || (ticketData.fields && ticketData.fields.status));
        const statusName = status && (status.name || status.status || String(status)).toString().toLowerCase();
        if (statusName && /closed|done|resolved|cancelled|archived/.test(statusName)) {
          const closedPred = { will_breach: false, breach_probability: 0.0, risk_level: 'LOW', note: 'ticket-closed' };
          try { this.predictions = this.predictions || {}; this.predictions[issueKey] = closedPred; } catch (e) { /* ignore */ }
          try {
            const evt = new CustomEvent('sla:prediction', { detail: { issueKey, prediction: closedPred, comparison: null } });
            if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(evt);
            else if (typeof document !== 'undefined' && document.dispatchEvent) document.dispatchEvent(evt);
          } catch (e) { /* ignore */ }
          return closedPred;
        }
      } catch (e) { /* ignore */ }

      // Call predictor with ticket data when possible so the model can use summary/description
      const prediction = await predictFn(issueKey, ticketData);
      try { this.predictions = this.predictions || {}; this.predictions[issueKey] = prediction || null; } catch (e) { /* ignore */ }

      // If there is SLA data, compute a simple comparison
      let comparison = null;
      try {
        const sla = this.slaData && this.slaData[issueKey] ? this.slaData[issueKey] : null;
        if (sla) {
          const cycle = sla.cycles?.[0] || sla;
          const sla_breached = !!cycle?.breached;
          const pred_will = !!(prediction && prediction.will_breach);
          comparison = {
            matches: (pred_will === sla_breached),
            sla_breached,
            predicted_will_breach: pred_will,
            predicted_probability: (prediction && (prediction.breach_probability || prediction.probability)) || null
          };
        }
      } catch (e) { /* ignore */ }

      // Publish event for UI consumers with prediction + optional comparison
      try {
        const evt = new CustomEvent('sla:prediction', { detail: { issueKey, prediction, comparison } });
        if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(evt);
        else if (typeof document !== 'undefined' && document.dispatchEvent) document.dispatchEvent(evt);
      } catch (e) { /* ignore */ }

      return prediction;
    } catch (err) {
      try { console.warn('sla-monitor: prediction failed', err); } catch (e) { }
      return null;
    }
  }

  /**
   * Render SLA display panel
   */
  renderSLAPanel(issueKey) {
    const slaData = this.slaData[issueKey];

    // If no real SLA data is available, try to present an ML prediction
    // if one is cached; otherwise render a placeholder and request a
    // prediction asynchronously. This preserves the DOM-free predictor
    // contract while allowing the UI to show a prediction panel when
    // available.
    if (!slaData) {
      // If we already have a prediction cached, render it immediately
      const pred = (this.predictions && this.predictions[issueKey]) ? this.predictions[issueKey] : null;
      if (pred) {
        try { console.log(`🔮 Rendering predicted SLA panel for ${issueKey}`); } catch (__) { }
        // If we have SLA data, compute a lightweight comparison to show in the UI
        let comparison = null;
        try {
          const sla = this.slaData && this.slaData[issueKey] ? this.slaData[issueKey] : null;
          if (sla) {
            const cycle = sla.cycles?.[0] || sla;
            const sla_breached = !!cycle?.breached;
            const pred_will = !!(pred && pred.will_breach);
            comparison = { matches: (pred_will === sla_breached), sla_breached, predicted_will_breach: pred_will, predicted_probability: (pred && (pred.breach_probability || pred.probability)) || null };
          }
        } catch (e) { /* ignore */ }
        return this._renderPredictionElement(issueKey, pred, comparison);
      }

      // No cached prediction: create a lightweight placeholder and
      // request a prediction asynchronously. When the prediction
      // event arrives, the placeholder will be replaced.
      try { console.log(`❌ No SLA data for ${issueKey}, requesting prediction and rendering placeholder`); } catch (__) { }
      const placeholder = document.createElement('div');
      placeholder.className = 'sla-panel-empty sla-prediction-placeholder';
      placeholder.id = `sla-prediction-placeholder-${issueKey}`;
      try { placeholder.setAttribute('aria-hidden', 'true'); } catch (e) { /* ignore */ }

      // Kick off an async prediction fetch (do not await)
      try { this.predictBreachAndPublish(issueKey); } catch (e) { /* ignore */ }

      // Listen for the prediction event and replace placeholder when available
      try {
        const handler = (ev) => {
          try {
            if (!ev || !ev.detail) return;
            if (String(ev.detail.issueKey) !== String(issueKey)) return;
            const p = ev.detail.prediction;
            const comparison = ev.detail.comparison || null;
            if (!p) return;
            const newPanel = this._renderPredictionElement(issueKey, p, comparison);
            if (newPanel && placeholder.parentNode) placeholder.parentNode.replaceChild(newPanel, placeholder);
            // remove listener after first update
            if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('sla:prediction', handler);
          } catch (e) { /* ignore */ }
        };
        if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('sla:prediction', handler);
      } catch (e) { /* ignore */ }

      return placeholder;
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
   * Render a prediction-based SLA element (used when real SLA data is absent)
   */
  _renderPredictionElement(issueKey, pred, comparison = null) {
    try {
      const container = document.createElement('div');
      container.className = 'sla-prediction-panel';
      container.id = `sla-prediction-${issueKey}`;

      const risk = pred?.risk_level || (pred?.risk || 'LOW');
      const probRaw = (typeof pred?.breach_probability === 'number') ? pred.breach_probability : (typeof pred?.probability === 'number' ? pred.probability : null);
      const prob = probRaw != null ? `${Math.round((probRaw || 0) * 100)}%` : 'N/A';
      const will = (pred && (pred.will_breach !== undefined && pred.will_breach !== null)) ? (pred.will_breach ? 'Likely to breach' : 'Unlikely to breach') : (probRaw != null ? (probRaw > 0.5 ? 'Likely to breach' : 'Unlikely to breach') : 'Unknown');
      const hours = (pred && (pred.hours_until_breach || pred.hours)) ? (pred.hours_until_breach || pred.hours) : null;
      const matchText = comparison ? (comparison.matches ? 'Yes' : 'No') : '—';

      container.innerHTML = `
        <div class="sla-prediction">
          <div class="sla-header">
            <h3 class="sla-title">🔮 Predicted SLA</h3>
          </div>
          <div class="sla-content">
            <div class="detail-row"><span class="detail-label">Risk:</span><span class="detail-value">${risk}</span></div>
            <div class="detail-row"><span class="detail-label">Probability:</span><span class="detail-value">${prob}</span></div>
            <div class="detail-row"><span class="detail-label">Verdict:</span><span class="detail-value">${will}</span></div>
            ${hours ? `<div class="detail-row"><span class="detail-label">Hours to breach:</span><span class="detail-value">${hours}</span></div>` : ''}
          </div>
          <div class="sla-footer">
            <div class="comparison-row"><span class="comparison-label">Matches SLA:</span><span class="comparison-value">${matchText}</span></div>
            <small>Prediction generated by ML model</small>
          </div>
        </div>
      `;

      return container;
    } catch (e) {
      try { console.warn('sla-monitor: failed to render prediction element', e); } catch (__) { }
      const empty = document.createElement('div');
      empty.className = 'sla-prediction-empty';
      return empty;
    }
  }

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

// Create default instance and export for ES module consumers while
// preserving the legacy global `window.slaMonitor` for backward compatibility.
const slaMonitorInstance = new SLAMonitor();
try { if (typeof window !== 'undefined') window.slaMonitor = window.slaMonitor || slaMonitorInstance; } catch (e) { /* ignore */ }

export { SLAMonitor };
export default slaMonitorInstance;
