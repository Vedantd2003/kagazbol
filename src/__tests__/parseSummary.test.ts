import { describe, it, expect } from "vitest";
import { parseSummaryResponse } from "@/lib/parseSummary";

const VALID: Record<string, unknown> = {
  document_type: "Electricity Bill",
  title: "MSEB Bill – October 2026",
  key_facts: ["Account: 1234567", "Units: 250 kWh"],
  amounts: [{ label: "Amount Due", value: "₹1,234.50" }],
  dates: [{ label: "Due Date", value: "15/11/2026" }],
  deadline: "15/11/2026",
  action_required: "Pay before 15 November 2026.",
  summary_spoken: "Yeh aapka MSEB bijli ka bill hai. Ek hazaar do sau bharna hai.",
};

describe("parseSummaryResponse", () => {
  it("parses a clean JSON string", () => {
    const result = parseSummaryResponse(JSON.stringify(VALID));
    expect(result.document_type).toBe("Electricity Bill");
    expect(result.amounts[0].value).toBe("₹1,234.50");
    expect(result.deadline).toBe("15/11/2026");
  });

  it("extracts JSON wrapped in markdown code fences", () => {
    const wrapped = "```json\n" + JSON.stringify(VALID) + "\n```";
    const result = parseSummaryResponse(wrapped);
    expect(result.title).toBe("MSEB Bill – October 2026");
  });

  it("extracts JSON preceded by explanatory text", () => {
    const withPreamble = "Here is the summary:\n\n" + JSON.stringify(VALID);
    const result = parseSummaryResponse(withPreamble);
    expect(result.document_type).toBe("Electricity Bill");
  });

  it("applies defaults for missing optional fields", () => {
    const minimal = JSON.stringify({ document_type: "Bill", title: "Test" });
    const result = parseSummaryResponse(minimal);
    expect(result.key_facts).toEqual([]);
    expect(result.amounts).toEqual([]);
    expect(result.dates).toEqual([]);
    expect(result.deadline).toBeNull();
    expect(result.action_required).toBe("No action needed");
    expect(result.summary_spoken).toBeTruthy();
  });

  it("returns a fallback summary for plain text with no JSON", () => {
    const result = parseSummaryResponse("This is just plain text, no JSON here.");
    expect(result.document_type).toBe("Document");
    expect(result.title).toBe("Your document");
    expect(result.summary_spoken).toContain("This is just plain text");
  });

  it("returns a fallback summary for an empty string", () => {
    const result = parseSummaryResponse("");
    expect(result.document_type).toBe("Document");
    expect(result.summary_spoken).toBeTruthy();
  });

  it("returns a fallback summary for malformed JSON", () => {
    const result = parseSummaryResponse("{ this is not: valid json }");
    expect(result.document_type).toBe("Document");
  });

  it("coerces non-array fields to arrays", () => {
    const bad = JSON.stringify({ ...VALID, key_facts: "not an array", amounts: null });
    const result = parseSummaryResponse(bad);
    expect(Array.isArray(result.key_facts)).toBe(true);
    expect(Array.isArray(result.amounts)).toBe(true);
  });
});
