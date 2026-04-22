import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Ollama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";


export function getLLM({ model }: { model: 'ollama' | 'gemini' | 'openai' } = { model: 'openai' }) {
  const isDev = process.env.NODE_ENV === 'development';
  model = isDev ? 'ollama' : model
  console.log('using model', model);
  const temperature = 0.5;

  if (model === 'openai') {
    const modelName = "@cf/ibm-granite/granite-4.0-h-micro";
    return {
      llm: new ChatOpenAI({
        modelName,
        apiKey: process.env.CLOUDFLARE_WORKER_AI_KEY,
        configuration: {
          baseURL: "https://api.cloudflare.com/client/v4/accounts/0bb9f597cbc00823ca74973e563f9faa/ai/v1",
        },
      }),
      modelName,
    };

  } else if (model === 'gemini') {
    const modelName = "gemini-2.0-flash";
    return {
      llm: new ChatGoogleGenerativeAI({
        model: modelName,
        temperature,
        maxOutputTokens: 1024,
      }),
      modelName,
    };
  }

  const modelName = "llama3.1:8b";
  return {
    llm: new Ollama({
      baseUrl: process.env.LLM_URL || 'http://localhost:11434',
      model: modelName,
      temperature
    }),
    modelName,
  };

}
