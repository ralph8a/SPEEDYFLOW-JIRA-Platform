/**
 * SPEEDYFLOW - Centralized Theme Manager
 * Single source of truth for all theme operations
 * Prevents conflicts between multiple theme-related scripts
 * 
 * This replaces ad-hoc theme handling in:
 * - theme-blocker.js
 * - header-menu-controller.js
 * - theme-detector.js
 * - app.js
 */
const ThemeManager = {
  // Current theme state
  currentTheme: null,
  isInitialized: false,
  /**
   * Initialize theme manager on page load
   * MUST be called BEFORE other theme scripts
   */
  init() {
    if (this.isInitialized) {
      console.log('⚠️ ThemeManager already initialized, skipping');
      return;
    }
    console.log('🎨 ThemeManager initializing...');
    // Get saved theme with proper fallback chain
    this.currentTheme = this.getSavedTheme();
    console.log(`🎨 Loaded theme: ${this.currentTheme}`);
    // Apply immediately
    this.applyTheme(this.currentTheme);
    // Update button UI if it exists
    this.updateThemeButton();
    // Listen for theme changes in storage (other tabs) - DISABLED
    // Event listeners disabled - visual only mode
    this.isInitialized = true;
    console.log('✅ ThemeManager initialized');
  },
  /**
   * Get saved theme with proper priority
   * 1. currentTheme (new key)
   * 2. theme (legacy key)
   * 3. System preference if 'auto'
   * 4. Default 'light'
   */
  getSavedTheme() {
    // Check for explicitly saved theme
    let saved = localStorage.getItem('currentTheme') || localStorage.getItem('theme');
    if (!saved) {
      return 'light'; // Default
    }
    // Normalize value
    saved = saved.toLowerCase().trim();
    if (saved === 'auto') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    if (['dark', 'light'].includes(saved)) {
      return saved;
    }
    return 'light'; // Invalid value - use default
  },
  /**
   * Apply theme to document
   * Uses direct className assignment to prevent flashing
   */
  applyTheme(theme) {
    if (!['dark', 'light'].includes(theme)) {
      console.warn(`⚠️ Invalid theme: ${theme}, using light`);
      theme = 'light';
    }
    // Skip if already applied
    if (this.currentTheme === theme && document.body.classList.contains(`theme-${theme}`)) {
      return;
    }
    console.log(`🎨 Applying theme: ${theme}`);
    // Remove all theme classes and add new one
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.body.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${theme}`);
    document.body.classList.add(`theme-${theme}`);
    // Set data-theme attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    // Save to localStorage (both keys for compatibility)
    localStorage.setItem('currentTheme', theme);
    localStorage.setItem('theme', theme);
    this.currentTheme = theme;
    // Dispatch event for other components (background manager, etc)
    document.dispatchEvent(new CustomEvent('themeChange', {
      detail: { theme, timestamp: Date.now(), source: 'ThemeManager' }
    }));
    // Dispatch legacy themeChanged event for compatibility
    document.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme, timestamp: Date.now() }
    }));
    // Notify all registered components
    this.notifyComponents(theme);
    console.log(`✅ Theme applied: ${theme}`);
  },
  /**
   * Set theme explicitly (from UI button click)
   */
  setTheme(theme) {
    console.log(`🎨 User selected theme: ${theme}`);
    if (theme === 'auto') {
      // Save 'auto' but resolve actual theme
      localStorage.setItem('currentTheme', 'auto');
      localStorage.setItem('theme', 'auto');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark ? 'dark' : 'light');
    } else {
      this.applyTheme(theme);
    }
    this.updateThemeButton();
  },
  /**
   * Update theme button state
   */
  updateThemeButton() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    const theme = this.currentTheme;
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    // Update theme bubble options
    const options = document.querySelectorAll('.theme-option');
    options.forEach(opt => {
      const optTheme = opt.dataset.theme;
      if (optTheme === 'auto') {
        opt.classList.toggle('active', localStorage.getItem('currentTheme') === 'auto');
      } else {
        opt.classList.toggle('active', optTheme === theme);
      }
    });
  },
  /**
   * Get current theme
   */
  getTheme() {
    return this.currentTheme || 'light';
  },
  /**
   * Check if dark theme is active
   */
  isDark() {
    return this.currentTheme === 'dark';
  },
  /**
   * Check if light theme is active
   */
  isLight() {
    return this.currentTheme === 'light';
  },
  /**
   * Register a component for automatic theme updates
   * Components should have an applyTheme(theme) method
   */
  registeredComponents: [],
  registerComponent(component, name = 'Unknown') {
    if (!component || typeof component.applyTheme !== 'function') {
      console.warn(`⚠️ Cannot register ${name}: missing applyTheme() method`);
      return;
    }
    this.registeredComponents.push({ component, name });
    console.log(`✅ Registered component: ${name}`);
    // Apply current theme immediately
    component.applyTheme(this.currentTheme);
  },
  /**
   * Notify all registered components of theme change
   */
  notifyComponents(theme) {
    this.registeredComponents.forEach(({ component, name }) => {
      try {
        component.applyTheme(theme);
        console.log(`🎨 Theme applied to ${name}: ${theme}`);
      } catch (error) {
        console.error(`❌ Error applying theme to ${name}:`, error);
      }
    });
  }
};
// Export globally
window.ThemeManager = ThemeManager;
// Initialize immediately - synchronous to ensure it's ready for other components
ThemeManager.init();
console.log('✅ ThemeManager script loaded and initialized');
