"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AudioController, type AudioSnapshot, type PlaybackRate } from "@/lib/audio/controller";
import { speakText } from "@/lib/apiClient";
import type { AppLanguage } from "@/lib/languages";

const MAX_CACHE = 24;
const SERVER_SNAPSHOT: AudioSnapshot = { status: "empty", currentTime: 0, duration: 0, rate: 1, key: null, error: null };

export type SpeakResult = "playing" | "loaded" | "blocked" | "stale" | "failed";

/**
 * React binding for AudioController plus TTS fetching.
 *
 * - Generated audio is cached per (language, text), so replaying, changing speed
 *   or switching back to a language never re-bills TTS.
 * - `speak` reserves a playback token before fetching; if the user stops audio or
 *   asks something new meanwhile, the late clip is discarded instead of playing.
 */
export function useAudio(rate: PlaybackRate) {
  // One controller per component instance, created on the client only.
  const [controller] = useState<AudioController | null>(() => (typeof window !== "undefined" ? new AudioController() : null));
  const cache = useRef(new Map<string, string>());
  const inflight = useRef<AbortController | null>(null);

  const subscribe = useCallback((cb: () => void) => controller?.subscribe(cb) ?? (() => undefined), [controller]);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => controller?.snapshot ?? SERVER_SNAPSHOT,
    () => SERVER_SNAPSHOT
  );

  useEffect(() => {
    controller?.setRate(rate);
  }, [controller, rate]);

  useEffect(() => {
    const abortRef = inflight;
    return () => {
      abortRef.current?.abort();
      controller?.clear();
    };
  }, [controller]);

  const speak = useCallback(
    async (text: string, language: AppLanguage, opts: { autoplay: boolean; key?: string }): Promise<SpeakResult> => {
      const c = controller;
      if (!c || !text.trim()) return "failed";
      inflight.current?.abort();
      const token = c.reserve();
      const cacheKey = `${language}\u0000${text}`;
      let url = cache.current.get(cacheKey);
      if (!url) {
        const ac = new AbortController();
        inflight.current = ac;
        try {
          url = await speakText(text, language, ac.signal);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return "stale";
          if (!c.isCurrent(token)) return "stale";
          return "failed";
        } finally {
          if (inflight.current === ac) inflight.current = null;
        }
        cache.current.set(cacheKey, url);
        if (cache.current.size > MAX_CACHE) cache.current.delete(cache.current.keys().next().value!);
      }
      if (!c.load(url, opts.key ?? cacheKey, token)) return "stale";
      if (!opts.autoplay) return "loaded";
      const ok = await c.play(token);
      if (ok) return "playing";
      return c.snapshot.status === "blocked" ? "blocked" : c.isCurrent(token) ? "failed" : "stale";
    },
    [controller]
  );

  const controls = useMemo(
    () => ({
      play: () => controller?.play(),
      pause: () => controller?.pause(),
      resume: () => controller?.resume(),
      stop: () => {
        inflight.current?.abort();
        controller?.stop();
      },
      replay: () => controller?.replay(),
      seek: (t: number) => controller?.seek(t),
      setRate: (r: PlaybackRate) => controller?.setRate(r),
      clear: () => {
        inflight.current?.abort();
        controller?.clear();
      },
    }),
    [controller]
  );

  return useMemo(() => ({ snapshot, speak, ...controls }), [snapshot, speak, controls]);
}

export type AudioApi = ReturnType<typeof useAudio>;
