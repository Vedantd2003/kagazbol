import { NextResponse } from "next/server";
import { chatCompletion, type ChatMessage } from "@/lib/sarvam/chat";
import { SARVAM_MODELS } from "@/lib/sarvam/config";
import { toAppError } from "@/lib/sarvam/client";
import { buildChatSystemPrompt } from "@/lib/prompts";
import { parseAnswerResponse, parseSummaryWithStatus } from "@/lib/parseSummary";
import { checkAnswer } from "@/lib/evidence";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, errorResponse, readJson } from "@/lib/http";
import { RATE_LIMITS } from "@/lib/rateLimit";
import { MAX_OCR_CHARS, MAX_QUESTION_CHARS, parseHistory, parseLanguage, requireString } from "@/lib/validation";
import type { ChatResponse } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Grounded follow-up answers via sarvam-105b-conversations. The model returns its answer plus
 * verbatim supporting quotes; the server locates each quote in the document and
 * checks that every amount/date in the answer exists in the document.
 */
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, RATE_LIMITS.llm);
    const body = await readJson(request);
    const ocrText = requireString(body.ocrText, "document text", MAX_OCR_CHARS);
    const question = requireString(body.question, "question", MAX_QUESTION_CHARS);
    const language = parseLanguage(body.language);
    const history = parseHistory(body.history);
    // The summary is client-supplied context; re-validate its shape.
    const summary = parseSummaryWithStatus(JSON.stringify(body.summary ?? {})).summary;

    const messages: ChatMessage[] = [
      { role: "system", content: buildChatSystemPrompt(ocrText, summary, language) },
      ...history,
      { role: "user", content: question },
    ];

    let result;
    try {
      result = await chatCompletion(SARVAM_MODELS.chatConversational, messages, { temperature: 0.2, maxTokens: 4096 });
    } catch (err) {
      throw toAppError(err, "ANSWER_FAILED");
    }
    console.log(`[model-routing] chat via ${result.model}: ${result.latencyMs}ms`);

    const { answer, quotes } = parseAnswerResponse(result.text);
    if (!answer) throw new AppError("ANSWER_FAILED");
    const check = checkAnswer(answer, quotes, ocrText);

    const response: ChatResponse = {
      answer,
      verification: check.verification,
      evidence: check.evidence,
      unsupportedValues: check.unsupportedValues,
      latencyMs: result.latencyMs,
      model: result.model,
    };
    return NextResponse.json(response);
  } catch (err) {
    return errorResponse(err, "chat");
  }
}
