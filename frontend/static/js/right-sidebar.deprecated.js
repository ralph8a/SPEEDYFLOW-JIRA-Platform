/**
 * DEPRECATED: Right Sidebar Controller (archived copy)
 *
 * This file holds the full original implementation of the Right Sidebar.
 * It was moved here from `right-sidebar.js` during a refactor that replaces
 * the right sidebar with the BalancedView / Flowing footer UI. Keep this file
 * as a readable archive. Do NOT include it in production builds unless you
 * intentionally want to restore the old right-sidebar behavior.
 */

/* Archived implementation: start */

// Original right-sidebar implementation (archived)
// Copy below preserved for reference.

/*
Contents of original implementation:

*/

// ===== BEGIN COPIED IMPLEMENTATION =====

/**
 * right-sidebar.js (disabled)
 * The original implementation has been moved to `right-sidebar.deprecated.js`.
 * This file is intentionally left as a small stub to avoid parse/runtime
 * errors while the BalancedView replaces the old Right Sidebar functionality.
 */

console.log('⚠️ right-sidebar.js disabled: original content moved to right-sidebar.deprecated.js');

// No-op stubs exported to preserve integration points expected by other scripts
window.rightSidebar = {
    init: () => { /* disabled */ },
    open: () => { /* disabled */ },
    close: () => { /* disabled */ },
    setupCardHandlers: () => { /* disabled */ },
    switchPanel: () => { /* disabled */ },
    setupMentionSystem: () => { /* disabled */ },
    setupAttachmentsSystem: () => { /* disabled */ },
    setupCommentShortcuts: () => { /* disabled */ }
};

// Preserve global function names as harmless no-ops
window.openIssueDetails = window.openIssueDetails || function () { /* disabled */ };
window.closeSidebar = window.closeSidebar || function () { /* disabled */ };
window.initRightSidebar = window.initRightSidebar || function () { /* disabled */ };
window.setupMentionSystem = window.setupMentionSystem || function () { /* disabled */ };
window.setupIssueCardClickHandlers = window.setupIssueCardClickHandlers || function () { /* disabled */ };
window.setupAttachmentsSystem = window.setupAttachmentsSystem || function () { /* disabled */ };
window.setupCommentShortcuts = window.setupCommentShortcuts || function () { /* disabled */ };


// ===== SETUP COMMENT EVENT LISTENERS =====
function setupCommentEventListeners(issueKey) {
    if (window.commentsModule && typeof window.commentsModule.setupCommentEventListeners === 'function') {
        return window.commentsModule.setupCommentEventListeners(issueKey, { listSelector: '#commentsList', textareaSelector: '#commentText' });
    }
    console.warn('commentsModule not available - cannot setup comment event listeners');
}

// ===== POST COMMENT =====
function postComment(issueKey) {
    if (window.commentsModule && typeof window.commentsModule.postComment === 'function') {
        // default targets for right-sidebar
        return window.commentsModule.postComment(issueKey, { textareaSelector: '#commentText', internalCheckboxSelector: '#commentInternal', listSelector: '#commentsList', countSelector: '#commentCount', buttonSelector: '.btn-add-comment', visibilityLabelSelector: '.visibility-label' });
    }
    console.warn('commentsModule not available - cannot post comment');
}

// ===== CLOSE SIDEBAR =====
function closeSidebar() {
    const rightSidebar = document.getElementById('rightSidebar');
    const mainWrapper = document.querySelector('.main-wrapper');

    // Notify ML features about ticket leave (for cache save)
    if (window.commentSuggestionsUI && sidebarState.currentIssue) {
        window.commentSuggestionsUI.onTicketLeave();
    }

    // Add closing animation
    rightSidebar.classList.add('closing');

    // Remove classes after animation
    setTimeout(() => {
        rightSidebar.style.display = 'none';
        rightSidebar.classList.remove('closing');
        mainWrapper.classList.remove('sidebar-open');
        sidebarState.isOpen = false;
        sidebarState.currentIssue = null;
    }, 300);
}

// ===== EXTRACT FIELD VALUE FROM NESTED PATHS =====
function extractFieldValue(obj, paths) {
    if (!obj) return null;

    for (const path of paths) {
        const parts = path.split('.');
        let value = obj;

        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                value = null;
                break;
            }
        }

        // Extract value from object if needed
        if (value && typeof value === 'object') {
            value = value.value || value.name || null;
        }

        if (value !== null && value !== undefined && value !== '') {
            return value;
        }
    }

    return null;
}

// ===== POPULATE ALL FIELDS DYNAMICALLY =====
function populateAllFields(issue) {
    const fields = extractAllFields(issue);

    if (fields.length === 0) {
        document.getElementById('tab-essential').innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No fields</p>';
        return;
    }

    // Categorize fields by importance
    const essentialFields = [];
    const detailFields = [];
    const technicalFields = [];

    fields.forEach(field => {
        const priority = getFieldPriority(field.label);
        if (priority <= 15) {
            essentialFields.push(field);
        } else if (priority <= 100) {
            detailFields.push(field);
        } else {
            technicalFields.push(field);
        }
    });

    // Render each tab
    renderFieldsInTab('tab-essential', essentialFields);
    renderFieldsInTab('tab-details', detailFields);
    renderFieldsInTab('tab-technical', technicalFields);

    // Setup tab switching (ensure it's called)
    console.log('🎨 Setting up tab switching after render...');
    setTimeout(() => setupTabSwitching(), 100);
}

