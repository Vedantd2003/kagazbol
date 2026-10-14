"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Plays TTS audio data URLs and exposes whether it is currently speaking.
 *
 * iOS Safari blocks autoplay until the user has interacted with the page.
 * When play() fails with NotAllowedError, the URL is held in `pendingUrl`
 * so the caller can render a "Tap to hear" button and call `unblockAndPlay`
 * from the tap handler (a real user gesture).
 */
export function useAudioPlayer() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((audioUrl: string) => {
    audioRef.current?.pause();

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setIsSpeaking(true);
    setPendingUrl(null);

    audio.onended = () => setIsSpeaking(false);
    audio.onerror = () => setIsSpeaking(false);

    void audio.play().catch((err: Error) => {
      setIsSpeaking(false);
      if (err.name === "NotAllowedError") {
        // iOS Safari (and some desktop browsers): autoplay was blocked.
        // Store the URL so the UI can offer a tap-to-play button.
        setPendingUrl(audioUrl);
      }
    });
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setIsSpeaking(false);
    setPendingUrl(null);
  }, []);

  /** Call from a user-gesture handler (e.g. button tap) to unlock autoplay. */
  const unblockAndPlay = useCallback(() => {
    if (pendingUrl) {
      play(pendingUrl);
    }
  }, [pendingUrl, play]);

  return { isSpeaking, play, stop, pendingUrl, unblockAndPlay };
}
