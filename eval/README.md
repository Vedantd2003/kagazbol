# Evaluation datasets

See `docs/EVAL.md` for metrics and modes.

## Layout

```
eval/datasets/<dataset-id>/<sample-id>.json   one labelled sample per file (committed only if synthetic or authorised)
eval/results/                                 CLI run output (git-ignored)
eval/results-committed/                       runs you choose to ship so the dashboard shows them after deploy
```

`eval/data/` is git-ignored and is the place for **real, consented, masked** documents. Never commit
them, and never point the dashboard at them on a shared server.

## Sample format

```jsonc
{
  "id": "elec-001",
  "synthetic": true,                       // false only for real, consented documents
  "category": "electricity_bill",
  "sourceLanguage": "en-IN",               // en-IN | hi-IN | mr-IN | other supported BCP-47 codes
  "image": "public/samples/electricity-bill.png", // or null for text-only samples (OCR is skipped)
  "referenceOcr": "…exact text of the document, in reading order…",
  "expected": {
    "documentType": "electricity_bill",
    "amounts": [{ "label": "Total", "value": "Rs. 1,840.00" }],
    "dates":   [{ "label": "Due date", "value": "21 June 2026" }],
    "deadline": "21 June 2026",
    "fields":  [{ "name": "consumer_number", "type": "id", "value": "1234 5678 9012" }] // type: amount|date|name|id|text
  },
  "qa": [
    { "question": "How much do I have to pay?", "answer": "Rs. 1,840.00", "answerType": "amount",
      "evidence": ["Rs. 1,840.00"] }       // verbatim quotes from referenceOcr
  ],
  "notes": "free text"
}
```

Images must live in `public/samples/`. Samples are validated on load (`src/lib/eval/dataset.ts`).

> The v2 format (`eval/samples/*/labels.json` with `fields`/`qa_pairs`) was replaced by this one;
> convert any real documents in `eval/data/` before running them.