function renderFieldsInTab(tabId, fields) {
    const container = document.getElementById(tabId);
    if (!container) return;

    if (fields.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No fields in this category</p>';
        return;
    }

    let html = '<div class="all-fields-grid">';

    fields.forEach(field => {
        // Detectar si es campo con texto largo (expandible con click)
        // Incluye description, notas, análisis, y cualquier texto > 200 caracteres
        const isLongTextField = field.key === 'description' ||
            field.key === 'customfield_10149' ||
            field.key === 'customfield_10151' ||
            field.label.toLowerCase().includes('description') ||
            field.label.toLowerCase().includes('descripcion') ||
            field.label.toLowerCase().includes('summary') ||
            field.label.toLowerCase().includes('notes') ||
            field.label.toLowerCase().includes('notas') ||
            field.label.toLowerCase().includes('comments') ||
            field.label.toLowerCase().includes('details') ||
            field.label.toLowerCase().includes('análisis') ||
            field.label.toLowerCase().includes('resolución') ||
            (field.type === 'text' && String(field.value).length > 200);

        let itemClass = 'field-item';
        let valueClass = 'field-value';

        // Todos los campos largos usan el mismo sistema (full-width + expandible)
        if (isLongTextField) {
            itemClass += ' field-item-full';
            valueClass += ' field-value-long';
        }

        html += `
      <div class="${itemClass}" data-field="${field.key}">
        <div class="field-label">${field.label}</div>
        <div class="${valueClass}">${formatFieldValue(field.value, field.type, field.issueKey)}</div>
      </div>
    `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function setupTabSwitching() {
    const tabs = document.querySelectorAll('.fields-tab');
    const contents = document.querySelectorAll('.fields-tab-content');

    // Remove old listeners by cloning (prevent duplicate listeners)
    tabs.forEach((tab, index) => {
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);

        newTab.addEventListener('click', () => {
            const targetTab = newTab.dataset.tab;

            console.log('🔄 Switching to tab:', targetTab);

            // Remove active class from all tabs and contents
            document.querySelectorAll('.fields-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.fields-tab-content').forEach(c => c.classList.remove('active'));

            // Add active to selected
            newTab.classList.add('active');
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
                console.log('✅ Tab activated:', targetTab);
            } else {
                console.error('❌ Tab content not found:', `tab-${targetTab}`);
            }
        });
    });

    console.log('✅ Tab switching initialized for', tabs.length, 'tabs');
}

function getFieldPriority(label) {
    const priorityMap = {
        'Description': 0, '📝 Description': 0,
        '🚨 Criticidad': 1, '🎫 Tipo de Solicitud': 2, '📂 Área': 3,
        '💻 Plataforma': 4, '🏢 Empresa': 5, '📦 Producto': 6,
        '✉️ Email': 10, '📱 Phone': 11, '🌎 País': 12, '📞 País/Código': 13,
        '⚡ Priority': 20, '✔️ Resolution': 21, '📅 Due Date': 22, '✅ Resolution Date': 23,
        '📝 Notas/Análisis': 30, '✅ Resolución': 31,
        '🎯 Request Type': 200, '🌐 Language': 201, '📁 Issue Category': 202,
    };
    return priorityMap[label] || 100;
}

// ===== EXTRACT ALL RELEVANT FIELDS =====
function extractAllFields(issue) {
    const fields = [];
    const seenKeys = new Set(); // Track already added fields

    const excludeFields = new Set([
        // Technical/structural fields to hide (keep everything else visible in All Fields)
        'transitions', 'comments', 'attachment', 'worklog',
        'expand', 'self', 'id', 'changelog', 'operations', 'editmeta', 'names', 'schema',
        'statuscategory', 'statusCategory', 'lastViewed', 'watches',
        'issuelinks', 'subtasks', 'parent', 'aggregatetimespent', 'aggregatetimeoriginalestimate',
        'aggregatetimeestimate', 'aggregateprogress', 'progress', 'workratio', 'avatarUrls',
        'timetracking', 'security', 'votes',

        // Redundant fields (already shown in kanban card or sidebar header)
        'key', 'summary', 'status', 'assignee', 'reporter', 'created', 'updated',
        'issuetype',

        // Numeric fields that are always 0.0 (unused SLA/tracking fields)
        'customfield_10027', 'customfield_10028', 'customfield_10029', 'customfield_10030',
        'customfield_10041', 'customfield_10042', 'customfield_10196', 'customfield_10197',
        'customfield_10198', 'customfield_10205', 'customfield_10206', 'customfield_10218',
        'customfield_10221', 'customfield_10224', 'customfield_10227', 'customfield_10230',
        'customfield_10233', 'customfield_10236', 'customfield_10237', 'customfield_10238',
        'customfield_10239', 'customfield_10240', 'customfield_10241', 'customfield_10242',
        'customfield_10249', 'customfield_10279', 'customfield_10280', 'customfield_10289',
        'customfield_10292', 'customfield_10295', 'customfield_10301', 'customfield_10341',
        'customfield_10677', 'customfield_10717', 'customfield_10718', 'customfield_10719',
        'customfield_10720', 'customfield_10733', 'customfield_10734',

        // Empty/unused system fields
        'customfield_10002', 'customfield_10019', 'customfield_10124',
        'customfield_10148', 'customfield_10157', 'customfield_10159'
    ]);

    // Check if value is meaningful (not null, empty, or just structural)
    const hasValue = (val) => {
        if (val === null || val === undefined) return false;
        if (val === '' && typeof val === 'string') return false;
        if (Array.isArray(val) && val.length === 0) return false;
        if (typeof val === 'object') {
            // Description with ADF content
            if (val.content && Array.isArray(val.content)) return true;
            // SLA objects with ongoingCycle have millis data - KEEP them
            if (val.ongoingCycle && (val.ongoingCycle.elapsedTime || val.ongoingCycle.remainingTime)) return true;
            // Request Type object - KEEP it
            if (val._links && val._links.self && val._links.self.includes('requesttype')) return true;
            // Other SLA structure without data - skip
            if (val._links || (val.completedCycles !== undefined && val.ongoingCycle === undefined) || val.slaDisplayFormat) return false;
            // Empty objects
            if (Object.keys(val).length === 0) return false;
            // Has meaningful data
            if (val.name || val.displayName || val.value) return true;
        }
        if (typeof val === 'number' && val === 0) return false;
        return true;
    };

    // Field mappings from CUSTOM_FIELDS_REFERENCE.json
    const fieldMappings = {
        // Standard JIRA fields
        'priority': '⚡ Priority',
        'reporter': '📢 Reporter',
        'labels': '🏷️ Labels',
        'components': '🧩 Components',
        'fixVersions': '🔖 Fix Versions',
        'affectsVersions': '🐛 Affects Versions',
        'environment': '🖥️ Environment',
        'duedate': '📅 Due Date',
        'resolutiondate': '✅ Resolution Date',
        'timespent': '⏱️ Time Spent',
        'timeestimate': '⏰ Time Estimate',
        'timeoriginalestimate': '🕐 Original Estimate',
        'project': '📁 Project',
        'creator': '👤 Creator',
        'resolution': '✔️ Resolution',

        // Form fields (Request-type form fields)
        'customfield_10125': '🚨 Criticidad',
        'customfield_10156': '🎫 Tipo de Solicitud',
        'customfield_10168': '📂 Área',
        'customfield_10169': '💻 Plataforma',
        'customfield_10143': '🏢 Empresa',
        'customfield_10144': '📦 Producto',
        'customfield_10149': '📝 Notas/Análisis',
        'customfield_10151': '✅ Resolución',
        'customfield_10165': '🌎 País',
        'customfield_10167': '📞 País/Código',

        // Contact info fields
        'customfield_10141': '✉️ Email',
        'customfield_10142': '📱 Phone',
        'customfield_10111': '👤 Reporter/Informador',

        // System fields
        'customfield_10010': '🎯 Request Type',
        'customfield_10061': '📋 Status Transition Log',
        'customfield_10110': '📁 Issue Category',
        'customfield_10115': '🌐 Language',
        'customfield_10166': '🌍 Country (Alternative)',
        'customfield_10024': '🕐 Timestamp',

        // SLA fields (links to SLA definitions)
        'customfield_10170': '⏱️ SLA\'s Incidente HUB',
        'customfield_10176': '🔒 Cierre Ticket',
        'customfield_10181': '📺 SLA\'s Servicios Streaming',
        'customfield_10182': '📺 SLA\'s Servicios Streaming (SR)',
        'customfield_10183': '📊 SLA\'s Solicitud de CDRs Captura Logs',
        'customfield_10184': '💰 SLA\'s Cotización Orden de Compra',
        'customfield_10185': '🐛 SLA\'s Errores Pruebas de Integración',
        'customfield_10186': '🔄 SLA\'s Actualización de SDK',
        'customfield_10187': '📈 SLA\'s Splunk',
        'customfield_10190': '🛠️ SLA\'s Soporte Aplicaciones',
        'customfield_10259': '🚨 SLA War Room',
        'customfield_11957': '💚 Salud de Servicios',

        // Other common fields
        'customfield_10020': '🏃 Sprint',
        'customfield_10016': '📊 Story Points',
        'customfield_10037': '📖 Epic Link'
    };

    // SLA custom field IDs (primary and secondary)
    const slaFieldIds = [
        'customfield_10170', // SLA's Incidente HUB
        'customfield_10176', // Cierre Ticket (secondary)
        'customfield_10181', // SLA's Servicios Streaming
        'customfield_10182', // SLA's Servicios Streaming (SR)
        'customfield_10183', // SLA's Solicitud de CDRs
        'customfield_10184', // SLA's Cotización Orden de Compra
        'customfield_10185', // SLA's Errores Pruebas de Integración
        'customfield_10186', // SLA's Actualización de SDK
        'customfield_10187', // SLA's Splunk
        'customfield_10190', // SLA's Soporte Aplicaciones
        'customfield_10259', // SLA War Room
        'customfield_11957'  // Salud de Servicios
    ];

    // Helper to extract fields from an object
    const extractFields = (obj, checkExcluded = false) => {
        if (!obj) return;
        Object.entries(obj).forEach(([key, value]) => {
            if ((checkExcluded && excludeFields.has(key)) || !hasValue(value) || seenKeys.has(key)) return;

            // 🔍 FILTER SLA FIELDS: Only show SLAs with active ongoingCycle
            if (slaFieldIds.includes(key)) {
                // Skip SLA fields that don't have an ongoingCycle
                if (!value || typeof value !== 'object' || !value.ongoingCycle) {
                    console.log(`⏭️ Skipping ${key} - no active ongoingCycle`);
                    return;
                }
                console.log(`✅ Including ${key} - has active ongoingCycle:`, value.name);

                // Mark secondary SLA (Cierre Ticket - customfield_10176)
                if (key === 'customfield_10176') {
                    value._isSecondarySLA = true;
                }
            }

            fields.push({
                label: fieldMappings[key] || humanizeFieldName(key),
                value,
                type: detectFieldType(value),
                key
            });
            seenKeys.add(key);
        });
    };

    // Add description explicitly first (priority 0)
    if (issue.fields?.description || issue.description) {
        const desc = issue.fields?.description || issue.description;
        if (hasValue(desc)) {
            fields.push({
                label: '📝 Description',
                value: desc,
                type: detectFieldType(desc),
                key: 'description'
            });
            seenKeys.add('description');
        }
    }

    // Extract from multiple sources
    extractFields(issue.fields, true); // Check excluded fields
    extractFields(issue.custom_fields);
    extractFields(issue.serviceDesk?.requestFieldValues);

    // Extract from Service Desk currentStatus
    if (issue.serviceDesk && issue.serviceDesk.currentStatus) {
        const status = issue.serviceDesk.currentStatus;
        if (hasValue(status.status) && !seenKeys.has('serviceDesk.currentStatus')) {
            fields.push({
                label: '🔄 Service Desk Status',
                value: status.status,
                type: 'string',
                key: 'serviceDesk.currentStatus'
            });
            seenKeys.add('serviceDesk.currentStatus');
        }
    }

    // Extract SLA data with millis
    if (issue.slaData && Array.isArray(issue.slaData)) {
        issue.slaData.forEach((sla, idx) => {
            if (!sla || !sla.name) return;

            const key = `sla_${idx}_${sla.name}`;
            if (seenKeys.has(key)) return;

            fields.push({
                label: `⏱️ ${sla.name}`,
                value: sla,
                type: 'sla',
                key
            });
            seenKeys.add(key);
        });
    }

    // Total: ${fields.length} fields extracted

    // Define priority order for important fields
    const priorityOrder = {
        // Tier 0: Description (most important, full width)
        'Description': 0,
        '📝 Description': 0,

        // Tier 1: Critical business info (top)
        '🚨 Criticidad': 1,
        '🎫 Tipo de Solicitud': 2,
        '📂 Área': 3,
        '💻 Plataforma': 4,
        '🏢 Empresa': 5,
        '📦 Producto': 6,

        // Tier 2: Contact & location
        '✉️ Email': 10,
        '📱 Phone': 11,
        '🌎 País': 12,
        '📞 País/Código': 13,

        // Tier 3: Status & resolution
        '⚡ Priority': 20,
        '✔️ Resolution': 21,
        '📅 Due Date': 22,
        '✅ Resolution Date': 23,

        // Tier 4: Notes & analysis (show full width)
        '📝 Notas/Análisis': 30,
        '✅ Resolución': 31,

        // Tier 5: Other fields
        // (unlisted fields get 100)

        // Tier 6: System/technical fields (bottom)
        '🎯 Request Type': 200,
        '🌐 Language': 201,
        '📁 Issue Category': 202,
    };

    // Sort by priority
    fields.sort((a, b) => {
        const aPriority = priorityOrder[a.label] || 100;
        const bPriority = priorityOrder[b.label] || 100;

        if (aPriority !== bPriority) {
            return aPriority - bPriority;
        }

        // Same priority: alphabetical
        return a.label.localeCompare(b.label);
    });

    return fields;
}

// ===== HUMANIZE FIELD NAME =====
function humanizeFieldName(fieldName) {
    return fieldName
        .replace(/^customfield_\d+/, 'Custom Field')
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/\b\w/g, l => l.toUpperCase());
}

