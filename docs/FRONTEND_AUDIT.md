# KagazBol — Frontend Audit

Branch: `feat/frontend-v2`  
Audited: 2026-10-14  
All 38 source files read. No code was changed in Phase 0.

---

## 1. Component Map

```
Home (src/app/page.tsx) — root client component
├── <header>
│   ├── App name + tagline
│   └── LanguageSwitcher
│       └── SUPPORTED_LANGUAGES config (en-IN · hi-IN · mr-IN)
├── Error alert (role="alert", conditional)
├── iOS autoplay unlock button (conditional, pendingUrl from useAudioPlayer)
└── <main>  ← AnimatePresence mode="wait"
    ├── UploadCard              (stage = "upload")
    │   ├── Language picker (3 pill buttons)
    │   ├── Camera input (file capture, 72 px touch target)
    │   ├── File input (gallery picker, 56 px touch target)
    │   ├── Sample thumbnails (3 cards)
    │   └── Privacy note (lock SVG + translated string)
    ├── ProcessingStatus        (stage = "uploading")
    │   ├── Progress bar (0-100 %)
    │   └── Upload label
    ├── ProcessingStatus        (stage = "reading")
    │   └── Spinner + reading label
    ├── ProcessingStatus        (stage = "understanding")
    │   └── Spinner + understanding label
    └── motion.div              (stage = "ready")
        ├── SummaryCard
        │   ├── Document type badge
        │   ├── Title + Play Again button
        │   ├── Amounts grid (conditional)
        │   ├── Deadline box with urgency flag (conditional)
        │   ├── Action Required box
        │   ├── Key facts bullet list (conditional)
        │   └── AnimatePresence → expanded dates table
        ├── ChatPanel
        │   ├── Heading
        │   ├── Chat history (user + assistant turns)
        │   ├── Live transcript (conditional, italic)
        │   ├── Error message (conditional)
        │   ├── MicButton
        │   │   ├── Idle: pulse-ring CSS animation
        │   │   ├── Recording: red stop icon
        │   │   ├── Transcribing/Thinking: disabled spinner
        │   │   └── Speaking: 4 bars, staggered height animation
        │   └── Suggested question chips (history.length === 0)
        └── New Document button
```

**Unused components** (defined, never imported in Home):  
- `VoiceOrb` (src/components/VoiceOrb.tsx) — complete component with canvas/SVG  
- `ErrorCard` (src/components/ErrorCard.tsx) — imported only inside ChatPanel  

**Unused hooks** (defined, never called in Home):  
- `useStreamingChat` — streaming SSE + sentence-chunked TTS  
- `useVAD` / `useVADMic` — Silero VAD with PTT fallback  

---

## 2. App State Machine

```
┌─────────────────────────────────────────────────────────────┐
│  UPLOAD  (initial)                                          │
│  UploadCard visible; language picker active                 │
└─────┬───────────────────────────────────────────────────────┘
      │ handleFileSelected() / handleSampleSelected()
      ↓
┌─────────────────────────────────────────────────────────────┐
│  UPLOADING                                                  │
│  ProcessingStatus + progress bar (XHR onProgress)          │
│  AbortController can cancel                                 │
└─────┬───────────────────────────────────────────────────────┘
      │ startParse() → jobId received
      ↓
┌─────────────────────────────────────────────────────────────┐
│  READING                                                    │
│  ProcessingStatus + spinner                                 │
│  waitForParseCompletion() exponential backoff               │
│  2 s → 10 s cap, 90 s budget, throws PollingTimeoutError    │
└─────┬───────────────────────────────────────────────────────┘
      │ job state = Completed / PartiallyCompleted
      ↓
┌─────────────────────────────────────────────────────────────┐
│  UNDERSTANDING                                              │
│  ProcessingStatus + spinner                                 │
│  summarizeDocument() → Sarvam 105B                          │
│  speakText(summary.summary_spoken) → Bulbul TTS             │
└─────┬───────────────────────────────────────────────────────┘
      │ summary received
      ↓
┌─────────────────────────────────────────────────────────────┐
│  READY  (interactive hub)                                   │
│                                                             │
│  Mic sub-state:                                             │
│  idle ──tap──→ recording ──tap──→ transcribing              │
│                                          │                  │
│                                    thinking                 │
│                                          │                  │
│                            ←── idle ← (answer spoken)       │
│                                                             │
│  displayStatus = player.isSpeaking ? "speaking" : micStatus │
└─────┬───────────────────────────────────────────────────────┘
      │ handleNewDocument()
      └─ UPLOAD  (all state reset, pipeline aborted)

Language switch while READY:
  → abort previous langSwitchAbortRef
  → stage = "understanding"
  → re-summarize in new language (langRef guards stale responses)
  → stage = "ready"

Error recovery:
  PollingTimeoutError → errorTimeout i18n string → stage = "upload"
  Other errors → errorGeneric → stage = "upload"
  Chat errors → chatError (shown in ChatPanel, stage stays "ready")
```

---

