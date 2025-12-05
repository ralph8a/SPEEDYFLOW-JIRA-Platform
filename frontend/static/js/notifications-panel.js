/**
 * SPEEDYFLOW - Notifications System
 * Real-time notifications with Server-Sent Events (SSE)
 * Clean implementation from scratch
 */

class NotificationsPanel {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.eventSource = null;
    this.isOpen = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Initialize notification system
   */
  async init() {
    console.log('🔔 Initializing Notifications System...');
    
    // Setup click handler
    this.setupButtonHandler();
    
    // Load existing notifications
    await this.loadNotifications();
    
    // Connect to SSE stream
    this.connectSSE();
    
    // Update badge
    this.updateBadge();
    
    console.log('✅ Notifications System ready');
  }

  /**
   * Setup button click handler
   */
  setupButtonHandler() {
    const btn = document.getElementById('notificationsBtn');
    if (!btn) {
      console.warn('⚠️ Notifications button not found');
      return;
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.togglePanel();
    });

    console.log('✅ Button handler attached');
  }

  /**
   * Load notifications from API
   */
  async loadNotifications() {
    try {
      console.log('🔄 Fetching notifications from /api/notifications...');
      const response = await fetch('/api/notifications');
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      console.log('📦 Response data:', result);
      
      // Handle wrapped response format: {success, data: {notifications: []}}
      const data = result.data || result;
      this.notifications = data.notifications || [];
      this.unreadCount = this.notifications.filter(n => !n.read).length;
      
      this.updateBadge();
      
      console.log(`📬 Loaded ${this.notifications.length} notifications (${this.unreadCount} unread)`);
      console.log('📋 Notifications array:', this.notifications);
    } catch (error) {
      console.error('❌ Failed to load notifications:', error);
      this.notifications = [];
      this.unreadCount = 0;
    }
  }

  /**
   * Connect to SSE stream for real-time updates
   */
  connectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    console.log('📡 Connecting to SSE stream...');
    
    try {
      this.eventSource = new EventSource('/api/notifications/stream');
      
      this.eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        this.reconnectAttempts = 0;
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ping' || data.type === 'connected') {
            return; // Ignore keep-alive messages
          }
          
          console.log('📬 New notification received:', data);
          
          // Add to list if not duplicate
          if (!this.notifications.find(n => n.id === data.id)) {
            this.notifications.unshift(data);
            this.unreadCount++;
            this.updateBadge();
            
            // Update panel if open
            if (this.isOpen) {
              this.renderNotifications();
            }
          }
        } catch (e) {
          console.error('❌ Error parsing SSE message:', e);
        }
      };
      
      this.eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        this.eventSource.close();
        
        // Attempt reconnection with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => this.connectSSE(), delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('❌ Failed to create SSE connection:', error);
    }
  }

  /**
   * Update notification badge
   */
  updateBadge() {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
      badge.textContent = this.unreadCount;
      badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
    }
  }

  /**
   * Toggle notification panel
   */
  togglePanel() {
    if (this.isOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  /**
   * Open notification panel
   */
  async openPanel() {
    if (document.getElementById('notificationsModal')) {
      return; // Already open
    }

    const modal = document.createElement('div');
    modal.id = 'notificationsModal';
    // Note: Styles are defined in cards-modals.css specifically for #notificationsModal
    
    modal.innerHTML = `
      <div class="bg-modal-overlay"></div>
      <div class="bg-modal-content" style="max-width: 600px;">
        <div class="bg-modal-header">
          <h3 class="bg-modal-title">🔔 Notifications</h3>
          <button class="bg-modal-close" onclick="window.notificationsPanel.closePanel()">×</button>
        </div>
        
        <div id="notificationsContent" style="max-height: 70vh; overflow-y: auto; margin-top: 16px;">
          <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
            <div style="font-size: 16px;">Loading...</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Close on overlay click
    modal.querySelector('.bg-modal-overlay').addEventListener('click', () => {
      this.closePanel();
    });
    
    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.closePanel();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    this.isOpen = true;
    
    // Load notifications before rendering
    await this.loadNotifications();
    this.renderNotifications();
    
    console.log('✅ Notification panel opened');
  }

  /**
   * Close notification panel
   */
  closePanel() {
    const modal = document.getElementById('notificationsModal');
    if (modal) {
      // Simple fade out with opacity
      modal.style.opacity = '0';
      modal.style.transition = 'opacity 0.2s ease';
      setTimeout(() => modal.remove(), 200);
    }
    this.isOpen = false;
    console.log('✅ Notification panel closed');
  }

  /**
   * Render notifications in panel
   */
  renderNotifications() {
    console.log('🎨 Rendering notifications...', this.notifications);
    const container = document.getElementById('notificationsContent');
    if (!container) {
      console.error('❌ Container #notificationsContent not found');
      return;
    }

    // Empty state
    if (this.notifications.length === 0) {
      console.log('ℹ️ No notifications to display (empty state)');
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
          <div style="font-size: 64px; margin-bottom: 16px;">🔕</div>
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #cbd5e1;">
            No notifications
          </div>
          <div style="font-size: 13px;">You're all caught up!</div>
        </div>
      `;
      return;
    }
    
    console.log(`✅ Rendering ${this.notifications.length} notifications`);

    // Group by date
    const grouped = this.groupByDate(this.notifications);
    
    let html = '';
    
    if (grouped.today.length > 0) {
      html += '<div class="notif-date-header">Today</div>';
      html += grouped.today.map(n => this.renderNotificationCard(n)).join('');
    }

    if (grouped.yesterday.length > 0) {
      html += '<div class="notif-date-header">Yesterday</div>';
      html += grouped.yesterday.map(n => this.renderNotificationCard(n)).join('');
    }

    if (grouped.older.length > 0) {
      html += '<div class="notif-date-header">Older</div>';
      html += grouped.older.map(n => this.renderNotificationCard(n)).join('');
    }

    container.innerHTML = html;
  }

  /**
   * Group notifications by date
   */
  groupByDate(notifications) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const grouped = { today: [], yesterday: [], older: [] };
    
    notifications.forEach(notif => {
      const date = new Date(notif.created_at || notif.timestamp);
      date.setHours(0, 0, 0, 0);
      
      if (date.getTime() === today.getTime()) {
        grouped.today.push(notif);
      } else if (date.getTime() === yesterday.getTime()) {
        grouped.yesterday.push(notif);
      } else {
        grouped.older.push(notif);
      }
    });
    
    return grouped;
  }

  /**
   * Render single notification card
   */
  renderNotificationCard(notif) {
    const icon = this.getIcon(notif.type || notif.action);
    const time = this.formatTime(notif.created_at || notif.timestamp);
    const isUnread = !notif.read;
    
    const card = `
      <div class="notif-card ${isUnread ? 'unread' : ''}" onclick="window.notificationsPanel.markAsRead('${notif.id}')">
        <div style="display: flex; gap: 12px; align-items: start;">
          <div style="font-size: 24px; flex-shrink: 0;">${icon}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 14px; color: ${isUnread ? '#e0e7ff' : '#94a3b8'}; margin-bottom: 4px;">
              ${notif.message || this.buildMessage(notif)}
            </div>
            <div style="font-size: 12px; color: #64748b;">${time}</div>
          </div>
          ${isUnread ? '<div style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; flex-shrink: 0; margin-top: 6px;"></div>' : ''}
        </div>
      </div>
    `;
    
    return card;
  }

  /**
   * Build notification message
   */
  buildMessage(notif) {
    const user = notif.user || 'Someone';
    const action = notif.action || 'updated';
    const key = notif.issue_key || '';
    
    let msg = `<strong>${user}</strong> ${action}`;
    if (key) msg += ` <span style="color: #3b82f6;">${key}</span>`;
    
    return msg;
  }

  /**
   * Get icon for notification type
   */
  getIcon(type) {
    const icons = {
      mention: '💬',
      comment: '💬',
      assignment: '👤',
      assigned: '👤',
      status: '🔄',
      update: '🔄',
      priority: '⚡',
      new: '✨',
      created: '✨',
      resolved: '✅',
      closed: '✅'
    };
    return icons[type] || '🔔';
  }

  /**
   * Format timestamp to relative time
   */
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

  /**
   * Mark notification as read
   */
  async markAsRead(notifId) {
    try {
      const response = await fetch(`/api/notifications/${notifId}/read`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const notif = this.notifications.find(n => n.id == notifId);
        if (notif && !notif.read) {
          notif.read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.updateBadge();
          this.renderNotifications();
          console.log(`✅ Marked notification ${notifId} as read`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
  }

  /**
   * Cleanup on destroy
   */
  destroy() {
    if (this.eventSource) {
      this.eventSource.close();
      console.log('🔌 SSE connection closed');
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
