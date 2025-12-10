/**
 * Flowing MVP v2.0 - Prototype
 * Integración completa con ML Service
 */

// Inicializar ML Client
const mlClient = new MLClient('http://localhost:5001');
let predictionsCount = 0;

// ==================== TAB SYSTEM ====================
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Remove active from all
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active to clicked
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

// ==================== CHAT ====================
function initChat() {
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message
        addMessage(message, 'user');
        chatInput.value = '';

        // Simulate AI response
        setTimeout(() => {
            const response = generateAIResponse(message);
            addMessage(response, 'system');
        }, 500);
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

function addMessage(text, type) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const icon = type === 'system' ? '<i class="fas fa-robot"></i>' : '';
    messageDiv.innerHTML = `
        <div class="message-content">
            ${icon}
            <p>${text}</p>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function generateAIResponse(userMessage) {
    const responses = {
        'prioridad': 'Basándome en el contenido del ticket, sugiero una prioridad "High" con 99% de confianza.',
        'duplicado': 'No he detectado tickets similares en el sistema.',
        'sla': 'Este ticket tiene un 71% de probabilidad de violar el SLA. Recomiendo priorizar su atención.',
        'asignado': 'Sugiero asignar a Carlos Quintero (45% confianza) basado en su experiencia con problemas similares.',
        'default': 'Entiendo tu consulta. ¿Quieres que analice el ticket con los modelos ML?'
    };

    const lowerMessage = userMessage.toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
        if (lowerMessage.includes(key)) {
            return response;
        }
    }
    
    return responses.default;
}

// ==================== QUICK ACTIONS ====================
function initQuickActions() {
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');
    
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.dataset.action;
            await handleQuickAction(action);
        });
    });
}

async function handleQuickAction(action) {
    const summary = document.getElementById('ticketSummary').textContent;
    const description = document.getElementById('ticketDescription').textContent;

    switch (action) {
        case 'suggest-comment':
            addMessage('Generando sugerencia de comentario...', 'system');
            setTimeout(() => {
                addMessage('Comentario sugerido: "He revisado el error y parece estar relacionado con el token de autenticación. Voy a verificar la configuración del servicio."', 'system');
            }, 800);
            break;
            
        case 'summarize':
            addMessage('Resumiendo ticket...', 'system');
            setTimeout(() => {
                addMessage('Resumen: Error de autenticación en app móvil que impide el login de usuarios. Requiere revisión del sistema de tokens.', 'system');
            }, 800);
            break;
            
        case 'translate':
            addMessage('Traduciendo a inglés...', 'system');
            setTimeout(() => {
                addMessage('Translation: Authentication API error. Users cannot log in from mobile application.', 'system');
            }, 800);
            break;
    }
}

// ==================== ML ASSISTANT ====================
function initMLAssistant() {
    // Check ML Service status
    checkMLServiceStatus();
    
    // ML Action buttons
    document.getElementById('analyzePriorityBtn').addEventListener('click', () => analyzePriority());
    document.getElementById('checkDuplicateBtn').addEventListener('click', () => checkDuplicate());
    document.getElementById('predictSLABtn').addEventListener('click', () => predictSLA());
    document.getElementById('suggestAssigneeBtn').addEventListener('click', () => suggestAssignee());
    document.getElementById('suggestLabelsBtn').addEventListener('click', () => suggestLabels());
    document.getElementById('predictStatusBtn').addEventListener('click', () => predictStatus());
}

async function checkMLServiceStatus() {
    try {
        const health = await mlClient.healthCheck();
        
        if (health.status === 'healthy') {
            document.getElementById('mlServiceStatus').textContent = 'Conectado';
            document.querySelector('.status-dot').style.background = 'var(--success)';
            document.querySelector('.status-indicator span').textContent = `${health.models_loaded} modelos listos`;
            
            // Auto-load predictions on startup
            setTimeout(() => loadAllPredictions(), 1000);
        }
    } catch (error) {
        document.getElementById('mlServiceStatus').textContent = 'Desconectado';
        document.querySelector('.status-dot').style.background = 'var(--danger)';
        document.querySelector('.status-indicator span').textContent = 'No se pudo conectar con ML Service';
    }
}

async function loadAllPredictions() {
    const summary = document.getElementById('ticketSummary').textContent;
    const description = document.getElementById('ticketDescription').textContent;
    
    try {
        const startTime = performance.now();
        const predictions = await mlClient.predictAll(summary, description);
        const latency = Math.round(performance.now() - startTime);
        
        // Update footer stats
        document.getElementById('mlLatency').textContent = predictions.latency_ms || latency;
        predictionsCount++;
        document.getElementById('predictionsCount').textContent = predictionsCount;
        
        // Update ML action buttons with confidence
        updateMLConfidence('analyzePriorityBtn', predictions.priority.confidence);
        updateMLConfidence('checkDuplicateBtn', predictions.duplicate_check.confidence);
        updateMLConfidence('predictSLABtn', predictions.sla_breach.breach_probability);
        updateMLConfidence('suggestAssigneeBtn', predictions.assignee.top_choice ? predictions.assignee.top_choice.confidence : 0);
        updateMLConfidence('predictStatusBtn', predictions.status.confidence);
        
        // Update suggestions banner
        updateSuggestionsBanner(predictions);
        
        console.log('Predictions loaded:', predictions);
    } catch (error) {
        console.error('Error loading predictions:', error);
    }
}

function updateMLConfidence(btnId, confidence) {
    const btn = document.getElementById(btnId);
    const confSpan = btn.querySelector('.ml-confidence');
    const percentage = (confidence * 100).toFixed(0);
    confSpan.textContent = `${percentage}%`;
    
    // Color coding
    if (confidence > 0.8) {
        confSpan.style.background = 'rgba(16, 185, 129, 0.1)';
        confSpan.style.color = 'var(--success)';
    } else if (confidence > 0.5) {
        confSpan.style.background = 'rgba(245, 158, 11, 0.1)';
        confSpan.style.color = 'var(--warning)';
    }
}

function updateSuggestionsBanner(predictions) {
    const banner = document.getElementById('mlSuggestions');
    banner.innerHTML = '';
    
    const suggestions = [];
    
    if (predictions.priority.confidence > 0.9) {
        suggestions.push({
            icon: 'exclamation-circle',
            text: `Prioridad sugerida: ${predictions.priority.suggested_priority} (${(predictions.priority.confidence * 100).toFixed(0)}%)`
        });
    }
    
    if (predictions.sla_breach.risk_level === 'HIGH') {
        suggestions.push({
            icon: 'exclamation-triangle',
            text: `⚠️ Alto riesgo de violación de SLA (${(predictions.sla_breach.breach_probability * 100).toFixed(0)}%)`
        });
    }
    
    if (predictions.assignee.top_choice) {
        suggestions.push({
            icon: 'user-tag',
            text: `Asignado sugerido: ${predictions.assignee.top_choice.assignee}`
        });
    }
    
    if (suggestions.length === 0) {
        suggestions.push({
            icon: 'check-circle',
            text: 'No hay sugerencias críticas en este momento'
        });
    }
    
    suggestions.forEach(s => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `<i class="fas fa-${s.icon}"></i><span>${s.text}</span>`;
        banner.appendChild(div);
    });
}

async function analyzePriority() {
    const summary = document.getElementById('ticketSummary').textContent;
    const description = document.getElementById('ticketDescription').textContent;
    
    try {
        const result = await mlClient.suggestPriority(summary, description);
        showMLResult('Análisis de Prioridad', `
            <p><strong>Prioridad Sugerida:</strong> ${result.suggested_priority}</p>
            <p><strong>Confianza:</strong> ${(result.confidence * 100).toFixed(2)}%</p>
            <div style="margin-top: 12px;">
                <strong>Probabilidades:</strong>
                ${Object.entries(result.probabilities || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, val]) => `
                        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                            <span>${key}</span>
                            <span style="font-weight: 600;">${(val * 100).toFixed(1)}%</span>
                        </div>
                    `).join('')}
            </div>
        `);
    } catch (error) {
        showMLResult('Error', 'No se pudo analizar la prioridad');
    }
}

async function checkDuplicate() {
    const summary = document.getElementById('ticketSummary').textContent;
    const description = document.getElementById('ticketDescription').textContent;
    
    try {
        const result = await mlClient.checkDuplicate(summary, description);
        showMLResult('Detección de Duplicados', `
            <p><strong>¿Es duplicado?</strong> ${result.is_duplicate ? 'Sí' : 'No'}</p>
            <p><strong>Confianza:</strong> ${(result.confidence * 100).toFixed(2)}%</p>
            ${result.similar_tickets.length > 0 ? `
                <p style="margin-top: 12px;"><strong>Tickets similares:</strong></p>
                <ul>
                    ${result.similar_tickets.map(t => `<li>${t}</li>`).join('')}
                </ul>
            ` : ''}
        `);
    } catch (error) {
        showMLResult('Error', 'No se pudo verificar duplicados');
    }
}

async function predictSLA() {
    const summary = document.getElementById('ticketSummary').textContent;
    const description = document.getElementById('ticketDescription').textContent;
    
    try {
        const result = await mlClient.predictSLABreach(summary, description);
        const riskColor = result.risk_level === 'HIGH' ? 'var(--danger)' : 
                         result.risk_level === 'MEDIUM' ? 'var(--warning)' : 'var(--success)';
        
        showMLResult('Predicción de SLA', `
            <p><strong>¿Violará SLA?</strong> ${result.will_breach ? 'Sí' : 'No'}</p>
            <p><strong>Probabilidad:</strong> ${(result.breach_probability * 100).toFixed(2)}%</p>
            <p><strong>Nivel de Riesgo:</strong> 
                <span style="color: ${riskColor}; font-weight: 600;">${result.risk_level}</span>
            </p>
        `);
    } catch (error) {
        showMLResult('Error', 'No se pudo predecir SLA');
    }
}

async function suggestAssignee() {
    const summary = document.getElementById('ticketSummary').textContent;
    const description = document.getElementById('ticketDescription').textContent;
    
    try {
        const result = await mlClient.suggestAssignee(summary, description, 3);
        showMLResult('Sugerencia de Asignados', `
            ${result.suggestions.length > 0 ? `
                <p><strong>Top 3 Asignados:</strong></p>
                ${result.suggestions.map((a, i) => `
                    <div style="display: flex; justify-content: space-between; margin-top: 8px; padding: 8px; background: var(--gray-50); border-radius: 6px;">
                        <span>${i + 1}. ${a.assignee}</span>
                        <span style="font-weight: 600;">${(a.confidence * 100).toFixed(0)}%</span>
                    </div>
                `).join('')}
            ` : '<p>No hay sugerencias disponibles</p>'}
        `);
    } catch (error) {
        showMLResult('Error', 'No se pudo sugerir asignado');
    }
}

async function suggestLabels() {
    const summary = document.getElementById('ticketSummary').textContent;
    const description = document.getElementById('ticketDescription').textContent;
    
    try {
        const result = await mlClient.suggestLabels(summary, description, 0.3);
        showMLResult('Sugerencia de Labels', `
            ${result.suggested_labels.length > 0 ? `
                <p><strong>Labels sugeridos:</strong></p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">
                    ${result.suggested_labels.map(l => `
                        <span style="padding: 4px 12px; background: rgba(102, 126, 234, 0.1); color: var(--primary); border-radius: 12px; font-size: 12px;">
                            ${l.label} (${(l.confidence * 100).toFixed(0)}%)
                        </span>
                    `).join('')}
                </div>
            ` : '<p>No hay labels sugeridos</p>'}
        `);
    } catch (error) {
        showMLResult('Error', 'No se pudo sugerir labels');
    }
}

async function predictStatus() {
    const summary = document.getElementById('ticketSummary').textContent;
    const description = document.getElementById('ticketDescription').textContent;
    
    try {
        const result = await mlClient.suggestStatus(summary, description);
        showMLResult('Siguiente Estado', `
            <p><strong>Estado Sugerido:</strong> ${result.suggested_status}</p>
            <p><strong>Confianza:</strong> ${(result.confidence * 100).toFixed(2)}%</p>
            ${result.probabilities ? `
                <div style="margin-top: 12px;">
                    <strong>Otras opciones:</strong>
                    ${Object.entries(result.probabilities)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([key, val]) => `
                            <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                                <span>${key}</span>
                                <span style="font-weight: 600;">${(val * 100).toFixed(1)}%</span>
                            </div>
                        `).join('')}
                </div>
            ` : ''}
        `);
    } catch (error) {
        showMLResult('Error', 'No se pudo predecir estado');
    }
}

function showMLResult(title, content) {
    const resultsDiv = document.getElementById('mlResults');
    resultsDiv.innerHTML = `
        <div style="background: var(--gray-50); padding: 16px; border-radius: 8px; border-left: 3px solid var(--primary);">
            <h4 style="font-size: 14px; font-weight: 600; color: var(--gray-900); margin-bottom: 12px;">${title}</h4>
            <div style="font-size: 13px; color: var(--gray-700);">${content}</div>
        </div>
    `;
}

// ==================== COMMENTS ====================
function initComments() {
    document.getElementById('suggestCommentBtn').addEventListener('click', async () => {
        const commentInput = document.getElementById('commentInput');
        commentInput.value = 'Generando sugerencia con IA...';
        
        setTimeout(() => {
            commentInput.value = 'He revisado el error de autenticación. Parece estar relacionado con la configuración del token JWT. Voy a verificar el servicio de autenticación y actualizaré el estado.';
        }, 1000);
    });
    
    document.getElementById('postCommentBtn').addEventListener('click', () => {
        const commentInput = document.getElementById('commentInput');
        const text = commentInput.value.trim();
        
        if (!text) return;
        
        const commentsList = document.getElementById('commentsList');
        const newComment = document.createElement('div');
        newComment.className = 'comment';
        newComment.innerHTML = `
            <div class="comment-header">
                <strong>Usuario Actual</strong>
                <span class="comment-time">Justo ahora</span>
            </div>
            <div class="comment-body">${text}</div>
        `;
        
        commentsList.appendChild(newComment);
        commentInput.value = '';
    });
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Flowing MVP v2.0 - Prototype');
    
    initTabs();
    initChat();
    initQuickActions();
    initMLAssistant();
    initComments();
    
    console.log('✅ All systems initialized');
});
