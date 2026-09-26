import { createHash } from "crypto";

/**
 * Server-side text analysis for chat questions.
 *
 * The goal is to answer one question later: "what are people asking my chatbot
 * that it cannot answer well?" So we reduce each question to a few stable keys
 * that let us group near-duplicates together.
 */

/** Words that carry no retrieval signal. */
const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an",
  "and", "any", "are", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "could", "did", "do", "does",
  "doing", "don", "down", "during", "each", "few", "for", "from", "further",
  "had", "has", "have", "having", "he", "her", "here", "hers", "him", "his",
  "how", "i", "if", "in", "into", "is", "it", "its", "just", "me", "more",
  "most", "my", "no", "nor", "not", "now", "of", "off", "on", "once", "only",
  "or", "other", "our", "ours", "out", "over", "own", "please", "same", "she",
  "should", "so", "some", "such", "than", "that", "the", "their", "theirs",
  "them", "then", "there", "these", "they", "this", "those", "through", "to",
  "too", "under", "until", "up", "us", "very", "was", "we", "were", "what",
  "when", "where", "which", "while", "who", "whom", "why", "will", "with",
  "would", "you", "your", "yours", "tell", "give", "know", "like", "want",
  "need", "hi", "hello", "hey", "thanks", "thank", "get", "got", "really",
  "much", "anymore", "s", "t", "don",
]);

/** Naive singularisation so "projects" and "project" group together. */
function singularize(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("sses")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

/** Lowercase, strip markdown/emoji/punctuation, collapse whitespace. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // markdown links -> label
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[*_~#>|]/g, " ")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalised content words, singularised, deduped and sorted. */
export function contentWords(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of normalizeText(input).split(" ")) {
    const word = singularize(raw.replace(/^['-]+|['-]+$/g, ""));
    if (word.length < 3) continue;
    if (STOPWORDS.has(word)) continue;
    seen.add(word);
  }
  return Array.from(seen).sort();
}

export function hashKey(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 16);
}

export interface QuestionTextAnalysis {
  normalized: string;
  /** sha1 of the fully normalised question -> exact duplicate grouping. */
  exactKey: string;
  /** sha1 of the sorted content words -> paraphrase grouping. */
  signature: string;
  keywords: string[];
  wordCount: number;
  isQuestion: boolean;
  questionType: QuestionType;
  topics: string[];
  entities: string[];
  negativeSignals: string[];
}

export type QuestionType =
  | "greeting"
  | "capability"
  | "factual"
  | "request"
  | "opinion"
  | "smalltalk";

/** topic label -> matchers. Matched against the normalised question. */
const TOPIC_PATTERNS: Array<[string, RegExp]> = [
  ["resume", /\b(resume|cv|vitae|curriculum vitae)\b/],
  ["contact", /\b(contact|reach|email|phone|call|whatsapp|telegram|dm|message)\b/],
  ["hire", /\b(hire|hiring|recruit|recruiter|vacancy|opening|opportunity|apply|application)\b/],
  ["salary", /\b(salary|ctc|compensation|pay|payroll|package|expected|lpa|per annum|charge|rate)\b/],
  ["availability", /\b(available|availability|notice period|joining|join|start date|when can|how soon|immediately)\b/],
  ["projects", /\b(project|projects|portfolio|build|built|worked on|side project)\b/],
  ["experience", /\b(experience|experienced|years|background|professional|career|worked|working)\b/],
  ["skills", /\b(skill|skills|stack|expertise|proficient|strong in|good at|technolog)\b/],
  ["education", /\b(education|degree|college|university|school|graduat|studied|phd|master|bachelor)\b/],
  ["certifications", /\b(certif|certification|licensed|aws certified|course|training)\b/],
  ["location", /\b(location|based|remote|relocat|hybrid|onsite|on-site|city|country|visa)\b/],
  ["role", /\b(role|position|job|title|frontend|backend|fullstack|full stack|devops)\b/],
  ["ai", /\b(ai|llm|llms|rag|agent|agentic|langchain|langgraph|mcp|embedding|vector|openai|gemini|ollama|llama|prompt|fine.?tun)\b/],
  ["tools", /\b(next\.?js|react|node|typescript|javascript|python|mongodb|mysql|postgres|docker|kubernetes|aws|azure|gcp|tailwind)\b/],
  ["links", /\b(link|github|linkedin|portfolio url|website|profile|social)\b/],
  ["languages", /\b(language|languages|english|hindi|speaks|fluent)\b/],
  ["age", /\b(age|old|years old)\b/],
  ["gender", /\b(gender|male|female)\b/],
  ["feedback", /\b(feedback|review|complain|improve|suggestion)\b/],
];

