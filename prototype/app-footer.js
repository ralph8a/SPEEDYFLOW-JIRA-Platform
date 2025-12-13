/**
 * FLOWING MVP - FOOTER ML ASSISTANT
 * JavaScript para interactividad del footer collapsible
 * Versión mejorada con Comments/AI Toggle
 */

// Estado global
const state = {
    footerExpanded: false,
    currentTicket: null,
    mlServiceConnected: false,
    suggestionCount: 3,
    latency: 45,
    actionMode: 'comments'  // 'comments' o 'ai'
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Flowing MVP Footer ML Assistant initialized');
    checkMLService();
    updateStats();
    setupVisibilityToggle();
});

// Toggle Footer
function toggleMLFooter() {
    const content = document.getElementById('mlFooterContent');
    const expandBtn = document.getElementById('expandBtn');
    
    state.footerExpanded = !state.footerExpanded;
    
    if (state.footerExpanded) {
        content.style.display = 'block';
        expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i><span>Colapsar</span>';
    } else {
        content.style.display = 'none';
        expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i><span>Expandir</span>';
    }
}

// Toggle Extra Details
function toggleExtraDetails() {
    const content = document.getElementById('extraDetailsContent');
    const btn = document.querySelector('.btn-toggle-details');
    
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'grid';
        btn.innerHTML = '<i class="fas fa-chevron-up"></i><span>Show Less Details</span>';
        btn.classList.add('active');
    } else {
        content.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-chevron-down"></i><span>Show More Details</span>';
        btn.classList.remove('active');
    }
}

// Switch Action Mode (Comments <-> AI)
function switchActionMode(mode) {
    state.actionMode = mode;
    
    // Update tabs
    document.querySelectorAll('.action-mode-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    
    // Update content panels
    document.querySelectorAll('.content-mode-panel').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.panel === mode);
    });
    
    // Update input area
    const badge = document.getElementById('inputModeBadge');
    const input = document.getElementById('unifiedInput');
    const btn = document.getElementById('unifiedSendBtn');
    const toolbar = document.getElementById('inputToolbar');
    
    if (mode === 'comments') {
        badge.innerHTML = '<span class="mode-icon">💬</span><span class="mode-text">Comment mode</span>';
        input.placeholder = 'Write a comment... (@ to mention)';
        btn.innerHTML = '<i class="fas fa-paper-plane"></i><span class="btn-text">Post Comment</span>';
        toolbar.style.display = 'flex';
    } else {
        badge.innerHTML = '<span class="mode-icon">🤖</span><span class="mode-text">AI mode</span>';
        input.placeholder = 'Ask the AI anything about this ticket...';
        btn.innerHTML = '<i class="fas fa-paper-plane"></i><span class="btn-text">Ask AI</span>';
        toolbar.style.display = 'none';
    }
}

// Handle Unified Send (Comments or AI)
function handleUnifiedSend() {
    const input = document.getElementById('unifiedInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (state.actionMode === 'comments') {
        postComment(message);
    } else {
        askAI(message);
    }
    
    input.value = '';
}

// Handle Enter Key in Unified Input
function handleUnifiedInputEnter(event) {
    if (event.key === 'Enter' && event.ctrlKey) {
        handleUnifiedSend();
    }
}

// Post Comment
function postComment(message) {
    console.log('💬 Posting comment:', message);
    
    const isInternal = document.getElementById('commentVisibility').checked;
    const commentsList = document.getElementById('miniCommentsList');
    
    // Add comment to list
    const commentDiv = document.createElement('div');
    commentDiv.className = 'mini-comment';
    commentDiv.innerHTML = `
        <div class="comment-avatar-mini">YOU</div>
        <div class="comment-content-mini">
            <div class="comment-header-mini">
                <span class="comment-author-mini">You</span>
                <span class="comment-time-mini">Just now</span>
                ${isInternal ? '<span style="color: #f59e0b; font-size: 0.75rem;">🔒 Internal</span>' : ''}
            </div>
            <div class="comment-text-mini">${message}</div>
        </div>
    `;
    
    commentsList.insertBefore(commentDiv, commentsList.firstChild);
    
    // Show success notification
    showNotification('✅ Comment posted successfully');
}

