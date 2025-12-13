import json

data = json.load(open('C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache/custom_fields_mapping.json', 'r'))

print('='*70)
print('🏆 TOP 20 CUSTOM FIELDS MÁS IMPORTANTES')
print('='*70 + '\n')

for i, s in enumerate(data['usage_stats'][:20], 1):
    print(f"{i:2}. {s['field_id']:22} → {s['name']:30} ({s['usage']:.1f}%)")

print('\n' + '='*70)
print('📊 RESUMEN POR CATEGORÍA')
print('='*70 + '\n')

categories = {}
for stat in data['usage_stats']:
    name = stat['name']
    if name not in categories:
        categories[name] = 0
    categories[name] += 1

for name, count in sorted(categories.items(), key=lambda x: x[1], reverse=True)[:10]:
    print(f"  • {name:30} : {count} campos")
