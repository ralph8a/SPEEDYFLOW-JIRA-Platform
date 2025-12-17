/* Emoji -> SVG replacer
   Runs on DOMContentLoaded, replaces common emoji characters inside text nodes
   with SVGIcons.render(...) markup. Adds class 'svg-assemble' for entry animation.
*/
(function(){
  const mapping = {
    '📎': 'paperclip',
    '📄': 'file',
    '📝': 'file',
    '⬇️': 'download',
    '⬇': 'download',
    '✕': 'close',
    '❌': 'error',
    '⚡': 'zap',
    '🎯': 'target',
    '🎨': 'star',
    '🔍': 'search',
    '✅': 'success',
    '⚠️': 'alert',
    '⚠': 'alert',
    '📊': 'grid',
    '📦': 'file',
    '📌': 'target',
    '✨': 'star',
    '🔧': 'settings',
    '🔔': 'bell'
  };
  function shouldSkip(node) {
    if (!node.parentElement) return true;
    const tag = node.parentElement.tagName;
    return ['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','TEXTAREA'].includes(tag);
  }
  function replaceInElement(el) {
    // Only process elements with text nodes
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(textNode => {
      if (shouldSkip(textNode)) return;
      let txt = textNode.nodeValue;
      if (!txt) return;
      let changed = false;
      let parts = [];
      let lastIndex = 0;
      // Iterate over mapping keys and replace occurrences
      const emojis = Object.keys(mapping).filter(e => txt.indexOf(e) !== -1);
      if (emojis.length === 0) return;
      // We will build an HTML string replacing emojis
      let html = txt;
      emojis.forEach(emoji => {
        const iconName = mapping[emoji];
        const svg = (typeof window.SVGIcons !== 'undefined') ? window.SVGIcons.render(iconName, { size: 14, className: 'svg-assemble' }) : '';
        // Replace all occurrences
        html = html.split(emoji).join(svg);
        changed = true;
      });
      if (changed) {
        const span = document.createElement('span');
        span.innerHTML = html;
        textNode.parentElement.replaceChild(span, textNode);
      }
    });
  }
  function runReplacer() {
    try {
      // Target many common UI containers to limit scope
      const selectors = ['.stat-badge', '.toolbar-icon', '.toggle-icon', '.brand-icon', '.filter-icon', '.theme-btn-icon', '.attachment-name', '.attachment-filename', '.context-icon', '.suggestion', '.ml-suggestion-checkbox', '.ticket-description-section', 'button', 'a', 'span', 'label'];
      const processed = new Set();
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          if (!processed.has(el)) { replaceInElement(el); processed.add(el); }
        });
      });
      // Also run on body as fallback (but skip heavy nodes)
      replaceInElement(document.body);
      console.log('✅ Emoji->SVG replacement completed');
    } catch (e) {
      console.warn('Emoji replacer failed:', e);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runReplacer);
  } else {
    runReplacer();
  }
})();
