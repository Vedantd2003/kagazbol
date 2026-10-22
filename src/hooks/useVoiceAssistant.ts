"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ApiError, askQuestion, transcribeAudio } from "@/lib/apiClient";
import { initialVoiceState, isBusy, voiceReducer } from "@/lib/voice/machine";
import { isAppLanguage, normalizeLanguageCode, resolveResponseLanguage, type AppLanguage } from "@/lib/languages";
import type { ChatResponse, ChatTurn, DocumentSummary } from "@/lib/types";
import type { UiStrings } from "@/lib/i18n";
import { useAudioRecorder } from "./useAudioRecorder";
import type { AudioApi } from "./useAudio";

export interface Turn {
  id: number;
  question: string;
  language: AppLanguage;
  answer: ChatResponse | null;
  error: string | null;
  viaVoice: boolean;
}

interface Options {
  docId: number;
  ocrText: string | null;
  summary: DocumentSummary | null;
  language: AppLanguage;
  voiceEnabled: boolean;
  autoPlay: boolean;
  audio: AudioApi;
  t: UiStrings;
}

/**
 * Side-effect layer for the voice state machine: microphone, transcription,
 * grounded answering and speech. All async work is tagged with the machine's
 * requestId and dropped if a newer interaction has started.
 */
export function useVoiceAssistant(o: Options) {
  const [state, dispatch] = useReducer(voiceReducer, initialVoiceState);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [languageSuggestion, setLanguageSuggestion] = useState<AppLanguage | null>(null);
  const stateRef = useRef(state);
  const abortRef = useRef<AbortController | null>(null);
  const turnIdRef = useRef(0);
  const optsRef = useRef(o);
  const turnsRef = useRef<Turn[]>([]);
  useEffect(() => {
    stateRef.current = state;
    optsRef.current = o;
    turnsRef.current = turns;
  });

  const stopRecordingRef = useRef<() => void>(() => undefined);
  const recorder = useAudioRecorder(() => stopRecordingRef.current());

  // Switching documents cancels everything in flight and clears the conversation.
  useEffect(() => {
    abortRef.current?.abort();
    recorder.cancel();
    dispatch({ type: "RESET" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- conversation belongs to one document
    setTurns([]);
    setLanguageSuggestion(null);
  }, [o.docId, recorder]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep the machine in sync with the audio element.
  const audioStatus = o.audio.snapshot.status;
  useEffect(() => {
    const s = stateRef.current.status;
    if (audioStatus === "playing" && (s === "paused" || s === "generating_audio")) dispatch(s === "paused" ? { type: "PLAYBACK_RESUMED" } : { type: "PLAYBACK_STARTED", requestId: stateRef.current.requestId });
    if (audioStatus === "paused" && s === "playing_audio") dispatch({ type: "PLAYBACK_PAUSED" });
    if ((audioStatus === "ended" || audioStatus === "ready") && (s === "playing_audio" || s === "paused")) dispatch({ type: "PLAYBACK_ENDED" });
  }, [audioStatus]);

  const answer = useCallback(async (question: string, requestId: number, viaVoice: boolean) => {
    const { ocrText, summary, language, voiceEnabled, autoPlay, audio, t } = optsRef.current;
    if (!ocrText || !summary) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const id = ++turnIdRef.current;
    const history: ChatTurn[] = turnsRef.current
      .filter((x) => x.answer)
      .flatMap((x) => [
        { role: "user" as const, content: x.question },
        { role: "assistant" as const, content: x.answer!.answer },
      ]);
    setTurns((ts) => [...ts, { id, question, language, answer: null, error: null, viaVoice }]);
    try {
      const res = await askQuestion(ocrText, summary, language, history.slice(-8), question, ac.signal);
      if (stateRef.current.requestId !== requestId) return;
      setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, answer: res } : x)));
      const speak = voiceEnabled && autoPlay;
      dispatch({ type: "ANSWERED", requestId, speak });
      if (!speak) return;
      const result = await audio.speak(res.answer, language, { autoplay: true, key: `turn-${id}` });
      if (stateRef.current.requestId !== requestId) return;
      if (result === "playing") dispatch({ type: "AUDIO_READY", requestId });
      else if (result === "blocked" || result === "loaded") dispatch({ type: "STOP_AUDIO" });
      else if (result === "failed") dispatch({ type: "AUDIO_FAILED", requestId, message: t.audioFailed });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof ApiError && err.code === "NETWORK" ? t.errorNetwork : language === "en-IN" && err instanceof ApiError ? err.message : t.errorGeneric;
      setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, error: msg } : x)));
      if (stateRef.current.requestId === requestId) dispatch({ type: "ANSWER_FAILED", requestId, message: msg });
    }
  }, []);

  const finishRecording = useCallback(async () => {
    if (stateRef.current.status !== "recording") return;
    dispatch({ type: "STOP_RECORDING" });
    const requestId = stateRef.current.requestId;
    const { t, language } = optsRef.current;
    const blob = await recorder.stop();
    if (!blob) {
      dispatch({ type: "TRANSCRIBE_FAILED", requestId, message: t.noSpeech, noSpeech: true });
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const r = await transcribeAudio(blob, ac.signal);
      dispatch({ type: "TRANSCRIBED", requestId, transcript: r.transcript, language: r.languageCode, confidence: r.languageProbability });
      const spoken = normalizeLanguageCode(r.languageCode);
      const decision = resolveResponseLanguage({ detected: spoken, detectedConfidence: r.languageProbability, preferred: language });
      // Never switch silently: offer the spoken language as a one-tap choice.
      setLanguageSuggestion(spoken && isAppLanguage(spoken) && spoken !== language && (decision.reason === "detected" || decision.needsConfirmation) ? spoken : null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const noSpeech = err instanceof ApiError && err.code === "STT_FAILED" && err.status === 502 && /hear/i.test(err.message);
      dispatch({ type: "TRANSCRIBE_FAILED", requestId, message: noSpeech ? t.noSpeech : t.errorGeneric, noSpeech });
    }
  }, [recorder]);

  useEffect(() => {
    stopRecordingRef.current = () => void finishRecording();
  }, [finishRecording]);

  const pressMic = useCallback(async () => {
    const s = stateRef.current;
    if (s.status === "recording") {
      await finishRecording();
      return;
    }
    if (isBusy(s) && s.status !== "processing_question" && s.status !== "generating_audio") return;
    // Barge-in: stop any audio and cancel pending answers before listening.
    abortRef.current?.abort();
    optsRef.current.audio.stop();
    if (!recorder.supported) {
      dispatch({ type: "UNSUPPORTED" });
      return;
    }
    dispatch({ type: "MIC_PRESSED" });
    const result = await recorder.start();
    if (result === "recording") dispatch({ type: "PERMISSION_GRANTED" });
    else if (result === "denied") dispatch({ type: "PERMISSION_DENIED" });
    else dispatch({ type: "UNSUPPORTED" });
  }, [finishRecording, recorder]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    recorder.cancel();
    optsRef.current.audio.stop();
    dispatch({ type: "CANCEL" });
  }, [recorder]);

  const confirm = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== "awaiting_confirmation" || !s.transcript.trim()) return;
    dispatch({ type: "CONFIRM" });
    void answer(s.transcript.trim(), s.requestId, true);
  }, [answer]);

  const askTyped = useCallback(
    (question: string) => {
      if (!question.trim()) return;
      abortRef.current?.abort();
      optsRef.current.audio.stop();
      recorder.cancel();
      const requestId = stateRef.current.requestId + 1; // ASK_TYPED starts a fresh interaction
      dispatch({ type: "ASK_TYPED", question });
      void answer(question.trim(), requestId, false);
    },
    [answer, recorder]
  );

  const stopAudio = useCallback(() => {
    optsRef.current.audio.stop();
    dispatch({ type: "STOP_AUDIO" });
  }, []);

  return {
    state,
    turns,
    languageSuggestion,
    dismissLanguageSuggestion: () => setLanguageSuggestion(null),
    pressMic,
    cancel,
    confirm,
    askTyped,
    stopAudio,
    editTranscript: (text: string) => dispatch({ type: "EDIT_TRANSCRIPT", transcript: text }),
    dismissError: () => dispatch({ type: "DISMISS_ERROR" }),
    micSupported: recorder.supported,
  };
}
