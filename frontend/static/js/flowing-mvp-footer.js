// Ensure Flowing-V2 is explicitly imported so the footer module does
// not depend on fragile global load ordering. This guarantees the
// orchestrator is initialized before the footer delegates to it.
import './Flowing-V2.js';
import { showRecommendationBanner, hideRecommendationBanner } from './modules/recommendation-banner.js';

/* Minimal Flowing MVP Footer shim
 * Replaces corrupted footer script with a safe, small implementation that
 * avoids top-level returns and delegates to Flowing-V2 / existing modules
 * when available. Exposes `window._flowingFooter` and backward compat proxies.
 */
(function (global) {
    'use strict';

    function createFooterInstance() {
        class FlowingFooterShim {
            constructor() {
                this.footerEl = document.getElementById('flowingFooter') || null;
                this.headerEl = document.getElementById('flowingHeader') || null;
                this.balancedViewEl = document.getElementById('balancedView') || document.querySelector('.balanced-view');
                this.balancedContainer = document.getElementById('balancedContentContainer') || null;
                this.context = { selectedIssue: null };
                this._initToggle();
            }

            _initToggle() {
                try {
                    const btn = document.getElementById('flowingToggleBtn');
                    if (btn && !btn._flowingFooterShimBound) {
                        // Toggle button removed — now only show the balanced view.
                        btn.addEventListener('click', () => this.show());
                        btn._flowingFooterShimBound = true;
                    }
                } catch (e) { /* ignore */ }
            }

            // Visibility is centralized in Flowing-V2. Footer delegates to it when available.
            show() {
                try {
                    if (global.flowingV2 && typeof global.flowingV2.show === 'function') {
                        return global.flowingV2.show();
                    }
                    // No-op: rely on canonical FlowingV2 for visibility control
                    console.warn('FlowingFooter.show: FlowingV2 not available; no-op');
                } catch (e) { console.warn('show error', e); }
            }

            hide() {
                try {
                    if (global.flowingV2 && typeof global.flowingV2.hide === 'function') {
                        return global.flowingV2.hide();
                    }
                    // No-op: rely on canonical FlowingV2 for visibility control
                    console.warn('FlowingFooter.hide: FlowingV2 not available; no-op');
                } catch (e) { console.warn('hide error', e); }
            }

            // NOTE: toggle removed — the app now only exposes explicit show()/hide().

            // Switch to balanced view for an issue key
            async switchToBalancedView(issueKey) {
                try {
                    this.context.selectedIssue = issueKey;
                    // Prefer Flowing-V2 orchestrator if present
                    if (global.flowingV2 && typeof global.flowingV2.loadTicketIntoBalancedView === 'function') {
                        await global.flowingV2.loadTicketIntoBalancedView(issueKey);
                        return;
                    }

                    // Fallback: try local loader and then show via delegated API
                    if (typeof this.loadTicketIntoBalancedView === 'function') {
                        await this.loadTicketIntoBalancedView(issueKey);
                        try { if (global.flowingV2 && typeof global.flowingV2.show === 'function') global.flowingV2.show(); else this.show(); } catch (__) { /* ignore */ }
                        return;
                    }

                    console.warn('No balanced view loader available for', issueKey);
                } catch (e) { console.warn('switchToBalancedView error', e); }
            }

            // Render balanced content: delegate to Flowing-V2 or balancedViewRenderer
            async renderBalancedContent(issue) {
                try {
                    if (global.flowingV2 && typeof global.flowingV2.renderBalancedContent === 'function') {
                        return await global.flowingV2.renderBalancedContent(issue);
                    }
                    if (global.balancedViewRenderer && typeof global.balancedViewRenderer.renderBalancedContent === 'function') {
                        return await global.balancedViewRenderer.renderBalancedContent(issue);
                    }
                } catch (e) {
                    console.warn('renderBalancedContent delegate failed', e);
                }
                // Minimal fallback UI
                try {
                    if (this.balancedContainer) {
                        this.balancedContainer.innerHTML = '<div style="padding:20px;color:#9ca3af;">Balanced view unavailable</div>';
                    }
                } catch (e) { /* ignore */ }
                return null;
            }

            // Attachments: delegate to Flowing-V2 or attachmentsModule
            async renderAttachments(issue) {
                try {
                    if (global.flowingV2 && typeof global.flowingV2.renderAttachments === 'function') return await global.flowingV2.renderAttachments(issue);
                    if (global.attachmentsModule && typeof global.attachmentsModule.renderFullItemsInto === 'function') {
                        const container = document.getElementById('AttachmentsListRight') || document.getElementById('AttachmentsListFooter') || document.getElementById('AttachmentsListHeader');
                        if (!container) return;
                        return await global.attachmentsModule.renderFullItemsInto(container, issue);
                    }
                } catch (e) { console.warn('renderAttachments delegate failed', e); }
            }

            buildAttachmentsHTML(issue, opts) {
                try {
                    if (global.flowingV2 && typeof global.flowingV2.buildAttachmentsHTML === 'function') return global.flowingV2.buildAttachmentsHTML(issue, opts);
                } catch (e) { /* ignore */ }
                return { frag: document.createDocumentFragment(), thumbFrag: document.createDocumentFragment(), items: [], thumbs: [], hash: '' };
            }

            async loadComments(issueKey) {
                try {
                    if (global.flowingV2 && typeof global.flowingV2.loadComments === 'function') return await global.flowingV2.loadComments(issueKey);
                    if (global.commentsModule && typeof global.commentsModule.loadIssueComments === 'function') return await global.commentsModule.loadIssueComments(issueKey, { listSelector: '.comments-section .comments-list', countSelector: '#commentCountFooter', order: 'desc' });
                } catch (e) { console.warn('loadComments delegate failed', e); }
                return null;
            }

            renderSLAPanel(issueKey) {
                try {
                    if (global.flowingV2 && typeof global.flowingV2.renderSLAPanel === 'function') return global.flowingV2.renderSLAPanel(issueKey);
                    if (global.slaMonitor && typeof global.slaMonitor.renderSLAPanel === 'function') return global.slaMonitor.renderSLAPanel(issueKey);
                } catch (e) { console.warn('renderSLAPanel delegate failed', e); }
                const el = document.createElement('div'); el.className = 'sla-panel-unavailable'; el.textContent = 'SLA unavailable'; return el;
            }

            adjustCommentsHeight() {
                try {
                    if (global.flowingV2 && typeof global.flowingV2.adjustCommentsHeight === 'function') return global.flowingV2.adjustCommentsHeight();
                } catch (e) { /* ignore */ }
            }

            async loadTicketIntoBalancedView(issueKey) {
                try {
                    // Prefer Flowing-V2
                    if (global.flowingV2 && typeof global.flowingV2.loadTicketIntoBalancedView === 'function') return await global.flowingV2.loadTicketIntoBalancedView(issueKey);

                    // Try to find the issue in window.state or app cache
                    let issue = null;
                    try { issue = (global.state?.issues || []).find(i => i.key === issueKey) || (global.app?.issuesCache && global.app.issuesCache.get(issueKey)); } catch (e) { /* ignore */ }
                    if (issue) return await this.renderBalancedContent(issue);

                    // Fallback: fetch details
                    try {
                        const resp = await fetch(`/api/servicedesk/request/${issueKey}`);
                        if (!resp.ok) throw new Error('HTTP ' + resp.status);
                        const apiData = await resp.json();
                        const data = apiData.data || apiData;
                        return await this.renderBalancedContent(data);
                    } catch (e) { console.warn('Could not fetch ticket details for balanced view', e); }
                } catch (e) { console.warn('loadTicketIntoBalancedView error', e); }
                return null;
            }
        }

        return new FlowingFooterShim();
    }

    try {
        if (!global._flowingFooter) {
            const inst = createFooterInstance();
            // Minimal export: expose the shim instance only. Legacy aliases removed to avoid stale globals.
            global._flowingFooter = inst;
        }
    } catch (e) {
        console.warn('Error initializing FlowingFooter shim', e);
    }

})(window);


