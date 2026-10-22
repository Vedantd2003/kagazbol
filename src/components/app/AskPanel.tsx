"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mic, Square, SendHorizontal, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Stamp } from "@/components/ui/Stamp";
import { usePreferences } from "@/hooks/usePreferences";
import { format } from "@/lib/i18n";
import { languageName, type AppLanguage } from "@/lib/languages";
import type { EvidenceSpan } from "@/lib/types";
import type { AudioApi } from "@/hooks/useAudio";
import type { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { AudioPlayer } from "./AudioPlayer";

type Voice = ReturnType<typeof useVoiceAssistant>;

export function AskPanel({ voice, audio, onShowEvidence, onSwitchLanguage }: { voice: Voice; audio: AudioApi; onShowEvidence: (e: EvidenceSpan) => void; onSwitchLanguage: (l: AppLanguage) => void }) {
  const { t, prefs } = usePreferences();
  const { state } = voice;
  const [typed, setTyped] = useState("");
  const [audioState, setAudioState] = useState<Record<number, { loading: boolean; failed: boolean }>>({});
  const confirmRef = useRef<HTMLTextAreaElement>(null);
  const listEnd = useRef<HTMLDivElement>(null);
  const status = state.status;

  useEffect(() => {
    if (status === "awaiting_confirmation") confirmRef.current?.focus();
  }, [status]);
  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: "nearest" });
  }, [voice.turns.length]);

  const micLabel =
    status === "recording" ? t.micStop : status === "requesting_permission" ? t.micPermission : status === "transcribing" ? t.micTranscribing : status === "processing_question" ? t.micThinking : status === "playing_audio" ? t.micSpeaking : t.micStart;
  const micDisabled = status === "requesting_permission" || status === "transcribing";

  function submitTyped(e: FormEvent) {
    e.preventDefault();
    if (!typed.trim()) return;
    voice.askTyped(typed);
    setTyped("");
  }

  async function listenTo(id: number, text: string, language: AppLanguage) {
    setAudioState((s) => ({ ...s, [id]: { loading: true, failed: false } }));
    const r = await audio.speak(text, language, { autoplay: true, key: `turn-${id}` });
    setAudioState((s) => ({ ...s, [id]: { loading: false, failed: r === "failed" } }));
  }

  const err = state.error;

  return (
    <section aria-labelledby="ask-title" className="flex flex-col">
      <h2 id="ask-title" className="font-display text-2xl">
        {t.askHeading}
      </h2>

      {/* Conversation */}
      <div className="mt-4 space-y-5" aria-live="polite">
        {voice.turns.length === 0 && <p className="text-base text-ink-2">{t.noQuestionsYet}</p>}
        {voice.turns.map((turn) => (
          <div key={turn.id} className="space-y-3">
            <div className="ml-auto max-w-[85%] rounded-[var(--radius-panel)] rounded-br-sm bg-ink px-4 py-2.5 text-lg text-sheet">
              <span className="sr-only">{t.you}: </span>
              {turn.question}
            </div>
            {!turn.answer && !turn.error && (
              <div className="flex items-center gap-2 text-ink-2">
                <span className="size-4 animate-spin rounded-full border-2 border-stamp border-r-transparent" aria-hidden />
                {t.micThinking}
              </div>
            )}
            {turn.error && <p className="text-base text-due">{turn.error}</p>}
            {turn.answer && (
              <div className="max-w-[95%] rounded-[var(--radius-panel)] rounded-bl-sm border border-rule bg-sheet px-4 py-3.5">
                <span className="sr-only">{t.assistant}: </span>
                <p className="text-lg leading-relaxed text-ink">{turn.answer.answer}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Stamp tone={turn.answer.verification === "verified" ? "stamp" : turn.answer.verification === "partial" ? "muted" : "due"}>
                    {turn.answer.verification === "verified" ? t.answerVerified : turn.answer.verification === "partial" ? t.answerPartial : t.answerUnverified}
                  </Stamp>
                  {turn.answer.evidence.slice(0, 3).map((ev) => (
                    <button key={`${ev.start}-${ev.end}`} type="button" onClick={() => onShowEvidence(ev)} className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-full border border-rule bg-sheet-2 px-3 text-sm text-ink-2 hover:border-ink-2 hover:text-ink">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{ev.text.slice(0, 48)}</span>
                    </button>
                  ))}
                </div>
                {turn.answer.unsupportedValues.length > 0 && (
                  <p className="mt-2 text-sm text-due">
                    {t.unsupportedValues} {turn.answer.unsupportedValues.join(", ")}
                  </p>
                )}
                {prefs.voiceEnabled && (
                  <div className="mt-3">
                    <AudioPlayer audio={audio} audioKey={`turn-${turn.id}`} onListen={() => listenTo(turn.id, turn.answer!.answer, turn.language)} loading={!!audioState[turn.id]?.loading} failed={!!audioState[turn.id]?.failed} compact />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={listEnd} />
      </div>

      {voice.languageSuggestion && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] bg-stamp-soft px-4 py-3">
          <p className="flex-1 text-base text-ink">{format(t.languageSwitchSuggest, { lang: languageName(voice.languageSuggestion, true) })}</p>
          <Button variant="primary" onClick={() => { onSwitchLanguage(voice.languageSuggestion!); voice.dismissLanguageSuggestion(); }}>
            {t.switchLanguage}
          </Button>
          <Button variant="quiet" onClick={voice.dismissLanguageSuggestion}>
            {t.keepLanguage}
          </Button>
        </div>
      )}

      {/* Confirm what was heard before sending it */}
      {status === "awaiting_confirmation" && (
        <form
          className="mt-5 rounded-[var(--radius-panel)] border-2 border-stamp bg-sheet p-4"
          onSubmit={(e) => {
            e.preventDefault();
            voice.confirm();
          }}
        >
          <label htmlFor="heard" className="block text-base font-semibold text-ink">
            {t.checkQuestion}
          </label>
          {state.lowConfidence && <p className="mt-1 text-sm text-due">{t.lowConfidence}</p>}
          <textarea
            id="heard"
            ref={confirmRef}
            value={state.transcript}
            onChange={(e) => voice.editTranscript(e.target.value)}
            rows={2}
            className="mt-2 w-full resize-y rounded-[var(--radius-control)] border border-rule-strong bg-sheet-2 px-3 py-2 text-lg text-ink"
          />
          <p className="mt-1 text-sm text-ink-3">{t.editHint}</p>
          <div className="mt-3 flex gap-2">
            <Button type="submit" variant="primary" size="lg" disabled={!state.transcript.trim()}>
              {t.askThis}
            </Button>
            <Button variant="quiet" size="lg" onClick={voice.cancel}>
              {t.cancel}
            </Button>
          </div>
        </form>
      )}

      {err && (
        <div role="alert" className="mt-5 rounded-[var(--radius-control)] bg-due-soft px-4 py-3 text-base text-ink">
          <p className="font-semibold text-due">{err.kind === "permission_denied" ? t.permissionDenied : err.kind === "unsupported_browser" ? t.unsupportedMic : err.kind === "no_speech" ? t.noSpeech : err.kind === "audio_failed" ? t.audioFailed : err.message}</p>
          {err.kind === "permission_denied" && <p className="mt-1">{t.permissionHelp}</p>}
          <button type="button" onClick={voice.dismissError} className="mt-2 min-h-9 font-semibold underline underline-offset-4">
            {t.close}
          </button>
        </div>
      )}

      {voice.turns.length === 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {[t.suggestedQ1, t.suggestedQ2, t.suggestedQ3].map((q) => (
            <button key={q} type="button" onClick={() => voice.askTyped(q)} className="min-h-11 rounded-full border border-rule-strong bg-sheet px-4 text-base text-ink hover:border-ink">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input: big mic first (voice-first), typing always available. */}
      <div className="mt-6 flex flex-col items-center gap-4 border-t border-rule pt-6">
        {prefs.voiceEnabled && voice.micSupported && (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => void voice.pressMic()}
              disabled={micDisabled}
              aria-label={micLabel}
              aria-pressed={status === "recording"}
              className={`grid size-22 place-items-center rounded-full text-sheet shadow-[var(--shadow-lift)] transition-[transform,background-color] duration-200 active:scale-95 disabled:opacity-70 ${status === "recording" ? "recording-ring bg-due" : "bg-stamp"}`}
            >
              {status === "recording" ? <Square className="size-8" aria-hidden /> : micDisabled ? <span className="size-8 animate-spin rounded-full border-3 border-current border-r-transparent" aria-hidden /> : <Mic className="size-9" aria-hidden />}
            </button>
            <p className="text-base font-semibold text-ink" aria-live="polite">
              {micLabel}
            </p>
            {(status === "recording" || status === "transcribing" || status === "processing_question") && (
              <Button variant="quiet" onClick={voice.cancel}>
                {t.cancel}
              </Button>
            )}
          </div>
        )}
        <form onSubmit={submitTyped} className="flex w-full gap-2">
          <label htmlFor="typed-q" className="sr-only">
            {t.askPlaceholder}
          </label>
          <input
            id="typed-q"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            maxLength={1000}
            placeholder={t.askPlaceholder}
            className="min-h-13 min-w-0 flex-1 rounded-[var(--radius-control)] border border-rule-strong bg-sheet px-4 text-lg text-ink placeholder:text-ink-3"
          />
          <Button type="submit" variant="secondary" size="lg" disabled={!typed.trim()} aria-label={t.send}>
            <SendHorizontal className="size-5" aria-hidden />
            <span className="hidden sm:inline">{t.send}</span>
          </Button>
        </form>
      </div>
    </section>
  );
}