// Ask AI
function askAI(question) {
    console.log('🤖 Asking AI:', question);
    
    const messagesContainer = document.getElementById('miniAIMessages');
    
    // Add user message
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'ai-message';
    userMessageDiv.style.background = 'linear-gradient(135deg, #e6f2ff 0%, #dbeafe 100%)';
    userMessageDiv.style.borderLeft = '4px solid #3b82f6';
    userMessageDiv.innerHTML = `
        <div class="ai-avatar" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
            <i class="fas fa-user"></i>
        </div>
        <div class="ai-message-content">${question}</div>
    `;
    
    messagesContainer.appendChild(userMessageDiv);
    
    // Simulate AI thinking
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'ai-message';
    thinkingDiv.innerHTML = `
        <div class="ai-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="ai-message-content">
            <em>Thinking...</em>
        </div>
    `;
    
    messagesContainer.appendChild(thinkingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Simulate AI response
    setTimeout(() => {
        thinkingDiv.remove();
        
        const aiResponse = generateAIResponse(question);
        const responseDiv = document.createElement('div');
        responseDiv.className = 'ai-message';
        responseDiv.innerHTML = `
            <div class="ai-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-message-content">${aiResponse}</div>
        `;
        
        messagesContainer.appendChild(responseDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1500);
}

// Generate AI Response (Simulation)
function generateAIResponse(question) {
    const responses = {
        'prioridad': 'Basándome en el análisis del ticket, recomiendo prioridad **Alta** debido a que afecta la autenticación de usuarios, un componente crítico del sistema.',
        'asignar': 'Sugiero asignar este ticket a **Carlos Q.** quien tiene experiencia previa con problemas similares de autenticación (78% confianza).',
        'sla': 'Este ticket tiene **alto riesgo de breach SLA** (92%). Recomiendo escalarlo o aumentar la prioridad para evitar incumplimiento.',
        'duplicado': 'He encontrado 2 tickets similares: MSM-1189 y MSM-1201. Ambos relacionados con errores de autenticación en la API.',
        'default': 'Entiendo tu pregunta. Basándome en el contexto del ticket, te recomiendo revisar los logs del servidor y verificar la configuración de OAuth. ¿Necesitas ayuda con algo más específico?'
    };
    
    const lowerQuestion = question.toLowerCase();
    
    for (const [keyword, response] of Object.entries(responses)) {
        if (lowerQuestion.includes(keyword)) {
            return response;
        }
    }
    
    return responses.default;
}

// Setup Visibility Toggle
function setupVisibilityToggle() {
    const toggle = document.getElementById('commentVisibility');
    const label = toggle?.nextElementSibling;
    
    if (toggle && label) {
        toggle.addEventListener('change', (e) => {
            const iconSpan = label.querySelector('.visibility-icon');
            const textSpan = label.querySelector('.visibility-text');
            
            if (e.target.checked) {
                iconSpan.textContent = '🔒';
                textSpan.textContent = 'Internal';
            } else {
                iconSpan.textContent = '🔓';
                textSpan.textContent = 'Public';
            }
        });
    }
}

// Show Notification
function showNotification(message) {
    // Simple notification (could be improved with a toast library)
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #48bb78;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Check ML Service Status
async function checkMLService() {
    const statusEl = document.getElementById('mlServiceStatus');
    const statusDot = document.querySelector('.status-dot');
    
    try {
        const response = await fetch('http://localhost:5001/health');
        const data = await response.json();
        
        if (data.status === 'healthy') {
            state.mlServiceConnected = true;
            statusEl.textContent = 'Connected';
            statusEl.style.color = '#48bb78';
            statusDot.style.color = '#48bb78';
        } else {
            throw new Error('Service unhealthy');
        }
    } catch (error) {
        state.mlServiceConnected = false;
        statusEl.textContent = 'Disconnected';
        statusEl.style.color = '#fc8181';
        statusDot.style.color = '#fc8181';
        console.error('ML Service connection failed:', error);
    }
}

// Update Stats
function updateStats() {
    document.getElementById('suggestionCount').textContent = state.suggestionCount;
    document.getElementById('latency').textContent = `${state.latency}ms`;
}

// Open Ticket
function openTicket(ticketKey) {
    state.currentTicket = ticketKey;
    document.getElementById('modalTicketKey').textContent = ticketKey;
    document.getElementById('ticketModal').style.display = 'flex';
    
    // Auto-expand footer
    if (!state.footerExpanded) {
        toggleMLFooter();
    }
    
    // Fetch ML predictions
    fetchMLPredictions(ticketKey);
}

// Close Ticket Modal
function closeTicketModal() {
    document.getElementById('ticketModal').style.display = 'none';
    state.currentTicket = null;
}

// Fetch ML Predictions
async function fetchMLPredictions(ticketKey) {
    if (!state.mlServiceConnected) {
        console.warn('ML Service not connected');
        return;
    }
    
    try {
        const startTime = performance.now();
        
        const response = await fetch('http://localhost:5001/predict/unified', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                summary: "Error en API de autenticación",
                description: "Los usuarios no pueden hacer login desde la app móvil",
                issue_type: "Bug",
                status: "Open",
                priority: "High"
            })
        });
        
        const data = await response.json();
        const endTime = performance.now();
        
        state.latency = Math.round(endTime - startTime);
        updateStats();
        
        console.log('✅ ML Predictions received:', data);
        updateSuggestions(data);
        
    } catch (error) {
        console.error('❌ Failed to fetch predictions:', error);
    }
}

// Update Suggestions
function updateSuggestions(predictions) {
    // Update priority suggestion
    if (predictions.priority) {
        const suggestion = document.querySelector('[data-field="priority"] .ml-inline-suggestion');
        const textEl = suggestion.querySelector('.suggestion-text strong');
        const confidenceEl = suggestion.querySelector('.suggestion-confidence');
        
        textEl.textContent = predictions.priority.predicted_priority;
        confidenceEl.textContent = `${Math.round(predictions.priority.confidence * 100)}%`;
    }
    
    // Update assignee suggestion
    if (predictions.assignee) {
        const suggestion = document.querySelector('[data-field="assignee"] .ml-inline-suggestion');
        const textEl = suggestion.querySelector('.suggestion-text strong');
        const confidenceEl = suggestion.querySelector('.suggestion-confidence');
        
        const topSuggestion = predictions.assignee.suggestions[0];
        if (topSuggestion) {
            textEl.textContent = topSuggestion.assignee;
            confidenceEl.textContent = `${Math.round(topSuggestion.confidence * 100)}%`;
        }
    }
    
    // Update labels suggestion
    if (predictions.labels) {
        const suggestion = document.querySelector('[data-field="labels"] .ml-inline-suggestion');
        const textEl = suggestion.querySelector('.suggestion-text strong');
        const confidenceEl = suggestion.querySelector('.suggestion-confidence');
        
        const topLabel = predictions.labels.suggestions[0];
        if (topLabel) {
            textEl.textContent = `+${topLabel.label}`;
            confidenceEl.textContent = `${Math.round(topLabel.confidence * 100)}%`;
        }
    }
    
    // Update SLA
    if (predictions.sla_breach) {
        const riskLevel = document.querySelector('.sla-risk-level');
        const progressFill = document.querySelector('.sla-progress-fill');
        const probability = document.querySelector('.sla-probability');
        
        riskLevel.textContent = predictions.sla_breach.risk_level;
        progressFill.style.width = `${predictions.sla_breach.breach_probability * 100}%`;
        probability.textContent = `${Math.round(predictions.sla_breach.breach_probability * 100)}% probability of breach`;
    }
}

// Apply Suggestion
function applySuggestion(field, value) {
    console.log(`✅ Applying suggestion: ${field} = ${value}`);
    
    // Update field
    if (field === 'priority') {
        const select = document.getElementById('priorityField');
        if (select) {
            select.value = value.toLowerCase();
        }
    } else if (field === 'assignee') {
        const select = document.getElementById('assigneeField');
        if (select) {
            select.value = value;
        }
    } else if (field === 'labels') {
        const container = document.querySelector('.labels-container');
        const newLabel = document.createElement('span');
        newLabel.className = 'label-tag';
        newLabel.textContent = value;
        container.insertBefore(newLabel, container.querySelector('.btn-add-label'));
    }
    
    // Visual feedback
    const suggestion = document.querySelector(`[data-field="${field}"] .ml-inline-suggestion`);
    if (suggestion) {
        suggestion.style.background = 'linear-gradient(135deg, #c6f6d5 0%, #f0fff4 100%)';
        suggestion.style.borderColor = '#48bb78';
        
        const btn = suggestion.querySelector('.btn-apply-inline');
        btn.innerHTML = '<i class="fas fa-check"></i> Applied';
        btn.style.background = '#48bb78';
        btn.disabled = true;
        
        setTimeout(() => {
            suggestion.style.opacity = '0';
            setTimeout(() => suggestion.remove(), 300);
        }, 2000);
    }
    
    showNotification(`✅ ${field} updated successfully`);
}

// Apply All Suggestions
function applyAllSuggestions() {
    console.log('✅ Applying all suggestions...');
    
    const suggestions = document.querySelectorAll('.ml-inline-suggestion');
    suggestions.forEach((suggestion, index) => {
        setTimeout(() => {
            const field = suggestion.parentElement.querySelector('.ml-inline-suggestion').dataset.field || 
                          suggestion.closest('.field-group').querySelector('.ml-inline-suggestion').parentElement.querySelector('select, .labels-container').id.replace('Field', '');
            const value = suggestion.querySelector('.suggestion-text strong').textContent;
            
            applySuggestion(field, value);
        }, index * 300);
    });
}

// Find Duplicates
async function findDuplicates() {
    console.log('🔍 Searching for duplicates...');
    
    if (!state.mlServiceConnected) {
        showNotification('⚠️ ML Service not connected');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:5001/predict/duplicates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                summary: "Error en API de autenticación",
                description: "Los usuarios no pueden hacer login desde la app móvil"
            })
        });
        
        const data = await response.json();
        console.log('Duplicates found:', data);
        
        if (data.duplicates && data.duplicates.length > 0) {
            showNotification(`🔍 Found ${data.duplicates.length} similar tickets`);
        } else {
            showNotification('✅ No duplicates found');
        }
    } catch (error) {
        console.error('Error finding duplicates:', error);
        showNotification('❌ Error finding duplicates');
    }
}

