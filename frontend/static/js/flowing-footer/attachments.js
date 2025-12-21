// attachments.js
// Helpers desacoplados para manejo de adjuntos y banners en FlowingFooter

import { buildAttachmentsHTML } from './attachmentsView.js';

export function renderAttachmentsForBalanced(issue) {
    try {
        const rightContainer = document.getElementById('attachmentsListRight');
        const headerContainer = document.getElementById('attachmentsListHeader');
        if (!rightContainer && !headerContainer) return;

        const { frag, thumbFrag } = buildAttachmentsHTML(issue);
        if (!frag && !thumbFrag) {
            if (rightContainer) {
                while (rightContainer.firstChild) rightContainer.removeChild(rightContainer.firstChild);
            }
            if (headerContainer) {
                while (headerContainer.firstChild) headerContainer.removeChild(headerContainer.firstChild);
            }
            const preview = document.getElementById('attachmentsPreviewFooter'); if (preview && preview.classList && typeof preview.classList.remove === 'function') preview.classList.remove('show');
            return;
        }

        try {
            if (rightContainer) {
                while (rightContainer.firstChild) rightContainer.removeChild(rightContainer.firstChild);
                if (thumbFrag) rightContainer.appendChild(thumbFrag);
                if (frag) rightContainer.appendChild(frag);
            }
            if (headerContainer) {
                while (headerContainer.firstChild) headerContainer.removeChild(headerContainer.firstChild);
            }
        } catch (e) { /* ignore */ }
    } catch (e) {
        console.warn('renderAttachmentsForBalanced error', e);
    }
}

export function renderFooterAttachments(issue) {
    try {
        const right = document.getElementById('attachmentsListRight');
        const header = document.getElementById('attachmentsListHeader');
        if (!right && !header) return;

        const { frag, thumbFrag } = buildAttachmentsHTML(issue);
        if ((!frag || !frag.hasChildNodes()) && (!thumbFrag || !thumbFrag.hasChildNodes())) {
            if (right) { while (right.firstChild) right.removeChild(right.firstChild); }
            if (header) { while (header.firstChild) header.removeChild(header.firstChild); }
            return;
        }

        // Footer prefers the full list (no header thumbs)
        if (right) {
            while (right.firstChild) right.removeChild(right.firstChild);
            if (frag) right.appendChild(frag);
        }
        if (header) { while (header.firstChild) header.removeChild(header.firstChild); }
    } catch (e) {
        console.warn('renderFooterAttachments error', e);
    }
}

export function showFieldRecommendationBanner(fieldKey, fieldLabel, suggestedValue, meta = {}) {
    try {
        const container = document.getElementById('balancedContentContainer');
        if (!container) return;
        // remove existing banner
        const existing = document.getElementById('flowingRecBanner');
        if (existing) {
            if (typeof existing.remove === 'function') existing.remove();
            else if (existing.parentNode) existing.parentNode.removeChild(existing);
        }

        const banner = document.createElement('div');
        banner.id = 'flowingRecBanner';
        banner.style.cssText = 'position:relative;margin:8px 0;padding:12px;border-radius:8px;background:linear-gradient(90deg,#fff,#f8fafc);border:1px solid #e6e6f0;display:flex;align-items:center;gap:12px;';

        const left = document.createElement('div'); left.style.flex = '1';
        const title = document.createElement('div'); title.style.fontWeight = '700'; title.style.color = '#374151';
        title.textContent = `Change ${fieldLabel} to ${suggestedValue}?`;
        const subtitle = document.createElement('div'); subtitle.style.fontSize = '12px'; subtitle.style.color = '#6b7280'; subtitle.style.marginTop = '4px';
        subtitle.textContent = 'This will update the field on the ticket. You can preview or cancel.';
        left.appendChild(title); left.appendChild(subtitle);

        const rightBtns = document.createElement('div'); rightBtns.style.display = 'flex'; rightBtns.style.gap = '8px';
        const cancelBtn = document.createElement('button'); cancelBtn.type = 'button'; cancelBtn.textContent = 'Cancel'; cancelBtn.style.padding = '8px 10px'; cancelBtn.style.borderRadius = '8px'; cancelBtn.style.border = '1px solid #e5e7eb'; cancelBtn.style.background = '#fff';
        const applyBtn = document.createElement('button'); applyBtn.type = 'button'; applyBtn.textContent = 'Apply'; applyBtn.style.padding = '8px 12px'; applyBtn.style.borderRadius = '8px'; applyBtn.style.border = 'none'; applyBtn.style.background = 'linear-gradient(135deg,#6366f1,#4f46e5)'; applyBtn.style.color = '#fff'; applyBtn.style.fontWeight = '700';
        rightBtns.appendChild(cancelBtn); rightBtns.appendChild(applyBtn);

        banner.appendChild(left); banner.appendChild(rightBtns);

        // insert banner after description if present, else at top of balanced container
        const desc = container.querySelector('.ticket-description-section');
        if (desc && desc.parentNode) desc.parentNode.insertBefore(banner, desc.nextSibling);
        else container.insertBefore(banner, container.firstChild);

        cancelBtn.addEventListener('click', () => {
            if (banner) {
                if (typeof banner.remove === 'function') banner.remove();
                else if (banner.parentNode) banner.parentNode.removeChild(banner);
            }
        });
        applyBtn.addEventListener('click', async () => {
            try {
                if (window.app && typeof window.app.updateIssueField === 'function') {
                    await window.app.updateIssueField(window._flowingFooter?.context?.selectedIssue, fieldKey, suggestedValue, meta);
                    if (banner) {
                        if (typeof banner.remove === 'function') banner.remove();
                        else if (banner.parentNode) banner.parentNode.removeChild(banner);
                    }
                    // update UI: replace field value in grid if present
                    const fieldNodes = document.querySelectorAll('#essentialFieldsGrid .field-wrapper .field-input');
                    fieldNodes.forEach(node => {
                        if ((node.previousElementSibling || {}).textContent && (node.previousElementSibling.textContent || '').toLowerCase().includes(fieldLabel.toLowerCase())) {
                            node.textContent = suggestedValue;
                        }
                    });
                    console.log('✅ Applied recommendation via app.updateIssueField');
                    return;
                }
                // Fallback: mock apply (no server)
                title.textContent = '';
                subtitle.textContent = '';
                const status = document.createElement('div'); status.style.fontWeight = '700'; status.style.color = '#10b981'; status.textContent = 'Recommendation applied (local preview)';
                left.appendChild(status);
                setTimeout(() => {
                    if (banner) {
                        if (typeof banner.remove === 'function') banner.remove();
                        else if (banner.parentNode) banner.parentNode.removeChild(banner);
                    }
                }, 1600);
            } catch (err) {
                console.error('Could not apply recommendation', err);
                title.textContent = '';
                subtitle.textContent = '';
                const statusErr = document.createElement('div'); statusErr.style.fontWeight = '700'; statusErr.style.color = '#ef4444'; statusErr.textContent = 'Failed to apply recommendation';
                left.appendChild(statusErr);
                setTimeout(() => {
                    if (banner) {
                        if (typeof banner.remove === 'function') banner.remove();
                        else if (banner.parentNode) banner.parentNode.removeChild(banner);
                    }
                }, 2200);
            }
        });
    } catch (e) { console.warn('showFieldRecommendationBanner error', e); }
}

if (typeof window !== 'undefined') {
    window.renderAttachmentsForBalanced = renderAttachmentsForBalanced;
    window.renderFooterAttachments = renderFooterAttachments;
    window.showFieldRecommendationBanner = showFieldRecommendationBanner;
}
