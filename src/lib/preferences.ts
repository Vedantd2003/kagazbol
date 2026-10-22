import { DEFAULT_LANGUAGE, isAppLanguage, type AppLanguage } from "./languages";
import { PLAYBACK_RATES, type PlaybackRate } from "./audio/controller";

/**
 * Voice & accessibility preferences.
 *
 * KagazBol has no user accounts, so preferences are stored on this device in
 * localStorage. Only these non-sensitive settings are stored — never document
 * text, summaries, answers or audio.
 */
export interface Preferences {
  /** Language for the interface, explanations, answers and speech. */
  language: AppLanguage;
  /** Master switch. Off = text-only mode; nothing is ever spoken or recorded. */
  voiceEnabled: boolean;
  /** Play summaries/answers automatically when they arrive. */
  autoPlay: boolean;
  playbackRate: PlaybackRate;
  /** Speak short upload instructions when the upload screen opens. */
  spokenGuidance: boolean;
  /** Larger text throughout the app. */
  largeText: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  language: DEFAULT_LANGUAGE,
  voiceEnabled: true,
  autoPlay: true,
  playbackRate: 1,
  spokenGuidance: false,
  largeText: false,
};

export const PREFS_KEY = "kagazbol.prefs.v1";

/** Accepts unknown input (e.g. corrupted storage) and returns valid preferences. */
export function sanitizePreferences(raw: unknown): Preferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFERENCES };
  const r = raw as Record<string, unknown>;
  const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  return {
    language: isAppLanguage(r.language) ? r.language : DEFAULT_PREFERENCES.language,
    voiceEnabled: bool(r.voiceEnabled, DEFAULT_PREFERENCES.voiceEnabled),
    autoPlay: bool(r.autoPlay, DEFAULT_PREFERENCES.autoPlay),
    playbackRate: (PLAYBACK_RATES as readonly number[]).includes(r.playbackRate as number)
      ? (r.playbackRate as PlaybackRate)
      : DEFAULT_PREFERENCES.playbackRate,
    spokenGuidance: bool(r.spokenGuidance, DEFAULT_PREFERENCES.spokenGuidance),
    largeText: bool(r.largeText, DEFAULT_PREFERENCES.largeText),
  };
}

export function loadPreferences(storage: Pick<Storage, "getItem"> | null = safeStorage()): Preferences {
  try {
    const raw = storage?.getItem(PREFS_KEY);
    return sanitizePreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(p: Preferences, storage: Pick<Storage, "setItem"> | null = safeStorage()): void {
  try {
    storage?.setItem(PREFS_KEY, JSON.stringify(sanitizePreferences(p)));
  } catch {
    // Private mode / storage full: preferences just won't persist.
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
