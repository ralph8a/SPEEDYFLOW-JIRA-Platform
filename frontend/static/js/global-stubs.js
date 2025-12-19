// Global stubs to avoid ReferenceError when modules call missing functions
// These are safe no-ops and can be overridden by full implementations.
(function () {
    // Centralized handler: open issue details in the Balanced view.
    window.openIssueDetails = window.openIssueDetails || function (issueKey) {
        try {
            console.log('🔗 [Global] openIssueDetails -> request balanced view for', issueKey);

            // store selected key globally for other modules
            window.selectedIssueKey = issueKey;

            // If app state exists, set viewMode + selectedIssue
            if (window.state && typeof window.state === 'object') {
                window.state.selectedIssue = issueKey;
                window.state.viewMode = 'balanced';
            }

            // Prefer calling the FlowingFooter public API so state stays consistent
            try {
                if (window._flowingFooter && typeof window._flowingFooter.public_switchToBalancedView === 'function') {
                    // ensure expanded then switch to balanced via the footer API
                    if (typeof window._flowingFooter.public_expand === 'function') {
                        window._flowingFooter.public_expand();
                    }
                    window._flowingFooter.public_switchToBalancedView(issueKey);
                    return;
                }

                // If the proxy is available (queued calls), use it — it maps to public_* methods
                if (window.flowingFooter && typeof window.flowingFooter.switchToBalancedView === 'function') {
                    try { window.flowingFooter.expand && window.flowingFooter.expand(); } catch (e) { /* ignore */ }
                    window.flowingFooter.switchToBalancedView(issueKey);
                    return;
                }
            } catch (e) {
                console.warn('Could not call _flowingFooter API, falling back to DOM toggle:', e);
            }

            // Fallback: manipulate DOM directly but ensure exclusivity between views
            try {
                const balanced = document.getElementById('balancedView');
                const chatOnly = document.getElementById('chatOnlyView');
                if (balanced) {
                    if (chatOnly) chatOnly.style.display = 'none';
                    balanced.style.display = 'block';
                }
                const footer = document.getElementById('flowingFooter');
                const toggleBtn = document.getElementById('flowingToggleBtn');
                if (footer && !footer.classList.contains('expanded')) {
                    footer.classList.add('expanded');
                    if (toggleBtn) try { toggleBtn.textContent = '▾'; } catch (e) { }
                }
            } catch (e) { /* ignore DOM fallback errors */ }

            // Dispatch a global event so any module can react and render details
            try {
                const ev = new CustomEvent('openIssueDetails', { detail: { issueKey } });
                window.dispatchEvent(ev);
            } catch (e) { /* ignore */ }

        } catch (err) {
            console.warn('Error in global openIssueDetails handler', err);
        }
    };
    window.closeSidebar = window.closeSidebar || function () { /* no-op */ };
    window.initRightSidebar = window.initRightSidebar || function () { /* no-op */ };
    window.setupIssueCardClickHandlers = window.setupIssueCardClickHandlers || function () { /* no-op */ };
    window.setupMentionSystem = window.setupMentionSystem || function () { /* no-op */ };
    window.setupAttachmentsSystem = window.setupAttachmentsSystem || function () { /* no-op */ };
    window.setupCommentShortcuts = window.setupCommentShortcuts || function () { /* no-op */ };
})();
