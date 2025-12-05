# SPEEDYFLOW AI Coding Agent Instructions

## 🏗️ Architecture Overview

**SPEEDYFLOW** is a JIRA Service Desk integration platform with glassmorphism UI and advanced performance optimization.

### Component Structure
```
ui/ticket_board.py (ENTRY POINT)
  ├─ UI rendering (Streamlit)
  ├─ Session state management
  └─ Caching orchestration

core/ (BUSINESS LOGIC)
  ├─ __init__.py: Data models (Issue, Filter, User, Project)
  ├─ api.py: JIRA API operations (centralized)
  ├─ functions.py: Filtering/searching (delegates to helpers)
  └─ helpers.py: Generic pandas utilities

utils/ (INFRASTRUCTURE)
  ├─ config.py: Configuration from .env (JiraConfig, CacheConfig, AppConfig)
  ├─ common.py: Common utilities (URL normalization, auth headers)
  ├─ jira_api.py: Low-level JIRA API (JiraAPI class)
  └─ api_migration.py: Backward compatibility layer

api/ (EXTERNAL INTEGRATIONS)
  ├─ platform.py: JIRA Platform REST API
  └─ jsm.py: Service Management API (minimal)
```

### Key Architectural Patterns

1. **Centralized API Client**: Use `utils.api_migration.get_api_client()` to get/create the global `JiraAPI` instance. Do NOT create multiple API client instances.

2. **Data Models**: All ticket data flows through `core.Issue`, `core.Filter` dataclasses. These normalize field names (e.g., "status" vs "estado", "assignee" vs "asignado_a").

3. **Delegation Pattern**: `core.functions` delegates to `core.helpers` for reusable pandas operations. Keep business logic in `functions.py`, generic utilities in `helpers.py`.

---

## ⚡ Performance & Caching (Critical)

The app uses **three caching layers** that dramatically improve performance. Understand this to avoid breaking optimizations.

### Layer 1: Sidebar Cache (1-hour TTL)
```python
@st.cache_data(ttl=3600, show_spinner=False)
def get_service_desks_and_queues():
    # Caches desks/queues dropdown (~5-20KB)
    # Performance: <50ms loads (was 500ms-2s)
    # Invalidation: Manual ♻️ button calls .clear()
```
**When modifying**: Ensure you don't break the decorator or session state tracking.

### Layer 2: Kanban Board Hashing (Session-based)
```python
def get_ticket_hash(ticket: Dict) -> str:
    # MD5 hash of: key|status|assignee|summary
    # Detects ticket changes without refetching comments
    # Stored in: st.session_state.ticket_hashes = {"PROJ-1": "a1b2c3d4", ...}

def render_kanban_board_with_cache(issues: List):
    # Compare old hashes vs new hashes
    # Same hash → skip expensive rendering
    # Different hash → full re-render
    # Performance: <100ms message checks (was 1-2s)
```
**Pattern**: Hash-based change detection avoids re-fetching unchanged tickets.

### Layer 3: Issue Data Cache (5-minute TTL)
```python
@st.cache_data(ttl=300, show_spinner=False)
def get_cached_queue_issues(service_desk_id: str, queue_id: str):
    # Caches issue list from API (~50KB)
    # Auto-clears on queue/desk change via session state check
    # Performance: <100ms filter changes (was 500ms-1s)
```

**Critical Rule**: When adding new fetching logic, check if it should be cached with `@st.cache_data()` and a TTL.

---

## 🔌 Development Workflow

### Running the App
```bash
# Terminal: Install dependencies
pip install -r requirements.txt

# Terminal: Set up environment
cp .env.example .env
# Edit .env with JIRA credentials:
# JIRA_CLOUD_SITE=https://your-site.atlassian.net
# JIRA_EMAIL=your-email@example.com
# JIRA_API_TOKEN=your-token

# Terminal: Run (auto-reloads on file changes)
streamlit run ui/ticket_board.py
```

### Testing Changes
1. **Modify code** → Streamlit auto-detects changes
2. **Sidebar appears "Rerun"** button → Click it
3. **Check session state**: Use `st.write(st.session_state)` to debug
4. **Check logs**: App logs to `logs/speedyflow.log`

### Cache Debugging
```python
# Clear all caches manually during dev
st.cache_data.clear()
st.cache_resource.clear()
st.rerun()

# Inspect cache state
import streamlit as st
print(st.session_state)  # Session state
```

---

## 📋 Project-Specific Conventions

