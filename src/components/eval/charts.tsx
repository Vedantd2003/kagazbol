"use client";

import { useState } from "react";

/**
 * Two small, single-series charts. Single series → no legend; values are always
 * printed as text so nothing depends on colour, and each chart has a table
 * equivalent elsewhere on the page.
 */

export function BarList({ items, label }: { items: { name: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul aria-label={label} className="space-y-2.5">
      {items.map((i) => (
        <li key={i.name} className="grid grid-cols-[minmax(0,12rem)_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate text-ink-2" title={i.name}>{i.name}</span>
          <span className="h-3 rounded-r-[4px] bg-stamp" style={{ width: `${(i.value / max) * 100}%`, minWidth: 4 }} aria-hidden />
          <span className="text-right font-semibold tabular-nums text-ink">{i.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Line of one metric across runs (0–1 scale), oldest → newest, with a hover readout. */
export function TrendLine({ points, label, format }: { points: { id: string; date: string; value: number }[]; label: string; format: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = 160, P = { l: 36, r: 12, t: 12, b: 24 };
  const x = (i: number) => P.l + (points.length === 1 ? 0 : (i / (points.length - 1)) * (W - P.l - P.r));
  const y = (v: number) => P.t + (1 - v) * (H - P.t - P.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const h = hover != null ? points[hover] : null;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${label}: ${points.map((p) => format(p.value)).join(", ")}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          let best = 0;
          points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
          setHover(best);
        }}>
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line x1={P.l} x2={W - P.r} y1={y(g)} y2={y(g)} stroke="var(--rule)" strokeWidth={1} />
            <text x={P.l - 6} y={y(g) + 4} textAnchor="end" fontSize={11} fill="var(--ink-3)">{Math.round(g * 100)}%</text>
          </g>
        ))}
        <path d={d} fill="none" stroke="var(--stamp)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.id} cx={x(i)} cy={y(p.value)} r={hover === i ? 5 : 4} fill="var(--stamp)" stroke="var(--sheet)" strokeWidth={2} />
        ))}
        {h && hover != null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="var(--ink-3)" strokeDasharray="3 3" />}
      </svg>
      <figcaption className="mt-1 min-h-5 text-sm text-ink-2" aria-live="polite">
        {h ? <>{new Date(h.date).toLocaleString()} — <strong className="text-ink">{format(h.value)}</strong></> : label}
      </figcaption>
    </figure>
  );
}
