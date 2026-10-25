---
title: "Structured Outputs with LLMs: Force Valid JSON Without Prompt Hacks"
description: "Stop crossing your fingers and praying the model returns valid JSON. Use structured outputs, Zod schemas, and function calling to get typed, parseable responses from LLMs every time."
date: '2026-10-16'
tags: ["zod", "structured-outputs", "function-calling"]
image: "/blog-images/structured-outputs-with-llms.jpg"
type: "blog"
---

LLM integrations usually break at the same place: the model returns Markdown-wrapped JSON, a trailing comment, or an extra sentence, and your `JSON.parse` throws. You end up with brittle regexes, retry loops, and "please output only valid JSON" prompts that work until they do not. Structured outputs solve this by constraining the model to a schema you control, so the response is typed and parseable on the first try.

This post shows how to wire structured outputs into a TypeScript app, validate the result with Zod, and fall back to function calling when the provider does not support native JSON mode.

## What structured outputs actually do

Without structured output, the model generates free text and you hope it looks like JSON:

```text
Here is the result: ```json
{ "name": "Ada", "role": "engineer" }
```
```

That works for a demo. In production, a code fence, a preamble, or a stray newline breaks the parser. Structured outputs tell the model to generate only tokens that match a given schema, so the response is always valid against it. You get typed fields, no fences, and no guessing.

## Define the schema with Zod

Start with the shape you want, then let the library convert it to the provider's schema format. Here is a candidate extraction profile:

```typescript
import { z } from "zod";

const CandidateSchema = z.object({
  name: z.string().min(1),
  years_experience: z.number().int().nonnegative(),
  skills: z.array(z.string()).max(10),
  seniority: z.enum(["junior", "mid", "senior", "staff"]),
  summary: z.string().max(200),
});

type Candidate = z.infer<typeof CandidateSchema>;
```

The schema doubles as documentation and runtime validation. If the model returns `years_experience: "five"`, Zod catches it before it reaches your database.

## Call the model with JSON mode

Most chat-completion APIs support a `response_format: { type: "json_object" }` option. The model then emits raw JSON instead of chat prose. Pair it with a system prompt that restates the schema:

```typescript
import OpenAI from "openai";

const openai = new OpenAI();

async function extractCandidate(resumeText: string): Promise<Candidate> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Extract a candidate profile as JSON matching this schema:
${JSON.stringify(CandidateSchema.shape, null, 2)}`,
      },
      {
        role: "user",
        content: resumeText,
      },
    ],
    temperature: 0,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  return CandidateSchema.parse(JSON.parse(raw));
}
```

JSON mode guarantees valid JSON, but not that it matches your schema. That is why you still run `CandidateSchema.parse` on the result — parse errors are the signal to retry or fall back.

## Fall back to function calling

Some providers and older models do not offer JSON mode. Function calling (tool use) is the reliable alternative: the model picks a function and fills its arguments, which the runtime validates against the schema.

```typescript
const tools = [
  {
    type: "function",
    function: {
      name: "extract_candidate",
      description: "Extract a candidate profile from a resume",
      parameters: CandidateSchema,
    },
  },
];

async function extractCandidateWithTools(resumeText: string): Promise<Candidate> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: `Extract the candidate profile: ${resumeText}` },
    ],
    tools,
    tool_choice: { type: "function", function: { name: "extract_candidate" } },
    temperature: 0,
  });

  const call = completion.choices[0].message.tool_calls?.[0];
  if (!call) throw new Error("Model did not call the function");
  return CandidateSchema.parse(JSON.parse(call.function.arguments));
}
```

The function name acts as a schema anchor, and `tool_choice: required` forces the model to use it. You get the same typed `Candidate` object without parsing chat text.

## Handle errors and retries

Structured outputs reduce failures, but they do not eliminate them. Wrap the call so a schema violation triggers a retry with a stricter prompt, then a hard failure:

```typescript
async function extractWithRetry(resumeText: string): Promise<Candidate> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await extractCandidate(resumeText);
    } catch (err) {
      lastError = err;
      // append the previous error to the prompt so the model self-corrects
      resumeText += `\n\nThe previous attempt failed validation: ${err}. Fix it.`;
    }
  }
  throw lastError;
}
```

Cap retries at two or three. A model that cannot satisfy a simple schema on the third try will not get there on the tenth.

## When to use which

- **Native JSON mode** — fastest path when the provider supports it; lowest latency, no function-call overhead.
- **Function calling** — best for wider provider coverage and strict `tool_choice` enforcement.
- **Zod parse** — always the final gate, regardless of transport. Never trust the model output until your schema says it is valid.

## Conclusion

Stop asking LLMs nicely for JSON and start requiring it. Define the output schema once with Zod, request it through JSON mode or function calling, and validate every response before it touches your business logic. The result is fewer retry loops, no regexes over Markdown fences, and LLM integrations you can actually ship.