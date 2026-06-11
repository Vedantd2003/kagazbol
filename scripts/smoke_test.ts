/**
 * Smoke test for all four Sarvam capabilities used by KagazBol.
 *
 * Usage:
 *   1. Put your key in .env as SARVAM_API_KEY=...
 *   2. npx tsx scripts/smoke_test.ts
 *
 * This script is intentionally self-contained (no imports from src/) so it
 * can be run standalone before the app is wired up, and so it keeps working
 * as a quick "is the API up and are my assumptions right" check.
 */
import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

config();

const API_BASE = "https://api.sarvam.ai";
const API_KEY = process.env.SARVAM_API_KEY;

if (!API_KEY) {
  console.error("Missing SARVAM_API_KEY in .env. Copy .env.example to .env and add your key.");
  process.exit(1);
}

function headers(extra: Record<string, string> = {}) {
  return { "api-subscription-key": API_KEY as string, ...extra };
}

async function testChat(model: string, label: string) {
  console.log(`\n--- Chat completion (${label}: ${model}) ---`);
  const start = Date.now();
  const res = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply with exactly one short sentence: what is the capital of India?" }],
      // sarvam-105b/30b are reasoning models: some of the token budget goes to
      // a hidden reasoning_content field before the final "content" appears.
      // reasoning_effort "low" keeps that step short (see src/lib/sarvam/chat.ts),
      // but 105B's reasoning length is still highly variable, so give it room.
      max_tokens: 4096,
      reasoning_effort: "low",
    }),
  });
  const data = (await res.json()) as {
    choices?: { finish_reason: string; message: { content: string | null } }[];
    usage?: { completion_tokens: number };
  };
  console.log(`status=${res.status} latency=${Date.now() - start}ms`);
  console.log(`finish_reason=${data.choices?.[0]?.finish_reason} completion_tokens=${data.usage?.completion_tokens}`);
  console.log(`content=${data.choices?.[0]?.message?.content}`);
}

async function testTts(): Promise<string | null> {
  console.log("\n--- Text-to-Speech (Bulbul) ---");
  const start = Date.now();
  const res = await fetch(`${API_BASE}/text-to-speech`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      text: "Yeh aapka MSEB bijli ka bill hai. Ek hazaar aath sau bharna hai.",
      target_language_code: "hi-IN",
      model: "bulbul:v3",
      speaker: "priya",
    }),
  });
  console.log(`status=${res.status} latency=${Date.now() - start}ms`);
  if (!res.ok) {
    console.log(await res.text());
    return null;
  }
  const data = (await res.json()) as { audios?: string[] };
  const b64 = data.audios?.[0];
  console.log(`got audio: ${b64 ? `${b64.length} base64 chars` : "none"}`);
  return b64 ?? null;
}

async function testStt(audioBase64: string | null) {
  console.log("\n--- Speech-to-Text (Saaras) ---");
  if (!audioBase64) {
    console.log("Skipped (no audio from TTS step).");
    return;
  }
  const buf = Buffer.from(audioBase64, "base64");
  const form = new FormData();
  form.append("file", new Blob([buf], { type: "audio/wav" }), "test.wav");
  form.append("model", "saaras:v3");
  form.append("mode", "codemix");

  const start = Date.now();
  const res = await fetch(`${API_BASE}/speech-to-text`, {
    method: "POST",
    headers: headers(),
    body: form,
  });
  const text = await res.text();
  console.log(`status=${res.status} latency=${Date.now() - start}ms`);
  console.log(text.slice(0, 500));
}

async function testDocIntelligence() {
  console.log("\n--- Document Intelligence (Sarvam Vision) ---");
  const samplePath = join(process.cwd(), "public", "samples", "electricity-bill.png");
  if (!existsSync(samplePath)) {
    console.log(`Skipped: no sample image at ${samplePath}.`);
    return;
  }

  const createRes = await fetch(`${API_BASE}/doc-digitization/job/v1`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ job_parameters: { language: "en-IN", output_format: "md" } }),
  });
  console.log(`create job status=${createRes.status}`);
  const createData = (await createRes.json()) as { job_id?: string };
  if (!createData.job_id) {
    console.log(JSON.stringify(createData).slice(0, 500));
    return;
  }
  const jobId = createData.job_id;
  console.log(`job_id=${jobId}`);

  const filename = "document.png";
  const uploadLinksRes = await fetch(`${API_BASE}/doc-digitization/job/v1/upload-files`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ job_id: jobId, files: [filename] }),
  });
  const uploadLinksData = (await uploadLinksRes.json()) as {
    upload_urls?: Record<string, { file_url: string }>;
  };
  const uploadUrl = uploadLinksData.upload_urls?.[filename]?.file_url;
  console.log(`upload-files status=${uploadLinksRes.status} got_url=${!!uploadUrl}`);
  if (!uploadUrl) {
    console.log(JSON.stringify(uploadLinksData).slice(0, 500));
    return;
  }

  const fileBytes = readFileSync(samplePath);
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    // Azure Blob SAS URL requires this header on PUT, even though it's not
    // part of the Sarvam API itself.
    headers: { "Content-Type": "image/png", "x-ms-blob-type": "BlockBlob" },
    body: fileBytes,
  });
  console.log(`upload PUT status=${putRes.status}`);

  const startRes = await fetch(`${API_BASE}/doc-digitization/job/v1/${jobId}/start`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });
  console.log(`start status=${startRes.status}`);

  let state = "Accepted";
  for (let i = 0; i < 20 && !["Completed", "PartiallyCompleted", "Failed"].includes(state); i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`${API_BASE}/doc-digitization/job/v1/${jobId}/status`, {
      headers: headers(),
    });
    const statusData = (await statusRes.json()) as { job_state?: string };
    state = statusData.job_state ?? state;
    console.log(`poll ${i + 1}: state=${state}`);
  }

  if (state === "Completed" || state === "PartiallyCompleted") {
    const dlRes = await fetch(`${API_BASE}/doc-digitization/job/v1/${jobId}/download-files`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({}),
    });
    const dlData = (await dlRes.json()) as { download_urls?: Record<string, unknown> };
    console.log(`download-files status=${dlRes.status} files=${Object.keys(dlData.download_urls ?? {}).join(", ")}`);
  }
}

async function main() {
  await testChat("sarvam-105b", "flagship");
  await testChat("sarvam-30b", "conversational");
  const audio = await testTts();
  await testStt(audio);
  await testDocIntelligence();
  console.log(
    "\nDone. Review status codes/output above against src/lib/sarvam/* before relying on them.\n" +
      'Note: sarvam-105b/30b are reasoning models with variable-length hidden reasoning. ' +
      'Occasionally a chat test above may show finish_reason=length and content=null even ' +
      "at max_tokens=4096 with reasoning_effort=low - that's the live model, not a bug here. " +
      "The app's API routes handle this (parseSummaryResponse falls back gracefully, " +
      "/api/chat returns a 502 if the answer is empty so the UI can show an error and retry)."
  );
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
