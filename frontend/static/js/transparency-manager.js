/**
 * SPEEDYFLOW - Transparency Manager
 * Controla la opacidad de elementos glassmorphic para light y dark themes
 * Integrado con glassmorphism.css
 */

class TransparencyManager {
  constructor() {
    // Default opacity values based on glassmorphism.css
    this.defaults = {
      light: {
        primary: 0.7,      // .light .glassmorphic-primary: rgba(255, 255, 255, 0.7)
        secondary: 0.65,   // Adjusted for light theme
        tertiary: 0.6,     // Adjusted for light theme
        overlay: 0.0,      // Light overlay opacity - COMPLETELY TRANSPARENT
        blur: {
          primary: 20,     // Primary blur px
          secondary: 15,   // Secondary blur px
          tertiary: 10     // Tertiary blur px
        }
      },
      dark: {
        primary: 0.75,     // .dark .glassmorphic-primary: rgba(10, 10, 25, 0.75)
        secondary: 0.6,    // Based on .glassmorphic-secondary
        tertiary: 0.5,     // Based on .glassmorphic-tertiary
        overlay: 0.0,      // Dark overlay opacity - COMPLETELY TRANSPARENT
        blur: {
          primary: 20,     // Primary blur px
          secondary: 15,   // Secondary blur px
          tertiary: 10     // Tertiary blur px
        }
      }
    };

    this.storageKey = 'appTransparency';
    this.currentTheme = this.detectTheme();
    this.init();
  }

  /**
   * Initialize transparency system
   */
  init() {
    console.log('🎨 Initializing Transparency Manager...');
    
    // Load saved transparency or use defaults
    this.loadTransparency();
    
    // Apply current transparency
    this.applyTransparency();
    
    // Listen for theme changes
    document.addEventListener('themeChange', (e) => {
      this.currentTheme = e.detail?.theme || this.detectTheme();
      console.log(`🌓 Theme changed to: ${this.currentTheme}, applying transparency...`);
      this.applyTransparency();
    });

    // Listen for body class changes (alternate theme detection)
    const observer = new MutationObserver(() => {
      const newTheme = this.detectTheme();
      if (newTheme !== this.currentTheme) {
        this.currentTheme = newTheme;
        console.log(`🔄 Detected theme change via DOM: ${this.currentTheme}`);
        this.applyTransparency();
      }
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Re-apply transparency when DOM elements are added
    const domObserver = new MutationObserver(() => {
      // Check if new background overlay was added
      const overlays = document.querySelectorAll('.ai-background-overlay');
      if (overlays.length > 0) {
        // Reapply overlay opacity to any new elements
        overlays.forEach(overlay => {
          overlay.style.opacity = this.settings[this.currentTheme]?.overlay || this.defaults[this.currentTheme].overlay;
        });
      }
    });

    domObserver.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    console.log('✅ Transparency Manager initialized');
  }

  /**
   * Detect current theme from body classes
   * @returns {string} 'light' or 'dark'
   */
  detectTheme() {
    if (document.body.classList.contains('theme-dark')) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Load transparency settings from localStorage
   */
  loadTransparency() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log(`📦 Loaded transparency settings:`, parsed);
        this.settings = { ...this.defaults, ...parsed };
      } else {
        this.settings = JSON.parse(JSON.stringify(this.defaults));
        console.log(`📦 Using default transparency settings`);
      }
    } catch (error) {
      console.warn('⚠️ Error loading transparency settings, using defaults:', error);
      this.settings = JSON.parse(JSON.stringify(this.defaults));
    }
  }

