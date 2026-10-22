import { NextResponse } from "next/server";
import { speechToText } from "@/lib/sarvam/stt";
import { toAppError } from "@/lib/sarvam/client";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, errorResponse } from "@/lib/http";
import { RATE_LIMITS } from "@/lib/rateLimit";
import { MAX_AUDIO_BYTES } from "@/lib/validation";
import type { SttResponse } from "@/lib/types";

export const runtime = "nodejs";

const AUDIO_TYPES = /^audio\/(webm|ogg|wav|x-wav|wave|mpeg|mp3|mp4|m4a|x-m4a|aac|flac|opus)(;|$)/i;

/** Transcribes a recorded voice question via Saaras STT (codemix, auto language). */
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, RATE_LIMITS.speech);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new AppError("BAD_REQUEST", "No audio received.");
    }
    const file = form.get("audio");
    if (!(file instanceof File) || file.size === 0) throw new AppError("BAD_REQUEST", "No audio received.");
    if (file.size > MAX_AUDIO_BYTES) throw new AppError("FILE_TOO_LARGE", "The recording is too long. Please keep questions under 30 seconds.");
    if (file.type && !AUDIO_TYPES.test(file.type)) throw new AppError("UNSUPPORTED_FILE", "Unsupported audio format.");

    let result;
    try {
      result = await speechToText(file, "question.webm");
    } catch (err) {
      throw toAppError(err, "STT_FAILED");
    }
    if (!result.transcript.trim()) {
      throw new AppError("STT_FAILED", "Couldn't hear that clearly. Please try again or type your question.", { retryable: true });
    }
    const response: SttResponse = {
      transcript: result.transcript,
      languageCode: result.languageCode,
      languageProbability: result.languageProbability,
    };
    return NextResponse.json(response);
  } catch (err) {
    return errorResponse(err, "stt");
  }
}
