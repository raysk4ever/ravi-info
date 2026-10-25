---
title: "Semantic Caching for RAG: Skip the LLM on Repeated Questions"
description: "Cache RAG answers by meaning, not exact string match, so repeated questions skip the LLM entirely — using embedding similarity, a TTL, and a fallback to retrieval when confidence is low."
date: '2026-10-17'
tags: ["caching", "retrieval", "vector-search"]
image: "/blog-images/semantic-caching-rag.jpg"
type: "blog"
---

Retrieval-augmented generation gives you grounded answers, but it does not give you cheap ones. Every question still runs an embedding call, a vector search, and a full LLM generation, even when you have answered essentially the same question before. On a portfolio chatbot or an internal support bot, a handful of questions account for most of the traffic, so answering them twice is pure waste.

Semantic caching stores previous answers keyed by meaning instead of by exact string. When a new question arrives, you compare its embedding against cached questions; if one is close enough, you return the stored answer and skip the entire retrieval-and-generation pipeline. Exact-match caching misses near-duplicates ("How do I reset my password?" vs "I need to reset my password"), while semantic caching catches them.

## What you will build

A small cache layer that sits in front of your RAG pipeline:

```
question
  │
  ▼
embed(question)
  │
  ├─► similar cached entry above threshold? ────► return stored answer
  │
  └─► run RAG (embed → search → generate) ──► store answer, return it
```

Each cached entry holds the question, its embedding, the answer, and a timestamp. Lookup is by cosine similarity between the incoming question embedding and stored question embeddings.

## Store embeddings alongside answers

Redis with a vector index works well; Postgres with pgvector or an in-memory map follows the same logic. Here is a minimal Redis-backed schema:

```
question   TEXT
embedding  VECTOR(768)   -- must match your embedding model
answer     TEXT
created_at TIMESTAMP
ttl        INTEGER       -- seconds before the entry expires
```

The embedding dimension must match the model you use to embed incoming questions, just like the RAG index itself. If you switch models, you must flush the cache — stale vectors will never match new queries.

## Look up by similarity, not by key

When a question arrives, embed it and ask the store for the nearest neighbor:

```ts
const queryVec = await embed(question); // 768-dim vector

const hit = await redis.ft.search(
  "cache_index",
  `*=>[KNN 1 @embedding $vec RETURN 3]`,
  {
    PARAMS: { vec: JSON.stringify(queryVec) },
    DIALECT: 2,
  }
);

if (hit.total > 0) {
  const doc = hit.documents[0];
  const score = parseFloat(doc.score); // cosine distance, lower is closer
  if (score < SIMILARITY_THRESHOLD) {
    return doc.answer; // cache hit — skip RAG and the LLM
  }
}
```

`SIMILARITY_THRESHOLD` controls the tradeoff. A common starting point is cosine distance below `0.3` (roughly above `0.7` similarity), but tune it against your own Q&A pairs. Too strict and you never hit; too loose and you return an off-topic answer.

Because embeddings live in the same vector space you already use for retrieval, you can reuse the embedding model and even the same infra. You do not need a second stack.

## Write through, expire on a schedule

Only cache answers you trust. A write-through pattern stores the result after every completed RAG run:

```ts
const answer = await runRag(question); // embed → search → generate
await redis.hset(`cache:${questionHash}`, {
  question,
  embedding: JSON.stringify(queryVec),
  answer,
  created_at: Date.now(),
});
await redis.expire(`cache:${questionHash}`, CACHE_TTL_SECONDS);
```

Hash the question string for the key so identical questions share one entry, but rely on the vector similarity lookup to catch near-duplicates under different keys.

Set a TTL on every entry — twenty-four to seventy-two hours is a good starting range for product docs that change occasionally. Without expiry, an outdated answer sticks around forever, and a wrong answer becomes permanent. Pair TTL with a version bump: when your underlying docs change, increment a cache version prefix and old entries stop matching.

## Confidence gating: when not to trust a hit

A high similarity score does not guarantee the cached answer fits. Guard the lookup with two checks:

- **Score floor** — reject any hit above the distance threshold and fall through to RAG.
- **Answer freshness** — skip the cache for questions containing time-sensitive words like "today", "now", "current version", or "price", since a cached answer from last week may be stale.

If either check fails, run the full pipeline and treat the result as a new cache entry.

```ts
const isTimeSensitive = /today|now|current|price|status/i.test(question);
if (isTimeSensitive || score >= SIMILARITY_THRESHOLD) {
  return runRag(question);
}
return cachedAnswer;
```

## Measuring the win

Instrument two counters: `cache_hits` and `cache_misses`, plus the latency of each path. A cache hit should return in tens of milliseconds — mostly the embedding call and a vector query — while a miss pays the full RAG cost, often one to three seconds. Track:

- **Hit rate**: hits / (hits + misses). Thirty to sixty percent is realistic for repetitive traffic.
- **P95 latency**: should drop noticeably once warm traffic flows through hits.
- **LLM token spend**: falls in direct proportion to hit rate, which is where the cost saving shows up.

Also log false positives — cases where a cached answer was served but the user rephrased or followed up immediately. Those suggest your threshold is too loose; nudge it down.

## Limitations

Semantic caching is not a replacement for retrieval. It helps repeated and near-identical questions, but a genuinely new question still needs the full pipeline. It also assumes your answers are deterministic enough to reuse — if your LLM gives a different answer each time, caching one of them is misleading. Use a low temperature and a stable system prompt so a cached answer stays representative.

Keep the embedding model fixed; re-embed everything if you change models, since vectors from different models do not share a space.

## Conclusion

Semantic caching turns RAG from "generate every time" into "generate when you have to." Store answers keyed by meaning, look up by cosine similarity, expire entries on a TTL, and gate hits on confidence. The result is faster answers, fewer LLM calls, and a pipeline that scales with repeated questions instead of choking on them. For a chatbot answering the same five recruiter questions all day, it is one of the highest-return optimizations you can add.