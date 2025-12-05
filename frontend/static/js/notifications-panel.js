/**
 * Notifications Panel
 * Real-time notification system with detailed messages
 */

class NotificationsPanel {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.pollInterval = null;
    this.isOpen = false;
  }

  async init() {
    console.log('🔔 Initializing notifications panel...');
    
    // Load initial notifications
    await this.loadNotifications();
    
    // Setup notification button
    const notifBtn = document.getElementById('notificationsBtn');
    if (notifBtn) {
      notifBtn.addEventListener('click', () => this.togglePanel());
    }
    
    // Connect to SSE for real-time notifications
    this.connectSSE();
    
    console.log('✅ Notifications panel initialized');
  }
  
  connectSSE() {
    console.log('📡 Connecting to real-time notifications stream...');
    
    this.eventSource = new EventSource('/api/notifications/stream');
    
    this.eventSource.onopen = () => {
      console.log('✅ Connected to real-time notifications');
    };
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('📡 SSE connection established');
          return;
        }
        
        // New notification received
        console.log('📬 Real-time notification received:', data);
        
        // Add to notifications array if not already present
        const exists = this.notifications.find(n => n.id === data.id);
        if (!exists) {
          this.notifications.unshift(data);
          this.unreadCount++;
          this.updateBadge();
          
          // Show toast for new notification
          this.showNotificationToast(data);
        }
        
        // Update panel if open
        if (this.isOpen) {
          this.renderNotifications();
        }
        
      } catch (e) {
        console.error('Error parsing SSE notification:', e);
      }
    };
    
    this.eventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
      
      // Reconnect after 5 seconds
      setTimeout(() => {
        if (this.eventSource.readyState === EventSource.CLOSED) {
          console.log('🔄 Reconnecting to SSE...');
          this.connectSSE();
        }
      }, 5000);
    };
  }
  
  showNotificationToast(notification) {
    // Parse metadata if available
    let metadata = {};
    if (notification.metadata) {
      try {
        metadata = JSON.parse(notification.metadata);
      } catch(e) {
        metadata = { author: notification.metadata };
      }
    }
    
    const authorName = metadata.author || notification.user || 'Someone';
    const actionText = this.getActionText(notification.action) || 'notified you';
    
    let message = `${authorName} ${actionText}`;
    if (notification.issue_key) {
      message += ` in ${notification.issue_key}`;
    }
    
    // Show toast notification
    if (window.showNotification) {
      window.showNotification(message, 'info');
    }
  }

  async loadNotifications() {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      
      this.notifications = data.notifications || [];
      this.unreadCount = this.notifications.filter(n => !n.read).length;
      
      this.updateBadge();
      
      // If panel is open, update content
      if (this.isOpen) {
        this.renderNotifications();
      }
      
      console.log(`📬 Loaded ${this.notifications.length} notifications (${this.unreadCount} unread)`);
    } catch (error) {
      console.error('❌ Failed to load notifications:', error);
    }
  }

  updateBadge() {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
      badge.textContent = this.unreadCount;
      badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
    }
  }

  togglePanel() {
    if (this.isOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  openPanel() {
    // Check if modal already exists
    if (document.getElementById('notificationsModal')) {
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'notificationsModal';
    modal.className = 'bg-modal';
    modal.innerHTML = `
      <div class="bg-modal-overlay"></div>
      <div class="bg-modal-container">
        <div class="bg-modal-header">
          <h2 class="bg-modal-title">🔔 Notifications</h2>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="notif-mark-all-read-btn" onclick="window.notificationsPanel.markAllAsRead();">
              Mark all as read
            </button>
            <button class="bg-modal-close" onclick="window.notificationsPanel.closePanel();">✕</button>
          </div>
        </div>
        
        <div class="bg-modal-body">
          <div id="notificationsContent"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Close on overlay click
    modal.querySelector('.bg-modal-overlay').addEventListener('click', () => {
      this.closePanel();
    });
    
    this.isOpen = true;
    this.renderNotifications();
    console.log('✅ Notifications panel opened');
  }

  closePanel() {
    const modal = document.getElementById('notificationsModal');
    if (modal) {
      modal.remove();
    }
    this.isOpen = false;
  }

  renderNotifications() {
    const container = document.getElementById('notificationsContent');
    if (!container) return;

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
          <div style="font-size: 64px; margin-bottom: 16px;">🔕</div>
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #cbd5e1;">No notifications</div>
          <div style="font-size: 13px;">You're all caught up!</div>
        </div>
      `;
      return;
    }

    // Group notifications by date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const grouped = {
      today: [],
      yesterday: [],
      older: []
    };

    this.notifications.forEach(notif => {
      const notifDate = new Date(notif.created_at);
      if (this.isSameDay(notifDate, today)) {
        grouped.today.push(notif);
      } else if (this.isSameDay(notifDate, yesterday)) {
        grouped.yesterday.push(notif);
      } else {
        grouped.older.push(notif);
      }
    });

    let html = '<div class="notifications-list">';

    if (grouped.today.length > 0) {
      html += '<div class="notifications-group-header">Today</div>';
      html += grouped.today.map(n => this.renderNotificationCard(n)).join('');
    }

    if (grouped.yesterday.length > 0) {
      html += '<div class="notifications-group-header">Yesterday</div>';
      html += grouped.yesterday.map(n => this.renderNotificationCard(n)).join('');
    }

    if (grouped.older.length > 0) {
      html += '<div class="notifications-group-header">Older</div>';
      html += grouped.older.map(n => this.renderNotificationCard(n)).join('');
    }

    html += '</div>';

    container.innerHTML = html;
  }

  renderNotificationCard(notif) {
    const icon = this.getNotificationIcon(notif.type);
    const time = this.formatTime(notif.created_at);
    const readClass = notif.read ? 'read' : 'unread';
    
    // Parse metadata if it's JSON
    let metadata = {};
    if (notif.metadata) {
      try {
        metadata = JSON.parse(notif.metadata);
      } catch(e) {
        // If not JSON, use as string
        metadata = { author: notif.metadata };
      }
    }
    
    // Build detailed message with user and action
    let mainMessage = '';
    let detailMessage = '';
    
    if (notif.action && notif.user) {
      const actionText = this.getActionText(notif.action);
      const authorName = metadata.author || notif.user;
      
      mainMessage = `<strong>${authorName}</strong> ${actionText}`;
      
      if (notif.issue_key) {
        mainMessage += ` <span class="notif-issue-key">${notif.issue_key}</span>`;
      }
      
      // Add issue summary if available
      if (metadata.issue_summary) {
        mainMessage += `<div class="notif-issue-summary">${metadata.issue_summary}</div>`;
      }
      
      // Add comment preview if available
      if (metadata.comment_preview || metadata.full_body) {
        const preview = metadata.full_body || metadata.comment_preview;
        detailMessage = `<div class="notif-comment-preview">"${this.escapeHtml(preview)}"</div>`;
      }
    } else {
      // Fallback to original message
      mainMessage = notif.message;
    }

    return `
      <div class="notification-card ${readClass}" data-id="${notif.id}" onclick="window.notificationsPanel.handleNotificationClick(${notif.id}, '${notif.issue_key || ''}')">
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">
          <div class="notification-message">${mainMessage}</div>
          ${detailMessage ? detailMessage : ''}
          <div class="notification-time">${time}</div>
        </div>
        <div class="notification-actions">
          ${!notif.read ? `
            <button class="notification-action-btn" onclick="event.stopPropagation(); window.notificationsPanel.markAsRead(${notif.id});" title="Mark as read">
              ✓
            </button>
          ` : ''}
          <button class="notification-action-btn delete" onclick="event.stopPropagation(); window.notificationsPanel.deleteNotification(${notif.id});" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getNotificationIcon(type) {
    const icons = {
      mention: '💬',
      comment: '💬',
      assignment: '👤',
      status_change: '🔄',
      priority_change: '⚡',
      new_ticket: '✨',
      test: '🧪',
      generic: '🔔'
    };
    return icons[type] || icons.generic;
  }

  getActionText(action) {
    const actions = {
      commented: 'commented',
      mentioned: 'mentioned you',
      assigned: 'assigned you',
      updated: 'updated',
      created: 'created',
      resolved: 'resolved',
      reopened: 'reopened'
    };
    return actions[action] || action;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  async handleNotificationClick(notifId, issueKey) {
    // Mark as read
    await this.markAsRead(notifId);
    
    // If there's an issue key, load it
    if (issueKey && window.app && window.app.loadIssueDetails) {
      this.closePanel();
      window.app.loadIssueDetails(issueKey);
    }
  }

  async markAsRead(notifId) {
    try {
      const response = await fetch(`/api/notifications/${notifId}/read`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Update local state
        const notif = this.notifications.find(n => n.id === notifId);
        if (notif) {
          notif.read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.updateBadge();
          this.renderNotifications();
        }
      }
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
  }

  async markAllAsRead() {
    const unreadIds = this.notifications.filter(n => !n.read).map(n => n.id);
    
    for (const id of unreadIds) {
      await this.markAsRead(id);
    }
    
    console.log(`✅ Marked ${unreadIds.length} notifications as read`);
  }

  async deleteNotification(notifId) {
    try {
      const response = await fetch(`/api/notifications/${notifId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local state
        const index = this.notifications.findIndex(n => n.id === notifId);
        if (index !== -1) {
          const wasUnread = !this.notifications[index].read;
          this.notifications.splice(index, 1);
          
          if (wasUnread) {
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.updateBadge();
          }
          
          this.renderNotifications();
        }
      }
    } catch (error) {
      console.error('❌ Failed to delete notification:', error);
    }
  }

  destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.closePanel();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.notificationsPanel = new NotificationsPanel();
    window.notificationsPanel.init();
  });
} else {
  window.notificationsPanel = new NotificationsPanel();
  window.notificationsPanel.init();
}

console.log('✅ Notifications panel module loaded');
