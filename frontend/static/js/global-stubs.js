// Global stubs to avoid ReferenceError when modules call missing functions
// These are safe no-ops and can be overridden by full implementations.
(function () {
    // Centralized handler: open issue details in the Balanced view.
    window.openIssueDetails = window.openIssueDetails || function (issueKey) {
        try {
            console.log('🔗 [Global] openIssueDetails -> opening balanced view for', issueKey);

            // store selected key globally for other modules
            window.selectedIssueKey = issueKey;

            // If app state exists, set viewMode + selectedIssue
            if (window.state && typeof window.state === 'object') {
                window.state.selectedIssue = issueKey;
                window.state.viewMode = 'balanced';
            }

            // Ensure FlowingFooter balanced view is visible if present
            const balanced = document.getElementById('balancedView');
            const chatOnly = document.getElementById('chatOnlyView');
            if (balanced) {
                if (chatOnly) chatOnly.style.display = 'none';
                balanced.style.display = 'block';
            }

            // Expand footer toggle if exists
            const toggleBtn = document.getElementById('flowingToggleBtn');
            const footer = document.getElementById('flowingFooter');
            if (footer && !footer.classList.contains('expanded')) {
                footer.classList.add('expanded');
                if (toggleBtn) try { toggleBtn.textContent = '▾'; } catch (e) { }
            }

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
