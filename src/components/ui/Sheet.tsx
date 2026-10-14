"use client";
import { AnimatePresence, motion } from "framer-motion";
import { VARIANTS, DURATION, EASE } from "@/lib/motion";
import type { MotionTier } from "@/hooks/useMotionTier";
import { useEffect } from "react";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  tier?: MotionTier;
}

export function Sheet({ isOpen, onClose, title, children, tier = "full" }: SheetProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const sheetVariants =
    tier === "reduced"
      ? {
          hidden:  { opacity: 0 },
          visible: { opacity: 1 },
          exit:    { opacity: 0 },
        }
      : VARIANTS.slideUp;

  const backdropVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { duration: DURATION.base / 1000, ease: EASE.gentle } },
    exit:    { opacity: 0, transition: { duration: DURATION.base / 1000, ease: EASE.gentle } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            style={{ zIndex: "var(--z-overlay)" }}
            aria-hidden="true"
          />

          {/* Sheet panel */}
          <motion.div
            key="sheet"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag={tier !== "reduced" ? "y" : undefined}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 80) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={[
              "fixed bottom-0 left-0 right-0 bg-card rounded-t-[var(--radius-xl)]",
              "border-t border-border shadow-[var(--shadow-lg)]",
              "flex flex-col max-h-[90dvh]",
            ].join(" ")}
            style={{ zIndex: "var(--z-modal)" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0" aria-hidden="true">
              <div className="w-10 h-1.5 rounded-full bg-muted" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle flex-shrink-0">
                <h2 className="font-semibold text-lg text-foreground">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
