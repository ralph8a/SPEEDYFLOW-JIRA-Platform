#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Queue extraction using JIRA REST API directly
More reliable than Selenium web scraping
"""
import requests
import logging
from typing import List, Dict, Any, Optional
from utils.config import config
import base64
logger = logging.getLogger(__name__)
def _get_auth_header(email: str, api_token: str) -> Dict[str, str]:
    """Generate Basic auth header for JIRA API"""
    if not email or not api_token:
        return {}
    credentials = f"{email}:{api_token}".encode("utf-8")
    encoded = base64.b64encode(credentials).decode("utf-8")
    return {
        "Authorization": f"Basic {encoded}",
        "Accept": "application/json"
    }
def extract_tickets_from_queue_api(
    project_key: str, 
    queue_id: int,
    timeout: int = 30
) -> List[Dict[str, Any]]:
    """
    Extract tickets from a JIRA Service Desk queue using REST API
    Args:
        project_key: Project key (e.g., "MSM")
        queue_id: Queue ID (e.g., 28)
        timeout: Request timeout in seconds
    Returns:
        List of ticket dictionaries with key, summary, status, assignee, priority
    """
    tickets = []
    try:
        email = config.jira.email
        api_token = config.jira.api_token
        site = config.jira.site.rstrip('/')
        if not email or not api_token:
            logger.warning("Missing JIRA credentials for API access")
            return []
        auth_header = _get_auth_header(email, api_token)
        print(f"\n[SEARCH] Fetching queue data for {project_key} queue {queue_id}...")
        # Step 1: Get the service desk ID for this project key
        print(f"   [1/3] Finding service desk ID for project {project_key}...")
        desk_id = _get_service_desk_id(site, project_key, auth_header, timeout)
        if not desk_id:
            print(f"   [FAIL] Could not find service desk ID for {project_key}")
            return []
        print(f"   [OK] Service desk ID: {desk_id}")
        # Step 2: Try Service Desk Queue API endpoint - NOT USED, using get_queue_issues instead
        print(f"   [2/3] Note: Using get_queue_issues from UI for fetching tickets")
        print(f"   [SKIPPED] This function is deprecated - tickets are fetched via UI")
    except Exception as e:
        logger.error(f"Error in queue API extraction: {e}", exc_info=True)
        print(f"\n[ERROR] API Error: {e}\n")
    return tickets
def _get_service_desk_id(
    site: str,
    project_key: str,
    auth_header: Dict[str, str],
    timeout: int
) -> Optional[int]:
    """Find the service desk ID for a given project key"""
    try:
        url = f"{site}/rest/servicedeskapi/servicedesk"
        response = requests.get(url, headers=auth_header, timeout=timeout)
        if response.status_code != 200:
            logger.debug(f"Failed to get service desks: {response.status_code}")
            return None
        desks = response.json().get('values', [])
        for desk in desks:
            if desk.get('projectKey') == project_key:
                return desk.get('id')
        logger.warning(f"Service desk not found for project {project_key}")
        return None
    except Exception as e:
        logger.error(f"Error getting service desk ID: {e}")
        return None
if __name__ == "__main__":
    # Test
    tickets = extract_tickets_from_queue_api("MSM", 28)
    print(f"\nExtracted {len(tickets)} tickets via API:")
    for ticket in tickets[:5]:
        print(f"  {ticket['key']}: {ticket['fields']['summary']}")
