/**
 * FLOWING MVP FOOTER
 * Collapsible chat assistant with context awareness
 */

class FlowingFooter {
  constructor() {
    this.footer = null;
    this.toggleBtn = null;
    this.closeBtn = null;
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
    this.closeBtn = document.getElementById('flowingCloseBtn');
    this.messagesContainer = document.getElementById('flowingMessages');
    this.input = document.getElementById('flowingInput');
    this.sendBtn = document.getElementById('flowingSendBtn');
    this.contextBadge = document.getElementById('flowingContextBadge');
    this.suggestionElement = document.getElementById('flowingSuggestion');

    if (!this.footer) {
      console.error('❌ Flowing MVP footer not found');
      return;
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
    this.toggleBtn?.addEventListener('click', () => {
      this.toggle();
      // Si FlowingContext está disponible, mostrar sugerencias contextuales
      if (window.FlowingContext && this.isExpanded) {
        this.showContextualSuggestions();
      }
    });
    
    // Close button
    this.closeBtn?.addEventListener('click', () => this.collapse());
    
    // Send button
    this.sendBtn?.addEventListener('click', () => this.sendMessage());
    
    // Input handling
    this.input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    this.input?.addEventListener('input', () => {
      this.input.style.height = 'auto';
      this.input.style.height = Math.min(this.input.scrollHeight, 120) + 'px';
    });
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
      const txt = `${SVGIcons.alert({size:14,className:'inline-icon'})} ${overdueTickets.length} ticket${overdueTickets.length > 1 ? 's' : ''} overdue (7+ days)`;
      this.suggestions.push({ text: txt, type: 'warning', key: this._stripHTML(txt) });
    }

    // Analyze critical/high priority tickets
    const urgentTickets = issues.filter(issue => 
      issue.severity === 'Critico' || issue.severity === 'Alto'
    );

    if (urgentTickets.length > 0) {
      const txt = `${SVGIcons.xCircle({size:14,className:'inline-icon'})} ${urgentTickets.length} urgent ticket${urgentTickets.length > 1 ? 's' : ''} require attention`;
      this.suggestions.push({ text: txt, type: 'critical', key: this._stripHTML(txt) });
    }

    // Analyze unassigned tickets
    const unassignedTickets = issues.filter(issue => 
      !issue.assignee || issue.assignee === 'Unassigned' || issue.assignee === 'No assignee'
    );

    if (unassignedTickets.length > 0) {
      const txt = `${SVGIcons.user({size:14,className:'inline-icon'})} ${unassignedTickets.length} unassigned ticket${unassignedTickets.length > 1 ? 's' : ''} in queue`;
      this.suggestions.push({ text: txt, type: 'info', key: this._stripHTML(txt) });
    }

    // Analyze about to breach (3+ days)
    const aboutToBreachTickets = issues.filter(issue => {
      const lastChange = new Date(issue.last_real_change || issue.updated || issue.created);
      const daysSince = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
      return daysSince >= 3 && daysSince < 7;
    });

    if (aboutToBreachTickets.length > 0) {
      const txt = `${SVGIcons.clock({size:14,className:'inline-icon'})} ${aboutToBreachTickets.length} ticket${aboutToBreachTickets.length > 1 ? 's' : ''} approaching SLA breach`;
      this.suggestions.push({ text: txt, type: 'warning', key: this._stripHTML(txt) });
    }

    // All clear message
    if (this.suggestions.length === 0) {
      const txt = `${SVGIcons.success({size:14,className:'inline-icon'})} All tickets are up to date!`;
      this.suggestions.push({ text: txt, type: 'success', key: this._stripHTML(txt) });
    }

    // Add general queue info
    const txt = `${SVGIcons.chart({size:14,className:'inline-icon'})} ${issues.length} ticket${issues.length > 1 ? 's' : ''} in current queue`;
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
      this.suggestionElement.classList.remove('suggestion-critical','suggestion-warning','suggestion-info','suggestion-success');
      this.suggestionElement.classList.add(`suggestion-${suggestion.type}`);

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

      desiredText = summary ? `${issueKey} — ${summary}` : `Ticket: ${issueKey}`;
    } else if (this.context.currentQueue) {
      desiredText = `Queue: ${this.context.currentQueue} (${this.context.issuesCount} tickets)`;
    } else if (this.context.currentDesk) {
      desiredText = `Desk: ${this.context.currentDesk}`;
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
    try { if (this.footer) this.footer.style.maxHeight = '640px'; } catch(e){}

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
          document.body.classList.add('flowing-footer-expanded');
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
    try { document.body.classList.remove('flowing-footer-expanded'); } catch(e){}
    try { if (this.footer) this.footer.style.maxHeight = ''; } catch(e){}
    try { document.documentElement.style.removeProperty('--flowing-footer-height'); } catch(e){}
    try { document.documentElement.style.removeProperty('--flowing-header-height'); } catch(e){}
    try { document.documentElement.style.removeProperty('--flowing-footer-translate'); } catch(e){}
    
    // Switch back to chat view when collapsing
    this.switchToChatView();
    
    console.log('🤖 Flowing MVP collapsed');
  }
  
