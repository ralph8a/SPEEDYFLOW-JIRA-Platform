/**
 * SLA Predictor Module
 * Responsible for fetching and normalizing SLA breach predictions from
 * the server ML endpoint. Exposes `window.slaPredictor.predictSlaBreach(issueKey)`.
 * This module intentionally does not perform any DOM mutations; it only
 * returns a normalized prediction object for consumers to render.
 */
/**
 * SLA Predictor Module (ES module)
 * Fetches and normalizes SLA breach predictions from the ML endpoint.
 * Exports a pure function `predictSlaBreach(issueKey)` and a default API
 * object. Also exposes `window.slaPredictor` for backward compatibility.
 */
// Enhanced SLA Predictor
// - Tries multiple endpoints (prefer /ml/predict/breach when available)
// - Accepts optional `ticketData` (summary/description/etc.) to ensure predictions
//   are available immediately when opening a ticket.
// - Simple client-side caching by issueKey+payload hash to avoid repeated calls.

const _predictionCache = Object.create(null);

function _simpleHash(str) {
    if (!str) return '0';
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0; // force 32bit
    }
    return (h >>> 0).toString(36);
}

function _normalizePrediction(pred) {
    if (!pred || typeof pred !== 'object') return null;
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

    return Object.assign({}, pred, { risk_level, breach_probability, will_breach });
}

async function _tryEndpoint(url, payload) {
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp || !resp.ok) return null;
        const data = await resp.json();
        return data?.prediction || data || null;
    } catch (e) {
        try { console.warn('sla-predictor: endpoint request failed', url, e); } catch (_) { }
        return null;
    }
}

/**
 * Predict breach using the best available model endpoint.
 * @param {string} issueKey
 * @param {object|null} ticketData - optional { summary, description, priority, ... }
 * @param {object} opts - optional { endpoints: [urls], cache: true }
 */
export async function predictBreach(issueKey, ticketData = null, opts = {}) {
    if (!issueKey && !ticketData) return null;

    const endpoints = (opts && opts.endpoints) || [
        '/ml/predict/breach',
        '/api/models/predict/breach',
        '/api/models/predict/sla_breach'
    ];

    const payload = ticketData && (typeof ticketData === 'object')
        ? {
            summary: ticketData.summary || (ticketData.fields && ticketData.fields.summary) || '',
            description: ticketData.description || (ticketData.fields && ticketData.fields.description) || '',
            issue_key: issueKey || undefined
        }
        : { issue_key: issueKey };

    const cacheKey = `${issueKey || ''}:${_simpleHash(JSON.stringify(payload || {}))}`;
    if (_predictionCache[cacheKey]) return _predictionCache[cacheKey];

    for (let i = 0; i < endpoints.length; i++) {
        const url = endpoints[i];
        const raw = await _tryEndpoint(url, payload);
        if (raw) {
            const normalized = _normalizePrediction(raw);
            try { _predictionCache[cacheKey] = normalized; } catch (e) { /* ignore cache failures */ }
            return normalized;
        }
    }

    return null;
}

// Backwards-compatible alias to the older function name
export async function predictSlaBreach(issueKey, ticketData = null, opts = {}) {
    return await predictBreach(issueKey, ticketData, opts);
}

const api = { predictBreach, predictSlaBreach };

// Backwards-compatible global
try { if (typeof window !== 'undefined') window.slaPredictor = window.slaPredictor || api; } catch (e) { /* ignore */ }

export default api;
