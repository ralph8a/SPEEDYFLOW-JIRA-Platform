// flowingChatView.js
// Render y lógica de la vista de chat del footer Flowing MVP

export function renderChatView({
    messagesContainerId = 'flowingMessages',
    inputId = 'flowingInput',
    sendBtnId = 'flowingSendBtn',
    onSend = null,
} = {}) {
    const chatView = document.createElement('div');
    chatView.id = 'chatOnlyView';
    chatView.className = 'flowing-view chat-view';
    chatView.style.display = 'block';
    chatView.innerHTML = `
    <div id="${messagesContainerId}" class="flowing-messages" aria-live="polite" aria-atomic="true" role="log"></div>
    <div class="flowing-composer" style="display:flex;align-items:center;gap:8px;padding:12px;border-top:1px solid rgba(0,0,0,0.04);flex-wrap:nowrap;">
      <textarea id="${inputId}" rows="2" placeholder="Ask Flowing..." style="flex:1 1 auto;min-width:0;min-height:40px;max-height:160px;padding:10px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);box-sizing:border-box;resize:vertical;" aria-label="Chat input" aria-multiline="true"></textarea>
      <button id="${sendBtnId}" class="flowing-send-btn" aria-label="Send message" style="flex:0 0 auto;padding:10px 12px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;cursor:pointer;" tabindex="0" role="button"> 
        <span id="flowingSendIcon" aria-hidden="true">✈</span>
      </button>
    </div>
  `;
    // Helpers para acceder a los elementos
    const getMessages = () => chatView.querySelector(`#${messagesContainerId}`);
    const getInput = () => chatView.querySelector(`#${inputId}`);
    const getSendBtn = () => chatView.querySelector(`#${sendBtnId}`);

    // Lógica asociada a la vista de chat
    chatView.setMessages = function (html) {
        const m = getMessages();
        if (m) m.innerHTML = html;
    };
    chatView.clearMessages = function () {
        const m = getMessages();
        if (m) m.innerHTML = '';
    };
    chatView.setInput = function (val) {
        const i = getInput();
        if (i) i.value = val;
    };
    chatView.getInput = function () {
        const i = getInput();
        return i ? i.value : '';
    };
    chatView.focusInput = function () {
        const i = getInput();
        if (i) i.focus();
    };
    chatView.setSendHandler = function (fn) {
        const btn = getSendBtn();
        if (btn && typeof fn === 'function') {
            btn.onclick = fn;
        }
    };

    // Opcional: asignar evento de envío inicial
    if (typeof onSend === 'function') {
        setTimeout(() => {
            const btn = getSendBtn();
            if (btn) btn.addEventListener('click', onSend);
        }, 0);
    }
    return chatView;
}

// Para browser global
if (typeof window !== 'undefined') {
    window.renderChatView = renderChatView;
}
