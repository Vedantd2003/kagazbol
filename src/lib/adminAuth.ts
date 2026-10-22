import { timingSafeEqual, createHash } from "crypto";
import { AppError } from "./errors";

/**
 * Smallest secure admin gate for an app without user accounts: a shared bearer
 * token in EVAL_ADMIN_TOKEN, checked on the server for every admin route.
 * - Unset or short token → admin features are disabled (fail closed).
 * - Compared in constant time on hashes (no length leak).
 * Frontend checks are cosmetic; this is the enforcement point.
 */
export const MIN_TOKEN_LENGTH = 24;

export function requireAdmin(request: Request): void {
  const expected = process.env.EVAL_ADMIN_TOKEN ?? "";
  if (expected.length < MIN_TOKEN_LENGTH) throw new AppError("NOT_CONFIGURED", "The evaluation dashboard is not enabled on this server.");
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AppError("UNAUTHORIZED", "Admin token required.");
  const a = createHash("sha256").update(match[1].trim()).digest();
  const b = createHash("sha256").update(expected).digest();
  if (!timingSafeEqual(a, b)) throw new AppError("FORBIDDEN", "Invalid admin token.");
}
