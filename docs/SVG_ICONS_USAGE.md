# SVG Icons Module - Usage Guide

## 📦 Overview

The SVG Icons module provides a centralized, consistent way to use icons throughout the SPEEDYFLOW application. All icons are inline SVG for maximum performance and customization.

## 🚀 Quick Start

### 1. Include the module in your HTML

```html
<!-- In your main HTML file -->
<link rel="stylesheet" href="/static/css/utils/svg-icons.css">
<script src="/static/js/utils/svg-icons.js"></script>
```

### 2. Use in JavaScript

```javascript
// Basic usage
document.getElementById('myButton').innerHTML = SVGIcons.refresh();

// With custom options
document.getElementById('myButton').innerHTML = SVGIcons.refresh({
  size: 20,
  color: '#ff0000',
  strokeWidth: 3
});

// In template strings
const html = `
  <button>
    ${SVGIcons.save()}
    Save Changes
  </button>
`;
```

### 3. Use in HTML (via data attributes)

```html
<!-- Using data-icon attribute (requires init script) -->
<span data-icon="user" data-icon-size="24"></span>
```

## 📚 Available Icons

### Action Icons
- `refresh()` - Circular arrows (sync/reload)
- `close()` - X symbol
- `clock()` - Clock face (for time/auto-refresh)
- `plus()` - Plus symbol (add new)
- `edit()` - Pencil icon
- `trash()` - Trash bin (delete)
- `save()` - Checkmark
- `download()` - Download arrow
- `upload()` - Upload arrow
- `copy()` - Copy/duplicate

### Navigation Icons
- `arrowRight()` - Right arrow
- `arrowLeft()` - Left arrow
- `arrowUp()` - Up arrow
- `arrowDown()` - Down arrow
- `chevronRight()` - Right chevron (>)
- `chevronLeft()` - Left chevron (<)
- `externalLink()` - External link indicator

### Status & Alert Icons
- `info()` - Information circle
- `alert()` - Warning triangle
- `error()` - Error X circle
- `success()` - Success checkmark circle

### UI Elements
- `search()` - Magnifying glass
- `filter()` - Filter funnel
- `settings()` - Gear/cog
- `menu()` - Hamburger menu (3 lines)
- `moreVertical()` - 3 dots vertical
- `moreHorizontal()` - 3 dots horizontal
- `eye()` - View/show
- `eyeOff()` - Hide/invisible

### Business Icons
- `user()` - Single user
- `users()` - Multiple users/team
- `tag()` - Tag/label
- `calendar()` - Calendar
- `message()` - Comment/message
- `bell()` - Notification bell
- `chart()` - Bar chart/analytics
- `shield()` - Security/protection
- `lightning()` - Fast/power
- `star()` - Favorite/rating

## 🎨 Customization Options

All icon functions accept an options object:

```javascript
{
  size: 16,              // Icon size in pixels (default: 16)
  strokeWidth: 2,        // Line thickness (default: 2)
  color: 'currentColor', // Stroke color (default: currentColor)
  className: ''          // Additional CSS classes
}
```

### Examples

```javascript
// Large icon
SVGIcons.user({ size: 32 });

// Colored icon
SVGIcons.alert({ color: '#ef4444' });

// Thick stroke
SVGIcons.edit({ strokeWidth: 3 });

// With custom class
SVGIcons.star({ className: 'favorite-icon' });

// Multiple options
SVGIcons.bell({ 
  size: 24, 
  color: '#f59e0b', 
  className: 'notification-icon' 
});
```

## 🎯 CSS Classes

The module includes pre-defined CSS classes for common scenarios:

### Size Classes
```html
<span class="svg-icon-xs">12px</span>
<span class="svg-icon-sm">14px</span>
<span class="svg-icon-md">16px (default)</span>
<span class="svg-icon-lg">20px</span>
<span class="svg-icon-xl">24px</span>
<span class="svg-icon-2xl">32px</span>
```