// ===== DETECT FIELD TYPE =====
function detectFieldType(value) {
    if (Array.isArray(value)) return 'array';
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
        // Description with ADF content
        if (value.content && Array.isArray(value.content)) return 'description';
        // Request Type (customfield_10010)
        if (value._links && value._links.self && value._links.self.includes('requesttype')) return 'request_type';
        // SLA objects with ongoing cycle and millis data
        if (value.ongoingCycle && value.ongoingCycle.elapsedTime) return 'sla';
        // Other SLA structure objects
        if (value._links || value.completedCycles !== undefined || value.slaDisplayFormat) return 'sla_empty';
        // User objects
        if (value.displayName && value.accountId) return 'user';
        if (value.displayName) return 'user';
        // Select/dropdown values
        if (value.value && !value.id) return 'select';
        // Named objects (project, components, etc)
        if (value.name && value.id) return 'object';
        if (value.name) return 'object';
        return 'object';
    }
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
        if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) return 'date';
        if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'date';
        if (value.length > 200) return 'text';
        return 'string';
    }
    return 'unknown';
}

// ===== FORMAT FIELD VALUE =====
function formatFieldValue(value, type, issueKey) {
    if (!value && value !== 0 && value !== false) return '—';

    switch (type) {
        case 'description':
            // Atlassian Document Format (ADF) - extract text content
            if (value.content && Array.isArray(value.content)) {
                let text = '';
                const extractText = (node) => {
                    if (node.type === 'text') {
                        text += node.text;
                    } else if (node.content) {
                        node.content.forEach(extractText);
                    }
                };
                value.content.forEach(extractText);
                const escaped = text.trim()
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\n/g, '<br>');
                return `<div class="field-text-long">${escaped || '—'}</div>`;
            }
            return String(value);

        case 'request_type':
            // Request Type - create button to customer portal
            const requestTypeName = value.name || 'View Request';
            const portalUrl = value._links?.web || '#';
            return `<a href="${portalUrl}" target="_blank" class="request-type-button" title="Open in Customer Portal">
                <span class="icon">🎫</span>
                <span class="text">${requestTypeName}</span>
                <span class="external">↗</span>
              </a>`;

        case 'sla':
            // SLA objects with ongoing cycle - show elapsed and remaining millis
            if (value.ongoingCycle) {
                const elapsed = value.ongoingCycle.elapsedTime;
                const remaining = value.ongoingCycle.remainingTime;
                const paused = value.ongoingCycle.paused || false;
                const breached = value.ongoingCycle.breached || false;

                const elapsedMs = elapsed?.millis || 0;
                const remainingMs = remaining?.millis || 0;

                const elapsedHrs = (elapsedMs / (1000 * 60 * 60)).toFixed(1);
                const remainingHrs = (remainingMs / (1000 * 60 * 60)).toFixed(1);

                // Check if this is marked as secondary SLA (by field ID customfield_10176)
                const slaName = value.name || 'SLA';
                const isSecondarySLA = value._isSecondarySLA === true;

                const pausedBadge = paused ? '<span style="color: #f59e0b; font-weight: bold;"> ⏸️ PAUSED</span>' : '';
                const secondaryBadge = isSecondarySLA ? '<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; margin-left: 4px;">⚠️ FALLBACK</span>' : '';
                const breachedBadge = breached ? '<span style="color: #ef4444; font-weight: bold;"> 🔴 BREACHED</span>' : '';

                const statusColor = breached ? '#ef4444' : (remainingMs < 0 ? '#ef4444' : '#10b981');
                const nameColor = isSecondarySLA ? '#f59e0b' : (breached ? '#ef4444' : '#1e293b');

                return `<div style="font-size: 11px;">
          <strong style="color: ${nameColor};">${slaName}</strong>${secondaryBadge}${pausedBadge}${breachedBadge}<br>
          <span style="color: #3b82f6;">⏱️ Elapsed: ${elapsedHrs}h (${elapsedMs.toLocaleString()}ms)</span><br>
          <span style="color: ${statusColor};">⏰ Remaining: ${remainingHrs}h (${remainingMs.toLocaleString()}ms)</span>
          ${isSecondarySLA ? '<br><span style="color: #f59e0b; font-size: 10px;">⚠️ No primary SLA available for this ticket type</span>' : ''}
        </div>`;
            }
            return value.name || 'SLA Object';

        case 'sla_empty':
            // Empty SLA structure - skip
            return '—';

        case 'user':
            return value.displayName || value.name || value.emailAddress || '—';

        case 'select':
            return value.value || value.name || '—';

        case 'array':
            if (value.length === 0) return '—';
            return value.map(item => {
                if (typeof item === 'object') {
                    return item.name || item.value || item.displayName || JSON.stringify(item);
                }
                return item;
            }).join(', ');

        case 'date':
            return formatDate(value);

        case 'boolean':
            return value ? '✅ Yes' : '❌ No';

        case 'number':
            return value.toLocaleString();

        case 'text':
            // Mostrar TODO el texto sin truncar
            const escaped = String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            return escaped;

        case 'object':
            if (value.name) return value.name;
            if (value.displayName) return value.displayName;
            if (value.value) return value.value;
            // Try to show something meaningful
            const str = JSON.stringify(value);
            if (str.length < 50) return str;
            return str.substring(0, 80) + '...';

        default:
            return String(value);
    }
}

