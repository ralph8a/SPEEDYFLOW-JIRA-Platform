(function () {
    // Loader ensures flowing-mvp-footer.js is loaded even if initial script tag failed
    const FOOTER_GLOBAL = '_flowingFooter';
    const SCRIPT_SRC = '/static/js/flowing-mvp-footer.js?v=' + Date.now();

    function loaded() {
        console.log('🔁 Flowing MVP loader: footer script loaded');
        // If the script created the instance, log it
        if (window[FOOTER_GLOBAL]) {
            console.log('✅ FlowingFooter instance available');
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

        // If script tag already exists and is loaded, wait shortly for init
        const existing = Array.from(document.getElementsByTagName('script')).find(s => s.src && s.src.indexOf('/static/js/flowing-mvp-footer.js') !== -1);
        if (existing) {
            return new Promise((resolve) => {
                // Wait a short period for initialization
                setTimeout(() => {
                    if (window[FOOTER_GLOBAL]) { loaded(); resolve(true); }
                    else { console.warn('Flowing MVP loader: script present but instance missing'); resolve(false); }
                }, 400);
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
