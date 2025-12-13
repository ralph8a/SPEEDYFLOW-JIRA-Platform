# 🚀 ML Killer Features Roadmap - SalesJIRA

## Vision
Transform SalesJIRA from a ticket board into an **AI-powered support intelligence platform** that reduces resolution time by 60% and improves customer satisfaction by 40%.

---

## 🎯 Priority Matrix

| Feature | Impact | Effort | Priority | ROI Score |
|---------|--------|--------|----------|-----------|
| **Auto-Triage** | 🔥🔥🔥 | Medium | P0 | 9.5/10 |
| **Duplicate Detection** | 🔥🔥🔥 | Low | P0 | 9.8/10 |
| **Time Prediction** | 🔥🔥 | Medium | P1 | 8.5/10 |
| **Response Templates** | 🔥🔥🔥 | High | P1 | 8.0/10 |
| **Sentiment Analysis** | 🔥🔥 | Low | P1 | 8.2/10 |
| **Auto-Escalation** | 🔥🔥 | Medium | P2 | 7.5/10 |
| **Knowledge Base Search** | 🔥 | High | P2 | 6.5/10 |
| **Anomaly Detection** | 🔥🔥 | High | P2 | 7.0/10 |
| **Field Prediction Expansion** | 🔥 | Low | P1 | 7.8/10 |
| **Smart Queue Balancing** | 🔥 | High | P3 | 6.0/10 |

---

## 📋 Detailed Feature Specs

### 1. 🎯 Auto-Triage Inteligente (P0)

**Problem**: Agents spend 5-10 minutes per ticket deciding who should handle it.

**Solution**: ML model predicts best assignee based on:
- Semantic similarity to previously resolved tickets by each agent
- Agent expertise domains (detected from resolution patterns)
- Current workload (tickets in "In Progress")
- Historical resolution speed per agent

**Tech Stack**:
```python
# Backend: api/blueprints/ai_suggestions.py
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

class AutoTriageEngine:
    def suggest_assignee(self, ticket_text, available_agents):
        # 1. Encode new ticket
        ticket_embedding = self.model.encode(ticket_text)
        
        # 2. For each agent, find similar tickets they resolved
        agent_scores = {}
        for agent in available_agents:
            agent_tickets = self.get_agent_history(agent)
            agent_embeddings = [t['embedding'] for t in agent_tickets]
            similarities = cosine_similarity([ticket_embedding], agent_embeddings)
            
            # Weight by resolution speed
            avg_resolution = np.mean([t['resolution_hours'] for t in agent_tickets])
            agent_scores[agent] = similarities.mean() / avg_resolution
        
        # 3. Return top 3 with confidence
        top_agents = sorted(agent_scores.items(), key=lambda x: x[1], reverse=True)[:3]
        return top_agents
```

**API Endpoints**:
```
POST /api/ml/suggest-assignee
{
  "issue_key": "MSM-1234",
  "summary": "Cannot login to app",
  "description": "..."
}

Response:
{
  "suggestions": [
    {
      "assignee": "john.doe@company.com",
      "confidence": 0.87,
      "reason": "Resolved 15 similar login issues (avg 2.3 hours)",
      "current_load": 3,
      "similar_tickets": ["MSM-1100", "MSM-1050"]
    },
    { ... }
  ],
  "auto_assign": true  // if confidence > 0.8
}
```

**UI Changes**:
- Right sidebar: "🤖 Suggested Assignee" section with 3 cards
- Each card shows: Avatar, name, confidence bar, reason, current load
- Button: "Auto-assign" (green) or "Suggest to team" (blue)
- If auto-assigned, show badge: "🤖 AI-Assigned (87% match)"

**Metrics to Track**:
- Auto-assignment accuracy (did they keep the assignment?)
- Time saved vs manual assignment
- Resolution time difference (auto vs manual)

---

### 2. 🔍 Duplicate Detection (P0 - Quick Win)

**Problem**: 15% of tickets are duplicates, wasting agent time.

**Solution**: Check for duplicates before creating ticket.

**Implementation**:
```python
# api/blueprints/issues.py - Before creating issue
@issues_bp.route('/api/issues', methods=['POST'])
def create_issue():
    data = request.json
    summary = data.get('summary')
    description = data.get('description')
    
    # Check for duplicates
    duplicates = find_duplicate_tickets(summary, description, threshold=0.85)
    
    if duplicates:
        return jsonify({
            'status': 'duplicate_detected',
            'duplicates': duplicates,
            'message': 'Similar tickets found. Review before creating.'
        }), 200
    
    # Continue with creation...
```

