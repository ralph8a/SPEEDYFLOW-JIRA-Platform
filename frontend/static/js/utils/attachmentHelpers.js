/**
 * Attachment Helpers - Minimal utility functions
 * Image rendering is now handled directly in comments module
 * This file retained for URL encoding support
 */
export function encodeAttachmentUrl(issueKey, attachmentId, options = {}) {
  if (!issueKey || !attachmentId) return '';
  const cleanIssueKey = encodeURIComponent(issueKey);
  const cleanAttachmentId = encodeURIComponent(attachmentId);
  const params = new URLSearchParams();
  if (options.download) params.set('download', '1');
  if (options.preview) params.set('preview', '1');
  const query = params.toString();
  return `/api/issues/${cleanIssueKey}/attachments/${cleanAttachmentId}${query ? `?${query}` : ''}`;
}
