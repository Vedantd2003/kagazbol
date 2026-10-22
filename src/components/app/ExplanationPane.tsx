"use client";

import { AlertTriangle, Info, MapPin } from "lucide-react";
import { Stamp } from "@/components/ui/Stamp";
import { usePreferences } from "@/hooks/usePreferences";
import { languageName } from "@/lib/languages";
import type { DetectLanguageResponse, EvidenceSpan, FieldCheck } from "@/lib/types";
import type { SummaryEntry } from "@/hooks/useDocumentPipeline";
import type { QualityIssue } from "@/lib/quality";
import type { ReactNode } from "react";

function Verified({ check, onShow }: { check: FieldCheck | undefined; onShow: (e: EvidenceSpan) => void }) {
  const { t } = usePreferences();
  if (!check) return null;
  if (!check.found || !check.evidence) {
    return <Stamp tone="due">{t.notVerified}</Stamp>;
  }
  const ev = check.evidence;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <Stamp>{t.verified}</Stamp>
      <button type="button" onClick={() => onShow(ev)} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-stamp underline-offset-4 hover:underline">
        <MapPin className="size-3.5" aria-hidden />
        {t.showInDocument}
      </button>
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-rule pt-5">
      <h3 className="text-base font-semibold text-ink-2">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ExplanationPane({
  entry,
  detected,
  qualityIssues,
  resummarizing,
  player,
  onShowEvidence,
}: {
  entry: SummaryEntry;
  detected: DetectLanguageResponse | null;
  qualityIssues: QualityIssue[];
  resummarizing: boolean;
  player: ReactNode;
  onShowEvidence: (e: EvidenceSpan) => void;
}) {
  const { t, prefs } = usePreferences();
  const { summary, checks, fallback } = entry;
  const check = (field: FieldCheck["field"], index = 0) => checks.find((c) => c.field === field && c.index === index);
  const deadlineCheck = check("deadline");

  return (
    <article aria-labelledby="doc-title" aria-busy={resummarizing || undefined} className={`transition-opacity duration-200 ${resummarizing ? "opacity-55" : ""}`}>
      <p className="text-base text-ink-2">{summary.document_type}</p>
      <h2 id="doc-title" className="mt-1 font-display text-3xl text-ink sm:text-4xl">
        {summary.title}
      </h2>
      {resummarizing && (
        <p role="status" className="mt-2 text-sm font-semibold text-stamp">
          {t.reexplaining}
        </p>
      )}

      <p className="mt-5 max-w-prose text-xl leading-relaxed text-ink">{summary.summary_spoken}</p>
      <div className="mt-5">{player}</div>

      {fallback && (
        <p className="mt-5 flex gap-2.5 rounded-[var(--radius-control)] bg-mark-soft px-4 py-3 text-base text-ink">
          <Info className="mt-1 size-4.5 shrink-0" aria-hidden />
          {t.fallbackNotice}
        </p>
      )}

      {(summary.deadline || summary.action_required) && (
        <div className="mt-7 grid gap-5 rounded-[var(--radius-panel)] border-2 border-ink p-5 sm:grid-cols-[auto_1fr] sm:gap-8">
          {summary.deadline && (
            <div>
              <p className="text-sm font-semibold text-ink-2">{t.deadlineLabel}</p>
              <p className="mt-1 font-display text-3xl text-due">{summary.deadline}</p>
              <div className="mt-2">
                <Verified check={deadlineCheck} onShow={onShowEvidence} />
              </div>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-ink-2">{t.actionRequiredLabel}</p>
            <p className="mt-1 text-lg text-ink">{summary.action_required}</p>
          </div>
        </div>
      )}

      <div className="mt-7 space-y-6">
        {summary.warnings.length > 0 && (
          <Section title={t.warningsLabel}>
            <ul className="space-y-2">
              {summary.warnings.map((w) => (
                <li key={w} className="flex gap-2.5 text-lg text-ink">
                  <AlertTriangle className="mt-1.5 size-4.5 shrink-0 text-due" aria-hidden />
                  {w}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {summary.amounts.length > 0 && (
          <Section title={t.amountsLabel}>
            <dl className="divide-y divide-rule">
              {summary.amounts.map((a, i) => (
                <div key={`${a.label}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 py-3">
                  <dt className="text-base text-ink-2">{a.label}</dt>
                  <dd className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
                    <span className="text-xl font-bold tabular-nums text-ink">{a.value}</span>
                    <Verified check={check("amount", i)} onShow={onShowEvidence} />
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {summary.dates.length > 0 && (
          <Section title={t.datesLabel}>
            <dl className="divide-y divide-rule">
              {summary.dates.map((d, i) => (
                <div key={`${d.label}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 py-3">
                  <dt className="text-base text-ink-2">{d.label}</dt>
                  <dd className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
                    <span className="text-lg font-semibold text-ink">{d.value}</span>
                    <Verified check={check("date", i)} onShow={onShowEvidence} />
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {summary.key_facts.length > 0 && (
          <Section title={t.keyFactsLabel}>
            <ul className="list-disc space-y-1.5 pl-5 text-lg text-ink marker:text-ink-3">
              {summary.key_facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Section>
        )}

        {(detected?.languageCode || qualityIssues.length > 0) && (
          <section className="space-y-2 border-t border-rule pt-5 text-sm text-ink-2">
            {detected?.languageCode && (
              <p>
                {t.documentLanguage}: <span className="font-semibold text-ink">{languageName(detected.languageCode, prefs.language !== "en-IN")}</span>
                {!detected.explainable && <> — {t.detectedNotExplainable}</>}
              </p>
            )}
            {qualityIssues.length > 0 && (
              <div>
                <p className="font-semibold text-ink">{t.qualityWarningsTitle}</p>
                <ul className="mt-1 list-disc pl-5">
                  {qualityIssues.map((q) => (
                    <li key={q}>{t.qualityHints[q]}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <p className="border-t border-rule pt-5 text-sm text-ink-3">{t.notAdvice}</p>
      </div>
    </article>
  );
}
