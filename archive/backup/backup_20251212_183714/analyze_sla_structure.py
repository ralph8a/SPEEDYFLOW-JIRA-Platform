#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Análisis detallado de estructura SLA completa
"""
import gzip
import json
from pathlib import Path
cache_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
dataset_file = cache_dir / "active_ml_tickets.json.gz"
print("="*70)
print("📊 ANÁLISIS DETALLADO DE ESTRUCTURA SLA")
print("="*70 + "\n")
with gzip.open(dataset_file, "rt", encoding="utf-8") as f:
    tickets = json.load(f)
# Buscar tickets con SLA completado (con datos reales)
sla_field = "customfield_10176"  # Cierre Ticket
sla_samples = []
print(f"🔍 Buscando tickets con SLA completo en {sla_field}...\n")
for ticket in tickets:
    fields = ticket.get("fields", {})
    sla_data = fields.get(sla_field)
    if sla_data and isinstance(sla_data, dict):
        completed_cycles = sla_data.get("completedCycles", [])
        if completed_cycles:  # Tiene ciclos completados
            sla_samples.append({
                "ticket_key": ticket.get("key"),
                "sla_data": sla_data,
                "completed_cycles": len(completed_cycles)
            })
            if len(sla_samples) >= 5:  # Solo primeros 5 ejemplos
                break
if not sla_samples:
    print("❌ No se encontraron tickets con SLA completado\n")
    print("Buscando estructura parcial...\n")
    for ticket in tickets[:100]:
        fields = ticket.get("fields", {})
        sla_data = fields.get(sla_field)
        if sla_data and isinstance(sla_data, dict):
            print(f"📋 Ticket: {ticket.get('key')}")
            print(f"   SLA Keys: {list(sla_data.keys())}")
            print(f"   Completed Cycles: {len(sla_data.get('completedCycles', []))}")
            print()
else:
    print(f"✅ Encontrados {len(sla_samples)} tickets con SLA completo\n")
    for i, sample in enumerate(sla_samples, 1):
        print("="*70)
        print(f"📋 EJEMPLO {i}: {sample['ticket_key']}")
        print("="*70)
        sla_data = sample["sla_data"]
        # Mostrar estructura general
        print(f"\n🔧 Keys principales: {list(sla_data.keys())}\n")
        # Mostrar completedCycles
        cycles = sla_data.get("completedCycles", [])
        print(f"📊 Ciclos completados: {len(cycles)}\n")
        if cycles:
            first_cycle = cycles[0]
            print("🎯 Estructura del primer ciclo:\n")
            print(json.dumps(first_cycle, indent=2, ensure_ascii=False))
            print("\n" + "-"*70)
            # Extraer campos clave
            if "startTime" in first_cycle:
                start = first_cycle["startTime"]
                print(f"\n⏰ Start Time:")
                print(f"   epochMillis: {start.get('epochMillis')}")
                print(f"   ISO8601: {start.get('iso8601')}")
                print(f"   Friendly: {start.get('friendly')}")
            if "stopTime" in first_cycle:
                stop = first_cycle["stopTime"]
                print(f"\n⏱️ Stop Time:")
                print(f"   epochMillis: {stop.get('epochMillis')}")
                print(f"   ISO8601: {stop.get('iso8601')}")
                print(f"   Friendly: {stop.get('friendly')}")
            if "breached" in first_cycle:
                print(f"\n🚨 Breached: {first_cycle.get('breached')}")
            if "paused" in first_cycle:
                print(f"⏸️ Paused: {first_cycle.get('paused')}")
            if "goalDuration" in first_cycle:
                goal = first_cycle.get("goalDuration")
                print(f"\n🎯 Goal Duration:")
                print(f"   millis: {goal.get('millis')}")
                print(f"   friendly: {goal.get('friendly')}")
            if "elapsedTime" in first_cycle:
                elapsed = first_cycle.get("elapsedTime")
                print(f"\n⏳ Elapsed Time:")
                print(f"   millis: {elapsed.get('millis')}")
                print(f"   friendly: {elapsed.get('friendly')}")
            if "remainingTime" in first_cycle:
                remaining = first_cycle.get("remainingTime")
                print(f"\n⌛ Remaining Time:")
                print(f"   millis: {remaining.get('millis')}")
                print(f"   friendly: {remaining.get('friendly')}")
            # Mostrar todas las keys disponibles
            print(f"\n📋 Todas las keys del ciclo:")
            for key in first_cycle.keys():
                value = first_cycle[key]
                if isinstance(value, dict):
                    print(f"   • {key}: {{{', '.join(value.keys())}}}")
                else:
                    print(f"   • {key}: {type(value).__name__}")
        print("\n")
# Resumen de campos SLA
print("\n" + "="*70)
print("📊 RESUMEN DE CAMPOS SLA DISPONIBLES")
print("="*70 + "\n")
all_cycle_keys = set()
for sample in sla_samples:
    cycles = sample["sla_data"].get("completedCycles", [])
    for cycle in cycles:
        all_cycle_keys.update(cycle.keys())
if all_cycle_keys:
    print("Campos disponibles en completedCycles:\n")
    for key in sorted(all_cycle_keys):
        print(f"  ✓ {key}")
else:
    print("❌ No hay ciclos completados para analizar")
print("\n" + "="*70)