**UI Flow**:
```javascript
// When user clicks "Create Ticket"
async function createNewTicket(data) {
  const response = await fetch('/api/issues', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  
  const result = await response.json();
  
  if (result.status === 'duplicate_detected') {
    showDuplicateModal(result.duplicates);
  } else {
    // Success
  }
}

function showDuplicateModal(duplicates) {
  // Modal with 3 sections:
  // 1. "This ticket appears similar to:"
  // 2. List of duplicate candidates with similarity %
  // 3. Actions: "Link to existing" | "Create anyway" | "Cancel"
}
```

**UI Design**:
```
╔════════════════════════════════════════════════════════╗
║  ⚠️  Similar Tickets Found                            ║
╠════════════════════════════════════════════════════════╣
║  Your ticket appears similar to these:                 ║
║                                                        ║
║  📌 MSM-1234 - "Login issues with mobile app"         ║
║     92% similar • Status: In Progress • John Doe      ║
║     [View Ticket] [Link This]                         ║
║                                                        ║
║  📌 MSM-1200 - "Cannot authenticate on iOS"           ║
║     87% similar • Status: Resolved • Jane Smith       ║
║     [View Ticket] [Link This]                         ║
║                                                        ║
║  [❌ Cancel]  [🔗 Link to MSM-1234]  [✅ Create Anyway] ║
╚════════════════════════════════════════════════════════╝
```

---

### 3. ⏱️ Predicción de Tiempo de Resolución (P1)

**Problem**: No way to estimate resolution time → Poor SLA management.

**Solution**: ML model predicts resolution time using:
- Ticket complexity (text length, technical terms)
- Semantic similarity to historical tickets
- Assigned agent's average speed
- Time of day / day of week
- Current queue depth

**Model Training**:
```python
# Train on historical resolved tickets
X_features = [
    'embedding_complexity_score',  # From sentence embedding variance
    'text_length',
    'priority_encoded',
    'severity_encoded',
    'assignee_avg_resolution_hours',
    'queue_depth',
    'is_weekend',
    'hour_of_day'
]

y_target = 'resolution_hours'

# Use XGBoost or Random Forest
from xgboost import XGBRegressor
model = XGBRegressor(n_estimators=100, max_depth=5)
model.fit(X_train, y_train)
```

**API**:
```
POST /api/ml/predict-resolution-time
{
  "issue_key": "MSM-1234",
  "assignee": "john.doe@company.com"
}

Response:
{
  "estimated_hours": 4.5,
  "confidence_interval": [2.0, 7.0],
  "factors": [
    {"factor": "Similar tickets avg", "value": "3.2 hours"},
    {"factor": "Agent avg speed", "value": "5.1 hours"},
    {"factor": "Queue depth", "value": "12 tickets"}
  ],
  "sla_risk": "low"  // low | medium | high
}
```

**UI Integration**:
- Kanban card footer: "⏱️ Est. 2-4 hours" (green) / "⏱️ Est. 1-2 days" (yellow)
- Right sidebar: Timeline section with prediction
- Dashboard: "SLA Risk" chart showing tickets by predicted time vs SLA

---

### 4. 💬 Response Templates ML (P1)

**Problem**: Agents type similar responses repeatedly.

**Solution**: Generate contextual response templates from historical successful resolutions.

**Data Pipeline**:
```python
# 1. Extract resolution patterns
def extract_resolution_patterns(resolved_tickets):
    patterns = {}
    
    for ticket in resolved_tickets:
        # Get final resolution comment
        resolution = ticket['resolution_comment']
        
        # Cluster similar tickets
        cluster_id = get_semantic_cluster(ticket['summary'])
        
        if cluster_id not in patterns:
            patterns[cluster_id] = []
        
        patterns[cluster_id].append({
            'template': resolution,
            'satisfaction_score': ticket.get('satisfaction', 0),
            'resolution_time': ticket['resolution_hours']
        })
    
    # For each cluster, find top 3 templates
    top_templates = {}
    for cluster_id, templates in patterns.items():
        # Sort by satisfaction and speed
        sorted_templates = sorted(
            templates,
            key=lambda x: (x['satisfaction_score'], -x['resolution_time']),
            reverse=True
        )
        top_templates[cluster_id] = sorted_templates[:3]
    
    return top_templates
```

