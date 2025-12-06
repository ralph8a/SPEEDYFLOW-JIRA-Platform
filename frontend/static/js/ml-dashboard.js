/**
 * ML Predictive Dashboard
 * Real-time visualization of ML predictions, SLA forecasts, and team analytics
 */

class MLDashboard {
    constructor() {
        this.charts = {};
        this.refreshInterval = null;
        this.autoRefresh = true;
        this.currentQueueId = null;
    }

    /**
     * Initialize dashboard
     */
    async init() {
        console.log('🎯 Initializing ML Predictive Dashboard...');
        this.loadDashboardPreferences();
        this.setupEventListeners();
        await this.loadDashboardData();
        this.startAutoRefresh();
    }

    /**
     * Show dashboard modal
     */
    show() {
        const modal = document.getElementById('ml-dashboard-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadDashboardData();
        }
    }

    /**
     * Hide dashboard modal
     */
    hide() {
        const modal = document.getElementById('ml-dashboard-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close button
        const closeBtn = document.querySelector('.ml-dashboard-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Click outside to close
        const modal = document.getElementById('ml-dashboard-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hide();
                }
            });
        }

        // Tab switching
        document.querySelectorAll('.ml-dashboard-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Refresh button
        const refreshBtn = document.querySelector('.ml-dashboard-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDashboardData());
        }

        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementById('ml-dashboard-auto-refresh');
        if (autoRefreshToggle) {
            autoRefreshToggle.checked = this.autoRefresh;
            autoRefreshToggle.addEventListener('change', (e) => {
                this.autoRefresh = e.target.checked;
                this.saveDashboardPreferences();
                if (this.autoRefresh) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }
    }

    /**
     * Switch dashboard tab
     */
    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.ml-dashboard-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update visible content
        document.querySelectorAll('.ml-dashboard-tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tabName);
        });

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        try {
            this.showLoading();

            // Get current queue if available
            this.currentQueueId = this.getCurrentQueueId();

            // Load all sections
            await Promise.all([
                this.loadOverview(),
                this.loadBreachForecast(),
                this.loadPerformanceTrends(),
                this.loadTeamWorkload()
            ]);

            this.hideLoading();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    /**
     * Load overview metrics
     */
    async loadOverview() {
        try {
            const url = `/api/ml/dashboard/overview${this.currentQueueId ? `?queue_id=${this.currentQueueId}` : ''}`;
            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                this.renderOverview(result.data);
            }
        } catch (error) {
            console.error('Error loading overview:', error);
        }
    }

    /**
     * Render overview section
     */
    renderOverview(data) {
        // Update metric cards
        this.updateMetricCard('total-tickets', data.overview.total_tickets, 'tickets');
        this.updateMetricCard('critical-tickets', data.overview.critical_tickets, 'critical');
        this.updateMetricCard('sla-compliance', `${data.sla.compliance_rate}%`, 'SLA');
        this.updateMetricCard('at-risk-tickets', data.sla.at_risk, 'at risk');

        // Update SLA breakdown chart
        this.renderSLABreakdownChart(data.sla);

        // Update priority distribution chart
        this.renderPriorityDistributionChart(data.priority_distribution);

        // Update breach predictions list
        this.renderBreachPredictionsList(data.breach_predictions);
    }

    /**
     * Update metric card
     */
    updateMetricCard(id, value, label) {
        const card = document.querySelector(`[data-metric="${id}"]`);
        if (card) {
            const valueEl = card.querySelector('.metric-value');
            const labelEl = card.querySelector('.metric-label');
            if (valueEl) valueEl.textContent = value;
            if (labelEl) labelEl.textContent = label;
        }
    }

    /**
     * Render SLA breakdown chart (Doughnut)
     */
    renderSLABreakdownChart(slaData) {
        const ctx = document.getElementById('sla-breakdown-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.slaBreakdown) {
            this.charts.slaBreakdown.destroy();
        }

        this.charts.slaBreakdown = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['On Track', 'At Risk', 'Breached'],
                datasets: [{
                    data: [slaData.on_track, slaData.at_risk, slaData.breached],
                    backgroundColor: [
                        'rgba(52, 211, 153, 0.8)',  // Green
                        'rgba(251, 191, 36, 0.8)',  // Yellow
                        'rgba(239, 68, 68, 0.8)'    // Red
                    ],
                    borderColor: [
                        'rgba(52, 211, 153, 1)',
                        'rgba(251, 191, 36, 1)',
                        'rgba(239, 68, 68, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e5e7eb',
                            font: { size: 12 }
                        }
                    },
                    title: {
                        display: true,
                        text: 'SLA Status Breakdown',
                        color: '#f3f4f6',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            }
        });
    }

