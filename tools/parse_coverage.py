import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COVERAGE_FILE = ROOT / 'Coverage-20251216T152636.json'
OUT_FILE = ROOT / 'coverage-report.json'

def normalize_path(url):
    # Prefer path under /static/js/ if available
    if '/static/js/' in url:
        return url.split('/static/js/')[-1]
    # fallback to last 3 segments
    parts = url.split('/')
    return '/'.join(parts[-3:])

def used_bytes(entry):
    ranges = entry.get('ranges') or []
    used = 0
    for r in ranges:
        start = r.get('start',0)
        end = r.get('end',0)
        used += max(0, end - start)
    return used

def total_bytes(entry):
    text = entry.get('text') or ''
    return len(text)

def main():
    if not COVERAGE_FILE.exists():
        print(f'Coverage file not found: {COVERAGE_FILE}')
        return

    data = json.loads(COVERAGE_FILE.read_text(encoding='utf-8'))
    rows = []
    for e in data:
        url = e.get('url') or ''
        # focus on JS under /static/js or views JS
        if '/static/js/' not in url and not url.endswith('.js') and '/views/' not in url:
            continue
        total = total_bytes(e)
        used = used_bytes(e)
        pct = (used / total) if total else 0.0
        rows.append({
            'url': url,
            'path': normalize_path(url),
            'used': used,
            'total': total,
            'used_pct': round(pct * 100, 2)
        })

    rows.sort(key=lambda r: r['used_pct'])

    # write full report
    OUT_FILE.write_text(json.dumps(rows, indent=2), encoding='utf-8')
    print(f'Wrote {OUT_FILE} with {len(rows)} entries')

    # print top low-coverage files
    print('\nLow coverage files (lowest first):')
    print(f"{'pct':>6}  {'size':>8}  path")
    for r in rows[:50]:
        print(f"{r['used_pct']:6.2f}%  {r['total']:8d}  {r['path']}")

if __name__ == '__main__':
    main()
