/**
 * State Management Module
 * Centralized application state with reactive updates
 * SPEEDYFLOW JIRA Platform
 */

import { logger } from '../utils/helpers.js';

/**
 * Application State Store
 */
class StateStore {
  constructor() {
    this.state = {
      // Service Desk & Queue Data
      desksWithQueues: {},
      selectedDesk: null,
      selectedQueue: null,
      
      // Issue Data
      allIssues: [],
      filteredIssues: [],
      selectedIssue: null,
      
      // UI State
      currentView: 'kanban', // 'kanban' or 'list'
      currentTab: 'board', // 'board', 'dashboard', 'analytics'
      sidebarOpen: false,
      
      // Filters
      filters: {
        search: '',
        assignee: '',
        priority: '',
        status: '',
        sortBy: 'created-desc',
      },
      
      // User Data
      currentUser: null,
      teamMembers: [],
      
      // Loading States
      loading: {
        desks: false,
        issues: false,
        issue: false,
        comments: false,
      },
      
      // Error States
      errors: {
        desks: null,
        issues: null,
        issue: null,
      },
    };
    
    // Subscribers for reactive updates
    this.subscribers = new Map();
    this.nextSubscriberId = 0;
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return this.state;
  }

  /**
   * Get a specific state value by path
   * @param {string} path - Dot-notation path (e.g., 'filters.search')
   * @returns {*} State value
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }

  /**
   * Set state value(s) and notify subscribers
   * @param {Object|string} updates - Object with updates or path string
   * @param {*} value - Value if using path string
   */
  setState(updates, value) {
    // Handle path-based updates (e.g., setState('filters.search', 'test'))
    if (typeof updates === 'string') {
      const path = updates.split('.');
      const lastKey = path.pop();
      const target = path.reduce((obj, key) => obj[key], this.state);
      target[lastKey] = value;
      this.notify(updates, value);
      return;
    }

    // Handle object updates
    Object.keys(updates).forEach(key => {
      if (key.includes('.')) {
        // Handle nested path
        const path = key.split('.');
        const lastKey = path.pop();
        const target = path.reduce((obj, k) => obj[k], this.state);
        target[lastKey] = updates[key];
      } else {
        this.state[key] = updates[key];
      }
      this.notify(key, updates[key]);
    });

    logger.debug('State updated', updates);
  }

  /**
   * Subscribe to state changes
   * @param {string|Function} pathOrCallback - State path or callback
   * @param {Function} callback - Callback function (if path provided)
   * @returns {Function} Unsubscribe function
   */
  subscribe(pathOrCallback, callback) {
    const id = this.nextSubscriberId++;
    
    if (typeof pathOrCallback === 'function') {
      // Subscribe to all changes
      this.subscribers.set(id, { path: '*', callback: pathOrCallback });
    } else {
      // Subscribe to specific path
      this.subscribers.set(id, { path: pathOrCallback, callback });
    }

    // Return unsubscribe function
    return () => this.subscribers.delete(id);
  }

  /**
   * Notify subscribers of state changes
   * @param {string} path - Changed state path
   * @param {*} value - New value
   */
  notify(path, value) {
    this.subscribers.forEach(({ path: subPath, callback }) => {
      if (subPath === '*' || path.startsWith(subPath)) {
        callback(value, path);
      }
    });
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.setState({
      allIssues: [],
      filteredIssues: [],
      selectedIssue: null,
      filters: {
        search: '',
        assignee: '',
        priority: '',
        status: '',
        sortBy: 'created-desc',
      },
    });
    logger.info('State reset');
  }
}

// Create singleton instance
const store = new StateStore();

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

/**
 * Get all issues from state
 * @returns {Array} All issues
 */
export function getAllIssues() {
  return store.get('allIssues');
}

/**
 * Get filtered issues from state
 * @returns {Array} Filtered issues
 */
export function getFilteredIssues() {
  return store.get('filteredIssues');
}

/**
 * Set all issues in state
 * @param {Array} issues - Issues array
 */
