/** AI provider sent to backend — openrouter uses OpenAI-compatible API on the server */
export const AI_PLATFORM =
  process.env.EXPO_PUBLIC_AI_PLATFORM?.trim() || "openrouter";

/** OpenRouter model id, e.g. google/gemini-2.0-flash-001, openai/gpt-4o-mini */
export const AI_MODEL =
  process.env.EXPO_PUBLIC_AI_MODEL?.trim() || "google/gemini-2.0-flash-001";
