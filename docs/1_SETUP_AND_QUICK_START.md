# 🚀 SPEEDYFLOW - Setup and Quick Start Guide

**Complete setup, installation, and getting started guide for SPEEDYFLOW JIRA Platform**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [First Run](#first-run)
5. [Login System](#login-system)
6. [Initial Configuration](#initial-configuration)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Python**: 3.13+ (required)
- **JIRA Cloud**: Account with API token
- **pip**: Python package manager
- **Git**: Version control
- **Browser**: Chrome, Firefox, Safari, or Edge (modern versions)

### JIRA Requirements
- JIRA Cloud instance (Atlassian)
- API token generated from account settings
- Service Desk access permissions
- Queue read/write permissions

### Optional
- **Docker**: For containerized ML service
- **PostgreSQL**: For production database (development uses SQLite)

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/ralph8a/SPEEDYFLOW-JIRA-Platform.git
cd SPEEDYFLOW-JIRA-Platform
```

### 2. Install Dependencies

```bash
# Install all Python packages
pip install -r requirements.txt
```

**Key Dependencies:**
- `Flask` 3.0.0 - Web framework
- `pandas` 2.1.4 - Data manipulation
- `requests` 2.31.0 - HTTP client
- `python-dotenv` 1.0.0 - Environment variables
- `tensorflow` 2.15.0 - ML models
- `spacy` 3.7.2 - NLP embeddings

### 3. Download spaCy Language Model

```bash
# Spanish language model for ML features (300MB)
python -m spacy download es_core_news_md
```

---

## Configuration

### 1. Environment Variables

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` with your JIRA credentials:

```env
# JIRA Connection (Required)
JIRA_CLOUD_SITE=https://your-instance.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token-here

# Server Configuration
PORT=5001
HOST=127.0.0.1
FLASK_ENV=development

# Caching Configuration
CACHE_TTL=900                # 15 minutes default
SIDEBAR_CACHE_TTL=3600       # 1 hour for sidebar
LARGE_QUEUE_TTL=10800        # 3 hours for queues ≥50 tickets

# ML Service (Optional - if using microservice)
ML_SERVICE_URL=http://localhost:5001
ML_SERVICE_ENABLED=true
```

### 2. Get JIRA API Token

1. Log in to Atlassian: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Give it a label (e.g., "SPEEDYFLOW")
4. Copy the token immediately (won't be shown again)
5. Paste in `.env` file

### 3. Backup Credentials (Optional)

The system also stores credentials in:
```
~/Documents/SpeedyFlow/credentials.env
```

This provides a backup location for credential recovery.

---

## First Run

### 1. Start the Server

```bash
python run_server.py
```

**Expected Output:**
```
============================================================
SPEEDYFLOW - JIRA Service Desk Platform
============================================================

Starting Flask server...
Server: http://127.0.0.1:5001

[2025-12-10 10:30:15] INFO: Loading configuration...
[2025-12-10 10:30:15] INFO: Initializing JIRA API client...
[2025-12-10 10:30:16] INFO: Registering blueprints...
✓ Blueprint registered: main
✓ Blueprint registered: comment_suggestions
✓ Blueprint registered: anomaly_detection
✓ Blueprint registered: ml_dashboard
✓ Blueprint registered: backgrounds
[2025-12-10 10:30:16] INFO: Server ready!

 * Running on http://127.0.0.1:5001
 * Press CTRL+C to quit
```

### 2. Open Application

Navigate to: **http://127.0.0.1:5001**

### 3. Verify Loading

Check browser console (F12) for:
```javascript
[SPEEDYFLOW] Initializing application...
[SPEEDYFLOW] Loading service desks...
[SPEEDYFLOW] Cache Manager initialized
[SPEEDYFLOW] ML modules loaded
[SPEEDYFLOW] Application ready!
```

---

## Login System

### First-Time Login Flow

**On first visit**, a modal appears:

1. **JIRA Site URL**
   - Format: `https://your-instance.atlassian.net`
   - Validates URL format before proceeding

2. **Email Address**
   - Your Atlassian account email
   - Used for API authentication

3. **API Token**
   - Paste token from Atlassian account
   - Token is encrypted before storage

4. **Optional: Project Key**
   - Example: `MSM`, `SD`, `PROJ`
   - Enables auto-selection of service desk

### Login Sequence

```
User visits → Check sessionStorage.hasLoggedIn
              ↓ (not found)
          Show login modal
              ↓
          User enters credentials
              ↓
          POST /api/user/login
              ↓
          Store in .env + backup location
              ↓
          Set sessionStorage.hasLoggedIn = true
              ↓
          Close modal → Load application
              ↓
          Auto-select desk if project_key provided
              ↓
          Auto-filter "Assigned to me" queue
```

### Login API Endpoints

**Check Login Status:**
```javascript
GET /api/user/login-status
Response: { "logged_in": true/false }
```

**Perform Login:**
```javascript
POST /api/user/login
Body: {
  "jira_site": "https://instance.atlassian.net",
  "jira_email": "user@company.com",
  "jira_token": "token_here",
  "project_key": "MSM" // optional
}
Response: { "success": true, "message": "Login successful" }
```

### Session Management

- **Storage**: `sessionStorage.hasLoggedIn = 'true'`
- **Persistence**: Per browser tab/window
- **Logout**: Clear sessionStorage + reload page
- **Re-login**: Automatic on credential failure

---

## Initial Configuration

### 1. Adaptive View Selection

After login, system automatically chooses view:

- **≤20 tickets**: Kanban Board View (visual, card-based)
- **>20 tickets**: List View (table, compact)

### 2. Auto-Queue Selection

System recognizes these queue patterns:
- "Assigned to me"
- "Asignado a mi"
- "Mis tickets"
- "My tickets"

**If found**: Auto-selects on first load

### 3. Service Desk Selection

**If project_key provided:**
1. Fetches all service desks
2. Matches by project key
3. Auto-selects matched desk
4. Loads queues for that desk

**Manual selection:**
- Use sidebar dropdown: "Select Service Desk"
- Choose from list of available desks
- System loads queues automatically

### 4. Initial Data Load

```
Service Desk selected
        ↓
Load queues (cached 1 hour)
        ↓
Auto-select "Assigned to me" queue
        ↓
Fetch issues (cached 15 min)
        ↓
Render view (Kanban or List)
        ↓
Background: Load ML predictions
        ↓
Background: Check for anomalies
```

---

## Deployment

### Pre-Deployment Checklist

- [ ] All tests passing (`pytest` 5/5 ✓)
- [ ] Environment variables set in production
- [ ] HTTPS certificates configured
- [ ] Database migrations applied
- [ ] ML models present in `models/` directory
- [ ] spaCy language model installed
- [ ] Static files compressed
- [ ] Backup system configured

### Production Setup

#### 1. Use Production Server (Gunicorn)

```bash
# Install Gunicorn
pip install gunicorn

# Run with 4 worker processes
gunicorn -w 4 -b 0.0.0.0:5001 "api.server:app"
```

#### 2. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name speedyflow.company.com;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_types application/json text/css application/javascript;
    gzip_min_length 500;
}
```

#### 3. SSL/TLS Configuration

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d speedyflow.company.com
```

#### 4. Systemd Service

Create `/etc/systemd/system/speedyflow.service`:

```ini
[Unit]
Description=SPEEDYFLOW JIRA Platform
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/speedyflow
Environment="PATH=/opt/speedyflow/venv/bin"
ExecStart=/opt/speedyflow/venv/bin/gunicorn -w 4 -b 127.0.0.1:5001 "api.server:app"
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable speedyflow
sudo systemctl start speedyflow
sudo systemctl status speedyflow
```

### Docker Deployment (Optional)

```bash
# Build image
docker build -t speedyflow:latest .

# Run container
docker run -d \
  --name speedyflow \
  -p 5001:5001 \
  -v $(pwd)/.env:/app/.env \
  -v $(pwd)/logs:/app/logs \
  speedyflow:latest
```

### ML Service Deployment (Microservice)

```bash
cd ml_service

# Build ML service image
docker build -t speedyflow-ml:latest .

# Run ML service
docker run -d \
  --name speedyflow-ml \
  -p 5001:5001 \
  -v $(pwd)/models:/app/models \
  speedyflow-ml:latest
```

Or use docker-compose:

```bash
docker-compose up -d
```

---

## Troubleshooting

### Server Won't Start

**Problem**: `ModuleNotFoundError: No module named 'flask'`

**Solution**:
```bash
pip install -r requirements.txt
```

---

**Problem**: `Port 5001 already in use`

**Solution**:
```bash
# Find process using port
lsof -i :5001

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=5002
```

### Login Issues

**Problem**: "Invalid credentials" error

**Solution**:
1. Verify JIRA site URL format (must include `https://`)
2. Check email is correct Atlassian account
3. Regenerate API token
4. Test credentials with curl:
```bash
curl -u "email@company.com:API_TOKEN" \
  https://your-instance.atlassian.net/rest/api/3/myself
```

---

**Problem**: Login modal appears every time

**Solution**:
- Check browser console for sessionStorage errors
- Enable cookies/storage in browser settings
- Try incognito/private mode to reset

### API Errors

**Problem**: 403 Forbidden

**Solution**:
- Verify API token has correct permissions
- Check user has Service Desk access
- Ensure user can view the selected queue

---

**Problem**: 429 Too Many Requests

**Solution**:
- Increase cache TTL in `.env`
- Reduce auto-refresh frequency
- Check for infinite loops in code

### Performance Issues

**Problem**: Slow initial load (>5 seconds)

**Solution**:
1. Check network tab in DevTools
2. Verify cache is working (should see hits after first load)
3. Reduce number of displayed tickets
4. Enable gzip compression
5. Check backend logs for slow queries

---

**Problem**: High memory usage

**Solution**:
- Clear browser cache
- Reduce cache TTL to free memory sooner
- Check for memory leaks in console
- Restart server to clear backend cache

### ML Features Not Working

**Problem**: ML predictions not appearing

**Solution**:
```bash
# Verify models exist
ls -la models/
# Should see: assignee_suggester.keras, priority_classifier.keras, etc.

# Check ML service status
curl http://localhost:5001/health

# Restart ML service
docker restart speedyflow-ml
```

---

**Problem**: spaCy model not found

**Solution**:
```bash
python -m spacy download es_core_news_md
python -m spacy validate
```

### Cache Issues

**Problem**: Stale data showing

**Solution**:
1. Hard refresh browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Clear application cache: DevTools → Application → Clear Storage
3. Check cache TTL settings in `.env`
4. Manually clear cache via API:
```javascript
localStorage.clear();
location.reload();
```

---

## Quick Reference Commands

```bash
# Start server
python run_server.py

# Run tests
pytest

# Check ML models
python scripts/verify_models.py

# Export training data
curl http://localhost:5001/api/ml/comments/export-training-data

# View logs
tail -f logs/speedyflow.log

# Check health
curl http://localhost:5001/health
```

---

## Next Steps

✅ Installation complete  
✅ Server running  
✅ Logged in  

**Now learn about:**
- [ML & AI Features](2_ML_AND_AI_FEATURES.md) - Machine learning capabilities
- [Architecture & Performance](3_ARCHITECTURE_AND_PERFORMANCE.md) - System design
- [UI/UX Implementation](4_UI_UX_IMPLEMENTATION.md) - Interface features

---

**Last Updated**: December 10, 2025  
**Version**: 2.0  
**Status**: Production Ready
