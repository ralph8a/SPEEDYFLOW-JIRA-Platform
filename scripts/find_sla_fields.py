#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Buscar campos SLA en el dataset
"""
import gzip
import json
from pathlib import Path

cache_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
dataset_file = cache_dir / "active_ml_tickets.json.gz"

print("="*70)
print("🔍 BUSCANDO CAMPOS SLA")
print("="*70 + "\n")

with gzip.open(dataset_file, "rt", encoding="utf-8") as f:
    tickets = json.load(f)

print(f"✅ {len(tickets):,} tickets cargados\n")

# Buscar campos que contengan "sla", "time", "millis" en su estructura
sla_candidates = {}

print("🔬 Analizando primeros 100 tickets para campos SLA...\n")

for ticket in tickets[:100]:
    fields = ticket.get("fields", {})
    
    for key, value in fields.items():
        if value is None:
            continue
            
        # Buscar campos que sean objetos con "millis" o estructura tipo SLA
        if isinstance(value, dict):
            # Revisar si tiene estructura de tiempo (millis, completedCycles, etc)
            has_millis = any("millis" in str(k).lower() for k in value.keys())
            has_time = any("time" in str(k).lower() for k in value.keys())
            has_sla = any("sla" in str(k).lower() for k in value.keys())
            has_cycle = any("cycle" in str(k).lower() for k in value.keys())
            
            if has_millis or (has_time and has_cycle) or has_sla:
                if key not in sla_candidates:
                    sla_candidates[key] = {
                        "count": 0,
                        "sample": value,
                        "keys": list(value.keys())
                    }
                sla_candidates[key]["count"] += 1

# Mostrar candidatos
print("📊 CAMPOS SLA DETECTADOS:\n")

if not sla_candidates:
    print("❌ No se encontraron campos SLA en los primeros 100 tickets\n")
    print("🔍 Buscando en campos custom con 'sla' en samples...\n")
    
    # Buscar en custom fields
    for ticket in tickets[:500]:
        fields = ticket.get("fields", {})
        for key, value in fields.items():
            if key.startswith("customfield_") and value:
                value_str = str(value).lower()
                if "sla" in value_str or "millis" in value_str:
                    if key not in sla_candidates:
                        sla_candidates[key] = {
                            "count": 0,
                            "sample": value,
                            "keys": list(value.keys()) if isinstance(value, dict) else []
                        }
                    sla_candidates[key]["count"] += 1

if sla_candidates:
    for field_id, data in sorted(sla_candidates.items(), key=lambda x: x[1]["count"], reverse=True):
        print(f"🎯 {field_id}")
        print(f"   Encontrado en: {data['count']}/100 tickets")
        print(f"   Keys: {data['keys'][:10]}")
        print(f"\n   Sample completo:")
        print(f"   {json.dumps(data['sample'], indent=4, ensure_ascii=False)[:500]}...")
        print()
else:
    print("❌ No se encontraron campos SLA\n")
    
    # Mostrar campos que tienen estructura de tiempo
    print("🕐 Mostrando campos con estructura de objeto que podrían contener tiempos:\n")
    
    time_fields = {}
    for ticket in tickets[:50]:
        fields = ticket.get("fields", {})
        for key, value in fields.items():
            if isinstance(value, dict) and value:
                if key.startswith("customfield_"):
                    if key not in time_fields:
                        time_fields[key] = {
                            "sample": value,
                            "keys": list(value.keys())
                        }
    
    for field_id, data in list(time_fields.items())[:10]:
        print(f"  • {field_id}")
        print(f"    Keys: {data['keys'][:5]}")
        print(f"    Sample: {str(data['sample'])[:100]}")
        print()

print("="*70)
