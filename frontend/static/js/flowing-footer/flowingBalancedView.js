// flowingBalancedView.js
// Render y lógica de la vista balanceada del footer Flowing MVP


export function renderBalancedView({
    containerId = 'balancedContentContainer',
} = {}) {
    const balancedView = document.createElement('div');
    balancedView.id = 'balancedView';
    balancedView.className = 'flowing-view balanced-view';
    balancedView.style.display = 'none';
    balancedView.innerHTML = `<div id="${containerId}"></div>`;

    // Lógica asociada a la vista balanceada
    const getContainer = () => balancedView.querySelector(`#${containerId}`);

    balancedView.setContent = function (html) {
        const c = getContainer();
        if (c) c.innerHTML = html;
    };

    balancedView.showLoading = function (msg = 'Loading...') {
        const c = getContainer();
        if (c) c.innerHTML = `<div style="padding:40px;text-align:center;"><div class="loading-spinner" style="border:4px solid #f3f4f6;border-top:4px solid #3b82f6;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto;"></div><p style="margin-top:16px;color:#6b7280;">${msg}</p></div>`;
    };

    balancedView.showError = function (msg = 'Error loading content') {
        const c = getContainer();
        if (c) c.innerHTML = `<div style="padding:40px;text-align:center;color:#b91c1c;">${msg}</div>`;
    };

    balancedView.clear = function () {
        const c = getContainer();
        if (c) c.innerHTML = '';
    };

    return balancedView;
}

// Para browser global
if (typeof window !== 'undefined') {
    window.renderBalancedView = renderBalancedView;
}
