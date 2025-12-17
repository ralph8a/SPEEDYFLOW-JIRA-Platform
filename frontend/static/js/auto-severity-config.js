// Auto-generated severity configuration
function applyAutoDetectedSeverities() {
    if (typeof state !== 'undefined') {
        state.severityMapping = {
  "Highest": {
    "level": 1,
    "className": "severity-critical",
    "emoji": "\ud83d\udd34"
  },
  "High": {
    "level": 2,
    "className": "severity-high",
    "emoji": "\ud83d\udfe0"
  },
  "Medium": {
    "level": 3,
    "className": "severity-medium",
    "emoji": "\ud83d\udfe1"
  },
  "Low": {
    "level": 4,
    "className": "severity-low",
    "emoji": "\ud83d\udfe2"
  },
  "Lowest": {
    "level": 4,
    "className": "severity-low",
    "emoji": "\ud83d\udfe2"
  }
};
        console.log('✅ Applied auto-detected severity mapping with 5 values');
    }
}
// Auto-apply on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAutoDetectedSeverities);
} else {
    applyAutoDetectedSeverities();
}
