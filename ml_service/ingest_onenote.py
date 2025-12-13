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
    return '\n\n'.join(text_parts)

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
