import gzip
import json
from pathlib import Path

# Directorio con los archivos
cache_dir = Path("C:/Users/rafae/data/cache/projects")

print("="*70)
print("📊 RESUMEN DE EXTRACCIÓN DE TICKETS")
print("="*70 + "\n")

total_activos = 0
total_descartados = 0
proyectos_exitosos = []

# Leer índices de cada proyecto
for index_file in sorted(cache_dir.glob("*_index.json")):
    if index_file.name == "master_index.json":
        continue
    
    with open(index_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    project_key = data.get("project_key", "")
    total = data.get("total", 0)
    active = data.get("active", 0)
    discarded = data.get("discarded", 0)
    
    if total > 0:
        print(f"✅ {project_key:8} | Total: {total:5,} | Activos: {active:5,} | Descartados: {discarded:4,}")
        total_activos += active
        total_descartados += discarded
        proyectos_exitosos.append(project_key)

print("\n" + "="*70)
print(f"📦 Proyectos exitosos: {len(proyectos_exitosos)}")
print(f"📊 Total tickets activos: {total_activos:,}")
print(f"🗑️ Total tickets descartados: {total_descartados:,}")
print(f"🎯 TOTAL GENERAL: {total_activos + total_descartados:,}")
print("="*70)

# Calcular tamaño total
total_size = sum(f.stat().st_size for f in cache_dir.glob("*_active_tickets.json.gz"))
total_size_mb = total_size / (1024 * 1024)
print(f"\n💾 Tamaño total en disco: {total_size_mb:.2f} MB")
print(f"📁 Ubicación: {cache_dir}")
