import { describe, it, expect, vi } from "vitest";
import { initialVoiceState, voiceReducer, isBusy, type VoiceEvent, type VoiceState } from "@/lib/voice/machine";
import { AudioController, type AudioLike } from "@/lib/audio/controller";
import { loadPreferences, savePreferences, sanitizePreferences, DEFAULT_PREFERENCES, PREFS_KEY } from "@/lib/preferences";

const run = (events: VoiceEvent[], from: VoiceState = initialVoiceState) => events.reduce(voiceReducer, from);

describe("voice state machine", () => {
  it("walks the happy path from mic to playback", () => {
    let s = run([{ type: "MIC_PRESSED" }]);
    expect(s.status).toBe("requesting_permission");
    const id = s.requestId;
    s = run([{ type: "PERMISSION_GRANTED" }, { type: "MIC_PRESSED" }], s);
    expect(s.status).toBe("transcribing");
    s = run([{ type: "TRANSCRIBED", requestId: id, transcript: "kitna bharna hai", language: "hi-IN", confidence: 0.9 }], s);
    expect(s).toMatchObject({ status: "awaiting_confirmation", transcript: "kitna bharna hai", lowConfidence: false });
    s = run([{ type: "EDIT_TRANSCRIPT", transcript: "kitna bharna hai aur kab tak?" }, { type: "CONFIRM" }], s);
    expect(s).toMatchObject({ status: "processing_question", question: "kitna bharna hai aur kab tak?" });
    s = run([{ type: "ANSWERED", requestId: id, speak: true }, { type: "AUDIO_READY", requestId: id }], s);
    expect(s.status).toBe("playing_audio");
    s = run([{ type: "PLAYBACK_PAUSED" }], s);
    expect(s.status).toBe("paused");
    s = run([{ type: "PLAYBACK_RESUMED" }, { type: "PLAYBACK_ENDED" }], s);
    expect(s.status).toBe("idle");
  });

  it("flags low-confidence transcriptions for checking", () => {
    let s = run([{ type: "MIC_PRESSED" }, { type: "PERMISSION_GRANTED" }, { type: "STOP_RECORDING" }]);
    s = voiceReducer(s, { type: "TRANSCRIBED", requestId: s.requestId, transcript: "uh", language: "mr-IN", confidence: 0.3 });
    expect(s.lowConfidence).toBe(true);
  });

  it("ignores stale results from an earlier interaction", () => {
    let s = run([{ type: "MIC_PRESSED" }, { type: "PERMISSION_GRANTED" }, { type: "STOP_RECORDING" }]);
    const oldId = s.requestId;
    s = run([{ type: "CANCEL" }, { type: "ASK_TYPED", question: "When is it due?" }], s);
    const after = voiceReducer(s, { type: "TRANSCRIBED", requestId: oldId, transcript: "old", language: null, confidence: null });
    expect(after).toBe(s);
    expect(voiceReducer(s, { type: "AUDIO_READY", requestId: oldId })).toBe(s);
  });

  it("pressing the mic during playback interrupts it (barge-in)", () => {
    let s = run([{ type: "ASK_TYPED", question: "q" }]);
    s = run([{ type: "ANSWERED", requestId: s.requestId, speak: true }, { type: "AUDIO_READY", requestId: s.requestId }], s);
    const before = s.requestId;
    s = voiceReducer(s, { type: "MIC_PRESSED" });
    expect(s.status).toBe("requesting_permission");
    expect(s.requestId).toBe(before + 1);
  });

  it("ignores repeated clicks while busy", () => {
    const s = run([{ type: "MIC_PRESSED" }]);
    expect(voiceReducer(s, { type: "MIC_PRESSED" })).toBe(s);
    const t = run([{ type: "PERMISSION_GRANTED" }, { type: "STOP_RECORDING" }], s);
    expect(voiceReducer(t, { type: "MIC_PRESSED" })).toBe(t);
    expect(isBusy(t)).toBe(true);
  });

  it("handles permission denial, unsupported browsers and recovery", () => {
    let s = run([{ type: "MIC_PRESSED" }, { type: "PERMISSION_DENIED" }]);
    expect(s.error?.kind).toBe("permission_denied");
    s = voiceReducer(s, { type: "DISMISS_ERROR" });
    expect(s.status).toBe("idle");
    expect(run([{ type: "UNSUPPORTED" }]).error?.kind).toBe("unsupported_browser");
  });

  it("audio failure keeps the answer and is recoverable", () => {
    let s = run([{ type: "ASK_TYPED", question: "q" }]);
    s = run([{ type: "ANSWERED", requestId: s.requestId, speak: true }, { type: "AUDIO_FAILED", requestId: s.requestId, message: "no audio" }], s);
    expect(s).toMatchObject({ status: "error", question: "q", error: { kind: "audio_failed" } });
  });

  it("text-only answers go straight back to idle", () => {
    let s = run([{ type: "ASK_TYPED", question: "q" }]);
    s = voiceReducer(s, { type: "ANSWERED", requestId: s.requestId, speak: false });
    expect(s.status).toBe("idle");
  });

  it("refuses to send an empty transcript", () => {
    let s = run([{ type: "MIC_PRESSED" }, { type: "PERMISSION_GRANTED" }, { type: "STOP_RECORDING" }]);
    s = voiceReducer(s, { type: "TRANSCRIBED", requestId: s.requestId, transcript: "hi", language: null, confidence: null });
    s = voiceReducer(s, { type: "EDIT_TRANSCRIPT", transcript: "   " });
    expect(voiceReducer(s, { type: "CONFIRM" })).toBe(s);
  });
});

