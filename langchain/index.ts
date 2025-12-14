import { configDotenv } from 'dotenv'
import fs from 'fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Ollama } from '@langchain/ollama';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { OllamaEmbeddings } from '@langchain/ollama'
import { ChatOpenAI } from '@langchain/openai'

// const embeddings = new OllamaEmbeddings({
//   baseUrl: process.env.EMBEDDING_URL || 'http://localhost:11434',
//   model: 'nomic-embed-text:latest'
// })
const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-small'
})
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

configDotenv()

export async function* runRag({ question = '' }) {
  // const indexPath = path.join(__dirname, "faiss_index");
  const indexPath = path.join(process.cwd(), "public/faiss_index")
  if (!fs.existsSync(indexPath)) {
    console.log('❌ FAISS Index not Found!!', indexPath)
    return
  }

  console.log("🔄 Loading FAISS index...");
  const t1 = performance.now();
  const vectorStore = await FaissStore.load(indexPath, embeddings);
  console.log(`✅ Loaded FAISS index in ${performance.now() - t1} ms`);
  const llm = getLLM({ model: 'openai' })
  console.log("🔄 Performing similarity search...");
  const result = await vectorStore.similaritySearchWithScore(question, 3)
  console.log("🔄 Generating response...", result);
  // build context with metadata from result to string
  const context = result.map(([doc, score], idx) => {
    return `Document ${idx + 1} (Score: ${score.toFixed(4)}):\n${doc.pageContent}\nMetadata: ${JSON.stringify(doc.metadata)}\n`
  }).join('\n----------------\n')
  console.log('⚡️context', context);
  const promptValue = await getPromptTemplate().invoke({
    context,
    input: question
  })
  // console.log('prompt value', promptValue);

  const llmResponse = await llm.stream(promptValue)
  console.log('llmResponse', llmResponse);
  // const tt = await llmResponse.getReader().read()
  // console.log('tt', tt);
  const reader = llmResponse.getReader(); // ✅ ONE reader only
  const decoder = new TextDecoder();

  while (true) {
    const { done, value, ...rest } = await reader.read();
    if (done) break;
    // console.log("chunk:", value);
    yield typeof value === "string" ? value : value.content ?? "";

  }
  // for await (const chunk of llmResponse) {
  //   console.log(chunk.content)
  //   yield chunk.content
  // }
}

// function getPromptTemplate() {
//   const prompt = ChatPromptTemplate.fromTemplate(`
//     You are a helpful and friendly assistant. You are ravi now Use the information below to answer
//     the user's question naturally, as if you are chatting with them.
//     Keep your answers clear, conversational, and avoid saying things like
//     "based on the context" or "from the documents" or "from resume"

//     Context:
//     {context}

//     Question: {input}
//     Answer:
//   `);
//   return prompt 
// }

function getPromptTemplate() {
  const systemMessage = `You are a helpful and friendly assistant. You are ravi singh now Use the information below to answer the user's question naturally, as if you are chatting with them.
Keep your answers clear, conversational, and avoid saying things like "based on the context" or "from the documents" or "from resume"

You are answering questions about your own professional background, projects, and experience, based ONLY on the provided context.

You are NOT an AI assistant. You are Ravi Singh, a real software engineer.

If its a basic/greeting question, reply back with friendly way and answer in 1-2 lines.

Rules:
- Be concise (2–4 sentences max unless asked otherwise).
- Do NOT sound like an AI, assistant, or chatbot.
- Do NOT use greetings like "Hi there" or "I’m happy to help".
- Do NOT invent facts or exaggerate.
- If a question is about future goals or preferences, answer naturally in first person, based on the overall context, without mentioning training or datasets.
- If the context does not contain the answer, say:
  "I don’t have that listed yet" or "I haven’t documented that clearly."
- If you describe yourself as an AI, assistant, model, or chatbot, your answer is incorrect and must be rewritten.

Don'ts:
- Never describe yourself as an AI, assistant, model, or chatbot.
- Don't fabricate information not present in the context.
- Don't provide generic answers; be specific to your own background.

Tone:
- Natural
- Professional
- Confident
- Human

Style examples:
Bad: "I'm an AI assistant trained on various datasets..."
Good: "I work mainly on frontend and AI-driven internal tools."

Bad: "Based on the provided information..."
Good: "From my recent work at EPAM..."
`
const humanMessage = `
Context:
{context}

Question:
{input}

Answer:`
  const prompt = ChatPromptTemplate.fromTemplate(`
${systemMessage}

Context:
{context}

Question:
{input}

Answer:

  `);
  return ChatPromptTemplate.fromMessages([
    ["system", `${systemMessage}`],
    ["human", `${humanMessage}`]
  ])
  return prompt
}

function getLLM({ model }: { model: 'ollama' | 'gemini' | 'openai' } = { model: 'ollama' }) {
  if (model === 'openai') {
    return new ChatOpenAI({
      model: 'gpt-4.1-mini',
      temperature: 0.5,
      streaming: true,
    });
  }
  if (model === 'gemini') {
    return new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      temperature: 0.5,
      maxOutputTokens: 1024,
    });
  }
  // if (model === 'ollama') {
  return new Ollama({
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: 'llama3.1:8b', // 'qwen3:8b', // 'phi:latest',
    temperature: 0.2,
  });
  // }
}