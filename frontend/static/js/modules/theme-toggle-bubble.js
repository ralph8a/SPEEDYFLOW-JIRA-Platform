/**
 * Theme Toggle Bubble Module
 * Floating bubble for theme switching with emoji
 */

const ThemeToggleBubble = (() => {
  let currentTheme = 'light'; // Default theme
  
  /**
   * Initialize theme toggle bubble
   */
  const init = () => {
    loadThemePreference();
    setupBubble();
    applyTheme();
  };

  /**
   * Setup bubble event listeners
   */
  const setupBubble = () => {
    const bubble = document.getElementById('themeToggleBubble');
    if (bubble) {
      bubble.addEventListener('click', toggleTheme);
    }
  };

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    animateBubble();
  };

  /**
   * Set theme
   * @param {string} theme - 'light' or 'dark'
   */
  const setTheme = (theme) => {
    currentTheme = theme;
    applyTheme();
    saveThemePreference();
    updateTooltip();
  };

  /**
   * Apply theme to document
   */
  const applyTheme = () => {
    // Remove all theme classes
    document.body.classList.remove('theme-light', 'theme-dark');
    
    // Add new theme class
    document.body.classList.add(`theme-${currentTheme}`);
    
    // Update emoji
    updateEmoji();
  };

  /**
   * Update emoji based on theme
   */
  const updateEmoji = () => {
    const emoji = document.getElementById('themeToggleEmoji');
    if (emoji) {
      emoji.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    }
  };

  /**
   * Update tooltip text
   */
  const updateTooltip = () => {
    const tooltip = document.getElementById('themeToggleTooltip');
    if (tooltip) {
      const nextTheme = currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
      tooltip.textContent = `Switch to ${nextTheme}`;
    }
  };

  /**
   * Animate bubble on click
   */
  const animateBubble = () => {
    const bubble = document.getElementById('themeToggleBubble');
    if (bubble) {
      bubble.classList.add('switching');
      setTimeout(() => {
        bubble.classList.remove('switching');
      }, 600);
    }
  };

  /**
   * Save theme preference to localStorage
   */
  const saveThemePreference = () => {
    try {
      localStorage.setItem('salesjira_theme', currentTheme);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
  };

  /**
   * Load theme preference from localStorage
   */
  const loadThemePreference = () => {
    try {
      const saved = localStorage.getItem('salesjira_theme');
      if (saved) {
        currentTheme = saved;
      } else {
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          currentTheme = 'dark';
        }
      }
    } catch (e) {
      console.warn('Failed to load theme preference:', e);
    }
  };

  /**
   * Get current theme
   * @returns {string}
   */
  const getTheme = () => {
    return currentTheme;
  };

  /**
   * Check if dark mode is enabled
   * @returns {boolean}
   */
  const isDarkMode = () => {
    return currentTheme === 'dark';
  };

  // Public API
  return {
    init,
    toggle: toggleTheme,
    setTheme,
    getTheme,
    isDarkMode
  };
})();

// Export for use in app
window.ThemeToggleBubble = ThemeToggleBubble;

// Auto-initialize when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => ThemeToggleBubble.init(), 50);
  });
} else {
  // DOM already loaded
  setTimeout(() => ThemeToggleBubble.init(), 50);
}
