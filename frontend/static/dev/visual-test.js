/* Visual test harness for Flowing V2
   - Wires a sample issue into the Flowing-V2 orchestrator
   - Click the card's Open button to render the balanced view and attachments
*/
import { createFlowingV2Instance } from '../js/Flowing-V2.js';
import * as AttachmentsModule from '../js/attachments-module.js';
import * as BalancedRenderer from '../js/modules/balanced-view-renderer.js';
import SLAMonitorModule from '../js/sla-monitor.js';
// Ensure comments module is loaded and available as a DI option
import '../js/modules/comments.js';

// Create an instance and expose globally so the page can call methods.
const flowing = createFlowingV2Instance({
    attachmentsModule: AttachmentsModule,
    balancedViewRenderer: BalancedRenderer,
    slaMonitor: (SLAMonitorModule || window.slaMonitor) || null,
    commentsModule: window.commentsModule || null
}, true);

// Load compatibility shim to map legacy classes and expose test helpers
try {
    import('../js/flowing-v2-compat.js');
} catch (e) { /* ignore on unsupported environments */ }

// Sample issue object with attachments
const sampleIssue = {
    key: 'TEST-1',
    summary: 'Example issue for Flowing V2',
    description: 'This is a sample description.\n\nUse this area to test rendering of attachments, SLA, and comments.',
    fields: {
        attachment: [
            { filename: 'image1.png', content: 'https://via.placeholder.com/300x180.png?text=Image+1', mimeType: 'image/png' },
            { filename: 'doc.pdf', content: 'https://example.com/sample.pdf', mimeType: 'application/pdf' }
        ]
    }
};

async function openBalanced(issue) {
    try {
        await flowing.renderBalancedContent(issue);
    } catch (e) { console.warn('renderBalancedContent failed', e); }
    try { await flowing.renderAttachments(issue); } catch (e) { console.warn('renderAttachments failed', e); }
    try { await flowing.loadComments(issue.key); } catch (e) { /* ignore if comments module not present */ }
    try { flowing.renderSLAPanel(issue.key); } catch (e) { /* ignore */ }
    try { flowing.adjustCommentsHeight(); } catch (e) { /* ignore */ }
    const bm = document.getElementById('BalancedMain');
    if (bm) bm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bindCardButtons() {
    const btns = document.querySelectorAll('.btn-open-balanced');
    btns.forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            openBalanced(sampleIssue);
        });
    });
}

// Auto-bind on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    bindCardButtons();
    // Optionally open on load for quick visual check
    // setTimeout(() => document.querySelector('.btn-open-balanced')?.click(), 200);
});
