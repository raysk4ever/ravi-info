import { configDotenv } from 'dotenv'
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { getLLM } from './llm';
import { getVectorStore, getRelevanceThreshold, getIndexMeta } from './vector-store';

configDotenv()

// Over-fetch, then keep only the chunks genuinely close to the question. The
// corpus mixes resume, website and note documents, so an unfiltered top-k will
// happily hand the model a chunk about CSS frameworks when someone asked about
// salary. Anything past the threshold is dropped rather than shown to the model.
const CANDIDATES = 6;
const MAX_CONTEXT_CHUNKS = 4;

// Returned when retrieval finds nothing relevant. Hard-coded rather than
// prompt-generated so the answer is honest regardless of which model is active.
const NO_CONTEXT_ANSWER =
  "I don't have that in my notes yet. If you tell me a bit more about what you're after, " +
  "or reach out to me directly at raysk7161@gmail.com, I'll get you a proper answer.";

const SOURCE_LABEL: Record<string, string> = {
  resume: 'resume',
  website: 'portfolio site',
  profile: 'profile',
  note: 'notes',
};

export async function* runRag({ question = '', onStatus }: { question: string; onStatus?: (step: string) => void }) {

  onStatus?.('loading_model')
  const vectorStore = await getVectorStore()
  const { llm, modelName } = getLLM()
  console.log('Using LLM:', modelName);

  // Yield model info as first value
  yield { __model: modelName };

  onStatus?.('searching')
  console.log('Performing similarity search...');
  const candidates = await vectorStore.similaritySearchWithScore(question, CANDIDATES);

  const threshold = getRelevanceThreshold();
  const relevant = candidates
    .filter(([, score]) => score <= threshold)
    .slice(0, MAX_CONTEXT_CHUNKS);

  const meta = getIndexMeta();
  console.log(
    `RETRIEVAL: ${candidates.length} candidate(s), ${relevant.length} within ${threshold} ` +
    `(index: ${meta?.docCount ?? '?'} docs, built ${meta?.indexedAt?.slice(0, 10) ?? 'unknown'})`
  );
  for (const [doc, score] of relevant) {
    console.log(`   ${score.toFixed(3)}  ${doc.metadata?.source}/${doc.metadata?.type}  ${doc.metadata?.title}`);
  }

  onStatus?.('generating')

  // Nothing in the knowledge base is close to this question. Do NOT ask the
  // model anyway - small models routinely ignore the "say you don't know"
  // instruction and invent a confident answer instead. Reply honestly, skip the
  // LLM call entirely, and flag the turn so it is recorded as unanswered. That
  // list is the whole point of tracking questions.
  if (relevant.length === 0) {
    yield { __noContext: true };
    yield NO_CONTEXT_ANSWER;
    return;
  }

  // Label each chunk with where it came from so the model can attribute facts
  // ("your GitHub lists...") instead of stating them as its own knowledge.
  const context = relevant.map(([doc, score], idx) => {
    const source = SOURCE_LABEL[doc.metadata?.source] ?? doc.metadata?.source ?? 'document';
    const title = doc.metadata?.title ? ` - ${doc.metadata.title}` : '';
    return `Source ${idx + 1} (${source}${title}, relevance ${score.toFixed(2)}):\n${doc.pageContent}\n`;
  }).join('\n----------------\n');

  console.log('CONTEXT:', context);

  const promptValue = await getPromptTemplate().invoke({
    context,
    input: question
  })

  const llmResponse = await llm.stream(promptValue)
  const reader = llmResponse.getReader(); // ONE reader only

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield typeof value === "string" ? value : value.content ?? "";

  }
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
const systemMessage = `You are Ravi Singh, a software engineer.

Answer questions as if you are talking about your own professional experience, projects, and background.
Use ONLY the provided context. Do not assume or invent anything.

Speak naturally in first person. Be confident, professional, and human.
Do NOT mention resumes, documents, context, training, or datasets.

Guidelines:
- Keep answers concise (1-4 sentences unless asked otherwise)
- For greetings or small talk, reply warmly in 1-2 lines
- Be specific to your real work and experience
- Emojis are allowed based on the context but use them lightly

If the information is not available, say:
- "I don't have that listed yet." or
- "I haven't documented that clearly."

Strict Rules:
- Never describe yourself as an AI, assistant, chatbot, or model
- Never fabricate or exaggerate
- Never use phrases like "based on the context" or "from the resume"
- Never sound generic or robotic
- If the context says no relevant information was found, say plainly that you
  have not documented it. Do not guess, and never invent numbers such as salary
  or years of experience.

Tone:
Natural - Professional - Confident - Human

Examples:
BAD: "I am an AI assistant trained on..."
GOOD: "In my recent work at EPAM, I built internal tools focused on AI-assisted workflows."

BAD: "Based on the provided information..."
GOOD: "From my recent work at EPAM..."
`
const humanMessage = `
Context:
{context}

Question:
{input}

Answer:`
  return ChatPromptTemplate.fromMessages([
    ["system", `${systemMessage}`],
    ["human", `${humanMessage}`]
  ])
}
