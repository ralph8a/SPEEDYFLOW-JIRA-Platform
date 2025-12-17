#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Fetch missing ticket comments from JIRA API
Updates the cache with comment data for ML training
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gzip
import json
import logging
import time
from typing import List, Dict
from utils.common import _make_request, _get_credentials, _get_auth_header
from utils.config import config
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
def load_cache() -> Dict:
    """Load existing cache"""
    cache_path = 'data/cache/msm_issues.json.gz'
    try:
        with gzip.open(cache_path, 'rt', encoding='utf-8') as f:
            data = json.load(f)
            logger.info(f"✅ Loaded {len(data.get('issues', []))} tickets from cache")
            return data
    except Exception as e:
        logger.error(f"Error loading cache: {e}")
        return {'issues': []}
def fetch_comments_for_ticket(site: str, headers: Dict, ticket_key: str) -> List[Dict]:
    """Fetch comments for a specific ticket"""
    try:
        # Use JIRA REST API to get comments
        url = f"{site}/rest/api/2/issue/{ticket_key}/comment"
        response = _make_request('GET', url, headers)
        if response and 'comments' in response:
            return response['comments']
        else:
            return []
    except Exception as e:
        logger.debug(f"Error fetching comments for {ticket_key}: {e}")
        return []
def enrich_tickets_with_comments(tickets: List[Dict], max_tickets: int = 500) -> int:
    """
    Enrich tickets with comments from JIRA API
    Returns number of tickets updated
    """
    site, email, api_token = _get_credentials(config)
    headers = _get_auth_header(email, api_token)
    updated_count = 0
    logger.info(f"🔄 Fetching comments for up to {max_tickets} tickets...")
    for i, ticket in enumerate(tickets[:max_tickets]):
        if i % 50 == 0 and i > 0:
            logger.info(f"Progress: {i}/{min(max_tickets, len(tickets))} tickets processed")
        try:
            ticket_key = ticket.get('key')
            if not ticket_key:
                continue
            # Check if ticket already has comments
            fields = ticket.get('fields', {})
            if 'comment' in fields and fields['comment']:
                continue  # Skip if already has comments
            # Fetch comments
            comments = fetch_comments_for_ticket(site, headers, ticket_key)
            if comments:
                # Add comments to ticket
                if 'fields' not in ticket:
                    ticket['fields'] = {}
                ticket['fields']['comment'] = {
                    'comments': comments,
                    'maxResults': len(comments),
                    'total': len(comments),
                    'startAt': 0
                }
                updated_count += 1
                logger.info(f"✅ {ticket_key}: Added {len(comments)} comments")
            # Rate limiting: small delay between requests
            time.sleep(0.1)
        except Exception as e:
            logger.error(f"Error processing ticket {i}: {e}")
            continue
    return updated_count
def save_cache(data: Dict):
    """Save updated cache"""
    cache_path = 'data/cache/msm_issues.json.gz'
    backup_path = 'data/cache/msm_issues.json.gz.backup'
    try:
        # Create backup
        if os.path.exists(cache_path):
            import shutil
            shutil.copy2(cache_path, backup_path)
            logger.info(f"✅ Backup created: {backup_path}")
        # Save updated cache
        with gzip.open(cache_path, 'wt', encoding='utf-8') as f:
            json.dump(data, f)
        logger.info(f"✅ Cache updated: {cache_path}")
    except Exception as e:
        logger.error(f"Error saving cache: {e}")
        raise
def main():
    """Main execution"""
    print("=" * 60)
    print("🔄 FETCHING TICKET COMMENTS FROM JIRA")
    print("=" * 60)
    print()
    # Load existing cache
    logger.info("📂 Loading cache...")
    data = load_cache()
    tickets = data.get('issues', [])
    if not tickets:
        logger.error("❌ No tickets found in cache")
        return
    logger.info(f"📊 Total tickets in cache: {len(tickets)}")
    # Count tickets without comments
    tickets_without_comments = sum(
        1 for t in tickets 
        if not t.get('fields', {}).get('comment')
    )
    logger.info(f"📊 Tickets without comments: {tickets_without_comments}")
    if tickets_without_comments == 0:
        logger.info("✅ All tickets already have comments!")
        return
    # Ask user confirmation
    max_fetch = min(500, tickets_without_comments)
    print()
    print(f"⚠️  This will fetch comments for up to {max_fetch} tickets")
    print(f"   Estimated time: ~{max_fetch * 0.1:.1f} seconds")
    print()
    response = input("Continue? (y/n): ")
    if response.lower() != 'y':
        print("Cancelled by user")
        return
    print()
    # Enrich tickets with comments
    updated_count = enrich_tickets_with_comments(tickets, max_tickets=max_fetch)
    print()
    logger.info(f"✅ Updated {updated_count} tickets with comments")
    # Save updated cache
    if updated_count > 0:
        logger.info("💾 Saving updated cache...")
        save_cache(data)
        print()
        print("=" * 60)
        print("✅ FETCH COMPLETE!")
        print("=" * 60)
        print()
        print(f"Summary:")
        print(f"  - Total tickets: {len(tickets)}")
        print(f"  - Updated with comments: {updated_count}")
        print(f"  - Cache saved: data/cache/msm_issues.json.gz")
        print(f"  - Backup: data/cache/msm_issues.json.gz.backup")
        print()
        print("Next step: Run train_ml_features.py to retrain models")
    else:
        logger.warning("⚠️  No tickets were updated, cache not modified")
if __name__ == '__main__':
    main()
