const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "@cf/ibm-granite/granite-4.0-h-micro": "IBM Granite 4.0",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "llama3.1:8b": "Llama 3.1 8B",
  "llama3.2:1b": "Llama 3.2 1B",
  "phi:latest": "Phi-3 Mini (local)",
  "qwen3:8b": "Qwen 3 8B",
  "gemma3:4b": "Gemma 3 4B",
};

export function getModelDisplayName(modelName: string): string {
  return MODEL_DISPLAY_NAMES[modelName] || modelName;
}
