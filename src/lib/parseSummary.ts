import type { AppLanguage } from "./languages";
import type { DocumentSummary } from "./types";

// Minimal server-side fallback strings for each language.
// These only appear if the LLM fails to produce valid JSON — which is rare.
const FALLBACK_STRINGS: Record<AppLanguage, { document_type: string; title: string; action_required: string; summary_spoken: string }> = {
  "en-IN": {
    document_type: "Document",
    title: "Your document",
    action_required: "Please review the document.",
    summary_spoken: "I could not read this document clearly.",
  },
  "hi-IN": {
    document_type: "दस्तावेज़",
    title: "आपका दस्तावेज़",
    action_required: "कृपया दस्तावेज़ की जाँच करें।",
    summary_spoken: "मैं इस दस्तावेज़ को स्पष्ट रूप से नहीं पढ़ सका।",
  },
  "mr-IN": {
    document_type: "कागदपत्र",
    title: "तुमचे कागदपत्र",
    action_required: "कृपया कागदपत्र तपासा.",
    summary_spoken: "मला हे कागदपत्र नीट वाचता आले नाही.",
  },
};

function fallbackSummary(rawText: string, language: AppLanguage = "en-IN"): DocumentSummary {
  const fb = FALLBACK_STRINGS[language];
  return {
    document_type: fb.document_type,
    title: fb.title,
    key_facts: [],
    amounts: [],
    dates: [],
    deadline: null,
    action_required: fb.action_required,
    // rawText is the OCR/LLM output — use it verbatim if non-empty; it's
    // likely already in the right language even if JSON parsing failed.
    summary_spoken: rawText.slice(0, 300) || fb.summary_spoken,
  };
}

/**
 * Parses the LLM's JSON summary response defensively. Models sometimes wrap
 * JSON in markdown fences or add stray text, so we extract the first
 * top-level {...} block before parsing, and fall back to a minimal summary
 * on any failure. Pass language so fallback strings are in the right language.
 */
export function parseSummaryResponse(text: string, language: AppLanguage = "en-IN"): DocumentSummary {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallbackSummary(text, language);

  try {
    const parsed = JSON.parse(match[0]) as Partial<DocumentSummary>;
    const fb = FALLBACK_STRINGS[language];
    return {
      document_type: parsed.document_type ?? fb.document_type,
      title: parsed.title ?? fb.title,
      key_facts: Array.isArray(parsed.key_facts) ? parsed.key_facts : [],
      amounts: Array.isArray(parsed.amounts) ? parsed.amounts : [],
      dates: Array.isArray(parsed.dates) ? parsed.dates : [],
      deadline: parsed.deadline ?? null,
      action_required: parsed.action_required ?? "No action needed",
      summary_spoken: parsed.summary_spoken ?? text.slice(0, 300),
    };
  } catch {
    return fallbackSummary(text, language);
  }
}
