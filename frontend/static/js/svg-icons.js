// Bridge to the authoritative SVGIcons implementation in flowing-footer
// Bridge to ensure the authoritative SVGIcons implementation from flowing-footer is loaded
(function () {
    if (typeof window === 'undefined') return;
    if (window.SVGIcons) return; // already present
    // Try to load the flowing-footer implementation by injecting a script tag
    try {
        const url = '/static/js/utils/svg-icons.js';
        const s = document.createElement('script');
        s.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
        // Prefer synchronous execution when injected during parsing so other
        // scripts (footer, emoji-replacer, etc.) can rely on window.SVGIcons.
        // Setting async=false instructs the browser to execute this script
        // as a classic script in insertion order when possible.
        s.async = false;
        s.onload = () => {
            console.log('Loaded SVGIcons from', url);
            try { window.dispatchEvent(new Event('SVGIconsReady')); } catch (e) { /* ignore */ }
        };
        s.onerror = () => { console.warn('Could not load SVGIcons from', url); };
        (document.head || document.documentElement).appendChild(s);
    } catch (e) { console.warn('Error injecting svg-icons bridge', e); }
})();
