"""Stub d'ingestion RAG côté client.
À remplacer par un job qui indexe FAQ/menus/politiques dans un store vectoriel (FAISS/Pinecone).
"""
import json
from pathlib import Path
from typing import List, Dict

DATA_ROOT = Path(__file__).resolve().parent.parent.parent / 'data'


def load_markdown_guides() -> List[Dict]:
    docs = []
    for md in Path(__file__).resolve().parent.parent.parent.glob('*.md'):
        try:
            text = md.read_text(encoding='utf-8')
            docs.append({'title': md.name, 'text': text, 'type': 'guide'})
        except Exception:
            continue
    return docs


def load_menu() -> List[Dict]:
    menu_path = DATA_ROOT / 'recipes.json'
    if not menu_path.exists():
        return []
    try:
        items = json.loads(menu_path.read_text(encoding='utf-8'))
    except Exception:
        return []
    return [{'title': r.get('name'), 'text': json.dumps(r, ensure_ascii=False), 'type': 'menu'} for r in items]


def build_corpus() -> List[Dict]:
    corpus = []
    corpus.extend(load_markdown_guides())
    corpus.extend(load_menu())
    # Ajouter FAQ statiques ici si besoin
    corpus.append({'title': 'FAQ - Annulation', 'text': "Annulation gratuite jusqu'à 3h avant la réservation.", 'type': 'faq'})
    corpus.append({'title': 'FAQ - Horaires', 'text': 'Ouvert 7j/7, 11h-23h.', 'type': 'faq'})
    return corpus


def main():
    corpus = build_corpus()
    print(f"Corpus construit (stub) : {len(corpus)} documents")
    for doc in corpus[:5]:
        print(f"- {doc['title']}")


if __name__ == '__main__':
    main()