// ===== FORMAT DATE =====
function formatDate(dateString) {
    if (!dateString || dateString === '—') return '—';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateString;
    }
}

// ===== FORMAT COMMENT TIME (relative) =====
function formatCommentTime(dateString) {
    if (window.commentsModule && typeof window.commentsModule.formatCommentTime === 'function') {
        return window.commentsModule.formatCommentTime(dateString);
    }
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return dateString;
    }
}

// ===== RENDER ATTACHMENTS =====
function renderAttachments(issue) {
    const attachmentsSection = document.getElementById('attachmentsSection');
    const attachmentsContainer = document.getElementById('existingAttachmentsContainer');
    const attachmentCountLabel = document.getElementById('attachmentCountLabel');

    if (!attachmentsSection || !attachmentsContainer) return;

    // Extract attachments from issue.fields.attachment (JIRA API v3 standard location)
    let attachments = [];

    if (issue.fields && Array.isArray(issue.fields.attachment)) {
        attachments = issue.fields.attachment;
    } else if (Array.isArray(issue.attachment)) {
        attachments = issue.attachment;
    } else if (Array.isArray(issue.attachments)) {
        attachments = issue.attachments;
    }

    if (!attachments || attachments.length === 0) {
        attachmentsSection.style.display = 'none';
        return;
    }

    // Show section and update count
    attachmentsSection.style.display = 'block';
    attachmentCountLabel.textContent = `(${attachments.length})`;

    // Render attachments list
    let html = '<div class="attachments-grid">';

    attachments.forEach((attachment, index) => {
        const filename = attachment.filename || attachment.name || `attachment_${index}`;
        const size = formatFileSize(attachment.size);
        const created = formatDate(attachment.created);
        const author = attachment.author?.displayName || attachment.author || 'Unknown';
        const url = attachment.content || attachment.url || '#';
        const thumbnail = attachment.thumbnail || null;
        const mimeType = attachment.mimeType || 'application/octet-stream';

        // Determine if it's an image and should show preview
        const isImage = mimeType.startsWith('image/');

        // Determine icon based on MIME type (only for non-images)
        let icon = SVGIcons.file({ size: 18, className: 'attachment-icon-svg' });
        // Future: map specific mime -> different icons; fallback to file icon

        html += `
      <div class="attachment-card">
        <div class="attachment-icon">
          ${isImage && thumbnail ?
                `<img src="${thumbnail}" alt="${filename}" class="attachment-thumbnail" onclick="window.open('${url}', '_blank')" style="cursor: pointer;">` :
                icon
            }
        </div>
        <div class="attachment-details">
          <a href="${url}" target="_blank" class="attachment-filename" title="${filename}">
            ${filename}
          </a>
          <div class="attachment-meta">
            <span class="attachment-size">${size}</span>
            <span class="attachment-separator">•</span>
            <span class="attachment-author">${author}</span>
          </div>
          <div class="attachment-date">${created}</div>
        </div>
        <a href="${url}" download="${filename}" class="attachment-download" title="Download">
          ${SVGIcons.download({ size: 18, className: 'attachment-download-svg' })}
        </a>
      </div>
    `;
    });

    html += '</div>';
    attachmentsContainer.innerHTML = html;
}

