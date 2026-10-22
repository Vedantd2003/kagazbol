/**
 * Small in-memory sliding-window rate limiter.
 *
 * Scope: per server instance. KagazBol runs as one Render web service, so this
 * bounds abuse of the paid provider endpoints without new infrastructure. If the
 * service is ever scaled horizontally, move this to a shared store (e.g. Redis).
 */

export interface RateLimitRule {
  name: string;
  limit: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  upload: { name: "upload", limit: 12, windowMs: 10 * 60_000 },
  llm: { name: "llm", limit: 40, windowMs: 10 * 60_000 },
  speech: { name: "speech", limit: 80, windowMs: 10 * 60_000 },
  poll: { name: "poll", limit: 600, windowMs: 10 * 60_000 },
} satisfies Record<string, RateLimitRule>;

const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

export function checkRateLimit(key: string, rule: RateLimitRule, now = Date.now()): { allowed: boolean; remaining: number } {
  if (process.env.RATE_LIMIT_DISABLED === "1") return { allowed: true, remaining: rule.limit };
  if (now - lastSweep > 60_000) {
    for (const [k, hits] of buckets) if (!hits.some((t) => now - t < 3_600_000)) buckets.delete(k);
    lastSweep = now;
  }
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < rule.windowMs);
  if (hits.length >= rule.limit) {
    buckets.set(key, hits);
    return { allowed: false, remaining: 0 };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { allowed: true, remaining: rule.limit - hits.length };
}

/** Render puts the client IP first in x-forwarded-for. */
export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}

export function resetRateLimits() {
  buckets.clear();
}