### Color Classes
```html
<span class="svg-icon-primary">Primary color</span>
<span class="svg-icon-secondary">Secondary color</span>
<span class="svg-icon-success">Success green</span>
<span class="svg-icon-danger">Danger red</span>
<span class="svg-icon-warning">Warning orange</span>
<span class="svg-icon-info">Info blue</span>
<span class="svg-icon-muted">Muted gray</span>
```

### Animation Classes
```html
<!-- Spinning (for loading states) -->
<button>
  ${SVGIcons.refresh({ className: 'svg-icon-spin' })}
  Loading...
</button>

<!-- Pulsing (for notifications) -->
<span class="svg-icon-pulse">
  ${SVGIcons.bell()}
</span>

<!-- Bouncing (for emphasis) -->
<span class="svg-icon-bounce">
  ${SVGIcons.arrowDown()}
</span>

<!-- Shaking (for alerts) -->
<span class="svg-icon-shake">
  ${SVGIcons.alert()}
</span>

<!-- Heartbeat (for favorites/likes) -->
<span class="svg-icon-heartbeat">
  ${SVGIcons.star()}
</span>

<!-- Tada (attention grabber) -->
<span class="svg-icon-tada">
  ${SVGIcons.success()}
</span>

<!-- Float (subtle movement) -->
<span class="svg-icon-float">
  ${SVGIcons.bell()}
</span>

<!-- Glow (emphasis with light effect) -->
<span class="svg-icon-glow">
  ${SVGIcons.lightning()}
</span>

<!-- Wiggle (playful movement) -->
<span class="svg-icon-wiggle">
  ${SVGIcons.bell()}
</span>
```

#### Available Animation Classes:
- `svg-icon-spin` - Continuous 360° rotation (loading states)
- `svg-icon-pulse` - Opacity pulse (notifications)
- `svg-icon-bounce` - Vertical bounce (emphasis)
- `svg-icon-shake` - Horizontal shake (alerts, errors)
- `svg-icon-swing` - Pendulum swing (playful)
- `svg-icon-tada` - Scale + rotate combo (celebration)
- `svg-icon-heartbeat` - Scale pulse (favorites)
- `svg-icon-fade-in` - Fade in entrance
- `svg-icon-scale-in` - Scale up entrance
- `svg-icon-rotate-in` - Rotate entrance
- `svg-icon-float` - Gentle float (ambient)
- `svg-icon-glow` - Glow effect (highlight)
- `svg-icon-flip` - 3D flip (transition)
- `svg-icon-wiggle` - Subtle wiggle (attention)
- `svg-icon-jello` - Jello wobble (playful)

### Button Classes
```html
<!-- Icon-only button -->
<button class="icon-btn">
  ${SVGIcons.settings()}
</button>

<!-- Icon with text -->
<button class="icon-with-text">
  ${SVGIcons.save()}
  <span>Save Changes</span>
</button>
```

## 🔧 Advanced Usage

### Dynamic Icon Rendering

```javascript
// Render icon by name (useful for dynamic UIs)
const iconName = 'user'; // From database or user selection
const icon = SVGIcons.render(iconName, { size: 20 });

// Get all available icons
const allIcons = SVGIcons.getAvailableIcons();
console.log(allIcons); // ['refresh', 'close', 'clock', ...]
```

### Icon with Badge (Notification Count)

```html
<span class="icon-badge" data-badge="5">
  ${SVGIcons.bell()}
</span>
```

### Loading State

```javascript
// Show loading spinner
button.classList.add('icon-loading');
button.innerHTML = SVGIcons.refresh();

// Remove loading state
button.classList.remove('icon-loading');
```

### Icon Groups

```html
<div class="icon-group">
  ${SVGIcons.user()}
  ${SVGIcons.chevronRight({ size: 12 })}
  ${SVGIcons.settings()}
</div>
```

## 🎭 Theme Support

Icons automatically adapt to light/dark themes using `currentColor`:

```css
/* Icons inherit parent color */
.my-button {
  color: #6366f1;
}

.my-button svg {
  stroke: currentColor; /* Will be #6366f1 */
}

/* Theme-specific overrides (if needed) */
.theme-dark .my-icon {
  opacity: 0.9;
}
```

## 📱 Responsive Design

