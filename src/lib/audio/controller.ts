/**
 * Interruptible audio playback controller.
 *
 * - One audio element at a time; starting new audio stops the old one.
 * - Every load gets a token. `play(token)` is ignored if a newer load or a stop()
 *   happened since — this is what prevents a stale TTS clip from starting late.
 * - Playback speed uses the element's native `playbackRate` (with pitch
 *   preservation where supported), so speed changes never re-generate speech.
 */

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export type AudioStatus = "empty" | "loading" | "ready" | "playing" | "paused" | "ended" | "blocked" | "error";

export interface AudioSnapshot {
  status: AudioStatus;
  currentTime: number;
  duration: number;
  rate: PlaybackRate;
  /** Key of the clip currently loaded, for "is this the audio for X?" checks. */
  key: string | null;
  error: string | null;
}

/** The subset of HTMLAudioElement we use — lets tests pass a fake. */
export interface AudioLike {
  src: string;
  currentTime: number;
  readonly duration: number;
  playbackRate: number;
  preservesPitch?: boolean;
  play(): Promise<void>;
  pause(): void;
  load?(): void;
  removeAttribute?(name: string): void;
  addEventListener(type: string, cb: () => void): void;
  removeEventListener(type: string, cb: () => void): void;
}

type Listener = (s: AudioSnapshot) => void;

export class AudioController {
  private el: AudioLike | null = null;
  private token = 0;
  private listeners = new Set<Listener>();
  private cleanup: (() => void) | null = null;
  private snap: AudioSnapshot = { status: "empty", currentTime: 0, duration: 0, rate: 1, key: null, error: null };

  constructor(private readonly create: () => AudioLike = () => new Audio() as unknown as AudioLike) {}

  get snapshot(): AudioSnapshot {
    return this.snap;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(patch: Partial<AudioSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l(this.snap));
  }

  /** Reserve a token before an async fetch of audio; pass it to `load`. */
  reserve(): number {
    return ++this.token;
  }

  isCurrent(token: number): boolean {
    return token === this.token;
  }

  /** Loads a clip. Returns false (and does nothing) if `token` is stale. */
  load(url: string, key: string, token = this.reserve()): boolean {
    if (token !== this.token) return false;
    this.teardown();
    const el = this.create();
    el.playbackRate = this.snap.rate;
    if ("preservesPitch" in el) el.preservesPitch = true;
    const on = (type: string, cb: () => void) => {
      el.addEventListener(type, cb);
      return () => el.removeEventListener(type, cb);
    };
    const offs = [
      on("timeupdate", () => this.el === el && this.set({ currentTime: el.currentTime })),
      on("loadedmetadata", () => this.el === el && this.set({ duration: Number.isFinite(el.duration) ? el.duration : 0 })),
      on("durationchange", () => this.el === el && this.set({ duration: Number.isFinite(el.duration) ? el.duration : 0 })),
      on("ended", () => this.el === el && this.set({ status: "ended", currentTime: this.snap.duration })),
      on("error", () => this.el === el && this.set({ status: "error", error: "This audio could not be played." })),
    ];
    this.cleanup = () => offs.forEach((off) => off());
    el.src = url;
    this.el = el;
    this.set({ status: "ready", currentTime: 0, duration: 0, key, error: null });
    return true;
  }

  async play(token?: number): Promise<boolean> {
    if (token != null && token !== this.token) return false;
    const el = this.el;
    if (!el) return false;
    if (this.snap.status === "ended") el.currentTime = 0;
    el.playbackRate = this.snap.rate;
    this.set({ status: "playing" });
    try {
      await el.play();
      return true;
    } catch (err) {
      if (this.el !== el) return false;
      const name = err instanceof Error ? err.name : "";
      // Autoplay blocked (iOS Safari etc.): needs a user gesture to start.
      if (name === "NotAllowedError") this.set({ status: "blocked" });
      else if (name === "AbortError") this.set({ status: "paused" });
      else this.set({ status: "error", error: "This audio could not be played." });
      return false;
    }
  }

  pause() {
    if (this.el && this.snap.status === "playing") {
      this.el.pause();
      this.set({ status: "paused" });
    }
  }

  async resume(): Promise<boolean> {
    if (this.snap.status !== "paused" && this.snap.status !== "blocked" && this.snap.status !== "ready") return false;
    return this.play();
  }

  /** Stops immediately and invalidates any pending load/play. */
  stop() {
    this.token++;
    if (this.el) {
      this.el.pause();
      this.el.currentTime = 0;
      this.set({ status: this.snap.status === "empty" ? "empty" : "ready", currentTime: 0 });
    }
  }

  async replay(): Promise<boolean> {
    if (!this.el) return false;
    this.el.currentTime = 0;
    this.set({ currentTime: 0 });
    return this.play();
  }

  seek(seconds: number) {
    if (!this.el) return;
    const max = this.snap.duration || seconds;
    const t = Math.max(0, Math.min(seconds, max));
    this.el.currentTime = t;
    this.set({ currentTime: t, status: this.snap.status === "ended" ? "paused" : this.snap.status });
  }

  setRate(rate: PlaybackRate) {
    if (this.el) this.el.playbackRate = rate;
    this.set({ rate });
  }

  /** Releases the element entirely (document switched, component unmounted). */
  clear() {
    this.token++;
    this.teardown();
    this.set({ status: "empty", currentTime: 0, duration: 0, key: null, error: null });
  }

  private teardown() {
    const el = this.el;
    this.cleanup?.();
    this.cleanup = null;
    this.el = null;
    if (el) {
      el.pause();
      el.removeAttribute?.("src");
      el.load?.();
    }
  }
}
