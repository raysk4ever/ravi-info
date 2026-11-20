---
title: "RAG Evaluation: How to Measure Retrieval Quality"
description: "Tuning RAG without a test harness is guessing. Build a retrieval evaluation harness with hit rate, MRR and end-to-end checks before you change another chunk size."
date: '2026-10-27'
tags: ["retrieval", "evaluation", "RAG"]
image: "/blog-images/rag-evaluation.jpg"
type: "blog"
---

Tuning a RAG pipeline without an evaluation harness is tuning by vibes. The chatbot answers with a confident wrong answer, the team suspects the retriever, and a week of chunk-size changes later the real bug is still unidentified. The retriever gets blamed, but retrieval quality was never actually measured before the change.

This post walks through a small evaluation harness: a golden set of questions, retrieval scoring with hit rate and mean reciprocal rank, and an end-to-end run that checks whether the model actually used the retrieved context well.

## What you will build

The harness has three moving parts.

- A **golden set** of questions with a known-good expected answer or expected source chunk.
- A **retrieval runner** that embeds a question, searches the vector store, and scores the results.
- A **full pipeline runner** that feeds the top chunks to the generator and validates the answer.

You do not need a framework to start. The only contract your retriever has to honour is a list of scored chunks, which is the same shape every vector store already returns.

## The architecture at a glance

```
golden set ──► retrieval runner ──┬─► hit rate / MRR / recall@k ──► report
                                  └─► full pipeline ──► generate ──► check ──► report
```

The retrieval branch answers "did we find the right context?" The pipeline branch answers "did the model turn that context into a good answer?"

## Write the golden set

The foundation of any eval is the set of questions where you already know the right answer. Real user logs are the raw material: take your top support questions and chatbot misses, rewrite them as standalone questions, and annotate each one with the source chunk that should have been retrieved. Thirty to fifty questions is enough to start and you grow it as the product grows.

Without a golden set you cannot distinguish a bad retriever from a bad question, which means every evaluation you run afterwards is fiction.

## Retrieval metrics

With a golden set in place you can score retrieval directly. Hit rate is the fraction of questions where the expected chunk appears within the top-k you actually use. Mean reciprocal rank rewards finding the right chunk early. Recall@k measures whether the relevant chunks made the cut at all.

```ts
type ScoredChunk = {
  source: string; // e.g. "docs/billing.md::12"
  score: number;
};

function hitRate(retrieved: ScoredChunk[], expectedSource: string, k = 5): number {
  const topK = retrieved.slice(0, k);
  return topK.some((c) => c.source === expectedSource) ? 1 : 0;
}

function meanReciprocalRank(retrieved: ScoredChunk[], expectedSource: string, k = 5): number {
  for (let i = 0; i < Math.min(k, retrieved.length); i++) {
    if (retrieved[i].source === expectedSource) {
      return 1 / (i + 1);
    }
  }
  return 0;
}
```

A practical starting point for a support bot is a hit rate floor of 0.8 within top-5. If you fall below it, the retriever needs work before you touch anything else.

## Wire the full pipeline

Retrieval numbers alone do not prove the system works. The model can ignore the context you hand it. Run a sample of the golden set through the full retrieve-and-generate path and check the answer against the reference. Exact match works for factual lookups; an LLM-as-judge works for open-ended ones, as long as you keep the judge prompt free of your own answer leakage.

## Limitations

Evals rot. Golden sets go stale as docs change, LLM judges drift, and synthetic questions never match the real distribution. Use the harness as a regression net with a committed baseline, and keep human review in the loop for the last mile.

## Conclusion

Measuring retrieval quality before tuning turns RAG from a sequence of hopeful commits into a system you can reason about. A small golden set plus hit rate, mean reciprocal rank and an end-to-end check is enough to start. The next time the chatbot goes wrong, you will know whether the retriever or the prompt was the problem, instead of finding out by accident.
