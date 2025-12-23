"""Deprecated shim for ai_backgrounds.

This module is archived; use api.ai_backgrounds_minimal instead.
"""
import logging
from api.ai_backgrounds_minimal import get_ai_backgrounds
logger = logging.getLogger(__name__)
logger.warning("api.ai_backgrounds is deprecated and archived; use api.ai_backgrounds_minimal")
__all__ = ["get_ai_backgrounds"]
