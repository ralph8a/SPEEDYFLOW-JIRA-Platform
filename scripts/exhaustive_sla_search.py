#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Buscar TODOS los campos en ciclos SLA (completedCycles y ongoingCycle)
"""
import gzip
import json
from pathlib import Path
from collections import Counter

cache_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
dataset_file = cache_dir / "active_ml_tickets.json.gz"

print("="*70)
print("🔍 BÚSQUEDA EXHAUSTIVA DE CAMPOS SLA")
print("="*70 + "\n")

with gzip.open(dataset_file, "rt", encoding="utf-8") as f:
    tickets = json.load(f)

all_cycle_keys = Counter()
paused_examples = []
ongoing_examples = []

print("🔬 Analizando TODOS los ciclos (completedCycles + ongoingCycle)...\n")

for ticket in tickets[:5000]:
    fields = ticket.get("fields", {})
    
    for field_key, field_value in fields.items():
        if not isinstance(field_value, dict):
            continue
        
        # Completed cycles
        completed = field_value.get("completedCycles", [])
        for cycle in completed:
            for key in cycle.keys():
                all_cycle_keys[key] += 1
            
            # Buscar paused
            if "pausedTime" in cycle or "paused" in str(cycle).lower():
                if len(paused_examples) < 3:
                    paused_examples.append({
                        "ticket": ticket.get("key"),
                        "sla": field_value.get("name"),
                        "cycle": cycle
                    })
        
        # Ongoing cycle
        ongoing = field_value.get("ongoingCycle")
        if ongoing:
            for key in ongoing.keys():
                all_cycle_keys[key] += 1
            
            if len(ongoing_examples) < 3:
                ongoing_examples.append({
                    "ticket": ticket.get("key"),
                    "sla": field_value.get("name"),
                    "cycle": ongoing
                })

print("📊 TODOS LOS CAMPOS ENCONTRADOS:\n")
print(f"Total de campos únicos: {len(all_cycle_keys)}\n")

for key, count in all_cycle_keys.most_common():
    pct = (count / 5000) * 100
    print(f"  • {key:30} - {count:5} ocurrencias ({pct:5.1f}%)")

if paused_examples:
    print("\n" + "="*70)
    print("⏸️ EJEMPLOS CON PAUSEDTIME")
    print("="*70)
    
    for ex in paused_examples:
        print(f"\n📋 {ex['ticket']} - {ex['sla']}")
        print(json.dumps(ex['cycle'], indent=2, ensure_ascii=False)[:800])

if ongoing_examples:
    print("\n" + "="*70)
    print("🔄 EJEMPLOS DE ongoingCycle (en progreso)")
    print("="*70)
    
    for ex in ongoing_examples:
        print(f"\n📋 {ex['ticket']} - {ex['sla']}")
        print(json.dumps(ex['cycle'], indent=2, ensure_ascii=False)[:800])

print("\n" + "="*70)
