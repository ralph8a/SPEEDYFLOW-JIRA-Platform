/**
 * Flowing MVP v2.1 - Smart Expansion Logic
 */

// ML Client
const mlClient = new MLClient('http://localhost:5001');
let predictionsCount = 0;
let currentTicketId = null;

// ==================== FOOTER EXPAND/COLLAPSE ====================
function expandFooter(event) {
    const footerPanel = document.getElementById('footerPanel');
    if (!footerPanel.classList.contains('expanded')) {
        footerPanel.classList.add('expanded');
        footerPanel.onclick = null; // Remove click handler when expanded
    }
}

// ==================== TICKET PANEL ====================
function openTicket(ticketId) {
    currentTicketId = ticketId;
    
    // Update ticket ID
    document.getElementById('ticketId').textContent = ticketId;
    
    // Expand footer and switch to ticket view
    const footerPanel = document.getElementById('footerPanel');
    footerPanel.classList.add('expanded');
    footerPanel.onclick = null;
    
    // Switch to ticket view
    setTimeout(() => {
        switchToTicket();
    }, 100);
    
    // Load ML predictions
    loadMLPredictions();
    
    // Show smart banner
    showSmartBanner();
}

function closeTicket() {
    const ticketPanel = document.getElementById('ticketPanel');
    ticketPanel.classList.remove('open');
}

function openFooterManually() {
    // Expand footer
    const footerPanel = document.getElementById('footerPanel');
    footerPanel.classList.add('expanded');
    footerPanel.onclick = null;
    
    // Switch to Chat IA mode
    setTimeout(() => {
        switchToChat();
    }, 100);
    
    // Hide FAB when footer is open
    const fab = document.getElementById('fabFooter');
    if (fab) {
        fab.classList.add('hidden');
    }
}

function closeTicket() {
    const panel = document.getElementById('ticketPanel');
    const ticketBar = document.getElementById('ticketBar');
    const ticketBarTitle = document.getElementById('ticketBarTitle');
    
    panel.classList.remove('open');
    ticketBar.classList.remove('active');
    ticketBarTitle.textContent = 'Selecciona un ticket';
    
    // Reset chevron
    document.getElementById('ticketChevron').style.transform = 'rotate(0deg)';
    
    // Remove combined mode
    document.body.classList.remove('panels-both-open');
    
    currentTicketId = null;
}

function toggleTicketFromFooter() {
    const panel = document.getElementById('ticketPanel');
    if (panel.classList.contains('open')) {
        closeTicket();
    } else if (currentTicketId) {
        openTicket(currentTicketId);
    }
    // If no ticket selected, do nothing
}

// ==================== SMART BANNER ====================
function showSmartBanner() {
    const banner = document.getElementById('smartBanner');
    banner.style.animation = 'slideIn 300ms ease';
}

function toggleMLSuggestions() {
    // Simply open chat panel with suggestions
    openChatPanel('suggestions');
    
    // Hide banner when chat opens
    const banner = document.getElementById('smartBanner');
    if (banner) {
        banner.classList.add('hidden');
    }
    
    // Populate suggestions in chat
    setTimeout(() => {
        populateChatSuggestions();
    }, 100);
}

function showMLDetail(type) {
    console.log('Showing ML detail for:', type);
    // Scroll to field in ticket panel
    scrollToField(type);
}

