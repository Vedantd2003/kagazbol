/**
 * Voice conversation state machine.
 *
 * One explicit state replaces the old mix of `micStatus` / `isSpeaking` / ad-hoc
 * booleans. Every async result carries the `requestId` of the interaction that
 * started it; results for an older id are ignored, so a slow answer or audio clip
 * from a previous question can never start playing over a newer one.
 *
 * The reducer is pure (no browser APIs) and fully unit-tested; the React hook in
 * `src/hooks/useVoiceAssistant.ts` performs the side effects it asks for.
 */

export type VoiceStatus =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "transcribing"
  | "awaiting_confirmation"
  | "processing_question"
  | "generating_audio"
  | "playing_audio"
  | "paused"
  | "error";

export type VoiceErrorKind =
  | "permission_denied"
  | "unsupported_browser"
  | "no_speech"
  | "transcription_failed"
  | "answer_failed"
  | "audio_failed"
  | "network";

export interface VoiceState {
  status: VoiceStatus;
  requestId: number;
  /** What the recogniser heard (editable by the user before sending). */
  transcript: string;
  spokenLanguage: string | null;
  spokenLanguageConfidence: number | null;
  /** True when the transcript should be double-checked (low/unknown confidence). */
  lowConfidence: boolean;
  question: string | null;
  error: { kind: VoiceErrorKind; message: string } | null;
}

export type VoiceEvent =
  | { type: "MIC_PRESSED" }
  | { type: "PERMISSION_GRANTED" }
  | { type: "PERMISSION_DENIED" }
  | { type: "UNSUPPORTED" }
  | { type: "STOP_RECORDING" }
  | { type: "CANCEL" }
  | { type: "TRANSCRIBED"; requestId: number; transcript: string; language: string | null; confidence: number | null }
  | { type: "TRANSCRIBE_FAILED"; requestId: number; message: string; noSpeech?: boolean }
  | { type: "EDIT_TRANSCRIPT"; transcript: string }
  | { type: "CONFIRM" }
  | { type: "ASK_TYPED"; question: string }
  | { type: "ANSWERED"; requestId: number; speak: boolean }
  | { type: "ANSWER_FAILED"; requestId: number; message: string }
  | { type: "AUDIO_READY"; requestId: number }
  | { type: "AUDIO_FAILED"; requestId: number; message: string }
  | { type: "PLAYBACK_STARTED"; requestId: number }
  | { type: "PLAYBACK_PAUSED" }
  | { type: "PLAYBACK_RESUMED" }
  | { type: "PLAYBACK_ENDED" }
  | { type: "STOP_AUDIO" }
  | { type: "DISMISS_ERROR" }
  | { type: "RESET" };

/** Below this STT language probability the transcript is shown as "please check". */
export const LOW_CONFIDENCE = 0.6;

export const initialVoiceState: VoiceState = {
  status: "idle",
  requestId: 0,
  transcript: "",
  spokenLanguage: null,
  spokenLanguageConfidence: null,
  lowConfidence: false,
  question: null,
  error: null,
};

const BUSY: VoiceStatus[] = ["requesting_permission", "recording", "transcribing", "processing_question", "generating_audio"];

export function isBusy(s: VoiceState): boolean {
  return BUSY.includes(s.status);
}

function fresh(s: VoiceState, status: VoiceStatus): VoiceState {
  return { ...initialVoiceState, status, requestId: s.requestId + 1 };
}

export function voiceReducer(s: VoiceState, e: VoiceEvent): VoiceState {
  // Results that belong to an older interaction are dropped.
  if ("requestId" in e && e.requestId !== s.requestId) return s;

  switch (e.type) {
    case "MIC_PRESSED":
      switch (s.status) {
        case "idle":
        case "error":
        case "awaiting_confirmation":
        // Barge-in: pressing the mic during or after playback interrupts it.
        case "playing_audio":
        case "paused":
        case "generating_audio":
        case "processing_question":
          return fresh(s, "requesting_permission");
        case "recording":
          return { ...s, status: "transcribing" };
        default:
          return s; // repeated clicks while requesting permission / transcribing
      }

    case "PERMISSION_GRANTED":
      return s.status === "requesting_permission" ? { ...s, status: "recording" } : s;
    case "PERMISSION_DENIED":
      return s.status === "requesting_permission"
        ? { ...s, status: "error", error: { kind: "permission_denied", message: "Microphone access was blocked." } }
        : s;
    case "UNSUPPORTED":
      return { ...s, status: "error", error: { kind: "unsupported_browser", message: "Voice recording isn't supported in this browser." } };

    case "STOP_RECORDING":
      return s.status === "recording" ? { ...s, status: "transcribing" } : s;

    case "CANCEL":
      // Cancel invalidates every in-flight request for this interaction.
      return fresh(s, "idle");

    case "TRANSCRIBED": {
      if (s.status !== "transcribing") return s;
      const lowConfidence = e.confidence == null ? false : e.confidence < LOW_CONFIDENCE;
      return {
        ...s,
        status: "awaiting_confirmation",
        transcript: e.transcript,
        spokenLanguage: e.language,
        spokenLanguageConfidence: e.confidence,
        lowConfidence,
      };
    }
    case "TRANSCRIBE_FAILED":
      return s.status === "transcribing"
        ? { ...s, status: "error", error: { kind: e.noSpeech ? "no_speech" : "transcription_failed", message: e.message } }
        : s;

    case "EDIT_TRANSCRIPT":
      return s.status === "awaiting_confirmation" ? { ...s, transcript: e.transcript } : s;

    case "CONFIRM":
      if (s.status !== "awaiting_confirmation" || !s.transcript.trim()) return s;
      return { ...s, status: "processing_question", question: s.transcript.trim() };

    case "ASK_TYPED": {
      if (!e.question.trim()) return s;
      const next = fresh(s, "processing_question");
      return { ...next, question: e.question.trim(), transcript: e.question.trim() };
    }

    case "ANSWERED":
      if (s.status !== "processing_question") return s;
      return { ...s, status: e.speak ? "generating_audio" : "idle" };
    case "ANSWER_FAILED":
      return s.status === "processing_question" ? { ...s, status: "error", error: { kind: "answer_failed", message: e.message } } : s;

    case "AUDIO_READY":
      return s.status === "generating_audio" ? { ...s, status: "playing_audio" } : s;
    case "AUDIO_FAILED":
      // The text answer is already on screen; audio failure is non-fatal.
      return s.status === "generating_audio" || s.status === "playing_audio"
        ? { ...s, status: "error", error: { kind: "audio_failed", message: e.message } }
        : s;

    case "PLAYBACK_STARTED":
      return { ...s, status: "playing_audio" };
    case "PLAYBACK_PAUSED":
      return s.status === "playing_audio" ? { ...s, status: "paused" } : s;
    case "PLAYBACK_RESUMED":
      return s.status === "paused" ? { ...s, status: "playing_audio" } : s;
    case "PLAYBACK_ENDED":
    case "STOP_AUDIO":
      return s.status === "playing_audio" || s.status === "paused" || s.status === "generating_audio" ? { ...s, status: "idle" } : s;

    case "DISMISS_ERROR":
      return s.status === "error" ? { ...s, status: "idle", error: null } : s;

    case "RESET":
      return fresh(s, "idle");
  }
}
