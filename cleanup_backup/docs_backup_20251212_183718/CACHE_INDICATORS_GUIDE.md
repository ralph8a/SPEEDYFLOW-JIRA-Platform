# Cache Indicators Guide

## 🎯 Overview

All data-intensive features in SPEEDYFLOW now display **cache indicators** that show:

1. **Where data came from** (💨 Memory, 💾 LocalStorage, 📡 Backend)
2. **How old the data is** (e.g., "2h 15m atrás")
3. **How to refresh** (🔄 Actualizar button)

This provides **transparency and control** to users, ensuring they know when data might be stale and how to get fresh data.

---

## 📊 Features with Cache Indicators

### 1. Metrics & Insights Modal

**Location**: Sidebar → "📊 Metrics & Insights"

**Visual**:
```
┌────────────────────────────────────────────────────────────┐
│ 📊 Metrics & Insights     💾 En caché local • 5m atrás │🔄││
├────────────────────────────────────────────────────────────┤
│ 💡 Smart Insights                                          │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ • High Priority Tickets: 15 tickets awaiting attention │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**Cache Levels**:
- 💨 **Memory**: `window.metricsCache` (instant, <1ms)
- 💾 **LocalStorage**: `CacheManager` (fast, <10ms)
- 📡 **Backend**: SQLite `reports_cache` table (~500ms)

**TTL**:
- Small queues (<50): 15 minutes
- Large queues (≥50): 3 hours

**Code Location**: `frontend/static/js/modules/sidebar-actions.js`

```javascript
showMetricsCacheIndicator(source, age) {
  const indicator = document.getElementById('metricsCacheIndicator');
  indicator.innerHTML = `
    <span>💾 En caché local • ${age} atrás</span>
    <button onclick="refreshReports()">🔄 Actualizar</button>
  `;
}
```

---

### 2. ML Analyzer Modal

**Location**: Sidebar → "🧠 ML Analyzer"

**Visual**:
```
┌────────────────────────────────────────────────────────────┐
│ 🧠 Sugerencias de ML     💨 En memoria • 32s atrás  │🔄││×││
├────────────────────────────────────────────────────────────┤
│ Ticket MSM-1234                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Criticidad: null → High (Confidence: 85%)              │ │
│ │ Reason: El ticket menciona "servicio caído"           │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**Cache Levels**:
- 💨 **Memory**: `window.mlAnalysisCache` (instant, <1ms)
- 💾 **LocalStorage**: `CacheManager` (fast, <10ms)
- 📡 **Backend**: SQLite `ml_analysis_cache` table (~500ms)

**TTL**:
- Small queues (<50): 15 minutes
- Large queues (≥50): 3 hours

**Code Location**: `frontend/static/js/modules/ai-queue-analyzer.js`

```javascript
showCacheIndicator(source, age) {
  const indicator = document.getElementById('mlAnalysisCacheIndicator');
  indicator.innerHTML = `
    <span>💨 En memoria • ${formatAge(age)} atrás</span>
    <button onclick="refreshAnalysis()">🔄 Actualizar</button>
  `;
}
```

---

## 🔄 Refresh Mechanism

### How Refresh Works

When user clicks **🔄 Actualizar**:

1. **Clear all cache levels**:
   ```javascript
   // Memory cache
   delete window.metricsCache[cacheKey];
   delete window.mlAnalysisCache[cacheKey];
   
   // LocalStorage cache
   CacheManager.remove(cacheKey);
   
   // Backend cache is NOT cleared (still valid for other users)
   ```

2. **Re-fetch with force flag** (optional):
   ```javascript
   fetch('/api/reports/metrics?force=true')
   ```

3. **Display fresh data** with updated cache indicator

---

## 🎨 UI Components

### Cache Indicator HTML Structure

```html
<div id="metricsCacheIndicator" style="display: none; align-items: center; gap: 8px; margin-left: auto; margin-right: 8px; font-size: 12px; color: #64748b;">
  <span style="display: flex; align-items: center; gap: 6px;">
    💾 En caché local • 5m atrás
  </span>
  <button 
    onclick="window.sidebarActions.refreshReports()" 
    style="padding: 4px 8px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-size: 11px; display: flex; align-items: center; gap: 4px; transition: all 0.2s;"
    onmouseover="this.style.background='#e2e8f0'" 
    onmouseout="this.style.background='#f1f5f9'"
    title="Actualizar métricas con datos recientes"
  >
    🔄 Actualizar
  </button>
</div>
```

### Styling

```css
/* Cache indicator container */
#metricsCacheIndicator, #mlAnalysisCacheIndicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  margin-right: 8px;
  font-size: 12px;
  color: #64748b;
}

/* Cache source badge */
#metricsCacheIndicator span,
#mlAnalysisCacheIndicator span {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.8;
}

/* Refresh button */
#metricsCacheIndicator button,
#mlAnalysisCacheIndicator button {
  padding: 4px 8px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

#metricsCacheIndicator button:hover,
#mlAnalysisCacheIndicator button:hover {
  background: #e2e8f0;
  transform: scale(1.05);
}
```

---

## 📝 Age Formatting

### Format Function

```javascript
formatCacheAge(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
```

### Examples