function scrollToField(fieldId) {
    const element = document.getElementById(`field-${fieldId}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.style.animation = 'highlight 1s ease';
        
        // Highlight effect
        const originalBg = element.style.background;
        element.style.background = 'rgba(102, 126, 234, 0.1)';
        setTimeout(() => {
            element.style.background = originalBg;
        }, 2000);
    }
}

// ==================== CHAT SUGGESTIONS (Replacing Inline) ====================
function populateChatSuggestions() {
    const actionsContainer = document.getElementById('recommendedActions');
    actionsContainer.classList.add('show');
    actionsContainer.innerHTML = `
        <h4>✨ Sugerencias ML</h4>
        <p class="actions-intro">Selecciona las sugerencias que quieres aplicar al ticket:</p>
        
        <div class="suggestion-group">
            <div class="suggestion-group-header" onclick="scrollToField('summary')">
                <i class="fas fa-file-alt"></i>
                <strong>Resumen</strong>
            </div>
            <div class="action-item">
                <input type="checkbox" id="action-summary" onchange="updateSelectedCount()">
                <label for="action-summary">
                    <i class="fas fa-edit"></i>
                    <span>Mejorar resumen: "Error crítico en API de autenticación que bloquea login" <small>(ML)</small></span>
                </label>
            </div>
        </div>

        <div class="suggestion-group">
            <div class="suggestion-group-header" onclick="scrollToField('description')">
                <i class="fas fa-align-left"></i>
                <strong>Descripción</strong>
            </div>
            <div class="action-item">
                <input type="checkbox" id="action-description" onchange="updateSelectedCount()">
                <label for="action-description">
                    <i class="fas fa-edit"></i>
                    <span>Ampliar detalles: "Token JWT expira prematuramente. Solo afecta iOS" <small>(ML)</small></span>
                </label>
            </div>
        </div>

        <div class="suggestion-group">
            <div class="suggestion-group-header" onclick="scrollToField('priority')">
                <i class="fas fa-exclamation-circle"></i>
                <strong>Prioridad</strong>
            </div>
            <div class="action-item">
                <input type="checkbox" id="action-priority" checked onchange="updateSelectedCount()">
                <label for="action-priority">
                    <i class="fas fa-arrow-up"></i>
                    <span>Cambiar de "Medium" a "High" <small>(99% confianza)</small></span>
                </label>
            </div>
            <div class="action-reason">
                💡 Razón: Bloquea funcionalidad crítica, afecta múltiples usuarios, riesgo de violación de SLA
            </div>
        </div>

        <div class="suggestion-group">
            <div class="suggestion-group-header" onclick="scrollToField('assignee')">
                <i class="fas fa-user-tag"></i>
                <strong>Asignado</strong>
            </div>
            <div class="action-item">
                <input type="checkbox" id="action-assignee" checked onchange="updateSelectedCount()">
                <label for="action-assignee">
                    <i class="fas fa-user"></i>
                    <span>Asignar a Carlos Quintero <small>(45% confianza)</small></span>
                </label>
            </div>
            <div class="action-reason">
                💡 Experto en APIs de autenticación, resolvió 12 tickets similares
            </div>
        </div>

        <div class="suggestion-group">
            <div class="suggestion-group-header" onclick="scrollToField('labels')">
                <i class="fas fa-tags"></i>
                <strong>Labels</strong>
            </div>
            <div class="action-item">
                <input type="checkbox" id="action-labels" onchange="updateSelectedCount()">
                <label for="action-labels">
                    <i class="fas fa-plus"></i>
                    <span>Agregar labels: <span class="inline-tag">api</span> <span class="inline-tag">auth</span> <span class="inline-tag">mobile</span></span>
                </label>
            </div>
        </div>

        <div class="suggestion-group warning">
            <div class="suggestion-group-header">
                <i class="fas fa-clock"></i>
                <strong>Alerta SLA</strong>
            </div>
            <div class="action-item warning">
                <input type="checkbox" id="action-sla" onchange="updateSelectedCount()">
                <label for="action-sla">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>⚠️ Activar alerta SLA (Riesgo alto: 71%) <small>(HIGH)</small></span>
                </label>
            </div>
        </div>
    `;
    
    // Show the container
    actionsContainer.style.display = 'block';
}

// ==================== ML PREDICTIONS ====================
async function loadMLPredictions() {
    // ML predictions disabled for prototype mode
    // Using hardcoded suggestions visible in the UI
    console.log('ℹ️ ML predictions skipped (prototype mode - using hardcoded suggestions)');
}

function updateSuggestionCards(predictions) {
    // Actualizar las cards de sugerencias con datos reales
    const cards = document.querySelectorAll('.suggestion-card');
    
    // Priority
    if (cards[0]) {
        const content = cards[0].querySelector('.suggestion-content p');
        content.textContent = `Medium → ${predictions.priority.suggested_priority}`;
        const confidence = cards[0].querySelector('.suggestion-confidence');
        confidence.textContent = `${(predictions.priority.confidence * 100).toFixed(0)}%`;
    }
    
    // SLA
    if (cards[1]) {
        const content = cards[1].querySelector('.suggestion-content p');
        content.textContent = `${predictions.sla_breach.risk_level} (${(predictions.sla_breach.breach_probability * 100).toFixed(0)}%)`;
    }
    
    // Assignee
    if (cards[2] && predictions.assignee.top_choice) {
        const content = cards[2].querySelector('.suggestion-content p');
        content.textContent = predictions.assignee.top_choice.assignee;
        const confidence = cards[2].querySelector('.suggestion-confidence');
        confidence.textContent = `${(predictions.assignee.top_choice.confidence * 100).toFixed(0)}%`;
    }
    
    // Labels
    if (cards[3]) {
        const content = cards[3].querySelector('.suggestion-content p');
        const labels = predictions.labels.suggested_labels.slice(0, 3).map(l => l.label).join(', ');
        content.textContent = labels || 'No hay sugerencias';
        const confidence = cards[3].querySelector('.suggestion-confidence');
        confidence.textContent = predictions.labels.count.toString();
    }
}

// ==================== CHAT PANEL ====================
function openChatPanel(context) {
    const panel = document.getElementById('chatPanel');
    const chatBar = document.getElementById('chatBar');
    
    panel.classList.add('open');
    chatBar.classList.add('active');
    
    // Update chevron
    document.getElementById('chatChevron').style.transform = 'rotate(180deg)';
    
    if (context === 'comment') {
        // Agregar mensaje de contexto
        addChatMessage('system', '💬 Voy a ayudarte a generar un comentario relevante para este ticket. ¿Qué tipo de comentario necesitas?');
    } else if (context === 'quick') {
        // Mostrar acciones recomendadas
        document.getElementById('recommendedActions').style.display = 'block';
    }
    
    // Check if both panels are open and sync scrolls
    setTimeout(() => {
        syncScrolls();
    }, 100);
}

function closeChatPanel() {
    const panel = document.getElementById('chatPanel');
    const chatBar = document.getElementById('chatBar');
    
    panel.classList.remove('open');
    chatBar.classList.remove('active');
    
    // Reset chevron
    document.getElementById('chatChevron').style.transform = 'rotate(0deg)';
    
    // Remove combined mode
    document.body.classList.remove('panels-both-open');
    
    // Show banner again when chat closes
    const banner = document.getElementById('smartBanner');
    if (banner) {
        banner.classList.remove('hidden');
    }
}

function toggleChatPanel() {
    const panel = document.getElementById('chatPanel');
    const banner = document.getElementById('smartBanner');
    
    if (panel.classList.contains('open')) {
        closeChatPanel();
    } else {
        openChatPanel('quick');
        // Hide banner when chat opens
        if (banner) {
            banner.classList.add('hidden');
        }
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addChatMessage('user', message);
    input.value = '';
    
    // Simulate AI response
    setTimeout(() => {
        const response = generateAIResponse(message);
        addChatMessage('system', response);
    }, 500);
}

function addChatMessage(type, text) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const icon = type === 'system' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
    messageDiv.innerHTML = `
        ${icon}
        <p>${text}</p>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function generateAIResponse(userMessage) {
    const responses = {
        'prioridad': 'Basándome en el análisis del ticket, recomiendo cambiar la prioridad a "High" con 99% de confianza. ¿Quieres aplicar este cambio?',
        'duplicado': 'No he detectado tickets similares en el sistema. Este parece ser un problema único.',
        'sla': 'Este ticket tiene un 71% de probabilidad de violar el SLA. Te recomiendo marcarlo como urgente.',
        'asignado': 'Carlos Quintero sería la mejor opción (45% confianza). Ha resuelto 12 tickets similares de autenticación.',
        'comentario': 'Aquí está mi sugerencia de comentario:\n\n"He revisado el error de autenticación. Parece estar relacionado con la configuración del token JWT. Voy a verificar el servicio de autenticación y actualizaré el estado."',
        'default': 'Entiendo. ¿Hay algo específico en lo que pueda ayudarte con este ticket?'
    };
    
    const lowerMessage = userMessage.toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
        if (lowerMessage.includes(key)) {
            return response;
        }
    }
    
    return responses.default;
}

// ==================== RECOMMENDED ACTIONS ====================
function applySelectedActions() {
    const checkboxes = document.querySelectorAll('.action-item input[type="checkbox"]:checked');
    const actions = Array.from(checkboxes).map(cb => cb.id);
    
    console.log('Applying actions:', actions);
    
    if (actions.length === 0) {
        alert('Selecciona al menos una acción');
        return;
    }
    
    // Simular aplicación
    actions.forEach((action, index) => {
        setTimeout(() => {
            applyAction(action);
        }, index * 300);
    });
    
    // Cerrar panel después de aplicar
    setTimeout(() => {
        alert(`✅ ${actions.length} acciones aplicadas exitosamente`);
        closeChatPanel();
        
        // Reset checkboxes
        checkboxes.forEach(cb => cb.checked = false);
    }, actions.length * 300 + 500);
}

function applyAction(actionId) {
    const actionMap = {
        'action-summary': () => {
            const summary = document.querySelector('#field-summary .field-value');
            if (summary) {
                summary.textContent = 'Error crítico en API de autenticación que bloquea login en app móvil';
                flashField('field-summary');
            }
        },
        'action-description': () => {
            const desc = document.querySelector('#field-description .field-value');
            if (desc) {
                desc.textContent += '\n\nError aparece al intentar autenticarse. Token JWT parece expirar prematuramente. Afecta solo iOS.';
                flashField('field-description');
            }
        },
        'action-priority': () => {
            const select = document.getElementById('prioritySelect');
            if (select) {
                select.value = 'High';
                flashField('field-priority');
            }
        },
        'action-assignee': () => {
            const select = document.getElementById('assigneeSelect');
            if (select) {
                select.value = 'carlos.quintero';
                flashField('field-assignee');
            }
        },
        'action-labels': () => {
            const labelsInput = document.querySelector('.labels-input');
            if (labelsInput) {
                const newLabels = ['api', 'auth', 'mobile'];
                newLabels.forEach((label, i) => {
                    setTimeout(() => {
                        const tag = document.createElement('span');
                        tag.className = 'label-tag';
                        tag.innerHTML = `${label} <i class="fas fa-times"></i>`;
                        labelsInput.insertBefore(tag, labelsInput.querySelector('input'));
                    }, i * 200);
                });
                flashField('field-labels');
            }
        },
        'action-sla': () => {
            showNotification('🚨 Alerta de SLA activada', 'warning');
        },
        'action-comment': () => {
            const commentsList = document.querySelector('.comments-list');
            if (commentsList) {
                const comment = document.createElement('div');
                comment.className = 'comment';
                comment.innerHTML = `
                    <strong>IA Assistant</strong>
                    <span class="time">Justo ahora</span>
                    <p>He revisado el error de autenticación. Parece estar relacionado con la configuración del token JWT. Voy a verificar el servicio de autenticación.</p>
                `;
                commentsList.appendChild(comment);
                comment.style.animation = 'slideIn 300ms ease';
            }
        }
    };
    
    if (actionMap[actionId]) {
        actionMap[actionId]();
        predictionsCount++;
        document.getElementById('footerPredictions').textContent = predictionsCount;
    }
}

function flashField(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.style.background = 'rgba(16, 185, 129, 0.1)';
        field.style.borderRadius = '8px';
        field.style.transition = 'background 0.3s ease';
        setTimeout(() => {
            field.style.background = '';
        }, 1500);
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'var(--success)' : 'var(--warning)'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 300ms ease;
        font-size: 14px;
        font-weight: 600;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== QUICK ACTIONS ====================
function showQuickActions() {
    openChatPanel('quick');
}

// ==================== ML SERVICE STATUS ====================
async function checkMLServiceStatus() {
    // ML Service check disabled for prototype
    // The UI works without backend ML service
    console.log('ℹ️ ML Service check skipped (prototype mode)');
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
    // Escape to close panels
    if (e.key === 'Escape') {
        if (document.getElementById('chatPanel').classList.contains('open')) {
            closeChatPanel();
        } else if (document.getElementById('ticketPanel').classList.contains('open')) {
            closeTicket();
        }
    }
    
    // Enter in chat input
    if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'chatInput') {
        e.preventDefault();
        sendChatMessage();
    }
});

