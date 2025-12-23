// attachments-module.js

/**
 * Build attachments HTML (thumbnails + list) for an issue.
 * @param {Object} issue - The issue object containing attachment data.
 * @returns {Object} - A document fragment for thumbnails and full items.
 */
export function buildAttachmentsHTML(issue) {
    const attachments = issue?.fields?.attachment || issue.attachments || issue.serviceDesk?.requestFieldValues?.attachments || [];
    const frag = document.createDocumentFragment();
    const thumbFrag = document.createDocumentFragment();
    if (!attachments || attachments.length === 0) return { frag, thumbFrag };

    attachments.forEach(att => {
        const url = att.content || att.self || att.url || (`/api/issues/${issue.key}/attachments/${att.id}`);
        const filename = att.filename || att.name || att.displayName || 'attachment';
        const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(filename) || (att.mimeType && att.mimeType.startsWith('image/'));

        const item = document.createElement('div');
        item.className = 'attachment-item';

        if (isImage) {
            const aThumb = document.createElement('a');
            aThumb.className = 'attachment-thumb'; aThumb.href = url; aThumb.target = '_blank'; aThumb.rel = 'noopener noreferrer';
            const img = document.createElement('img'); img.src = url; img.alt = filename; img.style.maxWidth = '120px'; img.style.maxHeight = '90px'; img.style.borderRadius = '6px'; img.style.display = 'block';
            aThumb.appendChild(img);
            item.appendChild(aThumb);

            const meta = document.createElement('div'); meta.style.display = 'flex'; meta.style.gap = '6px'; meta.style.alignItems = 'center'; meta.style.marginTop = '6px';
            const link = document.createElement('a'); link.className = 'attachment-link'; link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.download = '';
            link.textContent = filename;
            meta.appendChild(link);
            const dl = document.createElement('a'); dl.className = 'attachment-download-btn'; dl.href = url; dl.target = '_blank'; dl.rel = 'noopener noreferrer'; dl.download = ''; dl.title = 'Download'; dl.style.textDecoration = 'none'; dl.textContent = '⬇';
            meta.appendChild(dl);
            item.appendChild(meta);
        }

        frag.appendChild(item);
    });

    return { frag, thumbFrag };
}

/**
 * Render attachments for a specific container.
 * @param {HTMLElement} container - The container to render attachments into.
 * @param {Object} issue - The issue object containing attachment data.
 */
export function renderAttachments(container, issue) {
    const { frag, thumbFrag } = buildAttachmentsHTML(issue);
    if (!frag && !thumbFrag) {
        while (container.firstChild) container.removeChild(container.firstChild);
        return;
    }

    while (container.firstChild) container.removeChild(container.firstChild);
    if (thumbFrag) container.appendChild(thumbFrag);
    if (frag) container.appendChild(frag);
}