// === COMPONENT DIVIDER: SLA Monitor (footer) ===
renderBreachRisk(issueKey, slaData = null) {
    // Prefer FlowingV2 as the single orchestrator for SLA rendering
    const balancedContainer = document.getElementById('balancedContentContainer');
    const riskContainer = (balancedContainer && balancedContainer.querySelector('.right-abajo .breach-risk-content')) || (balancedContainer && balancedContainer.querySelector('.breach-risk-content')) || document.querySelector('.breach-risk-content');
    if (!riskContainer) return;

    try {
        const flow = (typeof window !== 'undefined' && window.flowingV2) || null;
        if (flow && typeof flow.renderSLAPanel === 'function') {
            // Replace contents with the panel returned by FlowingV2 (canonical)
            try {
                while (riskContainer.firstChild) riskContainer.removeChild(riskContainer.firstChild);
                const panel = flow.renderSLAPanel(issueKey);
                if (panel && panel.nodeType) riskContainer.appendChild(panel);
                else if (typeof panel === 'string') riskContainer.innerHTML = panel;
            } catch (err) {
                console.warn('flowingV2.renderSLAPanel failed', err);
            }
            return;
        }
    } catch (e) { console.warn('FlowingV2 unavailable for SLA rendering', e); }

    // Minimal graceful fallback if FlowingV2 is not yet available
    try {
        riskContainer.innerHTML = `
            <div class="breach-risk-compact">
                <div class="breach-risk-icon" aria-hidden="true">${typeof SVGIcons !== 'undefined' && SVGIcons.success ? SVGIcons.success({ size: 20, className: 'inline-icon' }) : '✓'}</div>
                <div class="breach-risk-label">LOW RISK</div>
            </div>
        `;
    } catch (e) { /* ignore */ }
}

