"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import type { UiStrings } from "@/lib/i18n";

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
  onFileSelected,
  onSampleSelected,
}: {
  strings: UiStrings;
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

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95"
        >
          {strings.takePhoto}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-transform active:scale-95"
        >
          {strings.chooseFile}
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
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
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = "";
        }}
      />

      <div className="mt-6">
        <p className="text-sm text-muted-foreground">{strings.trySample}</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {SAMPLE_DOCS.map((sample) => (
            <button
              key={sample.id}
              type="button"
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
