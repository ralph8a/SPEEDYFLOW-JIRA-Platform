# -*- coding: utf-8 -*-
"""
Export Utilities Module
Centralized functions for exporting and handling export operations
"""
import logging
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
import streamlit as st
logger = logging.getLogger(__name__)
def _get_fieldnames_from_data(data: List) -> List[str]:
    """
    Extrae los nombres de campos de una lista de datos de manera segura
    Args:
        data: Lista de datos
    Returns:
        Lista de nombres de campos
    """
    if not data or not isinstance(data, list):
        return []
    first_item = data[0]
    if isinstance(first_item, dict):
        return list(first_item.keys())
    return []
def _get_mime_type(export_type: str) -> str:
    """
    Obtiene el tipo MIME correcto para el tipo de exportación
    Args:
        export_type: Tipo de exportación
    Returns:
        Tipo MIME correspondiente
    """
    mime_types = {
        "csv": "text/csv",
        "json": "application/json"
    }
    return mime_types.get(export_type, "application/octet-stream")
def prepare_export(
    data: Any,
    export_type: str = "csv",
    filename_prefix: str = "export"
) -> Tuple[Optional[str], Optional[str]]:
    """
    DRY: Prepare export data with appropriate format
    Args:
        data: Data to export (List of dicts for CSV)
        export_type: Type of export ('csv', 'json')
        filename_prefix: Prefix for the exported filename
    Returns:
        Tuple of (export_data, filename) or (None, None) on error
    """
    try:
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        if export_type == "csv":
            import csv
            from io import StringIO
            if not data or not isinstance(data, list):
                logger.error("CSV export requires a list of dictionaries")
                return None, None
            output = StringIO()
            if not data:
                return None, None
            # Get field names from first item
            fieldnames = _get_fieldnames_from_data(data)
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            for row in data:
                if isinstance(row, dict):
                    writer.writerow(row)
            export_data = output.getvalue()
            filename = f"{filename_prefix}_{timestamp}.csv"
            return export_data, filename
        elif export_type == "json":
            import json
            export_data = json.dumps(data, indent=2, default=str)
            filename = f"{filename_prefix}_{timestamp}.json"
            return export_data, filename
        else:
            logger.error(f"Unsupported export type: {export_type}")
            return None, None
    except Exception as e:
        logger.error(f"Error preparing export: {e}")
        return None, None
def render_export_button(
    data: Any,
    label: str = "⬇️ Download",
    export_type: str = "csv",
    filename_prefix: str = "export",
    use_container_width: bool = True,
    key: Optional[str] = None
) -> bool:
    """
    DRY: Render Streamlit download button with error handling
    Args:
        data: Data to export
        label: Button label text
        export_type: Type of export ('csv', 'json')
        filename_prefix: Prefix for filename
        use_container_width: Whether to use full container width
        key: Streamlit key for the button
    Returns:
        True if button was clicked, False otherwise
    """
    try:
        export_data, filename = prepare_export(data, export_type, filename_prefix)
        if not export_data or not filename:
            st.error(f"❌ Failed to prepare {export_type.upper()} export")
            return False
        mime_type = _get_mime_type(export_type)
        st.download_button(
            label=label,
            data=export_data,
            file_name=filename,
            mime=mime_type,
            use_container_width=use_container_width,
            key=key or f"download_{export_type}_{id(data)}"
        )
        return True
    except Exception as e:
        logger.error(f"Error rendering export button: {e}")
        st.error(f"❌ Export error: {str(e)}")
        return False
def handle_export_session_state(
    session_state_key: str = "export_state",
    data_key: str = "export_data"
) -> Dict[str, Any]:
    """
    DRY: Initialize and manage export session state
    Args:
        session_state_key: Key for export state
        data_key: Key for export data
    Returns:
        Dictionary with current export state
    """
    if session_state_key not in st.session_state:
        st.session_state[session_state_key] = {
            "show_export": False,
            "csv_ready": False,
            "csv_data": None,
            "csv_filename": "",
            "export_error": None
        }
    return st.session_state[session_state_key]
