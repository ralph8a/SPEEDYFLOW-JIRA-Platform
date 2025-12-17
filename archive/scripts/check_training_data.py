#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Preparar dataset de training desde ml_training_data.json"""
import json
from pathlib import Path
training_file = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache/ml_training_data.json")
data = json.load(open(training_file, encoding="utf-8"))
samples = data.get("training_samples", [])
print(f"✅ Training samples disponibles: {len(samples)}\n")
if samples:
    print("📋 Estructura del primer sample:")
    sample = samples[0]
    print(f"  Keys: {list(sample.keys())}")
    print(f"\n  Input:")
    for key, val in sample["input"].items():
        if isinstance(val, list):
            print(f"    {key}: {len(val)} items")
        else:
            print(f"    {key}: {str(val)[:50]}")
    print(f"\n  Output:")
    print(f"    Suggestions: {sample['output']['suggestions_count']}")
    print(f"    Model: {sample['output']['model']}")
    print(f"\n📊 Resumen del dataset:")
    print(f"  Total samples: {len(samples)}")
    # Contar por tipo
    types = {}
    for s in samples:
        issue_type = s["input"].get("issue_type", "Unknown")
        types[issue_type] = types.get(issue_type, 0) + 1
    print(f"\n  Por tipo de issue:")
    for t, count in sorted(types.items(), key=lambda x: -x[1]):
        print(f"    • {t}: {count}")
    print(f"\n💾 Listo para entrenar modelos ML!")
    print(f"   Archivo: {training_file}")
    print(f"   Samples: {len(samples)}")
