// suggestionLogic.js
// Lógica pura para generar sugerencias inteligentes del footer
/**
 * Genera sugerencias inteligentes para el footer a partir de la lista de issues.
 * @param {Array} issues - Lista de issues (tickets) normalizados.
 * @param {object} SVGIcons - Objeto con funciones de iconos SVG.
 * @param {function} stripHTML - Función para limpiar HTML de los textos.
 * @returns {Array} Sugerencias para mostrar en el footer.
 */
function generateFooterSuggestions(issues, SVGIcons, stripHTML) {
    const suggestions = [];
    if (!Array.isArray(issues) || issues.length === 0) {
        suggestions.push({ text: 'Select a queue to get started', type: 'info' });
        return suggestions;
    }
    const now = new Date();
    // Overdue tickets
    const overdueTickets = issues.filter(issue => {
        const lastChange = new Date(issue.last_real_change || issue.updated || issue.created);
        const daysSince = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
        return daysSince >= 7;
    });
    if (overdueTickets.length > 0) {
        const txt = `${SVGIcons.alert({ size: 14, className: 'inline-icon' })} ${overdueTickets.length} ticket${overdueTickets.length > 1 ? 's' : ''} overdue(7 + days)`;
        suggestions.push({ text: txt, type: 'warning', key: stripHTML(txt) });
    }
    // Critical/high priority
    const urgentTickets = issues.filter(issue => issue.severity === 'Critico' || issue.severity === 'Alto');
    if (urgentTickets.length > 0) {
        const txt = `${SVGIcons.xCircle({ size: 14, className: 'inline-icon' })} ${urgentTickets.length} urgent ticket${urgentTickets.length > 1 ? 's' : ''} require attention`;
        suggestions.push({ text: txt, type: 'critical', key: stripHTML(txt) });
    }
    // Unassigned
    const unassignedTickets = issues.filter(issue => !issue.assignee || issue.assignee === 'Unassigned' || issue.assignee === 'No assignee');
    if (unassignedTickets.length > 0) {
        const txt = `${SVGIcons.user({ size: 14, className: 'inline-icon' })} ${unassignedTickets.length} unassigned ticket${unassignedTickets.length > 1 ? 's' : ''} in queue`;
        suggestions.push({ text: txt, type: 'info', key: stripHTML(txt) });
    }
    // About to breach (3+ days)
    const aboutToBreachTickets = issues.filter(issue => {
        const lastChange = new Date(issue.last_real_change || issue.updated || issue.created);
        const daysSince = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
        return daysSince >= 3 && daysSince < 7;
    });
    if (aboutToBreachTickets.length > 0) {
        const txt = `${SVGIcons.clock({ size: 14, className: 'inline-icon' })} ${aboutToBreachTickets.length} ticket${aboutToBreachTickets.length > 1 ? 's' : ''} approaching SLA breach`;
        suggestions.push({ text: txt, type: 'warning', key: stripHTML(txt) });
    }
    // All clear
    if (suggestions.length === 0) {
        const txt = `${SVGIcons.success({ size: 14, className: 'inline-icon' })} All tickets are up to date!`;
        suggestions.push({ text: txt, type: 'success', key: stripHTML(txt) });
    }
    // General info
    const txt = `${SVGIcons.chart({ size: 14, className: 'inline-icon' })} ${issues.length} ticket${issues.length > 1 ? 's' : ''} in current queue`;
    suggestions.push({ text: txt, type: 'info', key: stripHTML(txt) });
    return suggestions;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.generateFooterSuggestions = generateFooterSuggestions;
}

export { generateFooterSuggestions };