// ===== INTEGRATION WITH KANBAN CARDS =====
function setupIssueCardClickHandlers() {
    console.log('🔧 [Setup] ===== EXECUTING setupIssueCardClickHandlers =====');

    // Setup details buttons with proper drag and drop compatibility
    const detailsButtons = document.querySelectorAll('.issue-details-btn');
    console.log('📋 [Setup] Found', detailsButtons.length, 'details buttons');

    detailsButtons.forEach((btn, index) => {
        const issueKey = btn.getAttribute('data-issue-key');
        console.log(`🔧 [Setup] Configuring button ${index + 1}:`, issueKey);

        // Force styling
        btn.style.cursor = 'pointer';
        btn.style.pointerEvents = 'auto';
        btn.style.zIndex = '9999';
        btn.style.position = 'relative';

        // Remove any existing listeners
        btn.onclick = null;

        // Use click with delay to avoid conflict with drag events
        btn.addEventListener('click', function (e) {
            console.log('🎯 [CLICK] Details button clicked for:', issueKey);

            // Check if we're in the middle of a drag operation
            if (window.dragTransitionVertical && window.dragTransitionVertical.isDragging) {
                console.log('⚠️ [CLICK] Drag in progress, ignoring button click');
                return;
            }

            // Stop propagation to prevent card events
            e.stopPropagation();
            e.preventDefault();

            // Small delay to ensure it's a deliberate click, not part of drag
            setTimeout(() => {
                if (typeof openIssueDetails === 'function') {
                    console.log('✅ [CLICK] Calling openIssueDetails for:', issueKey);
                    openIssueDetails(issueKey);
                } else {
                    console.error('❌ [CLICK] openIssueDetails function not found');
                }
            }, 50);
        });

        console.log('✅ [Setup] Button configured with mousedown handler for:', issueKey);
    });
}

