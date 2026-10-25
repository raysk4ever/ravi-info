---
title: "Edge Inference with Cloudflare Workers AI: Run LLMs Milliseconds from Your Users"
description: "Run open-weight LLMs at the edge with Cloudflare Workers AI instead of paying round-trip latency to a centralized GPU region. Covers the Workers runtime, streaming responses, model routing, and keeping cold starts out of the critical path."
date: '2026-10-03'
tags: ["cloudflare", "workers-ai", "edge", "LLM", "TypeScript"]
image: "/blog-images/cloudflare-workers-ai-edge-inference.jpg"
type: "blog"
---

Every chatbot UI feels the same problem: the user hits send and the first token arrives one to three seconds later because the request crossed the globe to a GPU region in us-east. Edge inference moves the model next to the user. Cloudflare Workers AI is the most practical way to try it today because it bundles open-weight models into the same Workers runtime you already deploy for APIs, with no GPU fleet to manage.

This post shows how to wire a streaming chat endpoint on Workers AI, pick models that fit the edge, and keep latency predictable when the traffic is spiky.

![Edge inference with Cloudflare Workers AI](/blog-images/cloudflare-workers-ai-edge-inference.jpg)

## What Workers AI actually is

Workers AI is a catalog of models — Llama 3.x, Mistral, Gemma, Whisper, SDXL, embedding models — served from Cloudflare's network. Your Worker calls them with a binding instead of an HTTP SDK call, so there is no API key plumbing inside your code and no separate inference account to provision.

```typescript
export interface Env {
  AI: Ai;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { prompt } = await request.json<{ prompt: string }>();
    const result = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
    });
    return Response.json(result);
  },
};
```

The important mental shift: the binding keeps the call inside Cloudflare's fabric. You are not paying a public round trip to an inference API; the request enters Workers and hits the model on the same backbone.

## Stream responses to hide what latency remains

Edge inference shrinks latency but does not make it zero — a 70B model still takes time per token. Streaming is how you make that floor feel fast. Set `stream: true` and the model returns a `ReadableStream` you can pass straight through:

```typescript
const stream = await env.AI.run(
  "@cf/meta/llama-3.1-8b-instruct",
  {
    messages: [{ role: "user", content: prompt }],
    max_tokens: 512,
    stream: true,
  }
);
return new Response(stream, {
  headers: { "Content-Type": "text/event-stream" },
});
```

The response is an SSE stream of `data: {...}` chunks. Your frontend reads it with the Fetch API's stream reader and appends tokens as they arrive. First paint of a token is usually under 500 ms on a warm model, which is the difference between "broken" and "fast" in a chat UI.

## Pick the model for the job, not the benchmark

Workers AI lists dozens of models; three rules cover most choices. First, smaller is better at the edge: Llama 3.1 8B or Mistral 7B answers most routing, summarization, and extraction tasks and streams two to three times faster than a 70B model. Second, match the task to a specialized model — use Whisper for audio, an embedding model like `bge-base-en-v1.5` for retrieval instead of prompting a chat model for vectors, and SDXL only when you actually need images. Third, use the fp8-quantized variants where offered; they cut both cost and tokens-per-second latency with negligible quality loss on short completions.

A useful pattern is a cheap-model-first cascade: answer with the 8B model, and if the response is a refusal or fails a schema check, retry with the larger model. Measure how often the fallback fires — if it is under five percent, your fast path is carrying the load.

## Keep the pipeline streaming end to end

A classic edge mistake is buffering in the middle. If your Worker parses the model's stream, rebuilds it as an array, and then sends the full text, you have re-introduced the latency streaming was supposed to remove. Pass streams through instead:

```typescript
const [a, b] = stream.tee();
// log token counts on b while forwarding a to the client
return new Response(a, {
  headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
});
```

`ReadableStream.tee()` gives you a side branch for telemetry — token counts, finish reason, cost estimate — without delaying the bytes the user sees. Combined with a small JSONL log sink or an OpenTelemetry trace, this is how you get RAG-style observability without a buffering proxy in the middle.

## Cost and limits to plan for

Workers AI has a free daily allowance and then per-neuron pricing, which maps to roughly per-token pricing for LLMs. Treat it as metered: cap `max_tokens`, add a rate limiter per IP or API key, and reject prompts over a size threshold before they reach the model. Also set a Worker CPU/wall-clock budget — long generations can hit the Workers execution limit, so for genuinely long completions, stream continuously and terminate client-side rather than waiting for a full response.

## Conclusion

Workers AI makes edge inference a binding and a deploy instead of a capacity-planning exercise. The wins come from three habits: stream everything, route to the smallest model that passes your evals, and never buffer in the middle of the pipeline. Do that and your AI features inherit the same geographic distribution as your CDN — which is the whole point of building on the edge.
