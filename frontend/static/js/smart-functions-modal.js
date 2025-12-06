/**
 * Quick Action Button Controller  
 * Manages the quick action modal with tabs for Smart Functions
 */

(function() {
  'use strict';

  let menuOpen = false;
  let currentEmojiIndex = 0;
  const emojis = ['⚡', '🎯', '🤖'];

  function initQuickActionButton() {
    const btn = document.getElementById('quickActionBtn');
    if (!btn) {
      console.error('Quick action button not found');
      return;
    }

    console.log('✅ Quick action button found, initializing...');

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleQuickActionMenu();
    });

    document.addEventListener('metricsUpdated', function() {
      updateButtonBadge();
    });

    // Initial update
    setTimeout(updateButtonBadge, 3000);
    
    // Rotate emoji every 5 minutes
    setInterval(rotateEmoji, 5 * 60 * 1000);
    
    console.log('✅ Quick action button initialized');
  }

  function rotateEmoji() {
    currentEmojiIndex = (currentEmojiIndex + 1) % emojis.length;
    updateButtonIcon();
    console.log(`🔄 Emoji rotated to: ${emojis[currentEmojiIndex]}`);
  }

  function updateButtonIcon() {
    const btn = document.getElementById('quickActionBtn');
    if (!btn) return;

    const icon = btn.querySelector('.toggle-icon');
    if (icon) {
      icon.textContent = emojis[currentEmojiIndex];
    }
  }

  function toggleQuickActionMenu() {
    if (menuOpen) {
      closeQuickActionMenu();
    } else {
      openQuickActionMenu();
    }
  }

  function updateButtonBadge() {
    const metrics = window.smartMetrics || { triageCount: 0, needsResponseCount: 0, mlSuggestionsCount: 0 };
    const totalCount = metrics.triageCount + metrics.needsResponseCount + metrics.mlSuggestionsCount;
    
    const btn = document.getElementById('quickActionBtn');
    if (!btn) return;

    // Update icon
    updateButtonIcon();

    // Update badge
    const existingBadge = btn.querySelector('.quick-action-btn-badge');
    if (existingBadge) existingBadge.remove();

    if (totalCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'quick-action-btn-badge';
      badge.textContent = totalCount;
      btn.appendChild(badge);
    }
  }

  // Helper function to get modal element
  function getSmartModal() {
    return document.getElementById('smartFunctionsModal');
  }

  function openQuickActionMenu() {
    console.log('🎯 Opening Quick Actions modal...');
    
    if (getSmartModal()) {
      console.log('⚠️ Modal already exists, skipping');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'smartFunctionsModal';
    modal.className = 'bg-selector-modal bg-modal-open';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);';
    
    modal.innerHTML = `
      <div class="bg-modal-overlay"></div>
      <div class="bg-modal-content">
        <div class="bg-modal-header">
          <h2 class="bg-modal-title">🧠 Smart Functions</h2>
          <button class="bg-modal-close" onclick="(() => { const modal = document.getElementById('smartFunctionsModal'); if(modal) modal.remove(); console.log('✕ Modal closed'); })();">✕</button>
        </div>
        
        <div class="bg-modal-tabs">
          <button class="bg-modal-tab active" data-tab="triage">⚡ Quick Triage</button>
          <button class="bg-modal-tab" data-tab="filters">🎯 Smart Filters</button>
          <button class="bg-modal-tab" data-tab="ml">🤖 ML Analysis</button>
        </div>
        
        <div class="bg-modal-body">
          <div class="bg-modal-tab-content active" data-tab-content="triage">
            <div id="triageTabContent"></div>
          </div>
          
          <div class="bg-modal-tab-content" data-tab-content="filters">
            <div id="filtersTabContent"></div>
          </div>
          
          <div class="bg-modal-tab-content" data-tab-content="ml">
            <div id="mlTabContent"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    const tabs = modal.querySelectorAll('.bg-modal-tab');
    const tabContents = modal.querySelectorAll('.bg-modal-tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        this.classList.add('active');
        modal.querySelector(`[data-tab-content="${tabName}"]`).classList.add('active');
        
        loadTabContent(tabName);
      });
    });
    
    modal.querySelector('.bg-modal-overlay').addEventListener('click', function() {
      console.log('📍 Overlay clicked, closing modal');
      modal.remove();
      menuOpen = false;
    });
    
    console.log('📊 Loading triage content...');
    loadTabContent('triage');
    
    menuOpen = true;
    console.log('✅ Smart Functions modal opened successfully');
  }
  
  function loadTabContent(tabName) {
    const modal = getSmartModal();
    if (!modal) return;
    
    switch(tabName) {
      case 'triage':
        loadTriageContent();
        break;
      case 'filters':
        loadFiltersContent();
        break;
      case 'ml':
        loadMLContent();
        break;
    }
  }
  
  function loadTriageContent() {
    const container = document.getElementById('triageTabContent');
    if (!container) return;
    
    const allIssues = Array.from(window.app.issuesCache.values());
    const triageIssues = window.quickTriage ? window.quickTriage.filterTriageIssues(allIssues) : [];
    
    if (triageIssues.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
          <div style="font-size: 48px; margin-bottom: 16px;"></div>
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #cbd5e1;">All Clear!</div>
          <div style="font-size: 13px;">No urgent tickets requiring immediate attention</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div style="margin-bottom: 16px; padding: 12px; background: rgba(59,130,246,0.1); border-radius: 8px; border-left: 3px solid #3b82f6;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="font-size: 18px;">⚡</span>
          <span style="color: #cbd5e1; font-weight: 600;">Quick Triage Analysis</span>
        </div>
        <div style="color: #94a3b8; font-size: 13px;">
          Found ${triageIssues.length} ticket${triageIssues.length !== 1 ? 's' : ''} requiring immediate attention
        </div>
      </div>
      
      <div class="triage-tickets-list">
        ${triageIssues.map(issue => {
          const isUnassigned = !issue.assignee || issue.assignee === 'Unassigned';
          const severity = issue.customfield_10125?.value || issue.severity || 'Medium';
          const severityClass = severity.toLowerCase().replace(/\s+/g, '-');
          const isHighPriority = severity === 'Critico' || severity === 'Alto' || severity === 'Mayor';
          const updatedDays = Math.floor((new Date() - new Date(issue.updated || issue.created)) / (1000 * 60 * 60 * 24));
          
          return `
            <div class="triage-ticket-card" data-key="${issue.key}" style="cursor: pointer; border-left: 3px solid ${isHighPriority ? '#ef4444' : isUnassigned ? '#f59e0b' : '#6b7280'};">
              <div class="triage-ticket-header">
                <span class="triage-ticket-key">${issue.key}</span>
                <div style="display: flex; gap: 4px; align-items: center;">
                  <span class="severity-badge severity-${severityClass}">${severity}</span>
                  ${updatedDays > 7 ? `<span style="background: rgba(239,68,68,0.2); color: #fca5a5; padding: 2px 6px; border-radius: 4px; font-size: 11px;">📅 ${updatedDays}d</span>` : ''}
                </div>
              </div>
              <div class="triage-ticket-summary" style="margin: 8px 0;">${issue.summary || 'No summary'}</div>
              <div class="triage-ticket-footer">
                <span class="triage-ticket-assignee">${isUnassigned ? '👤 <span style="color: #f59e0b;">Unassigned</span>' : '👤 ' + issue.assignee}</span>
                <div style="display: flex; gap: 4px; margin-top: 8px;">
                  ${isUnassigned ? '<button class="triage-action-btn" data-action="assign" style="background: #059669;">✋ Assign to me</button>' : ''}
                  <button class="triage-action-btn" data-action="snooze" style="background: #6366f1;">💤 Snooze 1h</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      
      ${triageIssues.length > 0 ? `
        <div style="margin-top: 16px; padding: 12px; background: rgba(34,197,94,0.1); border-radius: 8px; text-align: center;">
          <button class="bg-modal-primary-btn" onclick="window.quickTriage?.open(); document.getElementById('smartFunctionsModal')?.remove();" style="width: 100%;">
            ⚡ Open Full Quick Triage
          </button>
        </div>
      ` : ''}
    `;
    
    // Add click handlers after rendering
    const ticketCards = container.querySelectorAll('.triage-ticket-card');
    ticketCards.forEach(card => {
      const issueKey = card.getAttribute('data-key');
      
      card.addEventListener('click', function(e) {
        // Don't open if clicking on action button
        if (e.target.classList.contains('triage-action-btn')) {
          return;
        }
        
        console.log('🎯 Opening ticket:', issueKey);
        
        // Close the modal
        const modal = getSmartModal();
        if (modal) {
          modal.remove();
        }
        
        // Open the right sidebar with ticket details
        if (window.app && window.app.loadIssueDetails) {
          window.app.loadIssueDetails(issueKey);
        } else {
          console.error('❌ app.loadIssueDetails not available');
        }
      });
      
      // Handle action buttons (assign and snooze)
      const actionBtns = card.querySelectorAll('.triage-action-btn');
      actionBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const action = this.getAttribute('data-action');
          const originalText = this.innerHTML;
          const originalBg = this.style.background;
          
          if (action === 'assign') {
            console.log('👤 Assigning ticket to me:', issueKey);
            
            if (window.quickTriage && window.quickTriage.assignToMe) {
              this.innerHTML = '⏳ Assigning...';
              this.style.background = '#6b7280';
              
              window.quickTriage.assignToMe(issueKey);
              
              // Show success feedback
              setTimeout(() => {
                this.innerHTML = '✅ Assigned';
                this.style.background = '#059669';
                
                // Reload content after short delay
                setTimeout(() => {
                  loadTriageContent();
                }, 1000);
              }, 300);
            } else {
              console.error('❌ quickTriage.assignToMe not available');
              this.innerHTML = '❌ Error';
              this.style.background = '#dc2626';
              setTimeout(() => {
                this.innerHTML = originalText;
                this.style.background = originalBg;
              }, 2000);
            }
          } else if (action === 'snooze') {
            console.log('💤 Snoozing ticket 1 hour:', issueKey);
            
            if (window.quickTriage && window.quickTriage.snoozeTicket) {
              this.innerHTML = '⏳ Snoozing...';
              this.style.background = '#6b7280';
              
              window.quickTriage.snoozeTicket(issueKey, 60); // 1 hour
              
              // Show success feedback
              setTimeout(() => {
                this.innerHTML = '💤 Snoozed';
                this.style.background = '#059669';
                
                // Reload content after short delay
                setTimeout(() => {
                  loadTriageContent();
                }, 1000);
              }, 300);
            } else {
              console.error('❌ quickTriage.snoozeTicket not available');
              this.innerHTML = '❌ Error';
              this.style.background = '#dc2626';
              setTimeout(() => {
                this.innerHTML = originalText;
                this.style.background = originalBg;
              }, 2000);
            }
          }
        });
      });
    });
  }
  
  function loadFiltersContent() {
    const container = document.getElementById('filtersTabContent');
    if (!container) return;
    
    const allIssues = Array.from(window.app?.issuesCache?.values() || []);
    
    // Calculate counts for each filter
    const calculateFilterCounts = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentUser = window.state?.currentUser || '';
      
      return {
        'updated-today': allIssues.filter(issue => {
          const updated = new Date(issue.last_real_change || issue.updated || issue.created);
          return updated >= today;
        }).length,
        'high-priority-unassigned': allIssues.filter(issue => {
          const isUnassigned = !issue.assignee || issue.assignee === 'Unassigned';
          const isHighPriority = issue.severity === 'Critico' || issue.severity === 'Alto' || issue.severity === 'Mayor';
          return isUnassigned && isHighPriority;
        }).length,
        'stale': allIssues.filter(issue => {
          const updated = new Date(issue.updated || issue.created);
          const diffDays = (now - updated) / (1000 * 60 * 60 * 24);
          return diffDays > 7;
        }).length,
        'my-assigned': allIssues.filter(issue => {
          return issue.assignee && issue.assignee.toLowerCase().includes(currentUser.toLowerCase());
        }).length,
        'all-critical': allIssues.filter(issue => issue.severity === 'Critico').length,
        'created-today': allIssues.filter(issue => {
          const created = new Date(issue.created);
          return created >= today;
        }).length,
        'needs-response': allIssues.filter(issue => {
          const updated = new Date(issue.last_real_change || issue.updated || issue.created);
          const hoursSinceUpdate = (now - updated) / (1000 * 60 * 60);
          const isAssignedToMe = issue.assignee && issue.assignee.toLowerCase().includes(currentUser.toLowerCase());
          return hoursSinceUpdate <= 24 && isAssignedToMe;
        }).length
      };
    };
    
    const counts = calculateFilterCounts();
    
    const filters = [
      { id: 'updated-today', icon: '📅', name: 'Updated Today', description: 'Modified in last 24 hours', count: counts['updated-today'] },
      { id: 'high-priority-unassigned', icon: '🔴', name: 'High Priority Unassigned', description: 'Critical & high without assignee', count: counts['high-priority-unassigned'] },
      { id: 'stale', icon: '⏰', name: 'Stale Tickets', description: 'No updates for 7+ days', count: counts['stale'] },
      { id: 'my-assigned', icon: '👤', name: 'My Assigned', description: 'Tickets assigned to me', count: counts['my-assigned'] },
      { id: 'all-critical', icon: '🚨', name: 'All Critical', description: 'All critical severity tickets', count: counts['all-critical'] },
      { id: 'created-today', icon: '🆕', name: 'Created Today', description: 'New from last 24 hours', count: counts['created-today'] }
    ];
    
    container.innerHTML = `
      <div style="margin-bottom: 16px; padding: 12px; background: rgba(34,197,94,0.1); border-radius: 8px; border-left: 3px solid #22c55e;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="font-size: 18px;">🎯</span>
          <span style="color: #cbd5e1; font-weight: 600;">Smart Filters</span>
        </div>
        <div style="color: #94a3b8; font-size: 13px;">
          Quick access to common filter presets with live counts
        </div>
      </div>
      
      <div class="filters-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
        ${filters.map(filter => {
          const hasResults = filter.count > 0;
          return `
            <div class="filter-preset-card" 
                 style="padding: 12px; background: ${hasResults ? 'rgba(59,130,246,0.1)' : 'rgba(75,85,99,0.2)'}; 
                        border: 1px solid ${hasResults ? '#3b82f6' : '#4b5563'}; border-radius: 8px; cursor: pointer; 
                        transition: all 0.2s ease;"
                 onclick="applySmartFilter('${filter.id}');">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 16px;">${filter.icon}</span>
                  <span style="color: #cbd5e1; font-weight: 600; font-size: 14px;">${filter.name}</span>
                </div>
                <span style="background: ${hasResults ? '#3b82f6' : '#6b7280'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                  ${filter.count}
                </span>
              </div>
              <div style="color: #94a3b8; font-size: 12px; line-height: 1.4;">
                ${filter.description}
              </div>
              ${hasResults ? `<div style="margin-top: 8px; color: #22c55e; font-size: 11px; font-weight: 600;">✅ Ready to apply</div>` : `<div style="margin-top: 8px; color: #6b7280; font-size: 11px;">No matches found</div>`}
            </div>
          `;
        }).join('')}
      </div>
      
      ${window.smartFilters?.activeFilter ? `
        <div style="margin-top: 16px; padding: 12px; background: rgba(99,102,241,0.1); border-radius: 8px; border-left: 3px solid #6366f1;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #cbd5e1; font-size: 13px;">🎯 Active Filter: ${window.smartFilters.activeFilter}</span>
            <button class="triage-action-btn" onclick="clearSmartFilter();" style="background: #dc2626;">Clear Filter</button>
          </div>
        </div>
      ` : ''}
    `;
    
    // Add the functions needed for the onclick handlers
    window.applySmartFilter = function(filterId) {
      console.log('🎯 Applying smart filter:', filterId);
      
      if (window.smartFilters && window.smartFilters.applyFilter) {
        window.smartFilters.applyFilter(filterId);
        
        // Close modal
        const modal = document.getElementById('smartFunctionsModal');
        if (modal) {
          modal.remove();
        }
        
        console.log('✅ Smart filter applied:', filterId);
      } else {
        console.error('❌ smartFilters not available');
        alert('Smart Filters not available');
      }
    };
    
    window.clearSmartFilter = function() {
      console.log('🎯 Clearing smart filter');
      
      if (window.smartFilters && window.smartFilters.clearFilter) {
        window.smartFilters.clearFilter();
        
        // Close modal
        const modal = document.getElementById('smartFunctionsModal');
        if (modal) {
          modal.remove();
        }
        
        console.log('✅ Filter cleared');
      } else {
        console.error('❌ smartFilters not available');
      }
    };
  }
  
  function loadMLContent() {
    const container = document.getElementById('mlTabContent');
    if (!container) return;
    
    const allIssues = Array.from(window.app.issuesCache.values());
    let missingFields = [];
    const fieldStats = {}; // Track which fields are missing most
    
    allIssues.forEach(issue => {
      const missing = [];
      
      // 🔴 Critical Fields
      if (!issue.customfield_10125 && !issue.severity) {
        missing.push('🔴 Severity');
        fieldStats['Severity'] = (fieldStats['Severity'] || 0) + 1;
      }
      if (!issue.priority || !issue.priority.name) {
        missing.push('🔴 Priority');
        fieldStats['Priority'] = (fieldStats['Priority'] || 0) + 1;
      }
      if (!issue.description || issue.description.trim().length < 20) {
        missing.push('🔴 Description');
        fieldStats['Description'] = (fieldStats['Description'] || 0) + 1;
      }
      
      // 👤 Assignment Fields
      if (!issue.assignee || !issue.assignee.displayName) {
        missing.push('👤 Assignee');
        fieldStats['Assignee'] = (fieldStats['Assignee'] || 0) + 1;
      }
      if (!issue.reporter || !issue.reporter.displayName) {
        missing.push('👤 Reporter');
        fieldStats['Reporter'] = (fieldStats['Reporter'] || 0) + 1;
      }
      
      // 🏷️ Classification
      if (!issue.labels || issue.labels.length === 0) {
        missing.push('🏷️ Labels');
        fieldStats['Labels'] = (fieldStats['Labels'] || 0) + 1;
      }
      if (!issue.components || issue.components.length === 0) {
        missing.push('🏷️ Components');
        fieldStats['Components'] = (fieldStats['Components'] || 0) + 1;
      }
      
      // ⏱️ Time Tracking
      if (!issue.duedate) {
        missing.push('⏱️ Due Date');
        fieldStats['Due Date'] = (fieldStats['Due Date'] || 0) + 1;
      }
      if (!issue.timeoriginalestimate && !issue.originalEstimate) {
        missing.push('⏱️ Estimate');
        fieldStats['Estimate'] = (fieldStats['Estimate'] || 0) + 1;
      }
      
      // 📦 Versions
      if (!issue.fixVersions || issue.fixVersions.length === 0) {
        missing.push('📦 Fix Version');
        fieldStats['Fix Version'] = (fieldStats['Fix Version'] || 0) + 1;
      }
      if (!issue.versions || issue.versions.length === 0) {
        missing.push('📦 Affected Ver.');
        fieldStats['Affected Version'] = (fieldStats['Affected Version'] || 0) + 1;
      }
      
      // 🌍 Context
      if (!issue.environment || issue.environment.trim().length < 5) {
        missing.push('🌍 Environment');
        fieldStats['Environment'] = (fieldStats['Environment'] || 0) + 1;
      }
      
      if (missing.length > 0) {
        missingFields.push({ issue, missing });
      }
    });
    
    // Calculate top missing fields
    const topMissingFields = Object.entries(fieldStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const completionRate = ((allIssues.length - missingFields.length) / allIssues.length * 100).toFixed(1);
    
    container.innerHTML = `
      <div style="margin-bottom: 16px; padding: 16px; background: linear-gradient(135deg, rgba(168,85,247,0.1), rgba(139,92,246,0.1)); border-radius: 12px; border-left: 4px solid #a855f7;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">🤖</span>
            <span style="color: #cbd5e1; font-weight: 700; font-size: 15px;">ML Field Analysis</span>
          </div>
          <div style="background: ${completionRate >= 80 ? 'rgba(16,185,129,0.2)' : completionRate >= 50 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 700; color: ${completionRate >= 80 ? '#10b981' : completionRate >= 50 ? '#f59e0b' : '#ef4444'};">
            ${completionRate}% Complete
          </div>
        </div>
        
        <div style="color: #94a3b8; font-size: 13px; margin-bottom: 12px;">
          Found ${missingFields.length} ticket${missingFields.length !== 1 ? 's' : ''} with incomplete fields for AI enhancement
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
          <div style="background: rgba(16,185,129,0.1); padding: 8px; border-radius: 8px; text-align: center;">
            <div style="font-size: 18px; font-weight: 700; color: #10b981;">${allIssues.length}</div>
            <div style="font-size: 11px; color: #64748b;">Total Tickets</div>
          </div>
          <div style="background: rgba(245,158,11,0.1); padding: 8px; border-radius: 8px; text-align: center;">
            <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">${missingFields.length}</div>
            <div style="font-size: 11px; color: #64748b;">Need Improvement</div>
          </div>
          <div style="background: rgba(99,102,241,0.1); padding: 8px; border-radius: 8px; text-align: center;">
            <div style="font-size: 18px; font-weight: 700; color: #6366f1;">${allIssues.length - missingFields.length}</div>
            <div style="font-size: 11px; color: #64748b;">Complete</div>
          </div>
        </div>
        
        ${topMissingFields.length > 0 ? `
          <div style="background: rgba(0,0,0,0.1); padding: 10px; border-radius: 8px;">
            <div style="font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 6px;">🎯 Top Missing Fields:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${topMissingFields.map(([field, count]) => `
                <span style="background: rgba(168,85,247,0.2); color: #e9d5ff; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">
                  ${field}: ${count}
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      
      ${missingFields.length > 0 ? `
        <div class="ml-suggestions-list">
          ${missingFields.slice(0, 10).map(({issue, missing}) => `
            <div class="ml-suggestion-card" data-key="${issue.key}" style="cursor: pointer;">
              <div class="triage-ticket-header">
                <span class="triage-ticket-key">${issue.key}</span>
                <span class="ml-missing-count">${missing.length} missing</span>
              </div>
              <div class="triage-ticket-summary">${issue.summary || 'No summary'}</div>
              <div class="ml-missing-fields">
                Missing: ${missing.join(', ')}
              </div>
            </div>
          `).join('')}
        </div>
        <button class="bg-modal-primary-btn" id="runMLAnalysisBtn" style="width: 100%; margin-top: 16px;">
          🤖 Run Full ML Analysis
        </button>
      ` : `
        <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
          <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #cbd5e1;">Great Job!</div>
          <div style="font-size: 13px;">All tickets have complete field data</div>
        </div>
      `}
    `;
    
    // Add click handlers for ML suggestion cards
    if (missingFields.length > 0) {
      const mlCards = container.querySelectorAll('.ml-suggestion-card');
      mlCards.forEach(card => {
        const issueKey = card.getAttribute('data-key');
        
        card.addEventListener('click', function() {
          console.log('🤖 Opening ticket with missing fields:', issueKey);
          
          // Close the modal
          const modal = getSmartModal();
          if (modal) {
            modal.remove();
          }
          
          // Open the right sidebar with ticket details
          if (window.app && window.app.loadIssueDetails) {
            window.app.loadIssueDetails(issueKey);
          }
        });
      });
      
      // Handle ML Analysis button
      const mlAnalysisBtn = container.querySelector('#runMLAnalysisBtn');
      if (mlAnalysisBtn) {
        mlAnalysisBtn.addEventListener('click', async function() {
          console.log('🤖 Running full ML analysis...');
          
          // Validate state
          if (!window.state || !window.state.currentDesk || !window.state.currentQueue) {
            alert('Por favor selecciona un Service Desk y una Cola primero');
            console.error('❌ Missing desk or queue:', { 
              desk: window.state?.currentDesk, 
              queue: window.state?.currentQueue 
            });
            return;
          }
          
          if (!window.state.issues || window.state.issues.length === 0) {
            alert('No hay tickets en la cola actual para analizar');
            console.error('❌ No issues in current queue');
            return;
          }
          
          if (window.aiQueueAnalyzer) {
            try {
              await window.aiQueueAnalyzer.analyze();
              
              // Close modal
              const modal = getSmartModal();
              if (modal) {
                modal.remove();
              }
            } catch (error) {
              console.error('❌ Error running ML analysis:', error);
              alert('Error al ejecutar el análisis ML. Por favor intenta de nuevo.');
            }
          } else {
            console.error('❌ aiQueueAnalyzer not available');
            alert('El analizador ML no está disponible. Recarga la página.');
          }
        });
      }
    }
  }

  function closeQuickActionMenu() {
    const modal = getSmartModal();
    if (modal) {
      modal.remove();
    }
    menuOpen = false;
    updateButtonBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickActionButton);
  } else {
    initQuickActionButton();
  }

  // Listen for ML analysis updates (when fields are modified)
  document.addEventListener('mlAnalysisUpdate', async function(e) {
    console.log('🔄 ML analysis update triggered:', e.detail);
    
    // Si el modal está abierto en la pestaña ML, recalcular
    const modal = getSmartModal();
    if (modal && menuOpen) {
      const container = modal.querySelector('#modalContent');
      const activeTab = modal.querySelector('.bg-modal-tab.active');
      
      if (activeTab && activeTab.dataset.tab === 'ml') {
        console.log('📊 Recalculating ML analysis tab...');
        
        // Mostrar loading
        container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Updating analysis...</p></div>';
        
        // Forzar recarga de issues desde el API
        try {
          if (window.state && window.state.currentDesk && window.state.currentQueue) {
            console.log('🔄 Reloading issues from API...');
            
            const response = await fetch(`/api/servicedesk/${window.state.currentDesk}/queue/${window.state.currentQueue}/issues`);
            if (response.ok) {
              const data = await response.json();
              const issues = data.data || data.issues || data;
              
              // Actualizar window.state.issues
              if (window.state) {
                window.state.issues = issues;
                console.log(`✅ Reloaded ${issues.length} issues`);
              }
            }
          }
        } catch (error) {
          console.error('❌ Error reloading issues:', error);
        }
        
        // Recalcular después de recargar
        setTimeout(() => {
          renderMLAnalysisTab(container);
        }, 300);
      }
    }
  });

  // Exponer objeto global para verificar estado
  window.smartFunctionsModal = {
    get isOpen() { return menuOpen; },
    refresh: function() {
      if (menuOpen) {
        const modal = getSmartModal();
        if (modal) {
          const container = modal.querySelector('#modalContent');
          const activeTab = modal.querySelector('.bg-modal-tab.active');
          if (activeTab) {
            renderMLAnalysisTab(container);
          }
        }
      }
    }
  };

  console.log('✅ Quick action button controller loaded');
})();
