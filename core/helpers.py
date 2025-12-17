# -*- coding: utf-8 -*-
"""
Core Helper Functions Module
Generic, reusable functions for data extraction, filtering, and analysis
Follows DRY (Don't Repeat Yourself) principles
"""
import pandas as pd
import logging
from typing import Optional, List, Dict, Tuple, Any
logger = logging.getLogger(__name__)
# ============================================================================
# GENERIC DATA EXTRACTION
# ============================================================================
def get_unique_values(
    df: pd.DataFrame,
    col_names: Tuple[str, ...],
    sort: bool = True,
    include_empty: bool = False
) -> List[str]:
    """
    Extract unique values from dataframe column (first found).
    Generic helper for extracting unique values from flexible column names.
    Args:
        df: DataFrame to extract from
        col_names: Tuple of possible column names (tries in order)
        sort: Whether to sort the results
        include_empty: Whether to include empty/null values
    Returns:
        Sorted list of unique string values
    Example:
        >>> assignees = get_unique_values(df, ("asignado_a", "assignee"))
        >>> statuses = get_unique_values(df, ("estado", "status"))
    """
    if df is None or df.empty:
        return []
    # Find first existing column
    col = next((c for c in col_names if c in df.columns), None)
    if not col:
        logger.debug(f"No column found from {col_names}")
        return []
    # Extract values
    values = df[col].dropna().unique().tolist() if not include_empty else df[col].unique().tolist()
    # Filter empty strings if needed
    if not include_empty:
        values = [v for v in values if v]
    # Convert to strings
    str_values = [str(v) for v in values]
    # Sort if requested
    return sorted(str_values) if sort else str_values
# ============================================================================
# GENERIC FILTERING
# ============================================================================
def filter_by_column(
    df: pd.DataFrame,
    value: str,
    col_names: Tuple[str, ...],
    skip_values: Tuple[str, ...] = ("Todos", "Todas", ""),
    case_sensitive: bool = False
) -> pd.DataFrame:
    """
    Filter DataFrame by value in a column (first found).
    Generic helper for filtering with flexible column names and error handling.
    Args:
        df: DataFrame to filter
        value: Value to filter by
        col_names: Tuple of possible column names (tries in order)
        skip_values: Values that mean "no filter" (return unfiltered)
        case_sensitive: Whether to match case-sensitively
    Returns:
        Filtered DataFrame (or original if no match)
    Example:
        >>> active_issues = filter_by_column(df, "Active", ("status", "estado"))
        >>> john_issues = filter_by_column(df, "John", ("assignee", "asignado_a"))
    """
    if df is None or df.empty or not value or value in skip_values:
        return df
    col = next((c for c in col_names if c in df.columns), None)
    if not col:
        logger.warning(f"No column found from {col_names} for filtering by {value}")
        return df
    try:
        if case_sensitive:
            return df[df[col].fillna("").astype(str) == str(value)]
        else:
            return df[df[col].fillna("").astype(str).str.lower() == str(value).lower()]
    except (AttributeError, KeyError, TypeError) as e:
        logger.warning(f"Error filtering by {col}: {e}")
        return df
# ============================================================================
# GENERIC DISTRIBUTION
# ============================================================================
def get_distribution(
    df: pd.DataFrame,
    col_names: Tuple[str, ...],
    sort_by: str = "count"
) -> Dict[str, int]:
    """
    Get count distribution for a column (first found).
    Generic helper for counting values in flexible column names.
    Args:
        df: DataFrame to analyze
        col_names: Tuple of possible column names (tries in order)
        sort_by: How to sort results ("count" for descending, "name" for alphabetical)
    Returns:
        Dictionary with value counts
    Example:
        >>> status_dist = get_distribution(df, ("status", "estado"))
        >>> assignee_dist = get_distribution(df, ("assignee", "asignado_a"))
    """
    if df is None or df.empty:
        return {}
    col = next((c for c in col_names if c in df.columns), None)
    if not col:
        logger.debug(f"No column found from {col_names}")
        return {}
    try:
        distribution = df[col].value_counts().to_dict()
        # Sort based on preference
        if sort_by == "name":
            return dict(sorted(distribution.items()))
        else:  # "count" - default
            return dict(sorted(distribution.items(), key=lambda x: x[1], reverse=True))
    except Exception as e:
        logger.warning(f"Error getting distribution for {col}: {e}")
        return {}
# ============================================================================
# GENERIC MULTI-FILTER
# ============================================================================
def apply_column_filters(
    df: pd.DataFrame,
    filters: Dict[str, Tuple[str, Tuple[str, ...]]]
) -> pd.DataFrame:
    """
    Apply multiple filters to DataFrame in sequence.
    Generic helper for chaining multiple column filters.
    Args:
        df: DataFrame to filter
        filters: Dict where:
            - key: filter name (for logging)
            - value: (filter_value, col_names_tuple)
    Returns:
        Filtered DataFrame
    Example:
        >>> filters = {
        ...     "status": ("Active", ("status", "estado")),
        ...     "assignee": ("John", ("assignee", "asignado_a"))
        ... }
        >>> result = apply_column_filters(df, filters)
    """
    if df is None or df.empty:
        return df
    for filter_name, (value, col_names) in filters.items():
        if value:
            df = filter_by_column(df, value, col_names)
            if df.empty:
                logger.info(f"No data after applying filter: {filter_name}")
                break
    return df
# ============================================================================
# COLUMN DETECTION
# ============================================================================
def find_column(
    df: pd.DataFrame,
    *col_names: str
) -> Optional[str]:
    """
    Find first existing column by name (case-insensitive search).
    Helper for locating columns with flexible naming.
    Args:
        df: DataFrame to search
        *col_names: Variable number of column names to try
    Returns:
        First matching column name, or None if not found
    Example:
        >>> col = find_column(df, "asignado_a", "assignee", "assigned_to")
        >>> if col:
        ...     print(f"Found column: {col}")
    """
    if df is None or df.empty:
        return None
    # Try exact match first
    for col_name in col_names:
        if col_name in df.columns:
            return col_name
    # Try case-insensitive match
    df_cols_lower = {col.lower(): col for col in df.columns}
    for col_name in col_names:
        if col_name.lower() in df_cols_lower:
            return df_cols_lower[col_name.lower()]
    return None
# ============================================================================
# VALIDATION HELPERS
# ============================================================================
def is_valid_dataframe(df: Any) -> bool:
    """
    Check if object is a valid, non-empty DataFrame.
    Args:
        df: Object to validate
    Returns:
        True if df is a valid DataFrame with data
    """
    try:
        return isinstance(df, pd.DataFrame) and not df.empty
    except (AttributeError, TypeError):
        return False
def get_dataframe_info(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Get useful information about a DataFrame.
    Args:
        df: DataFrame to analyze
    Returns:
        Dictionary with info about the dataframe
    """
    if not is_valid_dataframe(df):
        return {"valid": False, "rows": 0, "columns": 0}
    return {
        "valid": True,
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": list(df.columns),
        "memory_usage": df.memory_usage(deep=True).sum() / 1024**2,  # MB
        "dtypes": df.dtypes.to_dict()
    }