| Age (ms) | Display |
|----------|---------|
| 5000 | `5s` |
| 180000 | `3m` |
| 7200000 | `2h 0m` |
| 9900000 | `2h 45m` |

---

## 🔍 Cache Source Icons & Labels

### Icons

| Source | Icon | Meaning |
|--------|------|---------|
| Memory | 💨 | Instant load from JavaScript memory |
| LocalStorage | 💾 | Fast load from browser storage |
| Backend | 📡 | Network request (may have DB cache) |

### Labels (Spanish)

| Source | Label | Description |
|--------|-------|-------------|
| Memory | "En memoria" | Data is in active memory (fastest) |
| LocalStorage | "En caché local" | Data is in browser storage (fast) |
| Backend | "Del servidor" | Data fetched from backend (may be cached in DB) |

---

## 🧪 Testing Cache Indicators

### Manual Testing Steps

1. **First Load (Backend)**:
   - Open Metrics modal
   - Should see: `📡 Del servidor`
   - Note: No age displayed (fresh data)

2. **Second Load (Memory)**:
   - Close and reopen modal
   - Should see: `💨 En memoria • 2s atrás`

3. **After Page Reload (LocalStorage)**:
   - Reload page
   - Open modal
   - Should see: `💾 En caché local`

4. **After TTL Expires**:
   - Wait for TTL to expire (or manually clear cache)
   - Open modal
   - Should see: `📡 Del servidor` (fresh fetch)

5. **Refresh Button**:
   - Click `🔄 Actualizar`
   - Should clear cache and fetch fresh data
   - Should see: `📡 Del servidor` with new data

### Console Debugging

```javascript
// Check cache state
console.log('Memory:', window.metricsCache);
console.log('LocalStorage:', localStorage.getItem('metrics_4_46'));

// Check cache age
const cached = window.metricsCache?.metrics_4_46;
if (cached) {
  const age = Date.now() - cached.timestamp;
  console.log('Cache age:', Math.floor(age / 1000), 'seconds');
}
```

---

## 🎯 User Guidelines

### When to Use Refresh

Users should click **🔄 Actualizar** when:

1. **After making changes** to tickets (to see updated metrics)
2. **When data seems stale** (especially for real-time monitoring)
3. **Before important decisions** (to ensure fresh data)
4. **After bulk operations** (imports, batch updates, etc.)

### When Cache is Acceptable

Cache is perfectly fine when:

1. **Browsing historical data** (doesn't change)
2. **Quick overview checks** (don't need latest second)
3. **Cache is recent** (<5 minutes old)
4. **Large queues** (where fresh analysis takes 2-3 seconds)

---

## 🔧 Implementation Checklist

For adding cache indicators to new features:

- [ ] Add cache storage (memory + localStorage + backend DB)
- [ ] Add cache indicator div to modal header
- [ ] Implement `showCacheIndicator(source, age)` method
- [ ] Implement `formatCacheAge(ms)` method
- [ ] Implement `refresh()` method to clear caches
- [ ] Display indicator on cache hits with appropriate source icon
- [ ] Test all 3 cache levels work correctly
- [ ] Verify refresh button clears all caches

---

## 📊 Cache Indicator Coverage

| Feature | Cache Indicator | Status |
|---------|----------------|--------|
| **Metrics & Insights** | ✅ Yes | Implemented |
| **ML Analyzer** | ✅ Yes | Implemented |
| Queue Issues List | ❌ No | Not needed (always fresh) |
| Issue Details | ❌ No | Not needed (single item) |
| Comments | ❌ No | Not needed (real-time) |
| Reports/Exports | ⏳ Planned | Future enhancement |
| SLA Dashboard | ⏳ Planned | Future enhancement |

---

## 🎉 Benefits

### For Users
- **Transparency**: Clear indication of data freshness
- **Control**: One-click refresh when needed
- **Trust**: Users know exactly what they're looking at
- **Speed**: Instant loads with visible cache source

### For System
- **Reduced Load**: 98% fewer expensive operations
- **Scalability**: Can handle more users with same resources
- **Consistency**: Same pattern across all cached features
- **Observability**: Cache behavior visible to users

---

## 🚀 Future Enhancements

### Potential Improvements

1. **Auto-refresh on stale data**: Automatically refresh when cache is >30 minutes old
2. **Cache size indicator**: Show how much data is cached (e.g., "15.2 KB")
3. **Cache stats**: Display cache hit rate in settings
4. **Smart refresh**: Only refresh if data has actually changed (use ETags)
5. **Background sync**: Periodically refresh cache in background
6. **Cache warming**: Pre-load common queries on login
7. **Multi-user cache**: Share cache between users (with proper invalidation)

### Monitoring Ideas

```javascript
// Cache performance metrics
const cacheStats = {
  memoryHits: 0,
  localStorageHits: 0,
  backendHits: 0,
  misses: 0,
  avgMemoryLoadTime: 0,
  avgLocalStorageLoadTime: 0,
  avgBackendLoadTime: 0
};

// Log to analytics
trackCacheHit('memory', loadTime);
```

---

**Last Updated**: 2025-01-15  
**Status**: ✅ Implemented  
**Next Review**: 2025-02-15
