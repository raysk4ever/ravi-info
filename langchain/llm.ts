import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Ollama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";


export function getLLM({ model }: { model: 'ollama' | 'gemini' | 'openai' } = { model: 'openai' }) {
  const isDev = process.env.NODE_ENV === 'development';
  model = !isDev ? 'ollama' : model
  console.log('using model', model);
  const temperature = 0.5;
  // if (isDev) {
  //   return new Ollama({
  //     baseUrl: process.env.LLM_URL || 'http://localhost:11434',`
  //     model: 'llama3.1:8b', // 'qwen3:8b', // 'phi:latest',
  //     temperature,
  //   });
  // }
  if (model === 'openai') {
    return new ChatOpenAI({
      model: 'gpt-4.1-mini',
      temperature,
      streaming: true,
    });
  } else if (model === 'gemini') {
    return new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      temperature,
      maxOutputTokens: 1024,
    });
  }

  return new Ollama({
    baseUrl: process.env.LLM_URL || 'http://localhost:11434',
    model: 'llama3.1:8b', // 'qwen3:8b', // 'phi:latest',
    temperature
  });

}
