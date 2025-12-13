#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
JIRA Service Management (Service Desk) REST API
Official Documentation: https://developer.atlassian.com/cloud/jira/service-desk/rest/

This module provides centralized access to JIRA Service Desk API endpoints.
All endpoints follow the official JIRA Service Management Cloud REST API specification.

Base URL: https://{site}/rest/servicedeskapi/
Authentication: Basic Auth (email + API token)

Note: Service Desk API is separate from Platform API and has different endpoints.
"""

from typing import Dict, List, Optional, Any
import logging
from utils.common import _make_request, _get_credentials, _get_auth_header
from utils.http_utils import retry_on_error
from utils.config import config

logger = logging.getLogger(__name__)


class JiraServiceDeskAPI:
    """
    JIRA Service Desk REST API Client
    
    Provides methods for:
    - Service Desks (list, get details)
    - Queues (list queues per desk, get queue details)
    - Queue Issues (get issues from specific queue)
    - Request Types (get available request types)
    - Organizations (manage service desk organizations)
    """
    
    def __init__(self):
        """Initialize API client with credentials from config"""
        self.site, self.email, self.api_token = _get_credentials(config)
        if not self.site or not self.email or not self.api_token:
            raise ValueError("JIRA credentials not configured. Check .env file.")
        
        self.headers = _get_auth_header(self.email, self.api_token)
        self.base_url = f"{self.site}/rest/servicedeskapi"
        logger.info(f"✅ JIRA Service Desk API initialized: {self.site}")
    
    # ============================================================
    # SERVICE DESKS
    # ============================================================
    
    def get_service_desks(self, start: int = 0, limit: int = 50) -> Dict[str, Any]:
        """
        Get all service desks visible to the user
        
        GET /rest/servicedeskapi/servicedesk
        Docs: https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-servicedesk/#api-rest-servicedeskapi-servicedesk-get
        
        Args:
            start: Starting index for pagination (default: 0)
            limit: Max results per page (default: 50, max: 100)
        
        Returns:
            {
                "size": int,
                "start": int,
                "limit": int,
                "isLastPage": bool,
                "values": [
                    {
                        "id": str,
                        "projectId": str,
                        "projectKey": str,
                        "projectName": str,
                        "_links": {...}
                    }
                ]
            }
        """
        url = f"{self.base_url}/servicedesk"
        params = {
            "start": start,
            "limit": min(limit, 100)
        }
        
        try:
            response = _make_request("GET", url, self.headers, params=params)
            return response if response else {"values": [], "size": 0}
        except Exception as e:
            logger.error(f"❌ Error fetching service desks: {e}")
            return {"values": [], "size": 0, "error": str(e)}
    
    def get_service_desk(self, desk_id: str) -> Optional[Dict[str, Any]]:
        """
        Get service desk details by ID
        
        GET /rest/servicedeskapi/servicedesk/{serviceDeskId}
        Docs: https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-servicedesk/#api-rest-servicedeskapi-servicedesk-servicedeskid-get
        
        Args:
            desk_id: Service desk ID
        
        Returns:
            Service desk object with id, projectId, projectKey, projectName
        """
        url = f"{self.base_url}/servicedesk/{desk_id}"
        
        try:
            return _make_request("GET", url, self.headers)
        except Exception as e:
            logger.error(f"❌ Error fetching service desk {desk_id}: {e}")
            return None
    
    # ============================================================
    # QUEUES
    # ============================================================
    
    def get_queues(self, desk_id: str, include_count: bool = False, 
                   start: int = 0, limit: int = 50) -> Dict[str, Any]:
        """
        Get all queues for a service desk
        
        GET /rest/servicedeskapi/servicedesk/{serviceDeskId}/queue
        Docs: https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-queue/#api-rest-servicedeskapi-servicedesk-servicedeskid-queue-get
        
        Args:
            desk_id: Service desk ID
            include_count: Include issue count in each queue (slower)
            start: Starting index for pagination
            limit: Max results per page (max: 100)
        
        Returns:
            {
                "size": int,
                "start": int,
                "limit": int,
                "isLastPage": bool,
                "values": [
                    {
                        "id": str,
                        "name": str,
                        "jql": str,
                        "fields": [str],
                        "issueCount": int (if include_count=True)
                    }
                ]
            }
        """
        url = f"{self.base_url}/servicedesk/{desk_id}/queue"
        params = {
            "start": start,
            "limit": min(limit, 100),
            "includeCount": str(include_count).lower()
        }
        
        try:
            response = _make_request("GET", url, self.headers, params=params)
            return response if response else {"values": [], "size": 0}
        except Exception as e:
            logger.error(f"❌ Error fetching queues for desk {desk_id}: {e}")
            return {"values": [], "size": 0, "error": str(e)}
    
    def get_queue(self, desk_id: str, queue_id: str, 
                  include_count: bool = False) -> Optional[Dict[str, Any]]:
        """
        Get queue details
        
        GET /rest/servicedeskapi/servicedesk/{serviceDeskId}/queue/{queueId}
        Docs: https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-queue/#api-rest-servicedeskapi-servicedesk-servicedeskid-queue-queueid-get
        
        Args:
            desk_id: Service desk ID
            queue_id: Queue ID
            include_count: Include issue count
        
        Returns:
            Queue object with id, name, jql, fields, issueCount
        """
        url = f"{self.base_url}/servicedesk/{desk_id}/queue/{queue_id}"
        params = {"includeCount": str(include_count).lower()}
        
        try:
            return _make_request("GET", url, self.headers, params=params)
        except Exception as e:
            logger.error(f"❌ Error fetching queue {queue_id} from desk {desk_id}: {e}")
            return None
    
    # ============================================================
    # QUEUE ISSUES
    # ============================================================
    
    def get_queue_issues(self, desk_id: str, queue_id: str, 
                        start: int = 0, limit: int = 50) -> Dict[str, Any]:
        """
        Get issues from a specific queue
        
        GET /rest/servicedeskapi/servicedesk/{serviceDeskId}/queue/{queueId}/issue
        Docs: https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-queue/#api-rest-servicedeskapi-servicedesk-servicedeskid-queue-queueid-issue-get
        
        Args:
            desk_id: Service desk ID
            queue_id: Queue ID
            start: Starting index for pagination
            limit: Max results per page (max: 100)
        
        Returns:
            {
                "size": int,
                "start": int,
                "limit": int,
                "isLastPage": bool,
                "values": [
                    {
                        "issueId": str,
                        "issueKey": str,
                        "issueType": {...},
                        "priority": {...},
                        "status": {...},
                        "reporter": {...},
                        "assignee": {...},
                        "summary": str,
                        "description": str,
                        "created": str,
                        "updated": str,
                        ...
                    }
                ]
            }
        """
        url = f"{self.base_url}/servicedesk/{desk_id}/queue/{queue_id}/issue"
        params = {
            "start": start,
            "limit": min(limit, 100)
        }
        
        try:
            response = _make_request("GET", url, self.headers, params=params)
            if not response:
                return {"values": [], "size": 0}
            
            # Log success
            issue_count = response.get('size', 0)
            logger.info(f"✅ Fetched {issue_count} issues from queue {queue_id}")
            
            return response
        except Exception as e:
            logger.error(f"❌ Error fetching issues from queue {queue_id}: {e}")
            return {"values": [], "size": 0, "error": str(e)}
    
    # ============================================================
    # REQUEST TYPES
    # ============================================================
    
    def get_request_types(self, desk_id: str, start: int = 0, 
                         limit: int = 50) -> Dict[str, Any]:
        """
        Get request types for a service desk
        
        GET /rest/servicedeskapi/servicedesk/{serviceDeskId}/requesttype
        Docs: https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-requesttype/#api-rest-servicedeskapi-servicedesk-servicedeskid-requesttype-get
        
        Args:
            desk_id: Service desk ID
            start: Starting index
            limit: Max results (max: 100)
        
        Returns:
            {
                "size": int,
                "values": [
                    {
                        "id": str,
                        "name": str,
                        "description": str,
                        "helpText": str,
                        "issueTypeId": str,
                        "serviceDeskId": str,
                        "groupIds": [str],
                        "icon": {...}
                    }
                ]
            }
        """
        url = f"{self.base_url}/servicedesk/{desk_id}/requesttype"
        params = {
            "start": start,
            "limit": min(limit, 100)
        }
        
        try:
            response = _make_request("GET", url, self.headers, params=params)
            return response if response else {"values": [], "size": 0}
        except Exception as e:
            logger.error(f"❌ Error fetching request types for desk {desk_id}: {e}")
            return {"values": [], "size": 0, "error": str(e)}
    
    # ============================================================
    # CUSTOMERS & ORGANIZATIONS
    # ============================================================
    
    def get_customers(self, desk_id: str, query: str = "", 
                     start: int = 0, limit: int = 50) -> Dict[str, Any]:
        """
        Get customers for a service desk
        
        GET /rest/servicedeskapi/servicedesk/{serviceDeskId}/customer
        Docs: https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-customer/#api-rest-servicedeskapi-servicedesk-servicedeskid-customer-get
        
        Args:
            desk_id: Service desk ID
            query: Filter customers by name/email
            start: Starting index
            limit: Max results
        
        Returns:
            Paginated customer list
        """
        url = f"{self.base_url}/servicedesk/{desk_id}/customer"
        params = {
            "query": query,
            "start": start,
            "limit": min(limit, 100)
        }
        
        try:
            response = _make_request("GET", url, self.headers, params=params)
            return response if response else {"values": [], "size": 0}
        except Exception as e:
            logger.error(f"❌ Error fetching customers for desk {desk_id}: {e}")
            return {"values": [], "size": 0, "error": str(e)}
    
    def get_organizations(self, desk_id: str, start: int = 0, 
                         limit: int = 50) -> Dict[str, Any]:
        """
        Get organizations for a service desk
        
        GET /rest/servicedeskapi/servicedesk/{serviceDeskId}/organization
        Docs: https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-organization/#api-rest-servicedeskapi-servicedesk-servicedeskid-organization-get
        
        Args:
            desk_id: Service desk ID
            start: Starting index
            limit: Max results
        
        Returns:
            Paginated organization list
        """
        url = f"{self.base_url}/servicedesk/{desk_id}/organization"
        params = {
            "start": start,
            "limit": min(limit, 100)
        }
        
        try:
            response = _make_request("GET", url, self.headers, params=params)
            return response if response else {"values": [], "size": 0}
        except Exception as e:
            logger.error(f"❌ Error fetching organizations for desk {desk_id}: {e}")
            return {"values": [], "size": 0, "error": str(e)}
    
    # ============================================================
    # HELPER METHODS
    # ============================================================
    
    def get_all_desks_with_queues(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get all service desks with their queues (nested structure)
        
        This is a helper method that combines multiple API calls to build
        a complete desk->queues mapping for the frontend dropdown.
        
        Returns:
            {
                "Desk Name 1": [
                    {"name": "Queue 1", "id": "1", "desk_id": "5"},
                    {"name": "Queue 2", "id": "2", "desk_id": "5"}
                ],
                "Desk Name 2": [...]
            }
        """
        result = {}
        skipped_desks = []
        total_queues = 0
        
        try:
            # Get all service desks
            desks_response = self.get_service_desks(limit=100)
            desks = desks_response.get('values', [])
            
            logger.info(f"📋 Fetching queues for {len(desks)} service desks...")
            
            for desk in desks:
                desk_id = desk.get('id')
                desk_name = desk.get('projectName') or desk.get('projectKey', 'Unknown')
                
                try:
                    # Get queues for this desk
                    queues_response = self.get_queues(desk_id, limit=100)
                    queues_data = queues_response.get('values', [])
                    
                    if not queues_data:
                        logger.warning(f"⚠️ Desk '{desk_name}': No queues found")
                        skipped_desks.append(desk_name)
                        continue
                    
                    # Format queues for frontend
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


# ============================================================
# SINGLETON INSTANCE
# ============================================================

# Global API instance (lazy initialized)
_service_desk_api_instance = None

def get_service_desk_api() -> JiraServiceDeskAPI:
    """Get or create the global Service Desk API instance"""
    global _service_desk_api_instance
    if _service_desk_api_instance is None:
        _service_desk_api_instance = JiraServiceDeskAPI()
    return _service_desk_api_instance
