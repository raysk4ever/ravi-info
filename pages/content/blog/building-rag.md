---
title: "Building a RAG App with LlamaIndex"
description: "Build a local RAG pipeline with LlamaIndex, FAISS and Ollama — load documents, chunk and embed them, then query with citations in about 100 lines of Python."
date: "2026-09-21"
tags: ["RAG", "LlamaIndex", "FAISS", "Ollama", "Python"]
image: "/blog-images/building-rag.jpg"
---

You do not need a vector database as a service to experiment with retrieval-augmented generation. On a single laptop you can stand up a working RAG app — real documents, embeddings, a vector index and citations — using LlamaIndex for the orchestration, FAISS as the in-memory vector store and Ollama for local embeddings. This post walks through exactly that, in about 100 lines of Python, and covers the decisions that actually move retrieval quality.

## What you will build

A local RAG pipeline that answers questions about a folder of text documents and shows you which source chunk each answer came from. The architecture is the same one you would use in production: ingest documents, split them into nodes, embed the nodes, store the vectors, and then run a similarity search at query time to feed the most relevant context to the model.

## The stack

- **LlamaIndex** — indexing, node parsing, and the query engine
- **FAISS** — an in-memory vector index, fast enough for thousands of documents
- **Ollama** — runs a local embedding model, so nothing leaves your machine
- **Python 3.10+** — plain functions, no framework magic

```
pip install llama-index llama-index-vector-stores-faiss llama-index-embeddings-ollama faiss-cpu tiktoken
```

If you are on macOS and `faiss-cpu` fails to install, use `brew install libomp` first. On Apple Silicon, the `faiss-cpu` wheel is usually fine; if you hit a segfault, fall back to `faiss` and `IndexFlatIP` (inner-product) instead of `IndexFlatL2`.

## Load and split the documents

LlamaIndex's `SimpleDirectoryReader` reads every text, markdown, PDF or markdown file in a folder. Splitting — chunking — is the single biggest lever on retrieval quality, so prefer a sentence-based parser over naive fixed-size cuts:

```python
from llama_index.core import SimpleDirectoryReader
from llama_index.core.node_parser import SentenceSplitter

documents = SimpleDirectoryReader("data").load_data()

node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=64)
nodes = node_parser.get_nodes_from_documents(documents)

print(f"Loaded {len(documents)} documents -> {len(nodes)} chunks")
```

`chunk_size=512` tokens with `64` tokens of overlap is a sensible default: chunks stay small enough for precise vector matches but large enough to carry context. Lower the chunk size if your answers feel shallow; raise it if they feel clipped.

## Embed with a local model

Ollama exposes models over a local HTTP endpoint. `nomic-embed-text` is a good, small embedding model that LlamaIndex supports out of the box:

```python
from llama_index.core import Settings
from llama_index.embeddings.ollama import OllamaEmbedding

Settings.embed_model = OllamaEmbedding(
    model_name="nomic-embed-text",
    base_url="http://localhost:11434",
)
```

Make sure the model is pulled first: `ollama pull nomic-embed-text`. If the pipeline fails with a connection error, that is almost always Ollama not running, not a code bug.

## Index into FAISS

FAISS gives you an in-process vector store. The embedding model must stay fixed after you index — changing models invalidates existing vectors because their dimensions no longer line up for similarity search.

```python
import faiss
from llama_index.core import StorageContext
from llama_index.vector_stores.faiss import FaissVectorStore

faiss_index = faiss.IndexFlatL2(768)  # 768 dims for nomic-embed-text
vector_store = FaissVectorStore(faiss_index)

storage_context = StorageContext.from_defaults(vector_store=vector_store)
index = VectorStoreIndex(nodes, storage_context=storage_context)
```

Set the FAISS dimension to the embedding model's output size. For `nomic-embed-text` that is `768`.

## Query with citations

```python
query_engine = index.as_query_engine(
    similarity_top_k=4,          # how many chunks to retrieve
    response_mode="tree_summarize",
)

response = query_engine.query("How do I pick a chunk size?")
print(response.response)

for node in response.source_nodes[:4]:
    print(node.node.metadata.get("file_name"), round(node.score, 3))
```

`response.source_nodes` is the reason to use RAG over raw prompting: every answer can point back to the chunk that produced it. `similarity_top_k` controls how much context the LLM sees — start at `4`, and only increase it once retrieval precision is good.

## The decisions that actually matter

- **Chunk size and overlap** — sized for the answer unit you expect. Paragraph-sized chunks (300–500 tokens) beat page-sized cuts for most FAQs.
- **Embedding model consistency** — never mix embedding models across inserts and queries.
- **Top-k vs. threshold** — a fixed `top_k` is easy to reason about; a similarity threshold (`similarity_cutoff`) protects against nonsense answers when nothing relevant exists.
- **Post-retrieval reranking** — when you need the best 3 of 20 retrieved candidates, a cross-encoder reranker beats raising `top_k`.

This pipeline is intentionally local and dependency-light so you can iterate on chunking and retrieval decisions first — the part that matters — without paying for infrastructure before you need it.

## What breaks first

Expect three beginner failures, in this order: Ollama not running, the FAISS dimension mismatch, and a model size mistake on Apple Silicon memory limits. All three fail fast with clear errors, so the loop is quick. Once your local version answers well with citations, moving to a hosted vector store is a drop-in change — the LlamaIndex API stays the same.

RAG feels like magic until you have to tune a chunker. Build this toy version, break it, change the chunk size, and you will understand why the abstraction exists.