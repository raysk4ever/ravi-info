---
title: "A/B Testing RAG Retrieval: Dense vs Sparse vs Hybrid Search"
description: "How to A/B test RAG retrieval: compare dense, BM25 and hybrid retrievers on real questions, score them, and flip the default on measured wins."
date: '2026-11-19'
tags: ["RAG", "retrieval", "hybrid-search", "A/B Testing", "bm25"]
image: "/blog-images/rag-ab-testing-retrieval.jpg"
type: "blog"
---

A/B testing in RAG is the practice of running two or more retrievers over the same question set in parallel — the production one, and one or more alternatives — and picking the next config by measured metrics, not vibes.

The retriever is the part of a RAG pipeline that moves the most: every change to the embedding model, chunk size or hybrid ratio silently shifts what the LLM sees, and retrieval mistakes are the most common cause of bad answers — often worse than a weaker LLM.

![A/B testing RAG retrieval: dense, sparse and hybrid search compared on real queries](/blog-images/rag-ab-testing-retrieval.jpg)

## What does "better retrieval" mean?

Before you can compare retrievers, you need definitions:

- **Precision@10** — of the top 10 results, how many are relevant.
- **Recall@10** — of the relevant chunks that exist in the corpus, how many you return.
- **nDCG@10 / MRR** — rank-aware: when the LLM gets your top-K it will trust rank 1 the most, so rank-aware metrics catch the case where recall looks fine but the best chunk is buried.
- **Latency p50 / p95** — retrieval runs before generation, so a slower retriever eats time-to-first-token directly.

Write the definitions down before the first run. "Better" without a metric is an opinion, and opinions can't tell you whether dense beat hybrid on your corpus.

## How to set up the A/B test

A typical A/B has three retrievers.

Dense retrieval — the production baseline. pgvector similarity over the query embedding:

```sql
SELECT id
FROM chunks
WHERE embedding <=> $1::vector
ORDER BY embedding
LIMIT 20;
```

Sparse retrieval — full-text ranking over the same table. Build a GIN index on a `tsvector` column once; per query:

```sql
SELECT id
FROM chunks
WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $2)
ORDER BY ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', $2)) DESC
LIMIT 20;
```

Hybrid retrieval — both top-K lists, merged by reciprocal rank fusion, then capped for the LLM. [RRF](https://dl.acm.org/doi/10.1145/1571956.1572114) replaces learned weights: the `1/(k+i+1)` term gives a top-1 hit the most, and one retriever's outliers can't dominate the other's wins:

```ts
function rrf(rankLists: string[][], k = 60): string[] {
  const score = new Map<string, number>();
  for (const list of rankLists) {
    list.forEach((id, i) => {
      score.set(id, (score.get(id) ?? 0) + 1 / (k + i + 1));
    });
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
```

One dispatcher for the A/B, used for scoring:

```ts
async function retrieve(q: string): Promise<string[]> {
  const [dense, sparse] = await Promise.all([denseSearch(q), sparseSearch(q)]);
  const mode = pickMode();
  const ids =
    mode === "dense" ? dense : mode === "sparse" ? sparse : rrf([dense, sparse]);
  return ids.slice(0, 8);
}
```

Keep two caps: score on the full top-10, feed the LLM the top-8.

## How to measure which retriever wins

Run the same question set through each retriever and score:

| Metric | What it catches |
|---|---|
| Recall@10 | Are the right chunks in the result set? |
| Precision@10 | How much noise came back? |
| nDCG@10 / MRR | Is the best chunk ranked first? |
| Retrieval p50 / p95 | Latency added before generation starts |

To make it real: pick 200+ questions from your observability logs or real user turns, curate the "expected chunks" for a subset of them, then compute precision and recall as `|retrieved ∩ relevant| / |retrieved|` and `|retrieved ∩ relevant| / |relevant|`. Hold the question set fixed across A/B runs — a moving set lets the comparison drift.

A useful win rule: pick the strategy with the better recall, unless its latency p95 grows by more than ~20–30%. How much latency is too much depends on your app's time-to-first-token budget, not on a universal constant.

## When to pick dense, sparse or hybrid

- **Small corpora (under ~10k chunks) with "find X docs about" queries:** dense alone usually wins; hybrid adds cost for little gain.
- **Keyword-heavy queries — product names, codes, exact phrases:** BM25-style sparse retrieval is strong there, and hybrid often wins by covering both.
- **Latency-critical paths (TTFT target under 100 ms):** keep dense as the control; if you move to hybrid, put a latency budget on it and measure before accepting the change. See the [full-text search docs](https://www.postgresql.org/docs/current/textsearch.html) for the sparse side.

The other rule: A/B every retrieval change. Don't retire a strategy because a handful of runs look negative — that's what the metrics are for.

## Bottom line

A/B test retrieval the way you would A/B anything with a user-facing default: fix the question set, score on the metrics you actually care about, and flip the default on a measured win. My [Gama RAG](/blog/gama-portfolio-chatbot) uses dense as the control and hybrid + BM25 as the challenge; also worth reading: [hybrid search](/blog/hybrid-search-rag) and [RAG evaluation](/blog/rag-evaluation).
