"use client";

import { motion } from "framer-motion";
import type { UiStrings } from "@/lib/i18n";
import type { ChatTurn } from "@/lib/types";
import { MicButton, type MicStatus } from "./MicButton";

const STATUS_LABEL: Record<MicStatus, keyof UiStrings> = {
  idle: "micIdle",
  recording: "micRecording",
  transcribing: "micTranscribing",
  thinking: "micThinking",
  speaking: "micSpeaking",
};

export function ChatPanel({
  strings,
  history,
  status,
  liveTranscript,
  errorMessage,
  onMicClick,
}: {
  strings: UiStrings;
  history: ChatTurn[];
  status: MicStatus;
  liveTranscript: string | null;
  errorMessage: string | null;
  onMicClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
      className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm"
    >
      <h3 className="text-base font-semibold">{strings.askSomething}</h3>

      {history.length > 0 && (
        <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
          {history.map((turn, i) => (
            <div key={i} className={turn.role === "user" ? "text-right" : "text-left"}>
              <p className="text-xs font-medium text-muted-foreground">
                {turn.role === "user" ? strings.you : strings.assistant}
              </p>
              <p
                className={`mt-0.5 inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  turn.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {turn.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {liveTranscript && (
        <p className="mt-3 text-right text-sm italic text-muted-foreground">&ldquo;{liveTranscript}&rdquo;</p>
      )}

      {errorMessage && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      )}

      <div className="mt-5 flex justify-center">
        <MicButton status={status} onClick={onMicClick} label={strings[STATUS_LABEL[status]]} />
      </div>
    </motion.div>
  );
}
