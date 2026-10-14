"use client";

import { useMemo } from "react";

export interface VoiceMetrics {
  timeToFirstToken?: number;
  timeToFirstAudio?: number;
  totalTurnTime?: number;
}

interface DebugPanelProps {
  metrics: VoiceMetrics;
}

/**
 * Debug panel — only renders when ?debug=1 is in the URL.
 * Shows voice pipeline timing metrics.
 * Visibility is determined by reading window.location at render time (client only).
 */
export function DebugPanel({ metrics }: DebugPanelProps) {
  // Read URL search params synchronously — avoids the set-state-in-effect pattern
  const visible = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug") === "1";
  }, []);

  if (!visible) return null;

  function fmt(ms?: number): string {
    if (ms === undefined) return "—";
    return `${ms}ms`;
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 rounded-xl bg-black/75 px-4 py-3 text-xs text-white shadow-lg backdrop-blur-sm"
      aria-label="Debug panel"
    >
      <p className="mb-1 font-semibold text-white/80 uppercase tracking-wider">Debug</p>
      <table className="border-separate border-spacing-x-3">
        <tbody>
          <tr>
            <td className="text-white/60">First token</td>
            <td className="font-mono">{fmt(metrics.timeToFirstToken)}</td>
          </tr>
          <tr>
            <td className="text-white/60">First audio</td>
            <td className="font-mono">{fmt(metrics.timeToFirstAudio)}</td>
          </tr>
          <tr>
            <td className="text-white/60">Total turn</td>
            <td className="font-mono">{fmt(metrics.totalTurnTime)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
