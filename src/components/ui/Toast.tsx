"use client";
import { AnimatePresence, motion } from "framer-motion";
import { VARIANTS } from "@/lib/motion";
import type { Toast as ToastItem, ToastType } from "@/hooks/useToast";

const TYPE_CLASSES: Record<ToastType, string> = {
  success: "bg-success-bg text-success border-success",
  error:   "bg-warning-bg text-warning border-warning",
  info:    "bg-card text-foreground border-border",
};

const TYPE_ICON: Record<ToastType, string> = {
  success: "✓",
  error:   "✕",
  info:    "i",
};

const TYPE_ICON_CLASSES: Record<ToastType, string> = {
  success: "bg-success text-white",
  error:   "bg-warning text-white",
  info:    "bg-primary text-primary-foreground",
};

interface SingleToastProps {
  toast: ToastItem;
  onRemove: (id: number) => void;
}

function SingleToast({ toast, onRemove }: SingleToastProps) {
  return (
    <motion.div
      layout
      variants={VARIANTS.slideUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="alert"
      aria-live="polite"
      className={[
        "flex items-start gap-3 w-full max-w-sm mx-auto",
        "rounded-[var(--radius-md)] border px-4 py-3",
        "shadow-[var(--shadow-md)]",
        TYPE_CLASSES[toast.type],
      ].join(" ")}
    >
      <span
        className={[
          "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
          TYPE_ICON_CLASSES[toast.type],
        ].join(" ")}
        aria-hidden="true"
      >
        {TYPE_ICON[toast.type]}
      </span>

      <p className="flex-1 text-sm leading-snug">{toast.message}</p>

      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  removeToast: (id: number) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div
      className="fixed bottom-6 left-0 right-0 flex flex-col gap-2 px-4 pointer-events-none"
      style={{ zIndex: "var(--z-toast)" }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <SingleToast toast={t} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
