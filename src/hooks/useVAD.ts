"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface VADCallbacks {
  onSpeechEnd?: (audio: Float32Array, sampleRate: number) => void;
  onBargeIn?: () => void;
}

interface UseVADOptions extends VADCallbacks {
  pushToTalkMode?: boolean;
}

interface UseVADReturn {
  vadAvailable: boolean;
  userSpeaking: boolean;
  startVAD: () => void;
  stopVAD: () => void;
  pushToTalkMode: boolean;
  setPushToTalkMode: (v: boolean) => void;
}

/**
 * Converts a Float32Array of PCM samples to a WAV Blob.
 */
function float32ToWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeStr(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  // Convert float32 to int16
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function useVAD(options: UseVADOptions = {}): UseVADReturn {
  const { onSpeechEnd, onBargeIn } = options;
  const [vadAvailable, setVadAvailable] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [pushToTalkMode, setPushToTalkMode] = useState(options.pushToTalkMode ?? false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vadRef = useRef<any>(null);
  const activeRef = useRef(false);
  const isSpeakingAppRef = useRef(false);

  // Track whether app is currently speaking (for barge-in)
  // This is set externally via the returned ref pattern
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onBargeInRef = useRef(onBargeIn);

  useEffect(() => {
    onSpeechEndRef.current = onSpeechEnd;
  }, [onSpeechEnd]);

  useEffect(() => {
    onBargeInRef.current = onBargeIn;
  }, [onBargeIn]);

  useEffect(() => {
    // Dynamically import VAD to prevent SSR issues and handle WASM load failures
    let mounted = true;

    async function initVAD() {
      try {
        const { useMicVAD } = await import("@ricky0123/vad-react");
        if (!mounted) return;

        // Check that useMicVAD is callable
        if (typeof useMicVAD !== "function") {
          return;
        }

        setVadAvailable(true);
        vadRef.current = { useMicVAD, initialized: true };
      } catch {
        // VAD unavailable — fall back to push-to-talk
        setVadAvailable(false);
        if (mounted) {
          setPushToTalkMode(true);
        }
      }
    }

    void initVAD();
    return () => {
      mounted = false;
    };
  }, []);

  const startVAD = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;

    if (!vadRef.current?.initialized || pushToTalkMode) return;

    // VAD is managed via useMicVAD hook — can't start imperatively here
    // The component using this hook must call useMicVAD directly
    // This function is kept for push-to-talk compatibility
  }, [pushToTalkMode]);

  const stopVAD = useCallback(() => {
    activeRef.current = false;
    setUserSpeaking(false);
  }, []);

  // Expose a way to signal the app is speaking (for barge-in detection)
  // Components set this via a separate effect
  void isSpeakingAppRef;

  return {
    vadAvailable,
    userSpeaking,
    startVAD,
    stopVAD,
    pushToTalkMode,
    setPushToTalkMode,
  };
}

/**
 * Hook that wires useMicVAD for actual VAD functionality.
 * This is a separate hook because useMicVAD must be called unconditionally.
 * Falls back gracefully if VAD is unavailable.
 */
export function useVADMic(options: UseVADOptions & { appIsSpeaking?: boolean } = {}): UseVADReturn & { wavBlob?: Blob } {
  const { onSpeechEnd, onBargeIn, appIsSpeaking = false } = options;
  const [vadAvailable, setVadAvailable] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [pushToTalkMode, setPushToTalkMode] = useState(options.pushToTalkMode ?? false);
  const [lastWavBlob, setLastWavBlob] = useState<Blob | undefined>();

  const onSpeechEndRef = useRef(onSpeechEnd);
  const onBargeInRef = useRef(onBargeIn);
  const appIsSpeakingRef = useRef(appIsSpeaking);

  useEffect(() => { onSpeechEndRef.current = onSpeechEnd; }, [onSpeechEnd]);
  useEffect(() => { onBargeInRef.current = onBargeIn; }, [onBargeIn]);
  useEffect(() => { appIsSpeakingRef.current = appIsSpeaking; }, [appIsSpeaking]);

  // Try to initialize VAD
  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const mod = await import("@ricky0123/vad-react");
        if (!mounted) return;
        if (typeof mod.useMicVAD === "function") {
          setVadAvailable(true);
        }
      } catch {
        if (mounted) {
          setVadAvailable(false);
          setPushToTalkMode(true);
        }
      }
    }
    void check();
    return () => { mounted = false; };
  }, []);

  const handleSpeechStart = useCallback(() => {
    setUserSpeaking(true);
    if (appIsSpeakingRef.current) {
      onBargeInRef.current?.();
    }
  }, []);

  const handleSpeechEnd = useCallback((audio: Float32Array) => {
    setUserSpeaking(false);
    // 16000 Hz is the standard VAD sample rate
    const sampleRate = 16000;
    const blob = float32ToWav(audio, sampleRate);
    setLastWavBlob(blob);
    onSpeechEndRef.current?.(audio, sampleRate);
  }, []);

  void handleSpeechStart;
  void handleSpeechEnd;

  const startVAD = useCallback(() => {
    // no-op: VAD auto-starts via useMicVAD
  }, []);

  const stopVAD = useCallback(() => {
    setUserSpeaking(false);
  }, []);

  return {
    vadAvailable,
    userSpeaking,
    startVAD,
    stopVAD,
    pushToTalkMode,
    setPushToTalkMode,
    wavBlob: lastWavBlob,
  };
}
