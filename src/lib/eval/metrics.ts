/**
 * Evaluation metrics. Each function documents exactly what it measures; none of
 * them claims more than it checks.
 */
import { normalizeAmount, normalizeDate, normalizeText, replaceDevanagariDigits, tokenize } from "../normalize";

/** Levenshtein distance over arbitrary token arrays (chars or words). O(n·m) time, O(m) memory. */
export function editDistance<T>(a: readonly T[], b: readonly T[]): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let cur = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

/** Text prep for OCR metrics: NFC, Devanagari digits → ASCII, markdown syntax removed, whitespace collapsed. Case is kept. */
export function prepareOcrText(s: string): string {
  return replaceDevanagariDigits(s.normalize("NFC"))
    .replace(/[#*_`|>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Character Error Rate = char edit distance / reference length.
 * Uses Unicode code points (Devanagari conjuncts count per code point).
 * Can exceed 1.0 when the hypothesis is much longer than the reference.
 */
export function cer(reference: string, hypothesis: string): number {
  const r = [...prepareOcrText(reference)];
  const h = [...prepareOcrText(hypothesis)];
  if (r.length === 0) return h.length === 0 ? 0 : 1;
  return editDistance(r, h) / r.length;
}

/** Word Error Rate = word edit distance / reference word count (punctuation-insensitive). */
export function wer(reference: string, hypothesis: string): number {
  const r = tokenize(reference);
  const h = tokenize(hypothesis);
  if (r.length === 0) return h.length === 0 ? 0 : 1;
  return editDistance(r, h) / r.length;
}

export type FieldType = "amount" | "date" | "name" | "id" | "text" | "category";

/**
 * Exact match after type-specific normalisation. Amounts compare numerically
 * (so "Rs. 1,840.00" == "₹1840") but a different number is always wrong; dates
 * compare as ISO dates (day-first); ids ignore spaces/case; text ignores case and
 * punctuation. Nothing is fuzzy-matched here.
 */
export function fieldMatches(expected: string, predicted: string | null | undefined, type: FieldType): boolean {
  if (predicted == null || !predicted.trim()) return false;
  switch (type) {
    case "amount": {
      const e = normalizeAmount(expected);
      const p = normalizeAmount(predicted);
      return e != null && p != null && Math.abs(e - p) < 0.005;
    }
    case "date": {
      const e = normalizeDate(expected);
      const p = normalizeDate(predicted);
      return e != null && e === p;
    }
    case "id":
      return expected.replace(/\s/g, "").toLowerCase() === predicted.replace(/\s/g, "").toLowerCase();
    default:
      return normalizeText(expected) === normalizeText(predicted);
  }
}

/** Fraction of `values` that are true; null when there is nothing to measure. */
export function rate(values: boolean[]): number | null {
  return values.length ? values.filter(Boolean).length / values.length : null;
}

export function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}
