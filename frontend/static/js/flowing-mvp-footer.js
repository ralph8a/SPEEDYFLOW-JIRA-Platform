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

    if (!this.footer) {
      // Backward-compat: some older/prototype markup uses `ml-footer` or id `mlFooter`.
      // To avoid breaking existing markup, map legacy classes/ids to the new Flowing MVP names.
      const legacy = document.getElementById('mlFooter') || document.querySelector('.ml-footer');
      if (legacy) {
        console.warn('⚠️ Flowing footer element not found by id; mapping legacy .ml-footer to Flowing MVP');
        // ensure it has the expected id/class names used by the new implementation
        legacy.id = legacy.id || 'flowingFooter';
        legacy.classList.add('flowing-footer');
        // map common legacy header/content classes
        const legacyHeader = legacy.querySelector('.ml-footer-header');
        if (legacyHeader) legacyHeader.classList.add('flowing-header');
        const legacyContent = legacy.querySelector('.ml-footer-content');
        if (legacyContent) legacyContent.classList.add('flowing-content');
        // retry assigning
        this.footer = document.getElementById('flowingFooter');
      }
      if (!this.footer) {
        console.error('❌ Flowing MVP footer not found');
        return;
      }
    }

    // Normalize footer DOM: ensure a compact, consistent layout while preserving all functional IDs
    try {
      // Remove stray header/root elements that may have been injected previously
      try {
        const straySelectors = ['.flowing-header', '.ml-footer-header', '.flowing-footer-header', '#flowingHeader', '#flowingRoot'];
        straySelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            if (!this.footer || !this.footer.contains(el)) {
              try { el.parentNode && el.parentNode.removeChild(el); } catch (e) { }
            }
          });
        });
      } catch (cleanupErr) { console.warn('Could not cleanup stray headers', cleanupErr); }

      // We'll create or reuse a root element inside #flowingFooter:
      // 1) measurement root (`flowingRoot`) - used for layout measurements
      // 2) interactive header (`flowingHeader`) - contains title, context badge and toggle
      // 3) content container (`flowingContent`) - chat / balanced views live here

      let root = this.footer.querySelector('#flowingRoot');
      if (!root) {
        root = document.createElement('div');
        root.id = 'flowingRoot';
        root.className = 'flowing-root';
      } else {
        // reuse existing root but clear it so we don't stack content
        try { root.innerHTML = ''; } catch (e) { /* ignore */ }
      }

      // Header (interactive container) - keep it as a container, not just a button
      const header = document.createElement('div');
      header.id = 'flowingHeader';
      header.className = 'flowing-header';
      header.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="flowing-avatar" style="width:40px;height:40px;background:linear-gradient(135deg,#6366f1,#818cf8);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;flex-shrink:0;">
            ${typeof SVGIcons !== 'undefined' && SVGIcons.logoSmall ? SVGIcons.logoSmall({ size: 20, className: 'inline-icon' }) : 'SF'}
          </div>
          <div class="flowing-title" style="font-weight:700;color:#1f2937;font-size:14px;line-height:1;">Flowing MVP</div>
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:12px;">
          <div id="flowingContextBadge" class="flowing-context-badge" style="background:#f7f5ff;border:1px solid rgba(124,58,237,0.12);padding:6px 12px;border-radius:16px;color:#4b5563;font-size:13px;display:flex;align-items:center;gap:8px;">
            <span class="context-icon">${(typeof SVGIcons !== 'undefined' && SVGIcons.chart) ? SVGIcons.chart({ size: 14, className: 'inline-icon' }) : ''}</span>
            <span class="context-text">No context</span>
          </div>
          <div id="flowingToggleHit" style="display:inline-flex;align-items:center;justify-content:center;padding:6px;border-radius:10px;background:transparent;cursor:pointer;">
            <button id="flowingToggleBtn" aria-label="Toggle Flowing" class="flowing-toggle-btn" style="width:28px;height:28px;border-radius:6px;background:#fff;border:1px solid rgba(0,0,0,0.06);box-shadow:0 6px 18px rgba(99,102,241,0.06);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-weight:700;">▴</button>
          </div>
        </div>
      `;

      // Header base styles for spacing and subtle background
      header.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 16px;width:100%;box-sizing:border-box;background:linear-gradient(180deg, rgba(99,102,241,0.03), rgba(99,102,241,0.01));border-bottom:1px solid rgba(99,102,241,0.04);';

      // Content container: keep existing structure expected by other functions
      const content = document.createElement('div');
      content.id = 'flowingContent';
      content.className = 'flowing-content';
      content.innerHTML = `
        <div id="chatOnlyView" class="flowing-view chat-view" style="display:block;">
          <div id="flowingMessages" class="flowing-messages" aria-live="polite"></div>
          <div class="flowing-composer" style="display:flex;align-items:center;gap:8px;padding:12px;border-top:1px solid rgba(0,0,0,0.04);">
            <textarea id="flowingInput" rows="2" placeholder="Ask Flowing..." style="flex:1;min-height:40px;max-height:160px;padding:10px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);box-sizing:border-box;"></textarea>
            <button id="flowingSendBtn" class="flowing-send-btn" aria-label="Send message" style="flex:0 0 auto;padding:10px 12px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;cursor:pointer;"> 
              <span id="flowingSendIcon">✈</span>
            </button>
          </div>
        </div>
        <div id="balancedView" class="flowing-view balanced-view" style="display:none;">
          <div id="balancedContentContainer"></div>
        </div>
      `;

      // Assemble
      root.appendChild(header);
      root.appendChild(content);

      // Replace footer children but preserve any existing important nodes by moving them into content
      // Move known functional nodes if they already exist elsewhere in DOM
      const moveIfExists = (id, target) => {
        try {
          const el = document.getElementById(id);
          if (el && el !== target && el !== header && el !== content) target.appendChild(el);
        } catch (e) { }
      };
      // If there are legacy elements, move them into the new content container
      // Move only functional nodes into content; keep header elements (like flowingContextBadge) in header
      ['flowingMessages', 'flowingInput', 'flowingSendBtn', 'balancedContentContainer', 'flowingSuggestion', 'attachmentsListFooter', 'attachmentsPreviewFooter'].forEach(id => moveIfExists(id, content));

      // Replace footer contents with our normalized structure
      this.footer.innerHTML = '';
      this.footer.appendChild(root);

      // Re-bind commonly used element references to the (re)created or moved DOM nodes
      this.footer = document.getElementById('flowingFooter'); // ensure reference
      this.toggleBtn = document.getElementById('flowingToggleBtn');
      this.messagesContainer = document.getElementById('flowingMessages');
      this.input = document.getElementById('flowingInput');
      this.sendBtn = document.getElementById('flowingSendBtn');
      this.contextBadge = document.getElementById('flowingContextBadge') || this.contextBadge;
      this.suggestionElement = document.getElementById('flowingSuggestion') || this.suggestionElement;
    } catch (e) {
      console.warn('Could not normalize footer DOM, proceeding with existing structure', e);
    }

    this.attachEventListeners();
    this.updateContext();
    this.setupContextWatcher();
    this.startSuggestionRotation();

    // Ensure footer responds to sidebar collapse/expand events
    try {
      window.addEventListener('sidebarToggled', () => {
        const sidebar = document.querySelector('.sidebar-content-component');
        const collapsed = !!(sidebar && sidebar.classList.contains('collapsed'));
        document.body.classList.toggle('sidebar-collapsed', collapsed);
        this.adjustContentPadding(collapsed);
      });

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

    console.log('✅ Flowing MVP ready');
  }

  attachEventListeners() {
    // Toggle button - Integrado con FlowingContext para sugerencias de IA
    try {
      // Prefer a larger hit area wrapper if present
      const hit = document.getElementById('flowingToggleHit');
      if (hit) {
        const newHit = hit.cloneNode(true);
        hit.parentNode && hit.parentNode.replaceChild(newHit, hit);
        // find the button inside the hit area
        const btn = newHit.querySelector('#flowingToggleBtn') || newHit.querySelector('button');
        if (btn) this.toggleBtn = btn;

        // make hit area accessible and set initial aria/icon
        try {
          newHit.setAttribute('role', 'button');
          newHit.setAttribute('tabindex', '0');
          newHit.setAttribute('aria-label', 'Toggle Flowing footer');
          if (this.toggleBtn) this.toggleBtn.setAttribute('aria-controls', 'flowingContent');
          if (this.toggleBtn) this.toggleBtn.setAttribute('aria-expanded', String(!!this.isExpanded));
          if (this.toggleBtn) this.toggleBtn.textContent = this.isExpanded ? '▴' : '▾';
        } catch (e) { }

        const activateToggle = (e) => {
          // ignore if event is a keyboard navigation (handled below)
          this.toggle();
          try { if (this.toggleBtn) { this.toggleBtn.textContent = this.isExpanded ? '▴' : '▾'; this.toggleBtn.setAttribute('aria-expanded', String(!!this.isExpanded)); } } catch (err) { }
          if (window.FlowingContext && this.isExpanded) this.showContextualSuggestions();
        };

        newHit.addEventListener('click', activateToggle);
        // support keyboard activation (Enter / Space)
        newHit.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            activateToggle(ev);
          }
        });
      } else if (this.toggleBtn) {
        // fallback: attach to button directly (ensure single listener) and make it keyboard-accessible
        const newToggle = this.toggleBtn.cloneNode(true);
        this.toggleBtn.parentNode && this.toggleBtn.parentNode.replaceChild(newToggle, this.toggleBtn);
        this.toggleBtn = newToggle;
        try {
          this.toggleBtn.setAttribute('role', 'button');
          this.toggleBtn.setAttribute('tabindex', '0');
          this.toggleBtn.setAttribute('aria-controls', 'flowingContent');
          this.toggleBtn.setAttribute('aria-expanded', String(!!this.isExpanded));
          this.toggleBtn.textContent = this.isExpanded ? '▴' : '▾';
        } catch (e) { }

        const activateBtn = (ev) => {
          this.toggle();
          try { this.toggleBtn.textContent = this.isExpanded ? '▴' : '▾'; this.toggleBtn.setAttribute('aria-expanded', String(!!this.isExpanded)); } catch (e) { }
          if (window.FlowingContext && this.isExpanded) this.showContextualSuggestions();
        };

        this.toggleBtn.addEventListener('click', activateBtn);
        this.toggleBtn.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            activateBtn(ev);
          }
        });
      }
    } catch (e) { console.warn('Could not attach toggleBtn listener', e); }

    // Close button removed - use 'Back to Chat' control instead (no DOM close button created)

    // Send button
    this.sendBtn?.addEventListener('click', () => this.sendMessage());

    // Global ESC handler to collapse Flowing footer
    try {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
          // Only collapse if footer is present and expanded
          if (this.isExpanded) {
            this.collapse();
          }
        }
      });
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
    const currentPlain = this._stripHTML(this.suggestionElement.innerHTML || '');
    const incomingPlain = suggestion.key || this._stripHTML(suggestion.text || '');

    if (currentPlain === incomingPlain) {
      // Advance index but don't re-render the same content
      this.currentSuggestionIndex = (this.currentSuggestionIndex + 1) % this.suggestions.length;
      return;
    }

    this.suggestionElement.classList.remove('visible');

    // Wait for fade out, then update content
    setTimeout(() => {
      // Update HTML and classes
      // Use suggestion.text (full HTML) when rendering
      this.suggestionElement.innerHTML = suggestion.text || '';
      this.suggestionElement.classList.remove('suggestion-critical', 'suggestion-warning', 'suggestion-info', 'suggestion-success');
      // add base and type-specific class without spaces in the token
      this.suggestionElement.classList.add('suggestion', `suggestion-${(suggestion.type || 'info')}`);

      // Move to next suggestion
      this.currentSuggestionIndex = (this.currentSuggestionIndex + 1) % this.suggestions.length;

      // Fade in new suggestion after a brief delay
      setTimeout(() => this.suggestionElement.classList.add('visible'), 50);
    }, 260); // shorter fade to feel snappier but avoid flash
  }

  updateContext() {
    // Get current context from app state
    this.context = {
      currentDesk: window.state?.currentDesk || null,
      currentQueue: window.state?.currentQueue || null,
      selectedIssue: window.state?.selectedIssue || null,
      viewMode: window.state?.viewMode || 'kanban',
      issuesCount: window.app?.issuesCache?.size || 0
    };

    this.updateContextBadge();
  }

  updateContextBadge() {
    if (!this.contextBadge) return;

    const iconEl = this.contextBadge.querySelector('.context-icon');
    const textEl = this.contextBadge.querySelector('.context-text');

    // Always clear any emoji/text in the icon slot to avoid flashes
    try {
      if (iconEl) {
        // Prefer a small SVG logo if available, otherwise clear the slot
        if (typeof SVGIcons !== 'undefined' && SVGIcons.logoSmall) {
          iconEl.innerHTML = SVGIcons.logoSmall({ size: 16, className: 'inline-icon' });
        } else {
          iconEl.innerHTML = '';
        }
      }
    } catch (e) { if (iconEl) iconEl.innerHTML = ''; }

    // Compute desired text for current context (include summary when an issue is selected)
    let desiredText = 'No context';
    if (this.context.selectedIssue) {
      const issueKey = this.context.selectedIssue;
      // Try to find the issue summary in app cache/state
      let summary = '';
      try {
        if (window.app?.issuesCache && window.app.issuesCache.get) {
          const issueObj = window.app.issuesCache.get(issueKey);
          summary = issueObj?.summary || issueObj?.fields?.summary || '';
        }
        if (!summary && Array.isArray(window.state?.issues)) {
          const issueObj = window.state.issues.find(i => i.key === issueKey);
          summary = issueObj?.summary || issueObj?.fields?.summary || '';
        }
      } catch (e) { /* ignore */ }

      desiredText = summary ? `${issueKey} — ${summary} ` : `Ticket: ${issueKey} `;
    } else if (this.context.currentQueue) {
      desiredText = `Queue: ${this.context.currentQueue} (${this.context.issuesCount} tickets)`;
    } else if (this.context.currentDesk) {
      desiredText = `Desk: ${this.context.currentDesk} `;
    }

    // Only update DOM when the text actually changes to avoid reflows/flashes
    try {
      if (textEl && textEl.textContent !== desiredText) {
        textEl.textContent = desiredText;
      }
    } catch (e) { /* ignore */ }
  }

  toggle() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  expand() {
    this.footer?.classList.remove('collapsed');
    this.isExpanded = true;
    this.input?.focus();

    // Adjust content padding for expanded footer
    this.adjustContentPadding(false);
    // Increase footer max-height to give more space when expanded
    try {
      const desiredMax = Math.max(420, Math.round((window.innerHeight || 800) * 0.82)); // 82% of viewport
      if (this.footer) this.footer.style.maxHeight = desiredMax + 'px';
      document.documentElement.style.setProperty('--flowing-footer-max', desiredMax + 'px');
    } catch (e) { }

    // After layout, compute footer height and set CSS var so page can be translated up
    try {
      setTimeout(() => {
        try {
          const h = this.footer ? Math.round(this.footer.getBoundingClientRect().height) : 420;
          // compute delta from collapsed footer height so we only push by the added space
          const COLLAPSED_HEIGHT = 56; // matches .flowing-footer.collapsed max-height
          const delta = Math.max(0, h - COLLAPSED_HEIGHT);
          // cap delta to viewport height minus 120px to avoid pushing content completely out
          const cap = Math.max(0, (window.innerHeight || 800) - 120);
          const used = Math.min(delta, cap);
          document.documentElement.style.setProperty('--flowing-footer-height', h + 'px');
          document.documentElement.style.setProperty('--flowing-footer-translate', used + 'px');
          // compute header height inside the footer so columns can size to remaining space
          try {
            const headerEl = this.footer.querySelector('.flowing-header, .ml-footer-header, .footer-header-left') || null;
            const headerH = headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 72;
            document.documentElement.style.setProperty('--flowing-header-height', headerH + 'px');
          } catch (err) { document.documentElement.style.setProperty('--flowing-header-height', '72px'); }
          // Do not add a body class that translates/pushes the main content — keep footer overlay
        } catch (err) { /* ignore */ }
      }, 80);
    } catch (e) { /* ignore */ }

    console.log('🤖 Flowing MVP expanded');
  }

  collapse() {
    this.footer?.classList.add('collapsed');
    this.isExpanded = false;

    // Adjust content padding for collapsed footer
    this.adjustContentPadding(true);
    // No longer toggling body.flowing-footer-expanded to avoid pushing main content
    try { if (this.footer) this.footer.style.maxHeight = ''; } catch (e) { }
    try { document.documentElement.style.removeProperty('--flowing-footer-height'); } catch (e) { }
    try { document.documentElement.style.removeProperty('--flowing-header-height'); } catch (e) { }
    try { document.documentElement.style.removeProperty('--flowing-footer-translate'); } catch (e) { }

    // Ensure balanced-active flags removed when collapsing
    try { if (this.footer) this.footer.classList.remove('balanced-active'); } catch (e) { }
    try { document.body.classList.remove('flowing-balanced-active'); } catch (e) { }

    // Switch back to chat view when collapsing
    this.switchToChatView();

    console.log('🤖 Flowing MVP collapsed');
  }

  // Public API wrappers (stable names) — call internal implementations
  public_expand() { return this.expand(); }
  public_collapse() { return this.collapse(); }
  public_switchToChatView() { return this.switchToChatView(); }
  public_askAboutTicket(issueKey) { return this.askAboutTicket(issueKey); }
  public_suggestActions(issueKey) { return this.suggestActions(issueKey); }
  public_explainSLA(issueKey) { return this.explainSLA(issueKey); }
  public_showContextualSuggestions() { return this.showContextualSuggestions(); }
  // Public wrapper for switching to balanced view from external callers
  public_switchToBalancedView(issueKey) { return this.switchToBalancedView(issueKey); }

  // Centralized view switcher to ensure exactly one view is visible at a time
  setActiveView(viewName) {
    const chatView = document.getElementById('chatOnlyView');
    const balancedView = document.getElementById('balancedView');

    if (viewName === 'chat') {
      if (chatView) { chatView.style.display = 'block'; chatView.setAttribute('aria-hidden', 'false'); }
      if (balancedView) { balancedView.style.display = 'none'; balancedView.setAttribute('aria-hidden', 'true'); }
      // Remove balanced view styling classes
      try { if (this.footer) this.footer.classList.remove('balanced-active'); } catch (e) { }
      try { document.body.classList.remove('flowing-balanced-active'); } catch (e) { }
      // Restore chat UI pieces
      try {
        if (this.suggestionElement) this.suggestionElement.style.display = '';
        if (this.messagesContainer) this.messagesContainer.style.display = '';
        if (this.input) this.input.style.display = '';
        if (this.sendBtn) this.sendBtn.style.display = '';
        if (this.toggleBtn) this.toggleBtn.style.display = '';
        if (this.contextBadge) this.contextBadge.style.display = '';
        // Re-show common floating launcher classes
        ['flowing-floating', 'ff-floating-launcher', 'flowing-launcher'].forEach(cls => {
          document.querySelectorAll('.' + cls).forEach(el => { try { el.style.display = ''; } catch (e) { } });
        });
      } catch (e) { /* ignore */ }
      // Reset context
      this.context.selectedIssue = null;
      this.updateContextBadge();
      // Restore header title and remove recommendations
      try {
        const headerTitle = this.footer.querySelector('.flowing-title');
        if (headerTitle) headerTitle.textContent = 'Flowing MVP';
        const rec = this.footer.querySelector('#flowingHeaderRecommendations');
        if (rec && rec.parentNode) rec.parentNode.removeChild(rec);
      } catch (e) { /* ignore */ }
      if (this.suggestionElement) {
        this.suggestionElement.textContent = 'Analyzing your queue...';
        this.resumeSuggestionRotation();
      }
    } else if (viewName === 'balanced') {
      if (chatView) { chatView.style.display = 'none'; chatView.setAttribute('aria-hidden', 'true'); }
      if (balancedView) { balancedView.style.display = 'block'; balancedView.setAttribute('aria-hidden', 'false'); balancedView.focus && balancedView.focus(); }

      // Add a persistent class on footer to let CSS hide chat UI elements reliably
      try { if (this.footer) this.footer.classList.add('balanced-active'); } catch (e) { }
      try { document.body.classList.add('flowing-balanced-active'); } catch (e) { }

      // Compute overlay position/size so footer does not cover the filter bar or header
      try { this.computeBalancedOverlayPosition(); } catch (e) { /* ignore */ }

      // Update header to show key + summary and top recommendations
      try {
        const headerTitle = this.footer.querySelector('.flowing-title');
        const recContainerId = 'flowingHeaderRecommendations';
        let recContainer = this.footer.querySelector('#' + recContainerId);
        if (!recContainer) {
          recContainer = document.createElement('div');
          recContainer.id = recContainerId;
          recContainer.style.marginLeft = '16px';
          recContainer.style.fontSize = '13px';
          recContainer.style.color = 'var(--text-secondary, #6b7280)';
          recContainer.style.display = 'flex';
          recContainer.style.flexDirection = 'column';
          recContainer.style.gap = '4px';
          // insert after context badge if present
          const badge = this.footer.querySelector('.flowing-context-badge');
          if (badge && badge.parentNode) badge.parentNode.insertBefore(recContainer, badge.nextSibling);
          else this.footer.querySelector('.flowing-header')?.appendChild(recContainer);
        }

        // Set header title to issue key + summary if available
        let headerText = 'Flowing MVP';
        const issueKey = this.context.selectedIssue || (typeof issueKeyFromArgs !== 'undefined' ? issueKeyFromArgs : null);
        let summary = '';
        try {
          if (this.context.selectedIssue && window.app?.issuesCache) {
            const issueObj = window.app.issuesCache.get(this.context.selectedIssue) || {};
            summary = issueObj?.summary || issueObj?.fields?.summary || '';
          }
        } catch (e) { /* ignore */ }
        if (this.context.selectedIssue) headerText = this.context.selectedIssue + (summary ? (' — ' + summary) : '');
        if (headerTitle) headerTitle.textContent = headerText;

        // Prepare recommendations: run analysis and show top 3 suggestions
        try { this.analyzeSuggestions(); } catch (e) { }
        const recs = (this.suggestions || []).slice(0, 3);
        recContainer.innerHTML = recs.map(s => `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this._stripHTML(s.text || '')}</div>`).join('');
      } catch (e) { /* ignore */ }

      // Hide header/inline IA chat UI pieces that should not be visible while
      // viewing a ticket in balanced view (suggestion badge, floating launcher, composer remnants)
      try {
        if (this.suggestionElement) this.suggestionElement.style.display = 'none';
        if (this.messagesContainer) this.messagesContainer.style.display = 'none';
        if (this.input) this.input.style.display = 'none';
        if (this.sendBtn) this.sendBtn.style.display = 'none';
        if (this.toggleBtn) this.toggleBtn.style.display = 'none';
        if (this.contextBadge) this.contextBadge.style.display = 'none';
        const composer = this.footer?.querySelector('.flowing-composer');
        if (composer) composer.style.display = 'none';

        // Common possible floating launcher classes (legacy/prototypes) — hide if present
        ['flowing-floating', 'ff-floating-launcher', 'flowing-launcher'].forEach(cls => {
          document.querySelectorAll('.' + cls).forEach(el => { try { el.style.display = 'none'; } catch (e) { } });
        });
      } catch (e) { /* ignore errors when hiding optional nodes */ }
    }
  }

  switchToChatView() { this.setActiveView('chat'); }

  switchToBalancedView(issueKey) {
    console.log('🎯 Switching to balanced view for:', issueKey);

    const chatView = document.getElementById('chatOnlyView');
    const balancedView = document.getElementById('balancedView');

    // Switch views centrally
    this.setActiveView('balanced');

    // Load ticket details into balanced view
    this.loadTicketIntoBalancedView(issueKey);

    // Update context
    this.context.selectedIssue = issueKey;
    this.updateContextBadge();

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
        // If board is lower on page, use its top as overlay top and match height
        const overlayTop = Math.max(8, Math.round(brect.top));
        const overlayHeight = Math.max(200, Math.round(brect.height));
        this.footer.style.setProperty('--flowing-footer-overlay-top', overlayTop + 'px');
        this.footer.style.setProperty('--flowing-footer-overlay-height', overlayHeight + 'px');
      } else {
        this.footer.style.setProperty('--flowing-footer-overlay-top', topOffset + 'px');
        this.footer.style.setProperty('--flowing-footer-overlay-height', 'calc(100% - ' + topOffset + 'px)');
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
          <button onclick="window._flowingFooter?.public_switchToChatView?.()" style="padding:10px 20px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
            <i class="fas fa-arrow-left" style="margin-right:8px;"></i> Back to Chat
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

    const slaContainer = document.querySelector('.sla-monitor-container');
    if (!slaContainer) {
      console.warn('⚠️ SLA container not found');
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

        // Wait for DOM to be ready before customizing (nextTick)
        setTimeout(() => {
          // Customize layout for footer compact view
          // `.sla - panel` was removed — fallback to `.sla - monitor` or `.sla - cycle`
          const slaPanelElement = slaContainer.querySelector('.sla-panel') || slaContainer.querySelector('.sla-monitor') || slaContainer.querySelector('.sla-cycle');
          if (slaPanelElement) {
            console.log('🔧 Customizing SLA panel layout...');
            console.log('📋 Panel HTML:', slaPanelElement.innerHTML.substring(0, 200));

            // Hide "SLA Monitor" title
            const titleElement = slaPanelElement.querySelector('h3');
            if (titleElement) {
              titleElement.style.display = 'none';
              console.log('✅ Hidden title');
            }

            // Move refresh button next to status badge (use SLA monitor's real classes)
            const refreshBtn = slaPanelElement.querySelector('.sla-refresh-btn') ||
              slaPanelElement.querySelector('.refresh-sla-btn') ||
              slaPanelElement.querySelector('.btn-refresh-sla') ||
              slaPanelElement.querySelector('button[onclick*="refresh"]') ||
              Array.from(slaPanelElement.querySelectorAll('button')).find(btn =>
                (btn.textContent || '').toLowerCase().includes('↻') || (btn.textContent || '').toLowerCase().includes('refresh')
              );

            // Status badge is rendered as .cycle-status inside the SLA panel
            const statusBadge = slaPanelElement.querySelector('.cycle-status') ||
              slaPanelElement.querySelector('.cycle-status.healthy') ||
              Array.from(slaPanelElement.querySelectorAll('[class*="status"]')).find(el =>
                (el.textContent || '').toLowerCase().includes('on track') || (el.textContent || '').toLowerCase().includes('breach') || (el.textContent || '').toLowerCase().includes('breached')
              );

            console.log('🔍 Refresh button:', refreshBtn);
            console.log('🔍 Status badge:', statusBadge);

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
                statusContainer.appendChild(refreshBtn);
                console.log('✅ Moved refresh button next to status badge');
              }
            }

            // Move "Updated" next to "Remaining" (side-by-side)
            // Updated element from SLA monitor is '.sla-last-updated'
            const updatedElement = slaPanelElement.querySelector('.sla-last-updated') ||
              Array.from(slaPanelElement.querySelectorAll('*')).find(el =>
                (el.textContent || '').includes('Updated:')
              );

            // Find the detail row that contains the 'Remaining' label, then its value
            let remainingValue = null;
            const detailRows = Array.from(slaPanelElement.querySelectorAll('.detail-row'));
            const remainingRow = detailRows.find(row => {
              const lbl = row.querySelector('.detail-label');
              return lbl && /remaining/i.test(lbl.textContent || '');
            });
            if (remainingRow) {
              remainingValue = remainingRow.querySelector('.detail-value') || remainingRow.querySelector('span');
            } else {
              // Fallback: search generically for text
              const found = Array.from(slaPanelElement.querySelectorAll('*')).find(el => /remaining/i.test(el.textContent || ''));
              remainingValue = found;
            }

            console.log('🔍 Updated element:', updatedElement);
            console.log('🔍 Remaining value element:', remainingValue);

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

                console.log('✅ Moved updated next to remaining');
              } catch (e) {
                console.warn('⚠️ Could not move Updated next to Remaining:', e);
              }
            }

            // Reduce padding for compact view but keep panel visuals (do not override background/border)
            slaPanelElement.style.padding = '0';
          }

          console.log('✅ SLA Monitor rendered (compact mode)');
        }, 100); // Wait 100ms for DOM to stabilize

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
    const riskContainer = document.querySelector('.breach-risk-content');
    if (!riskContainer) return;

    // Get SLA data from window.slaMonitor
    const data = slaData || window.slaMonitor?.slaData?.[issueKey];

    if (!data || !data.ongoingCycle) {
      riskContainer.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;">
        <div style="width:50px;height:50px;border-radius:50%;background:rgba(16,185,129,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fas fa-check" style="font-size:20px;color:#10b981;"></i>
        </div>
        <div style="flex:1;">
          <p style="font-size:11px;color:#10b981;font-weight:600;margin:0;">LOW RISK</p>
          <p style="font-size:9px;color:#9ca3af;margin:2px 0 0 0;">No active SLA</p>
        </div>
      </div>
      `;
      return;
    }

    // Calculate breach probability based on elapsed vs remaining time
    const elapsed = Number(data.ongoingCycle.elapsedTime?.millis || 0);
    const remaining = Number(data.ongoingCycle.remainingTime?.millis || 0);
    const total = elapsed + remaining || 1;
    const percentage = Math.round((elapsed / total) * 100);

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
      riskColor = '#eab308';
      riskBg = 'rgba(234, 179, 8, 0.1)';
      riskIcon = 'fa-info-circle';
    } else {
      riskLevel = 'LOW';
      riskColor = '#10b981';
      riskBg = 'rgba(16, 185, 129, 0.1)';
      riskIcon = 'fa-check-circle';
    }

    riskContainer.innerHTML = `
      <div class="risk-card" style="display:flex;gap:12px;align-items:center;">
        <div class="risk-gauge" aria-hidden="true" style="position:relative;min-width:72px;min-height:72px;">
          <svg width="72" height="72" viewBox="0 0 60 60" class="risk-gauge-svg" aria-hidden="true">
            <circle cx="30" cy="30" r="25" fill="none" stroke="#e5e7eb" stroke-width="5"/>
            <circle cx="30" cy="30" r="25" fill="none" stroke="${riskColor}" stroke-width="5" stroke-dasharray="${(percentage / 100) * 157} 157" stroke-linecap="round" />
          </svg>
          <div class="risk-percent" style="position:absolute;left:0;top:0;width:72px;height:72px;display:flex;align-items:center;justify-content:center;font-weight:700;color:${riskColor};">${percentage}%</div>
        </div>

        <div class="risk-info" style="flex:1;">
          <div class="risk-header" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
            <div class="risk-title" style="font-weight:700;color:#374151;">Breach Risk</div>
            <div class="risk-badge" style="background:${riskBg}; color:${riskColor}; padding:6px 8px;border-radius:8px;font-weight:700;font-size:12px;">${riskLevel}</div>
          </div>

          <div class="risk-body" style="font-size:12px;color:#4b5563;">
            <div class="risk-line" style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;"><span class="risk-line-label" style="color:#6b7280;">Elapsed</span><span class="risk-line-value">${percentage}%</span></div>
            <div class="risk-line" style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;"><span class="risk-line-label" style="color:#6b7280;">Remaining</span><span class="risk-line-value ${percentage >= 75 ? 'risk-warning' : ''}">${data.ongoingCycle.remainingTime?.readable || data.ongoingCycle.remainingTime || 'N/A'}</span></div>
            ${percentage >= 75 ? `<div class="risk-note" style="margin-top:6px;color:${riskColor};font-weight:600;">${SVGIcons.alert ? SVGIcons.alert({ size: 12, className: 'inline-icon' }) : ''} Near deadline — attention recommended</div>` : ''}
          </div>
        </div>
      </div>
    `;
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
      const leftCol = container.querySelector('.left-column');
      const rightCol = container.querySelector('.right-column');
      if (!leftCol || !rightCol) return;
      const commentsSection = rightCol.querySelector('.comments-section');
      const composer = rightCol.querySelector('.comment-composer');
      if (!commentsSection) return;

      // Compute available height: left column height minus paddings and composer height
      const leftHeight = leftCol.getBoundingClientRect().height;
      const composerHeight = composer ? composer.getBoundingClientRect().height : 0;
      const paddingReserve = 40; // some breathing room
      const maxH = Math.max(120, Math.floor(leftHeight - composerHeight - paddingReserve));
      commentsSection.style.maxHeight = `${maxH} px`;
      commentsSection.style.overflowY = 'auto';
      // Also ensure comments list scrolls newest-first properly
      const list = commentsSection.querySelector('.comments-list');
      if (list) list.style.display = 'flex';
      console.log('🔧 Adjusted commentsSection maxHeight to', maxH);
    } catch (e) {
      console.warn('Could not adjust comments height:', e);
    }
  }

  renderAttachmentsForBalanced(issue) {
    try {
      const listContainer = document.getElementById('attachmentsListFooter');
      if (!listContainer) return;
      const attachments = issue?.fields?.attachment || issue.attachments || issue.serviceDesk?.requestFieldValues?.attachments || [];
      // Debug: log attachments payload to help diagnose missing thumbnails
      console.log('🔍 [Footer] attachments payload for', issue.key, attachments);
      if (!attachments || attachments.length === 0) { listContainer.innerHTML = ''; const preview = document.getElementById('attachmentsPreviewFooter'); if (preview) preview.classList.remove('show'); return; }
      let html = '';
      attachments.forEach(att => {
        const url = att.content || att.self || att.url || (`/ api / issues / ${issue.key} /attachments/${att.id} `);
        console.log('🔍 [Footer] attachment:', att.id || att.filename || att.name, 'url=', url, 'thumbnail=', att.thumbnail || att.thumbnailUrl || att.thumbnailUrl || null, 'mimeType=', att.mimeType);
        const filename = att.filename || att.name || att.displayName || 'attachment';
        const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(filename) || (att.mimeType && att.mimeType.startsWith('image/'));
        if (isImage) {
          html += `
    < div class="attachment-item" >
              <a class="attachment-thumb" href="${url}" target="_blank" rel="noopener noreferrer">
                <img src="${url}" alt="${filename}" style="max-width:120px; max-height:90px; border-radius:6px; display:block;" />
              </a>
              <div style="display:flex; gap:6px; align-items:center; margin-top:6px;">
                <a class="attachment-link" href="${url}" target="_blank" rel="noopener noreferrer" download>${SVGIcons.paperclip({ size: 14, className: 'inline-icon' })} <span>${filename}</span></a>
                <a class="attachment-download-btn" href="${url}" target="_blank" rel="noopener noreferrer" download title="Download" style="text-decoration:none;">${SVGIcons.download({ size: 14, className: 'inline-icon' })}</a>
              </div>
            </div >
    `;
        } else {
          html += `
    < div class="attachment-item" >
              <a class="attachment-link" href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:8px; padding:6px 8px; border-radius:6px; background:rgba(0,0,0,0.04); color:inherit; text-decoration:none;">${SVGIcons.paperclip({ size: 14, className: 'inline-icon' })} <span>${filename}</span></a>
              <a class="attachment-download-btn" href="${url}" target="_blank" rel="noopener noreferrer" download title="Download" style="margin-left:6px; text-decoration:none;">${SVGIcons.download({ size: 14, className: 'inline-icon' })}</a>
            </div >
    `;
        }
      });
      listContainer.innerHTML = html;
      // Show preview container when attachments exist
      const preview = document.getElementById('attachmentsPreviewFooter');
      if (preview) preview.classList.add('show');
      // Also populate header/right-column attachment placeholders if present
      try {
        const headerList = document.getElementById('attachmentsListHeader');
        if (headerList) headerList.innerHTML = html;
        const rightList = document.getElementById('attachmentsListRight');
        if (rightList) rightList.innerHTML = html;
      } catch (e) { /* ignore */ }
      // Description collapse now handled by native <details> element in the markup above; no JS required.
    } catch (e) {
      console.warn('renderAttachmentsForBalanced error', e);
    }
  }

  // Footer attachments handling (separate from right-sidebar)
  renderFooterAttachments(issue) {
    try {
      const listContainer = document.getElementById('attachmentsListFooter');
      if (!listContainer) return;
      const attachments = issue?.fields?.attachment || issue.attachments || issue.serviceDesk?.requestFieldValues?.attachments || [];
      console.log('🔍 [Footer|renderFooterAttachments] attachments payload for', issue.key, attachments);
      if (!attachments || attachments.length === 0) { listContainer.innerHTML = ''; const preview = document.getElementById('attachmentsPreviewFooter'); if (preview) preview.classList.remove('show'); return; }
      let html = '';
      attachments.forEach((att) => {
        const url = att.content || att.self || att.url || (`/ api / issues / ${issue.key} /attachments/${att.id} `);
        console.log('🔍 [Footer] attachment:', att.id || att.filename || att.name, 'url=', url, 'thumbnail=', att.thumbnail || att.thumbnailUrl || null, 'mimeType=', att.mimeType);
        const filename = att.filename || att.name || att.displayName || 'attachment';
        const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(filename) || (att.mimeType && att.mimeType.startsWith('image/'));
        if (isImage) {
          html += `
    < div class="attachment-item" >
              <a class="attachment-thumb" href="${url}" target="_blank" rel="noopener noreferrer">
                <img src="${url}" alt="${filename}" style="max-width:120px; max-height:90px; border-radius:6px; display:block;" />
              </a>
              <div style="display:flex; gap:6px; align-items:center; margin-top:6px;">
                <a class="attachment-link" href="${url}" target="_blank" rel="noopener noreferrer" download>${SVGIcons.paperclip({ size: 14, className: 'inline-icon' })} <span>${filename}</span></a>
                <a class="attachment-download-btn" href="${url}" target="_blank" rel="noopener noreferrer" download title="Download" style="text-decoration:none;">${SVGIcons.download({ size: 14, className: 'inline-icon' })}</a>
              </div>
            </div >
    `;
        } else {
          html += `
    < div class="attachment-item" >
              <a class="attachment-link" href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:8px; padding:6px 8px; border-radius:6px; background:rgba(0,0,0,0.04); color:inherit; text-decoration:none;">${SVGIcons.paperclip({ size: 14, className: 'inline-icon' })} <span>${filename}</span></a>
              <a class="attachment-download-btn" href="${url}" target="_blank" rel="noopener noreferrer" download title="Download" style="margin-left:6px; text-decoration:none;">${SVGIcons.download({ size: 14, className: 'inline-icon' })}</a>
            </div >
    `;
        }
      });
      listContainer.innerHTML = html;
      // Show preview container when attachments exist
      const preview = document.getElementById('attachmentsPreviewFooter');
      if (preview) preview.classList.add('show');
      // Mirror into header/right lists when available
      try {
        const headerList = document.getElementById('attachmentsListHeader');
        if (headerList) headerList.innerHTML = html;
        const rightList = document.getElementById('attachmentsListRight');
        if (rightList) rightList.innerHTML = html;
      } catch (e) { /* ignore */ }
    } catch (e) {
      console.warn('renderFooterAttachments error', e);
    }
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
      let html = '';
      window.footerAttachedFiles.forEach((file, idx) => {
        html += `
    < div class="attachment-item" >
            <span class="attachment-name" title="${file.name}">${SVGIcons.file({ size: 14, className: 'inline-icon' })} <span>${file.name}</span></span>
            <button class="attachment-remove" data-index="${idx}">${SVGIcons.close({ size: 12, className: 'inline-icon' })}</button>
          </div >
    `;
      });
      attachmentsList.innerHTML = html;
      // Setup remove handlers
      document.querySelectorAll('#attachmentsListFooter .attachment-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index);
          window.footerAttachedFiles.splice(idx, 1);
          if (window.footerAttachedFiles.length === 0) {
            attachmentsPreview?.classList.remove('show');
            attachmentsList.innerHTML = '';
          } else {
            this.addFooterAttachments([]);
          }
        });
      });
    } catch (e) { console.warn('addFooterAttachments error', e); }
  }

  formatCommentTime(timestamp) {
    if (window.commentsModule && typeof window.commentsModule.formatCommentTime === 'function') {
      return window.commentsModule.formatCommentTime(timestamp);
    }
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Ensure footer composer posts only after commentsModule is available
  async ensureCommentsModule() {
    if (window.commentsModule && typeof window.commentsModule.postComment === 'function') return true;
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/static/js/modules/comments.js?v=' + Date.now();
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      return !!(window.commentsModule && typeof window.commentsModule.postComment === 'function');
    } catch (e) {
      console.warn('Failed to load comments module dynamically:', e);
      return false;
    }
  }

  renderBalancedContent(issue) {
    const container = document.getElementById('balancedContentContainer');
    if (!container) return;

    console.log('🎨 Rendering balanced content for:', issue.key, issue);

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
    < div style = "grid-column: 1 / -1;" >
              <label style="font-size: 10px; font-weight: 700; color: #9ca3af; display:block; margin-bottom:6px;">${label}</label>
              <div style="padding:8px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; font-size:12px; max-height:160px; overflow-y:auto; white-space:pre-wrap;">${val}</div>
            </div >
    `;
        }
      });
    } catch (e) { console.warn('Could not collect long custom fields', e); }

    // TWO-COLUMN LAYOUT WITH ML SUGGESTIONS
    container.innerHTML = `
      ${description ? `
      <!-- Description Section (Full Width) - use native <details> so collapse is CSS-driven and simpler -->
      <details open class="ticket-description-section" style="padding: 0; background: transparent; border-bottom: 1px solid rgba(59, 130, 246, 0.08);">
        <summary class="section-label" style="display:flex; align-items:center; gap:8px; padding: 16px 20px; color: #4a5568; font-weight:600; font-size:13px; cursor:pointer;">
          <span style="display:flex; align-items:center; gap:8px;">
            ${SVGIcons.file({ size: 14, className: 'inline-icon' })}
            <span>Descripción:</span>
          </span>
          <span style="margin-left:auto;">${SVGIcons.chevronDown({ size: 14, className: 'inline-icon' })}</span>
        </summary>
        <div id="ticketDescriptionContent" class="ticket-description-content" style="padding: 0 20px 16px 20px; color: #4b5563; line-height:1.6; font-size:13px;">
          ${description ? `<p style="margin:0 0 8px 0;">${description}</p>` : ''}
        </div>
      </details>
      ` : ''
      }
      
      <div class="purple-divider" style="margin:0"></div>
      
      <!--TWO COLUMNS LAYOUT-- >
    <div class="footer-two-columns" style="display: grid; grid-template-columns: 58% 1px 41%; gap: 20px; padding: 16px 20px; max-height: calc(60vh - 250px); overflow-y: auto; align-items:start; position:relative;">

      <!-- LEFT COLUMN: Essential Fields + ML Suggestions (58%) -->
      <div class="left-column" style="display: flex; flex-direction: column; gap: 16px;">

        <!-- Attachments preview (replaces ML suggestions banner) -->
        <div id="attachmentsPreviewHeader" class="attachments-preview-header" style="display:flex;align-items:center;gap:12px;padding:8px 0;">
          <div style="font-size:12px;color:#6b7280;font-weight:600;">Attachments</div>
          <div id="attachmentsListHeader" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;"></div>
        </div>

        ${longCustomFieldsHTML ? longCustomFieldsHTML : ''}

        <!-- Essential Fields Grid (4 columns) -->
        <div class="essential-fields-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">

          <!-- Priority -->
          ${priority ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-flag" style="color: #ef4444;"></i> Priority
              </label>
              <div class="field-input" style="padding: 8px 10px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 13px; color: var(--field-text);">
                ${priority}
              </div>
              <!-- ML Suggestion Inline (placeholder) -->
              <div class="ml-suggestion-checkbox" style="margin-top: 6px; padding: 6px 8px; font-size: 10px; border-radius: 6px; background: linear-gradient(135deg, #f8f9ff, #ffffff); border: 1px solid #e3e8ff; display: flex; align-items: center; gap: 6px; opacity: 0.7;">
                <span style="font-size: 11px;">✨</span>
                <span style="flex: 1; color: #6b7280;">ML suggestions coming soon</span>
              </div>
            </div>
            ` : ''}

          <!-- Assignee -->
          ${assignee || !assignee ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-user" style="color: #3b82f6;"></i> Assignee
              </label>
              <div class="field-input" style="padding: 8px 10px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 13px; color: var(--field-text);">
                ${assignee || 'Unassigned'}
              </div>
            </div>
            ` : ''}

          <!-- Status -->
          ${status ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-tasks" style="color: #10b981;"></i> Status
              </label>
              <div class="field-input" style="padding: 8px 10px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 13px; color: var(--field-text);">
                ${status}
              </div>
            </div>
            ` : ''}

          <!-- Criticidad -->
          ${criticidad ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Criticidad
              </label>
              <div class="field-input" style="padding: 8px 10px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 13px; color: var(--field-text);">
                ${criticidad}
              </div>
            </div>
            ` : ''}

          <!-- Tipo de Solicitud -->
          ${tipoSolicitud ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-clipboard-list" style="color: #8b5cf6;"></i> Tipo de Solicitud
              </label>
              <div class="field-input" style="padding: 8px 10px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 13px; color: var(--field-text);">
                ${tipoSolicitud}
              </div>
            </div>
            ` : ''}

          <!-- Platform -->
          ${plataforma ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-laptop" style="color: #06b6d4;"></i> Plataforma
              </label>
              <div class="field-input" style="padding: 8px 10px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 13px; color: var(--field-text);">
                ${plataforma}
              </div>
            </div>
            ` : ''}

          <!-- Área -->
          ${area ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-sitemap" style="color: #8b5cf6;"></i> Área
              </label>
              <div class="field-input" style="padding: 8px 10px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 13px; color: var(--field-text);">
                ${area}
              </div>
            </div>
            ` : ''}

          <!-- Empresa -->
          ${empresa ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-building" style="color: #6366f1;"></i> Empresa
              </label>
              <div class="field-input" style="padding: 8px 10px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px;">
                ${empresa}
              </div>
            </div>
            ` : ''}

          <!-- Producto -->
          ${producto ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-box" style="color: #ec4899;"></i> Producto
              </label>
              <div class="field-input" style="padding: 8px 10px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px;">
                ${producto}
              </div>
            </div>
            ` : ''}

          <!-- Request Type -->
          ${requestType ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-ticket-alt" style="color: #3b82f6;"></i> Request Type
              </label>
              <div class="field-input" style="padding: 8px 10px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px;">
                ${requestType}
              </div>
            </div>
            ` : ''}

          <!-- Reporter -->
          ${reporter || reporter2 ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-user-circle" style="color: #6b7280;"></i> Reporter
              </label>
              <div class="field-input" style="padding: 8px 10px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px;">
                ${reporter || reporter2}
              </div>
            </div>
            ` : ''}

          <!-- Email -->
          ${email ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-envelope" style="color: #3b82f6;"></i> Email
              </label>
              <div class="field-input" style="padding: 8px 10px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 12px; word-break: break-all; color: var(--field-text);">
                ${email}
              </div>
            </div>
            ` : ''}

          <!-- Phone -->
          ${phone ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-phone" style="color: #10b981;"></i> Phone
              </label>
              <div class="field-input" style="padding: 8px 10px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 13px; color: var(--field-text);">
                ${phone}
              </div>
            </div>
            ` : ''}

          <!-- País -->
          ${pais ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-globe" style="color: #06b6d4;"></i> País
              </label>
              <div class="field-input" style="padding: 8px 10px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 13px; color: var(--field-text);">
                ${pais}
              </div>
            </div>
            ` : ''}

          <!-- País/Código -->
          ${paisCodigo ? `
            <div class="field-wrapper">
              <label class="field-label" style="color: #6b7280; font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                <i class="fas fa-flag" style="color: #10b981;"></i> País/Código
              </label>
              <div class="field-input" style="padding: 8px 10px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px;">
                ${paisCodigo}
              </div>
            </div>
            ` : ''}
        </div>

        <!-- SLA Monitor & Breach Risk (2 columns grid) -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 16px;">
          <!-- SLA Monitor (Column 1) -->
          <div class="sla-monitor-wrapper">
            <div class="sla-monitor-container" style="background: rgba(249, 250, 251, 0.5); border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px;">
              <div style="text-align: center; padding: 12px; color: #9ca3af; font-size: 11px;">
                <i class="fas fa-spinner fa-spin" style="margin-bottom: 6px; font-size: 14px;"></i><br>
                  Loading SLA...
              </div>
            </div>
          </div>

          <!-- Breach Risk Analytics (Column 2) -->
          <div class="sla-breach-risk" style="background: rgba(249, 250, 251, 0.5); border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
              <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i class="fas fa-shield-alt" style="font-size: 13px;"></i>
              </div>
              <h4 style="font-size: 12px; font-weight: 600; color: #374151; margin: 0;">Breach Risk</h4>
            </div>

            <div class="breach-risk-content" style="text-align: center; padding: 12px; color: #9ca3af; font-size: 11px;">
              <i class="fas fa-spinner fa-spin" style="margin-bottom: 6px; font-size: 14px;"></i><br>
                Analyzing...
            </div>
          </div>
        </div>

        <!-- Extra Details (Collapsible) -->
        <div class="extra-details" style="margin-top: 8px;">
          <button class="btn-toggle-details" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('i').classList.toggle('fa-chevron-down'); this.querySelector('i').classList.toggle('fa-chevron-up');" style="width: 100%; padding: 10px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; cursor: pointer; font-weight: 600; color: var(--field-text); font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;">
            <i class="fas fa-chevron-down" style="font-size: 10px;"></i>
            <span>Show More Details</span>
          </button>
          <div class="extra-details-content" style="display: none; margin-top: 12px;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
              ${created ? `
                <div>
                  <label style="font-size: 10px; font-weight: 600; color: #9ca3af; display: block; margin-bottom: 4px;">
                    <i class="fas fa-calendar-plus" style="margin-right: 4px;"></i> Created
                  </label>
                  <div style="padding: 6px 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px;">
                    ${formatDate(created)}
                  </div>
                </div>
                ` : ''}
              ${updated ? `
                <div>
                  <label style="font-size: 10px; font-weight: 600; color: #9ca3af; display: block; margin-bottom: 4px;">
                    <i class="fas fa-calendar-check" style="margin-right: 4px;"></i> Updated
                  </label>
                  <div style="padding: 6px 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px;">
                    ${formatDate(updated)}
                  </div>
                </div>
                ` : ''}
              ${area ? `
                <div>
                  <label style="font-size: 10px; font-weight: 600; color: #9ca3af; display: block; margin-bottom: 4px;">
                    <i class="fas fa-sitemap" style="margin-right: 4px;"></i> Área
                  </label>
                  <div style="padding: 6px 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px;">
                    ${area}
                  </div>
                </div>
                ` : ''}
              ${empresa ? `
                <div>
                  <label style="font-size: 10px; font-weight: 600; color: #9ca3af; display: block; margin-bottom: 4px;">
                    <i class="fas fa-building" style="margin-right: 4px;"></i> Empresa
                  </label>
                  <div style="padding: 6px 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px;">
                    ${empresa}
                  </div>
                </div>
                ` : ''}
              ${producto ? `
                <div>
                  <label style="font-size: 10px; font-weight: 600; color: #9ca3af; display: block; margin-bottom: 4px;">
                    <i class="fas fa-box" style="margin-right: 4px;"></i> Producto
                  </label>
                  <div style="padding: 6px 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px;">
                    ${producto}
                  </div>
                </div>
                ` : ''}
              ${notasAnalisis ? `
                <div style="grid-column: 1 / -1;">
                  <label style="font-size: 10px; font-weight: 600; color: #9ca3af; display: block; margin-bottom: 4px;">
                    <i class="fas fa-sticky-note" style="margin-right: 4px;"></i> Notas/Análisis
                  </label>
                  <div style="padding: 6px 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px; max-height: 80px; overflow-y: auto;">
                    ${notasAnalisis}
                  </div>
                </div>
                ` : ''}
              ${resolucion ? `
                <div style="grid-column: 1 / -1;">
                  <label style="font-size: 10px; font-weight: 600; color: #9ca3af; display: block; margin-bottom: 4px;">
                    <i class="fas fa-check-circle" style="margin-right: 4px;"></i> Resolución
                  </label>
                  <div style="padding: 6px 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px; max-height: 80px; overflow-y: auto;">
                    ${resolucion}
                  </div>
                </div>
                ` : ''}
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons-container" style="display: flex; gap: 10px; padding-top: 12px; border-top: 1px solid #e5e7eb; margin-top: 8px;">
          <button onclick="window._flowingFooter?.public_switchToChatView?.()" style="flex: 1; padding: 10px 16px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s; box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);">
            <i class="fas fa-comments" style="margin-right: 6px;"></i> Back to Chat
          </button>
        </div>
      </div>

      <div class="columns-divider" aria-hidden="true"></div>

      <!-- RIGHT COLUMN: ML Actions & Comments (42%) -->
      <div class="right-column" style="display: flex; flex-direction: column; gap: 12px;">

        <!-- Attachments area (replaces ML Actions) -->
        <div class="attachments-section" style="background: rgba(249, 250, 251, 0.5); border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px;">
          <h4 style="font-size:13px;font-weight:600;color:#374151;margin:0 0 8px 0;display:flex;align-items:center;gap:8px;">
            <i class="fas fa-paperclip" style="color:#6d28d9;"></i> Attachments
          </h4>
          <div id="attachmentsListRight" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;"></div>
        </div>

        <div class="purple-divider"></div>

        <!-- Comments Section (Placeholder) -->
        <div class="comments-section" style="flex: 1; background: transparent; border-radius: 10px; padding: 14px; max-height: 280px; overflow-y: auto;">
          <!-- Attachments preview (balanced/footer) -->
          <div class="attachments-preview-footer" id="attachmentsPreviewFooter" style="margin-bottom:10px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <div class="attachments-list" id="attachmentsListFooter"></div>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <h4 style="font-size: 13px; font-weight: 600; color: #374151; margin: 0; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-comments" style="color: #6d28d9;"></i> Comments
            </h4>
            <span id="commentCountFooter" style="font-size:12px; color:#6b7280;">(0)</span>
          </div>

          <!-- Comment composer (balanced/footer view) -->
          <div class="comment-composer" style="display:flex; gap:8px; align-items:flex-start; margin:10px 0 12px 0;">
            <textarea id="footerCommentText" placeholder="Write a comment..." rows="2" style="flex:1; resize: vertical; min-height:40px; max-height:120px; padding:8px 10px; border:1px solid rgba(0,0,0,0.08); border-radius:8px; font-size:13px;"></textarea>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; gap:8px;">
                <button id="attachFooterBtn" class="comment-toolbar-btn" title="Attach file" style="padding:8px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:8px; cursor:pointer;">${SVGIcons.paperclip({ size: 14, className: 'inline-icon' })}</button>
                <button class="btn-add-comment-footer" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:600;">Send</button>
              </div>
              <label style="font-size:11px; color:#6b7280; display:flex; align-items:center; gap:6px;"><input type="checkbox" id="commentInternalFooter"> Internal</label>
            </div>
          </div>

          <div class="comments-list" style="display: flex; flex-direction: column; gap: 8px;">
            <p style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <i class="fas fa-spinner fa-spin" style="font-size: 16px; margin-bottom: 8px;"></i><br>
                Loading comments...
            </p>
          </div>
        </div>
      </div>
    </div>
  `;


  }

  adjustContentPadding(isCollapsed) {
    const kanbanView = document.getElementById('kanbanView');
    const boardWrapper = document.querySelector('.board-wrapper');
    const rightSidebar = document.getElementById('rightSidebar');

    try {
      if (isCollapsed) {
        // When collapsed, keep a small reserved area matching collapsed footer
        const collapsedHeight = 80; // matches collapsed padding in CSS
        const padding = `${collapsedHeight}px`;
        if (kanbanView) kanbanView.style.paddingBottom = padding;
        if (boardWrapper) boardWrapper.style.paddingBottom = padding;
        if (rightSidebar) rightSidebar.style.paddingBottom = padding;
        return;
      }

      // When expanded, compute footer height and reserve that space so the board isn't covered
      const footerEl = document.getElementById('flowingFooter') || this.footer;
      let footerHeight = 300; // sensible default
      try {
        if (footerEl) footerHeight = Math.round(footerEl.getBoundingClientRect().height);
        else {
          const cssH = getComputedStyle(document.documentElement).getPropertyValue('--flowing-footer-height');
          if (cssH) footerHeight = parseInt(cssH, 10) || footerHeight;
        }
      } catch (e) { /* ignore */ }

      // Add small buffer so elements don't touch footer border
      const paddingExpanded = `${Math.max(footerHeight + 16, 200)}px`;
      if (kanbanView) kanbanView.style.paddingBottom = paddingExpanded;
      if (boardWrapper) boardWrapper.style.paddingBottom = paddingExpanded;
      if (rightSidebar) rightSidebar.style.paddingBottom = paddingExpanded;
    } catch (e) {
      // Fallback conservative padding
      const fallback = isCollapsed ? '80px' : '300px';
      if (kanbanView) kanbanView.style.paddingBottom = fallback;
      if (boardWrapper) boardWrapper.style.paddingBottom = fallback;
      if (rightSidebar) rightSidebar.style.paddingBottom = fallback;
    }
  }

  async sendMessage() {
    if (this.isLoading) return;

    const message = this.input?.value.trim();
    if (!message) return;

    // Clear input
    this.input.value = '';
    this.input.style.height = 'auto';

    // Add user message
    this.addMessage('user', message);

    // Show loading
    this.isLoading = true;
    this.sendBtn.disabled = true;
    const loadingMsg = this.addMessage('assistant', '', true);

    try {
      // Send to backend
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          context: this.context
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} `);
      }

      const data = await response.json();

      // Remove loading message
      loadingMsg?.remove();

      // Add assistant response
      this.addMessage('assistant', data.response || 'Sorry, I encountered an error.');

    } catch (error) {
      console.error('❌ Flowing MVP error:', error);
      loadingMsg?.remove();
      this.addMessage('assistant', '❌ Sorry, I encountered an error. Please try again.');
    } finally {
      this.isLoading = false;
      this.sendBtn.disabled = false;
    }
  }

  addMessage(role, content, isLoading = false) {
    if (!this.messagesContainer) return null;

    const messageDiv = document.createElement('div');
    messageDiv.className = `flowing - message ${role}${isLoading ? ' loading' : ''} `;

    const avatar = role === 'user' ? '👤' : 'SF';
    const avatarClass = role === 'user' ? '' : 'copilot-sf-logo';

    messageDiv.innerHTML = `
    < div class="message-avatar ${avatarClass}" > ${avatar}</div >
      <div class="message-content">
        ${isLoading ? '<p>Thinking...</p>' : this.formatMessage(content)}
      </div>
  `;

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();

    return messageDiv;
  }

  formatMessage(content) {
    // Convert markdown-style formatting to HTML
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // Convert bullet points
    if (formatted.includes('- ') || formatted.includes('• ')) {
      const lines = formatted.split('</p><p>');
      formatted = lines.map(line => {
        if (line.includes('- ') || line.includes('• ')) {
          const items = line.split(/<br>/).filter(l => l.trim());
          const listItems = items.map(item => {
            const cleaned = item.replace(/^[•\-]\s*/, '').trim();
            return cleaned ? `< li > ${cleaned}</li > ` : '';
          }).join('');
          return `< ul > ${listItems}</ul > `;
        }
        return line;
      }).join('</p><p>');
    }

    // Wrap in paragraph if not already wrapped
    if (!formatted.startsWith('<p>') && !formatted.startsWith('<ul>')) {
      formatted = `< p > ${formatted}</p > `;
    }

    return formatted;
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  // Public API for external usage
  askAboutTicket(issueKey) {
    this.expand();
    this.input.value = `Tell me about ticket ${issueKey} `;
    this.input.focus();
  }

  suggestActions(issueKey) {
    this.expand();
    this.input.value = `What should I do with ticket ${issueKey} ? `;
    this.sendMessage();
  }

  explainSLA(issueKey) {
    this.expand();
    this.input.value = `Explain the SLA status for ${issueKey}`;
    this.sendMessage();
  }

  /**
   * Mostrar sugerencias contextuales usando FlowingContext
   * Integra las capacidades de IA real del sistema Flowing
   */
  async showContextualSuggestions() {
    if (!window.FlowingContext) {
      console.warn('FlowingContext not available');
      return;
    }

    try {
      // Obtener sugerencias contextuales
      const suggestions = await window.FlowingContext.getSuggestions();

      if (!suggestions || !suggestions.suggestions || suggestions.suggestions.length === 0) {
        return;
      }

      // Mostrar mensaje con sugerencias
      const suggestionsList = suggestions.suggestions.map(s =>
        `• ${s.icon || '💡'} ${s.title} `
      ).join('\n');

      this.addMessage(
        `** ${suggestions.title || 'Sugerencias Contextuales'}**\n\n${suggestionsList} \n\n_Click en "✨ Flowing AI" en cualquier sugerencia para ejecutarla._`,
        'assistant'
      );
    } catch (error) {
      console.error('Error showing contextual suggestions:', error);
    }
  }
}

