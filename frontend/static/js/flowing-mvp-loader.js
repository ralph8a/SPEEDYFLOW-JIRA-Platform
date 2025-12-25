(function () {
    // Loader ensures flowing-mvp-footer.js is loaded even if initial script tag failed
    const FOOTER_GLOBAL = '_flowingFooter';
    const SCRIPT_SRC = '/static/js/flowing-mvp-footer.js?v=' + Date.now();

    function loaded() {
        console.log('🔁 Flowing MVP loader: footer script loaded');
        // If the script created the instance, log it. Also accept Flowing-V2 as a valid orchestrator.
        if (window[FOOTER_GLOBAL]) {
            console.log('✅ FlowingFooter instance available');
        } else if (window.flowingV2) {
            console.log('✅ FlowingV2 instance available (using Flowing-V2 as orchestrator)');
        } else {
            console.warn('⚠️ FlowingFooter instance not found after load');
        }
    }

    function ensureLoad() {
        // If already present, nothing to do
        if (window[FOOTER_GLOBAL]) {
            console.log('🔍 Flowing MVP loader: instance already present');
            return Promise.resolve(true);
        }

        // If script tag already exists, attempt to wait for it to initialize properly.
        const existing = Array.from(document.getElementsByTagName('script')).find(s => s.src && s.src.indexOf('/static/js/flowing-mvp-footer.js') !== -1);
        if (existing) {
            // If instance already present, resolve immediately
            if (window[FOOTER_GLOBAL] || window.flowingV2) {
                loaded();
                return Promise.resolve(true);
            }

            return new Promise((resolve) => {
                let settled = false;

                // If the existing script supports load events, listen for it (works for normal and module scripts)
                try {
                    existing.addEventListener('load', () => {
                        if (window[FOOTER_GLOBAL] || window.flowingV2) { loaded(); settled = true; resolve(true); }
                        else { /* allow fallback checks below */ }
                    });
                    existing.addEventListener('error', (e) => { console.error('❌ Flowing MVP loader: footer script errored while loading', e); if (!settled) { settled = true; resolve(false); } });
                } catch (e) { /* ignore addEventListener errors */ }

                // Poll for a short duration to allow module scripts to execute (modules are deferred)
                let tries = 0;
                const iv = setInterval(() => {
                    tries++;
                    if (window[FOOTER_GLOBAL] || window.flowingV2) {
                        clearInterval(iv);
                        if (!settled) { settled = true; loaded(); resolve(true); }
                    } else if (tries > 20) { // ~4 seconds total (20 * 200ms)
                        clearInterval(iv);
                        if (!settled) { settled = true; console.warn('Flowing MVP loader: script present but instance missing'); resolve(false); }
                    }
                }, 200);
            });
        }

        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = SCRIPT_SRC;
            s.async = false;
            s.onload = () => { loaded(); resolve(true); };
            s.onerror = (e) => { console.error('❌ Flowing MVP loader: failed to load footer script', e); resolve(false); };
            document.head.appendChild(s);
        });
    }

    // Expose a helper on window so devs can call it from console
    window.ensureFlowingFooterLoaded = ensureLoad;

    // Auto-run after a short delay so it doesn't block initial render
    setTimeout(() => {
        ensureLoad().then(ok => {
            if (!ok) {
                console.warn('Flowing MVP loader: footer script not loaded automatically. Run ensureFlowingFooterLoaded() in console to retry.');
            }
        });
    }, 300);
})();
