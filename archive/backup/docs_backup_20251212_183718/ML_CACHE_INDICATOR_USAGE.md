# ML Cache Indicator - Usage Guide
## Overview
The ML Preloader now creates a **global cache indicator** that other components can easily access to use cached tickets without making API calls.
## Architecture
```
┌──────────────────────────────────────────────────────┐
│         ML PRELOADER (Background Process)            │
│  1. Detects desk + queue                            │
│  2. Fetches tickets                                  │
│  3. Compresses with ZIP                              │
│  4. Saves to: ml_preload_cache.json.gz              │
│  5. Saves indicator: ml_cache_indicator.json ⭐     │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│      GLOBAL CACHE INDICATOR (window object)          │
│  window.ML_CACHE_INDICATOR = {                       │
│    has_cache: true,                                  │
│    total_tickets: 150,                               │
│    desk_id: "4",                                     │
│    queue_id: "27",                                   │
│    getTickets(): [...],  // 150 tickets             │
│    getMetrics(): {...},  // SLA metrics             │
│    getPriorities(): {...} // Priority distribution   │
│  }                                                    │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│         ANY COMPONENT (Uses Cache)                   │
│  • Reports Dashboard                                 │
│  • Custom Filters                                    │
│  • Export Tools                                      │
│  • Analytics Widgets                                 │
└──────────────────────────────────────────────────────┘
```
---
## Backend: Cache Indicator
### 1. Check Cache Status (Lightweight)
```bash
GET /api/ml/preload/cache-info
```
**Response:**
```json
{
  "success": true,
  "cache_info": {
    "has_cache": true,
    "total_tickets": 150,
    "desk_id": "4",
    "desk_name": "Servicios a Cliente",
    "queue_id": "27",
    "queue_name": "All Open",
    "cached_at": "2025-12-06T12:00:15.123Z",
    "cache_file": "data/cache/ml_preload_cache.json.gz",
    "metadata_file": "data/cache/ml_cache_indicator.json",
    "file_size_bytes": 120445,
    "compression_ratio_percent": 85.9
  }
}
```
**Benefits:**
- ✅ **Lightweight**: ~1KB response (vs ~120KB for full data)
- ✅ **Fast**: <5ms response time
- ✅ **No Decompression**: Just reads JSON metadata
### 2. Get Full Cached Data (if needed)
```bash
GET /api/ml/preload/data
```
**Response:**
```json
{
  "success": true,
  "data": {
    "desk_id": "4",
    "desk_name": "Servicios a Cliente",
    "queue_id": "27",
    "queue_name": "All Open",
    "total_tickets": 150,
    "tickets": [...],
    "sla_metrics": {...},
    "priority_distribution": {...},
    "trends": {...}
  },
  "tickets_count": 150
}
```
**When to Use:**
- Need actual ticket data
- Building reports/exports
- Complex analytics
---
## Frontend: Global Window Object
### Access Pattern
The ML Preloader exposes a global object on `window`:
```javascript
window.ML_CACHE_INDICATOR = {
  // Status
  has_cache: true,
  total_tickets: 150,
  // Source Info
  desk_id: "4",
  desk_name: "Servicios a Cliente",
  queue_id: "27",
  queue_name: "All Open",
  cached_at: "2025-12-06T12:00:15.123Z",
  // Helper Methods
  getTickets: () => Array<Ticket>,    // All cached tickets
  getMetrics: () => Object,            // SLA metrics
  getPriorities: () => Object,         // Priority distribution
  getTrends: () => Object              // Trends data
};
```
---
## Usage Examples
### Example 1: Check if Cache Exists
```javascript
// Check before making API call
if (window.ML_CACHE_INDICATOR && window.ML_CACHE_INDICATOR.has_cache) {
  console.log(`✅ ${window.ML_CACHE_INDICATOR.total_tickets} tickets cached`);
  // Use cached tickets
  const tickets = window.ML_CACHE_INDICATOR.getTickets();
  renderTicketList(tickets);
} else {
  console.log('⚠️ No cache, fetching from API...');
  // Fallback to API
  const tickets = await fetchTicketsFromAPI();
  renderTicketList(tickets);
}
```
### Example 2: Build Custom Report
```javascript
function buildCustomReport() {
  if (!window.ML_CACHE_INDICATOR?.has_cache) {
    showMessage('Please wait for ML Dashboard to preload data...');
    return;
  }
  const tickets = window.ML_CACHE_INDICATOR.getTickets();
  const metrics = window.ML_CACHE_INDICATOR.getMetrics();
  // Filter by custom criteria
  const highPriority = tickets.filter(t => 
    t.priority === 'Highest' || t.priority === 'High'
  );
  // Build report
  const report = {
    total: tickets.length,
    high_priority: highPriority.length,
    sla_breached: metrics.sla_breached || 0,
    source: `${window.ML_CACHE_INDICATOR.queue_name} (cached ${new Date(window.ML_CACHE_INDICATOR.cached_at).toLocaleString()})`
  };
  console.log('📊 Custom Report:', report);
  return report;
}
```
### Example 3: Export to CSV
```javascript
async function exportToCsv() {
  // Check cache first
  let tickets;
  if (window.ML_CACHE_INDICATOR?.has_cache) {
    console.log('⚡ Using cached tickets for export (instant)');
    tickets = window.ML_CACHE_INDICATOR.getTickets();
  } else {
    console.log('⏳ Fetching tickets from API...');
    tickets = await fetchTicketsFromAPI();
  }
  // Build CSV
  const csv = buildCsvFromTickets(tickets);
  downloadFile(csv, 'tickets.csv');
}
```
### Example 4: Wait for Cache Ready
```javascript
// Listen for ready event
window.addEventListener('ml-dashboard-ready', (event) => {
  console.log('🎉 ML Cache ready!', event.detail);
  // Now you can safely use the cache
  const tickets = window.ML_CACHE_INDICATOR.getTickets();
  console.log(`Loaded ${tickets.length} tickets from cache`);
  // Your component logic here
  initializeMyComponent(tickets);
});
// Or check preloader status
function checkCacheStatus() {
  if (window.mlPreloader && window.mlPreloader.isMLReady()) {
    console.log('✅ Cache ready');
    return true;
  } else {
    console.log('⏳ Cache not ready yet');
    return false;
  }
}
```
### Example 5: Filter Cached Tickets
```javascript
function getUnassignedTickets() {
  if (!window.ML_CACHE_INDICATOR?.has_cache) {
    return [];
  }
  const tickets = window.ML_CACHE_INDICATOR.getTickets();
  // Filter unassigned
  return tickets.filter(ticket => 
    !ticket.assignee || ticket.assignee === 'Unassigned'
  );
}
function getCriticalTickets() {
  if (!window.ML_CACHE_INDICATOR?.has_cache) {
    return [];
  }
  const tickets = window.ML_CACHE_INDICATOR.getTickets();
  // Filter critical
  return tickets.filter(ticket => 
    ticket.priority === 'Highest' || 
    ticket.priority === 'Critical'
  );
}
```
---
## Python Backend: Using Cache Indicator
### Load Cache Info in Python
```python
import json
from pathlib import Path
def get_cache_indicator():
    """
    Load cache indicator metadata
    Returns: dict or None
    """
    indicator_file = Path('data/cache/ml_cache_indicator.json')
    if not indicator_file.exists():
        return None
    with open(indicator_file, 'r', encoding='utf-8') as f:
        return json.load(f)
def has_cached_tickets():
    """Check if cached tickets are available"""
    indicator = get_cache_indicator()
    return indicator and indicator.get('has_cache', False)
def get_cached_ticket_count():
    """Get number of cached tickets"""
    indicator = get_cache_indicator()
    return indicator.get('total_tickets', 0) if indicator else 0
```
### Use in Flask Route
```python
from flask import Blueprint, jsonify
reports_bp = Blueprint('reports', __name__)
@reports_bp.route('/api/reports/summary', methods=['GET'])
def get_summary():
    """
    Build report summary using cached tickets if available
    """
    indicator = get_cache_indicator()
    if indicator and indicator['has_cache']:
        # Use cached data
        print(f"✅ Using {indicator['total_tickets']} cached tickets")
        # Load compressed cache
        from api.blueprints.ml_preloader import decompress_data
        cache_file = Path(indicator['cache_file'])
        with open(cache_file, 'rb') as f:
            compressed = f.read()
        ml_data = decompress_data(compressed)
        tickets = ml_data['tickets']
        # Build summary
        summary = {
            'total_tickets': len(tickets),
            'source': f"{indicator['queue_name']} (cached)",
            'cached_at': indicator['cached_at'],
            # ... your logic
        }
        return jsonify({'success': True, 'summary': summary})
    else:
        # Fallback to API
        print("⚠️ No cache, fetching from JIRA API...")
        tickets = fetch_tickets_from_jira()
        # ... build summary
```
---
## Cache File Structure
### 1. Main Cache (Compressed)
**File**: `data/cache/ml_preload_cache.json.gz`
- **Size**: ~120KB (compressed from 850KB)
- **Format**: GZIP compressed JSON
- **Contains**: Full ticket data + analytics
### 2. Indicator (Metadata)
**File**: `data/cache/ml_cache_indicator.json`
- **Size**: ~500 bytes (lightweight!)
- **Format**: Plain JSON
- **Contains**: Metadata only
**Structure:**
```json
{
  "has_cache": true,
  "total_tickets": 150,
  "desk_id": "4",
  "desk_name": "Servicios a Cliente",
  "queue_id": "27",
  "queue_name": "All Open",
  "cached_at": "2025-12-06T12:00:15.123Z",
  "cache_file": "data/cache/ml_preload_cache.json.gz",
  "metadata_file": "data/cache/ml_cache_indicator.json",
  "file_size_bytes": 120445,
  "compression_ratio_percent": 85.9
}
```
---
## Best Practices
### ✅ DO:
1. **Check indicator first** (lightweight)
   ```javascript
   if (window.ML_CACHE_INDICATOR?.has_cache) {
     // Use cache
   }
   ```
