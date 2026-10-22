"use client";

import { useRef, useState, type DragEvent } from "react";
import { Camera, ImageUp, Volume2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { usePreferences } from "@/hooks/usePreferences";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";
const MAX_BYTES = 10 * 1024 * 1024;

const SAMPLES = [
  { id: "electricity-bill", src: "/samples/electricity-bill.png", key: "sampleBill" },
  { id: "prescription", src: "/samples/prescription.png", key: "samplePrescription" },
  { id: "bank-notice", src: "/samples/bank-notice.png", key: "sampleBankNotice" },
] as const;

export function UploadPanel({ onFile, onHearGuidance, guidanceAvailable }: { onFile: (f: File) => void; onHearGuidance: () => void; guidanceAvailable: boolean }) {
  const { t } = usePreferences();
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);

  function accept(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
      setProblem(t.unsupportedFile);
      return;
    }
    if (file.size > MAX_BYTES) {
      setProblem(t.fileTooLarge);
      return;
    }
    setProblem(null);
    onFile(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    accept(e.dataTransfer.files?.[0]);
  }

  async function pickSample(id: string, src: string) {
    setLoadingSample(id);
    try {
      const blob = await (await fetch(src)).blob();
      onFile(new File([blob], `${id}.png`, { type: blob.type || "image/png" }));
    } catch {
      setProblem(t.errorNetwork);
    } finally {
      setLoadingSample(null);
    }
  }

  return (
    <section aria-labelledby="upload-title" className="mx-auto w-full max-w-3xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`sheet relative px-6 pt-8 pb-7 transition-[outline-color] sm:px-10 sm:pt-11 ${dragging ? "outline-3 outline-dashed outline-offset-[-10px] outline-stamp" : "outline-0"}`}
      >
        <h1 id="upload-title" className="font-display text-3xl text-ink sm:text-4xl">
          {t.uploadTitle}
        </h1>
        <p className="mt-3 max-w-[34rem] text-lg text-ink-2">{t.uploadHint}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="primary" size="xl" onClick={() => cameraRef.current?.click()} className="sm:flex-1">
            <Camera className="size-6" aria-hidden />
            {t.takePhoto}
          </Button>
          <Button variant="secondary" size="xl" onClick={() => pickerRef.current?.click()} className="sm:flex-1">
            <ImageUp className="size-6" aria-hidden />
            {t.chooseFile}
          </Button>
        </div>
        <input ref={cameraRef} type="file" accept={ACCEPT} capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => accept(e.target.files?.[0])} />
        <input ref={pickerRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => accept(e.target.files?.[0])} />
        <p className="mt-3 text-sm text-ink-3">
          <span className="hidden sm:inline">{t.dropHere}. </span>
          {t.supportedFormats}
        </p>

        {problem && (
          <p role="alert" className="mt-4 rounded-[var(--radius-control)] bg-due-soft px-4 py-3 text-base text-due">
            {problem}
          </p>
        )}

        {guidanceAvailable && (
          <button type="button" onClick={onHearGuidance} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-1 font-semibold text-stamp underline-offset-4 hover:underline">
            <Volume2 className="size-5" aria-hidden />
            {t.listenToInstructions}
          </button>
        )}

        <div className="mt-8 border-t border-rule pt-6">
          <h2 className="text-base font-semibold text-ink">{t.trySample}</h2>
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:gap-5">
            {SAMPLES.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => pickSample(s.id, s.src)}
                  disabled={!!loadingSample}
                  className="group flex w-full flex-col items-start gap-2 text-left disabled:opacity-60"
                >
                  <span className="relative block aspect-[5/7] w-full overflow-hidden rounded-[var(--radius-paper)] bg-white shadow-[var(--shadow-sheet)] ring-1 ring-rule transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:rotate-[-0.6deg]">
                    <Image src={s.src} alt="" fill sizes="(max-width: 640px) 30vw, 200px" className="object-cover object-top" />
                    {loadingSample === s.id && <span className="absolute inset-0 grid place-items-center bg-sheet/70"><span className="size-6 animate-spin rounded-full border-2 border-stamp border-r-transparent" /></span>}
                  </span>
                  <span className="text-sm font-semibold leading-tight text-ink-2 group-hover:text-ink">{t[s.key]}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink-3">{t.sampleNote}</p>
        </div>
      </div>

      <p className="mt-5 flex items-start gap-2.5 px-1 text-sm text-ink-2">
        <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-ok" aria-hidden />
        {t.privacyNote}
      </p>
    </section>
  );
}
