#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Analizar datos en cache para ML training"""
import sys, json, gzip
from pathlib import Path
from collections import Counter
sys.path.insert(0, str(Path(__file__).parent.parent))
# Intentar múltiples fuentes de datos
cache_files = [
    Path(__file__).parent.parent / "data" / "cache" / "ml_preload_cache.json.gz",
    Path(__file__).parent.parent / "data" / "cache" / "msm_issues.json.gz",
]
data = None
cache_file = None
for cf in cache_files:
    if cf.exists():
        print(f"📂 Intentando: {cf.name}")
        print(f"📏 Tamaño: {cf.stat().st_size / (1024):.1f} KB\n")
        try:
            with gzip.open(cf, "rt", encoding="utf-8") as f:
                test_data = json.load(f)
                if isinstance(test_data, list) and len(test_data) > 10:
                    data = test_data
                    cache_file = cf
                    print(f"✅ Archivo válido con {len(test_data)} tickets\n")
                    break
                elif isinstance(test_data, dict) and len(test_data) > 10:
                    # Convertir dict a lista
                    data = list(test_data.values())
                    cache_file = cf
                    print(f"✅ Archivo válido con {len(data)} tickets (convertido de dict)\n")
                    break
        except Exception as e:
            print(f"❌ Error leyendo {cf.name}: {e}\n")
if not data:
    print("❌ No se encontró ningún cache válido")
    sys.exit(1)
try:
    pass  # Continuar con el análisis
    print(f"✅ Total tickets: {len(data):,}")
    if isinstance(data, dict):
        # Analizar estructura
        sample_key = list(data.keys())[0]
        sample = data[sample_key]
        print(f"\n📋 Estructura (ejemplo: {sample_key}):")
        print(f"   Campos: {', '.join(list(sample.keys())[:10])}")
        # Analizar estados
        statuses = []
        priorities = []
        types = []
        for key, issue in data.items():
            if "status" in issue:
                statuses.append(issue.get("status", "Unknown"))
            if "priority" in issue:
                priorities.append(issue.get("priority", "Unknown"))
            if "issuetype" in issue:
                types.append(issue.get("issuetype", "Unknown"))
        print(f"\n📊 Distribución de Estados:")
        for status, count in Counter(statuses).most_common(10):
            print(f"   • {status}: {count:,} ({count/len(data)*100:.1f}%)")
        if priorities:
            print(f"\n📊 Distribución de Prioridades:")
            for priority, count in Counter(priorities).most_common():
                print(f"   • {priority}: {count:,} ({count/len(data)*100:.1f}%)")
        if types:
            print(f"\n📊 Tipos de Tickets:")
            for ticket_type, count in Counter(types).most_common():
                print(f"   • {ticket_type}: {count:,} ({count/len(data)*100:.1f}%)")
        # Filtrar por estados activos vs descartados
        discarded = {"cancelado", "canceled", "cancelled", "duplicado", "duplicate", "cerrado", "closed", "done"}
        active = [k for k, v in data.items() if v.get("status", "").lower() not in discarded]
        discarded_count = len(data) - len(active)
        print(f"\n✨ Clasificación para ML:")
        print(f"   🟢 Activos: {len(active):,} ({len(active)/len(data)*100:.1f}%)")
        print(f"   🔴 Descartados: {discarded_count:,} ({discarded_count/len(data)*100:.1f}%)")
        # Exportar para training
        output_dir = Path(__file__).parent.parent / "data" / "ml_models"
        output_dir.mkdir(parents=True, exist_ok=True)
        active_data = {k: data[k] for k in active}
        active_file = output_dir / "msm_active_training_set.json.gz"
        with gzip.open(active_file, "wt", encoding="utf-8") as f:
            json.dump(active_data, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Dataset de training exportado:")
        print(f"   📁 {active_file}")
        print(f"   📏 {active_file.stat().st_size / (1024*1024):.2f} MB")
        print(f"   📊 {len(active):,} tickets activos")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
