// slaMonitorView.js
// Lógica desacoplada para renderizar el breach risk del SLA

export function renderBreachRisk(issueKey, slaData = null) {
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

if (typeof window !== 'undefined') {
    window.renderBreachRisk = renderBreachRisk;
}
// slaMonitorView.js
// Lógica desacoplada para inicializar y renderizar el SLA Monitor en la vista balanceada del footer

export async function initializeSLAMonitor(issueKey, slaContainerSelector = '.sla-monitor-container') {
    console.log('⏱️ Initializing SLA Monitor for:', issueKey);

    const slaContainer = document.querySelector(slaContainerSelector);
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
            // ... (puedes agregar aquí lógica de personalización visual extraída del footer)
        } else {
            slaContainer.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444;">No SLA data found for this ticket</div>`;
        }
    } catch (error) {
        console.error('Error initializing SLA Monitor:', error);
        slaContainer.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444;">Error loading SLA Monitor</div>`;
    }
}

// Para browser global opcional
if (typeof window !== 'undefined') {
    window.initializeSLAMonitor = initializeSLAMonitor;
}
