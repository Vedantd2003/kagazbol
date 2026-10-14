# KagazBol Evaluation Directory

This directory contains the evaluation harness for KagazBol's document understanding pipeline.

## Structure

```
eval/
  README.md           — this file
  schema/
    labels.schema.json  — JSON Schema for ground-truth label files
  samples/            — SYNTHETIC sample documents (not counted in metrics)
    elec-001/         — electricity bill sample (English)
    rx-001/           — prescription sample (Hindi)
    bank-001/         — bank notice sample (Marathi)
  data/               — real masked documents (gitignored, add yours here)
  cache/              — cached OCR results (gitignored)
  results/            — timestamped result JSON files (gitignored)
  metrics.ts          — scoring functions
  run.ts              — main eval runner
```

## Adding Real Documents

1. Mask all PII from the document image before adding it.
2. Place the masked image as `eval/data/<doc-id>/image.jpg` (or .png).
3. Create `eval/data/<doc-id>/labels.json` following `eval/schema/labels.schema.json`.
4. Run `npm run eval` to score.

## PII Masking Guide

Replace real personal information with consistent fake values:

| Field | Example replacement |
|---|---|
| Full name | "Rahul Test" / "Priya Sample" |
| Account numbers | "9876543210" |
| Address | "123 Sample Nagar, Test City, MH 400001" |
| Phone numbers | "9000000001" |
| Aadhaar number | "0000 0000 0000" |
| PAN number | "ABCDE1234F" |
| Email | "test@example.com" |

**Important rules:**
- Keep the original document layout and script (Hindi/Marathi/English).
- Replace only personal identifiers — amounts, dates, and document structure must remain authentic.
- Use consistent fake values within a single document (same fake name throughout).
- Mark `"is_synthetic": false` for real masked documents.

## Synthetic Samples

The `eval/samples/` directory contains synthetic documents for development and CI testing.
These are **excluded from all published metrics** — the runner skips them when computing scores.
They use obviously fake values (amounts like ₹999.00, names like "Test Electricity Consumer").

## Running the Eval

```bash
# Add real masked documents to eval/data/
npm run eval
# Results written to eval/results/<timestamp>.json and docs/EVAL.md
```
