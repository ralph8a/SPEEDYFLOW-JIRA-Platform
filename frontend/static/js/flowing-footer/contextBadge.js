// contextBadge.js
// Lógica desacoplada para actualizar el badge de contexto

export function updateContextBadge(contextBadge, context, getSummary, uiHelpers) {
    if (!contextBadge) return;
    const iconEl = contextBadge.querySelector('.context-icon');
    const textEl = contextBadge.querySelector('.context-text');
    // Limpiar icono y poner SVG si está disponible
    try {
        if (iconEl) {
            if (typeof SVGIcons !== 'undefined' && SVGIcons.logoSmall) {
                iconEl.innerHTML = SVGIcons.logoSmall({ size: 16, className: 'inline-icon' });
            } else {
                iconEl.innerHTML = '';
            }
        }
    } catch (e) { if (iconEl) iconEl.innerHTML = ''; }
    // Texto del badge
    const desiredText = (uiHelpers && uiHelpers.getContextBadgeText)
        ? uiHelpers.getContextBadgeText(context, getSummary)
        : 'No context';
    if (textEl && textEl.textContent !== desiredText) {
        textEl.textContent = desiredText;
    }
}

if (typeof window !== 'undefined') {
    window.updateContextBadge = updateContextBadge;
}
