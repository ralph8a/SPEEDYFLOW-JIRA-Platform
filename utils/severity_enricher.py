#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
severity_enricher.py
Enriquece los datos de tickets con información de severidad desde JIRA Service Desk API
Sin cálculos - solo mapeo directo de campos
"""

import logging
from typing import Dict, Any, List, Optional
import requests
from utils.config import config

logger = logging.getLogger(__name__)


class SeverityEnricher:
    """Enriquece tickets con severidad desde JIRA Service Desk"""
    
    # Mapeo de campos custom de severidad por ID
    SEVERITY_FIELD_IDS = [
        'customfield_10125',  # Severity (común en JIRA Cloud)
        'customfield_10138',  # Criticality
        'customfield_10129',  # Alternate severity
        'customfield_10048',  # Another common one
    ]
    
    # Valores estándar de severidad
    STANDARD_SEVERITIES = {
        'critical': 'Critical',
        'high': 'High',
        'medium': 'Medium',
        'normal': 'Normal',
        'low': 'Low',
        'blocker': 'Critical',
        'urgent': 'High',
        'minor': 'Low',
    }
    
    @staticmethod
    def get_severity_from_fields(issue: Dict[str, Any]) -> Optional[str]:
        """
        Extrae severidad directamente de los campos del issue
        Sin cálculos, sin búsqueda de keywords
        
        Args:
            issue: Diccionario del issue desde JIRA API
            
        Returns:
            Severidad (Critical, High, Medium, Normal, Low) o None
        """
        
        # 1. Buscar en custom_fields (estructura del backend actual)
        if 'custom_fields' in issue:
            for field_id in SeverityEnricher.SEVERITY_FIELD_IDS:
                value = issue['custom_fields'].get(field_id)
                if value:
                    return SeverityEnricher._normalize_severity(value)
        
        # 2. Buscar en fields.customfield_* (estructura de JIRA API)
        if 'fields' in issue:
            fields = issue['fields']
            for field_id in SeverityEnricher.SEVERITY_FIELD_IDS:
                value = fields.get(field_id)
                if value:
                    return SeverityEnricher._normalize_severity(value)
            
            # 3. Buscar en campos de severidad estándar
            if 'severity' in fields:
                value = fields['severity']
                if isinstance(value, dict) and 'name' in value:
                    return SeverityEnricher._normalize_severity(value['name'])
                return SeverityEnricher._normalize_severity(value)
        
        # 4. Fallback: usar priority si está disponible
        priority = SeverityEnricher._extract_priority_value(issue)
        if priority:
            priority_normalized = str(priority).lower().strip()
            if priority_normalized in SeverityEnricher.STANDARD_SEVERITIES:
                return SeverityEnricher.STANDARD_SEVERITIES[priority_normalized]
        
        return None
    
    @staticmethod
    def _extract_priority_value(issue: Dict[str, Any]) -> Optional[str]:
        """
        Extrae el valor de prioridad del issue de manera segura
        
        Args:
            issue: Diccionario del issue
            
        Returns:
            Valor de prioridad extraído o None
        """
        # Intentar obtener priority directamente
        priority = issue.get('priority')
        
        # Si no existe, intentar desde fields
        if not priority:
            fields = issue.get('fields', {})
            if isinstance(fields, dict):
                priority = fields.get('priority')
        
        # Extraer el nombre si es un dict
        if isinstance(priority, dict) and 'name' in priority:
            return priority['name']
        
        return priority

    @staticmethod
    def _normalize_severity(value: Any) -> Optional[str]:
        """
        Normaliza un valor de severidad a un estándar
        
        Args:
            value: Valor raw desde JIRA (puede ser string, dict, etc)
            
        Returns:
            Severidad normalizada o None
        """
        
        if not value:
            return None
        
        # Si es un dict con 'name' (estructura de JIRA)
        if isinstance(value, dict):
            if 'name' in value:
                value = value['name']
            else:
                value = str(value)
        
        # Convertir a string y normalizar
        value_str = str(value).lower().strip()
        
        # Buscar coincidencia en valores estándar
        if value_str in SeverityEnricher.STANDARD_SEVERITIES:
            return SeverityEnricher.STANDARD_SEVERITIES[value_str]
        
        # Si es uno de los valores estándar, devolverlo capitalizado
        if value_str in ['critical', 'high', 'medium', 'normal', 'low']:
            return value_str.capitalize()
        
        # Fallback: devolver el valor original capitalizado
        return value_str.capitalize() if value_str else None
    
    @staticmethod
    def enrich_issue(issue: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enriquece un issue con severidad
        
        Args:
            issue: Diccionario del issue
            
        Returns:
            Issue enriquecido con campo 'severity'
        """
        
        if 'severity' not in issue or not issue['severity']:
            severity = SeverityEnricher.get_severity_from_fields(issue)
            issue['severity'] = severity or 'Normal'
        
        return issue
    
    @staticmethod
    def enrich_issues(issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Enriquece una lista de issues con severidad
        
        Args:
            issues: Lista de issues desde API
            
        Returns:
            Lista de issues enriquecidos
        """
        
        return [SeverityEnricher.enrich_issue(issue) for issue in issues]


def test_severity_enricher():
    """Test de la función de enriquecimiento"""
    
    # Test cases
    test_issues = [
        {
            'key': 'TEST-1',
            'summary': 'Test critical',
            'fields': {
                'customfield_10125': {'name': 'Critical'}
            }
        },
        {
            'key': 'TEST-2',
            'summary': 'Test high',
            'custom_fields': {
                'customfield_10125': 'High'
            }
        },
        {
            'key': 'TEST-3',
            'summary': 'Test low',
            'priority': {'name': 'Low Priority'}
        },
        {
            'key': 'TEST-4',
            'summary': 'Test normal',
            'fields': {}
        }
    ]
    
    enriched = SeverityEnricher.enrich_issues(test_issues)
    
    for issue in enriched:
        print(f"{issue['key']}: severity = {issue['severity']}")


if __name__ == '__main__':
    test_severity_enricher()
