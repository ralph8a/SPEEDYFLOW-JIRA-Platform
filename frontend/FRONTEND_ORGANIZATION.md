# Frontend Asset Organization

**Date:** November 19, 2025  
**Status:** ✅ Complete

This document describes the new organized structure for CSS and JavaScript files in the SalesJIRA application.

---

## 📁 Directory Structure

```
frontend/static/
├── css/
│   ├── main.css                    # Single entry point - imports all CSS
│   ├── core/
│   │   ├── variables.css           # CSS variables & design tokens
│   │   └── layout.css              # Layout, grid, responsive design
│   ├── components/
│   │   ├── common.css              # Buttons, forms, cards, modals
│   │   ├── kanban.css              # Kanban board & list view
│   │   └── comments.css            # Comments & mentions system
│   ├── themes/
│   │   └── themes.css              # Theme variants (light, dark, etc.)
│   └── archive/                    # Old/deprecated CSS files
│
└── js/
    ├── app.js                      # Main application entry point
    ├── core/
    │   ├── api.js                  # HTTP client & API endpoints
    │   └── state.js                # Centralized state management
    ├── modules/
    │   └── ui.js                   # UI rendering & DOM manipulation
    ├── utils/
    │   └── helpers.js              # Utility functions
    └── archive/                    # Old/deprecated JS files
```

---

## 🎨 CSS Architecture

### Main Entry Point
**File:** `css/main.css`

Single CSS file to import in HTML:
```html
<link rel="stylesheet" href="/static/css/main.css">
```

This file imports all modular CSS files in the correct order.

### Core Styles

#### `core/variables.css`
- **Purpose:** CSS custom properties (variables)
- **Contains:**
  - Color palette (primary, status, backgrounds, etc.)
  - Spacing system (xs, sm, md, lg, xl)
  - Typography (font families, sizes, weights)
  - Shadows, borders, transitions
  - Z-index hierarchy
  - Layout dimensions

#### `core/layout.css`
- **Purpose:** Application structure and layout
- **Contains:**
  - Reset & base styles
  - App layout (sidebar, main content)
  - Grid system (12-column)
  - Responsive breakpoints
  - Utility classes (flexbox, spacing, display)

### Component Styles

#### `components/common.css`
- **Purpose:** Reusable UI components
- **Contains:**
  - Forms & inputs
  - Buttons (all variants)
  - Cards
  - Badges & status indicators
  - Tabs & view toggles
  - Modals
  - Stats/metrics boxes
  - Alerts & error messages
  - Loading states
  - Tooltips

#### `components/kanban.css`
- **Purpose:** Kanban board and list view
- **Contains:**
  - Kanban board grid
  - Kanban columns
  - Issue cards
  - List view groups
  - List items
  - Drag & drop states (optional)

#### `components/comments.css`
- **Purpose:** Comments and mentions system
- **Contains:**
  - Comment form
  - Comment list
  - Comment cards
  - Author avatars
  - Mentions styling
  - Mention dropdowns
  - Comment actions

### Theme Styles

#### `themes/themes.css`
- **Purpose:** Multi-theme support
- **Contains:**
  - Light theme (default)
  - Dark theme
  - Custom themes (sunset, ocean, forest, purple)
  - Theme toggle UI
  - Glassmorphism effects
  - Theme transitions
  - Accessibility (high contrast, reduced motion)

---

## ⚡ JavaScript Architecture

### Main Entry Point
**File:** `js/app.js`

Single JavaScript file to import in HTML:
```html
<script type="module" src="/static/js/app.js"></script>
```

This is the application entry point that coordinates all modules.

### Core Modules

#### `core/api.js`
- **Purpose:** HTTP communication layer
- **Exports:**
  - `APIClient` class
  - Service desk functions: `getServiceDesks()`, `getQueues()`
  - Issue functions: `getIssues()`, `getIssue()`, `updateIssue()`, `createIssue()`
  - Comment functions: `getComments()`, `addComment()`, `updateComment()`
  - Dashboard functions: `getDashboardSummary()`, `getAnalytics()`
  - User functions: `getCurrentUser()`, `getTeamMembers()`
  - Search functions: `searchIssues()`
  - AI functions: `getAIPreview()`, `getAISuggestions()`

#### `core/state.js`
- **Purpose:** Centralized state management with reactive updates
- **Features:**
  - Single source of truth for app state
  - Subscription-based reactivity
  - State getters and setters
  - Loading and error state management
- **Key State:**
  - Issues (all, filtered, selected)
  - Service desks & queues
  - UI state (view, tab, sidebar)
  - Filters
  - User data

### Feature Modules

#### `modules/ui.js`
- **Purpose:** UI rendering and DOM manipulation
- **Exports:**
  - `renderKanbanBoard()` - Render kanban view
  - `renderListView()` - Render list view
  - `renderIssueModal()` - Show issue details
  - `renderDashboardStats()` - Update statistics
  - `updateAssigneeFilter()` - Update filter dropdowns
  - `showLoading()`, `showError()`, `showEmptyState()`
  - `renderIssues()` - Main render function

### Utility Modules

