"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { DURATION, EASE, SPRING, VARIANTS } from "@/lib/motion";
import { useMotionTier } from "@/hooks/useMotionTier";
import { Button } from "@/components/ui";

// ── Showcase data: same document fact in all three languages ──────────────────
const SHOWCASE_SLIDES = [
  {
    lang: "en",
    label: "English",
    text: "Your electricity bill: ₹2,340 due by 31 Jan.",
    detail: "Maharashtra State Electricity Distribution Co.",
  },
  {
    lang: "hi",
    label: "हिंदी",
    text: "बिजली बिल: ₹2,340 — 31 जनवरी तक जमा करें।",
    detail: "महाराष्ट्र राज्य विद्युत वितरण कंपनी",
  },
  {
    lang: "mr",
    label: "मराठी",
    text: "वीज बिल: ₹2,340 — 31 जानेवारीपर्यंत भरा.",
    detail: "महाराष्ट्र राज्य वीज वितरण कंपनी",
  },
] as const;

// ── Cycling headline copies ───────────────────────────────────────────────────
const HEADLINE_CYCLES = [
  { lang: "en", text: "Talk to any\nIndian document" },
  { lang: "hi", text: "किसी भी भारतीय\nदस्तावेज़ से बात करें" },
  { lang: "mr", text: "कोणत्याही भारतीय\nकागदपत्राशी बोला" },
] as const;

// ── Document SVG component ────────────────────────────────────────────────────
function DocumentSVG({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 396"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Paper body */}
      <rect width="280" height="396" fill="#FFFEF9" rx="4" />
      {/* Drop shadow edge */}
      <rect width="280" height="396" fill="url(#docShadow)" rx="4" opacity="0.06" />

      {/* Folded corner */}
      <path d="M 240 0 L 280 0 L 280 40 Z" fill="#E8E0D4" />
      <path d="M 240 0 L 280 40 L 240 40 Z" fill="#F0EBE1" />
      <line x1="240" y1="0" x2="280" y2="40" stroke="#D4C9BB" strokeWidth="0.5" />

      {/* Government seal ring */}
      <circle cx="140" cy="54" r="24" stroke="#1E1440" strokeWidth="1.5" fill="none" opacity="0.7" />
      <circle cx="140" cy="54" r="18" stroke="#1E1440" strokeWidth="0.5" fill="none" opacity="0.5" />
      <circle cx="140" cy="54" r="6" fill="#1E1440" opacity="0.15" />
      {/* Tick marks around seal */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x1 = 140 + Math.cos(angle) * 20;
        const y1 = 54 + Math.sin(angle) * 20;
        const x2 = 140 + Math.cos(angle) * 23;
        const y2 = 54 + Math.sin(angle) * 23;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1E1440" strokeWidth="0.5" opacity="0.4" />;
      })}

      {/* Header block */}
      <rect x="32" y="90" width="216" height="9" rx="2" fill="#1E1440" opacity="0.75" />
      <rect x="72" y="106" width="136" height="6" rx="2" fill="#1E1440" opacity="0.35" />

      {/* Divider */}
      <line x1="24" y1="122" x2="256" y2="122" stroke="#D4C9BB" strokeWidth="0.5" />

      {/* Body text lines */}
      <rect x="24" y="134" width="188" height="6" rx="2" fill="#1A1209" opacity="0.18" />
      <rect x="24" y="148" width="228" height="6" rx="2" fill="#1A1209" opacity="0.14" />
      <rect x="24" y="162" width="200" height="6" rx="2" fill="#1A1209" opacity="0.18" />
      <rect x="24" y="176" width="168" height="6" rx="2" fill="#1A1209" opacity="0.14" />

      {/* Amount highlight box */}
      <rect x="24" y="198" width="232" height="64" rx="6" fill="#FAF7F2" stroke="#D4C9BB" strokeWidth="0.75" />
      <rect x="36" y="212" width="88" height="6" rx="2" fill="#1A1209" opacity="0.25" />
      {/* Rupee amount — accent coloured */}
      <rect x="36" y="226" width="52" height="8" rx="2" fill="#D97706" opacity="0.25" />
      <rect x="92" y="226" width="104" height="8" rx="2" fill="#D97706" opacity="0.8" />
      <rect x="36" y="242" width="140" height="6" rx="2" fill="#1A1209" opacity="0.18" />

      {/* More body lines */}
      <rect x="24" y="278" width="208" height="6" rx="2" fill="#1A1209" opacity="0.14" />
      <rect x="24" y="292" width="180" height="6" rx="2" fill="#1A1209" opacity="0.14" />
      <rect x="24" y="306" width="224" height="6" rx="2" fill="#1A1209" opacity="0.14" />
      <rect x="24" y="320" width="164" height="6" rx="2" fill="#1A1209" opacity="0.14" />

      {/* Signature line */}
      <line x1="156" y1="358" x2="256" y2="358" stroke="#D4C9BB" strokeWidth="0.75" />
      <rect x="172" y="364" width="68" height="4" rx="2" fill="#1A1209" opacity="0.18" />

      {/* Subtle paper border */}
      <rect
        width="279"
        height="395"
        x="0.5"
        y="0.5"
        rx="3.5"
        stroke="#D4C9BB"
        strokeWidth="0.5"
        fill="none"
      />

      <defs>
        <radialGradient id="docShadow" cx="0%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#1A1209" stopOpacity="0" />
          <stop offset="100%" stopColor="#1A1209" stopOpacity="1" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// ── Animated voice orb (CSS only, no canvas) ─────────────────────────────────