// === COMPONENT DIVIDER: Comments ===
    async loadCommentsForBalancedView(issueKey) {
    try {
        const flow = (typeof window !== 'undefined' && window.flowingV2) || null;
        if (flow && typeof flow.loadComments === 'function') {
            return await flow.loadComments(issueKey);
        }
    } catch (e) { console.warn('flowingV2.loadComments failed', e); }

    // Final fallback: show unavailable message
    const commentsContainer = document.querySelector('.comments-section .comments-list');
    if (commentsContainer) commentsContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">Comments unavailable</p>';
}

// After rendering balanced content, adjust comments container height to match left column
adjustCommentsHeight() {
    try {
        // Prefer FlowingV2 orchestrator to perform sizing and avoid inline style duplication
        const flow = (typeof window !== 'undefined' && window.flowingV2) || null;
        if (flow && typeof flow.adjustCommentsHeight === 'function') {
            return flow.adjustCommentsHeight();
        }

        // Fallback: compute and set a CSS variable on the balanced container
        const container = document.getElementById('balancedContentContainer');
        if (!container) return;
        const leftCol = container.querySelector('.left-arriba');
        const rightCol = container.querySelector('.right-abajo');
        if (!leftCol || !rightCol) return;
        const commentsSection = rightCol.querySelector('.comments-section');
        const composer = rightCol.querySelector('.comment-composer');
        if (!commentsSection) return;

        const paddingReserve = 16;
        const MIN_COMMENT_HEIGHT = 120;
        const leftHeight = leftCol.getBoundingClientRect().height;
        const composerHeight = composer ? composer.getBoundingClientRect().height : 0;

        let available = Math.floor(leftHeight - composerHeight - paddingReserve);
        if (!Number.isFinite(available) || available < MIN_COMMENT_HEIGHT) available = MIN_COMMENT_HEIGHT;
        const computedMax = Math.max(MIN_COMMENT_HEIGHT, available);

        try {
            container.style.setProperty('--flowing-comments-max-height', `${computedMax}px`);
        } catch (e) {
            // last-resort: set inline style on commentsSection
            commentsSection.style.maxHeight = `${computedMax}px`;
            commentsSection.style.overflowY = 'auto';
        }

        // Ensure comments list scroll position maintained
        const list = commentsSection.querySelector('.comments-list');
        if (list) {
            const nearBottom = (list.scrollHeight - list.clientHeight - list.scrollTop) < 100;
            if (nearBottom) list.scrollTop = list.scrollHeight;
        }
    } catch (e) {
        console.warn('Could not adjust comments height:', e);
    }
}

// Helper: delegate attachments DOM creation to attachments module when available
buildAttachmentsHTML(issue, opts = {}) {
    // === COMPONENT DIVIDER: Attachments HTML ===
    // Use FlowingV2 as the single orchestrator for attachments HTML generation
    try {
        const flow = (typeof window !== 'undefined' && window.flowingV2) || null;
        if (flow && typeof flow.buildAttachmentsHTML === 'function') {
            return flow.buildAttachmentsHTML(issue, opts);
        }
    } catch (e) { console.warn('flowingV2.buildAttachmentsHTML failed', e); }

    // Minimal fallback: empty fragments
    try {
        return { frag: document.createDocumentFragment(), thumbFrag: document.createDocumentFragment(), items: [], thumbs: [], hash: '' };
    } catch (e) { return { frag: null, thumbFrag: null, items: [], thumbs: [], hash: '' }; }
}

