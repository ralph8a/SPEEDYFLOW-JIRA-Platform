# SPEEDYFLOW - JIRA Service Desk Ticket Management Platform

**SPEEDYFLOW** is a high-performance Flask + HTML/CSS/JS web application for managing JIRA Service Desk tickets with glassmorphism UI, ML-powered analytics, and intelligent background preloading.

## 🚀 Quick Start

### Prerequisites

- Python 3.13+
- JIRA Cloud account with API token
- pip (Python package manager)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd SPEEDYFLOW-JIRA-Platform
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your JIRA credentials:
   # JIRA_CLOUD_SITE=https://your-site.atlassian.net
   # JIRA_EMAIL=your-email@example.com
   # JIRA_API_TOKEN=your-api-token
   ```

4. **Run the application:**
   ```bash
   python run_server.py
   ```

The app will be available at `http://127.0.0.1:5001`

## 📖 Documentation

**Complete documentation has been organized in the [`docs/`](docs/) folder.**

📚 **[View Documentation Index](docs/INDEX.md)** - Complete guide to all documentation

### Quick Links

#### 🚀 Getting Started
- [Quick Start Guide](docs/guides/FLOWING_MVP_QUICK_START.md)
- [Ollama Setup Guide](docs/guides/OLLAMA_SETUP_GUIDE.md)
- [Icon Testing Guide](docs/guides/ICON_TESTING_GUIDE.md)

#### 🏗️ Technical Documentation
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Cache System](docs/CACHE_SYSTEM.md)
- [ML Integration Strategy](docs/ML_INTEGRATION_STRATEGY.md)
- [Performance Optimizations](docs/PERFORMANCE_OPTIMIZATIONS.md)

#### 📊 Reports & Analysis
- [SPEEDYFLOW vs JIRA Performance](docs/reports/SPEEDYFLOW_VS_JIRA_PERFORMANCE.md)
- [ML Performance Optimization](docs/reports/ML_PERFORMANCE_OPTIMIZATION.md)
- [Codebase Size Analysis](docs/reports/CODEBASE_SIZE_ANALYSIS.md)

## 📁 Project Structure

```
SPEEDYFLOW-JIRA-Platform/
├── api/                          # Backend REST API (Flask)
│   ├── blueprints/               # Flask blueprints
│   ├── ai_engine_v2.py          # AI Engine
│   └── ml_anomaly_detection.py  # ML anomaly detection
├── core/                         # Core Business Logic
│   ├── api.py                   # Core API operations
│   ├── functions.py             # Business logic & filtering
│   ├── helpers.py               # Generic reusable helpers
│   └── __init__.py              # Data models
├── frontend/                     # User Interface
│   ├── templates/               # HTML templates
│   └── static/                  # CSS, JS, and assets
├── utils/                        # Utilities & Configuration
│   ├── config.py                # Configuration management
│   ├── jira_api.py              # Extended JIRA API
│   └── common.py                # Common utilities
├── docs/                         # 📚 Documentation Hub
│   ├── INDEX.md                 # Documentation index
│   ├── guides/                  # User guides
│   ├── implementation/          # Implementation docs
│   └── reports/                 # Analysis & reports
├── logs/                         # Application logs
├── ml_service/                   # ML service components
├── models/                       # Data models
├── run_server.py                # 🚀 Entry point
├── requirements.txt              # Python dependencies
└── README.md                    # This file
```

## ✨ Features

### 🎨 Premium UI/UX
- **Glassmorphism Design**: Modern frosted glass effects with backdrop blur
- **Smoke Black Sidebar**: Transparent, ethereal dark sidebar with beautiful gradients
- **Light Gray Background**: Professional, clean main content area
- **Responsive Layout**: Works on desktop, tablet, and mobile

### 📊 Ticket Management
- **Kanban Board View**: Organize tickets by status columns
- **Real-time Updates**: Auto-refresh data from JIRA
- **Advanced Filtering**: Search, filter by status, severity, assignee
- **Ticket Details**: Expand/collapse to see full ticket information

### 💬 Communication
- **Comments Section**: View and add comments to tickets
- **Message Bubbles**: Beautiful chat-style message rendering
- **Unread Badges**: Track unread comments with visual indicators

### 🎯 Smart Features
- **ML-Powered Analytics**: Anomaly detection and predictive insights
- **AI Comment Suggestions**: Ollama-powered intelligent responses
- **Assigned to Me**: Dedicated section for your tickets
- **Quick Actions**: Assign tickets, add comments with one click
- **Export Functionality**: Download ticket data as CSV

### ⚡ Performance
- **Multi-layer Caching**: 3-tier caching system
- **Hash-based Change Detection**: Efficient ticket updates
- **Optimized API Calls**: Reduced load times
- **<100ms Response Times**: Ultra-fast UI interactions

## 🔧 Configuration

### Environment Variables

Create a `.env` file with:

```env
# JIRA Connection
JIRA_CLOUD_SITE=https://your-instance.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token

# Server Configuration
PORT=5001
HOST=127.0.0.1

# Caching
CACHE_TTL=300
SIDEBAR_CACHE_TTL=3600
```

### Application Settings

Edit configuration in `utils/config.py` for:
- API endpoints
- Cache TTL values
- Retry policies
- Default timeouts

## 📦 Dependencies

Main dependencies:
- **Flask**: Web framework for backend API
- **pandas**: Data manipulation
- **requests**: HTTP client for JIRA API
- **python-dotenv**: Environment variable management
- **SQLAlchemy**: Database ORM

See `requirements.txt` for complete list.

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Check Python version
python --version  # Should be 3.13+

# Reinstall dependencies
pip install -r requirements.txt

# Verify .env file
cat .env
```

### API Errors (403 Forbidden)
- Verify JIRA credentials in `.env`
- Check API token permissions
- Ensure user has access to service desks/queues

### Performance Issues
- Check cache TTL settings in `utils/config.py`
- Reduce number of displayed items with filters
- Use appropriate queue selection

### More Help
See the [Documentation Index](docs/INDEX.md) for detailed guides.

## 🚀 Development

### Adding New Features

1. **Create UI components** in `frontend/static/`
2. **Add business logic** in `core/functions.py`
3. **Add REST endpoints** in `api/blueprints/`
4. **Integrate** in `api/server.py`
5. **Test** with `run_server.py`

### Code Quality

- Follow PEP 8 style guide
- Use type hints for better IDE support
- Document functions with docstrings
- Test changes before committing

### Performance Tips

- Use appropriate caching decorators
- Implement pagination for large datasets
- Batch API requests when possible
- Monitor cache sizes and invalidate when needed

## 📈 Project Status

| Metric | Value |
|--------|-------|
| **Total Lines of Code** | 15,000+ |
| **Backend Files** | 20+ core modules |
| **Frontend Files** | Modular architecture |
| **Documentation** | 60+ organized documents |
| **Status** | ✅ Production Ready |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions:
- Check [Documentation Index](docs/INDEX.md)
- Review application logs in `logs/` directory
- Open an issue on GitHub

---

**Last Updated**: December 10, 2025  
**Version**: 2.0  
**Status**: ✅ Production Ready  

**📚 [Complete Documentation Index](docs/INDEX.md)**