// ===== SETUP MENTIONS SYSTEM =====
function setupMentionSystem() {
    console.log('🔧 [Mentions] Setting up mention system...');

    // Check if sidebar exists
    const rightSidebar = document.getElementById('rightSidebar');
    console.log('📍 [Mentions] rightSidebar exists:', !!rightSidebar);

    // Search for elements globally
    const mentionBtn = document.getElementById('mentionBtn');
    const mentionsDropdown = document.getElementById('mentionsDropdown');
    const mentionsSearch = document.getElementById('mentionsSearch');
    const mentionsList = document.getElementById('mentionsList');
    const commentText = document.getElementById('commentText');

    console.log('📍 [Mentions] mentionBtn found:', !!mentionBtn);
    console.log('📍 [Mentions] mentionsDropdown found:', !!mentionsDropdown);
    console.log('📍 [Mentions] mentionsSearch found:', !!mentionsSearch);
    console.log('📍 [Mentions] mentionsList found:', !!mentionsList);
    console.log('📍 [Mentions] commentText found:', !!commentText);

    // List all elements in the sidebar
    if (rightSidebar) {
        const allIds = rightSidebar.querySelectorAll('[id]');
        console.log('📊 [Mentions] IDs in sidebar:', Array.from(allIds).map(el => el.id));
    }

    // Also try searching within sidebar specifically
    if (rightSidebar && !mentionBtn) {
        console.log('🔍 [Mentions] Searching within sidebar...');
        const btnInSidebar = rightSidebar.querySelector('#mentionBtn');
        console.log('📍 [Mentions] mentionBtn in sidebar:', !!btnInSidebar);
    }

    if (!mentionBtn || !mentionsDropdown) {
        console.warn('⚠️ [Mentions] Required elements not found - aborting setup');
        console.log('Full document structure check:');
        console.log('mentionBtn in doc:', document.getElementById('mentionBtn'));
        console.log('mentionsDropdown in doc:', document.getElementById('mentionsDropdown'));

        // Debug: check if they're maybe in the sidebar but with different query
        if (rightSidebar) {
            console.log('🔍 [Mentions] Attempting querySelectorAll...');
            const btnByClass = rightSidebar.querySelector('.comment-toolbar-btn');
            console.log('📍 Found button by class:', !!btnByClass, btnByClass?.id);
            const dropdownByClass = rightSidebar.querySelector('.mentions-dropdown');
            console.log('📍 Found dropdown by class:', !!dropdownByClass, dropdownByClass?.id);
        }
        return;
    }

    console.log('✅ [Mentions] Elements found, attaching listeners...');

    // Clone the button to remove all previous event listeners
    const newMentionBtn = mentionBtn.cloneNode(true);
    mentionBtn.parentNode.replaceChild(newMentionBtn, mentionBtn);

    // Get reference to the new button
    const freshMentionBtn = document.getElementById('mentionBtn');
    const mentionsDropdownFresh = document.getElementById('mentionsDropdown');
    const mentionsSearchFresh = document.getElementById('mentionsSearch');

    freshMentionBtn.addEventListener('click', () => {
        console.log('🖱️ [Mentions] Mention button clicked');
        const isOpen = mentionsDropdownFresh.classList.contains('show');
        if (isOpen) {
            mentionsDropdownFresh.classList.remove('show');
        } else {
            mentionsDropdownFresh.classList.add('show');
            mentionsSearchFresh.focus();
            loadAvailableUsers();
        }
    });

    mentionsSearchFresh.addEventListener('input', (e) => {
        filterMentions(e.target.value);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.mentions-dropdown') && !e.target.closest('#mentionBtn')) {
            mentionsDropdownFresh.classList.remove('show');
        }
    });

    console.log('✅ [Mentions] Setup complete');
}

