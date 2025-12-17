# 🎨 SPEEDYFLOW - UI/UX Implementation Guide
**Complete guide to user interface and user experience features**
---
## 📋 Table of Contents
1. [Glassmorphism Design System](#glassmorphism-design-system)
2. [Icon Library](#icon-library)
3. [Responsive Design](#responsive-design)
4. [Component Library](#component-library)
5. [Drag & Drop System](#drag--drop-system)
6. [Comments & Communication](#comments--communication)
7. [Notifications](#notifications)
8. [Accessibility](#accessibility)
---
## Glassmorphism Design System
### Visual Aesthetic
**Glassmorphism** is a modern UI trend featuring frosted glass effects with:
- Semi-transparent backgrounds
- Backdrop blur filters
- Multi-layer shadows for depth
- Subtle borders
### Core Styles
```css
:root {
    /* Glass effect variables */
    --glass-bg: rgba(255, 255, 255, 0.1);
    --glass-border: rgba(255, 255, 255, 0.2);
    --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    --glass-blur: blur(20px);
    /* Color palette */
    --primary: #6366f1;      /* Indigo */
    --secondary: #8b5cf6;    /* Purple */
    --success: #10b981;      /* Green */
    --warning: #f59e0b;      /* Orange */
    --danger: #ef4444;       /* Red */
    /* Background */
    --bg-light: #f3f4f6;     /* Light gray */
    --bg-dark: #1f2937;      /* Dark gray */
}
.glass-card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    border-radius: 12px;
}
```
### Sidebar Styling
```css
.sidebar {
    background: linear-gradient(
        135deg,
        rgba(31, 41, 55, 0.95),
        rgba(17, 24, 39, 0.98)
    );
    backdrop-filter: blur(20px);
    box-shadow: 
        4px 0 24px rgba(0, 0, 0, 0.15),
        inset -1px 0 0 rgba(255, 255, 255, 0.05);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
}
.sidebar-item {
    transition: all 0.3s ease;
}
.sidebar-item:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
```
### Card Components
```css
.ticket-card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    box-shadow: 
        0 4px 6px rgba(0, 0, 0, 0.05),
        0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
}
.ticket-card:hover {
    transform: translateY(-4px);
    box-shadow: 
        0 12px 24px rgba(0, 0, 0, 0.1),
        0 4px 12px rgba(0, 0, 0, 0.08);
}
.ticket-card.priority-critical {
    border-left: 4px solid var(--danger);
    background: linear-gradient(
        to right,
        rgba(239, 68, 68, 0.05),
        rgba(255, 255, 255, 0.95)
    );
}
```
### Modal Overlays
```css
.modal-overlay {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    animation: fadeIn 0.3s ease;
}
.modal-content {
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    box-shadow: 
        0 20px 60px rgba(0, 0, 0, 0.3),
        0 10px 30px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease;
}
@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(40px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```
---
## Icon Library
### Icon Catalog
**67 custom SVG icons** organized in 5 categories:
#### Action Icons (12)
- `plus`, `edit`, `delete`, `save`, `cancel`
- `refresh`, `download`, `upload`, `copy`, `share`
- `search`, `filter`
#### Navigation Icons (7)
- `arrow-left`, `arrow-right`, `arrow-up`, `arrow-down`
- `chevron-left`, `chevron-right`, `chevron-down`
#### Status Icons (7)
- `check`, `check-circle`, `x`, `x-circle`
- `alert-circle`, `info-circle`, `help-circle`
#### UI Icons (16)
- `menu`, `settings`, `user`, `users`, `bell`
- `calendar`, `clock`, `tag`, `star`, `bookmark`
- `eye`, `eye-off`, `lock`, `unlock`, `mail`, `link`
#### Business Icons (23)
- `ticket`, `priority`, `assignee`, `comment`, `attachment`
- `chart`, `dashboard`, `report`, `analytics`, `trend`
- `sla`, `breach`, `warning`, `critical`, `resolved`
- And 8 more...
### Usage
```html
<!-- Inline SVG -->
<svg class="icon icon-sm" aria-label="Search">
    <use href="/static/icons/sprite.svg#search"></use>
</svg>
<!-- With animation -->
<svg class="icon icon-md animate-spin">
    <use href="/static/icons/sprite.svg#refresh"></use>
</svg>
<!-- In button -->
<button class="btn-primary">
    <svg class="icon icon-sm">
        <use href="/static/icons/sprite.svg#save"></use>
    </svg>
    Save
</button>
```
### Icon Sizes
```css
.icon-xs { width: 12px; height: 12px; }  /* Inline text */
.icon-sm { width: 16px; height: 16px; }  /* Buttons, menu */
.icon-md { width: 20px; height: 20px; }  /* Headers, tabs */
.icon-lg { width: 24px; height: 24px; }  /* Feature icons */
.icon-xl { width: 32px; height: 32px; }  /* Placeholders */
```
### Animations
```css
/* Continuous spin */
.animate-spin {
    animation: spin 2s linear infinite;
}
/* 4-direction assembly (default) */
.animate-assemble {
    animation: assemble 3.5s ease-in-out infinite;
}
/* Pulse (attention) */
.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
/* Shake (error) */
.animate-shake {
    animation: shake 0.5s ease-in-out;
}
@keyframes assemble {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(-3px, 0); }
    50% { transform: translate(0, -3px); }
    75% { transform: translate(3px, 0); }
}
```
---
## Responsive Design
### Breakpoints
```css
/* Mobile first approach */
:root {
    --bp-mobile: 480px;
    --bp-tablet: 768px;
    --bp-desktop: 1024px;
    --bp-wide: 1280px;
}
/* Mobile (default) */
.container {
    padding: 16px;
}
/* Tablet */
@media (min-width: 768px) {
    .container {
        padding: 24px;
        max-width: 768px;
    }
    .kanban-board {
        grid-template-columns: repeat(2, 1fr);
    }
}
/* Desktop */
@media (min-width: 1024px) {
    .container {
        padding: 32px;
        max-width: 1200px;
    }
    .kanban-board {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
}
/* Wide screens */
@media (min-width: 1280px) {
    .container {
        max-width: 1400px;
    }
}
```
### Mobile Optimizations
```css
/* Touch-friendly buttons */
@media (max-width: 768px) {
    button, .btn, a.btn-like {
        min-height: 44px;  /* Apple HIG recommendation */
        padding: 12px 16px;
    }
    /* Vertical stacking */
    .filter-bar {
        flex-direction: column;
    }
    /* Simplified kanban */
    .kanban-board {
        grid-template-columns: 1fr;
    }
    /* Hamburger menu */
    .sidebar {
        position: fixed;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
    }
    .sidebar.open {
        transform: translateX(0);
    }
}
```
### Layout Patterns
```css
/* Flexbox layout */
.flex-container {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
}
.flex-item {
    flex: 1 1 300px;  /* Grow, shrink, base 300px */
}
/* Grid layout */
.grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 24px;
}
/* Two-column with sidebar */
.layout-with-sidebar {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 24px;
}
@media (max-width: 1024px) {
    .layout-with-sidebar {
        grid-template-columns: 1fr;
    }
}
```
---
## Component Library
### Buttons
```html
<!-- Primary button -->
<button class="btn btn-primary">
    <svg class="icon icon-sm"><use href="#save"></use></svg>
    Save Changes
</button>
<!-- Secondary button -->
<button class="btn btn-secondary">Cancel</button>
<!-- Danger button -->
<button class="btn btn-danger">Delete</button>
<!-- Icon-only button -->
<button class="btn btn-icon" aria-label="Refresh">
    <svg class="icon"><use href="#refresh"></use></svg>
</button>
```
```css
.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
.btn-primary {
    background: var(--primary);
    color: white;
}
.btn-primary:hover {
    background: color-mix(in srgb, var(--primary) 90%, black);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}
```
### Badges
```html
<!-- Status badges -->
<span class="badge badge-success">Resolved</span>
<span class="badge badge-warning">In Progress</span>
<span class="badge badge-danger">Blocked</span>
<!-- Priority badges -->
<span class="badge badge-critical">🔥 Critical</span>
<span class="badge badge-high">⚡ High</span>
<span class="badge badge-medium">📌 Medium</span>
<span class="badge badge-low">📋 Low</span>
<!-- Count badges -->
<span class="badge badge-count">3</span>
```
```css
.badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    gap: 4px;
}
.badge-success {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
}
.badge-critical {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    animation: pulse 2s infinite;
}
```
### Forms
```html
<div class="form-group">
    <label for="summary">Summary</label>
    <input 
        type="text" 
        id="summary" 
        class="form-control"
        placeholder="Enter ticket summary"
    >
    <span class="form-help">Brief description of the issue</span>
</div>
<div class="form-group">
    <label for="description">Description</label>
    <textarea 
        id="description" 
        class="form-control" 
        rows="5"
    ></textarea>
</div>
<div class="form-group">
    <label for="priority">Priority</label>
    <select id="priority" class="form-control">
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium" selected>Medium</option>
        <option value="low">Low</option>
    </select>
</div>
```
```css
.form-group {
    margin-bottom: 20px;
}
.form-control {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    transition: all 0.2s ease;
}
.form-control:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
.form-help {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #6b7280;
}
```
### Cards
```html
<div class="card">
    <div class="card-header">
        <h3>Ticket Details</h3>
        <button class="btn btn-icon">
            <svg class="icon"><use href="#edit"></use></svg>
        </button>
    </div>
    <div class="card-body">
        <p>Content goes here...</p>
    </div>
    <div class="card-footer">
        <button class="btn btn-secondary">Cancel</button>
        <button class="btn btn-primary">Save</button>
    </div>
</div>
```
```css
.card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
}
.card-body {
    padding: 20px;
}
.card-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
}
```
---
## Drag & Drop System
### Visual Design
**Vertical transition bar** appears between columns during drag:
```css
.transition-bar {
    position: absolute;
    width: 4px;
    height: 100%;
    background: linear-gradient(
        to bottom,
        transparent,
        var(--primary),
        transparent
    );
    opacity: 0;
    transition: opacity 0.3s ease;
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
}
.transition-bar.active {
    opacity: 1;
    animation: glow 1.5s ease-in-out infinite;
}
@keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.5); }
    50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.8); }
}
```
### Column Separation Animation
```css
.kanban-column.drag-active {
    animation: separateColumns 0.3s ease-out forwards;
}
@keyframes separateColumns {
    from {
        margin-left: 0;
        margin-right: 0;
    }
    to {
        margin-left: 24px;
        margin-right: 24px;
    }
}
```
### Card Flying Animation
```javascript
function animateCardTransition(card, fromColumn, toColumn) {
    // Get positions
    const fromRect = fromColumn.getBoundingClientRect();
    const toRect = toColumn.getBoundingClientRect();
    // Clone card for animation
    const clone = card.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.top = `${fromRect.top}px`;
    clone.style.left = `${fromRect.left}px`;
    clone.style.zIndex = 9999;
    document.body.appendChild(clone);
    // Animate
    clone.animate([
        { 
            transform: 'translate(0, 0) scale(1)',
            opacity: 1
        },
        { 
            transform: `translate(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px) scale(0.95)`,
            opacity: 0.8
        }
    ], {
        duration: 400,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }).onfinish = () => {
        clone.remove();
        // Show card in new column
        toColumn.appendChild(card);
    };
}
```
### Transition Fetching
```javascript
async function loadTransitionsForDrag(issueKey) {
    const response = await fetch(`/api/issues/${issueKey}/transitions`);
    const transitions = await response.json();
    // Build transition UI
    const transitionBar = document.createElement('div');
    transitionBar.className = 'transition-bar';
    transitions.forEach(transition => {
        const button = document.createElement('button');
        button.className = 'transition-button';
        button.innerHTML = `
            <span class="transition-icon">${getTransitionIcon(transition.name)}</span>
            <span class="transition-name">${transition.name}</span>
        `;
        button.onclick = () => executeTransition(issueKey, transition.id);
        transitionBar.appendChild(button);
    });
    return transitionBar;
}
function getTransitionIcon(transitionName) {
    const iconMap = {
        'Start Progress': '▶️',
        'In Progress': '🔄',
        'Pause': '⏸',
        'Done': '✅',
        'Close': '🔒',
        'Reopen': '🔓'
    };
    return iconMap[transitionName] || '➡️';
}
```
---
## Comments & Communication
### Comment Thread UI
```html
<div class="comments-section">
    <h3 class="comments-header">
        Comments
        <span class="badge badge-count">5</span>
    </h3>
    <!-- Comment list -->
    <div class="comment-thread">
        <div class="comment">
            <img src="avatar.jpg" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-header">
                    <strong>John Doe</strong>
                    <span class="comment-time">2 hours ago</span>
                </div>
                <div class="comment-body">
                    <p>I've investigated this issue and found...</p>
                    <div class="comment-attachments">
                        <img src="screenshot.png" alt="Screenshot">
                    </div>
                </div>
                <div class="comment-actions">
                    <button class="btn-link">Reply</button>
                    <button class="btn-link">Edit</button>
                </div>
            </div>
        </div>
    </div>
    <!-- New comment form -->
    <div class="comment-form">
        <img src="current-user-avatar.jpg" class="comment-avatar">
        <div class="comment-input-wrapper">
            <textarea 
                class="comment-input"
                placeholder="Add a comment... (use @mention)"
                rows="3"
            ></textarea>
            <div class="comment-toolbar">
                <button class="btn btn-sm">
                    <svg class="icon"><use href="#attachment"></use></svg>
                    Attach
                </button>
                <button class="btn btn-sm">
                    <svg class="icon"><use href="#image"></use></svg>
                    Image
                </button>
                <button class="btn btn-primary">Post</button>
            </div>
        </div>
    </div>
</div>
```
### Mention Autocomplete
```javascript
class MentionAutocomplete {
    constructor(textarea) {
        this.textarea = textarea;
        this.dropdown = null;
        this.users = [];
        this.init();
    }
    init() {
        this.textarea.addEventListener('input', (e) => {
            const text = e.target.value;
            const cursorPos = e.target.selectionStart;
            // Check if typing @mention
            const beforeCursor = text.substring(0, cursorPos);
            const match = beforeCursor.match(/@(\w*)$/);
            if (match) {
                this.showDropdown(match[1]);
            } else {
                this.hideDropdown();
            }
        });
    }
    async showDropdown(query) {
        // Filter users
        const filtered = this.users.filter(u => 
            u.name.toLowerCase().includes(query.toLowerCase())
        );
        // Build dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'mention-dropdown';
        filtered.forEach(user => {
            const item = document.createElement('div');
            item.className = 'mention-item';
            item.innerHTML = `
                <img src="${user.avatar}" class="mention-avatar">
                <span>${user.name}</span>
            `;
            item.onclick = () => this.selectUser(user);
            this.dropdown.appendChild(item);
        });
        // Position dropdown
        const rect = this.textarea.getBoundingClientRect();
        this.dropdown.style.top = `${rect.bottom}px`;
        this.dropdown.style.left = `${rect.left}px`;
        document.body.appendChild(this.dropdown);
    }
    selectUser(user) {
        const text = this.textarea.value;
        const cursorPos = this.textarea.selectionStart;
        const beforeCursor = text.substring(0, cursorPos);
        const afterCursor = text.substring(cursorPos);
        // Replace @query with @username
        const newBefore = beforeCursor.replace(/@\w*$/, `@${user.username} `);
        this.textarea.value = newBefore + afterCursor;
        this.textarea.selectionStart = this.textarea.selectionEnd = newBefore.length;
        this.hideDropdown();
        this.textarea.focus();
    }
}
```
### Image Preview
```javascript
function renderCommentWithImages(comment) {
    const body = comment.body;
    // Parse ![filename.jpg] syntax
    const imageRegex = /!\[([^\]]+)\]/g;
    const rendered = body.replace(imageRegex, (match, filename) => {
        const attachment = comment.attachments.find(a => a.filename === filename);
        if (attachment) {
            return `<img src="${attachment.url}" alt="${filename}" class="comment-image">`;
        }
        return match;
    });
    return rendered;
}
```
---
## Notifications
### Notification System
```html
<div class="notification-center">
    <button class="notification-bell" onclick="toggleNotifications()">
        <svg class="icon"><use href="#bell"></use></svg>
        <span class="notification-badge">3</span>
    </button>
    <div class="notification-dropdown" hidden>
        <div class="notification-header">
            <h4>Notifications</h4>
            <button class="btn-link">Mark all read</button>
        </div>
        <div class="notification-list">
            <div class="notification unread">
                <svg class="icon notification-icon"><use href="#comment"></use></svg>
                <div class="notification-content">
                    <p>
                        <strong>John Doe</strong> commented on 
                        <em>"Fix login bug"</em>
                    </p>
                    <span class="notification-time">5 minutes ago</span>
                </div>
            </div>
            <div class="notification">
                <svg class="icon notification-icon"><use href="#alert"></use></svg>
                <div class="notification-content">
                    <p>
                        <strong>MSM-1234</strong> SLA breach in 
                        <strong>2 hours</strong>
                    </p>
                    <span class="notification-time">1 hour ago</span>
                </div>
            </div>
        </div>
    </div>
</div>
```
```css
.notification {
    display: flex;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
    transition: background 0.2s ease;
    cursor: pointer;
}
.notification:hover {
    background: #f9fafb;
}
.notification.unread {
    background: rgba(99, 102, 241, 0.05);
    border-left: 3px solid var(--primary);
}
.notification-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: var(--danger);
    color: white;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 10px;
    animation: pulse 2s infinite;
}
```
---
## Accessibility
### ARIA Labels
```html
<!-- Buttons -->
<button aria-label="Close modal" class="btn-icon">
    <svg class="icon"><use href="#x"></use></svg>
</button>
<!-- Icons -->
<svg class="icon" role="img" aria-label="Success">
    <use href="#check-circle"></use>
</svg>
<!-- Form controls -->
<label for="search-input" class="sr-only">Search tickets</label>
<input 
    id="search-input"
    type="search"
    aria-label="Search tickets"
    aria-describedby="search-help"
>
<span id="search-help" class="sr-only">
    Search by ticket key, summary, or description
</span>
```
### Keyboard Navigation
```javascript
// Tab trap in modal
function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    element.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}
// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: Search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
    }
    // Ctrl/Cmd + /: Show shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        showKeyboardShortcuts();
    }
});
```
### Color Contrast
```css
/* WCAG AA compliant (4.5:1 minimum) */
:root {
    --text-primary: #111827;      /* 16.94:1 on white */
    --text-secondary: #4b5563;    /* 7.36:1 on white */
    --text-muted: #6b7280;        /* 5.46:1 on white */
}
/* Large text (18px+) can be 3:1 */
.text-large {
    font-size: 18px;
    color: #6b7280;  /* 5.46:1, exceeds 3:1 */
}
```
### Screen Reader Support
```css
/* Visually hidden but accessible to screen readers */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
}
/* Skip to main content link */
.skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--primary);
    color: white;
    padding: 8px;
    z-index: 100;
}
.skip-link:focus {
    top: 0;
}
```
---
**Last Updated**: December 10, 2025  
**Version**: 2.0  
**Design System**: Glassmorphism  
**Status**: ✅ Production Ready