/** Nouns/tech that are worth surfacing as "what they asked about". */
const ENTITY_HINTS = new Set([
  "langchain", "langgraph", "nextjs", "react", "node", "typescript",
  "javascript", "python", "mongodb", "mysql", "postgres", "docker",
  "kubernetes", "aws", "azure", "gcp", "openai", "gemini", "ollama", "llama",
  "rag", "llm", "mcp", "faiss", "langsmith", "redis", "vercel", "tailwind",
  "agentic", "embedding", "pinecone", "qdrant", "chroma",
]);

/** Phrases that suggest the user was unhappy or blocked. */
const NEGATIVE_PATTERNS: Array<[string, RegExp]> = [
  ["not_working", /\b(not work|doesn'?t work|didn'?t work|not respond|failed|error)\b/],
  ["wrong", /\b(wrong|incorrect|not right|inaccurate|false|hallucinat)\b/],
  ["unknown", /\b(don'?t know|do not know|unknown|no idea|not sure|can'?t tell)\b/],
  ["frustrated", /\b(useless|annoying|frustrat|again|still|why not|come on|seriously)\b/],
  ["unhelpful", /\b(not helpful|unhelpful|no answer|didn'?t answer|not answer)\b/],
];

const CAPABILITY_PATTERNS =
  /\b(who are you|what are you|your name|introduce|about yourself|what can you do|can you help|your purpose|who r u|about u)\b/;

export function analyzeQuestion(raw: string): QuestionTextAnalysis {
  const normalized = normalizeText(raw);
  const keywords = contentWords(raw);
  const entities = keywords.filter((k) => ENTITY_HINTS.has(k));

  const topics: string[] = [];
  for (const [label, pattern] of TOPIC_PATTERNS) {
    if (pattern.test(normalized)) topics.push(label);
  }

  const negativeSignals: string[] = [];
  for (const [label, pattern] of NEGATIVE_PATTERNS) {
    if (pattern.test(normalized)) negativeSignals.push(label);
  }

  const words = normalized.split(" ").filter(Boolean);
  const isQuestion = /\?\s*$/.test(raw.trim()) || CAPABILITY_PATTERNS.test(normalized);

  let questionType: QuestionType = "factual";
  if (words.length <= 4 && /^(hi|hey|hello|yo|namaste|hola|good (morning|evening|afternoon))\b/.test(normalized)) {
    questionType = "greeting";
  } else if (CAPABILITY_PATTERNS.test(normalized)) {
    questionType = "capability";
  } else if (/\b(write|create|generate|make|build|give me|show me|list|draft|summari[sz]e|explain)\b/.test(normalized)) {
    questionType = "request";
  } else if (/\b(what do you think|your opinion|do you think|should i|would you|best|worst|rate)\b/.test(normalized)) {
    questionType = "opinion";
  } else if (words.length <= 2) {
    questionType = "smalltalk";
  }

  return {
    normalized,
    exactKey: hashKey(normalized),
    signature: hashKey(keywords.join(" ")),
    keywords: keywords.slice(0, 25),
    wordCount: words.length,
    isQuestion,
    questionType,
    topics,
    entities,
    negativeSignals,
  };
}
