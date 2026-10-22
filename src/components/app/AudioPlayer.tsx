"use client";

import { Pause, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { PLAYBACK_RATES, type PlaybackRate } from "@/lib/audio/controller";
import type { AudioApi } from "@/hooks/useAudio";
import { usePreferences } from "@/hooks/usePreferences";

function time(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Playback controls for one piece of text (identified by `audioKey`). The player
 * reflects the shared audio element only when it holds this clip; otherwise it
 * offers "Listen", which fetches (or reuses cached) speech.
 */
export function AudioPlayer({ audio, audioKey, onListen, loading, failed, compact = false }: { audio: AudioApi; audioKey: string; onListen: () => void; loading: boolean; failed: boolean; compact?: boolean }) {
  const { prefs, update, t } = usePreferences();
  const snap = audio.snapshot;
  const mine = snap.key === audioKey;
  const status = mine ? snap.status : "empty";
  const playing = status === "playing";
  const hasClip = mine && status !== "empty" && status !== "error";

  if (!prefs.voiceEnabled) return null;

  const setRate = (r: PlaybackRate) => {
    update({ playbackRate: r });
    audio.setRate(r);
  };

  const primary = () => {
    if (playing) audio.pause();
    else if (status === "paused" || status === "blocked" || status === "ready") audio.resume();
    else if (status === "ended") audio.replay();
    else onListen();
  };

  const primaryLabel = loading ? t.audioLoading : playing ? t.pause : status === "paused" ? t.resume : status === "blocked" ? t.tapToHear : status === "ended" ? t.replay : t.listen;

  return (
    <div className={`rounded-[var(--radius-panel)] border border-rule bg-sheet-2 ${compact ? "p-2.5" : "p-3.5"}`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={primary}
          disabled={loading}
          aria-label={primaryLabel}
          className={`grid shrink-0 place-items-center rounded-full bg-stamp text-stamp-ink shadow-[0_2px_0_rgb(0_0_0/0.15)] transition-transform active:scale-95 disabled:opacity-70 ${compact ? "size-12" : "size-14"} ${status === "blocked" ? "ring-4 ring-mark" : ""}`}
        >
          {loading ? <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden /> : playing ? <Pause className="size-6" aria-hidden /> : hasClip ? <Play className="size-6 translate-x-px" aria-hidden /> : <Volume2 className="size-6" aria-hidden />}
        </button>

        {hasClip ? (
          <div className="min-w-0 flex-1">
            <input
              type="range"
              min={0}
              max={snap.duration || 0}
              step={0.1}
              value={Math.min(snap.currentTime, snap.duration || 0)}
              onChange={(e) => audio.seek(Number(e.target.value))}
              aria-label={t.seek}
              aria-valuetext={`${time(snap.currentTime)} / ${time(snap.duration)}`}
              className="h-11 w-full cursor-pointer accent-[var(--stamp)]"
              disabled={!snap.duration}
            />
            <div className="-mt-2 flex justify-between text-xs tabular-nums text-ink-3">
              <span>{time(snap.currentTime)}</span>
              <span>{time(snap.duration)}</span>
            </div>
          </div>
        ) : (
          <span className="flex-1 text-base font-semibold text-ink">{primaryLabel}</span>
        )}

        {hasClip && (
          <div className="flex shrink-0 items-center">
            <button type="button" onClick={() => audio.replay()} className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-sheet hover:text-ink" aria-label={t.replay}>
              <RotateCcw className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => audio.stop()} className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-sheet hover:text-ink" aria-label={t.stop}>
              <Square className="size-4.5" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {hasClip && (
        <div className="mt-2 flex items-center gap-2" role="group" aria-label={t.speed}>
          <span className="text-sm text-ink-2">{t.speed}</span>
          {PLAYBACK_RATES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={prefs.playbackRate === r}
              onClick={() => setRate(r)}
              className={`min-h-9 min-w-11 rounded-full px-2 text-sm font-semibold tabular-nums ${prefs.playbackRate === r ? "bg-ink text-sheet" : "text-ink-2 hover:bg-sheet"}`}
            >
              {r}×
            </button>
          ))}
        </div>
      )}

      {(failed || (mine && status === "error")) && (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 text-sm text-due" role="status">
          {t.audioFailed}
          <button type="button" onClick={onListen} className="min-h-9 font-semibold underline underline-offset-4">
            {t.retryAudio}
          </button>
        </p>
      )}
    </div>
  );
}
