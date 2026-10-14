# Changelog

## v2.0.0 — 2026-10-14

Full rebuild on top of the original v1 scaffold. All changes are on the `upgrade/v2` branch.

### Security

- **Removed hardcoded API key** from `render.yaml` (`sync: false` replaces the exposed secret).
- API key is now always server-side only; the browser never receives it.

### Bug fixes (Phase 1)

- **Polling timeout not translated** — introduced `PollingTimeoutError` class and `errorTimeout` i18n key; `page.tsx` catches it and shows the correct language string.
- **Language-switch race condition** — added `langRef` to track the most recently requested language and silently discard stale re-summarize responses from superseded switches.
- **iOS Safari autoplay blocked** — detects `NotAllowedError` from `audio.play()`, stores `pendingUrl`, and renders a tap-to-play button that unlocks audio as a real user gesture.
- **Non-image files accepted by `/api/parse/start`** — added a MIME-type allowlist (jpeg / png / webp / heic); non-images now get a descriptive 400.
- **Missing `reasoning_effort`** — `chatCompletion()` now sends `reasoning_effort: "low"` to keep the hidden reasoning step short and reduce `finish_reason: "length"` occurrences.
- **Mic stream leaked on unmount** — `useAudioRecorder` now stops all MediaStream tracks in a `useEffect` cleanup.
- **No progress feedback during upload** — `startParse()` switched to XHR so `onProgress` callbacks work; `ProcessingStatus` now accepts an optional `progress` prop and renders a determinate bar.
- **Accessibility gaps** — `ProcessingStatus` has `role="status"` and `aria-live="polite"`; `SummaryCard`'s expand button has `aria-expanded`; chevron icon is `aria-hidden`.

### New features (Phase 1)

- **Client-side image compression** (`src/lib/compressImage.ts`) — resizes longest edge to ≤ 2 000 px and re-encodes as JPEG 0.85 quality before upload; falls back to original on Canvas failure.
- **Cancellable pipeline** — `AbortController` refs in `page.tsx` allow in-flight OCR/summarize/TTS jobs to be cleanly cancelled when the user uploads a second document or switches language.
- **Vitest unit tests** — 15 tests across `parseSummary.test.ts` and `polling.test.ts` covering JSON extraction, polling state machine, timeout, and abort.
- **Playwright e2e** — 3 happy-path tests with all 7 Sarvam routes mocked; verifies pipeline → summary card, language switching, and new-document flow.

### Streaming voice pipeline (Phase 2)

- **`/api/chat/stream`** — new SSE route; calls Sarvam with `stream: true`, emits `reasoning_started` / `content_delta` / `done` / `error` events, filters `reasoning_content` blocks entirely.
- **`src/lib/sentenceSplitter.ts`** — Devanagari-aware sentence boundary detection; splits on dandas (। ॥) and Western punctuation; avoids false splits on decimals and common abbreviations.
- **`src/hooks/useStreamingChat.ts`** — manages the SSE consumer + sentence-chunked TTS queue with strictly ordered playback; triggers filler audio during the reasoning delay.
- **`src/hooks/useVAD.ts`** — wraps `@ricky0123/vad-react` (Silero VAD); gracefully degrades to push-to-talk when `AudioWorklet` is unavailable or mic permission is denied.
- **`src/lib/fillerAudio.ts`** — filler clip playback with `GainNode` fade-out on barge-in.
- **`src/components/VoiceOrb.tsx`** — animated central orb with idle / listening / thinking / speaking / interrupted states; respects `prefers-reduced-motion`.
- **`src/components/DebugPanel.tsx`** — dev-only panel shown at `?debug=1` displaying SSE event log, latency, and queue depth.
- **`scripts/gen-fillers.ts`** — generates filler TTS clips into `public/audio/fillers/`; run with `npm run gen:fillers` (requires `SARVAM_API_KEY`).
- **`scripts/bench-voice.ts`** — measures streaming vs non-streaming TTFA (time-to-first-audio); writes `docs/VOICE_LATENCY.md`; no numbers are hardcoded.

