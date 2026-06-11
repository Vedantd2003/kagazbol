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

async function asJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Request failed");
  }
  return data as T;
}

export async function startParse(file: File, language: AppLanguage): Promise<ParseStartResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("language", language);
  const res = await fetch("/api/parse/start", { method: "POST", body: form });
  return asJson(res);
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
  language: AppLanguage
): Promise<SummarizeResponse> {
  const res = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ocrText, language }),
  });
  return asJson(res);
}

export async function askQuestion(
  ocrText: string,
  summary: DocumentSummary,
  language: AppLanguage,
  history: ChatTurn[],
  question: string
): Promise<ChatResponse> {
  const body: ChatRequest = { ocrText, summary, language, history, question };
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return asJson(res);
}

export async function speakText(text: string, language: AppLanguage): Promise<string> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  const data = await asJson<{ audioUrl: string }>(res);
  return data.audioUrl;
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "question.webm");
  const res = await fetch("/api/stt", { method: "POST", body: form });
  const data = await asJson<{ transcript: string }>(res);
  return data.transcript;
}

/** Polls the doc-digitization job until it reaches a terminal state. */
export async function waitForParseCompletion(
  jobId: string,
  onPoll?: (state: ParseStatusResponse["state"]) => void
): Promise<void> {
  const terminal = new Set(["Completed", "PartiallyCompleted", "Failed"]);
  for (let i = 0; i < 40; i++) {
    const status = await getParseStatus(jobId);
    onPoll?.(status.state);
    if (terminal.has(status.state)) {
      if (status.state === "Failed") {
        throw new Error(status.errorMessage || "Document processing failed");
      }
      return;
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("Document processing timed out");
}
