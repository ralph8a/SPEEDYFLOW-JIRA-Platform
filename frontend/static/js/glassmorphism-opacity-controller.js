/**
 * SPEEDYFLOW - Transparency Manager
 * Controla la opacidad de elementos glassmorphic para light y dark themes
 * Integrado con glassmorphism.css
 */

class TransparencyManager {
  constructor() {
    // Default opacity values - HIGHER for better visibility
    this.defaults = {
      light: {
        primary: 0.92,     // Header, sidebars - MORE OPAQUE for visibility
        secondary: 0.94,   // KANBAN COLUMNS - VERY OPAQUE for readability
        tertiary: 0.88,    // MVP footer - MORE OPAQUE
        overlay: 0.0,      // Light overlay opacity - COMPLETELY TRANSPARENT
        blur: {
          primary: 10,     // Header, sidebars - LESS blur for clarity
          secondary: 8,    // Kanban columns - LESS blur for readability
          tertiary: 6      // MVP footer - LESS blur
        }
      },
      dark: {
        primary: 0.92,     // Dark theme - same high opacity
        secondary: 0.94,   // KANBAN COLUMNS - very opaque
        tertiary: 0.88,    // MVP footer - more opaque
        overlay: 0.0,      // Dark overlay opacity - COMPLETELY TRANSPARENT
        blur: {
          primary: 10,     // Less blur for clarity
          secondary: 8,    // Less blur for readability
          tertiary: 6      // Less blur
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
    
    // Validate loaded settings - reset if corrupted
    this.validateSettings();
    
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
    const domObserver = new MutationObserver((mutations) => {
      let shouldReapply = false;
      
      // Check if new background overlay was added
      const overlays = document.querySelectorAll('.ai-background-overlay');
      if (overlays.length > 0) {
        // Reapply overlay opacity to any new elements
        overlays.forEach(overlay => {
          overlay.style.opacity = this.settings[this.currentTheme]?.overlay || this.defaults[this.currentTheme].overlay;
        });
      }
      
      // Check if kanban columns were added
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) { // Element node
              if (node.classList?.contains('kanban-column') || node.querySelector?.('.kanban-column')) {
                shouldReapply = true;
                break;
              }
            }
          }
        }
        if (shouldReapply) break;
      }
      
      // If kanban columns were added, reapply transparency
      if (shouldReapply) {
        console.log('🔄 Kanban columns detected in DOM, applying transparency...');
        requestAnimationFrame(() => {
          this.applyToKanbanColumns();
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
        
        // PROTECTION: Ensure Kanban columns (secondary) never go below 0.75 opacity
        if (this.settings.light && this.settings.light.secondary < 0.75) {
          console.warn(`⚠️ Light secondary opacity too low (${this.settings.light.secondary}), resetting to 0.75`);
          this.settings.light.secondary = 0.75;
        }
        if (this.settings.dark && this.settings.dark.secondary < 0.75) {
          console.warn(`⚠️ Dark secondary opacity too low (${this.settings.dark.secondary}), resetting to 0.75`);
          this.settings.dark.secondary = 0.75;
        }
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
   * Validate settings - check for corrupted or invalid values
   */
  validateSettings() {
    let needsReset = false;
    
    ['light', 'dark'].forEach(theme => {
      if (!this.settings[theme]) {
        console.warn(`⚠️ Missing ${theme} theme settings, resetting...`);
        needsReset = true;
        return;
      }
      
      // Check if all opacity values are valid numbers between 0 and 1
      ['primary', 'secondary', 'tertiary', 'overlay'].forEach(layer => {
        const value = this.settings[theme][layer];
        if (typeof value !== 'number' || value < 0 || value > 1 || isNaN(value)) {
          console.warn(`⚠️ Invalid ${theme}.${layer} value: ${value}, resetting...`);
          needsReset = true;
        }
      });
      
      // Check blur values
      if (this.settings[theme].blur) {
        ['primary', 'secondary', 'tertiary'].forEach(layer => {
          const value = this.settings[theme].blur[layer];
          if (typeof value !== 'number' || value < 0 || value > 50 || isNaN(value)) {
            console.warn(`⚠️ Invalid ${theme}.blur.${layer} value: ${value}, resetting...`);
            needsReset = true;
          }
        });
      }
    });
    
    if (needsReset) {
      console.warn('🔄 Resetting transparency settings to defaults due to corruption');
      this.settings = JSON.parse(JSON.stringify(this.defaults));
      this.saveTransparency();
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
      '.main-header-pro': 'tertiary',
      '.right-sidebar': 'primary',
      '.filter-bar-enhanced': 'tertiary',
      '.modal': 'secondary',
      '.navbar': 'tertiary',
      '.kanban-column': 'secondary',
      // Flowing MVP footer / chat assistant
      '.flowing-footer': 'tertiary',
      '.flowing-content': 'tertiary',
      '.footer-two-columns': 'tertiary',
      '.comments-ai-container': 'tertiary'
    };

    Object.entries(mainContainers).forEach(([selector, level]) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        let opacity = themeSettings[level];
        
        // PROTECTION: Kanban columns must have minimum 0.75 opacity to remain readable
        if (element.classList.contains('kanban-column')) {
          opacity = Math.max(0.75, opacity);
        }
        
        const blur = themeSettings.blur?.[level] || 15;
        
        // Set background color based on current theme and element type
        // Use theme-specific color values for consistency
        let bgColor;
        if (this.currentTheme === 'dark') {
          if (element.classList.contains('sidebar') || element.classList.contains('right-sidebar') || element.classList.contains('filter-bar-enhanced')) {
            bgColor = `rgba(26, 26, 26, ${opacity})`;
          } else if (element.classList.contains('main-header-pro')) {
            bgColor = `rgba(37, 37, 37, ${opacity})`;
          } else if (element.classList.contains('kanban-column')) {
            bgColor = `rgba(32, 32, 42, ${opacity})`;
          } else {
            bgColor = `rgba(42, 42, 42, ${opacity})`;
          }
        } else {
          if (element.classList.contains('kanban-column')) {
            bgColor = `rgba(248, 250, 252, ${opacity})`;
          } else {
            bgColor = `rgba(255, 255, 255, ${opacity})`;
          }
        }
        
        element.style.setProperty('background-color', bgColor, 'important');
        
        // Apply appropriate backdrop filter based on selector - All with 180% saturation
        if (selector === '.sidebar') {
          element.style.setProperty('backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
          element.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
        } else if (selector === '.main-header-pro') {
          element.style.setProperty('backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
          element.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
        } else if (selector === '.right-sidebar') {
          element.style.setProperty('backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
          element.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
        } else if (selector === '.filter-bar-enhanced') {
          element.style.setProperty('backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
          element.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
        } else if (selector === '.modal') {
          element.style.setProperty('backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
          element.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
        } else if (selector === '.navbar') {
          element.style.setProperty('backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
          element.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
        } else if (selector === '.kanban-column') {
          element.style.setProperty('backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
          element.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
        }
      });
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
      '.modal',
      '.navbar',
      '.kanban-column',
      // Flowing MVP footer containers
      '.flowing-footer',
      '.flowing-content',
      '.footer-two-columns',
      '.comments-ai-container'
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
   * Apply transparency to newly created kanban columns
   * Call this after kanban board is rendered
   */
  applyToKanbanColumns() {
    const columns = document.querySelectorAll('.kanban-column');
    const themeSettings = this.settings[this.currentTheme];
    
    if (!themeSettings || columns.length === 0) return;

    const opacity = themeSettings.secondary;
    const blur = themeSettings.blur?.secondary || 15;

    columns.forEach(column => {
      let bgColor;
      if (this.currentTheme === 'dark') {
        bgColor = `rgba(32, 32, 42, ${opacity})`;
      } else {
        bgColor = `rgba(248, 250, 252, ${opacity})`;
      }
      
      column.style.setProperty('background-color', bgColor, 'important');
      column.style.setProperty('backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
      column.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
    });

    console.log(`✅ Applied transparency to ${columns.length} kanban columns`);
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

// Initialize globally - IMMEDIATE execution
try {
  window.transparencyManager = new TransparencyManager();
  console.log('✅ Transparency Manager initialized successfully');
  console.log('📊 Opacity methods: setTransparency(), getTransparency(), increaseOpacity(), decreaseOpacity()');
  console.log('📊 Blur methods: setBlur(), getBlur(), increaseBlur(), decreaseBlur()');
  console.log('📊 Example: transparencyManager.setBlur("light", "primary", 25)');
  console.log('📊 Example: transparencyManager.increaseBlur("primary")');
} catch (error) {
  console.error('❌ Failed to initialize Transparency Manager:', error);
}

