import { locateAmount, locateDate, locateQuote } from "./evidence";
import type { DocumentSummary, FieldCheck } from "./types";

/**
 * Verifies every amount, date and the deadline in a model-produced summary
 * against the OCR text. Values that cannot be found are flagged "unverified" in
 * the UI rather than presented as facts.
 */
export function buildFieldChecks(summary: DocumentSummary, ocrText: string): FieldCheck[] {
  const checks: FieldCheck[] = [];
  summary.amounts.forEach((a, index) => {
    const evidence = locateAmount(a.value, ocrText) ?? locateQuote(a.value, ocrText);
    checks.push({ field: "amount", index, value: a.value, found: !!evidence, evidence });
  });
  summary.dates.forEach((d, index) => {
    const evidence = locateDate(d.value, ocrText) ?? locateQuote(d.value, ocrText);
    checks.push({ field: "date", index, value: d.value, found: !!evidence, evidence });
  });
  if (summary.deadline) {
    const evidence = locateDate(summary.deadline, ocrText) ?? locateQuote(summary.deadline, ocrText);
    checks.push({ field: "deadline", index: 0, value: summary.deadline, found: !!evidence, evidence });
  }
  return checks;
}
