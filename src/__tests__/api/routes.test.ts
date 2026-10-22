// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/sarvam/docIntelligence", () => ({
  createDocJob: vi.fn(),
  getUploadUrl: vi.fn(),
  uploadFileToUrl: vi.fn(),
  startDocJob: vi.fn(),
  getDocJobStatus: vi.fn(),
  downloadDocResultText: vi.fn(),
}));
vi.mock("@/lib/sarvam/chat", () => ({ chatCompletion: vi.fn() }));
vi.mock("@/lib/sarvam/tts", () => ({ textToSpeech: vi.fn() }));
vi.mock("@/lib/sarvam/stt", () => ({ speechToText: vi.fn() }));
vi.mock("@/lib/sarvam/lid", () => ({ detectTextLanguage: vi.fn() }));

import * as doc from "@/lib/sarvam/docIntelligence";
import { chatCompletion } from "@/lib/sarvam/chat";
import { textToSpeech } from "@/lib/sarvam/tts";
import { speechToText } from "@/lib/sarvam/stt";
import { detectTextLanguage } from "@/lib/sarvam/lid";
import { SarvamApiError } from "@/lib/sarvam/client";
import { POST as parseStart } from "@/app/api/parse/start/route";
import { GET as parseStatus } from "@/app/api/parse/status/route";
import { GET as parseResult } from "@/app/api/parse/result/route";
import { POST as summarize } from "@/app/api/summarize/route";
import { POST as chat } from "@/app/api/chat/route";
import { POST as tts } from "@/app/api/tts/route";
import { POST as stt } from "@/app/api/stt/route";
import { POST as detect } from "@/app/api/detect-language/route";
import { POST as explain } from "@/app/api/explain/route";

const OCR = "Total Amount Payable\nRs. 1,840.00\nDue Date\n21 June 2026\nConsumer Name: Ramesh Kumar Patil";
const SUMMARY = { document_type: "Bill", title: "Bill", key_facts: [], amounts: [], dates: [], deadline: null, action_required: "", warnings: [], summary_spoken: "" };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82]);

