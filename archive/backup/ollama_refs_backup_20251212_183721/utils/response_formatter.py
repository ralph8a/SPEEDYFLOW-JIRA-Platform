#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ResponseFormatter - Centralized API response formatting
Ensures consistency across all API endpoints
"""
from flask import jsonify
from datetime import datetime
from typing import Any, Optional, Dict
class ResponseFormatter:
    """Centralized response formatter for all API endpoints"""
    @staticmethod
    def success(data: Any = None, message: str = None, code: int = 200) -> tuple:
        """
        Format a success response
        Args:
            data: Response data (dict, list, etc.)
            message: Optional success message
            code: HTTP status code (default 200)
        Returns:
            (jsonified response, status code)
        """
        response = {
            'success': True,
            'timestamp': datetime.now().isoformat()
        }
        if data is not None:
            response['data'] = data
        if message:
            response['message'] = message
        return jsonify(response), code
    @staticmethod
    def error(error: str, 
              code: int = 500, 
              error_code: str = 'INTERNAL_ERROR',
              details: Optional[Dict] = None) -> tuple:
        """
        Format an error response
        Args:
            error: Error message
            code: HTTP status code (default 500)
            error_code: Machine-readable error code
            details: Optional error details/context
        Returns:
            (jsonified response, status code)
        """
        response = {
            'success': False,
            'error': str(error),
            'code': error_code,
            'timestamp': datetime.now().isoformat()
        }
        if details:
            response['details'] = details
        return jsonify(response), code
    @staticmethod
    def missing_params(params: list) -> tuple:
        """Format response for missing parameters"""
        return ResponseFormatter.error(
            error=f"Missing required parameters: {', '.join(params)}",
            code=400,
            error_code='MISSING_PARAMS',
            details={'required': params}
        )
    @staticmethod
    def missing_config(message: str = "JIRA configuration missing") -> tuple:
        """Format response for configuration errors"""
        return ResponseFormatter.error(
            error=message,
            code=401,
            error_code='CONFIG_ERROR'
        )
    @staticmethod
    def not_found(resource: str = "Resource") -> tuple:
        """Format response for not found errors"""
        return ResponseFormatter.error(
            error=f"{resource} not found",
            code=404,
            error_code='NOT_FOUND'
        )
    @staticmethod
    def validation_error(message: str, details: Dict = None) -> tuple:
        """Format response for validation errors"""
        return ResponseFormatter.error(
            error=message,
            code=400,
            error_code='VALIDATION_ERROR',
            details=details
        )
    @staticmethod
    def warning(message: str, data: Any = None) -> tuple:
        """Format response with warning status"""
        response = {
            'success': True,
            'warning': message,
            'timestamp': datetime.now().isoformat()
        }
        if data is not None:
            response['data'] = data
        return jsonify(response), 200
    @staticmethod
    def paginated(items: list, 
                  total: int, 
                  page: int = 1, 
                  page_size: int = 20,
                  message: str = None) -> tuple:
        """
        Format paginated response
        Args:
            items: List of items
            total: Total count of items
            page: Current page number
            page_size: Items per page
            message: Optional message
        Returns:
            (jsonified response, status code)
        """
        response = {
            'success': True,
            'data': items,
            'pagination': {
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size
            },
            'timestamp': datetime.now().isoformat()
        }
        if message:
            response['message'] = message
        return jsonify(response), 200
    @staticmethod
    def bulk_result(succeeded: int, 
                   failed: int, 
                   errors: list = None,
                   data: Any = None) -> tuple:
        """
        Format response for bulk operations
        Args:
            succeeded: Number of successful operations
            failed: Number of failed operations
            errors: List of error details
            data: Result data
        Returns:
            (jsonified response, status code)
        """
        response = {
            'success': failed == 0,
            'operations': {
                'succeeded': succeeded,
                'failed': failed,
                'total': succeeded + failed
            },
            'timestamp': datetime.now().isoformat()
        }
        if errors:
            response['errors'] = errors
        if data:
            response['data'] = data
        status_code = 200 if failed == 0 else 207
        return jsonify(response), status_code
