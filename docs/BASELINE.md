# KagazBol — Baseline assessment (before `feature/kagazbol-ai-2`)

Assessed on 2026-10-22 against `main` @ `996ce85`, by code inspection plus local execution.
No `SARVAM_API_KEY` was available, so no live provider call was made during this assessment.

## Architecture as found

- Next.js 16 (App Router) single-page app, React 19, Tailwind v4, framer-motion.
- Stateless: **no database, no authentication, no user accounts.** A document lives only in the
  browser tab's React state.
- Server-side API routes proxy Sarvam AI (key stays on the server).
- Deployment: one Render web service (`render.yaml`), auto-deploy from `main`, `npm start`.

## API endpoints

| Route | Purpose | Provider call |
|---|---|---|
| `POST /api/parse/start` | create doc-digitization job, upload image, start | Sarvam Document Digitization (legacy `/doc-digitization/job/v1`) |
| `GET /api/parse/status?jobId=` | poll job | same |
| `GET /api/parse/result?jobId=` | download zip, extract markdown | same |
| `POST /api/summarize` | OCR text → structured JSON summary | `sarvam-105b` |
| `POST /api/chat` | grounded follow-up answer (used by UI) | `sarvam-30b` |
| `POST /api/chat/stream` | SSE streaming answer (**not used by the UI**) | `sarvam-30b` |
| `POST /api/tts` | speech for a reply | `bulbul:v3` |
| `POST /api/stt` | transcribe a question | `saaras:v3` codemix |

## Database models

None.

## What works (verified level)

| Feature | Verified how |
|---|---|
| TypeScript compiles | `tsc --noEmit` passes |
| Lint | `eslint` passes |
| Unit tests (summary parsing, polling) | 15/15 pass **after** adding the missing `vite` dev-dependency (see below) |
| Upload → OCR → summary → TTS → push-to-talk Q&A flow | Code inspection only (needs a live key) |

## What is broken or misleading

1. **`npm test` crashes on a clean install** — `vitest` 5 needs `vite` as a peer, which
   `--legacy-peer-deps` skips. Fixed by adding `vite` to devDependencies.
2. **`npm run build` fails without internet access to Google Fonts** (`next/font/google`).
   Render has internet, so production builds there; the redesign self-hosts fonts via `@fontsource`.
3. **README over-claims.** It describes streaming answers, sentence-by-sentence TTS, barge-in and
   VAD auto-listen. The code exists (`useStreamingChat`, `useVAD`, `VoiceOrb`, `DebugPanel`,
   `ErrorCard`, `fillerAudio`, `sentenceSplitter`) but **none of it is imported by the page**. The live
   UI uses the non-streaming `/api/chat` and push-to-talk only.
4. Raw provider error text is returned to the browser (`"Sarvam API error: ..."`, internal messages).
5. No request validation: `language` is cast without checking, `jobId` is passed straight into an
   upstream URL path, chat `history` is unbounded, OCR text size unbounded.
6. File type is checked only from the client-declared MIME type; no magic-byte check; no size limit.
7. No retries anywhere; a single 429/503 from the provider fails the whole document.
8. If TTS fails after a successful summary, the pipeline `catch` resets the UI to the upload screen
   and **throws away the successful summary**.
9. Spoken question is sent to the model without showing the user what was heard.
10. Prompt injection: OCR text is interpolated inside `"""` delimiters; a document containing `"""`
    can close the block and append instructions.
11. TTS request uses `target_language_code`; current Sarvam docs name the field `language_code`.
    The existing smoke test used `target_language_code` successfully at some point, so it is kept but
    flagged for live re-verification.
12. Document Digitization `/doc-digitization/job/v1` is documented by Sarvam as legacy, superseded by
    `/doc-ai/v1`. Still functional per docs; migration needs a live key to test.

## Missing tests

Upload validation, API route error paths, TTS/STT failure, language handling, voice state, audio
controller, prompt-injection guard, evaluation metrics (CER/WER), authorization.

## Security risks

- Provider internals leaked in client errors (no key leak found).
- Unvalidated `jobId` concatenated into upstream path.
- Unbounded request bodies → cost amplification on the 105B model.
- No rate limiting on any paid endpoint.
- Prompt-delimiter break-out (item 10).
