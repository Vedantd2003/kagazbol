import { NextResponse } from "next/server";
import { detectTextLanguage } from "@/lib/sarvam/lid";
import { toAppError } from "@/lib/sarvam/client";
import { hasCapability } from "@/lib/languages";
import { enforceRateLimit, errorResponse, readJson } from "@/lib/http";
import { RATE_LIMITS } from "@/lib/rateLimit";
import { MAX_OCR_CHARS, requireString } from "@/lib/validation";
import type { DetectLanguageResponse } from "@/lib/types";

export const runtime = "nodejs";

/** Detects the primary language of document text via Sarvam Text LID. */
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, RATE_LIMITS.speech);
    const body = await readJson(request);
    const text = requireString(body.text, "text", MAX_OCR_CHARS);
    try {
      const { languageCode, scriptCode } = await detectTextLanguage(text);
      const response: DetectLanguageResponse = {
        languageCode,
        scriptCode,
        explainable: !!languageCode && hasCapability(languageCode, "explanation"),
      };
      return NextResponse.json(response);
    } catch (err) {
      throw toAppError(err, "LANGUAGE_DETECTION_FAILED");
    }
  } catch (err) {
    return errorResponse(err, "detect-language");
  }
}
