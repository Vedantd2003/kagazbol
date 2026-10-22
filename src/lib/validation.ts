import { AppError } from "./errors";
import { isAppLanguage, normalizeLanguageCode, type AppLanguage } from "./languages";

/** Upload limit. Client compresses to ≤2000px JPEG (~0.2–0.5 MB), so 10 MB is generous. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** OCR text accepted by summarize/chat. A dense A4 page is ~6–10k chars. */
export const MAX_OCR_CHARS = 40_000;
export const MAX_QUESTION_CHARS = 1_000;
export const MAX_HISTORY_TURNS = 12;
export const MAX_TURN_CHARS = 2_000;
export const MAX_TTS_CHARS = 2_500;
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export type SniffedImage = "image/jpeg" | "image/png" | "image/webp" | "image/heic";

/**
 * Identify an image by its magic bytes. The browser-declared MIME type and the
 * filename extension are not trusted.
 */
export function sniffImageType(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  // ISO-BMFF: "ftyp" at offset 4 followed by a HEIF-family brand.
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return "image/heic";
  }
  return null;
}

export const SNIFFED_EXTENSION: Record<SniffedImage, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

/** Validates an uploaded document and returns its bytes + trusted type. */
export async function validateUpload(file: unknown): Promise<{ bytes: Buffer; type: SniffedImage }> {
  if (!(file instanceof File)) throw new AppError("BAD_REQUEST", "No file was uploaded.");
  if (file.size === 0) throw new AppError("INVALID_DOCUMENT", "The uploaded file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError("FILE_TOO_LARGE");
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) throw new AppError("UNSUPPORTED_FILE");
  return { bytes, type };
}

export function parseLanguage(value: unknown, fallback?: AppLanguage): AppLanguage {
  if (value == null || value === "") {
    if (fallback) return fallback;
    throw new AppError("BAD_REQUEST", "A language is required.");
  }
  const norm = normalizeLanguageCode(value);
  if (norm && isAppLanguage(norm)) return norm;
  throw new AppError("UNSUPPORTED_LANGUAGE");
}

/**
 * Provider job IDs are interpolated into upstream URL paths, so they must be a
 * conservative token: no slashes, dots or query characters.
 */
const JOB_ID = /^[A-Za-z0-9_-]{8,128}$/;
export function parseJobId(value: unknown): string {
  if (typeof value !== "string" || !JOB_ID.test(value)) {
    throw new AppError("BAD_REQUEST", "Invalid job id.");
  }
  return value;
}

export function requireString(value: unknown, field: string, maxChars: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError("BAD_REQUEST", `Missing ${field}.`);
  }
  if (value.length > maxChars) {
    throw new AppError("BAD_REQUEST", `${field} is too long.`);
  }
  return value;
}

export function parseHistory(value: unknown): { role: "user" | "assistant"; content: string }[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new AppError("BAD_REQUEST", "Invalid history.");
  return value.slice(-MAX_HISTORY_TURNS).map((t) => {
    if (!t || typeof t !== "object") throw new AppError("BAD_REQUEST", "Invalid history.");
    const { role, content } = t as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") throw new AppError("BAD_REQUEST", "Invalid history.");
    if (typeof content !== "string") throw new AppError("BAD_REQUEST", "Invalid history.");
    return { role, content: content.slice(0, MAX_TURN_CHARS) };
  });
}