export function setAllIssues(issues) {
  store.setState({ allIssues: issues, filteredIssues: issues });
}

/**
 * Set filtered issues in state
 * @param {Array} issues - Filtered issues array
 */
export function setFilteredIssues(issues) {
  store.setState({ filteredIssues: issues });
}

/**
 * Get selected issue
 * @returns {Object|null} Selected issue
 */
export function getSelectedIssue() {
  return store.get('selectedIssue');
}

/**
 * Set selected issue
 * @param {Object|null} issue - Issue object
 */
export function setSelectedIssue(issue) {
  store.setState({ selectedIssue: issue });
}

/**
 * Get current view
 * @returns {string} Current view ('kanban' or 'list')
 */
export function getCurrentView() {
  return store.get('currentView');
}

/**
 * Set current view
 * @param {string} view - View name
 */
export function setCurrentView(view) {
  store.setState({ currentView: view });
}

/**
 * Get current tab
 * @returns {string} Current tab
 */
export function getCurrentTab() {
  return store.get('currentTab');
}

/**
 * Set current tab
 * @param {string} tab - Tab name
 */
export function setCurrentTab(tab) {
  store.setState({ currentTab: tab });
}

/**
 * Get filters
 * @returns {Object} Current filters
 */
export function getFilters() {
  return store.get('filters');
}

/**
 * Set filter value
 * @param {string} key - Filter key
 * @param {*} value - Filter value
 */
export function setFilter(key, value) {
  store.setState(`filters.${key}`, value);
}

/**
 * Reset all filters
 */
export function resetFilters() {
  store.setState({
    filters: {
      search: '',
      assignee: '',
      priority: '',
      status: '',
      sortBy: 'created-desc',
    },
  });
}

/**
 * Get service desks with queues
 * @returns {Object} Desks with queues
 */
export function getDesksWithQueues() {
  return store.get('desksWithQueues');
}

/**
 * Set service desks with queues
 * @param {Object} desks - Desks object
 */
export function setDesksWithQueues(desks) {
  store.setState({ desksWithQueues: desks });
}

/**
 * Get selected desk
 * @returns {string|null} Selected desk name
 */
export function getSelectedDesk() {
  return store.get('selectedDesk');
}

/**
 * Set selected desk
 * @param {string} desk - Desk name
 */
export function setSelectedDesk(desk) {
  store.setState({ selectedDesk: desk });
}

/**
 * Get selected queue
 * @returns {string|null} Selected queue ID
 */
export function getSelectedQueue() {
  return store.get('selectedQueue');
}

/**
 * Set selected queue
 * @param {string} queue - Queue ID
 */
export function setSelectedQueue(queue) {
  store.setState({ selectedQueue: queue });
}

/**
 * Get loading state
 * @param {string} key - Loading key
 * @returns {boolean} Loading state
 */
export function getLoading(key) {
  return store.get(`loading.${key}`);
}

/**
 * Set loading state
 * @param {string} key - Loading key
 * @param {boolean} value - Loading value
 */
export function setLoading(key, value) {
  store.setState(`loading.${key}`, value);
}

/**
 * Get error state
 * @param {string} key - Error key
 * @returns {string|null} Error message
 */
export function getError(key) {
  return store.get(`errors.${key}`);
}

/**
 * Set error state
 * @param {string} key - Error key
 * @param {string|null} error - Error message
 */
export function setError(key, error) {
  store.setState(`errors.${key}`, error);
}

/**
 * Clear all errors
 */
export function clearErrors() {
  store.setState({
    errors: {
      desks: null,
      issues: null,
      issue: null,
    },
  });
}

/**
 * Get current user
 * @returns {Object|null} Current user
 */
export function getCurrentUser() {
  return store.get('currentUser');
}

/**
 * Set current user
 * @param {Object} user - User object
 */
export function setCurrentUser(user) {
  store.setState({ currentUser: user });
}

/**
 * Toggle sidebar
 */
export function toggleSidebar() {
  const current = store.get('sidebarOpen');
  store.setState({ sidebarOpen: !current });
}

// Export the store instance for direct access
export { store };
