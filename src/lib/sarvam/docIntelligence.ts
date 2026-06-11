import JSZip from "jszip";
import { sarvamFetch } from "./client";

export type DocJobState =
  | "Accepted"
  | "Pending"
  | "Running"
  | "Completed"
  | "PartiallyCompleted"
  | "Failed";

interface CreateJobResponse {
  job_id: string;
  job_state: DocJobState;
}

interface UploadLinksResponse {
  job_id: string;
  job_state: DocJobState;
  upload_urls: Record<string, { file_url: string }>;
}

interface JobStatusResponse {
  job_id: string;
  job_state: DocJobState;
  job_details?: { state: string; error_message?: string }[];
  error_message?: string;
}

interface DownloadLinksResponse {
  job_id: string;
  job_state: DocJobState;
  download_urls: Record<string, { file_url: string; file_metadata?: { contentType?: string } }>;
}

/**
 * Step 1: create an async document-digitization job for the given language.
 * We always request markdown output; the API also includes JSON page data.
 */
export async function createDocJob(language: string): Promise<string> {
  const res = await sarvamFetch("/doc-digitization/job/v1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_parameters: { language, output_format: "md" },
    }),
  });
  const data = (await res.json()) as CreateJobResponse;
  return data.job_id;
}

/**
 * Step 2: register the file we're about to upload and get back a presigned
 * URL to PUT the bytes to.
 */
export async function getUploadUrl(jobId: string, filename: string): Promise<string> {
  const res = await sarvamFetch("/doc-digitization/job/v1/upload-files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, files: [filename] }),
  });
  const data = (await res.json()) as UploadLinksResponse;
  const entry = data.upload_urls?.[filename];
  if (!entry?.file_url) {
    throw new Error(`No upload URL returned for ${filename}`);
  }
  return entry.file_url;
}

/**
 * Step 3: PUT the raw file bytes to the presigned storage URL. This goes
 * directly to cloud storage, not through Sarvam's API host.
 */
export async function uploadFileToUrl(
  uploadUrl: string,
  bytes: Buffer,
  contentType: string
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    // The presigned URL is an Azure Blob SAS URL, which requires this header
    // on PUT requests even though it's not part of the Sarvam API itself.
    headers: { "Content-Type": contentType, "x-ms-blob-type": "BlockBlob" },
    body: new Uint8Array(bytes),
  });
  if (!res.ok) {
    throw new Error(`Failed to upload document to storage (${res.status})`);
  }
}

/** Step 4: kick off processing once the file has been uploaded. */
export async function startDocJob(jobId: string): Promise<DocJobState> {
  const res = await sarvamFetch(`/doc-digitization/job/v1/${jobId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = (await res.json()) as CreateJobResponse;
  return data.job_state;
}

/** Step 5: poll job status. Caller decides how often / how long to poll. */
export async function getDocJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await sarvamFetch(`/doc-digitization/job/v1/${jobId}/status`, {
    method: "GET",
  });
  return (await res.json()) as JobStatusResponse;
}

/**
 * Step 6+7: once Completed/PartiallyCompleted, fetch the presigned download
 * URL(s), download the output zip, and extract the combined markdown text.
 */
export async function downloadDocResultText(jobId: string): Promise<string> {
  const res = await sarvamFetch(`/doc-digitization/job/v1/${jobId}/download-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = (await res.json()) as DownloadLinksResponse;

  const entries = Object.entries(data.download_urls ?? {});
  if (entries.length === 0) {
    throw new Error("Document processing produced no output files");
  }

  let combined = "";
  for (const [filename, { file_url }] of entries) {
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) continue;

    const buf = Buffer.from(await fileRes.arrayBuffer());

    // The download URL is a presigned Azure Blob URL with a query string
    // (e.g. "...document.zip?se=...&sig=..."), so check the filename from
    // download_urls (the dict key), not the URL itself, for the extension.
    if (filename.endsWith(".zip")) {
      const zip = await JSZip.loadAsync(buf);
      for (const name of Object.keys(zip.files)) {
        if (name.endsWith(".md") || name.endsWith(".txt")) {
          combined += (await zip.files[name].async("string")) + "\n\n";
        }
      }
    } else {
      combined += buf.toString("utf-8") + "\n\n";
    }
  }

  return combined.trim();
}
