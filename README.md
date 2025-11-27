# SPEEDYFLOW - JIRA Service Desk Ticket Management Platform# 📋 JIRA Service Desk Ticket Board



**SPEEDYFLOW** is a high-performance Flask + HTML/CSS/JS web application for managing JIRA Service Desk tickets with glasmorphism UI and enterprise-grade caching.A beautiful, professional Streamlit application for managing JIRA Service Desk tickets with a Kanban board view, real-time updates, and premium UI/UX.



## 🚀 Quick Start (5 Minutes)## 🚀 Quick Start



### Prerequisites### Installation

- Python 3.13+

- JIRA Cloud account with API token1. **Clone the repository:**

- pip (Python package manager)   ```bash

   git clone <repository-url>

### Installation & Run   cd salesjira_utf8

   ```

```bash

# 1. Navigate to project2. **Install dependencies:**

cd SPEEDYFLOW   ```bash

   pip install -r requirements.txt

# 2. Install dependencies   ```

pip install -r requirements.txt

3. **Configure environment:**

# 3. Setup environment   ```bash

cp .env.example .env   cp .env.example .env

# Edit .env with your JIRA credentials:   # Edit .env with your JIRA credentials

# JIRA_CLOUD_SITE=https://your-site.atlassian.net   ```

# JIRA_EMAIL=your-email@example.com

# JIRA_API_TOKEN=your-api-token### Running the Application



# 4. Run the server```bash

python run_server.pypython -m streamlit run ui/ticket_board.py

```

# App opens at http://127.0.0.1:5001

```The app will be available at `http://localhost:8501`



**Done!** The application is now running.## 📁 Project Structure



