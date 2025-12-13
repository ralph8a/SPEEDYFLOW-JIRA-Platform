#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
JIRA API Operations Module
Centralized API calls for JIRA integration
"""


import logging
from typing import Optional, List, Dict, Any, Union, Tuple
import streamlit as st
import pandas as pd
from datetime import datetime
import time

from utils.api_migration import get_api_client
from utils.common import _normalize_url, _make_request
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Cache para enriquecimiento de issues (TTL: 1 hora)
_enrich_cache = {}
_enrich_cache_ttl = 3600  # 1 hora en segundos


# ============================================================================
# FIELD NORMALIZATION - Support both Spanish and English field names
# ============================================================================

def _get_field_value(fields_dict: Dict, *field_names: str) -> Any:
    """
    Get field value from JIRA fields dict, trying multiple field names (English/Spanish).
    
    Args:
        fields_dict: The fields dictionary from JIRA response
        *field_names: Variable number of possible field names to try
        
    Returns:
        Field value if found, None otherwise
    """
    for field_name in field_names:
        if field_name in fields_dict:
            return fields_dict[field_name]
    return None


def enrich_issue_from_jira(issue: Dict, client=None) -> Dict:
    """
    Enrich issue data from JIRA REST API with labels, components, custom fields, transitions.
    
    DISABLED: No longer makes API calls to avoid excessive JIRA load.
    Returns issue as-is with empty enrichment fields.
    
    Args:
        issue: Issue dictionary from Service Desk API
        client: Optional API client (if None, will create one)
        
    Returns:
        Issue dictionary with empty enrichment fields (labels, components, custom_fields, transitions)
    """
    # Return issue with empty enrichment fields - no API calls made
    enriched = {
        **issue,
        "labels": [],
        "components": [],
        "custom_fields": {},
        "available_transitions": []
    }
    
    logger.debug(f"Enrich DISABLED for {issue.get('key', 'unknown')} - returning issue as-is")
    return enriched


@dataclass
class Project:
    key: str
    name: str
    id: Optional[str] = None
    
@dataclass 
class User:
    name: str
    display_name: Optional[str] = None
    email: Optional[str] = None



@st.cache_data(show_spinner=True)
def get_project_name(project_key: str) -> str:
    """
    Get project name from JIRA
    
    Args:
        project_key: The project key to look up
        
    Returns:
        Project name if found, otherwise project key
    """
    if not project_key:
        return "Project"
    
    try:
        client = get_api_client()
        project = client.get_project(project_key)
        if project:
            name = project.get("name", project_key)
            logger.info(f"Project: {name}")
            return name
    except Exception as e:
        logger.warning(f"Error getting project name: {e}")
        return project_key
    
    return project_key


def get_project(project_key: str) -> Optional[Project]:
    """
    Get Project object from JIRA
    
    Args:
        project_key: The project key to look up
        
    Returns:
        Project object if found, None if not found or error occurs
    """
    try:
        client = get_api_client()
        project_data = client.get_project(project_key)
        if project_data:
            return Project(
                key=project_key,
                name=project_data.get("name", project_key),
                id=project_data.get("id")
            )
    except Exception as e:
        logger.error(f"Error getting project: {e}")
        
    return None


@st.cache_data(ttl=3600)
def list_available_projects() -> List[Dict[str, str]]:
    """
    List all available projects in JIRA
    
    Returns:
        List of projects with key, name and type
    """
    try:
        client = get_api_client()
        
        url = f"{client.site}/rest/api/2/project"
        projects = _make_request("GET", url, client.headers)
        
        result = []
        if isinstance(projects, list):
            for proj in projects:
                if isinstance(proj, dict) and "key" in proj:
                    result.append({
                        "key": proj.get("key"),
                        "name": proj.get("name", proj.get("key")),
                        "type": proj.get("projectTypeKey", "unknown")
                    })
                    
        logger.info(f"Found {len(result)} projects")
        return result
        
    except Exception as e:
        logger.error(f"Error listing projects: {e}")
        return []


@st.cache_data(show_spinner=True)
def get_service_desk_id(project_key: str) -> Optional[str]:
    """
    Get service desk ID for a project
    
    Args:
        project_key: Project key to look up
        
    Returns:
        Service desk ID or None if not found
    """
    try:
        client = get_api_client()
        service_desks = _make_request(
            "GET", 
            f"{client.site}/rest/servicedeskapi/servicedesk",
            client.headers
        )
        
        for desk in service_desks.get('values', []):
            if desk.get('projectKey') == project_key:
                return desk.get('id')
                
        logger.warning(f"Service desk not found for project {project_key}")
        return None
        
    except Exception as e:
        logger.error(f"Error getting service desk ID: {e}")
        return None

@st.cache_data(show_spinner=True) 
def get_queue_id_from_name(project_key: str, queue_name: str) -> Optional[int]:
    """
    Get queue ID from queue name for a project
    
    Args:
        project_key: Project key to look up
        queue_name: Name of queue to look up
        
    Returns:
        Queue ID if found, otherwise None
    """
    if not queue_name:
        logger.warning("No queue name provided")
        return None
        
    try:
        # First try direct numeric conversion
        try:
            return int(queue_name)
        except ValueError:
            pass
            
        # Get service desk ID
        desk_id = get_service_desk_id(project_key)
        if not desk_id:
            return None
            
        # Get queues for this desk
        client = get_api_client()
        queues_url = f"{client.site}/rest/servicedeskapi/servicedesk/{desk_id}/queues"
        queue_response = _make_request("GET", queues_url, client.headers)
        
        queues = queue_response.get('values', [])
        for queue in queues:
            if queue.get('name') == queue_name:
                return queue.get('id')
                
        logger.warning(f"Could not find queue ID for: {queue_name}")
        return None
        
    except Exception as e:
        logger.error(f"Error getting queue ID from name: {e}")
        return None


@st.cache_data(ttl=3600)
def list_available_queues() -> List[Dict[str, str]]:
    """List all available Service Desk queues"""
    queues = []
    
    try:
        client = get_api_client()
        
        # Get service desks
        url = f"{client.site}/rest/servicedeskapi/servicedesk"
        service_desks_response = _make_request("GET", url, client.headers)
        
        if service_desks_response and isinstance(service_desks_response, dict):
            desks = service_desks_response.get('values', [])
            logger.info(f"Found {len(desks)} service desks")
            
            for desk in desks:
                desk_key = desk.get('projectKey')
                desk_id = desk.get('id')
                
                if not desk_key or not desk_id:
                    continue
                
                # Add this desk as a queue
                queues.append({
                    "key": desk_key,
                    "name": desk_key,
                    "project_key": desk_key,
                    "queue_id": "all",
                    "desk_id": desk_id
                })
                
                logger.info(f"Added queue: {desk_key}")
        else:
            logger.warning("No service desks found via API")
            
    except Exception as e:
        logger.error(f"Error fetching queues from Service Desk API: {e}")

    # If no queues found via API, use fallback with real service desk projects
    if not queues:
        logger.info("No queues found via API, using fallback projects")
        
        # Real service desk projects from Jira
        fallback_queues = [
            {"key": "AP", "name": "AP", "project_key": "AP", "queue_id": "all"},
            {"key": "AR", "name": "AR", "project_key": "AR", "queue_id": "all"},
            {"key": "IN", "name": "IN", "project_key": "IN", "queue_id": "all"},
            {"key": "OP", "name": "OP", "project_key": "OP", "queue_id": "all"},
            {"key": "DES", "name": "DES", "project_key": "DES", "queue_id": "all"},
            {"key": "QA", "name": "QA", "project_key": "QA", "queue_id": "all"},
            {"key": "MSM", "name": "MSM", "project_key": "MSM", "queue_id": "all"},
        ]
        
        queues = fallback_queues
        logger.info(f"Loaded {len(fallback_queues)} fallback queues from real service desks")
                    
    logger.info(f"Returning {len(queues)} queues total")
    return queues


@st.cache_data(ttl=3600)
def get_severity_values() -> List[Dict[str, str]]:
    """
    Fetch available severity values from JIRA
    
    Returns:
        List of severity options with id, name, and description
    """
    try:
        client = get_api_client()
        
        # Try to get severity field options from JIRA
        url = f"{client.site}/rest/api/2/field"
        fields_response = _make_request("GET", url, client.headers)
        
        severity_values = []
        
        if fields_response:
            # Look for severity or priority fields
            for field in fields_response:
                field_name = field.get('name', '').lower()
                field_id = field.get('id', '')
                
                # Check if it's a severity-related field
                if any(term in field_name for term in ['severity', 'severidad', 'priority', 'prioridad']):
                    # Get field options if available
                    if 'allowedValues' in field:
                        for value in field['allowedValues']:
                            severity_values.append({
                                'id': value.get('id', ''),
                                'name': value.get('name', ''),
                                'description': value.get('description', ''),
                                'field_id': field_id
                            })
                    elif field_id.startswith('customfield_'):
                        # For custom fields, try to get configuration
                        try:
                            config_url = f"{client.site}/rest/api/2/customfield/{field_id}/contexts"
                            config_response = _make_request("GET", config_url, client.headers)
                            
                            if config_response and 'values' in config_response:
                                for context in config_response['values']:
                                    if 'options' in context:
                                        for option in context['options']:
                                            severity_values.append({
                                                'id': option.get('id', ''),
                                                'name': option.get('value', ''),
                                                'description': option.get('description', ''),
                                                'field_id': field_id
                                            })
                        except Exception as e:
                            logger.debug(f"Could not get custom field config for {field_id}: {e}")
        
        # If no severity values found, try common priority values
        if not severity_values:
            try:
                priority_url = f"{client.site}/rest/api/2/priority"
                priority_response = _make_request("GET", priority_url, client.headers)
                
                if priority_response:
                    for priority in priority_response:
                        severity_values.append({
                            'id': priority.get('id', ''),
                            'name': priority.get('name', ''),
                            'description': priority.get('description', ''),
                            'field_id': 'priority'
                        })
            except Exception as e:
                logger.debug(f"Could not get priority values: {e}")
        
        # No fallback - if no severity values found, return empty list
        if not severity_values:
            logger.warning("No severity values found from JIRA APIs")
        
        logger.info(f"Found {len(severity_values)} severity values from JIRA")
        return severity_values
        
    except Exception as e:
        logger.error(f"Error getting severity values: {e}")
        # Return fallback values
        return [
            {'id': '1', 'name': 'Critical', 'description': 'Critical severity', 'field_id': 'fallback'},
            {'id': '2', 'name': 'High', 'description': 'High severity', 'field_id': 'fallback'},
            {'id': '3', 'name': 'Medium', 'description': 'Medium severity', 'field_id': 'fallback'},
            {'id': '4', 'name': 'Low', 'description': 'Low severity', 'field_id': 'fallback'},
            {'id': '5', 'name': 'Normal', 'description': 'Normal severity', 'field_id': 'fallback'}
        ]


@st.cache_data(ttl=3600)
def get_current_user_name() -> Optional[str]:
    """
    Fetch current user's name from JIRA profile (myself endpoint)
    
    Returns:
        Display name of current user or None if not found
    """
    try:
        client = get_api_client()
        # Try API v3 first (Cloud)
        url = f"{client.site}/rest/api/3/myself"
        try:
            data = _make_request("GET", url, client.headers)
            if data and ('displayName' in data or 'name' in data):
                name = data.get("displayName") or data.get("name")
                email = data.get("emailAddress", "")
                logger.info(f"✓ Current user: {name} ({email})")
                return name
        except Exception as e3:
            # Try API v2 fallback (Server/Data Center)
            logger.debug(f"API v3 failed, trying v2: {e3}")
            url_v2 = f"{client.site}/rest/api/2/myself"
            data = _make_request("GET", url_v2, client.headers)
            if data and ('displayName' in data or 'name' in data):
                name = data.get("displayName") or data.get("name")
                logger.info(f"✓ Current user (v2): {name}")
                return name
                
        logger.warning("⚠️ Could not get user from API response")
        return None
        
    except Exception as e:
        logger.error(f"❌ Error getting current user: {e}")
        return None


def get_current_user() -> Optional[User]:
    """Get User object for current user"""
    try:
        name = get_current_user_name()
        if name:
            return User(name=name, email=None)
        return None
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        return None


@st.cache_data(ttl=300, show_spinner=False)
def get_reporter_issues(service_desk_id: Optional[str] = None, project_key: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get all issues where the current user is the reporter/creator.
    
    OPTIMIZED STRATEGY: 
    - Search only "All open" queues (1 per desk, not every queue)
    - Filter by reporter WITHOUT fetching individual issues (reporter is in queue response!)
    - This is ~50-100x faster than the previous approach
    
    Args:
        service_desk_id: Optional service desk ID to filter by
        project_key: Optional project key to filter by
        
    Returns:
        List of issues reported by current user
    """
    try:
        client = get_api_client()
        
        # Get current user
        current_user = get_current_user()
        if not current_user:
            logger.warning("Could not determine current user")
            return []
        
        current_user_name = current_user.name.lower()
        logger.info(f"Fetching reporter issues for: {current_user.name}")
        
        all_reporter_issues = []
        
        try:
            # Get all service desks
            desks_url = f"{client.site}/rest/servicedeskapi/servicedesk"
            desks_response = _make_request("GET", desks_url, client.headers)
            
            if not desks_response or "values" not in desks_response:
                logger.warning("Could not fetch service desks")
                return []
            
            desks = desks_response.get("values", [])
            logger.info(f"Searching {len(desks)} service desks")
            
            # Iterate through each desk
            for desk in desks:
                desk_id = desk.get("id")
                desk_key = desk.get("projectKey", "Unknown")
                
                if not desk_id:
                    continue
                
                # Skip if filtering by specific desk
                if service_desk_id and str(desk_id) != str(service_desk_id):
                    continue
                
                # Get queues for this desk - will skip if 403
                try:
                    queues_url = f"{client.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue"
                    queues_response = _make_request("GET", queues_url, client.headers)
                    
                    if not queues_response or "values" not in queues_response:
                        continue
                    
                    queues = queues_response.get("values", [])
                    
                    # Find "All open" queue (or similar) - usually the first one
                    all_open_queue = None
                    for queue in queues:
                        queue_name = queue.get("name", "").lower()
                        # Look for "all open" or "todos" or similar
                        if "all open" in queue_name or "todos" in queue_name or "all" in queue_name:
                            all_open_queue = queue
                            break
                    
                    # Fallback: use first queue if no "All open" found
                    if not all_open_queue and queues:
                        all_open_queue = queues[0]
                    
                    if not all_open_queue:
                        continue
                    
                    queue_id = all_open_queue.get("id")
                    queue_name = all_open_queue.get("name", "Unknown")
                    
                    logger.debug(f"  {desk_key}: Using queue '{queue_name}'")
                    
                    # Get issues from this queue - expand to get reporter info
                    # OPTIMIZATION: Get up to 100 issues in one call, reporter is already in response!
                    issues_url = f"{client.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue/{queue_id}/issue"
                    issues_response = _make_request("GET", issues_url, client.headers, params={
                        "start": 0,
                        "limit": 100,
                        "expand": "changelog"  # This ensures full issue data is returned
                    })
                    
                    if not issues_response or "values" not in issues_response:
                        continue
                    
                    queue_issues = issues_response.get("values", [])
                    logger.debug(f"    Found {len(queue_issues)} issues, filtering by reporter...")
                    
                    # OPTIMIZATION: Filter issues where current user is the reporter
                    # Reporter field is already in the queue response - NO need to fetch individually!
                    for issue in queue_issues:
                        issue_key = issue.get("key")
                        
                        if not issue_key:
                            continue
                        
                        # Get reporter from fields - it's already here!
                        fields = issue.get("fields", {})
                        reporter = fields.get("reporter")

                        # Extract 'Formularios adjuntos' (attached forms) if present
                        custom_fields = {}
                        for k, v in fields.items():
                            if (
                                "formulario" in k.lower() or
                                "adjunto" in k.lower() or
                                "attached" in k.lower() or
                                "formularios" in k.lower()
                            ):
                                custom_fields["formularios_adjuntos"] = v
                                break

                        if reporter:
                            reporter_name = None
                            if isinstance(reporter, dict):
                                reporter_name = (
                                    reporter.get("displayName") or 
                                    reporter.get("name") or 
                                    reporter.get("accountId")
                                )
                            elif isinstance(reporter, str):
                                reporter_name = reporter
                            
                            # Compare reporter with current user
                            if reporter_name and reporter_name.lower() == current_user_name:
                                logger.debug(f"    ✓ {issue_key} - reported by you")
                                
                                # Enrich with JIRA REST API data
                                enriched_issue = enrich_issue_from_jira(issue, client)
                                enriched_issue["custom_fields"].update(custom_fields)
                                
                                all_reporter_issues.append(enriched_issue)

                
                except Exception as e:
                    logger.debug(f"  Error accessing desk {desk_key}: {e}")
                    continue
        
        except Exception as e:
            logger.error(f"Error fetching reporter issues: {e}")
        
        logger.info(f"✓ Found {len(all_reporter_issues)} reporter issues")
        return all_reporter_issues
        
    except Exception as e:
        logger.error(f"Error in get_reporter_issues: {e}")
        return []


