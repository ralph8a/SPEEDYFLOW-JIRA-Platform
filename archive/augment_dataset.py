"""Augment the labeled comments dataset using ingested docs.

Heuristic labeling rules are applied to sentences/paragraphs found in /docs/*.txt
and appended to existing `data/comments_dataset.csv` to produce `data/comments_dataset_augmented.csv`.
"""
from pathlib import Path
import re
import pandas as pd

docs_dir = Path(__file__).resolve().parent / 'docs'
data_path = Path(__file__).resolve().parent.parent / 'data' / 'comments_dataset.csv'
out_path = Path(__file__).resolve().parent.parent / 'data' / 'comments_dataset_augmented.csv'

label_rules = [
    (re.compile(r'\b504\b|timeout|time out|timed out', re.I), 'timeout'),
    (re.compile(r'\b500\b|\b502\b|server error|nullpointer|exception', re.I), 'server-error'),
    (re.compile(r'\bSLA\b|breach|sla', re.I), 'sla'),
    (re.compile(r'assign to|please assign|@\w+', re.I), 'assign'),
    (re.compile(r'login|auth|authentication|token', re.I), 'auth'),
    (re.compile(r'migration|bulk import|migrate', re.I), 'data-migration'),
    (re.compile(r'gateway|502|bad gateway', re.I), 'gateway-error'),
    (re.compile(r'fixed|resolved|closing|closed', re.I), 'fixed'),
]


def extract_texts():
    texts = []
    if not docs_dir.exists():
        return texts
    for p in docs_dir.glob('*.txt'):
        try:
            txt = p.read_text(encoding='utf-8', errors='ignore')
            # split into paragraphs
            parts = [p.strip() for p in re.split(r"\n{2,}", txt) if p.strip()]
            texts.extend(parts)
        except Exception:
            continue
    return texts


def label_text(t: str):
    labels = set()
    for regex, lab in label_rules:
        if regex.search(t):
            labels.add(lab)
    return list(labels)


def main():
    base = pd.read_csv(data_path)
    texts = extract_texts()
    rows = []
    for t in texts:
        labs = label_text(t)
        if not labs:
            continue
        # create short summary from first 120 chars
        summary = (t[:120] + '...') if len(t) > 120 else t
        # IMPORTANT: store heuristic/weak labels separately in `weak_labels` to avoid mixing
        # with ticket ground-truth `labels`. Do NOT overwrite or populate `labels` for
        # docs-derived examples.
        rows.append({
            'summary': summary.replace('\n',' '),
            'comments': t.replace('\n',' '),
            'labels': '',
            'weak_labels': ','.join(labs),
            'source': 'doc'
        })

    if not rows:
        print('No heuristic-labeled texts found in docs')
        # still write a copy of base
        base.to_csv(out_path, index=False)
        print('Wrote', out_path)
        return

    # Keep original labels intact; append docs-derived examples with empty `labels` and
    # `weak_labels` column so they are clearly identified as weak supervision.
    aug_df = pd.DataFrame(rows)
    combined = pd.concat([base, aug_df], ignore_index=True, sort=False)
    # ensure columns order
    cols = ['summary', 'comments', 'labels', 'weak_labels', 'source']
    for c in cols:
        if c not in combined.columns:
            combined[c] = ''
    combined = combined[cols]
    combined.to_csv(out_path, index=False)
    print(f'Augmented dataset created: {out_path} ({len(rows)} new rows)')


if __name__ == '__main__':
    main()