// ==================== SCROLL SYNC ====================
let isScrollSyncing = false;

function syncScrolls() {
    const chatPanel = document.getElementById('chatPanel');
    const ticketPanel = document.getElementById('ticketPanel');
    const chatActionFooter = document.getElementById('chatActionFooter');
    const chatInputWrapper = document.getElementById('chatInputWrapper');
    
    // Check if both panels are open
    const bothOpen = chatPanel.classList.contains('open') && ticketPanel.classList.contains('open');
    
    if (bothOpen) {
        // Add class to body for combined styling
        document.body.classList.add('panels-both-open');
        
        // Show action footer, hide input
        if (chatActionFooter) {
            chatActionFooter.style.display = 'flex';
            chatInputWrapper.style.display = 'none';
        }
        
        // Update selected count
        updateSelectedCount();
    } else {
        document.body.classList.remove('panels-both-open');
        if (chatActionFooter) {
            chatActionFooter.style.display = 'none';
            chatInputWrapper.style.display = 'flex';
        }
    }
}

// ==================== ACTION CONFIRMATION ====================
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.action-item input[type="checkbox"]:checked');
    const count = checkboxes.length;
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = `${count} seleccionada${count !== 1 ? 's' : ''}`;
    }
}

function confirmApplyActions() {
    const checkboxes = document.querySelectorAll('.action-item input[type="checkbox"]:checked');
    const count = checkboxes.length;
    
    if (count === 0) {
        showNotification('Selecciona al menos una sugerencia', 'warning');
        return;
    }
    
    // Show confirmation dialog
    const confirmation = confirm(`¿Seguro que quieres hacer ${count} cambio${count !== 1 ? 's' : ''}?`);
    
    if (confirmation) {
        applySelectedActions();
        
        // Hide action footer and show chatbox again
        const chatActionFooter = document.getElementById('chatActionFooter');
        const chatInputWrapper = document.getElementById('chatInputWrapper');
        if (chatActionFooter) {
            chatActionFooter.style.display = 'none';
        }
        if (chatInputWrapper) {
            chatInputWrapper.style.display = 'flex';
        }
    }
}