class FakeAudio implements AudioLike {
  src = "";
  currentTime = 0;
  duration = 10;
  playbackRate = 1;
  preservesPitch = false;
  paused = true;
  playImpl: () => Promise<void> = () => Promise.resolve();
  private handlers = new Map<string, Set<() => void>>();
  play() {
    this.paused = false;
    return this.playImpl();
  }
  pause() {
    this.paused = true;
  }
  load() {}
  removeAttribute() {
    this.src = "";
  }
  addEventListener(t: string, cb: () => void) {
    if (!this.handlers.has(t)) this.handlers.set(t, new Set());
    this.handlers.get(t)!.add(cb);
  }
  removeEventListener(t: string, cb: () => void) {
    this.handlers.get(t)?.delete(cb);
  }
  emit(t: string) {
    this.handlers.get(t)?.forEach((cb) => cb());
  }
}

describe("audio controller", () => {
  function setup() {
    const made: FakeAudio[] = [];
    const c = new AudioController(() => {
      const a = new FakeAudio();
      made.push(a);
      return a;
    });
    return { c, made };
  }

  it("plays, pauses, resumes, stops and replays", async () => {
    const { c, made } = setup();
    c.load("data:a", "summary");
    await c.play();
    expect(c.snapshot.status).toBe("playing");
    c.pause();
    expect(made[0].paused).toBe(true);
    await c.resume();
    expect(c.snapshot.status).toBe("playing");
    made[0].currentTime = 4;
    c.stop();
    expect(made[0].currentTime).toBe(0);
    expect(made[0].paused).toBe(true);
    await c.replay();
    expect(c.snapshot.status).toBe("playing");
  });

  it("changes speed natively without reloading audio", async () => {
    const { c, made } = setup();
    c.load("data:a", "x");
    c.setRate(0.75);
    await c.play();
    expect(made).toHaveLength(1);
    expect(made[0].playbackRate).toBe(0.75);
    expect(made[0].preservesPitch).toBe(true);
    c.load("data:b", "y");
    expect(made[1].playbackRate).toBe(0.75);
  });

  it("never starts a stale clip", async () => {
    const { c } = setup();
    const t1 = c.reserve();
    const t2 = c.reserve();
    expect(c.load("data:old", "old", t1)).toBe(false);
    expect(c.load("data:new", "new", t2)).toBe(true);
    expect(await c.play(t1)).toBe(false);
    const t3 = c.reserve();
    c.stop(); // user pressed stop while the next clip was still being generated
    expect(c.load("data:late", "late", t3)).toBe(false);
    expect(c.snapshot.key).toBe("new");
  });

  it("starting new audio stops the previous element", async () => {
    const { c, made } = setup();
    c.load("data:a", "a");
    await c.play();
    c.load("data:b", "b");
    expect(made[0].paused).toBe(true);
    made[0].emit("ended"); // late event from the old element is ignored
    expect(c.snapshot.status).toBe("ready");
  });

  it("reports autoplay blocking so the UI can ask for a tap", async () => {
    const { c, made } = setup();
    c.load("data:a", "a");
    made[0].playImpl = () => Promise.reject(Object.assign(new Error("blocked"), { name: "NotAllowedError" }));
    expect(await c.play()).toBe(false);
    expect(c.snapshot.status).toBe("blocked");
  });

  it("tracks progress, seeks within bounds and ends", async () => {
    const { c, made } = setup();
    const seen = vi.fn();
    c.subscribe(seen);
    c.load("data:a", "a");
    made[0].emit("loadedmetadata");
    expect(c.snapshot.duration).toBe(10);
    c.seek(99);
    expect(c.snapshot.currentTime).toBe(10);
    c.seek(-5);
    expect(c.snapshot.currentTime).toBe(0);
    await c.play();
    made[0].emit("ended");
    expect(c.snapshot.status).toBe("ended");
    expect(seen).toHaveBeenCalled();
    c.clear();
    expect(c.snapshot.status).toBe("empty");
  });
});

describe("preferences", () => {
  it("round-trips valid preferences and stores nothing else", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    savePreferences({ ...DEFAULT_PREFERENCES, language: "mr-IN", playbackRate: 0.75, ...({ ocrText: "secret doc" } as object) }, storage);
    expect(store.get(PREFS_KEY)).not.toContain("secret doc");
    expect(loadPreferences(storage)).toMatchObject({ language: "mr-IN", playbackRate: 0.75 });
  });
  it("recovers from corrupted or hostile storage", () => {
    expect(loadPreferences({ getItem: () => "{not json" })).toEqual(DEFAULT_PREFERENCES);
    expect(loadPreferences({ getItem: () => { throw new Error("denied"); } })).toEqual(DEFAULT_PREFERENCES);
    expect(sanitizePreferences({ language: "fr-FR", playbackRate: 3, voiceEnabled: "yes" })).toEqual(DEFAULT_PREFERENCES);
  });
});
