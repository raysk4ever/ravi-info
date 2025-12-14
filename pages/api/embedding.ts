import type { NextApiRequest, NextApiResponse } from 'next'
import { OllamaEmbeddings } from '@langchain/ollama'
import { FaissStore } from '@langchain/community/vectorstores/faiss'
import { Document } from '@langchain/core/documents'
import { fileURLToPath } from 'url'
import path from 'path'
import { stat } from 'fs'
import { OpenAIEmbeddings } from '@langchain/openai'


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    
    // const embeddings = new OllamaEmbeddings({
    //   baseUrl: process.env.EMBEDDING_URL || 'http://localhost:11434',
    //   model: 'nomic-embed-text:latest'
    // })
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small'
    })
    if (req.method !== 'POST') {
      res.setHeader("Allow", ["POST"])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    // need to train the model for faiss
    const { documents = [], text, metadata } = req.body
    const allDocs = []
    if (documents.length > 0) {
      for (const docData of documents) {
        const doc = new Document({ pageContent: docData.text, metadata: docData.metadata || {} })
        allDocs.push(doc)
      }
      const vectorStore = await FaissStore.fromDocuments(allDocs, embeddings)
      await vectorStore.save(path.join(__dirname, '../../public/faiss_index_openai'))
      return res.status(200).json({ status: 'Embeddings generated from documents and FAISS index updated' })
    }
    if (!text) {
      return res.status(400).json({ error: 'Text is required in the request body' })
    }

    const doc = new Document({ pageContent: text, metadata: metadata || {} })
    const vectorStore = await FaissStore.fromDocuments([doc], embeddings)
    await vectorStore.save(path.join(__dirname, '../../public/faiss_index'))
    res.status(200).json({ status: 'Embedding generated and FAISS index updated' })
  } catch (error) {
    console.error('Error generating embedding:', error)
    res.status(500).json({ error: 'Failed to generate embedding' })
  }
}