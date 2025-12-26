/*
Flowing V2 - Minimal footer orchestrator
- Small, DOM-light module that delegates heavy rendering to canonical modules:
  - /static/js/modules/balanced-view-renderer.js
  - /static/js/attachments-module.js
  - /static/js/sla-monitor.js
  - /static/js/modules/comments.js
- Exposes a tidy global API: window.flowingV2 and window._flowing.flowingV2
- Purpose: replace/stop duplicating balanced/footer logic in many files and provide a single place to wire SLA predictor and smoke tests.
*/
/*
 * INDEX - Flowing V2
 * ==================
 * Quick reference of sections inside this file to avoid mixing structure
 * and to make it easy to find responsibilities when scanning the code.
 *
 * 1) SHARED REGISTRY & IMPORTS
 *    - UniqueVarRegistry and canonical module imports
 *
 * 2) FlowingV2 CLASS (orchestrator)
 *    - constructor
 *    - SECTION: Dependency Injection (setModules)
 *    - SECTION: Initialization & Global Exposure (init)
 *    - SECTION: Render: Balanced Content (renderBalancedContent)
 *    - SECTION: Render: Attachments (renderAttachments)
 *    - SECTION: Attachments Helpers (buildAttachmentsHTML)
 *    - SECTION: Comments API (loadComments)
 *    - SECTION: SLA API (renderSLAPanel)
 *    - SECTION: Layout Helpers (adjustCommentsHeight)
 *
 * 3) Factory & Exports
 *    - createFlowingV2Instance
 *    - default export
 *
 * 4) Auto-init singleton (global exposure)
 *
 * Navigation tips:
 *  - Search for the token '=== SECTION:' to jump to sections.
 *  - Keep this index updated when adding/removing sections.
 */
import UniqueVarRegistry from './modules/unique-var-registry.js';
// Import canonical modules so FlowingV2 becomes the single orchestrator.
// Attachments and balanced renderer export functions; comments are executed
// for side-effects. SLA modules are imported as ES modules and also expose
// globals for backward compatibility.
import * as AttachmentsModule from './attachments-module.js';
import * as BalancedRenderer from './modules/balanced-view-renderer.js';
import './modules/comments.js';
import SLAMonitorModule from './sla-monitor.js';
import './modules/mentions-autocomplete.js';
import SlaPredictorModule from './modules/sla-predictor.js';
import SlaBreachModule from './modules/sla-breach-risk.js';

// Canonical selectors and utility helpers used by FlowingV2 to avoid duplicated queries
// and to centralize DOM lookup behavior across the app.
const CANONICAL = {
    DETAILS_BUTTONS: '.issue-details-btn, .btn-view-details, .issuedetailsbutton, .issue-details-button, .issue-details',
    COMMENTS_LIST: '.comments-section .comments-list',
    COMMENT_COUNT: '#commentCountFooter',
    ATTACHMENTS_CONTAINERS: ['#AttachmentsListRight', '#AttachmentsListFooter', '#AttachmentsListHeader'],
    BALANCED_MAIN: '#BalancedMain',
    SLA_MONITOR: '#slaMonitorContainer',
    ROOT_CANDIDATES: ['#balancedContentContainer', '.flowing-v2-root', '.flowing-view.balanced-view']
};

function findFirstMatching(selectors) {
    if (!selectors) return null;
    if (typeof selectors === 'string') selectors = selectors.split(',').map(s => s.trim());
    for (const s of selectors) {
        try {
            if (s.startsWith('#')) {
                const el = document.getElementById(s.slice(1));
                if (el) return el;
            } else {
                const el = document.querySelector(s);
                if (el) return el;
            }
        } catch (e) { /* ignore invalid selectors */ }
    }
    return null;
}

// === SECTION: SHARED REGISTRY & IMPORTS ===
// UniqueVarRegistry is used throughout; FlowingV2 imports canonical modules
// above so it can be the single orchestrator. Use the comments below to
// quickly locate duplicated logic or responsibilities when scanning files.

class FlowingV2 {
    // === SECTION: FlowingV2 CLASS (orchestrator) ===
    constructor(opts = {}) {
        this.rootSelector = opts.rootSelector || '#balancedContentContainer';
        this.root = null;
        this.initialized = false;

        // Dependency-injection slots (optional). Require explicit injection
        // by passing modules via constructor or `setModules`. Do NOT rely
        // on implicit globals or dynamic imports — modules should be wired
        // at app bootstrap to avoid confusing fallbacks.
        this.attachmentsModule = opts.attachmentsModule || null;
        this.commentsModule = opts.commentsModule || null;
        this.slaMonitor = opts.slaMonitor || null;
        this.balancedViewRenderer = opts.balancedViewRenderer || null;
        // Do not expose globals by default. Use explicit factory or
        // call init({ ... }, true) to request global exposure.
        this.exposeGlobal = !!opts.exposeGlobal;
        // Path to Flowing V2 stylesheet (served by webapp). Can be overridden via opts.cssPath
        this.cssPath = opts.cssPath || '/static/css/flowing-v2.css';
        // Registry for unique variables (singleton)
        this.registry = UniqueVarRegistry;
        // map of module key -> registered name in registry
        this._registeredModuleNames = {};
        // Register this instance in the central registry (best-effort)
        try {
            // Prefer registering the canonical name so callers can lookup by the expected key
            this._registryName = this.registry.ensure('flowingV2', this, { module: 'FlowingV2', rootSelector: this.rootSelector });
        } catch (e) {
            // Non-fatal: ignore registry failures
        }
    }

