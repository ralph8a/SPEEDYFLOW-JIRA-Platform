/**
 * SPEEDYFLOW - HTTP Utilities for JavaScript
 * Centralized API request handling with error management
 */

/**
 * Base API configuration
 */
const API_CONFIG = {
  baseURL: '/api',
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000 // 1 second
};

/**
 * Make an HTTP request with error handling and retry logic
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} endpoint - API endpoint (e.g., '/issues')
 * @param {Object} options - Request options
 * @param {Object} options.body - Request body for POST/PUT
 * @param {Object} options.headers - Additional headers
 * @param {number} options.timeout - Request timeout in ms
 * @param {number} options.retries - Number of retry attempts
 * @returns {Promise<Object>} Response data
 */
export async function apiRequest(method, endpoint, options = {}) {
  const {
    body = null,
    headers = {},
    timeout = API_CONFIG.timeout,
    retries = API_CONFIG.retries
  } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.baseURL}${endpoint}`;
  
  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(body);
  }

  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }
      
      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return null;
      }
      
      return await response.json();
      
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error instanceof APIError && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      // Retry on network errors or 5xx errors
      if (attempt < retries - 1) {
        const delay = API_CONFIG.retryDelay * Math.pow(2, attempt); // Exponential backoff
        console.warn(`Request failed (attempt ${attempt + 1}/${retries}), retrying in ${delay}ms...`, error);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: (endpoint, options) => apiRequest('GET', endpoint, options),
  post: (endpoint, body, options) => apiRequest('POST', endpoint, { ...options, body }),
  put: (endpoint, body, options) => apiRequest('PUT', endpoint, { ...options, body }),
  patch: (endpoint, body, options) => apiRequest('PATCH', endpoint, { ...options, body }),
  delete: (endpoint, options) => apiRequest('DELETE', endpoint, options)
};

/**
 * Sleep utility for delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Show error notification to user
 * @param {string|Error} error - Error message or Error object
 * @param {string} title - Optional title for the error
 */
export function showError(error, title = 'Error') {
  const message = error instanceof Error ? error.message : error;
  
  // Try to use existing notification system
  if (window.showNotification) {
    window.showNotification(message, 'error');
  } else if (window.toast) {
    window.toast.error(message);
  } else {
    // Fallback to console and alert
    console.error(`${title}:`, error);
    alert(`${title}: ${message}`);
  }
}

/**
 * Show success notification to user
 * @param {string} message - Success message
 * @param {string} title - Optional title
 */
export function showSuccess(message, title = 'Success') {
  if (window.showNotification) {
    window.showNotification(message, 'success');
  } else if (window.toast) {
    window.toast.success(message);
  } else {
    console.log(`${title}:`, message);
  }
}

/**
 * Debounce function for search inputs
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
 * Throttle function for event handlers
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
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * NOTE: Date formatting, JSON parsing, and other utility functions
 * are now available in utils/helpers.js to avoid duplication.
 * Import from helpers.js: formatDate, safeJSONParse, deepClone, etc.
 */