// Predict Resolution Time
function predictResolution() {
    console.log('⏱️ Predicting resolution time...');
    
    // Simulate prediction
    const hours = Math.floor(Math.random() * 24) + 1;
    showNotification(`⏱️ Estimated resolution time: ${hours} hours`);
    
    // Also add to AI chat if in AI mode
    if (state.actionMode === 'ai') {
        const messagesContainer = document.getElementById('miniAIMessages');
        const responseDiv = document.createElement('div');
        responseDiv.className = 'ai-message';
        responseDiv.innerHTML = `
            <div class="ai-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-message-content">
                Based on historical data and ticket complexity, I estimate this will take approximately <strong>${hours} hours</strong> to resolve.
            </div>
        `;
        messagesContainer.appendChild(responseDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Show SLA Details
function showSLADetails() {
    showNotification('⚠️ High SLA breach risk detected. Consider escalating or increasing priority.');
    
    // Add to AI chat
    if (state.actionMode === 'ai') {
        const messagesContainer = document.getElementById('miniAIMessages');
        const responseDiv = document.createElement('div');
        responseDiv.className = 'ai-message';
        responseDiv.innerHTML = `
            <div class="ai-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-message-content">
                <strong>SLA Breach Alert:</strong><br>
                This ticket has a <strong>92% probability</strong> of breaching SLA.<br>
                <strong>Recommendations:</strong>
                <ul>
                    <li>Escalate to senior engineer immediately</li>
                    <li>Increase priority to Critical</li>
                    <li>Notify stakeholders of potential delay</li>
                </ul>
            </div>
        `;
        messagesContainer.appendChild(responseDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Close modal on ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTicketModal();
    }
});

// Refresh ML Service status every 30 seconds
setInterval(checkMLService, 30000);

// Toggle Footer
function toggleMLFooter() {
    const content = document.getElementById('mlFooterContent');
    const expandBtn = document.getElementById('expandBtn');
    
    state.footerExpanded = !state.footerExpanded;
    
    if (state.footerExpanded) {
        content.style.display = 'block';
        expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i><span>Colapsar</span>';
    } else {
        content.style.display = 'none';
        expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i><span>Expandir</span>';
    }
}

// Check ML Service Status
async function checkMLService() {
    const statusEl = document.getElementById('mlServiceStatus');
    const statusDot = document.querySelector('.status-dot');
    
    try {
        const response = await fetch('http://localhost:5001/health');
        const data = await response.json();
        
        if (data.status === 'healthy') {
            state.mlServiceConnected = true;
            statusEl.textContent = 'Connected';
            statusEl.style.color = '#48bb78';
            statusDot.style.color = '#48bb78';
        } else {
            throw new Error('Service unhealthy');
        }
    } catch (error) {
        state.mlServiceConnected = false;
        statusEl.textContent = 'Disconnected';
        statusEl.style.color = '#fc8181';
        statusDot.style.color = '#fc8181';
        console.error('ML Service connection failed:', error);
    }
}

// Update Stats
function updateStats() {
    document.getElementById('suggestionCount').textContent = state.suggestionCount;
    document.getElementById('latency').textContent = `${state.latency}ms`;
}

// Open Ticket
function openTicket(ticketKey) {
    state.currentTicket = ticketKey;
    document.getElementById('modalTicketKey').textContent = ticketKey;
    document.getElementById('ticketModal').style.display = 'flex';
    
    // Auto-expand footer
    if (!state.footerExpanded) {
        toggleMLFooter();
    }
    
    // Fetch ML predictions
    fetchMLPredictions(ticketKey);
}

// Close Ticket Modal
function closeTicketModal() {
    document.getElementById('ticketModal').style.display = 'none';
    state.currentTicket = null;
}

// Fetch ML Predictions
async function fetchMLPredictions(ticketKey) {
    if (!state.mlServiceConnected) {
        console.warn('ML Service not connected');
        return;
    }
    
    try {
        const startTime = performance.now();
        
        const response = await fetch('http://localhost:5001/predict/unified', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                summary: "Error en API de autenticación",
                description: "Los usuarios no pueden hacer login desde la app móvil",
                issue_type: "Bug",
                status: "Open",
                priority: "High"
            })
        });
        
        const data = await response.json();
        const endTime = performance.now();
        
        state.latency = Math.round(endTime - startTime);
        updateStats();
        
        console.log('✅ ML Predictions received:', data);
        updateSuggestions(data);
        
    } catch (error) {
        console.error('❌ Failed to fetch predictions:', error);
    }
}

