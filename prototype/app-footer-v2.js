/**
 * FLOWING MVP - FOOTER ML ASSISTANT V2
 * JavaScript optimizado con checkboxes
 */

// Estado global
const state = {
    footerExpanded: false,
    currentTicket: { key: 'MSM-1234', summary: 'Error en API de autenticación' },
    mlServiceConnected: false,
    currentMode: 'comments',
    duplicates: [],
    estimatedResolution: null
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Flowing MVP Footer ML Assistant V2 initialized');
    checkMLService();
    setupVisibilityToggle();
    // Toggle view button
    const toggleViewBtn = document.getElementById('toggleViewBtn');
    if (toggleViewBtn) {
        toggleViewBtn.addEventListener('click', () => switchView());
    }
});

// Toggle Footer
function toggleMLFooter() {
    const content = document.getElementById('mlFooterContent');
    const btn = document.getElementById('expandBtn');
    
    state.footerExpanded = !state.footerExpanded;
    
    if (state.footerExpanded) {
        content.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-chevron-down"></i>';
    } else {
        content.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    }
}

// Toggle Extra Details
function toggleExtraDetails() {
    const content = document.getElementById('extraDetailsContent');
    const btn = document.querySelector('.btn-toggle-details');
    const chevron = document.getElementById('detailsChevron');
    const text = document.getElementById('detailsText');
    
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        chevron.style.transform = 'rotate(180deg)';
        text.textContent = 'Show Less Details';
        btn.classList.add('active');
    } else {
        content.style.display = 'none';
        chevron.style.transform = 'rotate(0deg)';
        text.textContent = 'Show More Details';
        btn.classList.remove('active');
    }
}

// Select All Suggestions
function selectAllSuggestions() {
    const checkboxes = document.querySelectorAll('.ml-cb');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
    });
    
    // Update banner buttons text (if any)
    document.querySelectorAll('.btn-banner-action').forEach(btn => {
        btn.innerHTML = allChecked 
            ? '<i class="fas fa-check-square"></i> Select All'
            : '<i class="fas fa-square"></i> Deselect All';
    });
}

// Apply Selected Suggestions
function applySelectedSuggestions() {
    const checkboxes = document.querySelectorAll('.ml-cb:checked');
    
    if (checkboxes.length === 0) {
        showNotification('⚠️ No suggestions selected');
        return;
    }
    
    let applied = 0;
    
    checkboxes.forEach((cb, index) => {
        const suggestionBox = cb.closest('.ml-suggestion-checkbox');
        const field = suggestionBox.dataset.field;
        const value = suggestionBox.dataset.value;
        
        setTimeout(() => {
            applySuggestion(field, value);
            applied++;
            
            if (applied === checkboxes.length) {
                showNotification(`✅ Applied ${applied} suggestion${applied > 1 ? 's' : ''}`);
            }
        }, index * 200);
    });
}

// Update ML availability UI (enable/disable suggestion controls)
function updateMLAvailability() {
    const enabled = !!state.mlServiceConnected;
    document.querySelectorAll('.ml-cb').forEach(cb => {
        cb.disabled = !enabled;
    });
    const applyBtn = document.querySelector('.btn-apply-selected');
    if (applyBtn) applyBtn.disabled = !enabled;
    document.querySelectorAll('.btn-banner-action').forEach(b => b.disabled = !enabled);
}

// Switch between balanced view and chat-only view
function switchView() {
    const footer = document.getElementById('mlFooter');
    footer.classList.toggle('chat-only');
    const toggleBtn = document.getElementById('toggleViewBtn');
    if (footer.classList.contains('chat-only')) {
        toggleBtn.innerHTML = '<i class="fas fa-columns"></i>';
        toggleBtn.title = 'Switch to Balanced View';
    } else {
        toggleBtn.innerHTML = '<i class="fas fa-comment-dots"></i>';
        toggleBtn.title = 'Switch to Chat View';
    }
}

