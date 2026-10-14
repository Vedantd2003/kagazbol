import type { AppLanguage } from "./sarvam/config";
import type {
  ChatRequest,
  ChatResponse,
  ChatTurn,
  DocumentSummary,
  ParseResultResponse,
  ParseStartResponse,
  ParseStatusResponse,
  SummarizeResponse,
} from "./types";

/** Thrown when the OCR polling loop exceeds its time budget. */
export class PollingTimeoutError extends Error {
  constructor() {
    super("POLLING_TIMEOUT");
    this.name = "PollingTimeoutError";
  }
}

async function asJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Request failed");
  }
  return data as T;
}

/**
 * Uploads the file via XHR so we can report upload progress via onProgress.
 * Accepts an optional AbortSignal to cancel mid-upload.
 */
export function startParse(
  file: File,
  language: AppLanguage,
  opts: { onProgress?: (pct: number) => void; signal?: AbortSignal } = {}
): Promise<ParseStartResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("language", language);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/parse/start");

    if (opts.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          opts.onProgress!(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as ParseStartResponse & { error?: string };
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));

    opts.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    if (opts.signal?.aborted) {
      reject(new DOMException("Upload aborted", "AbortError"));
      return;
    }

    xhr.send(form);
  });
}

export async function getParseStatus(jobId: string): Promise<ParseStatusResponse> {
  const res = await fetch(`/api/parse/status?jobId=${encodeURIComponent(jobId)}`);
  return asJson(res);
}

export async function getParseResult(jobId: string): Promise<ParseResultResponse> {
  const res = await fetch(`/api/parse/result?jobId=${encodeURIComponent(jobId)}`);
  return asJson(res);
}

export async function summarizeDocument(
  ocrText: string,
  language: AppLanguage,
  signal?: AbortSignal
): Promise<SummarizeResponse> {
  const res = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ocrText, language }),
    signal,
  });
  return asJson(res);
}

export async function askQuestion(
  ocrText: string,
  summary: DocumentSummary,
  language: AppLanguage,
  history: ChatTurn[],
  question: string,
  signal?: AbortSignal
): Promise<ChatResponse> {
  const body: ChatRequest = { ocrText, summary, language, history, question };
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  return asJson(res);
}

export async function speakText(
  text: string,
  language: AppLanguage,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
    signal,
  });
  const data = await asJson<{ audioUrl: string }>(res);
  return data.audioUrl;
}

export async function transcribeAudio(blob: Blob, language: AppLanguage = "en-IN"): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "question.webm");
  // Send language hint so Saaras STT can bias toward the correct script
  // (Devanagari for hi-IN / mr-IN) and improve transcription accuracy.
  form.append("language", language);
  const res = await fetch("/api/stt", { method: "POST", body: form });
  const data = await asJson<{ transcript: string }>(res);
  return data.transcript;
}

/**
 * Polls the doc-digitization job with exponential backoff until it reaches
 * a terminal state or the time budget is exhausted.
 *
 * - Accepts an AbortSignal: abort the signal to cancel mid-poll.
 * - Throws PollingTimeoutError on timeout (translate the message in the UI).
 * - Throws DOMException("AbortError") on user-initiated cancel (ignore silently).
 */
export async function waitForParseCompletion(
  jobId: string,
  opts: {
    signal?: AbortSignal;
    onPoll?: (state: ParseStatusResponse["state"]) => void;
    timeoutMs?: number;
  } = {}
): Promise<void> {
  const { signal, onPoll, timeoutMs = 90_000 } = opts;
  const terminal = new Set(["Completed", "PartiallyCompleted", "Failed"]);
  const deadline = Date.now() + timeoutMs;

  let delay = 2_000;
  const maxDelay = 10_000;
  const backoffFactor = 1.5;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new DOMException("Polling aborted", "AbortError");
    }

    const status = await getParseStatus(jobId);
    onPoll?.(status.state);

    if (terminal.has(status.state)) {
      if (status.state === "Failed") {
        throw new Error(status.errorMessage || "Document processing failed");
      }
      return;
    }

    // Wait with exponential backoff; abort the sleep early if signal fires.
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delay);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new DOMException("Polling aborted", "AbortError"));
        },
        { once: true }
      );
    });

    delay = Math.min(delay * backoffFactor, maxDelay);
  }

  throw new PollingTimeoutError();
}
