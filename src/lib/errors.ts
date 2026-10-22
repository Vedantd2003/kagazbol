/**
 * Structured, client-safe error model shared by every API route.
 *
 * Routes never send raw provider bodies, stack traces or internal messages to the
 * browser: they send a stable `code`, a user-safe `message`, and whether retrying
 * could help. The legacy `error` string field is kept so older clients still work.
 */

export type ErrorCode =
  | "BAD_REQUEST"
  | "INVALID_DOCUMENT"
  | "UNSUPPORTED_FILE"
  | "FILE_TOO_LARGE"
  | "LOW_QUALITY"
  | "OCR_FAILED"
  | "UNSUPPORTED_LANGUAGE"
  | "TRANSLATION_FAILED"
  | "LANGUAGE_DETECTION_FAILED"
  | "STT_FAILED"
  | "TTS_FAILED"
  | "ANSWER_FAILED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_ERROR"
  | "PROVIDER_AUTH"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "NOT_CONFIGURED"
  | "INTERNAL";

const DEFAULTS: Record<ErrorCode, { status: number; message: string; retryable: boolean }> = {
  BAD_REQUEST: { status: 400, message: "The request was not valid.", retryable: false },
  INVALID_DOCUMENT: { status: 400, message: "This file could not be read as a document.", retryable: false },
  UNSUPPORTED_FILE: { status: 415, message: "This file type is not supported. Please use a JPEG, PNG, WebP or HEIC photo.", retryable: false },
  FILE_TOO_LARGE: { status: 413, message: "This file is too large. Please use a photo under 10 MB.", retryable: false },
  LOW_QUALITY: { status: 422, message: "We couldn't read text from this photo. Try a sharper, well-lit photo with the whole page visible.", retryable: false },
  OCR_FAILED: { status: 502, message: "Reading the document failed. Please try again.", retryable: true },
  UNSUPPORTED_LANGUAGE: { status: 400, message: "That language is not supported yet.", retryable: false },
  TRANSLATION_FAILED: { status: 502, message: "The explanation could not be produced in that language. Please try again.", retryable: true },
  LANGUAGE_DETECTION_FAILED: { status: 502, message: "The document language could not be detected.", retryable: true },
  STT_FAILED: { status: 502, message: "We couldn't understand the recording. Please try again or type your question.", retryable: true },
  TTS_FAILED: { status: 502, message: "Audio could not be generated. You can still read the answer.", retryable: true },
  ANSWER_FAILED: { status: 502, message: "The assistant couldn't answer just now. Please try again.", retryable: true },
  PROVIDER_TIMEOUT: { status: 504, message: "The AI service took too long to respond. Please try again.", retryable: true },
  PROVIDER_ERROR: { status: 502, message: "The AI service had a problem. Please try again.", retryable: true },
  PROVIDER_AUTH: { status: 503, message: "The AI service is not configured correctly on the server.", retryable: false },
  RATE_LIMITED: { status: 429, message: "Too many requests. Please wait a moment and try again.", retryable: true },
  UNAUTHORIZED: { status: 401, message: "Sign-in required.", retryable: false },
  FORBIDDEN: { status: 403, message: "You don't have permission to do that.", retryable: false },
  NOT_FOUND: { status: 404, message: "Not found.", retryable: false },
  CONFLICT: { status: 409, message: "That action is already in progress.", retryable: false },
  NOT_CONFIGURED: { status: 503, message: "This feature is not configured on the server.", retryable: false },
  INTERNAL: { status: 500, message: "Something went wrong on our side. Please try again.", retryable: true },
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  /** Safe to show to end users. */
  readonly publicMessage: string;

  constructor(code: ErrorCode, publicMessage?: string, opts: { cause?: unknown; retryable?: boolean } = {}) {
    const d = DEFAULTS[code];
    super(publicMessage ?? d.message, { cause: opts.cause });
    this.name = "AppError";
    this.code = code;
    this.status = d.status;
    this.retryable = opts.retryable ?? d.retryable;
    this.publicMessage = publicMessage ?? d.message;
  }
}

export interface ErrorBody {
  /** Legacy, human-readable message. Same text as `message`. */
  error: string;
  code: ErrorCode;
  message: string;
  retryable: boolean;
}

export function errorBody(err: AppError): ErrorBody {
  return { error: err.publicMessage, code: err.code, message: err.publicMessage, retryable: err.retryable };
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
