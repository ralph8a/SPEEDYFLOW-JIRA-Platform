/**
 * SPEEDYFLOW - Theme Blocker
 * Prevents flash (parpadeo) when page loads by applying theme BEFORE render
 * This script MUST be inline in the <head> to run before body is rendered
 * 
 * The script does 3 things:
 * 1. Reads theme from localStorage immediately
 * 2. Applies correct body class before any CSS renders
 * 3. PREVENTS OTHER SCRIPTS from causing unnecessary re-renders
 */

(function() {
  // Get saved theme - defaults to 'light' if none found
  const savedTheme = localStorage.getItem('currentTheme') || localStorage.getItem('theme') || 'light';
  
  // Validate theme value
  const theme = ['dark', 'light', 'auto'].includes(savedTheme) ? savedTheme : 'light';
  
  // Handle 'auto' mode - check system preference
  let finalTheme = theme;
  if (theme === 'auto') {
    finalTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  // ⚡ CRITICAL: Apply theme to BOTH <html> and <body> IMMEDIATELY
  // This runs BEFORE any CSS is rendered
  document.documentElement.classList.remove('theme-light', 'theme-dark');
  document.documentElement.classList.add(`theme-${finalTheme}`);
  document.documentElement.setAttribute('data-theme', finalTheme);
  
  // Apply to body too if it exists (happens when script is in <head>)
  if (document.body) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${finalTheme}`);
    document.body.setAttribute('data-theme', finalTheme);
  }
  
  // Store the computed theme for other scripts
  window.__initialTheme = finalTheme;
  window.__themeAppliedAtLoad = true;
  
  // 🛑 PREVENT FLASH: Block theme changes during initial load only
  // After page is loaded, ThemeManager takes over
  window.__themeBlockerActive = true;
  
  // Disable blocker after page loads
  window.addEventListener('load', () => {
    setTimeout(() => {
      window.__themeBlockerActive = false;
      console.log('✓ Theme blocker disabled - ThemeManager now controls theme');
    }, 100);
  });
})();

/**
 * LISTEN FOR BODY READY - Ensure theme is applied
 * (in case this script runs before body exists)
 */
document.addEventListener('DOMContentLoaded', () => {
  const theme = window.__initialTheme || localStorage.getItem('currentTheme') || 'light';
  
  // Apply theme classes and data-theme attribute
  document.documentElement.classList.remove('theme-light', 'theme-dark');
  document.documentElement.classList.add(`theme-${theme}`);
  document.documentElement.setAttribute('data-theme', theme);
  
  // ⚡ SAFETY CHECK: Only apply to body if it exists
  if (document.body) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    document.body.setAttribute('data-theme', theme);
    console.log(`✓ Theme blocker applied: ${theme}`);
  } else {
    // Body doesn't exist yet - wait for it
    console.warn('⚠️ Body not ready, waiting...');
    requestAnimationFrame(() => {
      if (document.body) {
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${theme}`);
        document.body.setAttribute('data-theme', theme);
        console.log(`✓ Theme blocker applied (delayed): ${theme}`);
      }
    });
  }
});
