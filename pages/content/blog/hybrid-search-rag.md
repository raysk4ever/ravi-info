---
title: "Hybrid Search for RAG: BM25 + Vector Retrieval"
description: "Hybrid search for RAG combines BM25 keyword scoring with vector similarity to retrieve precise, context-rich chunks. Build a weighted retriever, compare fusion methods, and tune the ranking with real questions."
date: '2026-09-25'
tags: ["hybrid-search", "retrieval", "bm25", "vector-search"]
image: "/blog-images/hybrid-search-rag.jpg"
type: "blog"
---

Hybrid search for RAG is a retrieval technique that combines lexical keyword scoring with dense vector similarity before an LLM receives context. BM25 is strong at exact terms, vectors are strong at paraphrases, and combining them gives the model a more reliable candidate set than either method alone.

## Why Does Vector Search Alone Miss Some Questions?

Vector search compares the meaning of a query with the meaning of a chunk. That is excellent for questions like “How do I stop a background job?” when the source says “terminate a worker process,” but it can be too forgiving when the user searches for an error code, a product name, or a function signature.

BM25 has the opposite bias. It rewards rare, exact terms and gives predictable results for strings such as `AUTH_TOKEN_EXPIRED`, but it cannot connect a question to a document that uses different words. A production retriever usually needs both signals.

| Retriever | Strong at | Common failure |
|---|---|---|
| BM25 | IDs, names, numbers, rare phrases | Paraphrases and synonyms |
| Vector search | Concepts and related wording | Exact tokens buried in a large chunk |
| Hybrid search | Both signal types | Bad weighting or poor source chunks |

![Hybrid search for RAG combining BM25 and vectors](/blog-images/hybrid-search-rag.jpg)

## What Is the Hybrid Search Architecture?

A practical RAG request can follow this path:

```text
question
  ├─ tokenize → BM25 scores
  ├─ embed → vector similarity scores
  ├─ normalize and fuse candidate scores
  ├─ deduplicate and rerank
  └─ pass the top context to the LLM
```

Keep retrieval separate from generation. The LLM should receive the highest-quality, deduplicated passages, not a large pile of raw candidates. That separation also makes it possible to evaluate retrieval without paying for a model call.

For a small corpus, BM25 and an in-memory embedding matrix are enough. At larger scale, the same idea can be implemented with a managed lexical index and a vector database; the important part is preserving two independently inspectable rankings.

## How Do You Combine BM25 and Vector Scores?

Weighted score fusion is the simplest starting point. Normalize each score before adding it because BM25 scores and cosine similarities use different ranges. Here is a small Python baseline:

```python
import re
import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

def tokenize(text):
    return re.findall(r"[a-z0-9_]+", text.lower())

documents = [
    "Use AUTH_TOKEN_EXPIRED to refresh a short-lived access token.",
    "Stop a background worker by sending SIGTERM and waiting for its exit event.",
    "The deployment uses a rolling release with a five-minute health window.",
]

lexical = BM25Okapi([tokenize(document) for document in documents])
query = "How do I terminate a running job?"
vector_model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = vector_model.encode(
    documents, normalize_embeddings=True
)
query_embedding = vector_model.encode(
    query, normalize_embeddings=True
)

lexical_scores = lexical.get_scores(tokenize(query))
vector_scores = np.dot(embeddings, query_embedding)

def normalize(scores):
    span = scores.max() - scores.min()
    return (scores - scores.min()) / span if span else scores * 0

combined = 0.35 * normalize(vector_scores) + 0.65 * normalize(lexical_scores)
order = np.argsort(combined)[::-1]
print([documents[index] for index in order])
```

The weights are a starting point, not a universal truth. If your users search for error codes, give lexical retrieval more influence. If their questions are conversational and heavily paraphrased, give vectors more influence. Evaluate both settings against a fixed set of real questions rather than changing the weights by intuition alone.

## When Should You Use Reciprocal Rank Fusion?

Rank-based fusion is useful when BM25 and vector scores are not comparable. Reciprocal Rank Fusion, or RRF, looks only at each candidate’s position in each ranking:

```python
def reciprocal_rank_fusion(rankings, k=60):
    scores = {}
    for ranking in rankings:
        for rank, document_id in enumerate(ranking, start=1):
            scores[document_id] = scores.get(document_id, 0) + 1 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)
```

Call it with the IDs returned by each retriever:

```python
lexical_ids = sorted(
    range(len(documents)), key=lambda index: lexical_scores[index], reverse=True
)
vector_ids = sorted(
    range(len(documents)), key=lambda index: vector_scores[index], reverse=True
)
final_order = reciprocal_rank_fusion([lexical_ids, vector_ids])
```

RRF is less sensitive to score calibration and has a useful property: a document that ranks well in either list can still enter the fused result. That is a good default when two ranking systems have different scoring functions. It does not remove the need for deduplication, metadata filtering, or a final reranker.

## How Do You Tune Hybrid Retrieval for RAG?

Build a small evaluation set before changing infrastructure. For every question, record the document or chunk that should answer it, then measure recall at 5, recall at 10, and the final answer quality.

1. **Start with clean chunks.** Hybrid search cannot rescue chunks that split a definition from its error condition. Tune [RAG chunking](/blog/rag-chunking-strategies) first.
2. **Measure each retriever alone.** This shows whether BM25 is contributing unique matches or merely duplicating vector results.
3. **Compare weighted fusion with RRF.** Weighted fusion offers more control; RRF is easier to reason about when score scales differ.
4. **Add metadata filters before semantic search.** Filter by tenant, product, language, or document version when those fields are authoritative.
5. **Rerank a short list.** Retrieve 20–50 candidates, then use a cross-encoder or another reranker to select the final 4–8 passages.

The [hybrid search approach documented by Pinecone](https://docs.pinecone.io/docs/hybrid-search) is a useful reference for the same sparse-plus-dense pattern. The exact implementation is flexible, but the evaluation loop is not: keep the question set, index version, model, and weights together so a ranking change is reproducible.

## What Should You Ship First?

A small hybrid retriever is a strong upgrade over a vector-only baseline, but it is not a substitute for good source data or a clear answer boundary. Return the matched source metadata with every passage, cap the context sent to the LLM, and test the no-answer case before celebrating an accuracy improvement.

If you are new to RAG, start with the local pipeline in [Building a RAG App with LlamaIndex](/blog/building-rag), then add BM25 as a second ranking signal. From there, compare frameworks such as [LangChain vs. LlamaIndex](/blog/langchain-vs-llamaindex) and keep the retriever behind a small interface. The result is easier to tune, easier to explain, and much safer than trusting a single similarity score.

## Conclusion

Hybrid search for RAG works because users alternate between exact language and intent. BM25 preserves identifiers and terminology, vector search preserves semantic relationships, and fusion gives you control over how those signals compete. Start with weighted fusion, compare it with RRF, and optimize against real questions rather than a synthetic top-k number. That is the practical path from a promising demo to retrieval you can measure and trust.
