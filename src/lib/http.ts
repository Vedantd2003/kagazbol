import { NextResponse } from "next/server";
import { AppError, errorBody, isAppError } from "./errors";
import { SarvamApiError } from "./sarvam/client";
import { checkRateLimit, clientKey, type RateLimitRule } from "./rateLimit";

/** Hard cap on JSON request bodies to stop cost amplification on the LLM routes. */
export const MAX_JSON_BYTES = 256 * 1024;

export async function readJson<T = Record<string, unknown>>(request: Request, maxBytes = MAX_JSON_BYTES): Promise<T> {
  const len = Number(request.headers.get("content-length") ?? "0");
  if (len > maxBytes) throw new AppError("BAD_REQUEST", "Request is too large.");
  const text = await request.text();
  if (text.length > maxBytes) throw new AppError("BAD_REQUEST", "Request is too large.");
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
    return value as T;
  } catch {
    throw new AppError("BAD_REQUEST", "Request body must be a JSON object.");
  }
}

/**
 * Logs an error with enough detail to debug, but never document content:
 * provider bodies are logged (they hold error codes), request bodies are not.
 */
export function logError(route: string, err: unknown) {
  if (err instanceof AppError) {
    const cause = err.cause;
    if (cause instanceof SarvamApiError) {
      console.error(`[${route}] ${err.code} ← provider ${cause.status}`, safeProviderBody(cause.body));
    } else if (err.code === "INTERNAL" || err.code === "PROVIDER_AUTH") {
      console.error(`[${route}] ${err.code}`, cause instanceof Error ? cause.message : "");
    } else {
      console.warn(`[${route}] ${err.code}`);
    }
    return;
  }
  console.error(`[${route}] unexpected`, err instanceof Error ? err.message : String(err));
}

function safeProviderBody(body: unknown): string {
  try {
    const s = typeof body === "string" ? body : JSON.stringify(body);
    return s.slice(0, 500);
  } catch {
    return "";
  }
}

export function errorResponse(err: unknown, route: string): NextResponse {
  const appErr = isAppError(err) ? err : new AppError("INTERNAL", undefined, { cause: err });
  logError(route, appErr);
  const res = NextResponse.json(errorBody(appErr), { status: appErr.status });
  if (appErr.code === "RATE_LIMITED") res.headers.set("Retry-After", "10");
  return res;
}

/** Applies a rate limit for the calling client; throws RATE_LIMITED when exceeded. */
export function enforceRateLimit(request: Request, rule: RateLimitRule) {
  const result = checkRateLimit(`${rule.name}:${clientKey(request)}`, rule);
  if (!result.allowed) throw new AppError("RATE_LIMITED");
}
