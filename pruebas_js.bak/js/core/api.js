/**
 * API Module - HTTP Communication Layer
 * Handles all API requests to the backend
 * SPEEDYFLOW JIRA Platform
 */

import { logger } from '../utils/helpers.js';

const API_BASE = '/api';

/**
 * API Client Class
 */
class APIClient {
  constructor(baseURL = API_BASE) {
    this.baseURL = baseURL;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Generic fetch wrapper with error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    };

    try {
      logger.network(`Fetching: ${url}`);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.success(`Received: ${url}`);
      return data;
    } catch (error) {
      logger.error(`API Error (${url}):`, error);
      throw error;
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} Response data
   */
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} Response data
   */
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} Response data
   */
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} Response data
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} Response data
   */
  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

// Create singleton instance
const api = new APIClient();

// ============================================================
// SERVICE DESK & QUEUE ENDPOINTS
// ============================================================

/**
 * Get all service desks with their queues
 * @returns {Promise<Object>} Service desks data
 */
export async function getServiceDesks() {
  return api.get('/desks');
}

/**
 * Get queues for a specific service desk
 * @param {string} deskId - Service desk ID
 * @returns {Promise<Object>} Queues data
 */
export async function getQueues(deskId) {
  return api.get(`/desks/${deskId}/queues`);
}

// ============================================================
// ISSUE ENDPOINTS
// ============================================================

/**
 * Get issues from a queue
 * @param {string} deskId - Service desk ID
 * @param {string} queueId - Queue ID
 * @returns {Promise<Object>} Issues data
 */
export async function getIssues(deskId, queueId) {
  return api.get(`/issues?desk_id=${deskId}&queue_id=${queueId}`);
}

/**
 * Get a single issue by key
 * @param {string} issueKey - Issue key (e.g., "PROJ-123")
 * @returns {Promise<Object>} Issue data
 */
export async function getIssue(issueKey) {
  return api.get(`/issues/${issueKey}`);
}

/**
 * Update an issue
 * @param {string} issueKey - Issue key
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated issue data
 */
export async function updateIssue(issueKey, updates) {
  return api.put(`/issues/${issueKey}`, updates);
}

/**
 * Create a new issue
 * @param {Object} issueData - Issue data
 * @returns {Promise<Object>} Created issue data
 */
export async function createIssue(issueData) {
  return api.post('/issues', issueData);
}

/**
 * Delete an issue
 * @param {string} issueKey - Issue key
 * @returns {Promise<Object>} Delete response
 */
export async function deleteIssue(issueKey) {
  return api.delete(`/issues/${issueKey}`);
}

// ============================================================
// COMMENT ENDPOINTS
// ============================================================

/**
 * Get comments for an issue
 * @param {string} issueKey - Issue key
 * @returns {Promise<Object>} Comments data
 */
export async function getComments(issueKey) {
  return api.get(`/issues/${issueKey}/comments`);
}

/**
 * Add a comment to an issue
 * @param {string} issueKey - Issue key
 * @param {string} commentBody - Comment text
 * @returns {Promise<Object>} Created comment data
 */
export async function addComment(issueKey, payload) {
  return api.post(`/issues/${issueKey}/comments`, payload);
}

/**
 * Update a comment
 * @param {string} issueKey - Issue key
 * @param {string} commentId - Comment ID
 * @param {string} commentBody - Updated comment text
 * @returns {Promise<Object>} Updated comment data
 */
export async function updateComment(issueKey, commentId, commentBody) {
  return api.put(`/issues/${issueKey}/comments/${commentId}`, { body: commentBody });
}

/**
 * Delete a comment
 * @param {string} issueKey - Issue key
 * @param {string} commentId - Comment ID
 * @returns {Promise<Object>} Delete response
 */
export async function deleteComment(issueKey, commentId) {
  return api.delete(`/issues/${issueKey}/comments/${commentId}`);
}

// ============================================================
// DASHBOARD & ANALYTICS ENDPOINTS
// ============================================================

/**
 * Get dashboard summary statistics
 * @returns {Promise<Object>} Dashboard data
 */
export async function getDashboardSummary() {
  return api.get('/dashboard/summary');
}

/**
 * Get analytics data
 * @param {Object} filters - Analytics filters
 * @returns {Promise<Object>} Analytics data
 */
export async function getAnalytics(filters = {}) {
  const queryString = new URLSearchParams(filters).toString();
  return api.get(`/analytics?${queryString}`);
}

// ============================================================
// USER & TEAM ENDPOINTS
// ============================================================

/**
 * Get current user information
 * @returns {Promise<Object>} User data
 */
