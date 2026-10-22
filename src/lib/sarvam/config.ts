// Central place for Sarvam model names and per-language provider settings.
// Endpoint/field names verified against https://docs.sarvam.ai on 2026-10-22
// (see docs/PIPELINE.md for the notes and the open items that need a live key).

import { APP_LANGUAGES, LANGUAGE_REGISTRY, type AppLanguage } from "../languages";

export type { AppLanguage } from "../languages";

export const SARVAM_API_BASE = process.env.SARVAM_API_BASE ?? "https://api.sarvam.ai";

export const SARVAM_MODELS = {
  // 105B flagship: used once per document for accuracy-critical structured summary.
  chatFlagship: "sarvam-105b",
  // 30B mid-size: used for many low-latency conversational follow-ups.
  chatConversational: "sarvam-30b",
  stt: "saaras:v3",
  tts: "bulbul:v3",
} as const;

export const SUPPORTED_LANGUAGES: { code: AppLanguage; label: string; nativeLabel: string }[] = APP_LANGUAGES.map(
  (code) => {
    const l = LANGUAGE_REGISTRY.find((x) => x.code === code)!;
    return { code, label: l.name, nativeLabel: l.nativeName };
  }
);

// "anushka" (used in some older Sarvam docs) is not a valid bulbul:v3 speaker;
// "priya" is, and supports Hindi/English/Marathi.
export const DEFAULT_TTS_SPEAKER: Record<AppLanguage, string> = {
  "en-IN": "priya",
  "hi-IN": "priya",
  "mr-IN": "priya",
};

export const DOC_INTELLIGENCE_LANGUAGE: Record<AppLanguage, string> = {
  "en-IN": "en-IN",
  "hi-IN": "hi-IN",
  "mr-IN": "mr-IN",
};

/** Bulbul v3 accepts pace 0.5–2.0 (docs). */
export const TTS_PACE_RANGE = { min: 0.5, max: 2.0 } as const;
/** Bulbul v3 max characters per request (docs). */
export const TTS_MAX_CHARS = 2500;
/** Text LID max input length (docs: >1000 chars → 422). */
export const LID_MAX_CHARS = 1000;
