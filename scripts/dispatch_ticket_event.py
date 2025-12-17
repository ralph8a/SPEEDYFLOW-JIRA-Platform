from playwright.sync_api import sync_playwright
import time
FRONTEND = 'http://127.0.0.1:5005/'
def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(FRONTEND, timeout=15000)
        # wait for ml-client to be ready (or up to 10s)
        try:
            page.wait_for_function("() => typeof window.mlClient !== 'undefined'", timeout=10000)
        except Exception:
            # continue even if mlClient not present quickly
            pass
        console_msgs = []
        page.on('console', lambda msg: console_msgs.append((msg.type, msg.text)))
        ticket = {
            'key': 'PROJ-E2E-1',
            'fields': {
                'summary': 'Error crítico: fallo en login grupal',
                'description': 'Usuarios reportan que no pueden iniciar sesión desde ayer, varios errores 500 en auth-service'
            }
        }
        # Wait for app modules to initialize (flowingFooter or commentSuggestionsUI) before injecting state
        try:
            page.wait_for_function("() => typeof window.flowingFooter !== 'undefined' || typeof window.commentSuggestionsUI !== 'undefined'", timeout=8000)
        except Exception:
            # Not critical, proceed anyway
            pass
        # (Will populate client-side state and dispatch after we detect a real ticket key)
        # Attempt to click a real issue details button in the UI (simulate real user selection)
        try:
            # Wait for any issue card/details button to appear
            sel = None
            for candidate in [
                '.issue-details-btn',
                '.btn-view-details',
                '[data-issue-key] .issue-details-btn',
                '.issue-card .issue-details-btn',
                '.kanban-item',
                '.ticket-card',
                '.issue-card'
            ]:
                try:
                    page.wait_for_selector(candidate, timeout=3000)
                    sel = candidate
                    break
                except Exception:
                    continue
            if sel:
                el = page.query_selector(sel)
                if el:
                    try:
                        el.click(timeout=2000)
                        print('dispatch_ticket_event: clicked element for selector', sel)
                    except Exception:
                        # fallback to dispatching click via DOM
                        page.evaluate('el => { try { el.dispatchEvent(new MouseEvent("click", {bubbles:true,cancelable:true})); } catch(e){} }', el)
                        print('dispatch_ticket_event: dispatched click event for selector', sel)
                    # Try to extract a real ticket key from the clicked element or its ancestors
                    real_key = page.evaluate('''(el) => {
                        try {
                            const node = el.closest('[data-issue-key]') || el.closest('[data-key]') || el;
                            return node.getAttribute('data-issue-key') || node.getAttribute('data-key') || null;
                        } catch(e) { return null; }
                    }''', el)
                    if real_key:
                        ticket['key'] = real_key
                        print('dispatch_ticket_event: detected ticket key', real_key)
                        # Populate client-side state so selection handlers can find the ticket and dispatch ticketSelected
                        try:
                            page.evaluate('''(key) => {
                                try {
                                    // Build ticket object from app caches if available
                                    window.state = window.state || {};
                                    window.app = window.app || {};
                                    let t = null;
                                    try {
                                        if (window.app.issuesCache && typeof window.app.issuesCache.get === 'function') t = window.app.issuesCache.get(key);
                                    } catch(e) {}
                                    if (!t && window.app.issuesCache && window.app.issuesCache[key]) t = window.app.issuesCache[key];
                                    if (!t && Array.isArray(window.state.issues)) t = window.state.issues.find(i => i.key === key);
                                    if (!t) t = { key: key, fields: { summary: '', description: '' } };
                                    window.state.selectedIssue = key;
                                    if (!window.state.issues) window.state.issues = [];
                                    if (!window.state.issues.find(i => i.key === key)) window.state.issues.push(t);
                                    // Try to open balanced view if available
                                    if (window.flowingFooter && typeof window.flowingFooter.switchToBalancedView === 'function') {
                                        try { window.flowingFooter.switchToBalancedView(key); } catch(e) {}
                                    }
                                    // Dispatch event with the ticket object
                                    document.dispatchEvent(new CustomEvent('ticketSelected', { detail: { ticket: t } }));
                                } catch (err) { console.warn('dispatch_ticket_event dispatch error', err); }
                            }''', real_key)
                            print('dispatch_ticket_event: dispatched ticketSelected for', real_key)
                        except Exception as e:
                            print('dispatch_ticket_event dispatch exception', e)
            else:
                print('dispatch_ticket_event: no ticket element found to click')
            # give UI a moment to respond to the click
            page.wait_for_timeout(700)
        except Exception as e:
            print('dispatch_ticket_event click error', e)
        # give the page a moment to initialize modules, then force-init ML UI and request suggestions
        page.wait_for_timeout(800)
        try:
            page.evaluate('''(t) => {
                try {
                    if (window.commentSuggestionsUI && typeof window.commentSuggestionsUI.init === 'function') {
                        console.log('Test helper: calling commentSuggestionsUI.init()');
                        try { window.commentSuggestionsUI.init(); } catch(e) { console.warn('init error', e); }
                    }
                    if (window.commentSuggestionsUI && typeof window.commentSuggestionsUI.showSuggestionsForTicket === 'function') {
                        console.log('Test helper: calling showSuggestionsForTicket');
                        try { window.commentSuggestionsUI.showSuggestionsForTicket(t); } catch(e) { console.warn('showSuggestions error', e); }
                    }
                } catch (e) { console.error('Test helper invoke error', e); }
            }''', ticket)
        except Exception:
            pass
        # If commentSuggestionsUI isn't present, try injecting the module script and then call it
        try:
            has_ui = page.evaluate('() => typeof window.commentSuggestionsUI !== "undefined"')
            if not has_ui:
                print('Injecting ml-comment-suggestions module script into page')
                page.evaluate('''() => {
                    return new Promise((resolve) => {
                        try {
                            const existing = document.querySelector('script[data-injected="ml-comment-suggestions"]');
                            if (existing) { resolve(true); return; }
                            const s = document.createElement('script');
                            s.src = '/static/js/modules/ml-comment-suggestions.js?v=' + Date.now();
                            s.setAttribute('data-injected', 'ml-comment-suggestions');
                            s.onload = () => { console.log('Injected ml-comment-suggestions loaded'); resolve(true); };
                            s.onerror = () => { console.warn('Injected ml-comment-suggestions failed to load'); resolve(false); };
                            document.head.appendChild(s);
                        } catch (e) { console.warn('Injection error', e); resolve(false); }
                    });
                }''')
                # wait up to 5s for the module to initialize and set window.commentSuggestionsUI
                try:
                    page.wait_for_function("() => typeof window.commentSuggestionsUI !== 'undefined'", timeout=5000)
                except Exception:
                    pass
                # try to init/show again once available
                page.evaluate('''(t) => {
                    try {
                        if (window.commentSuggestionsUI && typeof window.commentSuggestionsUI.init === 'function') {
                            window.commentSuggestionsUI.init();
                        }
                        if (window.commentSuggestionsUI && typeof window.commentSuggestionsUI.showSuggestionsForTicket === 'function') {
                            window.commentSuggestionsUI.showSuggestionsForTicket(t);
                        }
                    } catch (e) { console.warn('Second invoke error', e); }
                }''', ticket)
        except Exception:
            pass
        # wait for suggestions panel to appear
        try:
            # Debug: check if commentSuggestionsUI exists
            exists = page.evaluate('() => typeof window.commentSuggestionsUI')
            print('commentSuggestionsUI type:', exists)
            # If ML UI isn't available, fetch suggestions from backend and inject into footer/context area
            if exists == 'undefined':
                try:
                    # Fetch suggestions from backend and push them into FlowingContext if available
                    page.evaluate('''(t) => {
                        (async () => {
                            try {
                                const payload = { summary: t.fields?.summary || t.summary || '', description: t.fields?.description || t.description || '', all_comments: [] };
                                const r = await fetch('/api/ml/comments/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                                const data = await r.json().catch(()=>null);
                                if (!data || !data.suggestions) return;
                                // If FlowingContext exists, map suggestions into its expected structure and render in sidebar
                                if (window.FlowingContext && typeof window.FlowingContext.renderSuggestionsInSidebar === 'function') {
                                    try {
                                        window.FlowingContext.suggestions = (data.suggestions || []).map((s, i) => ({
                                            id: s.id || ('sugg-' + i),
                                            title: (s.type || '').toUpperCase(),
                                            description: s.text || s.description || '',
                                            action: s.action || 'suggest_response',
                                            priority: Math.round((s.confidence || 0.5) * 10)
                                        }));
                                        window.FlowingContext.suggestionsContext = 'ml_comments';
                                        // Ensure FlowingContext has activeIssueKey set
                                        if (!window.FlowingContext.activeIssueKey && t.key) window.FlowingContext.activeIssueKey = t.key;
                                        window.FlowingContext.renderSuggestionsInSidebar(true);
                                        return;
                                    } catch (e) { console.warn('FlowingContext render error', e); }
                                }
                                // If FlowingContext not available, do nothing (no footer injection per new policy)
                            } catch (e) { console.warn('Injection fetch error', e); }
                        })();
                    }''', ticket)
                except Exception:
                    pass
            page.wait_for_selector('.ml-comment-suggestions .suggestion-card', timeout=10000)
            cards = page.query_selector_all('.ml-comment-suggestions .suggestion-card')
            print('Found suggestion cards:', len(cards))
            for i, c in enumerate(cards[:5]):
                print('--- Card', i)
                print(c.inner_text())
        except Exception as e:
            print('No suggestion cards found or timeout:', e)
            print('Console messages:')
            for t, m in console_msgs:
                print(t, m)
        browser.close()
if __name__ == '__main__':
    run()
