import { NextResponse } from "next/server";
import { downloadDocResultText } from "@/lib/sarvam/docIntelligence";
import { toAppError } from "@/lib/sarvam/client";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, errorResponse } from "@/lib/http";
import { RATE_LIMITS } from "@/lib/rateLimit";
import { parseJobId } from "@/lib/validation";
import { assessOcrText, QUALITY_HINTS } from "@/lib/quality";

export const runtime = "nodejs";

/** Called once a job is Completed/PartiallyCompleted to fetch the OCR text. */
export async function GET(request: Request) {
  try {
    enforceRateLimit(request, RATE_LIMITS.poll);
    const jobId = parseJobId(new URL(request.url).searchParams.get("jobId"));
    let ocrText: string;
    try {
      ocrText = await downloadDocResultText(jobId);
    } catch (err) {
      throw toAppError(err, "OCR_FAILED");
    }
    const quality = assessOcrText(ocrText);
    if (quality.issues.includes("empty_text")) throw new AppError("LOW_QUALITY");
    return NextResponse.json({ ocrText, qualityIssues: quality.issues, qualityWarnings: quality.issues.map((i) => QUALITY_HINTS[i]) });
  } catch (err) {
    return errorResponse(err, "parse/result");
  }
}
