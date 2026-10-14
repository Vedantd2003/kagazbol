"use client";
import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import type { MotionTier } from "@/hooks/useMotionTier";

interface LanguageOption {
  value: string;
  label: string;
}

interface LanguagePillProps {
  options: LanguageOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  tier?: MotionTier;
}

const SIZE_CLASSES = {
  sm: "px-3 py-1 text-xs min-h-[32px]",
  md: "px-4 py-1.5 text-sm min-h-[40px]",
};

const CONTAINER_CLASSES = {
  sm: "p-0.5",
  md: "p-1",
};

export function LanguagePill({
  options,
  value,
  onChange,
  size = "md",
  tier = "full",
}: LanguagePillProps) {
  return (
    <div
      className={[
        "flex gap-0.5 rounded-[var(--radius-full)] bg-muted",
        CONTAINER_CLASSES[size],
      ].join(" ")}
      role="group"
      aria-label="Language selection"
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={[
              "relative rounded-[var(--radius-full)] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
              SIZE_CLASSES[size],
              isActive
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {/* Sliding active indicator via layoutId */}
            {isActive && (
              <motion.span
                layoutId="lang-active-pill"
                className="absolute inset-0 rounded-[var(--radius-full)] bg-primary"
                transition={tier === "reduced" ? { duration: 0 } : SPRING.snappy}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
