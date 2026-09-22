---
title: "RAG Chunking Strategies: How to Split Documents"
description: "Chunk size and overlap decide retrieval accuracy. Compare fixed, recursive, semantic, and agentic chunking with practical defaults for RAG."
date: "2026-09-22"
tags: ["RAG", "Chunking", "LLM", "Embeddings"]
image: "/blog-images/rag-chunking-strategies.jpg"
---

RAG chunking is the practice of splitting source documents into pieces before embedding them, sized so that retrieval returns answers instead of noise. The chunk size, overlap, and splitting method set the ceiling on retrieval quality — a well-tuned vector store stores chunks that a retriever can actually match.

Chunking is where RAG quality is won or lost: the same document, token budget, and embeddings can differ more by chunking strategy than by model choice.

![RAG document chunking strategies](/blog-images/rag-chunking-strategies.jpg)

## Why Does Chunking Matter in RAG Retrieval?

Embeddings represent semantic closeness, not question-answering fit. A 2,000-token chunk is semantically close to the answer text, but too much context for a focused model window; a 100-token chunk is precise but may cut the answer in half. Chunking balances *precise match* against *complete context*, and overlap compensates for the cuts.

## What Are the Main Chunking Strategies?

| Strategy | How it splits | Best for | Drawback |
|----------|---------------|----------|----------|
| Fixed-size | Every N tokens | Fast, simple baselines | Cuts sentences mid-thought |
| Recursive | Split on paragraphs / sentences | General documents | Needs tuned separators |
| Semantic | Break where meaning shifts | Long-form prose | Costs extra embedding calls |
| Agentic / LLM-based | Model decides boundaries | Complex, mixed documents | Slow and expensive |

Choose in this order: start with **recursive character splitting** on paragraphs and sentences, measure retrieval quality, then reach for semantic or agentic only when simple splits underperform.

## What Is the Best Chunk Size for RAG?

For chat-style question answering there is no single number, but practical production ranges are consistent:

- **256-512 tokens** per chunk is a strong default for fact-oriented Q&A.
- **Up to 1,024 tokens** works when answers are long sections, not short facts.
- **10-20% overlap** (e.g., 50 tokens on a 256-token chunk) is the safe default.
- Below ~128 tokens, retrieval fragments answers; above ~1,500, context dilutes precision.

Aim for chunks that *could be an answer by themselves*. That heuristic beats any hard number.

## How Much Overlap Should Chunks Have?

Overlap exists because semantic boundaries don't align with token counts. Use roughly **10-20%**, tuned so that cutting a chunk never drops the start of a sentence or a code definition. Too much overlap bloats storage and cost; too little severs context.

## Should Code and Tables Be Chunked Differently?

Yes — mixed content is where default splitters hurt most. Split code on function and class boundaries instead of token counts, keep tables as atomic units, and store the source metadata (file, section, page) on every chunk so retrieval can cite its origin. Structured chunks make grounding checkable, which also helps when the chunks feed [fine-tuned or agentic pipelines](/blog/rag-vs-fine-tuning).

Pair good chunking with the right framework — see my [LangChain vs LlamaIndex](/blog/langchain-vs-llamaindex) comparison and the [basic RAG walkthrough](/blog/building-rag). What's your current chunk size, and what broke when you changed it? Reply on [LinkedIn](https://www.linkedin.com/in/ravi-ksingh/).