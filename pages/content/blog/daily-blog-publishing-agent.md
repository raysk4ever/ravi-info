---
title: "Building a Daily Blog-Publishing Agent for My Next.js Portfolio"
description: "A reproducible pipeline for publishing one original tech post per day: markdown conventions, hero-image generation, build, deploy, and live-verification steps."
date: '2026-11-20'
tags: ["Next.js", "automation", "pipeline", "vercel"]
image: "/blog-images/daily-blog-publishing-agent.jpg"
type: "blog"
---

Publishing a post a day is a habit, but keeping a habit without dropping focus needs a small system — mine is an agent that proposes the topic, writes the draft, makes the hero image, and checks that the page is live. The runbook is the spec — this post documents the pipeline it describes, and I wrote it to match the conventions of the posts already on this site, like [Building a RAG App with LlamaIndex](/blog/building-rag).

## The pipeline at a glance

```
runbook
  ├─ TOPIC   → pick the title, ensure the slug is unique
  ├─ WRITE   → pages/content/blog/<slug>.md
  ├─ COVER   → public/blog-images/<slug>.jpg (1600×900)
  ├─ BUILD   → yarn build
  ├─ DEPLOY  → npx vercel@latest --prod --yes
  └─ VERIFY  → GET /blog/<slug> = 200, post in the listing
```

The four steps in order:

1. **Topic** — propose 3 candidate titles, none used before; save the chosen one as `pages/content/blog/<slug>.md`.
2. **Write** — 700–1000 words of practical, specific content with h2 sections and code examples, matching the conventions of the existing posts on this site. The opening states the problem or the claim in two sentences, the middle shows one concrete example or tradeoff, and the close gives a takeaway. I check existing slugs and titles before committing — topics should be original and practical, not generic.
3. **Cover** — generate a 1600×900 hero image at `public/blog-images/<slug>.jpg`.
4. **Ship** — `yarn build`, then deploy with the Vercel CLI, then curl `/blog/<slug>` until it returns 200.

The runbook starts with idempotency: if a file dated today already exists in `pages/content/blog/`, it stops before doing anything.

## The frontmatter schema

Every post starts with this exact shape — title is the SEO title, tags are lowercase, and the image path is always `/blog-images/<slug>.jpg`:

```
---
title: "Building a Daily Blog-Publishing Agent for My Next.js Portfolio"
description: "A reproducible pipeline for publishing one original tech post per day: markdown conventions, hero-image generation, build, deploy, and live-verification steps."
date: '2026-11-20'
tags: ["Next.js", "automation", "pipeline", "vercel"]
image: "/blog-images/daily-blog-publishing-agent.jpg"
type: "blog"
---
```

The body follows with `##` sections — never `#` (the title already lives in frontmatter), `**bold**` for emphasis, and fenced code blocks with a language tag. Links between posts, like [Building a RAG App with LlamaIndex](/blog/building-rag), fit the site's voice.

## How the hero image is made

Each post gets its own `public/blog-images/<slug>.jpg`, 1600×900. I build a small HTML banner — a dark gradient, the post title, a couple of tag chips — then render it at the right size and screenshot it:

1. Write the banner to a temp file.
2. Render it in a browser page at 1600×900.
3. Screenshot to `public/blog-images/<slug>.jpg`.

A broken image on the /blog page is the easiest failure to spot, so I verify every image as I go — for example, the existing `building-rag.jpg` resolves as 1600×900 (the file viewer reports the size). The banner I generate has a dark gradient, the post title, and a couple of tag chips — all readable without design skills.

## What "live" means

After the build and the Vercel deploy, the post is live at `/blog/<slug>` — https://www.socialamigo.in/blog/daily-blog-publishing-agent. Verification curls that URL until it returns 200, and confirms the post appears in the /blog listing. If the check fails, the post is fixed and redeployed.

## What I'd build next

The pipeline is manual for now — I run it when I have a chunk of time. Natural next steps: a daily cron job, a `npx @ravi/daily-blog` package so anyone can run the same flow, and an SEO pre-publish checklist that runs before the deploy.

## At the end of the day

When the steps above complete — the build passed, the deploy URL is captured, and `/blog/<slug>` returns 200 — the day is done: one new post is live on the portfolio. Nothing else is left open; the next one starts when the runbook runs again.

The point of the cadence: a post a day keeps the site growing without a chunk of focus every morning. Small system, big effect.