// Recommendation banner module
// Provides a centralized UI component to show field-change recommendations
// and perform apply/cancel actions. This replaces the inline footer implementation
// and should be registered or consumed via Flowing-V2 when needed.

export function hideRecommendationBanner() {
    try {
        const existing = document.getElementById('flowingRecBanner');
        if (!existing) return;
        if (typeof existing.remove === 'function') existing.remove();
        else if (existing.parentNode) existing.parentNode.removeChild(existing);
    } catch (e) { /* ignore */ }
}

export async function showRecommendationBanner(fieldKey, fieldLabel, suggestedValue, opts = {}) {
    try {
        const container = document.getElementById('balancedContentContainer') || document.querySelector('.flowing-v2-root') || document.body || document.documentElement;
        if (!container) return null;

        // Remove existing
        hideRecommendationBanner();

        const banner = document.createElement('div');
        banner.id = 'flowingRecBanner';
        // allow CSS to style #flowingRecBanner in existing footer CSS

        const left = document.createElement('div'); left.className = 'flowing-rec-left';
        const title = document.createElement('div'); title.className = 'flowing-rec-title';
        title.textContent = `Change ${fieldLabel} to ${suggestedValue}?`;
        const subtitle = document.createElement('div'); subtitle.className = 'flowing-rec-subtitle';
        subtitle.textContent = 'This will update the field on the ticket. You can preview or cancel.';
        left.appendChild(title); left.appendChild(subtitle);

        const rightBtns = document.createElement('div'); rightBtns.className = 'flowing-rec-right-btns';
        const cancelBtn = document.createElement('button'); cancelBtn.type = 'button'; cancelBtn.textContent = 'Cancel'; cancelBtn.className = 'flowing-rec-cancel';
        const applyBtn = document.createElement('button'); applyBtn.type = 'button'; applyBtn.textContent = 'Apply'; applyBtn.className = 'flowing-rec-apply';
        rightBtns.appendChild(cancelBtn); rightBtns.appendChild(applyBtn);

        banner.appendChild(left); banner.appendChild(rightBtns);

        // Insert near description if present, else at top
        const desc = container.querySelector('.ticket-description-section') || container.querySelector('.ticket-description-field') || null;
        if (desc && desc.parentNode) desc.parentNode.insertBefore(banner, desc.nextSibling);
        else container.insertBefore(banner, container.firstChild);

        cancelBtn.addEventListener('click', () => {
            hideRecommendationBanner();
        });

        applyBtn.addEventListener('click', async () => {
            try {
                const issueKey = (opts && opts.issueKey) || (typeof window !== 'undefined' && window.flowingV2 && window.flowingV2._lastLoadedIssueKey) || (window._flowingFooter && window._flowingFooter.context && window._flowingFooter.context.selectedIssue) || null;
                const meta = opts && opts.meta ? opts.meta : {};
                if (issueKey && window.app && typeof window.app.updateIssueField === 'function') {
                    await window.app.updateIssueField(issueKey, fieldKey, suggestedValue, meta);
                    hideRecommendationBanner();
                    // update field in UI if present
                    try {
                        const fieldNodes = document.querySelectorAll('#essentialFieldsGrid .field-wrapper .field-value');
                        fieldNodes.forEach(node => {
                            if ((node.previousElementSibling || {}).textContent && (node.previousElementSibling.textContent || '').toLowerCase().includes((fieldLabel || '').toLowerCase())) {
                                node.textContent = suggestedValue;
                            }
                        });
                    } catch (e) { /* ignore */ }
                    return true;
                }

                // fallback: show brief confirmation
                try {
                    title.textContent = '';
                    subtitle.textContent = '';
                    const status = document.createElement('div'); status.style.fontWeight = '700'; status.style.color = '#10b981'; status.textContent = 'Recommendation applied (local preview)';
                    left.appendChild(status);
                    setTimeout(() => hideRecommendationBanner(), 1400);
                } catch (e) { /* ignore */ }

            } catch (err) {
                try {
                    title.textContent = '';
                    subtitle.textContent = '';
                    const statusErr = document.createElement('div'); statusErr.style.fontWeight = '700'; statusErr.style.color = '#ef4444'; statusErr.textContent = 'Failed to apply recommendation';
                    left.appendChild(statusErr);
                    setTimeout(() => hideRecommendationBanner(), 2200);
                } catch (e) { /* ignore */ }
                console.error('recommendation-banner apply error', err);
            }
        });

        return banner;
    } catch (e) {
        console.warn('showRecommendationBanner error', e);
        return null;
    }
}

export default {
    showRecommendationBanner,
    hideRecommendationBanner
};

// Auto-register with FlowingV2 when available to allow orchestrator consumers
// to call the banner via the central registry (preferred over globals).
try {
    if (typeof window !== 'undefined' && window.flowingV2 && typeof window.flowingV2.registerModule === 'function') {
        try { window.flowingV2.registerModule('recommendationBanner', { showRecommendationBanner, hideRecommendationBanner }); } catch (e) { /* ignore */ }
    }
} catch (e) { /* ignore */ }
