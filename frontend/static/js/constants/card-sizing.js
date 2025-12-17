/**
 * CARD SIZING CONSTANTS
 * =====================
 * Synchronized with CSS values in cards-modals.css
 * DO NOT modify without updating CSS file
 * 
 * CSS Reference: frontend/static/css/components/cards-modals.css lines 1070-1105
 */
// Define globally FIRST (before const declaration)
if (typeof window !== 'undefined') {
  window.CARD_SIZING = window.CARD_SIZING || {};
}
const CARD_SIZING = {
  // Transition count thresholds (from app.js logic)
  COMPACT_THRESHOLD: 2,    // 0-2 transitions = compact
  NORMAL_THRESHOLD: 4,     // 3-4 transitions = normal
  // 5+ transitions = expanded
  // CSS Class names (must match CSS file)
  CLASS_COMPACT: 'card-compact',
  CLASS_NORMAL: 'card-normal',
  CLASS_EXPANDED: 'card-expanded',
  // Heights (from CSS min-height properties)
  HEIGHT_COMPACT: 110,     // px
  HEIGHT_NORMAL: 160,      // px
  HEIGHT_EXPANDED: 220,    // px
  // Padding (from CSS padding property)
  PADDING_COMPACT: 12,     // px
  PADDING_NORMAL: 14,      // px
  PADDING_EXPANDED: 16,    // px
  // Get sizing config by transitions count
  getConfig: function(transitionCount) {
    if (transitionCount > this.NORMAL_THRESHOLD) {
      return {
        className: this.CLASS_EXPANDED,
        height: this.HEIGHT_EXPANDED,
        padding: this.PADDING_EXPANDED,
        label: 'expanded'
      };
    } else if (transitionCount > this.COMPACT_THRESHOLD) {
      return {
        className: this.CLASS_NORMAL,
        height: this.HEIGHT_NORMAL,
        padding: this.PADDING_NORMAL,
        label: 'normal'
      };
    } else {
      return {
        className: this.CLASS_COMPACT,
        height: this.HEIGHT_COMPACT,
        padding: this.PADDING_COMPACT,
        label: 'compact'
      };
    }
  },
  // Get CSS class for transitions count
  getClass: function(transitionCount) {
    return this.getConfig(transitionCount).className;
  },
  // Get height for transitions count
  getHeight: function(transitionCount) {
    return this.getConfig(transitionCount).height;
  },
  // Get padding for transitions count
  getPadding: function(transitionCount) {
    return this.getConfig(transitionCount).padding;
  },
  // Validate CSS matches (for debugging)
  validateCSS: function() {
    const compactCard = document.createElement('div');
    compactCard.className = 'issue-card card-compact';
    compactCard.style.display = 'none';
    document.body.appendChild(compactCard);
    const styles = window.getComputedStyle(compactCard);
    const cssHeight = parseInt(styles.minHeight);
    const cssPadding = parseInt(styles.paddingTop);
    document.body.removeChild(compactCard);
    return {
      heightMatch: cssHeight === this.HEIGHT_COMPACT,
      paddingMatch: cssPadding === this.PADDING_COMPACT,
      cssHeight: cssHeight,
      cssPadding: cssPadding,
      expectedHeight: this.HEIGHT_COMPACT,
      expectedPadding: this.PADDING_COMPACT
    };
  }
};
// Make globally available in browser - AFTER definition
if (typeof window !== 'undefined') {
  window.CARD_SIZING = CARD_SIZING;
}
// Export for Node.js/module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CARD_SIZING;
}
