import type { AppLanguage } from "./sarvam/config";

const FILLER_COUNT = 3;
const counters: Partial<Record<AppLanguage, number>> = {};

/**
 * Returns the URL for the next filler audio file for a given language.
 * Rotates through FILLER_COUNT variants.
 */
export function getFillerUrl(lang: AppLanguage): string {
  const idx = counters[lang] ?? 0;
  counters[lang] = (idx + 1) % FILLER_COUNT;
  return `/audio/fillers/${lang}-${idx}.wav`;
}

/**
 * Plays a filler audio file for the given language.
 * Returns a stop() function that fades out the audio.
 * If the file doesn't exist (404), silently skips.
 */
export function playFiller(lang: AppLanguage): () => void {
  if (typeof window === "undefined") return () => undefined;

  const url = getFillerUrl(lang);
  let stopped = false;

  // Use Web Audio API for fade-out capability
  let audioCtx: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  let source: AudioBufferSourceNode | null = null;

  // Fetch and decode audio
  void (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return; // File doesn't exist — silently skip

      const arrayBuffer = await res.arrayBuffer();
      if (stopped) return;

      audioCtx = new AudioContext();
      gainNode = audioCtx.createGain();
      gainNode.connect(audioCtx.destination);

      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      if (stopped) {
        void audioCtx.close();
        return;
      }

      source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNode);
      source.start(0);
    } catch {
      // Silently ignore — filler audio is optional
    }
  })();

  /** Stop playback with a 200ms fade-out */
  return function stop() {
    stopped = true;
    if (!gainNode || !audioCtx || !source) return;

    try {
      const now = audioCtx.currentTime;
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.2);

      setTimeout(() => {
        try {
          source!.stop();
          void audioCtx!.close();
        } catch {
          // ignore
        }
      }, 220);
    } catch {
      // ignore
    }
  };
}
