// Contact card module
// Centralized UI component to show a compact contact card in the Balanced view.
// Exports: showContactCard(contact, opts) -> HTMLElement|null, hideContactCard()

export function hideContactCard() {
    try {
        const existing = document.getElementById('flowingContactCard');
        if (!existing) return;
        if (typeof existing.remove === 'function') existing.remove();
        else if (existing.parentNode) existing.parentNode.removeChild(existing);
    } catch (e) { /* ignore */ }
}

export async function showContactCard(contact = {}, opts = {}) {
    try {
        // Allow caller to provide a target container (element or selector). Fall back to default root.
        let container = null;
        if (opts && opts.container) container = opts.container;
        else if (opts && opts.containerSelector) {
            try { container = document.querySelector(opts.containerSelector); } catch (e) { /* ignore */ }
        }
        if (!container) container = document.getElementById('balancedContentContainer') || document.querySelector('.flowing-v2-root') || document.body || document.documentElement;
        if (!container) return null;

        // remove any existing
        hideContactCard();

        const el = document.createElement('div');
        el.id = 'flowingContactCard';
        el.className = 'flowing-contact-card';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-label', contact.name ? `${contact.name} contact card` : 'Contact card');

        // Left: avatar
        const left = document.createElement('div'); left.className = 'flowing-contact-left';
        const avatar = document.createElement('img'); avatar.className = 'flowing-contact-avatar';
        avatar.alt = contact.name ? `${contact.name} avatar` : 'avatar';
        avatar.src = contact.avatarUrl || contact.avatar || '';
        left.appendChild(avatar);

        // Main info
        const main = document.createElement('div'); main.className = 'flowing-contact-main';
        const nameEl = document.createElement('div'); nameEl.className = 'flowing-contact-name'; nameEl.textContent = contact.name || contact.displayName || '';
        const titleEl = document.createElement('div'); titleEl.className = 'flowing-contact-title'; titleEl.textContent = contact.title || '';
        const orgEl = document.createElement('div'); orgEl.className = 'flowing-contact-org'; orgEl.textContent = contact.organization || contact.org || '';
        const emailEl = document.createElement('a'); emailEl.className = 'flowing-contact-email'; emailEl.href = contact.email ? `mailto:${contact.email}` : '#'; emailEl.textContent = contact.email || '';
        const phoneEl = document.createElement('a'); phoneEl.className = 'flowing-contact-phone'; phoneEl.href = contact.phone ? `tel:${contact.phone}` : '#'; phoneEl.textContent = contact.phone || '';

        main.appendChild(nameEl);
        if (titleEl.textContent) main.appendChild(titleEl);
        if (orgEl.textContent) main.appendChild(orgEl);
        if (emailEl.textContent) main.appendChild(emailEl);
        if (phoneEl.textContent) main.appendChild(phoneEl);

        // Actions
        const actions = document.createElement('div'); actions.className = 'flowing-contact-actions';
        const emailBtn = document.createElement('button'); emailBtn.type = 'button'; emailBtn.className = 'flowing-contact-email-btn'; emailBtn.textContent = 'Email';
        const callBtn = document.createElement('button'); callBtn.type = 'button'; callBtn.className = 'flowing-contact-call-btn'; callBtn.textContent = 'Call';
        const closeBtn = document.createElement('button'); closeBtn.type = 'button'; closeBtn.className = 'flowing-contact-close'; closeBtn.setAttribute('aria-label', 'Close contact'); closeBtn.textContent = '×';

        actions.appendChild(emailBtn); actions.appendChild(callBtn); actions.appendChild(closeBtn);

        el.appendChild(left); el.appendChild(main); el.appendChild(actions);

        // Insert into a provided container if specified, otherwise insert near description if present
        if (opts && (opts.container || opts.containerSelector)) {
            try { container.appendChild(el); } catch (e) { try { container.insertBefore(el, container.firstChild); } catch (__) { /* ignore */ } }
        } else {
            const desc = container.querySelector('.ticket-description-section') || container.querySelector('.ticket-description-field') || null;
            if (desc && desc.parentNode) desc.parentNode.insertBefore(el, desc.nextSibling);
            else container.insertBefore(el, container.firstChild);
        }

        emailBtn.addEventListener('click', () => {
            try {
                if (contact.email) {
                    window.location.href = `mailto:${contact.email}`;
                    if (typeof opts.onContactAction === 'function') opts.onContactAction('email', contact);
                }
            } catch (e) { /* ignore */ }
        });

        callBtn.addEventListener('click', () => {
            try {
                if (contact.phone) {
                    window.location.href = `tel:${contact.phone}`;
                    if (typeof opts.onContactAction === 'function') opts.onContactAction('call', contact);
                }
            } catch (e) { /* ignore */ }
        });

        closeBtn.addEventListener('click', () => {
            try { hideContactCard(); } catch (e) { /* ignore */ }
            if (typeof opts.onClose === 'function') opts.onClose();
        });

        // Optional auto-close
        if (opts.autoClose) {
            setTimeout(() => { try { hideContactCard(); } catch (e) { /* ignore */ } }, typeof opts.autoClose === 'number' ? opts.autoClose : 5000);
        }

        return el;
    } catch (e) {
        console.warn('showContactCard error', e);
        return null;
    }
}

export default {
    showContactCard,
    hideContactCard
};

// Auto-register with FlowingV2 if available
try {
    if (typeof window !== 'undefined' && window.flowingV2 && typeof window.flowingV2.registerModule === 'function') {
        try { window.flowingV2.registerModule('contactCard', { showContactCard, hideContactCard }); } catch (e) { /* ignore */ }
    }
} catch (e) { /* ignore */ }
