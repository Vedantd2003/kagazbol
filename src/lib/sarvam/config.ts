// Central place for Sarvam model names, endpoints, and language/voice config.
// Language-specific values (codes, speakers, labels) live in src/lib/languages.ts.
// This file re-exports AppLanguage and the language helpers so Sarvam-internal
// modules don't need to reach outside the sarvam/ folder.

export { type AppLanguage, LANGUAGE_CONFIG, SUPPORTED_LANGUAGES } from "@/lib/languages";

export const SARVAM_API_BASE = "https://api.sarvam.ai";

export const SARVAM_MODELS = {
  // 105B flagship: used once per document for accuracy-critical structured summary.
  chatFlagship: "sarvam-105b",
  // 30B mid-size: used for many low-latency conversational follow-ups.
  chatConversational: "sarvam-30b",
  stt: "saaras:v3",
  tts: "bulbul:v3",
} as const;