function loadAvailableUsers() {
    const mentionsList = document.getElementById('mentionsList');

    if (!sidebarState.currentIssue) {
        console.warn('⚠️ [Mentions] No current issue - cannot load users');
        return;
    }

    const issueKey = sidebarState.currentIssue.key;
    console.log('🔄 [Mentions] Fetching users for issue:', issueKey);

    // Fetch from API endpoint
    fetch(`/api/v2/issues/${issueKey}/mentions/users`)
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            console.log('✅ [Mentions] Loaded users:', data.users?.length || 0);

            if (!data.users || data.users.length === 0) {
                mentionsList.innerHTML = '<div class="mention-item" style="color: #999; padding: 8px;">No users available</div>';
                return;
            }

            // Map API users to display format
            const users = data.users.map(user => ({
                id: user.accountId || user.username,
                name: user.displayName || user.username || 'Unknown',
                email: user.emailAddress || ''
            }));

            mentionsList.innerHTML = users.map((user, idx) => `
        <div class="mention-item" data-mention="${user.name}" data-id="${user.id}" data-index="${idx}">
          <strong>${user.name}</strong>
          ${user.email ? `<div style="font-size: 10px; opacity: 0.6;">${user.email}</div>` : ''}
        </div>
      `).join('');

            // Attach click handlers to each user
            document.querySelectorAll('.mention-item').forEach(item => {
                item.addEventListener('click', () => {
                    const userName = item.dataset.mention;
                    const commentText = document.getElementById('commentText');
                    if (commentText) {
                        commentText.value += `@${userName} `;
                        commentText.focus();
                    }
                    const dropdown = document.getElementById('mentionsDropdown');
                    if (dropdown) dropdown.classList.remove('show');
                });
            });
        })
        .catch(err => {
            console.error('❌ [Mentions] Error loading users:', err);
            mentionsList.innerHTML = `<div class="mention-item" style="color: #f00; padding: 8px;">Error loading users</div>`;
        });
}

function filterMentions(query) {
    const mentionItems = document.querySelectorAll('.mention-item');
    mentionItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query.toLowerCase()) ? 'block' : 'none';
    });
}

// ===== SETUP ATTACHMENTS SYSTEM =====
function setupAttachmentsSystem() {
    console.log('🔧 [Attachments] Setting up attachments system...');

    const rightSidebar = document.getElementById('rightSidebar');
    console.log('📍 [Attachments] rightSidebar exists:', !!rightSidebar);

    const attachBtn = document.getElementById('attachBtn');
    const attachmentsPreview = document.getElementById('attachmentsPreview');
    const attachmentsList = document.getElementById('attachmentsList');

    console.log('📍 [Attachments] attachBtn found:', !!attachBtn);
    console.log('📍 [Attachments] attachmentsPreview found:', !!attachmentsPreview);
    console.log('📍 [Attachments] attachmentsList found:', !!attachmentsList);

    // Try searching within sidebar
    if (rightSidebar && !attachBtn) {
        console.log('🔍 [Attachments] Searching within sidebar...');
        const btnInSidebar = rightSidebar.querySelector('#attachBtn');
        const previewInSidebar = rightSidebar.querySelector('#attachmentsPreview');
        console.log('📍 [Attachments] attachBtn in sidebar:', !!btnInSidebar);
        console.log('📍 [Attachments] attachmentsPreview in sidebar:', !!previewInSidebar);
    }

    if (!attachBtn || !attachmentsPreview) {
        console.warn('⚠️ [Attachments] Required elements not found - aborting setup');
        console.log('Full document structure check:');
        console.log('attachBtn in doc:', document.getElementById('attachBtn'));
        console.log('attachmentsPreview in doc:', document.getElementById('attachmentsPreview'));

        // Debug: try finding by class
        if (rightSidebar) {
            console.log('🔍 [Attachments] Attempting querySelectorAll...');
            const buttons = rightSidebar.querySelectorAll('.comment-toolbar-btn');
            console.log('📍 Found buttons by class:', buttons.length);
            buttons.forEach((btn, idx) => {
                console.log(`  Button ${idx}:`, btn.id, btn.textContent);
            });
        }
        return;
    }

    console.log('✅ [Attachments] Elements found, attaching listeners...');

    // Clone the button to remove all previous event listeners
    const newAttachBtn = attachBtn.cloneNode(true);
    attachBtn.parentNode.replaceChild(newAttachBtn, attachBtn);

    // Get reference to the new button
    const freshAttachBtn = document.getElementById('attachBtn');

    freshAttachBtn.addEventListener('click', () => {
        console.log('🖱️ [Attachments] Attach button clicked');
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = '*/*';

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            console.log('📂 [Attachments] Files selected:', files.length);
            addAttachments(files);
            attachmentsPreview.classList.add('show');
        });

        fileInput.click();
    });

    console.log('✅ [Attachments] Setup complete');
}