// Update Suggestions
function updateSuggestions(predictions) {
    // Update priority suggestion
    if (predictions.priority) {
        const priorityCard = document.querySelector('[data-field="priority"]');
        const valueEl = priorityCard.querySelector('.suggestion-value');
        const confidenceBar = priorityCard.querySelector('.confidence-fill');
        const confidenceText = priorityCard.querySelector('.confidence-text');
        
        valueEl.textContent = predictions.priority.predicted_priority;
        confidenceBar.style.width = `${predictions.priority.confidence * 100}%`;
        confidenceText.textContent = `${Math.round(predictions.priority.confidence * 100)}% confianza`;
    }
    
    // Update assignee suggestion
    if (predictions.assignee) {
        const assigneeCard = document.querySelector('[data-field="assignee"]');
        const valueEl = assigneeCard.querySelector('.suggestion-value');
        const confidenceBar = assigneeCard.querySelector('.confidence-fill');
        const confidenceText = assigneeCard.querySelector('.confidence-text');
        
        const topSuggestion = predictions.assignee.suggestions[0];
        if (topSuggestion) {
            valueEl.textContent = topSuggestion.assignee;
            confidenceBar.style.width = `${topSuggestion.confidence * 100}%`;
            confidenceText.textContent = `${Math.round(topSuggestion.confidence * 100)}% confianza`;
        }
    }
    
    // Update labels suggestion
    if (predictions.labels) {
        const labelsCard = document.querySelector('[data-field="labels"]');
        const valueEl = labelsCard.querySelector('.suggestion-value');
        const confidenceBar = labelsCard.querySelector('.confidence-fill');
        const confidenceText = labelsCard.querySelector('.confidence-text');
        
        const topLabels = predictions.labels.suggestions.slice(0, 3).map(l => l.label).join(', ');
        const avgConfidence = predictions.labels.suggestions.slice(0, 3)
            .reduce((sum, l) => sum + l.confidence, 0) / 3;
        
        valueEl.textContent = topLabels;
        confidenceBar.style.width = `${avgConfidence * 100}%`;
        confidenceText.textContent = `${Math.round(avgConfidence * 100)}% confianza`;
    }
    
    // Update SLA
    if (predictions.sla_breach) {
        const slaCard = document.querySelector('[data-field="sla"]');
        const valueEl = slaCard.querySelector('.suggestion-value');
        const confidenceBar = slaCard.querySelector('.confidence-fill');
        const confidenceText = slaCard.querySelector('.confidence-text');
        
        valueEl.textContent = predictions.sla_breach.risk_level;
        confidenceBar.style.width = `${predictions.sla_breach.breach_probability * 100}%`;
        confidenceText.textContent = `${Math.round(predictions.sla_breach.breach_probability * 100)}% probabilidad breach`;
    }
}

