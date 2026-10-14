"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Skeleton,
  ToastContainer,
  LanguagePill,
  IconButton,
  Sheet,
  PageTransition,
} from "@/components/ui";
import { useToast } from "@/hooks/useToast";
import { useMotionTier, type MotionTier } from "@/hooks/useMotionTier";

if (process.env.NODE_ENV === "production") {
  // In production this page is unreachable — return null from the component below.
}

const LANGUAGE_OPTIONS = [
  { value: "en-IN", label: "EN" },
  { value: "hi-IN", label: "हिं" },
  { value: "mr-IN", label: "मर" },
];

const COLOR_SWATCHES = [
  { name: "background",        var: "--background" },
  { name: "background-subtle", var: "--background-subtle" },
  { name: "foreground",        var: "--foreground" },
  { name: "card",              var: "--card" },
  { name: "card-raised",       var: "--card-raised" },
  { name: "primary",           var: "--primary" },
  { name: "accent",            var: "--accent" },
  { name: "muted",             var: "--muted" },
  { name: "muted-foreground",  var: "--muted-foreground" },
  { name: "border",            var: "--border" },
  { name: "warning",           var: "--warning" },
  { name: "success",           var: "--success" },
  { name: "orb-idle",          var: "--orb-idle" },
  { name: "orb-listen",        var: "--orb-listen" },
  { name: "orb-think",         var: "--orb-think" },
  { name: "orb-speak",         var: "--orb-speak" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">{title}</h2>
      {children}
    </section>
  );
}

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") return null;

  const { toasts, addToast, removeToast } = useToast();
  const { tier, setCalmMode, calmMode } = useMotionTier();
  const [activeLang, setActiveLang] = useState("en-IN");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pageKey, setPageKey] = useState("a");
  const [loadingBtn, setLoadingBtn] = useState(false);

  function fireLoading() {
    setLoadingBtn(true);
    setTimeout(() => setLoadingBtn(false), 2000);
  }

  const TIER_OPTIONS: { value: MotionTier; label: string }[] = [
    { value: "full",    label: "Full" },
    { value: "lite",    label: "Lite" },
    { value: "reduced", label: "Reduced" },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-12">

        {/* Header */}
        <header>
          <h1 className="font-[family-name:var(--font-display)] text-4xl text-primary">
            KagazBol UI Showcase
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Dev-only component library for Phase 1 design system
          </p>
          <p className="text-xs text-warning mt-1">
            This page is only available in development mode (NODE_ENV !== &quot;production&quot;).
          </p>
        </header>

        {/* Motion Tier Switcher */}
        <Section title="Motion Tier">
          <p className="text-sm text-muted-foreground">
            Current tier: <code className="text-accent font-mono">{tier}</code>
            {" · "}Calm mode: <code className="text-accent font-mono">{String(calmMode)}</code>
          </p>
          <div className="flex gap-2 flex-wrap">
            {TIER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={tier === opt.value ? "primary" : "secondary"}
                size="sm"
                onClick={() => setCalmMode(opt.value === "reduced")}
                tier={tier}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Note: &quot;Lite&quot; is auto-detected from hardware; toggling &quot;Reduced&quot; sets calm mode in
            localStorage. Full/Lite buttons only demonstrate styling; actual tier depends on
            hardware detection.
          </p>
        </Section>

        {/* Color Palette */}
        <Section title="Color Palette">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {COLOR_SWATCHES.map((s) => (
              <div key={s.var} className="flex flex-col gap-1">
                <div
                  className="w-full h-12 rounded-[var(--radius-sm)] border border-border-subtle shadow-[var(--shadow-sm)]"
                  style={{ background: `var(${s.var})` }}
                />
                <span className="text-[10px] text-muted-foreground leading-tight">{s.name}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography Scale */}
        <Section title="Typography Scale">
          <div className="flex flex-col gap-3">
            {[
              { label: "4xl", cls: "text-[var(--text-4xl)]", font: "font-[family-name:var(--font-display)]", text: "कागज़बोल — Rozha One" },
              { label: "3xl", cls: "text-[var(--text-3xl)]", font: "font-bold", text: "Document Assistant" },
              { label: "2xl", cls: "text-[var(--text-2xl)]", font: "font-semibold", text: "Heading Two" },
              { label: "xl",  cls: "text-[var(--text-xl)]",  font: "font-semibold", text: "Subheading" },
              { label: "lg",  cls: "text-[var(--text-lg)]",  font: "font-medium",   text: "Large body text" },
              { label: "base",cls: "text-[var(--text-base)]",font: "",              text: "Base body text — 18px" },
              { label: "sm",  cls: "text-[var(--text-sm)]",  font: "",              text: "Small text — labels, hints" },
              { label: "xs",  cls: "text-[var(--text-xs)]",  font: "",              text: "Tiny — captions, timestamps" },
            ].map((row) => (
              <div key={row.label} className="flex items-baseline gap-4">
                <span className="text-xs text-muted-foreground w-10 shrink-0 font-mono">{row.label}</span>
                <span className={[row.cls, row.font].join(" ")}>{row.text}</span>
              </div>
            ))}
            <div className="mt-2 p-3 bg-background-subtle rounded-[var(--radius-md)]">
              <p lang="hi" className="text-[var(--text-base)]">
                हिंदी: यह एक परीक्षण वाक्य है जो देवनागरी लिपि में लिखा गया है।
              </p>
              <p lang="mr" className="text-[var(--text-base)] mt-2">
                मराठी: हे एक चाचणी वाक्य आहे जे देवनागरी लिपीत लिहिलेले आहे।
              </p>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <div className="flex flex-col gap-6">
            {/* Variants */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">Variants (md size)</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary"   tier={tier}>Primary</Button>
                <Button variant="secondary" tier={tier}>Secondary</Button>
                <Button variant="ghost"     tier={tier}>Ghost</Button>
                <Button variant="danger"    tier={tier}>Danger</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">Sizes (primary variant)</p>
              <div className="flex flex-wrap items-end gap-3">
                <Button variant="primary" size="sm" tier={tier}>Small (sm)</Button>
                <Button variant="primary" size="md" tier={tier}>Medium (md)</Button>
                <Button variant="primary" size="lg" tier={tier}>Large (lg)</Button>
              </div>
            </div>

            {/* States */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">States</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" disabled tier={tier}>Disabled</Button>
                <Button
                  variant="primary"
                  isLoading={loadingBtn}
                  onClick={fireLoading}
                  tier={tier}
                >
                  {loadingBtn ? "Loading…" : "Click to load"}
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<span>📄</span>}
                  rightIcon={<span>→</span>}
                  tier={tier}
                >
                  With icons
                </Button>
              </div>
            </div>
          </div>
        </Section>

        {/* Icon Buttons */}
        <Section title="Icon Buttons">
          <div className="flex gap-3 flex-wrap items-center">
            <IconButton aria-label="Primary icon" variant="primary" tier={tier}>✓</IconButton>
            <IconButton aria-label="Secondary icon" variant="secondary" tier={tier}>◎</IconButton>
            <IconButton aria-label="Ghost icon" variant="ghost" tier={tier}>✕</IconButton>
            <IconButton aria-label="Small icon" size="sm" tier={tier}>◀</IconButton>
            <IconButton aria-label="Large icon" size="lg" tier={tier}>🎙</IconButton>
          </div>
        </Section>

        {/* Language Pill */}
        <Section title="Language Pill">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Medium (default)</p>
              <LanguagePill
                options={LANGUAGE_OPTIONS}
                value={activeLang}
                onChange={setActiveLang}
                tier={tier}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Small</p>
              <LanguagePill
                options={LANGUAGE_OPTIONS}
                value={activeLang}
                onChange={setActiveLang}
                size="sm"
                tier={tier}
              />
            </div>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card tier={tier}>
              <p className="font-semibold mb-1">Default Card</p>
              <p className="text-sm text-muted-foreground">Standard shadow, white background.</p>
            </Card>
            <Card elevated tier={tier}>
              <p className="font-semibold mb-1">Elevated Card</p>
              <p className="text-sm text-muted-foreground">Larger shadow, raised background.</p>
            </Card>
            <Card interactive onClick={() => addToast("Card clicked!", "info")} tier={tier}>
              <p className="font-semibold mb-1">Interactive Card</p>
              <p className="text-sm text-muted-foreground">Hover for lift effect. Click me!</p>
            </Card>
          </div>
        </Section>

        {/* Skeletons */}
        <Section title="Skeletons">
          <div className="flex flex-col gap-4 max-w-sm">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Single block (card shape)</p>
              <Skeleton height="120px" className="rounded-[var(--radius-lg)]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Multi-line text (3 lines)</p>
              <Skeleton lines={3} height="1.1em" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Custom size (avatar)</p>
              <Skeleton width="48px" height="48px" className="rounded-full" />
            </div>
          </div>
        </Section>

        {/* Toasts */}
        <Section title="Toast Notifications">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="sm"
              tier={tier}
              onClick={() => addToast("Document processed successfully!", "success")}
            >
              Success toast
            </Button>
            <Button
              variant="danger"
              size="sm"
              tier={tier}
              onClick={() => addToast("Failed to upload document. Please retry.", "error")}
            >
              Error toast
            </Button>
            <Button
              variant="secondary"
              size="sm"
              tier={tier}
              onClick={() => addToast("Processing your request…", "info")}
            >
              Info toast
            </Button>
            <Button
              variant="ghost"
              size="sm"
              tier={tier}
              onClick={() =>
                addToast("This toast stays until dismissed.", "info", 0)
              }
            >
              Persistent toast
            </Button>
          </div>
        </Section>

        {/* Bottom Sheet */}
        <Section title="Bottom Sheet">
          <Button variant="secondary" tier={tier} onClick={() => setSheetOpen(true)}>
            Open sheet
          </Button>
          <Sheet
            isOpen={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title="Sample Sheet"
            tier={tier}
          >
            <div className="flex flex-col gap-4">
              <p className="text-foreground">
                This is a bottom sheet. You can swipe down or press Escape to close it.
              </p>
              <Skeleton lines={3} />
              <Button
                variant="primary"
                tier={tier}
                onClick={() => setSheetOpen(false)}
              >
                Done
              </Button>
            </div>
          </Sheet>
        </Section>

        {/* Page Transition */}
        <Section title="Page Transition">
          <p className="text-sm text-muted-foreground">
            Click the buttons to swap the content with an animated cross-fade.
          </p>
          <div className="flex gap-2">
            <Button variant={pageKey === "a" ? "primary" : "secondary"} size="sm" tier={tier} onClick={() => setPageKey("a")}>
              Page A
            </Button>
            <Button variant={pageKey === "b" ? "primary" : "secondary"} size="sm" tier={tier} onClick={() => setPageKey("b")}>
              Page B
            </Button>
          </div>
          <div className="min-h-[80px] bg-background-subtle rounded-[var(--radius-lg)] overflow-hidden">
            <PageTransition layoutKey={pageKey} tier={tier}>
              <div className="p-4">
                {pageKey === "a" ? (
                  <p className="text-foreground font-medium">Content for Page A — fades in from below.</p>
                ) : (
                  <p className="text-accent font-medium">Content for Page B — also fades in from below.</p>
                )}
              </div>
            </PageTransition>
          </div>
        </Section>

      </div>

      {/* Toast container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
