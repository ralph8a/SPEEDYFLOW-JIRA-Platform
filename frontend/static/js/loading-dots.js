/**
 * LOADING DOTS MANAGER
 * Handles pulsing dots animation for ticket loading
 */
class LoadingDotsManager {
  constructor() {
    this.container = document.getElementById('kanbanView') || document.getElementById('listView');
    this.isLoading = false;
  }
  /**
   * Show loading dots animation
   */
  show(message = 'Loading tickets') {
    if (!this.container) return;
    this.isLoading = true;
    this.container.innerHTML = `
      <div class="loading-wrapper">
        <div class="loading-dots">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
        <div class="loading-text">${message}</div>
      </div>
    `;
  }
  /**
   * Hide loading animation
   */
  hide() {
    this.isLoading = false;
  }
  /**
   * Check if currently loading
   */
  isActive() {
    return this.isLoading;
  }
  /**
   * Show mini loading dots (for small sections)
   */
  showMini() {
    return `
      <div class="loading-dots-mini">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
      </div>
    `;
  }
}
// Initialize global instance
window.loadingDotsManager = new LoadingDotsManager();