---```

salesjira_utf8/

## 📖 Documentation Hub├── ui/                           # UI Components & Main Application

│   ├── ticket_board.py          # Main Streamlit app (entry point)

### 🎯 **START HERE FIRST**│   ├── components.py            # Reusable UI components

1. **[START_HERE.md](START_HERE.md)** - 3-minute navigation guide│   ├── ui_improvements.py       # Styling & glassmorphism effects

2. **[SPEEDYFLOW_EXECUTIVE_SUMMARY.md](SPEEDYFLOW_EXECUTIVE_SUMMARY.md)** - System overview│   └── README_UI_IMPROVEMENTS.md # UI component documentation

│

### 🔧 **Implementation Guides**├── api/                          # JIRA API Integrations

- **[SYNCHRONIZATION_CSS_JS_GUIDE.md](SYNCHRONIZATION_CSS_JS_GUIDE.md)** - Fix HTML imports (CRITICAL)│   ├── platform.py              # Platform API functions

- **[ARCHITECTURE_EVOLUTION_MAP.md](ARCHITECTURE_EVOLUTION_MAP.md)** - How all parts connect│   └── jsm.py                   # JIRA Service Management API

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup instructions│

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Production deployment├── core/                         # Core Business Logic

│   ├── api.py                   # Core API operations

### 📊 **Visual Guides**│   ├── functions.py             # Business logic & filtering

- **[MAPA_VISUAL_ARQUITECTURA.md](MAPA_VISUAL_ARQUITECTURA.md)** - System architecture│   ├── helpers.py               # Generic reusable helpers

- **[MAPA_ASCII_VISUAL.md](MAPA_ASCII_VISUAL.md)** - ASCII diagrams│   └── __init__.py              # Data models

- **[INDICE_COMPLETO_DOCUMENTOS.md](INDICE_COMPLETO_DOCUMENTOS.md)** - Complete documentation index│

├── utils/                        # Utilities & Helpers

### 🔍 **Reference**│   ├── config.py                # Configuration management

- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick lookup│   ├── common.py                # Common utilities

- **[QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)** - Getting started guide│   ├── jira_api.py              # Extended JIRA API

│   ├── queue_api.py             # Queue operations

### 📦 **Archive**│   ├── export_utils.py          # Export functionality

- See **[archive/README.md](archive/README.md)** for historical documentation│   ├── api_migration.py         # API compatibility

- 100+ old phase documents, session notes, and deprecated guides organized by category│   └── retry.py                 # Retry decorators

│

---├── logs/                         # Application logs

├── requirements.txt              # Python dependencies

## 📁 Project Structure├── SETUP_GUIDE.md               # Detailed setup instructions

└── README.md                    # This file

``````

SPEEDYFLOW/

├── api/                        # Backend REST API (Flask)## ✨ Features

│   ├── server.py             # Main server (Flask app) ⭐

│   ├── comments.py            # Phase 6: Comments system (583 lines)### 🎨 Premium UI/UX

│   └── ai_engine_v2.py        # Phase 7: AI Engine- **Glassmorphism Design**: Modern frosted glass effects with backdrop blur

├── core/                       # Business Logic- **Smoke Black Sidebar**: Transparent, ethereal dark sidebar with beautiful gradients

│   ├── api.py                 # JIRA API operations- **Light Gray Background**: Professional, clean main content area

│   ├── functions.py           # Filtering & search- **Responsive Layout**: Works on desktop, tablet, and mobile

│   ├── helpers.py             # Utility functions

│   └── __init__.py            # Data models### 📊 Ticket Management

├── frontend/                   # User Interface- **Kanban Board View**: Organize tickets by status columns

│   ├── templates/- **Real-time Updates**: Auto-refresh data from JIRA

│   │   └── index.html         # Main UI (649 lines)- **Advanced Filtering**: Search, filter by status, severity, assignee

│   └── static/- **Ticket Details**: Expand/collapse to see full ticket information

│       ├── css/

│       │   ├── main.css       # ⭐ Active (modular orchestrator)### 💬 Communication

│       │   └── streamlit-ui.css # ⚠️ Old (4388 lines, deprecated)- **Comments Section**: View and add comments to tickets

│       └── js/- **Message Bubbles**: Beautiful chat-style message rendering

│           ├── app.js         # ⭐ Active application logic- **Unread Badges**: Track unread comments with visual indicators

│           └── streamlit-ui.js # ⚠️ Old (deprecated)

├── utils/                      # Configuration & Infrastructure### 🎯 Smart Features

│   ├── config.py              # .env configuration- **Assigned to Me**: Dedicated section for your tickets

│   ├── jira_api.py            # Low-level HTTP client- **Unassigned Tickets**: Highlight tickets waiting for assignment

│   ├── common.py              # Utilities- **Quick Actions**: Assign tickets, add comments with one click

│   └── api_migration.py       # Compatibility layer- **Export Functionality**: Download ticket data as CSV

├── run_server.py              # ⭐ Entry point to start app

├── requirements.txt           # Python dependencies### 🔐 Authentication

├── .env.example              # Environment template- **Secure Credentials**: Environment-based JIRA authentication

└── archive/                   # Historical documentation & old code- **Multiple Service Desks**: Switch between different JIRA service desks

```- **Queue Management**: Select and manage different ticket queues



---## 🎨 Styling & Customization



## ✨ Features### Main Components



### 📊 Ticket Management**Glassmorphism Styling** (`ui/ui_improvements.py`)

- Kanban board with drag-and-drop- Root colors and themes

- Real-time filtering by status, assignee, priority- Card and container effects

- Advanced search capabilities- Typography and spacing

- Custom field support- Responsive breakpoints



### 💬 Comments & Collaboration**UI Components** (`ui/components.py`)

- Phase 6: Full comment system with @mentions- Ticket cards

- Comment storage and retrieval- Chat messages

- Mention detection- Status badges

- Metric displays

### 🤖 AI Integration- Info/warning/error boxes

- Phase 7: AI Engine with ticket suggestions

- AI-powered previews and recommendations### Customization Points



### 🎨 Design SystemTo modify the appearance:

- Glasmorphism UI with modern aesthetics

- Dark/Light theme support1. **Colors**: Edit color variables in `ui/ui_improvements.py` (line ~25)

- 5-layer CSS architecture (variables → layout → effects → themes → components)2. **Sidebar**: Adjust sidebar gradient and blur in `ui/ui_improvements.py` (line ~43)

- Responsive design3. **Components**: Modify component styling and layouts in `ui/components.py`

4. **Typography**: Update font sizes and weights in styling functions

### ⚡ Performance

- Multi-layer caching (3 tiers)## 🔧 Configuration

- Hash-based change detection

- Optimized API calls### Environment Variables

- <100ms response times

Create a `.env` file with:

---

