// --- Sugerencias desacopladas para FlowingFooter ---

export function analyzeSuggestions() {
    // Usar la función pura para generar sugerencias (browser global)
    const issues = (window.app && window.app.issuesCache) ? Array.from(window.app.issuesCache.values()) : [];
    if (typeof window.generateFooterSuggestions === 'function') {
        this.suggestions = window.generateFooterSuggestions(issues, SVGIcons, this._stripHTML.bind(this));
    } else {
        this.suggestions = [];
    }
}

export function startSuggestionRotation() {
    this.analyzeSuggestions();
    this.updateSuggestion();
    this.suggestionInterval = setInterval(() => {
        if (!this.suggestionPaused) this.updateSuggestion();
    }, 6000);
}

export function updateSuggestion() {
    if (!this.suggestionElement) return;
    if (this.isLoading) {
        if (this.chatView && this.chatView.setMessages) {
            this.chatView.setMessages('<div class="flowing-suggestion suggestion-loading">Loading suggestions...</div>');
        } else {
            this.suggestionElement.textContent = 'Loading suggestions...';
            this.suggestionElement.className = 'flowing-suggestion suggestion-loading';
        }
        return;
    }
    if (this.suggestions.length === 0) {
        if (this.chatView && this.chatView.setMessages) {
            this.chatView.setMessages('<div class="flowing-suggestion suggestion-empty">No suggestions available.</div>');
        } else {
            this.suggestionElement.textContent = 'No suggestions available.';
            this.suggestionElement.className = 'flowing-suggestion suggestion-empty';
        }
        return;
    }
    const suggestion = this.suggestions[this.currentSuggestionIndex];
    const currentPlain = this._stripHTML(this.suggestionElement.textContent || '');
    const incomingPlain = suggestion.key || this._stripHTML(suggestion.text || '');
    if (currentPlain === incomingPlain) {
        this.currentSuggestionIndex = (this.currentSuggestionIndex + 1) % this.suggestions.length;
        return;
    }
    this.suggestionElement.classList.remove('visible');
    setTimeout(() => {
        this.suggestionElement.textContent = this._stripHTML(suggestion.text || '');
        this.suggestionElement.classList.remove('suggestion-critical', 'suggestion-warning', 'suggestion-info', 'suggestion-success');
        this.suggestionElement.classList.add('suggestion', `suggestion-${(suggestion.type || 'info')}`);
        this.currentSuggestionIndex = (this.currentSuggestionIndex + 1) % this.suggestions.length;
        setTimeout(() => {
            this.suggestionElement.classList.add('visible');
            try {
                const type = (suggestion.type || 'info').toLowerCase();
                const level = type === 'critical' ? 3 : (type === 'warning' ? 2 : 1);
                if (window.FlowingAudio && window.FlowingAudio.playAlert) {
                    try { window.FlowingAudio.playAlert(level); } catch (e) { /* ignore */ }
                }
            } catch (e) { /* ignore */ }
        }, 50);
    }, 260);
}

export function _throttledAnalyzeSuggestions() {
    const now = Date.now();
    if (now - this.lastAnalyzeAt < 2500) return;
    this.lastAnalyzeAt = now;
    this.analyzeSuggestions();
    this.updateSuggestion();
}

if (typeof window !== 'undefined') {
    window.analyzeSuggestions = analyzeSuggestions;
    window.startSuggestionRotation = startSuggestionRotation;
    window.updateSuggestion = updateSuggestion;
    window._throttledAnalyzeSuggestions = _throttledAnalyzeSuggestions;
}
// suggestionRotator.js
// Lógica desacoplada para rotar y mostrar sugerencias en el footer

export function updateSuggestion(suggestionElement, suggestions, isLoading, chatView) {
    if (!suggestionElement) return;
    if (isLoading) {
        if (chatView && chatView.setMessages) {
            chatView.setMessages('<div class="flowing-suggestion suggestion-loading">Loading suggestions...</div>');
        } else {
            suggestionElement.textContent = 'Loading suggestions...';
            suggestionElement.className = 'flowing-suggestion suggestion-loading';
        }
        return;
    }
    if (!suggestions || suggestions.length === 0) {
        if (chatView && chatView.setMessages) {
            chatView.setMessages('<div class="flowing-suggestion suggestion-empty">No suggestions available.</div>');
        } else {
            suggestionElement.textContent = 'No suggestions available.';
            suggestionElement.className = 'flowing-suggestion suggestion-empty';
        }
        return;
    }
    // ... lógica de rotación y fade ...
}

if (typeof window !== 'undefined') {
    window.updateSuggestion = updateSuggestion;
}
