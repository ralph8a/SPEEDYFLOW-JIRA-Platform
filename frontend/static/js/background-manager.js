/**
 * SPEEDYFLOW - Background Manager
 * Manages AI-generated backgrounds with theme switching
 */

const backgroundManager = {
  currentTheme: localStorage.getItem('currentTheme') || 'light',
  currentBackground: parseInt(localStorage.getItem('currentBackground')) || 0,
  backgrounds: [],
  isGenerating: false,
  parallaxInitialized: false,
  
  /**
   * Detect current theme from DOM and system
   */
  detectCurrentTheme() {
    // Priority 1: Check body class FIRST (reflects actual visual theme)
    if (document.body.classList.contains('theme-light')) {
      console.log(`🎨 Theme from DOM class: light`);
      return 'light';
    }
    if (document.body.classList.contains('theme-dark')) {
      console.log(`🎨 Theme from DOM class: dark`);
      return 'dark';
    }
    
    // Priority 2: Check localStorage (user's preference if saved)
    const savedTheme = localStorage.getItem('currentTheme');
    if (savedTheme && ['dark', 'light'].includes(savedTheme)) {
      console.log(`🎨 Theme from localStorage: ${savedTheme}`);
      return savedTheme;
    }
    
    // Priority 3: Check html element data attribute
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    if (htmlTheme && ['dark', 'light'].includes(htmlTheme)) {
      console.log(`🎨 Theme from HTML data-theme: ${htmlTheme}`);
      return htmlTheme;
    }
    
    // Priority 4: Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      console.log(`🎨 Theme from system preference: dark`);
      return 'dark';
    }
    
    // Default fallback - LIGHT
    console.log(`🎨 Using default theme: light`);
    return 'light';
  },
  
  /**
   * Initialize background manager
   */
  async init() {
    console.log('🎨 Initializing Background Manager...');
    
    // Detect current theme
    this.currentTheme = this.detectCurrentTheme();
    console.log(`🎨 Detected theme: ${this.currentTheme}`);
    
    // Create background container immediately
    this.createBackgroundContainer();
    
    // Try to load backgrounds from cache first
    const cachedBgs = this.loadBackgroundsFromCache(this.currentTheme);
    if (cachedBgs && cachedBgs.length > 0) {
      console.log(`🎨 Loaded ${cachedBgs.length} backgrounds from cache for ${this.currentTheme}`);
      this.backgrounds = cachedBgs;
    } else {
      console.log(`🎨 No cached backgrounds for ${this.currentTheme}, using placeholders`);
      this.applyPlaceholderVariants(this.currentTheme);
    }
    
    // Generate backgrounds in background (non-blocking) with timeout
    this.generateBackgroundsWithTimeout(this.currentTheme, 5000)
      .catch(err => console.warn('🎨 Background generation timeout/error:', err));
    
    // Apply current background from localStorage
    this.applyBackground(this.currentBackground);
    
    // Setup theme change listeners - Generate and apply backgrounds
    document.addEventListener('themeChange', (e) => {
      this.currentTheme = e.detail.theme;
      console.log(`🎨 Theme changed to: ${this.currentTheme}`);
      
      // Try to load cached backgrounds for new theme
      const cachedBgs = this.loadBackgroundsFromCache(this.currentTheme);
      if (cachedBgs && cachedBgs.length > 0) {
        console.log(`🎨 Using cached backgrounds for ${this.currentTheme}`);
        this.backgrounds = cachedBgs;
        // Apply the current background index (or 0 if out of range)
        const bgIndex = this.currentBackground < this.backgrounds.length ? this.currentBackground : 0;
        this.applyBackground(bgIndex);
      } else {
        console.log(`🎨 Applying placeholders while generating ${this.currentTheme}`);
        this.applyPlaceholderVariants(this.currentTheme);
        // Apply first placeholder
        this.applyBackground(0);
      }
      
      // Generate backgrounds non-blocking with timeout
      this.generateBackgroundsWithTimeout(this.currentTheme, 5000)
        .then(() => {
          // After generating, apply the same index or 0
          const bgIndex = this.currentBackground < this.backgrounds.length ? this.currentBackground : 0;
          this.applyBackground(bgIndex);
        })
        .catch(err => console.warn('🎨 Background generation timeout:', err));
      
      // Dispatch event
      document.dispatchEvent(new CustomEvent('backgroundsNeedRefresh', {
        detail: { theme: this.currentTheme }
      }));
    });
    
    // Watch for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const newTheme = e.matches ? 'dark' : 'light';
        if (newTheme !== this.currentTheme) {
          this.currentTheme = newTheme;
          console.log(`🎨 System theme changed to: ${newTheme}`);
          this.generateAndApply();
        }
      });
    }
    
    // Watch for CSS class changes on html/body
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const detectedTheme = this.detectCurrentTheme();
          if (detectedTheme !== this.currentTheme && detectedTheme !== localStorage.getItem('currentTheme')) {
            this.currentTheme = detectedTheme;
            console.log(`🎨 DOM theme class changed to: ${detectedTheme}`);
            this.generateAndApply();
          }
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    console.log('✅ Background Manager initialized with auto-detection');
  },
  
  /**
   * Create background container in DOM
   */
  createBackgroundContainer() {
    // Check if already exists
    if (document.getElementById('aiBackgroundContainer')) return;

    const container = document.createElement('div');
    container.id = 'aiBackgroundContainer';
    // FIX: Use correct class name matching CSS
    container.className = 'app-background-container';
    
    const overlay = document.createElement('div');
    overlay.id = 'aiBackgroundOverlay';
    // FIX: Use correct class name matching CSS
    overlay.className = 'background-overlay';
    
    container.appendChild(overlay);
    document.body.insertBefore(container, document.body.firstChild);

    // REMOVED: Background manager should NOT modify UI component transparency
    // Transparency is managed independently by glassmorphism-opacity-controller.js
    // if (window.transparencyManager) {
    //   window.transparencyManager.forceReapply();
    // }
  },
  
  /**
   * Save backgrounds to localStorage cache
   */
  saveBackgroundsToCache(theme) {
    try {
      const cacheKey = `speedyflow_backgrounds_${theme}`;
      // FIX: Cache up to 20 backgrounds (was 5) to support full pagination
      const toCache = this.backgrounds.slice(0, 20);
      localStorage.setItem(cacheKey, JSON.stringify(toCache));
      console.log(`🎨 Saved ${toCache.length} backgrounds to cache for ${theme}`);
    } catch (error) {
      // Silently fail if localStorage is full
      console.warn('🎨 Could not save to localStorage:', error.message);
    }
  },
  
  /**
   * Load backgrounds from localStorage cache
   */
  loadBackgroundsFromCache(theme) {
    try {
      const cacheKey = `speedyflow_backgrounds_${theme}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const bgs = JSON.parse(cached);
        if (Array.isArray(bgs) && bgs.length > 0) {
          console.log(`🎨 Loaded ${bgs.length} backgrounds from cache`);
          return bgs;
        }
      }
    } catch (error) {
      console.warn('🎨 Could not load from cache:', error.message);
    }
    return null;
  },

  /**
   * Remove duplicate buttons from background selector modal
   */
  removeDuplicateModalButtons() {
    const modal = document.querySelector('.background-selector-modal');
    if (!modal) return;
    
    // Find all button containers
    const buttonContainers = modal.querySelectorAll('.modal-buttons, .button-container, .action-buttons');
    
    // If we have multiple button containers, keep only the first one
    for (let i = 1; i < buttonContainers.length; i++) {
      console.log('🧹 Removing duplicate button container');
      buttonContainers[i].remove();
    }
    
    // Remove duplicate individual buttons
    const allButtons = modal.querySelectorAll('button');
    const seenButtons = new Set();
    
    allButtons.forEach(button => {
      const buttonId = button.textContent.trim() + button.className;
      if (seenButtons.has(buttonId)) {
        console.log('🧹 Removing duplicate button:', button.textContent);
        button.remove();
      } else {
        seenButtons.add(buttonId);
      }
    });
  },

  async generateBackgroundsWithTimeout(theme, timeoutMs = 5000) {
    return Promise.race([
      this.generateBackgrounds(theme),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Generation timeout')), timeoutMs)
      )
    ]);
  },

  async generateBackgrounds(theme) {
    if (this.isGenerating) {
      console.log('🔄 Already generating, skipping...');
      return;
    }
    
    this.isGenerating = true;
    console.log(`🔄 Generating backgrounds for theme: ${theme}`);
    
    // Fix duplicate buttons in modal
    this.removeDuplicateModalButtons();
    
    try {
      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const response = await fetch('/api/backgrounds/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      console.log(`✅ API Response success: ${data.success}, variants count: ${data.variants?.length || 0}`);
      
      if (data.success && Array.isArray(data.variants) && data.variants.length > 0) {
        this.backgrounds = data.variants;
        console.log(`✅ Generated ${data.variants.length} backgrounds for ${theme}`);
        console.log(`📊 AI Engine: ${data.ollama_available ? 'Available' : 'Fallback'}`);
        
        // Save to cache
        this.saveBackgroundsToCache(theme);
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('backgroundsGenerated', {
          detail: { theme, count: data.variants.length }
        }));
      } else {
        console.warn('⚠️  Response missing variants array, using placeholder');
        this.applyPlaceholderVariants(theme);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ Background generation timeout (>4s)');
      } else {
        console.error('❌ Error generating backgrounds:', error.message);
      }
      this.applyPlaceholderVariants(theme);
    } finally {
      this.isGenerating = false;
    }
  },

  applyPlaceholderVariants(theme) {
    // Solid colors + gradient variants
    const solidColors = theme === 'dark' 
      ? [
          { color: '#000000', name: 'Pure Black' },
          { color: '#0a1929', name: 'Deep Blue' }
        ]
      : [
          { color: '#ffffff', name: 'Pure White' },
          { color: '#f8f9fa', name: 'Light Gray' }
        ];
    
    // Create solid color SVGs
    const solidSvgs = solidColors.map((solid, idx) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'><rect width='1600' height='900' fill='${solid.color}'/></svg>`;
      const b64 = btoa(svg);
      return {
        id: `${theme}-solid-${idx}`,
        data_uri: `data:image/svg+xml;base64,${b64}`,
        theme,
        description: `${solid.name} (Solid)`,
        timestamp: new Date().toISOString()
      };
    });
    
    // Gradient variants
    const svgA = `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${theme==='dark'?'#0f172a':'#ffffff'}'/><stop offset='100%' stop-color='${theme==='dark'?'#1e3a8a':'#dbeafe'}'/></linearGradient><rect width='1600' height='900' fill='url(#g)'/></svg>`;
    const svgB = `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'><linearGradient id='h' x1='1' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='${theme==='dark'?'#312e81':'#bfdbfe'}'/><stop offset='100%' stop-color='${theme==='dark'?'#1e3a8a':'#93c5fd'}'/></linearGradient><rect width='1600' height='900' fill='url(#h)'/></svg>`;
    const b64A = btoa(svgA); const b64B = btoa(svgB);
    
    const gradients = [
      { id: `${theme}-gradient-0`, data_uri: `data:image/svg+xml;base64,${b64A}`, theme, description: 'Gradient A', timestamp: new Date().toISOString() },
      { id: `${theme}-gradient-1`, data_uri: `data:image/svg+xml;base64,${b64B}`, theme, description: 'Gradient B', timestamp: new Date().toISOString() }
    ];
    
    // Combine: solid colors first, then gradients
    this.backgrounds = [...solidSvgs, ...gradients];
    
    // Save placeholders to cache too
    this.saveBackgroundsToCache(theme);
    console.log(`🎨 Applied ${this.backgrounds.length} backgrounds (${solidSvgs.length} solid + ${gradients.length} gradients) for ${theme}`);
    document.dispatchEvent(new CustomEvent('backgroundsGenerated', { detail: { theme, count: this.backgrounds.length, placeholder: true } }));
  },
  
  /**
   * Apply background by ID
   */
  applyBackground(id) {
    // Validate that we have backgrounds
    if (!this.backgrounds || this.backgrounds.length === 0) {
      console.warn(`⚠️ No backgrounds available to apply`);
      return;
    }
    
    const bg = this.backgrounds[id];
    if (!bg) {
      console.warn(`⚠️ Background ${id} not found`);
      return;
    }
    
    console.log(`🎨 Applying background ${id} (${bg.theme})`);
    
    const container = document.getElementById('aiBackgroundContainer');
    if (!container) return;
    
    // Create or update background image
    let bgImage = document.getElementById('aiBackgroundImage');
    if (!bgImage) {
      bgImage = document.createElement('div');
      bgImage.id = 'aiBackgroundImage';
      // FIX: Use correct class name matching CSS
      bgImage.className = 'background-image-layer';
      container.insertBefore(bgImage, container.firstChild);
    }
    
    // Apply background via data URI
    bgImage.style.backgroundImage = `url('${bg.data_uri}')`;
    
    // Initialize parallax effect on the applied background
    this.initBackgroundParallax();
    
    // Store selection
    this.currentBackground = id;
    localStorage.setItem('currentBackground', id);
    
    // Dispatch event
    document.dispatchEvent(new CustomEvent('backgroundChanged', {
      detail: { id, theme: bg.theme, description: bg.description }
    }));
  },
  
  /**
   * Initialize parallax effect for applied background
   */
  initBackgroundParallax() {
    if (this.parallaxInitialized) return;
    
    const bgImage = document.getElementById('aiBackgroundImage');
    if (!bgImage) return;

    console.log('✨ Initializing parallax effect');
    this.parallaxInitialized = true;

    // Use requestAnimationFrame for smooth parallax
    let lastX = window.innerWidth / 2;
    let lastY = window.innerHeight / 2;
    let targetX = lastX;
    let targetY = lastY;

    document.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    });

    // Smooth parallax animation loop
    const animateParallax = () => {
      // Always get the current element in case it was re-created
      const currentBgImage = document.getElementById('aiBackgroundImage');
      if (!currentBgImage) {
        requestAnimationFrame(animateParallax);
        return;
      }

      // Smooth interpolation for slower movement
      lastX += (targetX - lastX) * 0.05; // Slower easing
      lastY += (targetY - lastY) * 0.05; // Slower easing

      const xPercent = (lastX / window.innerWidth - 0.5) * 2;
      const yPercent = (lastY / window.innerHeight - 0.5) * 2;

      // INCREASED parallax effect: 50px max movement (was 10px)
      const moveX = xPercent * 50; // 50px max movement
      const moveY = yPercent * 50; // 50px max movement

      currentBgImage.style.backgroundPosition = `calc(50% + ${moveX}px) calc(50% + ${moveY}px)`;
      requestAnimationFrame(animateParallax);
    };

    animateParallax();

    // Reset on mouse leave
    document.addEventListener('mouseleave', () => {
      targetX = window.innerWidth / 2;
      targetY = window.innerHeight / 2;
    });
  },
  
  /**
   * Generate and apply backgrounds for current theme
   */
  async generateAndApply() {
    await this.generateBackgrounds(this.currentTheme);
    this.applyBackground(this.currentBackground);
  },
  
  /**
   * Get list of available backgrounds
   */
  getBackgroundList() {
    return this.backgrounds.map((bg, idx) => ({
      id: bg.id || idx,
      theme: bg.theme,
      description: bg.description,
      timestamp: bg.timestamp,
      data_uri: bg.data_uri,  // CRITICAL: Include data_uri for thumbnails
      style: bg.style,
      svg: bg.svg
    }));
  },
  
  /**
   * Switch to next background
   */
  nextBackground() {
    const nextId = (this.currentBackground + 1) % this.backgrounds.length;
    this.applyBackground(nextId);
  },
  
  /**
   * Switch to previous background
   */
  previousBackground() {
    const prevId = (this.currentBackground - 1 + this.backgrounds.length) % this.backgrounds.length;
    this.applyBackground(prevId);
  },
  
  /**
   * Get current background info
   */
  getCurrentBackground() {
    return this.backgrounds[this.currentBackground];
  }
};

// Export for use in other scripts
window.backgroundManager = backgroundManager;