// Apply Single Suggestion
function applySuggestion(field, value) {
    console.log(`✅ Applying: ${field} = ${value}`);
    
    if (field === 'priority') {
        document.getElementById('priorityField').value = value;
    } else if (field === 'assignee') {
        document.getElementById('assigneeField').value = value;
    } else if (field === 'labels') {
        const container = document.querySelector('.labels-container');
        const newLabel = document.createElement('span');
        newLabel.className = 'label-tag';
        newLabel.textContent = value;
        container.insertBefore(newLabel, container.querySelector('.btn-add-label'));
    }
    
    // Visual feedback
    const suggestionBox = document.querySelector(`[data-field="${field}"]`);
    if (suggestionBox) {
        suggestionBox.style.background = 'linear-gradient(135deg, #c6f6d5 0%, #f0fff4 100%)';
        suggestionBox.style.borderColor = '#48bb78';
        
        const checkbox = suggestionBox.querySelector('.ml-cb');
        checkbox.disabled = true;
        
        setTimeout(() => {
            suggestionBox.style.opacity = '0.5';
        }, 1000);
    }
}

// Switch Mode (Comments <-> AI)
function switchMode(mode) {
    state.currentMode = mode;
    
    // Update tabs
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    
    // Update panels
    document.querySelectorAll('.mode-panel').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.panel === mode);
    });
    
    // Update input area
    const badge = document.getElementById('modeBadge');
    const input = document.getElementById('unifiedInput');
    const sendBtn = document.getElementById('sendBtnText');
    const toolbar = document.getElementById('inputToolbar');
    
    if (mode === 'comments') {
        badge.textContent = '💬 Comment mode';
        input.placeholder = 'Write a comment... (@ to mention)';
        sendBtn.textContent = 'Post';
        toolbar.style.display = 'flex';
    } else {
        badge.textContent = '🤖 AI mode';
        input.placeholder = 'Ask the AI anything...';
        sendBtn.textContent = 'Ask';
        toolbar.style.display = 'none';
    }
}

// Handle Send
function handleSend() {
    const input = document.getElementById('unifiedInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (state.currentMode === 'comments') {
        postComment(message);
    } else {
        askAI(message);
    }
    
    input.value = '';
}

// Handle Input Key
function handleInputKey(event) {
    if (event.key === 'Enter' && event.ctrlKey) {
        handleSend();
    }
}

// Post Comment
function postComment(message) {
    console.log('💬 Posting comment:', message);
    
    const isInternal = document.getElementById('visibilityCheck').checked;
    const commentsList = document.getElementById('commentsList');
    
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment-item';
    commentDiv.innerHTML = `
        <div class="comment-avatar">YOU</div>
        <div class="comment-body">
            <div class="comment-header">
                <span class="comment-author">You</span>
                <span class="comment-time">Just now</span>
                ${isInternal ? '<span style="color: #f59e0b; font-size: 0.75rem;">🔒</span>' : ''}
            </div>
            <div class="comment-text">${message}</div>
        </div>
    `;
    
    commentsList.insertBefore(commentDiv, commentsList.firstChild);
    showNotification('✅ Comment posted');
}

// Ask AI
function askAI(question) {
    console.log('🤖 Asking AI:', question);
    
    const aiMessages = document.getElementById('aiMessages');
    
    // User message
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-message';
    userMsg.style.background = 'linear-gradient(135deg, #e6f2ff 0%, #dbeafe 100%)';
    userMsg.style.borderLeft = '4px solid #3b82f6';
    userMsg.innerHTML = `
        <div class="ai-avatar" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
            <i class="fas fa-user"></i>
        </div>
        <div class="ai-text">${question}</div>
    `;
    aiMessages.appendChild(userMsg);
    
    // Thinking
    const thinking = document.createElement('div');
    thinking.className = 'ai-message';
    thinking.innerHTML = `
        <div class="ai-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="ai-text"><em>Thinking...</em></div>
    `;
    aiMessages.appendChild(thinking);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    
    // Simulate response
    setTimeout(() => {
        thinking.remove();
        
        const response = generateAIResponse(question);
        const aiMsg = document.createElement('div');
        aiMsg.className = 'ai-message';
        aiMsg.innerHTML = `
            <div class="ai-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-text">${response}</div>
        `;
        aiMessages.appendChild(aiMsg);
        aiMessages.scrollTop = aiMessages.scrollHeight;
    }, 1500);
}

// Generate AI Response
function generateAIResponse(question) {
    const lowerQ = question.toLowerCase();
    
    if (lowerQ.includes('prioridad')) {
        return 'Basándome en el análisis, recomiendo prioridad <strong>Alta</strong> debido a que afecta autenticación, componente crítico del sistema.';
    } else if (lowerQ.includes('asignar')) {
        return 'Sugiero asignar a <strong>Carlos Q.</strong> quien tiene experiencia con problemas de autenticación (78% confianza).';
    } else if (lowerQ.includes('sla')) {
        return 'Este ticket tiene <strong>alto riesgo de breach SLA</strong> (92%). Recomiendo escalarlo inmediatamente.';
    } else if (lowerQ.includes('duplicado')) {
        return 'Encontré 2 tickets similares: MSM-1189 y MSM-1201. Ambos relacionados con errores de autenticación.';
    }
    
    return 'Entiendo tu pregunta. Recomiendo revisar los logs del servidor y verificar la configuración de OAuth. ¿Necesitas ayuda con algo más?';
}