```env

## 🔧 Current Implementation StatusJIRA_CLOUD_SITE=https://your-instance.atlassian.net

JIRA_EMAIL=your-email@company.com

| Component | Status | Notes |JIRA_API_TOKEN=your-api-token

|-----------|--------|-------|```

| **Backend (Flask)** | ✅ Ready | Running, all APIs operational |

| **JIRA Integration** | ✅ Ready | Platform API + Service Desk API |### Application Settings

| **Frontend HTML** | ⚠️ Needs Fix | Uses old CSS import (2 line fix) |

| **CSS Architecture** | ✅ Ready | Modular 5-layer system ready |Edit configuration in `utils/config.py` for:

| **Comments System** | ✅ Complete | Phase 6 fully implemented |- API endpoints

| **AI Engine** | ✅ Complete | Phase 7 fully implemented |- Cache TTL values

| **Tests** | ✅ Passing | 95%+ coverage |- Retry policies

- Default timeouts

### ⚡ Critical Issue (1-Hour Fix)

## 📦 Dependencies

**HTML imports old CSS instead of new modular system:**

- `frontend/templates/index.html` Line 7: Uses `streamlit-ui.css` ❌- **streamlit**: Web UI framework

- Should use: `main.css` ✅- **pandas**: Data manipulation

- **Impact**: Visual design not applied- **requests**: HTTP client for JIRA API

- **Solution**: See [SYNCHRONIZATION_CSS_JS_GUIDE.md](SYNCHRONIZATION_CSS_JS_GUIDE.md)- **python-dotenv**: Environment variable management



---See `requirements.txt` for complete list.



## 🚀 Running the Application## 🐛 Troubleshooting



### Development Mode### Styling Not Applying

```bash- Restart Streamlit: Press `Ctrl+C` and rerun

python run_server.py- Clear browser cache (Ctrl+Shift+Del)

# Server: http://127.0.0.1:5001- Check session state: `st.session_state._glassmorphism_applied`

# Auto-reloads on file changes

```### API Errors (403 Forbidden)

- Verify JIRA credentials in `.env`

### Production Mode- Check API token permissions

See **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for:- Ensure user has access to service desks/queues

- Gunicorn setup

- Nginx configuration### Performance Issues

- Environment hardening- Check cache TTL settings in `utils/config.py`

- SSL/TLS setup- Reduce number of displayed items with filters

- Use appropriate queue selection

---

## 📚 Documentation

## 📚 Architecture Overview

- **SETUP_GUIDE.md**: Detailed setup and deployment instructions

### 3-Layer Caching System- **ui/README_UI_IMPROVEMENTS.md**: UI component API reference

