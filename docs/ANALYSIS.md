# KagazBol — Phase 0 Analysis

> Branch: `upgrade/v2` · Author: senior full-stack / AI engineer review · Date: 2026-10-14

---

## 1. Architecture Overview

KagazBol is a single-page Next.js 16 app (App Router, all routes `runtime = "nodejs"`).  
There is no database, no authentication, and no server-side document storage.  
All Sarvam AI API calls are server-side only — the API key never reaches the browser.  
All session state lives in React `useState` in `src/app/page.tsx`.

### Request-flow diagram

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Next.js API Routes
    participant S as Sarvam AI

    Note over B,S: ── Document pipeline ──

    B->>N: POST /api/parse/start (FormData: file, language)
    N->>S: POST /doc-digitization/job/v1 (create job)
    N->>S: POST /doc-digitization/job/v1/upload-files (presigned URL)
    N->>S: PUT <Azure Blob SAS URL> (raw bytes)
    N->>S: POST /doc-digitization/job/v1/{jobId}/start
    N-->>B: { jobId }

    loop poll every 2.5 s (max 40 times = 100 s)
        B->>N: GET /api/parse/status?jobId=…
        N->>S: GET /doc-digitization/job/v1/{jobId}/status
        N-->>B: { state }
    end

    B->>N: GET /api/parse/result?jobId=…
    N->>S: POST /doc-digitization/job/v1/{jobId}/download-files
    N->>S: GET <Azure presigned download URL> (ZIP)
    N-->>B: { ocrText }

    B->>N: POST /api/summarize (ocrText, language)
    N->>S: POST /v1/chat/completions (sarvam-105b, structured JSON prompt)
    N-->>B: { summary: DocumentSummary, latencyMs, model }

    B->>N: POST /api/tts (summary.summary_spoken, language)
    N->>S: POST /text-to-speech (bulbul:v3)
    N-->>B: { audioUrl: data:audio/wav;base64,… }
    B->>B: HTMLAudioElement.play()

    Note over B,S: ── Voice Q&A loop ──

    B->>B: MediaRecorder.start() (mic)
    B->>B: MediaRecorder.stop()
    B->>N: POST /api/stt (FormData: audio blob)
    N->>S: POST /speech-to-text (saaras:v3, mode=codemix)
    N-->>B: { transcript }

    B->>N: POST /api/chat (ocrText, summary, language, history, question)
    N->>S: POST /v1/chat/completions (sarvam-30b, grounded system prompt)
    N-->>B: { answer, latencyMs, model }

    B->>N: POST /api/tts (answer, language)
    N->>S: POST /text-to-speech (bulbul:v3)
    N-->>B: { audioUrl }
    B->>B: HTMLAudioElement.play()
