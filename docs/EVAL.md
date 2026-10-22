# Evaluation and reliability

KagazBol measures whether its answers are right, instead of assuming that an HTTP 200 is a correct
answer. There are two kinds of run, and their numbers are never mixed.

| | **Checks** | **Live** |
|---|---|---|
| What it tests | KagazBol's own verification code: evidence locator, value normalisation, faithfulness checker | The real Sarvam pipeline: OCR → language detection → extraction → grounded QA |
| Model calls | None | Yes (costs money) |
| Deterministic | Yes | No |
| Where | `npm run eval`, CI, dashboard | `npm run eval -- --live`, dashboard (needs `SARVAM_API_KEY`) |

## Dataset

`eval/datasets/<id>/*.json`, one sample per file (format in `eval/README.md`). The committed `seed`
dataset has **5 synthetic documents** (electricity bill, prescription, bank notice — rendered by
`scripts/generate-samples.ts` — plus a Hindi water bill and a Marathi tax notice as text-only
samples). The reference OCR text is the exact text drawn into each image. Every run records whether
it was synthetic-only; the dashboard labels such runs and never presents them as real-user
performance.

## Metrics

| Metric | Mode | Definition |
|---|---|---|
| OCR CER | live | char edit distance ÷ reference chars (Unicode code points; markdown syntax and Devanagari digits normalised; case kept). Image samples only. |
| OCR WER | live | word edit distance ÷ reference words (case/punctuation-insensitive). |
| Language detection accuracy | live | Text LID result == labelled language. |
| Field extraction accuracy | live | Share of expected amounts, dates, deadline and identifiers found in the summary, matched **exactly after normalisation** (amounts numerically incl. ₹/Rs./grouping/Devanagari digits; dates as ISO, day-first; ids ignoring spaces). |
| Amount extraction accuracy | live | The amount subset of the above. |
| Extracted values supported | live (per sample) | Share of amounts/dates the model produced that exist in the document. Unsupported ones are failures (`unsupported_claim`). |
| Answer accuracy | live | Amount/date questions: the expected value appears in the answer. Text questions: ≥ 60% of expected tokens appear — a lenient lexical check, **not** semantic equivalence. |
| Answers with supporting evidence ("faithfulness") | live | Checker verdict is verified/partial: cited quotes are found in the document and no amount/date in the answer is missing from it. Catches invented numbers and fabricated quotes; cannot prove an interpretation is correct. |
| Evidence coverage | live | Answers with ≥ 1 quote located in the document. |
| Evidence locator recall | checks | Labelled evidence quotes and values found in the reference text. |
| Value normalisation | checks | The same amount/date in another format is recognised as equal. |
| Checker catch rate | checks | Planted wrong amounts/dates (perturbed so they don't occur in the document) that the checker flags. |
| Checker false alarms | checks | Correct labelled answers the checker wrongly flags. |
| Latency p50/p95 | both | Per-sample end-to-end; stage latencies recorded per sample. |
| Estimated cost | live | Token usage × `EVAL_PRICING_JSON`, plus OCR pages. **"Unavailable"** if pricing or any usage figure is missing — never estimated. |

Per-sample failure thresholds: OCR CER > 0.10 or WER > 0.20 is a failure; any missing/wrong value,
unsupported claim, language mismatch or provider error is a failure with stage, category, expected,
actual and a debugging hint (secrets redacted, no full document text).

### Translation

Explanations are generated directly in the target language by the chat model; there is no separate
translation step with reference translations, so no BLEU/chrF is reported. Automatic MT metrics
correlate poorly with adequacy for short, simplified explanations; adding human-rated samples is the
recommended next step.

## Regression comparison (`src/lib/eval/compare.ts`)

Only runs with the same mode and dataset are comparable. Each metric has a direction and a minimum
meaningful change (e.g. 2 points for accuracy, 0.01 for CER, 250 ms for p50). The verdict is
**improved** only if something improved and nothing regressed; any regression alongside an
improvement is **mixed**; a newly failing sample is always a regression.

## Running

```bash
npm run eval                          # checks mode, seed dataset (CI runs this)
npm run eval -- --live                # live mode (SARVAM_API_KEY required)
npm run eval -- --live --commit       # also save to eval/results-committed/ (shown by the dashboard after deploy)
```

The dashboard at `/eval` (admin token required, `EVAL_ADMIN_TOKEN`) starts runs as background jobs
(one at a time), shows progress, latest metrics per mode, trends after ≥ 3 runs, breakdowns by
document type and language, failure analysis and run comparison. Evaluation APIs never read user
documents — only `eval/datasets/`.

## Results so far

| Run | Mode | Dataset | Result |
|---|---|---|---|
| 2026-10-22 (`eval/results-committed/`) | checks | seed, 5 synthetic | locator recall 100%, normalisation 100%, checker catch rate 100%, false alarms 0% |
| — | live | — | **Not run yet**: no Sarvam key was available in the build environment. |

Checks-mode numbers describe the verification code on synthetic text, not model accuracy.
