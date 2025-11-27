# -*- coding: utf-8 -*-
"""
JIRA API Migration Module
Provides backward compatibility layer for transitioning to new JiraAPI class
"""

import logging
from typing import Optional, Dict, List, Any, Tuple
from functools import wraps

from utils.config import config
from utils.jira_api import JiraAPI
from utils.common import JiraApiError, invalidate_api_cache, _make_request

logger = logging.getLogger(__name__)

# Global API client instance
_api_client = None

def get_api_client() -> JiraAPI:
    """Get or create global API client instance"""
    global _api_client
    if _api_client is None:
        _api_client = JiraAPI(config)
    return _api_client

def reset_api_client():
    """Reset the global API client (e.g. after config changes)"""
    global _api_client
    _api_client = None
    invalidate_api_cache()

def api_client_required(func):
    """Decorator to ensure API client is available"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        client = get_api_client()
        return func(client, *args, **kwargs)
    return wrapper

@api_client_required
def get_current_user(client: JiraAPI) -> Dict[str, Any]:
    """Fetch current user details directly from JIRA Cloud.

    Uses /rest/api/3/myself which returns accountId, emailAddress (if permitted), displayName.
    Falls back to minimal structure if request fails.
    """
    try:
        url = f"{client.site}/rest/api/3/myself"
        resp = _make_request("GET", url, client.headers)
        if not resp:
            logger.warning(f"Current user response empty. URL={url}")
            return {"displayName": None, "accountId": None, "emailAddress": None, "source": "empty"}
        return {
            "displayName": resp.get("displayName") or resp.get("name"),
            "accountId": resp.get("accountId"),
            "emailAddress": resp.get("emailAddress"),
            "timeZone": resp.get("timeZone"),
            "locale": resp.get("locale"),
            "source": "jira"
        }
    except Exception as e:
        logger.error(f"Error fetching current user: {e}")
        return {"displayName": None, "accountId": None, "emailAddress": None, "source": "error"}

# Compatibility functions that map old API calls to new JiraAPI methods

@api_client_required
def get_service_desks(client: JiraAPI, start: int = 0, limit: int = 50) -> Dict[str, Any]:
    """Get all service desks with pagination"""
    try:
        url = f"{client.site}/rest/servicedeskapi/servicedesk"
        response = _make_request("GET", url, client.headers, params={
            "start": start,
            "limit": limit
        })
        if not response or "values" not in response:
            logger.warning(f"Service desks empty or malformed. URL={url} start={start} limit={limit} raw={response}")
        return {
            "values": response.get("values", []),
            "isLastPage": response.get("isLastPage", True),
            "start": response.get("start", start),
            "limit": response.get("limit", limit)
        }
    except Exception as e:
        logger.error(f"Error fetching service desks: {e}")
        return {"values": [], "isLastPage": True, "start": start, "limit": limit}

@api_client_required
def get_queues(
    client: JiraAPI,
    service_desk_id: int,
    include_count: bool = True,
    start: int = 0,
    limit: int = 50
) -> Dict[str, Any]:
    """Get queues for a service desk"""
    try:
        url = f"{client.site}/rest/servicedeskapi/servicedesk/{service_desk_id}/queue"
        response = _make_request("GET", url, client.headers, params={
            "includeCount": str(include_count).lower(),
            "start": start,
            "limit": limit
        })
        if not response or "values" not in response:
            logger.warning(f"Queues empty or malformed. URL={url} desk={service_desk_id} start={start} limit={limit} raw={response}")
        return {
            "values": response.get("values", []),
            "isLastPage": response.get("isLastPage", True),
            "start": response.get("start", start),
            "limit": response.get("limit", limit)
        }
    except Exception as e:
        logger.error(f"Error fetching queues: {e}")
        return {"values": [], "isLastPage": True, "start": start, "limit": limit}

@api_client_required
def get_queue_issues(
    client: JiraAPI,
    project_key: str,
    queue_id: int,
    start: int = 0,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Get issues from a service desk queue"""
    try:
        # Get service desk ID first
        project = client.get_project(project_key)
        if not project:
            raise JiraApiError(f"Project {project_key} not found")
            
        service_desk_id = project.get("id")
        if not service_desk_id:
            raise JiraApiError(f"Service desk ID not found for project {project_key}")
            
        # Get queue issues
        url = f"{client.site}/rest/servicedeskapi/servicedesk/{service_desk_id}/queue/{queue_id}/issue"
        from utils.jira_api import _make_request
        response = _make_request("GET", url, client.headers, params={
            "start": start,
            "limit": limit
        })
        # DEBUG: Log the full API response
        logger.info(f"[DEBUG] Full API response for queue issues: {response}")
        if not response:
            logger.error(f"[ERROR] No response from JIRA API for {url}")
            return []
        if "values" not in response:
            logger.warning(f"Issues response missing 'values'. url={url} raw={response}")
        return response.get("values", [])
    except Exception as e:
        logger.error(f"Error fetching queue issues: {e}")
        return []

@api_client_required
def get_issue_details(
    client: JiraAPI,
    issue_key: str,
    fields: Optional[List[str]] = None
) -> Optional[Dict[str, Any]]:
    """Get detailed issue information"""
    try:
        return client.get_issue(issue_key, fields=fields)
    except Exception as e:
        logger.error(f"Error fetching issue details: {e}")
        return None

@api_client_required
def get_transitions(client: JiraAPI, issue_key: str) -> List[Dict[str, Any]]:
    """Get available transitions for an issue"""
    try:
        return client.get_transitions(issue_key)
    except Exception as e:
        logger.error(f"Error fetching transitions: {e}")
        return []

@api_client_required
def add_comment(
    client: JiraAPI,
    issue_key: str,
    comment: str,
    visibility: Optional[Dict[str, str]] = None
) -> Optional[Dict[str, Any]]:
    """Add a comment to an issue"""
    try:
        return client.add_comment(issue_key, comment, visibility=visibility)
    except Exception as e:
        logger.error(f"Error adding comment: {e}")
        return None

@api_client_required
def assign_issue(
    client: JiraAPI,
    issue_key: str,
    assignee: Optional[str] = None
) -> bool:
    """Assign an issue to a user"""
    try:
        client.assign_issue(issue_key, assignee)
        return True
    except Exception as e:
        logger.error(f"Error assigning issue: {e}")
        return False

# Additional helper functions

@api_client_required
def get_workflow_states(client: JiraAPI, project_key: str) -> Dict[str, int]:
    """Get workflow states with issue counts for a project"""
    try:
        jql = f"project = {project_key}"
        results = client.search_issues(jql, fields=["status"])
        
        states = {}
        for issue in results.get("issues", []):
            status = client.get_field_value(issue, "fields.status.name")
            if status:
                states[status] = states.get(status, 0) + 1
                
        return states
    except Exception as e:
        logger.error(f"Error getting workflow states: {e}")
        return {}