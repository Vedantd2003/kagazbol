"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePreferences } from "@/hooks/usePreferences";

export function QualityNotice({ hints, previewUrl, onContinue, onRetake }: { hints: string[]; previewUrl: string | null; onContinue: () => void; onRetake: () => void }) {
  const { t } = usePreferences();
  return (
    <section aria-labelledby="quality-title" className="sheet mx-auto grid w-full max-w-3xl gap-6 p-6 sm:grid-cols-[10rem_1fr] sm:p-8">
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL
        <img src={previewUrl} alt="" className="mx-auto aspect-[5/7] w-32 rounded-[var(--radius-paper)] object-cover object-top ring-1 ring-rule sm:w-full" />
      )}
      <div>
        <h1 id="quality-title" className="flex items-center gap-2.5 font-display text-2xl">
          <AlertTriangle className="size-6 shrink-0 text-due" aria-hidden />
          {t.qualityTitle}
        </h1>
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-lg text-ink-2">
          {hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="primary" size="lg" onClick={onRetake}>
            {t.chooseAnother}
          </Button>
          <Button variant="secondary" size="lg" onClick={onContinue}>
            {t.continueAnyway}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ErrorPanel({ message, onRetry, onStartOver }: { message: string; onRetry?: () => void; onStartOver: () => void }) {
  const { t } = usePreferences();
  return (
    <section role="alert" aria-labelledby="error-title" className="sheet mx-auto w-full max-w-2xl border-l-4 border-due p-6 sm:p-8">
      <h1 id="error-title" className="font-display text-2xl">
        {t.errorTitle}
      </h1>
      <p className="mt-3 text-lg text-ink-2">{message}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {onRetry && (
          <Button variant="primary" size="lg" onClick={onRetry}>
            <RotateCcw className="size-5" aria-hidden />
            {t.retry}
          </Button>
        )}
        <Button variant="secondary" size="lg" onClick={onStartOver}>
          {t.startOver}
        </Button>
      </div>
    </section>
  );
}
