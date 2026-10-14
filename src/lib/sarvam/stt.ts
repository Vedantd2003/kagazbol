import { sarvamFetch } from "./client";
import { SARVAM_MODELS, LANGUAGE_CONFIG, type AppLanguage } from "./config";

interface SttResponse {
  transcript: string;
  language_code?: string;
}

/**
 * Transcribes a short voice clip via Saaras v3.
 *
 * "codemix" mode retains English words in Latin script while transcribing
 * Indic speech in native Devanagari/other script — matching how users actually
 * speak (Hinglish, Marathi-English mix, etc.).
 *
 * language: the app language the user has selected. Sent as language_code to
 * give Saaras a prior; auto-detection is still used as a fallback so
 * code-switched speech continues to work.
 */
export async function speechToText(
  audio: Blob,
  filename: string,
  language: AppLanguage = "en-IN"
): Promise<{ transcript: string; languageCode?: string }> {
  const langConfig = LANGUAGE_CONFIG[language];

  // Browsers report MediaRecorder output as "audio/webm;codecs=opus", but
  // Sarvam's allowed-types check matches on exact MIME string and only
  // accepts "audio/webm" (no codecs parameter). Strip it before upload.
  const uploadBlob = audio.type.includes(";")
    ? new Blob([audio], { type: audio.type.split(";")[0] })
    : audio;

  const form = new FormData();
  form.append("file", uploadBlob, filename);
  form.append("model", SARVAM_MODELS.stt);
  form.append("mode", "codemix");
  // Hint Saaras toward the selected language for faster, more accurate
  // detection. The model still code-switches freely within the transcript.
  form.append("language_code", langConfig.sttLanguageCode);

  const res = await sarvamFetch("/speech-to-text", {
    method: "POST",
    body: form,
  });

  const data = (await res.json()) as SttResponse;
  return { transcript: data.transcript ?? "", languageCode: data.language_code };
}
