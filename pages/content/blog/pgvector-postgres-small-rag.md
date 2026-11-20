---
title: "Postgres + pgvector for Small RAG Apps: When a Vector Database Is Overkill"
description: "Use Postgres with pgvector as the vector store for a small RAG app — one database for app data and embeddings, HNSW search, and metadata filtering without separate infrastructure."
date: '2026-11-09'
tags: ["Postgres", "pgvector", "RAG", "vector-search", "Next.js"]
image: "/blog-images/pgvector-postgres-small-rag.jpg"
type: "blog"
---

If your RAG app has a few thousand documents and you already run Postgres, you probably do not need a separate vector database. The `pgvector` extension turns Postgres into a good-enough vector store for small to medium workloads: same transactions, same backups, same SQL filtering, and one fewer service to operate. This post shows how to enable it, store chunks with embeddings, and run similarity search with HNSW and metadata filters inside a Next.js API route.

## Why Postgres is enough for small RAG

FAISS is fast because it lives in-process. A dedicated vector database wins when you need millions of vectors, heavy write throughput, or specialized quantization. For a portfolio chatbot or internal docs search with under a few hundred thousand chunks, the overhead of a second database — auth, replication, backup, deployment — often costs more than it saves.

Postgres with `pgvector` gives you three things that matter at this scale:

- **One source of truth.** Documents, chunks, embeddings, permissions, and usage logs live in the same database. A join, not an API call, enforces who can see what.
- **Metadata filtering for free.** Filter vectors by `tenant_id`, `visibility`, or `source` in the same query. Most production RAG bugs are leaking context across tenants — SQL makes that check explicit.
- **Operational simplicity.** Point-in-time recovery, migrations, and poolers you already know cover your vectors too.

The trade-off is real: at large scale, dedicated indexes stretch further. But you should feel that pain before you buy the complexity to solve it.

## Enable pgvector and design the schema

First, install the extension. On managed Postgres (Neon, Supabase, RDS) it is usually available as a one-line toggle. Locally:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then model chunks as rows, not files. Keep the original text, its embedding, and the metadata you need to filter or cite:

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source TEXT NOT NULL,          -- e.g. 'resume', 'faq', 'runbook'
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),        -- must match your embedding model
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

The `vector(1536)` dimension is not flexible. `text-embedding-3-small` returns 1536 dimensions; `nomic-embed-text` returns 768. If the model and the column disagree, inserts fail or — worse — similarity silently behaves badly. Pick the model first, then set the column, and never mix models in one table.

For search at scale, add an HNSW index. HNSW offers better recall than the older IVFFlat for most small datasets, and it supports incremental inserts without a rebuild:

```sql
CREATE INDEX chunks_embedding_idx
  ON chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX chunks_document_idx ON chunks (document_id);
```

## Insert chunks without blocking the UI

Ingestion is straightforward: split documents, embed each chunk, insert rows. Batch the inserts and run them as a background job or build-time script, not inside a user request. In Node.js the pattern is one transaction per document so a bad chunk does not poison the rest:

```ts
// lib/ingest.ts
import { pool } from "./db";
import { embed } from "./embeddings";

export async function ingestDocument(docId: string, pieces: string[]) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < pieces.length; i++) {
      const vector = await embed(pieces[i]);
      await client.query(
        "INSERT INTO chunks (document_id, chunk_index, content, embedding) VALUES ($1, $2, $3, $4)",
        [docId, i, pieces[i], JSON.stringify(vector)],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
```

Passing the embedding as JSON text works with most drivers because `pgvector` accepts the bracketed array format. If your driver sends `number[]`, the same stringified form is the safest portable choice.

## Query with cosine similarity and metadata filters

Retrieval is one SQL query. The `<=>` operator returns cosine distance; order by it ascending so the closest vectors come first. Crucially, apply tenant and visibility filters in the same query — never fetch broadly and filter in code:

```sql
SELECT
  c.content,
  c.chunk_index,
  d.title,
  d.source,
  1 - (c.embedding <=> $1::vector) AS similarity
FROM chunks c
JOIN documents d ON d.id = c.document_id
WHERE d.tenant_id = $2
ORDER BY c.embedding <=> $1::vector
LIMIT 5;
```

In TypeScript the call takes three lines. Note that the embedding model used here must be identical to the one used at ingest time:

```ts
// lib/retrieve.ts
import { embed } from "./embeddings";
import { pool } from "./db";

export async function retrieve(question: string, tenantId: string) {
  const vector = await embed(question);
  const { rows } = await pool.query(
    `SELECT c.content, d.title, d.source,
            1 - (c.embedding <=> $1::vector) AS similarity
     FROM chunks c
     JOIN documents d ON d.id = c.document_id
     WHERE d.tenant_id = $2
     ORDER BY c.embedding <=> $1::vector
     LIMIT 5`,
    [JSON.stringify(vector), tenantId],
  );
  return rows;
}
```

A threshold matters as much as the ranking. If the best `similarity` is below `0.35`, the corpus probably has nothing relevant and the model should say so instead of hallucinating. Tune that cutoff on a small hand-labeled set of questions — it is the cheapest accuracy win you have.

## Checking recall with HNSW

HNSW search is approximate. Keep the defaults (`m = 16`, `ef_construction = 64`) and tune only when a small eval — 30 to 50 real questions with known answers — shows misses. If you see poor results, suspect chunking and the similarity threshold before blaming the index: a 512-token chunk with 64 tokens of overlap usually beats a cleverer index over paragraph-sized cuts.

## When to move off Postgres

Measure before migrating. Watch p95 retrieval latency, index size relative to memory, and contention between app writes and vector scans. When queries slow down despite a small table, or when you need horizontal scaling across tenants, a dedicated vector database becomes justified. Until then, Postgres is simpler to secure, back up, and reason about — and most RAG failures are permissions and stale chunks, not index throughput. Keep retrieval behind a small function like `retrieve()` above, and swapping stores stays a day of work, not a rewrite.

## Conclusion

Postgres with `pgvector` is not the fastest way to search vectors, but for small RAG apps it is the easiest to operate correctly. One database, an HNSW index, SQL metadata filters, and a similarity threshold give you citations and permissions without a second service. Start there, measure recall and latency honestly, and migrate only when the data proves you need to.
