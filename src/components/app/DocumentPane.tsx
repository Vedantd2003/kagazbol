"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePreferences } from "@/hooks/usePreferences";
import { explainSimply } from "@/lib/apiClient";
import type { EvidenceSpan, ExplainResponse } from "@/lib/types";
import type { AudioApi } from "@/hooks/useAudio";
import { AudioPlayer } from "./AudioPlayer";

const MAX_SELECTION = 600;

/** Text with one highlighted span; offsets come from the server's evidence locator. */
function HighlightedText({ text, highlight }: { text: string; highlight: { start: number; end: number } | null }) {
  const markRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (highlight) markRef.current?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [highlight]);
  if (!highlight || highlight.start < 0 || highlight.end > text.length || highlight.start >= highlight.end) return <>{text}</>;
  return (
    <>
      {text.slice(0, highlight.start)}
      <mark ref={markRef} key={`${highlight.start}-${highlight.end}`} className="mark mark-sweep rounded-sm text-inherit">
        {text.slice(highlight.start, highlight.end)}
      </mark>
      {text.slice(highlight.end)}
    </>
  );
}

export function DocumentPane({ ocrText, previewUrl, highlight, audio, onClearHighlight }: { ocrText: string; previewUrl: string | null; highlight: EvidenceSpan | null; audio: AudioApi; onClearHighlight: () => void }) {
  const { t, prefs } = usePreferences();
  const [view, setView] = useState<"text" | "photo">("text");
  const textRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<string | null>(null);
  const [explain, setExplain] = useState<{ source: string; loading: boolean; result: ExplainResponse | null; error: boolean; withExample: boolean } | null>(null);
  const [audioState, setAudioState] = useState<{ loading: boolean; failed: boolean }>({ loading: false, failed: false });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onChange = () => {
      const sel = window.getSelection();
      const node = sel?.anchorNode;
      if (!sel || sel.isCollapsed || !node || !textRef.current?.contains(node)) return setSelection(null);
      const text = sel.toString().trim();
      setSelection(text && text.length <= MAX_SELECTION ? text : null);
    };
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  // An explanation belongs to one language; re-ask if the language changes while it is open.
  const lastLang = useRef(prefs.language);
  useEffect(() => {
    if (lastLang.current !== prefs.language && explain?.result) void run(explain.source, explain.withExample);
    lastLang.current = prefs.language;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when language changes
  }, [prefs.language]);

  async function run(source: string, withExample: boolean) {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setAudioState({ loading: false, failed: false });
    setExplain({ source, loading: true, result: null, error: false, withExample });
    // Context: the lines around the selection, so "it" and abbreviations make sense.
    const idx = ocrText.indexOf(source);
    const context = idx >= 0 ? ocrText.slice(Math.max(0, idx - 600), idx + source.length + 600) : null;
    try {
      const result = await explainSimply(source, context, prefs.language, withExample, ac.signal);
      setExplain({ source, loading: false, result, error: false, withExample });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setExplain({ source, loading: false, result: null, error: true, withExample });
    }
  }

  const explainKey = useMemo(() => (explain?.result ? `explain:${prefs.language}:${explain.source}:${explain.withExample}` : ""), [explain, prefs.language]);
  const spoken = explain?.result ? [explain.result.simple, explain.result.example].filter(Boolean).join(" ") : "";

  async function listen() {
    if (!spoken) return;
    setAudioState({ loading: true, failed: false });
    const r = await audio.speak(spoken, prefs.language, { autoplay: true, key: explainKey });
    setAudioState({ loading: false, failed: r === "failed" });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label={t.tabDocument} className="flex gap-1 border-b border-rule px-1">
        {(["text", "photo"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            type="button"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`-mb-px min-h-11 border-b-2 px-3 text-base font-semibold ${view === v ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
          >
            {v === "text" ? t.extractedText : t.originalPhoto}
          </button>
        ))}
        {highlight && view === "text" && (
          <button type="button" onClick={onClearHighlight} className="ml-auto inline-flex min-h-11 items-center gap-1 px-2 text-sm text-ink-2 hover:text-ink">
            <X className="size-4" aria-hidden />
            {t.close}
          </button>
        )}
      </div>

      {view === "text" ? (
        <>
          <p className="px-1 pt-3 text-sm text-ink-2">{t.explainHint}</p>
          <div
            ref={textRef}
            tabIndex={0}
            aria-label={t.extractedText}
            className="sheet mt-3 min-h-0 flex-1 overflow-auto px-5 py-5 text-[1.02rem] leading-[1.8] whitespace-pre-wrap text-ink selection:bg-mark"
          >
            <HighlightedText text={ocrText} highlight={highlight} />
          </div>
          {highlight && (
            <p className="mt-2 px-1 text-xs text-ink-3">
              {t.sourceText}: {highlight.page ? `p. ${highlight.page}, ` : ""}line {highlight.line}
            </p>
          )}
        </>
      ) : (
        <div className="mt-3 min-h-0 flex-1 overflow-auto">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL, never uploaded anywhere else
            <img src={previewUrl} alt={t.originalPhoto} className="sheet mx-auto w-full max-w-xl" />
          ) : null}
        </div>
      )}

      {selection && !explain && (
        <div className="sticky bottom-3 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-panel)] bg-ink p-2.5 text-sheet shadow-[var(--shadow-lift)]">
          <span className="min-w-0 flex-1 truncate px-2 text-sm opacity-80">“{selection}”</span>
          <Button variant="primary" onClick={() => run(selection, false)}>
            <Lightbulb className="size-4.5" aria-hidden />
            {t.explainSimply}
          </Button>
        </div>
      )}

      {explain && (
        <section aria-live="polite" aria-labelledby="explain-title" className="mt-4 rounded-[var(--radius-panel)] border border-rule-strong bg-sheet p-5 shadow-[var(--shadow-sheet)]">
          <div className="flex items-start justify-between gap-3">
            <h3 id="explain-title" className="font-display text-xl">
              {t.simpleExplanation}
            </h3>
            <button type="button" onClick={() => { abortRef.current?.abort(); setExplain(null); }} className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-sheet-2" aria-label={t.close}>
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <blockquote className="mt-3 border-l-4 border-mark pl-3 text-base text-ink-2">
            <span className="sr-only">{t.sourceText}: </span>
            {explain.source}
          </blockquote>
          {explain.loading && <p className="mt-4 text-base text-ink-2">{t.explaining}</p>}
          {explain.error && (
            <p className="mt-4 text-base text-due">
              {t.errorGeneric}{" "}
              <button type="button" onClick={() => run(explain.source, explain.withExample)} className="font-semibold underline underline-offset-4">
                {t.retry}
              </button>
            </p>
          )}
          {explain.result && (
            <>
              {explain.result.unclear && <p className="mt-4 rounded-[var(--radius-control)] bg-mark-soft px-3 py-2 text-base">{t.unclearText}</p>}
              <p className="mt-4 text-xl leading-relaxed text-ink">{explain.result.simple}</p>
              {explain.result.example && (
                <p className="mt-3 text-lg text-ink-2">
                  <span className="font-semibold text-ink">{t.example}: </span>
                  {explain.result.example}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {!explain.withExample && (
                  <Button onClick={() => run(explain.source, true)}>{t.explainExample}</Button>
                )}
              </div>
              <div className="mt-4">
                <AudioPlayer audio={audio} audioKey={explainKey} onListen={listen} loading={audioState.loading} failed={audioState.failed} compact />
              </div>
              <p className="mt-3 text-xs text-ink-3">{t.notAdvice}</p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
