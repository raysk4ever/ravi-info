---
title: "OpenTelemetry for RAG: Tracing LLM Pipelines End to End"
description: "Span-based tracing turns a RAG pipeline from a black box into a measurable system. Wire OpenTelemetry around retrieval and generation, set latency budgets, and attribute cost per request in TypeScript."
date: '2026-09-26'
tags: ["observability", "opentelemetry", "tracing", "latency", "devtools"]
image: "/blog-images/rag-observability-opentelemetry.jpg"
type: "blog"
---

A RAG request that takes four seconds and returns a wrong answer gives you one log line: `200 OK`. Nothing in it tells you whether the embedder stalled, the retriever returned irrelevant chunks, the model ignored the context, or the answer was always going to be wrong because your [chunking](/blog/rag-chunking-strategies) split a definition from its error condition. Spans fix that. A trace is a tree of timed, named operations with attributes, so one request becomes readable: here is where the 3.4 seconds went, here are the five chunks we retrieved, here is what we paid for it.

![OpenTelemetry tracing a RAG pipeline](/blog-images/rag-observability-opentelemetry.jpg)

## Why Are Logs Not Enough for LLM Pipelines?

A log line is a flat assertion. A span is a measured interval with a parent, a duration, and typed attributes, which means you can aggregate across requests instead of reading them one at a time.

| Question | Logs | Spans |
|---|---|---|
| Where did the 4s go? | Guess from timestamps | Sum child span durations |
| Is the retriever or the model slow? | Interleaved text | Separate named spans |
| How many tokens did this cost? | Only if you logged it | Attribute on the LLM span |
| Did a regression hit 5% of traffic? | Manual grep | Query and threshold |

The second row is the important one. In a RAG request the network time between your server and an embedding API is usually the largest single cost, and it is invisible unless the call is its own span. The same goes for the model call and, in a [hybrid retriever](/blog/hybrid-search-rag), each leg of retrieval.

## What Does the Span Tree Look Like?

Instrument one parent span per request and one child per meaningful operation. Keep the tree shallow; spans exist to localise failure, not to mirror every function call.

```text
rag.answer                     (SERVER, 3412ms)
├─ rag.embed_query             (CLIENT, 210ms)
├─ rag.retrieve                (INTERNAL, 640ms)
│  ├─ rag.retrieve.bm25        (INTERNAL, 90ms)
│  └─ rag.retrieve.vector      (INTERNAL, 520ms)
├─ rag.rerank                  (INTERNAL, 1450ms)
└─ llm.generate                (CLIENT, 1080ms, tokens=1420)
```

That trace already answers the first question. Reranking is the bottleneck, the vector leg dominates retrieval, and generation is a rounding error. No log parsing required.

## How Do You Instrument Retrieval in TypeScript?

Start the tracer once, then wrap each stage in its own active context so spans nest automatically.

```ts
import { trace, context, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("rag-pipeline", "1.0.0");

export async function answerQuestion(question: string, userId: string) {
  return tracer.startActiveSpan("rag.answer", async (root) => {
    root.setAttributes({
      "rag.user.id": userId,
      "rag.question.length": question.length,
    });

    try {
      const vector = await tracer.startActiveSpan("rag.embed_query", async (span) => {
        const out = await embed(question);
        span.setAttribute("rag.embed.dims", out.length);
        return out;
      });

      const chunks = await retrieve(vector, question);
      const context = rerank(chunks).slice(0, 4);
      root.setAttribute("rag.retrieved.count", chunks.length);
      root.setAttribute("rag.context.chars", context.length);

      return await generate(context, question);
    } catch (error) {
      root.recordException(error as Error);
      root.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      throw error;
    } finally {
      root.end();
    }
  });
}
```

`startActiveSpan` with an async callback is the pattern to standardise on. It sets the active context, so anything instrumented downstream — including an HTTP client with the OpenTelemetry auto-instrumentation package — attaches itself as a child without you passing a context around.

## How Do You Set Latency Budgets?

A budget turns "it feels slow" into an alert. Compute the p95 per span and compare it to the target you are willing to spend. Retrieval and generation get separate budgets because they degrade differently: a slow vector search can be cached, a slow reranker can be skipped.

| Span | p95 target | Degradation move |
|---|---|---|
| `rag.embed_query` | 250ms | Batch or cache embeddings |
| `rag.retrieve` | 800ms | Lower `top_k`, drop the sparse leg |
| `rag.rerank` | 1200ms | Rerank 10 instead of 50 |
| `llm.generate` | 3000ms | Cap `max_tokens`, drop to a smaller model |

For streaming endpoints, record time-to-first-token on the generation span as its own attribute and treat the rest of the stream separately. A long total duration on a streaming response is expected; a slow first token is a defect.

## How Do You Attribute Cost and Quality?

Token counts and cost belong on the model span, using the OpenTelemetry GenAI semantic conventions, so any backend can chart them.

```ts
const { text, usage } = await llm.complete(messages);
span.setAttributes({
  "gen_ai.system": "openai",
  "gen_ai.request.model": MODEL,
  "gen_ai.usage.input_tokens": usage.prompt_tokens,
  "gen_ai.usage.output_tokens": usage.completion_tokens,
  "rag.answer.chars": text.length,
});
```

Now every span carries both latency and cost, and the two are joined. You can answer "which retrieval strategy spends the most per correct answer" instead of guessing. For quality, add span attributes rather than a separate metrics system: the top chunk score, the mean score of the returned set, and whether a citation survived into the final answer. A sudden drop in top score across a version of your index is visible long before a user complains.

## What Should You Ship First?

Start with three spans — the request, retrieval, and generation — and only add a leg when you have a question it answers. The failure mode of tracing is not overhead, it is a span hierarchy nobody reads. Keep attribute names consistent, cap cardinality by never putting full prompts or user text in attribute values, and sample only after the dashboard works.

Tracing will not make answers accurate. It will tell you which of the levers in [building a RAG app](/blog/building-rag) is actually holding you back, and that is usually the difference between guessing and shipping.

## Conclusion

RAG pipelines fail in stages, and each stage fails silently. OpenTelemetry gives every stage a name, a duration, and a set of attributes, which turns a single opaque request into a breakdown you can aggregate, budget, and alert on. Instrument the request root, the retrieval legs, and the model call; record tokens on the generation span; and set a p95 target per stage before you optimise. Once the trace is in place, retrieval quality stops being guesswork.