// Delegated click: if user clicks attach button but setup failed earlier, retry setup
document.addEventListener('click', (e) => {
    const target = e.target.closest('#attachBtn, .comment-toolbar-btn');
    if (!target) return;
    // If attachmentsPreview exists but has no children, try setupAttachmentsSystem
    const preview = document.getElementById('attachmentsPreview');
    const list = document.getElementById('attachmentsList');
    if ((preview && (!preview.classList.contains('show') || (list && list.children.length === 0))) || !document.getElementById('attachBtn')) {
        try {
            setTimeout(() => { if (typeof setupAttachmentsSystem === 'function') setupAttachmentsSystem(); }, 80);
        } catch (err) { /* silent */ }
    }
});

let attachedFiles = [];

function addAttachments(files) {
    const attachmentsList = document.getElementById('attachmentsList');
    const attachmentsPreview = document.getElementById('attachmentsPreview');

    attachedFiles.push(...files);

    let html = '';
    attachedFiles.forEach((file, idx) => {
        html += `
      <div class="attachment-item">
        <span class="attachment-name" title="${file.name}">📄 ${file.name}</span>
        <button class="attachment-remove" data-index="${idx}">✕</button>
      </div>
    `;
    });

    attachmentsList.innerHTML = html;

    // Setup remove buttons
    document.querySelectorAll('.attachment-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index);
            attachedFiles.splice(idx, 1);
            if (attachedFiles.length === 0) {
                attachmentsPreview.classList.remove('show');
            } else {
                addAttachments([]);
            }
        });
    });
}

// ===== SETUP COMMENT KEYBOARD SHORTCUTS =====
function setupCommentShortcuts() {
    if (window.commentsModule && typeof window.commentsModule.setupCommentShortcuts === 'function') {
        return window.commentsModule.setupCommentShortcuts();
    }
}

// ===== EXPORT FOR USE =====
window.rightSidebar = {
    init: initRightSidebar,
    open: openIssueDetails,
    close: closeSidebar,
    setupCardHandlers: setupIssueCardClickHandlers,
    switchPanel,
    setupMentionSystem,
    setupAttachmentsSystem,
    setupCommentShortcuts
};

// Export functions globally for direct access
console.log('🌍 [Global] Exporting right-sidebar functions to window...');
window.openIssueDetails = openIssueDetails;
window.closeSidebar = closeSidebar;
window.initRightSidebar = initRightSidebar;
window.setupMentionSystem = setupMentionSystem;
window.setupIssueCardClickHandlers = setupIssueCardClickHandlers;
console.log('✅ [Global] Functions exported:', {
    openIssueDetails: typeof window.openIssueDetails,
    setupIssueCardClickHandlers: typeof window.setupIssueCardClickHandlers
});
window.setupAttachmentsSystem = setupAttachmentsSystem;
window.setupCommentShortcuts = setupCommentShortcuts;

// Hook into app.js render functions
const originalRenderKanban = window.renderKanban;
window.renderKanban = function () {
    originalRenderKanban?.call(this);
    setupIssueCardClickHandlers();
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🔧 [Right Sidebar] DOMContentLoaded - Initializing...');
        initRightSidebar();
        console.log('✅ [Right Sidebar] initRightSidebar() completed');

        // Initialize mentions system
        if (window.MentionSystem && !window.mentionSystem) {
            window.mentionSystem = new MentionSystem();
        }

        // Simple global backup (no stopPropagation)
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.issue-details-btn');
            if (btn && !btn.onclick) { // Only if no onclick set
                const issueKey = btn.getAttribute('data-issue-key');

                if (issueKey) {
                    console.log('🎯 [Global Backup] Click on details button:', issueKey);

                    if (typeof openIssueDetails === 'function') {
                        openIssueDetails(issueKey);
                    } else {
                        console.error('❌ [Global Backup] openIssueDetails function not found');
                    }
                }
            }
        });

    }, 100);
});

// Also call immediately if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('📄 [Right Sidebar] DOM still loading, will init on DOMContentLoaded');
} else {
    console.log('📄 [Right Sidebar] DOM already loaded, initializing immediately...');
}

// ===== FIELD EXPANSION REMOVED =====
// Text fields now display complete content by default without truncation

// Also call immediately if DOM is already loaded (continued from above)
if (document.readyState !== 'loading') {
    setTimeout(() => {
        initRightSidebar();
        console.log('✅ [Right Sidebar] Immediate init completed');

        // Initialize tab switching after sidebar is ready
        console.log('📋 Initializing tabs immediately...');
        setTimeout(() => setupTabSwitching(), 100);
    }, 100);
}

// Initialize tab switching early (for static HTML tabs)
setTimeout(() => {
    console.log('📋 Early tab initialization...');
    setupTabSwitching();
}, 500);

// ===== END COPIED IMPLEMENTATION =====

/* Archived implementation: end */

