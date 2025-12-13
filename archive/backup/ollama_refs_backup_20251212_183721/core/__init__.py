# -*- coding: utf-8 -*-
"""
Data Objects & Schemas - Centralized data structures
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime


@dataclass
class User:
    """User object"""
    name: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    
    def __str__(self):
        return self.name or "Unknown"


@dataclass
class Project:
    """Project object"""
    key: str
    name: str
    url: Optional[str] = None
    avatar_url: Optional[str] = None
    
    def __str__(self):
        return self.name


@dataclass
class Issue:
    """Issue/Task object"""
    key: str
    summary: str
    description: Optional[str] = None
    status: str = "Por hacer"
    priority: str = "Medium"
    assignee: Optional[str] = None
    reporter: Optional[str] = None
    created: Optional[datetime] = None
    updated: Optional[datetime] = None
    url: Optional[str] = None
    labels: List[str] = field(default_factory=list)
    custom_fields: Dict[str, Any] = field(default_factory=dict)
    
    def __str__(self):
        return f"{self.key}: {self.summary}"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "key": self.key,
            "summary": self.summary,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "assignee": self.assignee,
            "reporter": self.reporter,
            "created": self.created,
            "updated": self.updated,
            "url": self.url,
            "labels": self.labels,
            "custom_fields": self.custom_fields,
        }


@dataclass
class Filter:
    """Filter criteria for issues"""
    search_term: Optional[str] = None
    status: Optional[str] = None
    assignee: Optional[str] = None
    priority: Optional[str] = None
    labels: List[str] = field(default_factory=list)
    
    def is_active(self) -> bool:
        return any([
            self.search_term,
            self.status,
            self.assignee,
            self.priority,
            self.labels,
        ])
    
    def __str__(self):
        filters = []
        if self.search_term:
            filters.append(f"search: {self.search_term}")
        if self.status:
            filters.append(f"status: {self.status}")
        if self.assignee:
            filters.append(f"assignee: {self.assignee}")
        if self.priority:
            filters.append(f"priority: {self.priority}")
        return " | ".join(filters) if filters else "No filters"


@dataclass
class BoardColumn:
    """Kanban board column"""
    name: str
    status: str
    issues: List[Issue] = field(default_factory=list)
    color: Optional[str] = None
    
    def add_issue(self, issue: Issue):
        self.issues.append(issue)
    
    def remove_issue(self, key: str):
        self.issues = [i for i in self.issues if i.key != key]
    
    def count(self) -> int:
        return len(self.issues)
    
    def __str__(self):
        return f"{self.name} ({self.count()} issues)"


@dataclass
class Board:
    """Kanban board"""
    project: Project
    columns: List[BoardColumn] = field(default_factory=list)
    
    def get_column(self, status: str) -> Optional[BoardColumn]:
        return next((col for col in self.columns if col.status == status), None)
    
    def total_issues(self) -> int:
        return sum(col.count() for col in self.columns)
    
    def __str__(self):
        return f"Board: {self.project} ({self.total_issues()} issues)"


@dataclass
class UIState:
    """Application UI state"""
    sidebar_collapsed: bool = False
    selected_issue: Optional[str] = None
    show_filters: bool = False
    search_term: str = ""
    filter_assignee: str = "Todos"
    current_user: Optional[User] = None
    current_project: Optional[Project] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "sidebar_collapsed": self.sidebar_collapsed,
            "selected_issue": self.selected_issue,
            "show_filters": self.show_filters,
            "search_term": self.search_term,
            "filter_assignee": self.filter_assignee,
            "current_user": self.current_user,
            "current_project": self.current_project,
        }


@dataclass
class APIConfig:
    """API configuration"""
    site: str
    email: str
    api_token: str
    
    def __str__(self):
        return f"APIConfig({self.site})"
