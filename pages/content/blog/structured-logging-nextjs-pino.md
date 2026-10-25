---
title: "Structured Logging for Next.js API Routes with Pino"
description: "Replace console.log with structured logs in Next.js API routes using Pino — request IDs, latency, status codes, and safe fields you can actually query in production."
date: '2026-10-19'
tags: ["nextjs", "logging", "pino", "observability", "nodejs"]
image: "/blog-images/structured-logging-nextjs-pino.jpg"
type: "blog"
---

`console.log` is the default logging habit in Next.js API routes, but it falls apart the moment you have more than one instance, one error, or one on-call at 2 a.m. A log line like `Connected to DB` tells you nothing about which request triggered it, how long it took, or whether it succeeded. Structured logging fixes that by emitting one JSON object per line, with stable fields you can search, aggregate, and alert on.

This post shows how to wire Pino into Next.js 13 Pages Router API routes, add a request ID to every line, time each handler, and keep sensitive data out of your logs. About 100 lines of code, no external logging service required to start.

![Structured logging for Next.js API routes with Pino](/blog-images/structured-logging-nextjs-pino.jpg)

## Why structured logging

An unstructured log is free text:

```
Received request
Connected to database
User created
```

You cannot grep it by status code, you cannot chart latency over time, and you cannot tie two lines to the same request. Structured logging emits JSON instead:

```json
{"level":30,"time":"2026-10-19T14:02:11.123Z","pid":1234,"reqId":"a1b2c3","msg":"request completed","method":"POST","path":"/api/webhook","statusCode":200,"latencyMs":142}
```

Now a log query like `statusCode >= 500` or `latencyMs > 1000` actually works, and every line carries a `reqId` so you can trace a single request across handlers, middleware, and downstream calls.

## Set up Pino

Install Pino:

```
npm install pino
npm install -D @types/pino
```

Pino writes to `process.stdout` by default, which works nicely on Vercel because platform log drains (Vercel Log Drains, Datadog, Honeybadger, etc.) consume stdout as JSON lines.

Create a shared logger in `lib/logger.ts`:

```typescript
import pino from "pino";

export const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  timestamp: pino.stdTimeFunctions.isoTime,
});
```

The `level` lets you tighten verbosity per environment without code changes — `debug` locally, `warn` in production until an incident.

## Add a request ID middleware

Every log line needs a `reqId` so you can follow one request through the system. In Next.js Pages Router, wrap your API handlers with a small middleware that generates a request ID, attaches it to the request, and logs the outcome:

```typescript
// lib/with-logging.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { log } from "./logger";

export function withLogging(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const reqId = (req.headers["x-request-id"] as string) ?? crypto.randomUUID();
    (req as any).reqId = reqId;
    const start = Date.now();

    log.info({ reqId, method: req.method, url: req.url }, "request started");

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      const latencyMs = Date.now() - start;
      log.info({
        reqId,
        method: req.method,
        path: req.url,
        statusCode: res.statusCode,
        latencyMs,
      }, "request completed");
      return originalJson(body);
    };

    return handler(req, res);
  };
}
```

Use it in an API route:

```typescript
// pages/api/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { withLogging } from "@/lib/with-logging";
import { log } from "@/lib/logger";

const handler: NextApiHandler = async (req, res) => {
  try {
    const { event } = JSON.parse(req.body || "{}");
    log.info({ reqId: (req as any).reqId, event }, "processing webhook");
    // ... your business logic
    return res.status(200).json({ ok: true });
  } catch (err) {
    log.error({ reqId: (req as any).reqId, err: String(err) }, "webhook failed");
    return res.status(500).json({ error: "internal error" });
  }
};

export default withLogging(handler);
```

Notice the error path logs with `log.error` and still returns a generic `500` to the client — never echo raw exception text or stack traces to the browser, but always capture them server-side.

## Log what matters, skip what does not

Good structured logs answer three questions without guesswork: what happened, which request it was, and how long it took. Add fields deliberately:

- `reqId` — ties lines together
- `method` and `path` — which endpoint
- `statusCode` — outcome
- `latencyMs` — performance
- `userId` — only if you have an authenticated session and it is not PII

Do not log passwords, tokens, email addresses, or full request bodies. A body dump is an easy way to ship secrets to your log drain. If you must debug payload shape, log a redacted summary:

```typescript
log.info({
  reqId,
  path: req.url,
  hasBody: Boolean(req.body),
  bodyKeys: req.body ? Object.keys(req.body) : [],
}, "received payload");
```

## Where the logs go

On Vercel, stdout from API routes is captured and streamed to your project's log drain. Pipe Pino's JSON output into any tool that accepts JSON lines:

- Vercel Log Drains → Datadog, Splunk, Loggly, etc.
- Self-hosted: `next start | pino-pretty` for readable local dev, or ship to Loki/Elasticsearch.

Because every line is valid JSON with a `time` field, you can alert on `level >= 50` (errors) or chart p95 latency by `path`. The structure is the point — plain text logs scale until they do not.

## Conclusion

Structured logging turns your Next.js API routes from a pile of `console.log` lines into a queryable system. With Pino, a request-ID middleware, and a disciplined set of fields, you can trace failures end to end and measure latency without touching the code again. Start with `reqId`, `statusCode`, and `latencyMs`, keep secrets out, and let the log drain do the heavy lifting.
