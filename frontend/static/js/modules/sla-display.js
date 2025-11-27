/**
 * SLA Display Module
 * Fetches and displays real SLA metrics for ticket from JIRA Service Desk API
 * Fallback: Area-based SLA mapping from customfield_10002 (Organization)
 * Shows: Goal time, elapsed time, remaining time, breach status, area information
 */

class SLADisplay {
    constructor() {
        this.currentIssueKey = null;
        this.slaCache = {};
    }

    /**
     * Fetch SLA for issue from /api/ticket-sla/<key> endpoint
     * Falls back to default SLA if no real SLA exists
     * Pure visual display - no JIRA modifications
     */
    async fetchSLA(issueKey) {
        try {
            // Return cached if available
            if (this.slaCache[issueKey]) {
                console.log(`[SLA] Cache hit for ${issueKey}`);
                return this.slaCache[issueKey];
            }

            // Fetch from our new unified endpoint
            const response = await fetch(`/api/ticket-sla/${issueKey}`);
            
            if (!response.ok) {
                console.warn(`[SLA] HTTP error for ${issueKey}:`, response.status, response.statusText);
                return null;
            }

            const data = await response.json();

            if (!data.success || !data.sla) {
                console.warn(`[SLA] Could not fetch SLA for ${issueKey}:`, data.message || data.error);
                return null;
            }

            // Normalize the response to include source
            const slaWithSource = {
                ...data.sla,
                source: data.source || 'unknown'
            };

            // Cache result
            this.slaCache[issueKey] = slaWithSource;
            console.log(`[SLA] Fetched for ${issueKey} (source: ${data.source}):`, slaWithSource);
            
            return slaWithSource;

        } catch (error) {
            console.error(`[SLA] Error fetching SLA for ${issueKey}:`, error);
            return null;
        }
    }

    /**
     * Determine breach status color
     */
    getBreachStatusClass(breached) {
        return breached ? 'sla-breached' : 'sla-on-track';
    }

    /**
     * Render SLA section
     */
    renderSLASection(slaData) {
        if (!slaData) {
            return `<div class="sla-section empty">
                <p class="sla-message">No SLA data available for this ticket</p>
            </div>`;
        }

        // Get source from data
        const source = slaData.source || 'unknown';
        
        // If we have cycles data (pre-calculated or default), render it simply
        if (slaData.cycles && Array.isArray(slaData.cycles) && slaData.cycles.length > 0) {
            return this.renderSimpleSLA(slaData, source);
        }

        // Fallback
        return `<div class="sla-section empty">
            <p class="sla-message">SLA type not recognized: ${source}</p>
        </div>`;
    }

    /**
     * Render simple SLA (from pre-calculated cache or default)
     */
    renderSimpleSLA(slaData, source) {
        const cycle = slaData.cycles[0] || {};
        const breached = cycle.breached || false;
        const statusDisplay = breached 
            ? { icon: '[BREACHED]', text: 'BREACHED', class: 'sla-breached' }
            : { icon: '[OK]', text: 'On Track', class: 'sla-on-track' };

        const isDefault = slaData.is_default || source === 'default_sla_by_priority';
        const sourceBadge = isDefault 
            ? '<span class="sla-source-badge default">Default SLA</span>'
            : '<span class="sla-source-badge">Pre-Calculated SLA</span>';

        return `<div class="sla-section simple-sla">
            <div class="sla-header">
                <h4 class="sla-title">${slaData.sla_name || 'SLA'}</h4>
                <span class="sla-breach-badge ${statusDisplay.class}">${statusDisplay.icon} ${statusDisplay.text}</span>
            </div>
            <div class="sla-badge-row">
                ${sourceBadge}
            </div>
            <div class="sla-details">
                <div class="sla-row">
                    <span class="sla-label">Goal Duration:</span>
                    <span class="sla-value">${cycle.goal_duration || slaData.goal_duration || 'N/A'}</span>
                </div>
                <div class="sla-row">
                    <span class="sla-label">Elapsed:</span>
                    <span class="sla-value">${cycle.elapsed_time || '00:00:00'}</span>
                </div>
                <div class="sla-row">
                    <span class="sla-label">Remaining:</span>
                    <span class="sla-value ${breached ? 'text-danger' : ''}">${cycle.remaining_time || 'N/A'}</span>
                </div>
            </div>
        </div>`;
    }

    /**
     * Initialize SLA display for issue
     */
    async initialize(issueKey) {
        this.currentIssueKey = issueKey;
        
        // Find or create SLA container in sidebar
        let slaContainer = document.querySelector('.sla-container');
        if (!slaContainer) {
            console.log("[SLA] Container not found in sidebar");
            return;
        }

        // Show loading state
        slaContainer.innerHTML = '<div class="sla-section loading"><p>Loading SLA...</p></div>';

        // Fetch SLA data
        const slaData = await this.fetchSLA(issueKey);

        // Render SLA
        slaContainer.innerHTML = this.renderSLASection(slaData);
    }

    /**
     * Clear cached SLA data
     */
    clearCache() {
        this.slaCache = {};
        console.log("[SLA] Cache cleared");
    }
}

// Create global instance
window.slaDisplay = new SLADisplay();