function VoiceOrb({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative flex items-center justify-center w-16 h-16" aria-hidden="true">
      {/* Pulse ring */}
      {speaking && (
        <span
          className="absolute inset-0 rounded-full border-2 border-[var(--orb-speak)] animate-pulse-ring"
          style={{ animationDuration: "1.4s" }}
        />
      )}
      {/* Core orb */}
      <div
        className="w-12 h-12 rounded-full shadow-[var(--shadow-orb)] animate-orb-breathe transition-colors duration-500"
        style={{
          background: `radial-gradient(circle at 38% 38%, color-mix(in srgb, white 30%, ${speaking ? "var(--orb-speak)" : "var(--orb-idle)"}), ${speaking ? "var(--orb-speak)" : "var(--orb-idle)"})`,
        }}
      />
    </div>
  );
}

// ── Sound wave SVG for CTA area ───────────────────────────────────────────────
function SoundWave({ tier }: { tier: "full" | "lite" | "reduced" }) {
  const bars = [3, 8, 14, 20, 14, 8, 3, 8, 20, 14, 8, 3, 8, 14, 8, 3];
  return (
    <svg viewBox="0 0 96 28" className="w-24 h-7 opacity-60" aria-hidden="true">
      {bars.map((h, i) => (
        <motion.rect
          key={i}
          x={i * 6 + 0.5}
          y={(28 - h) / 2}
          width="4"
          height={h}
          rx="2"
          fill="currentColor"
          animate={
            tier !== "reduced"
              ? {
                  scaleY: [1, 1.6 + Math.random() * 0.8, 0.6, 1],
                  transition: {
                    duration: 0.8 + (i % 4) * 0.2,
                    repeat: Infinity,
                    delay: i * 0.05,
                    ease: "easeInOut",
                  },
                }
              : {}
          }
          style={{ transformOrigin: "center" }}
        />
      ))}
    </svg>
  );
}