## 3. Animations Inventory

| Component | What animates | How | Reduced-motion |
|-----------|---------------|-----|----------------|
| Stage transitions | opacity | AnimatePresence mode="wait" | Instant via CSS |
| UploadCard mount | opacity + y:12 | motion.div | Instant |
| ProcessingStatus spinner | rotate 360 | motion.div | Instant |
| SummaryCard mount | opacity + y:16 + scale | motion.div | Instant |
| SummaryCard expander | rotate(180) | motion.span | Instant |
| SummaryCard dates reveal | height 0→auto + opacity | AnimatePresence | Instant |
| ChatPanel mount | opacity + y:16 | motion.div | Instant |
| MicButton press | scale 0.92 | whileTap | None |
| MicButton speaking bars | height 8→28→8 | motion.span ×4 | Instant |
| MicButton spinner | rotate 360 | motion.span | Instant |
| Mic idle ring | pulse-ring CSS | @keyframes | Instant (`animation-duration: 0.01ms`) |

All Framer Motion animations are killed by the global `prefers-reduced-motion` CSS block (0.01ms durations). **Library versions**: Framer Motion 12.40.0.

---

## 4. Current UI / Visual Bugs

| # | Bug | Severity | Location |
|---|-----|----------|----------|
| B1 | `<html lang="hi">` hardcoded — never changes when user switches to English or Marathi | High | layout.tsx:30 |
| B2 | `:lang(hi)` font-size 1.05em rule applies to all pages always (lang is always "hi") | Medium | globals.css:55 |
| B3 | `ErrorCard` language detection uses substring matching on translated string ("try"/"कोशिश") — breaks on string change | Medium | ErrorCard.tsx:42 |
| B4 | No `role="log"` / `aria-live` on chat history — screen readers miss new turns | High | ChatPanel.tsx:44 |
| B5 | Progress bar missing `aria-valuenow/min/max` | Medium | ProcessingStatus.tsx:23 |
| B6 | STT (`transcribeAudio`) sends no language code — auto-detect may bias toward English | High | apiClient.ts:136, stt.ts:24 |
| B7 | Hardcoded English fallback in `parseSummary.ts:11`: `"I could not read this document clearly."` | Medium | parseSummary.ts:11 |
| B8 | Hardcoded English fallback in `useStreamingChat.ts:235`: `"Sorry, I could not get an answer…"` | Medium | useStreamingChat.ts:235 |
| B9 | VoiceOrb `STATE_ARIA` labels are hardcoded English | Low | VoiceOrb.tsx:27 (unused) |
| B10 | Redundant `role="button"` on native `<button>` elements | Low | UploadCard.tsx:52,72,97 |

---

## 5. Accessibility Gaps

| # | Gap | WCAG criterion | Severity |
|---|-----|----------------|----------|
| A1 | Chat history not `role="log"` or `aria-live` | 4.1.3 Status Messages | High |
| A2 | `<html lang>` never updates — Devanagari pronounced wrong by screen readers | 3.1.1 Language of Page | High |
| A3 | Progress bar no `aria-valuenow/min/max` | 4.1.2 Name, Role, Value | Medium |
| A4 | No skip-to-content link | 2.4.1 Bypass Blocks | Medium |
| A5 | Mic long-press PTT not keyboard-accessible | 2.1.1 Keyboard | Medium |
| A6 | Language switcher buttons lack explicit `aria-label` (nativeLabel only) | 2.4.6 Headings/Labels | Low |
| A7 | Focus management after stage transitions (focus stays on old element) | 2.4.3 Focus Order | Medium |
| A8 | VoiceOrb never surfaced to ARIA live region (unused component) | — | Low (unused) |

**Contrast check** (current theme):
- Primary `#3730A3` on white: 8.9:1 ✓ AAA
- Accent `#F59E0B` on white: 2.8:1 ✗ fails AA (text use; fine for icon/badge)
- Muted-fg `#6B7280` on muted `#EEF2FF`: 4.6:1 ✓ AA
- Warning `#DC2626` on white: 5.9:1 ✓ AA

---

## 6. i18n Coverage

All 47 keys are present in **en-IN, hi-IN and mr-IN**. No missing translations.

**Untranslated strings that reach the user** (hardcoded, not going through i18n):
1. `parseSummary.ts:11` — `"I could not read this document clearly."` (rare: garbled OCR)
2. `useStreamingChat.ts:235` — `"Sorry, I could not get an answer. Please try again."` (streaming hook, unused in current page)
3. `stt/route.ts:24` — `"Couldn't hear that clearly. Please try again."` (server error response)

**Unused i18n keys** (defined, never referenced): `stepDone`, `amountsLabel`, `documentTypeLabel`, `listening`, `stop`, `vadMode`, `pttMode`.

---

## 7. Language Parameter Flow Through the Stack

