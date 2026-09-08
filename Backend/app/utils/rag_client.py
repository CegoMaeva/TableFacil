"""RAG client (lightweight) with optional FAISS + SentenceTransformer.
Falls back to keyword scoring if vector stack is unavailable.
"""
from __future__ import annotations
import os
from typing import List, Dict, Any

try:
    import faiss  # type: ignore
    import numpy as np  # type: ignore
    from sentence_transformers import SentenceTransformer  # type: ignore
    _VEC_AVAILABLE = True
except Exception:
    faiss = None  # type: ignore
    np = None  # type: ignore
    SentenceTransformer = None  # type: ignore
    _VEC_AVAILABLE = False

from app.utils import rag_ingestion


class RagClient:
    def __init__(self):
        self.model = None
        self.index = None
        self.corpus: List[Dict[str, Any]] = []
        self.embeddings = None
        self._init_stack()
        self._load_corpus_and_index()

    def _init_stack(self):
        if not _VEC_AVAILABLE:
            return
        try:
            model_name = os.getenv('RAG_EMBED_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
            self.model = SentenceTransformer(model_name)
        except Exception as e:
            print(f"RAG: impossible de charger le modèle d'embedding ({e}), fallback keyword.")
            self.model = None

    def _load_corpus_and_index(self):
        try:
            self.corpus = rag_ingestion.build_corpus()
        except Exception as e:
            print(f"RAG: échec build_corpus ({e}); corpus vide.")
            self.corpus = []
        if not self.corpus:
            return
        if self.model and _VEC_AVAILABLE:
            try:
                texts = [doc.get('text', '') for doc in self.corpus]
                vecs = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
                dim = vecs.shape[1]
                self.index = faiss.IndexFlatIP(dim)
                self.index.add(vecs)
                self.embeddings = vecs
                print(f"RAG: index FAISS prêt ({len(self.corpus)} docs).")
            except Exception as e:
                print(f"RAG: échec création index ({e}); fallback keyword.")
                self.index = None
                self.embeddings = None
        else:
            print("RAG: stack vecteur indisponible, fallback keyword.")

    def _keyword_score(self, text: str, query: str) -> int:
        q_tokens = query.lower().split()
        t_lower = text.lower()
        return sum(1 for t in q_tokens if t in t_lower)

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not query:
            return []
        if self.index is not None and self.model and _VEC_AVAILABLE and self.embeddings is not None and np is not None:
            try:
                q_vec = self.model.encode([query], convert_to_numpy=True, normalize_embeddings=True)
                scores, idxs = self.index.search(q_vec, min(top_k, len(self.corpus)))
                results = []
                for score, idx in zip(scores[0], idxs[0]):
                    doc = self.corpus[int(idx)]
                    results.append({
                        'title': doc.get('title'),
                        'text': doc.get('text'),
                        'type': doc.get('type'),
                        'score': float(score)
                    })
                return results
            except Exception as e:
                print(f"RAG: erreur retrieval vecteur ({e}); fallback keyword.")
        # Fallback: simple keyword overlap
        scored = []
        for doc in self.corpus:
            score = self._keyword_score(doc.get('text', ''), query)
            if score > 0:
                scored.append({
                    'title': doc.get('title'),
                    'text': doc.get('text'),
                    'type': doc.get('type'),
                    'score': score
                })
        scored.sort(key=lambda d: d['score'], reverse=True)
        return scored[:top_k]


_rag_client: RagClient | None = None


def get_rag_client() -> RagClient:
    global _rag_client
    if _rag_client is None:
        _rag_client = RagClient()
    return _rag_client
