# Knowledge notes

Drop any of these files in this folder and the chatbot will be able to answer
from them after you run `yarn rag:build`:

| Extension | Handling |
|---|---|
| `.md` | Markdown is converted to plain text, front-matter honoured |
| `.txt` | Indexed as-is |
| `.yaml` / `.yml` | Parsed and flattened to readable key/value lines |
| `.json` | Parsed and flattened to readable key/value lines |

Everything else is ignored. Sub-folders are walked recursively.

## Front matter

If a file starts with a YAML block, it becomes document metadata:

```markdown
---
title: Multi-Agent Orchestrator
type: project
tags: [ai, langgraph]
---
```

Supported metadata: `title`, `type`, `tags`. Anything else is kept but not
indexed as searchable text.

## Tips for good answers

- **One topic per file.** A file becomes 1–3 chunks, so a file covering three
  unrelated topics retrieves badly.
- **Write in full sentences.** The retriever matches on meaning, and stray
  keywords with no context tend to match everything at once.
- **Lead with the answer.** Put the conclusion in the first sentence, then the
  supporting detail. Retrieved chunks often get truncated.
- **Name things explicitly.** "LangGraph" retrieves better than "the graph
  framework".

## After editing

```bash
yarn rag:build     # re-embed only what changed
yarn rag:check     # report staleness without writing anything
```

The indexer hashes every document, so unchanged files are never re-embedded.
