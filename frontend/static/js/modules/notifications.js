/**
 * Notifications Module
 * Sidebar notification management and display
 */

const NotificationsModule = (() => {
  let notifications = [];
  let isExpanded = false;
  
  // Notification types
  const TYPES = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    SUCCESS: 'success'
  };
  
  // Icon mapping for each type
  const ICONS = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅'
  };

  /**
   * Initialize the notifications module
   */
  const init = () => {
    setupEventListeners();
    loadStoredNotifications();
    fetchNotificationsFromAPI();
  };

  /**
   * Fetch notifications from the backend API
   */
  const fetchNotificationsFromAPI = async () => {
    try {
      const response = await fetch('/api/notifications?limit=50');
      if (!response.ok) {
        console.warn('Failed to fetch notifications:', response.status);
        return;
      }
      
      const data = await response.json();
      if (data.success && data.data && Array.isArray(data.data)) {
        // Clear existing notifications and add API notifications
        notifications = [];
        
        // Convert API notifications to UI format
        data.data.forEach(apiNotif => {
          const notification = {
            id: apiNotif.id || Date.now(),
            title: apiNotif.title || apiNotif.type,
            message: apiNotif.message || apiNotif.description || '',
            type: mapNotificationType(apiNotif.category),
            unread: !apiNotif.read,
            timestamp: new Date(apiNotif.created_at || Date.now()),
            read: apiNotif.read || false
          };
          notifications.unshift(notification);
        });
        
        updateUI();
      }
    } catch (error) {
      console.warn('Error fetching notifications:', error);
    }
  };

  /**
   * Map API notification category to UI type
   */
  const mapNotificationType = (category) => {
    const categoryMap = {
      'critical': TYPES.ERROR,
      'high': TYPES.WARNING,
      'medium': TYPES.INFO,
      'info': TYPES.INFO,
      'success': TYPES.SUCCESS,
      'error': TYPES.ERROR,
      'warning': TYPES.WARNING
    };
    return categoryMap[category] || TYPES.INFO;
  };

  /**
   * Setup event listeners
   */
  const setupEventListeners = () => {
    const toggle = document.getElementById('notificationsToggle');
    if (toggle) {
      toggle.addEventListener('click', toggleExpanded);
    }
  };

  /**
   * Add a new notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type (info, warning, error, success)
   * @param {object} actions - Optional action buttons
   */
  const addNotification = (title, message, type = TYPES.INFO, actions = null) => {
    const notification = {
      id: Date.now(),
      title,
      message,
      type,
      actions,
      unread: true,
      timestamp: new Date(),
      read: false
    };

    notifications.unshift(notification); // Add to front
    updateUI();
    saveNotifications();
  };

  /**
   * Mark notification as read
   * @param {number} id - Notification ID
   */
  const markAsRead = (id) => {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      notification.unread = false;
      updateUI();
      saveNotifications();
    }
  };

  /**
   * Remove notification
   * @param {number} id - Notification ID
   */
  const removeNotification = (id) => {
    notifications = notifications.filter(n => n.id !== id);
    updateUI();
    saveNotifications();
  };

  /**
   * Clear all notifications
   */
  const clearAll = () => {
    notifications = [];
    updateUI();
    saveNotifications();
  };

  /**
   * Toggle expand/collapse
   */
  const toggleExpanded = () => {
    isExpanded = !isExpanded;
    const toggle = document.getElementById('notificationsToggle');
    const list = document.getElementById('notificationsList');
    
    if (toggle) {
      toggle.classList.toggle('expanded', isExpanded);
    }
    if (list) {
      list.classList.toggle('expanded', isExpanded);
    }
  };

  /**
   * Update UI
   */
  const updateUI = () => {
    const badge = document.getElementById('notificationBadge');
    const empty = document.getElementById('notificationsEmpty');
    const list = document.getElementById('notificationsList');
    const clearBtn = document.getElementById('notificationsClear');
    
    // Update badge count
    const unreadCount = notifications.filter(n => n.unread).length;
    if (badge) {
      badge.textContent = unreadCount;
      badge.classList.toggle('empty', unreadCount === 0);
    }

    // Show/hide empty state
    if (empty) {
      empty.classList.toggle('show', notifications.length === 0);
    }

    // Show/hide clear button
    if (clearBtn) {
      clearBtn.style.display = notifications.length > 0 ? 'block' : 'none';
    }

    // Render notifications
    if (list) {
      list.innerHTML = '';
      if (notifications.length === 0) {
        // Empty state handled by notifications-empty div
      } else {
        notifications.forEach(notification => {
          const item = createNotificationItem(notification);
          list.appendChild(item);
        });
      }
    }
  };

  /**
   * Create notification item element
   * @param {object} notification - Notification object
   * @returns {HTMLElement}
   */
  const createNotificationItem = (notification) => {
    const item = document.createElement('div');
    item.className = `notification-item ${notification.type}`;
    if (notification.unread) {
      item.classList.add('unread');
    }
    
    const timeStr = getTimeString(notification.timestamp);
    
    item.innerHTML = `
      <div class="notification-icon">${ICONS[notification.type] || 'ℹ️'}</div>
      <div class="notification-content">
        <div class="notification-title">
          ${notification.unread ? '<span class="notification-unread-dot"></span>' : ''}
          ${escapeHtml(notification.title)}
        </div>
        <div class="notification-message">${escapeHtml(notification.message)}</div>
        <div class="notification-time">${timeStr}</div>
        ${notification.actions ? `<div class="notification-actions">${notification.actions}</div>` : ''}
      </div>
    `;
    
    item.addEventListener('click', () => markAsRead(notification.id));
    
    return item;
  };

  /**
   * Get time string from timestamp
   * @param {Date} date - Date object
   * @returns {string}
   */
  const getTimeString = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  /**
   * Save notifications to localStorage
   */
  const saveNotifications = () => {
    try {
      localStorage.setItem('salesjira_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.warn('Failed to save notifications:', e);
    }
  };

  /**
   * Load notifications from localStorage
   */
  const loadStoredNotifications = () => {
    try {
      const stored = localStorage.getItem('salesjira_notifications');
      if (stored) {
        notifications = JSON.parse(stored);
        notifications.forEach(n => {
          n.timestamp = new Date(n.timestamp);
        });
        updateUI();
      }
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    }
  };

  /**
   * Get all notifications
   * @returns {array}
   */
  const getAll = () => {
    return [...notifications];
  };

  /**
   * Get unread count
   * @returns {number}
   */
  const getUnreadCount = () => {
    return notifications.filter(n => n.unread).length;
  };

  /**
   * Escape HTML special characters
   */
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Public API
  return {
    init,
    add: addNotification,
    remove: removeNotification,
    markAsRead,
    clearAll,
    toggle: toggleExpanded,
    getAll,
    getUnreadCount,
    TYPES,
    ICONS
  };
})();

// Export for use in app
window.NotificationsModule = NotificationsModule;

// Auto-initialize when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => NotificationsModule.init(), 100);
  });
} else {
  // DOM already loaded
  setTimeout(() => NotificationsModule.init(), 100);
}
