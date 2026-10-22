"use client";

import { SUPPORTED_LANGUAGES } from "@/lib/sarvam/config";
import type { AppLanguage } from "@/lib/languages";

/**
 * Always-visible language control. Native names, large targets, and the choice
 * applies to the interface, explanations, answers and speech at once.
 */
export function LanguageSwitch({ value, onChange, label, busy }: { value: AppLanguage; onChange: (l: AppLanguage) => void; label: string; busy?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} aria-busy={busy || undefined} className="inline-flex rounded-[var(--radius-control)] border border-rule-strong bg-sheet p-0.5">
      {SUPPORTED_LANGUAGES.map((l) => {
        const active = l.code === value;
        return (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={active}
            lang={l.code === "en-IN" ? "en" : l.code.slice(0, 2)}
            onClick={() => !active && onChange(l.code)}
            className={`min-h-10 min-w-11 rounded-[8px] px-2.5 text-sm font-semibold transition-colors duration-150 sm:px-3 ${active ? "bg-ink text-sheet" : "text-ink-2 hover:bg-sheet-2 hover:text-ink"}`}
          >
            {l.nativeLabel}
          </button>
        );
      })}
    </div>
  );
}
