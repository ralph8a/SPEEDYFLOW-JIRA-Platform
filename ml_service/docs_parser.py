import re
from typing import List, Dict


def extract_endpoints_from_text(text: str) -> List[Dict]:
    results = []
    if not text:
        return results

    # find method + path patterns
    method_path_re = re.compile(r"\b(GET|POST|PUT|DELETE|PATCH|OPTIONS)\b\s+([/][\w\-\{\}:/.]*)", re.IGNORECASE)
    for m in method_path_re.finditer(text):
        method = m.group(1).upper()
        path = m.group(2)
        # capture surrounding context
        start = max(0, m.start() - 80)
        end = min(len(text), m.end() + 80)
        context = text[start:end].strip()
        results.append({'method': method, 'path': path, 'context': context})

    # find full URLs
    url_re = re.compile(r'https?://[^\s,\)\]"\']+(/[\w\-\./\?\=&%#]*)?')
    for m in url_re.finditer(text):
        full = m.group(0)
        path = m.group(1) or '/'
        results.append({'method': None, 'path': path, 'url': full})

    # deduplicate by path+method
    seen = set()
    out = []
    for r in results:
        key = (r.get('method'), r.get('path'))
        if key in seen:
            continue
        seen.add(key)
        out.append(r)

    return out


def extract_playbooks_from_text(text: str) -> List[Dict]:
    playbooks = []
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        ln = lines[i].strip()
        # heading detection
        if re.search(r'^(steps|pasos|procedure|flow|flujo|playbook)\b[:\- ]*', ln, re.IGNORECASE):
            title = ln
            steps = []
            i += 1
            # collect numbered or dash lists
            while i < len(lines):
                l2 = lines[i].strip()
                if not l2:
                    break
                mnum = re.match(r'^(\d+)[\).\-]\s+(.*)', l2)
                mdash = re.match(r'^[\-\*]\s+(.*)', l2)
                if mnum:
                    steps.append(mnum.group(2).strip())
                elif mdash:
                    steps.append(mdash.group(1).strip())
                else:
                    # stop if next heading
                    if re.match(r'^[A-Z][A-Za-z ]{1,40}:?$', l2):
                        break
                    steps.append(l2)
                i += 1
            if steps:
                playbooks.append({'title': title, 'steps': steps})
        else:
            i += 1

    # fallback: find any numbered sequences
    if not playbooks:
        nums_re = re.compile(r'^(\d+)\.\s+(.*)')
        current = []
        for ln in lines:
            m = nums_re.match(ln.strip())
            if m:
                current.append(m.group(2).strip())
            else:
                if current:
                    playbooks.append({'title': 'Procedure', 'steps': current})
                    current = []
        if current:
            playbooks.append({'title': 'Procedure', 'steps': current})

    return playbooks
