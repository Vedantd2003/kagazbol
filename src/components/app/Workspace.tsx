"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import { useAudio } from "@/hooks/useAudio";
import { useDocumentPipeline, errorMessage } from "@/hooks/useDocumentPipeline";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import type { AppLanguage } from "@/lib/languages";
import type { EvidenceSpan } from "@/lib/types";
import { AppHeader } from "./AppHeader";
import { SettingsDrawer } from "./SettingsDrawer";
import { UploadPanel } from "./UploadPanel";
import { ProcessingView } from "./ProcessingView";
import { QualityNotice, ErrorPanel } from "./Notices";
import { ExplanationPane } from "./ExplanationPane";
import { DocumentPane } from "./DocumentPane";
import { AskPanel } from "./AskPanel";
import { AudioPlayer } from "./AudioPlayer";

type MobileTab = "explanation" | "document" | "ask";

export function Workspace() {
  const { prefs, loaded, update, t } = usePreferences();
  const audio = useAudio(prefs.playbackRate);
  const pipeline = useDocumentPipeline();
  const { state: doc } = pipeline;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [highlight, setHighlight] = useState<EvidenceSpan | null>(null);
  const [tab, setTab] = useState<MobileTab>("explanation");
  const [summaryAudio, setSummaryAudio] = useState({ loading: false, failed: false });
  const autoPlayed = useRef(new Set<string>());
  const guided = useRef(false);

  // Show the newest explanation available; while re-explaining in a new language keep the old one visible.
  const entry = doc.summaries[prefs.language] ?? Object.values(doc.summaries)[0] ?? null;
  const entryLanguage = (doc.summaries[prefs.language] ? prefs.language : (Object.keys(doc.summaries)[0] as AppLanguage | undefined)) ?? prefs.language;

  const voice = useVoiceAssistant({
    docId: doc.docId,
    ocrText: doc.ocrText,
    summary: entry?.summary ?? null,
    language: prefs.language,
    voiceEnabled: prefs.voiceEnabled,
    autoPlay: prefs.autoPlay,
    audio,
    t,
  });

  const summaryKey = `summary:${doc.docId}:${entryLanguage}`;
  const playSummary = useCallback(
    async (autoplay: boolean) => {
      if (!entry) return;
      setSummaryAudio({ loading: true, failed: false });
      const r = await audio.speak(entry.summary.summary_spoken, entryLanguage, { autoplay, key: summaryKey });
      setSummaryAudio({ loading: false, failed: r === "failed" });
    },
    [audio, entry, entryLanguage, summaryKey]
  );

  // Read the explanation aloud once when it first arrives (if the user wants that).
  useEffect(() => {
    if (doc.stage !== "ready" || !entry || !prefs.voiceEnabled || !prefs.autoPlay || doc.resummarizing) return;
    if (autoPlayed.current.has(summaryKey)) return;
    autoPlayed.current.add(summaryKey);
    void playSummary(true);
  }, [doc.stage, entry, prefs.voiceEnabled, prefs.autoPlay, doc.resummarizing, summaryKey, playSummary]);

  // Optional spoken guidance on the upload screen.
  useEffect(() => {
    if (!loaded || doc.stage !== "idle" || guided.current || !prefs.voiceEnabled || !prefs.spokenGuidance) return;
    guided.current = true;
    void audio.speak(t.guidance, prefs.language, { autoplay: true, key: "guidance" });
  }, [loaded, doc.stage, prefs.voiceEnabled, prefs.spokenGuidance, prefs.language, t.guidance, audio]);

  // Turning voice off stops anything that is playing.
  useEffect(() => {
    if (!prefs.voiceEnabled) audio.stop();
  }, [prefs.voiceEnabled, audio]);

  const changeLanguage = (l: AppLanguage) => {
    audio.stop();
    update({ language: l });
    void pipeline.ensureLanguage(l);
  };

  const newDocument = () => {
    audio.clear();
    setHighlight(null);
    setTab("explanation");
    pipeline.reset();
  };

  const showEvidence = (e: EvidenceSpan) => {
    setHighlight(e);
    setTab("document");
  };

  const ready = doc.stage === "ready" && entry && doc.ocrText;
  const player = entry ? <AudioPlayer audio={audio} audioKey={summaryKey} onListen={() => playSummary(true)} loading={summaryAudio.loading} failed={summaryAudio.failed} /> : null;

  return (
    <>
      <a href="#main" className="sr-only-focusable fixed top-2 left-2 z-50 rounded bg-ink px-3 py-2 text-sheet">
        {t.skipToContent}
      </a>
      <AppHeader onLanguage={changeLanguage} onSettings={() => setSettingsOpen(true)} onNewDocument={newDocument} showNew={doc.stage !== "idle"} languageBusy={!!doc.resummarizing} />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {doc.stage === "idle" && <UploadPanel onFile={(f) => pipeline.selectFile(f, prefs.language)} onHearGuidance={() => audio.speak(t.guidance, prefs.language, { autoplay: true, key: "guidance" })} guidanceAvailable={prefs.voiceEnabled} />}

        {doc.stage === "checking" && (
          <p className="text-center text-lg text-ink-2" role="status">
            {t.stepPreparing}…
          </p>
        )}

        {doc.stage === "quality_warning" && (
          <QualityNotice hints={doc.imageIssues.map((i) => t.qualityHints[i])} previewUrl={doc.previewUrl} onContinue={() => pipeline.continueAnyway(prefs.language)} onRetake={newDocument} />
        )}

        {(doc.stage === "preparing" || doc.stage === "uploading" || doc.stage === "reading" || doc.stage === "understanding") && (
          <ProcessingView stage={doc.stage} uploadPct={doc.uploadPct} previewUrl={doc.previewUrl} onCancel={newDocument} />
        )}

        {doc.stage === "error" && doc.error && <ErrorPanel message={errorMessage(doc.error, t, prefs.language)} onRetry={doc.error.kind === "invalid_file" ? undefined : () => pipeline.retry(prefs.language)} onStartOver={newDocument} />}

        {ready && (
          <>
            {/* Phone/tablet: one column with tabs. */}
            <div role="tablist" aria-label={t.tabExplanation} className="sticky top-[61px] z-20 -mx-4 mb-5 flex border-b border-rule bg-paper px-2 lg:hidden">
              {(["explanation", "document", "ask"] as const).map((k) => (
                <button
                  key={k}
                  role="tab"
                  type="button"
                  id={`tab-${k}`}
                  aria-controls={`panel-${k}`}
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={`-mb-px min-h-12 flex-1 border-b-[3px] text-base font-semibold ${tab === k ? "border-stamp text-ink" : "border-transparent text-ink-2"}`}
                >
                  {k === "explanation" ? t.tabExplanation : k === "document" ? t.tabDocument : t.tabAsk}
                </button>
              ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
              <div id="panel-document" role="tabpanel" aria-labelledby="tab-document" className={`${tab === "document" ? "block" : "hidden"} lg:sticky lg:top-[84px] lg:block lg:h-[calc(100dvh-110px)]`}>
                <DocumentPane ocrText={doc.ocrText!} previewUrl={doc.previewUrl} highlight={highlight} audio={audio} onClearHighlight={() => setHighlight(null)} />
              </div>
              <div className="min-w-0 space-y-12">
                <div id="panel-explanation" role="tabpanel" aria-labelledby="tab-explanation" className={`${tab === "explanation" ? "block" : "hidden"} lg:block`}>
                  <ExplanationPane entry={entry} detected={doc.detected} qualityIssues={doc.qualityIssues} resummarizing={!!doc.resummarizing} player={player} onShowEvidence={showEvidence} />
                </div>
                <div id="panel-ask" role="tabpanel" aria-labelledby="tab-ask" className={`${tab === "ask" ? "block" : "hidden"} border-rule lg:block lg:border-t lg:pt-10`}>
                  <AskPanel voice={voice} audio={audio} onShowEvidence={showEvidence} onSwitchLanguage={changeLanguage} />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