2. **Provide fallback** to API
   ```javascript
   const tickets = window.ML_CACHE_INDICATOR?.getTickets() 
     || await fetchFromAPI();
   ```
3. **Listen for ready event**
   ```javascript
   window.addEventListener('ml-dashboard-ready', handler);
   ```
4. **Check timestamp** if freshness matters
   ```javascript
   const age = Date.now() - new Date(window.ML_CACHE_INDICATOR.cached_at);
   if (age > 5 * 60 * 1000) {
     // Cache older than 5 minutes, refetch?
   }
   ```
### ❌ DON'T:
1. **Don't assume cache exists**
   ```javascript
   // ❌ BAD
   const tickets = window.ML_CACHE_INDICATOR.getTickets();
   // ✅ GOOD
   const tickets = window.ML_CACHE_INDICATOR?.getTickets() || [];
   ```
2. **Don't modify cached data** (read-only)
   ```javascript
   // ❌ BAD
   window.ML_CACHE_INDICATOR.total_tickets = 200;
   // ✅ GOOD - work with copy
   const ticketsCopy = [...window.ML_CACHE_INDICATOR.getTickets()];
   ```
3. **Don't rely on cache for real-time updates**
   - Cache is a snapshot
   - For live data, use API
---
## Console Debugging
### Check Status
```javascript
// Check if indicator exists
console.log('Cache Indicator:', window.ML_CACHE_INDICATOR);
// Check preloader status
console.log('Preloader Ready:', window.mlPreloader?.isMLReady());
// Get cache info
console.log('Cache Info:', window.mlPreloader?.getCacheInfo());
// Get ticket count
console.log('Cached Tickets:', window.ML_CACHE_INDICATOR?.total_tickets || 0);
// Get all tickets
console.table(window.ML_CACHE_INDICATOR?.getTickets());
```
### Expected Output
```
🚀 ML Preloader: Initializing...
📋 Cache Info: { has_cache: true, total_tickets: 150, ... }
✅ ML Preloader: Cache available - 150 tickets from All Open
💾 Found cached ML data: 150 tickets
🌍 ML_CACHE_INDICATOR exposed globally: { has_cache: true, ... }
💡 Other components can now use: window.ML_CACHE_INDICATOR.getTickets()
🎉 ML Dashboard ready! { desk: 'Servicios a Cliente', ... }
```
---
## Summary
### What Changed:
1. **Backend** (`api/blueprints/ml_preloader.py`):
   - Saves `ml_cache_indicator.json` (lightweight metadata)
   - New endpoint: `/api/ml/preload/cache-info` (fast status check)
   - Global `cache_indicator` dict
2. **Frontend** (`frontend/static/js/ml-preloader.js`):
   - Exposes `window.ML_CACHE_INDICATOR` (global object)
   - Helper methods: `getTickets()`, `getMetrics()`, `getPriorities()`
   - Auto-initializes on app load
### Benefits:
- ✅ **Any component** can check cache status in <5ms
- ✅ **No API calls** needed if cache exists
- ✅ **Consistent access pattern** via window object
- ✅ **Helper methods** for common operations
- ✅ **Event-driven** with `ml-dashboard-ready` event
- ✅ **Backward compatible** - still works without cache
---
**Last Updated**: December 6, 2025  
**Status**: ✅ Production Ready  
**Version**: 2.0
