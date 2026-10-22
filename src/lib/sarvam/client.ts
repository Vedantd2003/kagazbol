import { SARVAM_API_BASE } from "./config";
import { AppError, type ErrorCode } from "../errors";

/** Upstream failure with details that must stay server-side. */
export class SarvamApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "SarvamApiError";
    this.status = status;
    this.body = body;
  }
}

function getApiKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key) {
    throw new AppError("PROVIDER_AUTH", undefined, {
      cause: new Error("SARVAM_API_KEY is not set. Add it to your .env file (see .env.example)."),
    });
  }
  return key;
}

/** 408 (our timeout), 429 and 5xx are worth retrying; 4xx validation/auth errors are not. */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export interface RetryOptions {
  /** Total attempts including the first. 1 = no retry. */
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * Only idempotent / non-billing-duplicating calls should pass retries > 1.
 * Job creation and file upload deliberately keep the default of 1.
 */
export const NO_RETRY: RetryOptions = { attempts: 1, baseDelayMs: 0, maxDelayMs: 0 };
export const SAFE_RETRY: RetryOptions = { attempts: 3, baseDelayMs: 400, maxDelayMs: 4_000 };

/** Full-jitter exponential backoff. Exported for tests. */
export function backoffDelay(attempt: number, opts: RetryOptions, random: () => number = Math.random): number {
  const exp = Math.min(opts.maxDelayMs, opts.baseDelayMs * 2 ** (attempt - 1));
  return Math.round(random() * exp);
}

function retryAfterMs(res: Response | null): number | null {
  const h = res?.headers.get("retry-after");
  if (!h) return null;
  const secs = Number(h);
  return Number.isFinite(secs) ? Math.min(secs * 1000, 10_000) : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Low-level fetch wrapper for Sarvam's REST API. Adds the auth header, applies a
 * per-attempt timeout, retries only retryable failures with bounded backoff + jitter,
 * and throws SarvamApiError (server-side detail) on final failure.
 */
export async function sarvamFetch(
  path: string,
  init: RequestInit & { timeoutMs?: number; retry?: RetryOptions } = {}
): Promise<Response> {
  const { timeoutMs = 60_000, headers, retry = NO_RETRY, ...rest } = init;
  const apiKey = getApiKey();
  let lastErr: SarvamApiError | null = null;

  for (let attempt = 1; attempt <= retry.attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response | null = null;
    try {
      res = await fetch(`${SARVAM_API_BASE}${path}`, {
        ...rest,
        headers: { "api-subscription-key": apiKey, ...headers },
        signal: controller.signal,
      });

      if (res.ok) return res;

      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => null);
      }
      lastErr = new SarvamApiError(`Sarvam API ${path} failed with ${res.status}`, res.status, body);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        lastErr = new SarvamApiError(`Sarvam API ${path} timed out after ${timeoutMs}ms`, 408, null);
      } else {
        // Network failure (DNS, reset). Treat like a 503.
        lastErr = new SarvamApiError(`Sarvam API ${path} network error`, 503, String(err));
      }
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < retry.attempts && isRetryableStatus(lastErr.status)) {
      await sleep(retryAfterMs(res) ?? backoffDelay(attempt, retry));
      continue;
    }
    break;
  }

  throw lastErr!;
}

/**
 * Maps any error from a provider call to a client-safe AppError.
 * `fallback` names the stage-specific code for generic upstream failures.
 */
export function toAppError(err: unknown, fallback: ErrorCode): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof SarvamApiError) {
    if (err.status === 401 || err.status === 403) return new AppError("PROVIDER_AUTH", undefined, { cause: err });
    if (err.status === 429) return new AppError("RATE_LIMITED", undefined, { cause: err });
    if (err.status === 408) return new AppError("PROVIDER_TIMEOUT", undefined, { cause: err });
    if (err.status === 400 || err.status === 422) return new AppError(fallback, undefined, { cause: err, retryable: false });
    return new AppError(fallback, undefined, { cause: err });
  }
  return new AppError("INTERNAL", undefined, { cause: err });
}
