import type { AppLanguage } from "./languages";
import type { ErrorCode } from "./errors";
import type {
  ChatRequest,
  ChatResponse,
  ChatTurn,
  DetectLanguageResponse,
  DocumentSummary,
  ExplainResponse,
  ParseResultResponse,
  ParseStartResponse,
  ParseStatusResponse,
  SttResponse,
  SummarizeResponse,
} from "./types";

/** Error returned by a KagazBol API route, with the server's stable code. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: ErrorCode | "NETWORK",
    readonly status: number,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function toApiError(status: number, data: unknown): ApiError {
  const d = (data ?? {}) as { error?: unknown; message?: unknown; code?: unknown; retryable?: unknown };
  const message = typeof d.message === "string" ? d.message : typeof d.error === "string" ? d.error : "Request failed";
  return new ApiError(message, (typeof d.code === "string" ? d.code : "INTERNAL") as ErrorCode, status, d.retryable === true);
}

async function request(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Network error", "NETWORK", 0, true);
  }
}

/** Thrown when the OCR polling loop exceeds its time budget. */
export class PollingTimeoutError extends Error {
  constructor() {
    super("POLLING_TIMEOUT");
    this.name = "PollingTimeoutError";
  }
}

async function asJson<T>(res: Response): Promise<T> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON (e.g. proxy error page)
  }
  if (!res.ok) throw toApiError(res.status, data);
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
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // fall through
      }
      if (xhr.status >= 200 && xhr.status < 300 && data) resolve(data as ParseStartResponse);
      else reject(toApiError(xhr.status, data));
    };
    xhr.onerror = () => reject(new ApiError("Network error during upload", "NETWORK", 0, true));
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));

    opts.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    if (opts.signal?.aborted) {
      reject(new DOMException("Upload aborted", "AbortError"));
      return;
    }

    xhr.send(form);
  });
}

export async function getParseStatus(jobId: string, signal?: AbortSignal): Promise<ParseStatusResponse> {
  const res = await request(`/api/parse/status?jobId=${encodeURIComponent(jobId)}`, { signal });
  return asJson(res);
}

export async function getParseResult(jobId: string, signal?: AbortSignal): Promise<ParseResultResponse> {
  const res = await request(`/api/parse/result?jobId=${encodeURIComponent(jobId)}`, { signal });
  return asJson(res);
}

export async function summarizeDocument(
  ocrText: string,
  language: AppLanguage,
  signal?: AbortSignal
): Promise<SummarizeResponse> {
  const res = await request("/api/summarize", {
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
  const res = await request("/api/chat", {
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
  const res = await request("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
    signal,
  });
  const data = await asJson<{ audioUrl: string }>(res);
  return data.audioUrl;
}

export async function transcribeAudio(blob: Blob, signal?: AbortSignal): Promise<SttResponse> {
  const form = new FormData();
  form.append("audio", blob, "question.webm");
  const res = await request("/api/stt", { method: "POST", body: form, signal });
  return asJson<SttResponse>(res);
}

export async function detectDocumentLanguage(text: string, signal?: AbortSignal): Promise<DetectLanguageResponse> {
  const res = await request("/api/detect-language", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, 20_000) }),
    signal,
  });
  return asJson(res);
}

export async function explainSimply(
  text: string,
  context: string | null,
  language: AppLanguage,
  withExample: boolean,
  signal?: AbortSignal
): Promise<ExplainResponse> {
  const res = await request("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, context, language, withExample }),
    signal,
  });
  return asJson(res);
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

    const status = await getParseStatus(jobId, signal);
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
