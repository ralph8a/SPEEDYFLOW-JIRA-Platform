import json
from collections import Counter

# Cargar cache
with open('data/cache/msm_issues.json', encoding='utf-8') as f:
    data = json.load(f)

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
