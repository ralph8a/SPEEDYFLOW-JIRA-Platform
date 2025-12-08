/**
 * SPEEDYFLOW - SVG Icons Module
 * Centralized icon library for consistent UI across the application
 * 
 * Usage:
 *   import { SVGIcons } from './utils/svg-icons.js';
 *   element.innerHTML = SVGIcons.refresh();
 *   element.innerHTML = SVGIcons.close({ size: 20, color: '#ff0000' });
 */

const SVGIcons = {
  /**
   * Default configuration for all SVGs
   */
  defaults: {
    size: 16,
    strokeWidth: 2,
    color: 'currentColor',
    className: ''
  },

  /**
   * Merge user options with defaults
   */
  _getOptions(options = {}) {
    return { ...this.defaults, ...options };
  },

  /**
   * Create SVG wrapper with common attributes
   */
  _createSVG(content, options = {}) {
    const opts = this._getOptions(options);
    return `<svg 
      width="${opts.size}" 
      height="${opts.size}" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="${opts.color}" 
      stroke-width="${opts.strokeWidth}" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      class="svg-icon ${opts.className}"
      xmlns="http://www.w3.org/2000/svg"
    >${content}</svg>`;
  },

  // ==========================================
  // ACTION ICONS
  // ==========================================

  /**
   * Refresh / Sync icon (circular arrows)
   */
  refresh(options = {}) {
    return this._createSVG(`
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
    `, options);
  },

  /**
   * Close / X icon
   */
  close(options = {}) {
    return this._createSVG(`
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    `, options);
  },

  /**
   * Clock icon (for auto-refresh)
   */
  clock(options = {}) {
    return this._createSVG(`
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    `, options);
  },

  /**
   * Plus icon (add new item)
   */
  plus(options = {}) {
    return this._createSVG(`
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    `, options);
  },

  /**
   * Edit / Pencil icon
   */
  edit(options = {}) {
    return this._createSVG(`
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    `, options);
  },

  /**
   * Trash / Delete icon
   */
  trash(options = {}) {
    return this._createSVG(`
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    `, options);
  },

  /**
   * Save / Check icon
   */
  save(options = {}) {
    return this._createSVG(`
      <polyline points="20 6 9 17 4 12"></polyline>
    `, options);
  },

  /**
   * Download icon
   */
  download(options = {}) {
    return this._createSVG(`
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    `, options);
  },

  /**
   * Upload icon
   */
  upload(options = {}) {
    return this._createSVG(`
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    `, options);
  },

  /**
   * Copy icon
   */
  copy(options = {}) {
    return this._createSVG(`
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    `, options);
  },

  // ==========================================
  // NAVIGATION ICONS
  // ==========================================

  /**
   * Arrow Right
   */
  arrowRight(options = {}) {
    return this._createSVG(`
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    `, options);
  },

  /**
   * Arrow Left
   */
  arrowLeft(options = {}) {
    return this._createSVG(`
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    `, options);
  },

  /**
   * Arrow Up
   */
  arrowUp(options = {}) {
    return this._createSVG(`
      <line x1="12" y1="19" x2="12" y2="5"></line>
      <polyline points="5 12 12 5 19 12"></polyline>
    `, options);
  },

  /**
   * Arrow Down
   */
  arrowDown(options = {}) {
    return this._createSVG(`
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <polyline points="19 12 12 19 5 12"></polyline>
    `, options);
  },

  /**
   * Chevron Right
   */
  chevronRight(options = {}) {
    return this._createSVG(`
      <polyline points="9 18 15 12 9 6"></polyline>
    `, options);
  },

  /**
   * Chevron Left
   */
  chevronLeft(options = {}) {
    return this._createSVG(`
      <polyline points="15 18 9 12 15 6"></polyline>
    `, options);
  },

  /**
   * External Link icon
   */
  externalLink(options = {}) {
    return this._createSVG(`
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    `, options);
  },

  // ==========================================
  // STATUS & ALERT ICONS
  // ==========================================

  /**
   * Info icon
   */
  info(options = {}) {
    return this._createSVG(`
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    `, options);
  },

  /**
   * Alert / Warning icon
   */
  alert(options = {}) {
    return this._createSVG(`
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    `, options);
  },

  /**
   * Error / X Circle icon
   */
  error(options = {}) {
    return this._createSVG(`
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    `, options);
  },

  /**
   * Success / Check Circle icon
   */
  success(options = {}) {
    return this._createSVG(`
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    `, options);
  },

  // ==========================================
  // UI ELEMENTS
  // ==========================================

  /**
   * Search icon
   */
  search(options = {}) {
    return this._createSVG(`
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    `, options);
  },

  /**
   * Filter icon
   */
  filter(options = {}) {
    return this._createSVG(`
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    `, options);
  },

  /**
   * Settings / Gear icon
   */
  settings(options = {}) {
    return this._createSVG(`
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M12 1v6m0 6v6m5.657-13.657l-4.243 4.243m-2.828 2.828l-4.243 4.243m16.97 1.414l-6-6m-6-6l-6 6"></path>
    `, options);
  },

  /**
   * Menu / Hamburger icon
   */
  menu(options = {}) {
    return this._createSVG(`
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    `, options);
  },

  /**
   * More (3 dots vertical)
   */
  moreVertical(options = {}) {
    return this._createSVG(`
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="12" cy="5" r="1"></circle>
      <circle cx="12" cy="19" r="1"></circle>
    `, options);
  },

  /**
   * More (3 dots horizontal)
   */
  moreHorizontal(options = {}) {
    return this._createSVG(`
      <circle cx="12" cy="12" r="1"></circle>
      <circle cx="19" cy="12" r="1"></circle>
      <circle cx="5" cy="12" r="1"></circle>
    `, options);
  },

  /**
   * Eye / View icon
   */
  eye(options = {}) {
    return this._createSVG(`
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    `, options);
  },

  /**
   * Eye Off / Hide icon
   */
  eyeOff(options = {}) {
    return this._createSVG(`
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    `, options);
  },

  // ==========================================
  // BUSINESS / TICKET ICONS
  // ==========================================

  /**
   * User icon
   */
  user(options = {}) {
    return this._createSVG(`
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    `, options);
  },

  /**
   * Users / Team icon
   */
  users(options = {}) {
    return this._createSVG(`
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    `, options);
  },

  /**
   * Tag icon
   */
  tag(options = {}) {
    return this._createSVG(`
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
      <line x1="7" y1="7" x2="7.01" y2="7"></line>
    `, options);
  },

  /**
   * Calendar icon
   */
  calendar(options = {}) {
    return this._createSVG(`
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    `, options);
  },

  /**
   * Message / Comment icon
   */
  message(options = {}) {
    return this._createSVG(`
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    `, options);
  },

  /**
   * Bell / Notification icon
   */
  bell(options = {}) {
    return this._createSVG(`
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    `, options);
  },

  /**
   * Chart / Analytics icon
   */
  chart(options = {}) {
    return this._createSVG(`
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    `, options);
  },

  /**
   * Shield / Security icon
   */
  shield(options = {}) {
    return this._createSVG(`
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    `, options);
  },

  /**
   * Lightning / Fast icon
   */
  lightning(options = {}) {
    return this._createSVG(`
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    `, options);
  },

  /**
   * Star icon
   */
  star(options = {}) {
    return this._createSVG(`
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    `, options);
  },

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Get all available icon names
   */
  getAvailableIcons() {
    return Object.keys(this)
      .filter(key => typeof this[key] === 'function' && !key.startsWith('_') && key !== 'getAvailableIcons');
  },

  /**
   * Render icon by name
   */
  render(iconName, options = {}) {
    if (typeof this[iconName] === 'function' && !iconName.startsWith('_')) {
      return this[iconName](options);
    }
    console.warn(`SVGIcons: Icon "${iconName}" not found`);
    return this.info(options); // Fallback to info icon
  }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SVGIcons };
}

// Export globally for non-module scripts
if (typeof window !== 'undefined') {
  window.SVGIcons = SVGIcons;
}

console.log('✅ SVG Icons module loaded -', SVGIcons.getAvailableIcons().length, 'icons available');
