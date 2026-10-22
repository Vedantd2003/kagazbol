"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePreferences } from "@/hooks/usePreferences";
import type { Stage } from "@/hooks/useDocumentPipeline";

const ORDER = ["preparing", "uploading", "reading", "understanding"] as const;

/**
 * Processing is a real sequence, so it is shown as one: each step is ticked only
 * when the server has confirmed it. Upload shows true progress; OCR and the
 * explanation show an indeterminate bar because the provider gives no percentage.
 */
export function ProcessingView({ stage, uploadPct, previewUrl, onCancel }: { stage: Stage; uploadPct: number | null; previewUrl: string | null; onCancel: () => void }) {
  const { t } = usePreferences();
  const labels = { preparing: t.stepPreparing, uploading: t.stepUploading, reading: t.stepReading, understanding: t.stepUnderstanding };
  const current = Math.max(0, ORDER.indexOf(stage as (typeof ORDER)[number]));

  return (
    <section aria-labelledby="processing-title" className="mx-auto grid w-full max-w-3xl gap-8 sm:grid-cols-[minmax(0,13rem)_1fr] sm:items-center">
      {previewUrl && (
        <div className="relative mx-auto aspect-[5/7] w-40 overflow-hidden rounded-[var(--radius-paper)] bg-white shadow-[var(--shadow-lift)] ring-1 ring-rule sm:w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img src={previewUrl} alt="" className="h-full w-full object-cover object-top" />
          {stage === "reading" && <div aria-hidden className="scanline absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-mark/40 to-transparent" />}
        </div>
      )}
      <div>
        <h1 id="processing-title" className="font-display text-2xl sm:text-3xl" aria-live="polite">
          {labels[ORDER[current]]}
        </h1>
        <ol className="mt-6 space-y-3.5">
          {ORDER.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={s} className="flex items-center gap-3" aria-current={active ? "step" : undefined}>
                <span className={`grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${done ? "border-ok bg-ok text-sheet" : active ? "border-stamp text-stamp" : "border-rule-strong text-ink-3"}`}>
                  {done ? <Check className="size-4.5" aria-hidden /> : i + 1}
                </span>
                <span className={`text-lg ${active ? "font-semibold text-ink" : done ? "text-ink-2" : "text-ink-3"}`}>{labels[s]}</span>
                {done && <span className="sr-only">✓</span>}
              </li>
            );
          })}
        </ol>
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-rule" role="progressbar" aria-label={labels[ORDER[current]]} aria-valuemin={0} aria-valuemax={100} aria-valuenow={stage === "uploading" && uploadPct != null ? uploadPct : undefined}>
          {stage === "uploading" && uploadPct != null ? (
            <div className="h-full rounded-full bg-stamp transition-[width] duration-200" style={{ width: `${uploadPct}%` }} />
          ) : (
            <div className="h-full w-2/5 rounded-full bg-stamp" style={{ animation: "indeterminate 1.6s var(--ease-in-out) infinite" }} />
          )}
        </div>
        <p className="mt-3 text-sm text-ink-2">{t.processingNote}</p>
        <Button variant="quiet" onClick={onCancel} className="mt-5 -ml-3">
          {t.cancel}
        </Button>
      </div>
    </section>
  );
}
