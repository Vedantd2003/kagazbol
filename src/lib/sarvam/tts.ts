import { sarvamFetch } from "./client";
import { SARVAM_MODELS, DEFAULT_TTS_SPEAKER, type AppLanguage } from "./config";

interface TtsResponse {
  audios: string[]; // base64-encoded audio chunks
}

/**
 * Converts text to speech via Bulbul. Returns base64-encoded audio (WAV) and
 * its data URL, ready to hand to an <audio> element on the client.
 */
export async function textToSpeech(
  text: string,
  language: AppLanguage,
  opts: { speaker?: string; pace?: number } = {}
): Promise<{ audioBase64: string; dataUrl: string }> {
  // Bulbul caps requests at 2500 chars; truncate defensively (callers should
  // already keep spoken replies short).
  const trimmed = text.slice(0, 2500);

  const res = await sarvamFetch("/text-to-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: trimmed,
      target_language_code: language,
      model: SARVAM_MODELS.tts,
      speaker: opts.speaker ?? DEFAULT_TTS_SPEAKER[language],
      pace: opts.pace ?? 1.0,
    }),
  });

  const data = (await res.json()) as TtsResponse;
  const audioBase64 = data.audios?.[0];
  if (!audioBase64) {
    throw new Error("Sarvam TTS returned no audio");
  }

  return { audioBase64, dataUrl: `data:audio/wav;base64,${audioBase64}` };
}