  switchToChatView() {
    const chatView = document.getElementById('chatOnlyView');
    const balancedView = document.getElementById('balancedView');
    
    if (chatView) chatView.style.display = 'block';
    if (balancedView) balancedView.style.display = 'none';
    
    // Reset context
    this.context.selectedIssue = null;
    this.updateContextBadge();
    
    if (this.suggestionElement) {
      this.suggestionElement.textContent = 'Analyzing your queue...';
      // resume rotation when returning to chat view
      this.resumeSuggestionRotation();
    }
  }
  
  switchToBalancedView(issueKey) {
    console.log('🎯 Switching to balanced view for:', issueKey);
    
    const chatView = document.getElementById('chatOnlyView');
    const balancedView = document.getElementById('balancedView');
    
    if (chatView) chatView.style.display = 'none';
    if (balancedView) {
      balancedView.style.display = 'block';
      
      // Load ticket details into balanced view
      this.loadTicketIntoBalancedView(issueKey);
    }
    
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
        <div style="padding: 40px; text-align: center;">
          <p style="color: #ef4444; margin-bottom: 16px;">❌ Issue not found in current queue</p>
          <button onclick="window.flowingFooter.switchToChatView()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
            <i class="fas fa-arrow-left" style="margin-right: 8px;"></i> Back to Chat
          </button>
        </div>
      `;
      return;
    }
    
    // Show loading state
    container.innerHTML = `
      <div style="padding: 40px; text-align: center;">
        <div class="loading-spinner" style="border: 4px solid #f3f4f6; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        <p style="margin-top: 16px; color: #6b7280;">Loading complete ticket details...</p>
      </div>
    `;
    
    try {
      // Fetch complete details from Service Desk API (same as right-sidebar)
      const response = await fetch(`/api/servicedesk/request/${issueKey}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
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
      try { this.renderAttachmentsForBalanced(completeIssue); } catch(e) { console.warn('Could not render attachments for balanced view', e); }
      try { this.renderFooterAttachments(completeIssue); } catch(e) { /* ignore */ }
      try { this.setupFooterAttachmentButton(); } catch(e) { /* ignore */ }
      
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
      try { this.renderAttachmentsForBalanced(issue); } catch(e) { /* ignore */ }
      try { this.renderFooterAttachments(issue); } catch(e) { /* ignore */ }
      try { this.setupFooterAttachmentButton(); } catch(e) { /* ignore */ }
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
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <i class="fas fa-info-circle" style="margin-bottom: 8px; font-size: 16px;"></i><br>
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
          // `.sla-panel` was removed — fallback to `.sla-monitor` or `.sla-cycle`
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
          <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 11px;">
            <i class="fas fa-check-circle" style="margin-bottom: 6px; font-size: 14px; color: #10b981;"></i><br>
            No active SLA
          </div>
        `;
        
        // Show no risk if no SLA
        this.renderBreachRisk(issueKey, null);
      }
    } catch (error) {
      console.error('❌ Error initializing SLA Monitor:', error);
      slaContainer.innerHTML = `
        <div style="text-align: center; padding: 16px; color: #ef4444; font-size: 11px;">
          Failed to load SLA
        </div>
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
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px;">
          <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i class="fas fa-check" style="font-size: 20px; color: #10b981;"></i>
          </div>
          <div style="flex: 1;">
            <p style="font-size: 11px; color: #10b981; font-weight: 600; margin: 0;">LOW RISK</p>
            <p style="font-size: 9px; color: #9ca3af; margin: 2px 0 0 0;">No active SLA</p>
          </div>
        </div>
      `;
      return;
    }
    
    // Calculate breach probability based on elapsed vs remaining time
    const elapsed = data.ongoingCycle.elapsedTime?.millis || 0;
    const remaining = data.ongoingCycle.remainingTime?.millis || 1;
    const total = elapsed + remaining;
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
      <div style="display: flex; align-items: center; gap: 12px; padding: 8px;">
        <!-- Risk Gauge (Left side) -->
        <div style="flex-shrink: 0;">
          <div style="width: 60px; height: 60px; position: relative;">
            <svg width="60" height="60" style="transform: rotate(-90deg);">
              <!-- Background circle -->
              <circle cx="30" cy="30" r="25" fill="none" stroke="#e5e7eb" stroke-width="5"/>
              <!-- Progress circle -->
              <circle 
                cx="30" 
                cy="30" 
                r="25" 
                fill="none" 
                stroke="${riskColor}" 
                stroke-width="5"
                stroke-dasharray="${(percentage / 100) * 157} 157"
                stroke-linecap="round"
              />
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
              <div style="font-size: 14px; font-weight: 700; color: ${riskColor};">${percentage}%</div>
            </div>
          </div>
        </div>
        
        <!-- Risk Info (Right side) -->
        <div style="flex: 1; min-width: 0;">
          <!-- Risk Badge -->
          <div style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: ${riskBg}; border-radius: 6px; margin-bottom: 6px;">
            <i class="fas ${riskIcon}" style="font-size: 9px; color: ${riskColor};"></i>
            <span style="font-size: 10px; font-weight: 600; color: ${riskColor};">${riskLevel}</span>
          </div>
          
          <!-- Risk Factors -->
          <div style="font-size: 10px; color: #6b7280;">
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
              <span style="font-size: 8px;">${SVGIcons.zap({size:10,className:'inline-icon'})}</span>
              <span>Elapsed: ${percentage}%</span>
            </div>
            ${percentage >= 75 ? `
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-size: 8px;">${SVGIcons.alert({size:10,className:'inline-icon'})}</span>
              <span>Near deadline</span>
            </div>
            ` : ''}
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
      commentsSection.style.maxHeight = `${maxH}px`;
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
        const url = att.content || att.self || att.url || (`/api/issues/${issue.key}/attachments/${att.id}`);
        console.log('🔍 [Footer] attachment:', att.id || att.filename || att.name, 'url=', url, 'thumbnail=', att.thumbnail || att.thumbnailUrl || att.thumbnailUrl || null, 'mimeType=', att.mimeType);
        const filename = att.filename || att.name || att.displayName || 'attachment';
        const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(filename) || (att.mimeType && att.mimeType.startsWith('image/'));
        if (isImage) {
          html += `
            <div class="attachment-item">
              <a class="attachment-thumb" href="${url}" target="_blank" rel="noopener noreferrer">
                <img src="${url}" alt="${filename}" style="max-width:120px; max-height:90px; border-radius:6px; display:block;" />
              </a>
              <div style="display:flex; gap:6px; align-items:center; margin-top:6px;">
                <a class="attachment-link" href="${url}" target="_blank" rel="noopener noreferrer" download>${SVGIcons.paperclip({size:14,className:'inline-icon'})} <span>${filename}</span></a>
                <a class="attachment-download-btn" href="${url}" target="_blank" rel="noopener noreferrer" download title="Download" style="text-decoration:none;">${SVGIcons.download({size:14,className:'inline-icon'})}</a>
              </div>
            </div>
          `;
        } else {
          html += `
            <div class="attachment-item">
              <a class="attachment-link" href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:8px; padding:6px 8px; border-radius:6px; background:rgba(0,0,0,0.04); color:inherit; text-decoration:none;">${SVGIcons.paperclip({size:14,className:'inline-icon'})} <span>${filename}</span></a>
              <a class="attachment-download-btn" href="${url}" target="_blank" rel="noopener noreferrer" download title="Download" style="margin-left:6px; text-decoration:none;">${SVGIcons.download({size:14,className:'inline-icon'})}</a>
            </div>
          `;
        }
      });
      listContainer.innerHTML = html;
      // Show preview container when attachments exist
      const preview = document.getElementById('attachmentsPreviewFooter');
      if (preview) preview.classList.add('show');
      // Setup description toggle behavior (if present)
      try {
        const descToggle = document.getElementById('descriptionToggleBtn');
        const descContent = document.getElementById('ticketDescriptionContent');
        if (descToggle && descContent) {
          descToggle.addEventListener('click', () => {
            console.log('🔧 Description toggle clicked');
            const isCollapsed = descContent.classList.toggle('collapsed');
            descToggle.setAttribute('aria-expanded', String(!isCollapsed));
            // toggle class for icon rotation
            if (isCollapsed) descToggle.classList.add('collapsed'); else descToggle.classList.remove('collapsed');
            // update title
            descToggle.title = isCollapsed ? 'Expand description' : 'Collapse description';
            // Allow re-animation of chevron by toggling svg-assemble if present
            try {
              const icon = descToggle.querySelector('.svg-icon');
              if (icon) {
                icon.classList.remove('svg-assemble');
                // Force reflow then re-add
                void icon.offsetWidth;
                icon.classList.add('svg-assemble');
              }
            } catch (e) { console.warn('Could not re-animate chevron', e); }
          });
        }
      } catch (e) { console.warn('Could not initialize description toggle', e); }
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
        const url = att.content || att.self || att.url || (`/api/issues/${issue.key}/attachments/${att.id}`);
        console.log('🔍 [Footer] attachment:', att.id || att.filename || att.name, 'url=', url, 'thumbnail=', att.thumbnail || att.thumbnailUrl || null, 'mimeType=', att.mimeType);
        const filename = att.filename || att.name || att.displayName || 'attachment';
        const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(filename) || (att.mimeType && att.mimeType.startsWith('image/'));
        if (isImage) {
          html += `
            <div class="attachment-item">
              <a class="attachment-thumb" href="${url}" target="_blank" rel="noopener noreferrer">
                <img src="${url}" alt="${filename}" style="max-width:120px; max-height:90px; border-radius:6px; display:block;" />
              </a>
              <div style="display:flex; gap:6px; align-items:center; margin-top:6px;">
                <a class="attachment-link" href="${url}" target="_blank" rel="noopener noreferrer" download>${SVGIcons.paperclip({size:14,className:'inline-icon'})} <span>${filename}</span></a>
                <a class="attachment-download-btn" href="${url}" target="_blank" rel="noopener noreferrer" download title="Download" style="text-decoration:none;">${SVGIcons.download({size:14,className:'inline-icon'})}</a>
              </div>
            </div>
          `;
        } else {
          html += `
            <div class="attachment-item">
              <a class="attachment-link" href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:8px; padding:6px 8px; border-radius:6px; background:rgba(0,0,0,0.04); color:inherit; text-decoration:none;">${SVGIcons.paperclip({size:14,className:'inline-icon'})} <span>${filename}</span></a>
              <a class="attachment-download-btn" href="${url}" target="_blank" rel="noopener noreferrer" download title="Download" style="margin-left:6px; text-decoration:none;">${SVGIcons.download({size:14,className:'inline-icon'})}</a>
            </div>
          `;
        }
      });
      listContainer.innerHTML = html;
      // Show preview container when attachments exist
      const preview = document.getElementById('attachmentsPreviewFooter');
      if (preview) preview.classList.add('show');
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
          try { this.addFooterAttachments(files); } catch(err) { console.warn('addFooterAttachments error', err); }
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
          <div class="attachment-item">
            <span class="attachment-name" title="${file.name}">${SVGIcons.file({size:14,className:'inline-icon'})} <span>${file.name}</span></span>
            <button class="attachment-remove" data-index="${idx}">${SVGIcons.close({size:12,className:'inline-icon'})}</button>
          </div>
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
    const description = issue.description || getField('description') || '';
    
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
    
    // TWO-COLUMN LAYOUT WITH ML SUGGESTIONS
    container.innerHTML = `
      ${description ? `
      <!-- Description Section (Full Width) -->
      <div class="ticket-description-section" style="padding: 16px 20px; background: rgba(249, 250, 251, 0.5); border-bottom: 1px solid rgba(59, 130, 246, 0.1);">
        <label class="section-label" style="display: flex; align-items: center; gap: 8px; color: #4a5568; font-weight: 600; font-size: 13px; margin-bottom: 8px;">
          <span style="display:flex; align-items:center; gap:8px;">
            ${SVGIcons.file({size:14,className:'inline-icon'})}
            <span>Descripción</span>
          </span>
          <button id="descriptionToggleBtn" class="ticket-description-toggle" aria-expanded="true" title="Collapse description" style="margin-left:auto;">
            ${SVGIcons.chevronDown({size:14,className:'inline-icon'})}
          </button>
        </label>
        <div id="ticketDescriptionContent" class="ticket-description-content" style="color: #4b5563; line-height: 1.6; font-size: 13px; max-height: 120px; overflow-y: auto; white-space: pre-wrap;">
          ${description}
        </div>
      </div>
      ` : ''}
      
      <div class="purple-divider" style="margin:0"></div>
      
      <!-- TWO COLUMNS LAYOUT -->
      <div class="footer-two-columns" style="display: grid; grid-template-columns: 58% 1px 41%; gap: 20px; padding: 16px 20px; max-height: calc(60vh - 250px); overflow-y: auto; align-items:start; position:relative;">
        
        <!-- LEFT COLUMN: Essential Fields + ML Suggestions (58%) -->
        <div class="left-column" style="display: flex; flex-direction: column; gap: 16px;">
          
          <!-- ML Suggestions Banner -->
          <div class="ml-suggestions-banner" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 10px;">
            <div class="banner-icon" style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1, #818cf8); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
              <i class="fas fa-magic"></i>
            </div>
            <div class="banner-content" style="flex: 1;">
              <h4 style="color: #374151; font-size: 13px; margin: 0; font-weight: 600;">
                Analicé el ticket y tengo sugerencias 
                <span style="font-weight: 400; opacity: 0.7; font-size: 11px;">— Próximamente: ML predictions</span>
              </h4>
            </div>
          </div>
          
          ${longCustomFieldsHTML ? longCustomFieldsHTML : ''}
          
          <!-- Essential Fields Grid (3 columns) -->
          <div class="essential-fields-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            
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
            <button onclick="window.flowingFooter.switchToChatView()" style="flex: 1; padding: 10px 16px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s; box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);">
              <i class="fas fa-comments" style="margin-right: 6px;"></i> Back to Chat
            </button>
          </div>
        </div>

        <div class="columns-divider" aria-hidden="true"></div>

        <!-- RIGHT COLUMN: ML Actions & Comments (42%) -->
        <div class="right-column" style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- ML Actions & Suggested Comments -->
          <div class="ml-actions-section" style="background: rgba(249, 250, 251, 0.5); border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px;">
            <h4 style="font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-lightbulb" style="color: #f59e0b;"></i> ML Actions & Suggested Comments
            </h4>
            <div class="suggested-comments" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
              <div class="suggestion-item" style="padding: 8px 10px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 11px; color: var(--field-text); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;">
                <span style="flex: 1;">Investigating issue, analyzing logs...</span>
                <button style="padding: 4px 8px; background: #f3f4f6; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
              <div class="suggestion-item" style="padding: 8px 10px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 11px; color: var(--field-text); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;">
                <span style="flex: 1;">Escalating to backend team...</span>
                <button style="padding: 4px 8px; background: #f3f4f6; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
            <div class="quick-actions" style="display: flex; gap: 8px;">
              <button style="flex: 1; padding: 8px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 11px; font-weight: 600; color: var(--field-text); cursor: pointer; transition: all 0.2s;">
                <i class="fas fa-clone" style="margin-right: 4px;"></i> Find Duplicates
              </button>
              <button style="flex: 1; padding: 8px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; font-size: 11px; font-weight: 600; color: var(--field-text); cursor: pointer; transition: all 0.2s;">
                <i class="fas fa-clock" style="margin-right: 4px;"></i> Estimate Time
              </button>
            </div>
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
                  <button id="attachFooterBtn" class="comment-toolbar-btn" title="Attach file" style="padding:8px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:8px; cursor:pointer;">${SVGIcons.paperclip({size:14,className:'inline-icon'})}</button>
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
    
    const padding = isCollapsed ? '65px' : '70px';
    
    if (kanbanView) kanbanView.style.paddingBottom = padding;
    if (boardWrapper) boardWrapper.style.paddingBottom = padding;
    if (rightSidebar) rightSidebar.style.paddingBottom = padding;
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
    messageDiv.className = `flowing-message ${role}${isLoading ? ' loading' : ''}`;
    
    const avatar = role === 'user' ? '👤' : 'SF';
    const avatarClass = role === 'user' ? '' : 'copilot-sf-logo';
    
    messageDiv.innerHTML = `
      <div class="message-avatar ${avatarClass}">${avatar}</div>
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
            return cleaned ? `<li>${cleaned}</li>` : '';
          }).join('');
          return `<ul>${listItems}</ul>`;
        }
        return line;
      }).join('</p><p>');
    }

    // Wrap in paragraph if not already wrapped
    if (!formatted.startsWith('<p>') && !formatted.startsWith('<ul>')) {
      formatted = `<p>${formatted}</p>`;
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
    this.input.value = `Tell me about ticket ${issueKey}`;
    this.input.focus();
  }

  suggestActions(issueKey) {
    this.expand();
    this.input.value = `What should I do with ticket ${issueKey}?`;
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
        `• ${s.icon || '💡'} ${s.title}`
      ).join('\n');

      this.addMessage(
        `**${suggestions.title || 'Sugerencias Contextuales'}**\n\n${suggestionsList}\n\n_Click en "✨ Flowing AI" en cualquier sugerencia para ejecutarla._`,
        'assistant'
      );
    } catch (error) {
      console.error('Error showing contextual suggestions:', error);
    }
  }
}

// Exponer FlowingContext globalmente para integración con footer
if (typeof FlowingContext !== 'undefined') {
  window.FlowingContext = FlowingContext;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  window.flowingFooter = new FlowingFooter();
  console.log('✅ Flowing MVP Footer loaded');
});
