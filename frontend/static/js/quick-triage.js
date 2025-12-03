/**
 * Quick Triage Module
 * Provides rapid access to urgent/unassigned tickets requiring immediate attention
 */

class QuickTriage {
  constructor() {
    this.modalId = 'quickTriageModal';
    this.snoozedTickets = this.loadSnoozedTickets();
    this.init();
  }

  init() {
    console.log('⚡ Quick Triage module initialized');
  }

  /**
   * Load snoozed tickets from localStorage
   */
  loadSnoozedTickets() {
    try {
      const snoozed = localStorage.getItem('speedyflow_snoozed_tickets');
      return snoozed ? JSON.parse(snoozed) : {};
    } catch (e) {
      console.error('Error loading snoozed tickets:', e);
      return {};
    }
  }

  /**
   * Save snoozed tickets to localStorage
   */
  saveSnoozedTickets() {
    try {
      localStorage.setItem('speedyflow_snoozed_tickets', JSON.stringify(this.snoozedTickets));
    } catch (e) {
      console.error('Error saving snoozed tickets:', e);
    }
  }

  /**
   * Check if a ticket is currently snoozed
   */
  isSnoozed(issueKey) {
    const snoozeData = this.snoozedTickets[issueKey];
    if (!snoozeData) return false;
    
    const now = Date.now();
    if (now > snoozeData.until) {
      // Snooze expired, remove it
      delete this.snoozedTickets[issueKey];
      this.saveSnoozedTickets();
      return false;
    }
    return true;
  }

  /**
   * Snooze a ticket for specified duration (in minutes)
   */
  snoozeTicket(issueKey, minutes) {
    const until = Date.now() + (minutes * 60 * 1000);
    this.snoozedTickets[issueKey] = { until, snoozedAt: Date.now() };
    this.saveSnoozedTickets();
    console.log(`💤 Ticket ${issueKey} snoozed for ${minutes} minutes`);
  }

  /**
   * Filter issues for triage (urgent/unassigned/needs attention)
   */
  filterTriageIssues(allIssues) {
    if (!allIssues || !Array.isArray(allIssues)) return [];

    return allIssues.filter(issue => {
      // Skip snoozed tickets
      if (this.isSnoozed(issue.key)) return false;

      // Filter criteria
      const isUnassigned = !issue.assignee || issue.assignee === 'Unassigned' || issue.assignee === 'No assignee';
      const isHighPriority = issue.severity === 'Critico' || issue.severity === 'Alto' || issue.severity === 'Mayor';
      const isOld = this.isOlderThan(issue.updated || issue.created, 7); // 7+ days old
      
      return isUnassigned || isHighPriority || isOld;
    });
  }

