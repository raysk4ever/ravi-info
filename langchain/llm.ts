import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Ollama } from "@langchain/ollama";

export const CLOUDFLARE_BASE_URL =
  "https://api.cloudflare.com/client/v4/accounts/0bb9f597cbc00823ca74973e563f9faa/ai/v1";
export const CLOUDFLARE_MODEL = "@cf/ibm-granite/granite-4.0-h-micro";
const CLOUDFLARE_TEMPERATURE = 0.5;
const CLOUDFLARE_MAX_ATTEMPTS = 2;

// Cloudflare Workers AI's /chat/completions stream is not strictly OpenAI-shaped:
// it sends usage + neurons on every chunk and value types can change between
// chunks. LangChain's ChatOpenAI trips over that (core's _mergeDicts throws
// "field[...] already exists ... but with a different type."), so we talk to the
// endpoint directly and parse the SSE by hand. Retries once on transient errors.
class CloudflareWorkersAIChat {
  constructor(
    private apiKey: string | undefined,
    private baseURL: string,
    private modelName: string
  ) {}

  async stream(promptValue: any) {
    const messages: Array<{ role: string; content: string }> = (
      promptValue.messages ?? []
    ).map((message: any) => {
      const c = message.content;
      const content = Array.isArray(c)
        ? c.map((part: any) => part.text ?? "").join("")
        : typeof c === "string"
          ? c
          : "";
      return {
        role: message.getType?.() === "system" ? "system" : "user",
        content,
      };
    });

    const iter = this.run(messages);
    return {
      getReader() {
        return {
          async read() {
            const { done, value } = await iter.next();
            if (done) return { done: true as const };
            return { done: false as const, value: { content: value } };
          },
          releaseLock() {},
        };
      },
    };
  }

  private async *run(messages: Array<{ role: string; content: string }>) {
    let yielded = false;
    for (let attempt = 1; attempt <= CLOUDFLARE_MAX_ATTEMPTS; attempt++) {
      try {
        for await (const delta of this.streamOnce(messages)) {
          yielded = true;
          yield delta;
        }
        return;
      } catch (err) {
        if (yielded || attempt >= CLOUDFLARE_MAX_ATTEMPTS) throw err;
        console.error(`Cloudflare Workers AI attempt ${attempt} failed, retrying...`, err);
      }
    }
  }

  private async *streamOnce(messages: Array<{ role: string; content: string }>) {
    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelName,
        messages,
        temperature: CLOUDFLARE_TEMPERATURE,
        max_tokens: 300,
        stream: true,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Cloudflare Workers AI ${res.status}: ${text.slice(0, 300)}`);
    }
    if (!res.body) throw new Error("Cloudflare Workers AI stream returned no body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;
        let json: any;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      }
    }
  }
}

export function getLLM({ model }: { model: 'ollama' | 'gemini' | 'openai' } = { model: 'openai' }) {
  const isDev = process.env.NODE_ENV === 'development';
  model = isDev ? 'ollama' : model
  console.log('using model', model);
  const temperature = 0.5;

  if (model === 'openai') {
    const modelName = CLOUDFLARE_MODEL;
    return {
      llm: new CloudflareWorkersAIChat(
        process.env.CLOUDFLARE_WORKER_AI_KEY,
        process.env.CLOUDFLARE_WORKER_AI_BASE_URL || CLOUDFLARE_BASE_URL,
        modelName
      ),
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