    // === SECTION: Resource helpers ===
    // Ensure Flowing-V2 stylesheet is injected once into the document head
    ensureCssInjected() {
        if (typeof document === 'undefined') return;
        if (this._cssInjected) return;
        try {
            const id = 'flowing-v2-css';
            if (document.getElementById(id)) { this._cssInjected = true; return; }

            // If any existing stylesheet already matches our known names, assume CSS is present
            try {
                const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(l => /(flowing-v2|flowing-mvp-footer)/i.test(String(l.href || '')));
                if (existing) { this._cssInjected = true; return; }
            } catch (__) { /* ignore */ }

            // Try a list of candidate hrefs (covers dev server layout differences)
            const candidates = [];
            if (this.cssPath) candidates.push(this.cssPath);
            candidates.push('/frontend/static/css/flowing-v2.css');
            candidates.push('/frontend/static/css/flowing-mvp-footer.css');
            candidates.push('/static/css/flowing-v2.css');
            candidates.push('/static/css/flowing-mvp-footer.css');

            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.crossOrigin = 'anonymous';
            let idx = 0;
            const tryNext = () => {
                if (idx >= candidates.length) return false;
                try {
                    link.href = candidates[idx];
                } catch (__) { /* ignore */ }
                idx++;
                return true;
            };

            link.onload = () => { this._cssInjected = true; };
            link.onerror = (e) => {
                try {
                    if (tryNext()) {
                        try { console.warn('FlowingV2: failed to load CSS candidate, trying next', link.href); } catch (_) { }
                        return;
                    }
                } catch (__) { /* ignore */ }
                try { console.warn('FlowingV2: failed to load CSS (all candidates)', candidates, e); } catch (__) { }
            };

            // Start with the first candidate
            tryNext();
            (document.head || document.getElementsByTagName('head')[0] || document.documentElement).appendChild(link);
        } catch (e) {
            // non-fatal
            try { console.warn('FlowingV2: ensureCssInjected failed', e); } catch (__) { }
        }
    }

    // === SECTION: Dependency Injection (setModules) ===
    // Allow setting modules after construction: useful for DI during app bootstrap
    setModules(mods = {}) {
        if (!mods || typeof mods !== 'object') return;
        if (mods.attachmentsModule) this.attachmentsModule = mods.attachmentsModule;
        if (mods.commentsModule) this.commentsModule = mods.commentsModule;
        if (mods.mentionsAutocomplete) this.mentionsAutocomplete = mods.mentionsAutocomplete;
        if (mods.mentionsSystem) this.mentionsSystem = mods.mentionsSystem;
        if (mods.slaPredictor) this.slaPredictor = mods.slaPredictor;
        if (mods.slaBreachRisk) this.slaBreachRisk = mods.slaBreachRisk;
        if (mods.slaMonitor) this.slaMonitor = mods.slaMonitor;
        if (mods.balancedViewRenderer) this.balancedViewRenderer = mods.balancedViewRenderer;

        // Register provided modules into the unique-var registry for observability
        try {
            if (mods.attachmentsModule) this._registeredModuleNames.attachmentsModule = this.registry.ensure('attachmentsModule', mods.attachmentsModule, { owner: 'FlowingV2' });
        } catch (e) { /* ignore */ }
        try {
            if (mods.commentsModule) this._registeredModuleNames.commentsModule = this.registry.ensure('commentsModule', mods.commentsModule, { owner: 'FlowingV2' });
        } catch (e) { /* ignore */ }
        try {
            if (mods.mentionsAutocomplete) this._registeredModuleNames.mentionsAutocomplete = this.registry.ensure('mentionsAutocomplete', mods.mentionsAutocomplete, { owner: 'FlowingV2' });
        } catch (e) { /* ignore */ }
        try {
            if (mods.mentionsSystem) this._registeredModuleNames.mentionsSystem = this.registry.ensure('mentionsSystem', mods.mentionsSystem, { owner: 'FlowingV2' });
        } catch (e) { /* ignore */ }
        try {
            if (mods.slaPredictor) this._registeredModuleNames.slaPredictor = this.registry.ensure('slaPredictor', mods.slaPredictor, { owner: 'FlowingV2' });
        } catch (e) { /* ignore */ }
        try {
            if (mods.slaBreachRisk) this._registeredModuleNames.slaBreachRisk = this.registry.ensure('slaBreachRisk', mods.slaBreachRisk, { owner: 'FlowingV2' });
        } catch (e) { /* ignore */ }
        try {
            if (mods.slaMonitor) this._registeredModuleNames.slaMonitor = this.registry.ensure('slaMonitor', mods.slaMonitor, { owner: 'FlowingV2' });
        } catch (e) { /* ignore */ }
        try {
            if (mods.balancedViewRenderer) this._registeredModuleNames.balancedViewRenderer = this.registry.ensure('balancedViewRenderer', mods.balancedViewRenderer, { owner: 'FlowingV2' });
        } catch (e) { /* ignore */ }
    }

