import { OllamaEmbeddings } from "@langchain/ollama";
import { OpenAIEmbeddings } from "@langchain/openai";

export const getEmbeddings = (embeddingModel: 'ollama' | 'openai') => {
  // use ollama local embeddings in development
  if (embeddingModel === 'ollama') {
    return new OllamaEmbeddings({
      baseUrl: process.env.EMBEDDING_URL || 'http://localhost:11434',
      model: 'nomic-embed-text:latest'
    });
  }
  if (embeddingModel === 'openai') {
    return new OpenAIEmbeddings({
      model: 'text-embedding-3-small'
    })
  }
  return new OllamaEmbeddings({
    baseUrl: process.env.EMBEDDING_URL || 'http://localhost:11434',
    model: 'nomic-embed-text:latest'
  });
};