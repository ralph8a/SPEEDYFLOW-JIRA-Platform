/**
 * SpeedyFlow Login Modal
 * First-time login and configuration screen
 */
class UserSetupModal {
    constructor() {
        this.modal = null;
        this.initialized = false;
    }
    /**
     * Check if login is needed and show modal
     */
    async checkAndShow() {
        try {
            const response = await fetch('/api/user/login-status');
            const data = await response.json();
            if (data.data && data.data.needs_login) {
                console.log('🔐 Login required');
                await this.show();
            } else {
                console.log('✅ User already logged in:', data.data);
            }
        } catch (error) {
            console.error('Error checking login status:', error);
            // If endpoint doesn't exist, show login anyway
            await this.show();
        }
    }
    /**
     * Show login modal
     */
    async show() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            return;
        }
        // Create modal HTML
        const modalHTML = `
            <div id="userSetupModal" class="setup-modal">
                <div class="setup-modal-content">
                    <div class="setup-modal-header">
                        <img src="/static/img/speedyflow-logo.svg" alt="SpeedyFlow" class="setup-logo">
                        <h2>Bienvenido a SpeedyFlow</h2>
                        <p>Inicia sesión con tus credenciales de JIRA</p>
                    </div>
                    <div class="setup-modal-body">
                        <form id="loginForm">
                            <div class="setup-form-group">
                                <label for="jiraSite">
                                    <strong>JIRA Site URL</strong>
                                    <span class="setup-hint">Tu dominio de Atlassian</span>
                                </label>
                                <input 
                                    type="url" 
                                    id="jiraSite" 
                                    placeholder="https://tu-empresa.atlassian.net"
                                    required
                                />
                                <small class="setup-help">
                                    📍 Copia la URL desde tu navegador cuando estés en JIRA<br>
                                    Ejemplo: <code>https://speedymovil.atlassian.net</code>
                                </small>
                            </div>
                            <div class="setup-form-group">
                                <label for="jiraEmail">
                                    <strong>Email</strong>
                                    <span class="setup-hint">Tu correo de JIRA</span>
                                </label>
                                <input 
                                    type="email" 
                                    id="jiraEmail" 
                                    placeholder="tu-email@empresa.com"
                                    required
                                />
                            </div>
                            <div class="setup-form-group">
                                <label for="jiraToken">
                                    <strong>API Token</strong>
                                    <span class="setup-hint">Token de acceso personal</span>
                                </label>
                                <input 
                                    type="password" 
                                    id="jiraToken" 
                                    placeholder="••••••••••••••••"
                                    required
                                />
                                <!-- Expandable guide -->
                                <details class="token-guide">
                                    <summary>¿No sabes cómo obtener tu token de JIRA? Click para ver la guía</summary>
                                    <div class="token-guide-content">
                                        <h4>📖 Cómo generar tu API Token</h4>
                                        <ol>
                                            <li>Ve a <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank">Atlassian API Tokens</a></li>
                                            <li>Haz click en <strong>"Create API token"</strong></li>
                                            <li>Dale un nombre al token (ej: "SpeedyFlow")</li>
                                            <li>Copia el token generado</li>
                                            <li>Pégalo en el campo de arriba ☝️</li>
                                        </ol>
                                        <div class="token-guide-warning">
                                            ⚠️ <strong>Importante:</strong> Guarda el token en un lugar seguro. 
                                            No podrás verlo de nuevo después de cerrarlo.
                                        </div>
                                    </div>
                                </details>
                            </div>
                            <div class="setup-form-group">
                                <label for="projectKey">
                                    <strong>Project Key</strong>
                                    <span class="setup-hint setup-required">* Obligatorio</span>
                                </label>
                                <input 
                                    type="text" 
                                    id="projectKey" 
                                    placeholder="MSM, AP, IT, etc."
                                    maxlength="10"
                                    style="text-transform: uppercase;"
                                    required
                                />
                                <small class="setup-help">
                                    📍 Búscalo en tus tickets de JIRA (ejemplo: <code>MSM</code>-123)<br>
                                    Estructura: Las primeras letras antes del guión
                                </small>
                                <div class="setup-warning-note">
                                    <strong>⚠️ IMPORTANTE:</strong> El Project Key debe ser exacto. 
                                    Un nombre incorrecto puede generar inconsistencias en la detección de colas.
                                </div>
                            </div>
                            <div id="setupError" class="setup-error" style="display: none;"></div>
                            <div class="setup-modal-footer">
                                <button type="submit" id="setupSaveBtn" class="setup-btn-primary">
                                    🔐 Guardar mis Credenciales
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('userSetupModal');
        // Setup event listeners
        this.setupEventListeners();
        this.initialized = true;
    }
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const form = document.getElementById('loginForm');
        const projectKeyInput = document.getElementById('projectKey');
        // Convert project key to uppercase
        if (projectKeyInput) {
            projectKeyInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
        // Form submit
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConfiguration();
        });
    }
    /**
     * Save credentials and configuration
     */
    async saveConfiguration() {
        const jiraSite = document.getElementById('jiraSite').value.trim();
        const jiraEmail = document.getElementById('jiraEmail').value.trim();
        const jiraToken = document.getElementById('jiraToken').value.trim();
        const projectKey = document.getElementById('projectKey').value.trim();
        const errorDiv = document.getElementById('setupError');
        const saveBtn = document.getElementById('setupSaveBtn');
        // Validate required fields
        if (!jiraSite) {
            this.showError('Por favor ingresa tu JIRA Site URL');
            return;
        }
        if (!jiraEmail) {
            this.showError('Por favor ingresa tu email');
            return;
        }
        if (!jiraToken) {
            this.showError('Por favor ingresa tu API Token');
            return;
        }
        if (!projectKey) {
            this.showError('Por favor ingresa tu Project Key (obligatorio)');
            return;
        }
        if (projectKey.length < 2) {
            this.showError('El Project Key debe tener al menos 2 caracteres');
            return;
        }
        // Validate URL format
        try {
            new URL(jiraSite);
        } catch {
            this.showError('URL inválida. Debe comenzar con https://');
            return;
        }
        // Validate email format
        if (!jiraEmail.includes('@')) {
            this.showError('Email inválido');
            return;
        }
        // Disable button
        saveBtn.disabled = true;
        saveBtn.innerHTML = '⏳ Guardando credenciales...';
        errorDiv.style.display = 'none';
        try {
            const response = await fetch('/api/user/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jira_site: jiraSite,
                    jira_email: jiraEmail,
                    jira_token: jiraToken,
                    project_key: projectKey || null
                })
            });
            const result = await response.json();
            if (result.data && result.data.success) {
                // Success!
                const successIcon = typeof SVGIcons !== 'undefined' 
                  ? SVGIcons.success({ size: 16, className: 'inline-icon' })
                  : '✅';
                saveBtn.innerHTML = `${successIcon} Credenciales Guardadas`;
                saveBtn.classList.add('success');
                // Show success message
                this.showSuccess(`${successIcon} Configuración guardada. Inicializando SpeedyFlow...`);
                // Reload and trigger initial filters
                setTimeout(() => {
                    // Store flag to trigger initial filters after reload
                    sessionStorage.setItem('speedyflow_just_logged_in', 'true');
                    if (projectKey) {
                        sessionStorage.setItem('speedyflow_initial_project', projectKey);
                    }
                    window.location.reload();
                }, 2000);
            } else {
                this.showError(result.data?.error || 'Error al guardar credenciales');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '🔐 Guardar mis Credenciales';
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.showError('Error al guardar credenciales');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '🔐 Guardar mis Credenciales';
        }
    }
    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.getElementById('setupError');
        errorDiv.textContent = '❌ ' + message;
        errorDiv.style.display = 'block';
    }
    /**
     * Show success message
     */
    showSuccess(message) {
        const errorDiv = document.getElementById('setupError');
        errorDiv.textContent = '✅ ' + message;
        errorDiv.className = 'setup-success';
        errorDiv.style.display = 'block';
    }
    /**
     * Hide modal
     */
    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
}
// Initialize on page load
const userSetupModal = new UserSetupModal();
// Check on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => userSetupModal.checkAndShow(), 500);
    });
} else {
    setTimeout(() => userSetupModal.checkAndShow(), 500);
}
// Export for manual use
window.userSetupModal = userSetupModal;