### Field Name Normalization
The codebase handles both Spanish and English column names:
```python
# Issue fields support both names:
"asignado_a" / "assignee"
"estado" / "status"
"descripcion" / "description"

# Use helpers.find_column() to handle this:
assignee_col = helpers.find_column(df, ("asignado_a", "assignee"))
```

### Error Handling
```python
# API errors are wrapped in JiraApiError
from utils.common import JiraApiError

try:
    issues = client.get_project(key)
except JiraApiError as e:
    st.error(f"JIRA API Error: {e}")
    logger.error(f"Failed to fetch project: {e}")
```

### Configuration
All config lives in `utils/config.py`:
```python
from utils.config import config
# config.jira.site, config.jira.api_token, config.cache.default_ttl, etc.
# Load from .env via python-dotenv (auto-loaded in config.py)
```

### Session State Keys
Standard keys (don't reinvent):
```python
st.session_state.cached_issues  # Current queue issues
st.session_state.ticket_hashes  # Change detection hashes
st.session_state.badges_initialized  # Flag: badges fetched?
st.session_state.last_selected_desk  # Desk selection tracking
st.session_state.last_selected_queue  # Queue selection tracking
st.session_state.issue_comment_counts  # Pre-cached comment counts
```

---

## 🎨 UI Patterns

### Glassmorphism Styling
The app applies custom styling via `ui.ui_improvements.apply_glassmorphism_styling()`:
- **Sidebar**: Smoke black with transparency
- **Background**: Light gray professional
- **Effects**: Backdrop blur, frosted glass

**Convention**: Reuse `ui.components` for UI elements (buttons, cards, etc.). Don't create ad-hoc Streamlit widgets.

### Responsive Layout
```python
# Main layout uses st.columns() for responsive design
st.set_page_config(layout="wide")  # Already set in ticket_board.py
col1, col2, col3 = st.columns([1, 2, 1])  # Proportional sizing
```

---

## 🔍 File Reference Guide

### Must-Know Files
- `ui/ticket_board.py` (1575 lines): Main app, session init, rendering orchestration
- `core/api.py` (854 lines): All JIRA operations (projects, issues, comments)
- `utils/jira_api.py`: Low-level HTTP wrapper, retry logic
- `core/__init__.py`: Data models (Issue, Filter, User)
- `utils/config.py`: Config management from .env

### Documentation Reference
- `COMPLETE_CACHING_STRATEGY_SUMMARY.md`: Full caching architecture explanation
- `KANBAN_BOARD_CACHING.md`: Hash-based change detection details
- `CODE_CHANGES_SUMMARY.md`: Recent implementation changes
- `QUICK_START_GUIDE.md`: Quick reference for common tasks

---

## ⚠️ Common Pitfalls to Avoid

1. **Creating Multiple API Clients**: Always use `get_api_client()`, not `JiraAPI()` directly
2. **Breaking Caching**: Don't remove `@st.cache_data()` decorators without understanding impact
3. **Ignoring Field Names**: Always check for both English/Spanish column names
4. **Session State Pollution**: Add new state keys only to `st.session_state` when necessary; reuse existing ones
5. **Hardcoding TTLs**: Use values from `config.cache.default_ttl`, not magic numbers
6. **Bypassing Error Handling**: Wrap API calls in try/except with proper logging
7. **Direct Pandas on Large Data**: Use caching + filtering before rendering large DataFrames

---

## 🚀 Adding Features: Quick Checklist

When implementing a new feature:
- [ ] Data flows through `core.Issue`/`core.Filter` models
- [ ] API calls use `get_api_client()` + wrapped in error handling
- [ ] Expensive operations cached with `@st.cache_data(ttl=...)`
- [ ] UI components reuse `ui.components` patterns
- [ ] Session state keys follow naming convention
- [ ] Both Spanish/English field names supported
- [ ] Changes documented in commit message + docstrings
- [ ] Test in Streamlit (check sidebar "Rerun" button behavior)

---

## 📞 Key API Patterns

```python
# Get API client (singleton, global state)
client = get_api_client()

# Fetch issues from queue
issues = client.get_queue_issues(project_key, queue_id)

# Get project
project = client.get_project(project_key)

# Get comments on issue
comments = client.get_issue_comments(issue_key)

# Update issue status
client.update_issue_field(issue_key, {"status": "Done"})

# All wrapped in try/except JiraApiError
```

---

**Last Updated**: November 5, 2025 | **Status**: Active Development
