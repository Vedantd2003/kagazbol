import { NextResponse } from "next/server";
import { chatCompletion, type ChatMessage } from "@/lib/sarvam/chat";
import { SARVAM_MODELS } from "@/lib/sarvam/config";
import { SarvamApiError } from "@/lib/sarvam/client";
import { buildChatSystemPrompt } from "@/lib/prompts";
import type { ChatRequest, ChatResponse } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Latency-critical conversational follow-ups: Sarvam 30B, grounded in the
 * document via system prompt + conversation history. Logs latency for the
 * model-routing comparison referenced in the blog post.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    if (!body.question?.trim()) {
      return NextResponse.json({ error: "No question provided." }, { status: 400 });
    }

    const messages: ChatMessage[] = [
      { role: "system", content: buildChatSystemPrompt(body.ocrText, body.summary, body.language) },
      ...body.history.map((turn) => ({ role: turn.role, content: turn.content }) as ChatMessage),
      { role: "user", content: body.question },
    ];

    // sarvam-30b is also a reasoning model: some of the token budget goes to a
    // hidden reasoning step before the spoken-style answer. With the full
    // grounding prompt (OCR text + summary JSON) the reasoning step alone can
    // exceed 1024 tokens, so this needs the same headroom as summarize.
    const result = await chatCompletion(SARVAM_MODELS.chatConversational, messages, {
      temperature: 0.3,
      maxTokens: 4096,
    });

    console.log(`[model-routing] chat via ${result.model}: ${result.latencyMs}ms`);

    const answer = result.text.trim();
    if (!answer) {
      return NextResponse.json({ error: "The assistant didn't return an answer. Please try again." }, { status: 502 });
    }

    const response: ChatResponse = {
      answer,
      latencyMs: result.latencyMs,
      model: result.model,
    };
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof SarvamApiError) {
      return NextResponse.json({ error: "The chat service is unavailable right now." }, { status: 502 });
    }
    console.error("chat error", err);
    return NextResponse.json({ error: "Something went wrong answering that." }, { status: 500 });
  }
}
