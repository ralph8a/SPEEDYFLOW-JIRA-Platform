// --- Helpers desacoplados para campos esenciales y mapping ---

/**
 * Genera el HTML de los campos esenciales para el ticket, usando un mapping si está disponible.
 * @param {object} mapping - Objeto de mapeo de campos (puede ser null)
 * @param {object} issue - Ticket JIRA normalizado
 * @returns {string} HTML
 */
function _buildEssentialFieldsHTML(mapping = {}, issue = {}) {
    const keys = [];
    // preferred order: form_fields, contact_info, system_fields
    try {
        if (mapping.categories) {
            ['form_fields', 'contact_info', 'system_fields'].forEach(cat => {
                const f = mapping.categories[cat] && mapping.categories[cat].fields;
                if (f) keys.push(...Object.keys(f));
            });
        }
    } catch (e) { }
    // ensure common core fields are present
    ['priority', 'assignee', 'status', 'reporter', 'email', 'phone', 'summary'].forEach(k => { if (!keys.includes(k)) keys.push(k); });
    let html = '';
    keys.forEach(k => {
        let val = '';
        if (issue[k]) val = issue[k];
        else if (issue.fields && issue.fields[k]) val = issue.fields[k];
        if (!val) return;
        // label from mapping if available
        const label = (mapping && mapping.categories && (function () {
            for (const cat of ['form_fields', 'contact_info', 'system_fields']) {
                const f = mapping.categories[cat] && mapping.categories[cat].fields;
                if (f && f[k] && f[k].label) return f[k].label;
            }
            return k.replace(/_/g, ' ').replace(/customfield /g, 'CF ').replace(/customfield_/, 'CF-');
        })()) || k;
        html += `<div class="field-wrapper" style="display:flex;flex-direction:column;gap:6px;"><label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">${label}</label><div class="field-input" style="padding: 6px 8px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 4px; font-size: 12px; color: var(--field-text);">${val}</div></div>`;
    });
    return html;
}

/**
 * Obtiene el mapping de campos desde window o lo busca por AJAX si es necesario.
 * @returns {Promise<object|null>}
 */
export async function fetchMappingIfNeeded() {
    let mappingObj = window.CUSTOM_FIELDS_REFERENCE || window.customFieldsReference || null;
    if (mappingObj) return mappingObj;
    try {
        const resp = await fetch('/data/CUSTOM_FIELDS_REFERENCE.json');
        if (resp.ok) { mappingObj = await resp.json(); window.CUSTOM_FIELDS_REFERENCE = mappingObj; return mappingObj; }
    } catch (e) { /* ignore */ }
    try {
        const resp2 = await fetch('/static/data/CUSTOM_FIELDS_REFERENCE.json');
        if (resp2.ok) { mappingObj = await resp2.json(); window.CUSTOM_FIELDS_REFERENCE = mappingObj; return mappingObj; }
    } catch (e) { /* ignore */ }
    return null;
}

if (typeof window !== 'undefined') {
    window.buildEssentialFieldsHTML = _buildEssentialFieldsHTML;
    window.fetchMappingIfNeeded = fetchMappingIfNeeded;
}
// balancedView.js
// Lógica modular y desacoplada para renderizar el contenido de la vista balanceada
import { buildAttachmentsHTML, renderAttachmentsForBalanced } from './attachmentsView.js';

function _getField(issue, fieldKey) {
    if (issue.fields && issue.fields[fieldKey] !== undefined) return issue.fields[fieldKey];
    if (issue.custom_fields && issue.custom_fields[fieldKey] !== undefined) return issue.custom_fields[fieldKey];
    if (issue.serviceDesk?.requestFieldValues && issue.serviceDesk.requestFieldValues[fieldKey] !== undefined) return issue.serviceDesk.requestFieldValues[fieldKey];
    if (issue[fieldKey] !== undefined) return issue[fieldKey];
    return null;
}

function _formatValue(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value.name) return value.name;
    if (value.displayName) return value.displayName;
    if (value.value) return value.value;
    if (Array.isArray(value)) return value.map(v => v.name || v.value || v).join(', ');
    return String(value);
}

function _escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function _normalizeDescription(txt) {
    if (!txt) return '';
    let s = String(txt).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    s = s.replace(/^\s*\n+/, '');
    s = s.replace(/\n{3,}/g, '\n\n');
    s = s.replace(/\s+$/g, '');
    return s;
}

