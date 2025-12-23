// Flowing MVP Footer JS

/**
 * FLOWING MVP FOOTER
 * Collapsible chat assistant with context awareness
 */

// Flowing MVP Footer script

class FlowingFooter {
    constructor() {
        this.footer = null;
        this.toggleBtn = null;
        this.messagesContainer = null;
        this.input = null;
        this.sendBtn = null;
        this.contextBadge = null;
        this.suggestionElement = null;
        this.root = null;
        this.headerEl = null;
        this.balancedView = null;
        this.balancedContentContainer = null;
        this.toggleHit = null;
        this.footerCommentText = null;
        this.attachBtn = null;
        this.attachmentsPreview = null;
        this.attachmentsListFooter = null;
        this.attachmentsListRight = null;
        this.attachmentsListHeader = null;
        this.kanbanView = null;
        this.isExpanded = false;
        this.isLoading = false;
        this.context = {
            currentDesk: null,
            currentQueue: null,
            selectedIssue: null,
            viewMode: 'kanban'
        };
        this.suggestions = [];
        this.currentSuggestionIndex = 0;
        this.suggestionInterval = null;
        this.lastAnalyzeAt = 0;
        this.suggestionPaused = false;

        this.init();
    }


    // Utility: strip HTML tags and normalize whitespace for stable comparisons
    _stripHTML(text = '') {
        try {
            return (text + '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        } catch (e) { return (text || '').toString(); }
    }

    init() {
        console.log('🤖 Initializing Flowing MVP Footer...');

        // Get DOM elements
        this.footer = document.getElementById('flowingFooter');
        this.toggleBtn = document.getElementById('flowingToggleBtn');
        this.messagesContainer = document.getElementById('flowingMessages');
        this.input = document.getElementById('flowingInput');
        this.sendBtn = document.getElementById('flowingSendBtn');
        this.contextBadge = document.getElementById('flowingContextBadge');
        this.suggestionElement = document.getElementById('flowingSuggestion');

        // Additional DOM nodes used across the component (captured here for clarity)
        this.root = document.getElementById('flowing-root') || document.getElementById('flowingRoot');
        this.headerEl = document.getElementById('flowingHeader') || (this.footer && this.footer.querySelector('.flowing-header'));
        this.toggleHit = document.getElementById('flowingToggleHit');
        this.balancedView = document.getElementById('balancedView');
        this.balancedContentContainer = document.getElementById('balancedContentContainer');
        this.footerCommentText = document.getElementById('footerCommentText');
        this.attachBtn = document.getElementById('attachFooterBtn');
        this.attachmentsPreview = document.getElementById('attachmentsPreviewFooter');
        this.attachmentsListFooter = document.getElementById('attachmentsListFooter');
        this.attachmentsListRight = document.getElementById('attachmentsListRight');
        this.attachmentsListHeader = document.getElementById('attachmentsListHeader');
        this.kanbanView = document.getElementById('kanbanView');

        if (!this.footer) {
            console.error('❌ Flowing MVP footer not found');
            return;
        }

        this.attachEventListeners();
        this.updateContext();
        this.setupContextWatcher();
        this.startSuggestionRotation();

        // Consolidated handler: Flowing MVP is the single source of truth for
        // switching to the balanced view. Listen for the 'flowing:switchedToBalanced'
        // event emitted by any legacy callers or integrations and route it here.
        try {
            if (!this._flowingEventAttached) {
                window.addEventListener('flowing:switchedToBalanced', (ev) => {
                    try {
                        if (!ev || ev.detail === undefined || ev.detail === null) return;
                        let issueKey = null;
                        if (typeof ev.detail === 'string') issueKey = ev.detail;
                        else if (typeof ev.detail === 'object' && ev.detail.issueKey) issueKey = ev.detail.issueKey;
                        else if (typeof ev.detail === 'object' && ev.detail.key) issueKey = ev.detail.key;
                        else issueKey = ev.detail;

                        if (!issueKey) return;

                        // If we're already showing the requested issue and expanded, ignore
                        if (this.context && this.context.selectedIssue === issueKey && this.isExpanded) {
                            console.log('🔕 flowing:switchedToBalanced ignored (already active):', issueKey);
                            return;
                        }

                        console.log('📣 FlowingFooter handling flowing:switchedToBalanced ->', issueKey);
                        this.switchToBalancedView(issueKey);
                    } catch (e) { console.warn('Error handling flowing:switchedToBalanced', e); }
                }, { passive: true });
                this._flowingEventAttached = true;
            }
        } catch (e) { /* ignore */ }

        // Initialize audio controls (sound alerts)
        try { window.FlowingAudio && window.FlowingAudio.attachControls && window.FlowingAudio.attachControls(); } catch (e) { /* ignore */ }

        // Ensure footer responds to sidebar collapse/expand events
        try {
            if (typeof window.addEventListener === 'function') {
                window.addEventListener('sidebarToggled', () => {
                    const sidebar = document.querySelector('.sidebar-content-component');
                    const collapsed = !!(sidebar && sidebar.classList && typeof sidebar.classList.contains === 'function' ? sidebar.classList.contains('collapsed') : (sidebar && (sidebar.className || '').indexOf('collapsed') !== -1));
                    if (document && document.body && typeof document.body.classList === 'object' && typeof document.body.classList.toggle === 'function') {
                        document.body.classList.toggle('sidebar-collapsed', collapsed);
                    }
                    this.adjustContentPadding(collapsed);
                });
            }

            // Observe class changes on sidebar to react to programmatic toggles
            const sb = document.querySelector('.sidebar-content-component');
            if (sb) {
                const mo = new MutationObserver(() => {
                    const c = sb.classList.contains('collapsed');
                    document.body.classList.toggle('sidebar-collapsed', c);
                    this.adjustContentPadding(c);
                });
                mo.observe(sb, { attributes: true, attributeFilter: ['class'] });
            }
        } catch (e) { console.warn('Could not attach sidebar observers for FlowingFooter:', e); }

        // Set initial padding
        this.adjustContentPadding(true); // Start collapsed

        // Ensure balanced view is present in the DOM (must be provided by templates)
        if (!this.balancedView) {
            console.error('❌ Balanced view not found');
            return;
        }

        // Ensure header exists and is visible; do NOT create fallbacks here —
        // header/footer must be declared in the page template (index.html)
        if (this.headerEl) {
            try {
                this.headerEl.style.display = 'block';
                this.headerEl.style.visibility = 'visible';
                if (this.headerEl.removeAttribute) this.headerEl.removeAttribute('hidden');
                if (this.headerEl.setAttribute) this.headerEl.setAttribute('aria-hidden', 'false');
            } catch (e) { /* ignore */ }
        }

        // Start collapsed (only header + suggestions)
        try { this.collapse(); } catch (e) { /* ignore */ }

        console.log('✅ Flowing MVP ready');
    }

    attachEventListeners() {
        // Simplified toggle: only expand/collapse balanced view
        try {
            // Prefer the explicit toggle button, fallback to a hit area
            const btn = document.getElementById('flowingToggleBtn') || document.getElementById('flowingToggleHit');
            if (!btn) return;
            this.toggleBtn = btn;

            // Basic accessibility attributes
            try {
                this.toggleBtn.setAttribute('role', 'button');
                this.toggleBtn.setAttribute('tabindex', '0');
                this.toggleBtn.setAttribute('aria-controls', 'flowingContent');
                this.toggleBtn.setAttribute('aria-expanded', String(!!this.isExpanded));
                this.toggleBtn.textContent = this.isExpanded ? '▴' : '▾';
            } catch (e) { /* ignore */ }

            // Attach idempotent listeners (avoid duplicates)
            if (!this.toggleBtn.dataset.flowingListenerAttached) {
                this.toggleBtn.addEventListener('click', (ev) => {
                    this.toggle();
                    try { window.FlowingAudio && window.FlowingAudio.playAlert && window.FlowingAudio.playAlert('beep'); } catch (ee) { }
                    try { this.toggleBtn.setAttribute('aria-expanded', String(!!this.isExpanded)); this.toggleBtn.textContent = this.isExpanded ? '▴' : '▾'; } catch (err) { }
                });

                this.toggleBtn.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        this.toggle();
                        try { this.toggleBtn.setAttribute('aria-expanded', String(!!this.isExpanded)); this.toggleBtn.textContent = this.isExpanded ? '▴' : '▾'; } catch (err) { }
                    }
                });

                this.toggleBtn.dataset.flowingListenerAttached = '1';
            }
        } catch (e) { console.warn('Could not attach toggleBtn listener', e); }

