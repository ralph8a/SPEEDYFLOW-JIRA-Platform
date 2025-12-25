// Flowing V2 global adapter
// Replaces legacy global stubs and delegates control to the Flowing-V2 orchestrator
// when present. Keeps lightweight backwards-compatible helpers for older callers.
(function () {
    'use strict';

    // Respect explicit debug flags (legacy or Flowing-V2)
    const DEBUG = !!(window.__FLOWING_DEBUG || (window.flowingV2 && window.flowingV2.debug));

    // When not debugging, silence verbose console.debug while preserving console.log
    try {
        if (!DEBUG) {
            const _origDebug = console.debug ? console.debug.bind(console) : null;
            console.debug = function () { /* suppressed debug */ };
            console.__flowing_orig_debug = _origDebug;
        }
    } catch (e) { /* ignore */ }

    // Prefer the Flowing-V2 orchestrator, then footer shims, then legacy proxies
    function getOrchestrator() {
        try {
            if (window.flowingV2) return window.flowingV2;
            if (window._flowing && window._flowing.footer) return window._flowing.footer;
            if (window._flowingFooter) return window._flowingFooter;
            if (window.flowingFooter) return window.flowingFooter;
        } catch (e) { /* ignore */ }
        return null;
    }

    // Expose helper for other modules
    try { window.getFlowingOrchestrator = window.getFlowingOrchestrator || getOrchestrator; } catch (e) { /* ignore */ }

    function callOrchestratorMethod(candidates, args) {
        const orch = getOrchestrator();
        if (!orch) return undefined;
        const methods = Array.isArray(candidates) ? candidates : [candidates];
        for (let m of methods) {
            try {
                if (typeof orch[m] === 'function') return orch[m](...args);
            } catch (err) {
                console.warn('FlowingAdapter: method call failed', m, err);
            }
        }
        return undefined;
    }

    // Lightweight FlowingShell facade that routes calls to Flowing-V2 when available
    window.FlowingShell = window.FlowingShell || {
        expand(issueKey) {
            // Flowing-V2 prefers expand(); older footers may use flowing_expand
            const res = callOrchestratorMethod(['expand', 'flowing_expand'], [issueKey]);
            if (res !== undefined) return res;
            // As a last resort open the balanced view for the issue
            return callOrchestratorMethod(['loadTicketIntoBalancedView', 'switchToBalancedView', 'flowing_switchToBalancedView'], [issueKey]);
        },
        collapse() {
            return callOrchestratorMethod(['collapse', 'flowing_collapse'], []);
        },
        toggle() {
            return callOrchestratorMethod(['toggle', 'flowing_toggle'], []);
        },
        switchToBalancedView(issueKey) {
            return callOrchestratorMethod(['loadTicketIntoBalancedView', 'switchToBalancedView', 'flowing_switchToBalancedView'], [issueKey]);
        },
        switchToChatView() {
            // Chat view removed in V2; collapse as fallback
            return callOrchestratorMethod(['collapse', 'flowing_collapse'], []);
        }
    };

    // Backwards-compatible helpers
    window.expandFlowing = window.expandFlowing || function (issueKey) { return window.FlowingShell.expand(issueKey); };
    window.collapseFlowing = window.collapseFlowing || function () { return window.FlowingShell.collapse(); };
    window.toggleFlowing = window.toggleFlowing || function () { return window.FlowingShell.toggle(); };

    // Global helper used by templates / other modules to open issue details
    window.openIssueDetails = window.openIssueDetails || function (issueKey) {
        try {
            return window.FlowingShell.switchToBalancedView(issueKey);
        } catch (err) {
            console.warn('openIssueDetails delegation failed', err);
        }
    };

    // Small utility: direct call helper with orchestrator fallback
    window.callFlowing = window.callFlowing || function (method, ...args) {
        try {
            const orch = getOrchestrator();
            if (!orch) { console.warn('callFlowing: no orchestrator available'); return undefined; }
            if (typeof orch[method] === 'function') return orch[method](...args);
        } catch (e) { console.warn('callFlowing error', e); }
        return undefined;
    };

    // Legacy no-op stubs kept for modules that still reference them
    window.closeSidebar = window.closeSidebar || function () { /* no-op */ };
    window.initRightSidebar = window.initRightSidebar || function () { /* no-op */ };
    window.setupIssueCardClickHandlers = window.setupIssueCardClickHandlers || function () { /* no-op */ };
    window.setupMentionSystem = window.setupMentionSystem || function () { /* no-op */ };
    window.setupAttachmentsSystem = window.setupAttachmentsSystem || function () { /* no-op */ };
    window.setupCommentShortcuts = window.setupCommentShortcuts || function () { /* no-op */ };

})();
