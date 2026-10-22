# Document pipeline

```
Browser                                   Server (Next.js route handlers)              Sarvam AI
───────                                   ───────────────────────────────              ─────────
photo ─▶ image quality check (canvas)
       ─▶ compress ≤2000px JPEG
       ─▶ POST /api/parse/start ───────▶ size limit · magic-byte sniff · language
                                         create job → upload → start (NO retry) ───▶ Document Digitization
       ◀─ poll /api/parse/status ◀──────  job id validated · safe retry ◀───────────
       ─▶ GET /api/parse/result ───────▶  download zip → markdown · OCR quality ◀───
       ─▶ POST /api/detect-language ───▶  Text LID on ≤1000 chars (optional) ──────▶ /text-lid
       ─▶ POST /api/summarize ─────────▶  fenced prompt → sarvam-105b ─────────────▶ chat completions
                                          parse JSON → check every amount/date
                                          against the OCR text (evidence)
       ◀─ summary + field checks
       ─▶ POST /api/tts (optional) ────▶  Bulbul v3 (cached client-side per text) ─▶ /text-to-speech
```

Follow-ups: `POST /api/stt` (Saaras v3, codemix, auto language) → user confirms the transcript →
`POST /api/chat` (sarvam-105b-conversations, answer + verbatim quotes) → server locates quotes and checks every
amount/date in the answer → optional TTS. "Explain simply" is `POST /api/explain` (sarvam-105b-conversations).

## Stage contract

Every route returns either its result or `{ error, code, message, retryable }` with a stable `code`
(`src/lib/errors.ts`). Provider bodies, stack traces and document text are never sent to the
browser; provider status codes are logged server-side without request bodies.

| Failure | Code | What the user keeps |
|---|---|---|
| Not an image / too big | `UNSUPPORTED_FILE` / `FILE_TOO_LARGE` | Upload screen, clear message |
| OCR job failed / no text | `OCR_FAILED` / `LOW_QUALITY` | Retry, photo tips |
| Language detection failed | — (silently skipped) | Everything |
| Summary failed | `TRANSLATION_FAILED`, `PROVIDER_TIMEOUT`… | OCR text kept; **Try again re-runs only the summary** (no re-upload, no second OCR bill) |
| TTS failed | `TTS_FAILED` | Full explanation; "Try audio again" |
| STT failed / silence | `STT_FAILED` | Type the question instead |
| Answer failed | `ANSWER_FAILED` | Conversation so far; ask again |
| Provider 401/403 | `PROVIDER_AUTH` | Configuration problem, not retryable |
| 429 | `RATE_LIMITED` | Retry later |

## Retries

`sarvamFetch` retries only 408/429/5xx and network errors, at most 3 attempts, full-jitter
exponential backoff (400 ms base, 4 s cap), honouring `Retry-After`. Calls that create billable
state — job creation, file upload, job start — are **never** retried automatically. 400/401/403/422
are never retried.

## Language handling

`src/lib/languages.ts` is the single capability registry (OCR / detection / STT / TTS / explanation /
UI per language), checked against docs.sarvam.ai on 2026-10-22. Codes are normalised to BCP-47
`xx-IN` at every boundary. The explanation language is always the user's explicit choice; a
different spoken language is offered as a one-tap switch, never applied silently.

The original OCR text is never overwritten: the client keeps `ocrText` and one summary per
language, so switching back to a language is free.

## Prompt-injection posture

Document text is untrusted. It goes in the user message (never the system prompt), wrapped in
fence markers that are first stripped from the content, and the model is told it is data. The
models have no tools; an injected instruction can at most change wording for the person who
uploaded that document. Answers are additionally checked against the document text.

## Verified against Sarvam docs (2026-10-22) and open items

| Item | Status |
|---|---|
| Doc Digitization `/doc-digitization/job/v1`, `language`, `output_format: "md"` | Matches docs. Docs call this API **legacy**, superseded by `/doc-ai/v1` (adds PDF, JSON with bounding boxes). Migration needs a live key to test — recommended next step; it would enable real bbox highlights. |
| Text LID `POST /text-lid`, `input` ≤ 1000 chars | Implemented per docs; untested live. |
| STT `saaras:v3`, `mode: codemix`, `language_probability` | Per docs; untested live. Docs now default to `saaras:v4`. |
| TTS field name | Docs say `language_code`; the app was first verified live with `target_language_code`. The client sends the latter and falls back to the former once on a 400/422. `npm run smoke-test` checks both. |
| Chat `reasoning_effort: "low"`, `max_tokens` | Unchanged from verified v2 code. |
| Chat models | `sarvam-30b` was **deprecated** (live 400 on 2026-10-22). Docs list only `sarvam-105b` (128K) and `sarvam-105b-conversations` (32K, real-time/voice); follow-ups now use the latter. |

## Limits

Upload 10 MB (client compresses first) · OCR text 40k chars · question 1k chars · history 12 turns ·
TTS 2.5k chars (clamped at a sentence boundary) · STT clips ≤ 28 s (auto-stop) · JSON bodies 256 KB.
Rate limits are per server instance (in-memory); see `src/lib/rateLimit.ts`.
