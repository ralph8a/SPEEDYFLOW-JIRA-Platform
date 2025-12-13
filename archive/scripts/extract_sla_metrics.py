#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Extraer métricas SLA completas + identificar transiciones que pausan el SLA
"""
import gzip
import json
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime

cache_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
dataset_file = cache_dir / "active_ml_tickets.json.gz"
output_file = cache_dir / "sla_metrics_with_transitions.json.gz"

print("="*70)
print("📊 EXTRACCIÓN DE MÉTRICAS SLA + ANÁLISIS DE TRANSICIONES")
print("="*70 + "\n")

with gzip.open(dataset_file, "rt", encoding="utf-8") as f:
    tickets = json.load(f)

print(f"✅ {len(tickets):,} tickets cargados\n")

# Contadores para análisis
sla_stats = {
    "total_tickets": 0,
    "tickets_with_sla": 0,
    "total_cycles": 0,
    "breached_cycles": 0,
    "paused_cycles": 0,
    "within_calendar": 0
}

# Analizar transiciones que coinciden con pausas
status_when_paused = Counter()
status_transitions = Counter()
transition_patterns = defaultdict(list)

enriched_tickets = []

print("🔬 Procesando tickets y extrayendo métricas SLA...\n")

for idx, ticket in enumerate(tickets):
    ticket_key = ticket.get("key")
    fields = ticket.get("fields", {})
    changelog = ticket.get("changelog", {})
    
    sla_stats["total_tickets"] += 1
    
    # Extraer datos SLA
    ticket_sla_data = {
        "ticket_key": ticket_key,
        "has_sla": False,
        "sla_cycles": [],
        "current_status": fields.get("status", {}).get("name"),
        "status_history": []
    }
    
    # Procesar changelog para obtener historial de estados
    histories = changelog.get("histories", [])
    for history in histories:
        created = history.get("created")
        for item in history.get("items", []):
            if item.get("field") == "status":
                ticket_sla_data["status_history"].append({
                    "timestamp": created,
                    "from": item.get("fromString"),
                    "to": item.get("toString"),
                    "epochMillis": None  # Calcularemos después si es necesario
                })
    
    # Buscar campos SLA
    sla_found = False
    for field_key, field_value in fields.items():
        if not field_key.startswith("customfield_") or not isinstance(field_value, dict):
            continue
        
        sla_name = field_value.get("name")
        if not sla_name:
            continue
        
        # Procesar completed cycles
        completed = field_value.get("completedCycles", [])
        for cycle in completed:
            sla_found = True
            sla_stats["total_cycles"] += 1
            
            cycle_data = {
                "sla_name": sla_name,
                "sla_field": field_key,
                "type": "completed",
                "start_millis": cycle.get("startTime", {}).get("epochMillis"),
                "stop_millis": cycle.get("stopTime", {}).get("epochMillis"),
                "breach_millis": cycle.get("breachTime", {}).get("epochMillis"),
                "breached": cycle.get("breached", False),
                "goal_duration_millis": cycle.get("goalDuration", {}).get("millis"),
                "elapsed_time_millis": cycle.get("elapsedTime", {}).get("millis"),
                "remaining_time_millis": cycle.get("remainingTime", {}).get("millis"),
                "paused": False,  # Los completed no tienen paused
                "within_calendar": None
            }
            
            # Calcular tiempo pausado
            if cycle_data["start_millis"] and cycle_data["stop_millis"] and cycle_data["elapsed_time_millis"]:
                total_time = cycle_data["stop_millis"] - cycle_data["start_millis"]
                paused_time = total_time - cycle_data["elapsed_time_millis"]
                cycle_data["total_time_millis"] = total_time
                cycle_data["paused_time_millis"] = paused_time
                cycle_data["paused_percentage"] = (paused_time / total_time * 100) if total_time > 0 else 0
            
            if cycle.get("breached"):
                sla_stats["breached_cycles"] += 1
            
            ticket_sla_data["sla_cycles"].append(cycle_data)
        
        # Procesar ongoing cycle
        ongoing = field_value.get("ongoingCycle")
        if ongoing:
            sla_found = True
            sla_stats["total_cycles"] += 1
            
            is_paused = ongoing.get("paused", False)
            within_cal = ongoing.get("withinCalendarHours", False)
            
            cycle_data = {
                "sla_name": sla_name,
                "sla_field": field_key,
                "type": "ongoing",
                "start_millis": ongoing.get("startTime", {}).get("epochMillis"),
                "stop_millis": None,
                "breach_millis": ongoing.get("breachTime", {}).get("epochMillis"),
                "breached": ongoing.get("breached", False),
                "goal_duration_millis": ongoing.get("goalDuration", {}).get("millis"),
                "elapsed_time_millis": ongoing.get("elapsedTime", {}).get("millis"),
                "remaining_time_millis": ongoing.get("remainingTime", {}).get("millis"),
                "paused": is_paused,
                "within_calendar": within_cal
            }
            
            if is_paused:
                sla_stats["paused_cycles"] += 1
                # Registrar el estado actual cuando está pausado
                current_status = ticket_sla_data["current_status"]
                if current_status:
                    status_when_paused[current_status] += 1
            
            if within_cal:
                sla_stats["within_calendar"] += 1
            
            if ongoing.get("breached"):
                sla_stats["breached_cycles"] += 1
            
            ticket_sla_data["sla_cycles"].append(cycle_data)
    
    if sla_found:
        sla_stats["tickets_with_sla"] += 1
        ticket_sla_data["has_sla"] = True
    
    # Analizar patrones de transición
    for i, transition in enumerate(ticket_sla_data["status_history"]):
        from_status = transition["from"]
        to_status = transition["to"]
        if from_status and to_status:
            status_transitions[f"{from_status} → {to_status}"] += 1
    
    enriched_tickets.append(ticket_sla_data)
    
    if (idx + 1) % 1000 == 0:
        print(f"  ✓ Procesados: {idx + 1:,}/{len(tickets):,}")

print(f"\n✅ Procesamiento completo\n")

# Guardar datos enriquecidos
print("💾 Guardando métricas SLA...\n")
with gzip.open(output_file, "wt", encoding="utf-8") as f:
    json.dump(enriched_tickets, f, indent=2, ensure_ascii=False)

size_mb = output_file.stat().st_size / (1024 * 1024)
print(f"  ✓ Archivo: {output_file.name} ({size_mb:.2f} MB)")

# Resumen
print("\n" + "="*70)
print("📊 RESUMEN DE MÉTRICAS SLA")
print("="*70 + "\n")

print(f"Total tickets: {sla_stats['total_tickets']:,}")
print(f"Tickets con SLA: {sla_stats['tickets_with_sla']:,} ({sla_stats['tickets_with_sla']/sla_stats['total_tickets']*100:.1f}%)")
print(f"Total ciclos SLA: {sla_stats['total_cycles']:,}")
print(f"  ├─ Breached: {sla_stats['breached_cycles']:,} ({sla_stats['breached_cycles']/sla_stats['total_cycles']*100:.1f}%)")
print(f"  ├─ Pausados (ongoing): {sla_stats['paused_cycles']:,}")
print(f"  └─ Dentro calendario: {sla_stats['within_calendar']:,}")

# Estados cuando está pausado
print("\n" + "="*70)
print("⏸️ ESTADOS CUANDO EL SLA ESTÁ PAUSADO")
print("="*70 + "\n")

if status_when_paused:
    print("Top 10 estados con SLA pausado:\n")
    for status, count in status_when_paused.most_common(10):
        pct = (count / sla_stats['paused_cycles'] * 100) if sla_stats['paused_cycles'] > 0 else 0
        print(f"  {count:3} ({pct:5.1f}%) - {status}")
else:
    print("❌ No hay ciclos pausados en el dataset")

# Transiciones más comunes
print("\n" + "="*70)
print("🔄 TRANSICIONES DE ESTADO MÁS COMUNES")
print("="*70 + "\n")

print("Top 20 transiciones:\n")
for transition, count in status_transitions.most_common(20):
    print(f"  {count:4}x - {transition}")

# Inferir transiciones que pausan
print("\n" + "="*70)
print("🎯 TRANSICIONES QUE PROBABLEMENTE PAUSAN EL SLA")
print("="*70 + "\n")

pause_keywords = ["esperando", "waiting", "pendiente", "pending", "cliente", "customer", 
                  "paused", "pausado", "hold", "blocked", "bloqueado"]

likely_pause_states = set()
for status in status_when_paused.keys():
    status_lower = status.lower()
    if any(keyword in status_lower for keyword in pause_keywords):
        likely_pause_states.add(status)

if likely_pause_states:
    print("Estados que probablemente pausan el SLA:\n")
    for status in sorted(likely_pause_states):
        count = status_when_paused[status]
        print(f"  ⏸️ {status} ({count} ocurrencias)")
else:
    print("No se identificaron estados explícitos de pausa")
    print("\nEstados encontrados cuando hay pausa:")
    for status, count in status_when_paused.most_common(10):
        print(f"  • {status} ({count}x)")

print("\n" + "="*70)
print("✅ Análisis completo")
print("="*70)
