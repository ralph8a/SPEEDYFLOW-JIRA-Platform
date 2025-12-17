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
    // AI-generated backgrounds disabled: use placeholder variants only
    console.log('🎨 AI-generated backgrounds disabled; using placeholders only');
    this.applyPlaceholderVariants(this.currentTheme);
    // Apply current background from localStorage
    this.applyBackground(this.currentBackground);
    // Setup theme change listeners - Generate and apply backgrounds
    document.addEventListener('themeChange', (e) => {
      this.currentTheme = e.detail.theme;
      console.log(`🎨 Theme changed to: ${this.currentTheme}`);
      // Use placeholders only for new theme
      console.log(`🎨 Applying placeholders for ${this.currentTheme}`);
      this.applyPlaceholderVariants(this.currentTheme);
      // Apply first placeholder or current index
      const bgIndex = this.currentBackground < this.backgrounds.length ? this.currentBackground : 0;
      this.applyBackground(bgIndex);
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
          // Re-apply placeholders for new theme
          this.applyPlaceholderVariants(this.currentTheme);
          const bgIndex = this.currentBackground < this.backgrounds.length ? this.currentBackground : 0;
          this.applyBackground(bgIndex);
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
            // Re-apply placeholders for new theme
            this.applyPlaceholderVariants(this.currentTheme);
            const bgIndex = this.currentBackground < this.backgrounds.length ? this.currentBackground : 0;
            this.applyBackground(bgIndex);
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
  },
  /* Caching of generated backgrounds disabled */
  applyPlaceholderVariants(theme) {

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
    const svgA = `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${theme === 'dark' ? '#0f172a' : '#ffffff'}'/><stop offset='100%' stop-color='${theme === 'dark' ? '#1e3a8a' : '#dbeafe'}'/></linearGradient><rect width='1600' height='900' fill='url(#g)'/></svg>`;
    const svgB = `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'><linearGradient id='h' x1='1' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='${theme === 'dark' ? '#312e81' : '#bfdbfe'}'/><stop offset='100%' stop-color='${theme === 'dark' ? '#1e3a8a' : '#93c5fd'}'/></linearGradient><rect width='1600' height='900' fill='url(#h)'/></svg>`;
    const b64A = btoa(svgA); const b64B = btoa(svgB);
    const gradients = [
      { id: `${theme}-gradient-0`, data_uri: `data:image/svg+xml;base64,${b64A}`, theme, description: 'Gradient A', timestamp: new Date().toISOString() },
      { id: `${theme}-gradient-1`, data_uri: `data:image/svg+xml;base64,${b64B}`, theme, description: 'Gradient B', timestamp: new Date().toISOString() }
    ];
    // Combine: solid colors first, then gradients
    this.backgrounds = [...solidSvgs, ...gradients];
    // Caching disabled for placeholders
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
  /* AI generation disabled; generateAndApply removed */
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