// Internal helper: clear all children of an element
_clearChildren(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
}

// Internal helper: append a DocumentFragment or array/collection of nodes
_appendNodesOrFragment(target, nodesOrFrag) {
    if (!target || !nodesOrFrag) return;
    try {
        if (nodesOrFrag instanceof DocumentFragment) {
            target.appendChild(nodesOrFrag);
            return;
        }
        if (Array.isArray(nodesOrFrag)) {
            nodesOrFrag.forEach(n => {
                try { target.appendChild(n.cloneNode ? n.cloneNode(true) : n); } catch (e) { /* ignore */ }
            });
            return;
        }
        // NodeList / HTMLCollection / other array-like
        if (typeof nodesOrFrag.length === 'number' && nodesOrFrag[0]) {
            for (let i = 0; i < nodesOrFrag.length; i++) {
                try { target.appendChild(nodesOrFrag[i].cloneNode ? nodesOrFrag[i].cloneNode(true) : nodesOrFrag[i]); } catch (e) { /* ignore */ }
            }
            return;
        }
        // Single Node
        if (nodesOrFrag.nodeType) {
            target.appendChild(nodesOrFrag.cloneNode ? nodesOrFrag.cloneNode(true) : nodesOrFrag);
        }
    } catch (e) { /* ignore */ }
}
    // === COMPONENT DIVIDER: Attachments Render ===
    // Unified attachments renderer: delegate exclusively to FlowingV2
    async renderAttachments(issue) {
    try {
        const flow = (typeof window !== 'undefined' && window.flowingV2) || null;
        if (flow && typeof flow.renderAttachments === 'function') {
            return await flow.renderAttachments(issue);
        }
    } catch (e) {
        console.warn('flowingV2.renderAttachments failed', e);
    }

    // Final fallback: clear canonical containers to avoid stale markup
    try {
        const container = document.getElementById('AttachmentsListRight') || document.getElementById('AttachmentsListFooter') || document.getElementById('AttachmentsListHeader');
        const attachmentsPreview = document.getElementById('AttachmentsPreviewFooter') || document.getElementById('attachmentsPreview');
        if (container) this._clearChildren(container);
        if (attachmentsPreview && attachmentsPreview.classList && typeof attachmentsPreview.classList.remove === 'function') attachmentsPreview.classList.remove('show');
    } catch (e) { /* ignore */ }
}

// Show a confirmation banner in the footer header for applying small field recommendations
showFieldRecommendationBanner(fieldKey, fieldLabel, suggestedValue, meta = {}) {
    try {
        const flow = (typeof window !== 'undefined' && window.flowingV2) || null;
        const issueKey = (meta && meta.issueKey) || (flow && flow._lastLoadedIssueKey) || (window._flowingFooter && window._flowingFooter.context && window._flowingFooter.context.selectedIssue) || null;
        try { return showRecommendationBanner(fieldKey, fieldLabel, suggestedValue, Object.assign({}, meta, { issueKey })); } catch (e) { /* ignore */ }
    } catch (e) { console.warn('showFieldRecommendationBanner error', e); }
}

// Show a small contact card banner near header to copy reporter info
showContactCard(name, email) {
    try {
        const header = this.headerEl || this.root || document.getElementById('flowingHeader') || document.getElementById('flowing-root') || document.getElementById('flowingRoot');
        if (!header) return;
        // remove existing
        const existing = document.getElementById('flowingContactCard');
        if (existing) {
            if (typeof existing.remove === 'function') existing.remove();
            else if (existing.parentNode) existing.parentNode.removeChild(existing);
        }
        const card = document.createElement('div');
        card.id = 'flowingContactCard';
        // Styling delegated to CSS (#flowingContactCard)

        const top = document.createElement('div'); top.className = 'flowing-contact-top';
        const avatar = document.createElement('div'); avatar.className = 'flowing-contact-avatar'; avatar.textContent = (name || '')[0] || '?';
        const info = document.createElement('div'); info.className = 'flowing-contact-info';
        const nameDiv = document.createElement('div'); nameDiv.className = 'flowing-contact-name'; nameDiv.textContent = name || 'Informer';
        const emailDiv = document.createElement('div'); emailDiv.className = 'flowing-contact-email'; emailDiv.textContent = email || '';
        info.appendChild(nameDiv); info.appendChild(emailDiv);
        top.appendChild(avatar); top.appendChild(info);

        const footerBtns = document.createElement('div'); footerBtns.className = 'flowing-contact-footer-btns';
        const copyBtn = document.createElement('button'); copyBtn.id = 'flowingContactCopy'; copyBtn.className = 'flowing-contact-btn'; copyBtn.textContent = 'Copy email';
        const closeBtn = document.createElement('button'); closeBtn.id = 'flowingContactClose'; closeBtn.className = 'flowing-contact-close-btn'; closeBtn.textContent = 'Close';
        footerBtns.appendChild(copyBtn); footerBtns.appendChild(closeBtn);

        card.appendChild(top); card.appendChild(footerBtns);
        header.appendChild(card);

        closeBtn.addEventListener('click', () => {
            if (card) {
                if (typeof card.remove === 'function') card.remove();
                else if (card.parentNode) card.parentNode.removeChild(card);
            }
        });
        copyBtn.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(email || ''); copyBtn.textContent = 'Copied'; setTimeout(() => { if (card) { if (typeof card.remove === 'function') card.remove(); else if (card.parentNode) card.parentNode.removeChild(card); } }, 900); } catch (e) { console.warn('Clipboard copy failed', e); }
        });
    } catch (e) { console.warn('showContactCard error', e); }
}

