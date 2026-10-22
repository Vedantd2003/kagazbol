import { sarvamFetch, SarvamApiError, SAFE_RETRY } from "./client";
import { SARVAM_MODELS, DEFAULT_TTS_SPEAKER, TTS_MAX_CHARS, TTS_PACE_RANGE, type AppLanguage } from "./config";

interface TtsResponse {
  audios?: string[]; // base64-encoded audio, one per input text
}

/**
 * The current Bulbul docs name the language field `language_code`; this app was
 * originally verified live with `target_language_code`. We send the last
 * known-working name and, only if the provider rejects the request as invalid
 * (400/422), retry once with the other name. Never retried on auth/rate errors.
 */
let languageField: "target_language_code" | "language_code" = "target_language_code";

/** Shortens text for TTS at a sentence boundary instead of mid-word. */
export function clampForSpeech(text: string, max = TTS_MAX_CHARS): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const boundary = Math.max(cut.lastIndexOf("।"), cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return boundary > max * 0.5 ? cut.slice(0, boundary + 1) : cut;
}

/**
 * Converts text to speech via Bulbul. Returns base64 WAV and a data URL.
 * Playback speed is changed client-side with `playbackRate`; `pace` is only for
 * callers that explicitly want slower synthesis.
 */
export async function textToSpeech(
  text: string,
  language: AppLanguage,
  opts: { speaker?: string; pace?: number } = {}
): Promise<{ audioBase64: string; dataUrl: string }> {
  const pace = Math.min(TTS_PACE_RANGE.max, Math.max(TTS_PACE_RANGE.min, opts.pace ?? 1.0));
  const payload = (field: string) =>
    JSON.stringify({
      text: clampForSpeech(text),
      [field]: language,
      model: SARVAM_MODELS.tts,
      speaker: opts.speaker ?? DEFAULT_TTS_SPEAKER[language],
      pace,
    });

  let res: Response;
  try {
    res = await sarvamFetch("/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload(languageField),
      retry: SAFE_RETRY,
      timeoutMs: 30_000,
    });
  } catch (err) {
    if (err instanceof SarvamApiError && (err.status === 400 || err.status === 422)) {
      const other = languageField === "target_language_code" ? "language_code" : "target_language_code";
      res = await sarvamFetch("/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload(other),
        timeoutMs: 30_000,
      });
      languageField = other;
      console.warn(`[tts] provider accepted "${other}"; using it from now on`);
    } else {
      throw err;
    }
  }

  const data = (await res.json()) as TtsResponse;
  const audioBase64 = data.audios?.[0];
  if (!audioBase64) throw new SarvamApiError("Sarvam TTS returned no audio", 502, null);
  return { audioBase64, dataUrl: `data:audio/wav;base64,${audioBase64}` };
}
