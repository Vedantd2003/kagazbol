"use client";

import { useCallback, useRef, useState } from "react";

/** Plays a TTS audio data URL and exposes whether it's currently speaking. */
export function useAudioPlayer() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((audioUrl: string) => {
    audioRef.current?.pause();

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setIsSpeaking(true);

    audio.onended = () => setIsSpeaking(false);
    audio.onerror = () => setIsSpeaking(false);
    void audio.play().catch(() => setIsSpeaking(false));
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, play, stop };
}