function cancelActions() {
    // Hide action footer and show chatbox again
    const chatActionFooter = document.getElementById('chatActionFooter');
    const chatInputWrapper = document.getElementById('chatInputWrapper');
    if (chatActionFooter) {
        chatActionFooter.style.display = 'none';
    }
    if (chatInputWrapper) {
        chatInputWrapper.style.display = 'flex';
    }
    
    // Clear selections
    const checkboxes = document.querySelectorAll('.action-item input[type="checkbox"]:checked');
    checkboxes.forEach(cb => cb.checked = false);
    updateSelectedCount();
}

// ==================== AUTO-EXPAND TEXTAREA ====================
function setupAutoExpandTextarea() {
    const textarea = document.getElementById('chatInput');
    if (textarea) {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }
}

// ==================== INLINE ML SUGGESTIONS ====================
function applyPriority(priority) {
    document.getElementById('prioritySelect').value = priority;
    showNotification(`Prioridad cambiada a ${priority}`, 'success');
}

function applyAssignee(assignee) {
    document.getElementById('assigneeSelect').value = assignee;
    showNotification('Ticket asignado correctamente', 'success');
}

function applyLabels(labels) {
    const labelsInput = document.querySelector('.labels-input');
    labels.forEach(label => {
        const tag = document.createElement('span');
        tag.className = 'label-tag';
        tag.innerHTML = `${label} <i class="fas fa-times"></i>`;
        labelsInput.insertBefore(tag, labelsInput.querySelector('input'));
    });
    showNotification(`${labels.length} labels agregados`, 'success');
}