// Apply Suggestion
function applySuggestion(field, value) {
    console.log(`✅ Applying suggestion: ${field} = ${value}`);
    
    // Update field in modal if open
    if (field === 'priority') {
        const select = document.getElementById('priorityField');
        if (select) {
            select.value = value.toLowerCase();
        }
    } else if (field === 'assignee') {
        const select = document.getElementById('assigneeField');
        if (select) {
            // Find matching option (simplified)
            for (let option of select.options) {
                if (option.text.includes(value)) {
                    select.value = option.value;
                    break;
                }
            }
        }
    }
    
    // Visual feedback
    const card = document.querySelector(`[data-field="${field}"]`);
    if (card) {
        card.style.background = 'linear-gradient(135deg, #c6f6d5 0%, #ffffff 100%)';
        const btn = card.querySelector('.btn-apply');
        btn.innerHTML = '<i class="fas fa-check"></i> Aplicado';
        btn.disabled = true;
        btn.style.background = '#48bb78';
        
        setTimeout(() => {
            card.style.background = 'white';
        }, 2000);
    }
}

// Apply All Suggestions
function applyAllSuggestions() {
    console.log('✅ Applying all suggestions...');
    
    const cards = document.querySelectorAll('.suggestion-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            const field = card.dataset.field;
            const value = card.querySelector('.suggestion-value').textContent;
            
            if (field !== 'sla') {
                applySuggestion(field, value);
            }
        }, index * 300);
    });
}

