/**
 * Extracts the next complete sentence from a streaming text buffer.
 *
 * Split rules:
 * - Always split on Devanagari dandas: । and ॥
 * - Split on .!? followed by whitespace + uppercase letter, or end of string
 *
 * Don't split:
 * - Decimal numbers: digit before the dot (e.g. 3.14)
 * - Common abbreviations: Dr. Mr. Mrs. Ms. Rs. Prof. No. vs. followed by dot
 * - Single letter initials: single uppercase letter + dot (e.g. A.)
 */

const ABBREVS = /\b(Dr|Mr|Mrs|Ms|Rs|Prof|No|vs)\s*$/;
const SINGLE_INITIAL = /\b[A-Z]\s*$/;
const DECIMAL_DIGIT = /\d\s*$/;

export function extractNextSentence(
  buffer: string
): { sentence: string; remainder: string } | null {
  if (!buffer) return null;

  // Check for Devanagari dandas first (always split on these)
  const dandaMatch = buffer.search(/[।॥]/);
  if (dandaMatch !== -1) {
    const sentence = buffer.slice(0, dandaMatch + 1).trim();
    const remainder = buffer.slice(dandaMatch + 1).trimStart();
    if (sentence) {
      return { sentence, remainder };
    }
  }

  // Look for sentence-ending punctuation
  const punctPattern = /[.!?]/g;
  let match: RegExpExecArray | null;

  while ((match = punctPattern.exec(buffer)) !== null) {
    const idx = match.index;
    const char = match[0];

    // Only consider dots for additional checks (! and ? always split)
    if (char === ".") {
      const before = buffer.slice(0, idx);

      // Skip decimal: digit before dot
      if (DECIMAL_DIGIT.test(before)) continue;

      // Skip abbreviations: Dr. Mr. etc.
      if (ABBREVS.test(before)) continue;

      // Skip single initials: A. B. etc.
      if (SINGLE_INITIAL.test(before)) continue;
    }

    // Check what follows: must be whitespace + uppercase OR end of string
    const after = buffer.slice(idx + 1);

    // End of string
    if (after.trim() === "") {
      // Only return if buffer doesn't end mid-word (no trailing non-space)
      // For end-of-stream, caller flushes buffer anyway
      // Return null here so we don't break on trailing dot
      continue;
    }

    // Whitespace + uppercase letter (or Devanagari / digit = new sentence)
    const afterMatch = after.match(/^(\s+)([A-Z\u0900-\u097F\u0A00-\u0A7F0-9])/);
    if (afterMatch) {
      const sentence = buffer.slice(0, idx + 1).trim();
      const remainder = after.trimStart();
      if (sentence) {
        return { sentence, remainder };
      }
    }
  }

  return null;
}
