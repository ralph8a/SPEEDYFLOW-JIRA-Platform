#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Análisis detallado de pausas por área/proyecto y estados
"""
import gzip
import json
from pathlib import Path
from collections import Counter, defaultdict
cache_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
dataset_file = cache_dir / "active_ml_tickets.json.gz"
print("="*70)
print("📊 ANÁLISIS DE PAUSAS POR ÁREA Y ESTADOS")
print("="*70 + "\n")
with gzip.open(dataset_file, "rt", encoding="utf-8") as f:
    tickets = json.load(f)
print(f"✅ {len(tickets):,} tickets cargados\n")
# Análisis de pausas
pause_by_project = defaultdict(lambda: {
    "count": 0,
    "states": Counter(),
    "sla_names": Counter(),
    "ticket_keys": []
})
pause_by_state = defaultdict(lambda: {
    "count": 0,
    "projects": Counter(),
    "sla_names": Counter(),
    "ticket_keys": []
})
all_paused_tickets = []
print("🔬 Analizando tickets con SLA pausado...\n")
for ticket in tickets:
    ticket_key = ticket.get("key")
    project_key = ticket.get("_ml_project", ticket_key.split("-")[0] if "-" in ticket_key else "UNKNOWN")
    fields = ticket.get("fields", {})
    current_status = fields.get("status", {}).get("name", "Unknown")
    # Buscar ongoing cycles pausados
    has_paused_sla = False
    paused_slas = []
    for field_key, field_value in fields.items():
        if not isinstance(field_value, dict):
            continue
        ongoing = field_value.get("ongoingCycle")
        if ongoing and ongoing.get("paused"):
            has_paused_sla = True
            sla_name = field_value.get("name", "Unknown SLA")
            paused_slas.append({
                "sla_name": sla_name,
                "sla_field": field_key,
                "elapsed_time": ongoing.get("elapsedTime", {}).get("friendly"),
                "remaining_time": ongoing.get("remainingTime", {}).get("friendly"),
                "breached": ongoing.get("breached", False)
            })
            # Estadísticas por proyecto
            pause_by_project[project_key]["count"] += 1
            pause_by_project[project_key]["states"][current_status] += 1
            pause_by_project[project_key]["sla_names"][sla_name] += 1
            if ticket_key not in pause_by_project[project_key]["ticket_keys"]:
                pause_by_project[project_key]["ticket_keys"].append(ticket_key)
            # Estadísticas por estado
            pause_by_state[current_status]["count"] += 1
            pause_by_state[current_status]["projects"][project_key] += 1
            pause_by_state[current_status]["sla_names"][sla_name] += 1
            if ticket_key not in pause_by_state[current_status]["ticket_keys"]:
                pause_by_state[current_status]["ticket_keys"].append(ticket_key)
    if has_paused_sla:
        all_paused_tickets.append({
            "ticket_key": ticket_key,
            "project": project_key,
            "status": current_status,
            "paused_slas": paused_slas,
            "priority": fields.get("priority", {}).get("name", "Unknown"),
            "assignee": fields.get("assignee", {}).get("displayName", "Unassigned"),
            "summary": fields.get("summary", "")[:60]
        })
print(f"✅ Encontrados {len(all_paused_tickets)} tickets con SLA pausado\n")
# Resumen por proyecto/área
print("="*70)
print("📦 PAUSAS POR PROYECTO/ÁREA")
print("="*70 + "\n")
for project, data in sorted(pause_by_project.items(), key=lambda x: x[1]["count"], reverse=True):
    print(f"🔹 {project} - {data['count']} pausas en {len(data['ticket_keys'])} tickets únicos")
    print(f"\n   Estados más comunes:")
    for state, count in data["states"].most_common(5):
        pct = (count / data["count"]) * 100
        print(f"     • {state:35} {count:3} ({pct:5.1f}%)")
    print(f"\n   SLAs pausados:")
    for sla, count in data["sla_names"].most_common(3):
        print(f"     • {sla:35} {count:3}")
    print()
# Resumen por estado
print("="*70)
print("⏸️ PAUSAS POR ESTADO")
print("="*70 + "\n")
for state, data in sorted(pause_by_state.items(), key=lambda x: x[1]["count"], reverse=True):
    print(f"🔸 {state} - {data['count']} pausas en {len(data['ticket_keys'])} tickets únicos")
    print(f"\n   Proyectos afectados:")
    for project, count in data["projects"].most_common(5):
        pct = (count / data["count"]) * 100
        print(f"     • {project:15} {count:3} ({pct:5.1f}%)")
    print(f"\n   SLAs pausados:")
    for sla, count in data["sla_names"].most_common(3):
        print(f"     • {sla:35} {count:3}")
    print()
# Ejemplos de tickets pausados
print("="*70)
print("📋 EJEMPLOS DE TICKETS CON SLA PAUSADO")
print("="*70 + "\n")
for i, ticket in enumerate(all_paused_tickets[:10], 1):
    print(f"{i:2}. {ticket['ticket_key']:10} [{ticket['project']:6}] - {ticket['status']}")
    print(f"    Prioridad: {ticket['priority']:15} | Asignado: {ticket['assignee']}")
    print(f"    Summary: {ticket['summary']}")
    for sla in ticket['paused_slas']:
        breach_icon = "🚨" if sla['breached'] else "✅"
        print(f"    {breach_icon} SLA: {sla['sla_name']}")
        print(f"       Elapsed: {sla['elapsed_time']} | Remaining: {sla['remaining_time']}")
    print()
# Matriz de correlación proyecto-estado
print("="*70)
print("📊 MATRIZ: PROYECTO × ESTADO (Top pausas)")
print("="*70 + "\n")
# Crear matriz
matrix = defaultdict(lambda: defaultdict(int))
for ticket in all_paused_tickets:
    matrix[ticket['project']][ticket['status']] += 1
# Obtener top proyectos y estados
top_projects = sorted(pause_by_project.items(), key=lambda x: x[1]["count"], reverse=True)[:5]
top_states = sorted(pause_by_state.items(), key=lambda x: x[1]["count"], reverse=True)[:5]
print(f"{'Proyecto':12}", end="")
for state, _ in top_states:
    print(f" | {state[:20]:20}", end="")
print(" | TOTAL")
print("-" * 140)
for project, data in top_projects:
    print(f"{project:12}", end="")
    total = 0
    for state, _ in top_states:
        count = matrix[project][state]
        total += count
        print(f" | {count:20}", end="")
    print(f" | {total}")
print("\n" + "="*70)
print("✅ Análisis completo")
print("="*70)
