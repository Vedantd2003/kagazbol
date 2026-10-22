"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences, type Preferences } from "@/lib/preferences";
import { HTML_LANG, UI_STRINGS, type UiStrings } from "@/lib/i18n";

interface PreferencesValue {
  prefs: Preferences;
  /** False until stored preferences have been read (avoids a flash of defaults being saved). */
  loaded: boolean;
  update: (patch: Partial<Preferences>) => void;
  t: UiStrings;
}

const Ctx = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Reading storage must happen after hydration so server and client markup match.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage
    setPrefs(loadPreferences());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    savePreferences(prefs);
    document.documentElement.lang = HTML_LANG[prefs.language];
    document.documentElement.dataset.largeText = String(prefs.largeText);
  }, [prefs, loaded]);

  const update = useCallback((patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch })), []);
  const value = useMemo(() => ({ prefs, loaded, update, t: UI_STRINGS[prefs.language] }), [prefs, loaded, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreferences(): PreferencesValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePreferences must be used inside PreferencesProvider");
  return v;
}