    // Attach a canonical delegated handler for issue details buttons.
    // This does NOT run automatically; call `flowingV2.attachDetailsDelegated()`
    // from app bootstrap if you want Flowing-V2 to manage delegation.
    attachDetailsDelegated() {
        try {
            if (typeof document === 'undefined') return;
            if (this._detailsDelegatedBound || window._flowingDetailsDelegated) { this._detailsDelegatedBound = true; return; }
            document.addEventListener('click', async (e) => {
                try {
                    const btn = e.target && e.target.closest && e.target.closest(CANONICAL.DETAILS_BUTTONS);
                    if (!btn) return;
                    if (btn._flowingBound) return;
                    const issueKey = btn.getAttribute('data-issue-key') || (btn.dataset && btn.dataset.issueKey) || (btn.closest && btn.closest('[data-issue-key]') && btn.closest('[data-issue-key]').getAttribute('data-issue-key'));
                    if (!issueKey) return;
                    try { e.preventDefault(); e.stopPropagation(); } catch (_) { }
                    if (typeof window.loadIssueDetails === 'function') {
                        await window.loadIssueDetails(issueKey);
                    } else if (window.flowingV2 && typeof window.flowingV2.loadTicketIntoBalancedView === 'function') {
                        await window.flowingV2.loadTicketIntoBalancedView(issueKey);
                    }
                } catch (err) { console.warn('FlowingV2 delegated details handler failed', err); }
            }, { passive: false });
            this._detailsDelegatedBound = true;
            try { window._flowingDetailsDelegated = true; } catch (e) { /* ignore */ }
        } catch (e) { console.warn('FlowingV2.attachDetailsDelegated failed', e); }
    }

    // === SECTION: Dependency Injection API ===
    // Register a single module by friendly name (accepts short aliases)
    registerModule(name, module) {
        if (!name) throw new Error('registerModule requires a name');
        const canonical = (function mapAlias(n) {
            const k = String(n || '').toLowerCase();
            if (k === 'attachments' || k === 'attachmentsmodule') return 'attachmentsModule';
            if (k === 'comments' || k === 'commentsmodule') return 'commentsModule';
            if (k.indexOf('mention') >= 0 || k === 'mentions' || k === 'mentionsautocomplete' || k === 'mentions-autocomplete') {
                // prefer the lighter autocomplete module when explicitly named
                if (k.includes('autocomplete') || k.includes('mentionsautocomplete')) return 'mentionsAutocomplete';
                // otherwise map to the classic mentions system
                if (k.includes('system') || k.includes('mentionsystem') || k.includes('mention-system')) return 'mentionsSystem';
                return 'mentionsAutocomplete';
            }
            if (k === 'sla' || k === 'slamonitor') return 'slaMonitor';
            if (k === 'slapredictor' || k === 'sla-predictor' || k.indexOf('predict') >= 0) return 'slaPredictor';
            if (k.indexOf('breach') >= 0) return 'slaBreachRisk';
            if (k === 'balanced' || k === 'balancedview' || k === 'balancedviewrenderer' || k === 'balanced-view-renderer' || k === 'balanced-view' || k === 'balanced-renderer') return 'balancedViewRenderer';
            return name;
        })(name);
        const mods = {};
        mods[canonical] = module;
        this.setModules(mods);
        return this._registeredModuleNames[canonical] || null;
    }

    // Register multiple modules at once (alias to setModules)
    registerModules(mods = {}) {
        this.setModules(mods);
        return Object.assign({}, this._registeredModuleNames);
    }

