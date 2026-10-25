---
title: "WebSockets vs Server-Sent Events for LLM Chat Streaming: When to Use Which"
description: "Choosing the right transport for streaming LLM responses matters more than the model. Compare WebSockets and SSE on latency, reconnection, proxy behavior, and scaling, with working Next.js code for both."
date: '2026-10-14'
tags: ["websockets", "sse", "streaming", "realtime", "chat"]
image: "/blog-images/websockets-vs-sse-ai-chat-streaming.jpg"
type: "blog"
---

Streaming an LLM response is the single biggest perceived-performance win in a chat UI. The choice between WebSockets and Server-Sent Events (SSE) looks like a detail, but it shapes everything downstream: reconnection, proxy behavior, how you scale, and how you recover from a dropped connection. This post compares the two honestly, with working code for each, and ends with a decision framework you can apply without guessing.

![WebSockets vs SSE for AI chat streaming](/blog-images/websockets-vs-sse-ai-chat-streaming.jpg)

## What you are actually choosing

Both transports move bytes from server to browser as they are generated. The differences that matter:

| Property | Server-Sent Events | WebSockets |
|---|---|---|
| Direction | Server to client only | Full duplex |
| Protocol | Plain HTTP/1.1 or HTTP/2 | Upgraded HTTP, then framed |
| Reconnect | Built in, automatic | You implement it |
| Proxy/CDN friendly | Yes, mostly | Often needs config |
| Payload types | Text (JSON) | Text or binary |
| Browser API | `EventSource` | `WebSocket` |
| Scaling unit | Stateless HTTP request | Long-lived connection |

For an LLM chat that mostly pushes tokens, SSE is the simpler and safer default. Reach for WebSockets when the interaction is genuinely bidirectional mid-stream.

## Streaming with Server-Sent Events in Next.js

SSE is a long HTTP response with a special content type. The server writes `data:` lines; the browser's `EventSource` parses them. In the Pages Router you stream by writing to the response object:

```ts
// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const question = String(req.query.q ?? "");
  for await (const chunk of llm.stream(question)) {
    res.write(`data: ${JSON.stringify({ delta: chunk.text })}\n\n`);
  }
  res.write("data: [DONE]\n\n");
  res.end();
}
```

The client reads it with `EventSource` and updates the UI per token:

```ts
const source = new EventSource(`/api/chat?q=${encodeURIComponent(q)}`);
source.onmessage = (event) => {
  if (event.data === "[DONE]") { source.close(); return; }
  const { delta } = JSON.parse(event.data);
  appendToken(delta);
};
source.onerror = () => {
  // EventSource reconnects automatically; you can track attempts here.
};
```

Two headers deserve emphasis. `no-transform` tells proxies not to re-encode the stream, and `X-Accel-Buffering: no` is the header nginx respects to disable response buffering. Without these, chunks pile up and your stream arrives in one lump at the end.

## Why reconnect is where SSE earns its place

Networks drop. SSE's `EventSource` reconnects with exponential back-off for free and sends a `Last-Event-ID` header so you can resume from the last chunk the client saw. Just number your events:

```ts
let id = 0;
for await (const chunk of llm.stream(question)) {
  res.write(`id: ${++id}\ndata: ${JSON.stringify({ delta: chunk.text })}\n\n`);
}
```

On the server, read `req.headers["last-event-id"]`, skip already-sent chunks, and keep going. Few chat apps implement this properly, and it is the difference between an answer that vanishes on a flaky connection and one that resumes.

## When WebSockets actually win

WebSockets upgrade the HTTP connection to a persistent, framed, full-duplex channel. That power buys you three things SSE cannot do:

1. **Binary payloads.** Voice chunks, images, or audio can travel raw instead of base64 inside JSON.
2. **Client-to-server traffic mid-stream.** Typing indicators, cancel-generation signals, or live corrections flow back over the same socket.
3. **Bidirectional chat with a single connection.** Multiplayer or collaborative chat where the server also needs to push unsolicited messages works better on one socket than on `EventSource` plus POST fallback.

A minimal Node WebSocket server using the `ws` library:

```ts
import { WebSocketServer } from "ws";
const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (socket) => {
  socket.on("message", async (raw) => {
    const { question } = JSON.parse(raw.toString());
    for await (const chunk of llm.stream(question)) {
      if (socket.readyState !== 1) break;
      socket.send(JSON.stringify({ delta: chunk.text }));
    }
    socket.send(JSON.stringify({ done: true }));
  });
});
```

The client side is straightforward:

```ts
const socket = new WebSocket("wss://example.com/ws");
socket.onopen = () => socket.send(JSON.stringify({ question: q }));
socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.done) return;
  appendToken(msg.delta);
};
```

The catch is what you now own: heartbeat/ping-pong to detect dead peers, reconnection with back-off, message framing and ordering, and connection state for every user. None of that is free with SSE.

## Proxies, CDNs, and the operational reality

This is usually the deciding factor. SSE rides plain HTTP, so Vercel, Cloudflare, nginx, and your corporate proxy all understand it; buffering is the only knob you must turn. WebSockets require an upgrade handshake that many proxies terminate or that need explicit configuration, and long-lived sockets can interfere with autoscaling because your load balancer cannot freely drain connections.

On Vercel specifically, use the Edge runtime for streaming endpoints so tokens flush promptly, and remember serverless functions have execution limits; keep generations bounded and terminate client-side when the user stops reading.

## Decision framework

Choose **SSE** when: the UI is a single prompt/response stream, you want automatic resume and back-off, you deploy behind standard proxies or serverless, and payloads are JSON. This covers the vast majority of chat, search, and autocomplete features.

Choose **WebSockets** when: you need binary or full-duplex mid-stream, you are building collaborative or presence features, or a single socket is cheaper than `EventSource` plus separate write endpoints for your traffic shape.

Pick the smallest transport that solves the problem. Protocols are infrastructure you will keep, and the wrong one is painful to swap later.

## Conclusion

For LLM streaming, SSE is the default you should have to justify not using: automatic reconnection, proxy friendliness, and simple HTTP semantics cover almost every chat UI. WebSockets justify their cost only when bidirectionality or binary payloads are real requirements. Match the transport to the traffic, budget for reconnection either way, and you avoid the most common streaming outage pattern: a connection that silently never retries.