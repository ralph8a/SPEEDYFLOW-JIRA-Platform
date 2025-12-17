// Compatibility stubs for deprecated globals (prevents ReferenceErrors when old modules still call them)
(function () {
    // Lightweight notifications stub to avoid errors if code queries the panel
    // NOTE: openIssueDetails is intentionally NOT stubbed here — Flowing MVP provides this function
    // and should be allowed to register it. Stubbing it prevented Flowing from exposing the real
    // implementation in some build orders, so we only keep minimal stubs for other removed modules.
    if (!window.notificationsPanel) {
        window.notificationsPanel = {
            init: async function () { console.info('compat-stub: notificationsPanel.init called (noop)'); },
            closePanel: function () { },
            openPanel: function () { },
            loadNotifications: async function () { return []; }
        };
    }
})();