function toggleLabel(element, label) {
    element.classList.toggle('selected');
    showNotification(`Label "${label}" seleccionado`, 'info');
}

function showMLDetail(type) {
    const messages = {
        priority: '🎯 Prioridad sugerida: HIGH (99% confianza)\n\nBasado en análisis de palabras clave críticas',
        sla: '⚠️ Riesgo SLA: ALTO (71%)\n\nTiempo promedio: 4.2h | Objetivo: 4h',
        assignee: '👤 Asignado sugerido: Carlos Quintero (45%)\n\nExperiencia en tickets similares',
        labels: '🏷️ Labels sugeridos: api, auth, mobile\n\nBasado en contenido del ticket'
    };
    alert(messages[type] || 'Detalle no disponible');
}

// ==================== FOOTER MODE SWITCH ====================
function switchToTicket() {
    const ticketView = document.getElementById('ticketView');
    const chatView = document.getElementById('chatView');
    const modeTicketBtn = document.getElementById('modeTicketBtn');
    const modeChatBtn = document.getElementById('modeChatBtn');
    
    ticketView.style.display = 'block';
    chatView.style.display = 'none';
    modeTicketBtn.classList.add('active');
    modeChatBtn.classList.remove('active');
    
    // Load ticket details into footer
    loadTicketDetailsInFooter();
}

