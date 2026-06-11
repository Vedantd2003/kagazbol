import { SARVAM_API_BASE } from "./config";

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
    throw new Error(
      "SARVAM_API_KEY is not set. Add it to your .env file (see .env.example)."
    );
  }
  return key;
}

/**
 * Low-level fetch wrapper for Sarvam's REST API. Adds auth header, applies a
 * timeout, and throws SarvamApiError with response details on non-2xx.
 */
export async function sarvamFetch(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 60_000, headers, ...rest } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${SARVAM_API_BASE}${path}`, {
      ...rest,
      headers: {
        "api-subscription-key": getApiKey(),
        ...headers,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text();
      }
      throw new SarvamApiError(
        `Sarvam API ${path} failed with ${res.status}`,
        res.status,
        body
      );
    }

    return res;
  } catch (err) {
    if (err instanceof SarvamApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new SarvamApiError(`Sarvam API ${path} timed out after ${timeoutMs}ms`, 408, null);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
