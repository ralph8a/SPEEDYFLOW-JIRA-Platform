// footerEventBridge.js
// Centraliza listeners y despacha eventos internos del footer

/**
 * Suscribe un callback a la acción de cambiar a la vista balanceada (antes: right-sidebar)
 * @param {(issueKey: string) => void} callback
 */
export function onSwitchToBalancedView(callback) {
    window.addEventListener('flowing:switchedToBalanced', (e) => {
        if (e && e.detail) callback(e.detail);
    });
}

/**
 * Dispara el evento de cambio a vista balanceada (para uso interno del footer)
 * @param {string} issueKey
 */
export function triggerSwitchToBalancedView(issueKey) {
    window.dispatchEvent(new CustomEvent('flowing:switchedToBalanced', { detail: issueKey }));
}