export async function getCurrentUser() {
  return api.get('/user');
}

/**
 * Get team members
 * @returns {Promise<Object>} Team members data
 */
export async function getTeamMembers() {
  return api.get('/issues/users');
}

export async function getMentionableUsers() {
  return api.get('/issues/users');
}
export async function getUser(userId) {
  return api.get(`/users/${userId}`);
}

// ============================================================
// PROJECT ENDPOINTS
// ============================================================

/**
 * Get all projects
 * @returns {Promise<Object>} Projects data
 */
export async function getProjects() {
  return api.get('/projects');
}

/**
 * Get a single project
 * @param {string} projectKey - Project key
 * @returns {Promise<Object>} Project data
 */
export async function getProject(projectKey) {
  return api.get(`/projects/${projectKey}`);
}

// ============================================================
// SEARCH ENDPOINTS
// ============================================================

/**
 * Search issues with JQL
 * @param {string} jql - JQL query string
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export async function searchIssues(jql, options = {}) {
  const { maxResults = 50, startAt = 0 } = options;
  return api.post('/search', { jql, maxResults, startAt });
}

// ============================================================
// ATTACHMENT ENDPOINTS
// ============================================================

/**
 * Get attachments for an issue
 * @param {string} issueKey - Issue key
 * @returns {Promise<Object>} Attachments data
 */
export async function getAttachments(issueKey) {
  return api.get(`/issues/${issueKey}/attachments`);
}

/**
 * Upload attachment to an issue
 * @param {string} issueKey - Issue key
 * @param {File} file - File to upload
 * @returns {Promise<Object>} Upload response
 */
export async function uploadAttachment(issueKey, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/issues/${issueKey}/attachments`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Attachment upload failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============================================================
// NOTIFICATION ENDPOINTS
// ============================================================

/**
 * Get notifications
 * @returns {Promise<Object>} Notifications data
 */
export async function getNotifications() {
  return api.get('/notifications');
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Update response
 */
export async function markNotificationRead(notificationId) {
  return api.patch(`/notifications/${notificationId}/read`, {});
}

// ============================================================
// AI/ML ENDPOINTS
// ============================================================

/**
 * Get AI preview for an issue
 * @param {string} issueKey - Issue key
 * @returns {Promise<Object>} AI preview data
 */
export async function getAIPreview(issueKey) {
  return api.get(`/ai/preview/${issueKey}`);
}

/**
 * Get AI suggestions
 * @param {string} issueKey - Issue key
 * @returns {Promise<Object>} AI suggestions
 */
export async function getAISuggestions(issueKey) {
  return api.get(`/ai/suggestions/${issueKey}`);
}

// ============================================================
// ISSUE ACTIONS ENDPOINTS
// ============================================================

/**
 * Get available transitions for an issue
 * @param {string} issueKey - Issue key
 * @returns {Promise<Object>} Available transitions
 */
export async function getIssueTransitions(issueKey) {
  return api.get(`/issues/${issueKey}/transitions`);
}

/**
 * Perform a transition on an issue
 * @param {string} issueKey - Issue key
 * @param {string} transitionId - Transition ID
 * @returns {Promise<Object>} Update response
 */
export async function performTransition(issueKey, transitionId) {
  return api.post(`/issues/${issueKey}/transitions`, { transitionId });
}

/**
 * Reassign an issue to a user
 * @param {string} issueKey - Issue key
 * @param {string} assigneeId - User ID to assign to
 * @returns {Promise<Object>} Update response
 */
export async function reassignIssue(issueKey, assigneeId) {
  return updateIssue(issueKey, { assignee: assigneeId });
}

/**
 * Get automation rules for a project
 * Uses JIRA Cloud REST API v3 /automations endpoint
 * @param {string} projectKey - Project key (optional - gets all automations if not provided)
 * @returns {Promise<Object>} Automation rules
 */
export async function getAutomationRules(projectKey) {
  // JIRA Cloud Automations API: GET /automations
  // Returns list of all automations accessible to the user
  return api.get('/automations');
}

/**
 * Apply automation rule to an issue
 * @param {string} issueKey - Issue key
 * @param {string} ruleId - Automation rule ID from JIRA Cloud
 * @returns {Promise<Object>} Update response
 */
export async function applyAutomationRule(issueKey, ruleId) {
  // POST to backend which will trigger JIRA Cloud automation
  // Backend endpoint: POST /api/automation/{ruleId}
  return api.post(`/automation/${ruleId}`, { issue_key: issueKey });
}

// Export the API client instance for advanced usage
export { api };
