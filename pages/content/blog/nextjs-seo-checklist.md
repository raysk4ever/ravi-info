---
title: "Next.js SEO in 2026: Technical Checklist That Works"
description: "A practical Next.js SEO checklist: metadata, canonical URLs, sitemaps, structured data, and AI-search readiness — everything Google and LLMs actually check."
date: "2026-09-22"
tags: ["Next.js", "SEO", "Web Development"]
image: "/blog-images/nextjs-seo-checklist.jpg"
---

Next.js SEO is the practice of making static and dynamic routes fully discoverable by search engines and AI agents — correct metadata, canonical URLs, sitemaps, structured data, and crawler-friendly rendering. Because Next.js ships server-side HTML, most pages are already crawlable; the wins come from the small set of fundamentals most apps skip.

Next.js SEO in 2026 is basic SEO done precisely. Get the metadata, canonicals, indexable blog routing, and schema right — then keep the content fresh.

![Next.js SEO technical checklist](/blog-images/nextjs-seo-checklist.jpg)

## Why Does Next.js Need an SEO Checklist?

Next.js renders HTML on the server, which is why Google, GPTBot's data pipelines, and Perplexity can read it. But per-page defaults are missing unless you set them: title tags, descriptions, Open Graph, and canonical URLs are all opt-in. A checklist turns "it builds" into "it ranks."

## What Are the Core Metadata Rules?

- **Title tag**: 50-60 characters, keyword first, brand last — `RAG vs Fine-Tuning: How to Choose` + `| Ravi Singh`.
- **Meta description**: 150-160 characters, keyword included, active voice, a soft CTA.
- **One H1 per page**, keyword forward; descriptive H2-H3 hierarchy beneath it.
- **Canonical**: self-referencing absolute URL so duplicates never dilute the page.
- **Open Graph + Twitter cards**: `og:title`, `og:description`, `og:image`, `twitter:image` with an absolute image URL.

In the App Router use `generateMetadata`; in Pages Router use `next/head` per route — neither is optional for pages you want indexed.

## How Should Sitemaps and Robots Work in Next.js?

Generate a sitemap at build time and reference it from robots.txt:

- `next-sitemap` with `siteUrl`, `generateRobotsTxt: true`, and blog slugs included if you statically generate them.
- **Verify the post directory the sitemap reads from.** A wrong glob silently drops every blog post from the index — that is the single most common Next.js SEO failure I've seen.
- Submit the sitemap URL in Google Search Console after deploy.

## What Structured Data Should a Next.js Blog Use?

Use JSON-LD emitted in server-rendered HTML (JavaScript-injected schema is processed late):

- **BlogPosting** for posts — `headline`, `datePublished`, `dateModified`, `author` (Person), `image`, `mainEntityOfPage`.
- **Article/Organization/Person** for the site and author profiles.
- Skip **FAQPage** — Google retired FAQ rich results in May 2026; for real user Q&A pages use QAPage instead.

## How Do You Get Found by AI Search and Agents?

AI crawlers do not execute JavaScript, so keep key content server-rendered:

- Allow `OAI-SearchBot` (ChatGPT Search), `Claude-SearchBot`, and `PerplexityBot` in robots.txt — they decide AI citations.
- Keep blocks on `/api/`, never on content.
- Add a root `llms.txt` describing your pages — optional, ignored by Google, but it helps other AI surfaces.
- Publish fresh, question-answered posts; recency is a strong AI-citation signal.

## What About Images and Core Web Vitals?

Serve compressed WebP/AVIF images under 200KB, set explicit width/height to prevent CLS, add descriptive alt text (keyword once), and measure INP, LCP, and CLS with real field data rather than guesswork. A fast, stable page helps both rankings and AI summarization quality.

That's the checklist I applied while [building this very site](/blog). Want the same playbook for your app, or help diagnosing a sitemap that quietly dropped your posts? Message me on [LinkedIn](https://www.linkedin.com/in/ravi-ksingh/).