import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/sarvam/chat";
import { SARVAM_MODELS } from "@/lib/sarvam/config";
import { toAppError } from "@/lib/sarvam/client";
import { buildExplainSystemPrompt, buildExplainUserPrompt } from "@/lib/prompts";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, errorResponse, readJson } from "@/lib/http";
import { RATE_LIMITS } from "@/lib/rateLimit";
import { parseLanguage, requireString } from "@/lib/validation";
import { parseExplainResponse } from "@/lib/parseSummary";
import type { ExplainResponse } from "@/lib/types";

export const runtime = "nodejs";

/** "Explain simply": a selected word/sentence in plain language, meaning preserved. */
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, RATE_LIMITS.llm);
    const body = await readJson(request);
    const selection = requireString(body.text, "selected text", 600);
    const context = typeof body.context === "string" ? body.context.slice(0, 2_000) : null;
    const language = parseLanguage(body.language);
    const withExample = body.withExample === true;

    let result;
    try {
      result = await chatCompletion(
        SARVAM_MODELS.chatConversational,
        [
          { role: "system", content: buildExplainSystemPrompt(language, withExample) },
          { role: "user", content: buildExplainUserPrompt(selection, context) },
        ],
        { temperature: 0.2, maxTokens: 2048 }
      );
    } catch (err) {
      throw toAppError(err, "TRANSLATION_FAILED");
    }
    const parsed = parseExplainResponse(result.text);
    if (!parsed) throw new AppError("TRANSLATION_FAILED");
    const response: ExplainResponse = { ...parsed, example: withExample ? parsed.example : null, language };
    return NextResponse.json(response);
  } catch (err) {
    return errorResponse(err, "explain");
  }
}
