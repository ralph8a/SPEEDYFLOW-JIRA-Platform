#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Ticket Details HTML Scraper - Extract ticket data from JIRA HTML
Extrae campos custom, descripción y datos adjuntos del HTML del ticket
"""

import logging
import requests
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional, List
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class TicketDetailsScraper:
    """Extract detailed ticket information from JIRA HTML"""
    
    def __init__(self, email: str, api_token: str):
        """
        Initialize scraper
        
        Args:
            email: JIRA email
            api_token: JIRA API token
        """
        self.email = email
        self.api_token = api_token
        self.session = requests.Session()
        self.session.auth = (email, api_token)
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (SPEEDYFLOW Ticket Scraper)',
            'Accept': 'application/json'
        })
        self.cache = {}

    def get_ticket_details(self, issue_key: str, site_url: str) -> Dict[str, Any]:
        """
        Obtener detalles completos del ticket desde API JIRA
        
        Args:
            issue_key: Clave del ticket (ej: PROJ-123)
            site_url: URL del sitio JIRA
            
        Returns:
            Diccionario con todos los detalles del ticket
        """
        try:
            logger.info(f"📋 Obteniendo detalles del ticket: {issue_key}")
            
            # URL de la API de JIRA
            url = f"{site_url}/rest/api/2/issue/{issue_key}"
            
            # Parámetros para obtener todos los campos
            params = {
                'expand': 'changelog,names,schema',
                'fields': '*all'
            }
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Procesar y estructurar los datos
            ticket_details = self._process_ticket_data(data, issue_key)
            
            logger.info(f"✅ Detalles obtenidos para {issue_key}")
            return ticket_details
            
        except Exception as e:
            logger.error(f"❌ Error obteniendo detalles del ticket: {e}")
            return {}

    def _process_ticket_data(self, data: Dict, issue_key: str) -> Dict[str, Any]:
        """Procesar datos del ticket desde API JSON"""
        
        try:
            fields = data.get('fields', {})
            
            ticket_info = {
                'key': issue_key,
                'id': data.get('id'),
                'self': data.get('self'),
                'basicInfo': {
                    'summary': fields.get('summary', ''),
                    'description': fields.get('description', ''),
                    'status': fields.get('status', {}).get('name', ''),
                    'priority': fields.get('priority', {}).get('name', ''),
                    'assignee': fields.get('assignee', {}).get('displayName', 'Sin asignar'),
                    'reporter': fields.get('reporter', {}).get('displayName', ''),
                    'created': fields.get('created', ''),
                    'updated': fields.get('updated', ''),
                    'dueDate': fields.get('duedate', '')
                },
                'customFields': {},
                'attachments': [],
                'comments': [],
                'links': [],
                'labels': fields.get('labels', [])
            }
            
            # Extraer campos custom (important para "Soporte Aplicaciones")
            for field_key, field_value in fields.items():
                if field_key.startswith('customfield_'):
                    field_name = self._get_custom_field_name(field_key, data.get('names', {}))
                    if field_value:
                        ticket_info['customFields'][field_name] = self._format_field_value(field_value)
            
            # Extraer adjuntos
            attachments = fields.get('attachment', [])
            for attachment in attachments:
                ticket_info['attachments'].append({
                    'name': attachment.get('filename', ''),
                    'size': attachment.get('size', 0),
                    'mimeType': attachment.get('mimeType', ''),
                    'created': attachment.get('created', ''),
                    'author': attachment.get('author', {}).get('displayName', ''),
                    'url': attachment.get('content', '')
                })
            
            # Extraer comentarios
            comments = fields.get('comment', {}).get('comments', [])
            for comment in comments[:5]:  # Últimos 5 comentarios
                ticket_info['comments'].append({
                    'author': comment.get('author', {}).get('displayName', ''),
                    'body': comment.get('body', ''),
                    'created': comment.get('created', ''),
                    'updated': comment.get('updated', '')
                })
            
            # Extraer links/relacionados
            issuelinks = fields.get('issuelinks', [])
            for link in issuelinks:
                ticket_info['links'].append({
                    'type': link.get('type', {}).get('name', ''),
                    'link': link.get('outwardIssue', {}).get('key', '') or link.get('inwardIssue', {}).get('key', ''),
                    'summary': link.get('outwardIssue', {}).get('fields', {}).get('summary', '') or link.get('inwardIssue', {}).get('fields', {}).get('summary', '')
                })
            
            return ticket_info
            
        except Exception as e:
            logger.error(f"❌ Error procesando datos del ticket: {e}")
            return {'error': str(e)}

    def _get_custom_field_name(self, field_key: str, names_dict: Dict) -> str:
        """Obtener nombre legible del campo custom"""
        return names_dict.get(field_key, field_key)

    def _format_field_value(self, value: Any) -> str:
        """Formatear valor del campo para mostrar"""
        if isinstance(value, dict):
            # Si es un objeto, tomar el nombre o valor
            if 'name' in value:
                return value['name']
            elif 'value' in value:
                return value['value']
            else:
                return str(value)
        elif isinstance(value, list):
            # Si es lista, unir valores
            items = []
            for item in value:
                if isinstance(item, dict):
                    items.append(item.get('name', item.get('value', str(item))))
                else:
                    items.append(str(item))
            return ', '.join(items)
        else:
            return str(value) if value else ''

    def extract_html_fields(self, html: str) -> Dict[str, Any]:
        """
        Extraer campos del HTML del ticket
        Alternativa si la API no funciona bien
        
        Args:
            html: HTML del ticket
            
        Returns:
            Diccionario con campos extraídos
        """
        try:
            soup = BeautifulSoup(html, 'html.parser')
            fields = {}
            
            # Buscar campos de formulario
            form_fields = soup.find_all(['div', 'span'], class_=re.compile(r'field|property|detail', re.I))
            
            for field in form_fields:
                # Buscar etiqueta
                label_el = field.find(['label', 'span'], class_=re.compile(r'label|name', re.I))
                # Buscar valor
                value_el = field.find(['span', 'p', 'div'], class_=re.compile(r'value|content', re.I))
                
                if label_el and value_el:
                    label = label_el.get_text(strip=True)
                    value = value_el.get_text(strip=True)
                    fields[label] = value
            
            return fields
            
        except Exception as e:
            logger.error(f"❌ Error extrayendo HTML: {e}")
            return {}

    def get_ticket_as_form(self, issue_key: str, site_url: str) -> Dict[str, Any]:
        """
        Obtener ticket como estructura de formulario
        Convierte los datos del ticket a formato de formulario editable
        """
        try:
            ticket_data = self.get_ticket_details(issue_key, site_url)
            
            form_data = {
                'id': issue_key,
                'name': ticket_data.get('basicInfo', {}).get('summary', 'Sin título'),
                'description': ticket_data.get('basicInfo', {}).get('description', ''),
                'fields': [],
                'sections': {}
            }
            
            # Sección: Información Básica
            basic_info = ticket_data.get('basicInfo', {})
            form_data['sections']['basic'] = {
                'title': 'Información Básica',
                'fields': [
                    {'label': 'Resumen', 'value': basic_info.get('summary', ''), 'type': 'text'},
                    {'label': 'Descripción', 'value': basic_info.get('description', ''), 'type': 'textarea'},
                    {'label': 'Estado', 'value': basic_info.get('status', ''), 'type': 'text', 'readonly': True},
                    {'label': 'Prioridad', 'value': basic_info.get('priority', ''), 'type': 'select'},
                    {'label': 'Asignado a', 'value': basic_info.get('assignee', ''), 'type': 'select'},
                    {'label': 'Reportado por', 'value': basic_info.get('reporter', ''), 'type': 'text', 'readonly': True},
                    {'label': 'Fecha de Creación', 'value': basic_info.get('created', ''), 'type': 'date', 'readonly': True},
                    {'label': 'Fecha de Vencimiento', 'value': basic_info.get('dueDate', ''), 'type': 'date'},
                ]
            }
            
            # Sección: Campos Personalizados
            custom_fields = ticket_data.get('customFields', {})
            if custom_fields:
                form_data['sections']['custom'] = {
                    'title': 'Información Adicional',
                    'fields': [
                        {'label': label, 'value': value, 'type': 'text'}
                        for label, value in custom_fields.items()
                    ]
                }
            
            # Sección: Adjuntos
            attachments = ticket_data.get('attachments', [])
            if attachments:
                form_data['sections']['attachments'] = {
                    'title': 'Adjuntos',
                    'count': len(attachments),
                    'items': attachments
                }
            
            # Sección: Comentarios
            comments = ticket_data.get('comments', [])
            if comments:
                form_data['sections']['comments'] = {
                    'title': f'Comentarios ({len(comments)})',
                    'items': comments
                }
            
            # Sección: Enlaces/Relacionados
            links = ticket_data.get('links', [])
            if links:
                form_data['sections']['links'] = {
                    'title': 'Problemas Relacionados',
                    'items': links
                }
            
            return form_data
            
        except Exception as e:
            logger.error(f"❌ Error en get_ticket_as_form: {e}")
            return {'error': str(e)}

def scrape_ticket_details(issue_key: str, site_url: str, email: str, api_token: str) -> Dict[str, Any]:
    """Convenience function para scrappear detalles del ticket"""
    scraper = TicketDetailsScraper(email, api_token)
    return scraper.get_ticket_details(issue_key, site_url)

def get_ticket_form(issue_key: str, site_url: str, email: str, api_token: str) -> Dict[str, Any]:
    """Convenience function para obtener ticket como formulario"""
    scraper = TicketDetailsScraper(email, api_token)
    return scraper.get_ticket_as_form(issue_key, site_url)
