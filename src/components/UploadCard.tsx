"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import type { UiStrings } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/sarvam/config";
import { SUPPORTED_LANGUAGES } from "@/lib/sarvam/config";

interface SampleDoc {
  id: string;
  src: string;
  labelKey: keyof Pick<UiStrings, "sampleBill" | "samplePrescription" | "sampleBankNotice">;
}

const SAMPLE_DOCS: SampleDoc[] = [
  { id: "electricity-bill", src: "/samples/electricity-bill.png", labelKey: "sampleBill" },
  { id: "prescription", src: "/samples/prescription.png", labelKey: "samplePrescription" },
  { id: "bank-notice", src: "/samples/bank-notice.png", labelKey: "sampleBankNotice" },
];

export function UploadCard({
  strings,
  language,
  onLanguageChange,
  onFileSelected,
  onSampleSelected,
}: {
  strings: UiStrings;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  onFileSelected: (file: File) => void;
  onSampleSelected: (sample: { id: string; src: string }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm"
    >
      <h2 className="text-xl font-semibold">{strings.uploadTitle}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{strings.uploadHint}</p>

      {/* Language picker — inside card for discoverability */}
      <div className="mt-4 flex gap-2" role="group" aria-label="Select language">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            role="button"
            aria-label={`Select ${lang.label}`}
            aria-pressed={language === lang.code}
            onClick={() => onLanguageChange(lang.code)}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              language === lang.code
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {lang.nativeLabel}
          </button>
        ))}
      </div>

      {/* Camera / file buttons — large for touch */}
      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          role="button"
          aria-label={strings.takePhoto}
          onClick={() => cameraInputRef.current?.click()}
          className="flex min-h-[72px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95"
        >
          {/* Camera icon */}
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6"
          >
            <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
            <path
              fillRule="evenodd"
              d="M9.341 3.612A1 1 0 0 1 10.23 3h3.54a1 1 0 0 1 .894.553l.812 1.624A1 1 0 0 0 16.369 5.7H18a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8.7a3 3 0 0 1 3-3h1.631a1 1 0 0 0 .894-.553l.816-1.535ZM12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7Z"
              clipRule="evenodd"
            />
          </svg>
          {strings.takePhoto}
        </button>

        <button
          type="button"
          role="button"
          aria-label={strings.chooseFile}
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-[56px] w-full items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-transform active:scale-95"
        >
          {strings.chooseFile}
        </button>
      </div>

      {/* Privacy note */}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-3.5 w-3.5 flex-shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
            clipRule="evenodd"
          />
        </svg>
        {strings.privacyNote}
      </p>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = "";
        }}
      />

      {/* Sample thumbnails */}
      <div className="mt-6">
        <p className="text-sm text-muted-foreground">{strings.trySample}</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {SAMPLE_DOCS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              role="button"
              aria-label={`Try sample: ${strings[sample.labelKey]}`}
              onClick={() => onSampleSelected(sample)}
              className="group flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted p-2 transition-colors hover:border-primary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sample.src}
                alt={strings[sample.labelKey]}
                className="h-16 w-full rounded-lg object-cover"
              />
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                {strings[sample.labelKey]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