  /**
   * Check if date is older than specified days
   */
  isOlderThan(dateString, days) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > days;
  }

  /**
   * Open the Quick Triage modal
   */
  async open() {
    // Get current issues from window.app cache
    const allIssues = window.app?.issuesCache 
      ? Array.from(window.app.issuesCache.values()) 
      : [];

    if (allIssues.length === 0) {
      this.showEmptyState();
      return;
    }

    const triageIssues = this.filterTriageIssues(allIssues);
    
    if (triageIssues.length === 0) {
      this.showAllClearState();
      return;
    }

    this.showModal(triageIssues);
  }

  /**
   * Show modal with triage issues
   */
  showModal(issues) {
    // Remove existing modal if any
    this.closeModal();

    const modal = document.createElement('div');
    modal.id = this.modalId;
    modal.className = 'quick-triage-modal';
    modal.innerHTML = `
      <div class="quick-triage-overlay" onclick="window.quickTriage.closeModal()"></div>
      <div class="quick-triage-content">
        <div class="quick-triage-header">
          <h2>⚡ Quick Triage</h2>
          <p class="quick-triage-subtitle">${issues.length} ticket${issues.length !== 1 ? 's' : ''} requiring attention</p>
          <button class="quick-triage-close" onclick="window.quickTriage.closeModal()">✕</button>
        </div>
        <div class="quick-triage-body">
          ${this.renderIssueList(issues)}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Animate in
    setTimeout(() => modal.classList.add('active'), 10);
  }

  /**
   * Render list of triage issues
   */
  renderIssueList(issues) {
    // Sort by priority (Critico > Alto > Mayor > rest)
    const priorityOrder = { 'Critico': 1, 'Alto': 2, 'Mayor': 3 };
    const sortedIssues = issues.sort((a, b) => {
      const aPriority = priorityOrder[a.severity] || 999;
      const bPriority = priorityOrder[b.severity] || 999;
      return aPriority - bPriority;
    });

    return sortedIssues.map(issue => {
      const severityClass = this.getSeverityClass(issue.severity);
      const isUnassigned = !issue.assignee || issue.assignee === 'Unassigned' || issue.assignee === 'No assignee';
      const ageTag = this.getAgeTag(issue.updated || issue.created);

      return `
        <div class="triage-issue-card" data-issue-key="${issue.key}">
          <div class="triage-issue-header">
            <span class="triage-issue-key" onclick="openIssueDetails('${issue.key}')">${issue.key}</span>
            <span class="triage-severity ${severityClass}">${issue.severity || 'Normal'}</span>
            ${ageTag ? `<span class="triage-age-tag">${ageTag}</span>` : ''}
          </div>
          <div class="triage-issue-summary" onclick="openIssueDetails('${issue.key}')">${issue.summary || 'No summary'}</div>
          <div class="triage-issue-meta">
            ${isUnassigned ? '<span class="triage-meta-badge unassigned">👤 Unassigned</span>' : `<span class="triage-meta-badge">👤 ${issue.assignee}</span>`}
            ${issue.status ? `<span class="triage-meta-badge">📊 ${issue.status}</span>` : ''}
          </div>
          <div class="triage-issue-actions">
            ${isUnassigned ? `<button class="triage-btn triage-btn-primary" onclick="window.quickTriage.assignToMe('${issue.key}')">
              👤 Assign to me
            </button>` : ''}
            <button class="triage-btn triage-btn-secondary" onclick="window.quickTriage.snoozeTicket('${issue.key}', 60); window.quickTriage.open();">
              💤 Snooze 1h
            </button>
            <button class="triage-btn triage-btn-secondary" onclick="window.quickTriage.snoozeTicket('${issue.key}', 1440); window.quickTriage.open();">
              🌙 Snooze 24h
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Get severity CSS class
   */
  getSeverityClass(severity) {
    const severityMap = {
      'Critico': 'severity-critical',
      'Alto': 'severity-high',
      'Mayor': 'severity-major',
      'Medio': 'severity-medium',
      'Baja': 'severity-low'
    };
    return severityMap[severity] || 'severity-normal';
  }

  /**
   * Get age tag for old tickets
   */
  getAgeTag(dateString) {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) return '🔴 30+ days';
    if (diffDays > 14) return '🟠 14+ days';
    if (diffDays > 7) return '🟡 7+ days';
    return null;
  }

  /**
   * Assign ticket to current user
   */
  async assignToMe(issueKey) {
    try {
      const currentUser = window.state?.currentUser || 'You';
      console.log(`Assigning ${issueKey} to ${currentUser}...`);

      const response = await fetch(`/api/issues/${issueKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee: currentUser })
      });

      if (response.ok) {
        console.log(`✅ Assigned ${issueKey} to ${currentUser}`);
        // Refresh the modal
        this.open();
        // Trigger issues reload
        if (window.loadIssues) window.loadIssues();
      } else {
        throw new Error(`Failed to assign: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error assigning ${issueKey}:`, error);
      alert(`Failed to assign ticket: ${error.message}`);
    }
  }

  /**
   * Show empty state (no issues in cache)
   */
  showEmptyState() {
    const modal = document.createElement('div');
    modal.id = this.modalId;
    modal.className = 'quick-triage-modal';
    modal.innerHTML = `
      <div class="quick-triage-overlay" onclick="window.quickTriage.closeModal()"></div>
      <div class="quick-triage-content quick-triage-empty">
        <button class="quick-triage-close" onclick="window.quickTriage.closeModal()">✕</button>
        <div class="quick-triage-empty-state">
          <div class="empty-icon">📭</div>
          <h2>No Issues Loaded</h2>
          <p>Load a queue first to see tickets requiring triage</p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
  }

  /**
   * Show all clear state (no urgent issues)
   */
  showAllClearState() {
    const modal = document.createElement('div');
    modal.id = this.modalId;
    modal.className = 'quick-triage-modal';
    modal.innerHTML = `
      <div class="quick-triage-overlay" onclick="window.quickTriage.closeModal()"></div>
      <div class="quick-triage-content quick-triage-empty">
        <button class="quick-triage-close" onclick="window.quickTriage.closeModal()">✕</button>
        <div class="quick-triage-empty-state">
          <div class="empty-icon">✅</div>
          <h2>All Clear!</h2>
          <p>No urgent or unassigned tickets right now</p>
          <p class="empty-subtitle">Great work! 🎉</p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
  }

  /**
   * Close the modal
   */
  closeModal() {
    const modal = document.getElementById(this.modalId);
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  window.quickTriage = new QuickTriage();
  console.log('✅ Quick Triage ready');
});
