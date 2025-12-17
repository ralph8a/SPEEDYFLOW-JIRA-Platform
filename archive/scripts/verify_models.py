#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Verificar modelos ML entrenados
"""
from pathlib import Path
import json
models_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/models")
print("="*70)
print("📊 VERIFICACIÓN DE MODELOS ML - SPEEDYFLOW")
print("="*70 + "\n")
# Modelos esperados
expected_models = {
    "Modelos Base": [
        ("duplicate_detector.keras", "Detector de Duplicados"),
        ("priority_classifier.keras", "Clasificador de Prioridad"),
        ("breach_predictor.keras", "Predictor de SLA Breach"),
    ],
    "ML Suggester": [
        ("assignee_suggester.keras", "Sugerencia de Assignee"),
        ("labels_suggester.keras", "Sugerencia de Labels"),
        ("issuetype_suggester.keras", "Sugerencia de Issue Type"),
        ("status_suggester.keras", "Sugerencia de Status"),
        ("project_classifier.keras", "Clasificador de Proyecto"),
    ],
    "Encoders": [
        ("label_encoders.pkl", "Encoders Base"),
        ("assignee_encoder.pkl", "Encoder Assignee"),
        ("labels_binarizer.pkl", "Binarizer Labels"),
        ("issuetype_encoder.pkl", "Encoder Issue Type"),
        ("status_encoder.pkl", "Encoder Status"),
        ("project_encoder.pkl", "Encoder Project"),
    ]
}
# Verificar modelos
results = {}
total_found = 0
total_expected = 0
for category, models in expected_models.items():
    print(f"📦 {category}:")
    print(f"{'-'*70}\n")
    category_results = []
    for filename, description in models:
        total_expected += 1
        path = models_dir / filename
        if path.exists():
            size_mb = path.stat().st_size / (1024 * 1024)
            status = f"✅ {description:35} ({size_mb:.2f} MB)"
            category_results.append({"found": True, "file": filename, "size": size_mb})
            total_found += 1
        else:
            status = f"❌ {description:35} NO ENCONTRADO"
            category_results.append({"found": False, "file": filename})
        print(f"  {status}")
    results[category] = category_results
    print()
# Verificar checkpoints
checkpoints_dir = models_dir / "checkpoints"
if checkpoints_dir.exists():
    print(f"📁 Checkpoints:")
    print(f"{'-'*70}\n")
    checkpoint_files = list(checkpoints_dir.glob("*.h5"))
    if checkpoint_files:
        for ckpt in checkpoint_files:
            size_mb = ckpt.stat().st_size / (1024 * 1024)
            print(f"  ✅ {ckpt.name:40} ({size_mb:.2f} MB)")
    else:
        print(f"  ⚠️ No hay checkpoints")
    print()
# Resumen
print("="*70)
print("📊 RESUMEN")
print("="*70 + "\n")
print(f"Total modelos encontrados: {total_found}/{total_expected}")
completion = (total_found / total_expected) * 100
print(f"Completitud: {completion:.1f}%")
if completion == 100:
    print("\n🎉 ¡TODOS LOS MODELOS DISPONIBLES!")
elif completion >= 60:
    print(f"\n⚠️ Faltan {total_expected - total_found} modelos")
else:
    print(f"\n❌ Sistema incompleto - faltan {total_expected - total_found} modelos")
# Guardar reporte
report = {
    "total_expected": total_expected,
    "total_found": total_found,
    "completion_percentage": completion,
    "results": results
}
report_file = models_dir / "models_verification_report.json"
with open(report_file, 'w') as f:
    json.dump(report, f, indent=2)
print(f"\n💾 Reporte guardado: {report_file.name}")
print("\n" + "="*70)
