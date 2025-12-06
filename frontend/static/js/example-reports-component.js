/**
 * Example: Reports Component Using ML Cache Indicator
 * 
 * This example shows how any component can use the cached tickets
 * without making expensive API calls.
 */

class ReportsComponent {
    constructor() {
        this.tickets = [];
        this.init();
    }

    async init() {
        console.log('📊 Reports: Initializing...');
        
        // Check if cache is ready
        if (this.isCacheReady()) {
            console.log('⚡ Reports: Using cached tickets (instant)');
            this.loadFromCache();
        } else {
            console.log('⏳ Reports: Waiting for cache...');
            
            // Wait for cache ready event
            window.addEventListener('ml-dashboard-ready', () => {
                console.log('✅ Reports: Cache ready, loading data');
                this.loadFromCache();
            });
            
            // Fallback: If no preload after 10s, use API
            setTimeout(() => {
                if (!this.isCacheReady()) {
                    console.log('⚠️ Reports: No cache after 10s, using API');
                    this.loadFromAPI();
                }
            }, 10000);
        }
    }

    /**
     * Check if cache is ready
     */
    isCacheReady() {
        return window.ML_CACHE_INDICATOR && window.ML_CACHE_INDICATOR.has_cache;
    }

    /**
     * Load tickets from cache (instant)
     */
    loadFromCache() {
        try {
            this.tickets = window.ML_CACHE_INDICATOR.getTickets();
            
            console.log(`✅ Reports: Loaded ${this.tickets.length} tickets from cache`);
            console.log(`📍 Source: ${window.ML_CACHE_INDICATOR.queue_name}`);
            console.log(`⏰ Cached at: ${new Date(window.ML_CACHE_INDICATOR.cached_at).toLocaleString()}`);
            
            // Build reports
            this.buildReports();
        } catch (error) {
            console.error('❌ Reports: Error loading from cache:', error);
            this.loadFromAPI();
        }
    }

    /**
     * Fallback: Load from API (slower)
     */
    async loadFromAPI() {
        try {
            console.log('📡 Reports: Fetching from API...');
            
            const response = await fetch('/api/tickets/all');
            const result = await response.json();
            
            if (result.success) {
                this.tickets = result.tickets;
                console.log(`✅ Reports: Loaded ${this.tickets.length} tickets from API`);
                this.buildReports();
            }
        } catch (error) {
            console.error('❌ Reports: Error loading from API:', error);
        }
    }

    /**
     * Build all reports
     */
    buildReports() {
        // Example reports
        const summary = this.buildSummaryReport();
        const priority = this.buildPriorityReport();
        const sla = this.buildSlaReport();
        
        // Render
        this.renderReports({ summary, priority, sla });
        
        console.log('📊 Reports built successfully');
    }

    /**
     * Summary Report
     */
    buildSummaryReport() {
        const total = this.tickets.length;
        const open = this.tickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
        const closed = total - open;
        
        const unassigned = this.tickets.filter(t => 
            !t.assignee || t.assignee === 'Unassigned'
        ).length;
        
        return {
            total,
            open,
            closed,
            unassigned,
            source: this.isCacheReady() 
                ? `${window.ML_CACHE_INDICATOR.queue_name} (cached)`
                : 'API (live)'
        };
    }

    /**
     * Priority Distribution Report
     */
    buildPriorityReport() {
        const priorities = {};
        
        this.tickets.forEach(ticket => {
            const priority = ticket.priority || 'Unknown';
            priorities[priority] = (priorities[priority] || 0) + 1;
        });
        
        return priorities;
    }

    /**
     * SLA Report
     */
    buildSlaReport() {
        // Use cached metrics if available
        if (this.isCacheReady()) {
            const metrics = window.ML_CACHE_INDICATOR.getMetrics();
            return {
                breached: metrics.sla_breached || 0,
                at_risk: metrics.sla_at_risk || 0,
                on_track: metrics.sla_on_track || 0,
                source: 'cached'
            };
        }
        
        // Calculate manually
        const breached = this.tickets.filter(t => t.sla_breached).length;
        const at_risk = this.tickets.filter(t => t.sla_at_risk).length;
        const on_track = this.tickets.length - breached - at_risk;
        
        return { breached, at_risk, on_track, source: 'calculated' };
    }

    /**
     * Render reports in UI
     */
    renderReports({ summary, priority, sla }) {
        console.log('📊 Summary Report:', summary);
        console.log('🎯 Priority Report:', priority);
        console.log('⏱️ SLA Report:', sla);
        
        // Example: Update DOM
        document.getElementById('total-tickets')?.textContent = summary.total;
        document.getElementById('open-tickets')?.textContent = summary.open;
        document.getElementById('closed-tickets')?.textContent = summary.closed;
        document.getElementById('unassigned-tickets')?.textContent = summary.unassigned;
        
        document.getElementById('sla-breached')?.textContent = sla.breached;
        document.getElementById('sla-at-risk')?.textContent = sla.at_risk;
        document.getElementById('sla-on-track')?.textContent = sla.on_track;
        
        // Update source indicator
        const sourceElement = document.getElementById('data-source');
        if (sourceElement) {
            sourceElement.textContent = summary.source;
            sourceElement.className = this.isCacheReady() ? 'badge-cached' : 'badge-live';
        }
    }

    /**
     * Export report to CSV
     */
    exportToCsv() {
        if (this.tickets.length === 0) {
            alert('No tickets to export');
            return;
        }
        
        // Build CSV
        const headers = ['Key', 'Summary', 'Status', 'Priority', 'Assignee', 'Created'];
        const rows = this.tickets.map(t => [
            t.key,
            t.summary,
            t.status,
            t.priority,
            t.assignee || 'Unassigned',
            new Date(t.created).toLocaleDateString()
        ]);
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tickets_report_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log(`✅ Exported ${this.tickets.length} tickets to CSV`);
    }

    /**
     * Filter tickets by criteria
     */
    filterTickets(criteria) {
        let filtered = [...this.tickets];
        
        if (criteria.status) {
            filtered = filtered.filter(t => t.status === criteria.status);
        }
        
        if (criteria.priority) {
            filtered = filtered.filter(t => t.priority === criteria.priority);
        }
        
        if (criteria.assignee) {
            filtered = filtered.filter(t => t.assignee === criteria.assignee);
        }
        
        if (criteria.unassigned) {
            filtered = filtered.filter(t => !t.assignee || t.assignee === 'Unassigned');
        }
        
        console.log(`🔍 Filtered: ${filtered.length} tickets (from ${this.tickets.length})`);
        return filtered;
    }

    /**
     * Refresh data
     */
    async refresh() {
        console.log('🔄 Reports: Refreshing data...');
        
        // Always use API for refresh (bypass cache)
        await this.loadFromAPI();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.reportsComponent = new ReportsComponent();
    
    // Add export button handler
    document.getElementById('export-csv-btn')?.addEventListener('click', () => {
        window.reportsComponent.exportToCsv();
    });
    
    // Add refresh button handler
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
        window.reportsComponent.refresh();
    });
});

console.log('✅ Reports Component loaded');