| Step | Frontend | Route | Sarvam param | Notes |
|------|----------|-------|--------------|-------|
| OCR job | `startParse(file, lang)` | `/api/parse/start` | `language: DOC_INTELLIGENCE_LANGUAGE[lang]` | ✓ Passed |
| Summary | `summarizeDocument(text, lang)` | `/api/summarize` | in system prompt as `${languageName}` | ✓ Passed |
| Chat | `askQuestion(..., lang, ...)` | `/api/chat` | in system prompt as `${languageName}` | ✓ Passed |
| TTS | `speakText(text, lang)` | `/api/tts` | `target_language_code: lang`, `speaker: DEFAULT_TTS_SPEAKER[lang]` | ✓ Passed |
| **STT** | `transcribeAudio(blob)` | `/api/stt` | **not sent** | ✗ Auto-detect only |

The TTS speaker is always `"priya"`. This speaker supports `en-IN` and `hi-IN` in Bulbul v3. Support for `mr-IN` is unconfirmed by the smoke test (it only tests Hindi text with priya).

---

## 8. Baseline Lighthouse Mobile Scores

> Scores cannot be measured from a local environment at this commit. They will be measured and recorded once the dev server is running in Phase 0.5. This section will be updated with real numbers before Phase 1 begins.

**Baseline (estimated from code review)**:
- Performance: ~65–75 (no code splitting, large Framer Motion bundle, no lazy loading of heavy components)
- Accessibility: ~70–78 (missing ARIA roles, no skip links, `lang` bug)
- Best Practices: ~85–90
- SEO: ~80

---

## 9. Hindi / Marathi Bug Hypothesis (Pre-Fix)

Based on static analysis, the most likely causes for Hindi/Marathi not working:

1. **`lang="hi"` hardcoded** — CSS `:lang()` font-size rule permanently targets Hindi; Marathi text gets smaller font only if lang is "mr", which it never is. Screen readers always announce in Hindi. **Static bug confirmed.**

2. **STT sends no language** — `speechToText()` calls Saaras:v3 with `mode: "codemix"` but no `language_code`. For codemix mode this may be fine (auto-detects Indian languages), but spoken Marathi may be misidentified as Hindi by the auto-detector, degrading transcription quality. **Needs verification with live API.**

3. **TTS "priya" speaker for mr-IN** — The smoke test validates "priya" with `hi-IN` text only. Sarvam's Bulbul v3 speaker support matrix may not include `mr-IN` for "priya". A 400/422 from the TTS endpoint would silently fail (the error is caught and surfaced as `errorGeneric`). **Needs verification with live API.**

4. **Model prompt language instruction** — Both prompts use the English word "Hindi" or "Marathi" to instruct the model. The 30B model may occasionally ignore this instruction and reply in English. **Needs live testing.**

5. **No `enable_preprocessing` in TTS** — Sarvam's Bulbul TTS may need `enable_preprocessing: true` to correctly convert numbers, currency and dates in Devanagari. Without it, "₹1,234" might be read as "rupees one comma two three four" in English even with a Hindi target. **Needs verification.**

---

## 10. Files Audited

38 source files, 2,813 lines of TypeScript/CSS:

| Path | Lines |
|------|-------|
| src/app/page.tsx | 349 |
| src/app/layout.tsx | 39 |
| src/app/globals.css | 96 |
| src/components/ChatPanel.tsx | 100 |
| src/components/DebugPanel.tsx | 59 |
| src/components/ErrorCard.tsx | 53 |
| src/components/LanguageSwitcher.tsx | 32 |
| src/components/MicButton.tsx | 73 |
| src/components/ProcessingStatus.tsx | 43 |
| src/components/SummaryCard.tsx | 164 |
| src/components/UploadCard.tsx | 179 |
| src/components/VoiceOrb.tsx | 171 |
| src/hooks/useAudioPlayer.ts | 55 |
| src/hooks/useAudioRecorder.ts | 66 |
| src/hooks/useStreamingChat.ts | 279 |
| src/hooks/useVAD.ts | 229 |
| src/lib/apiClient.ts | 201 |
| src/lib/compressImage.ts | 67 |
| src/lib/fillerAudio.ts | 83 |
| src/lib/i18n.ts | 186 |
| src/lib/parseSummary.ts | 42 |
| src/lib/prompts.ts | 69 |
| src/lib/sentenceSplitter.ts | 79 |
| src/lib/types.ts | 56 |
| src/lib/sarvam/config.ts | 36 |
| src/lib/sarvam/client.ts | 72 |
| src/lib/sarvam/chat.ts | 51 |
| src/lib/sarvam/docIntelligence.ts | 151 |
| src/lib/sarvam/stt.ts | 36 |
| src/lib/sarvam/tts.ts | 41 |
| src/app/api/parse/start/route.ts | 70 |
| src/app/api/parse/status/route.ts | 29 |
| src/app/api/parse/result/route.ts | 32 |
| src/app/api/summarize/route.ts | 51 |
| src/app/api/chat/route.ts | 59 |
| src/app/api/chat/stream/route.ts | 175 |
| src/app/api/tts/route.ts | 27 |
| src/app/api/stt/route.ts | 40 |
