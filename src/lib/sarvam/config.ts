// Central place for Sarvam model names, endpoints, and language/voice config.
// Verified against https://docs.sarvam.ai (see scripts/smoke_test.ts before relying on these).

export const SARVAM_API_BASE = "https://api.sarvam.ai";

export const SARVAM_MODELS = {
  // 105B flagship: used once per document for accuracy-critical structured summary.
  chatFlagship: "sarvam-105b",
  // 30B mid-size: used for many low-latency conversational follow-ups.
  chatConversational: "sarvam-30b",
  stt: "saaras:v3",
  tts: "bulbul:v3",
} as const;

export type AppLanguage = "en-IN" | "hi-IN" | "mr-IN";

export const SUPPORTED_LANGUAGES: { code: AppLanguage; label: string; nativeLabel: string }[] = [
  { code: "en-IN", label: "English", nativeLabel: "English" },
  { code: "hi-IN", label: "Hindi", nativeLabel: "हिंदी" },
  { code: "mr-IN", label: "Marathi", nativeLabel: "मराठी" },
];

// Default Bulbul speaker per language. "anushka" (used in some older Sarvam docs)
// is not a valid bulbul:v3 speaker; "priya" is and supports Hindi/English/Marathi.
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
