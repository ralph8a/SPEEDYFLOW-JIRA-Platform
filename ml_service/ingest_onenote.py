"""Ingest OneNote exported PDF (or any PDF) into ml_service/docs as text chunks."""
from pathlib import Path
import PyPDF2

def pdf_to_text(pdf_path: str) -> str:
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    text_parts = []
    with open(path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            try:
                text_parts.append(page.extract_text() or '')
            except Exception:
                # best-effort
                continue
    raw = '\n\n'.join(text_parts)

    # Redact or remove credential sections and sensitive lines
    # 1) Remove blocks that begin with headings mentioning credentials (English/Spanish)
    lines = raw.splitlines()
    out_lines = []
    skip_block = False
    credential_headings = [r'credentials', r'credenciales', r'api key', r'api keys', r'secrets', r'secretos']
    cred_heading_re = re.compile(r"^\s*(?:" + r"|".join(credential_headings) + r")(?:\b|:).*", re.IGNORECASE)
    sensitive_kv_re = re.compile(r"(?i)\b(api[_-]?key|secret|password|token|bearer|pwd|clave|contraseñ[ae])\b\s*[:=]\s*\S+")

    for ln in lines:
        if skip_block:
            # end block on blank line or on a new section header (simple heuristic: line with 1-5 words capitalized)
            if not ln.strip():
                skip_block = False
            else:
                # continue skipping
                continue

        if cred_heading_re.match(ln):
            skip_block = True
            continue

        # redact inline sensitive key=value patterns
        if sensitive_kv_re.search(ln):
            ln = sensitive_kv_re.sub(lambda m: f"{m.group(1)}: [REDACTED]", ln)

        out_lines.append(ln)

    cleaned = '\n'.join(out_lines)
    return cleaned

def ingest_pdf_to_docs(pdf_path: str, out_dir: str = None, out_name: str = None) -> str:
    out_dir = Path(out_dir) if out_dir else Path(__file__).resolve().parent / 'docs'
    out_dir.mkdir(parents=True, exist_ok=True)
    out_name = out_name or (Path(pdf_path).stem + '.txt')
    text = pdf_to_text(pdf_path)
    out_path = out_dir / out_name
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(text)
    return str(out_path)

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('pdf')
    parser.add_argument('--out', default=None)
    args = parser.parse_args()
    p = ingest_pdf_to_docs(args.pdf, out_dir=args.out)
    print('Ingested to', p)
