"""
Generate and save 10 SVG backgrounds using the existing EnhancedBackgroundGenerator
and write a JSON manifest consumed by the frontend.

Usage:
    python scripts/save_backgrounds.py --theme light --count 10
"""
import os
import json
import argparse
from datetime import datetime

from api.ai_backgrounds import enhanced_generator, get_ai_backgrounds

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def save_variants(theme: str = 'light', count: int = 10):
    out_dir = os.path.join('frontend', 'static', 'backgrounds', 'generated')
    ensure_dir(out_dir)

    # Use the generator to create variants (it returns list of dicts with 'svg')
    # generate_variants creates 5 by default; call generate_svg_background directly for more
    variants = []
    for i in range(count):
        svg = enhanced_generator.generate_svg_background(theme, i)
        # Try to get style name if available
        try:
            style = enhanced_generator.get_style_name(i)
        except Exception:
            style = f'UNIQUE_{i}'
        filename = f'bg-{theme}-{i}.svg'
        path = os.path.join(out_dir, filename)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(svg)

        variants.append({
            'id': f'{theme}-{style}-{i}',
            'style': style,
            'filename': filename,
            'url': f'/static/backgrounds/generated/{filename}',
            'description': f'{style} - Generated {i+1}',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })

    # Write manifest
    manifest = {
        'theme': theme,
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'count': len(variants),
        'variants': variants
    }

    manifest_path = os.path.join(out_dir, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)

    print(f'Wrote {len(variants)} backgrounds to {out_dir}')
    return manifest_path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--theme', default='light', choices=['light', 'dark'])
    parser.add_argument('--count', type=int, default=10)
    args = parser.parse_args()

    save_variants(theme=args.theme, count=args.count)

if __name__ == '__main__':
    main()
