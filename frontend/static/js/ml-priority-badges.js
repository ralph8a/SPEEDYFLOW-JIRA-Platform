/**
 * ML Priority Badge System
 * ========================
 * 
 * Displays ML-powered priority badges on tickets in both kanban and list views.
 * Shows urgency score, breach risk, and recommended actions.
 */

// Cache for ML predictions
const mlPredictionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch ML priority prediction for a ticket
 */
async function fetchMLPriority(issueKey) {
  // Check cache first
  const cached = mlPredictionCache.get(issueKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }
  
  try {
    const response = await fetch(`/api/ml/priority/${issueKey}`);
    
    if (!response.ok) {
      console.warn(`⚠️ ML prediction unavailable for ${issueKey}`);
      return null;
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Cache the result
      mlPredictionCache.set(issueKey, {
        data: result.data,
        timestamp: Date.now()
      });
      
      return result.data;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ ML prediction error for ${issueKey}:`, error);
    return null;
  }
}

/**
 * Create ML priority badge HTML
 */
function createMLPriorityBadge(prediction) {
  if (!prediction) return '';
  
  const {
    urgency_score,
    priority_level,
    badge,
    breach_risk,
    recommended_action,
    reasoning,
    confidence
  } = prediction;
  
  // Determine badge color based on priority level
  const badgeClass = `ml-priority-badge ml-priority-${priority_level}`;
  
  // Build tooltip content
  const tooltip = `
    <strong>🤖 ML Priority Analysis</strong><br>
    Urgency Score: ${urgency_score}/100<br>
    Breach Risk: ${breach_risk}%<br>
    Action: ${recommended_action}<br>
    Reasoning: ${reasoning}<br>
    Confidence: ${(confidence * 100).toFixed(0)}%
  `.trim();
  
  return `
    <div class="${badgeClass}" 
         data-urgency="${urgency_score}"
         data-breach-risk="${breach_risk}"
         title="${tooltip}">
      <span class="ml-badge-icon">${badge}</span>
      <div class="ml-badge-content">
        <div class="ml-urgency-score">${Math.round(urgency_score)}</div>
        <div class="ml-urgency-label">Urgency</div>
      </div>
      ${breach_risk > 70 ? `
        <div class="ml-breach-indicator" title="High breach risk: ${breach_risk}%">
          ⚠️
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Add ML priority badge to a kanban card
 */
async function addMLBadgeToKanbanCard(issueKey) {
  const card = document.querySelector(`[data-issue-key="${issueKey}"]`);
  if (!card) return;
  
  // Check if already has ML badge
  if (card.querySelector('.ml-priority-badge')) return;
  
  const prediction = await fetchMLPriority(issueKey);
  if (!prediction) return;
  
  const badgeHTML = createMLPriorityBadge(prediction);
  
  // Find badge container (after issue key)
  const issueKeyElement = card.querySelector('.issue-key');
  if (issueKeyElement) {
    const container = document.createElement('div');
    container.className = 'ml-badge-container-kanban';
    container.innerHTML = badgeHTML;
    
    // Insert after issue key
    issueKeyElement.parentNode.insertBefore(container, issueKeyElement.nextSibling);
  }
}

/**
 * Add ML priority badge to a list view row
 */
async function addMLBadgeToListRow(issueKey) {
  const row = document.querySelector(`tr[data-issue-key="${issueKey}"]`);
  if (!row) return;
  
  // Check if already has ML badge
  if (row.querySelector('.ml-priority-badge')) return;
  
  const prediction = await fetchMLPriority(issueKey);
  if (!prediction) return;
  
  const badgeHTML = createMLPriorityBadge(prediction);
  
  // Find the key column
  const keyCell = row.querySelector('.col-key');
  if (keyCell) {
    const container = document.createElement('div');
    container.className = 'ml-badge-container-list';
    container.innerHTML = badgeHTML;
    
    keyCell.appendChild(container);
  }
}

/**
 * Batch load ML priorities for visible tickets
 */
async function loadMLPrioritiesForVisibleTickets(issueKeys) {
  if (!issueKeys || issueKeys.length === 0) return;
  
  console.log(`🤖 Loading ML priorities for ${issueKeys.length} tickets...`);
  
  try {
    const response = await fetch('/api/ml/batch-priority', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        issue_keys: issueKeys
      })
    });
    
    if (!response.ok) {
      console.warn('⚠️ ML batch prediction unavailable');
      return;
    }
    
    const result = await response.json();
    
    if (result.success) {
      const predictions = result.data;
      const stats = result.stats;
      
      console.log(`✅ ML predictions loaded: ${stats.total} tickets (${stats.critical} critical, ${stats.high} high)`);
      
      // Cache all predictions
      Object.entries(predictions).forEach(([key, pred]) => {
        mlPredictionCache.set(key, {
          data: pred,
          timestamp: Date.now()
        });
      });
      
      // Apply badges to current view
      const currentView = window.state?.currentView || 'kanban';
      
      if (currentView === 'kanban') {
        Object.keys(predictions).forEach(key => {
          addMLBadgeToKanbanCard(key);
        });
      } else {
        Object.keys(predictions).forEach(key => {
          addMLBadgeToListRow(key);
        });
      }
    }
  } catch (error) {
    console.error('❌ ML batch prediction error:', error);
  }
}

/**
 * Check ML model status
 */
async function checkMLModelStatus() {
  try {
    const response = await fetch('/api/ml/model-status');
    const result = await response.json();
    
    if (result.success) {
      const status = result.data;
      
      if (!status.sklearn_available) {
        console.warn('⚠️ ML features disabled: scikit-learn not installed');
        return false;
      }
      
      if (!status.is_trained) {
        console.warn('⚠️ ML models not trained yet. Using heuristic fallback.');
        return false;
      }
      
      console.log(`✅ ML models ready (v${status.model_version}, trained with ${status.num_tickets} tickets)`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ ML status check error:', error);
    return false;
  }
}

/**
 * Sort tickets by ML priority
 */
function sortTicketsByMLPriority(tickets) {
  return tickets.sort((a, b) => {
    const predA = mlPredictionCache.get(a.key)?.data;
    const predB = mlPredictionCache.get(b.key)?.data;
    
    if (!predA && !predB) return 0;
    if (!predA) return 1;
    if (!predB) return -1;
    
    // Sort by urgency score descending
    return predB.urgency_score - predA.urgency_score;
  });
}

/**
 * Initialize ML priority system
 */
async function initMLPrioritySystem() {
  console.log('🤖 Initializing ML Priority System...');
  
  const isReady = await checkMLModelStatus();
  
  if (!isReady) {
    console.log('⏭️ ML Priority System: Using fallback mode');
  }
  
  // Add ML badges toggle to header
  addMLToggleToHeader();
  
  // Listen for view changes to apply badges
  document.addEventListener('viewChanged', (e) => {
    const currentView = e.detail?.view;
    const issues = window.state?.issues || [];
    
    if (issues.length > 0) {
      const issueKeys = issues.map(i => i.key).filter(Boolean);
      loadMLPrioritiesForVisibleTickets(issueKeys);
    }
  });
  
  console.log('✅ ML Priority System initialized');
}

/**
 * Add ML toggle button to header
 */
function addMLToggleToHeader() {
  const filterBar = document.querySelector('.filter-bar-enhanced') || document.querySelector('.filter-bar');
  
  if (!filterBar) return;
  
  const toggle = document.createElement('div');
  toggle.className = 'ml-priority-toggle';
  toggle.innerHTML = `
    <label class="ml-toggle-label">
      <input type="checkbox" id="mlPriorityToggle" checked />
      <span class="ml-toggle-text">🤖 ML Priority</span>
    </label>
  `;
  
  filterBar.appendChild(toggle);
  
  // Handle toggle
  const checkbox = toggle.querySelector('#mlPriorityToggle');
  checkbox.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    
    document.querySelectorAll('.ml-priority-badge').forEach(badge => {
      badge.style.display = enabled ? 'flex' : 'none';
    });
    
    localStorage.setItem('mlPriorityEnabled', enabled);
  });
  
  // Restore saved preference
  const saved = localStorage.getItem('mlPriorityEnabled');
  if (saved === 'false') {
    checkbox.checked = false;
    document.querySelectorAll('.ml-priority-badge').forEach(badge => {
      badge.style.display = 'none';
    });
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMLPrioritySystem);
} else {
  initMLPrioritySystem();
}

// Export functions for global use
window.MLPriority = {
  fetch: fetchMLPriority,
  loadBatch: loadMLPrioritiesForVisibleTickets,
  sortByPriority: sortTicketsByMLPriority,
  checkStatus: checkMLModelStatus
};
