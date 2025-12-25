// Flowing V2 compatibility shim
// - Maps legacy DOM classnames to new Flowing V2 classnames
// - Exposes lightweight legacy globals and test helpers
(function () {
    if (typeof window === 'undefined') return;

    function mapLegacyClasses(root = document) {
        try {
            const lefts = root.querySelectorAll('.left-section');
            lefts.forEach(el => el.classList.add('left-arriba'));
            const rights = root.querySelectorAll('.right-section');
            rights.forEach(el => el.classList.add('right-abajo'));
            const headerLeft = root.querySelectorAll('.header-left-section');
            headerLeft.forEach(el => el.style.display = el.style.display || 'block');
            const headerRight = root.querySelectorAll('.header-right-section');
            headerRight.forEach(el => el.style.display = el.style.display || 'block');
        } catch (e) { console.warn('flowing-v2-compat: mapLegacyClasses failed', e); }
    }

    function tryExposeGlobals() {
        try {
            if (!window.flowingV2) return;
            try { if (!window.attachmentsModule) window.attachmentsModule = window.flowingV2.getModule('attachmentsModule') || window.attachmentsModule; } catch (__) { }
            try { if (!window.commentsModule) window.commentsModule = window.flowingV2.getModule('commentsModule') || window.commentsModule; } catch (__) { }
            try { if (!window.slaPredictor) window.slaPredictor = window.flowingV2.getModule('slaPredictor') || window.slaPredictor; } catch (__) { }
            try { if (!window.slaBreachRisk) window.slaBreachRisk = window.flowingV2.getModule('slaBreachRisk') || window.slaBreachRisk; } catch (__) { }
            try { if (!window.slaMonitor) window.slaMonitor = window.flowingV2.getModule('slaMonitor') || window.slaMonitor; } catch (__) { }
        } catch (e) { /* ignore */ }
    }

    // Test helpers to reduce fragility in Playwright tests
    const testHelpers = {
        SELECTORS: {
            CARD_OPEN_BTN: '.btn-open-balanced',
            BALANCED_MAIN: '#BalancedMain',
            SLA_CONTAINER: '#slaMonitorContainer',
            ATTACHMENTS_LIST_RIGHT: '#AttachmentsListRight'
        },
        openFirstCard() {
            const btn = document.querySelector(this.SELECTORS.CARD_OPEN_BTN);
            if (!btn) return false;
            try { btn.click(); return true; } catch (e) { try { btn.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; } catch (__) { return false; } }
        },
        waitForSelector(sel, timeout = 3000) {
            return new Promise((resolve, reject) => {
                const el = document.querySelector(sel);
                if (el) return resolve(el);
                const obs = new MutationObserver((mutations, observer) => {
                    const found = document.querySelector(sel);
                    if (found) { observer.disconnect(); resolve(found); }
                });
                obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
                if (timeout) setTimeout(() => { try { obs.disconnect(); } catch (__) { }; reject(new Error('timeout')); }, timeout);
            });
        }
    };

    // MutationObserver: map legacy classes for dynamically added nodes
    function observeDomForLegacy() {
        try {
            const mo = new MutationObserver((mutations) => {
                mutations.forEach(m => {
                    if (m.addedNodes && m.addedNodes.length) {
                        m.addedNodes.forEach(node => {
                            if (!(node instanceof Element)) return;
                            if (node.classList && (node.classList.contains('left-section') || node.classList.contains('right-section') || node.classList.contains('header-left-section') || node.classList.contains('header-right-section'))) {
                                try { mapLegacyClasses(node); } catch (e) { /* ignore */ }
                            }
                            // If nodes contain children with legacy classes
                            try { mapLegacyClasses(node); } catch (e) { /* ignore */ }
                        });
                    }
                });
            });
            mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
        } catch (e) { /* ignore */ }
    }

    function initCompat() {
        try {
            mapLegacyClasses(document);
            tryExposeGlobals();
            if (!window.flowingV2) {
                // If FlowingV2 isn't ready yet, retry once FlowingV2 is exposed
                const intId = setInterval(() => { if (window.flowingV2) { tryExposeGlobals(); clearInterval(intId); } }, 200);
            }
            if (!window.flowingV2 || !window.flowingV2.testHelpers) {
                try { window.flowingV2 = window.flowingV2 || {}; window.flowingV2.testHelpers = Object.assign(window.flowingV2.testHelpers || {}, testHelpers); } catch (__) { }
            }
            observeDomForLegacy();
        } catch (e) { console.warn('flowing-v2-compat init failed', e); }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCompat); else initCompat();
})();
