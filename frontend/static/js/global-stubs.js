// Global stubs to avoid ReferenceError when modules call missing functions
// These are safe no-ops and can be overridden by full implementations.
(function () {
    window.openIssueDetails = window.openIssueDetails || function (issueKey) { console.warn('openIssueDetails stub called for', issueKey); };
    window.closeSidebar = window.closeSidebar || function () { /* no-op */ };
    window.initRightSidebar = window.initRightSidebar || function () { /* no-op */ };
    window.setupIssueCardClickHandlers = window.setupIssueCardClickHandlers || function () { /* no-op */ };
    window.setupMentionSystem = window.setupMentionSystem || function () { /* no-op */ };
    window.setupAttachmentsSystem = window.setupAttachmentsSystem || function () { /* no-op */ };
    window.setupCommentShortcuts = window.setupCommentShortcuts || function () { /* no-op */ };
})();
