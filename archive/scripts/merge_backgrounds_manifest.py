"""
Merge all generated SVGs in frontend/static/backgrounds/generated into a single manifest.json
"""
import os
import json
from datetime import datetime
OUT_DIR = os.path.join('frontend', 'static', 'backgrounds', 'generated')
MANIFEST_PATH = os.path.join(OUT_DIR, 'manifest.json')
variants = []
if not os.path.isdir(OUT_DIR):
    print('No generated backgrounds directory found:', OUT_DIR)
    raise SystemExit(1)
files = sorted([f for f in os.listdir(OUT_DIR) if f.lower().endswith('.svg') and f.startswith('bg-')])
for fname in files:
    parts = fname[:-4].split('-')  # remove .svg
    # Expected: ['bg','theme','index'] or ['bg','theme','style','index']
    theme = parts[1] if len(parts) > 1 else 'unknown'
    index = parts[-1] if len(parts) > 2 else '0'
    style = '-'.join(parts[2:-1]) if len(parts) > 3 else (parts[2] if len(parts) == 3 else 'UNKNOWN')
    fpath = os.path.join(OUT_DIR, fname)
    mtime = datetime.utcfromtimestamp(os.path.getmtime(fpath)).isoformat() + 'Z'
    variants.append({
        'id': f'{theme}-{style}-{index}',
        'style': style,
        'filename': fname,
        'url': f'/static/backgrounds/generated/{fname}',
        'description': f'{style} - Generated {index}',
        'theme': theme,
        'timestamp': mtime
    })
manifest = {
    'generated_at': datetime.utcnow().isoformat() + 'Z',
    'count': len(variants),
    'variants': variants
}
with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)
print(f'Wrote merged manifest with {len(variants)} variants to {MANIFEST_PATH}')
