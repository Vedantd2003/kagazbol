import type { ReactNode } from "react";

/**
 * Rubber-stamp mark used for verification status. It is the one decorative
 * flourish in the system, so it only ever carries real meaning.
 */
export function Stamp({ tone = "stamp", children, animate = false, className = "" }: { tone?: "stamp" | "due" | "muted"; children: ReactNode; animate?: boolean; className?: string }) {
  return (
    <span className={`stamp ${animate ? "stamp-animate" : ""} ${className}`} data-tone={tone === "stamp" ? undefined : tone}>
      {children}
    </span>
  );
}
