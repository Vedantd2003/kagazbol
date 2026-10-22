import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/sarvam/chat";
import { SARVAM_MODELS } from "@/lib/sarvam/config";
import { toAppError } from "@/lib/sarvam/client";
import { buildSummarySystemPrompt, buildSummaryUserPrompt } from "@/lib/prompts";
import { parseSummaryWithStatus } from "@/lib/parseSummary";
import { buildFieldChecks } from "@/lib/pipeline";
import { enforceRateLimit, errorResponse, readJson } from "@/lib/http";
import { RATE_LIMITS } from "@/lib/rateLimit";
import { MAX_OCR_CHARS, parseLanguage, requireString } from "@/lib/validation";
import type { SummarizeResponse } from "@/lib/types";

export const runtime = "nodejs";

/**
 * One accuracy-critical call per document: Sarvam 105B turns OCR text into a
 * structured summary in the chosen language. Every amount/date it returns is
 * then checked against the OCR text on the server.
 */
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, RATE_LIMITS.llm);
    const body = await readJson(request);
    const ocrText = requireString(body.ocrText, "document text", MAX_OCR_CHARS);
    const language = parseLanguage(body.language);

    let result;
    try {
      // sarvam-105b is a reasoning model with variable hidden reasoning length,
      // so it needs generous token headroom.
      result = await chatCompletion(
        SARVAM_MODELS.chatFlagship,
        [
          { role: "system", content: buildSummarySystemPrompt(language) },
          { role: "user", content: buildSummaryUserPrompt(ocrText) },
        ],
        { temperature: 0.1, maxTokens: 4096 }
      );
    } catch (err) {
      throw toAppError(err, "TRANSLATION_FAILED");
    }

    console.log(`[model-routing] summarize via ${result.model}: ${result.latencyMs}ms`);
    const { summary, fallback } = parseSummaryWithStatus(result.text);
    const response: SummarizeResponse = {
      summary,
      checks: buildFieldChecks(summary, ocrText),
      fallback,
      latencyMs: result.latencyMs,
      model: result.model,
    };
    return NextResponse.json(response);
  } catch (err) {
    return errorResponse(err, "summarize");
  }
}
