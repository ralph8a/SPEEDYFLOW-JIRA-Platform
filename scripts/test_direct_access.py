#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test de acceso directo a issues por rango
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.config import config
from utils.common import _get_credentials, _get_auth_header, _make_request

site, email, token = _get_credentials(config)
headers = _get_auth_header(email, token)

print("="*70)
print("🔍 TESTEANDO ACCESO DIRECTO A ISSUES")
print("="*70 + "\n")

# Test 1: Acceso directo por key con rango
print("1️⃣ Test: Acceso directo MSM-1 a MSM-100")
success_count = 0
failed_count = 0

for i in range(1, 101):
    key = f"MSM-{i}"
    result = _make_request("GET", f"{site}/rest/api/3/issue/{key}", headers)
    if result:
        success_count += 1
        if success_count <= 5:  # Mostrar solo los primeros 5
            print(f"  ✅ {key}: {result.get('fields', {}).get('summary', 'N/A')[:50]}")
    else:
        failed_count += 1

print(f"\n📊 Resultado: {success_count} éxitos, {failed_count} fallos")

print()

# Test 2: Probar con otros proyectos
print("2️⃣ Test: Otros proyectos (AP, DES)")
projects = ["AP", "DES", "IN", "AR"]
for proj in projects:
    result = _make_request("GET", f"{site}/rest/api/3/issue/{proj}-1", headers)
    if result:
        print(f"  ✅ {proj}-1 existe")
    else:
        print(f"  ❌ {proj}-1 no encontrado")

print()

# Test 3: Obtener metadata del proyecto para ver el rango
print("3️⃣ Test: Metadata del proyecto MSM")
result = _make_request("GET", f"{site}/rest/api/3/project/MSM", headers)
if result:
    print(f"  ✅ Proyecto: {result.get('name')}")
    print(f"  ID: {result.get('id')}")
    print(f"  Key: {result.get('key')}")
    
print()
print("="*70)