// Exponer FlowingContext globalmente para integración con footer
if (typeof FlowingContext !== 'undefined') {
  // prefer non-deprecated name
  window._FlowingContext = FlowingContext;
  // provide deprecated alias with warning
  try {
    Object.defineProperty(window, 'FlowingContext', {
      configurable: true,
      get() { console.warn('window.FlowingContext is deprecated — access window._FlowingContext instead'); return window._FlowingContext; },
      set(v) { console.warn('Setting window.FlowingContext is deprecated — set window._FlowingContext instead'); window._FlowingContext = v; }
    });
  } catch (e) { window.FlowingContext = FlowingContext; }
}

// Create a proxy so other scripts can call window.flowingFooter.* before the real instance is ready.
(() => {
  if (!window.flowingFooter) {
    const queue = [];
    const proxy = new Proxy({}, {
      get(_, prop) {
        // support explicit flush
        if (prop === '_flush') return () => {
          while (queue.length) {
            const { method, args } = queue.shift();
            try {
              const mapping = {
                expand: 'public_expand',
                collapse: 'public_collapse',
                switchToChatView: 'public_switchToChatView',
                switchToBalancedView: 'public_switchToBalancedView',
                askAboutTicket: 'public_askAboutTicket',
                suggestActions: 'public_suggestActions',
                explainSLA: 'public_explainSLA',
                showContextualSuggestions: 'public_showContextualSuggestions'
              };
              const target = mapping[method] || method;
              if (window._flowingFooter && typeof window._flowingFooter[target] === 'function') {
                window._flowingFooter[target](...args);
              }
            } catch (e) { console.warn('Error flushing queued FlowingFooter call', method, e); }
          }
        };

        // return a function that either forwards to real instance or queues the call
        return (...args) => {
          const mapping = {
            expand: 'public_expand',
            collapse: 'public_collapse',
            switchToChatView: 'public_switchToChatView',
            switchToBalancedView: 'public_switchToBalancedView',
            askAboutTicket: 'public_askAboutTicket',
            suggestActions: 'public_suggestActions',
            explainSLA: 'public_explainSLA',
            showContextualSuggestions: 'public_showContextualSuggestions'
          };
          const target = mapping[prop] || prop;
          if (window._flowingFooter && typeof window._flowingFooter[target] === 'function') {
            return window._flowingFooter[target](...args);
          }
          queue.push({ method: target, args });
        };
      }
    });

    // define a deprecated alias that warns when accessed but returns the proxy
    try {
      Object.defineProperty(window, 'flowingFooter', {
        configurable: true,
        get() { console.warn('window.flowingFooter is deprecated — use window._flowingFooter instead'); return proxy; },
        set(v) { console.warn('Setting window.flowingFooter is deprecated — set window._flowingFooter instead'); window._flowingFooter = v; }
      });
    } catch (e) {
      window.flowingFooter = proxy;
    }
  }

  // Initialize real instance on DOMContentLoaded and flush queued calls
  document.addEventListener('DOMContentLoaded', () => {
    try {
      window._flowingFooter = new FlowingFooter();
      if (window.flowingFooter && typeof window.flowingFooter._flush === 'function') window.flowingFooter._flush();
      console.log('✅ Flowing MVP Footer loaded');
    } catch (e) {
      console.error('Failed to initialize FlowingFooter', e);
    }
  });
})();
