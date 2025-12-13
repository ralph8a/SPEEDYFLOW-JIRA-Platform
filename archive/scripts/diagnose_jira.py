#!/usr/bin/env python
# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.config import config
from utils.common import _get_credentials, _get_auth_header, _make_request

site, email, token = _get_credentials(config)
headers = _get_auth_header(email, token)

print("🔍 Diagnosticando JIRA instance...\n")

# 1. Verificar Service Desks
url = f"{site}/rest/servicedeskapi/servicedesk"
desks = _make_request("GET", url, headers)
print(f"1. Service Desks: {len(desks.get('values', [])) if desks else 0}")

if desks and desks.get("values"):
    desk = desks["values"][0]  # Tomar el primero
    desk_id = desk.get("id")
    desk_name = desk.get("projectName", "Unknown")
    print(f"   Ejemplo: {desk_name} (ID: {desk_id})\n")
    
    # 2. Verificar request types
    url = f"{site}/rest/servicedeskapi/servicedesk/{desk_id}/requesttype"
    req_types = _make_request("GET", url, headers)
    print(f"2. Request Types disponibles: {len(req_types.get('values', [])) if req_types else 0}")
    if req_types and req_types.get("values"):
        for rt in req_types["values"][:3]:
            print(f"   • {rt.get('name')} (ID: {rt.get('id')})")
    print()
    
    # 3. Verificar requests (tickets) usando API de organizaciones
    url = f"{site}/rest/servicedeskapi/servicedesk/{desk_id}/organization"
    orgs = _make_request("GET", url, headers)
    print(f"3. Organizaciones: {len(orgs.get('values', [])) if orgs else 0}\n")
    
    # 4. Intentar obtener requests directamente del desk
    url = f"{site}/rest/servicedeskapi/servicedesk/{desk_id}/request"
    params = {"start": 0, "limit": 5}
    requests = _make_request("GET", url, headers, params=params)
    if requests:
        total = requests.get("size", 0)
        print(f"4. ✅ ENCONTRADO: Requests en {desk_name}: {total}")
        if requests.get("values"):
            print("   Primeros 5:")
            for req in requests["values"][:5]:
                key = req.get("issueKey", "N/A")
                summary = req.get("requestFieldValues", {}).get("summary", "Sin resumen")
                status = req.get("currentStatus", {}).get("status", "N/A")
                print(f"     • {key}: {summary} [{status}]")
    else:
        print(f"4. ❌ No se pudieron obtener requests de {desk_name}")
