"use client";
import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import type { MotionTier } from "@/hooks/useMotionTier";

interface CardProps {
  children: React.ReactNode;
  elevated?: boolean;
  interactive?: boolean;
  tier?: MotionTier;
  onClick?: () => void;
  className?: string;
}

export function Card({
  children,
  elevated = false,
  interactive = false,
  tier = "full",
  onClick,
  className = "",
}: CardProps) {
  const isClickable = interactive || !!onClick;

  const motionProps =
    tier === "reduced" || !isClickable
      ? {}
      : {
          whileHover: { y: -2, scale: 1.005 },
          whileTap:   { scale: 0.99 },
          transition: SPRING.gentle,
        };

  return (
    <motion.div
      {...motionProps}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") onClick?.();
            }
          : undefined
      }
      className={[
        "rounded-[var(--radius-lg)] border border-border p-5",
        elevated
          ? "bg-card-raised shadow-[var(--shadow-lg)]"
          : "bg-card shadow-[var(--shadow-sm)]",
        isClickable ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" : "",
        className,
      ].join(" ")}
    >
      {children}
    </motion.div>
  );
}
