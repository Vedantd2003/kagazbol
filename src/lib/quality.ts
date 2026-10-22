/**
 * Document quality assessment.
 *
 * Image checks run in the browser before upload (no extra cost, no upload of a
 * photo we already know is unreadable). Text checks run on the server after OCR.
 * Both produce actionable hints, never hard blocks — the user can always continue.
 */

export type QualityIssue =
  | "low_resolution"
  | "blurry"
  | "too_dark"
  | "too_bright"
  | "landscape"
  | "empty_text"
  | "very_little_text"
  | "garbled_text";

export interface QualityReport {
  ok: boolean;
  issues: QualityIssue[];
  metrics: Record<string, number>;
}

export const QUALITY_THRESHOLDS = {
  /** Shorter edge below this is too small for reliable OCR of body text. */
  minShortEdge: 700,
  /** Variance of the Laplacian on a 512px-wide grayscale copy. */
  minSharpness: 60,
  minMeanLuma: 50,
  maxMeanLuma: 235,
  /** Share of pixels dark enough to be ink; below this a bright photo is "washed out". */
  minInkFraction: 0.004,
  minTextChars: 40,
  maxNonWordRatio: 0.45,
};

/**
 * Pure image check over a grayscale buffer (0–255, row-major). Callers downscale
 * to ~512px wide first so thresholds are resolution-independent and it stays fast
 * on low-end phones.
 */
export function assessGrayscale(
  gray: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  original: { width: number; height: number }
): QualityReport {
  const issues: QualityIssue[] = [];
  let sum = 0;
  let dark = 0;
  for (let i = 0; i < gray.length; i++) {
    sum += gray[i];
    if (gray[i] < 140) dark++;
  }
  const meanLuma = gray.length ? sum / gray.length : 0;
  // A clean page is mostly white, so brightness alone is not a problem; it is
  // "washed out" only when almost nothing on it is dark enough to be ink.
  const darkFraction = gray.length ? dark / gray.length : 0;

  // Laplacian variance: low variance → few sharp edges → likely blur.
  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      lapSum += lap;
      lapSq += lap * lap;
      n++;
    }
  }
  const sharpness = n ? lapSq / n - (lapSum / n) ** 2 : 0;
  const shortEdge = Math.min(original.width, original.height);

  if (shortEdge < QUALITY_THRESHOLDS.minShortEdge) issues.push("low_resolution");
  if (sharpness < QUALITY_THRESHOLDS.minSharpness) issues.push("blurry");
  if (meanLuma < QUALITY_THRESHOLDS.minMeanLuma) issues.push("too_dark");
  if (meanLuma > QUALITY_THRESHOLDS.maxMeanLuma && darkFraction < QUALITY_THRESHOLDS.minInkFraction) issues.push("too_bright");
  // Most Indian documents are portrait; a landscape photo is often rotated.
  if (original.width > original.height * 1.25) issues.push("landscape");

  return { ok: issues.length === 0, issues, metrics: { sharpness: Math.round(sharpness), meanLuma: Math.round(meanLuma), darkFraction: Math.round(darkFraction * 1000) / 1000, shortEdge } };
}

/** Server-side check of OCR output. */
export function assessOcrText(text: string): QualityReport {
  const trimmed = text.trim();
  const issues: QualityIssue[] = [];
  const letters = (trimmed.match(/[\p{L}\p{M}]/gu) ?? []).length;
  const visible = trimmed.replace(/\s/g, "").length;
  const nonWordRatio = visible ? 1 - letters / visible : 1;

  if (!trimmed) issues.push("empty_text");
  else if (letters < QUALITY_THRESHOLDS.minTextChars) issues.push("very_little_text");
  if (trimmed && nonWordRatio > QUALITY_THRESHOLDS.maxNonWordRatio && visible > 20) issues.push("garbled_text");

  return { ok: issues.length === 0, issues, metrics: { letters, nonWordRatio: Math.round(nonWordRatio * 100) / 100 } };
}

export const QUALITY_HINTS: Record<QualityIssue, string> = {
  low_resolution: "The photo is small. Move closer so the page fills the frame.",
  blurry: "The photo looks blurry. Hold the phone steady and tap to focus before taking it.",
  too_dark: "The photo is dark. Turn on a light or move near a window.",
  too_bright: "The photo is washed out. Avoid direct light or flash glare on the paper.",
  landscape: "The photo is sideways. Rotate it so the text reads normally.",
  empty_text: "No text was found. Make sure the whole page is in the photo and in focus.",
  very_little_text: "Only a little text was read. Part of the page may be cut off or out of focus.",
  garbled_text: "Much of the text looks garbled. A sharper, flatter photo will give better results.",
};
