/**
 * Custom Fields Module
 * Handles rendering of expandable anchored custom fields with complete request information
 * 
 * Displays:
 * - Request Type (with description and icon)
 * - Current Status (with timeline)
 * - Contact Info (phone, email)
 * - Company/Product Info
 * - Geographic Info (country, region)
 * - Reporter/Informador
 */

import { escapeHTML } from '../utils/helpers.js';

/**
 * Render custom fields section for issue details
 * @param {Object} issue - Issue object with custom fields
 * @returns {string} HTML string for custom fields
 */
export function renderCustomFields(issue) {
  // Only display form data from description or custom fields
  if (!issue.description && !issue.customfield_10010) {
    return ''; // No custom fields to display
  }

  let html = '<div class="custom-fields-section">';
  
  // Display form data
  if (issue.description) {
    html += renderDescriptionFormData(issue.description, issue);
  }
  
  html += '</div>';
  
  // Schedule interactivity setup after render
  setTimeout(() => setupCustomFieldsInteractivity(), 100);
  
  return html;
}

/**
 * Parse and render description form data + custom fields as "Request Details (Form)"
 * Description may contain structured form fields, OR they may be in custom fields
 */
function renderDescriptionFormData(description, issue) {
  if (!description || typeof description !== 'string') {
    console.warn('renderDescriptionFormData: No valid description');
    return '';
  }

  console.log('renderDescriptionFormData: Processing description, length =', description.length);

  let html = '<div class="custom-field-item">';
  html += '<div class="custom-field-header" onclick="toggleCustomFieldContent(this)">';
  html += '<span class="custom-field-toggle">▼</span>';
  html += '<span class="custom-field-title">📝 Request Details (Form)</span>';
  html += '</div>';
  
  html += '<div class="custom-field-content">';

  let foundData = false;
  let itemsAdded = 0;

  // FIRST: Parse description for inline form fields (like MSM-6729)
  console.log('renderDescriptionFormData: Parsing description for inline fields');
  const lines = description.split('\n');

  for (let i = 0; i < Math.min(30, lines.length); i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines, wiki markup (||, {{, *, #, h), and lines that start with |
    if (!trimmed || trimmed.startsWith('||') || trimmed.startsWith('{{') || trimmed.startsWith('*') || trimmed.startsWith('#') || trimmed.startsWith('h') || trimmed.startsWith('|')) {
      continue;
    }

    // Look for "Key: Value" pattern
    if (trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0 && colonIdx < trimmed.length - 1) {
        const key = trimmed.substring(0, colonIdx).trim();
        const value = trimmed.substring(colonIdx + 1).trim();
        
        // Accept: short keys, non-empty values, non-URLs, and non-timestamps
        if (key.length > 0 && key.length < 150 && value.length > 0 && !value.startsWith('http') && !value.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          foundData = true;
          itemsAdded++;
          console.log(`renderDescriptionFormData: Added from description: ${key} = ${value}`);
          html += `
            <div class="custom-field-detail-item">
              <div class="custom-field-detail-label">${escapeHTML(key)}</div>
              <div class="custom-field-detail-value">${escapeHTML(value)}</div>
            </div>
          `;
        }
      }
    }
  }

  // SECOND: Add custom field values (like MSM-6810) - look for common form fields
  console.log('renderDescriptionFormData: Checking custom fields, issue keys =', issue ? Object.keys(issue).length : 'no issue');
  if (issue) {
    // DEBUG: Log ALL customfields in the issue object
    const allCustomFields = Object.keys(issue).filter(k => k.startsWith('customfield_'));
    console.log('renderDescriptionFormData: ALL customfields in issue:', allCustomFields);
    
    const formFieldMap = {
      // FORM FIELDS (Dropdowns)
      'customfield_10125': { label: 'Criticidad', type: 'dropdown', section: 'form' },
      'customfield_10156': { label: 'Tipo de Solicitud', type: 'dropdown', section: 'form' },
      'customfield_10168': { label: 'Área', type: 'dropdown', section: 'form' },
      'customfield_10169': { label: 'Plataforma', type: 'dropdown', section: 'form' },
      'customfield_10165': { label: 'País', type: 'dropdown', section: 'form' },
      'customfield_10166': { label: 'País (Alt)', type: 'dropdown', section: 'form' },
      'customfield_10167': { label: 'País/Código', type: 'dropdown', section: 'form' },
      
      // CONTACT & COMPANY INFO (Text)
      'customfield_10143': { label: 'Empresa', type: 'text', section: 'contact' },
      'customfield_10141': { label: 'Email', type: 'text', section: 'contact' },
      'customfield_10142': { label: 'Teléfono', type: 'text', section: 'contact' },
      'customfield_10144': { label: 'Producto', type: 'text', section: 'contact' },
      'customfield_10111': { label: 'Reportero', type: 'text', section: 'contact' },
      'customfield_10115': { label: 'Idioma', type: 'text', section: 'contact' },
      
      // SLA FIELDS (Objects - SLA Info)
      'customfield_10170': { label: 'SLA Incidente HUB', type: 'sla', section: 'sla' },
      'customfield_10176': { label: 'SLA Cierre Ticket', type: 'sla', section: 'sla' },
      'customfield_10181': { label: 'SLA Servicios Streaming', type: 'sla', section: 'sla' },
      'customfield_10182': { label: 'SLA Servicios Streaming (SR)', type: 'sla', section: 'sla' },
      'customfield_10187': { label: 'SLA Splunk (Incident)', type: 'sla', section: 'sla' },
      'customfield_10190': { label: 'SLA Soporte Aplicaciones', type: 'sla', section: 'sla' },
      'customfield_10259': { label: 'SLA War Room', type: 'sla', section: 'sla' },
    };

    for (const [fieldId, fieldConfig] of Object.entries(formFieldMap)) {
      const rawValue = issue[fieldId];
      console.log(`renderDescriptionFormData: Checking ${fieldId} (${fieldConfig.type}):`, rawValue);
      
      if (rawValue !== undefined && rawValue !== null) {
        let strValue = '';
        
        // Handle field based on type
        if (fieldConfig.type === 'dropdown') {
          // Dropdowns wrapped in {value: "...", name: "..."}
          if (typeof rawValue === 'object' && rawValue.value) {
            strValue = String(rawValue.value);
            console.log(`  ✓ Dropdown: extracted .value = "${strValue}"`);
          } else if (typeof rawValue === 'string') {
            strValue = rawValue;
          }
        } else if (fieldConfig.type === 'text') {
          // Text fields are plain strings
          if (typeof rawValue === 'string') {
            strValue = rawValue;
            console.log(`  ✓ Text: direct string = "${strValue}"`);
          } else if (typeof rawValue === 'object' && rawValue.value) {
            strValue = String(rawValue.value);
          } else {
            strValue = String(rawValue);
          }
        } else {
          // Fallback for unknown types
          if (typeof rawValue === 'object') {
            if (rawValue.value) {
              strValue = String(rawValue.value);
            } else if (rawValue.name) {
              strValue = String(rawValue.name);
            } else {
              strValue = JSON.stringify(rawValue).substring(0, 100);
            }
          } else {
            strValue = String(rawValue);
          }
        }
        
        console.log(`renderDescriptionFormData: Final value for ${fieldId}:`, strValue);
        
        // Only add if we have a non-empty, non-zero value
        if (strValue && strValue.length > 0 && strValue !== '0' && strValue !== '0.0' && strValue !== 'null' && strValue !== '{}') {
          foundData = true;
          itemsAdded++;
          console.log(`renderDescriptionFormData: ✓ ADDED custom field: ${fieldConfig.label} = ${strValue}`);
          html += `
            <div class="custom-field-detail-item">
              <div class="custom-field-detail-label">${escapeHTML(fieldConfig.label)}:</div>
              <div class="custom-field-detail-value">${escapeHTML(strValue)}</div>
            </div>
          `;
        }
      }
    }
    
    // BONUS: Add any OTHER customfields that have values but aren't in the map
    console.log('renderDescriptionFormData: Checking for unmapped customfields...');
    for (const fieldId of allCustomFields) {
      if (!formFieldMap[fieldId]) {  // NOT in our map
        const rawValue = issue[fieldId];
        if (rawValue !== undefined && rawValue !== null && rawValue !== '' && rawValue !== '{}' && rawValue !== '[]') {
          let strValue = '';
          if (typeof rawValue === 'string' && rawValue.length > 0) {
            strValue = rawValue;
          } else if (typeof rawValue === 'object' && rawValue.name) {
            strValue = String(rawValue.name);
          } else if (typeof rawValue === 'object' && rawValue.value) {
            strValue = String(rawValue.value);
          }
          
          if (strValue && strValue.length > 10) {  // Only if significant value
            foundData = true;
            itemsAdded++;
            const shortValue = strValue.length > 150 ? strValue.substring(0, 147) + '...' : strValue;
            console.log(`renderDescriptionFormData: ✓ Found unmapped field: ${fieldId} = ${shortValue}`);
            html += `
              <div class="custom-field-detail-item">
                <div class="custom-field-detail-label">${escapeHTML(fieldId)}:</div>
                <div class="custom-field-detail-value" style="white-space: pre-wrap; overflow-x: auto;">${escapeHTML(strValue)}</div>
              </div>
            `;
          }
        }
      }
    }
  }

  console.log(`renderDescriptionFormData: Total items added = ${itemsAdded}`);

  // If no data found, show preview
  if (!foundData) {
    const preview = description.substring(0, 500).replace(/\n\n+/g, '\n');
    html += `<div class="custom-field-detail-item"><p>${escapeHTML(preview)}...</p></div>`;
  }

  html += '</div>';
  html += '</div>';
  
  console.log('renderDescriptionFormData: Returning HTML');
  return html;
}

/**
 * Setup expand/collapse functionality for custom fields
 */
// Global function for inline onclick handlers
export function toggleCustomFieldContent(headerElement) {
  const item = headerElement.closest('.custom-field-item');
  if (item) {
    item.classList.toggle('expanded');
    const toggle = headerElement.querySelector('.custom-field-toggle');
    if (toggle) {
      toggle.textContent = item.classList.contains('expanded') ? '▼' : '▶';
    }
  }
}

// Make it globally available for onclick handlers
window.toggleCustomFieldContent = toggleCustomFieldContent;

export function setupCustomFieldsInteractivity() {
  document.querySelectorAll('.custom-field-item[data-expandable="true"]').forEach(item => {
    // Remove existing listeners
    const oldHeader = item.querySelector('.custom-field-header');
    if (oldHeader) {
      const newHeader = oldHeader.cloneNode(true);
      oldHeader.replaceWith(newHeader);
    }
    
    // Add click listener
    const header = item.querySelector('.custom-field-header');
    if (header) {
      header.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        item.classList.toggle('expanded');
      });
      header.style.cursor = 'pointer';
    }
  });
}

export default {
  renderCustomFields,
  setupCustomFieldsInteractivity
};