// Find Duplicates
async function findDuplicates() {
    console.log('🔍 Searching for duplicates...');
    
    if (!state.mlServiceConnected) {
        alert('ML Service no conectado');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:5001/predict/duplicates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                summary: "Error en API de autenticación",
                description: "Los usuarios no pueden hacer login desde la app móvil"
            })
        });
        
        const data = await response.json();
        console.log('Duplicates found:', data);
        
        if (data.duplicates && data.duplicates.length > 0) {
            alert(`Encontrados ${data.duplicates.length} tickets similares`);
        } else {
            alert('No se encontraron duplicados');
        }
    } catch (error) {
        console.error('Error finding duplicates:', error);
        alert('Error al buscar duplicados');
    }
}

// Generate Comment
async function generateComment() {
    console.log('💬 Generating comment...');
    
    if (!state.mlServiceConnected) {
        alert('ML Service no conectado');
        return;
    }
    
    // Simulate comment generation
    const comments = [
        "He investigado el problema y parece estar relacionado con la configuración de OAuth.",
        "Requiere revisión del equipo de backend para validar los endpoints de autenticación.",
        "Verificando logs del servidor para identificar la causa raíz del problema."
    ];
    
    const randomComment = comments[Math.floor(Math.random() * comments.length)];
    addMiniChatMessage('ai', `Sugerencia de comentario: "${randomComment}"`);
}

// Predict Resolution Time
function predictResolution() {
    console.log('⏱️ Predicting resolution time...');
    
    // Simulate prediction
    const hours = Math.floor(Math.random() * 24) + 1;
    addMiniChatMessage('ai', `Tiempo estimado de resolución: ${hours} horas`);
}

// Show SLA Details
function showSLADetails() {
    addMiniChatMessage('ai', 'El ticket tiene alta probabilidad de breach SLA. Recomiendo escalarlo o aumentar la prioridad.');
}

// Refresh ML Service status every 30 seconds
setInterval(checkMLService, 30000);