        // Global ESC handler to collapse Flowing footer (attach only once)
        try {
            if (!document._flowingEscAttached) {
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' || e.key === 'Esc') {
                        if (this.isExpanded) this.collapse();
                    }
                });
                document._flowingEscAttached = true;
            }
        } catch (e) { /* ignore */ }
    }



    setupContextWatcher() {
        // Watch for changes in window.state (set by app.js)
        setInterval(() => {
            const oldContext = JSON.stringify(this.context);
            this.updateContext();
            const newContext = JSON.stringify(this.context);

            if (oldContext !== newContext) {
                console.log('🔄 Context updated:', this.context);
                // Debounce/throttle analysis to avoid frequent re-renders
                this._throttledAnalyzeSuggestions();
            }
        }, 1000);
    }

    _throttledAnalyzeSuggestions() {
        const now = Date.now();
        // limit to once every 2.5s
        if (now - this.lastAnalyzeAt < 2500) return;
        this.lastAnalyzeAt = now;
        this.analyzeSuggestions();
        // Immediately update suggestion display after analyzing
        this.updateSuggestion();
    }

    analyzeSuggestions() {
        this.suggestions = [];

        // Get issues from cache
        const issues = window.app?.issuesCache
            ? Array.from(window.app.issuesCache.values())
            : [];

        if (issues.length === 0) {
            this.suggestions.push({
                text: 'Select a queue to get started',
                type: 'info'
            });
            return;
        }

        // Analyze overdue tickets
        const now = new Date();
        const overdueTickets = issues.filter(issue => {
            const lastChange = new Date(issue.last_real_change || issue.updated || issue.created);
            const daysSince = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
            return daysSince >= 7;
        });

        if (overdueTickets.length > 0) {
            const txt = `${SVGIcons.alert({ size: 14, className: 'inline-icon' })} ${overdueTickets.length} ticket${overdueTickets.length > 1 ? 's' : ''} overdue(7 + days)`;
            this.suggestions.push({ text: txt, type: 'warning', key: this._stripHTML(txt) });
        }

        // Analyze critical/high priority tickets
        const urgentTickets = issues.filter(issue =>
            issue.severity === 'Critico' || issue.severity === 'Alto'
        );

        if (urgentTickets.length > 0) {
            const txt = `${SVGIcons.xCircle({ size: 14, className: 'inline-icon' })} ${urgentTickets.length} urgent ticket${urgentTickets.length > 1 ? 's' : ''} require attention`;
            this.suggestions.push({ text: txt, type: 'critical', key: this._stripHTML(txt) });
        }

        // Analyze unassigned tickets
        const unassignedTickets = issues.filter(issue =>
            !issue.assignee || issue.assignee === 'Unassigned' || issue.assignee === 'No assignee'
        );

        if (unassignedTickets.length > 0) {
            const txt = `${SVGIcons.user({ size: 14, className: 'inline-icon' })} ${unassignedTickets.length} unassigned ticket${unassignedTickets.length > 1 ? 's' : ''} in queue`;
            this.suggestions.push({ text: txt, type: 'info', key: this._stripHTML(txt) });
        }

        // Analyze about to breach (3+ days)
        const aboutToBreachTickets = issues.filter(issue => {
            const lastChange = new Date(issue.last_real_change || issue.updated || issue.created);
            const daysSince = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
            return daysSince >= 3 && daysSince < 7;
        });

        if (aboutToBreachTickets.length > 0) {
            const txt = `${SVGIcons.clock({ size: 14, className: 'inline-icon' })} ${aboutToBreachTickets.length} ticket${aboutToBreachTickets.length > 1 ? 's' : ''} approaching SLA breach`;
            this.suggestions.push({ text: txt, type: 'warning', key: this._stripHTML(txt) });
        }

        // All clear message
        if (this.suggestions.length === 0) {
            const txt = `${SVGIcons.success({ size: 14, className: 'inline-icon' })} All tickets are up to date!`;
            this.suggestions.push({ text: txt, type: 'success', key: this._stripHTML(txt) });
        }

        // Add general queue info
        const txt = `${SVGIcons.chart({ size: 14, className: 'inline-icon' })} ${issues.length} ticket${issues.length > 1 ? 's' : ''} in current queue`;
        this.suggestions.push({ text: txt, type: 'info', key: this._stripHTML(txt) });
    }

    startSuggestionRotation() {
        // Initial analysis
        this.analyzeSuggestions();
        this.updateSuggestion();

        // Rotate suggestions every 6 seconds (5s visible + 1s transition)
        this.suggestionInterval = setInterval(() => {
            if (!this.suggestionPaused) this.updateSuggestion();
        }, 6000);
    }

    updateSuggestion() {
        if (!this.suggestionElement || this.suggestions.length === 0) return;

        // Fade out current suggestion
        // Only change content if different to avoid unnecessary reflows/flashes
        const suggestion = this.suggestions[this.currentSuggestionIndex];
        const currentPlain = this._stripHTML(this.suggestionElement.textContent || '');
        const incomingPlain = suggestion.key || this._stripHTML(suggestion.text || '');

        if (currentPlain === incomingPlain) {
            // Advance index but don't re-render the same content
            this.currentSuggestionIndex = (this.currentSuggestionIndex + 1) % this.suggestions.length;
            return;
        }

        this.suggestionElement.classList.remove('visible');

        // Wait for fade out, then update content
        setTimeout(() => {
            // Update content and classes (render as plain text to avoid injecting HTML)
            this.suggestionElement.textContent = this._stripHTML(suggestion.text || '');
            this.suggestionElement.classList.remove('suggestion-critical', 'suggestion-warning', 'suggestion-info', 'suggestion-success');
            // add base and type-specific class without spaces in the token
            this.suggestionElement.classList.add('suggestion', `suggestion-${(suggestion.type || 'info')}`);

            // Move to next suggestion
            this.currentSuggestionIndex = (this.currentSuggestionIndex + 1) % this.suggestions.length;

            // Fade in new suggestion after a brief delay
            setTimeout(() => {
                this.suggestionElement.classList.add('visible');
                try {
                    // Play gentle alert depending on suggestion importance
                    const type = (suggestion.type || 'info').toLowerCase();
                    const level = type === 'critical' ? 3 : (type === 'warning' ? 2 : 1);
                    if (window.FlowingAudio && window.FlowingAudio.playAlert) {
                        try { window.FlowingAudio.playAlert(level); } catch (e) { /* ignore */ }
                    }
                } catch (e) { /* ignore */ }
            }, 50);
        }, 260); // shorter fade to feel snappier but avoid flash
    }

    updateContext() {
        // Consolidate context updates to minimize DOM interactions
        const newContext = {
            currentDesk: window.state?.currentDesk || null,
            currentQueue: window.state?.currentQueue || null,
            selectedIssue: window.state?.selectedIssue || null,
            viewMode: window.state?.viewMode || 'kanban',
            issuesCount: window.app?.issuesCache?.size || 0
        };

        // Only update if context has changed
        if (JSON.stringify(this.context) !== JSON.stringify(newContext)) {
            this.context = newContext;
            this.updateContextBadge();
        }
    }

    updateContextBadge() {
        if (!this.contextBadge) return;

        const iconEl = this.contextBadge.querySelector('.context-icon');
        const textEl = this.contextBadge.querySelector('.context-text');

        // Clear icon slot to avoid flashes
        if (iconEl) {
            iconEl.innerHTML = SVGIcons?.logoSmall
                ? SVGIcons.logoSmall({ size: 16, className: 'inline-icon' })
                : '';
        }

        // Determine desired text based on context
        let desiredText = 'No context';
        if (this.context.selectedIssue) {
            const issueKey = this.context.selectedIssue;
            const issueObj = window.app?.issuesCache?.get(issueKey) ||
                window.state?.issues?.find(i => i.key === issueKey);
            const summary = issueObj?.summary || issueObj?.fields?.summary || '';
            desiredText = summary ? `${issueKey} — ${summary}` : `Ticket: ${issueKey}`;
        } else if (this.context.currentQueue) {
            desiredText = `Queue: ${this.context.currentQueue} (${this.context.issuesCount} tickets)`;
        } else if (this.context.currentDesk) {
            desiredText = `Desk: ${this.context.currentDesk}`;
        }

        // Update text only if it has changed
        if (textEl && textEl.textContent !== desiredText) {
            textEl.textContent = desiredText;
        }
    }

    toggle() {
        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
    }

    expand() {
        if (!this.footer) return;

        this.footer.classList.remove('collapsed');
        this.footer.classList.add('expanded');
        this.isExpanded = true;

        // Add balanced-active styling when expanded so overlay rules apply
        try {
            if (this.footer && this.footer.classList) this.footer.classList.add('balanced-active');
            if (document && document.body && document.body.classList) document.body.classList.add('flowing-balanced-active');
        } catch (e) { /* ignore */ }

        // Adjust content padding for expanded footer
        this.adjustContentPadding(false);

        // Ensure balanced view is visible when expanded
        try {
            const balancedView = document.getElementById('balancedView');
            if (balancedView) {
                balancedView.style.display = 'block';
                balancedView.setAttribute('aria-hidden', 'false');
            }
        } catch (e) { /* ignore */ }

        // Set max height dynamically based on viewport
        const desiredMax = Math.max(420, Math.round((window.innerHeight || 800) * 0.82));
        this.footer.style.maxHeight = `${desiredMax}px`;
        document.documentElement.style.setProperty('--flowing-footer-max', `${desiredMax}px`);

        // Recompute overlay positions so balanced view aligns with board
        try { this.computeBalancedOverlayPosition(); } catch (e) { /* ignore */ }

        console.log('🤖 Flowing MVP expanded');
        // Update global state to reflect Flowing MVP as the single source of truth
        try {
            if (!window.state) window.state = {};
            window.state.viewMode = 'balanced';
            // keep selectedIssue unchanged here; switchToBalancedView sets it
            try { window.dispatchEvent(new CustomEvent('flowing:expanded', { detail: { issueKey: this.context?.selectedIssue || null } })); } catch (e) { }
        } catch (e) { /* ignore */ }
    }

    collapse() {
        if (!this.footer) return;

        this.footer.classList.add('collapsed');
        this.footer.classList.remove('expanded');
        this.isExpanded = false;

        // Remove balanced-active styling when collapsed
        try {
            if (this.footer && this.footer.classList) this.footer.classList.remove('balanced-active');
            if (document && document.body && document.body.classList) document.body.classList.remove('flowing-balanced-active');
        } catch (e) { /* ignore */ }

        // Adjust content padding for collapsed footer
        this.adjustContentPadding(true);

        // Hide balanced view when collapsed
        try {
            const balancedView = document.getElementById('balancedView');
            if (balancedView) {
                balancedView.style.display = 'none';
                balancedView.setAttribute('aria-hidden', 'true');
            }
        } catch (e) { /* ignore */ }

        // Reset max height and remove related CSS variables
        this.footer.style.maxHeight = '';
        document.documentElement.style.removeProperty('--flowing-footer-max');

        console.log('🤖 Flowing MVP collapsed');
        // Update global state when collapsed — Flowing MVP is authoritative
        try {
            if (!window.state) window.state = {};
            window.state.selectedIssue = null;
            window.state.viewMode = 'kanban';
            try { window.dispatchEvent(new CustomEvent('flowing:collapsed')); } catch (e) { }
        } catch (e) { /* ignore */ }
    }

    adjustContentPadding(isCollapsed) {
        try {
            // Do not force global app paddings; constrain the balanced container for good UX
            const balancedEl = document.getElementById('balancedContentContainer');
            const headerEl = document.getElementById('flowingHeader') || (this.footer && this.footer.querySelector('.flowing-header'));
            let headerH = 72;
            try {
                if (headerEl && typeof headerEl.getBoundingClientRect === 'function') {
                    headerH = Math.round(headerEl.getBoundingClientRect().height);
                }
            } catch (err) { headerH = 72; }

            const viewportH = (typeof window.innerHeight === 'number') ? window.innerHeight : (document && document.documentElement && typeof document.documentElement.clientHeight === 'number') ? document.documentElement.clientHeight : 800;
            const maxH = Math.max(240, viewportH - headerH - 40); // leave margin to viewport bottom

            if (balancedEl) {
                balancedEl.style.minHeight = '240px';
                balancedEl.style.maxHeight = `${maxH}px`;
                balancedEl.style.height = 'auto';
                balancedEl.style.overflowY = 'auto';
            }
        } catch (e) {
            console.warn('adjustContentPadding error', e);
        }
    }

    // Removed public API methods as they are not being used anywhere in the codebase.

    // NOTE: chat view removed. Balanced content is shown only when expanded.

    switchToBalancedView(issueKey) {
        console.log('🎯 Switching to balanced view for:', issueKey);

        // Ensure footer is expanded when showing balanced view so layout/padding are correct
        try { this.expand(); } catch (e) { /* ignore */ }

        // Ensure expanded state so balanced content is visible
        // (no separate chat view; expand() handles showing balanced content)

        // Load ticket details into balanced view
        this.loadTicketIntoBalancedView(issueKey);

        // Update context
        this.context.selectedIssue = issueKey;
        this.updateContextBadge();

        // Reflect authoritative context in global window.state for compatibility
        try {
            if (!window.state) window.state = {};
            window.state.selectedIssue = issueKey;
            window.state.viewMode = 'balanced';
            try { window.dispatchEvent(new CustomEvent('flowing:switchedToBalanced', { detail: { issueKey } })); } catch (e) { }
        } catch (e) { /* ignore */ }

        if (this.suggestionElement) {
            this.suggestionElement.textContent = `${issueKey} - Viewing details`;
            // pause rotation while viewing a ticket to avoid overwrites/flashes
            this.pauseSuggestionRotation();
        }
    }

    pauseSuggestionRotation() {
        this.suggestionPaused = true;
    }

    resumeSuggestionRotation() {
        this.suggestionPaused = false;
    }

    // Compute and set CSS vars so the balanced overlay matches the kanban columns
    computeBalancedOverlayPosition() {
        try {
            const board = document.querySelector('.board-wrapper') || document.getElementById('kanbanView');
            const header = document.querySelector('.header-enhanced') || document.querySelector('.header') || document.querySelector('header');
            if (!this.footer) return;
            let topOffset = 72;
            if (header) {
                const hrect = header.getBoundingClientRect();
                topOffset = Math.max(topOffset, Math.round(hrect.bottom) + 8);
            }
            if (board) {
                const brect = board.getBoundingClientRect();
                // Use board top as visual anchor but never above header bottom
                const bTop = Math.round(brect.top);
                const safeTop = Math.max(topOffset, Math.max(8, bTop));
                // Avoid using brect.height because it may include artificially large padding-bottom
                const viewportH = (window.innerHeight || document.documentElement.clientHeight || 800);
                const bottomInset = 24; // leave a small gap from bottom
                const availableHeight = Math.max(240, viewportH - safeTop - bottomInset);
                this.footer.style.setProperty('--flowing-footer-overlay-top', safeTop + 'px');
                this.footer.style.setProperty('--flowing-footer-overlay-height', availableHeight + 'px');

                // Align horizontally with board where possible (accounts for sidebars)
                try {
                    const left = Math.max(8, Math.round(brect.left || 280));
                    const right = Math.max(8, Math.round((window.innerWidth || document.documentElement.clientWidth) - (brect.right || (window.innerWidth || 1200))));
                    document.documentElement.style.setProperty('--flowing-footer-left', left + 'px');
                    document.documentElement.style.setProperty('--flowing-footer-right', right + 'px');
                } catch (e) { /* ignore */ }
            } else {
                // No board available: anchor under header and fill remaining viewport
                const viewportH = (window.innerHeight || document.documentElement.clientHeight || 800);
                const bottomInset = 24;
                const available = Math.max(240, viewportH - topOffset - bottomInset);
                this.footer.style.setProperty('--flowing-footer-overlay-top', topOffset + 'px');
                this.footer.style.setProperty('--flowing-footer-overlay-height', available + 'px');
            }
        } catch (e) { /* ignore */ }
    }

    async loadTicketIntoBalancedView(issueKey) {
        console.log('📥 Loading ticket details for:', issueKey);

        const container = document.getElementById('balancedContentContainer');
        if (!container) return;

        // First check if issue exists in state (from app.js)
        let issue = window.state?.issues?.find(i => i.key === issueKey);

        if (!issue) {
            console.warn('⚠️ Issue not found in state, checking issuesCache...');
            // Try from issuesCache (Map)
            if (window.app?.issuesCache) {
                issue = window.app.issuesCache.get(issueKey);
            }
        }

        if (!issue) {
            console.error('❌ Issue not found:', issueKey);
            container.innerHTML = `
    <div style="padding:40px;text-align:center;">
          <p style="color:#ef4444;margin-bottom:16px;">❌ Issue not found in current queue</p>
                    <button onclick="window._flowingFooter?.public_collapse?.()" style="padding:10px 20px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
            <i class="fas fa-arrow-left" style="margin-right:8px;"></i> Back
          </button>
        </div>
    `;
            return;
        }

        // Show loading state
        container.innerHTML = `
    <div style="padding:40px;text-align:center;">
        <div class="loading-spinner" style="border:4px solid #f3f4f6;border-top:4px solid #3b82f6;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto;"></div>
        <p style="margin-top:16px;color:#6b7280;">Loading complete ticket details...</p>
      </div>
    `;

        try {
            // Fetch complete details from Service Desk API (same as right-sidebar)
            const response = await fetch(`/api/servicedesk/request/${issueKey}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} `);
            }

            const apiData = await response.json();
            const data = apiData.data || apiData;

            // Merge Service Desk data with existing issue data
            const completeIssue = {
                ...issue,
                ...data,
                fields: {
                    ...issue.fields,
                    ...data.fields
                }
            };

            console.log('✅ Complete issue data loaded:', completeIssue);

            // Render ticket details in balanced view
            this.renderBalancedContent(completeIssue);
            // Render attachments preview for balanced view
            try { this.renderAttachmentsForBalanced(completeIssue); } catch (e) { console.warn('Could not render attachments for balanced view', e); }
            try { this.renderFooterAttachments(completeIssue); } catch (e) { /* ignore */ }
            try { this.setupFooterAttachmentButton(); } catch (e) { /* ignore */ }

            // Load comments using the same method as right-sidebar
            this.loadCommentsForBalancedView(issueKey);
            // adjust heights after comments load
            setTimeout(() => this.adjustCommentsHeight(), 120);
            // register a resize listener once so the comments area adapts to viewport/left-section changes
            try {
                if (!this._balancedResizeRegistered) {
                    this._balancedResizeRegistered = true;
                    window.addEventListener('resize', () => { try { this.adjustCommentsHeight(); } catch (e) { } });
                }
            } catch (e) { /* ignore */ }

            // Initialize SLA Monitor (same as right-sidebar)
            this.initializeSLAMonitor(issueKey);

        } catch (error) {
            console.error('⚠️ Error fetching complete details, using cached data:', error);
            // Fallback: Use cached issue data
            this.renderBalancedContent(issue);
            try { this.renderAttachmentsForBalanced(issue); } catch (e) { /* ignore */ }
            try { this.renderFooterAttachments(issue); } catch (e) { /* ignore */ }
            try { this.setupFooterAttachmentButton(); } catch (e) { /* ignore */ }
            this.loadCommentsForBalancedView(issueKey);
            this.initializeSLAMonitor(issueKey);
        }
    }

    async initializeSLAMonitor(issueKey) {
        console.log('⏱️ Initializing SLA Monitor for:', issueKey);

        // Prefer the SLA container inside the balanced view to avoid clashing with right-sidebar copies
        const balancedContainer = document.getElementById('balancedContentContainer');
        const slaContainer = (balancedContainer && balancedContainer.querySelector('.right-section .sla-monitor-container')) || (balancedContainer && balancedContainer.querySelector('.sla-monitor-container')) || document.querySelector('.sla-monitor-container');
        if (!slaContainer) {
            console.warn('⚠️ SLA container not found');
            // still render breach risk fallback so user sees a meaningful UI even when SLA panel is missing
            this.renderBreachRisk(issueKey, null);
            return;
        }

        // Check if window.slaMonitor is available
        if (!window.slaMonitor || typeof window.slaMonitor.init !== 'function') {
            console.warn('⚠️ SLA Monitor not available');
            slaContainer.innerHTML = `
                <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px;">
                    <i class="fas fa-info-circle" style="margin-bottom:8px;font-size:16px;"></i><br>
                    SLA Monitor not available
                </div>
            `;
            // show breach-risk fallback when SLA module is not present
            this.renderBreachRisk(issueKey, null);
            return;
        }

        try {
            // Initialize SLA Monitor (same as right-sidebar)
            await window.slaMonitor.init(issueKey);

            if (window.slaMonitor.slaData && window.slaMonitor.slaData[issueKey]) {
                // Render SLA panel using the existing method
                const slaPanel = window.slaMonitor.renderSLAPanel(issueKey);
                slaContainer.innerHTML = '';
                slaContainer.appendChild(slaPanel);

                // Make the outer container transparent (no white background) but keep subtle shadow for depth
                try {
                    slaContainer.style.background = 'transparent';
                    slaContainer.style.border = 'none';
                    slaContainer.style.borderRadius = '10px';
                    // Keep a soft shadow to lift the panel slightly
                    slaContainer.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.06)';
                    // keep padding for spacing
                    slaContainer.style.padding = '12px';
                } catch (e) {
                    console.warn('Could not set slaContainer transparent:', e);
                }

                // Wait for DOM to be ready before customizing (with retries)
                const attemptCompactAdjust = (attempt = 0) => {
                    try {
                        let slaPanelElement = slaContainer.querySelector('.sla-panel') || slaContainer.querySelector('.sla-monitor') || slaContainer.querySelector('.sla-cycle');
                        if (!slaPanelElement && slaContainer.firstElementChild) slaPanelElement = slaContainer.firstElementChild;
                        if (!slaPanelElement) {
                            if (attempt < 3) {
                                // try again after a small delay
                                setTimeout(() => attemptCompactAdjust(attempt + 1), 180);
                                return;
                            }
                            console.warn('⚠️ SLA panel element not found after retries');
                            return;
                        }

                        console.log('🔧 Customizing SLA panel layout (attempt', attempt + 1, ')...');
                        try { console.log('📋 Panel HTML:', slaPanelElement.innerHTML.substring(0, 200)); } catch (e) { /* ignore */ }

                        // Hide "SLA Monitor" title if present (compact header)
                        const titleElement = slaPanelElement.querySelector('h3') || slaPanelElement.querySelector('.sla-title');
                        if (titleElement) {
                            titleElement.style.display = 'none';
                            console.log('✅ Hidden title');
                        }

                        // Move refresh button next to status badge (use SLA monitor's real classes)
                        const refreshBtn = slaPanelElement.querySelector('.sla-refresh-btn') || slaPanelElement.querySelector('.refresh-sla-btn') || slaPanelElement.querySelector('.btn-refresh-sla') || slaPanelElement.querySelector('button[onclick*="refresh"]') || Array.from(slaPanelElement.querySelectorAll('button')).find(btn => (btn.textContent || '').toLowerCase().includes('↻') || (btn.textContent || '').toLowerCase().includes('refresh'));

                        // Status badge is rendered as .cycle-status inside the SLA panel
                        const statusBadge = slaPanelElement.querySelector('.cycle-status') || slaPanelElement.querySelector('.cycle-status.healthy') || Array.from(slaPanelElement.querySelectorAll('[class*="status"]')).find(el => (el.textContent || '').toLowerCase().includes('on track') || (el.textContent || '').toLowerCase().includes('breach') || (el.textContent || '').toLowerCase().includes('breached'));

                        console.log('🔍 Refresh button:', !!refreshBtn);
                        console.log('🔍 Status badge:', !!statusBadge);

                        if (refreshBtn && statusBadge) {
                            // Get the container of the status badge (cycle-header)
                            const statusContainer = statusBadge.closest('.cycle-header') || statusBadge.parentElement || slaPanelElement.querySelector('.sla-header') || slaPanelElement;
                            if (statusContainer) {
                                refreshBtn.style.display = 'inline-flex';
                                refreshBtn.style.marginLeft = '8px';
                                refreshBtn.style.padding = '6px 10px';
                                refreshBtn.style.fontSize = '13px';
                                refreshBtn.style.minWidth = '40px';
                                refreshBtn.style.height = '30px';
                                refreshBtn.style.borderRadius = '6px';
                                refreshBtn.style.verticalAlign = 'middle';
                                refreshBtn.style.alignItems = 'center';
                                refreshBtn.style.justifyContent = 'center';
                                refreshBtn.style.border = '1px solid rgba(255,255,255,0.06)';
                                // Move the refresh button into the status container
                                try { statusContainer.appendChild(refreshBtn); }
                                catch (e) { /* ignore */ }
                                console.log('✅ Moved refresh button next to status badge');
                            }
                        }

                        // Move "Updated" next to "Remaining" (side-by-side)
                        const updatedElement = slaPanelElement.querySelector('.sla-last-updated') || Array.from(slaPanelElement.querySelectorAll('*')).find(el => (el.textContent || '').includes('Updated:'));

                        // Find the detail row that contains the 'Remaining' label, then its value
                        let remainingValue = null;
                        const detailRows = Array.from(slaPanelElement.querySelectorAll('.detail-row'));
                        const remainingRow = detailRows.find(row => { const lbl = row.querySelector('.detail-label'); return lbl && /remaining/i.test(lbl.textContent || ''); });
                        if (remainingRow) remainingValue = remainingRow.querySelector('.detail-value') || remainingRow.querySelector('span');
                        else {
                            const found = Array.from(slaPanelElement.querySelectorAll('*')).find(el => /remaining/i.test(el.textContent || ''));
                            remainingValue = found;
                        }

                        console.log('🔍 Updated element:', !!updatedElement);
                        console.log('🔍 Remaining value element:', !!remainingValue);

                        if (updatedElement && remainingValue) {
                            try {
                                updatedElement.style.fontSize = '10px';
                                updatedElement.style.color = '#9ca3af';
                                updatedElement.style.marginLeft = '8px';
                                updatedElement.style.display = 'inline-block';

                                // Place updated after the remaining value
                                if (remainingValue.parentElement) {
                                    remainingValue.after(updatedElement);
                                }

                                console.log('✅ Moved Updated next to Remaining');
                            } catch (e) { console.warn('⚠️ Could not move Updated next to Remaining:', e); }
                        }

                        // Reduce padding for compact view but keep panel visuals (do not override background/border)
                        try { slaPanelElement.style.padding = '0'; } catch (e) { /* ignore */ }
                        // Mark container to help CSS debugging
                        try { slaContainer.classList.add('flowing-sla-compact'); } catch (e) { /* ignore */ }
                    } catch (e) {
                        console.warn('Error applying compact SLA adjustments', e);
                    }
                    console.log('✅ SLA Monitor rendered (compact mode)');
                };
                attemptCompactAdjust(0);

                // Calculate and render breach risk
                this.renderBreachRisk(issueKey);

                // Attach footer comment composer handler (balanced view)
                try {
                    const footerSend = document.querySelector('.btn-add-comment-footer');
                    if (footerSend) {
                        footerSend.addEventListener('click', async () => {
                            if (window.commentsModule && typeof window.commentsModule.postComment === 'function') {
                                await window.commentsModule.postComment(issueKey, {
                                    textareaSelector: '#footerCommentText',
                                    internalCheckboxSelector: '#commentInternalFooter',
                                    listSelector: '.comments-section .comments-list',
                                    countSelector: '#commentCountFooter',
                                    buttonSelector: '.btn-add-comment-footer',
                                    visibilityLabelSelector: '.visibility-label-footer'
                                });
                            } else {
                                console.warn('commentsModule.postComment not available');
                            }
                        });
                    }
                    // Attach mentions autocomplete to footer textarea (balanced view)
                    try {
                        const footerTextarea = document.getElementById('footerCommentText');
                        if (footerTextarea) {
                            const attachMentions = async () => {
                                if (window.mentionsAutocomplete && typeof window.mentionsAutocomplete.attachTo === 'function') {
                                    window.mentionsAutocomplete.attachTo(footerTextarea, issueKey);
                                    console.log('✅ Attached mentionsAutocomplete to footer textarea');
                                    return;
                                }
                                // Load module dynamically if missing
                                try {
                                    await new Promise((resolve, reject) => {
                                        const s = document.createElement('script');
                                        s.src = '/static/js/modules/mentions-autocomplete.js?v=' + Date.now();
                                        s.onload = resolve;
                                        s.onerror = reject;
                                        document.head.appendChild(s);
                                    });
                                    if (window.mentionsAutocomplete && typeof window.mentionsAutocomplete.attachTo === 'function') {
                                        window.mentionsAutocomplete.attachTo(footerTextarea, issueKey);
                                        console.log('✅ Dynamically loaded and attached mentionsAutocomplete to footer textarea');
                                    }
                                } catch (err) {
                                    console.warn('⚠️ Failed to load mentions-autocomplete for footer:', err);
                                }
                            };
                            // Small timeout to allow DOM and module init
                            setTimeout(attachMentions, 80);

                            // Shortcut: Ctrl/Cmd+Enter to send from footer
                            footerTextarea.addEventListener('keydown', (e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                    e.preventDefault();
                                    document.querySelector('.btn-add-comment-footer')?.click();
                                }
                            });
                        }
                    } catch (err) {
                        console.warn('Could not attach mentions to footer textarea', err);
                    }
                } catch (e) {
                    console.warn('Could not attach footer comment handler', e);
                }
            } else {
                slaContainer.innerHTML = `
          <div style="text-align:center;padding:16px;color:#9ca3af;font-size:11px;">
            <i class="fas fa-check-circle" style="margin-bottom:6px;font-size:14px;color:#10b981;"></i><br>
            No active SLA
          </div>
        `;

                // Ensure right-section occupies its grid cell even if global CSS applies restrictive rules
                try {
                    const right = container.querySelector('.right-section');
                    const left = container.querySelector('.left-section');
                    if (right) {
                        right.style.flex = '1 1 auto';
                        right.style.maxWidth = 'none';
                        right.style.width = 'auto';
                        right.style.minWidth = '0';
                        right.style.boxSizing = 'border-box';
                    }
                    if (left) {
                        left.style.flex = '1 1 50%';
                        left.style.minWidth = '0';
                        left.style.boxSizing = 'border-box';
                    }
                } catch (e) { console.warn('Could not enforce balanced sections inline styles', e); }

                // Show no risk if no SLA
                this.renderBreachRisk(issueKey, null);
            }
        } catch (error) {
            console.error('❌ Error initializing SLA Monitor:', error);
            slaContainer.innerHTML = `
    <div style="text-align:center;padding:16px;color:#ef4444;font-size:11px;">Failed to load SLA</div>
    `;
        }
    }

    renderBreachRisk(issueKey, slaData = null) {
        // Prefer the breach container inside the balanced view to avoid colliding with other instances
        const balancedContainer = document.getElementById('balancedContentContainer');
        const riskContainer = (balancedContainer && balancedContainer.querySelector('.right-section .breach-risk-content')) || (balancedContainer && balancedContainer.querySelector('.breach-risk-content')) || document.querySelector('.breach-risk-content');
        if (!riskContainer) return;

        // Get SLA data from window.slaMonitor (support multiple data shapes)
        const data = slaData || window.slaMonitor?.slaData?.[issueKey] || null;

        if (!data) {
            riskContainer.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;padding:12px;">
                <div style="width:50px;height:50px;border-radius:50%;background:rgba(16,185,129,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    ${typeof SVGIcons !== 'undefined' && SVGIcons.success ? SVGIcons.success({ size: 20, className: 'inline-icon' }) : '✓'}
                </div>
                <div style="flex:1;">
                    <p style="font-size:11px;color:#10b981;font-weight:600;margin:0;">LOW RISK</p>
                    <p style="font-size:9px;color:#9ca3af;margin:2px 0 0 0;">No active SLA</p>
                </div>
            </div>
            `;
            return;
        }

        // Normalize to a 'cycle' object (supports: ongoingCycle, cycles[0], or data shaped as a cycle)
        const cycle = data.ongoingCycle || (Array.isArray(data.cycles) && data.cycles[0]) || data;

        // Helper: parse human readable times ("2 h 30 m", "45 m", "Overdue") to milliseconds
        const parseReadableToMillis = (s) => {
            if (!s) return 0;
            try {
                const str = String(s).toLowerCase();
                if (/overdue|n\/a|na|unknown|breached/.test(str)) return 0;
                let mins = 0;
                const dayMatch = str.match(/(\d+)\s*d/);
                if (dayMatch) mins += parseInt(dayMatch[1], 10) * 24 * 60;
                const hourMatch = str.match(/(\d+)\s*h/);
                if (hourMatch) mins += parseInt(hourMatch[1], 10) * 60;
                const minuteMatch = str.match(/(\d+)\s*m/);
                if (minuteMatch) mins += parseInt(minuteMatch[1], 10);
                if (mins === 0) {
                    const numOnly = str.match(/(\d+)/);
                    if (numOnly) mins = parseInt(numOnly[1], 10);
                }
                return mins * 60 * 1000;
            } catch (e) { return 0; }
        };

        const parseTimeToMillis = (v) => {
            if (!v && v !== 0) return 0;
            try {
                if (typeof v === 'number') return Number(v);
                if (typeof v === 'string') return parseReadableToMillis(v);
                if (typeof v === 'object') {
                    if (v.millis !== undefined && v.millis !== null) return Number(v.millis) || 0;
                    if (v.ms !== undefined && v.ms !== null) return Number(v.ms) || 0;
                    // friendly/readable fields
                    const candidate = v.readable || v.friendly || v.value || v.text || v.display || '';
                    if (candidate) return parseReadableToMillis(candidate);
                }
            } catch (e) { /* ignore */ }
            return 0;
        };

        // Obtain elapsed and remaining in milliseconds using flexible mapping
        const elapsed = parseTimeToMillis(cycle.elapsedTime || cycle.elapsed_time || cycle.elapsed || cycle.elapsed_time_readable || cycle.elapsed_time_readable);
        const remaining = parseTimeToMillis(cycle.remainingTime || cycle.remaining_time || cycle.remaining || cycle.remaining_time_readable || cycle.remaining_time_readable);
        const total = (elapsed + remaining) || 1;
        const percentage = Math.round((elapsed / total) * 100);

        console.log('🔎 renderBreachRisk debug', { issueKey, cyclePreview: { elapsed, remaining, total, percentage }, cycleSample: cycle });

        // Determine risk level
        let riskLevel, riskColor, riskIcon, riskBg;
        if (percentage >= 90) {
            riskLevel = 'CRITICAL';
            riskColor = '#ef4444';
            riskBg = 'rgba(239, 68, 68, 0.1)';
            riskIcon = 'fa-exclamation-triangle';
        } else if (percentage >= 75) {
            riskLevel = 'HIGH';
            riskColor = '#f59e0b';
            riskBg = 'rgba(245, 158, 11, 0.1)';
            riskIcon = 'fa-exclamation-circle';
        } else if (percentage >= 50) {
            riskLevel = 'MEDIUM';
            riskColor = '#4f46e5';
            riskBg = 'rgba(79, 70, 229, 0.1)';
            riskIcon = 'fa-exclamation-triangle';
        } else {
            riskLevel = 'LOW';
            riskColor = '#10b981';
            riskBg = 'rgba(16, 185, 129, 0.1)';
            riskIcon = 'fa-check';
        }

        // Build SVG icon for the risk badge using SVGIcons (fallback to emoji)
        let iconSVG = '';
        try {
            if (typeof SVGIcons !== 'undefined') {
                if (riskLevel === 'CRITICAL') iconSVG = SVGIcons.error ? SVGIcons.error({ size: 16, className: 'inline-icon' }) : SVGIcons.xCircle ? SVGIcons.xCircle({ size: 16, className: 'inline-icon' }) : '❌';
                else if (riskLevel === 'HIGH') iconSVG = SVGIcons.alert ? SVGIcons.alert({ size: 16, className: 'inline-icon' }) : '⚠️';
                else if (riskLevel === 'MEDIUM') iconSVG = SVGIcons.alert ? SVGIcons.alert({ size: 16, className: 'inline-icon' }) : '⚠️';
                else iconSVG = SVGIcons.success ? SVGIcons.success({ size: 16, className: 'inline-icon' }) : '✓';
            } else {
                iconSVG = (riskLevel === 'CRITICAL' ? '❌' : (riskLevel === 'HIGH' ? '⚠️' : (riskLevel === 'MEDIUM' ? '⚠️' : '✓')));
            }
        } catch (e) { iconSVG = (riskLevel === 'CRITICAL' ? '❌' : (riskLevel === 'HIGH' ? '⚠️' : (riskLevel === 'MEDIUM' ? '⚠️' : '✓'))); }

        // Compact mode: show as badge (initial state)
        const compactHTML = `
                <div style="display:flex;align-items:center;gap:8px;width:100%;">
                    <div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:${riskColor};">${iconSVG}</div>
                    <div style="font-size:12px;color:#374151;font-weight:600;">${riskLevel}</div>
                </div>
            `;

        // Expanded mode: show detailed panel (uses same SVG icons)
        const expandedHTML = `
                <div style="display:flex;align-items:center;gap:12px;width:100%;">
                    <div style="flex:1;display:flex;align-items:center;gap:8px;">
                        <div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:${riskBg};color:${riskColor};font-weight:700;font-size:16px;">${iconSVG}</div>
                        <div style="flex:1;">
                            <div style="font-size:14px;color:#374151;font-weight:600;">Breach Risk</div>
                            <div style="font-size:12px;color:#6b7280;line-height:1.4;">
                                <div style="display:flex;justify-content:space-between;">
                                    <div>Elapsed:</div>
                                    <div>${(cycle.elapsedTime?.readable || cycle.elapsedTime || cycle.elapsed_time) || 'N/A'}</div>
                                </div>
                                <div style="display:flex;justify-content:space-between;">
                                    <div>Remaining:</div>
                                    <div class="${percentage >= 75 ? 'risk-warning' : ''}">${(cycle.remainingTime?.readable || cycle.remainingTime || cycle.remaining_time) || 'N/A'}</div>
                                </div>
                                ${percentage >= 75 ? `<div style="margin-top:4px;color:${riskColor};font-weight:600;">${SVGIcons.alert ? SVGIcons.alert({ size: 12, className: 'inline-icon' }) : ''} Near deadline — attention recommended</div>` : ''}
                            </div>
                        </div>
                    </div>
                    <div style="width:72px;height:72px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:${riskBg};color:${riskColor};font-weight:700;font-size:24px;">
                        ${percentage}%
                    </div>
                </div>
            `;

        // Ensure the risk container fills available width and show compact badge by default
        try { riskContainer.style.width = '100%'; } catch (e) { /* ignore */ }
        riskContainer.innerHTML = compactHTML;
        riskContainer.style.cursor = 'pointer';
        riskContainer.onclick = () => {
            const isExpanded = riskContainer.classList.toggle('expanded');
            riskContainer.innerHTML = isExpanded ? expandedHTML : compactHTML;
            if (isExpanded) {
                // Recalculate and render on expand
                this.renderBreachRisk(issueKey);
            }
        };
    }

    async loadCommentsForBalancedView(issueKey) {
        // Ensure comments module is loaded: dynamically load if missing
        if (!window.commentsModule || typeof window.commentsModule.loadIssueComments !== 'function') {
            try {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = '/static/js/modules/comments.js?v=' + Date.now();
                    script.onload = () => resolve();
                    script.onerror = (e) => reject(e);
                    document.head.appendChild(script);
                });
            } catch (e) {
                console.warn('Could not dynamically load comments module:', e);
            }
        }

        if (window.commentsModule && typeof window.commentsModule.loadIssueComments === 'function') {
            return window.commentsModule.loadIssueComments(issueKey, { listSelector: '.comments-section .comments-list', countSelector: '#commentCountFooter', order: 'desc' });
        }

        // Final fallback: show unavailable message
        const commentsContainer = document.querySelector('.comments-section .comments-list');
        if (commentsContainer) commentsContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">Comments unavailable</p>';
    }

    // After rendering balanced content, adjust comments container height to match left column
    adjustCommentsHeight() {
        try {
            const container = document.getElementById('balancedContentContainer');
            if (!container) return;
            const leftCol = container.querySelector('.left-section');
            const rightCol = container.querySelector('.right-section');
            if (!leftCol || !rightCol) return;
            const commentsSection = rightCol.querySelector('.comments-section');
            const composer = rightCol.querySelector('.comment-composer');
            if (!commentsSection) return;

            // Increase minimum comments height and compute available space
            const MIN_COMMENT_HEIGHT = 500; // px
            const paddingReserve = 40; // breathing room

            const leftHeight = leftCol.getBoundingClientRect().height;
            const composerHeight = composer ? composer.getBoundingClientRect().height : 0;
            const available = Math.floor(leftHeight - composerHeight - paddingReserve);

            // computedMax is the maximum allowed height we can use; ensure it's at least 120
            const computedMax = Math.max(120, available);
            // computedMin will be MIN_COMMENT_HEIGHT unless the available space is smaller
            const computedMin = Math.min(MIN_COMMENT_HEIGHT, computedMax);

            commentsSection.style.maxHeight = `${computedMax}px`;
            commentsSection.style.minHeight = `${computedMin}px`;
            commentsSection.style.overflowY = 'auto';

            // Also ensure comments list scrolls newest-first properly
            const list = commentsSection.querySelector('.comments-list');
            if (list) {
                const nearBottom = (list.scrollHeight - list.clientHeight - list.scrollTop) < 100;
                if (nearBottom) list.scrollTop = list.scrollHeight;
            }

            console.log('🔧 Adjusted commentsSection size to', { min: computedMin, max: computedMax });
        } catch (e) {
            console.warn('Could not adjust comments height:', e);
        }
    }

    // Helper: build attachments HTML (thumbnails + list) for an issue
    buildAttachmentsHTML(issue) {
        const attachments = issue?.fields?.attachment || issue.attachments || issue.serviceDesk?.requestFieldValues?.attachments || [];
        const frag = document.createDocumentFragment();
        const thumbFrag = document.createDocumentFragment();
        if (!attachments || attachments.length === 0) return { frag, thumbFrag };

        attachments.forEach(att => {
            const url = att.content || att.self || att.url || (`/api/issues/${issue.key}/attachments/${att.id}`);
            const filename = att.filename || att.name || att.displayName || 'attachment';
            const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(filename) || (att.mimeType && att.mimeType.startsWith('image/'));

            const item = document.createElement('div');
            item.className = 'attachment-item';

            if (isImage) {
                const aThumb = document.createElement('a');
                aThumb.className = 'attachment-thumb'; aThumb.href = url; aThumb.target = '_blank'; aThumb.rel = 'noopener noreferrer';
                const img = document.createElement('img'); img.src = url; img.alt = filename; img.style.maxWidth = '120px'; img.style.maxHeight = '90px'; img.style.borderRadius = '6px'; img.style.display = 'block';
                aThumb.appendChild(img);
                item.appendChild(aThumb);

                const meta = document.createElement('div'); meta.style.display = 'flex'; meta.style.gap = '6px'; meta.style.alignItems = 'center'; meta.style.marginTop = '6px';
                const link = document.createElement('a'); link.className = 'attachment-link'; link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.download = '';
                link.textContent = filename;
                meta.appendChild(link);
                const dl = document.createElement('a'); dl.className = 'attachment-download-btn'; dl.href = url; dl.target = '_blank'; dl.rel = 'noopener noreferrer'; dl.download = ''; dl.title = 'Download'; dl.style.textDecoration = 'none'; dl.textContent = '⬇';
                meta.appendChild(dl);
                item.appendChild(meta);

                const t = document.createElement('div'); t.className = 'attachment-thumb-compact'; t.title = filename; t.style.width = '40px'; t.style.height = '30px'; t.style.borderRadius = '6px'; t.style.overflow = 'hidden'; t.style.display = 'inline-flex'; t.style.alignItems = 'center'; t.style.justifyContent = 'center'; t.style.cursor = 'pointer';
                t.addEventListener('click', () => window.open(url, '_blank'));
                const timg = document.createElement('img'); timg.src = url; timg.alt = filename; timg.style.width = '100%'; timg.style.height = '100%'; timg.style.objectFit = 'cover'; t.appendChild(timg);
                thumbFrag.appendChild(t);
            } else {
                const commentsSection = document.querySelector('.comments-section');
                const leftCol = document.querySelector('.left-section');
                if (!commentsSection || !leftCol) return;

                link.textContent = filename;
                item.appendChild(link);
                const dl = document.createElement('a'); dl.className = 'attachment-download-btn'; dl.href = url; dl.target = '_blank'; dl.rel = 'noopener noreferrer'; dl.download = ''; dl.title = 'Download'; dl.style.marginLeft = '6px'; dl.style.textDecoration = 'none'; dl.textContent = '⬇';
                item.appendChild(dl);

                const short = filename.length > 10 ? filename.slice(0, 8) + '…' : filename;
                const t = document.createElement('div'); t.className = 'attachment-thumb-compact'; t.title = filename; t.style.minWidth = '40px'; t.style.height = '30px'; t.style.borderRadius = '6px'; t.style.display = 'inline-flex'; t.style.alignItems = 'center'; t.style.justifyContent = 'center'; t.style.padding = '4px'; t.style.background = '#f3f4f6'; t.style.color = '#374151'; t.style.fontSize = '11px'; t.style.cursor = 'pointer';
                t.textContent = short;
                t.addEventListener('click', () => window.open(url, '_blank'));
                thumbFrag.appendChild(t);
            }

            frag.appendChild(item);
        });

        return { frag, thumbFrag };
    }

    renderAttachmentsForBalanced(issue) {
        try {
            const rightContainer = document.getElementById('attachmentsListRight');
            const headerContainer = document.getElementById('attachmentsListHeader');
            if (!rightContainer && !headerContainer) return;

            const { frag, thumbFrag } = this.buildAttachmentsHTML(issue);
            if (!frag && !thumbFrag) {
                if (rightContainer) {
                    while (rightContainer.firstChild) rightContainer.removeChild(rightContainer.firstChild);
                }
                if (headerContainer) {
                    while (headerContainer.firstChild) headerContainer.removeChild(headerContainer.firstChild);
                }
                const preview = document.getElementById('attachmentsPreviewFooter'); if (preview && preview.classList && typeof preview.classList.remove === 'function') preview.classList.remove('show');
                return;
            }

            try {
                if (rightContainer) {
                    while (rightContainer.firstChild) rightContainer.removeChild(rightContainer.firstChild);
                    // append thumbs first, then full items
                    if (thumbFrag) rightContainer.appendChild(thumbFrag);
                    if (frag) rightContainer.appendChild(frag);
                }
                if (headerContainer) {
                    while (headerContainer.firstChild) headerContainer.removeChild(headerContainer.firstChild);
                }
            } catch (e) { /* ignore */ }
        } catch (e) {
            console.warn('renderAttachmentsForBalanced error', e);
        }
    }

    // Footer attachments handling (separate from right-sidebar)
    renderFooterAttachments(issue) {
        try {
            const right = document.getElementById('attachmentsListRight');
            const header = document.getElementById('attachmentsListHeader');
            if (!right && !header) return;

            const { frag, thumbFrag } = this.buildAttachmentsHTML(issue);
            if ((!frag || !frag.hasChildNodes()) && (!thumbFrag || !thumbFrag.hasChildNodes())) {
                if (right) { while (right.firstChild) right.removeChild(right.firstChild); }
                if (header) { while (header.firstChild) header.removeChild(header.firstChild); }
                return;
            }

            // Footer prefers the full list (no header thumbs)
            if (right) {
                while (right.firstChild) right.removeChild(right.firstChild);
                if (frag) right.appendChild(frag);
            }
            if (header) { while (header.firstChild) header.removeChild(header.firstChild); }
        } catch (e) {
            console.warn('renderFooterAttachments error', e);
        }
    }

    // Show a confirmation banner in the footer header for applying small field recommendations
    showFieldRecommendationBanner(fieldKey, fieldLabel, suggestedValue, meta = {}) {
        try {
            const container = document.getElementById('balancedContentContainer');
            if (!container) return;
            // remove existing banner
            const existing = document.getElementById('flowingRecBanner');
            if (existing) {
                if (typeof existing.remove === 'function') existing.remove();
                else if (existing.parentNode) existing.parentNode.removeChild(existing);
            }

            const banner = document.createElement('div');
            banner.id = 'flowingRecBanner';
            banner.style.cssText = 'position:relative;margin:8px 0;padding:12px;border-radius:8px;background:linear-gradient(90deg,#fff,#f8fafc);border:1px solid #e6e6f0;display:flex;align-items:center;gap:12px;';

            const left = document.createElement('div'); left.style.flex = '1';
            const title = document.createElement('div'); title.style.fontWeight = '700'; title.style.color = '#374151';
            title.textContent = `Change ${fieldLabel} to ${suggestedValue}?`;
            const subtitle = document.createElement('div'); subtitle.style.fontSize = '12px'; subtitle.style.color = '#6b7280'; subtitle.style.marginTop = '4px';
            subtitle.textContent = 'This will update the field on the ticket. You can preview or cancel.';
            left.appendChild(title); left.appendChild(subtitle);

            const rightBtns = document.createElement('div'); rightBtns.style.display = 'flex'; rightBtns.style.gap = '8px';
            const cancelBtn = document.createElement('button'); cancelBtn.type = 'button'; cancelBtn.textContent = 'Cancel'; cancelBtn.style.padding = '8px 10px'; cancelBtn.style.borderRadius = '8px'; cancelBtn.style.border = '1px solid #e5e7eb'; cancelBtn.style.background = '#fff';
            const applyBtn = document.createElement('button'); applyBtn.type = 'button'; applyBtn.textContent = 'Apply'; applyBtn.style.padding = '8px 12px'; applyBtn.style.borderRadius = '8px'; applyBtn.style.border = 'none'; applyBtn.style.background = 'linear-gradient(135deg,#6366f1,#4f46e5)'; applyBtn.style.color = '#fff'; applyBtn.style.fontWeight = '700';
            rightBtns.appendChild(cancelBtn); rightBtns.appendChild(applyBtn);

            banner.appendChild(left); banner.appendChild(rightBtns);

            // insert banner after description if present, else at top of balanced container
            const desc = container.querySelector('.ticket-description-section');
            if (desc && desc.parentNode) desc.parentNode.insertBefore(banner, desc.nextSibling);
            else container.insertBefore(banner, container.firstChild);

            cancelBtn.addEventListener('click', () => {
                if (banner) {
                    if (typeof banner.remove === 'function') banner.remove();
                    else if (banner.parentNode) banner.parentNode.removeChild(banner);
                }
            });
            applyBtn.addEventListener('click', async () => {
                try {
                    // Attempt to use app API if present
                    if (window.app && typeof window.app.updateIssueField === 'function') {
                        await window.app.updateIssueField(window._flowingFooter?.context?.selectedIssue, fieldKey, suggestedValue, meta);
                        if (banner) {
                            if (typeof banner.remove === 'function') banner.remove();
                            else if (banner.parentNode) banner.parentNode.removeChild(banner);
                        }
                        // update UI: replace field value in grid if present
                        const fieldNodes = document.querySelectorAll('#essentialFieldsGrid .field-wrapper .field-input');
                        fieldNodes.forEach(node => {
                            if ((node.previousElementSibling || {}).textContent && (node.previousElementSibling.textContent || '').toLowerCase().includes(fieldLabel.toLowerCase())) {
                                node.textContent = suggestedValue;
                            }
                        });
                        console.log('✅ Applied recommendation via app.updateIssueField');
                        return;
                    }
                    // Fallback: mock apply (no server)
                    // show a brief confirmation in the left pane
                    title.textContent = '';
                    subtitle.textContent = '';
                    const status = document.createElement('div'); status.style.fontWeight = '700'; status.style.color = '#10b981'; status.textContent = 'Recommendation applied (local preview)';
                    left.appendChild(status);
                    setTimeout(() => {
                        if (banner) {
                            if (typeof banner.remove === 'function') banner.remove();
                            else if (banner.parentNode) banner.parentNode.removeChild(banner);
                        }
                    }, 1600);
                } catch (err) {
                    console.error('Could not apply recommendation', err);
                    title.textContent = '';
                    subtitle.textContent = '';
                    const statusErr = document.createElement('div'); statusErr.style.fontWeight = '700'; statusErr.style.color = '#ef4444'; statusErr.textContent = 'Failed to apply recommendation';
                    left.appendChild(statusErr);
                    setTimeout(() => {
                        if (banner) {
                            if (typeof banner.remove === 'function') banner.remove();
                            else if (banner.parentNode) banner.parentNode.removeChild(banner);
                        }
                    }, 2200);
                }
            });
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
            card.style.cssText = 'position:absolute;right:16px;top:56px;padding:10px;background:white;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 6px 18px rgba(31,41,55,0.06);z-index:1200;min-width:220px;';

            const top = document.createElement('div'); top.style.display = 'flex'; top.style.alignItems = 'center'; top.style.gap = '10px'; top.style.marginBottom = '8px';
            const avatar = document.createElement('div'); avatar.style.width = '40px'; avatar.style.height = '40px'; avatar.style.borderRadius = '8px'; avatar.style.background = 'linear-gradient(135deg,#6366f1,#818cf8)'; avatar.style.display = 'flex'; avatar.style.alignItems = 'center'; avatar.style.justifyContent = 'center'; avatar.style.color = '#fff'; avatar.style.fontWeight = '700'; avatar.textContent = (name || '')[0] || '?';
            const info = document.createElement('div'); info.style.flex = '1';
            const nameDiv = document.createElement('div'); nameDiv.style.fontWeight = '700'; nameDiv.style.color = '#374151'; nameDiv.textContent = name || 'Informer';
            const emailDiv = document.createElement('div'); emailDiv.style.fontSize = '12px'; emailDiv.style.color = '#6b7280'; emailDiv.textContent = email || '';
            info.appendChild(nameDiv); info.appendChild(emailDiv);
            top.appendChild(avatar); top.appendChild(info);

            const footerBtns = document.createElement('div'); footerBtns.style.display = 'flex'; footerBtns.style.gap = '8px'; footerBtns.style.justifyContent = 'flex-end';
            const copyBtn = document.createElement('button'); copyBtn.id = 'flowingContactCopy'; copyBtn.style.padding = '6px 8px'; copyBtn.style.borderRadius = '6px'; copyBtn.style.border = '1px solid #e5e7eb'; copyBtn.style.background = '#fff'; copyBtn.textContent = 'Copy email';
            const closeBtn = document.createElement('button'); closeBtn.id = 'flowingContactClose'; closeBtn.style.padding = '6px 8px'; closeBtn.style.borderRadius = '6px'; closeBtn.style.border = 'none'; closeBtn.style.background = '#f3f4f6'; closeBtn.textContent = 'Close';
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
            const attachmentsPreview = document.getElementById('attachmentsPreviewFooter');
            const attachmentsList = document.getElementById('attachmentsListFooter');
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

    addFooterAttachments(files) {
        try {
            window.footerAttachedFiles = window.footerAttachedFiles || [];
            const attachmentsList = document.getElementById('attachmentsListFooter');
            const attachmentsPreview = document.getElementById('attachmentsPreviewFooter');
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

    renderBalancedContent(issue) {
        const container = document.getElementById('balancedContentContainer');
        if (!container) return;

        console.log('🎨 Rendering balanced content for:', issue.key);
        // Helper to safely get nested fields from multiple sources
        const getField = (fieldKey) => {
            // Try from issue.fields first
            if (issue.fields && issue.fields[fieldKey] !== undefined) {
                return issue.fields[fieldKey];
            }
            // Try from issue.custom_fields
            if (issue.custom_fields && issue.custom_fields[fieldKey] !== undefined) {
                return issue.custom_fields[fieldKey];
            }
            // Try from issue.serviceDesk.requestFieldValues
            if (issue.serviceDesk?.requestFieldValues && issue.serviceDesk.requestFieldValues[fieldKey] !== undefined) {
                return issue.serviceDesk.requestFieldValues[fieldKey];
            }
            // Try direct access
            if (issue[fieldKey] !== undefined) {
                return issue[fieldKey];
            }
            return null;
        };

        // Format field value (same logic as right-sidebar)
        const formatValue = (value) => {
            if (!value) return '';
            if (typeof value === 'string') return value;
            if (value.name) return value.name;
            if (value.displayName) return value.displayName;
            if (value.value) return value.value;
            if (Array.isArray(value)) {
                return value.map(v => v.name || v.value || v).join(', ');
            }
            return String(value);
        };

        // Extract key fields from multiple sources (same as right-sidebar)
        const summary = issue.summary || getField('summary') || 'No title';
        // If no description provided, keep empty so we can hide the section
        const rawDescription = issue.description || getField('description') || '';
        // Helper to escape HTML
        const escapeHtml = (str) => String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        // Normalize line endings and remove excessive blank lines and leading breaks
        const normalizeDescription = (txt) => {
            if (!txt) return '';
            let s = String(txt).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            // Remove leading blank lines/spaces
            s = s.replace(/^\s*\n+/, '');
            // Collapse 3+ consecutive newlines to two (paragraph)
            s = s.replace(/\n{3,}/g, '\n\n');
            // Trim trailing whitespace
            s = s.replace(/\s+$/g, '');
            return s;
        };
        const cleanedDescription = normalizeDescription(rawDescription);
        // Convert to safe HTML with <br> for line breaks so layout is consistent
        const description = cleanedDescription ? escapeHtml(cleanedDescription).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') : '';

        // Standard fields
        const priority = formatValue(issue.priority || getField('priority'));
        const assignee = formatValue(issue.assignee || getField('assignee'));
        const status = formatValue(issue.status || getField('status'));
        const reporter = formatValue(issue.reporter || getField('reporter'));
        const created = issue.created || getField('created');
        const updated = issue.updated || getField('updated');

        // Custom fields - Multiple field mappings (from CUSTOM_FIELDS_REFERENCE.json)
        const requestType = formatValue(getField('customfield_10010'));

        // Criticidad - try multiple possible field IDs
        const criticidad = formatValue(getField('customfield_10125') || getField('customfield_10037'));

        // Tipo de Solicitud
        const tipoSolicitud = formatValue(getField('customfield_10156'));

        // Plataforma - try multiple possible field IDs
        const plataforma = formatValue(getField('customfield_10169') || getField('customfield_10129'));

        // Área - try multiple possible field IDs
        const area = formatValue(getField('customfield_10168') || getField('customfield_10130'));

        // Empresa - try multiple possible field IDs
        const empresa = formatValue(getField('customfield_10143') || getField('customfield_10131'));

        // Producto - try multiple possible field IDs
        const producto = formatValue(getField('customfield_10144') || getField('customfield_10132'));

        // Contact info - try multiple possible field IDs
        const email = formatValue(getField('customfield_10141') || getField('customfield_10133'));
        const phone = formatValue(getField('customfield_10142') || getField('customfield_10134'));

        // Additional info fields
        const pais = formatValue(getField('customfield_10165') || getField('customfield_10166'));
        const paisCodigo = formatValue(getField('customfield_10167'));
        const notasAnalisis = formatValue(getField('customfield_10149'));
        const resolucion = formatValue(getField('customfield_10151'));
        const reporter2 = formatValue(getField('customfield_10111')); // Reporter/Informador

        // Format dates
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        // Collect long custom fields (strings > 120 chars) to show as full-width blocks
        let longCustomFieldsHTML = '';
        try {
            const fld = issue.fields || {};
            Object.keys(fld).forEach(k => {
                if (!/^customfield_/.test(k)) return;
                const raw = fld[k];
                const val = formatValue(raw);
                if (val && val.length > 120) {
                    const label = k.replace('customfield_', 'CF-');
                    longCustomFieldsHTML += `
                <div style="grid-column: 1 / -1;">
                    <label style="font-size: 10px; font-weight: 700; color: #9ca3af; display:block; margin-bottom:6px;">${label}</label>
                    <div style="padding:8px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; font-size:12px; max-height:160px; overflow-y:auto; white-space:pre-wrap;">${val}</div>
                </div>
                `;
                }
            });
        } catch (e) { console.warn('Could not collect long custom fields', e); }

        // Build essential fields HTML dynamically using available mappings when possible
        const buildEssentialFieldsHTML = (mapping) => {
            const keys = [];
            // preferred order: form_fields, contact_info, system_fields
            try {
                if (mapping && mapping.categories) {
                    const cats = mapping.categories;
                    ['form_fields', 'contact_info', 'system_fields'].forEach(cat => {
                        const f = cats[cat] && cats[cat].fields ? Object.keys(cats[cat].fields) : [];
                        f.forEach(k => { if (!keys.includes(k)) keys.push(k); });
                    });
                }
            } catch (e) { /* ignore */ }

            // ensure common core fields are present
            ['priority', 'assignee', 'status', 'reporter', 'email', 'phone', 'summary'].forEach(k => { if (!keys.includes(k)) keys.push(k); });

            let html = '';
            // render up to many fields into the grid; filter out very long fields (handled earlier)
            keys.forEach(k => {
                let val = '';
                if (k === 'priority') val = priority;
                else if (k === 'assignee') val = assignee;
                else if (k === 'status') val = status;
                else if (k === 'reporter') val = reporter;
                else val = formatValue(getField(k));
                if (!val) return; // skip empty
                // label from mapping if available
                const label = (mapping && mapping.categories && (function () {
                    for (const cat of ['form_fields', 'contact_info', 'system_fields']) {
                        const f = mapping.categories[cat] && mapping.categories[cat].fields;
                        if (f && f[k] && f[k].label) return f[k].label;
                    }
                    return k.replace(/_/g, ' ').replace(/customfield /g, 'CF ').replace(/customfield_/, 'CF-');
                })()) || k;

                html += `
                    <div class="field-wrapper" style="display:flex;flex-direction:column;gap:6px;">
                        <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">${label}</label>
                        <div class="field-input" style="padding: 6px 8px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 4px; font-size: 12px; color: var(--field-text);">${val}</div>
                    </div>
                `;
            });
            return html;
        };

        // Try to obtain mapping from global or fetch fallback (non-blocking)
        let mappingObj = window.CUSTOM_FIELDS_REFERENCE || window.customFieldsReference || null;
        const fetchMappingIfNeeded = async () => {
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
        };

        // Initial essential fields HTML (best-effort without mapping)
        let initialEssentialHTML = buildEssentialFieldsHTML(mappingObj || {});

        // Helper: format phone numbers into a readable form (best-effort)
        const formatPhoneNumber = (p) => {
            if (!p) return '';
            const s = String(p);
            const digits = s.replace(/[^0-9]/g, '');
            if (!digits) return s;
            // Common formats
            if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
            if (digits.length === 11) return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7)}`;
            if (digits.length > 11) return `+${digits.slice(0, digits.length - 10)} ${digits.slice(-10, -7)} ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
            return s;
        };

        // Prioritized short custom fields (show under description as normal fields)
        const prioritizedOrder = [
            { label: 'Email', value: email },
            { label: 'Empresa', value: empresa },
            { label: 'País', value: pais },
            { label: 'Teléfono', value: phone },
            { label: 'Producto', value: producto },
            { label: 'Plataforma', value: plataforma },
            { label: 'Tipo de solicitud', value: tipoSolicitud }
        ];

        let prioritizedFieldsHTML = '';
        try {
            prioritizedOrder.forEach(entry => {
                let val = entry.value;
                if (!val) return;
                if (entry.label === 'Teléfono') val = formatPhoneNumber(val);
                val = escapeHtml(String(val));
                prioritizedFieldsHTML += `
                    <div class="field-wrapper" style="display:flex;flex-direction:column;gap:6px;">
                        <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; margin-bottom: 4px;">${entry.label}</label>
                        <div class="field-input" style="padding: 6px 8px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 4px; font-size: 12px; color: var(--field-text);">${val}</div>
                    </div>
                `;
            });
        } catch (e) { console.warn('Could not build prioritized fields', e); }

        // FOUR-COLUMN GRID: description spans 3 columns, 4th column reserved for SLA/Attachments/Comments
        // Layout adjusted to two symmetric sections (left 50% / right 50%).
        container.innerHTML = `
            <div class="purple-divider" style="margin:0"></div>

            <div class="footer-grid-4" style="display: grid; grid-template-columns: 50% 50%; gap: 12px; padding: 16px 20px; max-height: calc(60vh - 250px); overflow-y: auto; align-items:start; position:relative;">

                <div class="left-section" style="grid-column: 1 / span 1; display: flex; flex-direction: column; gap: 12px;">
                    ${description ? `
                    <div class="field-wrapper ticket-description-field" style="display:flex;flex-direction:column;gap:6px;">
                        <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; margin-bottom: 4px;">Descripción</label>
                        <div id="ticketDescriptionContent" class="field-input description-input" style="padding: 8px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 13px; color: #4b5563; line-height: 1.4; max-height: 7.5em; overflow: auto; white-space: pre-wrap;">${description ? `${description}` : ''}</div>
                    </div>
                    ` : ''}

                    ${prioritizedFieldsHTML ? prioritizedFieldsHTML : ''}

                    ${longCustomFieldsHTML ? longCustomFieldsHTML : ''}

                    <div id="essentialFieldsGrid" class="essential-fields-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                        ${initialEssentialHTML}
                    </div>
                </div>

                <div class="right-section" style="grid-column: 2 / span 1; display: flex; flex-direction: column; gap: 12px;">
                    <div class="sla-monitor-wrapper">
                        <div class="sla-monitor-container" style="background: rgba(249, 250, 251, 0.5); border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px;">
                            <div style="text-align: center; padding: 12px; color: #9ca3af; font-size: 11px;">Loading SLA...</div>
                        </div>
                        <div class="breach-risk-content" style="margin-top:8px;"></div>
                    </div>

                    <div class="attachments-section" style="background: rgba(249, 250, 251, 0.5); border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px;">
                        <h4 style="font-size:13px;font-weight:600;color:#374151;margin:0 0 8px 0;display:flex;align-items:center;gap:8px;">Attachments</h4>
                        <div id="attachmentsListRight" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;"></div>
                        <div id="attachmentsListHeader" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;color:#6b7280;font-size:12px;"></div>
                    </div>

                    <div class="purple-divider"></div>

                    <div class="comments-section" style="flex: 1; background: transparent; border-radius: 10px; padding: 14px; max-height: 360px; overflow-y: auto;">
                        <div class="attachments-preview-footer" id="attachmentsPreviewFooter" style="margin-bottom:10px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;"><div class="attachments-list" id="attachmentsListFooter"></div></div>
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                            <h4 style="font-size: 13px; font-weight: 600; color: #374151; margin: 0; display: flex; align-items: center; gap: 6px;">Comments</h4>
                            <span id="commentCountFooter" style="font-size:12px; color:#6b7280;">(0)</span>
                        </div>

                        <div class="comment-composer" style="display:flex; gap:8px; align-items:flex-start; margin:10px 0 12px 0;">
                            <textarea id="footerCommentText" placeholder="Write a comment..." rows="2" style="flex:1; resize: vertical; min-height:40px; max-height:120px; padding:8px 10px; border:1px solid rgba(0,0,0,0.08); border-radius:8px; font-size:13px;"></textarea>
                            <div style="display:flex; flex-direction:column; gap:8px;">
                                <div style="display:flex; gap:8px;">
                                    <button id="attachFooterBtn" class="comment-toolbar-btn" title="Attach file" style="padding:8px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:8px; cursor:pointer;">${SVGIcons.paperclip ? SVGIcons.paperclip({ size: 14, className: 'inline-icon' }) : ''}</button>
                                    <button class="btn-add-comment-footer" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:600;">Send</button>
                                </div>
                                <label style="font-size:11px; color:#6b7280; display:flex; align-items:center; gap:6px;"><input type="checkbox" id="commentInternalFooter"> Internal</label>
                            </div>
                        </div>

                        <div class="comments-list" style="display: flex; flex-direction: column; gap: 8px;">
                            <p style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">Loading comments...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

    }
}

