#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Consolidated JIRA clients module

Provides:
- JiraPlatformAPI (original from jira_platform_api.py)
- JiraServiceDeskAPI (original from jira_servicedesk_api.py)
- get_platform_api() and get_service_desk_api() singleton accessors

This module is a drop-in consolidation to reduce duplication and make
it easier to import both clients from a single place.
"""
from typing import Dict, List, Optional, Any
import logging
from utils.common import _make_request, _get_credentials, _get_auth_header
from utils.http_utils import retry_on_error
from utils.config import config

logger = logging.getLogger(__name__)



class JiraBaseAPI:
    """Base class for JIRA clients to reduce duplication."""
    def __init__(self, base_path: str):
        self.site, self.email, self.api_token = _get_credentials(config)
        if not self.site or not self.email or not self.api_token:
            raise ValueError("JIRA credentials not configured. Check .env file.")
        self.headers = _get_auth_header(self.email, self.api_token)
        # base_path should include leading slash (e.g. '/rest/api/3')
        self.base_url = f"{self.site}{base_path}"

    def _request(self, method: str, path: str, **kwargs):
        """Helper wrapper around _make_request to centralize error handling."""
        url = path if path.startswith('http') else f"{self.base_url}{path}"
        try:
            return _make_request(method, url, self.headers, **kwargs)
        except Exception as e:
            logger.error(f"❌ Request error {method} {url}: {e}")
            return None


class JiraPlatformAPI(JiraBaseAPI):
    """
    JIRA Platform REST API v3 Client
    """
    def __init__(self):
        super().__init__("/rest/api/3")
        logger.info(f"✅ JIRA Platform API initialized: {self.site}")

    def get_projects(self, expand: Optional[str] = None) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/project"
        params = {}
        if expand:
            params['expand'] = expand
        response = self._request("GET", url, params=params)
        return response if response else []

    def get_project(self, project_key: str, expand: Optional[str] = None) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/project/{project_key}"
        params = {}
        if expand:
            params['expand'] = expand
        return self._request("GET", url, params=params)

    def get_issue(self, issue_key: str, fields: Optional[str] = None, expand: Optional[str] = None) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/issue/{issue_key}"
        params = {}
        if fields:
            params['fields'] = fields
        if expand:
            params['expand'] = expand
        return self._request("GET", url, params=params)

    def search_issues(self, jql: str, fields: Optional[List[str]] = None,
                     max_results: int = 50, start_at: int = 0) -> Dict[str, Any]:
        url = f"{self.base_url}/search"
        body = {
            "jql": jql,
            "maxResults": min(max_results, 100),
            "startAt": start_at
        }
        if fields:
            body['fields'] = fields
        resp = self._request("POST", url, json=body)
        return resp if resp else {"issues": [], "total": 0}

    def update_issue(self, issue_key: str, fields: Dict[str, Any]) -> bool:
        url = f"{self.base_url}/issue/{issue_key}"
        body = {"fields": fields}
        resp = self._request("PUT", url, json=body)
        if resp is None:
            return False
        logger.info(f"✅ Updated issue {issue_key}")
        return True

    def assign_issue(self, issue_key: str, account_id: Optional[str]) -> bool:
        url = f"{self.base_url}/issue/{issue_key}/assignee"
        body = {"accountId": account_id} if account_id else {"accountId": None}
        resp = self._request("PUT", url, json=body)
        if resp is None:
            return False
        logger.info(f"✅ Assigned issue {issue_key}")
        return True

    def get_comments(self, issue_key: str) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/issue/{issue_key}/comment"
        response = self._request("GET", url)
        return response.get('comments', []) if response else []

    def add_comment(self, issue_key: str, body: str) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/issue/{issue_key}/comment"
        comment_body = {
            "body": {
                "type": "doc",
                "version": 1,
                "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": body}]}
                ]
            }
        }
        response = self._request("POST", url, json=comment_body)
        if response is None:
            return None
        logger.info(f"✅ Added comment to {issue_key}")
        return response

    def get_transitions(self, issue_key: str) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/issue/{issue_key}/transitions"
        response = self._request("GET", url)
        return response.get('transitions', []) if response else []

    def do_transition(self, issue_key: str, transition_id: str, fields: Optional[Dict] = None) -> bool:
        url = f"{self.base_url}/issue/{issue_key}/transitions"
        body = {"transition": {"id": transition_id}}
        if fields:
            body['fields'] = fields
        resp = self._request("POST", url, json=body)
        if resp is None:
            return False
        logger.info(f"✅ Transitioned issue {issue_key}")
        return True

    def get_current_user(self) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/myself"
        user_data = self._request("GET", url)
        if user_data and 'accountId' in user_data:
            try:
                groups_url = f"{self.base_url}/user/groups"
                groups_params = {"accountId": user_data['accountId']}
                groups_response = self._request("GET", groups_url, params=groups_params)
                if groups_response:
                    user_data['groups'] = groups_response
                    logger.info(f"✅ Fetched {len(groups_response)} groups for user")
            except Exception as group_error:
                logger.warning(f"⚠️ Could not fetch user groups: {group_error}")
                user_data['groups'] = []
        return user_data

    def search_users(self, query: str, max_results: int = 50) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/user/search"
        params = {"query": query, "maxResults": max_results}
        response = self._request("GET", url, params=params)
        return response if response else []


class JiraServiceDeskAPI(JiraBaseAPI):
    """
    JIRA Service Desk REST API Client
    """
    def __init__(self):
        super().__init__("/rest/servicedeskapi")
        logger.info(f"✅ JIRA Service Desk API initialized: {self.site}")

    def get_service_desks(self, start: int = 0, limit: int = 50) -> Dict[str, Any]:
        url = f"{self.base_url}/servicedesk"
        params = {"start": start, "limit": min(limit, 100)}
        response = self._request("GET", url, params=params)
        return response if response else {"values": [], "size": 0}

    def get_service_desk(self, desk_id: str) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/servicedesk/{desk_id}"
        return self._request("GET", url)

    def get_queues(self, desk_id: str, include_count: bool = False, start: int = 0, limit: int = 50) -> Dict[str, Any]:
        url = f"{self.base_url}/servicedesk/{desk_id}/queue"
        params = {"start": start, "limit": min(limit, 100), "includeCount": str(include_count).lower()}
        response = self._request("GET", url, params=params)
        return response if response else {"values": [], "size": 0}

    def get_queue(self, desk_id: str, queue_id: str, include_count: bool = False) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/servicedesk/{desk_id}/queue/{queue_id}"
        params = {"includeCount": str(include_count).lower()}
        return self._request("GET", url, params=params)

    def get_queue_issues(self, desk_id: str, queue_id: str, start: int = 0, limit: int = 50) -> Dict[str, Any]:
        url = f"{self.base_url}/servicedesk/{desk_id}/queue/{queue_id}/issue"
        params = {"start": start, "limit": min(limit, 100)}
        response = self._request("GET", url, params=params)
        if not response:
            return {"values": [], "size": 0}
        issue_count = response.get('size', 0)
        logger.info(f"✅ Fetched {issue_count} issues from queue {queue_id}")
        return response

    def get_request_types(self, desk_id: str, start: int = 0, limit: int = 50) -> Dict[str, Any]:
        url = f"{self.base_url}/servicedesk/{desk_id}/requesttype"
        params = {"start": start, "limit": min(limit, 100)}
        response = self._request("GET", url, params=params)
        return response if response else {"values": [], "size": 0}

    def get_customers(self, desk_id: str, query: str = "", start: int = 0, limit: int = 50) -> Dict[str, Any]:
        url = f"{self.base_url}/servicedesk/{desk_id}/customer"
        params = {"query": query, "start": start, "limit": min(limit, 100)}
        response = self._request("GET", url, params=params)
        return response if response else {"values": [], "size": 0}

    def get_organizations(self, desk_id: str, start: int = 0, limit: int = 50) -> Dict[str, Any]:
        url = f"{self.base_url}/servicedesk/{desk_id}/organization"
        params = {"start": start, "limit": min(limit, 100)}
        response = self._request("GET", url, params=params)
        return response if response else {"values": [], "size": 0}

    def get_all_desks_with_queues(self) -> Dict[str, List[Dict[str, Any]]]:
        result = {}
        skipped_desks = []
        total_queues = 0
        try:
            desks_response = self.get_service_desks(limit=100)
            desks = desks_response.get('values', [])
            logger.info(f"📋 Fetching queues for {len(desks)} service desks...")
            for desk in desks:
                desk_id = desk.get('id')
                desk_name = desk.get('projectName') or desk.get('projectKey', 'Unknown')
                try:
                    queues_response = self.get_queues(desk_id, limit=100)
                    queues_data = queues_response.get('values', [])
                    if not queues_data:
                        logger.warning(f"⚠️ Desk '{desk_name}': No queues found")
                        skipped_desks.append(desk_name)
                        continue
                    queues = []
                    for queue in queues_data:
                        queues.append({
                            "name": queue.get('name', 'Unknown'),
                            "id": queue.get('id', ''),
                            "desk_id": desk_id,
                            "jql": queue.get('jql', '')
                        })
                    result[desk_name] = queues
                    total_queues += len(queues)
                    logger.info(f"✅ Desk '{desk_name}': {len(queues)} queues")
                except Exception as desk_error:
                    error_str = str(desk_error)
                    if "403" in error_str or "Forbidden" in error_str:
                        logger.warning(f"⚠️ Desk '{desk_name}': Permission denied - Skipping")
                    else:
                        logger.error(f"❌ Error fetching queues for '{desk_name}': {desk_error}")
                    skipped_desks.append(desk_name)
            logger.info(f"✅ Found {len(result)} desks with {total_queues} total queues")
            if skipped_desks:
                logger.info(f"⚠️ Skipped {len(skipped_desks)} desks: {', '.join(skipped_desks[:5])}")
            return result
        except Exception as e:
            logger.error(f"❌ Error building desk/queue structure: {e}")
            return {}


# Singleton instances
_platform_api_instance: Optional[JiraPlatformAPI] = None
_service_desk_api_instance: Optional[JiraServiceDeskAPI] = None

def get_platform_api() -> JiraPlatformAPI:
    global _platform_api_instance
    if _platform_api_instance is None:
        _platform_api_instance = JiraPlatformAPI()
    return _platform_api_instance

def get_service_desk_api() -> JiraServiceDeskAPI:
    global _service_desk_api_instance
    if _service_desk_api_instance is None:
        _service_desk_api_instance = JiraServiceDeskAPI()
    return _service_desk_api_instance

# Backwards-compatible names

