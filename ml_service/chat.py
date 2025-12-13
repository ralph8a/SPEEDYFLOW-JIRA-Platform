import os
from typing import List
from pathlib import Path
import re
import hashlib

class ChatEngine:
    """Simple keyword-based retriever over local docs for technical chat."""
    def __init__(self, docs_dir: str = None):
        self.docs_dir = Path(docs_dir) if docs_dir else Path(__file__).resolve().parent / 'docs'
        self.documents = []
        self._load_docs()

    def _load_docs(self):
        if not self.docs_dir.exists():
            return
        seen = set()
        for p in self.docs_dir.glob('*.txt'):
            text = p.read_text(encoding='utf-8', errors='ignore')
            key = hashlib.md5(text.encode('utf-8')).hexdigest()
            if key in seen:
                continue
            seen.add(key)
            self.documents.append({'path': str(p.name), 'text': text})

        # Also load ticket dataset summaries/comments for conversational help
        try:
            import pandas as pd
            base = Path(__file__).resolve().parents[1] / 'data'
            # load original ticket dataset
            data_path = base / 'comments_dataset.csv'
            if data_path.exists():
                df = pd.read_csv(data_path)
                for i, row in df.iterrows():
                    # Do NOT include labels field in chat documents to avoid mixing labels
                    summary = str(row.get('summary','') or '')
                    comments = str(row.get('comments','') or '')
                    if not summary and not comments:
                        continue
                    text = (summary + '\n\n' + comments).strip()
                    key = hashlib.md5(text.encode('utf-8')).hexdigest()
                    if key in seen:
                        continue
                    seen.add(key)
                    self.documents.append({'path': f'comments_dataset_row_{i}', 'text': text})

            # load augmented dataset if present (do not expose labels)
            aug_path = base / 'comments_dataset_augmented.csv'
            if aug_path.exists():
                df2 = pd.read_csv(aug_path)
                for i, row in df2.iterrows():
                    summary = str(row.get('summary','') or '')
                    comments = str(row.get('comments','') or '')
                    if not summary and not comments:
                        continue
                    text = (summary + '\n\n' + comments).strip()
                    key = hashlib.md5(text.encode('utf-8')).hexdigest()
                    if key in seen:
                        continue
                    seen.add(key)
                    self.documents.append({'path': f'comments_dataset_augmented_row_{i}', 'text': text})
        except Exception:
            # best-effort: ignore if pandas not available or file malformed
            pass

    def _score(self, query: str, text: str) -> int:
        # simple overlap score on words
        qwords = set(re.findall(r"\w+", query.lower()))
        twords = set(re.findall(r"\w+", text.lower()))
        return len(qwords & twords)

    def answer(self, message: str, top_k: int = 2) -> dict:
        """Return top-k matching document snippets and a short synthesis."""
        if not self.documents:
            return {'answer': "No docs available.", 'sources': []}

        scores = []
        for doc in self.documents:
            s = self._score(message, doc['text'])
            scores.append((s, doc))

        scores.sort(key=lambda x: x[0], reverse=True)
        top = [d for score, d in scores[:top_k] if score > 0]

        if not top:
            # fallback: return short summary of all docs
            synth = "I couldn't find a strong match; here are general notes: "
            synth += ' '.join([d['text'][:300].strip() for d in self.documents[:2]])
            return {'answer': synth, 'sources': [d['path'] for d in self.documents[:2]]}

        # build answer from top docs
        snippets = []
        for d in top:
            text = d['text']
            # take first 500 chars as snippet
            snippets.append({'source': d['path'], 'snippet': text[:600].strip()})

        # naive synthesis: return first sentences from snippets
        synth_sentences = []
        for s in snippets:
            sent = re.split(r'[\.!?]\s+', s['snippet'])[0]
            synth_sentences.append(sent)

        answer = ' / '.join(synth_sentences)
        return {'answer': answer, 'sources': [s['source'] for s in snippets], 'snippets': snippets}

    def list_sources(self) -> List[str]:
        return [d['path'] for d in self.documents]
