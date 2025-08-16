import {configDotenv} from 'dotenv'
import fs from 'fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";



const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-small'
})


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

configDotenv()

export async function *runRag({ question = '' }) {
  const indexPath = path.join(__dirname, "faiss_index");
  if (!fs.existsSync(indexPath)) {
    console.log('❌ FAISS Index not Found!!', indexPath)
    return
  }
  console.log("🔄 Loading FAISS index...");
  const vectorStore = await FaissStore.load(indexPath, embeddings);
  const llm = getLLM()
  const result = await vectorStore.similaritySearchWithScore(question, 4)
  const promptValue = await getPromptTemplate().invoke({
    context: JSON.stringify(result),
    input: question
  })
  const llmResponse = await llm.stream(promptValue)
  for await (const chunk of llmResponse) {
    console.log(chunk.content)
    yield chunk.content
  }
}

function getPromptTemplate() {
  const prompt = ChatPromptTemplate.fromTemplate(`
    You are a helpful and friendly assistant. You are ravi now Use the information below to answer
    the user's question naturally, as if you are chatting with them.
    Keep your answers clear, conversational, and avoid saying things like
    "based on the context" or "from the documents" or "from resume"

    Context:
    {context}

    Question: {input}
    Answer:
  `);
  return prompt 
}

function getLLM() {
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0
  });
}