# 🤖 SPEEDYFLOW - ML & AI Features Guide

**Complete guide to Machine Learning and AI capabilities in SPEEDYFLOW**

---

## 📋 Table of Contents

1. [ML Models Overview](#ml-models-overview)
2. [ML Microservice Architecture](#ml-microservice-architecture)
3. [Priority Engine](#priority-engine)
4. [Predictive Dashboard](#predictive-dashboard)
5. [Comment Suggestions](#comment-suggestions)
6. [Anomaly Detection](#anomaly-detection)
7. [ML Analyzer with Caching](#ml-analyzer-with-caching)
8. [Training System](#training-system)
9. [API Reference](#api-reference)

---

## ML Models Overview

SPEEDYFLOW includes **6 production-ready ML models** trained on real JIRA ticket data.

### Model Inventory

| Model | Accuracy | Size | Purpose | Input Features |
|-------|----------|------|---------|----------------|
| **Priority Classifier** | 99.64% ⭐ | 0.57 MB | Auto-suggest priority (5 classes) | Text embeddings (300D) |
| **Duplicate Detector** | 90.12% | 0.57 MB | Detect duplicate/cancelled tickets | Cosine similarity on embeddings |
| **Status Suggester** | 89.28% | 0.57 MB | Predict next status transition | Historical patterns + text |
| **SLA Breach Predictor** | 85.29% | 0.59 MB | Predict SLA violations | SLA remaining + priority + features |
| **Assignee Suggester** | 23.41%* | 1.42 MB | Recommend top-3 assignees | Issue type + priority + workload |
| **Labels Suggester** | 25%** | 1.32 MB | Multi-label classification | Text content analysis |

**\*Note**: Assignee model has lower accuracy due to class imbalance (50+ assignees). Top-3 predictions increase usefulness.  
**\*\*Note**: Labels model optimized for precision (91.67%) over recall - reduces false positives.

### Model Files Location

```
models/
├── priority_classifier.keras       # Priority prediction
├── duplicate_detector.keras        # Duplicate detection
├── status_suggester.keras          # Status transitions
├── breach_predictor.keras          # SLA breach prediction
├── assignee_suggester.keras        # Assignee recommendations
├── labels_suggester.keras          # Label suggestions
├── assignee_encoder.pkl            # Assignee label encoder
├── status_encoder.pkl              # Status label encoder
├── labels_binarizer.pkl            # Multi-label binarizer
├── label_encoders.pkl              # Various encoders
└── checkpoints/                    # Training checkpoints
    ├── assignee_best.weights.h5
    ├── status_best.weights.h5
    └── labels_best.weights.h5
```

### NLP Embeddings

**spaCy es_core_news_md** (Spanish language model):
- **Dimensions**: 300D word vectors
- **Vocabulary**: 500K tokens
- **Size**: ~300 MB
- **Use**: Text feature extraction for all models

---

## ML Microservice Architecture

### Unified ML Service

**FastAPI microservice** running separately from main Flask app:

```
┌─────────────────────────────────────┐
│   Flask App (Port 5000)             │
│   - UI rendering                    │
│   - JIRA API calls                  │
│   - Session management              │
└──────────────┬──────────────────────┘
               │ HTTP REST API
               ↓
┌─────────────────────────────────────┐
│   ML Service (Port 5001)            │
│   - SpeedyflowMLPredictor           │
│   - 6 ML models loaded              │
│   - Batch predictions               │
└─────────────────────────────────────┘
```

### Service Components

**File**: `ml_service/main.py` (FastAPI application)  
**Predictor**: `ml_service/predictor.py` (Unified model manager)

### Performance Metrics

- **Average Latency**: 585ms per prediction
- **Memory Usage**: 749 MB (includes models + spaCy)
- **Throughput**: ~2 predictions/second
- **Startup Time**: ~10 seconds (model loading)

### Health Monitoring

```bash
# Check service health
curl http://localhost:5001/health

Response:
{
  "status": "healthy",
  "models_loaded": 6,
  "memory_mb": 749,
  "uptime_seconds": 3600
}
```

### Docker Deployment

```bash
# Build image
cd ml_service
docker build -t speedyflow-ml:latest .

# Run container
docker run -d \
  --name speedyflow-ml \
  -p 5001:5001 \
  -v $(pwd)/../models:/app/models \
  speedyflow-ml:latest

# Check logs
docker logs speedyflow-ml
```

---

## Priority Engine

**Intelligent ticket prioritization** using ML + rule-based scoring.

### Features

**12-Feature Scoring System**:
1. **SLA hours remaining** (0-100 scale, inversely weighted)
2. **Priority level** (Critical=100, High=75, Medium=50, Low=25)
3. **Comment count** (engagement indicator)
4. **Days open** (urgency increases over time)
5. **Severity** (if present in custom fields)
6. **Assignee status** (unassigned tickets scored higher)
7. **Watchers count** (visibility indicator)
8. **Issue type weight** (Incident > Bug > Task)
9. **Labels** (keywords like "urgent", "critical")
10. **Description length** (complexity proxy)
11. **Attachments** (context availability)
12. **Transitions count** (workflow progression)

### Urgency Score (0-100)

```python
urgency_score = (
    sla_weight * 0.35 +           # 35% weight
    priority_weight * 0.25 +      # 25% weight
    engagement_score * 0.15 +     # 15% weight (comments + watchers)
    time_score * 0.15 +           # 15% weight (days open)
    complexity_score * 0.10       # 10% weight (description + attachments)
)
```

### 4-Tier Classification

- 🔥 **Critical** (85-100): Immediate attention required
- ⚡ **High** (65-84): Priority handling needed
- 📌 **Medium** (40-64): Standard queue processing
- 📋 **Low** (0-39): Can be deferred

### SLA Breach Prediction

**Risk Levels**:
- **🚨 Critical Risk** (>80%): Breach imminent (<2 hours)
- **⚠️ High Risk** (60-80%): At-risk (<4 hours)
- **📊 Medium Risk** (40-60%): Monitor (<8 hours)
- **✅ Low Risk** (<40%): On track (>8 hours)

**Prediction Formula**:
```python
breach_probability = ml_model.predict([
    sla_hours_remaining,
    priority_value,
    days_open,
    comment_count,
    assignee_workload
])

hours_until_breach = (
    sla_hours_remaining - 
    (predicted_resolution_time * (1 + breach_probability))
)
```

### API Endpoint

```javascript
GET /api/ml/priority/<issue_key>

Response:
{
  "issue_key": "MSM-1234",
  "urgency_score": 87,
  "urgency_tier": "critical",
  "sla_breach_prediction": {
    "probability": 0.82,
    "risk_level": "critical",
    "hours_until_breach": 1.5,
    "recommended_action": "Escalate immediately"
  },
  "confidence": 0.94,
  "features_breakdown": {
    "sla_score": 30.5,
    "priority_score": 25.0,
    "engagement_score": 12.8,
    "time_score": 13.2,
    "complexity_score": 5.5
  }
}
```

### Usage in UI

**Priority Badge** on ticket cards:
```html
<span class="priority-badge critical">
  🔥 Critical (87)
</span>
```

**SLA Alert** with countdown:
```html
<div class="sla-alert critical">
  ⏰ 1.5h until breach (82% risk)
</div>
```

---

## Predictive Dashboard

**Real-time ML-powered insights dashboard** with 4 main tabs.

### Tab 1: Overview

**Metrics**:
- **Total Tickets**: Current active tickets
- **Critical Count**: Tickets requiring immediate attention (🔥)
- **SLA Compliance**: % of tickets meeting SLA (target >90%)
- **At-Risk Tickets**: Predicted SLA breaches in next 24h

**Visualizations**:
- **Doughnut Chart**: Ticket distribution by priority tier
- **Gauge Chart**: SLA compliance percentage

### Tab 2: Breach Forecast

**24-48 Hour Predictions**:

Timeline view showing:
- Predicted breach time
- Current risk score (0-100)
- Recommended actions
- Assignee workload

**Sorting**: By breach time (ascending)

**Example Entry**:
```
MSM-1234: "Cannot access user dashboard"
├─ Predicted Breach: Today at 15:30 (3.5 hours)
├─ Risk Score: 87/100 🚨
├─ Assignee: John Doe (12 active tickets)
└─ Action: Escalate + reassign to lower workload agent
```

### Tab 3: Performance Trends

**7-Day Charts**:

1. **Ticket Volume** (Line chart)
   - Created vs Resolved
   - Trend line with 7-day moving average

2. **SLA Compliance** (Line chart)
   - Daily compliance percentage
   - Target line at 90%

3. **Resolution Time** (Bar chart)
   - Average time per day
   - Color-coded by performance

**Insights**:
- "↑ 15% increase in ticket creation vs last week"
- "↓ SLA compliance dropped 3% - investigate blockers"

### Tab 4: Team Workload

**Agent Distribution**:

```
Agent Name          Active  Critical  Load Score  Status
─────────────────────────────────────────────────────────
John Doe            12      3         82          🔴 Over
Jane Smith          8       1         54          🟢 OK
Bob Johnson         15      2         95          🔴 Over
Alice Williams      5       0         32          🟢 Under
```

**Load Score Calculation**:
```python
load_score = (
    (active_tickets / team_avg) * 0.6 +
    (critical_tickets / team_critical_avg) * 0.4
) * 100

# Color coding:
# 🟢 Green: 0-60 (capacity available)
# 🟡 Yellow: 61-80 (balanced)
# 🔴 Red: 81-100+ (overloaded)
```

**Balance Score**: 72 (team distribution efficiency)

### Chart.js Configuration

**Library**: Chart.js 4.4.0

**Chart Types Used**:
- **Doughnut**: Priority distribution
- **Bar**: Resolution time, team workload
- **Line**: Trends (volume, compliance)

**Responsive**: Auto-resize with window

### Auto-Refresh

**Interval**: 5 minutes (configurable)

**Toggle**: ON/OFF switch in dashboard header

**Manual Refresh**: ♻️ button triggers immediate update

### API Endpoints

```javascript
// Get full dashboard data
GET /api/ml/dashboard/overview

// Get breach predictions
GET /api/ml/dashboard/breach-forecast

// Get performance trends
GET /api/ml/dashboard/trends?days=7

// Get team workload
GET /api/ml/dashboard/team-workload

// Get SLA metrics
GET /api/ml/dashboard/sla-metrics
```

---

## Comment Suggestions

**Context-aware response suggestions** for faster ticket resolution.

### 12 Contextual Categories

| Category | Keywords Detected | Suggestion Type |
|----------|-------------------|-----------------|
| **Error/Exception** | error, exception, failed, crash | Diagnostic (logs, stacktrace) |
| **Performance** | slow, lag, timeout, performance | Metrics request |
| **Login/Auth** | login, auth, password, credentials | Credential verification |
| **Network** | connection, network, offline | Network diagnostics |
| **Database** | database, query, data, SQL | DB logs review |
| **UI/Frontend** | UI, interface, button, display | Screenshot request |
| **API/Integration** | API, integration, webhook, endpoint | Integration logs |
| **Email/Notifications** | email, notification, message | Spam folder check |
| **Configuration** | config, setting, setup | Configuration guide |
| **Bug** | bug, issue, defect | Reproduction steps |
| **Feature Request** | feature, request, enhancement | Feasibility evaluation |
| **General** | (fallback) | Generic helpful response |

### Suggestion Format

```json
{
  "issue_key": "MSM-1234",
  "suggestions": [
    {
      "id": 1,
      "text": "Hola! Para ayudarte con este error, ¿podrías adjuntar los logs completos y el stacktrace?",
      "type": "diagnostic",
      "confidence": 0.92,
      "category": "Error/Exception",
      "quick_actions": ["request_logs", "escalate"]
    },
    {
      "id": 2,
      "text": "He revisado casos similares. Verifica que la versión de tu aplicación sea la 2.3.5 o superior.",
      "type": "resolution",
      "confidence": 0.85,
      "category": "Error/Exception",
      "quick_actions": ["mark_resolved"]
    },
    {
      "id": 3,
      "text": "Mientras investigo, ¿el error ocurre consistentemente o es intermitente?",
      "type": "clarification",
      "confidence": 0.78,
      "category": "Error/Exception",
      "quick_actions": ["request_info"]
    }
  ],
  "context": {
    "summary": "Error en login de usuario",
    "description": "Al intentar ingresar sale exception...",
    "priority": "High",
    "status": "In Progress"
  }
}
```

### UI Integration

**Location**: Right sidebar of ticket detail view

**Display**:
- Shows top 3 suggestions
- Type badges: 🔍 Diagnostic, ✅ Resolution, ❓ Clarification
- Confidence percentage badge
- Two buttons per suggestion:
  - **"Usar"**: Inserts text into comment box
  - **"Copiar"**: Copies to clipboard

### API Endpoint

```javascript
POST /api/ml/comments/suggestions

Request:
{
  "issue_key": "MSM-1234",
  "include_context": true
}

Response: (see Suggestion Format above)
```

### Training Database

**Auto-save feature**: Every generated suggestion is automatically stored.

**Schema**: `ml_training_db.py`
```python
{
  "ticket_key": "MSM-1234",
  "summary": "Error en login",
  "description": "...",
  "issue_type": "Bug",
  "status": "In Progress",
  "priority": "High",
  "all_comments": ["...", "..."],
  "suggestions": [...],
  "model": "comment_suggester_v1",
  "timestamp": "2025-12-10T10:30:00Z"
}
```

**Deduplication**: MD5 hash of context prevents duplicate entries

**Compression**: GZIP applied after 100 samples

### Export Training Data

```javascript
GET /api/ml/comments/export-training-data

Response: JSON file with all stored suggestions
Format: Ready for model re-training
```

### Training Statistics

```javascript
GET /api/ml/comments/ml-stats

Response:
{
  "total_suggestions": 1247,
  "by_type": {
    "diagnostic": 512,
    "resolution": 398,
    "clarification": 337
  },
  "by_status": {
    "In Progress": 623,
    "Waiting for Support": 412,
    "Resolved": 212
  },
  "avg_confidence": 0.84,
  "unique_tickets": 891
}
```

---

## Anomaly Detection

**Real-time operational anomaly detection** to catch issues early.

### 5 Anomaly Types

#### 1. Creation Spike (High Severity)
**Trigger**: >3x average daily ticket creation

**Detection**:
```python
baseline_avg = 27.42 tickets/day
current_creation = 85 tickets (today)
ratio = 85 / 27.42 = 3.1x

if ratio > 3.0:
    alert("Creation Spike", severity="high")
```

**Possible Causes**:
- System outage affecting many users
- Mass notification triggering support requests
- Automated bot creating duplicate tickets

#### 2. Assignment Overload (High Severity)
**Trigger**: Agent has >2x team average active tickets

**Detection**:
```python
team_avg = 8.5 active tickets/agent
agent_tickets = 18 active tickets
ratio = 18 / 8.5 = 2.1x

if ratio > 2.0:
    alert("Assignment Overload", agent=name, severity="high")
```

**Recommended Action**: Redistribute tickets

#### 3. Unassigned Tickets (Medium Severity)
**Trigger**: >20% of tickets unassigned

**Detection**:
```python
total_tickets = 150
unassigned = 35
percentage = 35 / 150 = 23.3%

if percentage > 0.20:
    alert("Unassigned Tickets", count=35, severity="medium")
```

**Recommended Action**: Review assignment rules

#### 4. Stalled Ticket (High Severity)
**Trigger**: Ticket in same status >48 hours

**Detection**:
```python
hours_in_status = 72
threshold = 48

if hours_in_status > threshold:
    alert("Stalled Ticket", issue_key, severity="high")
```

**Recommended Action**: Follow up or escalate

#### 5. Issue Type Spike (Medium Severity)
**Trigger**: Specific issue type >2x expected frequency

**Detection**:
```python
expected_frequency = 15% of tickets
current_frequency = 32% of tickets
ratio = 0.32 / 0.15 = 2.1x

if ratio > 2.0:
    alert("Issue Type Spike", type=name, severity="medium")
```

**Possible Cause**: Product bug affecting feature area

### Baseline Statistics

**Calculated on training**:
- **Average tickets/day**: 27.42
- **Tickets per agent**: 8.5 average
- **State durations**: Median times per status
- **Hourly distribution**: Traffic patterns by hour
- **Issue type distribution**: Normal percentages

**Recalculation**: Weekly or on-demand via API

### Dashboard UI

**Modal Interface**:

```
┌─────────────────────────────────────────────────────┐
│  🚨 Anomaly Detection Dashboard           Auto ☑ ♻️ │
├─────────────────────────────────────────────────────┤
│  📊 Summary                                          │
│  ┌────────────┬────────────┬─────────────┐         │
│  │ High (🔴)  │ Medium (🟡)│ Total       │         │
│  │     3      │      5     │      8      │         │
│  └────────────┴────────────┴─────────────┘         │
│                                                      │
│  ℹ️ Baseline Info                                   │
│  • Avg tickets/day: 27.42                           │
│  • Avg per agent: 8.5                               │
│  • Last updated: 2 hours ago                        │
│                                                      │
│  🚨 Active Anomalies                                │
│  ┌───────────────────────────────────────────┐     │
│  │ 🔴 Creation Spike                          │     │
│  │ 85 tickets created today (3.1x average)   │     │
│  │ Detected: 10:30 AM                         │     │
│  └───────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────┐     │
│  │ 🔴 Assignment Overload - John Doe          │     │
│  │ 18 active tickets (2.1x team average)     │     │
│  │ Action: Redistribute load                  │     │
│  └───────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────┐     │
│  │ 🟡 Unassigned Tickets                      │     │
│  │ 35 tickets (23.3%) awaiting assignment    │     │
│  │ Action: Review assignment rules            │     │
│  └───────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

**Header Badge**: Shows count of critical anomalies

**Auto-Refresh**: Every 2 minutes (toggle)

### API Endpoints

```javascript
// Get full dashboard
GET /api/ml/anomalies/dashboard

// Get current anomalies (filterable)
GET /api/ml/anomalies/current?severity=high

// Train/recalculate baseline
POST /api/ml/anomalies/train

// Get baseline statistics
GET /api/ml/anomalies/baseline

// Get anomaly type definitions
GET /api/ml/anomalies/types
```

---

## ML Analyzer with Caching

**3-level caching system** for ML analysis results.

### Cache Architecture

```
Request for ML analysis
        ↓
┌───────────────────────┐
│ Level 1: Memory Cache │ <1ms (3000x faster)
│ (Python dict)         │
└───────┬───────────────┘
        ↓ (miss)
┌───────────────────────┐
│ Level 2: LocalStorage │ <10ms (300x faster)
│ (Browser cache)       │
└───────┬───────────────┘
        ↓ (miss)
┌───────────────────────┐
│ Level 3: Backend DB   │ ~500ms (5x faster)
│ (SQLite cache)        │
└───────┬───────────────┘
        ↓ (miss)
┌───────────────────────┐
│ Compute ML Prediction │ ~2500ms (full computation)
│ (Neural network)      │
└───────────────────────┘
```

### Adaptive TTL

**Dynamic cache duration based on queue size**:

```python
if queue_size < 50:
    ttl = 900  # 15 minutes (active queue)
elif queue_size < 200:
    ttl = 3600  # 1 hour (medium queue)
else:
    ttl = 10800  # 3 hours (large queue)
```

**Rationale**: Large queues change slower, benefit more from caching

### Backend Database Cache

**Table**: `ml_analysis_cache`

```sql
CREATE TABLE ml_analysis_cache (
    id INTEGER PRIMARY KEY,
    service_desk_id TEXT NOT NULL,
    queue_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_desk_queue (service_desk_id, queue_id)
);
```

**Expiration**: Background job clears expired entries hourly

### Performance Impact

**Without caching**:
- First load: 2500ms × 50 tickets = **125 seconds**
- Refresh: 125 seconds every time

**With 3-level caching**:
- First load: 125 seconds (cold start)
- Second load (memory): **<1ms** per ticket = **<50ms total**
- Third load (localStorage): **<10ms** per ticket = **<500ms total**
- After expiry (DB): **~500ms** per ticket = **~25 seconds**

**Cache hit ratio**: ~90% for large queues with 3-hour TTL

---

## Training System

### Dataset Statistics

**Size**: 9,818 tickets
- **Active**: 8,356 (85.1%)
- **Discarded**: 1,462 (14.9%)

**Projects**:
- MSM: 4,971 (50.6%)
- OP: 2,632 (26.8%)
- QA: 739 (7.5%)
- DES: 602 (6.1%)
- Others: 874 (8.9%)

**Field Completeness**:
- Summary: 100%
- Status: 100%
- Priority: 100%
- Description: 93.2%
- Assignee: 87.5%
- Labels: 45.3%

**SLA Data**:
- Tickets with SLA: 7,575 (77.2%)
- SLA breaches: 1,175 (12.0%)
- Avg hours to breach: 24.5

### Training Scripts

#### 1. Main Training Pipeline

**File**: `scripts/train_ml_models.py`

```bash
python scripts/train_ml_models.py
```

**Trains**:
- Priority Classifier
- Duplicate Detector
- Breach Predictor

**Duration**: ~15-20 minutes

#### 2. Suggester Models (Batch 1)

**File**: `scripts/train_suggester_batch1.py`

```bash
python scripts/train_suggester_batch1.py
```

**Trains**:
- Assignee Suggester
- Labels Suggester

**Duration**: ~25-30 minutes

#### 3. Status Suggester

**File**: `scripts/train_status_suggester.py`

```bash
python scripts/train_status_suggester.py
```

**Trains**:
- Status Suggester (transitions)

**Duration**: ~10-15 minutes

### Model Verification

```bash
python scripts/verify_models.py
```

**Output**:
```json
{
  "models_found": 6,
  "models_valid": 6,
  "total_size_mb": 4.93,
  "details": {
    "priority_classifier.keras": {
      "exists": true,
      "size_mb": 0.57,
      "loadable": true,
      "accuracy": 0.9964
    },
    ...
  }
}
```

### Model Architecture

**Common Pattern** (Keras Sequential):

```python
model = Sequential([
    Dense(256, activation='relu', input_shape=(300,)),  # Embedding input
    Dropout(0.3),
    Dense(128, activation='relu'),
    Dropout(0.2),
    Dense(64, activation='relu'),
    Dense(num_classes, activation='softmax')  # Output layer
])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)
```

**Training Config**:
- Batch size: 32
- Epochs: 50 (with early stopping)
- Validation split: 20%
- Callbacks: ModelCheckpoint, EarlyStopping, ReduceLROnPlateau

### Embeddings Generation

**spaCy Pipeline**:

```python
import spacy
nlp = spacy.load('es_core_news_md')

def get_embedding(text):
    doc = nlp(text)
    return doc.vector  # 300-dimensional vector
```

**Text Preprocessing**:
1. Lowercase
2. Remove special characters
3. Tokenization
4. Stopword removal (optional)
5. Generate 300D embedding

---

## API Reference

### ML Prediction Endpoints

#### Get All Predictions

```http
POST /ml/predict/all
Content-Type: application/json

{
  "summary": "User cannot login to dashboard",
  "description": "Error message shows 'Invalid credentials'...",
  "priority": "High",
  "issue_type": "Bug",
  "status": "Open",
  "comments": ["Checking logs...", "Found exception..."],
  "assignee": "john.doe",
  "created": "2025-12-10T08:00:00Z"
}

Response:
{
  "priority": {
    "prediction": "High",
    "confidence": 0.96,
    "probabilities": {"Critical": 0.12, "High": 0.96, "Medium": 0.02, ...}
  },
  "duplicate": {
    "is_duplicate": true,
    "confidence": 0.87,
    "similar_tickets": ["MSM-1230", "MSM-1189"]
  },
  "status_next": {
    "prediction": "In Progress",
    "confidence": 0.82
  },
  "breach": {
    "will_breach": true,
    "probability": 0.75,
    "hours_until_breach": 4.2
  },
  "assignee": {
    "recommendations": ["jane.smith", "bob.johnson", "alice.williams"],
    "confidences": [0.45, 0.32, 0.23]
  },
  "labels": {
    "suggestions": ["login", "authentication", "urgent"],
    "confidences": [0.89, 0.85, 0.71]
  }
}
```

#### Individual Predictions

```http
POST /ml/predict/priority
POST /ml/predict/duplicate
POST /ml/predict/status
POST /ml/predict/breach
POST /ml/predict/assignee
POST /ml/predict/labels

(Same request/response format as above, but single prediction)
```

### Priority Engine

```http
GET /api/ml/priority/<issue_key>

Response: (see Priority Engine section)
```

### Dashboard Endpoints

```http
GET /api/ml/dashboard/overview
GET /api/ml/dashboard/breach-forecast
GET /api/ml/dashboard/trends?days=7
GET /api/ml/dashboard/team-workload
GET /api/ml/dashboard/sla-metrics
```

### Comment Suggestions

```http
POST /api/ml/comments/suggestions
POST /api/ml/comments/train
GET /api/ml/comments/status
GET /api/ml/comments/export-training-data
GET /api/ml/comments/ml-stats
```

### Anomaly Detection

```http
GET /api/ml/anomalies/dashboard
GET /api/ml/anomalies/current?severity=high
POST /api/ml/anomalies/train
GET /api/ml/anomalies/baseline
GET /api/ml/anomalies/types
```

---

## Best Practices

### When to Retrain Models

**Triggers**:
1. **Accuracy drop** below threshold (monitor in production)
2. **New project added** with different patterns
3. **Workflow changes** (new statuses, transitions)
4. **Dataset growth** (>20% more data available)
5. **Scheduled** (quarterly recommended)

### Monitoring ML Performance

**Key Metrics**:
- Prediction latency (target <1s)
- Model accuracy (compare to baseline)
- Cache hit ratio (target >80%)
- Memory usage (alert if >1GB)

### Optimizing Predictions

1. **Batch requests** when possible (use `/predict/all`)
2. **Cache aggressively** for repeated predictions
3. **Async loading** - don't block UI on ML calls
4. **Fallback gracefully** if ML service unavailable

---

**Last Updated**: December 10, 2025  
**Version**: 2.0  
**Models**: 6 production-ready  
**Status**: ✅ Fully Operational