// Copy Comment
function copyComment(element) {
    const text = element.querySelector('.suggestion-text').textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const btn = element.querySelector('.btn-copy');
        const originalHTML = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.style.background = '#48bb78';
        btn.style.color = 'white';
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.color = '';
        }, 2000);
        
        showNotification('✅ Comment copied to clipboard');
    });
}

// Find Duplicates
async function findDuplicates() {
    console.log('🔍 Finding duplicates...');
    
    if (state.duplicates && state.duplicates.length > 0) {
        // Show stored duplicates
        const duplicatesList = state.duplicates
            .map(d => `${d.issue_key} (${Math.round(d.similarity * 100)}% similar)`)
            .join(', ');
        showNotification(`🔍 Found ${state.duplicates.length} duplicates: ${duplicatesList}`);
    } else {
        showNotification('🔍 Searching for duplicates...');
        
        // Re-fetch if not available
        try {
            const response = await fetch('http://localhost:5001/predict/duplicates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summary: state.currentTicket.summary,
                    description: document.getElementById('ticketDescription').textContent
                })
            });
            
            const data = await response.json();
            
            if (data.duplicates && data.duplicates.length > 0) {
                state.duplicates = data.duplicates;
                const duplicatesList = data.duplicates
                    .map(d => `${d.issue_key} (${Math.round(d.similarity * 100)}% similar)`)
                    .join(', ');
                showNotification(`✅ Found ${data.duplicates.length} duplicates: ${duplicatesList}`);
            } else {
                showNotification('✅ No duplicates found');
            }
        } catch (error) {
            console.error('Error finding duplicates:', error);
            showNotification('❌ Error searching duplicates');
        }
    }
}

// Predict Resolution
function predictResolution() {
    console.log('⏱️ Predicting resolution...');
    
    if (state.estimatedResolution) {
        showNotification(`⏱️ Estimated: ${state.estimatedResolution} hours`);
    } else {
        const hours = Math.floor(Math.random() * 24) + 1;
        showNotification(`⏱️ Estimated: ${hours} hours`);
    }
}

// Show SLA Details
function showSLADetails() {
    if (state.currentMode !== 'ai') {
        switchMode('ai');
    }
    
    setTimeout(() => {
        const aiMessages = document.getElementById('aiMessages');
        const msg = document.createElement('div');
        msg.className = 'ai-message';
        msg.innerHTML = `
            <div class="ai-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-text">
                <strong>SLA Breach Alert:</strong><br>
                Este ticket tiene <strong>92% probabilidad</strong> de breach.<br>
                <strong>Recomendaciones:</strong>
                <ul>
                    <li>Escalar a senior engineer</li>
                    <li>Aumentar prioridad a Critical</li>
                    <li>Notificar stakeholders</li>
                </ul>
            </div>
        `;
        aiMessages.appendChild(msg);
        aiMessages.scrollTop = aiMessages.scrollHeight;
    }, 100);
}

// Open Ticket
function openTicket(ticketKey) {
    state.currentTicket = { key: ticketKey, summary: 'Error en API de autenticación' };
    
    document.getElementById('currentTicketKey').textContent = ticketKey;
    document.getElementById('currentTicketSummary').textContent = state.currentTicket.summary;
    // Show ticket info header only when a ticket is opened
    const ticketHeader = document.getElementById('ticketInfoHeader');
    if (ticketHeader) ticketHeader.classList.remove('hidden');
    
    if (!state.footerExpanded) {
        toggleMLFooter();
    }
    
    fetchMLPredictions(ticketKey);
}

