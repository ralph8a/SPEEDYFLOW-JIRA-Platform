// attachments-module.js
// Lightweight attachments helper module used by multiple UI entrypoints (footer, sidebar, etc.)
// Exposes both ES exports and a global `window.attachmentsModule` for non-module consumers.

/**
 * Extract attachments array from various issue shapes
 */
function _extractAttachments(issue) {
    return issue?.fields?.attachment || issue.attachments || issue.serviceDesk?.requestFieldValues?.attachments || [];
}

/**
 * Compute a deterministic list of id keys (url|filename) for dedupe and hashing
 */
export function computeAttachmentsIdKeys(issue) {
    const attachments = _extractAttachments(issue) || [];
    const seen = new Set();
    const idKeys = [];
    attachments.forEach(att => {
        const url = att.content || att.self || att.url || (att.id ? `/api/issues/${issue.key}/attachments/${att.id}` : '') || '';
        const filename = att.filename || att.name || att.displayName || 'attachment';
        const idKey = String(url || filename).trim();
        if (!idKey || seen.has(idKey)) return;
        seen.add(idKey);
        idKeys.push(idKey);
    });
    return idKeys;
}

/**
 * Build attachments DOM nodes (full items and/or compact thumbs).
 * opts: { includeItems: true, includeThumbs: true }
 */
export function buildAttachmentsHTML(issue, opts = {}) {
    const includeItems = opts.includeItems !== false;
    const includeThumbs = opts.includeThumbs !== false;
    const attachments = _extractAttachments(issue) || [];
    const frag = includeItems ? document.createDocumentFragment() : null;
    const thumbFrag = includeThumbs ? document.createDocumentFragment() : null;
    const items = [];
    const thumbs = [];
    if (!attachments || attachments.length === 0) return { frag, thumbFrag, items, thumbs, hash: '' };

    const idList = [];
    const seen = new Set();
    attachments.forEach(att => {
        const url = att.content || att.self || att.url || (att.id ? `/api/issues/${issue.key}/attachments/${att.id}` : '') || '';
        const filename = att.filename || att.name || att.displayName || 'attachment';
        const idKey = String(url || filename).trim();
        if (!idKey || seen.has(idKey)) return;
        seen.add(idKey);
        idList.push(idKey);

        const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(filename) || (att.mimeType && att.mimeType.startsWith('image/')) || /\.(png|jpe?g|gif|webp|svg)$/i.test(String(url || ''));

        if (includeItems) {
            const item = document.createElement('div');
            item.className = 'attachment-item';
            if (isImage) {
                const aThumb = document.createElement('a');
                aThumb.className = 'attachment-thumb';
                aThumb.href = url; aThumb.target = '_blank'; aThumb.rel = 'noopener noreferrer';

                const img = document.createElement('img');
                img.className = 'attachment-img';
                img.src = url; img.alt = filename;
                aThumb.appendChild(img);
                item.appendChild(aThumb);

                const meta = document.createElement('div');
                meta.className = 'attachment-meta';
                const link = document.createElement('a');
                link.className = 'attachment-link';
                link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.download = '';
                link.textContent = filename; meta.appendChild(link);

                const dl = document.createElement('a');
                dl.className = 'attachment-download-btn';
                dl.href = url; dl.target = '_blank'; dl.rel = 'noopener noreferrer'; dl.download = ''; dl.title = 'Download'; dl.textContent = '⬇';
                meta.appendChild(dl);
                item.appendChild(meta);
            } else {
                const link = document.createElement('a');
                link.className = 'attachment-link';
                link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
                link.textContent = filename; item.appendChild(link);

                const dl = document.createElement('a');
                dl.className = 'attachment-download-btn attachment-download-btn--inline';
                dl.href = url; dl.target = '_blank'; dl.rel = 'noopener noreferrer'; dl.download = ''; dl.title = 'Download'; dl.textContent = '⬇';
                item.appendChild(dl);
            }
            items.push(item);
            if (frag) frag.appendChild(item);
        }

        if (includeThumbs) {
            if (isImage) {
                const t = document.createElement('img');
                t.className = 'attachment-thumb-compact attachment-thumb-compact--image';
                t.title = filename; t.src = url;
                t.addEventListener('click', () => window.open(url, '_blank'));
                thumbs.push(t); if (thumbFrag) thumbFrag.appendChild(t);
            } else {
                const short = filename.length > 10 ? filename.slice(0, 8) + '…' : filename;
                const t = document.createElement('div');
                t.className = 'attachment-thumb-compact attachment-thumb-compact--file';
                t.title = filename; t.textContent = short;
                t.addEventListener('click', () => window.open(url, '_blank'));
                thumbs.push(t); if (thumbFrag) thumbFrag.appendChild(t);
            }
        }
    });

    const hash = idList.join('|');
    return { frag, thumbFrag, items, thumbs, hash };
}

/**
 * Render full attachment items into a container with dedupe caching via dataset.
 * Returns: { rendered: boolean, hash }
 */
export function renderFullItemsInto(container, issue) {
    if (!container) return { rendered: false, hash: '' };
    const idKeys = computeAttachmentsIdKeys(issue);
    const hash = idKeys.join('|');
    try {
        if (container.dataset.attachmentsIssue === issue.key && container.dataset.attachmentsHash === hash) return { rendered: false, hash };
    } catch (e) { /* ignore dataset read errors */ }

    const { frag, items } = buildAttachmentsHTML(issue, { includeItems: true, includeThumbs: false });
    while (container.firstChild) container.removeChild(container.firstChild);
    if (frag) container.appendChild(frag);
    try { container.dataset.attachmentsHash = hash; container.dataset.attachmentsIssue = issue.key; } catch (e) { /* ignore */ }
    return { rendered: true, hash };
}

/**
 * Render compact thumbnails into a container with dedupe caching via dataset.
 * Returns: { rendered: boolean, hash }
 */
export function renderThumbsInto(container, issue) {
    if (!container) return { rendered: false, hash: '' };
    const idKeys = computeAttachmentsIdKeys(issue);
    const hash = idKeys.join('|');
    try {
        if (container.dataset.attachmentsIssue === issue.key && container.dataset.attachmentsHash === hash) return { rendered: false, hash };
    } catch (e) { /* ignore */ }

    const { thumbFrag, thumbs } = buildAttachmentsHTML(issue, { includeItems: false, includeThumbs: true });
    while (container.firstChild) container.removeChild(container.firstChild);
    if (thumbFrag && thumbFrag.childNodes && thumbFrag.childNodes.length) container.appendChild(thumbFrag);
    else if (thumbs && thumbs.length) thumbs.forEach(t => { try { container.appendChild(t.cloneNode ? t.cloneNode(true) : t); } catch (e) { /* ignore */ } });

    try { container.dataset.attachmentsHash = hash; container.dataset.attachmentsIssue = issue.key; } catch (e) { /* ignore */ }
    return { rendered: true, hash };
}

// Expose a global for non-module consumers
try {
    if (typeof window !== 'undefined') {
        window.attachmentsModule = window.attachmentsModule || {};
        window.attachmentsModule.buildAttachmentsHTML = buildAttachmentsHTML;
        window.attachmentsModule.computeAttachmentsIdKeys = computeAttachmentsIdKeys;
        window.attachmentsModule.renderFullItemsInto = renderFullItemsInto;
        window.attachmentsModule.renderThumbsInto = renderThumbsInto;
    }
} catch (e) { /* ignore */ }

export default {
    buildAttachmentsHTML,
    computeAttachmentsIdKeys,
    renderFullItemsInto,
    renderThumbsInto
};