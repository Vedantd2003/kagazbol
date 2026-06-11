"use client";

import { motion } from "framer-motion";

export type MicStatus = "idle" | "recording" | "transcribing" | "thinking" | "speaking";

export function MicButton({
  status,
  onClick,
  label,
}: {
  status: MicStatus;
  onClick: () => void;
  label: string;
}) {
  const busy = status === "transcribing" || status === "thinking";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-20 w-20 items-center justify-center">
        {status === "recording" && (
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/30" />
        )}
        {status === "speaking" && (
          <div className="absolute inset-0 flex items-center justify-center gap-1">
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="w-1 rounded-full bg-primary"
                animate={{ height: ["8px", "28px", "8px"] }}
                transition={{
                  duration: 0.7,
                  repeat: Infinity,
                  delay: i * 0.12,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        )}
        <motion.button
          type="button"
          onClick={onClick}
          disabled={busy}
          whileTap={{ scale: 0.92 }}
          className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-md transition-colors ${
            status === "recording"
              ? "bg-red-500 text-white"
              : busy
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground"
          } ${status === "speaking" ? "opacity-0" : ""}`}
          aria-label={label}
        >
          {busy ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              ⟳
            </motion.span>
          ) : status === "recording" ? (
            "■"
          ) : (
            "🎙️"
          )}
        </motion.button>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
