"use client";
import { motion, type HTMLMotionProps } from "framer-motion";
import { SPRING } from "@/lib/motion";
import type { MotionTier } from "@/hooks/useMotionTier";

type IconButtonVariant = "primary" | "secondary" | "ghost";

// Omit Framer-conflicting drag events that React.ButtonHTMLAttributes also defines
type SafeMotionButtonProps = Omit<
  HTMLMotionProps<"button">,
  "onDrag" | "onDragStart" | "onDragEnd" | "onDragEnter" | "onDragLeave" | "onDragOver" | "onDrop"
>;

interface IconButtonProps extends SafeMotionButtonProps {
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: "sm" | "md" | "lg";
  tier?: MotionTier;
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  primary:   "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-muted text-foreground border border-border hover:bg-background-subtle",
  ghost:     "text-foreground hover:bg-muted",
};

const SIZE_CLASSES = {
  sm: "w-10 h-10 text-sm",    // 40px
  md: "w-12 h-12 text-base",  // 48px
  lg: "w-14 h-14 text-lg",    // 56px
};

export function IconButton({
  variant = "ghost",
  size = "md",
  tier = "full",
  children,
  disabled,
  className = "",
  ...rest
}: IconButtonProps) {
  const motionProps =
    tier === "reduced"
      ? {}
      : {
          whileHover: { scale: 1.05 },
          whileTap:   { scale: 0.94 },
          transition: SPRING.snappy,
        };

  return (
    <motion.button
      type="button"
      {...motionProps}
      {...rest}
      disabled={disabled}
      aria-disabled={disabled}
      className={[
        "inline-flex items-center justify-center rounded-[var(--radius-full)] flex-shrink-0",
        "transition-colors duration-[180ms]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      {children}
    </motion.button>
  );
}