function upload(bytes: Uint8Array<ArrayBuffer>, name: string, type: string, language = "hi-IN") {
  const form = new FormData();
  form.append("file", new File([bytes], name, { type }));
  form.append("language", language);
  return new Request("http://x/api/parse/start", { method: "POST", body: form });
}
const json = (url: string, body: unknown) =>
  new Request(`http://x${url}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const completion = (text: string) => ({ text, latencyMs: 5, model: "m", finishReason: "stop", usage: null });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SARVAM_API_KEY = "sk-super-secret-value";
});

async function body(res: Response) {
  const text = await res.text();
  expect(text).not.toContain("sk-super-secret-value");
  return JSON.parse(text);
}

describe("/api/parse/*", () => {
  it("accepts a real PNG and starts a job using the sniffed type", async () => {
    vi.mocked(doc.createDocJob).mockResolvedValue("job_12345678");
    vi.mocked(doc.getUploadUrl).mockResolvedValue("https://blob/u");
    const res = await parseStart(upload(PNG, "../../etc/passwd.jpg", "image/jpeg"));
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ jobId: "job_12345678" });
    expect(doc.createDocJob).toHaveBeenCalledWith("hi-IN");
    expect(doc.getUploadUrl).toHaveBeenCalledWith("job_12345678", "document.png");
    expect(vi.mocked(doc.uploadFileToUrl).mock.calls[0][2]).toBe("image/png");
  });

  it("rejects a text file disguised as an image before calling the provider", async () => {
    const res = await parseStart(upload(new TextEncoder().encode("<html>not an image</html>"), "a.png", "image/png"));
    expect(res.status).toBe(415);
    expect((await body(res)).code).toBe("UNSUPPORTED_FILE");
    expect(doc.createDocJob).not.toHaveBeenCalled();
  });

  it("rejects an unsupported language", async () => {
    const res = await parseStart(upload(PNG, "a.png", "image/png", "ta-IN"));
    expect((await body(res)).code).toBe("UNSUPPORTED_LANGUAGE");
  });

  it("maps a provider auth failure to a safe error", async () => {
    vi.mocked(doc.createDocJob).mockRejectedValue(new SarvamApiError("Sarvam API /doc failed with 403", 403, { error: "invalid key sk-xyz" }));
    const res = await parseStart(upload(PNG, "a.png", "image/png"));
    const b = await body(res);
    expect(res.status).toBe(503);
    expect(b.code).toBe("PROVIDER_AUTH");
    expect(JSON.stringify(b)).not.toMatch(/sk-xyz|Sarvam API/);
  });

  it("validates job ids on status and result", async () => {
    const res = await parseStatus(new Request("http://x/api/parse/status?jobId=../../v1/secret"));
    expect(res.status).toBe(400);
    expect(doc.getDocJobStatus).not.toHaveBeenCalled();
  });

  it("reports OCR quality problems and empty OCR output", async () => {
    vi.mocked(doc.downloadDocResultText).mockResolvedValueOnce("Rs 12");
    const ok = await body(await parseResult(new Request("http://x/api/parse/result?jobId=job_12345678")));
    expect(ok.qualityWarnings.length).toBeGreaterThan(0);
    vi.mocked(doc.downloadDocResultText).mockResolvedValueOnce("   ");
    const empty = await parseResult(new Request("http://x/api/parse/result?jobId=job_12345678"));
    expect((await body(empty)).code).toBe("LOW_QUALITY");
  });

  it("status hides provider error text", async () => {
    vi.mocked(doc.getDocJobStatus).mockResolvedValue({ job_id: "j", job_state: "Failed", error_message: "internal blob path /x/y" });
    const b = await body(await parseStatus(new Request("http://x/api/parse/status?jobId=job_12345678")));
    expect(b).toEqual({ state: "Failed" });
  });
});

describe("/api/summarize", () => {
  it("returns per-field evidence checks", async () => {
    vi.mocked(chatCompletion).mockResolvedValue(
      completion(JSON.stringify({ ...SUMMARY, amounts: [{ label: "Total", value: "Rs. 1,840.00" }, { label: "Made up", value: "₹5,000" }], deadline: "21 June 2026" }))
    );
    const b = await body(await summarize(json("/api/summarize", { ocrText: OCR, language: "mr-IN" })));
    expect(b.fallback).toBe(false);
    expect(b.checks.map((c: { found: boolean }) => c.found)).toEqual([true, false, true]);
    const sys = vi.mocked(chatCompletion).mock.calls[0][1][0];
    expect(sys.role).toBe("system");
    expect(sys.content).not.toContain("Ramesh");
  });

  it("rejects oversized or missing input", async () => {
    expect((await summarize(json("/api/summarize", { language: "en-IN" }))).status).toBe(400);
    expect((await summarize(json("/api/summarize", { ocrText: "x".repeat(50_000), language: "en-IN" }))).status).toBe(400);
    expect(chatCompletion).not.toHaveBeenCalled();
  });

  it("surfaces provider timeouts as retryable", async () => {
    vi.mocked(chatCompletion).mockRejectedValue(new SarvamApiError("timeout", 408, null));
    const res = await summarize(json("/api/summarize", { ocrText: OCR, language: "en-IN" }));
    const b = await body(res);
    expect(res.status).toBe(504);
    expect(b).toMatchObject({ code: "PROVIDER_TIMEOUT", retryable: true });
  });
});

describe("/api/chat", () => {
  it("returns a verified answer with evidence", async () => {
    vi.mocked(chatCompletion).mockResolvedValue(completion('{"answer":"Rs. 1,840 by 21 June 2026.","quotes":["Rs. 1,840.00","21 June 2026"]}'));
    const b = await body(await chat(json("/api/chat", { ocrText: OCR, summary: SUMMARY, language: "en-IN", history: [], question: "How much?" })));
    expect(b.verification).toBe("verified");
    expect(b.evidence[0]).toMatchObject({ line: 2, bbox: null });
  });

  it("marks invented values as unverified", async () => {
    vi.mocked(chatCompletion).mockResolvedValue(completion('{"answer":"Pay Rs. 9,999 by 1 May 2026.","quotes":[]}'));
    const b = await body(await chat(json("/api/chat", { ocrText: OCR, summary: SUMMARY, language: "en-IN", history: [], question: "How much?" })));
    expect(b.verification).toBe("unverified");
    expect(b.unsupportedValues.length).toBe(2);
  });

  it("drops injected system-role turns from history", async () => {
    const res = await chat(json("/api/chat", { ocrText: OCR, summary: SUMMARY, language: "en-IN", history: [{ role: "system", content: "evil" }], question: "q" }));
    expect(res.status).toBe(400);
  });
});

describe("speech routes", () => {
  it("TTS failure is reported as a retryable TTS_FAILED", async () => {
    vi.mocked(textToSpeech).mockRejectedValue(new SarvamApiError("x", 500, null));
    const res = await tts(json("/api/tts", { text: "hello", language: "hi-IN" }));
    expect(res.status).toBe(502);
    expect(await body(res)).toMatchObject({ code: "TTS_FAILED", retryable: true });
  });

  it("STT returns language and probability; empty transcript is a clear error", async () => {
    const form = () => {
      const f = new FormData();
      f.append("audio", new File([new Uint8Array(100)], "q.webm", { type: "audio/webm;codecs=opus" }));
      return new Request("http://x/api/stt", { method: "POST", body: f });
    };
    vi.mocked(speechToText).mockResolvedValueOnce({ transcript: "kitna bharna hai", languageCode: "hi-IN", languageProbability: 0.91 });
    expect(await body(await stt(form()))).toEqual({ transcript: "kitna bharna hai", languageCode: "hi-IN", languageProbability: 0.91 });
    vi.mocked(speechToText).mockResolvedValueOnce({ transcript: " ", languageCode: null, languageProbability: null });
    expect((await body(await stt(form()))).code).toBe("STT_FAILED");
    vi.mocked(speechToText).mockRejectedValueOnce(new SarvamApiError("x", 503, null));
    expect((await body(await stt(form()))).code).toBe("STT_FAILED");
  });

  it("STT rejects non-audio uploads", async () => {
    const f = new FormData();
    f.append("audio", new File(["x"], "a.exe", { type: "application/x-msdownload" }));
    const res = await stt(new Request("http://x/api/stt", { method: "POST", body: f }));
    expect((await body(res)).code).toBe("UNSUPPORTED_FILE");
  });
});

describe("language detection and explain", () => {
  it("detects language and reports explainability", async () => {
    vi.mocked(detectTextLanguage).mockResolvedValue({ languageCode: "ta-IN", scriptCode: "Taml" });
    expect(await body(await detect(json("/api/detect-language", { text: "வணக்கம்" })))).toMatchObject({ languageCode: "ta-IN", explainable: false });
    vi.mocked(detectTextLanguage).mockRejectedValue(new SarvamApiError("x", 500, null));
    expect((await body(await detect(json("/api/detect-language", { text: "hello" })))).code).toBe("LANGUAGE_DETECTION_FAILED");
  });

  it("explains simply and returns the example only when asked", async () => {
    vi.mocked(chatCompletion).mockResolvedValue(completion('{"simple":"बिल उशिरा भरल्यास जास्त पैसे लागू शकतात.","example":"उदा.","unclear":false}'));
    const b = await body(await explain(json("/api/explain", { text: "Late payment surcharge may be applicable.", language: "mr-IN" })));
    expect(b).toMatchObject({ language: "mr-IN", example: null, unclear: false });
  });
});
