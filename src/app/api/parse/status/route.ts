import { NextResponse } from "next/server";
import { getDocJobStatus } from "@/lib/sarvam/docIntelligence";
import { SarvamApiError } from "@/lib/sarvam/client";

export const runtime = "nodejs";

/** Polled by the client while a document-digitization job is running. */
export async function GET(request: Request) {
  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    const status = await getDocJobStatus(jobId);
    return NextResponse.json({
      state: status.job_state,
      errorMessage: status.error_message || status.job_details?.[0]?.error_message,
    });
  } catch (err) {
    if (err instanceof SarvamApiError) {
      return NextResponse.json({ error: "Could not check document status." }, { status: 502 });
    }
    console.error("parse/status error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
