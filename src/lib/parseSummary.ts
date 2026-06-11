import type { DocumentSummary } from "./types";

function fallbackSummary(rawText: string): DocumentSummary {
  return {
    document_type: "Document",
    title: "Your document",
    key_facts: [],
    amounts: [],
    dates: [],
    deadline: null,
    action_required: "Please review the document text below.",
    summary_spoken: rawText.slice(0, 300) || "I could not read this document clearly.",
  };
}

/**
 * Parses the LLM's JSON summary response defensively. Models sometimes wrap
 * JSON in markdown fences or add stray text, so we extract the first
 * top-level {...} block before parsing, and fall back to a minimal summary
 * on any failure.
 */
export function parseSummaryResponse(text: string): DocumentSummary {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallbackSummary(text);

  try {
    const parsed = JSON.parse(match[0]) as Partial<DocumentSummary>;
    return {
      document_type: parsed.document_type ?? "Document",
      title: parsed.title ?? "Your document",
      key_facts: Array.isArray(parsed.key_facts) ? parsed.key_facts : [],
      amounts: Array.isArray(parsed.amounts) ? parsed.amounts : [],
      dates: Array.isArray(parsed.dates) ? parsed.dates : [],
      deadline: parsed.deadline ?? null,
      action_required: parsed.action_required ?? "No action needed",
      summary_spoken: parsed.summary_spoken ?? text.slice(0, 300),
    };
  } catch {
    return fallbackSummary(text);
  }
}
