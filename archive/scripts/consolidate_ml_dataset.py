#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Consolidador de Dataset ML
Combina TODOS los tickets (activos + descartados) de todos los proyectos
para entrenamiento de modelos ML
"""
import gzip
import json
from pathlib import Path
from datetime import datetime
print("="*70)
print("🔄 CONSOLIDANDO DATASET COMPLETO PARA ML")
print("="*70 + "\n")
# Directorios
cache_dir = Path("C:/Users/rafae/data/cache/projects")
output_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
output_dir.mkdir(parents=True, exist_ok=True)
active_tickets = []
discarded_tickets = []
stats = {
    "total": 0,
    "activos": 0,
    "descartados": 0,
    "por_proyecto": {},
    "por_estado": {}
}
print("📥 Cargando tickets de todos los proyectos...\n")
# Cargar tickets activos
for active_file in sorted(cache_dir.glob("*_active_tickets.json.gz")):
    project_key = active_file.name.replace("_active_tickets.json.gz", "")
    with gzip.open(active_file, "rt", encoding="utf-8") as f:
        tickets = json.load(f)
    print(f"  ✓ {project_key:8} - {len(tickets):5,} tickets activos")
    # Agregar metadatos
    for ticket in tickets:
        ticket["_ml_category"] = "active"
        ticket["_ml_project"] = project_key
        active_tickets.append(ticket)
    stats["activos"] += len(tickets)
    stats["por_proyecto"][project_key] = {
        "activos": len(tickets),
        "descartados": 0
    }
# Cargar tickets descartados
print("\n📥 Cargando tickets descartados...\n")
for discarded_file in sorted(cache_dir.glob("*_discarded_tickets.json.gz")):
    project_key = discarded_file.name.replace("_discarded_tickets.json.gz", "")
    with gzip.open(discarded_file, "rt", encoding="utf-8") as f:
        tickets = json.load(f)
    if tickets:
        print(f"  ✓ {project_key:8} - {len(tickets):5,} tickets descartados")
        # Agregar metadatos
        for ticket in tickets:
            ticket["_ml_category"] = "discarded"
            ticket["_ml_project"] = project_key
            discarded_tickets.append(ticket)
        stats["descartados"] += len(tickets)
        if project_key in stats["por_proyecto"]:
            stats["por_proyecto"][project_key]["descartados"] = len(tickets)
stats["total"] = len(active_tickets) + len(discarded_tickets)
all_tickets = active_tickets + discarded_tickets
# Analizar estados
print("\n📊 Analizando distribución de estados...\n")
for ticket in all_tickets:
    status = ticket.get("fields", {}).get("status", {}).get("name", "Unknown")
    stats["por_estado"][status] = stats["por_estado"].get(status, 0) + 1
# Guardar datasets por separado con prefijos
print(f"💾 Guardando datasets...\n")
# Activos
active_file = output_dir / "active_ml_tickets.json.gz"
with gzip.open(active_file, "wt", encoding="utf-8") as f:
    json.dump(active_tickets, f, indent=2, ensure_ascii=False)
active_size_mb = active_file.stat().st_size / (1024 * 1024)
print(f"  ✓ Activos: {active_file.name} ({active_size_mb:.2f} MB)")
# Descartados
discarded_file = output_dir / "discarded_ml_tickets.json.gz"
with gzip.open(discarded_file, "wt", encoding="utf-8") as f:
    json.dump(discarded_tickets, f, indent=2, ensure_ascii=False)
discarded_size_mb = discarded_file.stat().st_size / (1024 * 1024)
print(f"  ✓ Descartados: {discarded_file.name} ({discarded_size_mb:.2f} MB)")
# Consolidado completo (todos juntos)
full_file = output_dir / "full_ml_tickets.json.gz"
with gzip.open(full_file, "wt", encoding="utf-8") as f:
    json.dump(all_tickets, f, indent=2, ensure_ascii=False)
full_size_mb = full_file.stat().st_size / (1024 * 1024)
print(f"  ✓ Completo: {full_file.name} ({full_size_mb:.2f} MB)")
total_size_mb = active_size_mb + discarded_size_mb
# Guardar metadatos
metadata_file = output_dir / "ml_dataset_metadata.json"
metadata = {
    "created_at": datetime.now().isoformat(),
    "total_tickets": stats["total"],
    "active_tickets": stats["activos"],
    "discarded_tickets": stats["descartados"],
    "projects": stats["por_proyecto"],
    "status_distribution": dict(sorted(stats["por_estado"].items(), key=lambda x: x[1], reverse=True)),
    "source": "JIRA REST API - Smart Range Fetcher",
    "files": {
        "active": active_file.name,
        "discarded": discarded_file.name,
        "full": full_file.name
    }
}
with open(metadata_file, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)
print(f"  ✓ Metadatos: {metadata_file.name}")
# Resumen
print("\n" + "="*70)
print("✅ CONSOLIDACIÓN COMPLETA")
print("="*70)
print(f"\n📊 Total tickets: {stats['total']:,}")
print(f"  ├─ Activos: {stats['activos']:,} ({stats['activos']/stats['total']*100:.1f}%)")
print(f"  └─ Descartados: {stats['descartados']:,} ({stats['descartados']/stats['total']*100:.1f}%)")
print(f"\n📦 Proyectos: {len(stats['por_proyecto'])}")
print(f"📋 Estados únicos: {len(stats['por_estado'])}")
print(f"\n💾 Ubicación: {output_dir.absolute()}")
print(f"📁 Archivos generados:")
print(f"  • {active_file.name} ({active_size_mb:.2f} MB)")
print(f"  • {discarded_file.name} ({discarded_size_mb:.2f} MB)")
print(f"  • {full_file.name} ({full_size_mb:.2f} MB)")
print(f"  • {metadata_file.name}")
print("\n" + "="*70)
print("🚀 Datasets listos para entrenamiento ML!")
print("  📌 Usa active_ml_tickets.json.gz para patrones normales")
print("  📌 Usa discarded_ml_tickets.json.gz para detectar duplicados/cancelaciones")
print("  📌 Usa full_ml_tickets.json.gz para análisis completo")
print("="*70)
