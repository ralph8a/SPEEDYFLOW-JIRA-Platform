// --- Helpers de formato y HTML desacoplados para FlowingFooter ---

// Sanitiza HTML básico (solo para texto plano)
export function stripHTML(str) {
    if (!str) return '';
    return String(str).replace(/<[^>]*>/g, '');
}

// Formatea mensajes de chat (markdown simple a HTML seguro)
export function formatMessage(content) {
    let formatted = String(content || '')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    // Convertir bullets
    if (formatted.includes('- ') || formatted.includes('• ')) {
        const lines = formatted.split('</p><p>');
        formatted = lines.map(line => {
            if (line.includes('- ') || line.includes('• ')) {
                const items = line.split(/<br>/).filter(l => l.trim());
                const listItems = items.map(item => {
                    const cleaned = item.replace(/^[•\-]\s*/, '').trim();
                    return cleaned ? `<li>${cleaned}</li>` : '';
                }).join('');
                return `<ul>${listItems}</ul>`;
            }
            return line;
        }).join('');
    }
    return formatted;
}

if (typeof window !== 'undefined') {
    window.stripHTML = stripHTML;
    window.formatMessage = formatMessage;
}
// footerUiUtils.js
// Helpers de UI y DOM para el footer desacoplados

export function moveIfExists(id, target, header, content) {
    try {
        const el = document.getElementById(id);
        if (el && el !== target && el !== header && el !== content) target.appendChild(el);
    } catch (e) { /* ignore */ }
}

if (typeof window !== 'undefined') {
    window.moveIfExists = moveIfExists;
}
// footerUiUtils.js
// Utilidades de UI para el footer (padding, overlay, helpers visuales)

export function adjustContentPadding(footer, isCollapsed) {
    // Lógica para ajustar el padding del contenido según el estado del footer
    if (!footer) return;
    // ...
}

export function computeBalancedOverlayPosition(footer) {
    // Lógica para calcular y setear CSS vars para overlay
    if (!footer) return;
    // ...
}

if (typeof window !== 'undefined') {
    window.adjustContentPadding = adjustContentPadding;
    window.computeBalancedOverlayPosition = computeBalancedOverlayPosition;
}