export function renderBalancedContent(issue, mapping = {}) {
    const container = document.getElementById('balancedContentContainer');
    if (!container) return;
    const summary = issue.summary || _getField(issue, 'summary') || 'No title';
    const rawDescription = issue.description || _getField(issue, 'description') || '';
    const cleanedDescription = _normalizeDescription(rawDescription);
    const description = cleanedDescription ? _escapeHtml(cleanedDescription).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') : '';

    // Separar campos largos y cortos
    const allFields = (mapping && mapping.categories) ? Object.keys(mapping.categories).flatMap(cat => Object.keys(mapping.categories[cat].fields || {})) : [];
    const fieldHtmls = [];
    const longFields = [];
    const shortFields = [];
    // Simular obtención de campos largos/cortos (mejorable con mapping real)
    for (const k of allFields) {
        let val = '';
        if (issue[k]) val = issue[k];
        else if (issue.fields && issue.fields[k]) val = issue.fields[k];
        if (!val) continue;
        const isLong = typeof val === 'string' && val.length > 180;
        const html = `<div class="field-wrapper${isLong ? ' long-field' : ''}" style="display:flex;flex-direction:column;gap:6px;${isLong ? 'grid-column:span 3;' : ''}"><label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">${k}</label><div class="field-input${isLong ? ' field-input-collapsed' : ''}" style="padding: 6px 8px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 4px; font-size: 12px; color: var(--field-text); max-height:${isLong ? '5.5em' : 'none'}; overflow:${isLong ? 'hidden' : 'visible'};">${val}</div>${isLong ? '<button class="expand-field-btn" style="margin-top:4px;font-size:11px;">Expandir</button>' : ''}</div>`;
        if (isLong) longFields.push(html); else shortFields.push(html);
    }

    // Layout: grid de 4 columnas
    container.innerHTML = `
      <div class="balanced-main-grid" style="display:grid;grid-template-columns:3fr 3fr 3fr 1fr;gap:18px;align-items:start;">
        <div class="description-section" style="grid-column:1/4;">
          <h2 style="font-size:18px;font-weight:700;color:#374151;margin:0 0 8px 0;">${_escapeHtml(summary)}</h2>
          ${description ? `<div class="ticket-description-section field-input-collapsed" style="font-size:13px;color:#4b5563;line-height:1.6;background:transparent;max-height:5.5em;overflow:hidden;">${description}</div><button class="expand-field-btn" style="margin-top:4px;font-size:11px;">Expandir</button>` : ''}
        </div>
        <div class="fields-section" style="grid-column:1/4;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
          ${longFields.join('')}
          ${shortFields.join('')}
        </div>
        <div class="attachments-comments-section" style="grid-column:4/5;display:flex;flex-direction:column;gap:14px;">
          <div class="attachments-section" style="background:rgba(249,250,251,0.5);border:1px solid #e5e7eb;border-radius:10px;padding:12px;">
            <h4 style="font-size:13px;font-weight:600;color:#374151;margin:0 0 8px 0;display:flex;align-items:center;gap:8px;">Attachments</h4>
            <div id="attachmentsListRight" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;"></div>
          </div>
          <div class="comments-section" style="background:transparent;border-radius:10px;padding:14px;max-height:280px;overflow-y:auto;"></div>
          <button id="backToChatBtn" style="margin-top:12px;padding:8px 16px;border-radius:8px;background:#3b82f6;color:#fff;font-weight:600;border:none;cursor:pointer;">Back to Chat</button>
        </div>
      </div>
    `;
    renderAttachmentsForBalanced(issue, '#attachmentsListRight');
    // Agregar listeners para expandir/collapse campos largos
    container.querySelectorAll('.expand-field-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const field = btn.previousElementSibling;
            if (field.classList.contains('field-input-collapsed')) {
                field.classList.remove('field-input-collapsed');
                field.style.maxHeight = 'none';
                field.style.overflow = 'auto';
                btn.textContent = 'Colapsar';
            } else {
                field.classList.add('field-input-collapsed');
                field.style.maxHeight = '5.5em';
                field.style.overflow = 'hidden';
                btn.textContent = 'Expandir';
            }
        });
    });
    // Botón back to chat
    const backBtn = container.querySelector('#backToChatBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (window._flowingFooter && window._flowingFooter.switchToChatView) window._flowingFooter.switchToChatView();
        });
    }
}

if (typeof window !== 'undefined') {
    window.renderBalancedContent = renderBalancedContent;
}
