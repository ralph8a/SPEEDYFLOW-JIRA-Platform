/**
 * Sidebar Section Renderer
 * Organizes issue details into clean, collapsible sections
 * 
 * Sections:
 * 1. Status & SLA (Most important - always expanded)
 * 2. People (Who's involved)
 * 3. Timeline (When)
 * 4. Custom Fields (Project-specific)
 * 5. Description (Optional - collapsed by default)
 */

import { escapeHTML } from '../utils/helpers.js';

/**
 * Helper: Get status badge HTML
 */
function getStatusBadge(status) {
  if (!status) return '<span class="status-badge todo">Unknown</span>';

  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('closed') || s.includes('resolved')) {
    return `<span class="status-badge status-done">✅ ${escapeHTML(status)}</span>`;
  }
  if (s.includes('progress') || s.includes('working')) {
    return `<span class="status-badge status-in-progress">🔄 ${escapeHTML(status)}</span>`;
  }
  return `<span class="status-badge todo">📋 ${escapeHTML(status)}</span>`;
}

/**
 * Helper: Get priority badge HTML
 */
function getPriorityBadge(priority) {
  if (!priority) return '';

  const p = priority.toLowerCase();
  if (p.includes('highest') || p.includes('critical')) {
    return `<span class="priority-badge priority-highest">🔴 ${escapeHTML(priority)}</span>`;
  }
  if (p.includes('high')) {
    return `<span class="priority-badge priority-high">🟠 ${escapeHTML(priority)}</span>`;
  }
  if (p.includes('medium')) {
    return `<span class="priority-badge priority-medium">🟡 ${escapeHTML(priority)}</span>`;
  }
  if (p.includes('low')) {
    return `<span class="priority-badge priority-low">🟢 ${escapeHTML(priority)}</span>`;
  }
  return `<span class="priority-badge priority-medium">${escapeHTML(priority)}</span>`;
}

/**
 * Helper: Get severity badge HTML
 */
function getSeverityBadge(severity) {
  if (!severity) return '<span class="severity-badge severity-unknown">Unknown</span>';

  let value = '';
  let label = '';

  if (typeof severity === 'object') {
    value = (severity.value || severity.name || 'Unknown').toLowerCase();
    label = severity.value || severity.name || 'Unknown';
  } else {
    value = String(severity).toLowerCase();
    label = String(severity);
  }

  return `<span class="severity-badge severity-${value}">${escapeHTML(label)}</span>`;
}

/**
 * Helper: Format date
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Render Status & SLA Section
 */
