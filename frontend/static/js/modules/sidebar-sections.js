/**
 * Sidebar Sections Module
 * Handles collapsible sections with localStorage state persistence
 * 
 * Features:
 * - Click to collapse/expand sections
 * - Save user preferences in localStorage
 * - Keyboard navigation (optional)
 * - Smooth animations
 */

import { logger } from '../utils/helpers.js';

const STORAGE_KEY = 'salesjira-sidebar-state';

/**
 * Initialize sidebar section toggles
 */
export function initSidebarSections() {
  setupToggleListeners();
  restoreCollapseState();
  logger.debug('📂 Sidebar sections initialized');
}

/**
 * Setup click listeners for section headers
 */
function setupToggleListeners() {
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSection(header);
    });

    // Add keyboard support (Enter or Space to toggle)
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        toggleSection(header);
      }
    });

    // Make headers focusable
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
  });
}

/**
 * Toggle section open/closed
 * @param {HTMLElement} header - Section header element
 */
export function toggleSection(header) {
  const section = header.closest('.sidebar-section');
  if (!section) return;

  const sectionId = section.id || generateSectionId(section);
  section.id = sectionId;

  const content = section.querySelector('.section-content');
  if (!content) return;

  const isCollapsed = header.classList.contains('collapsed');
  console.log(`🔧 Toggling ${sectionId}: currently ${isCollapsed ? 'collapsed' : 'expanded'}`);

  // Toggle classes
  header.classList.toggle('collapsed');
  content.classList.toggle('hidden');

  // Save state
  saveCollapseState(sectionId, !isCollapsed);

  logger.debug(`📂 Section toggled: ${sectionId} (now ${!isCollapsed ? 'collapsed' : 'expanded'})`);
}

/**
 * Restore collapse state from localStorage
 */
function restoreCollapseState() {
  try {
    const state = localStorage.getItem(STORAGE_KEY);
    if (!state) return;

    const collapsedSections = JSON.parse(state);

    document.querySelectorAll('.sidebar-section').forEach(section => {
      const sectionId = section.id || generateSectionId(section);
      section.id = sectionId;

      if (collapsedSections[sectionId]) {
        const header = section.querySelector('.section-header');
        const content = section.querySelector('.section-content');

        if (header && content) {
          header.classList.add('collapsed');
          content.classList.add('hidden');
        }
      }
    });

    logger.debug('📂 Sidebar state restored from localStorage');
  } catch (error) {
    logger.error(`Failed to restore sidebar state: ${error.message}`);
  }
}

/**
 * Save collapse state to localStorage
 * @param {string} sectionId - Section ID
 * @param {boolean} isCollapsed - Whether section is collapsed
 */
function saveCollapseState(sectionId, isCollapsed) {
  try {
    let state = {};
    const savedState = localStorage.getItem(STORAGE_KEY);

    if (savedState) {
      state = JSON.parse(savedState);
    }

    state[sectionId] = isCollapsed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    logger.error(`Failed to save sidebar state: ${error.message}`);
  }
}

/**
 * Generate unique section ID based on position and content
 * @param {HTMLElement} section - Section element
 * @returns {string} Generated ID
 */
function generateSectionId(section) {
  const index = Array.from(section.parentNode.children).indexOf(section);
  const titleElement = section.querySelector('.section-title');
  const title = titleElement ? titleElement.textContent.trim().toLowerCase().replace(/\s+/g, '-') : `section-${index}`;
  return `sidebar-${title}-${index}`;
}

/**
 * Collapse specific section by ID
 * @param {string} sectionId - Section ID
 */
export function collapseSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const header = section.querySelector('.section-header');
  if (!header || header.classList.contains('collapsed')) return;

  toggleSection(header);
}

/**
 * Expand specific section by ID
 * @param {string} sectionId - Section ID
 */
export function expandSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const header = section.querySelector('.section-header');
  if (!header || !header.classList.contains('collapsed')) return;

  toggleSection(header);
}

/**
 * Collapse all sections
 */
export function collapseAll() {
  document.querySelectorAll('.sidebar-section').forEach(section => {
    const header = section.querySelector('.section-header');
    if (header && !header.classList.contains('collapsed')) {
      toggleSection(header);
    }
  });
  logger.debug('📂 All sections collapsed');
}

/**
 * Expand all sections
 */
export function expandAll() {
  document.querySelectorAll('.sidebar-section').forEach(section => {
    const header = section.querySelector('.section-header');
    if (header && header.classList.contains('collapsed')) {
      toggleSection(header);
    }
  });
  logger.debug('📂 All sections expanded');
}

/**
 * Clear saved sidebar state
 */
export function clearSidebarState() {
  localStorage.removeItem(STORAGE_KEY);
  logger.debug('📂 Sidebar state cleared');
}

/**
 * Get current sidebar state
 * @returns {Object} State object with section IDs and collapsed status
 */
export function getSidebarState() {
  try {
    const state = localStorage.getItem(STORAGE_KEY);
    return state ? JSON.parse(state) : {};
  } catch (error) {
    logger.error(`Failed to get sidebar state: ${error.message}`);
    return {};
  }
}

export default {
  initSidebarSections,
  toggleSection,
  collapseSection,
  expandSection,
  collapseAll,
  expandAll,
  clearSidebarState,
  getSidebarState
};
