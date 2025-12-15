// flowing-context-aware.js
// Minimal FlowingContext implementation: detects UI context and renders contextual
// suggestions into the existing right sidebar, replacing its content.

(function () {
    class FlowingContextImpl {
        constructor() {
            this.currentContext = 'unknown';
            this.activeIssueKey = null;
            this.contextData = {};
            this.suggestions = [];
            // Auto-open flag: when false, suggestions are fetched but sidebar won't open automatically
            this.autoOpen = false;

            document.addEventListener('DOMContentLoaded', () => {
                // Initial detection and a small periodic refresh (fetch suggestions only)
                this.detectContext();
                setInterval(() => this.detectContext(), 3000);

                // Create the floating toggle bulb so user can open suggestions on demand
                this.createToggleButton();

                // Expose API globally
                window.FlowingContext = this;
                console.log('✅ FlowingContext initialized (flowing-context-aware.js)');
            });
        }

        detectContext() {
            // Heuristics: prefer global app/state if available, fallback to DOM
            const state = window.state || {};
            const app = window.app || {};

            const prev = { ctx: this.currentContext, key: this.activeIssueKey };

            if (state.currentQueue) {
                this.currentContext = 'kanban_board';
                this.contextData.queue = state.currentQueue;
            } else if (state.viewMode === 'list') {
                this.currentContext = 'list_view';
            } else {
                this.currentContext = 'kanban_board';
            }

            // active selected issue
            this.activeIssueKey = state.selectedIssue || app?.selectedIssue || null;

            // additional context data
            this.contextData.issueCount = app?.issuesCache?.size || 0;

            // If changed, optionally auto-fetch suggestions
            if (prev.ctx !== this.currentContext || prev.key !== this.activeIssueKey) {
                // Auto-refresh suggestions when context changes (do not auto-open unless enabled)
                this.getSuggestions().then(() => {
                    if (this.autoOpen) {
                        this.renderSuggestionsInSidebar(true);
                    }
                }).catch(() => { });
            }
        }

        async getSuggestions() {
            try {
                const payload = {
                    context: this.currentContext,
                    issue_key: this.activeIssueKey,
                    context_data: this.contextData
                };

                const resp = await fetch('/api/flowing/contextual-suggestions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!resp.ok) {
                    console.warn('FlowingContext.getSuggestions: HTTP', resp.status);
                    this.suggestions = [];
                    return this.suggestions;
                }

                const data = await resp.json();
                this.suggestions = data.suggestions || [];
                this.suggestionsContext = data.context || this.currentContext;
                return this.suggestions;
            } catch (e) {
                console.error('FlowingContext.getSuggestions error', e);
                this.suggestions = [];
                return [];
            }
        }

        renderSuggestionsInSidebar(openNow = false) {
            const sidebar = document.getElementById('rightSidebar');
            if (!sidebar) return;

            // Apply FlowingContext specific class for compact styling
            sidebar.classList.add('flowing-context-sidebar');

            // Replace entire content of sidebar with suggestions strip + results
            if (openNow) sidebar.style.display = 'block';
            sidebar.innerHTML = '';

            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn-close-sidebar';
            closeBtn.id = 'closeSidebarBtn';
            closeBtn.textContent = '✕';
            closeBtn.addEventListener('click', () => {
                sidebar.style.display = 'none';
            });
            sidebar.appendChild(closeBtn);

            // Header area (narrower to match compact sidebar)
            const header = document.createElement('div');
            header.className = 'flowing-suggestions-header';
            header.innerHTML = `<div class="flowing-suggestions-header-inner">
                <div class="flowing-suggestions-title">💡 Flowing Suggestions</div>
                <div class="flowing-suggestions-context">Context: ${this.suggestionsContext || this.currentContext}</div>
            </div>`;
            sidebar.appendChild(header);

            // Suggestions bar (horizontal scrollable)
            const bar = document.createElement('div');
            bar.className = 'flowing-suggestions-bar';

            if (!this.suggestions || this.suggestions.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'flowing-suggestions-empty';
                empty.textContent = 'No suggestions available for this context.';
                bar.appendChild(empty);
            } else {
                this.suggestions.forEach(s => {
                    const card = document.createElement('div');
                    card.className = 'suggestion-card';
                    card.innerHTML = `
                        <div class="suggestion-card-inner">
                            <div class="suggestion-card-title">${s.icon || '💡'} ${s.title}</div>
                            <div class="suggestion-card-priority">#${s.priority || 0}</div>
                        </div>
                        <div class="suggestion-card-desc">${s.description || ''}</div>
                        <div class="suggestion-card-footer">
                            <button class="flowing-exec-btn" data-action="${s.action || ''}" data-id="${s.id || ''}">Ejecutar</button>
                        </div>
                    `;
                    bar.appendChild(card);
                });
            }

            sidebar.appendChild(bar);

            // Results container
            const results = document.createElement('div');
            results.id = 'flowingSuggestionsResults';
            results.className = 'flowing-suggestions-results';
            results.innerHTML = '<p class="flowing-suggestions-placeholder">Ejecuta una sugerencia para ver resultados aquí.</p>';
            sidebar.appendChild(results);

            // Wire execute buttons
            sidebar.querySelectorAll('.flowing-exec-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = btn.dataset.action;
                    const id = btn.dataset.id;
                    this.executeSuggestion(action, id);
                });
            });
        }

        // Create a small floating bulb button that toggles the FlowingContext sidebar
        createToggleButton() {
            if (document.getElementById('fcToggleBtn')) return;

            const btn = document.createElement('button');
            btn.id = 'fcToggleBtn';
            btn.title = 'Flowing Suggestions';
            btn.innerHTML = '💡';
            // Move bulb to top-right and make it visually compact via CSS class
            btn.className = 'fc-toggle-btn';

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleBar();
            });

            document.body.appendChild(btn);

            // bulb positioning removed — let CSS/theme manage placement
        }

        toggleBar() {
            const sidebar = document.getElementById('rightSidebar');
            if (!sidebar) return;
            const isOpen = window.getComputedStyle(sidebar).display !== 'none';
            if (isOpen) {
                sidebar.style.display = 'none';
            } else {
                // Ensure we have fresh suggestions before opening
                this.getSuggestions().then(() => this.renderSuggestionsInSidebar(true)).catch(() => this.renderSuggestionsInSidebar(true));
            }
        }

        async executeSuggestion(action, suggestionId) {
            const resultsEl = document.getElementById('flowingSuggestionsResults');
            if (!resultsEl) return;

            resultsEl.innerHTML = '<p class="flowing-processing">Procesando... ⏳</p>';

            try {
                let endpoint = '';
                let payload = {};

                // Build mapping for common actions
                if (action === 'semantic_search') {
                    endpoint = '/api/flowing/semantic-search';
                    payload = { query: '', issue_key: this.activeIssueKey, limit: 8 };
                } else if (action === 'detect_duplicates') {
                    endpoint = '/api/flowing/detect-duplicates';
                    payload = { issue_key: this.activeIssueKey, limit: 8 };
                } else if (action === 'suggest_response') {
                    endpoint = '/api/flowing/suggest-response';
                    payload = { issue_key: this.activeIssueKey };
                } else {
                    // Generic: call contextual suggestions execute endpoint if exists
                    endpoint = `/api/flowing/execute/${encodeURIComponent(action)}`;
                    payload = { issue_key: this.activeIssueKey, suggestion_id: suggestionId };
                }

                const resp = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!resp.ok) {
                    resultsEl.innerHTML = `<p class="flowing-error">Error: HTTP ${resp.status}</p>`;
                    return;
                }

                const data = await resp.json();
                // Simple render of JSON or expected shapes
                if (data.results || data.duplicates || data.suggestions) {
                    const list = data.results || data.duplicates || data.suggestions;
                    resultsEl.innerHTML = '';
                    list.forEach(item => {
                        const itemEl = document.createElement('div');
                        itemEl.className = 'flowing-result-item';
                        itemEl.innerHTML = `<div class="flowing-result-item-title">${item.key || item.title || item.id || ''} <span class="flowing-result-item-sim">${item.similarity ? ' · ' + (Math.round(item.similarity * 100)) + '%' : ''}</span></div><div class='flowing-result-item-body'>${item.summary || item.description || JSON.stringify(item).slice(0, 200)}</div>`;
                        resultsEl.appendChild(itemEl);
                    });
                } else {
                    resultsEl.innerHTML = `<pre class="flowing-json">${JSON.stringify(data, null, 2)}</pre>`;
                }
            } catch (e) {
                console.error('executeSuggestion error', e);
                resultsEl.innerHTML = `<p class="flowing-error">Error ejecutando sugerencia</p>`;
            }
        }
    }

    // Instantiate and expose
    window.FlowingContext = window.FlowingContext || new FlowingContextImpl();
})();
