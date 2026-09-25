---
title: "How I Built Gama AI: A Portfolio Chatbot That Answers for Me"
description: "Under the hood of the RAG-powered chatbot on my portfolio — LangChain, FAISS vector search, streaming NDJSON responses, and an LLM that talks like me."
date: "2026-09-25"
tags: ["RAG", "LangChain", "FAISS", "LLM", "Next.js"]
image: "/blog-images/gama-portfolio-chatbot.jpg"
---

Every recruiter asks roughly the same five questions. "What have you worked on?" "What's your tech stack?" "Why would I hire you?" Somewhere between the tenth greeting and the twentieth "share your resume", I decided to answer them permanently — not with a FAQ page, but with a chatbot that knows me.

The result is **Gama AI**, the little frog-headed assistant on [my portfolio's homepage](https://www.socialamigo.in/). Ask it anything about my background and it answers in first person, streams the reply word by word, and can even hand over my resume. Under the hood it's a small RAG pipeline: my content embedded into a local FAISS index, retrieved per question, and handed to an LLM that's been told to act like me.

## The architecture at a glance

```
Next.js page
  └─ GET /api/raggy?q=<question>        (streams NDJSON events)
       ├─ rate limit (MongoDB, 5/min per IP)
       ├─ FAISS similarity search  (top-3 chunks)
       ├─ persona prompt (system + human)
       └─ stream LLM output  →  text deltas
```

The client is a chat panel on the homepage. Every reply is streamed over plain chunked HTTP as **newline-delimited JSON** (NDJSON) — no WebSockets, no SSE library, just a `fetch` body reader on one side and `res.write()` on the other.

## 1. The knowledge base: content → embeddings → FAISS

Everything Gama knows about me lives in a [FAISS index](https://github.com/facebookresearch/faiss) sitting in `public/faiss_index_openai`. Building it was the same classic recipe from [my earlier RAG post](/blog/building-rag): split my bio, projects, and experience into chunks, embed each chunk, and store the vectors plus their metadata.

```ts
const vectorStore = await FaissStore.load(indexPath, embeddings)
const result = await vectorStore.similaritySearchWithScore(question, 3)
```

The interesting part is that I keep **two** indexes and pick between them by environment:

| Environment | Embeddings | Index |
|---|---|---|
| Local dev | `nomic-embed-text` via Ollama | `faiss_index_ollama` |
| Production | `text-embedding-3-small` (OpenAI) | `faiss_index_openai` |

Same code, zero API cost while developing, production-grade embeddings on deploy. The model producing the vectors has to match at build and query time — that's why the index and embedding model are paired, never mixed.

## 2. Streaming the answer over NDJSON

The API route is where the real-time feeling comes from. Headers are set for chunked streaming, then events are written one JSON object per line with an explicit flush:

```ts
res.setHeader("Content-Type", "text/plain; charset=utf-8")
res.setHeader("Cache-Control", "no-cache")
res.setHeader("Connection", "keep-alive")
res.setHeader("Transfer-Encoding", "chunked")
```

The RAG pipeline is an async generator that yields both status updates and text tokens, and the route forwards them as typed events:

```ts
for await (const chunk of runRag({ question, onStatus: step =>
  writeEvent(res, { type: "status", step })
})) {
  if (typeof chunk === "object" && chunk.__model) {
    writeEvent(res, { type: "model", name: chunk.__model })
    continue
  }
  writeEvent(res, { type: "text", delta: chunk })
}
```

The client hook then reads `response.body.getReader()`, buffers up to each newline, parses lines as events, and switches on the type:

- `"status"` → animate the pipeline steps (connecting → searching → generating)
- `"text"` → append the delta to the assistant message, character by character
- `"model"` → show which model answered
- `"resume_card"` → render the resume download card
- `"end"` → mark the message as complete

Switching to "status" events was the trickiest bit UX-wise: without them, a slow retrieval pass feels like a broken chat. Now the visitor sees the pipeline doing its job before a single token arrives.

## 3. Making an LLM talk like a human

Retrieval only gets you halfway. If I'd dropped chunks into a generic prompt, the bot would answer like an assistant about "the candidate". The system prompt is a persona contract instead:

```
You are Ravi Singh, a software engineer.
Answer questions as if you are talking about your own professional experience.
Use ONLY the provided context. Do not assume or invent anything.

Strict Rules:
- Never describe yourself as an AI, assistant, chatbot, or model
- Never fabricate or exaggerate
- Never use phrases like "based on the context" or "from the resume"

If the information is not available, say:
- "I don't have that listed yet."
```

Notice the guardrail style: instead of a pile of "don't do this" vibes, I explicitly want hallucinations handled with **"I don't have that listed yet."** — honesty becomes a feature, and it keeps the bot from inventing a fake project when a recruiter asks about something I haven't written down.

## 4. The side jobs: rate limiting and the resume shortcut

Two small touches make the bot production-safe and genuinely useful:

- **Rate limiting via MongoDB**: each request bumps a counter per IP with a 60-second expiry window (`$inc` + `$setOnInsert`, atomic upsert). Over the limit? The bot pauses politely, apologizes, and hands out [my email](mailto:raysk7161@gmail.com) and [LinkedIn](https://www.linkedin.com/in/ravi-ksingh/) instead of throttling with a cryptic 429 page.
- **The resume keyword path**: questions containing `resume`, `cv`, `profile`, or `bio` short-circuit the whole RAG pipeline and stream a formatted resume card with a PDF download link — because I never want a recruiter two clicks away from my resume to wait on vector search.

## 5. What I'd change next

The current setup nails the "answers about me" use case, but I've got a short list of upgrades:

- **Streaming with a proper LLM that was actually fine-tuned on my writing** — right now I prompt my way to a persona, which is the cheap 80%. 
- **Conversation memory.** The chat is stateless per question; follow-up questions like "and that project?" don't work yet.
- **Richer retrieval**: hybrid keyword + vector search, and maybe a reranker so the top-3 chunks are the *right* three.

If you're building a portfolio chatbot, my advice is to keep the scope brutally small: one persona, one source of truth, streaming replies. Recruiters care that it's **fast** and **honest** — everything else is polish.

Try [Gama AI](https://www.socialamigo.in/) on the right side of my homepage hero — ask it about me, and see if I've documented the answer yet 🐸. (Want more on the stack? I also write about [RAG chunking](/blog/rag-chunking-strategies) and [LangChain vs. LlamaIndex](/blog/langchain-vs-llamaindex) on [Medium](https://techgama.medium.com/).)