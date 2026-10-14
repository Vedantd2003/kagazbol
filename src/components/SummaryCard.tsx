"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { UiStrings } from "@/lib/i18n";
import type { DocumentSummary } from "@/lib/types";

/** Returns true if the date string represents a date within 7 days from now. */
function isWithinSevenDays(dateStr: string | null): boolean {
  if (!dateStr) return false;
  // Try dd/mm/yyyy or dd-mm-yyyy
  const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!match) return false;

  const [, d, m, y] = match;
  const year = parseInt(y, 10) < 100 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
  const date = new Date(year, parseInt(m, 10) - 1, parseInt(d, 10));
  if (isNaN(date.getTime())) return false;

  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return date.getTime() - now.getTime() <= sevenDaysMs && date.getTime() >= now.getTime();
}

export function SummaryCard({
  summary,
  strings,
  onPlayAgain,
}: {
  summary: DocumentSummary;
  strings: UiStrings;
  onPlayAgain?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const deadlineUrgent = isWithinSevenDays(summary.deadline);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm"
    >
      <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        {summary.document_type}
      </span>

      <div className="mt-3 flex items-start justify-between gap-2">
        <h2 className="text-2xl font-bold leading-tight">{summary.title}</h2>

        {onPlayAgain && (
          <button
            type="button"
            onClick={onPlayAgain}
            aria-label={strings.playAgain}
            className="flex-shrink-0 flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                fillRule="evenodd"
                d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                clipRule="evenodd"
              />
            </svg>
            {strings.playAgain}
          </button>
        )}
      </div>

      {/* Amounts — text-accent (amber), high contrast */}
      {summary.amounts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {summary.amounts.map((amount, i) => (
            <div key={i} className="rounded-2xl bg-muted px-4 py-2">
              <p className="text-xs text-muted-foreground">{amount.label}</p>
              <p className="text-2xl font-bold text-accent">{amount.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Deadline — warning color if within 7 days */}
      {summary.deadline && (
        <div
          className={`mt-3 rounded-2xl px-4 py-2 ${
            deadlineUrgent ? "bg-warning/10" : "bg-accent/10"
          }`}
        >
          <p className="text-xs text-muted-foreground">{strings.deadlineLabel}</p>
          <p
            className={`text-base font-semibold ${
              deadlineUrgent ? "text-warning" : "text-accent"
            }`}
          >
            {summary.deadline}
          </p>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-border px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground">{strings.actionRequiredLabel}</p>
        <p className="mt-1 text-sm">{summary.action_required}</p>
      </div>

      {summary.key_facts.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {summary.key_facts.map((fact, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      )}

      {summary.dates.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {strings.fullDetails}
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          >
            ▾
          </motion.span>
        </button>
      )}

      <AnimatePresence initial={false}>
        {expanded && summary.dates.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">{strings.datesLabel}</p>
              {summary.dates.map((date, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{date.label}</span>
                  <span className="font-medium">{date.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
