import { NextResponse } from "next/server";
import { downloadDocResultText } from "@/lib/sarvam/docIntelligence";
import { SarvamApiError } from "@/lib/sarvam/client";

export const runtime = "nodejs";

/** Called once a job's status is Completed/PartiallyCompleted to fetch OCR text. */
export async function GET(request: Request) {
  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    const ocrText = await downloadDocResultText(jobId);
    if (!ocrText) {
      return NextResponse.json(
        { error: "We couldn't read any text from this document. Try a clearer photo." },
        { status: 422 }
      );
    }
    return NextResponse.json({ ocrText });
  } catch (err) {
    if (err instanceof SarvamApiError) {
      return NextResponse.json({ error: "Could not download document results." }, { status: 502 });
    }
    console.error("parse/result error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
