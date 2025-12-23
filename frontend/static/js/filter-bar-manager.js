/**
 * SPEEDYFLOW - Filter Bar Manager
 * Manages filter bar controls: service desk and queue selectors
 */

class FilterManager {
    constructor() {
        this.deskSelect = document.getElementById('serviceDeskSelectFilter');
        this.queueSelect = document.getElementById('queueSelectFilter');
        this.filterStatus = document.getElementById('filterStatus');
        this.isInitialized = false;
        this.queueLoaded = false;

        this.init();
    }

    init() {
        console.log('🔧 FilterManager initializing...');

        // Hide old sidebar selects (no longer used)
        this.hideOldSelects();

        // Setup change listeners
        this.setupListeners();

        // Listen for queue population (from app.js)
        this.setupEventListeners();

        console.log('✅ FilterManager initialized');
    }

    hideOldSelects() {
        const oldDesk = document.getElementById('serviceDeskSelect');
        const oldQueue = document.getElementById('queueSelect');

        if (oldDesk) {
            oldDesk.style.display = 'none';
            console.log('🚫 Hidden old serviceDeskSelect');
        }
        if (oldQueue) {
            oldQueue.style.display = 'none';
            console.log('🚫 Hidden old queueSelect');
        }
    }

    setupListeners() {
        if (this.deskSelect) {
            this.deskSelect.addEventListener('change', (e) => this.onDeskChange(e));
            console.log('📡 Desk select listener attached');
        }

        if (this.queueSelect) {
            this.queueSelect.addEventListener('change', (e) => this.onQueueChange(e));
            console.log('📡 Queue select listener attached');
        }
    }

    setupEventListeners() {
        // Listen for when queues are populated by app.js
        window.addEventListener('queues-loaded', () => {
            console.log('📡 Queues loaded event received');
            this.queueLoaded = true;
            // Just mark as loaded - let app.js handle filtering
        });
    }

    onDeskChange(event) {
        const deskValue = event.target.value;
        const deskText = event.target.options[event.target.selectedIndex].text;

        if (!deskValue) {
            console.warn('⚠️ Desk selection cleared');
            this.updateStatus('Select a desk...', 'warning');
            return;
        }

        console.log(`✅ Desk changed: ${deskText} (${deskValue})`);
        this.updateStatus(`Loading queues for ${deskText}...`, 'loading');

        // Reset queue loaded flag
        this.queueLoaded = false;
    }

    onQueueChange(event) {
        const queueValue = event.target.value;
        const queueText = event.target.options[event.target.selectedIndex].text;

        if (!queueValue) {
            console.warn('⚠️ Queue selection cleared');
            this.updateStatus('Select a queue...', 'warning');
            return;
        }

        console.log(`✅ Queue changed: ${queueText} (${queueValue})`);
        this.updateStatus(`Loading tickets for ${queueText}...`, 'loading');
    }

    autoSelectDefaults() {
        console.log('🔄 AutoSelect: Attempting desk selection...');

        // Try to auto-select "Servicios a Cliente" desk
        const deskOption = this.findOption(this.deskSelect, ['Servicios', 'servicios', 'cliente']);
        if (deskOption) {
            this.deskSelect.value = deskOption.value;
            console.log(`✅ Auto-selected desk: ${deskOption.text}`);
            this.updateStatus(`Desk: ${deskOption.text}`, 'success');

            // Trigger change to load queues
            this.deskSelect.dispatchEvent(new Event('change', { bubbles: true }));

            // Wait for queues to load
            console.log('⏳ Waiting for queues to populate...');
        } else {
            console.warn('⚠️ Target desk not found, selecting first available');
            const firstDesk = Array.from(this.deskSelect.options).find(
                (opt, idx) => idx > 0 && opt.value
            );
            if (firstDesk) {
                this.deskSelect.value = firstDesk.value;
                console.log(`✅ Auto-selected first desk: ${firstDesk.text}`);
                this.updateStatus(`Desk: ${firstDesk.text}`, 'success');
                this.deskSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    autoSelectQueue() {
        console.log('🔄 AutoSelect: Attempting queue selection...');

        const queueOption = this.findOption(this.queueSelect, ['Assigned', 'assigned', 'me']);

        if (queueOption) {
            this.queueSelect.value = queueOption.value;
            console.log(`✅ Auto-selected queue: ${queueOption.text}`);
            this.updateStatus(`Queue: ${queueOption.text}`, 'success');
            this.queueSelect.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            console.warn('⚠️ "Assigned to me" queue not found, selecting first available');
            const firstValid = Array.from(this.queueSelect.options).find(
                (opt, idx) => idx > 0 && opt.value
            );
            if (firstValid) {
                this.queueSelect.value = firstValid.value;
                console.log(`✅ Auto-selected first queue: ${firstValid.text}`);
                this.updateStatus(`Queue: ${firstValid.text}`, 'success');
                this.queueSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    findOption(selectElement, searchTexts) {
        if (!selectElement) return null;

        // Case-insensitive search through all text patterns
        for (const searchText of searchTexts) {
            const lowerSearch = searchText.toLowerCase();
            const option = Array.from(selectElement.options).find(
                opt => opt.text.toLowerCase().includes(lowerSearch)
            );
            if (option && option.value) return option;
        }
        return null;
    }

    updateStatus(message, type = 'info') {
        if (!this.filterStatus) return;

        const statusText = this.filterStatus.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = message;
            statusText.className = `status-text status-${type}`;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    window.filterManager = new FilterManager();
    console.log('🎯 Filter layout reorganization complete');
});
