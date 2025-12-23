// Global stubs to avoid ReferenceError when modules call missing functions
// These are safe no-ops and can be overridden by full implementations.
(function () {
    // Centralized Flowing shell: unify expand/collapse and view switching logic here.

    // Quiet module-level verbose console.log output unless explicitly enabled by
    // setting `window.__FLOWING_DEBUG = true` from the browser console.
    // This prevents noisy debug logs from altering developer workflows.
    (function () {
        try {
            if (!window.__FLOWING_DEBUG) {
                const _origLog = console.log.bind(console);
                console.log = function () { /* suppressed debug */ };
                // keep a pointer in case someone wants to restore
                console.__flowing_orig_log = _origLog;
            }
        } catch (e) { /* silent */ }
    })();
    window.FlowingShell = window.FlowingShell || (function () {
        // Internal helper to call footer API when available
        function callFooter(method, args) {
            try {
                if (window._flowingFooter && typeof window._flowingFooter[method] === 'function') {
                    return window._flowingFooter[method](...args);
                }
                // proxy compatibility
                if (window.flowingFooter && typeof window.flowingFooter[method] === 'function') {
                    return window.flowingFooter[method](...args);
                }
            } catch (e) {
                console.warn('FlowingShell: footer call failed', method, e);
            }
            return undefined;
        }

        // DOM fallback implementations
        function domExpand() {
            try {
                const footer = document.getElementById('flowingFooter');
                const toggleBtn = document.getElementById('flowingToggleBtn');
                if (footer) {
                    footer.classList.remove('collapsed');
                    footer.classList.add('expanded');
                }
                try { if (toggleBtn) toggleBtn.textContent = '▾'; } catch (e) { }
            } catch (e) { /* ignore */ }
        }

        function domCollapse() {
            try {
                const footer = document.getElementById('flowingFooter');
                const toggleBtn = document.getElementById('flowingToggleBtn');
                if (footer) {
                    footer.classList.add('collapsed');
                    footer.classList.remove('expanded');
                }
                try { if (toggleBtn) toggleBtn.textContent = '▴'; } catch (e) { }
            } catch (e) { /* ignore */ }
        }

        function domSwitchToBalanced(issueKey) {
            try {
                const chatView = document.getElementById('chatOnlyView');
                const balancedView = document.getElementById('balancedView');
                if (chatView) chatView.style.display = 'none';
                if (balancedView) balancedView.style.display = 'block';
                // dispatch event for modules to load details
                try { window.dispatchEvent(new CustomEvent('openIssueDetails', { detail: { issueKey } })); } catch (e) { }
            } catch (e) { /* ignore */ }
        }

        function domSwitchToChat() {
            try {
                const chatView = document.getElementById('chatOnlyView');
                const balancedView = document.getElementById('balancedView');
                if (balancedView) balancedView.style.display = 'none';
                if (chatView) chatView.style.display = 'block';
            } catch (e) { /* ignore */ }
        }

        return {
            expand(issueKey) {
                // Try footer API first, else DOM fallback
                const res = callFooter('flowing_expand', []);
                if (res === undefined) domExpand();
                try { window.dispatchEvent(new CustomEvent('flowing:expanded', { detail: { issueKey } })); } catch (e) { }
            },
            collapse() {
                const res = callFooter('flowing_collapse', []);
                if (res === undefined) domCollapse();
                try { window.dispatchEvent(new CustomEvent('flowing:collapsed')); } catch (e) { }
            },
            toggle() {
                // Prefer footer toggle if present
                const res = callFooter('flowing_toggle', []);
                if (res === undefined) {
                    // fallback toggle based on DOM class
                    try {
                        const footer = document.getElementById('flowingFooter');
                        if (footer && footer.classList && footer.classList.contains('expanded')) this.collapse(); else this.expand();
                    } catch (e) { this.expand(); }
                }
            },
            switchToBalancedView(issueKey) {
                // Set state
                window.selectedIssueKey = issueKey;
                if (window.state && typeof window.state === 'object') { window.state.selectedIssue = issueKey; window.state.viewMode = 'balanced'; }

                // Expand + delegate to footer to load content
                const resExp = callFooter('flowing_expand', []);
                if (resExp === undefined) domExpand();

                const res = callFooter('flowing_switchToBalancedView', [issueKey]);
                if (res === undefined) domSwitchToBalanced(issueKey);

                try { window.dispatchEvent(new CustomEvent('flowing:switchedToBalanced', { detail: { issueKey } })); } catch (e) { }
            },
            switchToChatView() {
                if (window.state && typeof window.state === 'object') { window.state.selectedIssue = null; window.state.viewMode = 'kanban'; }
                const res = callFooter('flowing_switchToChatView', []);
                if (res === undefined) domSwitchToChat();
                try { window.dispatchEvent(new CustomEvent('flowing:switchedToChat')); } catch (e) { }
            }
        };
    })();

    // Backwards-compatible helpers
    window.expandFlowing = window.expandFlowing || function (issueKey) { return window.FlowingShell.expand(issueKey); };
    window.collapseFlowing = window.collapseFlowing || function () { return window.FlowingShell.collapse(); };
    window.toggleFlowing = window.toggleFlowing || function () { return window.FlowingShell.toggle(); };

    // Centralized handler: open issue details in the Balanced view (delegates to FlowingShell)
    window.openIssueDetails = window.openIssueDetails || function (issueKey) {
        try {
            console.log('🔗 [Global] openIssueDetails -> delegating to FlowingShell for', issueKey);
            return window.FlowingShell.switchToBalancedView(issueKey);
        } catch (err) {
            console.warn('Error delegating openIssueDetails to FlowingShell', err);
        }
    };
    window.closeSidebar = window.closeSidebar || function () { /* no-op */ };
    window.initRightSidebar = window.initRightSidebar || function () { /* no-op */ };
    window.setupIssueCardClickHandlers = window.setupIssueCardClickHandlers || function () { /* no-op */ };
    window.setupMentionSystem = window.setupMentionSystem || function () { /* no-op */ };
    window.setupAttachmentsSystem = window.setupAttachmentsSystem || function () { /* no-op */ };
    window.setupCommentShortcuts = window.setupCommentShortcuts || function () { /* no-op */ };
})();
