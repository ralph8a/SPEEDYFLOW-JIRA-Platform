/**
 * SLA Predictor Module
 * Responsible for fetching and normalizing SLA breach predictions from
 * the server ML endpoint. Exposes `window.slaPredictor.predictSlaBreach(issueKey)`.
 * This module intentionally does not perform any DOM mutations; it only
 * returns a normalized prediction object for consumers to render.
 */
(function (global) {
  'use strict';

  async function predictSlaBreach(issueKey) {
    if (!issueKey) return null;

    try {
      const resp = await fetch('/api/models/predict/sla_breach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_key: issueKey })
      });

      if (!resp || !resp.ok) return null;
      const data = await resp.json();
      const pred = data?.prediction || data;
      if (!pred) return null;

      // Normalize common fields so consumers have a consistent shape
      const risk_level = pred.risk_level || pred.risk || pred.level || 'LOW';
      let breach_probability = null;
      if (typeof pred.breach_probability === 'number') breach_probability = pred.breach_probability;
      else if (typeof pred.probability === 'number') breach_probability = pred.probability;
      else if (pred.breach_probability) {
        const p = parseFloat(String(pred.breach_probability));
        if (!Number.isNaN(p)) breach_probability = p;
      }

      const will_breach = (pred.will_breach !== undefined && pred.will_breach !== null)
        ? Boolean(pred.will_breach)
        : (breach_probability !== null ? (breach_probability > 0.5) : false);

      const normalized = Object.assign({}, pred, {
        risk_level,
        breach_probability,
        will_breach
      });

      return normalized;
    } catch (err) {
      try { console.warn('sla-predictor: fetch failed', err); } catch (e) { }
      return null;
    }
  }

  const api = { predictSlaBreach };

  // Expose on window for classic script consumers
  try { if (typeof global !== 'undefined') global.slaPredictor = global.slaPredictor || api; } catch (e) { /* ignore */ }

  // CommonJS / AMD compatibility (if used in tooling)
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else if (typeof define === 'function' && define.amd) define(() => api);

})(typeof window !== 'undefined' ? window : this);
