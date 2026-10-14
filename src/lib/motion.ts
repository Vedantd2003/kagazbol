// Motion design tokens — every animated component imports from here.
// No component should have hand-tuned duration or easing values inline.

// Durations (ms)
export const DURATION = {
  instant:   100,
  quick:     180,
  base:      280,
  slow:      480,
  cinematic: 800,
} as const;

// Easings (cubic-bezier arrays for use with Framer Motion)
export const EASE = {
  spring:   [0.34, 1.56, 0.64, 1],   // soft overshoot spring for UI
  expoOut:  [0.16, 1, 0.3, 1],        // fast initial decel for reveals
  gentle:   [0.4, 0, 0.2, 1],         // gentle ease-in-out for ambient motion
  linear:   [0, 0, 1, 1],
} as const;

// Framer Motion transition presets
export const SPRING = {
  snappy: { type: "spring", stiffness: 400, damping: 30 } as const,
  gentle: { type: "spring", stiffness: 200, damping: 25 } as const,
  slow:   { type: "spring", stiffness: 100, damping: 20 } as const,
} as const;

// Shared Framer Motion variants
export const VARIANTS = {
  fadeUp: {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: DURATION.base / 1000, ease: EASE.expoOut } },
    exit:    { opacity: 0, y: -8, transition: { duration: DURATION.quick / 1000, ease: EASE.gentle } },
  },
  fadeIn: {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { duration: DURATION.base / 1000 } },
    exit:    { opacity: 0, transition: { duration: DURATION.quick / 1000 } },
  },
  scaleIn: {
    hidden:  { opacity: 0, scale: 0.94 },
    visible: { opacity: 1, scale: 1, transition: { duration: DURATION.base / 1000, ease: EASE.spring } },
    exit:    { opacity: 0, scale: 0.97, transition: { duration: DURATION.quick / 1000 } },
  },
  slideUp: {
    hidden:  { opacity: 0, y: "100%" },
    visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow / 1000, ease: EASE.expoOut } },
    exit:    { opacity: 0, y: "100%", transition: { duration: DURATION.base / 1000, ease: EASE.gentle } },
  },
  staggerChildren: {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  },
  inkReveal: {
    hidden:  { opacity: 0, clipPath: "inset(0 100% 0 0)" },
    visible: { opacity: 1, clipPath: "inset(0 0% 0 0)", transition: { duration: DURATION.cinematic / 1000, ease: EASE.expoOut } },
  },
} as const;
