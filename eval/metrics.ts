/**
 * KagazBol evaluation metrics.
 * Scoring functions for field extraction and QA accuracy.
 */

// Devanagari digit mapping (Unicode U+0966–U+096F)
const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

/** Replace Devanagari digits with ASCII equivalents */
function replaceDevanagariDigits(s: string): string {
  return s.replace(/[०-९]/g, (c) => DEVANAGARI_DIGITS[c] ?? c);
}

/**
 * Normalize a currency/amount string to a number.
 * - Strips ₹ / Rs. / INR prefix and whitespace
 * - Converts Devanagari digits to Latin
 * - Removes Indian grouping commas (1,23,456 → 123456)
 * - Returns parseFloat result or null
 */
export function normalizeAmount(s: string): number | null {
  if (!s) return null;
  let cleaned = s.trim();
  // Remove currency prefix
  cleaned = cleaned.replace(/^(₹|Rs\.?|INR)\s*/i, "");
  // Convert Devanagari digits
  cleaned = replaceDevanagariDigits(cleaned);
  // Remove commas (Indian grouping)
  cleaned = cleaned.replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

const HINDI_MONTHS: Record<string, number> = {
  "जनवरी": 1, "फ़रवरी": 2, "फरवरी": 2, "मार्च": 3, "अप्रैल": 4,
  "मई": 5, "जून": 6, "जुलाई": 7, "अगस्त": 8, "सितंबर": 9,
  "सितम्बर": 9, "अक्टूबर": 10, "नवंबर": 11, "दिसंबर": 12,
};

const MARATHI_MONTHS: Record<string, number> = {
  "जानेवारी": 1, "फेब्रुवारी": 2, "मार्च": 3, "एप्रिल": 4,
  "मे": 5, "जून": 6, "जुलै": 7, "ऑगस्ट": 8, "सप्टेंबर": 9,
  "ऑक्टोबर": 10, "नोव्हेंबर": 11, "डिसेंबर": 12,
};

const ENGLISH_MONTHS: Record<string, number> = {
  "january": 1, "february": 2, "march": 3, "april": 4,
  "may": 5, "june": 6, "july": 7, "august": 8, "september": 9,
  "october": 10, "november": 11, "december": 12,
  "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6,
  "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
};

/**
 * Normalize a date string to ISO "YYYY-MM-DD".
 * Handles: dd/mm/yyyy, dd-mm-yy, dd Month yyyy (English/Hindi/Marathi month names).
 * Returns null if parsing fails.
 */
export function normalizeDate(s: string): string | null {
  if (!s) return null;

  const cleaned = replaceDevanagariDigits(s.trim());

  // dd/mm/yyyy or dd-mm-yyyy
  const slashDash = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashDash) {
    const [, d, m, y] = slashDash;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    const yearRaw = parseInt(y, 10);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // dd Month yyyy (any language)
  const allMonths = { ...HINDI_MONTHS, ...MARATHI_MONTHS };
  // Try Devanagari month names
  for (const [name, num] of Object.entries(allMonths)) {
    const re = new RegExp(`(\\d{1,2})\\s*${name}\\s*(\\d{4})`);
    const m = cleaned.match(re);
    if (m) {
      const day = parseInt(m[1], 10);
      const year = parseInt(m[2], 10);
      return `${year}-${String(num).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // English month names
  const engMatch = cleaned.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (engMatch) {
    const [, d, mName, y] = engMatch;
    const num = ENGLISH_MONTHS[mName.toLowerCase()];
    if (num) {
      return `${y}-${String(num).padStart(2, "0")}-${String(parseInt(d, 10)).padStart(2, "0")}`;
    }
  }

  return null;
}

/**
 * Simple token set ratio — Jaccard similarity on lowercase word tokens.
 * Returns a value in [0, 1].
 */
export function tokenSetRatio(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^\w\u0900-\u097F\u0A00-\u0A7F]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
    );

  const setA = tokenize(a);
  const setB = tokenize(b);

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

export interface ScoreResult {
  exact: boolean;
  fuzzy: boolean;
  score: number;
}

/**
 * Score a predicted value against the expected value.
 * Uses type-appropriate normalization and fuzzy matching.
 */
export function scoreField(
  predicted: string,
  expected: string,
  type: "amount" | "date" | "name" | "id" | "text",
  threshold = 0.85
): ScoreResult {
  if (!predicted || !expected) {
    return { exact: false, fuzzy: false, score: 0 };
  }

  const predTrim = predicted.trim();
  const expTrim = expected.trim();

  // Exact match (case-insensitive)
  if (predTrim.toLowerCase() === expTrim.toLowerCase()) {
    return { exact: true, fuzzy: true, score: 1.0 };
  }

  switch (type) {
    case "amount": {
      const predNum = normalizeAmount(predTrim);
      const expNum = normalizeAmount(expTrim);
      if (predNum !== null && expNum !== null) {
        const exact = Math.abs(predNum - expNum) < 0.01;
        return { exact, fuzzy: exact, score: exact ? 1.0 : 0 };
      }
      break;
    }

    case "date": {
      const predDate = normalizeDate(predTrim);
      const expDate = normalizeDate(expTrim);
      if (predDate && expDate) {
        const exact = predDate === expDate;
        return { exact, fuzzy: exact, score: exact ? 1.0 : 0 };
      }
      break;
    }

    case "id": {
      // Strip spaces and compare
      const normalize = (s: string) => s.replace(/\s/g, "").toLowerCase();
      const exact = normalize(predTrim) === normalize(expTrim);
      return { exact, fuzzy: exact, score: exact ? 1.0 : 0 };
    }

    case "name":
    case "text": {
      // Fall through to fuzzy
      break;
    }
  }

  // Fuzzy token-set matching for name/text/fallback
  const score = tokenSetRatio(predTrim, expTrim);
  return { exact: false, fuzzy: score >= threshold, score };
}

/**
 * Find amounts (₹X) and dates in an answer string that don't appear in the source OCR text.
 * Returns an array of suspect values (potential hallucinations).
 */
export function findHallucinatedValues(answer: string, ocrText: string): string[] {
  const hallucinated: string[] = [];

  // Extract amounts from answer
  const amounts = answer.match(/₹[\d,]+(?:\.\d{2})?/g) ?? [];
  for (const amt of amounts) {
    // Normalize and check if it appears in OCR
    const normalized = amt.replace(/,/g, "");
    if (!ocrText.includes(amt) && !ocrText.includes(normalized)) {
      hallucinated.push(amt);
    }
  }

  // Extract date-like patterns from answer
  const dates = answer.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g) ?? [];
  for (const date of dates) {
    if (!ocrText.includes(date)) {
      // Try normalized form
      const norm = normalizeDate(date);
      const ocrDates = (ocrText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g) ?? []).map(normalizeDate);
      if (!norm || !ocrDates.includes(norm)) {
        hallucinated.push(date);
      }
    }
  }

  return [...new Set(hallucinated)];
}
