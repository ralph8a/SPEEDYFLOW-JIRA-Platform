// commentsView.js
// Lógica desacoplada para comentarios en el footer y vista balanceada

export async function loadCommentsForBalancedView(issueKey) {
    // Ensure comments module is loaded: dynamically load if missing
    if (!window.commentsModule || typeof window.commentsModule.loadIssueComments !== 'function') {
        try {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = '/static/js/modules/comments.js?v=' + Date.now();
                script.onload = () => resolve();
                script.onerror = (e) => reject(e);
                document.head.appendChild(script);
            });
        } catch (e) {
            console.warn('Could not dynamically load comments module:', e);
        }
    }

    if (window.commentsModule && typeof window.commentsModule.loadIssueComments === 'function') {
        return window.commentsModule.loadIssueComments(issueKey, { listSelector: '.comments-section .comments-list', countSelector: '#commentCountFooter', order: 'desc' });
    }

    // Final fallback: show unavailable message
    const commentsContainer = document.querySelector('.comments-section .comments-list');
    if (commentsContainer) commentsContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">Comments unavailable</p>';
}

export function adjustCommentsHeight() {
    try {
        const container = document.getElementById('balancedContentContainer');
        if (!container) return;
        const leftCol = container.querySelector('.left-column');
        const rightCol = container.querySelector('.right-column');
        if (!leftCol || !rightCol) return;
        const commentsSection = rightCol.querySelector('.comments-section');
        const composer = rightCol.querySelector('.comment-composer');
        if (!commentsSection) return;

        // Compute available height: left column height minus paddings and composer height
        const leftHeight = leftCol.getBoundingClientRect().height;
        const composerHeight = composer ? composer.getBoundingClientRect().height : 0;
        const paddingReserve = 40; // some breathing room
        const maxH = Math.max(120, Math.floor(leftHeight - composerHeight - paddingReserve));
        commentsSection.style.maxHeight = `${maxH}px`;
        commentsSection.style.overflowY = 'auto';
        // Also ensure comments list scrolls newest-first properly
        const list = commentsSection.querySelector('.comments-list');
        if (list) list.style.display = 'flex';
        console.log('🔧 Adjusted commentsSection maxHeight to', maxH);
    } catch (e) {
        console.warn('Could not adjust comments height:', e);
    }
}

if (typeof window !== 'undefined') {
    window.loadCommentsForBalancedView = loadCommentsForBalancedView;
    window.adjustCommentsHeight = adjustCommentsHeight;
}
// commentsView.js
// Lógica desacoplada para cargar y renderizar comentarios en la vista balanceada

export function loadCommentsForBalancedView(issueKey, containerSelector = '#balancedContentContainer') {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    // Aquí iría la lógica de carga/renderizado de comentarios para la vista balanceada
    // container.innerHTML += ...
}

if (typeof window !== 'undefined') {
    window.loadCommentsForBalancedView = loadCommentsForBalancedView;
}
