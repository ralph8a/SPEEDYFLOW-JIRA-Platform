#!/usr/bin/env python3
"""
ML Model Training Script for SpeedyFlow
========================================

Trains the ML Priority Engine with historical JIRA data.

Usage:
    python scripts/train_ml_models.py
    python scripts/train_ml_models.py --queue-id 123 --desk-id 456
    python scripts/train_ml_models.py --project PROJ --days 90
"""

import sys
import os
import logging
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.ml_priority_engine import ml_engine
from utils.api_migration import get_api_client
from api.blueprints.sla import get_sla_for_issue

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def fetch_training_data(queue_id=None, desk_id=None, project_key=None, days=30):
    """
    Fetch historical tickets for training.
    
    Args:
        queue_id: Specific queue ID
        desk_id: Service desk ID (required if queue_id provided)
        project_key: Project key (e.g., 'PROJ')
        days: Number of days of history to fetch
    
    Returns:
        List of ticket dictionaries with SLA data
    """
    logger.info("📊 Fetching training data...")
    
    client = get_api_client()
    tickets = []
    
    try:
        if queue_id and desk_id:
            # Fetch from specific queue
            logger.info(f"Fetching tickets from queue {queue_id}...")
            tickets = client.get_queue_issues(desk_id, queue_id)
        
        elif project_key:
            # Fetch from project
            logger.info(f"Fetching tickets from project {project_key}...")
            project = client.get_project(project_key)
            
            if project:
                # Use JQL to fetch issues from last N days
                jql = f"project = {project_key} AND created >= -{days}d ORDER BY created DESC"
                response = client.session.get(
                    f"{client.base_url}/rest/api/3/search",
                    params={'jql': jql, 'maxResults': 500},
                    headers=client.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    tickets = data.get('issues', [])
        
        else:
            # Fetch from all available queues (first desk)
            logger.info("Fetching tickets from all available queues...")
            desks = client.get_service_desks()
            
            if desks and len(desks) > 0:
                desk = desks[0]
                desk_id = desk.get('id')
                
                queues = client.get_queues(desk_id)
                
                for queue in queues[:3]:  # Limit to first 3 queues
                    queue_id = queue.get('id')
                    queue_tickets = client.get_queue_issues(desk_id, queue_id)
                    
                    if queue_tickets:
                        tickets.extend(queue_tickets)
                    
                    if len(tickets) >= 200:
                        break
        
        logger.info(f"✅ Fetched {len(tickets)} tickets")
        
        # Enrich with SLA data
        logger.info("🔄 Enriching tickets with SLA data...")
        enriched_tickets = []
        
        for i, ticket in enumerate(tickets):
            if i % 50 == 0 and i > 0:
                logger.info(f"  Processed {i}/{len(tickets)} tickets...")
            
            try:
                # Get issue key
                key = ticket.get('key')
                
                if not key:
                    continue
                
                # Get SLA data
                sla_data = get_sla_for_issue(key)
                
                if sla_data:
                    ticket['sla'] = sla_data
                
                # Count comments
                fields = ticket.get('fields', {})
                comments = fields.get('comment', {}).get('comments', [])
                ticket['comment_count'] = len(comments)
                
                enriched_tickets.append(ticket)
            
            except Exception as e:
                logger.warning(f"⚠️ Error enriching ticket {key}: {e}")
                continue
        
        logger.info(f"✅ Enriched {len(enriched_tickets)} tickets with SLA data")
        
        return enriched_tickets
    
    except Exception as e:
        logger.error(f"❌ Error fetching training data: {e}")
        return []


def train_models(tickets):
    """Train ML models with fetched tickets."""
    if len(tickets) < 50:
        logger.error(f"❌ Insufficient training data: {len(tickets)} tickets (need at least 50)")
        return False
    
    logger.info(f"🎓 Training ML models with {len(tickets)} tickets...")
    
    success = ml_engine.train_model(tickets)
    
    if success:
        logger.info("✅ ML models trained successfully!")
        
        # Load and display metadata
        metadata_path = Path(__file__).parent.parent / 'data' / 'ml_models' / 'metadata.json'
        
        if metadata_path.exists():
            import json
            with open(metadata_path) as f:
                metadata = json.load(f)
            
            logger.info("\n📊 Training Results:")
            logger.info(f"  Tickets used: {metadata.get('num_tickets')}")
            logger.info(f"  Priority accuracy: {metadata.get('priority_accuracy', 0):.2%}")
            logger.info(f"  Breach MAE: {metadata.get('breach_mae', 0):.2f} hours")
            logger.info(f"  Trained at: {metadata.get('trained_at')}")
        
        return True
    else:
        logger.error("❌ Training failed")
        return False


def main():
    parser = argparse.ArgumentParser(description='Train SpeedyFlow ML models')
    parser.add_argument('--queue-id', help='Specific queue ID to train from')
    parser.add_argument('--desk-id', help='Service desk ID (required with --queue-id)')
    parser.add_argument('--project', help='Project key to train from (e.g., PROJ)')
    parser.add_argument('--days', type=int, default=30, help='Days of history to fetch (default: 30)')
    
    args = parser.parse_args()
    
    logger.info("🤖 SpeedyFlow ML Model Training")
    logger.info("================================\n")
    
    # Validate arguments
    if args.queue_id and not args.desk_id:
        logger.error("❌ --desk-id required when using --queue-id")
        return 1
    
    # Fetch training data
    tickets = fetch_training_data(
        queue_id=args.queue_id,
        desk_id=args.desk_id,
        project_key=args.project,
        days=args.days
    )
    
    if not tickets:
        logger.error("❌ No training data fetched")
        return 1
    
    # Train models
    success = train_models(tickets)
    
    if success:
        logger.info("\n✅ Training complete! ML Priority Engine is ready to use.")
        logger.info("\nNext steps:")
        logger.info("  1. Restart the server: python api/server.py")
        logger.info("  2. Check model status: GET /api/ml/model-status")
        logger.info("  3. Get predictions: GET /api/ml/priority/<issue-key>")
        return 0
    else:
        return 1


if __name__ == '__main__':
    sys.exit(main())
