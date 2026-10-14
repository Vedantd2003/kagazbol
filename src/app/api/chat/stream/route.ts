import { SARVAM_API_BASE } from "@/lib/sarvam/config";
import { SARVAM_MODELS } from "@/lib/sarvam/config";
import { buildChatSystemPrompt } from "@/lib/prompts";
import type { ChatRequest } from "@/lib/types";

export const runtime = "nodejs";

function getApiKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY is not set.");
  return key;
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: string, data: unknown) {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      }

      try {
        const body = (await request.json()) as ChatRequest;

        if (!body.question?.trim()) {
          emit("error", { message: "No question provided." });
          controller.close();
          return;
        }

        const messages = [
          {
            role: "system",
            content: buildChatSystemPrompt(body.ocrText, body.summary, body.language),
          },
          ...body.history.map((turn) => ({ role: turn.role, content: turn.content })),
          { role: "user", content: body.question },
        ];

        // Emit reasoning_started immediately before reading chunks
        emit("reasoning_started", {});

        const res = await fetch(`${SARVAM_API_BASE}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-subscription-key": getApiKey(),
          },
          body: JSON.stringify({
            model: SARVAM_MODELS.chatConversational,
            messages,
            temperature: 0.3,
            max_tokens: 4096,
            reasoning_effort: "low",
            stream: true,
          }),
        });

        if (!res.ok) {
          let errMsg = `Sarvam API error: ${res.status}`;
          try {
            const errBody = (await res.json()) as { error?: { message?: string } };
            if (errBody?.error?.message) errMsg = errBody.error.message;
          } catch {
            // ignore
          }
          emit("error", { message: errMsg });
          controller.close();
          return;
        }

        if (!res.body) {
          emit("error", { message: "No response body from Sarvam API." });
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const textDecoder = new TextDecoder();
        let buffer = "";
        let hasContent = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += textDecoder.decode(value, { stream: true });

          // Parse SSE lines from buffer
          const lines = buffer.split("\n");
          // Keep last partial line in buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "") continue;
            if (!trimmed.startsWith("data:")) continue;

            const dataStr = trimmed.slice(5).trim();
            if (dataStr === "[DONE]") {
              if (hasContent) {
                emit("done", {});
              } else {
                emit("error", { message: "The assistant didn't return an answer. Please try again." });
              }
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(dataStr) as {
                choices?: {
                  delta?: { content?: string; reasoning_content?: string };
                  finish_reason?: string | null;
                }[];
              };

              const choice = parsed.choices?.[0];
              if (!choice) continue;

              if (choice.finish_reason === "length") {
                emit("error", { message: "Response was cut off due to length limit." });
                controller.close();
                return;
              }

              const delta = choice.delta;
              if (delta?.content) {
                // Only emit content, never reasoning_content
                hasContent = true;
                emit("content_delta", { delta: delta.content });
              }
            } catch {
              // Skip malformed SSE data lines
            }
          }
        }

        // Stream ended without [DONE]
        if (hasContent) {
          emit("done", {});
        } else {
          emit("error", { message: "The assistant didn't return an answer. Please try again." });
        }
      } catch (err) {
        try {
          const msg = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(encoder.encode(sseEvent("error", { message: msg })));
        } catch {
          // controller already closed
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
