import { assessGrayscale, type QualityReport } from "./quality";

/**
 * Browser-only: downsamples the photo to ≤512 px wide on a canvas, converts to
 * grayscale and runs the pure quality checks. Images the browser can't decode
 * (e.g. HEIC on most desktop browsers) skip the check rather than block upload.
 */
export async function assessImageFile(file: File): Promise<QualityReport> {
  const skip: QualityReport = { ok: true, issues: [], metrics: {} };
  if (typeof createImageBitmap === "undefined") return skip;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return skip;
  }
  try {
    const scale = Math.min(1, 512 / bitmap.width);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return skip;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const gray = new Uint8ClampedArray(w * h);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    return assessGrayscale(gray, w, h, { width: bitmap.width, height: bitmap.height });
  } finally {
    bitmap.close();
  }
}
