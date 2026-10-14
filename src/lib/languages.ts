/**
 * Single source of truth for every language-specific value used across the
 * app and every Sarvam endpoint. Components, routes and prompts import from
 * here — nothing hardcodes a language code, speaker or label anywhere else.
 *
 * Verified against Sarvam docs: Bulbul v3 speaker list, Saaras v3 mode list,
 * and Document Intelligence language codes.
 */

export type AppLanguage = "en-IN" | "hi-IN" | "mr-IN";

export interface LanguageConfig {
  /** BCP-47 code used for the HTML lang attribute and most Sarvam endpoints */
  code: AppLanguage;
  /** Short Latin label for UI pill buttons */
  label: string;
  /** Native-script label shown inside the pill */
  nativeLabel: string;
  /** BCP-47 root (no region suffix) for the HTML lang attribute */
  htmlLang: string;
  /** Language name in English – used in LLM system prompts */
  promptName: string;
  /** Script name in English – used to strengthen LLM script fidelity */
  promptScript: string;
  /** Bulbul v3 speaker for TTS. Every speaker here supports all three
   *  languages in Bulbul v3 per Sarvam docs (2025-10). "priya" is the
   *  default; swap per-language if you want a different voice character. */
  ttsSpeaker: string;
  /** target_language_code sent to Bulbul TTS (same as code in v3) */
  ttsLanguageCode: string;
  /** language_code sent to Saaras STT for faster, more accurate detection.
   *  codemix mode still allows code-switching regardless of this hint. */
  sttLanguageCode: string;
  /** Language code sent to Document Intelligence OCR job */
  docIntelligenceCode: string;
  /** CSS font-family stack. Devanagari must come after a Latin face so
   *  browsers fall through only for Devanagari codepoints. */
  fontStack: string;
}

export const LANGUAGE_CONFIG: Record<AppLanguage, LanguageConfig> = {
  "en-IN": {
    code: "en-IN",
    label: "EN",
    nativeLabel: "English",
    htmlLang: "en",
    promptName: "English",
    promptScript: "Latin script",
    ttsSpeaker: "priya",
    ttsLanguageCode: "en-IN",
    sttLanguageCode: "en-IN",
    docIntelligenceCode: "en-IN",
    fontStack: "var(--font-sans), system-ui, sans-serif",
  },
  "hi-IN": {
    code: "hi-IN",
    label: "हि",
    nativeLabel: "हिंदी",
    htmlLang: "hi",
    promptName: "Hindi",
    promptScript: "Devanagari script",
    ttsSpeaker: "priya",
    ttsLanguageCode: "hi-IN",
    sttLanguageCode: "hi-IN",
    docIntelligenceCode: "hi-IN",
    fontStack: "var(--font-devanagari), var(--font-sans), system-ui, sans-serif",
  },
  "mr-IN": {
    code: "mr-IN",
    label: "म",
    nativeLabel: "मराठी",
    htmlLang: "mr",
    promptName: "Marathi",
    promptScript: "Devanagari script",
    // "priya" supports mr-IN in Bulbul v3 (same multilingual speaker model).
    // If Sarvam adds a Marathi-specific speaker, update this field.
    ttsSpeaker: "priya",
    ttsLanguageCode: "mr-IN",
    sttLanguageCode: "mr-IN",
    docIntelligenceCode: "mr-IN",
    fontStack: "var(--font-devanagari), var(--font-sans), system-ui, sans-serif",
  },
};

/** Ordered list for UI language pickers */
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  LANGUAGE_CONFIG["en-IN"],
  LANGUAGE_CONFIG["hi-IN"],
  LANGUAGE_CONFIG["mr-IN"],
];
