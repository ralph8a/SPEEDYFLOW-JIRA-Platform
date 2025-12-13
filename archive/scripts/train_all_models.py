#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script Maestro - Ejecutar todos los entrenamientos ML
"""
import subprocess
import sys
from pathlib import Path
import time

print("="*70)
print("🚀 SPEEDYFLOW ML TRAINING - PIPELINE COMPLETO")
print("="*70 + "\n")

scripts_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/scripts")

# Scripts a ejecutar en orden
scripts = [
    {
        "name": "Preprocesamiento de Datos",
        "file": "preprocess_ml_data.py",
        "required": True
    },
    {
        "name": "Modelos Base (Duplicados, Prioridad, SLA)",
        "file": "train_ml_models.py",
        "required": True
    },
    {
        "name": "ML Suggester Batch 1 (Assignee + Labels)",
        "file": "train_suggester_batch1.py",
        "required": False
    },
    {
        "name": "ML Suggester Batch 2 (IssueType + Status + Project)",
        "file": "train_suggester_batch2.py",
        "required": False
    }
]

results = []

for i, script in enumerate(scripts, 1):
    print(f"\n{'='*70}")
    print(f"📦 PASO {i}/{len(scripts)}: {script['name']}")
    print(f"{'='*70}\n")
    
    script_path = scripts_dir / script['file']
    
    if not script_path.exists():
        print(f"❌ Script no encontrado: {script_path}")
        if script['required']:
            print("❌ Script requerido faltante. Abortando.")
            sys.exit(1)
        continue
    
    start_time = time.time()
    
    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=False,
            text=True,
            check=True
        )
        
        elapsed = time.time() - start_time
        results.append({
            "name": script['name'],
            "status": "✅ EXITOSO",
            "time": elapsed
        })
        
        print(f"\n✅ Completado en {elapsed:.1f}s\n")
        
    except subprocess.CalledProcessError as e:
        elapsed = time.time() - start_time
        results.append({
            "name": script['name'],
            "status": "❌ ERROR",
            "time": elapsed
        })
        
        print(f"\n❌ Error en {script['name']}")
        
        if script['required']:
            print("❌ Script requerido falló. Abortando pipeline.")
            sys.exit(1)
        else:
            print("⚠️ Script opcional falló. Continuando...\n")
    
    except KeyboardInterrupt:
        print("\n⚠️ Proceso interrumpido por el usuario")
        sys.exit(1)

# Resumen final
print("\n" + "="*70)
print("📊 RESUMEN FINAL DEL PIPELINE")
print("="*70 + "\n")

total_time = sum(r['time'] for r in results)

for result in results:
    status_icon = result['status']
    name = result['name']
    time_str = f"{result['time']:.1f}s"
    print(f"{status_icon} {name:50} {time_str:>10}")

print(f"\n⏱️ Tiempo total: {total_time:.1f}s ({total_time/60:.1f} min)")

success_count = sum(1 for r in results if "✅" in r['status'])
print(f"\n📊 Completados: {success_count}/{len(results)}")

if success_count == len(results):
    print("\n🎉 ¡TODOS LOS MODELOS ENTRENADOS EXITOSAMENTE!")
else:
    print(f"\n⚠️ {len(results) - success_count} modelos fallaron")

print("\n" + "="*70)
