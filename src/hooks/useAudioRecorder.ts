"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

export type StartResult = "recording" | "denied" | "unsupported";

/** Longest question we record; Sarvam's REST STT is meant for clips under 30 s. */
export const MAX_RECORDING_MS = 28_000;

/**
 * Thin MediaRecorder wrapper. Recording only ever starts from an explicit user
 * action, stops automatically after MAX_RECORDING_MS, and releases the
 * microphone on stop, cancel and unmount so the browser's mic indicator turns off.
 */
export function useAudioRecorder(onAutoStop?: () => void) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStopRef = useRef(onAutoStop);
  useEffect(() => {
    autoStopRef.current = onAutoStop;
  }, [onAutoStop]);

  const release = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => release, [release]);

  const supported = typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

  const start = useCallback(async (): Promise<StartResult> => {
    if (!supported) return "unsupported";
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      return name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unsupported";
    }
    streamRef.current = stream;
    chunksRef.current = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorderRef.current = rec;
    rec.start();
    timerRef.current = setTimeout(() => autoStopRef.current?.(), MAX_RECORDING_MS);
    return "recording";
  }, [supported]);

  const stop = useCallback((): Promise<Blob | null> => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") {
      release();
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        release();
        resolve(blob.size > 0 ? blob : null);
      };
      rec.stop();
    });
  }, [release]);

  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.stop();
    }
    chunksRef.current = [];
    release();
  }, [release]);

  // Stable identity: consumers use the recorder in effect dependencies.
  return useMemo(() => ({ supported, start, stop, cancel }), [supported, start, stop, cancel]);
}