```css
/* Hide icons on mobile */
<span class="icon-hide-mobile">
  ${SVGIcons.filter()}
</span>

/* Smaller icons on mobile */
@media (max-width: 640px) {
  .my-icon svg {
    width: 14px;
    height: 14px;
  }
}
```

## ♿ Accessibility

All icons include proper ARIA attributes:

```html
<!-- Icon-only button (needs aria-label) -->
<button aria-label="Close modal">
  ${SVGIcons.close()}
</button>

<!-- Icon with visible text (decorative) -->
<button>
  ${SVGIcons.save()}
  <span>Save Changes</span>
</button>

<!-- Icon conveys meaning (needs aria-label or title) -->
<span title="High priority" aria-label="High priority">
  ${SVGIcons.alert({ color: '#ef4444' })}
</span>
```

## 🔄 Migration from Font Awesome

If migrating from Font Awesome icons:

| Font Awesome | SVGIcons |
|-------------|----------|
| `<i class="fas fa-sync"></i>` | `${SVGIcons.refresh()}` |
| `<i class="fas fa-times"></i>` | `${SVGIcons.close()}` |
| `<i class="fas fa-clock"></i>` | `${SVGIcons.clock()}` |
| `<i class="fas fa-plus"></i>` | `${SVGIcons.plus()}` |
| `<i class="fas fa-edit"></i>` | `${SVGIcons.edit()}` |
| `<i class="fas fa-trash"></i>` | `${SVGIcons.trash()}` |
| `<i class="fas fa-check"></i>` | `${SVGIcons.save()}` |
| `<i class="fas fa-user"></i>` | `${SVGIcons.user()}` |
| `<i class="fas fa-bell"></i>` | `${SVGIcons.bell()}` |

## 🎯 Best Practices

1. **Use `currentColor`**: Let icons inherit color from parent element
   ```javascript
   // ✅ Good - inherits parent color
   SVGIcons.user()
   
   // ❌ Avoid - hardcoded color
   SVGIcons.user({ color: '#6366f1' })
   ```

2. **Consistent sizing**: Use size classes or consistent size values
   ```javascript
   // ✅ Good - consistent sizes
   SVGIcons.user({ size: 16 })
   SVGIcons.settings({ size: 16 })
   
   // ❌ Avoid - random sizes
   SVGIcons.user({ size: 17 })
   SVGIcons.settings({ size: 19 })
   ```

3. **Accessibility**: Always add ARIA labels for icon-only buttons
   ```html
   <!-- ✅ Good -->
   <button aria-label="Close">
     ${SVGIcons.close()}
   </button>
   
   <!-- ❌ Avoid -->
   <button>
     ${SVGIcons.close()}
   </button>
   ```

4. **Performance**: Icons are inline SVG - no external requests needed!

## 🐛 Troubleshooting

### Icons not showing?
1. Check if `svg-icons.js` is loaded: `console.log(window.SVGIcons)`
2. Check CSS is loaded: Look for `.svg-icon` styles in DevTools
3. Check for conflicting CSS that might hide SVGs

### Icons wrong color?
- Icons use `currentColor` by default - check parent element color
- Use `color` option to override: `SVGIcons.user({ color: '#ff0000' })`

### Icons wrong size?
- Default size is 16px
- Use `size` option: `SVGIcons.user({ size: 24 })`
- Check for conflicting CSS on `.svg-icon` class

## 📝 Examples in the App

Check these files for real-world usage:
- `/frontend/static/js/modules/ml-anomaly-dashboard.js` - Header action buttons
- Look for `SVGIcons.refresh()`, `SVGIcons.clock()`, `SVGIcons.close()`

## 🚀 Adding New Icons

To add a new icon to the module:

1. Find an icon from [Feather Icons](https://feathericons.com/) or similar
2. Add method to `svg-icons.js`:
   ```javascript
   myNewIcon(options = {}) {
     return this._createSVG(`
       <path d="...your SVG path here..."></path>
     `, options);
   }
   ```
3. Document it in this guide
4. Test in both light and dark themes

---

**Made with ❤️ for SPEEDYFLOW**
