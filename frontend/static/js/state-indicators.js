/**
 * STATE INDICATORS MANAGER
 * Intuitive loading/status animations integrated with scroll and content changes
 */

class StateIndicatorsManager {
  constructor() {
    this.loadingBar = null;
    this.floatingFeedback = null;
    this.isLoading = false;
    this.loadingTimeout = null;
    this.initLoadingBar();
    this.setupScrollListener();
    console.log('✅ StateIndicatorsManager initialized');
  }

  // ===== LOADING BAR (at top of page) =====
  initLoadingBar() {
    this.loadingBar = document.createElement('div');
    this.loadingBar.className = 'scroll-loading-bar';
    document.body.appendChild(this.loadingBar);
  }

  showLoadingBar() {
    if (this.loadingBar) {
      this.loadingBar.classList.add('active');
      this.loadingBar.classList.remove('complete');
    }
  }

  completeLoadingBar() {
    if (this.loadingBar) {
      this.loadingBar.classList.remove('active');
      this.loadingBar.classList.add('complete');
      setTimeout(() => {
        if (this.loadingBar) {
          this.loadingBar.classList.remove('complete');
          this.loadingBar.style.width = '0%';
        }
      }, 1100);
    }
  }

  // ===== INLINE LOADING STATE =====
  showSkeletonLoader(container, count = 3) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-loader';
    skeleton.id = 'skeleton-loader';

    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'skeleton-item';
      item.innerHTML = `
        <div class="skeleton-header"></div>
        <div class="skeleton-row"></div>
        <div class="skeleton-row"></div>
      `;
      skeleton.appendChild(item);
    }

    container.innerHTML = '';
    container.appendChild(skeleton);
  }

  hideSkeletonLoader(container) {
    const skeleton = container.querySelector('#skeleton-loader');
    if (skeleton) {
      skeleton.style.opacity = '0';
      skeleton.style.transition = 'opacity 0.3s ease';
      setTimeout(() => skeleton.remove(), 300);
    }
  }

  // ===== CARD LOADING STATE =====
  createCardLoadingState(spinner = 'standard') {
    const card = document.createElement('div');
    card.className = 'card-loading';

    const content = document.createElement('div');
    content.className = 'card-loading-content';

    let spinnerHTML = '';
    switch (spinner) {
      case 'pulse':
        spinnerHTML = '<div class="spinner spinner-pulse"></div>';
        break;
      case 'dots':
        spinnerHTML = `
          <div class="spinner spinner-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        `;
        break;
      case 'circle':
        spinnerHTML = '<div class="spinner spinner-circle"></div>';
        break;
      default:
        spinnerHTML = '<div class="spinner spinner-standard"></div>';
    }

    content.innerHTML = `
      ${spinnerHTML}
      <span>Loading content...</span>
    `;

    card.appendChild(content);
    return card;
  }

  // ===== SUCCESS/ERROR/WARNING INDICATORS =====
  showSuccess(message, duration = 3000) {
    this.showFloatingFeedback(message, 'success', duration);
    this.completeLoadingBar();
    this.isLoading = false;
  }

  showError(message, duration = 5000) {
    this.showFloatingFeedback(message, 'error', duration);
    this.loadingBar?.classList.remove('active');
    this.isLoading = false;
  }

  showWarning(message, duration = 4000) {
    this.showFloatingFeedback(message, 'warning', duration);
    this.isLoading = false;
  }

  showFloatingFeedback(message, type = 'info', duration = 3000) {
    // Remove previous feedback if exists
    const existing = document.querySelector('.floating-feedback');
    if (existing) existing.remove();

    const feedback = document.createElement('div');
    feedback.className = `floating-feedback ${type}`;
    feedback.textContent = message;

    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.style.animation = 'floatingSlideOut 0.3s ease';
      setTimeout(() => feedback.remove(), 300);
    }, duration);
  }

  // ===== PROGRESS BAR (inline in content) =====
  createProgressBar(initialProgress = 0) {
    const bar = document.createElement('div');
    bar.className = 'progress-bar active';
    bar.innerHTML = '<div class="progress-bar-fill"></div>';
    bar.style.marginBottom = '16px';
    return bar;
  }

  updateProgressBar(progressElement, progress) {
    if (progressElement) {
      const fill = progressElement.querySelector('.progress-bar-fill');
      if (fill) {
        fill.style.width = `${Math.min(progress, 100)}%`;
      }
    }
  }

  // ===== INLINE LOADING INDICATOR =====
  createLoadingIndicator(message = 'Loading...', compact = false) {
    const indicator = document.createElement('div');
    indicator.className = `loading-indicator ${compact ? 'compact' : ''}`;
    indicator.innerHTML = `
      <div class="spinner spinner-standard"></div>
      <span>${message}</span>
    `;
    return indicator;
  }

  // ===== STATUS IN SCROLL AREA =====
  createScrollAreaStatus(message) {
    const status = document.createElement('div');
    status.className = 'scroll-area-status loading';
    status.innerHTML = `
      <div class="spinner spinner-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span>${message}</span>
    `;
    return status;
  }

  // ===== SCROLL LISTENER FOR INFINITE SCROLL =====
  setupScrollListener() {
    // Scroll listener disabled - visual only mode
  }

  // ===== INTELLIGENT LOADING ORCHESTRATOR =====
  async startLoading(message = 'Loading...', container = null) {
    this.isLoading = true;
    this.showLoadingBar();

    if (container) {
      this.showSkeletonLoader(container);
    } else {
      this.showFloatingFeedback(message, 'info');
    }

    return new Promise(resolve => {
      this.loadingResolve = resolve;
    });
  }

  finishLoading(success = true, message = '') {
    this.isLoading = false;
    this.completeLoadingBar();

    if (this.loadingResolve) {
      this.loadingResolve({ success, message });
    }

    if (message) {
      if (success) {
        this.showSuccess(message);
      } else {
        this.showError(message);
      }
    }
  }

  // ===== CONTENT TRANSITION WITH INDICATOR =====
  async transitionContent(fromElement, toElement, message = 'Loading...') {
    // Show loading state on from element
    fromElement.classList.add('content-transition', 'loading');

    // Show loading indicator
    const indicator = this.createLoadingIndicator(message, true);
    fromElement.parentElement.insertBefore(indicator, fromElement);

    return new Promise(resolve => {
      setTimeout(() => {
        fromElement.classList.remove('content-transition', 'loading');
        indicator.remove();
        toElement.classList.remove('content-transition', 'loading');
        resolve();
      }, 800);
    });
  }

  // ===== API CALL WRAPPER WITH INDICATORS =====
  async fetchWithIndicators(url, options = {}) {
    const message = options.message || 'Loading...';
    const container = options.container;
    const showBar = options.showBar !== false;

    // Start loading
    if (showBar) this.showLoadingBar();
    if (container) this.showSkeletonLoader(container);

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Complete loading
      this.completeLoadingBar();
      if (container) this.hideSkeletonLoader(container);
      this.showSuccess(options.successMessage || 'Done!');

      return { success: true, data };
    } catch (error) {
      this.showError(options.errorMessage || `Error: ${error.message}`);
      return { success: false, error };
    }
  }

  // ===== BADGE COUNTER ANIMATOR =====
  createLoadingBadge(count) {
    const badge = document.createElement('span');
    badge.className = 'loading-badge';
    badge.textContent = count;
    return badge;
  }

  // ===== DOT INDICATOR (minimal) =====
  createDotIndicator(state = 'loading') {
    const dot = document.createElement('span');
    dot.className = `dot-indicator ${state === 'success' ? 'success' : state === 'error' ? 'error' : ''}`;
    return dot;
  }
}

// ===== GLOBAL INSTANCE =====
window.stateIndicators = new StateIndicatorsManager();

// ===== AUTO-INTEGRATE WITH EXISTING EVENTS =====
// Event listeners disabled - visual only mode

console.log('✅ StateIndicatorsManager initialized');

// ===== EXPORT FOR USE IN OTHER SCRIPTS =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateIndicatorsManager;
}
