import os
import json
from typing import Dict, List, Optional


class RAGService:
    """Lightweight Retrieval-Augmented Generation service using Ollama."""

    def __init__(self, data_dir: Optional[str] = None, docs_dir: Optional[str] = None, persist_dir: Optional[str] = None):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        self.data_dir = data_dir or os.path.join(base_dir, "data")
        self.docs_dir = docs_dir or os.path.abspath(os.path.join(base_dir, "..", "Documentation"))
        self.persist_dir = persist_dir or os.path.join(base_dir, ".chroma")
        self.model = os.getenv("OLLAMA_MODEL", "llama3")
        self.embed_model = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
        self._enabled = True
        self._error: Optional[str] = None
        self.collection = None

        try:
            import chromadb  # type: ignore
            import ollama  # type: ignore

            self.chromadb = chromadb
            self.ollama = ollama
        except Exception as exc:  # pragma: no cover - only triggered when deps missing
            self._enabled = False
            self._error = str(exc)
            return

        os.makedirs(self.persist_dir, exist_ok=True)
        self._collection_initialized = False

    def is_ready(self) -> bool:
        if not self._enabled:
            return False
        if not self._collection_initialized:
            self._init_collection()
            self._collection_initialized = True
        return self.collection is not None

    def get_status(self) -> Dict:
        return {
            "enabled": self._enabled,
            "error": self._error,
            "docs_dir": self.docs_dir,
            "data_dir": self.data_dir,
            "persist_dir": self.persist_dir,
        }

    def _init_collection(self) -> None:
        if not self._enabled:
            return

        client = self.chromadb.PersistentClient(path=self.persist_dir)
        self.collection = client.get_or_create_collection(name="tfp_docs", metadata={"hnsw:space": "cosine"})

        if self.collection.count() == 0:
            self._build_index()

    def _build_index(self) -> None:
        documents = self._load_documents()
        if not documents:
            return

        ids: List[str] = []
        texts: List[str] = []
        metadatas: List[Dict] = []
        embeddings: List[List[float]] = []

        for doc in documents:
            for idx, chunk in enumerate(self._split_text(doc["text"])):
                embedding = self._embed_text(chunk)
                if embedding is None:
                    continue

                ids.append(f"{doc['id']}-{idx}")
                texts.append(chunk)
                metadatas.append({"source": doc["source"], "chunk": idx})
                embeddings.append(embedding)

        if not embeddings:
            return

        self.collection.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    def _load_documents(self) -> List[Dict]:
        docs: List[Dict] = []
        sources: List[str] = []

        if os.path.isdir(self.docs_dir):
            sources.extend(self._collect_files(self.docs_dir, extensions={".md", ".txt"}))

        if os.path.isdir(self.data_dir):
            sources.extend(self._collect_files(self.data_dir, extensions={".json"}))

        for path in sources:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                doc_id = os.path.splitext(os.path.basename(path))[0]
                docs.append({"id": doc_id, "source": path, "text": content})
            except Exception:
                continue

        return docs

    def _collect_files(self, root: str, extensions: set) -> List[str]:
        matches: List[str] = []
        for dirpath, _, filenames in os.walk(root):
            for name in filenames:
                if os.path.splitext(name)[1].lower() in extensions:
                    matches.append(os.path.join(dirpath, name))
        return matches

    def _split_text(self, text: str, chunk_size: int = 1000, overlap: int = 150) -> List[str]:
        chunks: List[str] = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start = end - overlap
        return chunks

    def _embed_text(self, text: str) -> Optional[List[float]]:
        try:
            response = self.ollama.embeddings(model=self.embed_model, prompt=text)
            return response.get("embedding")
        except Exception as exc:  # pragma: no cover - external service may fail
            self._enabled = False
            self._error = f"Embedding failed: {exc}"
            return None

    def _query(self, question: str, top_k: int = 4) -> Optional[List[Dict]]:
        embedding = self._embed_text(question)
        if embedding is None or not self.is_ready():
            return None

        results = self.collection.query(query_embeddings=[embedding], n_results=top_k)
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        pairs: List[Dict] = []
        for doc, meta in zip(documents, metadatas):
            pairs.append({"text": doc, "source": meta.get("source"), "chunk": meta.get("chunk")})
        return pairs

    def generate_answer(self, question: str) -> Optional[Dict]:
        if not self.is_ready():
            return None

        matches = self._query(question, top_k=4)
        if not matches:
            return None

        context = "\n\n".join(f"[Source: {m['source']}]\n{m['text']}" for m in matches)

        system_prompt = (
            "Tu es l'assistant TableFacil pour un restaurant. Rédige des réponses courtes et en français. "
            "Utilise uniquement le contexte fourni ci-dessous. "
            "Si la question est hors sujet (pas liée au restaurant, à la réservation, au menu, aux horaires, ou à la gestion), "
            "réponds poliment que tu ne peux aider que sur les sujets liés au restaurant TableFacil. "
            "Si l'information manque dans le contexte, dis-le simplement et propose de redemander."
        )

        user_prompt = (
            f"Contexte:\n{context}\n\nQuestion utilisateur:\n{question}\n\n"
            f"Réponds de manière concise (max 6 phrases). Si la question n'est pas liée au restaurant, dis-le poliment."
        )

        try:
            chat_response = self.ollama.chat(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                options={"temperature": 0.2},
            )
            answer = chat_response.get("message", {}).get("content", "")
        except Exception as exc:  # pragma: no cover - external service may fail
            self._error = f"Ollama chat failed: {exc}"
            return None

        sources = [
            {"source": m.get("source"), "chunk": m.get("chunk"), "snippet": m.get("text", "")[:240]}
            for m in matches
        ]

        return {"message": answer, "sources": sources}