**Real-time Suggestion**:
```python
@ai_bp.route('/api/ml/suggest-response', methods=['POST'])
def suggest_response():
    data = request.json
    ticket_text = data['ticket_summary'] + ' ' + data['ticket_description']
    
    # Find similar cluster
    cluster_id = get_semantic_cluster(ticket_text)
    
    # Get templates for this cluster
    templates = RESPONSE_TEMPLATES.get(cluster_id, [])
    
    # Personalize templates (replace placeholders)
    personalized = []
    for template in templates[:3]:
        personalized.append({
            'text': personalize_template(template, data['customer_name']),
            'confidence': 0.85,
            'based_on': f"{template['usage_count']} similar resolutions"
        })
    
    return jsonify({'templates': personalized})
```

**UI**:
- Comment editor has "✨ Suggest Response" button
- Opens popover with 3 template cards
- Each card shows: Template preview (first 100 chars), "Use" button, confidence
- Clicking "Use" inserts template into editor (editable)

---

### 5. 😊 Análisis de Sentimiento (P1 - Easy)

**Problem**: Can't prioritize upset customers until too late.

**Solution**: Real-time sentiment analysis on comments.

**Implementation** (Using existing sentence-transformers):
```python
# Simple sentiment using zero-shot classification
from transformers import pipeline

sentiment_analyzer = pipeline(
    "sentiment-analysis",
    model="nlptown/bert-base-multilingual-uncased-sentiment"
)

def analyze_comment_sentiment(text):
    result = sentiment_analyzer(text)[0]
    
    # Map to emoji
    score_map = {
        '1 star': ('😡', 'very_negative'),
        '2 stars': ('😟', 'negative'),
        '3 stars': ('😐', 'neutral'),
        '4 stars': ('😊', 'positive'),
        '5 stars': ('😃', 'very_positive')
    }
    
    emoji, category = score_map[result['label']]
    
    return {
        'emoji': emoji,
        'category': category,
        'score': result['score']
    }
```

**Auto-escalation Rule**:
```python
# In comments webhook
if sentiment['category'] == 'very_negative':
    # Auto-escalate
    notify_supervisor(issue_key, sentiment)
    
    # Bump priority
    if issue['priority'] not in ['Highest', 'High']:
        update_issue_priority(issue_key, 'High')
```

**UI**:
- Each comment in timeline has emoji indicator: 😊 😐 😡
- Hover shows: "Sentiment: Negative (78% confidence)"
- Right sidebar: "📊 Sentiment Trend" graph over time
- Badge on kanban if very negative: "😡 Customer Frustrated"

---

### 6. 🚨 Auto-Escalación Predictiva (P2)

**Problem**: Tickets get stuck, no proactive escalation.

**Solution**: ML model identifies high-risk tickets for escalation.

**Risk Factors**:
```python
def calculate_escalation_risk(issue):
    risk_score = 0
    factors = []
    
    # 1. Time in status without updates
    hours_stale = get_hours_since_last_update(issue)
    if hours_stale > 48:
        risk_score += 30
        factors.append('No updates in 2 days')
    
    # 2. Sentiment analysis
    if issue['last_comment_sentiment'] == 'very_negative':
        risk_score += 25
        factors.append('Customer very upset')
    
    # 3. Reassignment count
    if issue['reassignment_count'] > 2:
        risk_score += 20
        factors.append('Reassigned 3+ times')
    
    # 4. Approaching SLA
    sla_remaining = get_sla_remaining_hours(issue)
    if sla_remaining < 2:
        risk_score += 25
        factors.append('SLA expires in < 2 hours')
    
    # 5. Complexity score (from embeddings)
    if issue['complexity_score'] > 0.8:
        risk_score += 15
        factors.append('High complexity')
    
    return {
        'risk_score': min(risk_score, 100),
        'risk_level': 'critical' if risk_score > 75 else 'high' if risk_score > 50 else 'medium',
        'factors': factors
    }
```

**Automated Actions**:
```python
# Background job runs every 15 minutes
def auto_escalation_job():
    issues = get_all_open_issues()
    
    for issue in issues:
        risk = calculate_escalation_risk(issue)
        
        if risk['risk_level'] == 'critical':
            # Auto-escalate
            notify_supervisor(issue, risk)
            add_comment(issue, f"⚠️ Auto-escalated due to: {', '.join(risk['factors'])}")
            update_issue_field(issue, 'priority', 'Highest')
```

**UI**:
- Kanban badge: "🚨 High Risk (Score: 78)"
- Right sidebar: "⚠️ Escalation Risk" section with factors
- Notifications: "🚨 MSM-1234 requires immediate attention"

---

### 7. 📚 Knowledge Base Inteligente (P2)

**Problem**: Users create tickets for known issues with KB articles.

