---
title: "Cancel Streaming AI Requests With AbortController"
description: "Stop runaway token generation with AbortController, timeouts, and stream cleanup. A practical TypeScript guide to cancelling fetch streams on deadline or client disconnect."
date: '2026-11-20'
tags: ["streaming", "fetch", "abortcontroller", "cancellation", "timeouts"]
image: "/blog-images/abortcontroller-streaming-ai-requests.jpg"
type: "blog"
---

Use an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) with a timer to cancel a streaming AI request when the client disconnects or a deadline passes. Pass `controller.signal` to `fetch`, read [`response.body`](https://developer.mozilla.org/en-US/docs/Web/API/Response/body) as a `ReadableStream`, and abort in `finally` or on disconnect. That stops upstream generation instead of leaving tokens running after the user has navigated away.

![Streaming request cancellation from client disconnect to upstream abort](/blog-images/abortcontroller-streaming-ai-requests-1.jpg)
*A cancelled stream releases three things: the reader lock, the timer, and the upstream generation.*

## Key facts

- [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) is the object you pass to `fetch`; calling `controller.abort()` rejects the in-flight promise with an `AbortError`.
- [`Response.body`](https://developer.mozilla.org/en-US/docs/Web/API/Response/body) is a `ReadableStream` in modern browsers and Node 18+, so tokens can be read as they arrive.
- [`AbortSignal.any()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static) combines a client signal and a timeout signal into one without manual listener bookkeeping.
- A `ReadableStreamDefaultReader` holds a lock until `releaseLock()` is called; `finally` is the safe place for it.
- Closing the browser tab does not automatically stop the model call on your server — the server needs its own abort path.
- `AbortController` is also what backs a user-facing Stop button; the same signal can serve both the timer and the click.

## Why Do Streaming Requests Need Cancellation?

A streaming response is a long-lived contract. The browser keeps a connection open, the server keeps an upstream connection open, and the model keeps generating tokens. If any part of that chain disappears without telling the next part, the work continues anyway. On a paid API that is a bill for output nobody reads; on a busy server it is a connection pool slowly filling with ghosts.

The failure is easy to miss in development. Everything looks fine when the client stays on the page, and the leak only shows up when users hit Back during a long answer. I treat cancellation as part of the stream implementation, not an error case to add later. My notes on [RAG observability](/blog/rag-observability-opentelemetry) make the same argument for timing spans: you cannot debug a stage you never measured.

There are three distinct triggers to handle:

| Trigger | Who notices | What must be aborted |
|---|---|---|
| User clicks Stop | Browser | The `fetch` via its signal |
| Deadline passes | Browser or server | The same signal, with a reason |
| Client disconnects | Server | The upstream provider request |

## What Happens When the Client Disconnects?

On the client, pass a signal into `fetch` and read the stream with a reader. Keep the reader cleanup in `finally`, because a thrown `AbortError` is still an exit from the loop.

```ts
type OnToken = (chunk: string) => void;

export async function streamAnswer(
  prompt: string,
  onToken: OnToken,
  signal: AbortSignal
) {
  const response = await fetch("/api/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Answer stream failed with ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onToken(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
  }
}
```

The `signal` is the only cancellation channel here. There is no shared mutable flag and no `isMounted` check in React; one controller owns the lifecycle, and every consumer receives the same signal.

On the server, a client disconnect is visible on the response object. In a Next.js Pages Router API route, listen for `close` and abort the upstream call if the response has not already finished:

```ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const upstream = new AbortController();

  res.on("close", () => {
    if (!res.writableEnded) upstream.abort();
  });

  const provider = await fetch("https://provider.example/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: req.body.prompt }),
    signal: upstream.signal,
  });

  if (!provider.body) {
    res.status(502).end("No upstream stream");
    return;
  }

  provider.body.pipeTo(
    new WritableStream({
      write(chunk) {
        res.write(chunk);
      },
      close() {
        res.end();
      },
    })
  );
}
```

Without the `res.on("close")` listener, the provider keeps generating after the browser is gone. The pattern is the same one used by [server-sent events and WebSockets](/blog/websockets-vs-sse-ai-chat-streaming): the transport does not clean itself up.

## How Do You Add a Deadline to a Streaming Fetch?

A deadline is a second abort trigger. Create a timer that aborts the controller, pass the same signal to the request, and clear the timer in `finally`. Treat an abort caused by your own code as an expected outcome, not an error to show to the user.

![Timeline of a streaming request cancelled by a 30-second deadline](/blog-images/abortcontroller-streaming-ai-requests-2.jpg)
*The timer and the Stop button write to the same signal, so either one can end the stream.*

```ts
const controller = new AbortController();
const deadline = setTimeout(
  () => controller.abort(new DOMException("Deadline exceeded", "TimeoutError")),
  30_000
);

try {
  await streamAnswer(prompt, setText, controller.signal);
} catch (error) {
  if (controller.signal.aborted) return; // user stop or deadline
  throw error;
} finally {
  clearTimeout(deadline);
}
```

If you already have a signal from a parent component — for example a route change — combine the two with `AbortSignal.any([parentSignal, deadlineSignal])`. For older runtimes, create a second controller and wire both sources with `addEventListener("abort", ...)` to a third controller that does the real abort.

One subtlety: `setTimeout` keeps the event loop alive until cleared, so putting `clearTimeout` in `finally` is not optional. The same goes for the reader lock. My [structured logging notes](/blog/structured-logging-nextjs-pino) use the same rule for request-scoped resources — the cleanup belongs next to the allocation.

## How Do You Test Cancellation?

Test the observable effect, not the implementation. Start a stream from a mock provider that emits chunks slowly, trigger the abort, and assert that no chunks arrive afterwards and that the reader lock was released.

```ts
it("stops emitting after abort", async () => {
  const controller = new AbortController();
  const chunks: string[] = [];

  const pending = streamAnswer("hi", (c) => chunks.push(c), controller.signal);
  await waitFor(() => expect(chunks.length).toBeGreaterThan(0));

  controller.abort();
  await expect(pending).rejects.toThrow();

  const count = chunks.length;
  await new Promise((r) => setTimeout(r, 50));
  expect(chunks).toHaveLength(count);
});
```

Then test the browser path once: open the page, click Stop midway through a real answer, and watch the server log. If the upstream provider still reports a completed generation, the server-side abort listener is missing. The same pattern applies to products that stream generated previews while you work, such as [Gamatron's App Builder](https://gamatron.in/ai-app-builder).

## Frequently asked questions

### Does aborting fetch stop the model on the server?

Not by itself. Aborting the browser `fetch` closes that connection. The server must listen for the response `close` event and abort its own upstream request. Without that listener, generation continues and you pay for output nobody receives.

### What error does an aborted fetch throw?

A DOMException named `AbortError` in browsers, and a similar `AbortError` in Node. Because an abort is often intentional, check `signal.aborted` in the catch block and return quietly instead of logging a failure or showing an error toast.

### Can I reuse an AbortController?

No. A controller is single-use: once aborted, its signal stays aborted and every later `fetch` with that signal fails immediately. Create a new controller per request. If you need several triggers, combine signals with `AbortSignal.any()`.

### Why call releaseLock on the reader?

A `ReadableStream` reader holds an exclusive lock until `releaseLock()` or cancellation. Leaving it locked prevents any other consumer from reading the body and can keep the stream alive. Put the call in `finally` so it runs on success, error, and abort.

## Next steps

Add cancellation before you add retries. A retry loop without a deadline can multiply an upstream stall into several concurrent generations. Start with one controller per request, a 30-second timer, and a server-side `close` listener; then measure how many aborts you get per day with the tracing approach in [RAG observability](/blog/rag-observability-opentelemetry).
