import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "quiet" | "danger";
type Size = "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-stamp text-stamp-ink hover:brightness-110 active:brightness-95 shadow-[0_1px_0_rgb(0_0_0/0.15)]",
  secondary: "bg-sheet text-ink border border-rule-strong hover:border-ink-2 hover:bg-sheet-2",
  quiet: "text-ink-2 hover:text-ink hover:bg-sheet-2",
  danger: "bg-due text-white hover:brightness-110",
};

const SIZES: Record<Size, string> = {
  md: "min-h-11 px-4 text-sm gap-2",
  lg: "min-h-13 px-5 text-base gap-2.5",
  xl: "min-h-16 px-7 text-lg gap-3",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

/** Touch targets are ≥44px at every size. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, className = "", children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-[var(--radius-control)] font-semibold transition-[background-color,border-color,filter,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
});
