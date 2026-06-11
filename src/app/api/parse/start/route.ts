import { NextResponse } from "next/server";
import {
  createDocJob,
  getUploadUrl,
  uploadFileToUrl,
  startDocJob,
} from "@/lib/sarvam/docIntelligence";
import { DOC_INTELLIGENCE_LANGUAGE, type AppLanguage } from "@/lib/sarvam/config";
import { SarvamApiError } from "@/lib/sarvam/client";

export const runtime = "nodejs";

/**
 * Kicks off an async document-digitization job for an uploaded image:
 * create job -> get presigned upload URL -> upload bytes -> start job.
 * Returns the job ID for the client to poll via /api/parse/status.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const language = (form.get("language") as AppLanguage | null) ?? "en-IN";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    const docLanguage = DOC_INTELLIGENCE_LANGUAGE[language] ?? "en-IN";
    const jobId = await createDocJob(docLanguage);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const filename = `document.${ext}`;

    const uploadUrl = await getUploadUrl(jobId, filename);
    const bytes = Buffer.from(await file.arrayBuffer());
    await uploadFileToUrl(uploadUrl, bytes, file.type || "image/jpeg");
    await startDocJob(jobId);

    return NextResponse.json({ jobId });
  } catch (err) {
    if (err instanceof SarvamApiError) {
      return NextResponse.json(
        { error: "Document parsing failed to start. Please try again." },
        { status: 502 }
      );
    }
    console.error("parse/start error", err);
    return NextResponse.json({ error: "Something went wrong starting document parsing." }, { status: 500 });
  }
}
