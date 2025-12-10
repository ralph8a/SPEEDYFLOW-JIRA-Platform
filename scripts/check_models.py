#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Verificar modelos ML existentes
"""
from pathlib import Path
import os

models_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/models")

print("="*70)
print("📦 MODELOS ML - ESTADO ACTUAL")
print("="*70 + "\n")

# Modelos esperados
expected_models = {
    "Core Models": [
        "duplicate_detector.keras",
        "priority_classifier.keras",
        "breach_predictor.keras"
    ],
    "Suggester Models": [
        "assignee_suggester.keras",
        "labels_suggester.keras",
        "issuetype_suggester.keras"
    ],
    "Encoders": [
        "label_encoders.pkl",
        "assignee_encoder.pkl",
        "labels_binarizer.pkl",
        "issuetype_encoder.pkl"
    ]
}

total_found = 0
total_expected = sum(len(models) for models in expected_models.values())

for category, models in expected_models.items():
    print(f"📁 {category}:")
    for model in models:
        path = models_dir / model
        if path.exists():
            size = path.stat().st_size / (1024 * 1024)
            print(f"  ✅ {model:35} ({size:.2f} MB)")
            total_found += 1
        else:
            print(f"  ❌ {model:35} (No encontrado)")
    print()

# Checkpoints
checkpoint_dir = models_dir / "checkpoints"
if checkpoint_dir.exists():
    print(f"📁 Checkpoints:")
    for file in checkpoint_dir.glob("*.h5"):
        size = file.stat().st_size / (1024 * 1024)
        print(f"  ✅ {file.name:35} ({size:.2f} MB)")
    print()

# Resumen
print("="*70)
print(f"📊 RESUMEN: {total_found}/{total_expected} modelos encontrados ({total_found/total_expected*100:.1f}%)")
print("="*70)

if total_found == total_expected:
    print("\n✅ Todos los modelos están completos y listos para usar\n")
elif total_found >= 3:
    print(f"\n⚠️  {total_expected - total_found} modelos pendientes de entrenamiento\n")
else:
    print(f"\n❌ Faltan {total_expected - total_found} modelos. Ejecuta train_ml_models.py y train_ml_suggester.py\n")
