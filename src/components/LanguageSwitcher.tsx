"use client";

import { SUPPORTED_LANGUAGES, type AppLanguage } from "@/lib/sarvam/config";

export function LanguageSwitcher({
  value,
  onChange,
}: {
  value: AppLanguage;
  onChange: (lang: AppLanguage) => void;
}) {
  return (
    <div className="flex gap-1 rounded-full bg-muted p-1">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => onChange(lang.code)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            value === lang.code
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={value === lang.code}
        >
          {lang.nativeLabel}
        </button>
      ))}
    </div>
  );
}
