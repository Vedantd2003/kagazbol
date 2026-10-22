import { NextResponse } from "next/server";
import { textToSpeech } from "@/lib/sarvam/tts";
import { toAppError } from "@/lib/sarvam/client";
import { enforceRateLimit, errorResponse, readJson } from "@/lib/http";
import { RATE_LIMITS } from "@/lib/rateLimit";
import { MAX_TTS_CHARS, parseLanguage, requireString } from "@/lib/validation";

export const runtime = "nodejs";

/** Converts a short spoken-style reply into audio via Bulbul TTS. */
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, RATE_LIMITS.speech);
    const body = await readJson(request);
    const text = requireString(body.text, "text", MAX_TTS_CHARS * 2);
    const language = parseLanguage(body.language);
    try {
      const { dataUrl } = await textToSpeech(text, language);
      return NextResponse.json({ audioUrl: dataUrl });
    } catch (err) {
      throw toAppError(err, "TTS_FAILED");
    }
  } catch (err) {
    return errorResponse(err, "tts");
  }
}