// Fetch ML Predictions (ALL MODELS)
async function fetchMLPredictions(ticketKey) {
    if (!state.mlServiceConnected) {
        console.warn('ML Service not connected');
        return;
    }
    
    try {
        const ticketData = {
            summary: state.currentTicket.summary,
            description: document.getElementById('ticketDescription').textContent,
            issue_type: "Bug",
            status: "Open",
            priority: "High",
            created: "2025-12-09T14:30:00",
            reporter: "Juan Pérez"
        };
        
        // Fetch ALL ML predictions in parallel
        const [unifiedResponse, duplicatesResponse, resolutionResponse, slaResponse] = await Promise.all([
            // 1. Unified predictions (priority, assignee, labels)
            fetch('http://localhost:5001/predict/unified', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticketData)
            }),
            
            // 2. Duplicate detection
            fetch('http://localhost:5001/predict/duplicates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summary: ticketData.summary,
                    description: ticketData.description
                })
            }),
            
            // 3. Resolution time prediction
            fetch('http://localhost:5001/predict/resolution-time', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticketData)
            }),
            
            // 4. SLA breach prediction
            fetch('http://localhost:5001/predict/sla-breach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticketData)
            })
        ]);
        
        const unifiedData = await unifiedResponse.json();
        const duplicatesData = await duplicatesResponse.json();
        const resolutionData = await resolutionResponse.json();
        const slaData = await slaResponse.json();
        
        console.log('✅ All ML Predictions received:', {
            unified: unifiedData,
            duplicates: duplicatesData,
            resolution: resolutionData,
            sla: slaData
        });
        
        // Update UI with all predictions
        updateMLSuggestions(unifiedData);
        updateSLAPrediction(slaData);
        updateResolutionTime(resolutionData);
        storeDuplicates(duplicatesData);
        
    } catch (error) {
        console.error('❌ Failed to fetch predictions:', error);
        showNotification('⚠️ Error loading ML predictions');
    }
}

// Update ML Suggestions
function updateMLSuggestions(predictions) {
    // Priority
    if (predictions.priority) {
        const prioritySuggestion = document.querySelector('[data-field="priority"]');
        if (prioritySuggestion) {
            const priorityValue = predictions.priority.predicted_priority.toLowerCase();
            prioritySuggestion.dataset.value = priorityValue;
            prioritySuggestion.querySelector('.ml-text strong').textContent = predictions.priority.predicted_priority;
            prioritySuggestion.querySelector('.ml-conf').textContent = `${Math.round(predictions.priority.confidence * 100)}%`;
            // Optional explanation & source
            if (predictions.priority.explanation) {
                const explainEl = prioritySuggestion.querySelector('.ml-explain');
                if (explainEl) explainEl.textContent = predictions.priority.explanation;
            }
            if (predictions.priority.model) {
                const sourceEl = prioritySuggestion.querySelector('.ml-source');
                if (sourceEl) sourceEl.textContent = `Model: ${predictions.priority.model}`;
            }
        }
    }
    
    // Assignee
    if (predictions.assignee && predictions.assignee.suggestions && predictions.assignee.suggestions.length > 0) {
        const assigneeSuggestion = document.querySelector('[data-field="assignee"]');
        if (assigneeSuggestion) {
            const topAssignee = predictions.assignee.suggestions[0];
            // Map assignee name to select value
            const assigneeMap = {
                'Carlos Q.': 'carlos',
                'Carlos Quintero': 'carlos',
                'Ana M.': 'ana',
                'Ana Martinez': 'ana',
                'Luis P.': 'luis',
                'Luis Perez': 'luis'
            };
            const assigneeValue = assigneeMap[topAssignee.assignee] || 'carlos';
            assigneeSuggestion.dataset.value = assigneeValue;
            assigneeSuggestion.querySelector('.ml-text strong').textContent = topAssignee.assignee;
            assigneeSuggestion.querySelector('.ml-conf').textContent = `${Math.round(topAssignee.confidence * 100)}%`;
            if (topAssignee.explanation) {
                const explainEl = assigneeSuggestion.querySelector('.ml-explain');
                if (explainEl) explainEl.textContent = topAssignee.explanation;
            }
            if (topAssignee.model) {
                const sourceEl = assigneeSuggestion.querySelector('.ml-source');
                if (sourceEl) sourceEl.textContent = `Model: ${topAssignee.model}`;
            }
        }
    }
    
    // Labels
    if (predictions.labels && predictions.labels.suggestions && predictions.labels.suggestions.length > 0) {
        const labelsSuggestion = document.querySelector('[data-field="labels"]');
        if (labelsSuggestion) {
            const topLabel = predictions.labels.suggestions[0];
            labelsSuggestion.dataset.value = topLabel.label;
            labelsSuggestion.querySelector('.ml-text strong').textContent = `+${topLabel.label}`;
            labelsSuggestion.querySelector('.ml-conf').textContent = `${Math.round(topLabel.confidence * 100)}%`;
            if (topLabel.explanation) {
                const explainEl = labelsSuggestion.querySelector('.ml-explain');
                if (explainEl) explainEl.textContent = topLabel.explanation;
            }
            if (topLabel.model) {
                const sourceEl = labelsSuggestion.querySelector('.ml-source');
                if (sourceEl) sourceEl.textContent = `Model: ${topLabel.model}`;
            }
        }
    }
}

