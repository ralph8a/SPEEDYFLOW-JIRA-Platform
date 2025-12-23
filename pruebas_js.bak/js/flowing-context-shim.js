/* FlowingContext shim for development/testing
   Provides a minimal getSuggestions() promise so footer can show contextual suggestions without full AI backend.
*/
(function () {
    if (window._FlowingContext) return;
    const shim = {
        async getSuggestions() {
            // Return a minimal suggestions payload compatible with footer expectations
            return {
                title: 'Shimbed Contextual Suggestions',
                suggestions: [
                    { icon: '✨', title: 'Summarize issue', prompt: 'Summarize the selected issue' },
                    { icon: '🔍', title: 'Find similar tickets', prompt: 'Find similar tickets' },
                    { icon: '✉️', title: 'Draft reply', prompt: 'Draft a polite reply to customer' }
                ]
            };
        }
    };
    try {
        window._FlowingContext = shim;
        // warn only once to avoid noisy console output
        let warned = false;
        Object.defineProperty(window, 'FlowingContext', {
            configurable: true,
            get() {
                if (!warned) {
                    console.warn('window.FlowingContext is deprecated — use window._FlowingContext');
                    warned = true;
                }
                return window._FlowingContext;
            },
            set(v) {
                if (!warned) {
                    console.warn('Setting window.FlowingContext is deprecated — set window._FlowingContext instead');
                    warned = true;
                }
                window._FlowingContext = v;
            }
        });
    } catch (e) {
        window.FlowingContext = shim;
        window._FlowingContext = shim;
    }
})();
