// uiHelpers.js
// Funciones puras para lógica de UI y testing

/**
 * Devuelve el texto de contexto para el badge del footer.
 * @param {object} context - Contexto actual (desk, queue, issue, etc)
 * @param {function} getSummary - Función para obtener el resumen de un issue dado su key
 * @returns {string}
 */
export function getContextBadgeText(context, getSummary) {
    if (!context) return 'No context';
    if (context.selectedIssue) {
        const issueKey = context.selectedIssue;
        let summary = '';
        if (typeof getSummary === 'function') summary = getSummary(issueKey) || '';
        return summary ? `${issueKey} — ${summary} ` : `Ticket: ${issueKey} `;
    }
    if (context.currentQueue) {
        return `Queue: ${context.currentQueue} (${context.issuesCount || 0} tickets)`;
    }
    if (context.currentDesk) {
        return `Desk: ${context.currentDesk} `;
    }
    return 'No context';
}

// Para browser global
if (typeof window !== 'undefined') {
    window.uiHelpers = { getContextBadgeText };
}
