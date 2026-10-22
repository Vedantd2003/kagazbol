import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { PreferencesProvider, usePreferences } from "@/hooks/usePreferences";
import { AudioPlayer } from "@/components/app/AudioPlayer";
import { errorMessage } from "@/hooks/useDocumentPipeline";
import { UI_STRINGS } from "@/lib/i18n";
import type { AudioApi } from "@/hooks/useAudio";

function fakeAudio(status: AudioApi["snapshot"]["status"], key = "k"): AudioApi {
  return {
    snapshot: { status, currentTime: 2, duration: 10, rate: 1, key, error: null },
    speak: vi.fn(), play: vi.fn(), pause: vi.fn(), resume: vi.fn(), stop: vi.fn(), replay: vi.fn(), seek: vi.fn(), setRate: vi.fn(), clear: vi.fn(),
  } as unknown as AudioApi;
}

function VoiceOff() {
  const { update } = usePreferences();
  return <button onClick={() => update({ voiceEnabled: false })}>voice off</button>;
}

beforeEach(() => localStorage.clear());

describe("LanguageSwitch", () => {
  it("is a labelled radio group with native names", () => {
    const onChange = vi.fn();
    render(<LanguageSwitch value="en-IN" onChange={onChange} label="Language" />);
    expect(screen.getByRole("radiogroup", { name: "Language" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "English" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "मराठी" }));
    expect(onChange).toHaveBeenCalledWith("mr-IN");
    fireEvent.click(screen.getByRole("radio", { name: "English" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("AudioPlayer", () => {
  it("offers Listen when nothing is loaded, and fetches on click", () => {
    const onListen = vi.fn();
    render(<PreferencesProvider><AudioPlayer audio={fakeAudio("empty", null as unknown as string)} audioKey="k" onListen={onListen} loading={false} failed={false} /></PreferencesProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Listen" }));
    expect(onListen).toHaveBeenCalled();
  });

  it("controls a playing clip: pause, stop, replay, seek and speed without refetching", () => {
    const audio = fakeAudio("playing");
    const onListen = vi.fn();
    render(<PreferencesProvider><AudioPlayer audio={audio} audioKey="k" onListen={onListen} loading={false} failed={false} /></PreferencesProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(audio.pause).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(audio.stop).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Play again" }));
    expect(audio.replay).toHaveBeenCalled();
    fireEvent.change(screen.getByRole("slider", { name: "Playback position" }), { target: { value: "5" } });
    expect(audio.seek).toHaveBeenCalledWith(5);
    fireEvent.click(screen.getByRole("button", { name: "0.75×" }));
    expect(audio.setRate).toHaveBeenCalledWith(0.75);
    expect(onListen).not.toHaveBeenCalled();
  });

  it("shows a retry when audio failed, and disappears in text-only mode", async () => {
    const onListen = vi.fn();
    render(
      <PreferencesProvider>
        <VoiceOff />
        <AudioPlayer audio={fakeAudio("empty")} audioKey="other" onListen={onListen} loading={false} failed />
      </PreferencesProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Try audio again" }));
    expect(onListen).toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByText("voice off")));
    expect(screen.queryByRole("button", { name: "Listen" })).toBeNull();
  });
});

describe("pipeline error messages", () => {
  it("are localised and never show English server text in Hindi/Marathi", () => {
    const e = { kind: "generic" as const, serverMessage: "Upstream exploded", retryFrom: "upload" as const };
    expect(errorMessage(e, UI_STRINGS["en-IN"], "en-IN")).toBe("Upstream exploded");
    expect(errorMessage(e, UI_STRINGS["hi-IN"], "hi-IN")).toBe(UI_STRINGS["hi-IN"].errorGeneric);
    expect(errorMessage({ ...e, kind: "timeout" }, UI_STRINGS["mr-IN"], "mr-IN")).toBe(UI_STRINGS["mr-IN"].errorTimeout);
  });
  it("every language has every UI string", () => {
    const keys = Object.keys(UI_STRINGS["en-IN"]).sort();
    for (const l of ["hi-IN", "mr-IN"] as const) {
      expect(Object.keys(UI_STRINGS[l]).sort()).toEqual(keys);
      for (const k of keys) expect(UI_STRINGS[l][k as keyof typeof UI_STRINGS["en-IN"]]).toBeTruthy();
    }
  });
});
