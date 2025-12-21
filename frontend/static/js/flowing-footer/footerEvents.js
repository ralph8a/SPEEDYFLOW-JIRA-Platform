// footerEvents.js
// Handlers desacoplados para eventos de UI del footer

export function attachFooterEventListeners() {
    // Toggle button - Integrado con FlowingContext para sugerencias de IA
    try {
        const hit = document.getElementById('flowingToggleHit');
        if (hit) {
            let newHit = hit;
            try {
                if (typeof hit.cloneNode === 'function') {
                    newHit = hit.cloneNode(true);
                    if (hit.parentNode) { hit.parentNode.replaceChild(newHit, hit); }
                }
            } catch (e) { /* fallback to using original hit */ }
            const btn = newHit.querySelector('#flowingToggleBtn') || newHit.querySelector('button');
            if (btn) this.toggleBtn = btn;
            try {
                newHit.setAttribute('role', 'button');
                newHit.setAttribute('tabindex', '0');
                newHit.setAttribute('aria-label', 'Toggle Flowing footer');
                if (this.toggleBtn) this.toggleBtn.setAttribute('aria-controls', 'flowingContent');
                if (this.toggleBtn) this.toggleBtn.setAttribute('aria-expanded', String(!!this.isExpanded));
                if (this.toggleBtn) this.toggleBtn.textContent = this.isExpanded ? '▴' : '▾';
            } catch (e) { }
            const activateToggle = (e) => {
                this.toggle();
                try { if (window.FlowingAudio && window.FlowingAudio.playAlert) { window.FlowingAudio.playAlert('beep'); } } catch (ee) { }
                try { if (this.toggleBtn) { this.toggleBtn.textContent = this.isExpanded ? '▴' : '▾'; this.toggleBtn.setAttribute('aria-expanded', String(!!this.isExpanded)); } } catch (err) { }
                if (window.FlowingContext && this.isExpanded) this.showContextualSuggestions();
            };
            if (typeof newHit.addEventListener === 'function') {
                newHit.addEventListener('click', activateToggle);
                newHit.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        activateToggle(ev);
                    }
                });
            }
        } else if (this.toggleBtn) {
            try {
                const newToggle = (typeof this.toggleBtn.cloneNode === 'function') ? this.toggleBtn.cloneNode(true) : this.toggleBtn;
                if (this.toggleBtn.parentNode) { this.toggleBtn.parentNode.replaceChild(newToggle, this.toggleBtn); }
                this.toggleBtn = newToggle;
            } catch (e) { /* ignore */ }
            try {
                this.toggleBtn.setAttribute('role', 'button');
                this.toggleBtn.setAttribute('tabindex', '0');
                this.toggleBtn.setAttribute('aria-controls', 'flowingContent');
                this.toggleBtn.setAttribute('aria-expanded', String(!!this.isExpanded));
                this.toggleBtn.textContent = this.isExpanded ? '▴' : '▾';
            } catch (e) { }
            const activateBtn = (ev) => {
                this.toggle();
                try { if (window.FlowingAudio && window.FlowingAudio.playAlert) { window.FlowingAudio.playAlert('beep'); } } catch (ee) { }
                try { if (this.toggleBtn) { this.toggleBtn.textContent = this.isExpanded ? '▴' : '▾'; this.toggleBtn.setAttribute('aria-expanded', String(!!this.isExpanded)); } } catch (err) { }
                if (window.FlowingContext && this.isExpanded) this.showContextualSuggestions();
            };
            if (this.toggleBtn && typeof this.toggleBtn.addEventListener === 'function') {
                this.toggleBtn.addEventListener('click', activateBtn);
                this.toggleBtn.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        activateBtn(ev);
                    }
                });
            }
        }
    } catch (e) { console.warn('Could not attach toggleBtn listener', e); }
    // Send button
    if (this.sendBtn) {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
    }
    // Global ESC handler to collapse Flowing footer
    try {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
                if (this.isExpanded) {
                    this.collapse();
                }
            }
        });
    } catch (e) { /* ignore */ }
    // Optimizar scroll y resize con debounce/throttle/raf
    const perf = window.performanceUtils || {};
    if (typeof window.addEventListener === 'function') {
        window.addEventListener('scroll', perf.throttle ? perf.throttle(() => {
            if (this.footer && typeof this.footer.classList === 'object') {
                if (window.scrollY > 100) this.footer.classList.add('scrolled');
                else this.footer.classList.remove('scrolled');
            }
        }, 200) : () => { }, { passive: true });
        window.addEventListener('resize', perf.debounce ? perf.debounce(() => {
            if (typeof this.adjustContentPadding === 'function') {
                if (perf.raf) perf.raf(this.adjustContentPadding.bind(this))(this.isExpanded ? false : true);
                else this.adjustContentPadding(this.isExpanded ? false : true);
            }
        }, 250) : () => { });
    }
}

if (typeof window !== 'undefined') {
    window.attachFooterEventListeners = attachFooterEventListeners;
}
// footerEvents.js
// Handlers y lógica de eventos para el footer

export function attachFooterEventListeners(footerInstance) {
    // Aquí iría la lógica para asignar listeners de UI y accesibilidad
    // footerInstance es la instancia de FlowingFooter
}

if (typeof window !== 'undefined') {
    window.attachFooterEventListeners = attachFooterEventListeners;
}