```

---

## 2. Deployment Target

| Config file | Target | Status |
|---|---|---|
| `render.yaml` | Render.com (Node web service) | **Primary** — fully declared build + start commands, env vars |
| `README.md` → "Deploying to Vercel" | Vercel (serverless) | Documented alternative |
| `next.config.ts` | Both | Empty config, no `output: "standalone"` or `output: "export"` — compatible with either |
| `export const runtime = "nodejs"` on all routes | Both | Explicitly opts out of Edge runtime |

**Conclusion:** `render.yaml` is the canonical deployment config. Render runs Next.js as a long-lived Node process, so the 15–60 s OCR job polling is fine and serverless timeout limits don't apply. Vercel Hobby (10 s default) would be tight for the `/api/summarize` call to `sarvam-105b`; Vercel Pro (60 s) would be safe. Either platform works at the code level.

---

## 3. API Routes

### POST `/api/parse/start`
| | |
|---|---|
| **Input** | `FormData`: `file` (File, image), `language` (AppLanguage, default `"en-IN"`) |
| **Output** | `{ jobId: string }` |
| **Errors** | 400 (no file / empty file), 500 (unknown), 502 (SarvamApiError) |
| **Timeout** | `sarvamFetch` default 60 s per Sarvam call; total wall time ≈ 3–4 Sarvam round trips |
| **Notes** | No MIME-type validation — any `File` is accepted and forwarded to Sarvam |

### GET `/api/parse/status?jobId=<id>`
| | |
|---|---|
| **Input** | Query param `jobId` |
| **Output** | `{ state: DocJobState, errorMessage?: string }` |
| **Errors** | 400 (missing jobId), 500, 502 |
| **Notes** | Thin proxy to Sarvam status endpoint; caller (browser) drives the poll loop |

### GET `/api/parse/result?jobId=<id>`
| | |
|---|---|
| **Input** | Query param `jobId` |
| **Output** | `{ ocrText: string }` |
| **Errors** | 400, 422 (empty OCR text), 500, 502 |
| **Notes** | Downloads ZIP, extracts all `.md` / `.txt` entries via JSZip, concatenates them |

### POST `/api/summarize`
| | |
|---|---|
| **Input** | `{ ocrText: string, language: AppLanguage }` |
| **Output** | `{ summary: DocumentSummary, latencyMs: number, model: string }` |
| **Errors** | 400 (no text), 500, 502 |
| **Timeout** | 60 s to Sarvam; sarvam-105b latency is variable (single-digit to tens of seconds) |
| **Notes** | Uses `parseSummaryResponse` to extract JSON defensively; falls back to minimal summary on parse failure |

### POST `/api/chat`
| | |
|---|---|
| **Input** | `{ ocrText, summary, language, history: ChatTurn[], question: string }` |
| **Output** | `{ answer: string, latencyMs: number, model: string }` |
| **Errors** | 400 (empty question), 502 (empty answer from model), 500 |
| **Notes** | Full OCR text + summary JSON + conversation history are sent as system prompt to sarvam-30b |

### POST `/api/tts`
| | |
|---|---|
| **Input** | `{ text: string, language: AppLanguage }` |
| **Output** | `{ audioUrl: string }` (data:audio/wav;base64,…) |
| **Errors** | 400 (empty text), 500, 502 |
| **Notes** | Text truncated to 2,500 chars before Bulbul call; response is inlined as base64 data URL (no object URL) |

### POST `/api/stt`
| | |
|---|---|
| **Input** | `FormData`: `audio` (Blob/File, webm/wav) |
| **Output** | `{ transcript: string, languageCode?: string }` |
| **Errors** | 400 (no audio / bad Content-Type), 422 (empty transcript), 500, 502 |
| **Notes** | Uses codemix mode; MIME type is sanitized (`audio/webm;codecs=opus` → `audio/webm`) |

---

## 4. Bug and Risk List

### B-01 — CRITICAL: API key committed to `render.yaml`
| | |
|---|---|
| **Severity** | Critical |
| **File** | `render.yaml:9` |
| **Reproduce** | `cat render.yaml` — key value is `sk_bj8pe5hu_ZLhfqwbZtqY4PrVAVQHfTHPi` |
| **Fix** | Remove the value from `render.yaml` (use `sync: false` or Render dashboard only). Revoke and rotate the key immediately at dashboard.sarvam.ai. The `.gitignore` correctly excludes `.env` but not `render.yaml`. |

### B-02 — HIGH: `reasoning_effort` missing from production chat calls
| | |
|---|---|
| **Severity** | High |
| **File** | `src/lib/sarvam/chat.ts:33` |
| **Reproduce** | Check `chatCompletion()` body — `reasoning_effort` is absent. README (line 88) and smoke test (line 44) both document it as required to keep the hidden reasoning step short. |
| **Fix** | Add `reasoning_effort: "low"` to the JSON body in `chatCompletion()`. This reduces the chance of `finish_reason: "length"` and null content on production calls. |

### B-03 — HIGH: Polling has no AbortController — overlapping polls and no cancel on new upload
| | |
|---|---|
| **Severity** | High |
| **File** | `src/lib/apiClient.ts:87–103` |
| **Reproduce** | Start a document upload, then immediately click "New document" or upload a second file. The original `waitForParseCompletion` loop continues running in the background, firing `getParseStatus` calls every 2.5 s for up to 100 s. If the first job finishes after the user has started a second one, `setOcrText` and `setSummary` will be called with stale data, replacing the second document's state. |
| **Fix** | Accept an `AbortSignal` parameter in `waitForParseCompletion`; pass a new `AbortController`'s signal from `runPipeline`, and `abort()` on new pipeline start and on component unmount. Check `signal.aborted` at the top of each poll iteration. |

### B-04 — HIGH: No client-side image compression
| | |
|---|---|
| **Severity** | High |
| **File** | `src/lib/apiClient.ts:21–27`, `src/app/api/parse/start/route.ts:39` |
| **Reproduce** | Take a photo on a modern smartphone — typical camera photos are 5–15 MB. The raw bytes are uploaded directly to `/api/parse/start`, then re-uploaded via PUT to Azure Blob storage. On a 3G mobile connection (1 Mbps) a 10 MB image takes ~80 s, well past the user's patience. |
| **Fix** | Before `startParse`, draw the image on a canvas, resize the longest edge to ≤ 2,000 px, and export as JPEG quality 0.85. Show a `<progress>` element driven by `XMLHttpRequest.upload.onprogress`. |

### B-05 — HIGH: iOS Safari autoplay failure is silent
| | |
|---|---|
| **Severity** | High |
| **File** | `src/hooks/useAudioPlayer.ts:19` |
| **Reproduce** | On iOS Safari, `audio.play()` throws `NotAllowedError` unless called from a user-gesture handler. The `.catch(() => setIsSpeaking(false))` silently swallows the error — the user sees no indication that the summary speech was blocked. |
| **Fix** | Detect the `NotAllowedError` name and show an in-page "Tap to hear summary" button that, when tapped, calls `player.play(audioUrl)` from a gesture handler. This is the standard iOS Safari audio-unlock pattern. |

### B-06 — HIGH: Polling has no exponential backoff and a hard 100-second wall
| | |
|---|---|
| **Severity** | High |
| **File** | `src/lib/apiClient.ts:91–102` |
| **Reproduce** | The loop polls every 2,500 ms for exactly 40 iterations (100 s total). Complex multi-page documents can take longer. When the limit is hit the user sees a generic English "Document processing timed out" error regardless of chosen language. |
| **Fix** | Replace the flat interval with exponential backoff (start 2 s, cap 10 s, jitter), increase max attempts, and translate the timeout error string via the i18n `strings` object. |

### B-07 — MEDIUM: Language switch mid-pipeline races with in-flight requests
| | |
|---|---|
| **Severity** | Medium |
| **File** | `src/app/page.tsx:93–111` |
| **Reproduce** | If the user is in the `"understanding"` stage (waiting for `/api/summarize`) and switches language, `handleLanguageChange` calls `summarizeDocument` again with the new language, but there is no way to cancel the first call. The later-returning call wins and sets the summary — but which one that is depends on network timing. |
| **Fix** | Use `AbortController` refs (one per in-flight pipeline, one per language switch) and cancel the previous request before starting a new one. |

### B-08 — MEDIUM: Mic stream not stopped if user navigates away or an error occurs during recording
| | |
|---|---|
| **Severity** | Medium |
| **File** | `src/hooks/useAudioRecorder.ts:33–50` |
| **Reproduce** | Start recording, then trigger an error or click "New document". The `recorder.stop()` is only called from `handleMicClick` on the second tap. If the component unmounts or an error short-circuits the handler, `streamRef.current` tracks are never stopped — the browser microphone indicator stays active. |
| **Fix** | Add a `useEffect` cleanup in `useAudioRecorder` that calls `streamRef.current?.getTracks().forEach(t => t.stop())` on unmount. |

### B-09 — MEDIUM: `SummaryCard` "Full details" button gated on `dates.length > 0` only
| | |
|---|---|
| **Severity** | Medium |
| **File** | `src/components/SummaryCard.tsx:64–75` |
| **Reproduce** | If the LLM returns a summary with `dates: []` but non-empty `amounts` or `key_facts`, the expand button never appears. Users cannot see any expandable section even if useful data is present. |
| **Fix** | Show the expand button when `dates.length > 0` OR when any secondary field (amounts not shown in primary, key_facts) warrants it. The current design already shows amounts and key_facts unconditionally, so the expand section is specifically for dates — but the button should at minimum be shown or hidden consistently with the content. |

### B-10 — MEDIUM: `ChatPanel.errorMessage` prop is always `null` in `page.tsx`
| | |
|---|---|
| **Severity** | Medium |
| **File** | `src/app/page.tsx:224` |
| **Reproduce** | `errorMessage={null}` is hardcoded. Chat errors are shown via the top-level `error` state (red banner), not the `ChatPanel`'s own error slot. The `errorMessage` prop on `ChatPanel` exists but is dead code — users must scroll up past the summary card to see chat errors. |
| **Fix** | Wire a separate `chatError` state to `ChatPanel.errorMessage`, or remove the prop and rely on the top-level banner. Either way, make the error visible without requiring the user to scroll. |

### B-11 — MEDIUM: No MIME-type / file-type validation in `/api/parse/start`
| | |
|---|---|
| **Severity** | Medium |
| **File** | `src/app/api/parse/start/route.ts:24–29` |
| **Reproduce** | Upload a PDF, a `.txt` file, or a Word document. The route accepts it (only checks `instanceof File` and `size > 0`), sends it to Sarvam Document Intelligence, which may return a confusing 4xx or a garbled OCR result. |
| **Fix** | Validate `file.type` against an allowlist (`image/jpeg`, `image/png`, `image/webp`, `image/heic`) and return a clear 400 with a translated error message. |

### B-12 — LOW: README claims `reasoning_effort: "low"` is sent; production code does not send it
| | |
|---|---|
| **Severity** | Low (documentation) |
| **File** | `README.md:88`, `src/lib/sarvam/chat.ts:33` |
| **Reproduce** | README line 88: "The app sends `reasoning_effort: "low"`". `chat.ts` does not include this field. |
| **Fix** | Fix B-02 first, then README will be accurate. |

### B-13 — LOW: `generate-samples.ts` uses undeclared `sharp` dependency
| | |
|---|---|
| **Severity** | Low |
| **File** | `scripts/generate-samples.ts:1`, `package.json` |
| **Reproduce** | `npx tsx scripts/generate-samples.ts` → `Cannot find module 'sharp'` |
| **Fix** | Add `sharp` to `devDependencies`, or add a comment in the script and a note in the README that `npm install -D sharp` is a prerequisite. |

### B-14 — LOW: Accessibility gaps
| | |
|---|---|
| **Severity** | Low |
| **File** | Multiple components |
| **Details** | • `UploadCard` buttons have no `aria-label` beyond visible text — adequate, but the camera button ("Take a photo") doesn't convey it opens a camera, not a gallery. • `SummaryCard` expand button has no `aria-expanded` attribute. • `ProcessingStatus` spinning indicator has no `aria-live` region. • `MicButton` button has `aria-label={label}` ✓ but the animated speaking bars have no `aria-hidden`. • Touch targets: main buttons are `py-3` (≈ 44px height), borderline against 48px WCAG recommendation. |
| **Fix** | Add `aria-expanded`, `aria-live="polite"` on status messages, `aria-hidden="true"` on decorative animations, and increase critical button padding. |

### B-15 — LOW: `CLAUDE.md` is a circular self-reference
| | |
|---|---|
| **Severity** | Low (tooling) |
| **File** | `CLAUDE.md:1` |
| **Details** | Contains only `@AGENTS.md`. The `@` prefix is not a standard CLAUDE.md include directive; `AGENTS.md` is the file that contains the actual Next.js agent rules. This means any tool that reads `CLAUDE.md` for project rules gets an empty result. |
| **Fix** | Copy the content of `AGENTS.md` into `CLAUDE.md`, or remove `CLAUDE.md` and rename `AGENTS.md` to `CLAUDE.md`. |

---

## 5. Quick Wins

These can each be done in under 30 minutes and have high visible impact:

| # | What | Why it matters |
|---|---|---|
| QW-1 | Fix B-01 (rotate key, remove from render.yaml) | Security — key is already public on GitHub |
| QW-2 | Add `reasoning_effort: "low"` to `chatCompletion()` (B-02) | Reduces `finish_reason: "length"` occurrences; aligns code with README |
| QW-3 | Translate the polling timeout error via `strings` (part of B-06) | Users on hi-IN/mr-IN currently see an English error message |
| QW-4 | Add `aria-expanded` to the SummaryCard expand button (B-14) | Easy, high a11y value |
| QW-5 | Add useEffect cleanup to `useAudioRecorder` (B-08) | Prevents stuck mic indicator on error/unmount |
| QW-6 | Wire `chatError` to `ChatPanel.errorMessage` (B-10) | Chat errors are currently shown in the wrong place |
| QW-7 | Add `sharp` to devDependencies (B-13) | `generate-samples.ts` is currently broken out of the box |
