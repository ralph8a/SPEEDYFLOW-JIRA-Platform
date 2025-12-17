# -*- coding: utf-8 -*-
"""
Core Business Logic Functions
Normalization, filtering, searching, and data transformation
Note: Generic data helpers are in core.helpers module
This module focuses on domain-specific business logic
"""
import pandas as pd
import re
import logging
from typing import Optional, List, Dict, Tuple, Any
from . import Issue, Filter
from .helpers import (
    filter_by_column,
    get_unique_values,
    get_distribution,
    apply_column_filters,
    find_column
)
logger = logging.getLogger(__name__)
# ============================================================================
# SEARCHING
# ============================================================================
SEARCH_COLUMNS = ["key", "resumen", "summary", "descripcion", "description", "asignado_a", "assignee"]
def search_issues(df: pd.DataFrame, search_term: str) -> pd.DataFrame:
    """Search across multiple columns"""
    if df is None or df.empty or not search_term or not search_term.strip():
        return df
    search_lower = search_term.lower()
    mask = pd.Series([False] * len(df), index=df.index)
    for col in SEARCH_COLUMNS:
        if col in df.columns:
            mask |= df[col].fillna("").str.lower().str.contains(search_lower, na=False)
    return df[mask]
# ============================================================================
# FILTERING
# ============================================================================
def filter_by_assignee(df: pd.DataFrame, assignee: str) -> pd.DataFrame:
    """Filter issues by assignee (delegates to helpers.filter_by_column)"""
    return filter_by_column(df, assignee, ("asignado_a", "assignee", "assigned_to"))
def filter_by_status(df: pd.DataFrame, status: str) -> pd.DataFrame:
    """Filter issues by status (delegates to helpers.filter_by_column)"""
    return filter_by_column(df, status, ("estado", "status"))
def filter_by_priority(df: pd.DataFrame, priority: str) -> pd.DataFrame:
    """Filter issues by priority (delegates to helpers.filter_by_column)"""
    return filter_by_column(df, priority, ("prioridad", "priority"), skip_values=("Todas",))
def apply_filters(df: pd.DataFrame, filters: Filter) -> pd.DataFrame:
    """Apply all filters to DataFrame"""
    if df is None or df.empty:
        return df
    if filters.search_term:
        df = search_issues(df, filters.search_term)
    if filters.status:
        df = filter_by_status(df, filters.status)
    if filters.assignee:
        df = filter_by_assignee(df, filters.assignee)
    if filters.priority:
        df = filter_by_priority(df, filters.priority)
    return df
# ============================================================================
# DATA EXTRACTION
# ============================================================================
def get_assignees_from_issues(df: pd.DataFrame) -> List[str]:
    """Get list of unique assignees from issues (delegates to helpers)"""
    return get_unique_values(df, ("asignado_a", "assignee"))
def get_statuses_from_issues(df: pd.DataFrame) -> List[str]:
    """Get list of unique statuses from issues (delegates to helpers)"""
    return get_unique_values(df, ("estado", "status"))
def get_priorities_from_issues(df: pd.DataFrame) -> List[str]:
    """Get list of unique priorities from issues (delegates to helpers)"""
    return get_unique_values(df, ("prioridad", "priority"))
# ============================================================================
# STATISTICS
# ============================================================================
def get_status_distribution(df: pd.DataFrame) -> Dict[str, int]:
    """Get count of issues per status (delegates to helpers)"""
    return get_distribution(df, ("estado", "status"))
def get_assignee_distribution(df: pd.DataFrame) -> Dict[str, int]:
    """Get count of issues per assignee (delegates to helpers)"""
    return get_distribution(df, ("asignado_a", "assignee"))
def get_priority_distribution(df: pd.DataFrame) -> Dict[str, int]:
    """Get count of issues per priority (delegates to helpers)"""
    return get_distribution(df, ("prioridad", "priority"))
def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize and clean the DataFrame for consistent processing.
    Args:
        df: Input DataFrame to normalize.
    Returns:
        Normalized DataFrame.
    """
    if df is None or df.empty:
        return pd.DataFrame()
    # Standardize column names to lowercase
    df.columns = [col.lower() for col in df.columns]
    # Fill missing values with empty strings for string columns
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].fillna("")
    # Ensure numeric columns have no NaN values
    for col in df.select_dtypes(include=['number']).columns:
        df[col] = df[col].fillna(0)
    # Strip whitespace from string columns
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].str.strip()
    return df
