// Legacy global stubs removed — prefer the Flowing-V2 API
// This file now provides a minimal helper and a deprecation notice.
(function () {
    'use strict';

    const DEBUG = !!(window.__FLOWING_DEBUG || (window.flowingV2 && window.flowingV2.debug));

    try {
        if (!DEBUG) {
            const _origDebug = console.debug ? console.debug.bind(console) : null;
            console.debug = function () { /* suppressed debug */ };
            console.__flowing_orig_debug = _origDebug;
        }
    } catch (e) { /* ignore */ }

    function getOrchestrator() {
        try { return window.flowingV2 || (window._flowing && window._flowing.flowingV2) || null; } catch (e) { return null; }
    }

    try { window.getFlowingOrchestrator = window.getFlowingOrchestrator || getOrchestrator; } catch (e) { /* ignore */ }

    try { console.warn('Legacy global stubs removed. Use window.flowingV2.{show,hide,loadTicketIntoBalancedView} instead.'); } catch (e) { /* ignore */ }

})();
