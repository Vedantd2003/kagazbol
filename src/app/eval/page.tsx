import type { Metadata } from "next";
import { EvalDashboard } from "@/components/eval/EvalDashboard";

export const metadata: Metadata = { title: "KagazBol — Reliability", robots: { index: false, follow: false } };

export default function EvalPage() {
  return <EvalDashboard />;
}
