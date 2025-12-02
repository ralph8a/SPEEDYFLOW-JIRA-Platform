/**
 * SPEEDYFLOW - Simple Text Filter
 * Manages the minimalist text-only filter interface
 */

class SimpleTextFilter {
  constructor() {
    this.currentDesk = null;
    this.currentQueue = null;
    this.desks = [];
    this.queues = [];
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadDesks();
  }

  bindEvents() {
    const deskText = document.getElementById('deskText');
    const queueText = document.getElementById('queueText');
    const saveText = document.getElementById('saveText');
    const deskDropdown = document.getElementById('deskDropdown');
    const queueDropdown = document.getElementById('queueDropdown');

    if (deskText) {
      deskText.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown('desk');
      });
    }

    if (queueText) {
      queueText.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown('queue');
      });
    }

    if (saveText) {
      saveText.addEventListener('click', () => {
        this.saveSelection();
      });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      this.closeDropdowns();
    });

    // Prevent dropdown close when clicking inside
    if (deskDropdown) {
      deskDropdown.addEventListener('click', (e) => e.stopPropagation());
    }
    if (queueDropdown) {
      queueDropdown.addEventListener('click', (e) => e.stopPropagation());
    }
  }

  async loadDesks() {
    try {
      // Get desks from existing select or API
      const existingSelect = document.getElementById('serviceDeskSelectFilter');
      if (existingSelect && existingSelect.options.length > 1) {
        this.desks = Array.from(existingSelect.options)
          .filter(option => option.value)
          .map(option => ({
            id: option.value,
            name: option.textContent.trim()
          }));
      } else {
        // Simulate loading from API
        this.desks = [
          { id: 'sd1', name: 'IT Support' },
          { id: 'sd2', name: 'HR Services' },
          { id: 'sd3', name: 'Finance' },
          { id: 'sd4', name: 'General Support' }
        ];
      }
      this.updateDeskDropdown();
    } catch (error) {
      console.error('Error loading desks:', error);
    }
  }

  async loadQueues(deskId) {
    if (!deskId) {
      this.queues = [];
      this.updateQueueDropdown();
      return;
    }

    try {
      // Trigger existing queue loading
      const existingSelect = document.getElementById('serviceDeskSelectFilter');
      if (existingSelect) {
        existingSelect.value = deskId;
        existingSelect.dispatchEvent(new Event('change'));
      }

      // Wait for queues to load
      setTimeout(() => {
        const queueSelect = document.getElementById('queueSelectFilter');
        if (queueSelect && queueSelect.options.length > 1) {
          this.queues = Array.from(queueSelect.options)
            .filter(option => option.value)
            .map(option => ({
              id: option.value,
              name: option.textContent.trim()
            }));
        } else {
          // Simulate queues
          this.queues = [
            { id: 'q1', name: 'Incidents' },
            { id: 'q2', name: 'Service Requests' },
            { id: 'q3', name: 'Changes' },
            { id: 'q4', name: 'Problems' }
          ];
        }
        this.updateQueueDropdown();
      }, 500);

    } catch (error) {
      console.error('Error loading queues:', error);
    }
  }

  toggleDropdown(type) {
    const dropdown = document.getElementById(`${type}Dropdown`);
    if (!dropdown) return;

    const isVisible = dropdown.classList.contains('show');
    
    // Close all dropdowns first
    this.closeDropdowns();

    if (!isVisible) {
      // Show this dropdown
      dropdown.classList.add('show');

      // Load data if needed
      if (type === 'queue' && this.currentDesk) {
        this.loadQueues(this.currentDesk);
      }
    }
  }

  closeDropdowns() {
    const dropdowns = document.querySelectorAll('.text-dropdown');
    dropdowns.forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  }

  updateDeskDropdown() {
    const dropdown = document.getElementById('deskDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = this.desks.map(desk => 
      `<div class="dropdown-item" onclick="window.simpleTextFilter.selectDesk('${desk.id}', '${this.escapeHtml(desk.name)}')">
        ${this.escapeHtml(desk.name)}
      </div>`
    ).join('');
  }

  updateQueueDropdown() {
    const dropdown = document.getElementById('queueDropdown');
    if (!dropdown) return;

    if (!this.currentDesk) {
      dropdown.innerHTML = '<div class="dropdown-item disabled">Select desk first</div>';
      return;
    }

    dropdown.innerHTML = this.queues.map(queue => 
      `<div class="dropdown-item" onclick="window.simpleTextFilter.selectQueue('${queue.id}', '${this.escapeHtml(queue.name)}')">
        ${this.escapeHtml(queue.name)}
      </div>`
    ).join('');
  }

  selectDesk(deskId, deskName) {
    this.currentDesk = deskId;
    this.currentQueue = null;

    // Update text
    const deskText = document.getElementById('deskText');
    const queueText = document.getElementById('queueText');
    
    if (deskText) {
      deskText.textContent = deskName;
      deskText.classList.add('selected');
    }
    
    if (queueText) {
      queueText.textContent = 'queue';
      queueText.classList.remove('selected');
    }

    // Update hidden select
    const existingSelect = document.getElementById('serviceDeskSelectFilter');
    if (existingSelect) {
      existingSelect.value = deskId;
      existingSelect.dispatchEvent(new Event('change'));
    }

    // Load queues
    this.loadQueues(deskId);
    this.closeDropdowns();
  }

  selectQueue(queueId, queueName) {
    this.currentQueue = queueId;

    // Update text
    const queueText = document.getElementById('queueText');
    if (queueText) {
      queueText.textContent = queueName;
      queueText.classList.add('selected');
    }

    // Update hidden select
    const existingSelect = document.getElementById('queueSelectFilter');
    if (existingSelect) {
      existingSelect.value = queueId;
      existingSelect.dispatchEvent(new Event('change'));
    }

    this.closeDropdowns();
  }

  saveSelection() {
    if (!this.currentDesk || !this.currentQueue) {
      alert('Please select both desk and queue');
      return;
    }

    // Trigger existing save
    const saveBtn = document.getElementById('saveFiltersBtn');
    if (saveBtn) {
      saveBtn.click();
    }

    // Visual feedback
    const saveText = document.getElementById('saveText');
    if (saveText) {
      const originalText = saveText.textContent;
      saveText.textContent = 'Guardado ✓';
      saveText.classList.add('saved');
      
      setTimeout(() => {
        saveText.textContent = originalText;
        saveText.classList.remove('saved');
      }, 2000);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.simpleTextFilter = new SimpleTextFilter();
    console.log('✅ Simple text filter loaded');
  }, 500);
});