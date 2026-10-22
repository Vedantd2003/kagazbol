"use client";

import { Drawer } from "@/components/ui/Dialog";
import { usePreferences } from "@/hooks/usePreferences";
import { PLAYBACK_RATES } from "@/lib/audio/controller";

function Toggle({ id, label, hint, checked, onChange, disabled }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-rule py-4 last:border-0">
      <div>
        <label htmlFor={id} className={`font-semibold ${disabled ? "text-ink-3" : ""}`}>
          {label}
        </label>
        {hint && <p id={`${id}-hint`} className="mt-0.5 text-sm text-ink-2">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-8 w-14 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${checked ? "bg-stamp" : "bg-rule-strong"}`}
      >
        <span className={`absolute top-1 left-1 size-6 rounded-full bg-sheet shadow transition-transform duration-200 ${checked ? "translate-x-6" : ""}`} />
      </button>
    </div>
  );
}

export function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, update, t } = usePreferences();
  return (
    <Drawer open={open} onClose={onClose} title={t.settingsTitle} closeLabel={t.close}>
      <Toggle id="pref-voice" label={t.voiceAssistance} hint={t.voiceAssistanceHint} checked={prefs.voiceEnabled} onChange={(v) => update({ voiceEnabled: v })} />
      <Toggle id="pref-autoplay" label={t.autoPlay} checked={prefs.autoPlay} disabled={!prefs.voiceEnabled} onChange={(v) => update({ autoPlay: v })} />
      <Toggle id="pref-guidance" label={t.spokenGuidance} checked={prefs.spokenGuidance} disabled={!prefs.voiceEnabled} onChange={(v) => update({ spokenGuidance: v })} />
      <Toggle id="pref-large" label={t.largeText} checked={prefs.largeText} onChange={(v) => update({ largeText: v })} />
      <fieldset className="py-4">
        <legend className="font-semibold">{t.playbackSpeed}</legend>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {PLAYBACK_RATES.map((r) => (
            <label key={r} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border text-base font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-stamp ${prefs.playbackRate === r ? "border-ink bg-ink text-sheet" : "border-rule-strong text-ink-2 hover:border-ink-2"}`}>
              <input type="radio" name="rate" className="sr-only" checked={prefs.playbackRate === r} onChange={() => update({ playbackRate: r })} />
              {r}×
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-2 text-sm text-ink-2">{t.savedOnDevice}</p>
      <button type="button" onClick={onClose} className="mt-6 min-h-12 w-full rounded-[var(--radius-control)] bg-ink font-semibold text-sheet">
        {t.done}
      </button>
    </Drawer>
  );
}