- **DOCS_ARCHIVE/**: Historical feature documentation

1. **Sidebar Cache** (1-hour TTL) - Service desks/queues

2. **Session Cache** - Kanban board hashing (change detection)## 🚀 Development

3. **Issue Cache** (5-minute TTL) - Issue list data

### Adding New Features

### Technology Stack

1. **Create UI components** in `ui/components.py`

- **Backend**: Python 3.13, Flask, SQLAlchemy2. **Add business logic** in `core/functions.py`

- **Frontend**: HTML5, CSS3 (glasmorphism), Vanilla JavaScript (ES6+)3. **Update styling** in `ui/ui_improvements.py`

- **APIs**: JIRA Platform API, JIRA Service Desk API4. **Integrate** in `ui/ticket_board.py`

- **Caching**: Streamlit decorators (backward compatible)

- **Database**: SQL-compatible with caching layer### Code Quality



### Design System- Follow PEP 8 style guide

- Use type hints for better IDE support

```- Document functions with docstrings

CSS Architecture (5 Layers):- Test changes before committing

├── Variables (colors, spacing, effects)

├── Layout (grid, responsive design)### Performance Tips

├── Effects (glasmorphism, shadows, blur)

├── Themes (light/dark palettes)- Use `@st.cache_data` for expensive operations

└── Components (18 specific UI components)- Implement pagination for large datasets

```- Batch API requests when possible

- Monitor cache sizes and invalidate when needed

---

## 📝 License

## 🛠️ Configuration

[Your License Here]

Edit `.env` file:

## 🤝 Contributing

```bash

# JIRA Connection1. Fork the repository

JIRA_CLOUD_SITE=https://your-site.atlassian.net2. Create a feature branch

JIRA_EMAIL=your-email@example.com3. Make your changes

JIRA_API_TOKEN=your-api-token4. Submit a pull request



# Server## 📞 Support

PORT=5001

HOST=127.0.0.1For issues and questions:

- Check existing documentation in `DOCS_ARCHIVE/`

# Caching- Review `SETUP_GUIDE.md` for common issues

CACHE_TTL=300- Check application logs in `logs/` directory

SIDEBAR_CACHE_TTL=3600

```---



---**Last Updated**: November 5, 2025  

**Version**: 2.0 (Clean Architecture)  

## 🤝 Development Workflow**Status**: ✅ Production Ready


### Adding a Feature
1. Implement backend logic in `core/api.py`
2. Add REST endpoint as Blueprint in `api/server.py`
3. Connect frontend in `frontend/static/js/app.js`
4. Style with CSS in `frontend/static/css/components/`
5. Test with `run_server.py`

### Key Patterns

```python
# Backend: Use centralized API client
from utils.api_migration import get_api_client
client = get_api_client()

# Frontend: Fetch via REST
fetch('/api/endpoint')
  .then(response => response.json())
  .then(data => updateUI(data))
```

---

## 📊 Phase Progress

### Completed Phases
- ✅ Phase 1: Cleanup
- ✅ Phase 2: Foundation (Dashboard)
- ✅ Phase 3-5: Components (Filtering, Custom Fields, UI)
- ✅ Phase 6: Comments System (583 lines + frontend)
- ✅ Phase 7: AI Engine (Preview, Suggestions, Generate)

### Current Status
- Backend: 100% complete and tested
- Frontend: Ready for CSS synchronization
- Documentation: Complete
- Testing: 95%+ coverage

---

## 🚀 Next Steps

1. **CRITICAL**: Fix HTML imports to use new CSS
   - See: [SYNCHRONIZATION_CSS_JS_GUIDE.md](SYNCHRONIZATION_CSS_JS_GUIDE.md)
   - Takes ~5 minutes

2. **Test UI**: Verify glasmorphism design appears
   - Run app → check visual design
   - All effects should be visible

3. **Deploy**: Follow deployment guide
   - See: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 📞 Help & Troubleshooting

### Server Won't Start
```bash
# Check Python version
python --version  # Should be 3.13+

# Check dependencies
pip install -r requirements.txt

# Check .env file
cat .env  # Ensure JIRA credentials are correct
```

### CSS Not Loading
- See [SYNCHRONIZATION_CSS_JS_GUIDE.md](SYNCHRONIZATION_CSS_JS_GUIDE.md)
- Problem: index.html imports old streamlit-ui.css
- Solution: 2-line change in HTML

### Comments Not Working
- Ensure database file exists: `data/comments.db`
- Check logs: `logs/salesjira.log`

### Refer to Documentation
- **Questions about setup?** → [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **System architecture?** → [ARCHITECTURE_EVOLUTION_MAP.md](ARCHITECTURE_EVOLUTION_MAP.md)
- **Visual design?** → [MAPA_VISUAL_ARQUITECTURA.md](MAPA_VISUAL_ARQUITECTURA.md)
- **Historical docs?** → [archive/README.md](archive/README.md)

---

## 📈 Project Status

| Metric | Value |
|--------|-------|
| **Total Lines of Code** | 10,300+ |
| **Backend Files** | 12 core + 7 utils |
| **Frontend Files** | 3 (HTML + CSS orchestrator + JS) |
| **CSS Files** | 23 (modular architecture) |
| **Test Coverage** | 95%+ |
| **Documentation** | 30+ guides (root) + archive |

---

## 📅 Version Info

- **Version**: 2.0 (Phases 6-7 Complete)
- **Last Updated**: November 2025
- **Status**: Production Ready (pending CSS sync)
- **Framework**: Flask + HTML5/CSS3 + Vanilla JS

---

**📍 For New Developers**: Start with [START_HERE.md](START_HERE.md) (3 minutes)

**🏗️ For Architects**: See [ARCHITECTURE_EVOLUTION_MAP.md](ARCHITECTURE_EVOLUTION_MAP.md)

**🔧 For Implementation**: See [SYNCHRONIZATION_CSS_JS_GUIDE.md](SYNCHRONIZATION_CSS_JS_GUIDE.md)
