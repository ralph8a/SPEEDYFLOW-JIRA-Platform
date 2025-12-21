// contextualSuggestions.js
// Lógica desacoplada para sugerencias contextuales IA del footer

/**
 * Obtiene sugerencias contextuales usando FlowingContext (IA o heurística).
 * @returns {Promise<Array>} Sugerencias contextuales para el usuario.
 */
export async function getContextualSuggestions() {
    if (!window.FlowingContext || typeof window.FlowingContext.getSuggestions !== 'function') {
        return [{ text: 'Contextual suggestions not available.', type: 'empty' }];
    }
    try {
        const suggestions = await window.FlowingContext.getSuggestions();
        if (Array.isArray(suggestions) && suggestions.length > 0) {
            return suggestions.map(s => ({
                text: s.text || 'Suggestion available.',
                type: s.type || 'info',
                key: s.key || (s.text ? s.text.replace(/<[^>]+>/g, '') : undefined)
            }));
        }
        return [{ text: 'No contextual suggestions available.', type: 'empty' }];
    } catch (e) {
        console.error('getContextualSuggestions error', e);
        return [{ text: 'Error loading contextual suggestions.', type: 'empty' }];
    }
}
