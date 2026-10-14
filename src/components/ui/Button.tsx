"use client";
import { motion, type HTMLMotionProps } from "framer-motion";
import { SPRING, DURATION } from "@/lib/motion";
import type { MotionTier } from "@/hooks/useMotionTier";
import { useState, useCallback } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface RippleEntry {
  id: number;
  x: number;
  y: number;
}

// Omit Framer-conflicting drag events that React.ButtonHTMLAttributes also defines
type SafeMotionButtonProps = Omit<
  HTMLMotionProps<"button">,
  "onDrag" | "onDragStart" | "onDragEnd" | "onDragEnter" | "onDragLeave" | "onDragOver" | "onDrop"
>;

interface ButtonProps extends Omit<SafeMotionButtonProps, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  tier?: MotionTier;
  children?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:   "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-muted text-foreground border border-border hover:bg-background-subtle",
  ghost:     "text-foreground hover:bg-muted",
  danger:    "bg-warning text-white hover:opacity-90",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-4 text-sm",
  md: "px-5 text-base",
  lg: "px-6 text-lg",
};

const SIZE_MIN_HEIGHT: Record<ButtonSize, string> = {
  sm: "min-h-[40px]",
  md: "min-h-[48px]",
  lg: "min-h-[56px]",
};

let rippleCounter = 0;

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  tier = "full",
  children,
  onClick,
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  const [ripples, setRipples] = useState<RippleEntry[]>([]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (tier === "full" && !disabled && !isLoading) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = ++rippleCounter;
        setRipples((prev) => [...prev, { id, x, y }]);
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 500);
      }
      onClick?.(e);
    },
    [tier, disabled, isLoading, onClick]
  );

  const isDisabled = disabled || isLoading;

  const motionProps =
    tier === "reduced"
      ? {}
      : {
          whileTap: { scale: isDisabled ? 1 : 0.96 },
          transition: SPRING.snappy,
        };

  return (
    <motion.button
      type="button"
      {...motionProps}
      {...rest}
      onClick={handleClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={[
        "relative inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] overflow-hidden",
        "transition-colors duration-[180ms]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        SIZE_MIN_HEIGHT[size],
        isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 8,
            height: 8,
            x: "-50%",
            y: "-50%",
          }}
          initial={{ scale: 0, opacity: 0.3 }}
          animate={{ scale: 30, opacity: 0 }}
          transition={{ duration: DURATION.slow / 1000, ease: "easeOut" }}
        />
      ))}

      {/* Left icon or spinner */}
      {isLoading ? (
        <span
          className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      ) : (
        leftIcon && <span aria-hidden="true">{leftIcon}</span>
      )}

      {children}

      {/* Right icon (hidden when loading) */}
      {!isLoading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
    </motion.button>
  );
}
