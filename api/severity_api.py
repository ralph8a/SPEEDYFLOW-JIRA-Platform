#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
severity_api_endpoint.py
Endpoint que devuelve issues enriquecidas con severidad desde JIRA Service Desk
"""
from flask import Blueprint, request, jsonify
import logging
from utils.severity_enricher import SeverityEnricher
from core.api import load_queue_issues
logger = logging.getLogger(__name__)
# Blueprint para rutas de severidad
severity_bp = Blueprint('severity', __name__, url_prefix='/api/severity')
@severity_bp.route('/issues/<queue_id>', methods=['GET'])
def get_issues_with_severity(queue_id):
    """
    GET /api/severity/issues/<queue_id>?desk_id=...
    Devuelve issues enriquecidas con severidad directa desde JIRA
    Sin cálculos, sin detección de keywords
    Args:
        queue_id: ID de la cola
        desk_id: ID del service desk (parámetro query)
    Returns:
        {
            'data': [
                {
                    'key': 'PROJ-123',
                    'summary': '...',
                    'severity': 'Critical',
                    ...
                }
            ],
            'count': N
        }
    """
    try:
        desk_id = request.args.get('desk_id')
        if not desk_id:
            return jsonify({'error': 'desk_id parameter required'}), 400
        logger.info(f"📊 Fetching issues with severity for desk {desk_id}, queue {queue_id}")
        # Cargar issues desde el queue
        issues_df, error = load_queue_issues(
            service_desk_id=str(desk_id),
            queue_id=str(queue_id)
        )
        if error:
            logger.error(f"Error loading issues: {error}")
            return jsonify({'error': error}), 500
        if issues_df is None or issues_df.empty:
            return jsonify({'data': [], 'count': 0}), 200
        # Convertir a lista de dicts
        issues = issues_df.to_dict('records')
        # Enriquecer con severidad
        enriched_issues = SeverityEnricher.enrich_issues(issues)
        logger.info(f"✅ Enriched {len(enriched_issues)} issues with severity")
        return jsonify({
            'data': enriched_issues,
            'count': len(enriched_issues)
        }), 200
    except Exception as e:
        logger.exception(f"Error in severity endpoint: {e}")
        return jsonify({'error': str(e)}), 500
@severity_bp.route('/test', methods=['GET'])
def test_severity():
    """
    GET /api/severity/test
    Endpoint de prueba para verificar que la severidad funciona
    """
    test_data = [
        {
            'key': 'TEST-1',
            'summary': 'Critical issue',
            'fields': {'customfield_10125': {'name': 'Critical'}}
        },
        {
            'key': 'TEST-2',
            'summary': 'High priority',
            'fields': {'customfield_10125': 'High'}
        },
        {
            'key': 'TEST-3',
            'summary': 'Low impact',
            'priority': {'name': 'Low'}
        }
    ]
    enriched = SeverityEnricher.enrich_issues(test_data)
    return jsonify({
        'message': 'Severity enrichment test',
        'data': enriched
    }), 200
def register_severity_routes(app):
    """Registra las rutas de severidad en la app"""
    app.register_blueprint(severity_bp)
    logger.info("✅ Severity routes registered at /api/severity")
