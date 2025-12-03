/**
 * Smart Functions Background Analytics
 * Pre-caches and monitors metrics for Quick Triage, Smart Filters, and ML Analysis
 */

class SmartFunctionsAnalytics {
  constructor() {
    this.metrics = {
      triageCount: 0,
      needsResponseCount: 0,
      mlSuggestionsCount: 0,
      lastUpdate: null
    };
    
    this.updateInterval = null;
    this.isInitialized = false;
    
    this.init();
  }

  init() {
    console.log('📊 Smart Functions Analytics initializing...');
    
    // Wait for app to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  start() {
    // Initial calculation
    setTimeout(() => {
      this.calculateMetrics();
      this.isInitialized = true;
    }, 2000);

    // Update every 30 seconds in background
    this.updateInterval = setInterval(() => {
      this.calculateMetrics();
    }, 30000);

    // Listen for issues loaded/updated events
    document.addEventListener('issuesLoaded', () => {
      console.log('📊 Issues updated, recalculating metrics...');
      this.calculateMetrics();
    });

    console.log('✅ Smart Functions Analytics started');
  }

  /**
   * Calculate all metrics from current issues cache
   */
  calculateMetrics() {
    const allIssues = this.getAllIssues();
    
    if (allIssues.length === 0) {
      console.log('📊 No issues to analyze');
      return;
    }

    // Calculate each metric
    this.metrics.triageCount = this.calculateTriageCount(allIssues);
    this.metrics.needsResponseCount = this.calculateNeedsResponseCount(allIssues);
    this.metrics.mlSuggestionsCount = this.calculateMLSuggestionsCount(allIssues);
    this.metrics.lastUpdate = Date.now();

    console.log('📊 Metrics updated:', this.metrics);

    // Update UI badges
    this.updateBadges();

    // Dispatch event for other components
    document.dispatchEvent(new CustomEvent('metricsUpdated', { 
      detail: this.metrics 
    }));
  }

  /**
   * Get all issues from cache
   */
  getAllIssues() {
    if (window.app?.issuesCache) {
      return Array.from(window.app.issuesCache.values());
    }
    return [];
  }

  /**
   * Calculate Quick Triage count (urgent/unassigned/stale)
   */
  calculateTriageCount(issues) {
    // Get snoozed tickets from Quick Triage
    const snoozedTickets = window.quickTriage?.snoozedTickets || {};
    
    return issues.filter(issue => {
      // Skip snoozed
      if (this.isSnoozed(issue.key, snoozedTickets)) return false;

      const isUnassigned = !issue.assignee || 
                          issue.assignee === 'Unassigned' || 
                          issue.assignee === 'No assignee';
      const isHighPriority = issue.severity === 'Critico' || 
                            issue.severity === 'Alto' || 
                            issue.severity === 'Mayor';
      const isStale = this.isOlderThan(issue.last_real_change || issue.updated, 7);
      
      return isUnassigned || isHighPriority || isStale;
    }).length;
  }

  /**
   * Calculate Needs Response count (recent comments/activity)
   */
  calculateNeedsResponseCount(issues) {
    let count = 0;
    
    issues.forEach(issue => {
      // Check if updated recently (last 24 hours)
      const lastChange = new Date(issue.last_real_change || issue.updated || issue.created);
      const now = new Date();
      const hoursSinceUpdate = (now - lastChange) / (1000 * 60 * 60);
      
      // If updated in last 24h and not assigned to me, might need response
      const currentUser = window.state?.currentUser || 'You';
      const isAssignedToMe = issue.assignee && 
                            issue.assignee.toLowerCase().includes(currentUser.toLowerCase());
      
      if (hoursSinceUpdate <= 24 && isAssignedToMe) {
        count++;
      }
    });
    
    return count;
  }

  /**
   * Calculate ML Suggestions count (missing/improvable fields)
   */
  calculateMLSuggestionsCount(issues) {
    let count = 0;
    
    issues.forEach(issue => {
      let needsImprovement = false;
      
      // Check for missing severity
      if (!issue.severity || issue.severity === 'Normal' || issue.severity === 'Medio') {
        needsImprovement = true;
      }
      
      // Check for missing/poor description
      if (!issue.description || issue.description.length < 50) {
        needsImprovement = true;
      }
      
      // Check for missing labels
      if (!issue.labels || issue.labels.length === 0) {
        needsImprovement = true;
      }
      
      // Check for missing components
      if (!issue.components || issue.components.length === 0) {
        needsImprovement = true;
      }
      
      if (needsImprovement) {
        count++;
      }
    });
    
    return count;
  }

  /**
   * Check if ticket is snoozed
   */
  isSnoozed(issueKey, snoozedTickets) {
    const snoozeData = snoozedTickets[issueKey];
    if (!snoozeData) return false;
    
    const now = Date.now();
    return now <= snoozeData.until;
  }

  /**
   * Check if date is older than specified days
   */
  isOlderThan(dateString, days) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = (now - date) / (1000 * 60 * 60 * 24);
    return diffDays > days;
  }

  /**
   * Update UI badges with current metrics
   */
  updateBadges() {
    // Update will happen when menu opens
    // Store metrics in window for access by quick-action-button.js
    window.smartMetrics = this.metrics;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Force recalculation
   */
  refresh() {
    this.calculateMetrics();
  }

  /**
   * Stop background updates
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('📊 Smart Functions Analytics stopped');
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  window.smartAnalytics = new SmartFunctionsAnalytics();
  console.log('✅ Smart Functions Analytics ready');
});

// Expose globally
window.SmartFunctionsAnalytics = SmartFunctionsAnalytics;