    /**
     * Render priority distribution chart (Bar)
     */
    renderPriorityDistributionChart(priorityData) {
        const ctx = document.getElementById('priority-distribution-chart');
        if (!ctx) return;

        if (this.charts.priorityDist) {
            this.charts.priorityDist.destroy();
        }

        const labels = Object.keys(priorityData);
        const values = Object.values(priorityData);

        this.charts.priorityDist = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tickets',
                    data: values,
                    backgroundColor: 'rgba(99, 102, 241, 0.7)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#e5e7eb' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#e5e7eb' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Priority Distribution',
                        color: '#f3f4f6',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            }
        });
    }

    /**
     * Render breach predictions list
     */
    renderBreachPredictionsList(predictions) {
        const container = document.getElementById('breach-predictions-list');
        if (!container) return;

        if (!predictions || predictions.length === 0) {
            container.innerHTML = '<div class="empty-state">✅ No high-risk tickets detected</div>';
            return;
        }

        container.innerHTML = predictions.slice(0, 10).map(pred => `
            <div class="breach-prediction-item" data-risk="${this.getRiskLevel(pred.risk_score)}">
                <div class="breach-item-header">
                    <span class="ticket-key">${pred.ticket_key}</span>
                    <span class="risk-badge risk-${this.getRiskLevel(pred.risk_score)}">
                        ${pred.risk_score}% risk
                    </span>
                </div>
                <div class="breach-item-details">
                    <span class="breach-time">⏰ ${pred.hours_to_breach.toFixed(1)}h to breach</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load breach forecast
     */
    async loadBreachForecast() {
        try {
            const hours = 24; // Next 24 hours
            const url = `/api/ml/dashboard/breach-forecast?hours=${hours}${this.currentQueueId ? `&queue_id=${this.currentQueueId}` : ''}`;
            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                this.renderBreachForecast(result.data);
            }
        } catch (error) {
            console.error('Error loading breach forecast:', error);
        }
    }

    /**
     * Render breach forecast tab
     */
    renderBreachForecast(data) {
        const container = document.getElementById('breach-forecast-content');
        if (!container) return;

        container.innerHTML = `
            <div class="forecast-summary">
                <div class="forecast-stat">
                    <span class="stat-value">${data.predicted_breaches}</span>
                    <span class="stat-label">Predicted Breaches (${data.forecast_period_hours}h)</span>
                </div>
                <div class="forecast-stat critical">
                    <span class="stat-value">${data.high_risk_tickets}</span>
                    <span class="stat-label">High Risk (>80%)</span>
                </div>
            </div>
            <div class="forecast-timeline">
                ${this.renderForecastTimeline(data.forecast)}
            </div>
        `;
    }

    /**
     * Render forecast timeline
     */
    renderForecastTimeline(forecast) {
        if (!forecast || forecast.length === 0) {
            return '<div class="empty-state">✅ No breaches predicted in next 24 hours</div>';
        }

        return forecast.map(item => `
            <div class="forecast-item risk-${this.getRiskLevel(item.risk_score)}">
                <div class="forecast-item-time">
                    <span class="time-badge">${new Date(item.predicted_breach_time).toLocaleTimeString()}</span>
                </div>
                <div class="forecast-item-content">
                    <div class="forecast-item-header">
                        <a href="#" class="ticket-link" onclick="window.openTicketDetails('${item.ticket_key}'); return false;">
                            ${item.ticket_key}
                        </a>
                        <span class="risk-indicator">${item.risk_score}%</span>
                    </div>
                    <div class="forecast-item-summary">${item.summary}</div>
                    <div class="forecast-item-meta">
                        <span>👤 ${item.current_assignee}</span>
                        <span>🚨 ${item.priority}</span>
                        <span>⏱️ ${item.hours_to_breach.toFixed(1)}h</span>
                    </div>
                    <div class="forecast-item-action">
                        💡 ${item.recommended_action}
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load performance trends
     */
    async loadPerformanceTrends() {
        try {
            const days = 7;
            const url = `/api/ml/dashboard/performance-trends?days=${days}${this.currentQueueId ? `&queue_id=${this.currentQueueId}` : ''}`;
            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                this.renderPerformanceTrends(result.data);
            }
        } catch (error) {
            console.error('Error loading performance trends:', error);
        }
    }

    /**
     * Render performance trends charts
     */
    renderPerformanceTrends(data) {
        this.renderTicketVolumeChart(data);
        this.renderSLAComplianceChart(data);
        this.renderResolutionTimeChart(data);
    }

    /**
     * Render ticket volume chart (Line)
     */
    renderTicketVolumeChart(data) {
        const ctx = document.getElementById('ticket-volume-chart');
        if (!ctx) return;

        if (this.charts.ticketVolume) {
            this.charts.ticketVolume.destroy();
        }

        this.charts.ticketVolume = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [
                    {
                        label: 'Created',
                        data: data.tickets_created,
                        borderColor: 'rgba(59, 130, 246, 1)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Resolved',
                        data: data.tickets_resolved,
                        borderColor: 'rgba(52, 211, 153, 1)',
                        backgroundColor: 'rgba(52, 211, 153, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#e5e7eb' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#e5e7eb' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#e5e7eb' }
                    },
                    title: {
                        display: true,
                        text: 'Ticket Volume (7 Days)',
                        color: '#f3f4f6',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            }
        });
    }

    /**
     * Render SLA compliance chart (Line)
     */
    renderSLAComplianceChart(data) {
        const ctx = document.getElementById('sla-compliance-chart');
        if (!ctx) return;

        if (this.charts.slaCompliance) {
            this.charts.slaCompliance.destroy();
        }

        this.charts.slaCompliance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [{
                    label: 'SLA Compliance %',
                    data: data.sla_compliance,
                    borderColor: 'rgba(52, 211, 153, 1)',
                    backgroundColor: 'rgba(52, 211, 153, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: '#e5e7eb', callback: (value) => value + '%' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#e5e7eb' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'SLA Compliance Trend',
                        color: '#f3f4f6',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            }
        });
    }

    /**
     * Render resolution time chart (Bar)
     */
    renderResolutionTimeChart(data) {
        const ctx = document.getElementById('resolution-time-chart');
        if (!ctx) return;

        if (this.charts.resolutionTime) {
            this.charts.resolutionTime.destroy();
        }

        this.charts.resolutionTime = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.dates,
                datasets: [{
                    label: 'Avg Resolution Time (hours)',
                    data: data.avg_resolution_time,
                    backgroundColor: 'rgba(168, 85, 247, 0.7)',
                    borderColor: 'rgba(168, 85, 247, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#e5e7eb' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#e5e7eb' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Average Resolution Time',
                        color: '#f3f4f6',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            }
        });
    }

    /**
     * Load team workload
     */
    async loadTeamWorkload() {
        try {
            const url = `/api/ml/dashboard/team-workload${this.currentQueueId ? `?queue_id=${this.currentQueueId}` : ''}`;
            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                this.renderTeamWorkload(result.data);
            }
        } catch (error) {
            console.error('Error loading team workload:', error);
        }
    }

    /**
     * Render team workload
     */
    renderTeamWorkload(data) {
        const container = document.getElementById('team-workload-content');
        if (!container) return;

        container.innerHTML = `
            <div class="workload-summary">
                <div class="workload-stat">
                    <span class="stat-value">${data.total_agents}</span>
                    <span class="stat-label">Active Agents</span>
                </div>
                <div class="workload-stat">
                    <span class="stat-value">${data.avg_tickets_per_agent}</span>
                    <span class="stat-label">Avg Tickets/Agent</span>
                </div>
                <div class="workload-stat ${data.balance_score < 60 ? 'warning' : ''}">
                    <span class="stat-value">${data.balance_score}%</span>
                    <span class="stat-label">Balance Score</span>
                </div>
            </div>
            <div class="team-list">
                ${this.renderTeamList(data.team_stats)}
            </div>
        `;
    }

    /**
     * Render team member list
     */
    renderTeamList(teamStats) {
        if (!teamStats || teamStats.length === 0) {
            return '<div class="empty-state">No team data available</div>';
        }

        return teamStats.map(member => `
            <div class="team-member-card">
                <div class="team-member-header">
                    <span class="member-name">👤 ${member.assignee}</span>
                    <span class="member-workload ${this.getWorkloadClass(member.assigned_tickets)}">
                        ${member.assigned_tickets} tickets
                    </span>
                </div>
                <div class="team-member-stats">
                    <div class="member-stat">
                        <span class="stat-label">🔥 Critical</span>
                        <span class="stat-value">${member.critical_tickets}</span>
                    </div>
                    <div class="member-stat">
                        <span class="stat-label">⚠️ At Risk</span>
                        <span class="stat-value">${member.at_risk_tickets}</span>
                    </div>
                    <div class="member-stat">
                        <span class="stat-label">📊 SLA Used</span>
                        <span class="stat-value">${member.avg_sla_time_used}%</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load tab-specific data
     */
    async loadTabData(tabName) {
        switch (tabName) {
            case 'overview':
                await this.loadOverview();
                break;
            case 'forecast':
                await this.loadBreachForecast();
                break;
            case 'trends':
                await this.loadPerformanceTrends();
                break;
            case 'team':
                await this.loadTeamWorkload();
                break;
        }
    }

    /**
     * Get current queue ID from UI
     */
    getCurrentQueueId() {
        // Try to get from queue selector
        const queueSelect = document.getElementById('queue-select');
        return queueSelect ? queueSelect.value : null;
    }

    /**
     * Get risk level from score
     */
    getRiskLevel(score) {
        if (score >= 80) return 'critical';
        if (score >= 60) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    }

    /**
     * Get workload class
     */
    getWorkloadClass(tickets) {
        if (tickets > 15) return 'overloaded';
        if (tickets > 10) return 'high';
        if (tickets > 5) return 'medium';
        return 'low';
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Refresh every 5 minutes
        this.refreshInterval = setInterval(() => {
            if (this.autoRefresh) {
                console.log('🔄 Auto-refreshing dashboard...');
                this.loadDashboardData();
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loader = document.querySelector('.ml-dashboard-loader');
        if (loader) {
            loader.style.display = 'flex';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loader = document.querySelector('.ml-dashboard-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        // Could add toast notification here
    }

    /**
     * Save dashboard preferences
     */
    saveDashboardPreferences() {
        localStorage.setItem('ml_dashboard_auto_refresh', this.autoRefresh);
    }

    /**
     * Load dashboard preferences
     */
    loadDashboardPreferences() {
        const autoRefresh = localStorage.getItem('ml_dashboard_auto_refresh');
        if (autoRefresh !== null) {
            this.autoRefresh = autoRefresh === 'true';
        }
    }
}

// Global instance
window.mlDashboard = new MLDashboard();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mlDashboard.init();
    });
} else {
    window.mlDashboard.init();
}
