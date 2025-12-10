#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Analizador de campos disponibles en el dataset ML
"""
import gzip
import json
from pathlib import Path
from collections import Counter

cache_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
dataset_file = cache_dir / "active_ml_tickets.json.gz"

print("="*70)
print("📋 ANÁLISIS DE CAMPOS DEL DATASET")
print("="*70 + "\n")

print(f"📂 Cargando: {dataset_file.name}...\n")

with gzip.open(dataset_file, "rt", encoding="utf-8") as f:
    tickets = json.load(f)

print(f"✅ {len(tickets):,} tickets cargados\n")

# Analizar primer ticket
sample = tickets[0]
print("📊 ESTRUCTURA DEL TICKET:\n")
print(f"Keys principales: {list(sample.keys())}\n")

# Campos de fields
if "fields" in sample:
    fields = sample["fields"]
    print(f"📋 Campos en 'fields' ({len(fields)} campos):\n")
    
    # Agrupar por tipo
    string_fields = []
    object_fields = []
    array_fields = []
    other_fields = []
    
    for key, value in fields.items():
        if value is None:
            other_fields.append((key, "null"))
        elif isinstance(value, str):
            string_fields.append(key)
        elif isinstance(value, dict):
            object_fields.append((key, list(value.keys())[:3]))  # Primeros 3 keys
        elif isinstance(value, list):
            array_fields.append((key, len(value)))
        else:
            other_fields.append((key, type(value).__name__))
    
    print("📝 Campos de texto:")
    for field in sorted(string_fields)[:20]:  # Primeros 20
        sample_value = fields.get(field, "")
        if sample_value:
            truncated = sample_value[:60] + "..." if len(str(sample_value)) > 60 else sample_value
            print(f"  • {field}: \"{truncated}\"")
    if len(string_fields) > 20:
        print(f"  ... y {len(string_fields) - 20} más")
    
    print(f"\n🔗 Campos objeto ({len(object_fields)}):")
    for field, subkeys in sorted(object_fields)[:15]:
        print(f"  • {field}: {{{', '.join(map(str, subkeys))}...}}")
    if len(object_fields) > 15:
        print(f"  ... y {len(object_fields) - 15} más")
    
    print(f"\n📚 Campos array ({len(array_fields)}):")
    for field, count in sorted(array_fields, key=lambda x: x[1], reverse=True)[:10]:
        print(f"  • {field}: [{count} items]")
    
    print(f"\n⚡ Otros campos ({len(other_fields)}):")
    for field, tipo in sorted(other_fields)[:10]:
        print(f"  • {field}: {tipo}")

# Analizar disponibilidad de campos clave
print("\n" + "="*70)
print("🎯 CAMPOS CLAVE PARA ML")
print("="*70 + "\n")

key_fields = {
    "summary": 0,
    "description": 0,
    "status": 0,
    "priority": 0,
    "issuetype": 0,
    "assignee": 0,
    "reporter": 0,
    "created": 0,
    "updated": 0,
    "resolutiondate": 0,
    "labels": 0,
    "components": 0,
    "comment": 0,
    "attachment": 0,
    "customfield_10016": 0,  # Story Points común
    "customfield_10020": 0,  # Sprint común
}

for ticket in tickets[:1000]:  # Analizar primeros 1000
    fields = ticket.get("fields", {})
    for field in key_fields:
        if field in fields and fields[field] is not None:
            if isinstance(fields[field], (list, dict)):
                if fields[field]:  # No vacío
                    key_fields[field] += 1
            else:
                key_fields[field] += 1

print("Disponibilidad en primeros 1,000 tickets:\n")
for field, count in sorted(key_fields.items(), key=lambda x: x[1], reverse=True):
    percentage = (count / 1000) * 100
    bar = "█" * int(percentage / 5) + "░" * (20 - int(percentage / 5))
    print(f"  {field:25} {bar} {percentage:5.1f}% ({count:,})")

# Custom fields
print("\n" + "="*70)
print("🔧 CUSTOM FIELDS DETECTADOS")
print("="*70 + "\n")

custom_fields = Counter()
for ticket in tickets[:500]:
    fields = ticket.get("fields", {})
    for key in fields.keys():
        if key.startswith("customfield_"):
            if fields[key] is not None:
                custom_fields[key] += 1

print(f"Top 15 custom fields más utilizados:\n")
for field, count in custom_fields.most_common(15):
    percentage = (count / 500) * 100
    # Intentar obtener valor de ejemplo
    sample_val = None
    for ticket in tickets[:10]:
        val = ticket.get("fields", {}).get(field)
        if val:
            sample_val = val
            break
    
    if isinstance(sample_val, dict):
        sample_str = f"Object: {list(sample_val.keys())[:2]}"
    elif isinstance(sample_val, list):
        sample_str = f"Array: {len(sample_val)} items"
    elif isinstance(sample_val, str):
        sample_str = f'"{sample_val[:30]}..."' if len(sample_val) > 30 else f'"{sample_val}"'
    else:
        sample_str = str(type(sample_val).__name__)
    
    print(f"  • {field:22} {percentage:5.1f}% - {sample_str}")

print("\n" + "="*70)
print("✅ Análisis completo")
print("="*70)