// ── Hero section ──────────────────────────────────────────────────────────────
function HeroSection({ tier }: { tier: "full" | "lite" | "reduced" }) {
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const [orbSpeaking, setOrbSpeaking] = useState(false);

  // Cycle headline language every 3.5 s
  useEffect(() => {
    if (tier === "reduced") return;
    const id = setInterval(() => {
      setHeadlineIdx((i) => (i + 1) % HEADLINE_CYCLES.length);
    }, 3500);
    return () => clearInterval(id);
  }, [tier]);

  // Pulse orb every 5 s for a beat
  useEffect(() => {
    if (tier === "reduced") return;
    const id = setInterval(() => {
      setOrbSpeaking(true);
      setTimeout(() => setOrbSpeaking(false), 2000);
    }, 5000);
    return () => clearInterval(id);
  }, [tier]);

  const currentHeadline = HEADLINE_CYCLES[headlineIdx];

  return (
    <section className="relative flex min-h-[92svh] flex-col items-center justify-center px-5 pt-20 pb-16 overflow-hidden">
      {/* Ambient gradient blob — full tier only */}
      {tier === "full" && (
        <div
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse, var(--accent) 0%, var(--primary) 50%, transparent 70%)",
          }}
          aria-hidden="true"
        />
      )}

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-16">
        {/* ── Left: copy ── */}
        <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
          {/* Language badge */}
          <motion.div
            initial={tier !== "reduced" ? { opacity: 0, y: -8 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.base / 1000, delay: 0.1 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-[var(--shadow-sm)]"
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            Hindi · Marathi · English
          </motion.div>

          {/* Cycling headline */}
          <div className="relative mb-4 h-[6rem] sm:h-[7rem] lg:h-[8rem] w-full overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.h1
                key={currentHeadline.lang}
                initial={tier !== "reduced" ? { opacity: 0, y: 24 } : {}}
                animate={{ opacity: 1, y: 0 }}
                exit={tier !== "reduced" ? { opacity: 0, y: -20 } : {}}
                transition={{
                  duration: DURATION.slow / 1000,
                  ease: EASE.expoOut,
                }}
                lang={currentHeadline.lang}
                className="absolute inset-0 font-display text-[2.4rem] leading-[1.15] sm:text-5xl lg:text-[3.2rem] text-primary whitespace-pre-line"
              >
                {currentHeadline.text}
              </motion.h1>
            </AnimatePresence>
          </div>

          {/* Sub-headline */}
          <motion.p
            initial={tier !== "reduced" ? { opacity: 0, y: 8 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.base / 1000, delay: 0.35 }}
            className="mb-8 max-w-sm text-base text-muted-foreground sm:text-lg"
          >
            Photograph any Indian document. Understand it instantly. Ask questions by voice — in
            your language.
          </motion.p>

          {/* CTA row */}
          <motion.div
            initial={tier !== "reduced" ? { opacity: 0, y: 8 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.base / 1000, delay: 0.5 }}
            className="flex flex-wrap items-center gap-3"
          >
            <Link href="/app">
              <Button variant="primary" size="lg" tier={tier}>
                Try KagazBol
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="ghost" size="lg" tier={tier}>
                See how it works
              </Button>
            </a>
          </motion.div>

          {/* Orb + soundwave hint */}
          <motion.div
            initial={tier !== "reduced" ? { opacity: 0 } : {}}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: DURATION.slow / 1000 }}
            className="mt-10 flex items-center gap-3 text-muted-foreground"
          >
            <VoiceOrb speaking={orbSpeaking} />
            <div>
              <SoundWave tier={tier} />
              <p className="mt-0.5 text-xs">Voice answers in Hindi, Marathi &amp; English</p>
            </div>
          </motion.div>
        </div>

        {/* ── Right: document illustration ── */}
        <motion.div
          initial={tier !== "reduced" ? { opacity: 0, rotate: 8, scale: 0.72 } : {}}
          animate={{ opacity: 1, rotate: -1.5, scale: 1 }}
          transition={{
            duration: DURATION.cinematic / 1000,
            ease: EASE.expoOut,
            delay: 0.15,
          }}
          className="relative hidden w-full max-w-xs lg:block"
          aria-hidden="true"
        >
          {/* Shadow under doc */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-4/5 h-8 rounded-full bg-foreground/10 blur-xl" />
          <DocumentSVG className="relative z-10 w-full drop-shadow-2xl" />
          {/* Floating accent badge */}
          <motion.div
            animate={
              tier !== "reduced"
                ? { y: [-4, 4, -4], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } }
                : {}
            }
            className="absolute -right-6 top-1/3 flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-[var(--shadow-md)]"
          >
            <span className="text-lg" aria-hidden="true">🎙️</span>
            <div>
              <p className="text-xs font-semibold text-foreground">Ask anything</p>
              <p className="text-[10px] text-muted-foreground">Voice · Hindi · Marathi</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={tier !== "reduced" ? { opacity: 0 } : {}}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground"
        aria-hidden="true"
      >
        <motion.div
          animate={
            tier !== "reduced"
              ? { y: [0, 6, 0], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }
              : {}
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-5 w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ── How it works section ──────────────────────────────────────────────────────
const STEPS = [
  {
    number: "01",
    title: "Photograph",
    body: "Point your phone at any Indian document — electricity bill, prescription, bank notice, land record — and tap the shutter.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
        <path
          fillRule="evenodd"
          d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    number: "02",
    title: "We read it",
    body: "Sarvam's OCR engine reads every word — including Devanagari — in under 10 seconds. Even handwritten text and stamps.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path
          fillRule="evenodd"
          d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 0 0 3 3h15a3 3 0 0 1-3-3V4.875C17.25 3.839 16.41 3 15.375 3H4.125ZM12 9.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H12Zm-.75-2.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75ZM6 12.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5H6Zm-.75 3.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75ZM6 6.75a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-3A.75.75 0 0 0 9 6.75H6Z"
          clipRule="evenodd"
        />
        <path d="M18.75 6.75h1.875c.621 0 1.125.504 1.125 1.125V18a1.5 1.5 0 0 1-3 0V6.75Z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Ask by voice",
    body: "Ask anything in Hindi, Marathi, or English. KagazBol answers out loud, in your language. No typing required.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
        <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
      </svg>
    ),
  },
] as const;

