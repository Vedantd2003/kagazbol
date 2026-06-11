import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/sarvam/chat";
import { SARVAM_MODELS } from "@/lib/sarvam/config";
import { SarvamApiError } from "@/lib/sarvam/client";
import { buildSummaryPrompt } from "@/lib/prompts";
import { parseSummaryResponse } from "@/lib/parseSummary";
import type { SummarizeRequest, SummarizeResponse } from "@/lib/types";

export const runtime = "nodejs";

/**
 * One accuracy-critical call per document: Sarvam 105B turns raw OCR text
 * into a structured summary card. Logs latency for the model-routing
 * comparison referenced in the blog post.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SummarizeRequest;
    if (!body.ocrText?.trim()) {
      return NextResponse.json({ error: "No document text to summarize." }, { status: 400 });
    }

    const prompt = buildSummaryPrompt(body.ocrText, body.language);
    // sarvam-105b is a reasoning model: some of the token budget goes to a
    // hidden reasoning step before the JSON answer, and its reasoning length
    // is highly variable, so this needs generous headroom.
    const result = await chatCompletion(
      SARVAM_MODELS.chatFlagship,
      [{ role: "user", content: prompt }],
      { temperature: 0.1, maxTokens: 4096 }
    );

    console.log(`[model-routing] summarize via ${result.model}: ${result.latencyMs}ms`);

    const summary = parseSummaryResponse(result.text);
    const response: SummarizeResponse = {
      summary,
      latencyMs: result.latencyMs,
      model: result.model,
    };
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof SarvamApiError) {
      return NextResponse.json({ error: "The summary service is unavailable right now." }, { status: 502 });
    }
    console.error("summarize error", err);
    return NextResponse.json({ error: "Something went wrong generating the summary." }, { status: 500 });
  }
}
