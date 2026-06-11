"use client";

import { motion } from "framer-motion";

export function ProcessingStatus({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8 text-center shadow-sm"
    >
      <motion.div
        className="h-10 w-10 rounded-full border-4 border-muted border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </motion.div>
  );
}
