#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Compatibility shim for older imports.

This module now delegates to `api.jira_clients.get_platform_api()` to
preserve backwards compatibility with modules that import
`api.jira_platform_api.get_platform_api` or the class directly.
"""
from typing import Any
import logging
from api.jira_clients import get_platform_api, JiraPlatformAPI  # type: ignore

logger = logging.getLogger(__name__)

# Backwards compatible accessors
def get_platform_api() -> JiraPlatformAPI:
    return get_platform_api()

__all__ = ["get_platform_api", "JiraPlatformAPI"]
    # ============================================================
    # PROJECTS
    # ============================================================
    def get_projects(self, expand: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all projects visible to the user
        GET /rest/api/3/project
        Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-get
        Args:
            expand: Optional comma-separated list of fields to expand
                    (e.g., 'description,lead,issueTypes')
        Returns:
            List of project objects
        """
        url = f"{self.base_url}/project"
        params = {}
        if expand:
            params['expand'] = expand
        try:
            response = _make_request("GET", url, self.headers, params=params)
            return response if response else []
        except Exception as e:
            logger.error(f"❌ Error fetching projects: {e}")
            return []
    def get_project(self, project_key: str, expand: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get project details by key
        GET /rest/api/3/project/{projectIdOrKey}
        Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-projectidorkey-get
        Args:
            project_key: Project key (e.g., 'PROJ')
            expand: Optional fields to expand
        Returns:
            Project object or None if error
        """
        url = f"{self.base_url}/project/{project_key}"
        params = {}
        if expand:
            params['expand'] = expand
        try:
            return _make_request("GET", url, self.headers, params=params)
        except Exception as e:
            logger.error(f"❌ Error fetching project {project_key}: {e}")
            return None
    # ============================================================
    # ISSUES
    # ============================================================
    def get_issue(self, issue_key: str, fields: Optional[str] = None, expand: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get issue details by key
        GET /rest/api/3/issue/{issueIdOrKey}
        Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get
        Args:
            issue_key: Issue key (e.g., 'PROJ-123')
            fields: Comma-separated list of fields to return (default: all)
            expand: Optional fields to expand (e.g., 'renderedFields,names,changelog')
        Returns:
            Issue object or None if error
        """
        url = f"{self.base_url}/issue/{issue_key}"
        params = {}
        if fields:
            params['fields'] = fields
        if expand:
            params['expand'] = expand
        try:
            return _make_request("GET", url, self.headers, params=params)
        except Exception as e:
            logger.error(f"❌ Error fetching issue {issue_key}: {e}")
            return None
    def search_issues(self, jql: str, fields: Optional[List[str]] = None, 
                     max_results: int = 50, start_at: int = 0) -> Dict[str, Any]:
        """
        Search for issues using JQL
        POST /rest/api/3/search
        Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-post
        Args:
            jql: JQL query string
            fields: List of field names to return (default: navigable fields)
            max_results: Maximum results to return (default: 50, max: 100)
            start_at: Index of first result to return (for pagination)
        Returns:
            Search results with issues, total, maxResults, startAt
        """
        url = f"{self.base_url}/search"
        body = {
            "jql": jql,
            "maxResults": min(max_results, 100),
            "startAt": start_at
        }
        if fields:
            body['fields'] = fields
        try:
            return _make_request("POST", url, self.headers, json=body)
        except Exception as e:
            logger.error(f"❌ Error searching issues: {e}")
            return {"issues": [], "total": 0}
    def update_issue(self, issue_key: str, fields: Dict[str, Any]) -> bool:
        """
        Update issue fields
        PUT /rest/api/3/issue/{issueIdOrKey}
        Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-put
        Args:
            issue_key: Issue key to update
            fields: Dictionary of field updates (e.g., {"summary": "New title"})
        Returns:
            True if successful, False otherwise
        """
        url = f"{self.base_url}/issue/{issue_key}"
        body = {"fields": fields}
        try:
            _make_request("PUT", url, self.headers, json=body)
            logger.info(f"✅ Updated issue {issue_key}")
            return True
        except Exception as e:
            logger.error(f"❌ Error updating issue {issue_key}: {e}")
            return False
    def assign_issue(self, issue_key: str, account_id: Optional[str]) -> bool:
        """
        Assign issue to user
        PUT /rest/api/3/issue/{issueIdOrKey}/assignee
        Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-assignee-put
        Args:
            issue_key: Issue key to assign
            account_id: User account ID (None to unassign)
        Returns:
            True if successful, False otherwise
        """
        url = f"{self.base_url}/issue/{issue_key}/assignee"
        body = {"accountId": account_id} if account_id else {"accountId": None}
        try:
            _make_request("PUT", url, self.headers, json=body)
            logger.info(f"✅ Assigned issue {issue_key}")
            return True
        except Exception as e:
            logger.error(f"❌ Error assigning issue {issue_key}: {e}")
            return False
    # ============================================================
    # COMMENTS
    # ============================================================
    def get_comments(self, issue_key: str) -> List[Dict[str, Any]]:
        """
        Get all comments for an issue
        GET /rest/api/3/issue/{issueIdOrKey}/comment
        Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-get
        Args:
            issue_key: Issue key
        Returns:
            List of comment objects
        """
        url = f"{self.base_url}/issue/{issue_key}/comment"
        try:
            response = _make_request("GET", url, self.headers)
            return response.get('comments', []) if response else []
        except Exception as e:
            logger.error(f"❌ Error fetching comments for {issue_key}: {e}")
            return []
    def add_comment(self, issue_key: str, body: str) -> Optional[Dict[str, Any]]:
        """
        Add comment to issue
        POST /rest/api/3/issue/{issueIdOrKey}/comment
        Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-post
        Args:
            issue_key: Issue key
            body: Comment text (Atlassian Document Format or plain text)
        Returns:
            Created comment object or None if error
        """
        url = f"{self.base_url}/issue/{issue_key}/comment"
        # Convert to Atlassian Document Format
        comment_body = {
            "body": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": body
                            }
                        ]
                    }
                ]
            }
        }
        try:
            response = _make_request("POST", url, self.headers, json=comment_body)
            logger.info(f"✅ Added comment to {issue_key}")
            return response
        except Exception as e:
            logger.error(f"❌ Error adding comment to {issue_key}: {e}")
            return None
    # ============================================================
    # TRANSITIONS
    # ============================================================
    def get_transitions(self, issue_key: str) -> List[Dict[str, Any]]:
        """
        Get available transitions for an issue
        GET /rest/api/3/issue/{issueIdOrKey}/transitions
        Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-get
        Args:
            issue_key: Issue key
        Returns:
            List of available transition objects
        """
        url = f"{self.base_url}/issue/{issue_key}/transitions"
        try:
            response = _make_request("GET", url, self.headers)
            return response.get('transitions', []) if response else []
        except Exception as e:
            logger.error(f"❌ Error fetching transitions for {issue_key}: {e}")
            return []
    def do_transition(self, issue_key: str, transition_id: str, fields: Optional[Dict] = None) -> bool:
        """
        Perform transition on issue
        POST /rest/api/3/issue/{issueIdOrKey}/transitions
        Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-post
        Args:
            issue_key: Issue key
            transition_id: ID of transition to perform
            fields: Optional field updates during transition
        Returns:
            True if successful, False otherwise
        """
        url = f"{self.base_url}/issue/{issue_key}/transitions"
        body = {
            "transition": {"id": transition_id}
        }
        if fields:
            body['fields'] = fields
        try:
            _make_request("POST", url, self.headers, json=body)
            logger.info(f"✅ Transitioned issue {issue_key}")
            return True
        except Exception as e:
            logger.error(f"❌ Error transitioning issue {issue_key}: {e}")
            return False
    # ============================================================
    # USERS
    # ============================================================
    def get_current_user(self) -> Optional[Dict[str, Any]]:
        """
        Get current user details with groups
        GET /rest/api/3/myself
        Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-myself/#api-rest-api-3-myself-get
        Returns:
            User object with groups or None if error
        """
        url = f"{self.base_url}/myself"
        try:
            user_data = _make_request("GET", url, self.headers)
            # Try to get user's groups
            if user_data and 'accountId' in user_data:
                try:
                    groups_url = f"{self.base_url}/user/groups"
                    groups_params = {"accountId": user_data['accountId']}
                    groups_response = _make_request("GET", groups_url, self.headers, params=groups_params)
                    if groups_response:
                        user_data['groups'] = groups_response
                        logger.info(f"✅ Fetched {len(groups_response)} groups for user")
                except Exception as group_error:
                    logger.warning(f"⚠️ Could not fetch user groups: {group_error}")
                    user_data['groups'] = []
            return user_data
        except Exception as e:
            logger.error(f"❌ Error fetching current user: {e}")
            return None
    def search_users(self, query: str, max_results: int = 50) -> List[Dict[str, Any]]:
        """
        Search for users
        GET /rest/api/3/user/search
        Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-user-search/#api-rest-api-3-user-search-get
        Args:
            query: Query string (email, display name, etc.)
            max_results: Maximum results to return
        Returns:
            List of user objects
        """
        url = f"{self.base_url}/user/search"
        params = {
            "query": query,
            "maxResults": max_results
        }
        try:
            response = _make_request("GET", url, self.headers, params=params)
            return response if response else []
        except Exception as e:
            logger.error(f"❌ Error searching users: {e}")
            return []