**Solution**: Semantic search in KB before creating ticket.

**Implementation**:
```python
# Index KB articles with embeddings
class KnowledgeBaseIndex:
    def __init__(self):
        self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        self.articles = []
        self.embeddings = None
    
    def index_articles(self, kb_articles):
        texts = [a['title'] + ' ' + a['content'] for a in kb_articles]
        self.embeddings = self.model.encode(texts)
        self.articles = kb_articles
    
    def search(self, query, top_k=5):
        query_embedding = self.model.encode([query])
        similarities = cosine_similarity(query_embedding, self.embeddings)[0]
        
        top_indices = similarities.argsort()[-top_k:][::-1]
        
        results = []
        for idx in top_indices:
            if similarities[idx] > 0.5:  # Threshold
                results.append({
                    'article': self.articles[idx],
                    'relevance': float(similarities[idx])
                })
        
        return results
```

**UI Flow**:
```javascript
// As user types ticket description
let typingTimer;
document.getElementById('ticketDescription').addEventListener('input', (e) => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    searchKnowledgeBase(e.target.value);
  }, 1000);  // Debounce 1 second
});

async function searchKnowledgeBase(query) {
  const response = await fetch('/api/kb/search', {
    method: 'POST',
    body: JSON.stringify({ query })
  });
  
  const results = await response.json();
  
  if (results.articles.length > 0) {
    showKBSuggestions(results.articles);
  }
}
```

**UI Design**:
- Sidebar appears while typing: "💡 These articles might help"
- Shows top 3 KB articles with relevance %
- Button: "View Article" (opens in new tab)
- If user clicks article and doesn't create ticket → Success metric

---

### 8. 📊 Anomaly Detection (P2)

**Problem**: Can't detect incidents (multiple users reporting same issue).

**Solution**: Real-time clustering of incoming tickets.

**Detection Algorithm**:
```python
# Run every 5 minutes
def detect_anomalies():
    recent_tickets = get_tickets_last_30_minutes()
    
    if len(recent_tickets) < 10:
        return None  # Not enough data
    
    # Cluster tickets
    embeddings = [t['embedding'] for t in recent_tickets]
    clustering = DBSCAN(eps=0.3, min_samples=5).fit(embeddings)
    
    # Find large clusters (potential incident)
    cluster_sizes = Counter(clustering.labels_)
    
    for cluster_id, size in cluster_sizes.items():
        if cluster_id == -1:  # Noise
            continue
        
        if size >= 5:  # 5+ similar tickets in 30 min
            cluster_tickets = [t for t, label in zip(recent_tickets, clustering.labels_) if label == cluster_id]
            
            alert_incident({
                'severity': 'high' if size >= 10 else 'medium',
                'affected_tickets': [t['key'] for t in cluster_tickets],
                'common_theme': extract_common_terms(cluster_tickets),
                'started_at': min(t['created'] for t in cluster_tickets)
            })
```

**UI**:
- Dashboard banner: "⚠️ Incident Detected: 12 tickets about 'login failure' in 15 minutes"
- Button: "Create Incident" → Groups tickets, creates parent issue
- Incident view shows: Timeline, affected users, common theme, status

---

### 9. 🏷️ Field Prediction Expansion (P1 - Easy)

**Enhancement**: Expand current severity/priority to predict more fields.

**New Fields to Predict**:
```python
# Category (Billing, Technical, Access, Feature Request)
# Component (API, Web, Mobile, Backend)
# Tags (urgent, bug, enhancement, documentation)
# Affected Service (Authentication, Payment, Reporting)
```

**Implementation** (Similar to current system):
```python
# Add to ml_suggester.py
def suggest_category(self, text: str) -> Tuple[str, float, List[Dict]]:
    # Same approach as severity
    return self.suggest_field(text, 'category', top_k=10)

def suggest_tags(self, text: str) -> List[Tuple[str, float]]:
    # Multi-label prediction
    # Return top 3 tags with confidence
    pass
```

**UI**:
- Create ticket form shows: "🤖 Suggested Category: Technical (89%)"
- Badge "AI-Enhanced" on tickets with auto-filled fields
- Metrics: Accuracy of predictions, acceptance rate

---

### 10. ⚖️ Smart Queue Balancing (P3)

**Problem**: Some queues overloaded, others empty.

**Solution**: Predict capacity needs, suggest rebalancing.

