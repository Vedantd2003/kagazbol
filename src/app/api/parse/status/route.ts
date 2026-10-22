import { NextResponse } from "next/server";
import { getDocJobStatus } from "@/lib/sarvam/docIntelligence";
import { toAppError } from "@/lib/sarvam/client";
import { enforceRateLimit, errorResponse } from "@/lib/http";
import { RATE_LIMITS } from "@/lib/rateLimit";
import { parseJobId } from "@/lib/validation";

export const runtime = "nodejs";

/** Polled by the client while a document-digitization job is running. */
export async function GET(request: Request) {
  try {
    enforceRateLimit(request, RATE_LIMITS.poll);
    const jobId = parseJobId(new URL(request.url).searchParams.get("jobId"));
    try {
      const status = await getDocJobStatus(jobId);
      // Provider error text can be technical; the client shows its own message for "Failed".
      return NextResponse.json({ state: status.job_state });
    } catch (err) {
      throw toAppError(err, "OCR_FAILED");
    }
  } catch (err) {
    return errorResponse(err, "parse/status");
  }
}
