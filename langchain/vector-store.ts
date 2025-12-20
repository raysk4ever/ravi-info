import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { getEmbeddings } from "./embedding"
import path from "node:path";
import fs from "fs";

const INDEX_PATH_MAP = {
  openai_text_embedding_3_small: "public/faiss_index_openai",
  ollama_nomic_embed_text_latest: "public/faiss_index_ollama"
}

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
  // const vectorIndexPath = isDev ? 'ollama_nomic_embed_text_latest' : 'openai_text_embedding_3_small'
  // const indexPath = INDEX_PATH_MAP[vectorIndexPath]
  // const indexPathRelative = path.join(process.cwd(), indexPath) // "public/faiss_index_openai");
  const indexPathRelative = getIndexPath();
  if (!fs.existsSync(indexPathRelative)) {
    console.log('❌ FAISS Index not Found!!', indexPathRelative)
    throw new Error("FAISS Index not found")
  }
  console.log("🔄 Loading FAISS index...");
  const t1 = performance.now();
  const vectorStore = await FaissStore.load(indexPathRelative, embeddings);
  console.log(`✅ Loaded FAISS index in ${performance.now() - t1} ms`);
  return vectorStore
}