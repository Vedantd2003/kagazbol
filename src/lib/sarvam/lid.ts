import { sarvamFetch, SAFE_RETRY } from "./client";
import { LID_MAX_CHARS } from "./config";
import { normalizeLanguageCode } from "../languages";

interface LidResponse {
  language_code?: string | null;
  script_code?: string | null;
}

/**
 * Text language identification (`POST /text-lid`). The endpoint rejects input over
 * 1000 characters, so we send a representative slice: markdown/table syntax and
 * digits are stripped first so the sample is mostly words.
 */
export function lidSample(text: string): string {
  const cleaned = text
    .replace(/[#|*_`>\-=]+/g, " ")
    .replace(/[0-9०-९.,:/()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, LID_MAX_CHARS);
}

export async function detectTextLanguage(text: string): Promise<{ languageCode: string | null; scriptCode: string | null }> {
  const input = lidSample(text);
  if (input.length < 3) return { languageCode: null, scriptCode: null };
  const res = await sarvamFetch("/text-lid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
    retry: SAFE_RETRY,
    timeoutMs: 15_000,
  });
  const data = (await res.json()) as LidResponse;
  return { languageCode: normalizeLanguageCode(data.language_code) ?? data.language_code ?? null, scriptCode: data.script_code ?? null };
}
