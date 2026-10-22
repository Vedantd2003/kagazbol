# Voice interaction

## State machine (`src/lib/voice/machine.ts`)

```
idle ──mic──▶ requesting_permission ──granted──▶ recording ──mic/auto-stop(28s)──▶ transcribing
  ▲                 │denied/unsupported                                               │
  │                 ▼                                                                  ▼
  │               error ◀──────── failure at any step ─────────────  awaiting_confirmation
  │                 │dismiss                                          (edit transcript)
  │◀────────────────┘                                                      │confirm
  │                                                                         ▼
  │◀──── text-only ──────────────────────────────────────────────── processing_question
  │                                                                         │answered + voice on
  │◀── ended/stop ── playing_audio ◀──── audio ready ─────────────── generating_audio
                        ▲   │pause
                        └── paused
```

- One state, no competing booleans. Every async result carries a `requestId`; results from an older
  interaction are ignored, so late audio can never start over a newer answer.
- Pressing the mic during playback or while an answer is loading **barges in**: audio stops, the
  pending request is aborted, and recording starts.
- Repeated clicks while requesting permission or transcribing are ignored.
- Switching documents resets the machine and the conversation.

## Playback (`src/lib/audio/controller.ts`)

Play, pause, resume, stop (immediate), replay, seek, and 0.75×/1×/1.25×/1.5× via the native
`playbackRate` with `preservesPitch` — speed changes never regenerate speech. Generated audio is
cached per (language, text) in the tab. If the browser blocks autoplay (iOS Safari), the player
shows "Tap to hear".

## Language policy

1. The language picked in the header is used for explanations, answers and speech.
2. If the user speaks another supported language (from STT `language_code`), KagazBol answers in
   the picked language and offers "Answer in Hindi?" — it never switches silently.
3. Low STT language confidence (< 0.6) marks the transcript "please check".

## Consent and fallbacks

Recording starts only from a tap and stops on tap, cancel, unmount or after 28 s. Permission denied
→ instructions + typing. No MediaRecorder → typing. Voice can be switched off entirely (text-only:
nothing is spoken or recorded). Preferences are stored on the device only.

## Browser notes

- Safari < 14.1 has no MediaRecorder → typing fallback.
- `preservesPitch` is unprefixed in current browsers; older Safari ignores it (pitch shifts at 1.5×).
- Seeking requires the browser to know the WAV duration; it is disabled until metadata loads.
