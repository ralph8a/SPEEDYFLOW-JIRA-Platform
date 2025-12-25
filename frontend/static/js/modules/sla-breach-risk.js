/**
 * SLA Breach Risk Module
 * Lightweight wrapper that delegates to the canonical `sla-predictor` module.
 * Keeps the legacy `predictSlaBreach(issueKey)` API while reusing the
 * improved predictor implementation.
 */
import { predictBreach } from './sla-predictor.js';

export async function predictSlaBreach(issueKey, ticketData = null, opts = {}) {
    return await predictBreach(issueKey, ticketData, opts);
}

const api = { predictSlaBreach };

// Backwards-compatible global
try { if (typeof window !== 'undefined') window.slaBreachRisk = window.slaBreachRisk || api; } catch (e) { /* ignore */ }

export default api;
