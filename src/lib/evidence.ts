import {
  extractAmounts,
  extractDates,
  normalizeAmount,
  normalizeDate,
  normalizeText,
  tokenize,
} from "./normalize";

/**
 * Evidence location over OCR text.
 *
 * The document is OCR'd to markdown, which carries no bounding boxes, so evidence
 * is located by line in the extracted text. `page` is reported only when the
 * markdown contains explicit page separators. Bounding boxes are `null` and the
 * UI says so — we never invent coordinates.
 */

export interface EvidenceSpan {
  /** The supporting text as it appears in the document. */
  text: string;
  /** 1-based line number in the extracted text. */
  line: number;
  page: number | null;
  /** Character offsets into the original extracted text, for highlighting. */
  start: number;
  end: number;
  match: "exact" | "normalized" | "fuzzy";
  bbox: null;
}

interface Line {
  text: string;
  start: number;
  line: number;
  page: number | null;
}

const PAGE_BREAK = /^(?:-{3,}|<!--\s*page[^>]*-->|#+\s*page\s+\d+)\s*$/i;

export function splitLines(ocrText: string): Line[] {
  const lines: Line[] = [];
  let offset = 0;
  let page: number | null = null;
  const raw = ocrText.split("\n");
  const hasPages = raw.some((l) => PAGE_BREAK.test(l.trim()));
  if (hasPages) page = 1;
  raw.forEach((text, i) => {
    if (hasPages && PAGE_BREAK.test(text.trim()) && i > 0) page = (page ?? 1) + 1;
    lines.push({ text, start: offset, line: i + 1, page });
    offset += text.length + 1;
  });
  return lines;
}

function span(l: Line, match: EvidenceSpan["match"]): EvidenceSpan {
  return { text: l.text.trim(), line: l.line, page: l.page, start: l.start, end: l.start + l.text.length, match, bbox: null };
}

/**
 * Finds where a quoted phrase appears in the document. Tries a verbatim match,
 * then a normalised match (case/punctuation/digit-script insensitive), then a
 * token-coverage match over a sliding window of up to 3 lines (≥ 80% of tokens).
 */
export function locateQuote(quote: string, ocrText: string): EvidenceSpan | null {
  const q = quote.trim();
  if (q.length < 2) return null;
  const lines = splitLines(ocrText);

  const exactIdx = ocrText.indexOf(q);
  if (exactIdx >= 0) {
    const l = [...lines].reverse().find((x) => x.start <= exactIdx)!;
    return { ...span(l, "exact"), start: exactIdx, end: exactIdx + q.length };
  }

  const nq = normalizeText(q);
  if (!nq) return null;
  // Smallest window first, so a match is pinned to the tightest span of lines.
  for (let w = 1; w <= 3; w++) {
    for (let i = 0; i + w <= lines.length; i++) {
      const window = lines.slice(i, i + w);
      const joined = normalizeText(window.map((x) => x.text).join(" "));
      if (joined.includes(nq)) {
        const first = window[0];
        const last = window[w - 1];
        return { text: window.map((x) => x.text.trim()).join(" "), line: first.line, page: first.page, start: first.start, end: last.start + last.text.length, match: "normalized", bbox: null };
      }
    }
  }

  const qTokens = tokenize(q);
  if (qTokens.length < 3) return null;
  let best: { cov: number; i: number; w: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    for (let w = 1; w <= 3 && i + w <= lines.length; w++) {
      const tokens = new Set(tokenize(lines.slice(i, i + w).map((x) => x.text).join(" ")));
      const cov = qTokens.filter((t) => tokens.has(t)).length / qTokens.length;
      if (!best || cov > best.cov || (cov === best.cov && w < best.w)) best = { cov, i, w };
    }
  }
  if (best && best.cov >= 0.8) {
    const window = lines.slice(best.i, best.i + best.w);
    const last = window[window.length - 1];
    return { text: window.map((x) => x.text.trim()).join(" "), line: window[0].line, page: window[0].page, start: window[0].start, end: last.start + last.text.length, match: "fuzzy", bbox: null };
  }
  return null;
}

/** Locates the line that contains a given amount (numeric comparison). */
export function locateAmount(value: string, ocrText: string): EvidenceSpan | null {
  const target = normalizeAmount(value) ?? extractAmounts(value)[0] ?? null;
  if (target == null) return null;
  for (const l of splitLines(ocrText)) {
    if (extractAmounts(l.text).some((n) => Math.abs(n - target) < 0.005)) return span(l, "normalized");
  }
  // Bare integer amounts without currency markers ("Total: 590").
  if (Number.isInteger(target)) {
    const re = new RegExp(`(^|[^\\d.,])${target}(?:\\.0+)?($|[^\\d,])`);
    for (const l of splitLines(ocrText)) if (re.test(l.text.replace(/,/g, ""))) return span(l, "normalized");
  }
  return null;
}

/** Locates the line that contains a given date (ISO comparison). */
export function locateDate(value: string, ocrText: string): EvidenceSpan | null {
  const target = normalizeDate(value) ?? extractDates(value)[0] ?? null;
  if (!target) return null;
  for (const l of splitLines(ocrText)) {
    if (extractDates(l.text).includes(target)) return span(l, "normalized");
  }
  return null;
}

export type Verification = "verified" | "partial" | "unverified";

export interface AnswerCheck {
  verification: Verification;
  evidence: EvidenceSpan[];
  /** Amounts/dates stated in the answer that do not appear anywhere in the document. */
  unsupportedValues: string[];
}

/**
 * Checks a model answer against the document:
 * - every quote the model cited must be found in the document text, and
 * - every amount and date stated in the answer must appear in the document.
 *
 * This is a conservative heuristic, not a semantic-correctness guarantee: it catches
 * invented numbers and fabricated quotes, but cannot prove an interpretation is right.
 */
export function checkAnswer(answer: string, quotes: string[], ocrText: string): AnswerCheck {
  const evidence: EvidenceSpan[] = [];
  let missingQuotes = 0;
  for (const q of quotes.slice(0, 6)) {
    const e = locateQuote(q, ocrText);
    if (e) evidence.push(e);
    else missingQuotes++;
  }

  const docAmounts = extractAmounts(ocrText);
  const docDates = new Set(extractDates(ocrText));
  const unsupported: string[] = [];
  for (const n of extractAmounts(answer)) {
    if (!docAmounts.some((d) => Math.abs(d - n) < 0.005) && !ocrText.replace(/,/g, "").includes(String(n))) unsupported.push(String(n));
  }
  for (const d of extractDates(answer)) if (!docDates.has(d)) unsupported.push(d);

  let verification: Verification;
  if (evidence.length > 0 && missingQuotes === 0 && unsupported.length === 0) verification = "verified";
  else if (evidence.length > 0 && unsupported.length === 0) verification = "partial";
  else verification = "unverified";

  return { verification, evidence: dedupe(evidence), unsupportedValues: unsupported };
}

function dedupe(spans: EvidenceSpan[]): EvidenceSpan[] {
  const seen = new Set<string>();
  return spans.filter((s) => {
    const k = `${s.start}:${s.end}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
