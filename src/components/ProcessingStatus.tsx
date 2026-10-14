"use client";

import { motion } from "framer-motion";

export function ProcessingStatus({
  label,
  progress,
}: {
  label: string;
  /** Upload progress 0-100. Omit for an indeterminate spinner. */
  progress?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="status"
      aria-live="polite"
      className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8 text-center shadow-sm"
    >
      {progress !== undefined ? (
        <div className="w-full">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-muted-foreground">{progress}%</p>
        </div>
      ) : (
        <motion.div
          className="h-10 w-10 rounded-full border-4 border-muted border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          aria-hidden="true"
        />
      )}
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </motion.div>
  );
}