setupFooterAttachmentButton() {
    try {
        const attachBtn = document.getElementById('attachFooterBtn');
        const attachmentsPreview = document.getElementById('AttachmentsPreviewFooter') || document.getElementById('attachmentsPreview');
        const attachmentsList = document.getElementById('AttachmentsListFooter') || document.getElementById('AttachmentsListRight') || document.getElementById('AttachmentsListHeader');
        console.log('🔧 setupFooterAttachmentButton: attachBtn=', !!attachBtn, 'attachmentsPreview=', !!attachmentsPreview, 'attachmentsList=', !!attachmentsList);
        if (!attachBtn || !attachmentsList) {
            // attachBtn might not be present yet; noop
            console.warn('⚠️ setupFooterAttachmentButton: Missing elements - will retry later');
            return;
        }

        // Clone to remove previous listeners
        const newBtn = attachBtn.cloneNode(true);
        attachBtn.parentNode.replaceChild(newBtn, attachBtn);

        newBtn.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.multiple = true;
            fileInput.accept = '*/*';
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                try { this.addFooterAttachments(files); } catch (err) { console.warn('addFooterAttachments error', err); }
                if (attachmentsPreview) attachmentsPreview.classList.add('show');
            });
            fileInput.click();
        });
    } catch (e) { console.warn('setupFooterAttachmentButton error', e); }
}

// Ensure attachments module is loaded (returns Promise<boolean>)
ensureAttachmentsModuleLoaded(timeoutMs = 3000) {
    return new Promise((resolve) => {
        try {
            if (window.attachmentsModule) return resolve(true);
            // If a loader script is already present, wait briefly for it
            const existing = document.querySelector('script[data-attachments-module]') || document.querySelector('script[src*="attachments-module.js"]');
            if (existing) {
                const start = Date.now();
                const iv = setInterval(() => {
                    if (window.attachmentsModule) {
                        clearInterval(iv);
                        return resolve(true);
                    }
                    if (Date.now() - start > timeoutMs) {
                        clearInterval(iv);
                        return resolve(!!window.attachmentsModule);
                    }
                }, 120);
                return;
            }

            const s = document.createElement('script');
            s.type = 'module';
            s.src = '/static/js/attachments-module.js?v=' + Date.now();
            s.setAttribute('data-attachments-module', '1');
            s.onload = () => { setTimeout(() => resolve(!!window.attachmentsModule), 10); };
            s.onerror = () => { resolve(false); };
            document.head.appendChild(s);
            // safety timeout
            setTimeout(() => resolve(!!window.attachmentsModule), timeoutMs + 50);
        } catch (e) { resolve(false); }
    });
}

