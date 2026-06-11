"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { UiStrings } from "@/lib/i18n";
import type { DocumentSummary } from "@/lib/types";

export function SummaryCard({
  summary,
  strings,
}: {
  summary: DocumentSummary;
  strings: UiStrings;
}) {
  const [expanded, setExpanded] = useState(false);

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

      <h2 className="mt-3 text-2xl font-bold leading-tight">{summary.title}</h2>

      {summary.amounts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {summary.amounts.map((amount, i) => (
            <div key={i} className="rounded-2xl bg-muted px-4 py-2">
              <p className="text-xs text-muted-foreground">{amount.label}</p>
              <p className="text-lg font-bold text-primary">{amount.value}</p>
            </div>
          ))}
        </div>
      )}

      {summary.deadline && (
        <div className="mt-3 rounded-2xl bg-accent/15 px-4 py-2">
          <p className="text-xs text-muted-foreground">{strings.deadlineLabel}</p>
          <p className="text-base font-semibold text-accent">{summary.deadline}</p>
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
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {strings.fullDetails}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
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
