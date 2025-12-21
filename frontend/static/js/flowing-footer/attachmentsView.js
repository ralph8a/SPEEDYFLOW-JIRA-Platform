// attachmentsView.js
// Lógica modular y desacoplada para renderizar y gestionar attachments en la vista balanceada y footer

function _getAttachments(issue) {
    return issue?.fields?.attachment || issue.attachments || issue.serviceDesk?.requestFieldValues?.attachments || [];
}

function _createAttachmentItem(att, issueKey) {
    const url = att.content || att.self || att.url || (`/api/issues/${issueKey}/attachments/${att.id}`);
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
        const t = document.createElement('div'); t.className = 'attachment-thumb-compact'; t.title = filename; t.style.width = '40px'; t.style.height = '30px'; t.style.borderRadius = '6px'; t.style.overflow = 'hidden'; t.style.display = 'inline-flex'; t.style.alignItems = 'center'; t.style.justifyContent = 'center'; t.style.cursor = 'pointer';
        t.addEventListener('click', () => window.open(url, '_blank'));
        const timg = document.createElement('img'); timg.src = url; timg.alt = filename; timg.style.width = '100%'; timg.style.height = '100%'; timg.style.objectFit = 'cover'; t.appendChild(timg);
        return { item, thumb: t };
    } else {
        const link = document.createElement('a'); link.className = 'attachment-link'; link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.style.display = 'inline-flex'; link.style.alignItems = 'center'; link.style.gap = '8px'; link.style.padding = '6px 8px'; link.style.borderRadius = '6px'; link.style.background = 'rgba(0,0,0,0.04)'; link.style.color = 'inherit'; link.style.textDecoration = 'none';
        link.textContent = filename;
        item.appendChild(link);
        const dl = document.createElement('a'); dl.className = 'attachment-download-btn'; dl.href = url; dl.target = '_blank'; dl.rel = 'noopener noreferrer'; dl.download = ''; dl.title = 'Download'; dl.style.marginLeft = '6px'; dl.style.textDecoration = 'none'; dl.textContent = '⬇';
        item.appendChild(dl);
        const short = filename.length > 10 ? filename.slice(0, 8) + '…' : filename;
        const t = document.createElement('div'); t.className = 'attachment-thumb-compact'; t.title = filename; t.style.minWidth = '40px'; t.style.height = '30px'; t.style.borderRadius = '6px'; t.style.display = 'inline-flex'; t.style.alignItems = 'center'; t.style.justifyContent = 'center'; t.style.padding = '4px'; t.style.background = '#f3f4f6'; t.style.color = '#374151'; t.style.fontSize = '11px'; t.style.cursor = 'pointer';
        t.textContent = short;
        t.addEventListener('click', () => window.open(url, '_blank'));
        return { item, thumb: t };
    }
}

export function buildAttachmentsHTML(issue) {
    const attachments = _getAttachments(issue);
    const frag = document.createDocumentFragment();
    const thumbFrag = document.createDocumentFragment();
    if (!attachments || attachments.length === 0) return { frag, thumbFrag };
    attachments.forEach(att => {
        const { item, thumb } = _createAttachmentItem(att, issue.key);
        frag.appendChild(item);
        thumbFrag.appendChild(thumb);
    });
    return { frag, thumbFrag };
}

export function renderAttachmentsForBalanced(issue, containerSelector = '#attachmentsListRight') {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const { frag } = buildAttachmentsHTML(issue);
    container.innerHTML = '';
    container.appendChild(frag);
}

export function renderFooterAttachments(issue, containerSelector = '#attachmentsListFooter') {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const { frag } = buildAttachmentsHTML(issue);
    container.innerHTML = '';
    container.appendChild(frag);
}

export function setupFooterAttachmentButton(containerSelector = '#attachmentsListFooter') {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    // Aquí iría la lógica para inicializar el botón de attachments en el footer
}