def _normalize_severity_value(severity_obj: Any, custom_fields: Dict[str, Any], issue_key: str) -> str:
    """
    Normalize severity value from different sources
    
    Args:
        severity_obj: Raw severity object from API
        custom_fields: Custom fields dictionary
        issue_key: Issue key for logging
        
    Returns:
        Normalized severity string
    """
    # Severity mapping (Spanish to English if needed)
    severity_map = {
        'mayor': 'High',
        'menor': 'Low', 
        'crítico': 'Critical',
        'critico': 'Critical',
        'normal': 'Medium',
        'alta': 'High',
        'baja': 'Low',
        'media': 'Medium',
        # Keep English values as-is
        'critical': 'Critical',
        'high': 'High',
        'medium': 'Medium',
        'low': 'Low',
    }
    
    # Try direct severity field first
    if severity_obj:
        if isinstance(severity_obj, dict):
            severity_name = severity_obj.get("name") or severity_obj.get("value")
            if severity_name:
                normalized = severity_map.get(str(severity_name).lower(), severity_name)
                logger.debug(f"🔍 {issue_key} - Severity: {normalized} (from field object)")
                return normalized
        elif isinstance(severity_obj, str):
            normalized = severity_map.get(severity_obj.lower(), severity_obj)
            logger.debug(f"🔍 {issue_key} - Severity: {normalized} (from field string)")
            return normalized
    
    # Fallback to custom fields
    severity_field = custom_fields.get('severity')
    if severity_field:
        normalized = severity_map.get(str(severity_field).lower(), str(severity_field))
        logger.debug(f"🔍 {issue_key} - Severity: {normalized} (from custom field)")
        return normalized
    
    # No fallback - retornar None cuando no hay severity
    logger.debug(f"⚠️ {issue_key} - No severity data found")
    return None


