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
    warnings: [],
    summary_spoken: rawText.slice(0, 300) || "I could not read this document clearly.",
  };
}

const str = (v: unknown, d: string) => (typeof v === "string" && v.trim() ? v : d);
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : []);
const pairs = (v: unknown) =>
  Array.isArray(v)
    ? v
        .filter((x): x is { label: unknown; value: unknown } => !!x && typeof x === "object")
        .map((x) => ({ label: String(x.label ?? ""), value: String(x.value ?? "") }))
        .filter((x) => x.value.trim())
    : [];

/**
 * Parses the LLM's JSON summary response defensively. Models sometimes wrap
 * JSON in markdown fences or add stray text, so we extract the first
 * top-level {...} block before parsing, and fall back to a minimal summary
 * on any failure. Field types are coerced so the UI never receives junk.
 */
export function parseSummaryResponse(text: string): DocumentSummary {
  return parseSummaryWithStatus(text).summary;
}

export function parseSummaryWithStatus(text: string): { summary: DocumentSummary; fallback: boolean } {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { summary: fallbackSummary(text), fallback: true };

  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    return {
      fallback: false,
      summary: {
        document_type: str(parsed.document_type, "Document"),
        title: str(parsed.title, "Your document"),
        key_facts: strList(parsed.key_facts),
        amounts: pairs(parsed.amounts),
        dates: pairs(parsed.dates),
        deadline: typeof parsed.deadline === "string" && parsed.deadline.trim() && parsed.deadline !== "null" ? parsed.deadline : null,
        action_required: str(parsed.action_required, "No action needed"),
        warnings: strList(parsed.warnings),
        summary_spoken: str(parsed.summary_spoken, text.slice(0, 300)),
      },
    };
  } catch {
    return { summary: fallbackSummary(text), fallback: true };
  }
}

/** Parses `{"answer": "...", "quotes": [...]}`; falls back to the raw text as the answer. */
export function parseAnswerResponse(text: string): { answer: string; quotes: string[]; structured: boolean } {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as { answer?: unknown; quotes?: unknown };
      if (typeof parsed.answer === "string" && parsed.answer.trim()) {
        return { answer: parsed.answer.trim(), quotes: strList(parsed.quotes).map((q) => q.slice(0, 300)), structured: true };
      }
    } catch {
      // fall through
    }
  }
  return { answer: text.trim(), quotes: [], structured: false };
}

/** Parses the "Explain simply" JSON reply. Returns null when unusable. */
export function parseExplainResponse(text: string): { simple: string; example: string | null; unclear: boolean } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const p = JSON.parse(match[0]) as { simple?: unknown; example?: unknown; unclear?: unknown };
    if (typeof p.simple !== "string" || !p.simple.trim()) return null;
    return {
      simple: p.simple.trim(),
      example: typeof p.example === "string" && p.example.trim() ? p.example.trim() : null,
      unclear: p.unclear === true,
    };
  } catch {
    return null;
  }
}