export function renderStatusSLASection(issue) {
  const slaDisplay = window.UI_UTILS?.getSLADisplayWithTime?.(issue.customfield_10170) || 
                    '<span class="sla-badge sla-na">N/A</span>';

  return `
    <div class="sidebar-section">
      <div class="section-header">
        <span class="toggle-icon">▼</span>
        <span class="section-title">
          <span class="section-title-icon">📋</span>
          <span>Status & SLA</span>
        </span>
        <span class="item-count">4</span>
      </div>
      <div class="section-content">
        <div class="field-row">
          <span class="field-label">Status</span>
          <span class="field-value">${getStatusBadge(issue.status)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Priority</span>
          <span class="field-value">${getPriorityBadge(issue.priority)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">SLA</span>
          <span class="field-value">${slaDisplay}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Severity</span>
          <span class="field-value">${getSeverityBadge(issue.customfield_10125)}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render People Section
 */
export function renderPeopleSection(issue) {
  return `
    <div class="sidebar-section">
      <div class="section-header">
        <span class="toggle-icon">▼</span>
        <span class="section-title">
          <span class="section-title-icon">👥</span>
          <span>People</span>
        </span>
        <span class="item-count">2</span>
      </div>
      <div class="section-content">
        <div class="field-row">
          <span class="field-label">Assignee</span>
          <span class="field-value">👤 ${escapeHTML(issue.assignee || 'Unassigned')}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Reporter</span>
          <span class="field-value">👤 ${escapeHTML(issue.reporter || 'Unknown')}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Timeline Section
 */
export function renderTimelineSection(issue) {
  return `
    <div class="sidebar-section">
      <div class="section-header">
        <span class="toggle-icon">▼</span>
        <span class="section-title">
          <span class="section-title-icon">📅</span>
          <span>Timeline</span>
        </span>
        <span class="item-count">3</span>
      </div>
      <div class="section-content">
        <div class="field-row">
          <span class="field-label">Created</span>
          <span class="field-value">${escapeHTML(formatDate(issue.created))}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Updated</span>
          <span class="field-value">${escapeHTML(formatDate(issue.updated))}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Due Date</span>
          <span class="field-value">${issue.duedate ? escapeHTML(formatDate(issue.duedate)) : 'N/A'}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Description Section with parsed form fields
 */
export function renderDescriptionSection(issue) {
  // If no description, don't show anything
  if (!issue.description) {
    return '';
  }

  const descriptionText = typeof issue.description === 'string' ? issue.description : '';
  if (!descriptionText.trim()) {
    return '';
  }

  // Escape HTML in description
  const escapedDesc = escapeHTML(descriptionText).replace(/\n/g, '<br>');

  return `
    <div class="sidebar-section sidebar-section-fullwidth description-section" id="sidebar-description">
      <div class="section-header">
        <span class="toggle-icon">▼</span>
        <span class="section-title">
          <span class="section-title-icon">📝</span>
          <span>Description</span>
        </span>
      </div>
      <div class="section-content description-content">
        <div class="description-text">
          ${escapedDesc}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Portal Form Section - Shows form fields fetched from portal URL
 * Each ticket has a unique portal form with different fields
 * - Small fields: 2-column layout (FIRST, alphabetically sorted)
 * - Large fields: Full-width layout (LAST, at the end)
 * - Keeps ALL fields including empty ones (API deduplicates)
 */
export function renderPortalFormSection(issue) {
  // Check if portal_form data exists
  if (!issue.portal_form) {
    return '';
  }

  const portalForm = issue.portal_form;
  let formFields = portalForm.form_fields || [];

  if (formFields.length === 0) {
    return '';
  }

  // Remove duplicates by FIELD NAME (not value) - same field appearing twice
  const seenFieldNames = new Set();
  const uniqueFields = [];
  
  formFields.forEach((field, index) => {
    const fieldName = (field.field_name || '').trim().toLowerCase();
    
    // Skip if we've already seen this field name
    if (seenFieldNames.has(fieldName)) {
      return;
    }
    
    seenFieldNames.add(fieldName);
    uniqueFields.push(field);
  });

  if (uniqueFields.length === 0) {
    return '';
  }

  // Categorize fields into small and large
  const smallFields = [];  // < 50 chars
  const largeFields = [];  // >= 50 chars

  uniqueFields.forEach((field) => {
    const fieldValue = String(field.value || '').trim();
    
    // If contains newlines or is long, it's large
    if (fieldValue.includes('\n') || fieldValue.length >= 50) {
      largeFields.push(field);
    } else {
      smallFields.push(field);
    }
  });

  // Sort small fields alphabetically by field_name
  smallFields.sort((a, b) => {
    const nameA = (a.field_name || '').toLowerCase();
    const nameB = (b.field_name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Large fields keep original order (no sorting)
  // They will appear at the end regardless of alphabetical order

  // Build HTML for small fields (2-column grid, alphabetically sorted)
  let smallFieldsHTML = '';
  if (smallFields.length > 0) {
    smallFieldsHTML = smallFields.map((field) => {
      const fieldId = field.field_id || `field_small_${Math.random()}`;
      const fieldName = field.field_name || field.name || 'Unknown';
      const fieldValue = String(field.value || '').trim();
      
      const escapedName = escapeHTML(fieldName);
      const displayValue = fieldValue === '' ? '(empty)' : escapeHTML(fieldValue);
      
      return `
        <div class="portal-field-small">
          <div class="portal-field-label">${escapedName}</div>
          <div class="portal-field-value">${displayValue}</div>
        </div>
      `;
    }).join('');
  }

  // Build HTML for large fields (full-width, shown at the END)
  let largeFieldsHTML = '';
  if (largeFields.length > 0) {
    largeFieldsHTML = largeFields.map((field) => {
      const fieldId = field.field_id || `field_large_${Math.random()}`;
      const fieldName = field.field_name || field.name || 'Unknown';
      const fieldValue = String(field.value || '').trim();
      
      const escapedName = escapeHTML(fieldName);
      const displayValue = fieldValue === '' ? '(empty)' : escapeHTML(fieldValue);
      
      return `
        <div class="portal-field-large">
          <div class="portal-field-label-large">${escapedName}</div>
          <div class="portal-field-value-large">${displayValue}</div>
        </div>
      `;
    }).join('');
  }

  const totalFields = smallFields.length + largeFields.length;

  return `
    <div class="sidebar-section sidebar-section-fullwidth" id="sidebar-portal-form">
      <div class="section-header collapsed">
        <span class="toggle-icon">▼</span>
        <span class="section-title">
          <span class="section-title-icon">📋</span>
          <span>Portal Form</span>
        </span>
        <span class="item-count">${totalFields}</span>
      </div>
      <div class="section-content portal-form-fields hidden">
        ${smallFieldsHTML}
        ${largeFieldsHTML}
      </div>
    </div>
  `;
}


/**
 * Render SLA Assignment Section (Smart Matched SLA)
 */
export function renderSmartSLASection(issue) {
  // This container will be populated by slaDisplay module
  return `
    <div class="sidebar-section sidebar-section-sla" id="sidebar-smart-sla">
      <div class="section-header">
        <span class="toggle-icon">▼</span>
        <span class="section-title">
          <span class="section-title-icon">⏱️</span>
          <span>Smart SLA Assignment</span>
        </span>
      </div>
      <div class="section-content">
        <div class="sla-container"></div>
      </div>
    </div>
  `;
}

/**
 * Render all sidebar sections
 */
export function renderAllSidebarSections(issue) {
  return `
    <div class="sidebar-sections">
      ${renderStatusSLASection(issue)}
      ${renderPeopleSection(issue)}
      ${renderTimelineSection(issue)}
      
      <!-- Workflow Button: Fills empty space in the grid -->
      <div class="sidebar-section workflow-section">
        <button type="button" class="sidebar-workflow-button" onclick="app.showWorkflowMenu('${issue.key}')">
          <span class="icon">➜</span>
          <span>Workflow</span>
        </button>
        <div class="action-dropdown">
          <div class="transitions-menu"></div>
        </div>
      </div>
    </div>

    <!-- Smart SLA Assignment: Shows single best-matched SLA -->
    ${renderSmartSLASection(issue)}

    <!-- Description Section: Full width, always expanded -->
    ${renderDescriptionSection(issue)}

    <!-- Portal Form: Shown AFTER sidebar-sections (full width, collapsed by default) -->
    ${renderPortalFormSection(issue)}
  `;
}

export default {
  renderStatusSLASection,
  renderPeopleSection,
  renderTimelineSection,
  renderPortalFormSection,
  renderDescriptionSection,
  renderSmartSLASection,
  renderAllSidebarSections
};

