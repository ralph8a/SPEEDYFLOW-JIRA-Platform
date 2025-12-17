/**
 * SPEEDYFLOW - Background Selector UI Component
 * Modal para seleccionar y previsualizar fondos
 */
class BackgroundSelectorUI {
  constructor() {
    this.isOpen = false;
    this.modal = null;
    this.button = null;
    this._isUpdating = false;
  }
  /**
   * Initialize the selector UI
   */
  init() {
    console.log('🎨 Initializing Background Selector UI...');
    // Ensure DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initUI());
    } else {
      this.initUI();
    }
  }
  initUI() {
    // The button is now created in HTML directly, just attach event listener
    this.attachButtonListener();
    // Create modal
    this.createModal();
    // Setup event listeners
    this.setupEventListeners();
    // Load saved effects settings if they exist
    // Wait for transparency manager to initialize first
    const waitForTransparencyManager = () => {
      if (window.transparencyManager) {
        const saved = this.loadSavedEffects();
        if (saved) {
          console.log('📂 Loaded and applied saved effects');
          this.applyEffectsGlobally();
        }
      } else {
        console.log('⏳ Waiting for transparency manager...');
        setTimeout(waitForTransparencyManager, 100);
      }
    };
    setTimeout(waitForTransparencyManager, 100);
    // Listen for backgrounds being generated - DISABLED
    // Event listeners disabled - visual only mode
    console.log('✅ Background Selector UI initialized');
  }
  /**
   * Attach click listener to existing button
   */
  attachButtonListener() {
    // Retry logic in case button isn't available immediately
    let attempts = 0;
    const maxAttempts = 10;
    const tryAttach = () => {
      const button = document.getElementById('bgSelectorHeaderBtn');
      if (!button) {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`⏳ Attempt ${attempts}/${maxAttempts}: Button not found, retrying...`);
          setTimeout(tryAttach, 200);
        } else {
          console.error('❌ Background button not found after 10 attempts');
        }
        return;
      }
      this.button = button;
      // Remove any existing listeners first to avoid duplicates
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      this.button = newButton;
      // Add click handler
      this.button.addEventListener('click', (e) => {
        console.log('🎨 Background button clicked!');
        e.preventDefault();
        e.stopPropagation();
        this.toggleModal();
      }, false);
      console.log('✅ Background button listener attached successfully');
      console.log('📍 Button element:', this.button);
      console.log('📍 Button ID:', this.button.id);
      console.log('📍 Button class:', this.button.className);
    };
    tryAttach();
  }
  /**
   * Create button in header (next to theme selector)
   * NOTE: Button is now created directly in HTML, this method is kept for backward compatibility
   */
  createHeaderButton() {
    console.log('🔄 createHeaderButton() called - button should be in HTML');
    // Find existing button
    const button = document.getElementById('bgSelectorHeaderBtn');
    if (button) {
      console.log('✅ Button already exists in HTML');
      this.button = button;
      return;
    }
    console.warn('⚠️ Button not found in HTML');
  }
  /**
   * Create modal
   */
  createModal() {
    // Check if modal already exists to prevent duplicates
    if (document.getElementById('bgSelectorModal')) {
      console.warn('⚠️ Modal already exists, skipping creation');
      return;
    }
    const modal = document.createElement('div');
    modal.className = 'bg-selector-modal';
    modal.id = 'bgSelectorModal';
    modal.setAttribute('data-modal-type', 'background-selector');
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="bg-modal-overlay" data-overlay="bg-selector"></div>
      <div class="bg-modal-content" data-modal-content="background-selector">
        <div class="bg-modal-header">
          <h3 class="bg-modal-title">🎨 Select Background</h3>
          <button class="bg-modal-close" onclick="backgroundSelectorUI.closeModal()">×</button>
        </div>
        <!-- TAB NAVIGATION -->
        <div class="bg-modal-tabs">
          <button class="bg-modal-tab active" data-tab="backgrounds">
            🖼️ Backgrounds
          </button>
          <button class="bg-modal-tab" data-tab="effects">
            🎚️ Effects
          </button>
        </div>
        <!-- TAB: BACKGROUNDS -->
        <div class="bg-modal-tab-content active" id="tab-backgrounds">
          <div class="bg-theme-info">
            <span id="bgThemeDisplay">Dark Theme</span>
          </div>
          <div class="bg-variants-grid" id="bgVariantsGrid">
            ${this.createSkeletons()}
          </div>
          <div class="bg-modal-footer">
            <button class="bg-btn" onclick-disabled="backgroundManager.previousBackground()">← Prev</button>
            <button class="bg-btn" onclick-disabled="backgroundManager.nextBackground()">Next →</button>
            <button class="bg-btn" onclick-disabled="backgroundSelectorUI.randomBackground()">Random</button>
          </div>
        </div>
        <!-- TAB: EFFECTS -->
        <div class="bg-modal-tab-content" id="tab-effects">
          <div class="effects-controls-panel">
            <!-- OPACITY CONTROL - Affects all 3 layers -->
            <div class="effects-section">
              <h4 class="effects-section-title">Opacity (All Layers)</h4>
              <p class="effects-section-desc">Controls transparency of Primary, Secondary, and Tertiary backgrounds</p>
              <div class="effect-control-group">
                <label for="globalOpacitySlider">Opacity Level</label>
                <div class="effect-slider-container">
                  <input 
                    type="range" 
                    id="globalOpacitySlider" 
                    class="effect-transparency-slider" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value="0.65"
                  >
                  <span class="effect-control-value" id="globalOpacityValue">65%</span>
                </div>
              </div>
            </div>
            <div class="effects-divider"></div>
            <!-- BLUR CONTROL - Affects all 3 layers -->
            <div class="effects-section">
              <h4 class="effects-section-title">Blur Effect (All Layers)</h4>
              <p class="effects-section-desc">Controls blur intensity of Primary, Secondary, and Tertiary backgrounds</p>
              <div class="effect-control-group">
                <label for="globalBlurSlider">Blur Intensity</label>
                <div class="effect-slider-container">
                  <input 
                    type="range" 
                    id="globalBlurSlider" 
                    class="effect-blur-slider" 
                    min="0" 
                    max="30" 
                    step="1"
                    value="15"
                  >
                  <span class="effect-control-value" id="globalBlurValue">15px</span>
                </div>
              </div>
            </div>
            <div class="effects-divider"></div>
            <!-- ACTIONS -->
            <div class="effects-actions">
              <button class="effects-save-btn" onclick="backgroundSelectorUI.saveEffects()">💾 Save Settings</button>
              <button class="effects-reset-btn" onclick="backgroundSelectorUI.resetEffects()">🔄 Reset Defaults</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.modal = modal;
    this.setupTabNavigation();
    this.attachEffectsListeners();
  }
  /**
   * Setup event listeners
   */
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // No pagination needed - show all unique backgrounds
    console.log('✅ Displaying all unique backgrounds');
    // Close modal when clicking overlay
    const overlay = this.modal.querySelector('.bg-modal-overlay[data-overlay="bg-selector"]');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal();
        }
      });
    }
    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen && this.modal.classList.contains('bg-modal-open')) {
        this.closeModal();
      }
    });
    // Listen for background changes
    document.addEventListener('backgroundChanged', (e) => {
      if (this.isOpen) {
        this.updateActiveState(e.detail.id);
      }
    });
    // Listen for backgrounds refresh/generation
    document.addEventListener('backgroundsGenerated', (e) => {
      console.log('🎨 Backgrounds generated, updating UI...');
      if (this.isOpen) {
        this.updateVariants();
      } else {
        // If closed, we still might want to update internal state or pre-load
        console.log('🎨 Backgrounds updated in background');
      }
    });
    // Listen for backgrounds refresh request (theme change)
    document.addEventListener('backgroundsNeedRefresh', (e) => {
      if (this.isOpen) {
        console.log('🎨 Backgrounds refreshed for new theme, updating preview images...');
        // Show loading state or skeletons while generating
        const grid = document.getElementById('bgVariantsGrid');
        if (grid) grid.innerHTML = this.createSkeletons();
      }
    });
  }
  /**
   * Create skeleton loaders
   */
  createSkeletons() {
    return Array.from({ length: 5 }, (_, i) => `
      <div class="bg-variant-item bg-skeleton loading" key="skeleton-${i}">
        <div class="skeleton-shimmer"></div>
      </div>
    `).join('');
  }
  /**
   * Toggle modal visibility
   */
  toggleModal() {
    if (this.isOpen) {
      this.closeModal();
    } else {
      this.openModal();
    }
  }
  /**
   * Open modal
   */
  openModal() {
    // Prevent multiple opens
    if (this.isOpen) return;
    this.isOpen = true;
    if (this.modal) {
      this.modal.style.display = 'flex';
      this.modal.classList.add('bg-modal-open');
    }
    // IMPORTANT: Detect theme and regenerate backgrounds for current theme
    const detectedTheme = backgroundManager.detectCurrentTheme();
    console.log(`🎨 Modal opened - Detected theme: ${detectedTheme}`);
    // Show loading state immediately
    const grid = document.getElementById('bgVariantsGrid');
    if (grid) {
      grid.innerHTML = this.createSkeletons();
    }
    // Check if backgroundManager already has backgrounds for current theme
    if (backgroundManager.backgrounds && backgroundManager.backgrounds.length > 0 && backgroundManager.currentTheme === detectedTheme) {
      console.log(`🎨 Using existing backgrounds for ${detectedTheme}`, backgroundManager.backgrounds.length);
      this.updateVariants();
    } else {
      backgroundManager.currentTheme = detectedTheme;
      // Generate backgrounds - the event listener will update the modal when ready
      backgroundManager.generateBackgrounds(detectedTheme)
        .catch(err => {
          console.error('❌ Background generation failed:', err);
          if (this.isOpen && grid) {
            const errorIcon = typeof SVGIcons !== 'undefined' 
              ? SVGIcons.error({ size: 20, className: 'inline-icon' })
              : '❌';
            grid.innerHTML = `<div style="text-align: center; padding: 30px; color: #ef4444;">${errorIcon} Error generating backgrounds</div>`;
          }
        });
    }
    console.log('📂 Background selector opened');
  }
  /**
   * Close modal
   */
  closeModal() {
    if (!this.isOpen) return; // Prevent redundant operations
    this.isOpen = false;
    if (this.modal && this.modal.classList) {
      this.modal.classList.remove('bg-modal-open');
    }
    setTimeout(() => {
      if (!this.isOpen && this.modal) {
        this.modal.style.display = 'none';
      }
    }, 300);
    console.log('📁 Background selector closed');
  }
  /**
   * Update variants in grid
   */
  updateVariants() {
    const grid = document.getElementById('bgVariantsGrid');
    if (!grid) {
      console.error('❌ Grid element not found: bgVariantsGrid');
      return;
    }
    // Prevent duplicate updates
    if (this._isUpdating) {
      console.log('⏸️ Update already in progress, skipping...');
      return;
    }
    this._isUpdating = true;
    const backgrounds = backgroundManager.getBackgroundList();
    console.log(`🔍 DEBUG: Total backgrounds in manager: ${backgroundManager.backgrounds.length}`);
    console.log(`🔍 DEBUG: getBackgroundList() returned: ${backgrounds.length}`);
    // Log each background to detect duplicates
    if (backgrounds.length > 0) {
      console.log(`🔍 DEBUG: Background IDs:`, backgrounds.map(bg => bg.id || bg.style));
    }
    if (backgrounds.length === 0) {
      console.warn('⚠️  No backgrounds available yet, showing loading state');
      grid.innerHTML = this.createSkeletons();
      this._isUpdating = false;
      return;
    }
    // Filter to get unique backgrounds (no duplicates)
    const uniqueBackgrounds = [];
    const seenIds = new Set();
    for (const bg of backgrounds) {
      if (!seenIds.has(bg.id)) {
        seenIds.add(bg.id);
        uniqueBackgrounds.push(bg);
      }
    }
    console.log(`🎨 Displaying ${uniqueBackgrounds.length} unique backgrounds`);
    console.log('🔑 Background IDs:', uniqueBackgrounds.map(b => b.id));
    // Clear grid completely
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }
    const pageItems = uniqueBackgrounds;
    // Add variant items (no pagination, show all)
    pageItems.forEach((bg, idx) => {
      const item = document.createElement('div');
      item.className = 'bg-variant-item';
      item.title = bg.description || bg.style || `Background ${idx + 1}`;
      item.setAttribute('data-bg-id', idx);
      item.setAttribute('data-unique-id', bg.id);
      item.onclick = () => {
        console.log(`🎨 Selected background ${idx}: ${bg.id}`);
        // Trigger assembly animation
        if (typeof triggerBackgroundAssembly === 'function') {
          triggerBackgroundAssembly(item);
        }
        backgroundManager.applyBackground(idx);
        this.updateActiveState(idx);
      };
      // Set background preview from unique background data
      if (bg && bg.data_uri) {
        item.style.backgroundImage = `url('${bg.data_uri}')`;
        item.style.backgroundSize = 'cover';
        item.style.backgroundPosition = 'center';
        item.style.backgroundRepeat = 'no-repeat';
        console.log(`✅ Added background ${idx + 1}/5: ${bg.style || bg.id}`);
        console.log(`🖼️ data_uri length: ${bg.data_uri.length}, starts with: ${bg.data_uri.substring(0, 50)}...`);
      } else {
        console.warn(`⚠️ No image for background ${idx}`, bg);
        item.style.background = 'linear-gradient(135deg, #1e293b, #0f172a)';
        const placeholderIcon = typeof SVGIcons !== 'undefined' 
          ? SVGIcons.image({ size: 32, className: 'placeholder-icon' })
          : '🖼️';
        item.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:24px;">${placeholderIcon}</div>`;
      }
      // Add active state if current
      if (idx === backgroundManager.currentBackground) {
        item.classList.add('active');
      }
      grid.appendChild(item);
    });
    // Update theme display
    const themeDisplay = document.getElementById('bgThemeDisplay');
    if (themeDisplay) {
      const theme = backgroundManager.currentTheme;
      themeDisplay.textContent = theme.charAt(0).toUpperCase() + theme.slice(1) + ' Theme';
    }
    console.log(`✅ Successfully displayed ${pageItems.length} unique backgrounds`);
    // Release update lock
    this._isUpdating = false;
  }
  /**
   * Update ONLY the background images (variant thumbnails) without changing UI theme
   * Called when theme changes to refresh background previews
   */
  updateVariantsImagesOnly() {
    const grid = document.getElementById('bgVariantsGrid');
    const backgrounds = backgroundManager.getBackgroundList();
    if (backgrounds.length === 0) {
      console.warn('No backgrounds available yet');
      return;
    }
    // Update ONLY the background images in existing items
    const items = grid.querySelectorAll('.bg-variant-item');
    items.forEach((item, idx) => {
      const bgData = backgroundManager.backgrounds[idx];
      if (bgData && bgData.data_uri) {
        item.style.backgroundImage = `url('${bgData.data_uri}')`;
      }
    });
    console.log(`✅ Updated ${backgrounds.length} background preview images (theme images regenerated)`);
    // NOTE: Panel UI theme does NOT change - button stays same color
  }
  /**
   * Update active state for current background
   */
  updateActiveState(id) {
    const items = document.querySelectorAll('.bg-variant-item');
    items.forEach((item, idx) => {
      if (idx === id) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
  /**
   * Select a random background
   */
  randomBackground() {
    const count = backgroundManager.backgrounds.length;
    if (count === 0) return;
    const randomId = Math.floor(Math.random() * count);
    // Trigger assembly animation
    if (typeof triggerBackgroundAssembly === 'function') {
      triggerBackgroundAssembly();
    }
    backgroundManager.applyBackground(randomId);
    this.updateActiveState(randomId);
  }
  // Pagination removed - showing all unique backgrounds at once
  /**
   * Setup tab navigation
   */
  setupTabNavigation() {
    const tabs = document.querySelectorAll('.bg-modal-tab');
    const tabContents = document.querySelectorAll('.bg-modal-tab-content');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const content = document.getElementById(`tab-${tabName}`);
        if (content) {
          content.classList.add('active');
        }
        console.log(`📑 Switched to tab: ${tabName}`);
        // Update effects sliders if switching to effects tab
        if (tabName === 'effects') {
          this.updateEffectsSliders();
        }
      });
    });
  }
  /**
   * Attach effects slider listeners
   */
  attachEffectsListeners() {
    console.log('🔧 Attaching effects listeners...');
    // Use a small delay to ensure DOM is fully rendered
    setTimeout(() => {
      // Global opacity slider - affects all 3 layers
      const opacitySlider = document.getElementById('globalOpacitySlider');
      if (opacitySlider) {
        console.log('✅ Opacity slider found, attaching listener');
        // Remove any existing listeners first
        const newOpacitySlider = opacitySlider.cloneNode(true);
        opacitySlider.parentNode.replaceChild(newOpacitySlider, opacitySlider);
        newOpacitySlider.addEventListener('input', (e) => {
          console.log('🎚️ Opacity slider changed:', newOpacitySlider.value);
          this.handleGlobalOpacityChange(newOpacitySlider);
        });
      } else {
        console.warn('⚠️ Opacity slider NOT found - attempting retry...');
        // Retry after longer delay
        setTimeout(() => this.attachEffectsListeners(), 1000);
        return;
      }
      // Global blur slider - affects all 3 layers
      const blurSlider = document.getElementById('globalBlurSlider');
      if (blurSlider) {
        console.log('✅ Blur slider found, attaching listener');
        // Remove any existing listeners first
        const newBlurSlider = blurSlider.cloneNode(true);
        blurSlider.parentNode.replaceChild(newBlurSlider, blurSlider);
        newBlurSlider.addEventListener('input', (e) => {
          console.log('🎚️ Blur slider changed:', newBlurSlider.value);
          this.handleGlobalBlurChange(newBlurSlider);
        });
      } else {
        console.warn('⚠️ Blur slider NOT found');
      }
      console.log('✅ Effects listeners attached successfully');
    }, 100);
  }
  /**
   * Handle global opacity change - affects all 3 layers
   */
  handleGlobalOpacityChange(slider) {
    const value = parseFloat(slider.value);
    const valueDisplay = document.getElementById('globalOpacityValue');
    if (valueDisplay) {
      valueDisplay.textContent = Math.round(value * 100) + '%';
    }
    if (window.transparencyManager) {
      // Get current theme from transparency manager
      const theme = window.transparencyManager.currentTheme;
      // Apply to all 3 layers with correct API signature: setTransparency(theme, layer, opacity)
      window.transparencyManager.setTransparency(theme, 'primary', value);
      window.transparencyManager.setTransparency(theme, 'secondary', value);
      window.transparencyManager.setTransparency(theme, 'tertiary', value);
      console.log(`📊 Global opacity updated: ${Math.round(value * 100)}%`);
      // Apply effects ONLY to UI elements (sidebars, kanban container)
      // NOT to the background manager (background stays solid)
      this.applyEffectsGlobally();
    }
  }
  /**
   * Handle global blur change - affects all 3 layers
   */
  handleGlobalBlurChange(slider) {
    const value = parseInt(slider.value);
    const valueDisplay = document.getElementById('globalBlurValue');
    if (valueDisplay) {
      valueDisplay.textContent = value + 'px';
    }
    if (window.transparencyManager) {
      // Get current theme from transparency manager
      const theme = window.transparencyManager.currentTheme;
      // Apply to all 3 layers with correct API signature: setBlur(theme, layer, blurPx)
      window.transparencyManager.setBlur(theme, 'primary', value);
      window.transparencyManager.setBlur(theme, 'secondary', value);
      window.transparencyManager.setBlur(theme, 'tertiary', value);
      console.log(`🌫️ Global blur updated: ${value}px`);
      // Apply effects ONLY to UI elements (sidebars, kanban container)
      // NOT to the background manager (background stays solid)
      this.applyEffectsGlobally();
    }
  }
  /**
   * Update global effects sliders from transparency manager
   */
  updateEffectsSliders() {
    const manager = window.transparencyManager;
    if (!manager) return;
    const themeName = manager.currentTheme;
    const settings = manager.settings[themeName];
    if (!settings) {
      console.warn(`⚠️ No settings found for theme: ${themeName}`);
      return;
    }
    // Sync global opacity slider - use primary value as reference
    const opacitySlider = document.getElementById('globalOpacitySlider');
    const opacityValue = document.getElementById('globalOpacityValue');
    if (opacitySlider && settings.primary !== undefined) {
      opacitySlider.value = settings.primary;
      if (opacityValue) opacityValue.textContent = Math.round(settings.primary * 100) + '%';
      console.log(`🎚️ Updated opacity slider to ${settings.primary}`);
    }
    // Sync global blur slider - use primary value as reference
    const blurSlider = document.getElementById('globalBlurSlider');
    const blurValue = document.getElementById('globalBlurValue');
    if (blurSlider && settings.blur?.primary !== undefined) {
      blurSlider.value = parseInt(settings.blur.primary);
      if (blurValue) blurValue.textContent = parseInt(settings.blur.primary) + 'px';
      console.log(`🌫️ Updated blur slider to ${settings.blur.primary}px`);
    }
  }
  /**
   * Reset effects to defaults
   */
  /**
   * Save effects settings to localStorage and apply globally
   */
  saveEffects() {
    console.log('💾 Saving effects settings...');
    if (!window.transparencyManager) {
      console.warn('⚠️ Transparency manager not available');
      return;
    }
    const settings = window.transparencyManager.settings;
    const theme = window.transparencyManager.currentTheme;
    // Save to localStorage
    try {
      localStorage.setItem('speedyflowEffectsSettings', JSON.stringify(settings));
      console.log('✅ Effects settings saved to localStorage');
      // Also ensure they're persisted in transparency manager
      window.transparencyManager.saveTransparency();
      // Apply to all elements immediately
      this.applyEffectsGlobally();
      // Show success message
      alert('✅ Settings saved! They will persist when you restart the app.');
    } catch (error) {
      console.error('❌ Error saving effects:', error);
      alert('❌ Failed to save settings');
    }
  }
  /**
   * Load saved effects from localStorage
   */
  loadSavedEffects() {
    console.log('📂 Loading saved effects settings...');
    try {
      const saved = localStorage.getItem('speedyflowEffectsSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        console.log('✅ Loaded saved effects settings:', settings);
        if (window.transparencyManager) {
          window.transparencyManager.settings = settings;
          window.transparencyManager.applyTransparency();
          this.updateEffectsSliders();
          this.applyEffectsGlobally();
        }
        return settings;
      }
    } catch (error) {
      console.warn('⚠️ Error loading saved effects:', error);
    }
    return null;
  }
  /**
   * Apply effects globally to all elements
   * DELEGATED: Now simply calls transparencyManager.applyTransparency()
   * This eliminates redundancy and ensures single source of truth
   */
  applyEffectsGlobally() {
    if (!window.transparencyManager) {
      console.warn('⚠️ Transparency manager not found');
      return;
    }
    // Single source of truth: delegate to transparencyManager
    window.transparencyManager.applyTransparency();
  }
  resetEffects() {
    console.log('🔄 Resetting effects to defaults...');
    if (window.transparencyManager && window.transparencyManager.resetTransparency) {
      window.transparencyManager.resetTransparency();
    }
    // Update sliders
    this.updateEffectsSliders();
    // Apply globally
    this.applyEffectsGlobally();
  }
}
// Don't create instance here - wait for app.js to do it
// This prevents silent failures if there are syntax errors above
// Export class globally so app.js can instantiate it
window.BackgroundSelectorUI = BackgroundSelectorUI;
