import type { AppLanguage } from "./sarvam/config";

export interface DocumentSummary {
  document_type: string;
  title: string;
  key_facts: string[];
  amounts: { label: string; value: string }[];
  dates: { label: string; value: string }[];
  deadline: string | null;
  action_required: string;
  summary_spoken: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ParseStartResponse {
  jobId: string;
}

export interface ParseStatusResponse {
  state: "Accepted" | "Pending" | "Running" | "Completed" | "PartiallyCompleted" | "Failed";
  errorMessage?: string;
}

export interface ParseResultResponse {
  ocrText: string;
}

export interface SummarizeRequest {
  ocrText: string;
  language: AppLanguage;
}

export interface SummarizeResponse {
  summary: DocumentSummary;
  latencyMs: number;
  model: string;
}

export interface ChatRequest {
  ocrText: string;
  summary: DocumentSummary;
  language: AppLanguage;
  history: ChatTurn[];
  question: string;
}

export interface ChatResponse {
  answer: string;
  latencyMs: number;
  model: string;
}