addFooterAttachments(files) {
    try {
        window.footerAttachedFiles = window.footerAttachedFiles || [];
        // Use canonical attachments container (right or footer are the same component)
        const attachmentsList = document.getElementById('AttachmentsListFooter') || document.getElementById('AttachmentsListRight') || document.getElementById('AttachmentsListHeader');
        const attachmentsPreview = document.getElementById('AttachmentsPreviewFooter') || document.getElementById('attachmentsPreview');
        if (!attachmentsList) return;
        window.footerAttachedFiles.push(...files);
        // Rebuild list using DOM nodes to avoid innerHTML
        while (attachmentsList.firstChild) attachmentsList.removeChild(attachmentsList.firstChild);
        window.footerAttachedFiles.forEach((file, idx) => {
            const item = document.createElement('div');
            item.className = 'attachment-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'attachment-name';
            nameSpan.title = file.name;
            nameSpan.textContent = file.name;
            item.appendChild(nameSpan);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'attachment-remove';
            removeBtn.dataset.index = String(idx);
            removeBtn.type = 'button';
            removeBtn.textContent = '✖';
            item.appendChild(removeBtn);

            attachmentsList.appendChild(item);
        });
        // Setup remove handlers
        Array.from(attachmentsList.querySelectorAll('.attachment-remove')).forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                window.footerAttachedFiles.splice(idx, 1);
                if (window.footerAttachedFiles.length === 0) {
                    if (attachmentsPreview && attachmentsPreview.classList && typeof attachmentsPreview.classList.remove === 'function') attachmentsPreview.classList.remove('show');
                    while (attachmentsList.firstChild) attachmentsList.removeChild(attachmentsList.firstChild);
                } else {
                    this.addFooterAttachments([]);
                }
            });
        });
    } catch (e) { console.warn('addFooterAttachments error', e); }
}

_deprecated_renderBalancedContent(issue) {
    // Minimal delegator: prefer the canonical balanced renderer module to
    // avoid duplicating rendering logic. If unavailable, load it dynamically
    // and fall back to a lightweight summary render so the UI isn't blank.
    const container = document.getElementById('balancedContentContainer');
    if (!container) return;

    try {
        if (window.balancedViewRenderer && typeof window.balancedViewRenderer.renderBalancedContent === 'function') {
            try { window.balancedViewRenderer.renderBalancedContent(issue); return; } catch (e) { console.warn('delegation to window.balancedViewRenderer failed', e); }
        }
    } catch (e) { /* ignore */ }

    // Attempt to dynamic-import the canonical module (non-blocking)
    try {
        import('/static/js/modules/balanced-view-renderer.js?v=' + Date.now()).then(mod => {
            try {
                if (mod && typeof mod.renderBalancedContent === 'function') {
                    mod.renderBalancedContent(issue);
                    try { window.balancedViewRenderer = window.balancedViewRenderer || {}; window.balancedViewRenderer.renderBalancedContent = mod.renderBalancedContent; } catch (e) { /* ignore */ }
                }
            } catch (err) { console.warn('balanced-view-renderer.renderBalancedContent failed', err); }
        }).catch(err => { console.warn('dynamic import balanced-view-renderer failed', err); });
    } catch (e) { console.warn('Could not delegate deprecated balanced render', e); }

    // Lightweight fallback to avoid blank UI while the canonical renderer loads
    try {
        const escapeHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const title = issue && (issue.summary || issue.key) || 'Ticket';
        const desc = issue && (issue.description || '') || '';
        container.innerHTML = `
            <div class="flowing-footer">
              <div class="footer-grid-5">
                                <div class="left-arriba">
                  <div class="left-grid">
                                        <div class="field-wrapper ticket-description-field">
                                            <label class="field-label">${escapeHtml(title)}</label>
                                            <div id="ticketDescriptionContent" class="field-value multiline description-input">${escapeHtml(desc).replace(/\n/g, '<br/>')}</div>
                                        </div>
                  </div>
                </div>
              </div>
            </div>
        `;
    } catch (e) { console.warn('fallback renderBalancedContent failed', e); }

}
}

// === SECTION G: Initialization & Global Shims ===
// Initialize footer on DOM ready
try {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            // Create instance and expose backwards-compatible public API shims
            const _inst = new FlowingFooter();
            window._flowingFooter = _inst;

            // Legacy global aliases intentionally removed. Consumers must use
            // `window.flowingV2` APIs or register modules with Flowing-V2.
            try {
                // Expose only the shim instance on `window._flowingFooter` to aid
                // discovery; do NOT create legacy alias methods or proxy objects.
            } catch (e) { console.warn('Could not attach footer compatibility shims', e); }

            // Central registry for Flowing-related singletons so other modules
            // can discover footer/context in a single place without reaching
            // into many disparate globals. Audio & FlowingContext are deprecated
            // and intentionally not registered here.
            try {
                window._flowing = window._flowing || {};
                window._flowing.footer = window._flowingFooter;
            } catch (e) { console.warn('Could not set window._flowing registry', e); }
        }, 50);
    });
} catch (e) { console.warn('Footer init error', e); }