    // Retrieve a module by name; falls back to window.* if not injected
    getModule(name) {
        if (!name) return null;
        const canonical = (function mapAlias(n) {
            const k = String(n || '').toLowerCase();
            if (k === 'attachments' || k === 'attachmentsmodule') return 'attachmentsModule';
            if (k === 'comments' || k === 'commentsmodule') return 'commentsModule';
            if (k.indexOf('mention') >= 0 || k === 'mentions' || k === 'mentionsautocomplete' || k === 'mentions-autocomplete') {
                if (k.includes('autocomplete') || k.includes('mentionsautocomplete')) return 'mentionsAutocomplete';
                if (k.includes('system') || k.includes('mentionsystem') || k.includes('mention-system')) return 'mentionsSystem';
                return 'mentionsAutocomplete';
            }
            if (k === 'sla' || k === 'slamonitor') return 'slaMonitor';
            if (k === 'slapredictor' || k === 'sla-predictor' || k.indexOf('predict') >= 0) return 'slaPredictor';
            if (k.indexOf('breach') >= 0) return 'slaBreachRisk';
            if (k === 'balanced' || k === 'balancedview' || k === 'balancedviewrenderer' || k === 'balanced-view-renderer' || k === 'balanced-view' || k === 'balanced-renderer') return 'balancedViewRenderer';
            return name;
        })(name);
        try {
            if (this[canonical]) return this[canonical];
            if (typeof window !== 'undefined' && window[canonical]) return window[canonical];
        } catch (e) { /* ignore */ }
        return null;
    }

    // Ensure modules exist; returns true if all present or an array of missing keys
    requireModules(keys = [], opts = { strict: false }) {
        const arr = Array.isArray(keys) ? keys : [keys];
        const missing = [];
        arr.forEach(k => {
            if (!this.getModule(k)) missing.push(k);
        });
        if (opts && opts.strict && missing.length) throw new Error('Missing modules: ' + missing.join(', '));
        return missing.length === 0 ? true : missing;
    }

    // List registered module names (as registered in the unique-var-registry)
    listRegisteredModules() {
        return Object.assign({}, this._registeredModuleNames);
    }

    // === SECTION: DOM Helpers ===
    // Create a minimal main container for Flowing-V2 when the host page
    // does not provide `#balancedContentContainer`. This is idempotent and
    // registers the created element in the UniqueVarRegistry.
    createRootContainer(opts = {}) {
        if (typeof document === 'undefined') return null;
        const sel = String(this.rootSelector || '#balancedContentContainer');

        // Attempt to find existing element with a safe lookup (handles invalid selectors)
        try {
            const found = sel && sel.startsWith('#') ? document.getElementById(sel.slice(1)) : document.querySelector(sel);
            if (found) return found;
        } catch (e) {
            // ignore invalid selector and continue with known candidates
        }

        // Try known root candidates (canonical list)
        const candidate = findFirstMatching(CANONICAL.ROOT_CANDIDATES);
        if (candidate) return candidate;

        // Build a minimal root container and attach to a sensible parent
        try {
            const rootId = (this.rootSelector && this.rootSelector.startsWith('#')) ? this.rootSelector.slice(1) : 'balancedContentContainer';
            const rootEl = document.createElement('div');
            rootEl.id = rootId;
            rootEl.className = 'flowing-v2-root';

            // Left section (main)
            const left = document.createElement('div');
            left.className = 'left-arriba';
            const header = document.createElement('div');
            header.id = 'flowingHeader';
            header.className = 'flowing-header';
            header.innerHTML = '<div class="flowing-header-title">Ticket</div>';
            left.appendChild(header);
            const balancedMain = document.createElement('div');
            balancedMain.id = 'BalancedMain';
            balancedMain.className = 'balanced-main';
            left.appendChild(balancedMain);

            // Right section (sidebar)
            const right = document.createElement('div');
            right.className = 'right-abajo';

            // Attachments container
            const attachmentsRight = document.createElement('div');
            attachmentsRight.id = 'AttachmentsListRight';
            right.appendChild(attachmentsRight);

            // SLA monitor container
            const slaContainer = document.createElement('div');
            slaContainer.id = 'slaMonitorContainer';
            right.appendChild(slaContainer);

            // Comments
            const commentsSection = document.createElement('div');
            commentsSection.className = 'comments-section';
            const commentsList = document.createElement('div');
            commentsList.className = 'comments-list';
            commentsSection.appendChild(commentsList);
            const composer = document.createElement('div');
            composer.className = 'comment-composer';
            const textarea = document.createElement('textarea');
            textarea.id = 'footerCommentText';
            textarea.placeholder = 'Write a comment...';
            composer.appendChild(textarea);
            const composerBtn = document.createElement('button');
            composerBtn.className = 'flowing-btn';
            composerBtn.type = 'button';
            composerBtn.textContent = 'Comment';
            composer.appendChild(composerBtn);
            commentsSection.appendChild(composer);
            right.appendChild(commentsSection);

            // Footer placeholder
            const footer = document.createElement('div');
            footer.id = 'FlowingFooter';
            footer.className = 'flowing-footer';

            // Assemble
            rootEl.appendChild(left);
            rootEl.appendChild(right);
            rootEl.appendChild(footer);

            // Append to sensible container (#app, #root, body)
            const parent = document.getElementById('app') || document.getElementById('root') || document.body || document.documentElement;
            try { parent.appendChild(rootEl); } catch (e) { document.documentElement.appendChild(rootEl); }

            // Register the created root in the registry
            try { this.registry.ensure(rootEl.id, rootEl, { owner: 'FlowingV2' }); } catch (e) { /* ignore */ }
            return rootEl;
        } catch (err) {
            try { console.warn('FlowingV2.createRootContainer failed', err); } catch (__) { }
            return null;
        }
    }

