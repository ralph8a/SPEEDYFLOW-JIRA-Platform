#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Mapeo de Custom Fields a nombres descriptivos
Analiza el contenido de los custom fields para inferir su propósito
"""
import gzip
import json
from pathlib import Path
from collections import Counter, defaultdict

cache_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
dataset_file = cache_dir / "active_ml_tickets.json.gz"

print("="*70)
print("🔍 ANÁLISIS DE CUSTOM FIELDS")
print("="*70 + "\n")

print(f"📂 Cargando: {dataset_file.name}...\n")

with gzip.open(dataset_file, "rt", encoding="utf-8") as f:
    tickets = json.load(f)

print(f"✅ {len(tickets):,} tickets cargados\n")

# Analizar custom fields
custom_field_analysis = defaultdict(lambda: {
    "count": 0,
    "types": Counter(),
    "samples": [],
    "null_count": 0
})

print("🔬 Analizando custom fields en primeros 2,000 tickets...\n")

for ticket in tickets[:2000]:
    fields = ticket.get("fields", {})
    for key, value in fields.items():
        if key.startswith("customfield_"):
            custom_field_analysis[key]["count"] += 1
            
            if value is None:
                custom_field_analysis[key]["null_count"] += 1
            else:
                value_type = type(value).__name__
                custom_field_analysis[key]["types"][value_type] += 1
                
                # Guardar muestras
                if len(custom_field_analysis[key]["samples"]) < 5:
                    if isinstance(value, dict):
                        # Para objetos, guardar estructura
                        sample = {k: type(v).__name__ for k, v in list(value.items())[:3]}
                        custom_field_analysis[key]["samples"].append(sample)
                    elif isinstance(value, list):
                        # Para arrays, guardar tamaño y primer elemento
                        if value:
                            first_elem = value[0]
                            if isinstance(first_elem, dict):
                                sample = f"Array[{len(value)}] of {{{', '.join(list(first_elem.keys())[:3])}}}"
                            else:
                                sample = f"Array[{len(value)}] of {type(first_elem).__name__}"
                        else:
                            sample = "Empty array"
                        custom_field_analysis[key]["samples"].append(sample)
                    elif isinstance(value, str):
                        custom_field_analysis[key]["samples"].append(value[:100])
                    else:
                        custom_field_analysis[key]["samples"].append(str(value)[:100])

# Mapeo inferido de custom fields a nombres descriptivos
def infer_field_name(field_id, analysis):
    """Infiere el nombre del custom field basado en su contenido"""
    
    # Análisis de samples
    samples = analysis["samples"]
    if not samples:
        return "Unknown (always null)"
    
    sample_str = str(samples[0]).lower() if samples else ""
    
    # Patrones comunes
    if "sprint" in sample_str or "iteration" in sample_str:
        return "Sprint"
    elif "story" in sample_str and "point" in sample_str:
        return "Story Points"
    elif "epic" in sample_str:
        return "Epic Link"
    elif "parent" in sample_str:
        return "Parent Link"
    elif "rank" in sample_str or "|" in sample_str and ":" in sample_str:
        return "Rank/Order"
    elif "team" in sample_str:
        return "Team"
    elif "flagged" in sample_str or "impediment" in sample_str:
        return "Flagged/Impediment"
    elif "dev" in sample_str or "development" in sample_str:
        return "Development Info"
    elif "request" in sample_str and "type" in sample_str:
        return "Request Type"
    elif "organization" in sample_str or "organisations" in sample_str:
        return "Organizations"
    elif "approver" in sample_str or "approval" in sample_str:
        return "Approvals"
    elif "sla" in sample_str or "time to" in sample_str:
        return "SLA Tracking"
    elif "customer" in sample_str or "reporter" in sample_str:
        return "Customer Info"
    elif "satisfaction" in sample_str or "csat" in sample_str:
        return "Satisfaction Rating"
    elif "impact" in sample_str:
        return "Impact"
    elif "urgency" in sample_str:
        return "Urgency"
    elif "category" in sample_str:
        return "Category"
    elif "due" in sample_str and "date" in sample_str:
        return "Due Date"
    elif "target" in sample_str and "date" in sample_str:
        return "Target Date"
    elif isinstance(samples[0], dict):
        # Si es un objeto, ver qué keys tiene
        if "value" in str(samples[0]) and "id" in str(samples[0]):
            return "Select List (Single)"
        elif "displayName" in str(samples[0]):
            return "User Picker"
        else:
            return "Custom Object"
    elif "array" in str(samples[0]).lower():
        return "Multi-Select Field"
    
    # Por tipo de dato
    types = analysis["types"].most_common(1)
    if types:
        main_type = types[0][0]
        if main_type == "str":
            # Si es string, ver el patrón
            if all(len(str(s)) < 20 for s in samples[:3] if s):
                return "Short Text Field"
            else:
                return "Long Text Field"
        elif main_type == "int" or main_type == "float":
            return "Numeric Field"
        elif main_type == "bool":
            return "Checkbox"
    
    return "Unknown Field"

# Generar mapeo
print("="*70)
print("📋 CUSTOM FIELDS IDENTIFICADOS")
print("="*70 + "\n")

field_mapping = {}
usage_stats = []

for field_id, analysis in sorted(custom_field_analysis.items()):
    if analysis["count"] > 0:
        inferred_name = infer_field_name(field_id, analysis)
        usage_pct = ((analysis["count"] - analysis["null_count"]) / analysis["count"]) * 100
        
        field_mapping[field_id] = inferred_name
        usage_stats.append({
            "field_id": field_id,
            "name": inferred_name,
            "usage": usage_pct,
            "count": analysis["count"],
            "non_null": analysis["count"] - analysis["null_count"],
            "types": dict(analysis["types"]),
            "sample": analysis["samples"][0] if analysis["samples"] else None
        })

# Ordenar por uso
usage_stats.sort(key=lambda x: x["usage"], reverse=True)

print(f"Total custom fields encontrados: {len(field_mapping)}\n")

print("Top 30 Custom Fields por uso:\n")
print(f"{'ID':20} {'Nombre Inferido':30} {'Uso':8} {'Sample'}")
print("-" * 100)

for stat in usage_stats[:30]:
    sample = str(stat["sample"])[:40] if stat["sample"] else "N/A"
    print(f"{stat['field_id']:20} {stat['name']:30} {stat['usage']:6.1f}%  {sample}")

# Guardar mapeo
output_file = cache_dir / "custom_fields_mapping.json"
mapping_data = {
    "generated_at": "2025-12-09",
    "total_fields": len(field_mapping),
    "mapping": field_mapping,
    "usage_stats": usage_stats
}

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(mapping_data, f, indent=2, ensure_ascii=False)

print(f"\n💾 Mapeo guardado en: {output_file.name}")

# Categorizar por tipo de funcionalidad
print("\n" + "="*70)
print("📊 CATEGORIZACIÓN POR FUNCIONALIDAD")
print("="*70 + "\n")

categories = {
    "Agile/Scrum": ["Sprint", "Story Points", "Epic Link", "Rank/Order"],
    "Service Desk": ["Request Type", "Organizations", "SLA Tracking", "Customer Info", "Satisfaction Rating"],
    "Planning": ["Due Date", "Target Date", "Urgency", "Impact"],
    "Team Management": ["Team", "Approvals", "User Picker"],
    "Metadata": ["Category", "Flagged/Impediment", "Development Info"],
    "Generic": ["Short Text Field", "Long Text Field", "Numeric Field", "Checkbox", "Select List (Single)", "Multi-Select Field"]
}

categorized = defaultdict(list)
for stat in usage_stats:
    name = stat["name"]
    categorized_flag = False
    for category, keywords in categories.items():
        if name in keywords:
            categorized[category].append(stat)
            categorized_flag = True
            break
    if not categorized_flag:
        categorized["Other"].append(stat)

for category, fields in sorted(categorized.items()):
    if fields:
        print(f"📁 {category} ({len(fields)} fields):")
        for field in fields[:5]:  # Top 5 por categoría
            print(f"   • {field['field_id']:20} → {field['name']:30} ({field['usage']:.1f}%)")
        if len(fields) > 5:
            print(f"   ... y {len(fields) - 5} más")
        print()

print("="*70)
print("✅ Análisis completo")
print("="*70)
