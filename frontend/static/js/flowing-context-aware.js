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
        // Local fallback suggestions (used when server contextual-suggestions fails)
        this.LOCAL_SUGGESTIONS = {
            'kanban_board': [
                { id: 'similar_tickets_board', icon: '🔍', title: 'Buscar tickets similares', description: 'Buscar casos parecidos en esta columna', action: 'semantic_search', priority: 1 }
            ],
            'right_sidebar': [
                { id: 'summarize_conversation', icon: '📝', title: 'Resumir conversación', description: 'Generar resumen de la conversación', action: 'summarize_conversation', priority: 1 },
                { id: 'suggest_detailed_response', icon: '💬', title: 'Sugerir respuesta', description: 'Generar una respuesta basada en el contexto', action: 'suggest_response', priority: 2 }
            ],
            'kanban_card': [
                { id: 'similar_tickets_card', icon: '🔍', title: 'Ver tickets similares', description: 'Buscar casos parecidos a este ticket', action: 'semantic_search', priority: 1 }
            ],
            'list_view': [
                { id: 'bulk_similar_search', icon: '🔍', title: 'Búsqueda en lote', description: 'Buscar patrones en los tickets visibles', action: 'semantic_search', priority: 1 }
            ]
        };
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
                // Build a minimal, serializable payload to avoid sending complex circular objects
                const contextDataMinimal = {};
                try {
                    if (this.contextData && typeof this.contextData === 'object') {
                        contextDataMinimal.comment_count = this.contextData.comment_count || this.contextData.commentCount || 0;
                        contextDataMinimal.issue_count = this.contextData.issueCount || 0;
                        // add other small scalar fields if available
                        if (this.contextData.status) contextDataMinimal.status = this.contextData.status;
                    }
                } catch (e) {
                    console.warn('FlowingContext: could not build minimal context_data', e);
                }
                const payload = {
                    context: this.currentContext,
                    issue_key: this.activeIssueKey,
                    context_data: contextDataMinimal
                };
                console.debug('FlowingContext.getSuggestions payload:', payload);
                const resp = await fetch('/api/flowing/contextual-suggestions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!resp.ok) {
                    console.warn('FlowingContext.getSuggestions: HTTP', resp.status);
                    // Fallback to local suggestions mapping to keep UI functional
                    const fall = this.LOCAL_SUGGESTIONS[this.currentContext] || [];
                    this.suggestions = fall.map(s => Object.assign({}, s));
                    this.suggestionsContext = this.currentContext;
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
                            <button class="flowing-save-btn" data-action="${s.action || ''}" data-id="${s.id || ''}">Guardar</button>
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
            // Wire execute and save buttons
            sidebar.querySelectorAll('.flowing-exec-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = btn.dataset.action;
                    const id = btn.dataset.id;
                    this.executeSuggestion(action, id);
                });
            });
            sidebar.querySelectorAll('.flowing-save-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const card = btn.closest('.suggestion-card');
                    const title = card.querySelector('.suggestion-card-title')?.textContent || '';
                    const desc = card.querySelector('.suggestion-card-desc')?.textContent || '';
                    const payload = {
                        title: title.replace(/^\S+\s*/, ''), // naive strip icon
                        description: desc,
                        icon: (card.querySelector('.suggestion-card-title')?.textContent || '').trim().slice(0, 2),
                        action: btn.dataset.action || '',
                        priority: parseInt(card.querySelector('.suggestion-card-priority')?.textContent?.replace('#', '') || '0', 10)
                    };
                    this.saveSuggestion(payload).then(res => {
                        if (res && res.success) {
                            // refresh saved suggestions
                            this.loadSavedSuggestions();
                        }
                    });
                });
            });
            // Render saved suggestions area after suggestions bar
            const savedHeader = document.createElement('div');
            savedHeader.className = 'flowing-saved-header';
            savedHeader.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><strong>Saved Suggestions</strong><button id="addSavedSuggestionBtn" class="btn-small">+ Add</button></div>`;
            sidebar.appendChild(savedHeader);
            const savedList = document.createElement('div');
            savedList.id = 'flowingSavedList';
            savedList.className = 'flowing-saved-list';
            sidebar.appendChild(savedList);
            document.getElementById('addSavedSuggestionBtn')?.addEventListener('click', () => this.showNewSavedForm());
            // Load saved suggestions
            this.loadSavedSuggestions();
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
        // Saved suggestions storage API
        async loadSavedSuggestions() {
            try {
                const resp = await fetch('/api/flowing-storage/saved-suggestions', { method: 'GET' });
                if (!resp.ok) return;
                const data = await resp.json();
                const list = data.items || [];
                const container = document.getElementById('flowingSavedList');
                if (!container) return;
                container.innerHTML = '';
                list.forEach(item => {
                    const el = document.createElement('div');
                    el.className = 'flowing-saved-item';
                    el.dataset.id = item.id;
                    el.innerHTML = `<div class="saved-item-main"><span class="saved-icon">${item.icon || '💡'}</span><strong class="saved-title">${item.title}</strong> <span class="saved-priority">#${item.priority || 0}</span></div>
                        <div class="saved-desc">${item.description || ''}</div>
                        <div class="saved-actions"><button class="saved-edit-btn">Edit</button><button class="saved-delete-btn">Delete</button></div>`;
                    container.appendChild(el);
                });
                container.querySelectorAll('.saved-edit-btn').forEach(btn => btn.addEventListener('click', (e) => {
                    const id = e.target.closest('.flowing-saved-item').dataset.id;
                    this.showEditSavedForm(id);
                }));
                container.querySelectorAll('.saved-delete-btn').forEach(btn => btn.addEventListener('click', async (e) => {
                    const id = e.target.closest('.flowing-saved-item').dataset.id;
                    await fetch(`/api/flowing-storage/saved-suggestions/${encodeURIComponent(id)}`, { method: 'DELETE' });
                    this.loadSavedSuggestions();
                }));
            } catch (e) { console.warn('loadSavedSuggestions error', e); }
        }
        async saveSuggestion(payload) {
            try {
                const resp = await fetch('/api/flowing-storage/saved-suggestions', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                if (!resp.ok) return null;
                return await resp.json();
            } catch (e) { console.warn('saveSuggestion error', e); return null; }
        }
        showNewSavedForm() {
            const sidebar = document.getElementById('rightSidebar');
            if (!sidebar) return;
            const form = document.createElement('div');
            form.className = 'flowing-saved-form';
            form.innerHTML = `
                <label>Title: <input class="fs-title" /></label>
                <label>Description: <textarea class="fs-desc"></textarea></label>
                <label>Icon: <input class="fs-icon" value="💡" /></label>
                <label>Action: <input class="fs-action" /></label>
                <label>Priority: <input class="fs-priority" type="number" value="0" /></label>
                <div style="display:flex;gap:8px;margin-top:8px"><button class="fs-save">Save</button><button class="fs-cancel">Cancel</button></div>
            `;
            sidebar.appendChild(form);
            form.querySelector('.fs-cancel').addEventListener('click', () => form.remove());
            form.querySelector('.fs-save').addEventListener('click', async () => {
                const payload = {
                    title: form.querySelector('.fs-title').value,
                    description: form.querySelector('.fs-desc').value,
                    icon: form.querySelector('.fs-icon').value,
                    action: form.querySelector('.fs-action').value,
                    priority: parseInt(form.querySelector('.fs-priority').value || '0', 10)
                };
                await this.saveSuggestion(payload);
                form.remove();
                this.loadSavedSuggestions();
            });
        }
        showEditSavedForm(itemId) {
            // load item
            fetch('/api/flowing-storage/saved-suggestions').then(r => r.json()).then(data => {
                const item = (data.items || []).find(i => i.id === itemId);
                if (!item) return;
                const sidebar = document.getElementById('rightSidebar');
                const form = document.createElement('div');
                form.className = 'flowing-saved-form';
                form.innerHTML = `
                    <label>Title: <input class="fs-title" value="${(item.title || '').replace(/"/g, '&quot;')}" /></label>
                    <label>Description: <textarea class="fs-desc">${(item.description || '').replace(/</g, '&lt;')}</textarea></label>
                    <label>Icon: <input class="fs-icon" value="${item.icon || '💡'}" /></label>
                    <label>Action: <input class="fs-action" value="${item.action || ''}" /></label>
                    <label>Priority: <input class="fs-priority" type="number" value="${item.priority || 0}" /></label>
                    <div style="display:flex;gap:8px;margin-top:8px"><button class="fs-update">Update</button><button class="fs-cancel">Cancel</button></div>
                `;
                sidebar.appendChild(form);
                form.querySelector('.fs-cancel').addEventListener('click', () => form.remove());
                form.querySelector('.fs-update').addEventListener('click', async () => {
                    const payload = {
                        title: form.querySelector('.fs-title').value,
                        description: form.querySelector('.fs-desc').value,
                        icon: form.querySelector('.fs-icon').value,
                        action: form.querySelector('.fs-action').value,
                        priority: parseInt(form.querySelector('.fs-priority').value || '0', 10)
                    };
                    await fetch(`/api/flowing-storage/saved-suggestions/${encodeURIComponent(itemId)}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                    });
                    form.remove();
                    this.loadSavedSuggestions();
                });
            }).catch(e => console.warn(e));
        }
    }
    // Instantiate and expose
    window.FlowingContext = window.FlowingContext || new FlowingContextImpl();
})();