    init(mods = {}, exposeGlobal = false) {
        // === SECTION: Initialization & Global Exposure ===
        if (this.initialized) return;
        // accept optional modules at init time
        if (mods && typeof mods === 'object') this.setModules(mods);
        // Ensure the Flowing V2 stylesheet is present in the document
        try { this.ensureCssInjected(); } catch (e) { /* ignore */ }
        this.root = document.querySelector(this.rootSelector) || document.getElementById(this.rootSelector.replace(/^#/, '')) || null;
        // If no root exists, create a minimal root container for Flowing-V2
        if (!this.root) {
            try { this.root = this.createRootContainer(); } catch (e) { /* ignore */ }
        }
        // Expose globals only when explicitly requested (either via
        // constructor opts.exposeGlobal or init(..., true)).
        if (exposeGlobal || this.exposeGlobal) {
            try {
                window._flowing = window._flowing || {};
                window._flowing.flowingV2 = this;
                window.flowingV2 = window.flowingV2 || {};
                // auto-inject CSS for Flowing V2
                try { this.ensureCssInjected(); } catch (e) { /* ignore */ }
                // expose API surface and helper to register modules at runtime
                    ['init', 'renderBalancedContent', 'renderAttachments', 'loadComments', 'loadTicketIntoBalancedView', 'renderSLAPanel', 'adjustCommentsHeight', 'show', 'hide', 'isVisible', 'setModules', 'registerModule', 'registerModules', 'getModule', 'requireModules', 'listRegisteredModules', 'attachDetailsDelegated', 'ensureCssInjected'].forEach(fn => {
                        if (typeof this[fn] === 'function') window.flowingV2[fn] = this[fn].bind(this);
                    });
                // expose config
                try { window.flowingV2.cssPath = this.cssPath; } catch (e) { }
                // expose resolved module references under window.flowingV2.modules for convenience
                try {
                    window.flowingV2.modules = window.flowingV2.modules || {};
                    const keys = ['attachmentsModule', 'commentsModule', 'mentionsAutocomplete', 'mentionsSystem', 'slaPredictor', 'slaBreachRisk', 'slaMonitor', 'balancedViewRenderer'];
                    keys.forEach(k => {
                        try {
                            if (this[k]) window.flowingV2.modules[k] = this[k];
                            else if (typeof window !== 'undefined' && window[k]) window.flowingV2.modules[k] = window[k];
                        } catch (__) { /* ignore */ }
                    });
                } catch (e) { /* ignore */ }
                // Expose lightweight legacy globals for backward compatibility (do not override existing globals)
                try {
                    if (typeof window !== 'undefined') {
                        try { if (!window.attachmentsModule && this.attachmentsModule) window.attachmentsModule = this.attachmentsModule; } catch (__) { }
                        try { if (!window.commentsModule && this.commentsModule) window.commentsModule = this.commentsModule; } catch (__) { }
                        try { if (!window.slaPredictor && this.slaPredictor) window.slaPredictor = this.slaPredictor; } catch (__) { }
                        try { if (!window.slaBreachRisk && this.slaBreachRisk) window.slaBreachRisk = this.slaBreachRisk; } catch (__) { }
                        try { if (!window.slaMonitor && this.slaMonitor) window.slaMonitor = this.slaMonitor; } catch (__) { }
                    }
                } catch (e) { /* ignore */ }
            } catch (e) {
                console.warn('FlowingV2: failed to expose global instance', e);
            }
        }
        this.initialized = true;
    }

    // === SECTION: Render: Balanced Content ===
    async renderBalancedContent(issue) {
        // Explicit: require an injected balancedViewRenderer module.
        if (!this.balancedViewRenderer || typeof this.balancedViewRenderer.renderBalancedContent !== 'function') {
            console.error('FlowingV2: balancedViewRenderer not provided. Call flowingV2.setModules({ balancedViewRenderer }) or init({ balancedViewRenderer }).');
            return null;
        }
        return this.balancedViewRenderer.renderBalancedContent(issue);
    }

    // === SECTION: Render: Attachments ===
    async renderAttachments(issue) {
        // Use injected attachmentsModule when available, otherwise fall back to window.attachmentsModule
        const container = findFirstMatching(CANONICAL.ATTACHMENTS_CONTAINERS);
        if (!container) return null;
        if (!this.attachmentsModule || typeof this.attachmentsModule.renderFullItemsInto !== 'function') {
            console.error('FlowingV2: attachmentsModule not provided. Call flowingV2.setModules({ attachmentsModule }) or init({ attachmentsModule }).');
            return null;
        }
        return this.attachmentsModule.renderFullItemsInto(container, issue);
    }

    // === SECTION: Attachments Helpers ===
    // Small helper to expose buildAttachmentsHTML via the orchestrator
    buildAttachmentsHTML(issue, opts = {}) {
        if (!this.attachmentsModule || typeof this.attachmentsModule.buildAttachmentsHTML !== 'function') {
            console.error('FlowingV2: attachmentsModule.buildAttachmentsHTML not available. Ensure modules are wired at bootstrap.');
            return { frag: document.createDocumentFragment(), thumbFrag: document.createDocumentFragment(), items: [], thumbs: [], hash: '' };
        }
        try {
            return this.attachmentsModule.buildAttachmentsHTML(issue, opts);
        } catch (e) {
            console.warn('FlowingV2.buildAttachmentsHTML failed', e);
            return { frag: document.createDocumentFragment(), thumbFrag: document.createDocumentFragment(), items: [], thumbs: [], hash: '' };
        }
    }

    // === SECTION: Comments API ===
    async loadComments(issueKey) {
        if (!this.commentsModule || typeof this.commentsModule.loadIssueComments !== 'function') {
            console.error('FlowingV2: commentsModule not provided. Call flowingV2.setModules({ commentsModule }) or init({ commentsModule }).');
            return null;
        }
        return this.commentsModule.loadIssueComments(issueKey, { listSelector: CANONICAL.COMMENTS_LIST, countSelector: CANONICAL.COMMENT_COUNT, order: 'desc' });
    }

    // === SECTION: SLA API ===
    renderSLAPanel(issueKey) {
        if (!this.slaMonitor || typeof this.slaMonitor.renderSLAPanel !== 'function') {
            console.error('FlowingV2: slaMonitor not provided. Call flowingV2.setModules({ slaMonitor }) or init({ slaMonitor }).');
            return null;
        }
        return this.slaMonitor.renderSLAPanel(issueKey);
    }

    // === SECTION: Layout Helpers ===
    adjustCommentsHeight() {
        try {
            const container = findFirstMatching([this.rootSelector].concat(CANONICAL.ROOT_CANDIDATES));
            if (!container) return;
            const left = container.querySelector('.left-arriba');
            const comments = container.querySelector('.comments-section');
            const composer = container.querySelector('.comment-composer');
            if (!left || !comments) return;
            const leftH = Math.max(200, Math.round(left.getBoundingClientRect().height || 400));
            const header = document.getElementById('flowingHeader') || container.querySelector('.flowing-header');
            const headerH = header ? Math.round(header.getBoundingClientRect().height || 0) : 0;
            const composerH = composer ? Math.round(composer.getBoundingClientRect().height || 0) : 0;
            const avail = Math.max(120, leftH - headerH - composerH - 16);
            // Prefer setting a CSS variable on the root container so styles remain in CSS
            try {
                const rootEl = container || document.documentElement;
                rootEl.style.setProperty('--flowing-comments-max-height', `${avail}px`);
            } catch (e) {
                // fallback to direct inline style if CSS variables aren't available
                comments.style.maxHeight = `${avail}px`;
                comments.style.overflowY = 'auto';
            }
        } catch (e) { console.warn('FlowingV2: adjustCommentsHeight failed', e); }
    }

    // Inject a small visibility helper CSS so we can toggle balanced view
    // visibility via class manipulation instead of setting inline styles.
    ensureVisibilityCss() {
        if (typeof document === 'undefined') return;
        if (this._visibilityCssInjected) return;
        try {
            const id = 'flowing-v2-visibility-css';
            if (document.getElementById(id)) { this._visibilityCssInjected = true; return; }
            const style = document.createElement('style');
            style.id = id;
            style.type = 'text/css';
            // Hide balanced view only when the 'balanced-hidden' class is present.
            style.appendChild(document.createTextNode(`\n                .flowing-view.balanced-view.balanced-hidden { display: none !important; }\n            `));
            (document.head || document.getElementsByTagName('head')[0] || document.documentElement).appendChild(style);
            this._visibilityCssInjected = true;
        } catch (e) { /* ignore */ }
    }

    // === SECTION: Visibility API (centralized show/hide) ===
    isVisible() {
        try {
            const bv = document.getElementById('balancedView') || document.querySelector('.flowing-view.balanced-view') || document.querySelector(this.rootSelector) || this.root;
            if (!bv) return false;
            // Minimal visibility check: presence of the 'balanced-hidden' class
            return !(bv.classList && bv.classList.contains('balanced-hidden'));
        } catch (e) { return false; }
    }

    show() {
        try {
            if (typeof document === 'undefined') return;
            if (this.isVisible && this.isVisible()) return;

            // Ensure helper CSS exists (lightweight)
            try { this.ensureVisibilityCss(); } catch (_) { }

            // Locate or create the balanced view container
            let bv = document.getElementById('balancedView') || document.querySelector('.flowing-view.balanced-view') || document.querySelector(this.rootSelector) || this.root;
            if (!bv) {
                try { bv = this.createRootContainer() || this.root; } catch (_) { /* ignore */ }
            }

            if (bv) {
                try { bv.classList.remove('balanced-hidden'); } catch (_) { }
                try { if (bv.setAttribute) bv.setAttribute('aria-hidden', 'false'); } catch (_) { }
            }

            try { this.adjustCommentsHeight(); } catch (_) { }
        } catch (e) { console.warn('FlowingV2.show failed', e); }
    }

    hide() {
        try {
            if (typeof document === 'undefined') return;
            try { this.ensureVisibilityCss(); } catch (_) { }

            const bv = document.getElementById('balancedView') || document.querySelector('.flowing-view.balanced-view') || document.querySelector(this.rootSelector) || this.root;
            if (bv) {
                try { bv.classList.add('balanced-hidden'); } catch (_) { }
                try { if (bv.setAttribute) bv.setAttribute('aria-hidden', 'true'); } catch (_) { }
            }

            try { this.adjustCommentsHeight(); } catch (_) { }
        } catch (e) { console.warn('FlowingV2.hide failed', e); }
    }

    // toggle() removed intentionally: Flowing-V2 now exposes explicit show() / hide()
    // and the application should call those methods directly. Removing toggle
    // avoids ambiguous UI state and prevents accidental toggling from legacy callers.

    // === SECTION: Load a ticket and render full balanced view ===
    async loadTicketIntoBalancedView(issueKey, issueObj = null) {
        // Accept either (issueKey, issueObj) OR a single issue object as the first param
        if (!issueKey && !issueObj) return null;
        try {
            let issue = null;
            let issueKeyStr = null;
            if (issueKey && typeof issueKey === 'object') {
                // caller passed an issue object as first argument
                issue = issueKey;
                try { issueKeyStr = issue && (issue.key || (issue.fields && issue.fields.key)) ? issue.key || issue.fields.key : null; } catch (__) { issueKeyStr = null; }
            } else {
                issueKeyStr = issueKey;
                issue = issueObj || null;
            }

            // Prefer fetching a fresh copy by issueKey when available. Use provided issueObj only as a fallback.
            if (issueKeyStr) {
                try {
                    const resp = await fetch(`/api/servicedesk/request/${encodeURIComponent(issueKeyStr)}`);
                    if (resp && resp.ok) {
                        const d = await resp.json();
                        issue = d?.data || d || issue;
                    } else {
                        // fetch failed or not ok -> fallback to provided object if any
                        if (!issue && issueObj) issue = issueObj;
                    }
                } catch (e) {
                    // network/fetch error -> fallback to provided object if available
                    if (!issue && issueObj) issue = issueObj;
                }
            } else {
                // no issue key provided; use provided issue object if present
                if (!issue && issueObj) issue = issueObj;
            }

            if (!issue) return null;

            // Render balanced content (balanced renderer expects an issue object)
            try {
                const content = await this.renderBalancedContent(issue);
                const balancedMain = (this.root && this.root.querySelector(CANONICAL.BALANCED_MAIN)) || findFirstMatching(CANONICAL.BALANCED_MAIN) || document.querySelector(CANONICAL.BALANCED_MAIN);
                if (balancedMain) {
                    // Only replace BalancedMain content if the renderer returned a node/string
                    if (content && (content.nodeType || typeof content === 'string')) {
                        try { balancedMain.innerHTML = ''; } catch (__) { /* ignore */ }
                        if (content.nodeType) balancedMain.appendChild(content);
                        else balancedMain.innerHTML = content;
                    } else {
                        // Renderer likely wrote directly into the DOM; do not clear
                    }
                }
            } catch (e) { console.warn('FlowingV2: renderBalancedContent failed', e); }

            // Render attachments and comments (best-effort)
            try { await this.renderAttachments(issue); } catch (e) { /* ignore */ }
            try { await this.loadComments(issueKeyStr || (issue && issue.key)); } catch (e) { /* ignore */ }

            // Render SLA panel into the SLA container
            try {
                const panelContainer = (this.root && this.root.querySelector(CANONICAL.SLA_MONITOR)) || findFirstMatching(CANONICAL.SLA_MONITOR) || document.querySelector(CANONICAL.SLA_MONITOR);
                if (panelContainer) {
                    let panel = null;
                    try {
                        const keyToUse = issueKeyStr || (issue && issue.key);
                        if (this.slaMonitor && typeof this.slaMonitor.renderSLAPanel === 'function') panel = this.slaMonitor.renderSLAPanel(keyToUse);
                        else if (typeof window !== 'undefined' && window.slaMonitor && typeof window.slaMonitor.renderSLAPanel === 'function') panel = window.slaMonitor.renderSLAPanel(keyToUse);
                    } catch (e) { console.warn('FlowingV2: slaMonitor render failed', e); }
                    if (panel) {
                        try { panelContainer.innerHTML = ''; } catch (__) { /* ignore */ }
                        if (panel.nodeType) panelContainer.appendChild(panel); else panelContainer.innerHTML = String(panel);
                    }
                }
            } catch (e) { /* ignore */ }

            // Ensure prediction is requested/published using local ticket data to avoid refetch
            try {
                const keyToUse = issueKeyStr || (issue && issue.key);
                if (this.slaMonitor && typeof this.slaMonitor.predictBreachAndPublish === 'function') {
                    await this.slaMonitor.predictBreachAndPublish(keyToUse, issue);
                } else if (this.slaPredictor && typeof this.slaPredictor.predictBreach === 'function') {
                    const pred = await this.slaPredictor.predictBreach(keyToUse, issue);
                    try { const evt = new CustomEvent('sla:prediction', { detail: { issueKey: keyToUse, prediction: pred } }); if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(evt); } catch (e) { /* ignore */ }
                } else if (typeof window !== 'undefined' && window.slaPredictor && typeof window.slaPredictor.predictBreach === 'function') {
                    const pred = await window.slaPredictor.predictBreach(keyToUse, issue);
                    try { const evt = new CustomEvent('sla:prediction', { detail: { issueKey: keyToUse, prediction: pred } }); if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(evt); } catch (e) { /* ignore */ }
                }
            } catch (e) { console.warn('FlowingV2: predictor publish failed', e); }

            // Adjust UI
            try { this.adjustCommentsHeight(); } catch (e) { /* ignore */ }
            // Centralized: show the balanced view after rendering
            try { if (typeof this.show === 'function') this.show(); } catch (e) { /* ignore */ }

            // Remember last loaded issue for other modules (e.g., recommendation banner)
            try { this._lastLoadedIssueKey = issue && issue.key ? issue.key : null; } catch (e) { /* ignore */ }

            return issue || true;
        } catch (e) {
            console.warn('FlowingV2.loadTicketIntoBalancedView failed', e);
            return null;
        }
    }
}

// === SECTION: Factory & Exports ===
// Factory helper: create instance and optionally expose global variables
export function createFlowingV2Instance(mods = {}, exposeGlobal = false, opts = {}) {
    const inst = new FlowingV2(opts || {});
    inst.init(mods || {}, !!exposeGlobal);
    return inst;
}

// Export the class; do NOT create or expose instances by default.
export default FlowingV2;

// Auto-create a single global instance so FlowingV2 is the canonical orchestrator.
// This makes FlowingV2 the single place that other scripts should consult.
try {
    // === SECTION: Auto-init singleton (global exposure) ===
    const _auto = new FlowingV2({ exposeGlobal: false });
    // Wire canonical modules discovered via static imports / globals
    try {
        _auto.setModules({
            attachmentsModule: (AttachmentsModule && (AttachmentsModule.default || AttachmentsModule)) || (window.attachmentsModule || null),
            balancedViewRenderer: (BalancedRenderer && BalancedRenderer) || (window.balancedViewRenderer || null),
            commentsModule: window.commentsModule || null,
            slaMonitor: (SLAMonitorModule || window.slaMonitor) || null,
            mentionsAutocomplete: window.mentionsAutocomplete || null,
            mentionsSystem: window.mentionsSystem || window.mentionSystem || null,
            slaPredictor: (SlaPredictorModule || window.slaPredictor) || null,
            slaBreachRisk: (SlaBreachModule || window.slaBreachRisk || window.slaPredictor) || null
        });
    } catch (e) { /* ignore wiring errors */ }

    // Initialize and expose globally
    _auto.init({}, true);
    // Ensure direct global alias
    try { window.flowingV2 = window.flowingV2 || _auto; } catch (e) { /* ignore non-browser env */ }
} catch (e) {
    // If any of the above fails, do not crash page load — log for diagnostics
    try { console.warn('FlowingV2: auto-init failed', e); } catch (__) { }
}
