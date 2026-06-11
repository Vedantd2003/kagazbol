import { sarvamFetch } from "./client";
import { SARVAM_MODELS } from "./config";

interface SttResponse {
  transcript: string;
  language_code?: string;
}

/**
 * Transcribes a short voice clip via Saaras. "codemix" mode keeps English
 * words in Latin script while transcribing Indic speech in native script,
 * which matches how users actually speak (Hinglish/Marathi-English).
 */
export async function speechToText(
  audio: Blob,
  filename: string
): Promise<{ transcript: string; languageCode?: string }> {
  // Browsers report MediaRecorder output as "audio/webm;codecs=opus", but
  // Sarvam's allowed-types check matches on exact MIME string and only
  // accepts "audio/webm" (no codecs parameter). Strip it before upload.
  const uploadBlob = audio.type.includes(";") ? new Blob([audio], { type: audio.type.split(";")[0] }) : audio;

  const form = new FormData();
  form.append("file", uploadBlob, filename);
  form.append("model", SARVAM_MODELS.stt);
  form.append("mode", "codemix");

  const res = await sarvamFetch("/speech-to-text", {
    method: "POST",
    body: form,
  });

  const data = (await res.json()) as SttResponse;
  return { transcript: data.transcript ?? "", languageCode: data.language_code };
}
