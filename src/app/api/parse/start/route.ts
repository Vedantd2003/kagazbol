import { NextResponse } from "next/server";
import { createDocJob, getUploadUrl, uploadFileToUrl, startDocJob } from "@/lib/sarvam/docIntelligence";
import { DOC_INTELLIGENCE_LANGUAGE } from "@/lib/sarvam/config";
import { toAppError } from "@/lib/sarvam/client";
import { AppError } from "@/lib/errors";
import { enforceRateLimit, errorResponse } from "@/lib/http";
import { RATE_LIMITS } from "@/lib/rateLimit";
import { parseLanguage, validateUpload, SNIFFED_EXTENSION, MAX_UPLOAD_BYTES } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Kicks off an async document-digitization job for an uploaded image:
 * validate (magic bytes, size) → create job → presigned upload → start job.
 * None of the provider calls here are retried: each creates billable state.
 */
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, RATE_LIMITS.upload);
    const len = Number(request.headers.get("content-length") ?? "0");
    if (len > MAX_UPLOAD_BYTES + 64 * 1024) throw new AppError("FILE_TOO_LARGE");

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new AppError("BAD_REQUEST", "Expected a file upload.");
    }
    const language = parseLanguage(form.get("language"), "en-IN");
    const { bytes, type } = await validateUpload(form.get("file"));

    // The filename sent upstream is derived from the sniffed type, never the user's name.
    const filename = `document.${SNIFFED_EXTENSION[type]}`;
    try {
      const jobId = await createDocJob(DOC_INTELLIGENCE_LANGUAGE[language]);
      const uploadUrl = await getUploadUrl(jobId, filename);
      await uploadFileToUrl(uploadUrl, bytes, type);
      await startDocJob(jobId);
      return NextResponse.json({ jobId });
    } catch (err) {
      throw toAppError(err, "OCR_FAILED");
    }
  } catch (err) {
    return errorResponse(err, "parse/start");
  }
}
