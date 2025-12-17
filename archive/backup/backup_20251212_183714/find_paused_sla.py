#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Buscar ciclos SLA con estado paused y otras transiciones
"""
import gzip
import json
from pathlib import Path
cache_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
dataset_file = cache_dir / "active_ml_tickets.json.gz"
print("="*70)
print("🔍 BUSCANDO CICLOS SLA CON ESTADO PAUSED")
print("="*70 + "\n")
with gzip.open(dataset_file, "rt", encoding="utf-8") as f:
    tickets = json.load(f)
# Buscar tickets con ciclos que tengan paused
paused_samples = []
all_cycle_keys = set()
print("🔬 Analizando todos los tickets para ciclos con 'paused'...\n")
for ticket in tickets:
    fields = ticket.get("fields", {})
    # Revisar todos los custom fields que son SLAs
    for field_key, field_value in fields.items():
        if not field_key.startswith("customfield_"):
            continue
        if isinstance(field_value, dict):
            cycles = field_value.get("completedCycles", [])
            for cycle in cycles:
                # Recopilar todas las keys
                all_cycle_keys.update(cycle.keys())
                # Buscar ciclos con paused
                if "paused" in cycle or "pausedTime" in cycle or "withinCalendarHours" in cycle:
                    paused_samples.append({
                        "ticket_key": ticket.get("key"),
                        "sla_field": field_key,
                        "sla_name": field_value.get("name", "Unknown"),
                        "cycle": cycle
                    })
                    if len(paused_samples) >= 10:  # Primeros 10 ejemplos
                        break
            if len(paused_samples) >= 10:
                break
    if len(paused_samples) >= 10:
        break
print(f"📊 Total de keys únicas encontradas en ciclos: {len(all_cycle_keys)}\n")
print("Keys disponibles:")
for key in sorted(all_cycle_keys):
    print(f"  ✓ {key}")
print("\n" + "="*70)
if paused_samples:
    print(f"✅ Encontrados {len(paused_samples)} ciclos con información de pausas\n")
    for i, sample in enumerate(paused_samples[:3], 1):  # Mostrar primeros 3 en detalle
        print("="*70)
        print(f"📋 EJEMPLO {i}: {sample['ticket_key']}")
        print(f"   SLA: {sample['sla_name']} ({sample['sla_field']})")
        print("="*70)
        cycle = sample["cycle"]
        print("\n🔧 Estructura completa del ciclo:\n")
        print(json.dumps(cycle, indent=2, ensure_ascii=False))
        print("\n" + "-"*70)
        print("📊 CAMPOS CLAVE:\n")
        # Mostrar campos de pausa
        if "paused" in cycle:
            print(f"⏸️ Paused: {cycle['paused']}")
        if "pausedTime" in cycle:
            paused_time = cycle["pausedTime"]
            print(f"\n⏸️ Paused Time:")
            print(f"   millis: {paused_time.get('millis')}")
            print(f"   friendly: {paused_time.get('friendly')}")
        if "withinCalendarHours" in cycle:
            within = cycle["withinCalendarHours"]
            print(f"\n📅 Within Calendar Hours:")
            print(f"   millis: {within.get('millis')}")
            print(f"   friendly: {within.get('friendly')}")
        # Tiempo real vs tiempo calendario
        if "elapsedTime" in cycle and "withinCalendarHours" in cycle:
            elapsed = cycle["elapsedTime"]["millis"]
            calendar = cycle["withinCalendarHours"]["millis"]
            diff = elapsed - calendar
            print(f"\n⚖️ Comparación:")
            print(f"   Elapsed Time: {elapsed} ms ({cycle['elapsedTime']['friendly']})")
            print(f"   Calendar Time: {calendar} ms ({cycle['withinCalendarHours']['friendly']})")
            print(f"   Diferencia (pausado): {diff} ms ({diff/3600000:.2f} h)")
        print("\n")
else:
    print("❌ No se encontraron ciclos con 'paused'\n")
    print("Mostrando ciclos con mayor variedad de campos...\n")
    # Buscar el ciclo con más keys
    max_keys_cycle = None
    max_keys_count = 0
    for ticket in tickets[:1000]:
        fields = ticket.get("fields", {})
        for field_key, field_value in fields.items():
            if isinstance(field_value, dict):
                cycles = field_value.get("completedCycles", [])
                for cycle in cycles:
                    if len(cycle.keys()) > max_keys_count:
                        max_keys_count = len(cycle.keys())
                        max_keys_cycle = {
                            "ticket_key": ticket.get("key"),
                            "sla_name": field_value.get("name", "Unknown"),
                            "cycle": cycle
                        }
    if max_keys_cycle:
        print(f"📋 Ciclo con más información ({max_keys_count} campos):")
        print(f"   Ticket: {max_keys_cycle['ticket_key']}")
        print(f"   SLA: {max_keys_cycle['sla_name']}\n")
        print(json.dumps(max_keys_cycle["cycle"], indent=2, ensure_ascii=False)[:1000])
print("\n" + "="*70)
print("📊 RESUMEN DE TODOS LOS CAMPOS ENCONTRADOS EN CICLOS SLA")
print("="*70 + "\n")
print(f"Total de campos únicos: {len(all_cycle_keys)}\n")
# Categorizar campos
time_fields = [k for k in all_cycle_keys if "time" in k.lower() or "millis" in k.lower()]
bool_fields = [k for k in all_cycle_keys if k in ["breached", "paused"]]
other_fields = [k for k in all_cycle_keys if k not in time_fields and k not in bool_fields]
if time_fields:
    print("⏰ Campos de tiempo:")
    for field in sorted(time_fields):
        print(f"  • {field}")
if bool_fields:
    print("\n🔘 Campos booleanos:")
    for field in sorted(bool_fields):
        print(f"  • {field}")
if other_fields:
    print("\n📋 Otros campos:")
    for field in sorted(other_fields):
        print(f"  • {field}")
print("\n" + "="*70)
