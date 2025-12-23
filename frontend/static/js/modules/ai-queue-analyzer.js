// Bridge to existing AI queue analyzer implementation (Flowing _intel_QueueAnalyzer.js)
(function () {
    if (typeof window === 'undefined') return;
    if (window.aiQueueAnalyzer) return;
    try {
        const orig = '/static/js/modules/Flowing _intel_QueueAnalyzer.js';
        const url = encodeURI(orig);
        const s = document.createElement('script');
        s.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
        s.async = true;
        s.onload = () => { console.log('Loaded AIQueueAnalyzer from', url); };
        s.onerror = () => { console.warn('Could not load AIQueueAnalyzer from', url); };
        (document.head || document.documentElement).appendChild(s);
    } catch (e) { console.warn('Error injecting ai-queue-analyzer bridge', e); }
})();