// Initialize footer on DOM ready
try {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            // Create instance and expose backwards-compatible public API shims
            const _inst = new FlowingFooter();
            window._flowingFooter = _inst;

            // Public wrapper names expected by legacy callers
            try {
                // common public aliases
                window._flowingFooter.public_switchToBalancedView = _inst.switchToBalancedView.bind(_inst);
                window._flowingFooter.public_expand = _inst.expand.bind(_inst);
                window._flowingFooter.public_collapse = _inst.collapse.bind(_inst);
                window._flowingFooter.public_toggle = _inst.toggle.bind(_inst);

                // 'flowing_' prefixed API used by FlowingShell.callFooter
                window._flowingFooter.flowing_switchToBalancedView = _inst.switchToBalancedView.bind(_inst);
                window._flowingFooter.flowing_expand = _inst.expand.bind(_inst);
                window._flowingFooter.flowing_collapse = _inst.collapse.bind(_inst);
                window._flowingFooter.flowing_toggle = _inst.toggle.bind(_inst);

                // Expose a lightweight proxy object `window.flowingFooter` for older code
                window.flowingFooter = window.flowingFooter || {};
                ['switchToBalancedView', 'expand', 'collapse', 'toggle', 'renderBalancedContent', 'renderAttachmentsForBalanced'].forEach(fn => {
                    if (typeof _inst[fn] === 'function') window.flowingFooter[fn] = _inst[fn].bind(_inst);
                });
            } catch (e) { console.warn('Could not attach footer compatibility shims', e); }
        }, 50);
    });
} catch (e) { console.warn('Footer init error', e); }