  /**
   * Save transparency settings to localStorage
   */
  saveTransparency() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      console.log(`💾 Transparency settings saved`);
    } catch (error) {
      console.warn('⚠️ Error saving transparency settings:', error);
    }
  }

  /**
   * Apply transparency to all glassmorphic elements
   */
  applyTransparency() {
    const themeSettings = this.settings[this.currentTheme];
    if (!themeSettings) {
      console.warn(`⚠️ No settings found for theme: ${this.currentTheme}`);
      return;
    }

    console.log(`🎨 Applying ${this.currentTheme} transparency & blur:`, themeSettings);

    // Apply to root CSS variables for glassmorphism layers
    document.documentElement.style.setProperty(
      '--glassmorphic-primary-opacity',
      themeSettings.primary
    );
    document.documentElement.style.setProperty(
      '--glassmorphic-secondary-opacity',
      themeSettings.secondary
    );
    document.documentElement.style.setProperty(
      '--glassmorphic-tertiary-opacity',
      themeSettings.tertiary
    );

    // Apply blur CSS variables
    if (themeSettings.blur) {
      document.documentElement.style.setProperty(
        '--glassmorphic-primary-blur',
        `${themeSettings.blur.primary}px`
      );
      document.documentElement.style.setProperty(
        '--glassmorphic-secondary-blur',
        `${themeSettings.blur.secondary}px`
      );
      document.documentElement.style.setProperty(
        '--glassmorphic-tertiary-blur',
        `${themeSettings.blur.tertiary}px`
      );
    }

    // CRITICAL: Apply directly to real UI elements ONLY
    // MAIN CONTAINERS (should receive effects)
    const mainContainers = {
      '.sidebar': 'primary',
      '.main-header-pro': 'secondary',
      '.right-sidebar': 'primary',
      '.filter-bar-enhanced': 'tertiary',
      '.board-wrapper': 'secondary',
      '.modal': 'secondary',
      '.navbar': 'tertiary'
    };

    Object.entries(mainContainers).forEach(([selector, level]) => {
      const element = document.querySelector(selector);
      if (element) {
        const opacity = themeSettings[level];
        const blur = themeSettings.blur?.[level] || 15;
        
        // Set background color based on current theme and element type
        // Use theme-specific color values for consistency
        let bgColor;
        if (this.currentTheme === 'dark') {
          if (element.classList.contains('sidebar') || element.classList.contains('right-sidebar')) {
            bgColor = `rgba(26, 26, 26, ${opacity})`;
          } else if (element.classList.contains('board-wrapper') || element.classList.contains('main-header-pro')) {
            bgColor = `rgba(37, 37, 37, ${opacity})`;
          } else {
            bgColor = `rgba(42, 42, 42, ${opacity})`;
          }
        } else {
          bgColor = `rgba(255, 255, 255, ${opacity})`;
        }
        
        element.style.backgroundColor = bgColor;
        
        // Apply appropriate backdrop filter based on selector
        if (selector === '.sidebar') {
          element.style.backdropFilter = `blur(${blur}px) saturate(180%)`;
        } else if (selector === '.main-header-pro') {
          element.style.backdropFilter = `blur(${blur}px) saturate(150%)`;
        } else if (selector === '.right-sidebar') {
          element.style.backdropFilter = `blur(${blur}px) saturate(180%)`;
        } else if (selector === '.filter-bar-enhanced') {
          element.style.backdropFilter = `blur(${blur}px) saturate(120%)`;
        } else if (selector === '.board-wrapper') {
          element.style.backdropFilter = `blur(${blur}px) saturate(150%)`;
        } else if (selector === '.modal') {
          element.style.backdropFilter = `blur(${blur}px) saturate(150%)`;
        } else if (selector === '.navbar') {
          element.style.backdropFilter = `blur(${blur}px) saturate(120%)`;
        }
      }
    });

    // Apply overlay opacity
    const overlays = document.querySelectorAll('.ai-background-overlay');
    overlays.forEach(overlay => {
      overlay.style.opacity = themeSettings.overlay;
    });

    console.log(`✅ Transparency & blur applied for ${this.currentTheme} theme`);
  }

  /**
   * Apply opacity and blur to elements with specific glassmorphic class
   * IMPORTANT: Only applies to general backgrounds (sidebar, modal, navbar) NOT to object interiors
   * @param {string} level - 'primary', 'secondary', or 'tertiary'
   * @param {number} opacity - Opacity value (0-1)
   * @param {number} blurPx - Blur value in pixels
   */
  applyToElements(level, opacity, blurPx) {
    const className = `.glassmorphic-${level}`;
    const elements = document.querySelectorAll(className);
    
    // Define main background containers that should get effects
    const backgroundSelectors = [
      '.sidebar',
      '.main-header-pro',
      '.right-sidebar',
      '.filter-bar-enhanced',
      '.board-wrapper',
      '.modal',
      '.navbar'
    ];
    
    elements.forEach(el => {
      // ONLY apply to main background containers
      const isMainContainer = backgroundSelectors.some(selector => 
        el.matches(selector)
      );

      if (!isMainContainer) {
        // Skip small nested elements
        return;
      }

      // Apply opacity to background color ONLY
      const currentBg = window.getComputedStyle(el).backgroundColor;
      
      // Extract RGB values (if it's an rgba color)
      const rgbMatch = currentBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch;
        // IMPORTANT: Apply to backgroundColor, NOT element opacity
        el.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }

      // Apply blur via backdrop-filter
      if (blurPx !== undefined && blurPx > 0) {
        let currentFilter = el.style.backdropFilter || '';
        // Remove existing blur if present
        currentFilter = currentFilter.replace(/blur\([^)]+\)\s*/g, '');
        // Add new blur value
        const newFilter = `blur(${blurPx}px) ${currentFilter}`.trim();
        el.style.backdropFilter = newFilter;
      }
    });

    console.log(
      `📐 Applied to ${className}: opacity=${opacity}, blur=${blurPx}px (${elements.length} background elements)`
    );
  }

  /**
   * Set transparency for a specific theme layer
   * @param {string} theme - 'light' or 'dark'
   * @param {string} layer - 'primary', 'secondary', 'tertiary', or 'overlay'
   * @param {number} opacity - Opacity value (0-1)
   */
  setTransparency(theme, layer, opacity) {
    if (opacity < 0 || opacity > 1) {
      console.warn(`⚠️ Opacity must be between 0 and 1, got: ${opacity}`);
      return;
    }

    if (!this.settings[theme]) {
      this.settings[theme] = { ...this.defaults[theme] };
    }

    this.settings[theme][layer] = opacity;
    console.log(`🎨 Set ${theme} ${layer} transparency to ${opacity}`);

    // If this is the current theme, apply immediately
    if (theme === this.currentTheme) {
      this.applyTransparency();
    }

    this.saveTransparency();
  }

  /**
   * Get transparency for a specific theme layer
   * @param {string} theme - 'light' or 'dark'
   * @param {string} layer - 'primary', 'secondary', 'tertiary', or 'overlay'
   * @returns {number} Opacity value (0-1)
   */
  getTransparency(theme, layer) {
    return this.settings[theme]?.[layer] ?? this.defaults[theme]?.[layer] ?? 0.5;
  }

  /**
   * Reset transparency to defaults
   * @param {string} [theme] - Optional theme to reset (resets all if not specified)
   */
  resetTransparency(theme) {
    if (theme) {
      this.settings[theme] = JSON.parse(JSON.stringify(this.defaults[theme]));
      console.log(`🔄 Reset ${theme} transparency to defaults`);
    } else {
      this.settings = JSON.parse(JSON.stringify(this.defaults));
      console.log(`🔄 Reset all transparency to defaults`);
    }

    this.applyTransparency();
    this.saveTransparency();
  }

  /**
   * Force re-apply transparency (useful after DOM changes)
   */
  forceReapply() {
    console.log('🔄 Force reapplying transparency...');
    this.applyTransparency();
  }

  /**
   * Get current theme transparency settings
   * @returns {object} Current theme transparency settings
   */
  getCurrentSettings() {
    return this.settings[this.currentTheme];
  }

  /**
   * Increase opacity for current theme by step
   * @param {string} layer - 'primary', 'secondary', 'tertiary', or 'overlay'
   * @param {number} step - Step size (default 0.05)
   */
  increaseOpacity(layer, step = 0.05) {
    const current = this.getTransparency(this.currentTheme, layer);
    const newValue = Math.min(1, current + step);
    this.setTransparency(this.currentTheme, layer, newValue);
  }

  /**
   * Decrease opacity for current theme by step
   * @param {string} layer - 'primary', 'secondary', 'tertiary', or 'overlay'
   * @param {number} step - Step size (default 0.05)
   */
  decreaseOpacity(layer, step = 0.05) {
    const current = this.getTransparency(this.currentTheme, layer);
    const newValue = Math.max(0, current - step);
    this.setTransparency(this.currentTheme, layer, newValue);
  }

  /**
   * Set blur for a specific theme layer
   * @param {string} theme - 'light' or 'dark'
   * @param {string} layer - 'primary', 'secondary', or 'tertiary'
   * @param {number} blurPx - Blur value in pixels
   */
  setBlur(theme, layer, blurPx) {
    if (blurPx < 0 || blurPx > 50) {
      console.warn(`⚠️ Blur should be between 0 and 50px, got: ${blurPx}`);
      return;
    }

    if (!this.settings[theme]) {
      this.settings[theme] = { ...this.defaults[theme] };
    }

    if (!this.settings[theme].blur) {
      this.settings[theme].blur = { ...this.defaults[theme].blur };
    }

    this.settings[theme].blur[layer] = blurPx;
    console.log(`🎨 Set ${theme} ${layer} blur to ${blurPx}px`);

    // If this is the current theme, apply immediately
    if (theme === this.currentTheme) {
      this.applyTransparency();
    }

    this.saveTransparency();
  }

  /**
   * Get blur for a specific theme layer
   * @param {string} theme - 'light' or 'dark'
   * @param {string} layer - 'primary', 'secondary', or 'tertiary'
   * @returns {number} Blur value in pixels
   */
  getBlur(theme, layer) {
    return this.settings[theme]?.blur?.[layer] ?? this.defaults[theme]?.blur?.[layer] ?? 15;
  }

  /**
   * Increase blur for current theme by step
   * @param {string} layer - 'primary', 'secondary', or 'tertiary'
   * @param {number} step - Step size in pixels (default 2)
   */
  increaseBlur(layer, step = 2) {
    const current = this.getBlur(this.currentTheme, layer);
    const newValue = Math.min(50, current + step);
    this.setBlur(this.currentTheme, layer, newValue);
  }

  /**
   * Decrease blur for current theme by step
   * @param {string} layer - 'primary', 'secondary', or 'tertiary'
   * @param {number} step - Step size in pixels (default 2)
   */
  decreaseBlur(layer, step = 2) {
    const current = this.getBlur(this.currentTheme, layer);
    const newValue = Math.max(0, current - step);
    this.setBlur(this.currentTheme, layer, newValue);
  }
}

// Initialize globally
window.transparencyManager = new TransparencyManager();

console.log('✅ Transparency Manager loaded with Blur Controls');
console.log('📊 Opacity methods: setTransparency(), getTransparency(), increaseOpacity(), decreaseOpacity()');
console.log('📊 Blur methods: setBlur(), getBlur(), increaseBlur(), decreaseBlur()');
console.log('📊 Example: transparencyManager.setBlur("light", "primary", 25)');
console.log('📊 Example: transparencyManager.increaseBlur("primary")');