def _extract_service_desk_custom_fields(fields: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract custom fields from Service Desk API response
    
    Args:
        fields: Fields dict from Service Desk API
        
    Returns:
        Dictionary of custom field mappings
    """
    custom_fields = {}
    
    # Common Service Desk custom fields
    custom_field_mappings = {
        'customfield_10001': 'epic_link',
        'customfield_10002': 'sprint',
        'customfield_10003': 'story_points',
        'customfield_10125': 'severity',  # Criticidad field (MSM project)
        'customfield_10020': 'severity_alt',  # Alternative severity field
        'customfield_10021': 'urgency',   # Common urgency field
        'customfield_10022': 'impact',    # Common impact field
        'customfield_10030': 'sla_time',  # SLA fields
        'customfield_10031': 'time_to_resolution',
        'customfield_10032': 'customer_satisfaction',
        'customfield_10040': 'category',  # Request category
        'customfield_10041': 'subcategory',
        'customfield_10050': 'business_service',
        'customfield_10060': 'environment',  # Environment (dev, prod, etc)
        'customfield_10070': 'affected_systems'
    }
    
    # Extract all custom fields from Service Desk response
    customfield_count = 0
    for field_key, field_value in fields.items():
        if field_key.startswith('customfield_'):
            customfield_count += 1
            # Store with original ID (customfield_xxx)
            custom_fields[field_key] = field_value
            
            # Also store with friendly name if mapped
            friendly_name = custom_field_mappings.get(field_key)
            if friendly_name and friendly_name != field_key:
                # Extract simple value for friendly name
                if isinstance(field_value, dict):
                    if 'displayName' in field_value:
                        custom_fields[friendly_name] = field_value['displayName']
                    elif 'name' in field_value:
                        custom_fields[friendly_name] = field_value['name']
                    elif 'value' in field_value:
                        custom_fields[friendly_name] = field_value['value']
                    else:
                        custom_fields[friendly_name] = str(field_value)
                elif isinstance(field_value, list):
                    if field_value and isinstance(field_value[0], dict):
                        custom_fields[friendly_name] = [item.get('name', str(item)) for item in field_value]
                    else:
                        custom_fields[friendly_name] = field_value
                else:
                    custom_fields[friendly_name] = field_value
    
    if customfield_count == 0:
        logger.warning(f"⚠️ No customfields found in Service Desk API response! Available fields: {list(fields.keys())[:10]}")
    
    return custom_fields


# Watchers cache with 8-hour TTL
_watchers_cache = {}
_watchers_cache_ttl = 28800  # 8 hours in seconds

def fetch_watchers_batch(issue_keys: List[str], use_cache: bool = True) -> Dict[str, List[Dict]]:
    """
    Fetch watchers for multiple issues in batch with caching.
    Cache TTL: 8 hours (watchers don't change frequently)
    
    Args:
        issue_keys: List of issue keys to fetch watchers for
        use_cache: Whether to use cached results (default: True)
        
    Returns:
        Dict mapping issue_key -> list of watchers
        Watcher format: [{accountId, displayName, emailAddress}, ...]
    """
    client = get_api_client()
    watchers_map = {}
    current_time = time.time()
    
    for issue_key in issue_keys:
        # Check cache first
        if use_cache and issue_key in _watchers_cache:
            cached_data, cached_time = _watchers_cache[issue_key]
            if current_time - cached_time < _watchers_cache_ttl:
                watchers_map[issue_key] = cached_data
                logger.debug(f"💾 {issue_key}: {len(cached_data)} watchers (cached)")
                continue
        
        # Fetch from API
        try:
            watchers = client.get_issue_watchers(issue_key)
            watchers_map[issue_key] = watchers
            
            # Store in cache
            _watchers_cache[issue_key] = (watchers, current_time)
            
            logger.debug(f"👁️ {issue_key}: {len(watchers)} watchers (fresh)")
        except Exception as e:
            logger.warning(f"Failed to fetch watchers for {issue_key}: {e}")
            watchers_map[issue_key] = []
    
    return watchers_map


def load_queue_issues(
    service_desk_id: str,
    queue_id: str,
    page_limit: int = 100
) -> Tuple[Optional[Any], Optional[str]]:
    """
    Load issues from JIRA service desk queue using BOTH Service Desk API and JIRA REST API
    
    Service Desk API: Get queue issues + custom fields (severity focus)
    JIRA REST API: Get enriched data (labels, components, severity custom fields)
    
    Args:
        service_desk_id: ID of the service desk
        queue_id: ID of the queue
        page_limit: Maximum number of results per page
        
    Returns:
        Tuple of (DataFrame or None, error message or None)
    """
    import time
    try:
        t0 = time.time()
        client = get_api_client()
        
        # STEP 1: Fetch from Service Desk API (queue issues)
        url_sd = f"{client.site}/rest/servicedeskapi/servicedesk/{service_desk_id}/queue/{queue_id}/issue"
        issues = []
        
        # Paginate through results
        start = 0
        request_count = 0
        bytes_accumulated = 0
        while True:
            response = _make_request("GET", url_sd, client.headers, params={
                "start": start,
                "limit": page_limit
            })
            request_count += 1
            
            if not response:
                break
                
            page_issues = response.get("values", [])
            # crude response size estimation for diagnostics
            try:
                import json as _json
                bytes_accumulated += len(_json.dumps(response))
            except Exception:
                pass
            if not page_issues:
                break
            
            issues.extend(page_issues)
            
            if response.get("isLastPage", True):
                break
                
            start = response.get("start", start) + len(page_issues)
        
        if not issues:
            logger.warning(f"No issues found in queue {queue_id} (desk {service_desk_id}) after {request_count} request(s); bytes={bytes_accumulated}")
            return None, "No issues found in queue"
        
        # STEP 2: Fetch all customfields from JIRA API in ONE batch call (JQL search)
        issue_keys = [issue.get("key") for issue in issues if issue.get("key")]
        jql_query = f"key in ({','.join(issue_keys)})"
        # Use new JQL enhanced search endpoint (replaces deprecated /search)
        jira_batch_url = f"{client.site}/rest/api/3/search/jql"
        jira_batch_params = {
            "jql": jql_query,
            "fields": ["assignee", "creator", "reporter", "customfield_10111", "customfield_10125", "customfield_10141", "customfield_10142", "customfield_10143", "labels", "components", "comment"],
            "expand": "changelog",
            "maxResults": len(issue_keys)
        }
        
        enriched_data = {}
        try:
            logger.info(f"🔄 Fetching batch customfields for {len(issue_keys)} issues via JQL: {jql_query[:100]}")
            jira_batch_response = _make_request("GET", jira_batch_url, client.headers, params=jira_batch_params)
            if jira_batch_response and "issues" in jira_batch_response:
                # Debug: Log first issue from JIRA API to see structure
                if jira_batch_response["issues"]:
                    first_jira = jira_batch_response["issues"][0]
                    logger.info(f"🔍 First JIRA API issue fields: {list(first_jira.get('fields', {}).keys())}")
                    
                for jira_issue in jira_batch_response["issues"]:
                    key = jira_issue.get("key")
                    fields = jira_issue.get("fields", {})
                    changelog = jira_issue.get("changelog", {})
                    
                    # Calculate last real change (changelog, comments, or updated)
                    last_change = None
                    
                    # Check changelog (transitions, field changes)
                    if changelog and "histories" in changelog:
                        histories = changelog.get("histories", [])
                        if histories:
                            # Get most recent history entry
                            last_history = max(histories, key=lambda h: h.get("created", ""))
                            last_change = last_history.get("created")
                    
                    # Check comments
                    comments = fields.get("comment", {}).get("comments", [])
                    if comments:
                        last_comment = max(comments, key=lambda c: c.get("created", ""))
                        comment_date = last_comment.get("created")
                        if not last_change or (comment_date and comment_date > last_change):
                            last_change = comment_date
                    
                    # Fallback to updated field if no changelog/comments
                    if not last_change:
                        last_change = fields.get("updated")
                    
                    # Log customfield_10111 structure for debugging
                    cf_10111 = fields.get("customfield_10111")
                    if cf_10111:
                        logger.info(f"🔍 {key} customfield_10111 type: {type(cf_10111)}, value: {cf_10111}")
                    
                    # Extract assignee from JIRA API (more reliable than Service Desk)
                    assignee_obj = fields.get("assignee")
                    assignee_name = None
                    if assignee_obj and isinstance(assignee_obj, dict):
                        assignee_name = assignee_obj.get("displayName") or assignee_obj.get("name")
                    
                    # Extract watchers info
                    watchers_obj = fields.get("watches", {})
                    watcher_count = 0
                    is_watching = False
                    if isinstance(watchers_obj, dict):
                        watcher_count = watchers_obj.get("watchCount", 0)
                        is_watching = watchers_obj.get("isWatching", False)
                    
                    enriched_data[key] = {
                        "assignee": assignee_name,
                        "creator": fields.get("creator"),
                        "reporter": fields.get("reporter"),
                        "customfield_10111": cf_10111,
                        "customfield_10125": fields.get("customfield_10125"),
                        "customfield_10141": fields.get("customfield_10141"),
                        "customfield_10142": fields.get("customfield_10142"),
                        "customfield_10143": fields.get("customfield_10143"),
                        "labels": fields.get("labels", []),
                        "components": fields.get("components", []),
                        "last_real_change": last_change,
                        "watcher_count": watcher_count,
                        "is_watching": is_watching,
                        "comment_count": len(comments)
                    }
                logger.info(f"✓ Batch enriched {len(enriched_data)} issues from JIRA API")
                
                # Debug: Log first enriched data
                if enriched_data:
                    first_key = list(enriched_data.keys())[0]
                    logger.info(f"🔍 First enriched data ({first_key}): {enriched_data[first_key]}")
        except Exception as e:
            logger.warning(f"Could not batch enrich from JIRA API: {e}")
        
        # STEP 3: Format issues with enriched data
        formatted_issues = []
        for issue in issues:
            issue_key = issue.get("key", "")
            fields = issue.get("fields", {})
            
            # Get basic data from Service Desk API
            assignee_obj = _get_field_value(
                fields, 
                "assignee",
                "asignado_a",
                "currentuser"
            )
            assignee_name = "Unassigned"
            assignee_id = None
            if assignee_obj and isinstance(assignee_obj, dict):
                assignee_name = assignee_obj.get("displayName") or assignee_obj.get("name") or "Unassigned"
                assignee_id = assignee_obj.get("accountId")
            
            status_obj = _get_field_value(fields, "status", "estado")
            status_name = "Unknown"
            if status_obj and isinstance(status_obj, dict):
                status_name = status_obj.get("name", "Unknown")
            elif isinstance(status_obj, str):
                status_name = status_obj
            
            # Extract custom fields from Service Desk API
            service_desk_custom_fields = _extract_service_desk_custom_fields(fields)
            
            # ✅ Normalize severity with centralized function
            severity_obj = _get_field_value(fields, "severity", "severidad")
            severity_name = _normalize_severity_value(severity_obj, service_desk_custom_fields, issue_key)
            
            # Additional debug for severity
            if not severity_name:
                logger.warning(f"⚠️ {issue_key} - No severity found in: severity_obj={severity_obj}, custom_fields={list(service_desk_custom_fields.keys())}")
            
            # Reporter info (will be extracted from customfields)
            
            summary = _get_field_value(
                fields, 
                "summary",
                "resumen"
            ) or "No summary"
            
            description = _get_field_value(
                fields,
                "description",
                "descripcion"
            ) or ""
            
            issue_type_obj = _get_field_value(fields, "issuetype", "tipo_de_asunto")
            issue_type_name = "Task"
            if issue_type_obj and isinstance(issue_type_obj, dict):
                issue_type_name = issue_type_obj.get("name", "Task")
            elif isinstance(issue_type_obj, str):
                issue_type_name = issue_type_obj
            
            created = _get_field_value(fields, "created", "creado") or ""
            updated = _get_field_value(fields, "updated", "actualizado") or created or ""
            resolved = _get_field_value(fields, "resolutionDate", "fecha_de_resolucion") or ""
            
            formatted = {
                "key": issue_key,
                "summary": summary,
                "status": status_name,
                "severity": severity_name,
                "assignee": assignee_name,
                "assignee_id": assignee_id,
                "created": created,
                "updated": updated,
                "resolved": resolved,
                "description": description,
                "issue_type": issue_type_name,
                "labels": [],
                "components": [],
                "fields": fields
            }
            
            # Add all customfields directly (from Service Desk API)
            for cf_key, cf_value in service_desk_custom_fields.items():
                formatted[cf_key] = cf_value
            
            # Add enriched customfields from JIRA API batch
            if issue_key in enriched_data:
                jira_enriched = enriched_data[issue_key]
                for cf_key, cf_value in jira_enriched.items():
                    if cf_value is not None:
                        # Special handling for assignee: overwrite Service Desk value
                        if cf_key == "assignee":
                            formatted["assignee"] = cf_value
                        else:
                            formatted[cf_key] = cf_value
                
                # Debug: Log enriched data for first issue
                if not formatted_issues:
                    logger.info(f"✓ Enriched {issue_key} with: {list(jira_enriched.keys())}")
                    logger.info(f"   customfield_10111: {jira_enriched.get('customfield_10111')}")
                    logger.info(f"   customfield_10125: {jira_enriched.get('customfield_10125')}")
                    logger.info(f"   customfield_10141: {jira_enriched.get('customfield_10141')}")
                    logger.info(f"   customfield_10142: {jira_enriched.get('customfield_10142')}")
                    logger.info(f"   customfield_10143: {jira_enriched.get('customfield_10143')}")
            
            formatted_issues.append(formatted)
        
        # Debug: Log structure of first formatted issue
        if len(formatted_issues) == 1:
            logger.info(f"🔍 First formatted issue structure:")
            logger.info(f"   Root keys: {list(formatted.keys())}")
            logger.info(f"   customfield_10111: {formatted.get('customfield_10111')}")
            logger.info(f"   customfield_10125: {formatted.get('customfield_10125')}")
            logger.info(f"   customfield_10141: {formatted.get('customfield_10141')}")
            logger.info(f"   customfield_10142: {formatted.get('customfield_10142')}")
            logger.info(f"   customfield_10143: {formatted.get('customfield_10143')}")
        
        # Convert to DataFrame
        df = pd.DataFrame(formatted_issues)
        logger.info(
            f"✓ Loaded {len(df)} issues from queue {queue_id} (desk {service_desk_id}) in {time.time() - t0:.2f}s; "
            f"requests={request_count}, approx_bytes={bytes_accumulated}"
        )
        
        # Auto-create notifications for recent changes (async, non-blocking)
        try:
            from api.blueprints.notifications_helper import process_issues_batch_for_notifications
            process_issues_batch_for_notifications(issues, enriched_data)
        except Exception as notif_err:
            logger.debug(f"Notification creation skipped: {notif_err}")
        
        return df, None
        
    except Exception as e:
        logger.error(f"Error loading queue issues: {e}")
        return None, str(e)


def fetch_and_log_states(service_desk_id: str, queue_id: int) -> None:
    """
    Fetch and log state information from the JIRA API for debugging
    
    Args:
        service_desk_id: ID of the service desk  
        queue_id: ID of the queue
    """
    try:
        # Get issues from queue
        df, error = load_queue_issues(service_desk_id, queue_id)
        if error:
            logger.warning(f"Error loading issues: {error}")
            return
            
        if df is None or df.empty:
            logger.warning("No issues found to analyze states")
            return
            
        # Count issues per state
        states = df["status"].value_counts().to_dict()
        logger.info(f"Workflow states for queue {queue_id}: {states}")
        
    except Exception as e:
        logger.error(f"Error fetching or logging states: {e}")


def organize_issues_by_state(service_desk_id: str, queue_id: int) -> Dict[str, List[Dict[str, Any]]]:
    """
    Organize issues by their workflow states
    
    Args:
        service_desk_id: ID of the service desk
        queue_id: ID of the queue
        
    Returns:
        Dictionary mapping states to lists of issues
    """
    try:
        # Get issues from queue
        df, error = load_queue_issues(service_desk_id, queue_id)
        if error:
            logger.warning(f"Error loading issues: {error}")
            return {}
            
        if df is None or df.empty:
            logger.warning("No issues found to organize")
            return {}

        # Group issues by state
        grouped = df.groupby("status").apply(
            lambda x: x.to_dict("records")
        ).to_dict()
        
        logger.info(f"Organized {len(df)} issues into {len(grouped)} states")
        return grouped
        
    except Exception as e:
        logger.error(f"Error organizing issues by state: {e}")
        return {}


def fetch_and_fill_dataframe(
    service_desk_id: str,
    queue_id: int,
    status_filter: Optional[List[str]] = None,
    updated_after: Optional[datetime] = None
) -> Optional[pd.DataFrame]:
    """
    Fetch issues from JIRA and create a DataFrame
    
    Args:
        service_desk_id: ID of the service desk
        queue_id: ID of the queue
        status_filter: Optional list of status names to filter by
        updated_after: Only include issues updated after this time
        
    Returns:
        DataFrame of issues or None if error
    """
    try:
        # Get basic issue data
        df, error = load_queue_issues(service_desk_id, queue_id)
        if error or df is None:
            return None
            
        # Apply filters if needed
        if status_filter:
            df = df[df["status"].isin(status_filter)]
            
        if updated_after:
            df["updated"] = pd.to_datetime(df["updated"])
            df = df[df["updated"] >= updated_after]
            
        if df.empty:
            logger.warning("No issues match filters")
            return None
            
        logger.info(f"Created DataFrame with {len(df)} filtered issues")
        return df
        
    except Exception as e:
        logger.error(f"Error creating DataFrame: {e}")
        return None


def add_issue_metrics(df: pd.DataFrame, issues: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Add workflow state and additional metrics columns to the DataFrame.
    
    New columns added:
    - workflow_state: Current status of the issue
    - time_in_status: Hours in current status
    - resolution_time: Hours from created to resolved (if resolved)
    - sla_status: SLA status if available
    - priority_level: Numeric priority level (1-5)
    """
    try:
        if df is None or df.empty or not issues:
            return df
            
        # Prepare metrics
        metrics = []
        now = datetime.now()
        
        for issue in issues:
            fields = issue.get("fields", {})
            
            # Get status and timing info
            status = fields.get("status", {}).get("name", "Unknown")
            status_timestamp = fields.get("status", {}).get("statusDate")
            created = fields.get("created")
            resolved = fields.get("resolutionDate")  # Fixed: capital D
            
            # Calculate time metrics
            try:
                status_time = 0.0
                resolution_time = 0.0
                
                if status_timestamp:
                    status_dt = datetime.strptime(status_timestamp, "%Y-%m-%dT%H:%M:%S.%f%z")
                    status_time = (now - status_dt.replace(tzinfo=None)).total_seconds() / 3600
                    
                if created and resolved:
                    created_dt = datetime.strptime(created, "%Y-%m-%dT%H:%M:%S.%f%z")
                    resolved_dt = datetime.strptime(resolved, "%Y-%m-%dT%H:%M:%S.%f%z")
                    resolution_time = (resolved_dt - created_dt).total_seconds() / 3600
            except (ValueError, TypeError):
                logger.warning(f"Invalid date format for issue {issue.get('key')}")
                status_time = 0.0
                resolution_time = 0.0
            
            # Get SLA info
            sla_data = fields.get("customfield_10054", {})  # Assuming standard SLA field
            sla_status = (
                sla_data.get("breached", False) and "Breached" or
                sla_data.get("paused", False) and "Paused" or
                sla_data.get("onTrack", False) and "On Track" or
                "Unknown"
            )
            
            # Map priority to numeric level
            priority_map = {
                "Highest": 1,
                "High": 2,
                "Medium": 3,
                "Low": 4,
                "Lowest": 5
            }
            priority = fields.get("priority", {}).get("name", "Medium")
            priority_level = priority_map.get(priority, 3)
            
            metrics.append({
                "workflow_state": status,
                "time_in_status": round(status_time, 2),
                "resolution_time": round(resolution_time, 2),
                "sla_status": sla_status,
                "priority_level": priority_level
            })
            
        # Convert metrics to DataFrame and merge with original
        metrics_df = pd.DataFrame(metrics)
        df = pd.concat([df, metrics_df], axis=1)
        
        logger.info("Added issue metrics columns to DataFrame.")
        return df

    except Exception as e:
        logger.error(f"Error adding issue metrics: {e}")
        return df


from utils.retry import with_retry
from datetime import datetime, timedelta

@with_retry(max_retries=3, delay=2.0)
def fetch_issues(
    service_desk_id: str,
    queue_id: int,
    status_filter: Optional[List[str]] = None,
    updated_after: Optional[datetime] = None,
    max_results: int = 100
) -> Optional[List[Dict[str, Any]]]:
    """
    Fetch issues from JIRA service desk queue with filtering using BOTH APIs
    
    Service Desk API: Get queue issues with filtering
    JIRA REST API: Get enriched data (labels, custom fields, transitions)
    
    Args:
        service_desk_id: ID of the service desk
        queue_id: ID of the queue
        status_filter: Optional list of status names to filter by
        updated_after: Only fetch issues updated after this time
        max_results: Maximum number of results to return
        
    Returns:
        List of issue dictionaries or None if error
    """
    try:
        client = get_api_client()
        url = f"{client.site}/rest/servicedeskapi/servicedesk/{service_desk_id}/queue/{queue_id}/issue"
        
        # Initial JQL filters
        jql_parts = []
        if status_filter:
            statuses = ", ".join(f"'{s}'" for s in status_filter)
            jql_parts.append(f"status IN ({statuses})")
            
        if updated_after:
            updated_str = updated_after.strftime("%Y-%m-%d")
            jql_parts.append(f"updated >= {updated_str}")
            
        jql = " AND ".join(jql_parts)
        
        issues = []
        params = {
            "limit": min(50, max_results),  # API page size
            "jql": jql if jql else None
        }
        
        # STEP 1: Fetch from Service Desk API
        while len(issues) < max_results:
            params["start"] = len(issues)
            response = _make_request("GET", url, client.headers, params=params)
            
            if not response:
                break
                
            page_issues = response.get("values", [])
            if not page_issues:
                break
                
            issues.extend(page_issues)
            
            if response.get("isLastPage", True):
                break
        
        if not issues:
            logger.warning(f"No issues found in queue {queue_id}")
            return None
        
        # STEP 2: Enrich with JIRA REST API
        enriched_issues = []
        for issue in issues[:max_results]:
            issue_key = issue.get("key", "")
            
            # Get base data
            enriched = {
                **issue,
                "labels": [],
                "components": [],
                "custom_fields": {},
                "available_transitions": []
            }
            
            # Make secondary request to JIRA REST API for enriched data
            if issue_key:
                try:
                    # Specify essential fields including custom fields for better data quality
                    fields_params = "assignee,summary,status,priority,reporter,created,updated,issuetype,labels,components,customfield_*"
                    url_jira = f"{client.site}/rest/api/2/issue/{issue_key}?fields={fields_params}"
                    jira_data = _make_request("GET", url_jira, client.headers)
                    
                    if jira_data:
                        jira_fields = jira_data.get("fields", {})
                        
                        # Update assignee with more complete data from JIRA API
                        jira_assignee = jira_fields.get("assignee")
                        if jira_assignee and isinstance(jira_assignee, dict):
                            enriched["assignee"] = jira_assignee.get("displayName") or jira_assignee.get("name", "Unassigned")
                            enriched["assignee_id"] = jira_assignee.get("accountId")
                        
                        # Update priority with more complete data from JIRA API
                        jira_priority = jira_fields.get("priority")
                        if jira_priority and isinstance(jira_priority, dict):
                            priority_value = jira_priority.get("name", "Normal")
                            logger.info(f"🔍 {issue_key} - JIRA API Priority OVERRIDE (enriched): {enriched.get('priority', 'None')} → {priority_value}")
                            enriched["priority"] = priority_value
                        else:
                            logger.warning(f"⚠️ {issue_key} - JIRA API (enriched): No priority field found. Current: {enriched.get('priority', 'None')}")
                            
                        # Debug final priority value
                        logger.info(f"📌 {issue_key} - FINAL PRIORITY (enriched): {enriched.get('priority', 'None')}")
                        
                        # Update status with more complete data from JIRA API
                        jira_status = jira_fields.get("status")
                        if jira_status and isinstance(jira_status, dict):
                            enriched["status"] = jira_status.get("name", "Unknown")
                        
                        # Get labels
                        labels = jira_fields.get("labels", [])
                        if isinstance(labels, list):
                            enriched["labels"] = labels
                        
                        # Get components
                        components = jira_fields.get("components", [])
                        if isinstance(components, list):
                            enriched["components"] = [c.get("name", "") for c in components if isinstance(c, dict)]
                        
                        # Get custom fields
                        custom_field_keys = [k for k in jira_fields.keys() if k.startswith("customfield_")]
                        for custom_key in custom_field_keys:
                            custom_value = jira_fields.get(custom_key)
                            if custom_value is not None:
                                enriched["custom_fields"][custom_key] = custom_value
                        
                        # Get available transitions
                        transitions_url = f"{client.site}/rest/api/2/issue/{issue_key}/transitions"
                        transitions_data = _make_request("GET", transitions_url, client.headers)
                        if transitions_data:
                            transitions = transitions_data.get("transitions", [])
                            enriched["available_transitions"] = [
                                {
                                    "id": t.get("id"),
                                    "name": t.get("name"),
                                    "to": t.get("to", {}).get("name")
                                }
                                for t in transitions if isinstance(t, dict)
                            ]
                        
                        logger.info(f"✓ Enriched {issue_key} from JIRA REST API with labels, components, custom fields, transitions")
                except Exception as e:
                    logger.debug(f"Could not enrich {issue_key} from JIRA: {e}")
            
            enriched_issues.append(enriched)
            
        logger.info(f"Fetched {len(enriched_issues)} issues from queue {queue_id} (Service Desk + JIRA REST API)")
        return enriched_issues
        
    except Exception as e:
        logger.error(f"Error fetching issues: {e}")
        return None


def analyze_workflow_metrics(
    service_desk_id: str,
    queue_id: int,
    time_window: Optional[timedelta] = None,
    max_results: int = 1000
) -> Dict[str, Any]:
    """
    Analyze workflow metrics for a queue including:
    - Average resolution time by priority
    - SLA compliance rate
    - State transition times
    - Bottleneck identification
    - Workload distribution
    
    Args:
        service_desk_id: ID of the service desk
        queue_id: ID of the queue  
        time_window: Optional time window to analyze (e.g., last 30 days)
        max_results: Maximum number of issues to analyze
        
    Returns:
        Dictionary containing various workflow metrics
    """
    try:
        # Calculate the date threshold if time window specified
        updated_after = datetime.now() - time_window if time_window else None
        
        # Get a DataFrame of issues
        df = fetch_and_fill_dataframe(
            service_desk_id,
            queue_id,
            updated_after=updated_after
        )
        
        if df is None or df.empty:
            return {}
            
        metrics = {
            "total_issues": len(df),
            "resolution_times": {},
            "sla_compliance": {
                "compliant": 0,
                "breached": 0,
                "total": 0,
                "compliance_rate": 0.0
            },
            "state_distribution": {},
            "priority_distribution": {},
            "assignee_workload": {}
        }
        
        # State distribution
        metrics["state_distribution"] = df["status"].value_counts().to_dict()
        
        # Priority distribution
        metrics["priority_distribution"] = df["priority"].value_counts().to_dict()
        
        # Resolution times by priority
        df["created"] = pd.to_datetime(df["created"])
        df["resolved"] = pd.to_datetime(df["resolved"])
        resolved_mask = df["resolved"].notna()
        
        if resolved_mask.any():
            resolution_hours = (
                (df.loc[resolved_mask, "resolved"] - df.loc[resolved_mask, "created"])
                .dt.total_seconds() / 3600
            )
            
            for priority in df.loc[resolved_mask, "priority"].unique():
                priority_mask = df["priority"] == priority
                times = resolution_hours[priority_mask]
                
                if not times.empty:
                    metrics["resolution_times"][priority] = {
                        "avg": times.mean(),
                        "min": times.min(),
                        "max": times.max()
                    }
                    
        # SLA compliance
        sla_data = df["customfield_10054"].dropna()
        if not sla_data.empty:
            metrics["sla_compliance"]["total"] = len(sla_data)
            metrics["sla_compliance"]["breached"] = sum(1 for x in sla_data if x.get("breached", False))
            metrics["sla_compliance"]["compliant"] = (
                metrics["sla_compliance"]["total"] - metrics["sla_compliance"]["breached"]
            )
            if metrics["sla_compliance"]["total"] > 0:
                metrics["sla_compliance"]["compliance_rate"] = (
                    metrics["sla_compliance"]["compliant"] / 
                    metrics["sla_compliance"]["total"] * 100
                )
                
        # Assignee workload  
        metrics["assignee_workload"] = df["assignee"].value_counts().to_dict()
        
        logger.info(f"Analyzed workflow metrics for {len(df)} issues")
        return metrics
        
    except Exception as e:
        logger.error(f"Error analyzing workflow metrics: {e}")
        return {}


# This function has been removed as it duplicates organize_issues_by_state
# Use organize_issues_by_state instead


# ===== DASHBOARD FUNCTIONS =====

@st.cache_data(ttl=600, show_spinner=False)
def get_dashboard_summary() -> Dict[str, Any]:
    """
    Get comprehensive dashboard summary across all service desks and queues.
    
    Returns:
        Dictionary with:
        - total_issues: Total count across all accessible queues
        - by_status: Issues grouped by status
        - by_assignee: Issues grouped by assignee
        - by_desk: Issues grouped by service desk
        - unassigned_count: Count of unassigned issues
        - reporter_issues_count: Count of your reported issues
        - critical_issues: Count of critical/high-priority issues
    """
    try:
        client = get_api_client()
        current_user = get_current_user()
        
        summary = {
            "total_issues": 0,
            "by_status": {},
            "by_assignee": {},
            "by_desk": {},
            "unassigned_count": 0,
            "reporter_issues_count": 0,
            "critical_issues": 0,
            "errors": []
        }
        
        try:
            # Get all service desks
            desks_url = f"{client.site}/rest/servicedeskapi/servicedesk"
            desks_response = _make_request("GET", desks_url, client.headers)
            
            if not desks_response or "values" not in desks_response:
                summary["errors"].append("Could not fetch service desks")
                return summary
            
            desks = desks_response.get("values", [])
            
            # Iterate through each desk and collect stats
            for desk in desks:
                desk_id = desk.get("id")
                desk_key = desk.get("projectKey", "Unknown")
                
                if not desk_id:
                    continue
                
                summary["by_desk"][desk_key] = {"total": 0, "unassigned": 0}
                
                # Get queues for this desk
                try:
                    queues_url = f"{client.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue"
                    queues_response = _make_request("GET", queues_url, client.headers)
                    
                    if not queues_response or "values" not in queues_response:
                        continue
                    
                    queues = queues_response.get("values", [])
                    
                    # Find "All open" or similar queue
                    all_open_queue = None
                    for queue in queues:
                        queue_name = queue.get("name", "").lower()
                        if "all open" in queue_name or "todos" in queue_name:
                            all_open_queue = queue
                            break
                    
                    if not all_open_queue and queues:
                        all_open_queue = queues[0]
                    
                    if not all_open_queue:
                        continue
                    
                    queue_id = all_open_queue.get("id")
                    
                    # Get issues from queue
                    issues_url = f"{client.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue/{queue_id}/issue"
                    issues_response = _make_request("GET", issues_url, client.headers, params={
                        "start": 0,
                        "limit": 100
                    })
                    
                    if not issues_response or "values" not in issues_response:
                        continue
                    
                    queue_issues = issues_response.get("values", [])
                    
                    # Process each issue for dashboard stats
                    for issue in queue_issues:
                        summary["total_issues"] += 1
                        summary["by_desk"][desk_key]["total"] += 1
                        
                        fields = issue.get("fields", {})
                        issue_key = issue.get("key")
                        
                        # Count by status
                        status = fields.get("status", {})
                        status_name = status.get("name", "Unknown") if isinstance(status, dict) else str(status)
                        summary["by_status"][status_name] = summary["by_status"].get(status_name, 0) + 1
                        
                        # Count unassigned
                        assignee = fields.get("assignee")
                        if not assignee:
                            summary["unassigned_count"] += 1
                            summary["by_desk"][desk_key]["unassigned"] += 1
                        else:
                            assignee_name = assignee.get("displayName") or assignee.get("name", "Unknown")
                            summary["by_assignee"][assignee_name] = summary["by_assignee"].get(assignee_name, 0) + 1
                        
                        # Count critical issues
                        # Check criticality field (customfield_10001 or similar)
                        criticality = None
                        for field_key, field_value in fields.items():
                            if field_key.startswith("customfield") and field_value:
                                if isinstance(field_value, dict) and "value" in field_value:
                                    val = str(field_value.get("value", "")).lower()
                                    if any(x in val for x in ["critico", "critical", "alto", "high"]):
                                        criticality = field_value.get("value")
                                        break
                                elif isinstance(field_value, str):
                                    if any(x in field_value.lower() for x in ["critico", "critical", "alto", "high"]):
                                        criticality = field_value
                                        break
                        
                        if criticality:
                            summary["critical_issues"] += 1
                        
                        # Count reporter issues
                        if current_user:
                            reporter = fields.get("reporter", {})
                            reporter_name = None
                            if isinstance(reporter, dict):
                                reporter_name = reporter.get("displayName") or reporter.get("name")
                            elif isinstance(reporter, str):
                                reporter_name = reporter
                            
                            if reporter_name and reporter_name.lower() == current_user.name.lower():
                                summary["reporter_issues_count"] += 1
                
                except Exception as e:
                    logger.debug(f"Error processing desk {desk_key}: {e}")
                    continue
        
        except Exception as e:
            logger.error(f"Error building dashboard summary: {e}")
            summary["errors"].append(str(e))
        
        logger.info(f"Dashboard summary: {summary['total_issues']} total issues, {summary['unassigned_count']} unassigned")
        return summary
        
    except Exception as e:
        logger.error(f"Error in get_dashboard_summary: {e}")
        return {
            "total_issues": 0,
            "by_status": {},
            "by_assignee": {},
            "by_desk": {},
            "unassigned_count": 0,
            "reporter_issues_count": 0,
            "critical_issues": 0,
            "errors": [str(e)]
        }
