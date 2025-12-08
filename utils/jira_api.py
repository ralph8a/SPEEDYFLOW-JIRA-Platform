# -*- coding: utf-8 -*-
"""
Extended JIRA API Functions
Provides comprehensive set of functions for JIRA operations
"""

import logging
from typing import Optional, Dict, List, Any, Union
from datetime import datetime, timedelta
import json

from .common import (
    _get_credentials,
    _get_auth_header,
    _make_request,
    JiraApiError
)
from .http_utils import retry_on_error

logger = logging.getLogger(__name__)

class JiraAPI:
    @retry_on_error()
    def get_service_desk_customers(self, service_desk_id: str, query: str = "", max_results: int = 50) -> list:
        """
        Fetch customers (portal users) for a given service desk using the JIRA Service Desk API.
        Args:
            service_desk_id: ID of the service desk (portal)
            query: Optional search string to filter users
            max_results: Max number of users to return
        Returns:
            List of customer dicts (displayName, accountId, emailAddress, etc)
        """
        url = f"{self.site}/rest/servicedeskapi/servicedesk/{service_desk_id}/customer"
        params = {"query": query, "limit": max_results}
        headers = dict(self.headers)
        headers["Accept"] = "application/json"
        response = _make_request("GET", url, headers, params=params)
        if response and "values" in response:
            return response["values"]
        return []

    @retry_on_error()
    def get_service_desk_agents(self, service_desk_id: str, query: str = "", max_results: int = 50) -> list:
        """
        Fetch agents for a given service desk using the JIRA Service Desk API.
        Args:
            service_desk_id: ID of the service desk (portal)
            query: Optional search string to filter users
            max_results: Max number of users to return
        Returns:
            List of agent dicts (displayName, accountId, emailAddress, etc)
        """
        url = f"{self.site}/rest/servicedeskapi/servicedesk/{service_desk_id}/agent"
        params = {"query": query, "limit": max_results}
        headers = dict(self.headers)
        headers["Accept"] = "application/json"
        response = _make_request("GET", url, headers, params=params)
        if response and "values" in response:
            return response["values"]
        return []
    """JIRA API Client with comprehensive functionality"""
    
    def __init__(self, config):
        self.config = config
        self.site, self.email, self.api_token = _get_credentials(config)
        if not all([self.site, self.email, self.api_token]):
            raise JiraApiError("JIRA credentials not properly configured")
        self.headers = _get_auth_header(self.email, self.api_token)

    @retry_on_error()
    def create_issue(
        self,
        project_key: str,
        summary: str,
        description: str,
        issue_type: str = "Task",
        priority: str = "Medium",
        assignee: Optional[str] = None,
        components: Optional[List[str]] = None,
        labels: Optional[List[str]] = None,
        custom_fields: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new JIRA issue
        
        Args:
            project_key: Project identifier
            summary: Issue title
            description: Issue description
            issue_type: Type of issue (Task, Bug, Story, etc.)
            priority: Issue priority
            assignee: Username to assign the issue to
            components: List of component names
            labels: List of labels to add
            custom_fields: Dict of custom field values
            
        Returns:
            Created issue data
        """
        url = f"{self.site}/rest/api/2/issue"
        
        data = {
            "fields": {
                "project": {"key": project_key},
                "summary": summary,
                "description": description,
                "issuetype": {"name": issue_type},
                "priority": {"name": priority}
            }
        }
        
        if assignee:
            data["fields"]["assignee"] = {"name": assignee}
        if components:
            data["fields"]["components"] = [{"name": c} for c in components]
        if labels:
            data["fields"]["labels"] = labels
        if custom_fields:
            for field_id, value in custom_fields.items():
                data["fields"][field_id] = value
                
        response = _make_request("POST", url, self.headers, json=data)
        if not response:
            raise JiraApiError("Failed to create issue")
        return response
    @retry_on_error()
    def get_issue(
        self,
        issue_key: str,
        fields: Optional[List[str]] = None,
        expand: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get issue details by key
        
        Args:
            issue_key: Issue identifier (e.g., PROJECT-123)
            fields: List of fields to retrieve
            expand: List of expansions to include
            
        Returns:
            Issue data dictionary
        """
        params = {}
        if fields:
            params["fields"] = ",".join(fields)
        if expand:
            params["expand"] = ",".join(expand)
            
        url = f"{self.site}/rest/api/2/issue/{issue_key}"
        return _make_request("GET", url, self.headers, params=params)

    @retry_on_error()
    def update_issue(
        self,
        issue_key: str,
        fields: Dict[str, Any]
    ) -> None:
        """
        Update an existing issue
        
        Args:
            issue_key: Issue identifier
            fields: Dictionary of field updates
        """
        url = f"{self.site}/rest/api/2/issue/{issue_key}"
        data = {"fields": fields}
        _make_request("PUT", url, self.headers, json=data)

    @retry_on_error()
    def transition_issue(
        self,
        issue_key: str,
        transition_id: str,
        resolution: Optional[str] = None,
        comment: Optional[str] = None
    ) -> None:
        """
        Transition an issue to a new status
        
        Args:
            issue_key: Issue identifier
            transition_id: ID of the transition to perform
            resolution: Optional resolution when closing
            comment: Optional comment to add
        """
        url = f"{self.site}/rest/api/2/issue/{issue_key}/transitions"
        data = {
            "transition": {"id": transition_id}
        }
        
        if resolution or comment:
            data["fields"] = {}
            if resolution:
                data["fields"]["resolution"] = {"name": resolution}
            if comment:
                data["update"] = {
                    "comment": [{
                        "add": {"body": comment}
                    }]
                }
                
        _make_request("POST", url, self.headers, json=data)

    @retry_on_error()
    def add_comment(
        self,
        issue_key: str,
        body: str,
        visibility: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Add a comment to an issue
        
        Args:
            issue_key: Issue identifier
            body: Comment text
            visibility: Optional visibility restrictions
            
        Returns:
            Created comment data
        """
        url = f"{self.site}/rest/api/2/issue/{issue_key}/comment"
        data = {"body": body}
        if visibility:
            data["visibility"] = visibility
            
        return _make_request("POST", url, self.headers, json=data)

    def _prepare_assignee_data(self, assignee: Optional[str]) -> Dict[str, Any]:
        """
        Prepara los datos de asignación para la API de JIRA
        
        Args:
            assignee: Username del asignado o None
            
        Returns:
            Diccionario con datos de asignación
        """
        return {"name": assignee} if assignee else {"name": None}

    @retry_on_error()
    def assign_issue(
        self,
        issue_key: str,
        assignee: Optional[str] = None
    ) -> None:
        """
        Assign an issue to a user
        
        Args:
            issue_key: Issue identifier
            assignee: Username to assign to, or None to unassign
        """
        url = f"{self.site}/rest/api/2/issue/{issue_key}/assignee"
        data = self._prepare_assignee_data(assignee)
        _make_request("PUT", url, self.headers, json=data)

    @retry_on_error()
    def get_transitions(
        self,
        issue_key: str
    ) -> List[Dict[str, Any]]:
        """
        Get available transitions for an issue
        
        Args:
            issue_key: Issue identifier
            
        Returns:
            List of available transitions
        """
        url = f"{self.site}/rest/api/2/issue/{issue_key}/transitions"
        response = _make_request("GET", url, self.headers)
        return response.get("transitions", [])

    @retry_on_error()
    def search_issues(
        self,
        jql: str,
        fields: Optional[List[str]] = None,
        start_at: int = 0,
        max_results: int = 50,
        validate_query: bool = True
    ) -> Dict[str, Any]:
        """
        Search for issues using JQL (GET method with API v2)
        
        Args:
            jql: JQL search string
            fields: List of fields to retrieve
            start_at: Pagination start
            max_results: Maximum results to return
            validate_query: Whether to validate JQL
            
        Returns:
            Search results with issues and metadata
        """
        url = f"{self.site}/rest/api/2/search"  # API v2 (v3 returns 410 Gone)
        params = {
            "jql": jql,
            "startAt": start_at,
            "maxResults": max_results,
            "validateQuery": validate_query
        }
        if fields:
            params["fields"] = ",".join(fields)  # Comma-separated string for GET
            
        # Use GET with API v2 (stable and widely supported)
        return _make_request("GET", url, self.headers, params=params)

    @retry_on_error()
    def get_project(
        self,
        project_key: str,
        expand: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get project details
        
        Args:
            project_key: Project identifier
            expand: Optional expansions to include
            
        Returns:
            Project data
        """
        url = f"{self.site}/rest/api/2/project/{project_key}"
        params = {}
        if expand:
            params["expand"] = ",".join(expand)
            
        return _make_request("GET", url, self.headers, params=params)

    @retry_on_error()
    def get_all_fields(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all available fields in JIRA (standard and custom).
        
        Used to dynamically identify custom fields like Criticidad without hardcoding.
        
        Returns:
            Dictionary mapping field IDs to field metadata (name, type, etc.)
        """
        url = f"{self.site}/rest/api/2/field"
        fields_list = _make_request("GET", url, self.headers)
        
        if not fields_list:
            logger.warning("No fields returned from API")
            return {}
        
        # Convert list to dictionary with field IDs as keys
        fields_dict = {}
        if isinstance(fields_list, list):
            for field in fields_list:
                field_id = field.get("id")
                if field_id:
                    fields_dict[field_id] = field
        
        return fields_dict

    @retry_on_error()
    def get_issue_watchers(
        self,
        issue_key: str
    ) -> List[Dict[str, Any]]:
        """
        Get list of users watching an issue
        
        Args:
            issue_key: Issue identifier
            
        Returns:
            List of watchers
        """
        url = f"{self.site}/rest/api/2/issue/{issue_key}/watchers"
        response = _make_request("GET", url, self.headers)
        return response.get("watchers", [])

    @retry_on_error()
    def add_watcher(
        self,
        issue_key: str,
        username: str
    ) -> None:
        """
        Add a user as a watcher on an issue
        
        Args:
            issue_key: Issue identifier
            username: Username to add as watcher
        """
        url = f"{self.site}/rest/api/2/issue/{issue_key}/watchers"
        _make_request("POST", url, self.headers, data=f'"{username}"')

    @retry_on_error()
    def create_version(
        self,
        project_key: str,
        name: str,
        description: Optional[str] = None,
        release_date: Optional[str] = None,
        archived: bool = False,
        released: bool = False
    ) -> Dict[str, Any]:
        """
        Create a new version in a project
        
        Args:
            project_key: Project identifier
            name: Version name
            description: Optional version description
            release_date: Optional release date (YYYY-MM-DD)
            archived: Whether version is archived
            released: Whether version is released
            
        Returns:
            Created version data
        """
        url = f"{self.site}/rest/api/2/version"
        data = {
            "project": project_key,
            "name": name,
            "archived": archived,
            "released": released
        }
        if description:
            data["description"] = description
        if release_date:
            data["releaseDate"] = release_date
            
        return _make_request("POST", url, self.headers, json=data)

    @retry_on_error()
    def get_issue_changelog(
        self,
        issue_key: str,
        start_at: int = 0,
        max_results: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get the change history of an issue
        
        Args:
            issue_key: Issue identifier
            start_at: Pagination start
            max_results: Maximum results to return
            
        Returns:
            List of changelog entries
        """
        url = f"{self.site}/rest/api/2/issue/{issue_key}/changelog"
        params = {
            "startAt": start_at,
            "maxResults": max_results
        }
        response = _make_request("GET", url, self.headers, params=params)
        return response.get("values", [])

    def get_field_value(
        self,
        issue_data: Dict[str, Any],
        field_path: str,
        default: Any = None
    ) -> Any:
        """
        Safely extract field value from issue data
        
        Args:
            issue_data: Issue data dictionary
            field_path: Dot-separated path to field
            default: Default value if field not found
            
        Returns:
            Field value or default
        """
        current = issue_data
        for part in field_path.split('.'):
            if isinstance(current, dict):
                current = current.get(part, default)
            else:
                return default
        return current

    def format_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """
        Parse JIRA date string to datetime
        
        Args:
            date_str: JIRA date string
            
        Returns:
            Datetime object or None
        """
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S.%f%z")
        except ValueError:
            try:
                return datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                logger.warning(f"Could not parse date: {date_str}")
                return None