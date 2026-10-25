---
title: "RAG Cross-Encoder Reranking: Why Top-K Is Not Enough"
description: "Vector search narrows the candidate pool but rarely lands the best chunk first. Add a cross-encoder reranker to pick the true best passages for RAG retrieval, with code and fusion strategies."
date: '2026-10-22'
tags: ["reranking", "retrieval", "vector-search"]
image: "/blog-images/rag-cross-encoder-reranking.jpg"
type: "blog"
---

Retrieval feels done once you run a similarity search and hand the top result to the LLM. In a production RAG app the answer is usually decent, but it is only a guess. The chunk that actually answers the question often sits at position forty, and `top_k` happily returns position one.

The first stage can stay cheap, a small embedding model, an in-process index, sub-millisecond latency, but you still get a guess. This post is about closing that gap with a cross-encoder reranker: why the first-stage retriever should stay wide, how the reranker turns an untrusted ranking into a judged one, and how to wire it into a RAG pipeline without wrecking latency or inference budget.

## Why top-k is only a starting point

A bi-encoder, the classic sentence-embedding model, encodes the query and the document into vectors and scores them with cosine similarity. It is fast, cheap, and good enough for first-stage retrieval, but it compresses meaning into a single point in space and loses the ability to judge fine-grained relevance. Related questions can land far apart, and an irrelevant chunk can outrank the perfect answer.

Because of that, a similarity score is a ranking signal, not a verdict. `top_k` is just "give me the first N of whatever this heuristic produced", which means context quality is bounded by heuristic quality rather than by the quality of your corpus. In a support-docs bot the failure mode is concrete: a user asks about an error code such as `AUTH_TOKEN_EXPIRED`, the vector search buries the troubleshooting chunk, and the LLM answers confidently from the wrong page.

## How cross-encoders judge relevance

A cross-encoder takes the query and a single passage, joins them, and runs the full transformer stack with cross-attention before scoring. The joint pass is dramatically more accurate than comparing two independently produced embeddings, which is why rerankers routinely beat a strong bi-encoder on the final ranking.

The cost is compute: cross-encoders are slower and more expensive per pair, and latency grows with the number of pairs scored. That is exactly why rerankers are applied last, over a small candidate pool retrieved by a fast first stage.

You rerank the shortlist, not the corpus, and that distinction is what keeps the added precision affordable.

## When to rerank, and when not to

Rerank when retrieval precision is on your critical path: chatbot answers, coding assistants, factual Q&A over documents. Skip it for tiny local corpora where a vector-only demo already returns the right chunk, or when the latency budget cannot absorb extra inference.

Retrieve a wide net, between twenty and fifty candidates, with the first stage; rerank the short list; then pass the top passages to the LLM. Retrying a small cross-encoder such as `cross-encoder/ms-marco-MiniLM-L-6-v2` is usually enough to move the needle, and you can swap in a larger model or a ColBERT-style model for harder domains without changing the pipeline shape.

## Wiring a cross-encoder reranker

With LangChain the reranker is just another retriever, so the rest of the chain does not change:

```python
from langchain.retrievers import BaseRetriever
from langchain.schema import Document
from langchain_community.cross_encoders import HuggingFaceCrossEncoder

class CrossEncoderReranker(BaseRetriever):
    """Rerank candidate chunks with a cross-encoder model."""

    def __init__(
        self,
        base_retriever,
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        top_k: int = 4,
    ) -> None:
        self.base_retriever = base_retriever
        self.top_k = top_k
        self.cross_encoder = HuggingFaceCrossEncoder(model_name)

    def _get_relevant_documents(self, query: str):
        candidates = self.base_retriever.get_relevant_documents(query)
        scores = self.cross_encoder.score(
            [(query, doc.page_content) for doc in candidates]
        )
        scored = sorted(
            zip(candidates, scores), key=lambda pair: pair[1], reverse=True
        )
        return [doc for doc, _ in scored[: self.top_k]]
```

The reranker returns the same document objects, so citation wiring, prompt context assembly, and response generation stay untouched.

## Fusion before reranking

When you already fuse signals, such as BM25 plus vectors via reciprocal rank fusion, rerank the fused list instead of reranking each retriever output separately. RRF buys recall across the signals; the cross-encoder buys precision on the final shortlist.

## What to measure

Compare retrieval recall at five and nDCG before and after adding the reranker, on a fixed set of real questions. Track end-to-end latency, because a cross-encoder adds milliseconds to seconds depending on model size, and you want the extra accuracy to buy measured answers rather than a nicer demo. A simple before-and-after run with the same eval set is usually enough to decide whether the reranker earned its latency.

## Conclusion

Cross-encoder reranking is the highest-value retrieval upgrade after chunking and hybrid search. Keep the first stage fast and wide, rerank a short list with a cross-encoder, and evaluate against real questions instead of trusting top-k. Retrieval quality stops being a guess the moment the final ordering is computed by something that actually read the question and the answer together.
