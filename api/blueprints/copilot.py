"""
FLOWING MVP BLUEPRINT
Handles chat interactions with context awareness
"""

from flask import Blueprint, request, jsonify
import logging
from pathlib import Path
import json

# Optional integrations with ml_service utilities
try:
    from ml_service.ingest_onenote import ingest_pdf_to_docs
    from ml_service.docs_parser import extract_endpoints_from_text, extract_playbooks_from_text
    from ml_service.predictor import UnifiedMLPredictor
except Exception:
    ingest_pdf_to_docs = None
    extract_endpoints_from_text = None
    extract_playbooks_from_text = None
    UnifiedMLPredictor = None

logger = logging.getLogger(__name__)

copilot_bp = Blueprint('copilot', __name__, url_prefix='/api/copilot')

@copilot_bp.route('/chat', methods=['POST'])
def chat():
    """
    Handle Flowing MVP chat messages with context awareness
    """
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        context = data.get('context', {})
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400

        logger.info(f"🤖 Flowing MVP query: {message[:100]}...")
        logger.info(f"📌 Context: {context}")

        # Build response based on context and message
        response = generate_response(message, context)
        
        return jsonify({
            'response': response,
            'context': context
        })

    except Exception as e:
        logger.error(f"❌ Flowing MVP error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

def generate_response(message: str, context: dict) -> str:
    """
    Generate contextual response based on message and current context
    
    Args:
        message: User's message
        context: Current application context (desk, queue, ticket, etc.)
        
    Returns:
        AI-generated response string
    """
    message_lower = message.lower()
    
    # Extract context variables
    current_desk = context.get('currentDesk')
    current_queue = context.get('currentQueue')
    selected_issue = context.get('selectedIssue')
    issues_count = context.get('issuesCount', 0)
    
    # Context-aware responses
    if selected_issue:
        return handle_ticket_query(message_lower, selected_issue, context)
    elif current_queue:
        return handle_queue_query(message_lower, current_queue, issues_count, context)
    elif current_desk:
        return handle_desk_query(message_lower, current_desk, context)
    else:
        return handle_general_query(message_lower)


@copilot_bp.route('/docs/ingest', methods=['POST'])
def docs_ingest():
    data = request.get_json() or {}
    path = data.get('path')
    if not path:
        return jsonify({'error': 'path required'}), 400
    if not ingest_pdf_to_docs:
        return jsonify({'error': 'ingest handler not available on server'}), 500
    try:
        out = ingest_pdf_to_docs(path)
        return jsonify({'status': 'ingested', 'path': out})
    except Exception as e:
        logger.error(f"Docs ingest error: {e}")
        return jsonify({'error': str(e)}), 500


@copilot_bp.route('/docs/extract-endpoints', methods=['POST'])
def docs_extract_endpoints():
    data = request.get_json() or {}
    filename = data.get('file')
    docs_dir = Path(__file__).resolve().parents[1] / 'ml_service' / 'docs'
    texts = []
    if filename:
        p = docs_dir / filename
        if not p.exists():
            return jsonify({'error': 'file not found'}), 404
        texts.append(p.read_text(encoding='utf-8', errors='ignore'))
    else:
        for p in docs_dir.glob('*.txt'):
            texts.append(p.read_text(encoding='utf-8', errors='ignore'))
    full = '\n\n'.join(texts)
    if not extract_endpoints_from_text:
        return jsonify({'error': 'docs parser not available'}), 500
    endpoints = extract_endpoints_from_text(full)
    return jsonify({'endpoints': endpoints})


@copilot_bp.route('/docs/extract-playbooks', methods=['POST'])
def docs_extract_playbooks():
    data = request.get_json() or {}
    filename = data.get('file')
    docs_dir = Path(__file__).resolve().parents[1] / 'ml_service' / 'docs'
    texts = []
    if filename:
        p = docs_dir / filename
        if not p.exists():
            return jsonify({'error': 'file not found'}), 404
        texts.append(p.read_text(encoding='utf-8', errors='ignore'))
    else:
        for p in docs_dir.glob('*.txt'):
            texts.append(p.read_text(encoding='utf-8', errors='ignore'))
    full = '\n\n'.join(texts)
    if not extract_playbooks_from_text:
        return jsonify({'error': 'docs parser not available'}), 500
    playbooks = extract_playbooks_from_text(full)
    return jsonify({'playbooks': playbooks})


@copilot_bp.route('/suggest/comment', methods=['POST'])
def suggest_comment():
    data = request.get_json() or {}
    summary = data.get('summary','')
    comments = data.get('comments','')
    if not UnifiedMLPredictor:
        return jsonify({'error': 'predictor not available'}), 500
    try:
        predictor = UnifiedMLPredictor(models_dir=str(Path(__file__).resolve().parents[1] / 'ml_service' / 'models'))
        res = predictor.suggest_comment_patterns(summary, comments)
        return jsonify(res)
    except Exception as e:
        logger.error(f"Suggest comment error: {e}")
        return jsonify({'error': str(e)}), 500

def handle_ticket_query(message: str, issue_key: str, context: dict) -> str:
    """Handle queries about specific ticket"""
    
    if any(word in message for word in ['sla', 'deadline', 'time', 'due']):
        return f"""📊 **SLA Analysis for {issue_key}**

I can help you understand the SLA status:

- **Check SLA Monitor**: The right sidebar shows real-time SLA tracking
- **Remaining Time**: Look for the countdown timer in the SLA panel
- **Breach Risk**: Color-coded indicators show urgency (🟢 Safe, 🟡 Warning, 🔴 Critical)

Would you like me to explain what affects SLA calculations?"""

    elif any(word in message for word in ['priority', 'severity', 'urgent']):
        return f"""🎯 **Priority Assessment for {issue_key}**

Based on the ticket's severity badge:

- **Critico** 🔴: Immediate attention required (< 1 hour response)
- **Alto** 🟠: High priority (< 4 hours response)
- **Mayor** 🟡: Important but not urgent (< 24 hours)
- **Medio** 🔵: Normal priority (< 48 hours)

Check the colored badge on the ticket card for current severity."""

    elif any(word in message for word in ['next', 'action', 'do', 'suggest']):
        return f"""💡 **Suggested Actions for {issue_key}**

Here's what you can do:

1. **Review Details**: Click the ▶ button to open full ticket details
2. **Check Comments**: See if there are recent updates from the customer
3. **Update Status**: Drag the card to transition it to the next stage
4. **Assign**: If unassigned, assign it to yourself or the appropriate team member
5. **Add Comment**: Provide an update to keep the customer informed

Would you like me to explain any of these actions?"""

    elif any(word in message for word in ['comment', 'history', 'activity']):
        return f"""💬 **Activity History for {issue_key}**

To view ticket activity:

- **Open Details Panel**: Click the ▶ button on the ticket card
- **Comments Tab**: Shows all customer and agent communications
- **Activity Timeline**: Displays status changes and updates
- **Attachments**: View any files shared in comments

The most recent activity is shown with timestamps like "2h ago" or "3d ago"."""

    else:
        return f"""🎯 **About {issue_key}**

I can help you with:

- **SLA & Deadlines**: Check remaining time and breach risks
- **Priority Assessment**: Understand severity levels
- **Action Suggestions**: Get recommendations on what to do next
- **Activity History**: Review comments and updates

What specific aspect would you like to know more about?"""

def handle_queue_query(message: str, queue_name: str, issues_count: int, context: dict) -> str:
    """Handle queries about queue"""
    
    if any(word in message for word in ['priority', 'urgent', 'critical', 'important']):
        return f"""🚨 **Priority Analysis for {queue_name}**

Currently showing **{issues_count} tickets** in this queue.

**Quick Priority Check:**
- Look for 🔴 **Critico** badges - handle these first
- Check ⚠️ **3+ days** tags in Quick Triage
- Review SLA status indicators (gradient backgrounds)

**Pro Tip**: Use **Quick Triage** (⚡ button in sidebar) to see all high-priority and stale tickets at once!"""

    elif any(word in message for word in ['analyze', 'pattern', 'trend', 'insight']):
        return f"""📊 **Queue Analysis for {queue_name}**

With **{issues_count} tickets** loaded, here's how to analyze:

1. **Use Smart Filters**: Filter by severity, assignee, or age
2. **Check SLA Monitor**: See tickets approaching SLA breach
3. **Quick Triage**: Identify unassigned or stale tickets
4. **View Toggle**: Switch between Kanban/List/Table views

**Tip**: The "Funciones Inteligentes" in the sidebar offers AI-powered queue analysis!"""

    elif any(word in message for word in ['assign', 'distribute', 'workload']):
        return f"""👥 **Workload Distribution for {queue_name}**

To manage assignments:

- **Filter by Assignee**: Use the filter bar to see each person's load
- **Unassigned Tickets**: Quick Triage shows all unassigned items
- **Bulk Actions**: Select multiple tickets for batch assignment
- **Balance Load**: Look for team members with fewer assigned tickets

Currently viewing **{issues_count} tickets** - use filters to see individual workloads."""

    elif any(word in message for word in ['sla', 'breach', 'deadline']):
        return f"""⏱️ **SLA Overview for {queue_name}**

**SLA Monitoring Tools:**

- **Visual Indicators**: Ticket cards show gradient backgrounds (🟢→🟡→🔴)
- **SLA Monitor Panel**: Real-time tracking of at-risk tickets
- **Time Remaining**: Hover over SLA badges to see countdown
- **Breach Alerts**: Color intensity increases as deadline approaches

Check the SLA Monitor in the right sidebar for detailed tracking."""

    else:
        return f"""📋 **Queue Overview: {queue_name}**

Currently managing **{issues_count} tickets**.

**I can help you:**
- Prioritize urgent tickets
- Analyze patterns and trends
- Distribute workload among team
- Monitor SLAs and deadlines
- Suggest next actions

What would you like to focus on?"""

def handle_desk_query(message: str, desk_name: str, context: dict) -> str:
    """Handle queries about service desk"""
    
    if any(word in message for word in ['queue', 'list', 'available']):
        return f"""🏢 **Service Desk: {desk_name}**

To view available queues:

1. **Select Queue**: Use the dropdown in the filter bar
2. **Queue Types**: Usually includes New, In Progress, Waiting, Resolved
3. **Load Issues**: Select a queue to see its tickets

**Tip**: Each queue represents a different stage in your workflow!"""

    else:
        return f"""🏢 **Service Desk Information**

You're currently in **{desk_name}**.

**Available Actions:**
- Select a queue to view tickets
- Configure desk settings
- View desk-wide metrics
- Manage team members

Select a queue from the filter bar to get started!"""

def handle_general_query(message: str) -> str:
    """Handle general queries without specific context"""
    
    if any(word in message for word in ['help', 'how', 'what', 'guide']):
        return """👋 **Welcome to Flowing MVP!**

I'm your AI assistant to help you work more efficiently. Here's what I can do:

**When viewing tickets:**
- Explain SLA statuses and deadlines
- Suggest next actions
- Analyze priority levels
- Review activity history

**When viewing queues:**
- Identify urgent tickets
- Analyze patterns and trends
- Help distribute workload
- Monitor SLA compliance

**Quick Tips:**
- Open ticket details with the ▶ button
- Use Quick Triage (⚡) for urgent items
- Check SLA Monitor for at-risk tickets
- Drag cards to change status

**To get started**, select a queue from the filter bar, then ask me specific questions!"""

    elif any(word in message for word in ['sla', 'deadline', 'time']):
        return """⏱️ **Understanding SLAs**

**SLA (Service Level Agreement)** defines response/resolution times for tickets.

**Visual Indicators:**
- 🟢 **Green gradient**: Safe, plenty of time remaining
- 🟡 **Yellow gradient**: Warning, approaching deadline
- 🔴 **Red gradient**: Critical, breach risk or already breached

**Tools:**
- **SLA Monitor**: Right sidebar shows real-time tracking
- **Card Gradients**: Visual feedback on ticket cards
- **Time Badges**: Shows remaining time (e.g., "2h remaining")

**Tip**: Focus on tickets with red/yellow indicators first!"""

    elif any(word in message for word in ['priority', 'severity', 'urgent']):
        return """🎯 **Understanding Priorities**

**Severity Levels** (from highest to lowest):

1. **Critico** 🔴: System down, blocking production
2. **Alto** 🟠: Major impact, needs immediate attention
3. **Mayor** 🟡: Significant issue, important but not critical
4. **Medio** 🔵: Normal priority
5. **Baja** 🟢: Minor issue, low urgency

**How to prioritize:**
1. Handle **Critico** tickets immediately
2. Check **Alto** tickets within hours
3. Monitor **Mayor** tickets daily
4. Use Quick Triage to identify unassigned/stale tickets

**Pro Tip**: Combine severity with SLA status for optimal prioritization!"""

    elif any(word in message for word in ['feature', 'function', 'capability']):
        return """✨ **Key Features**

**Quick Actions:**
- ⚡ **Quick Triage**: See urgent, unassigned, or stale tickets
- 🎯 **Smart Filters**: Filter by multiple criteria
- 📊 **View Toggle**: Kanban, List, or Table views

**Smart Tools:**
- 🤖 **AI Suggestions**: Get field recommendations
- 📈 **Queue Analyzer**: Pattern analysis
- ⏱️ **SLA Monitor**: Real-time deadline tracking

**Sidebar Tools:**
- **Left Sidebar**: Navigation and smart functions
- **Right Sidebar**: Ticket details and SLA monitor
- **This Footer**: Your AI assistant!

**Drag & Drop:** Easily change ticket status by dragging cards between columns."""

    else:
        return """💡 **I'm ready to help!**

To give you the best assistance, try:

- **Selecting a queue** to analyze tickets
- **Opening a ticket** to get specific insights
- **Asking about**: SLAs, priorities, actions, features

**Example questions:**
- "What should I work on next?"
- "Explain the SLA status"
- "How do I prioritize these tickets?"
- "What are the urgent items?"

What would you like to know?"""

# Export blueprint
__all__ = ['copilot_bp']