**Capacity Model**:
```python
def predict_queue_capacity(queue, days_ahead=7):
    # Historical trend analysis
    historical_volume = get_queue_volume_history(queue, days=30)
    
    # Time series forecasting (simple moving average or ARIMA)
    forecast = forecast_volume(historical_volume, days_ahead)
    
    # Calculate capacity
    agents = get_queue_agents(queue)
    agent_capacity = sum(a['avg_tickets_per_day'] for a in agents)
    
    # Predict overload days
    overload_days = [d for d in forecast if d['volume'] > agent_capacity]
    
    return {
        'forecast': forecast,
        'capacity': agent_capacity,
        'overload_risk': len(overload_days) / days_ahead,
        'recommended_actions': generate_rebalancing_suggestions(forecast, capacity)
    }
```

**UI (Manager Dashboard)**:
- "📊 Queue Capacity Forecast - Next 7 Days"
- Chart showing: Expected volume vs capacity per queue
- Recommendations: "Move 5 tickets from Queue A → Queue B"
- Alert: "⚠️ Queue 'Billing' will be overloaded on Dec 5-7"

---

## 🛠️ Implementation Roadmap

### Week 1-2: Quick Wins (Duplicate Detection + Field Expansion)
- [ ] Implement duplicate detection endpoint
- [ ] Create duplicate modal UI
- [ ] Add category/tag prediction
- [ ] Update ML status UI

### Week 3-4: Auto-Triage Foundation
- [ ] Build agent history tracking
- [ ] Train initial auto-triage model
- [ ] Create API endpoint
- [ ] UI for suggested assignee

### Week 5-6: Time Prediction + Sentiment
- [ ] Collect historical resolution times
- [ ] Train time prediction model
- [ ] Integrate sentiment analysis
- [ ] UI updates (time badges, sentiment emojis)

### Week 7-8: Response Templates
- [ ] Extract resolution patterns
- [ ] Build template clustering
- [ ] Create suggestion API
- [ ] UI for template selection

### Week 9-10: Auto-Escalation
- [ ] Build risk scoring engine
- [ ] Background job for monitoring
- [ ] Notification system
- [ ] Manager escalation dashboard

### Week 11-12: Knowledge Base Integration
- [ ] Index KB articles with embeddings
- [ ] Search API
- [ ] UI for KB suggestions while typing
- [ ] Metrics tracking

### Week 13-14: Anomaly Detection
- [ ] Real-time clustering system
- [ ] Incident detection logic
- [ ] Incident management UI
- [ ] Alert notifications

### Week 15-16: Queue Balancing
- [ ] Time series forecasting
- [ ] Capacity calculation
- [ ] Rebalancing suggestions
- [ ] Manager dashboard

---

## 📊 Success Metrics

| Feature | Metric | Target | Current |
|---------|--------|--------|---------|
| Auto-Triage | Assignment time | < 30 sec | ~5 min |
| Auto-Triage | Reassignment rate | < 10% | ~25% |
| Duplicate Detection | Duplicate tickets | -50% | - |
| Time Prediction | Accuracy (±20%) | > 80% | - |
| Response Templates | Response time | -60% | - |
| Sentiment Analysis | Escalation response | < 15 min | - |
| Auto-Escalation | SLA breach prevention | +40% | - |
| Knowledge Base | Ticket deflection | +25% | - |
| Anomaly Detection | Incident detection time | < 10 min | - |

---

## 🔧 Technical Requirements

### Dependencies to Add:
```bash
pip install xgboost  # Time prediction
pip install transformers  # Sentiment analysis
pip install statsmodels  # Time series forecasting
pip install scikit-learn  # Already have, but ensure updated
```

### Infrastructure:
- Background job scheduler (APScheduler or Celery)
- Redis for caching ML predictions
- Model versioning (MLflow optional)

### Monitoring:
- Track model performance metrics
- A/B testing framework for new models
- Feedback loop (track when agents override predictions)

---

## 🎓 Training & Rollout

### Phase 1: Shadow Mode (Week 1-2)
- Show predictions but don't act
- Collect feedback
- Measure accuracy

### Phase 2: Assisted Mode (Week 3-4)
- Suggest actions, require confirmation
- Track acceptance rate
- Iterate based on feedback

### Phase 3: Autopilot Mode (Week 5+)
- High-confidence predictions auto-execute
- Low-confidence still requires review
- Continuous learning from corrections

---

## 🚀 Next Steps

1. **Choose P0 feature**: Auto-Triage or Duplicate Detection
2. **Set up model training pipeline**
3. **Create feedback loop** (track prediction accuracy)
4. **Iterate based on real usage**

---

**Last Updated**: December 3, 2025
**Status**: 🎯 Ready for Implementation
