"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { UploadCard } from "@/components/UploadCard";
import { SummaryCard } from "@/components/SummaryCard";
import { ChatPanel } from "@/components/ChatPanel";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import type { MicStatus } from "@/components/MicButton";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { UI_STRINGS } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/sarvam/config";
import type { ChatTurn, DocumentSummary } from "@/lib/types";
import {
  askQuestion,
  getParseResult,
  speakText,
  startParse,
  summarizeDocument,
  transcribeAudio,
  waitForParseCompletion,
} from "@/lib/apiClient";

type Stage = "upload" | "uploading" | "reading" | "understanding" | "ready";

export default function Home() {
  const [language, setLanguage] = useState<AppLanguage>("en-IN");
  const [stage, setStage] = useState<Stage>("upload");
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [liveTranscript, setLiveTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorder = useAudioRecorder();
  const player = useAudioPlayer();

  const strings = UI_STRINGS[language];

  const runPipeline = useCallback(
    async (file: File, lang: AppLanguage) => {
      setError(null);
      setHistory([]);
      try {
        setStage("uploading");
        const { jobId } = await startParse(file, lang);

        setStage("reading");
        await waitForParseCompletion(jobId);

        const { ocrText: text } = await getParseResult(jobId);
        setOcrText(text);

        setStage("understanding");
        const { summary: newSummary } = await summarizeDocument(text, lang);
        setSummary(newSummary);
        setStage("ready");

        const audioUrl = await speakText(newSummary.summary_spoken, lang);
        player.play(audioUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.errorGeneric);
        setStage("upload");
      }
    },
    [player, strings.errorGeneric]
  );

  const handleFileSelected = useCallback(
    (file: File) => {
      void runPipeline(file, language);
    },
    [language, runPipeline]
  );

  const handleSampleSelected = useCallback(
    async (sample: { id: string; src: string }) => {
      try {
        const res = await fetch(sample.src);
        const blob = await res.blob();
        const file = new File([blob], `${sample.id}.png`, { type: blob.type || "image/png" });
        void runPipeline(file, language);
      } catch {
        setError(strings.errorGeneric);
      }
    },
    [language, runPipeline, strings.errorGeneric]
  );

  const handleLanguageChange = useCallback(
    async (lang: AppLanguage) => {
      setLanguage(lang);
      if (stage !== "ready" || !ocrText) return;

      setStage("understanding");
      setHistory([]);
      try {
        const { summary: newSummary } = await summarizeDocument(ocrText, lang);
        setSummary(newSummary);
        setStage("ready");
        const audioUrl = await speakText(newSummary.summary_spoken, lang);
        player.play(audioUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.errorGeneric);
        setStage("ready");
      }
    },
    [stage, ocrText, player, strings.errorGeneric]
  );

  const handleMicClick = useCallback(async () => {
    if (player.isSpeaking) {
      player.stop();
      return;
    }

    if (micStatus === "idle") {
      setError(null);
      setLiveTranscript(null);
      try {
        await recorder.start();
        setMicStatus("recording");
      } catch {
        setError(strings.errorGeneric);
      }
      return;
    }

    if (micStatus === "recording") {
      const blob = await recorder.stop();
      setMicStatus("transcribing");
      try {
        const transcript = await transcribeAudio(blob);
        setLiveTranscript(transcript);

        if (!ocrText || !summary) throw new Error(strings.errorGeneric);

        setMicStatus("thinking");
        const { answer } = await askQuestion(ocrText, summary, language, history, transcript);

        const newHistory: ChatTurn[] = [
          ...history,
          { role: "user", content: transcript },
          { role: "assistant", content: answer },
        ];
        setHistory(newHistory);
        setLiveTranscript(null);

        const audioUrl = await speakText(answer, language);
        player.play(audioUrl);
        setMicStatus("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.errorGeneric);
        setMicStatus("idle");
      }
    }
  }, [micStatus, recorder, player, ocrText, summary, language, history, strings.errorGeneric]);

  // While audio is playing (summary autoplay or a chat reply), show the
  // "speaking" state on the mic button regardless of micStatus.
  const displayStatus: MicStatus = player.isSpeaking ? "speaking" : micStatus;

  const handleNewDocument = useCallback(() => {
    player.stop();
    setStage("upload");
    setOcrText(null);
    setSummary(null);
    setHistory([]);
    setError(null);
    setMicStatus("idle");
  }, [player]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-8">
      <header className="flex w-full max-w-md items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">{strings.appName}</h1>
          <p className="text-sm text-muted-foreground">{strings.tagline}</p>
        </div>
        <LanguageSwitcher value={language} onChange={handleLanguageChange} />
      </header>

      <main className="mt-8 flex w-full flex-1 flex-col items-center gap-6">
        {error && (
          <div className="w-full max-w-md rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {stage === "upload" && (
            <UploadCard
              key="upload"
              strings={strings}
              onFileSelected={handleFileSelected}
              onSampleSelected={handleSampleSelected}
            />
          )}

          {stage === "uploading" && <ProcessingStatus key="uploading" label={strings.stepUploading} />}
          {stage === "reading" && <ProcessingStatus key="reading" label={strings.stepReadingDocument} />}
          {stage === "understanding" && (
            <ProcessingStatus key="understanding" label={strings.stepUnderstanding} />
          )}

          {stage === "ready" && summary && (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex w-full flex-col items-center gap-6"
            >
              <SummaryCard summary={summary} strings={strings} />

              <ChatPanel
                strings={strings}
                history={history}
                status={displayStatus}
                liveTranscript={liveTranscript}
                errorMessage={null}
                onMicClick={handleMicClick}
              />

              <button
                type="button"
                onClick={handleNewDocument}
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
              >
                {strings.newDocument}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
