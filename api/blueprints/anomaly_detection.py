# -*- coding: utf-8 -*-
"""
API Blueprint for Anomaly Detection Dashboard
Provides endpoints for detecting and monitoring operational anomalies
"""

from flask import Blueprint, jsonify, request
import logging
from api.ml_anomaly_detection import (
    get_anomaly_engine,
    train_anomaly_engine,
    get_anomalies,
    get_anomaly_dashboard
)

logger = logging.getLogger(__name__)

anomaly_detection_bp = Blueprint('anomaly_detection', __name__, url_prefix='/api/ml/anomalies')

@anomaly_detection_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    """
    Get comprehensive anomaly detection dashboard data.
    
    Returns:
    {
        "anomalies": {
            "total": 5,
            "high": 2,
            "medium": 3,
            "details": [...]
        },
        "baseline": {
            "avg_daily_tickets": 45.2,
            "avg_tickets_per_assignee": 8.5
        }
    }
    """
    try:
        dashboard_data = get_anomaly_dashboard()
        
        return jsonify({
            "success": True,
            "data": dashboard_data
        })
        
    except Exception as e:
        logger.error(f"Error getting dashboard: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@anomaly_detection_bp.route('/current', methods=['GET'])
def get_current_anomalies():
    """
    Get list of currently detected anomalies.
    
    Query params:
    - severity: Filter by severity (high, medium)
    - type: Filter by anomaly type
    """
    try:
        anomalies = get_anomalies()
        
        # Apply filters
        severity_filter = request.args.get('severity')
        type_filter = request.args.get('type')
        
        if severity_filter:
            anomalies = [a for a in anomalies if a.get('severity') == severity_filter]
        
        if type_filter:
            anomalies = [a for a in anomalies if a.get('type') == type_filter]
        
        return jsonify({
            "success": True,
            "anomalies": anomalies,
            "count": len(anomalies)
        })
        
    except Exception as e:
        logger.error(f"Error getting anomalies: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@anomaly_detection_bp.route('/train', methods=['POST'])
def train_engine():
    """
    Train/retrain the anomaly detection engine.
    This calculates baseline statistics from historical data.
    """
    try:
        logger.info("Starting anomaly detection engine training...")
        stats = train_anomaly_engine()
        
        if not stats.get('trained'):
            return jsonify({
                "success": False,
                "error": stats.get('error', 'Training failed')
            }), 500
        
        return jsonify({
            "success": True,
            "message": "Training completed successfully",
            "stats": stats
        })
        
    except Exception as e:
        logger.error(f"Error training engine: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@anomaly_detection_bp.route('/baseline', methods=['GET'])
def get_baseline():
    """Get baseline statistics used for anomaly detection"""
    try:
        engine = get_anomaly_engine()
        
        if not engine.baseline_stats:
            return jsonify({
                "success": False,
                "error": "Baseline not calculated. Please train the engine first."
            }), 400
        
        return jsonify({
            "success": True,
            "baseline": engine.baseline_stats
        })
        
    except Exception as e:
        logger.error(f"Error getting baseline: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@anomaly_detection_bp.route('/status', methods=['GET'])
def get_status():
    """Get the current status of the anomaly detection engine"""
    try:
        engine = get_anomaly_engine()
        
        is_trained = bool(engine.baseline_stats)
        
        return jsonify({
            "success": True,
            "trained": is_trained,
            "baseline_calculated": is_trained,
            "anomalies_detected": len(engine.anomalies),
            "last_training": engine.baseline_stats.get('timestamp') if is_trained else None
        })
        
    except Exception as e:
        logger.error(f"Error getting status: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@anomaly_detection_bp.route('/types', methods=['GET'])
def get_anomaly_types():
    """Get information about different anomaly types"""
    return jsonify({
        "success": True,
        "types": [
            {
                "type": "creation_spike",
                "description": "Unusual spike in ticket creation rate",
                "severity": "high"
            },
            {
                "type": "assignment_overload",
                "description": "One assignee has too many active tickets",
                "severity": "high"
            },
            {
                "type": "unassigned_tickets",
                "description": "Too many tickets without assignee",
                "severity": "medium"
            },
            {
                "type": "stalled_ticket",
                "description": "Ticket stuck in same status for too long",
                "severity": "high"
            },
            {
                "type": "issue_type_spike",
                "description": "Unusual distribution of issue types",
                "severity": "medium"
            }
        ]
    })

@anomaly_detection_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "anomaly_detection"
    })
