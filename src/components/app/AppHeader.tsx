"use client";

import { Settings2, FilePlus2 } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { usePreferences } from "@/hooks/usePreferences";
import type { AppLanguage } from "@/lib/languages";

export function AppHeader({ onLanguage, onSettings, onNewDocument, showNew, languageBusy }: { onLanguage: (l: AppLanguage) => void; onSettings: () => void; onNewDocument: () => void; showNew: boolean; languageBusy?: boolean }) {
  const { prefs, t } = usePreferences();
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <Wordmark />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {showNew && (
            <button type="button" onClick={onNewDocument} className="hidden min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-ink-2 hover:bg-sheet hover:text-ink sm:inline-flex">
              <FilePlus2 className="size-4.5" aria-hidden />
              {t.newDocument}
            </button>
          )}
          <LanguageSwitch value={prefs.language} onChange={onLanguage} label={t.languageLabel} busy={languageBusy} />
          <button type="button" onClick={onSettings} className="grid size-11 place-items-center rounded-[var(--radius-control)] text-ink-2 hover:bg-sheet hover:text-ink" aria-label={t.settings}>
            <Settings2 className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
