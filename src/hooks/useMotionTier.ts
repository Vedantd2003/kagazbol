"use client";
import { useEffect, useState } from "react";

export type MotionTier = "full" | "lite" | "reduced";

// Calm mode is persisted in localStorage so it survives page refresh.
const CALM_KEY = "kagazbol:calmMode";

function detectTier(): MotionTier {
  if (typeof window === "undefined") return "full";
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return "reduced";
  if (localStorage.getItem(CALM_KEY) === "true") return "reduced";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory   = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  const lowCores    = navigator.hardwareConcurrency <= 4;
  const saveData    = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  if (lowMemory || (lowCores && saveData)) return "lite";
  return "full";
}

export function useMotionTier() {
  const [tier, setTier] = useState<MotionTier>("full");
  const [calmMode, setCalmModeState] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CALM_KEY) === "true";
    setCalmModeState(stored);
    setTier(detectTier());
  }, []);

  function setCalmMode(on: boolean) {
    localStorage.setItem(CALM_KEY, String(on));
    setCalmModeState(on);
    setTier(on ? "reduced" : detectTier());
  }

  return { tier, calmMode, setCalmMode };
}
