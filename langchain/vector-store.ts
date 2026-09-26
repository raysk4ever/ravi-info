import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { getEmbeddings } from "./embedding"
import path from "node:path";
import fs from "fs";

const INDEX_PATH_MAP = {
  openai_text_embedding_3_small: "public/faiss_index_openai",
  ollama_nomic_embed_text_latest: "public/faiss_index_ollama"
}

/**
 * Max FAISS distance for a chunk to count as relevant.
 *
 * FaissStore returns a *distance* (lower = closer). Each embedding model has
 * its own scale, so one shared number does not work: measured on this corpus,
 * nomic-embed-text put real matches at 0.63-0.95 and junk at 1.14+, while
 * text-embedding-3-small put matches at 0.94-1.39 and junk at 1.65+.
 * Overridable per environment in case the corpus shifts.
 */
const RELEVANCE_THRESHOLD: Record<'ollama' | 'openai', number> = {
  ollama: Number(process.env.RAG_THRESHOLD_OLLAMA ?? 1.05),
  openai: Number(process.env.RAG_THRESHOLD_OPENAI ?? 1.5),
}

export const getEmbeddingModel = () => {
  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? 'ollama' as const : 'openai' as const
}

export const getRelevanceThreshold = () => RELEVANCE_THRESHOLD[getEmbeddingModel()]

export const getIndexPath = () => {
  const isDev = process.env.NODE_ENV === 'development';
  const vectorIndexPath = isDev ? 'ollama_nomic_embed_text_latest' : 'openai_text_embedding_3_small'
  const indexPath = INDEX_PATH_MAP[vectorIndexPath]
  return path.join(process.cwd(), indexPath)
}
export const getVectorStore = async () => {
  const isDev = process.env.NODE_ENV === 'development';
  const embeddingModel = isDev ? 'ollama' : 'openai'
  const embeddings = getEmbeddings(embeddingModel)
  if (!embeddings) {
    throw new Error("Embeddings not configured")
  }
  const indexPathRelative = getIndexPath();
  if (!fs.existsSync(indexPathRelative)) {
    console.log('❌ FAISS Index not Found!!', indexPathRelative)
    throw new Error("FAISS Index not found. Run: yarn rag:build")
  }
  console.log("🔄 Loading FAISS index...");
  const t1 = performance.now();
  const vectorStore = await FaissStore.load(indexPathRelative, embeddings);
  console.log(`✅ Loaded FAISS index in ${performance.now() - t1} ms`);
  return vectorStore
}

/** Reads the manifest written by scripts/build-rag-index.cjs, if present. */
export const getIndexMeta = () => {
  try {
    const manifest = path.join(getIndexPath(), 'manifest.json');
    if (!fs.existsSync(manifest)) return null;
    return JSON.parse(fs.readFileSync(manifest, 'utf8'));
  } catch {
    return null;
  }
}
