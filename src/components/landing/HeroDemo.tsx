"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Volume2 } from "lucide-react";
import { Stamp } from "@/components/ui/Stamp";

type DemoLang = "en-IN" | "hi-IN" | "mr-IN";

/** Pre-written demo copy for the bundled, made-up sample bill. Nothing is processed. */
const DEMO: Record<DemoLang, { tab: string; title: string; body: string; amount: string; due: string; amountLabel: string; dueLabel: string; found: string }> = {
  "en-IN": {
    tab: "English",
    title: "Electricity bill for May",
    body: "You need to pay ₹1,840 by 21 June 2026. If you pay late, a 2% extra charge will be added.",
    amount: "Rs. 1,840.00",
    due: "21 June 2026",
    amountLabel: "To pay",
    dueLabel: "Last date",
    found: "Found in document",
  },
  "hi-IN": {
    tab: "हिंदी",
    title: "मई महीने का बिजली बिल",
    body: "आपको 21 जून 2026 तक ₹1,840 भरने हैं। देर से भरने पर 2% अतिरिक्त शुल्क लगेगा।",
    amount: "Rs. 1,840.00",
    due: "21 June 2026",
    amountLabel: "भरना है",
    dueLabel: "आखिरी तारीख",
    found: "दस्तावेज़ में मिला",
  },
  "mr-IN": {
    tab: "मराठी",
    title: "मे महिन्याचे वीज बिल",
    body: "तुम्हाला 21 जून 2026 पर्यंत ₹1,840 भरायचे आहेत. उशिरा भरल्यास 2% जास्त आकार लागेल.",
    amount: "Rs. 1,840.00",
    due: "21 June 2026",
    amountLabel: "भरायचे",
    dueLabel: "शेवटची तारीख",
    found: "कागदात सापडले",
  },
};

/**
 * The hero is the product's core moment: a document is read, the two values that
 * matter are highlighted and stamped as found, and the explanation switches
 * language. One orchestrated sequence on load; static under reduced motion.
 */
export function HeroDemo() {
  const [lang, setLang] = useState<DemoLang>("en-IN");
  const [phase, setPhase] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const d = DEMO[lang];

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = reduce ? [setTimeout(() => setPhase(3), 0)] : [setTimeout(() => setPhase(1), 450), setTimeout(() => setPhase(2), 1250), setTimeout(() => setPhase(3), 1900)];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function toggleSpeak() {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) {
      setVoiceNote("Your browser has no built-in voice. The app uses Sarvam's Bulbul voices.");
      return;
    }
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(d.body);
    u.lang = lang;
    const voice = synth.getVoices().find((v) => v.lang.replace("_", "-").toLowerCase().startsWith(lang.slice(0, 2)));
    if (voice) u.voice = voice;
    else if (lang !== "en-IN") setVoiceNote("This browser has no voice for that language. The app uses Sarvam's Bulbul voices for Hindi and Marathi.");
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  }

  function switchLang(l: DemoLang) {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setVoiceNote(null);
    setLang(l);
  }

  return (
    <figure className="relative mx-auto w-full max-w-[34rem]" aria-label="Demo: a made-up electricity bill being explained">
      {/* The document */}
      <div className="relative ml-auto w-[78%] rotate-[1.2deg] overflow-hidden rounded-[var(--radius-paper)] bg-white shadow-[var(--shadow-lift)] ring-1 ring-rule sm:w-[74%]">
        <Image src="/samples/electricity-bill.png" alt="A sample electricity bill showing Rs. 1,840.00 payable by 21 June 2026" width={1000} height={1400} priority className="block h-auto w-full" />
        {/* Highlighter strokes over the amount and due-date lines (positions from the sample's layout). */}
        <span aria-hidden className={`absolute left-[7%] h-[4.6%] rounded-sm bg-mark/55 mix-blend-multiply transition-[width] duration-700 ease-[var(--ease-out)] ${phase >= 1 ? "w-[35%]" : "w-0"}`} style={{ top: "41.6%" }} />
        <span aria-hidden className={`absolute left-[7%] h-[3.6%] rounded-sm bg-mark/55 mix-blend-multiply transition-[width] delay-200 duration-700 ease-[var(--ease-out)] ${phase >= 1 ? "w-[31%]" : "w-0"}`} style={{ top: "52.2%" }} />
        {phase >= 2 && (
          <span className="absolute right-[6%] top-[44%]">
            <Stamp animate className="bg-white/80 text-sm">
              {d.found}
            </Stamp>
          </span>
        )}
      </div>

      {/* The explanation */}
      <div className={`relative -mt-28 mr-[18%] rounded-[var(--radius-panel)] border border-rule bg-sheet p-5 shadow-[var(--shadow-lift)] transition-[opacity,transform] duration-500 ease-[var(--ease-out)] sm:-mt-36 sm:p-6 ${phase >= 3 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
        <div role="radiogroup" aria-label="Demo language" className="flex gap-1">
          {(Object.keys(DEMO) as DemoLang[]).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={lang === l}
              onClick={() => switchLang(l)}
              className={`min-h-9 rounded-full px-3 text-sm font-semibold ${lang === l ? "bg-ink text-sheet" : "text-ink-2 hover:bg-sheet-2"}`}
            >
              {DEMO[l].tab}
            </button>
          ))}
        </div>
        <div lang={lang === "en-IN" ? "en" : lang.slice(0, 2)} aria-live="polite">
          <p className="mt-4 font-display text-xl text-ink">{d.title}</p>
          <p className="mt-2 text-base leading-relaxed text-ink">{d.body}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-rule pt-3">
            <div>
              <dt className="text-xs text-ink-2">{d.amountLabel}</dt>
              <dd className="text-lg font-bold tabular-nums">₹1,840</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-2">{d.dueLabel}</dt>
              <dd className="text-lg font-bold text-due">{d.due}</dd>
            </div>
          </dl>
        </div>
        <button type="button" onClick={toggleSpeak} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-stamp px-4 text-sm font-semibold text-stamp-ink">
          {speaking ? <Pause className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
          {speaking ? "Stop" : "Listen"}
        </button>
        {voiceNote && <p className="mt-2 text-xs text-ink-2">{voiceNote}</p>}
      </div>
      <figcaption className="mt-4 text-center text-sm text-ink-2">
        Demo with a made-up bill. Nothing is being processed; the demo voice is your browser&rsquo;s own.
      </figcaption>
    </figure>
  );
}