function StepsSection({ tier }: { tier: "full" | "lite" | "reduced" }) {
  return (
    <section
      id="how-it-works"
      className="relative py-20 px-5"
    >
      <div className="mx-auto max-w-5xl">
        {/* Section label */}
        <motion.p
          initial={tier !== "reduced" ? { opacity: 0 } : {}}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: DURATION.base / 1000 }}
          className="text-center text-sm font-semibold uppercase tracking-widest text-accent"
        >
          How it works
        </motion.p>
        <motion.h2
          initial={tier !== "reduced" ? VARIANTS.fadeUp.hidden : {}}
          whileInView={VARIANTS.fadeUp.visible}
          viewport={{ once: true, margin: "-80px" }}
          className="mt-2 text-center font-display text-3xl text-primary sm:text-4xl"
        >
          Three steps, any document
        </motion.h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={tier !== "reduced" ? { opacity: 0, y: 24 } : {}}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: DURATION.slow / 1000,
                delay: i * 0.12,
                ease: EASE.expoOut,
              }}
              className="relative rounded-[var(--radius-xl)] border border-border bg-card p-6 shadow-[var(--shadow-sm)]"
            >
              {/* Step number — large ghost */}
              <span
                className="absolute right-5 top-4 font-display text-5xl text-border select-none"
                aria-hidden="true"
              >
                {step.number}
              </span>
              {/* Icon */}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {step.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Language showcase section ─────────────────────────────────────────────────
function LanguageShowcaseSection({ tier }: { tier: "full" | "lite" | "reduced" }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (tier === "reduced") return;
    const id = setInterval(() => setIdx((i) => (i + 1) % SHOWCASE_SLIDES.length), 3000);
    return () => clearInterval(id);
  }, [tier]);

  const slide = SHOWCASE_SLIDES[idx];

  return (
    <section className="py-20 px-5 bg-primary">
      <div className="mx-auto max-w-3xl text-center">
        <motion.p
          initial={tier !== "reduced" ? { opacity: 0 } : {}}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-sm font-semibold uppercase tracking-widest text-accent"
        >
          Language-first
        </motion.p>
        <motion.h2
          initial={tier !== "reduced" ? VARIANTS.fadeUp.hidden : {}}
          whileInView={VARIANTS.fadeUp.visible}
          viewport={{ once: true }}
          className="mt-2 font-display text-3xl text-primary-foreground sm:text-4xl"
        >
          One document. Three languages.
        </motion.h2>
        <motion.p
          initial={tier !== "reduced" ? { opacity: 0, y: 8 } : {}}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-3 text-primary-foreground/70"
        >
          KagazBol understands the same fact in whichever language you think in.
        </motion.p>

        {/* Language tabs */}
        <div className="mt-8 flex justify-center gap-2">
          {SHOWCASE_SLIDES.map((s, i) => (
            <button
              key={s.lang}
              type="button"
              onClick={() => setIdx(i)}
              aria-pressed={i === idx}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                i === idx
                  ? "bg-accent text-white"
                  : "text-primary-foreground/60 hover:text-primary-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Showcase card */}
        <div className="relative mt-5 overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-white/5 p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.lang}
              initial={tier !== "reduced" ? { opacity: 0, y: 16 } : {}}
              animate={{ opacity: 1, y: 0 }}
              exit={tier !== "reduced" ? { opacity: 0, y: -12 } : {}}
              transition={{ duration: DURATION.base / 1000, ease: EASE.expoOut }}
              lang={slide.lang}
            >
              <p className="font-display text-xl text-primary-foreground sm:text-2xl">
                {slide.text}
              </p>
              <p className="mt-2 text-sm text-primary-foreground/50">{slide.detail}</p>
            </motion.div>
          </AnimatePresence>

          {/* Decorative dots */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden="true">
            {SHOWCASE_SLIDES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === idx ? "w-5 bg-accent" : "w-1.5 bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Who it's for section ──────────────────────────────────────────────────────
const PERSONAS = [
  {
    emoji: "👴",
    title: "Senior parents",
    body: "Receiving government notices, MSEDCL bills, and Aadhaar letters they can't fully parse.",
  },
  {
    emoji: "🌾",
    title: "Rural families",
    body: "Navigating ration cards, land records, bank correspondence, and panchayat notices.",
  },
  {
    emoji: "🏥",
    title: "Patients",
    body: "Confused by prescription instructions, hospital discharge summaries, and insurance documents.",
  },
  {
    emoji: "📋",
    title: "First-time renters",
    body: "Understanding rental agreements, security deposit clauses, and utility transfer forms.",
  },
] as const;

function WhoSection({ tier }: { tier: "full" | "lite" | "reduced" }) {
  return (
    <section className="py-20 px-5">
      <div className="mx-auto max-w-5xl">
        <motion.p
          initial={tier !== "reduced" ? { opacity: 0 } : {}}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm font-semibold uppercase tracking-widest text-accent"
        >
          Who it&rsquo;s for
        </motion.p>
        <motion.h2
          initial={tier !== "reduced" ? VARIANTS.fadeUp.hidden : {}}
          whileInView={VARIANTS.fadeUp.visible}
          viewport={{ once: true }}
          className="mt-2 text-center font-display text-3xl text-primary sm:text-4xl"
        >
          Built for real people
        </motion.h2>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PERSONAS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={tier !== "reduced" ? { opacity: 0, y: 20 } : {}}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: DURATION.slow / 1000,
                delay: i * 0.08,
                ease: EASE.expoOut,
              }}
              className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-[var(--shadow-sm)]"
            >
              <span className="text-3xl" aria-hidden="true">{p.emoji}</span>
              <h3 className="mt-3 font-semibold text-foreground">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Privacy / trust section ───────────────────────────────────────────────────
const TRUST_ITEMS = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path
          fillRule="evenodd"
          d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
          clipRule="evenodd"
        />
      </svg>
    ),
    title: "No data stored",
    body: "Documents are processed in memory and discarded at the end of your session. Nothing is saved.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path
          fillRule="evenodd"
          d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
          clipRule="evenodd"
        />
      </svg>
    ),
    title: "No account needed",
    body: "Open the page, photograph your document, and start talking. No sign-up, no tracking.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
      </svg>
    ),
    title: "Made for India",
    body: "Built specifically for Indian documents, scripts, languages, and the way people actually speak.",
  },
] as const;

function TrustSection({ tier }: { tier: "full" | "lite" | "reduced" }) {
  return (
    <section className="py-20 px-5 bg-[var(--background-subtle)]">
      <div className="mx-auto max-w-4xl">
        <motion.h2
          initial={tier !== "reduced" ? VARIANTS.fadeUp.hidden : {}}
          whileInView={VARIANTS.fadeUp.visible}
          viewport={{ once: true }}
          className="text-center font-display text-3xl text-primary sm:text-4xl"
        >
          Private by design
        </motion.h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {TRUST_ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={tier !== "reduced" ? { opacity: 0, y: 16 } : {}}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: DURATION.base / 1000, ease: EASE.expoOut }}
              className="flex flex-col gap-3 rounded-[var(--radius-xl)] bg-card p-6 shadow-[var(--shadow-sm)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {item.icon}
              </div>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Sarvam technology strip ───────────────────────────────────────────────────
const SARVAM_STACK = [
  { name: "Document Intelligence", desc: "OCR · Hindi · Marathi · English" },
  { name: "Saaras:v3 STT", desc: "Speech recognition · codemix" },
  { name: "Bulbul:v3 TTS", desc: "Natural voice synthesis" },
  { name: "Sarvam-2B Chat", desc: "Context-aware Q&A" },
] as const;

function SarvamSection({ tier }: { tier: "full" | "lite" | "reduced" }) {
  return (
    <section className="py-16 px-5">
      <div className="mx-auto max-w-4xl text-center">
        <motion.p
          initial={tier !== "reduced" ? { opacity: 0 } : {}}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Powered by
        </motion.p>
        <motion.p
          initial={tier !== "reduced" ? { opacity: 0, y: 6 } : {}}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-2 font-display text-2xl text-primary"
        >
          Sarvam AI — India&rsquo;s language stack
        </motion.p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {SARVAM_STACK.map((item, i) => (
            <motion.div
              key={item.name}
              initial={tier !== "reduced" ? { opacity: 0, scale: 0.9 } : {}}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: DURATION.base / 1000, ease: EASE.expoOut }}
              className="rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-[var(--shadow-sm)]"
            >
              <p className="text-sm font-semibold text-foreground">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA section ─────────────────────────────────────────────────────────
function FinalCTA({ tier }: { tier: "full" | "lite" | "reduced" }) {
  return (
    <section className="py-24 px-5">
      <div className="mx-auto max-w-xl text-center">
        <motion.h2
          initial={tier !== "reduced" ? VARIANTS.fadeUp.hidden : {}}
          whileInView={VARIANTS.fadeUp.visible}
          viewport={{ once: true }}
          className="font-display text-3xl text-primary sm:text-4xl"
        >
          Your documents, in your words
        </motion.h2>
        <motion.p
          initial={tier !== "reduced" ? { opacity: 0, y: 8 } : {}}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-muted-foreground"
        >
          No app to download. Works on any phone. Free to try.
        </motion.p>
        <motion.div
          initial={tier !== "reduced" ? { opacity: 0, y: 8 } : {}}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35 }}
          className="mt-8"
        >
          <Link href="/app">
            <Button variant="primary" size="lg" tier={tier}>
              Try KagazBol free
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function LandingNav({ tier }: { tier: "full" | "lite" | "reduced" }) {
  return (
    <motion.header
      initial={tier !== "reduced" ? { opacity: 0, y: -12 } : {}}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base / 1000, ease: EASE.expoOut }}
      className="fixed top-0 left-0 right-0 z-[var(--z-raised)] flex items-center justify-between px-5 py-3 backdrop-blur-md bg-background/80 border-b border-border/60"
    >
      <Link href="/" className="font-display text-xl text-primary hover:opacity-80 transition-opacity">
        KagazBol
      </Link>
      <Link href="/app">
        <Button variant="primary" size="sm" tier={tier}>
          Try it free
        </Button>
      </Link>
    </motion.header>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function LandingFooter() {
  return (
    <footer className="border-t border-border py-8 px-5">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="font-display text-lg text-primary">KagazBol</p>
        <p className="text-xs text-muted-foreground">
          Made with care for India &mdash; powered by{" "}
          <a
            href="https://sarvam.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            Sarvam AI
          </a>
        </p>
      </div>
    </footer>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export function LandingPage() {
  const { tier } = useMotionTier();

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <LandingNav tier={tier} />
      <main>
        <HeroSection tier={tier} />
        <StepsSection tier={tier} />
        <LanguageShowcaseSection tier={tier} />
        <WhoSection tier={tier} />
        <TrustSection tier={tier} />
        <SarvamSection tier={tier} />
        <FinalCTA tier={tier} />
      </main>
      <LandingFooter />
    </div>
  );
}
