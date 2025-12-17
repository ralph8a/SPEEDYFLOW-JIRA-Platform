/**
 * SPEEDYFLOW - Font Family Manager
 * Gestiona la personalización de familias de fuentes
 * Integrado con el sistema de configuración
 */
class FontFamilyManager {
  constructor() {
    this.currentPreset = 'business'; // Default
    this.storageKey = 'speedyflow-font-preset';
    this.presets = {
      business: {
        name: 'Business Classic',
        description: 'Familiar y profesional',
        preview: 'Segoe UI + Georgia',
        category: 'professional',
        ui: 'Segoe UI, system-ui, sans-serif',
        content: 'Georgia, Times New Roman, serif',
        display: 'Segoe UI Semibold, Segoe UI, system-ui, sans-serif',
        mono: 'Consolas, Courier New, monospace'
      },
      modern: {
        name: 'Modern Professional', 
        description: 'Tecnológico y limpio',
        preview: 'Inter + Source Serif Pro',
        category: 'modern',
        ui: 'Inter, Segoe UI, system-ui, sans-serif',
        content: 'Source Serif Pro, Georgia, serif',
        display: 'Inter Display, Inter, Segoe UI, sans-serif',
        mono: 'JetBrains Mono, Consolas, monospace'
      },
      corporate: {
        name: 'Corporate Executive',
        description: 'Elegante y corporativo', 
        preview: 'IBM Plex + Playfair',
        category: 'executive',
        ui: 'IBM Plex Sans, Segoe UI, system-ui, sans-serif',
        content: 'Playfair Display, Georgia, serif',
        display: 'IBM Plex Sans Medium, IBM Plex Sans, system-ui, sans-serif',
        mono: 'IBM Plex Mono, Consolas, monospace'
      },
      creative: {
        name: 'Creative Studio',
        description: 'Creativo y dinámico',
        preview: 'Poppins + Crimson Text', 
        category: 'creative',
        ui: 'Poppins, Segoe UI, system-ui, sans-serif',
        content: 'Crimson Text, Georgia, serif',
        display: 'Poppins SemiBold, Poppins, sans-serif',
        mono: 'Fira Code, Consolas, monospace'
      }
    };
    this.init();
  }
  init() {
    console.log('🎨 Initializing Font Family Manager...');
    this.loadSavedPreset();
    this.applyCurrentPreset();
    this.bindEvents();
    console.log(`✅ Font Manager initialized with preset: ${this.currentPreset}`);
  }
  /**
   * Load saved font preset from localStorage
   */
  loadSavedPreset() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved && this.presets[saved]) {
        this.currentPreset = saved;
        console.log(`📁 Loaded font preset: ${saved}`);
      } else {
        console.log(`📁 Using default font preset: ${this.currentPreset}`);
      }
    } catch (error) {
      console.warn('⚠️ Error loading font preset:', error);
    }
  }
  /**
   * Save current font preset to localStorage
   */
  savePreset() {
    try {
      localStorage.setItem(this.storageKey, this.currentPreset);
      console.log(`💾 Saved font preset: ${this.currentPreset}`);
    } catch (error) {
      console.warn('⚠️ Error saving font preset:', error);
    }
  }
  /**
   * Apply font preset to the document
   * @param {string} presetName - Name of the preset to apply
   */
  setPreset(presetName) {
    if (!this.presets[presetName]) {
      console.warn(`⚠️ Unknown font preset: ${presetName}`);
      return false;
    }
    const oldPreset = this.currentPreset;
    this.currentPreset = presetName;
    // Remove old preset class and adaptation class
    document.body.classList.remove(`font-preset-${oldPreset}`);
    document.body.classList.remove(`font-adaptation-${oldPreset}`);
    // Apply new preset class and adaptation class
    document.body.classList.add(`font-preset-${presetName}`);
    document.body.classList.add(`font-adaptation-${presetName}`);
    // Apply CSS variables directly for immediate effect
    this.applyCurrentPreset();
    // Log Aptos/Century adaptation details
    this.logGlyphAdaptations(presetName);
    // Save to localStorage
    this.savePreset();
    // Dispatch custom event
    this.dispatchPresetChange(oldPreset, presetName);
    console.log(`🎨 Font preset changed: ${oldPreset} → ${presetName}`);
    return true;
  }
  /**
   * Apply current preset CSS variables
   */
  applyCurrentPreset() {
    const preset = this.presets[this.currentPreset];
    if (!preset) return;
    const root = document.documentElement;
    // Apply font family variables
    root.style.setProperty('--font-ui', preset.ui);
    root.style.setProperty('--font-content', preset.content);  
    root.style.setProperty('--font-display', preset.display);
    root.style.setProperty('--font-mono', preset.mono);
    // Apply compatibility variables
    root.style.setProperty('--font-interface', preset.ui);
    root.style.setProperty('--font-heading', preset.display);
    root.style.setProperty('--font-body', preset.content);
    root.style.setProperty('--font-code', preset.mono);
    // Apply preset class to body
    document.body.classList.remove('font-preset-business', 'font-preset-modern', 'font-preset-corporate', 'font-preset-creative');
    document.body.classList.add(`font-preset-${this.currentPreset}`);
    console.log(`✅ Applied font preset: ${preset.name}`);
  }
  /**
   * Log Aptos/Century glyph adaptations for debugging
   * @param {string} presetName - Name of applied preset
   */
  logGlyphAdaptations(presetName) {
    const adaptationInfo = {
      'business': {
        families: 'Segoe UI + Georgia → Aptos + Century',
        lineHeight: '0.95x (Segoe UI more compact than Aptos)',
        letterSpacing: '+0.005em (Georgia needs breathing room vs Century)',
        fontWeight: '-15 (Segoe UI visually heavier than Aptos)',
        notes: 'Classic Windows fonts, familiar and professional'
      },
      'modern': {
        families: 'Inter + Source Serif Pro → Aptos + Century',
        lineHeight: '1.02x (Inter slightly taller x-height than Aptos)',
        letterSpacing: '-0.002em (Inter wider characters than Aptos)',
        fontWeight: '+10 (Inter lighter visual weight than Aptos)',
        notes: 'Google Fonts, optimized for digital interfaces'
      },
      'corporate': {
        families: 'IBM Plex Sans + Playfair Display → Aptos + Century',
        lineHeight: '1.05x (IBM Plex more spacious than Aptos)',
        letterSpacing: '+0.008em (Playfair needs generous spacing vs Century)',
        fontWeight: '+25 (IBM Plex lighter than Aptos baseline)',
        notes: 'IBM corporate fonts, elegant and executive'
      },
      'creative': {
        families: 'Poppins + Crimson Text → Aptos + Century',
        lineHeight: '1.08x (Poppins high x-height vs Aptos)',
        letterSpacing: '+0.003em (geometric spacing requirements)',
        fontWeight: '+35 (Poppins much lighter than Aptos)',
        notes: 'Google Fonts, creative and approachable'
      }
    };
    const info = adaptationInfo[presetName];
    if (info) {
      console.log(`🎨 Glyph Adaptations Applied for "${presetName}":`, {
        fontMapping: info.families,
        lineHeightAdjustment: info.lineHeight,
        letterSpacingAdjustment: info.letterSpacing,
        fontWeightAdjustment: info.fontWeight,
        designNotes: info.notes
      });
    }
  }
  /**
   * Get current font preset info
   * @returns {Object} Current preset information
   */
  getCurrentPreset() {
    return {
      name: this.currentPreset,
      ...this.presets[this.currentPreset]
    };
  }
  /**
   * Get all available presets
   * @returns {Object} All preset information
   */
  getAllPresets() {
    return this.presets;
  }
  /**
   * Generate HTML for font preset selector
   * @returns {string} HTML for preset selector
   */
  generatePresetSelector() {
    let html = '<div class="font-preset-selector">';
    Object.entries(this.presets).forEach(([key, preset]) => {
      const isActive = key === this.currentPreset;
      html += `
        <div class="font-preset-option ${isActive ? 'active' : ''}" data-preset="${key}">
          <div class="preset-header">
            <h4 class="preset-name">${preset.name}</h4>
            <span class="preset-category badge badge-${preset.category}">${preset.category}</span>
          </div>
          <p class="preset-description">${preset.description}</p>
          <div class="preset-preview">
            <span class="preview-ui" style="font-family: ${preset.ui}">Interface</span>
            <span class="preview-content" style="font-family: ${preset.content}">Content</span>
            <span class="preview-display" style="font-family: ${preset.display}">Display</span>
          </div>
          ${isActive ? '<div class="preset-active-indicator">✓ Activo</div>' : ''}
        </div>
      `;
    });
    html += '</div>';
    return html;
  }
  /**
   * Bind event listeners
   */
  bindEvents() {
    // Listen for preset selection clicks
    document.addEventListener('click', (e) => {
      const presetOption = e.target.closest('.font-preset-option');
      if (presetOption) {
        const presetName = presetOption.dataset.preset;
        this.setPreset(presetName);
        this.updateSelectorUI();
      }
    });
    // Listen for theme changes to reapply fonts
    document.addEventListener('themeChange', () => {
      console.log('🌓 Theme changed, reapplying font preset...');
      this.applyCurrentPreset();
    });
  }
  /**
   * Update the selector UI to reflect current preset
   */
  updateSelectorUI() {
    const selector = document.querySelector('.font-preset-selector');
    if (!selector) return;
    // Update active states
    selector.querySelectorAll('.font-preset-option').forEach(option => {
      const presetName = option.dataset.preset;
      const isActive = presetName === this.currentPreset;
      option.classList.toggle('active', isActive);
      // Update active indicator
      const indicator = option.querySelector('.preset-active-indicator');
      if (isActive && !indicator) {
        option.insertAdjacentHTML('beforeend', '<div class="preset-active-indicator">✓ Activo</div>');
      } else if (!isActive && indicator) {
        indicator.remove();
      }
    });
  }
  /**
   * Dispatch custom event when preset changes
   */
  dispatchPresetChange(oldPreset, newPreset) {
    const event = new CustomEvent('fontPresetChange', {
      detail: { 
        oldPreset, 
        newPreset,
        presetInfo: this.presets[newPreset]
      }
    });
    document.dispatchEvent(event);
  }
  /**
   * Preview a preset without saving (for hover effects)
   * @param {string} presetName - Preset to preview
   */
  previewPreset(presetName) {
    if (!this.presets[presetName]) return;
    const preset = this.presets[presetName];
    const root = document.documentElement;
    // Store current values
    this.previewBackup = {
      ui: root.style.getPropertyValue('--font-ui'),
      content: root.style.getPropertyValue('--font-content'),
      display: root.style.getPropertyValue('--font-display'),
      mono: root.style.getPropertyValue('--font-mono')
    };
    // Apply preview values
    root.style.setProperty('--font-ui', preset.ui);
    root.style.setProperty('--font-content', preset.content);
    root.style.setProperty('--font-display', preset.display);
    root.style.setProperty('--font-mono', preset.mono);
    console.log(`👀 Previewing font preset: ${preset.name}`);
  }
  /**
   * Restore from preview without saving
   */
  stopPreview() {
    if (!this.previewBackup) return;
    const root = document.documentElement;
    root.style.setProperty('--font-ui', this.previewBackup.ui);
    root.style.setProperty('--font-content', this.previewBackup.content);
    root.style.setProperty('--font-display', this.previewBackup.display);
    root.style.setProperty('--font-mono', this.previewBackup.mono);
    this.previewBackup = null;
    console.log('👀 Stopped font preview');
  }
  /**
   * Get preset recommendations based on current theme/context
   * @returns {Array} Recommended preset names
   */
  getRecommendations() {
    const isDark = document.body.classList.contains('theme-dark');
    const currentHour = new Date().getHours();
    const isWorkHours = currentHour >= 9 && currentHour <= 17;
    if (isDark) {
      return ['modern', 'corporate', 'creative']; // Better for dark themes
    } else if (isWorkHours) {
      return ['business', 'corporate', 'modern']; // Professional during work hours
    } else {
      return ['creative', 'modern', 'business']; // More relaxed outside work
    }
  }
}
// Initialize globally
window.fontManager = new FontFamilyManager();
// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FontFamilyManager;
}
console.log('✅ Font Family Manager loaded');
console.log('📊 Available methods: setPreset(), getCurrentPreset(), getAllPresets(), generatePresetSelector()');
console.log('📊 Example: fontManager.setPreset("modern")');
