#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Preparar dataset ML con 1000 tickets balanceados + métricas SLA
"""
import gzip
import json
import random
from pathlib import Path
from collections import defaultdict

cache_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
full_dataset = cache_dir / "full_ml_tickets.json.gz"
output_file = cache_dir / "ml_training_dataset_1000.json.gz"
output_metadata = cache_dir / "ml_training_metadata.json"

print("="*70)
print("📦 PREPARANDO DATASET ML - 1000 TICKETS")
print("="*70 + "\n")

with gzip.open(full_dataset, "rt", encoding="utf-8") as f:
    all_tickets = json.load(f)

print(f"✅ {len(all_tickets):,} tickets cargados\n")

# Estrategia de muestreo balanceado
print("🎯 Estrategia de muestreo:\n")

# Separar por proyecto
tickets_by_project = defaultdict(list)
for ticket in all_tickets:
    project = ticket.get("_ml_project", "UNKNOWN")
    tickets_by_project[project].append(ticket)

print("📊 Distribución original por proyecto:")
for project, tickets in sorted(tickets_by_project.items(), key=lambda x: len(x[1]), reverse=True):
    print(f"  {project:6} - {len(tickets):5,} tickets")

# Seleccionar 1000 tickets balanceados
# Estrategia: proporcional al tamaño del proyecto con mínimo garantizado
total_needed = 1000
selected_tickets = []

# Proyectos prioritarios (más grandes)
priority_projects = ["MSM", "OP", "QA", "DES", "AP", "IN"]

# Asignar cuotas proporcionales
quotas = {}
remaining = total_needed

# Primero asignar a proyectos grandes
for project in priority_projects:
    if project in tickets_by_project:
        available = len(tickets_by_project[project])
        quota = min(int(available * 0.15), available)  # 15% o todos
        quotas[project] = quota
        remaining -= quota

# Distribuir el resto proporcionalmente
other_projects = [p for p in tickets_by_project.keys() if p not in priority_projects]
if other_projects and remaining > 0:
    quota_per_project = remaining // len(other_projects)
    for project in other_projects:
        available = len(tickets_by_project[project])
        quota = min(quota_per_project, available)
        quotas[project] = quota
        remaining -= quota

# Si aún sobra, añadir a MSM
if remaining > 0 and "MSM" in quotas:
    quotas["MSM"] += remaining

print(f"\n🎲 Muestreo balanceado (objetivo: {total_needed}):\n")

for project, quota in sorted(quotas.items(), key=lambda x: x[1], reverse=True):
    available = len(tickets_by_project[project])
    
    # Selección aleatoria
    if quota >= available:
        selected = tickets_by_project[project]
    else:
        selected = random.sample(tickets_by_project[project], quota)
    
    selected_tickets.extend(selected)
    print(f"  {project:6} - {len(selected):3}/{available:,} tickets ({len(selected)/available*100:5.1f}%)")

print(f"\n✅ Total seleccionado: {len(selected_tickets)} tickets\n")

# Enriquecer con métricas SLA
print("📊 Enriqueciendo con métricas SLA...\n")

enriched_tickets = []
sla_stats = {
    "with_sla": 0,
    "breached": 0,
    "paused": 0,
    "avg_elapsed_time": 0,
    "total_cycles": 0
}

for ticket in selected_tickets:
    ticket_key = ticket.get("key")
    fields = ticket.get("fields", {})
    
    # Extraer métricas SLA
    sla_metrics = {
        "has_sla": False,
        "total_cycles": 0,
        "breached_cycles": 0,
        "ongoing_paused": False,
        "avg_elapsed_millis": 0,
        "avg_goal_millis": 0,
        "sla_names": []
    }
    
    all_elapsed = []
    all_goals = []
    
    for field_key, field_value in fields.items():
        if not isinstance(field_value, dict):
            continue
        
        sla_name = field_value.get("name")
        if not sla_name:
            continue
        
        # Completed cycles
        completed = field_value.get("completedCycles", [])
        for cycle in completed:
            sla_metrics["has_sla"] = True
            sla_metrics["total_cycles"] += 1
            sla_metrics["sla_names"].append(sla_name)
            
            if cycle.get("breached"):
                sla_metrics["breached_cycles"] += 1
            
            elapsed = cycle.get("elapsedTime", {}).get("millis")
            goal = cycle.get("goalDuration", {}).get("millis")
            
            if elapsed:
                all_elapsed.append(elapsed)
            if goal:
                all_goals.append(goal)
        
        # Ongoing cycle
        ongoing = field_value.get("ongoingCycle")
        if ongoing:
            sla_metrics["has_sla"] = True
            sla_metrics["total_cycles"] += 1
            sla_metrics["sla_names"].append(sla_name)
            
            if ongoing.get("paused"):
                sla_metrics["ongoing_paused"] = True
            
            if ongoing.get("breached"):
                sla_metrics["breached_cycles"] += 1
    
    # Calcular promedios
    if all_elapsed:
        sla_metrics["avg_elapsed_millis"] = sum(all_elapsed) // len(all_elapsed)
    if all_goals:
        sla_metrics["avg_goal_millis"] = sum(all_goals) // len(all_goals)
    
    # Añadir métricas al ticket
    ticket["_ml_sla"] = sla_metrics
    enriched_tickets.append(ticket)
    
    # Estadísticas
    if sla_metrics["has_sla"]:
        sla_stats["with_sla"] += 1
        sla_stats["total_cycles"] += sla_metrics["total_cycles"]
        if sla_metrics["breached_cycles"] > 0:
            sla_stats["breached"] += 1
        if sla_metrics["ongoing_paused"]:
            sla_stats["paused"] += 1

# Barajar para mezclar proyectos
random.shuffle(enriched_tickets)

# Guardar dataset
print("💾 Guardando dataset de entrenamiento...\n")
with gzip.open(output_file, "wt", encoding="utf-8") as f:
    json.dump(enriched_tickets, f, indent=2, ensure_ascii=False)

size_mb = output_file.stat().st_size / (1024 * 1024)
print(f"  ✓ Archivo: {output_file.name} ({size_mb:.2f} MB)")

# Guardar metadata
metadata = {
    "total_tickets": len(enriched_tickets),
    "projects": dict(quotas),
    "sla_stats": sla_stats,
    "fields_available": {
        "summary": sum(1 for t in enriched_tickets if t.get("fields", {}).get("summary")),
        "description": sum(1 for t in enriched_tickets if t.get("fields", {}).get("description")),
        "status": sum(1 for t in enriched_tickets if t.get("fields", {}).get("status")),
        "priority": sum(1 for t in enriched_tickets if t.get("fields", {}).get("priority")),
        "assignee": sum(1 for t in enriched_tickets if t.get("fields", {}).get("assignee")),
        "comments": sum(1 for t in enriched_tickets if t.get("fields", {}).get("comment", {}).get("comments")),
    },
    "created_at": "2025-12-09",
    "source": "SPEEDYFLOW-JIRA Smart Range Fetcher",
    "sampling_strategy": "Balanced by project with SLA enrichment"
}

with open(output_metadata, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)

print(f"  ✓ Metadata: {output_metadata.name}")

# Resumen
print("\n" + "="*70)
print("📊 RESUMEN DEL DATASET ML")
print("="*70 + "\n")

print(f"Total tickets: {len(enriched_tickets)}")
print(f"\n📦 Por proyecto:")
for project, count in sorted(quotas.items(), key=lambda x: x[1], reverse=True):
    pct = (count / len(enriched_tickets)) * 100
    print(f"  {project:6} - {count:3} tickets ({pct:5.1f}%)")

print(f"\n📊 Métricas SLA:")
print(f"  Con SLA: {sla_stats['with_sla']} ({sla_stats['with_sla']/len(enriched_tickets)*100:.1f}%)")
print(f"  Con breach: {sla_stats['breached']} ({sla_stats['breached']/len(enriched_tickets)*100:.1f}%)")
print(f"  Pausados: {sla_stats['paused']} ({sla_stats['paused']/len(enriched_tickets)*100:.1f}%)")
print(f"  Total ciclos: {sla_stats['total_cycles']:,}")

print(f"\n📋 Campos disponibles:")
for field, count in metadata["fields_available"].items():
    pct = (count / len(enriched_tickets)) * 100
    print(f"  {field:12} - {count:4}/{len(enriched_tickets)} ({pct:5.1f}%)")

print("\n" + "="*70)
print("✅ Dataset listo para entrenamiento ML")
print("="*70)