### Evaluation harness (Phase 3)

- **`eval/schema/labels.schema.json`** — JSON Schema for ground-truth label files.
- **`eval/metrics.ts`** — amount normalisation (lakh / crore / k suffixes, currency symbols), date normalisation (DD/MM/YYYY ↔ ISO), fuzzy string matching, per-field and aggregate scoring.
- **`eval/run.ts`** — evaluation runner: discovers `eval/data/*.json` files, runs summarise + chat against each, scores with LLM-judge groundedness check, writes `docs/EVAL.md`.
- **`eval/samples/`** — three synthetic scaffold documents (electricity bill, prescription, bank notice); excluded from published accuracy numbers.
- `eval/data/` is git-ignored (real masked documents go here).

### Frontend redesign — Direction B: Indigo & Mist (Phase 4)

- **`src/app/globals.css`** — Design tokens: `--primary: #3730A3` (Indigo 700), `--accent: #F59E0B` (Amber 400), `--background: #F8F7FF`; full dark-mode palette; 18 px base font, 20 px for Devanagari; `prefers-reduced-motion` guard; `focus-visible` ring.
- **`src/app/layout.tsx`** — Noto Sans + Noto Sans Devanagari loaded from Google Fonts; updated `<title>` and `<meta>` description.
- **`src/components/UploadCard.tsx`** — 72 px camera button; in-card language picker (EN / हि / म); privacy note with lock icon.
- **`src/components/SummaryCard.tsx`** — play-again button; urgent deadline highlight (red badge within 7 days).
- **`src/components/ChatPanel.tsx`** — suggested-question chips shown when history is empty; `onSuggestedQuestion` prop.
- **`src/components/ErrorCard.tsx`** — friendly error card with retry CTA (replaces inline red div).
- **`src/app/page.tsx`** — wires `handlePlayAgain` → `SummaryCard`, `handleSuggestedQuestion` → `ChatPanel`, `language`/`onLanguageChange` → `UploadCard`.

### Internationalisation additions

All three language objects (`en-IN` / `hi-IN` / `mr-IN`) gained:
`errorTimeout`, `errorInvalidFile`, `tapToHear`, `privacyNote`, `playAgain`, `suggestedQ1/Q2/Q3`, `vadMode`, `pttMode`.

### Documentation (Phase 5)

- **`docs/ANALYSIS.md`** — Phase 0 architecture analysis; Mermaid sequence diagram; all 7 API routes documented; 15 bugs catalogued with severity, file, and fix.
- **`docs/DESIGN.md`** — two design directions; Direction B rationale.
- **`docs/EVAL.md`** — evaluation results template (populated by `npm run eval`).
- **`docs/VOICE_LATENCY.md`** — benchmark results template (populated by `npm run bench:voice`).
- **`README.md`** — full rewrite: updated architecture diagram (streaming path), all scripts, evaluation/benchmark instructions, Render + Vercel deployment notes, design and privacy sections, project structure tree.
- **`CHANGELOG.md`** — this file.

### Dependency changes

| Package | Change |
|---|---|
| `@ricky0123/vad-react ^0.0.37` | Added — VAD (Silero) |
| `@ricky0123/vad-web ^0.0.31` | Added — VAD core |
| `sharp ^0.35.5` | Added (devDep) — Next.js image optimisation |
| `@playwright/test ^1.64.0` | Added (devDep) — e2e tests |
| `@testing-library/dom ^10.4.2` | Added (devDep) |
| `@testing-library/jest-dom ^7.0.1` | Added (devDep) |
| `@testing-library/react ^16.3.3` | Added (devDep) |
| `@vitest/coverage-v8 ^5.0.4` | Added (devDep) |
| `vitest ^5.0.4` | Added (devDep) |
| `dotenv ^17.4.2` | Added (devDep) — smoke test / eval scripts |
| `tsx ^4.22.4` | Added (devDep) — script runner |

---

## v1.0.0 — initial scaffold

Original prototype: single-route OCR → summarize → non-streaming voice Q&A.
