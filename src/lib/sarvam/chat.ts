import { sarvamFetch } from "./client";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResult {
  text: string;
  latencyMs: number;
  model: string;
}

interface ChatCompletionResponse {
  choices: { message: { role: string; content: string } }[];
}

/**
 * Calls Sarvam's chat completions endpoint and returns the assistant text
 * plus rough latency, so callers can log model-routing performance.
 */
export async function chatCompletion(
  model: string,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
): Promise<ChatCompletionResult> {
  const start = Date.now();

  const res = await sarvamFetch("/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 1024,
    }),
    timeoutMs: opts.timeoutMs ?? 60_000,
  });

  const data = (await res.json()) as ChatCompletionResponse;
  const text = data.choices?.[0]?.message?.content ?? "";

  return { text, latencyMs: Date.now() - start, model };
}
