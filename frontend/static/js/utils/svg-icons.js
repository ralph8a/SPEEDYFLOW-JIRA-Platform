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
   * Chevron Down
   */
  chevronDown(options = {}) {
    return this._createSVG(`
      <polyline points="6 9 12 15 18 9"></polyline>
    `, options);
  },
  /**
   * Chevron Up
   */
  chevronUp(options = {}) {
    return this._createSVG(`
      <polyline points="6 15 12 9 18 15"></polyline>
    `, options);
  },
  /**
   * Pause icon
   */
  pause(options = {}) {
    return this._createSVG(`
      <rect x="6" y="5" width="3" height="14" rx="1"></rect>
      <rect x="15" y="5" width="3" height="14" rx="1"></rect>
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
   * Settings / Gear icon (classic gear with 6 teeth)
   */
  settings(options = {}) {
    return this._createSVG(`
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M13.5 2h-3l-.5 2.5a8 8 0 0 0-2 .8L5.5 3.5l-2 2.5 1.8 2.5a8 8 0 0 0-.8 2L2 11v3l2.5.5a8 8 0 0 0 .8 2L3.5 19l2 2.5 2.5-1.8a8 8 0 0 0 2 .8L11 23h3l.5-2.5a8 8 0 0 0 2-.8l2.5 1.8 2-2.5-1.8-2.5a8 8 0 0 0 .8-2L22 14v-3l-2.5-.5a8 8 0 0 0-.8-2L20.5 6l-2-2.5-2.5 1.8a8 8 0 0 0-2-.8L13.5 2z"></path>
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
  // ADDITIONAL ICONS (High Priority)
  // ==========================================
  /**
   * Folder icon
   */
  folder(options = {}) {
    return this._createSVG(`
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    `, options);
  },
  /**
   * Clipboard icon
   */
  clipboard(options = {}) {
    return this._createSVG(`
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    `, options);
  },
  /**
   * Help / Question icon
   */
  help(options = {}) {
    return this._createSVG(`
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    `, options);
  },
  /**
   * Trend Up icon (Analytics up)
   */
  trendUp(options = {}) {
    return this._createSVG(`
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    `, options);
  },
  /**
   * Trend Down icon (Analytics down)
   */
  trendDown(options = {}) {
    return this._createSVG(`
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
      <polyline points="17 18 23 18 23 12"></polyline>
    `, options);
  },
  /**
   * Image icon
   */
  image(options = {}) {
    return this._createSVG(`
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    `, options);
  },
  // ==========================================
  // PLACEHOLDER REPLACEMENTS (High Priority)
  // ==========================================
  /**
   * Building / Organization icon (replaces user placeholder for Service Desk)
   */
  building(options = {}) {
    return this._createSVG(`
      <rect x="4" y="2" width="16" height="20" rx="1" ry="1"></rect>
      <line x1="9" y1="22" x2="9" y2="18"></line>
      <line x1="15" y1="22" x2="15" y2="18"></line>
      <line x1="9" y1="6" x2="9" y2="6"></line>
      <line x1="15" y1="6" x2="15" y2="6"></line>
      <line x1="9" y1="10" x2="9" y2="10"></line>
      <line x1="15" y1="10" x2="15" y2="10"></line>
      <line x1="9" y1="14" x2="9" y2="14"></line>
      <line x1="15" y1="14" x2="15" y2="14"></line>
    `, options);
  },
  /**
   * List / Menu Lines icon (replaces clipboard placeholder for List View)
   */
  list(options = {}) {
    return this._createSVG(`
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    `, options);
  },
  // ==========================================
  // MEDIUM PRIORITY ICONS
  // ==========================================
  /**
   * Check Circle icon (better success states)
   */
  checkCircle(options = {}) {
    return this._createSVG(`
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    `, options);
  },
  /**
   * X Circle icon (better error states)
   */
  xCircle(options = {}) {
    return this._createSVG(`
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    `, options);
  },
  /**
   * Sync / Refresh Alt icon (dedicated sync icon)
   */
  sync(options = {}) {
    return this._createSVG(`
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    `, options);
  },
  /**
   * Zap / Bolt icon (speed/fast actions)
   */
  zap(options = {}) {
    return this._createSVG(`
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    `, options);
  },
  /**
   * Target / Bullseye icon (goal/objective)
   */
  target(options = {}) {
    return this._createSVG(`
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
    `, options);
  },
  /**
   * File / Document icon
   */
  file(options = {}) {
    return this._createSVG(`
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
      <polyline points="13 2 13 9 20 9"></polyline>
    `, options);
  },
  /**
   * Paperclip / Attachment icon
   */
  paperclip(options = {}) {
    return this._createSVG(`
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
    `, options);
  },
  /**
   * Send / Submit icon
   */
  send(options = {}) {
    return this._createSVG(`
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    `, options);
  },
  /**
   * Folder Open icon (folder open state)
   */
  folderOpen(options = {}) {
    return this._createSVG(`
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      <polyline points="2 11 4 11 22 11 20 19 4 19 2 11"></polyline>
    `, options);
  },
  // ==========================================
  // LOW PRIORITY ICONS
  // ==========================================
  /**
   * Grid icon (grid view)
   */
  grid(options = {}) {
    return this._createSVG(`
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    `, options);
  },
  /**
   * Columns icon (layout switching)
   */
  columns(options = {}) {
    return this._createSVG(`
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="12" y1="3" x2="12" y2="21"></line>
    `, options);
  },
  /**
   * Maximize icon (expand)
   */
  maximize(options = {}) {
    return this._createSVG(`
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
    `, options);
  },
  /**
   * Minimize icon (collapse)
   */
  minimize(options = {}) {
    return this._createSVG(`
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
    `, options);
  },
  /**
   * Lock icon (locked state)
   */
  lock(options = {}) {
    return this._createSVG(`
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    `, options);
  },
  /**
   * Unlock icon (unlocked state)
   */
  unlock(options = {}) {
    return this._createSVG(`
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
    `, options);
  },
  /**
   * Mail / Email icon
   */
  mail(options = {}) {
    return this._createSVG(`
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
    `, options);
  },
  /**
   * Phone icon (contact)
   */
  phone(options = {}) {
    return this._createSVG(`
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    `, options);
  },
  /**
   * Globe / Web icon (external/web)
   */
  globe(options = {}) {
    return this._createSVG(`
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
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