function switchToChat() {
    const ticketView = document.getElementById('ticketView');
    const chatView = document.getElementById('chatView');
    const modeTicketBtn = document.getElementById('modeTicketBtn');
    const modeChatBtn = document.getElementById('modeChatBtn');
    
    chatView.style.display = 'flex';
    ticketView.style.display = 'none';
    modeChatBtn.classList.add('active');
    modeTicketBtn.classList.remove('active');
}

function loadTicketDetailsInFooter() {
    const ticketView = document.getElementById('ticketView');
    const ticketId = document.getElementById('ticketId').textContent;
    
    ticketView.querySelector('.ticket-details-scroll').innerHTML = `
        <!-- Compact Grid Layout -->
        <div class="ticket-grid">
            <!-- Left Column -->
            <div class="ticket-column">
                <div class="field-compact">
                    <label>Resumen</label>
                    <div class="field-value">Error en API de autenticación</div>
                </div>
                
                <div class="field-compact">
                    <label>Descripción</label>
                    <div class="field-value">Los usuarios no pueden hacer login desde la app móvil.</div>
                </div>
            </div>
            
            <!-- Right Column -->
            <div class="ticket-column">
                <div class="field-compact">
                    <label>Prioridad</label>
                    <select class="field-input-compact">
                        <option value="Medium" selected>Medium</option>
                        <option value="High">High</option>
                    </select>
                    <div class="ml-suggestion-compact">
                        <i class="fas fa-robot"></i>
                        <span>High</span>
                        <span class="confidence">99%</span>
                        <button class="btn-apply-compact">Aplicar</button>
                    </div>
                </div>
                
                <div class="field-compact">
                    <label>Asignado</label>
                    <select class="field-input-compact">
                        <option value="">Sin asignar</option>
                        <option value="carlos">Carlos Quintero</option>
                    </select>
                    <div class="ml-suggestion-compact">
                        <i class="fas fa-robot"></i>
                        <span>Carlos Q.</span>
                        <span class="confidence">45%</span>
                        <button class="btn-apply-compact">Aplicar</button>
                    </div>
                </div>
                
                <div class="field-compact">
                    <label>Labels</label>
                    <div class="labels-compact">
                        <span class="label-tag-compact">backend</span>
                        <span class="label-tag-compact suggested">api</span>
                        <span class="label-tag-compact suggested">auth</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- SLA Alert -->
        <div class="sla-alert-compact">
            <i class="fas fa-exclamation-triangle"></i>
            <span><strong>Alerta SLA:</strong> Riesgo alto 71%</span>
        </div>
        
        <!-- Comments Section -->
        <div class="comments-section-compact">
            <h4>Comentarios <span class="comment-count">(1)</span></h4>
            <div class="comment-item-compact">
                <div class="comment-header-compact">
                    <strong>Carlos Quintero</strong>
                    <span class="time">Hace 2h</span>
                </div>
                <p>Investigando el problema, parece estar relacionado con la configuración de OAuth en el backend.</p>
            </div>
            <button class="btn-add-comment-compact">
                <i class="fas fa-plus"></i> Agregar comentario
            </button>
        </div>
    `;
}

