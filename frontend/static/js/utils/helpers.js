/**
 * Utility Functions - Core JavaScript Utilities
 * Pure utility functions without side effects
 * SPEEDYFLOW JIRA Platform
 */

// ============================================================
// LOGGING UTILITY - Centralized console logging
// ============================================================
export const logger = {
  info: (msg, ...args) => console.log(`ℹ️ ${msg}`, ...args),
  success: (msg, ...args) => console.log(`✅ ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`⚠️ ${msg}`, ...args),
  error: (msg, ...args) => console.error(`❌ ${msg}`, ...args),
  debug: (msg, ...args) => console.log(`🐛 ${msg}`, ...args),
  init: (msg, ...args) => console.log(`🚀 ${msg}`, ...args),
  network: (msg, ...args) => console.log(`📡 ${msg}`, ...args),
  theme: (msg, ...args) => console.log(`🎨 ${msg}`, ...args),
  notification: (msg, ...args) => console.log(`📌 ${msg}`, ...args),
};

// ============================================================
// HTML ESCAPING AND STRING UTILITIES
// ============================================================

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHTML(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Truncate text to a maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Capitalize first letter of a string
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert string to kebab-case
 * @param {string} text - Text to convert
 * @returns {string} Kebab-cased text
 */
export function toKebabCase(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Convert string to camelCase
 * @param {string} text - Text to convert
 * @returns {string} CamelCased text
 */
export function toCamelCase(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

// ============================================================
// DATE FORMATTING UTILITIES
// ============================================================

/**
 * Format date to readable string
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return 'Invalid Date';
  }
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 * @param {string|Date} dateString - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
  } catch (e) {
    return 'Invalid Date';
  }
}

/**
 * Format date and time
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date and time
 */
export function formatDateTime(dateString) {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return 'Invalid Date';
  }
}

// ============================================================
// ARRAY AND OBJECT UTILITIES
// ============================================================

/**
 * Group array of objects by a key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object} Grouped object
 */
export function groupBy(array, key) {
  if (!array || !Array.isArray(array)) return {};
  return array.reduce((result, item) => {
    const groupKey = item[key] || 'Unknown';
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
}

/**
 * Sort array of objects by a key
 * @param {Array} array - Array to sort
 * @param {string} key - Key to sort by
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted array
 */
export function sortBy(array, key, order = 'asc') {
  if (!array || !Array.isArray(array)) return [];
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal === bVal) return 0;
    const comparison = aVal < bVal ? -1 : 1;
    return order === 'asc' ? comparison : -comparison;
  });
}

/**
 * Get unique values from array
 * @param {Array} array - Array to filter
 * @returns {Array} Array with unique values
 */
export function unique(array) {
  if (!array || !Array.isArray(array)) return [];
  return [...new Set(array)];
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

// ============================================================
// DOM MANIPULATION UTILITIES
// ============================================================

/**
 * Simple jQuery-like selector helper
 * @param {string} selector - CSS selector
 * @returns {Object} Element wrapper with helper methods
 */
export function $(selector) {
  const el = document.querySelector(selector);
  if (!el) {
    return {
      on: () => {},
      html: () => '',
      text: () => '',
      val: () => '',
      append: () => {},
      addClass: () => {},
      removeClass: () => {},
      toggleClass: () => {},
      toggle: () => {},
      show: () => {},
      hide: () => {},
      empty: () => {},
      remove: () => {},
      find: () => null,
      parent: () => null,
      data: () => null,
    };
  }

  return {
    on: (event, handler) => el.addEventListener(event, handler),
    html: content => (content !== undefined ? (el.innerHTML = content) : el.innerHTML),
    text: content => (content !== undefined ? (el.textContent = content) : el.textContent),
    val: () => el.value,
    append: html => el.insertAdjacentHTML('beforeend', html),
    addClass: className => el.classList.add(className),
    removeClass: className => el.classList.remove(className),
    toggleClass: className => el.classList.toggle(className),
    toggle: force => (el.style.display = force !== undefined ? (force ? 'block' : 'none') : el.style.display === 'none' ? 'block' : 'none'),
    show: () => (el.style.display = 'block'),
    hide: () => (el.style.display = 'none'),
    empty: () => (el.innerHTML = ''),
    remove: () => el.remove(),
    find: sel => el.querySelector(sel),
    parent: () => $(el.parentElement),
    data: key => el.dataset[key],
    get element() { return el; }
  };
}

/**
 * Select all elements matching selector
 * @param {string} selector - CSS selector
 * @returns {NodeList} List of elements
 */
export function $$(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================================
// VALIDATION UTILITIES
// ============================================================

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// LOCAL STORAGE UTILITIES
// ============================================================

/**
 * Save to local storage with JSON serialization
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
export function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    logger.error('Failed to save to localStorage', e);
  }
}

/**
 * Get from local storage with JSON parsing
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Retrieved value
 */
export function getStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    logger.error('Failed to read from localStorage', e);
    return defaultValue;
  }
}

/**
 * Remove from local storage
 * @param {string} key - Storage key
 */
export function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    logger.error('Failed to remove from localStorage', e);
  }
}

// ============================================================
// NUMBER FORMATTING UTILITIES
// ============================================================

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (typeof num !== 'number') return '0';
  return num.toLocaleString('en-US');
}

/**
 * Format bytes to human readable size
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted size
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