#### `utils/helpers.js`
- **Purpose:** Pure utility functions
- **Categories:**
  - **Logging:** Centralized console logging with emojis
  - **HTML:** `escapeHTML()`, `truncateText()`, `capitalize()`
  - **Dates:** `formatDate()`, `formatRelativeTime()`, `formatDateTime()`
  - **Arrays:** `groupBy()`, `sortBy()`, `unique()`, `deepClone()`
  - **DOM:** `$()` (jQuery-like selector), `$$()`, `debounce()`, `throttle()`
  - **Validation:** `isValidEmail()`, `isValidURL()`
  - **Storage:** `setStorage()`, `getStorage()`, `removeStorage()`
  - **Numbers:** `formatNumber()`, `formatBytes()`

---

## 🔄 Migration Guide

### For HTML Files

**Old:**
```html
<link rel="stylesheet" href="/static/css/styles.css">
<script src="/static/js/app.js"></script>
```

**New:**
```html
<link rel="stylesheet" href="/static/css/main.css">
<script type="module" src="/static/js/app.js"></script>
```

**Note:** The `type="module"` attribute is required for ES6 module imports.

### For Python Backend

Update any file serving references:

**Old:**
```python
return send_from_directory(static_dir, 'styles.css')
```

**New:**
```python
return send_from_directory(static_dir, 'main.css')
```

---

## 📊 Benefits of New Structure

### CSS Benefits
1. **Modular:** Each file has a single responsibility
2. **Maintainable:** Easy to find and update specific styles
3. **Scalable:** Add new components without touching existing code
4. **Performance:** Can load only needed styles in the future
5. **DRY:** Variables prevent duplication
6. **Responsive:** Centralized breakpoints

### JavaScript Benefits
1. **Modular:** Clear separation of concerns
2. **Testable:** Pure functions easy to unit test
3. **Reusable:** Import only what you need
4. **Type-safe:** Can add TypeScript later
5. **Reactive:** State changes trigger UI updates
6. **Debuggable:** Better error tracking with logger

---

## 🗄️ Archive Contents

### CSS Archive (`css/archive/`)
- `styles.css.bak` - Original monolithic styles
- `ARCHIVE_theme.css` - Old theme system
- `ARCHIVE_ai_styles.css` - AI feature styles
- `ARCHIVE_comments.css` - Old comments styles
- `ARCHIVE_responsive.css` - Old responsive styles
- `ARCHIVE_streamlit-ui.css` - Streamlit-specific styles
- `ARCHIVE_styles_old.css` - Previous version

### JavaScript Archive (`js/archive/`)
- `app.js.bak` - Original monolithic app
- `ARCHIVE_utils.js` - Old utilities
- `ARCHIVE_components.js` - Old component system
- `ARCHIVE_api-client.js` - Old API client
- `ARCHIVE_state.js` - Old state management
- `ARCHIVE_theme.js` - Old theme switcher
- `ARCHIVE_ui-components.js` - Old UI components
- `ARCHIVE_*.js` - Other deprecated modules

**Note:** Archive files are kept for reference but should not be used in production.

---

## 🚀 Usage Examples

### Importing in JavaScript

```javascript
// Import specific functions
import { getIssues, getComments } from './core/api.js';
import { setAllIssues, getFilters } from './core/state.js';
import { renderKanbanBoard, showError } from './modules/ui.js';
import { logger, escapeHTML, formatDate } from './utils/helpers.js';

// Use them
async function loadData() {
  logger.info('Loading issues...');
  const issues = await getIssues('desk-1', 'queue-1');
  setAllIssues(issues);
  renderKanbanBoard(issues, document.getElementById('board'));
}
```

### Adding New Styles

1. **Component-specific:** Add to appropriate file in `components/`
2. **New component:** Create new file in `components/` and import in `main.css`
3. **Theme variant:** Add to `themes/themes.css`
4. **Global utility:** Add to `core/layout.css` utility classes

### Adding New Features

1. **API endpoint:** Add to `core/api.js`
2. **State property:** Add to `StateStore` in `core/state.js`
3. **UI rendering:** Add to `modules/ui.js`
4. **Utility function:** Add to `utils/helpers.js`

---

## ✅ Checklist

- [x] Organize CSS into modular files
- [x] Create main.css entry point
- [x] Organize JavaScript into modules
- [x] Create modular app.js
- [x] Move ARCHIVE files to archive folders
- [x] Update import structure
- [ ] Update HTML templates to use new CSS/JS
- [ ] Update Python backend references
- [ ] Test all functionality
- [ ] Remove unused archive files (after testing)

---

## 📝 Notes

- All files use ES6 modules for JavaScript
- CSS uses `@import` for modular loading
- Archive files preserved for reference
- Variables and utilities prevent code duplication
- State management enables reactive UI updates
- Comprehensive logging for debugging

---

## 🔗 Related Documentation

- Project architecture: `.github/copilot-instructions.md`
- Caching strategy: `DOCS_ARCHIVE/COMPLETE_CACHING_STRATEGY_SUMMARY.md`
- UI improvements: `DEPRECATED_STREAMLIT_UI/README_UI_IMPROVEMENTS.md`

---

**Last Updated:** November 19, 2025  
**Maintained By:** Development Team
