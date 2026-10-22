import { sarvamFetch, SAFE_RETRY, type RetryOptions } from "./client";
import { AppError } from "../errors";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResult {
  text: string;
  latencyMs: number;
  model: string;
  finishReason: string | null;
  usage: { promptTokens: number; completionTokens: number } | null;
}

interface ChatCompletionResponse {
  choices?: { message?: { role: string; content: string | null }; finish_reason?: string | null }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/**
 * Calls Sarvam's chat completions endpoint and returns the assistant text plus
 * latency and token usage (when reported) for evaluation and cost tracking.
 *
 * Chat completions don't create persistent resources, so transient failures
 * (429/5xx/timeout) are retried with bounded backoff.
 */
export async function chatCompletion(
  model: string,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number; retry?: RetryOptions } = {}
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
      // Both sarvam-105b and sarvam-105b-conversations are reasoning models that emit a hidden
      // reasoning_content step first. "low" keeps it short, reducing the chance
      // of finish_reason:"length" with null content.
      reasoning_effort: "low",
    }),
    timeoutMs: opts.timeoutMs ?? 60_000,
    retry: opts.retry ?? SAFE_RETRY,
  });

  const data = (await res.json()) as ChatCompletionResponse;
  const choice = data.choices?.[0];
  const text = choice?.message?.content ?? "";
  const finishReason = choice?.finish_reason ?? null;

  if (!text.trim() && finishReason === "length") {
    throw new AppError("ANSWER_FAILED", "The answer was too long to complete. Please ask a shorter question.");
  }

  return {
    text,
    latencyMs: Date.now() - start,
    model,
    finishReason,
    usage: data.usage
      ? { promptTokens: data.usage.prompt_tokens ?? 0, completionTokens: data.usage.completion_tokens ?? 0 }
      : null,
  };
}
