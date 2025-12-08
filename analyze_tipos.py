import json
import gzip
from collections import Counter
from pathlib import Path

# Cargar cache (try compressed first)
cache_path_gz = Path('data/cache/msm_issues.json.gz')
cache_path = Path('data/cache/msm_issues.json')

if cache_path_gz.exists():
    print("📦 Loading compressed cache...")
    with gzip.open(cache_path_gz, 'rt', encoding='utf-8') as f:
        data = json.load(f)
elif cache_path.exists():
    print("📄 Loading uncompressed cache...")
    with open(cache_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
else:
    print("❌ No cache file found!")
    exit(1)

# Extraer todos los tipos de solicitud
tipos = []
for issue in data.get('issues', []):
    fields = issue.get('fields', {})
    tipo_field = fields.get('customfield_10156')
    if tipo_field and isinstance(tipo_field, dict):
        valor = tipo_field.get('value')
        if valor:
            tipos.append(valor)

# Contar frecuencia
counter = Counter(tipos)

print("\n=== TIPOS DE SOLICITUD EN EL CACHE ===\n")
for tipo, count in counter.most_common():
    print(f"{count:4d} tickets - {tipo}")

print(f"\n\nTotal tipos únicos: {len(counter)}")
print(f"Total tickets analizados: {len(tipos)}")
