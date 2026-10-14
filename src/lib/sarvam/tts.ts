import { sarvamFetch } from "./client";
import { SARVAM_MODELS, LANGUAGE_CONFIG, type AppLanguage } from "./config";

interface TtsResponse {
  audios: string[]; // base64-encoded audio chunks
}

/**
 * Converts text to speech via Bulbul v3.
 *
 * Key params:
 *  - target_language_code: BCP-47 code (hi-IN, mr-IN, en-IN). Bulbul uses
 *    this to select the phoneme inventory and prosody model.
 *  - speaker: voice character. Sourced from LANGUAGE_CONFIG so it's always
 *    kept in sync with the centralised language table.
 *  - enable_preprocessing: true — lets Bulbul expand numbers, dates and
 *    currency symbols (e.g. "₹1,234" → "एक हजार दो सौ चौंतीस रुपये") in the
 *    target language rather than reading raw digits in English.
 *
 * Returns base64-encoded WAV audio and its data: URL.
 */
export async function textToSpeech(
  text: string,
  language: AppLanguage,
  opts: { speaker?: string; pace?: number } = {}
): Promise<{ audioBase64: string; dataUrl: string }> {
  const langConfig = LANGUAGE_CONFIG[language];

  // Bulbul caps requests at 2500 chars; truncate defensively (callers should
  // already keep spoken replies short). Slice on characters, not bytes, so
  // multi-byte Devanagari codepoints stay intact.
  const trimmed = text.slice(0, 2500);

  const res = await sarvamFetch("/text-to-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: trimmed,
      target_language_code: langConfig.ttsLanguageCode,
      model: SARVAM_MODELS.tts,
      speaker: opts.speaker ?? langConfig.ttsSpeaker,
      pace: opts.pace ?? 1.0,
      // Expand numbers, dates, currency in the target language.
      // Without this, "₹1,200" may be read as "rupees one comma two zero zero"
      // in English even when target_language_code is hi-IN or mr-IN.
      enable_preprocessing: true,
    }),
  });

  const data = (await res.json()) as TtsResponse;
  const audioBase64 = data.audios?.[0];
  if (!audioBase64) {
    throw new Error("Sarvam TTS returned no audio");
  }

  return { audioBase64, dataUrl: `data:audio/wav;base64,${audioBase64}` };
}
