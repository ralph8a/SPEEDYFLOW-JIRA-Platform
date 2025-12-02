/**
 * SPEEDYFLOW - DOM Utilities
 * Centralized DOM manipulation and event handling utilities
 */

/**
 * Safely query selector with error handling
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (default: document)
 * @returns {HTMLElement|null} Element or null
 */
export function $(selector, parent = document) {
  try {
    return parent.querySelector(selector);
  } catch (error) {
    console.error(`Invalid selector: ${selector}`, error);
    return null;
  }
}

/**
 * Query all elements matching selector
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (default: document)
 * @returns {Array<HTMLElement>} Array of elements
 */
export function $$(selector, parent = document) {
  try {
    return Array.from(parent.querySelectorAll(selector));
  } catch (error) {
    console.error(`Invalid selector: ${selector}`, error);
    return [];
  }
}

/**
 * Create element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes object
 * @param {Array|string|HTMLElement} children - Child elements or text
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Event listener
      element.addEventListener(key.substring(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Add children
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach(child => {
    if (child instanceof HTMLElement) {
      element.appendChild(child);
    } else if (child !== null && child !== undefined) {
      element.appendChild(document.createTextNode(String(child)));
    }
  });
  
  return element;
}

/**
 * Remove all child nodes from element
 * @param {HTMLElement} element - Element to clear
 */
export function clearElement(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Toggle class on element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to toggle
 * @param {boolean} force - Force add (true) or remove (false)
 */
export function toggleClass(element, className, force = undefined) {
  if (!element) return;
  element.classList.toggle(className, force);
}

/**
 * Add event listener with automatic cleanup
 * @param {HTMLElement|Window|Document} element - Element to listen on
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} options - Event listener options
 * @returns {Function} Cleanup function
 */
export function on(element, event, handler, options = {}) {
  if (!element) return () => {};
  
  element.addEventListener(event, handler, options);
  
  return () => element.removeEventListener(event, handler, options);
}

/**
 * Add event listener that fires once
 * @param {HTMLElement} element - Element to listen on
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 */
export function once(element, event, handler) {
  if (!element) return;
  element.addEventListener(event, handler, { once: true });
}

/**
 * Delegate event handling to parent
 * @param {HTMLElement} parent - Parent element
 * @param {string} event - Event name
 * @param {string} selector - Child selector
 * @param {Function} handler - Event handler
 * @returns {Function} Cleanup function
 */
export function delegate(parent, event, selector, handler) {
  if (!parent) return () => {};
  
  const wrappedHandler = (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler.call(target, e);
    }
  };
  
  parent.addEventListener(event, wrappedHandler);
  
  return () => parent.removeEventListener(event, wrappedHandler);
}

/**
 * Show element (remove hidden class or set display)
 * @param {HTMLElement} element - Element to show
 * @param {string} display - Display value (default: block)
 */
export function show(element, display = 'block') {
  if (!element) return;
  element.classList.remove('hidden');
  if (element.style.display === 'none') {
    element.style.display = display;
  }
}

/**
 * Hide element (add hidden class and set display: none)
 * @param {HTMLElement} element - Element to hide
 */
export function hide(element) {
  if (!element) return;
  element.classList.add('hidden');
  element.style.display = 'none';
}

/**
 * Toggle element visibility
 * @param {HTMLElement} element - Element to toggle
 * @param {boolean} force - Force show (true) or hide (false)
 */
export function toggle(element, force = undefined) {
  if (!element) return;
  
  if (force === true) {
    show(element);
  } else if (force === false) {
    hide(element);
  } else {
    if (element.classList.contains('hidden') || element.style.display === 'none') {
      show(element);
    } else {
      hide(element);
    }
  }
}

/**
 * Get/set element data attributes
 * @param {HTMLElement} element - Target element
 * @param {string} key - Data key
 * @param {*} value - Data value (optional, for setting)
 * @returns {*} Data value (when getting)
 */
export function data(element, key, value = undefined) {
  if (!element) return null;
  
  if (value !== undefined) {
    element.dataset[key] = value;
  } else {
    return element.dataset[key];
  }
}

/**
 * Find closest parent matching selector
 * @param {HTMLElement} element - Starting element
 * @param {string} selector - CSS selector
 * @returns {HTMLElement|null} Matching parent or null
 */
export function closest(element, selector) {
  if (!element) return null;
  return element.closest(selector);
}

/**
 * Get element dimensions and position
 * @param {HTMLElement} element - Target element
 * @returns {Object} Dimensions object
 */
export function getRect(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    x: rect.x,
    y: rect.y
  };
}

/**
 * Set multiple styles on element
 * @param {HTMLElement} element - Target element
 * @param {Object} styles - Styles object
 */
export function setStyles(element, styles) {
  if (!element) return;
  Object.entries(styles).forEach(([key, value]) => {
    element.style[key] = value;
  });
}

/**
 * Animate element with CSS transitions
 * @param {HTMLElement} element - Target element
 * @param {Object} styles - Target styles
 * @param {number} duration - Animation duration in ms
 * @returns {Promise} Promise that resolves when animation completes
 */
export function animate(element, styles, duration = 300) {
  if (!element) return Promise.resolve();
  
  return new Promise(resolve => {
    setStyles(element, {
      transition: `all ${duration}ms ease`,
      ...styles
    });
    
    setTimeout(() => {
      element.style.transition = '';
      resolve();
    }, duration);
  });
}

/**
 * Wait for DOM to be ready
 * @param {Function} callback - Callback function
 */
export function ready(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

/**
 * Insert HTML safely (prevents XSS)
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML string
 * @param {string} position - Insert position (beforebegin, afterbegin, beforeend, afterend)
 */
export function insertHTML(element, html, position = 'beforeend') {
  if (!element) return;
  
  // Create temporary container
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Insert sanitized elements
  const nodes = Array.from(temp.childNodes);
  nodes.forEach(node => {
    if (position === 'beforebegin') {
      element.parentNode.insertBefore(node, element);
    } else if (position === 'afterbegin') {
      element.insertBefore(node, element.firstChild);
    } else if (position === 'beforeend') {
      element.appendChild(node);
    } else if (position === 'afterend') {
      element.parentNode.insertBefore(node, element.nextSibling);
    }
  });
}

/**
 * Check if element matches selector
 * @param {HTMLElement} element - Element to check
 * @param {string} selector - CSS selector
 * @returns {boolean} True if matches
 */
export function matches(element, selector) {
  if (!element) return false;
  return element.matches(selector);
}

/**
 * Get computed style property
 * @param {HTMLElement} element - Target element
 * @param {string} property - CSS property name
 * @returns {string} Computed value
 */
export function getStyle(element, property) {
  if (!element) return '';
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Focus element with optional scroll
 * @param {HTMLElement} element - Element to focus
 * @param {Object} options - Focus options
 */
export function focusElement(element, options = { preventScroll: false }) {
  if (!element) return;
  element.focus(options);
}

/**
 * Blur (unfocus) element
 * @param {HTMLElement} element - Element to blur
 */
export function blurElement(element) {
  if (!element) return;
  element.blur();
}
