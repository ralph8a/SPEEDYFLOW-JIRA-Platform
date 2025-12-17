#!/usr/bin/env python
# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.config import config
from utils.common import _get_credentials, _get_auth_header, _make_request
site, email, token = _get_credentials(config)
headers = _get_auth_header(email, token)
# Búsqueda global sin filtro de proyecto
url = f"{site}/rest/api/3/search"
params = {
    "jql": "ORDER BY created DESC",
    "maxResults": 10,
    "fields": "key,summary,status,assignee,created"
}
result = _make_request("GET", url, headers, params=params)
if result:
    total = result.get("total", 0)
    issues = result.get("issues", [])
    print(f"\n✅ Total tickets en JIRA: {total:,}")
    print(f"📋 Primeros 10 tickets:")
    for issue in issues:
        key = issue.get("key", "N/A")
        summary = issue["fields"].get("summary", "Sin resumen")
        status = issue["fields"].get("status", {}).get("name", "N/A")
        print(f"  • {key}: {summary[:50]}... [{status}]")
else:
    print("❌ No se pudo obtener tickets")
