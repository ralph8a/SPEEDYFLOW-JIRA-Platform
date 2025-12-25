// Balanced View Renderer Module (clean)
// Minimal, DOM-focused renderer used by Flowing-V2 for the balanced/footer UI.
// Uses the project's CUSTOM_FIELDS_REFERENCE mapping when available to
// render custom fields with correct labels and ordering.
import { show, hide } from '../utils/dom-utils.js';

export async function renderBalancedContent(issue) {
    try {
        // Ensure a container exists
        let container = document.getElementById('balancedContentContainer');
        if (!container) {
            try {
                container = document.createElement('div');
                container.id = 'balancedContentContainer';
                container.className = 'flowing-v2-root';
                const parent = document.getElementById('app') || document.getElementById('root') || document.body || document.documentElement;
                parent.appendChild(container);
            } catch (e) { /* ignore */ }
        }
        if (!container) return;

        const escapeHtml = (str) => String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const getField = (k) => {
            try {
                if (!issue) return null;
                if (issue.fields && issue.fields[k] !== undefined) return issue.fields[k];
                if (issue.custom_fields && issue.custom_fields[k] !== undefined) return issue.custom_fields[k];
                if (issue.serviceDesk?.requestFieldValues && issue.serviceDesk.requestFieldValues[k] !== undefined) return issue.serviceDesk.requestFieldValues[k];
                if (issue[k] !== undefined) return issue[k];
            } catch (e) { /* ignore */ }
            return null;
        };

        const formatValue = (v) => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'string') return v;
            if (Array.isArray(v)) return v.map(x => x && (x.name || x.value || x)).join(', ');
            return (v && (v.name || v.displayName || v.value)) || String(v);
        };

        const summary = escapeHtml(issue && (issue.summary || issue.key) || 'No title');
        const description = escapeHtml(formatValue(issue && (issue.description || getField('description'))));
        const reporterObj = getField('reporter') || (issue && issue.fields && issue.fields.reporter) || null;
        const reporterName = reporterObj && (reporterObj.displayName || reporterObj.name || reporterObj.key) ? String(reporterObj.displayName || reporterObj.name || reporterObj.key) : '';

        // Attempt to load the custom-fields mapping (non-blocking fallback to fetch)
        let mapping = window.CUSTOM_FIELDS_REFERENCE || window.customFieldsReference || null;
        if (!mapping) {
            try {
                const resp = await fetch('/data/CUSTOM_FIELDS_REFERENCE.json');
                if (resp && resp.ok) {
                    mapping = await resp.json();
                    try { window.CUSTOM_FIELDS_REFERENCE = mapping; } catch (_) { /* ignore */ }
                }
            } catch (e) { /* ignore */ }
        }

        const findMappingLabel = (key) => {
            try {
                if (!mapping || !mapping.categories) return null;
                for (const catName of Object.keys(mapping.categories)) {
                    const cat = mapping.categories[catName];
                    if (!cat || !cat.fields) continue;
                    if (Object.prototype.hasOwnProperty.call(cat.fields, key)) return cat.fields[key].label || null;
                }
            } catch (e) { /* ignore */ }
            return null;
        };

        const renderFieldBlock = (label, rawVal, opts = {}) => {
            const fullWidth = !!opts.fullWidth;
            const forceMultiline = !!opts.forceMultiline;

            const makeSafe = (s) => escapeHtml(String(s === null || s === undefined ? '' : s));

            let valueHtml = '';

            try {
                if (rawVal === null || rawVal === undefined) {
                    valueHtml = '';
                } else if (Array.isArray(rawVal)) {
                    const items = rawVal.map(it => {
                        if (it === null || it === undefined) return '';
                        if (typeof it === 'object') return makeSafe(it.name || it.value || it.displayName || JSON.stringify(it));
                        return makeSafe(it);
                    }).filter(Boolean);
                    // Prefer chips for modest-length lists, otherwise collapse to comma list
                    if (items.length > 0 && items.length <= 8 && items.every(it => it.length < 40)) {
                        valueHtml = `<div class="chip-list">${items.map(x => `<span class="chip">${x}</span>`).join('')}</div>`;
                    } else {
                        valueHtml = makeSafe(items.join(', '));
                    }
                } else if (typeof rawVal === 'object') {
                    // Object-ish values: show a human-friendly string
                    const fv = formatValue(rawVal);
                    valueHtml = makeSafe(fv);
                } else {
                    const text = String(rawVal);
                    // preserve newlines by converting to <br/> after escaping
                    const escaped = makeSafe(text);
                    if (/\n/.test(text)) valueHtml = escaped.replace(/\n/g, '<br/>');
                    else valueHtml = escaped;
                }
            } catch (e) { valueHtml = makeSafe(formatValue(rawVal)); }

            // Decide classes for the value container
            const valueClasses = ['field-value'];
            // heuristics for multiline/scroll
            try {
                const rawStr = (typeof rawVal === 'string') ? rawVal : (Array.isArray(rawVal) ? rawVal.join(', ') : JSON.stringify(rawVal || ''));
                if (forceMultiline || /\n/.test(String(rawStr)) || String(rawStr).length > 180 || (Array.isArray(rawVal) && rawVal.length > 6)) valueClasses.push('multiline');
                if (String(rawStr).length > 500) valueClasses.push('auto-scroll');
            } catch (e) { /* ignore */ }

            const style = fullWidth ? ' style="grid-column: 1 / -1;"' : '';
            return `<div class="field-wrapper"${style}><label class="field-label">${escapeHtml(label)}</label><div class="${valueClasses.join(' ')}">${valueHtml}</div></div>`;
        };

        const humanizeKey = (k) => {
            if (!k) return '';
            return String(k)
                .replace(/^customfield_/, '')
                .replace(/_/g, ' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/\b\w/g, c => c.toUpperCase());
        };

        // Prioritized essential fields (canonical names); mapping labels will override when available
        // Note: 'reporter' is intentionally excluded here because reporter contact info
        // is shown in the contact card located in the top-left.
        const prioritizedKeys = ['priority', 'assignee', 'status', 'summary'];
        const displayedKeys = new Set();
        let longCustomFieldsHTML = '';
        let fieldsHtml = '';

        for (const k of prioritizedKeys) {
            let val = getField(k) || (issue.fields && issue.fields[k]);
            // 'summary' is a top-level property
            if (k === 'summary' && !val) val = issue && (issue.summary || issue.key);
            if (!val) continue;
            const label = findMappingLabel(k) || humanizeKey(k);
            fieldsHtml += renderFieldBlock(label, val, { fullWidth: k === 'summary' });
            displayedKeys.add(k);
        }

        // If mapping exists, iterate mapping categories to render known custom fields in order
        if (mapping && mapping.categories) {
            try {
                for (const catName of Object.keys(mapping.categories)) {
                    const cat = mapping.categories[catName];
                    if (!cat || !cat.fields) continue;
                    for (const fieldId of Object.keys(cat.fields)) {
                        if (displayedKeys.has(fieldId)) continue;
                        const raw = (issue.fields && issue.fields[fieldId]) || (issue.custom_fields && issue.custom_fields[fieldId]) || issue[fieldId];
                        if (raw === undefined || raw === null) continue;
                        const label = cat.fields[fieldId] && cat.fields[fieldId].label ? cat.fields[fieldId].label : humanizeKey(fieldId);
                        const val = formatValue(raw);
                        if (!val) continue;
                        if (String(val).length > 200 || (Array.isArray(raw) && raw.length > 5)) {
                            longCustomFieldsHTML += renderFieldBlock(label, raw, { fullWidth: true });
                        } else {
                            fieldsHtml += renderFieldBlock(label, raw);
                        }
                        displayedKeys.add(fieldId);
                    }
                }
            } catch (e) { /* ignore mapping iteration errors */ }
        }

        // Fallback: include a few standard remaining fields not covered by mapping
        const extras = ['labels', 'components', 'fixVersions', 'created', 'updated', 'duedate'];
        for (const ex of extras) {
            if (displayedKeys.has(ex)) continue;
            const raw = getField(ex) || (issue.fields && issue.fields[ex]) || issue[ex];
            if (!raw) continue;
            const label = findMappingLabel(ex) || humanizeKey(ex);
            fieldsHtml += renderFieldBlock(label, raw);
            displayedKeys.add(ex);
        }

        // Build remaining fields list
        let remainingFieldsHTML = '';
        try {
            const allObj = Object.assign({}, issue.fields || {}, issue.custom_fields || {});
            Object.keys(allObj).forEach(k => {
                if (!k) return;
                if (displayedKeys.has(k)) return;
                // Exclude large system collections and contact-like fields
                if (/^(attachment|comment|worklog|issuelinks|timetracking)$/i.test(k)) return;
                if (/(email|phone|contact|reporter)/i.test(k)) return;
                const raw = allObj[k];
                const val = formatValue(raw);
                if (!val) return;
                remainingFieldsHTML += renderFieldBlock(findMappingLabel(k) || humanizeKey(k), raw);
            });
        } catch (e) { /* ignore */ }

        if (longCustomFieldsHTML) fieldsHtml = `${longCustomFieldsHTML}${fieldsHtml}`;

        // Inject template using a 6-column top grid and a 4-column bottom grid
        // Layout: column 1 (left) = contact card + comments; columns 2-5 = fields; column 6 (right) = description (long content)
        container.innerHTML = `
            <div id="BalancedMain" class="footer-grid-6">
                <div class="left-arriba widget widget-contacts" role="region" aria-label="Contact and comments">
                    <div id="contactCardContainer" class="contact-card-container"></div>
                    <div style="display:flex; align-items:center; gap:12px; justify-content:space-between; margin-top:6px;">
                        <div style="display:flex;flex-direction:column;">
                            <div class="issue-key-badge" id="balancedIssueKey" style="font-weight:600; color:var(--accent-color,#7c3aed);">${escapeHtml(issue && issue.key ? issue.key : '')}</div>
                            <h4 style="margin:0;">Chat with ${escapeHtml(reporterName || 'Reporter')}</h4>
                        </div>
                        <span id="commentCountFooter">(0)</span>
                    </div>
                    <div class="comments-section">
                        <div class="attachments-preview-footer" id="AttachmentsPreviewFooter"><div class="attachments-list" id="AttachmentsListFooter"></div></div>
                        <div class="comment-composer">
                            <textarea id="footerCommentText" placeholder="Write a comment..."></textarea>
                            <div style="display:flex; flex-direction:column; gap:8px;">
                                <div style="display:flex; gap:8px;"><button id="attachFooterBtn" class="comment-toolbar-btn">Attach</button><button class="btn-add-comment-footer">Send</button></div>
                                <label><input type="checkbox" id="commentInternalFooter"> Internal</label>
                            </div>
                        </div>
                        <div class="comments-list"><p>Loading comments...</p></div>
                    </div>
                </div>

                <div class="top-fields">
                    <div id="essentialFieldsGrid" class="essential-fields-grid fields-grid">${fieldsHtml}</div>
                    <div style="display:flex; justify-content:flex-end;"><button id="toggleAllFieldsBtn" class="all-fields-toggle">Show all fields</button></div>
                    <div id="allFieldsPanel" class="all-fields-panel hidden">${remainingFieldsHTML || '<div style="color:#6b7280;padding:8px;">No additional fields</div>'}</div>
                </div>

                <div class="right-abajo widget widget-description" role="region" aria-label="Description and fields">
                    <div class="ticket-description-field">
                            <label class="field-label">Descripción</label>
                            <div id="ticketDescriptionContent" class="field-value multiline description-input">${description.replace(/\n/g, '<br/>')}</div>
                        </div>
                </div>

                <div class="purple-divider" aria-hidden="true"></div>

                <div class="bottom-grid">
                    <div class="attachments-section widget widget-attachments" role="region" aria-label="Attachments">
                        <h4>Attachments</h4>
                        <div id="AttachmentsListRight" class="attachments-grid"></div>
                        <div id="AttachmentsListHeader" class="attachments-grid"></div>
                    </div>

                    <div class="sla-monitor-wrapper widget widget-sla" role="region" aria-label="SLA">
                        <div id="slaMonitorContainer" class="sla-monitor-container">Loading SLA...</div>
                    </div>

                    <div class="breach-wrapper widget widget-breach" role="region" aria-label="Breach risk">
                        <div class="breach-risk-content"></div>
                    </div>

                    <div class="ml-recommendations widget widget-ml" role="region" aria-label="Recommendations">
                        <h4>Recommendations</h4>
                        <div id="mlRecommendationsContainer"></div>
                    </div>
                </div>
            </div>
        `;

        // Attempt to render contact card into top-left container (if reporter data present)
        try {
            const contactTarget = '#contactCardContainer';
            const reporterContact = {};
            if (reporterObj) {
                reporterContact.name = reporterObj.displayName || reporterObj.name || '';
                reporterContact.email = reporterObj.emailAddress || reporterObj.email || '';
                reporterContact.phone = reporterObj.phone || '';
                reporterContact.avatarUrl = (reporterObj.avatarUrls && (reporterObj.avatarUrls['48x48'] || reporterObj.avatarUrls['24x24'])) || reporterObj.avatarUrl || reporterObj.avatar || '';
                reporterContact.title = reporterObj.title || '';
                reporterContact.organization = reporterObj.organization || '';
            }
            (function tryShowContact() {
                try {
                    let contactModule = null;
                    if (typeof window !== 'undefined') {
                        try { if (window.flowingV2 && typeof window.flowingV2.getModule === 'function') contactModule = window.flowingV2.getModule('contactCard'); } catch (__) { }
                        if (!contactModule && window.contactCard) contactModule = window.contactCard;
                    }
                    if (contactModule && typeof contactModule.showContactCard === 'function') {
                        try { contactModule.showContactCard(reporterContact, { containerSelector: contactTarget, autoClose: false }); return; } catch (e) { /* ignore */ }
                    }
                    // fallback: dynamic import
                    try {
                        import('/static/js/modules/contact-card.js?v=' + Date.now()).then(m => { try { if (m && typeof m.showContactCard === 'function') m.showContactCard(reporterContact, { containerSelector: contactTarget, autoClose: false }); } catch (e) { /* ignore */ } }).catch(() => { });
                    } catch (e) { /* ignore */ }
                } catch (e) { /* ignore */ }
            })();
        } catch (e) { /* ignore */ }

        // Attach toggle handler -> refactored to explicit show/hide using utils
        try {
            const toggleBtn = container.querySelector('#toggleAllFieldsBtn');
            const panel = container.querySelector('#allFieldsPanel');
            if (toggleBtn && panel) {
                toggleBtn.addEventListener('click', () => {
                    const isHidden = panel.classList.contains('hidden') || panel.getAttribute('aria-hidden') === 'true' || panel.style.display === 'none';
                    if (isHidden) {
                        show(panel, 'block');
                        toggleBtn.textContent = 'Hide all fields';
                    } else {
                        hide(panel);
                        toggleBtn.textContent = 'Show all fields';
                    }
                });
            }
        } catch (e) { /* ignore */ }

        // Signal ready for E2E tests
        try {
            if (container) {
                try { container.dataset.balancedReady = '1'; } catch (__) { }
                if (issue && issue.key) try { container.dataset.issueKey = issue.key; } catch (__) { }
            }
            const readyEvent = new CustomEvent('balanced:ready', { detail: { issueKey: issue && issue.key ? issue.key : null } });
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(readyEvent);
        } catch (e) { /* ignore */ }

    } catch (e) { console.warn('balanced-view rendering error', e); }
}

// Expose a global shim for legacy code that expects a window-level renderer
try {
    if (typeof window !== 'undefined') {
        window.balancedViewRenderer = window.balancedViewRenderer || {};
        window.balancedViewRenderer.renderBalancedContent = renderBalancedContent;
    }
} catch (e) { /* ignore */ }
