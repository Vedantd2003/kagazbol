import { sarvamFetch, SAFE_RETRY } from "./client";
import { SARVAM_MODELS } from "./config";

interface ProviderSttResponse {
  transcript?: string;
  language_code?: string | null;
  language_probability?: number | null;
}

/**
 * Transcribes a short voice clip via Saaras. "codemix" mode keeps English
 * words in Latin script while transcribing Indic speech in native script,
 * which matches how users actually speak (Hinglish/Marathi-English).
 *
 * `language_code` is omitted so the provider auto-detects the spoken language;
 * per the docs it then also returns `language_probability` (0–1), which the UI
 * uses to decide whether to ask the user to confirm the language.
 */
export async function speechToText(
  audio: Blob,
  filename: string
): Promise<{ transcript: string; languageCode: string | null; languageProbability: number | null }> {
  // Browsers report MediaRecorder output as "audio/webm;codecs=opus", but
  // Sarvam's allowed-types check matches on exact MIME string and only
  // accepts "audio/webm" (no codecs parameter). Strip it before upload.
  const uploadBlob = audio.type.includes(";") ? new Blob([audio], { type: audio.type.split(";")[0] }) : audio;

  const form = new FormData();
  form.append("file", uploadBlob, filename);
  form.append("model", SARVAM_MODELS.stt);
  form.append("mode", "codemix");

  const res = await sarvamFetch("/speech-to-text", { method: "POST", body: form, retry: SAFE_RETRY, timeoutMs: 30_000 });
  const data = (await res.json()) as ProviderSttResponse;
  return {
    transcript: data.transcript ?? "",
    languageCode: data.language_code ?? null,
    languageProbability: typeof data.language_probability === "number" ? data.language_probability : null,
  };
}
