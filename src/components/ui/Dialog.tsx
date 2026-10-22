"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Native <dialog> as a bottom sheet on phones and a side drawer on larger
 * screens. Native dialog gives focus trapping, Esc to close and inert background.
 */
export function Drawer({ open, onClose, title, closeLabel, children }: { open: boolean; onClose: () => void; title: string; closeLabel: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="drawer-title"
      className="drawer m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-[var(--radius-panel)] bg-sheet p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-ink/40 sm:mt-0 sm:ml-auto sm:h-dvh sm:max-h-none sm:w-[26rem] sm:rounded-none"
    >
      <div className="flex items-center justify-between border-b border-rule px-5 py-4">
        <h2 id="drawer-title" className="font-display text-xl">
          {title}
        </h2>
        <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full text-ink-2 hover:bg-sheet-2 hover:text-ink" aria-label={closeLabel}>
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="px-5 py-5">{children}</div>
    </dialog>
  );
}
