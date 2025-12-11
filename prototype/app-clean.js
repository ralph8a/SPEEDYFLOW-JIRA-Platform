// ==================== FOOTER CONTROL ====================
function expandFooter() {
    const footer = document.getElementById('footer');
    if (!footer.classList.contains('expanded')) {
        footer.classList.add('expanded');
        footer.onclick = null;
    }
}

// ==================== MODE SWITCH ====================
function switchMode(mode) {
    const chatView = document.getElementById('chatView');
    const ticketView = document.getElementById('ticketView');
    const btnChat = document.getElementById('btnChatMode');
    const btnTicket = document.getElementById('btnTicketMode');
    
    if (mode === 'chat') {
        chatView.style.display = 'flex';
        ticketView.style.display = 'none';
        btnChat.classList.add('active');
        btnTicket.classList.remove('active');
    } else {
        chatView.style.display = 'none';
        ticketView.style.display = 'block';
        btnTicket.classList.add('active');
        btnChat.classList.remove('active');
    }
}

// ==================== TICKET ACTIONS ====================
function openTicket(ticketId) {
    // Expand footer
    const footer = document.getElementById('footer');
    footer.classList.add('expanded');
    footer.onclick = null;
    
    // Switch to ticket mode
    setTimeout(() => {
        switchMode('ticket');
        loadTicketDetails(ticketId);
    }, 100);
    
    // Hide FAB
    document.getElementById('fab').classList.add('hidden');
}

function loadTicketDetails(ticketId) {
    const ticketDetails = document.getElementById('ticketDetails');
    
    ticketDetails.innerHTML = `
        <div class="ticket-grid">
            <div>
                <div class="field-compact">
                    <label>Resumen</label>
                    <div class="field-value">Error en API de autenticación</div>
                </div>
                
                <div class="field-compact">
                    <label>Descripción</label>
                    <div class="field-value">Los usuarios no pueden hacer login desde la aplicación móvil.</div>
                </div>
            </div>
            
            <div>
                <div class="field-compact">
                    <label>Prioridad</label>
                    <select>
                        <option value="Medium" selected>Medium</option>
                        <option value="High">High</option>
                    </select>
                    <div class="ml-suggestion">
                        <i class="fas fa-robot"></i>
                        <span>Cambiar a <strong>High</strong></span>
                        <span class="confidence">99%</span>
                        <button>Aplicar</button>
                    </div>
                </div>
                
                <div class="field-compact">
                    <label>Asignado</label>
                    <select>
                        <option value="">Sin asignar</option>
                        <option value="carlos">Carlos Quintero</option>
                    </select>
                    <div class="ml-suggestion">
                        <i class="fas fa-robot"></i>
                        <span>Asignar a <strong>Carlos Q.</strong></span>
                        <span class="confidence">45%</span>
                        <button>Aplicar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== CHAT ACTIONS ====================
function openChat() {
    // Expand footer
    const footer = document.getElementById('footer');
    footer.classList.add('expanded');
    footer.onclick = null;
    
    // Switch to chat mode
    setTimeout(() => {
        switchMode('chat');
    }, 100);
    
}

// ==================== INIT ====================
console.log('🚀 Flowing MVP - Clean Version Loaded');