// Update SLA Prediction
function updateSLAPrediction(slaData) {
    if (slaData && slaData.breach_probability !== undefined) {
        const riskLevel = slaData.risk_level || 'MEDIUM RISK';
        const probability = Math.round(slaData.breach_probability * 100);
        
        document.querySelector('.sla-risk').textContent = riskLevel;
        document.querySelector('.sla-bar-fill').style.width = `${probability}%`;
        document.querySelector('.sla-prob').textContent = `${probability}% probability of breach`;
        
        // Update card color based on risk
        const slaCard = document.querySelector('.sla-card');
        if (probability > 75) {
            slaCard.style.borderColor = '#fc8181';
            slaCard.style.background = 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)';
        } else if (probability > 50) {
            slaCard.style.borderColor = '#f59e0b';
            slaCard.style.background = 'linear-gradient(135deg, #fef5e7 0%, #ffffff 100%)';
        } else {
            slaCard.style.borderColor = '#48bb78';
            slaCard.style.background = 'linear-gradient(135deg, #f0fff4 0%, #ffffff 100%)';
        }
    }
}

// Update Resolution Time
function updateResolutionTime(resolutionData) {
    if (resolutionData && resolutionData.estimated_hours) {
        const hours = Math.round(resolutionData.estimated_hours);
        state.estimatedResolution = hours;
        console.log(`⏱️ Estimated resolution: ${hours} hours`);
    }
}

// Store Duplicates Data
function storeDuplicates(duplicatesData) {
    if (duplicatesData && duplicatesData.duplicates) {
        state.duplicates = duplicatesData.duplicates;
        console.log(`🔍 Found ${duplicatesData.duplicates.length} potential duplicates`);
    }
}

// Setup Visibility Toggle
function setupVisibilityToggle() {
    const toggle = document.getElementById('visibilityCheck');
    const label = toggle?.nextElementSibling;
    
    if (toggle && label) {
        toggle.addEventListener('change', (e) => {
            const icon = label.querySelector('.vis-icon');
            const text = label.querySelector('.vis-text');
            
            if (e.target.checked) {
                icon.textContent = '🔒';
                text.textContent = 'Internal';
            } else {
                icon.textContent = '🔓';
                text.textContent = 'Public';
            }
        });
    }
}

// Show Notification
function showNotification(message) {
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
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Check ML Service
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
            updateMLAvailability();
        } else {
            throw new Error('Unhealthy');
        }
    } catch (error) {
        state.mlServiceConnected = false;
        statusEl.textContent = 'Disconnected';
        statusEl.style.color = '#fc8181';
        statusDot.style.color = '#fc8181';
        updateMLAvailability();
        console.error('ML Service connection failed:', error);
    }
}

// Refresh ML Service status every 30 seconds
setInterval(checkMLService, 30000);

// Cancel Suggestions
function cancelSuggestions() {
    console.log('❌ Cancelling suggestions...');
    document.querySelectorAll('.ml-cb:checked').forEach(cb => {
        cb.checked = false;
    });
    showNotification('🚫 All suggestions cancelled');
}

// Resuggest ML
async function resuggestML() {
    console.log('🔄 Re-fetching ML suggestions...');
    showNotification('🔄 Requesting new suggestions from ML...');
    
    if (!state.mlServiceConnected) {
        showNotification('⚠️ ML Service not connected');
        return;
    }
    
    if (!state.currentTicket || !state.currentTicket.key) {
        showNotification('⚠️ No ticket selected');
        return;
    }
    
    // Reset all checkboxes
    document.querySelectorAll('.ml-cb').forEach(cb => {
        cb.checked = false;
        const suggestionBox = cb.closest('.ml-suggestion-checkbox');
        if (suggestionBox) {
            suggestionBox.style.opacity = '1';
            suggestionBox.style.background = '';
            suggestionBox.style.borderColor = '';
        }
    });
    
    // Re-fetch predictions
    await fetchMLPredictions(state.currentTicket.key);
    showNotification('✅ New suggestions loaded');
}
