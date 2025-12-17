#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test de endpoints disponibles en JIRA
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.config import config
from utils.common import _get_credentials, _get_auth_header, _make_request
site, email, token = _get_credentials(config)
headers = _get_auth_header(email, token)
print("="*70)
print("🔍 TESTEANDO ENDPOINTS DE JIRA")
print("="*70 + "\n")
# Test 1: Obtener un issue directo
print("1️⃣ Test: GET /rest/api/3/issue/{issueKey}")
result = _make_request("GET", f"{site}/rest/api/3/issue/MSM-1", headers)
if result:
    print(f"✅ FUNCIONA - Issue: {result.get('key')}")
    print(f"   Summary: {result.get('fields', {}).get('summary', 'N/A')}")
else:
    print("❌ NO FUNCIONA")
print()
# Test 2: Buscar con JQL
print("2️⃣ Test: POST /rest/api/3/search (JQL)")
jql_data = {
    "jql": "project = MSM ORDER BY created DESC",
    "maxResults": 5,
    "fields": ["summary", "status", "assignee"]
}
result = _make_request("POST", f"{site}/rest/api/3/search", headers, json=jql_data)
if result:
    total = result.get("total", 0)
    issues = result.get("issues", [])
    print(f"✅ FUNCIONA - Total: {total}, Retornados: {len(issues)}")
    for issue in issues[:3]:
        print(f"   • {issue.get('key')}: {issue.get('fields', {}).get('summary', 'N/A')}")
else:
    print("❌ NO FUNCIONA")
print()
# Test 3: Browse issues (pagination)
print("3️⃣ Test: GET /rest/api/3/search con parámetros")
params = {
    "jql": "project = MSM",
    "startAt": 0,
    "maxResults": 5,
    "fields": "summary,status"
}
result = _make_request("GET", f"{site}/rest/api/3/search", headers, params=params)
if result:
    total = result.get("total", 0)
    issues = result.get("issues", [])
    print(f"✅ FUNCIONA - Total: {total}, Retornados: {len(issues)}")
else:
    print("❌ NO FUNCIONA")
print()
# Test 4: Service Desk requests
print("4️⃣ Test: GET /rest/servicedeskapi/request")
result = _make_request("GET", f"{site}/rest/servicedeskapi/request", headers, params={"start": 0, "limit": 5})
if result:
    values = result.get("values", [])
    print(f"✅ FUNCIONA - Requests encontrados: {len(values)}")
    for req in values[:3]:
        print(f"   • {req.get('issueKey')}: {req.get('requestFieldValues', {}).get('summary', 'N/A')}")
else:
    print("❌ NO FUNCIONA")
print()
# Test 5: My requests
print("5️⃣ Test: GET /rest/servicedeskapi/request (con serviceDeskId)")
params = {"serviceDeskId": 4, "start": 0, "limit": 5}
result = _make_request("GET", f"{site}/rest/servicedeskapi/request", headers, params=params)
if result:
    values = result.get("values", [])
    print(f"✅ FUNCIONA - Requests en desk 4: {len(values)}")
else:
    print("❌ NO FUNCIONA")
print()
print("="*70)
print("✅ TEST COMPLETO")
print("="*70)