// ==================== AI SUGGESTIONS ====================
const aiSuggestions = [
    "Actualizar estado del ticket",
    "Agregar información de contexto",
    "Solicitar más detalles al usuario"
];
let currentSuggestionIndex = 0;
let suggestionMode = false;

function showAISuggestions() {
    const textarea = document.getElementById('chatInput');
    const btnAI = document.getElementById('btnAISuggest');
    const btnSend = document.querySelector('.btn-send');
    
    if (!suggestionMode) {
        // Activar modo sugerencias
        suggestionMode = true;
        currentSuggestionIndex = 0;
        textarea.value = aiSuggestions[currentSuggestionIndex];
        textarea.setAttribute('readonly', 'true');
        btnAI.classList.add('active');
        btnAI.innerHTML = '<i class="fas fa-arrow-right"></i>';
        btnAI.title = 'Siguiente sugerencia';
        btnSend.style.display = 'none';
    } else if (currentSuggestionIndex < aiSuggestions.length - 1) {
        // Mostrar siguiente sugerencia
        currentSuggestionIndex++;
        textarea.value = aiSuggestions[currentSuggestionIndex];
    } else {
        // Terminar sugerencias, volver a modo normal
        suggestionMode = false;
        textarea.value = '';
        textarea.removeAttribute('readonly');
        textarea.focus();
        btnAI.classList.remove('active');
        btnAI.innerHTML = '<i class="fas fa-magic"></i>';
        btnAI.title = 'Sugerencias IA';
        btnSend.style.display = 'flex';
    }
}

function sendChatMessage() {
    const textarea = document.getElementById('chatInput');
    const message = textarea.value.trim();
    
    if (message) {
        addChatMessage('user', message);
        textarea.value = '';
        textarea.style.height = '32px';
        
        // Simulate AI response
        setTimeout(() => {
            addChatMessage('system', 'Entiendo. ¿En qué más puedo ayudarte?');
        }, 500);
    }
}

function addChatMessage(type, text) {
    const messagesContainer = document.querySelector('.chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const icon = document.createElement('i');
    icon.className = type === 'user' ? 'fas fa-user' : 'fas fa-robot';
    
    const p = document.createElement('p');
    p.textContent = text;
    
    messageDiv.appendChild(icon);
    messageDiv.appendChild(p);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Flowing MVP v2.1 - Smart Expansion');
    
    // Check ML Service
    checkMLServiceStatus();
    
    // Setup auto-expand textarea
    setupAutoExpandTextarea();
    
    // Auto-open first ticket for demo
    setTimeout(() => {
        console.log('💡 Tip: Click en un ticket para ver las sugerencias ML');
    }, 1000);
    
    console.log('✅ All systems initialized');
});
