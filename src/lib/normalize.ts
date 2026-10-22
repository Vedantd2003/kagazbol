/**
 * Normalisation for amounts, dates and free text across English, Hindi and Marathi.
 * Shared by the evidence checker (runtime) and the evaluation metrics.
 */

const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

export function replaceDevanagariDigits(s: string): string {
  return s.replace(/[०-९]/g, (c) => DEVANAGARI_DIGITS[c] ?? c);
}

/**
 * Amount string → number. Strips ₹ / Rs. / INR / रु. / रुपये, converts Devanagari
 * digits, removes Indian grouping commas. Returns null when there is no number.
 */
export function normalizeAmount(s: string): number | null {
  if (!s) return null;
  let cleaned = replaceDevanagariDigits(s.trim());
  cleaned = cleaned.replace(/^(₹|rs\.?|inr|रु\.?|रुपये|रुपए)\s*/i, "");
  cleaned = cleaned.replace(/\s*(\/-|rupees|रुपये|रुपए)$/i, "");
  cleaned = cleaned.replace(/,/g, "");
  const m = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!m || m.index !== 0) return null;
  const n = parseFloat(m[0]);
  return Number.isNaN(n) ? null : n;
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  // Hindi
  "जनवरी": 1, "फ़रवरी": 2, "फरवरी": 2, "मार्च": 3, "अप्रैल": 4, "मई": 5, "जून": 6,
  "जुलाई": 7, "अगस्त": 8, "सितंबर": 9, "सितम्बर": 9, "अक्टूबर": 10, "नवंबर": 11, "नवम्बर": 11, "दिसंबर": 12, "दिसम्बर": 12,
  // Marathi
  "जानेवारी": 1, "फेब्रुवारी": 2, "एप्रिल": 4, "मे": 5, "जुलै": 7, "ऑगस्ट": 8,
  "सप्टेंबर": 9, "ऑक्टोबर": 10, "नोव्हेंबर": 11, "डिसेंबर": 12,
};

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Date string → ISO "YYYY-MM-DD". Numeric dates are read day-first (Indian convention).
 * Handles dd/mm/yyyy, dd-mm-yy, dd.mm.yyyy, "21 June 2026", "June 21, 2026", and
 * Hindi/Marathi month names. Returns null if it cannot parse unambiguously.
 */
export function normalizeDate(s: string): string | null {
  if (!s) return null;
  const cleaned = replaceDevanagariDigits(s.trim()).replace(/,/g, " ").replace(/\s+/g, " ");

  const num = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (num) {
    const y = parseInt(num[3], 10);
    return iso(y < 100 ? 2000 + y : y, parseInt(num[2], 10), parseInt(num[1], 10));
  }
  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) return iso(+isoMatch[1], +isoMatch[2], +isoMatch[3]);

  const dmy = cleaned.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(\S+?)\.?\s+(\d{4})$/i);
  if (dmy) {
    const m = MONTHS[dmy[2].toLowerCase()];
    if (m) return iso(+dmy[3], m, +dmy[1]);
  }
  const mdy = cleaned.match(/^(\S+?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})$/i);
  if (mdy) {
    const m = MONTHS[mdy[1].toLowerCase()];
    if (m) return iso(+mdy[3], m, +mdy[2]);
  }
  return null;
}

const MONTH_ALT = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
const DATE_PATTERNS = [
  /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g,
  new RegExp(`\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTH_ALT})\\.?,?\\s+\\d{4}`, "gi"),
  new RegExp(`(?:${MONTH_ALT})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}`, "gi"),
];

/** All dates found in a text, normalised to ISO. */
export function extractDates(text: string): string[] {
  const t = replaceDevanagariDigits(text);
  const out = new Set<string>();
  for (const re of DATE_PATTERNS) {
    for (const m of t.matchAll(re)) {
      const n = normalizeDate(m[0]);
      if (n) out.add(n);
    }
  }
  return [...out];
}

/**
 * All money-like numbers in a text. Matches a currency marker followed by a number,
 * plus bare numbers with grouping commas or decimals (e.g. "1,840.00").
 */
export function extractAmounts(text: string): number[] {
  const t = replaceDevanagariDigits(text);
  const out = new Set<number>();
  const currency = /(?:₹|rs\.?|inr|रु\.?)\s*(\d[\d,]*(?:\.\d+)?)/gi;
  for (const m of t.matchAll(currency)) {
    const n = normalizeAmount(m[1]);
    if (n != null) out.add(n);
  }
  const grouped = /\b\d{1,3}(?:,\d{2,3})+(?:\.\d+)?\b|\b\d+\.\d{2}\b/g;
  for (const m of t.matchAll(grouped)) {
    const n = normalizeAmount(m[0]);
    if (n != null) out.add(n);
  }
  return [...out];
}

/** Lowercase, Devanagari digits → ASCII, punctuation → space, collapsed whitespace. */
export function normalizeText(s: string): string {
  return replaceDevanagariDigits(s)
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tokenize(s: string): string[] {
  const n = normalizeText(s);
  return n ? n.split(" ") : [];
}
