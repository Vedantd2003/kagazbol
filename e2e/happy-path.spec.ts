/**
 * E2E: the core document flow and the voice flow, with every provider-calling API
 * route mocked. This proves the UI wiring and state transitions — NOT that Sarvam
 * works (see `npm run smoke-test` / `npm run eval -- --live` for that).
 *
 * Run:  npm run test:e2e
 * Uses Playwright's Chromium; set CHROMIUM_PATH to use a different binary.
 */
import { test, expect, type Page } from "@playwright/test";

const SILENT_WAV = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
const OCR = "Total Amount Payable\nRs. 1,840.00\nDue Date\n21 June 2026\nA late payment surcharge of 2% will be applied.";
const span = (text: string) => ({ text, line: OCR.slice(0, OCR.indexOf(text)).split("\n").length, page: null, start: OCR.indexOf(text), end: OCR.indexOf(text) + text.length, match: "exact", bbox: null });

const SUMMARY = {
  document_type: "Electricity bill",
  title: "Electricity bill for May",
  key_facts: ["210 kWh used"],
  amounts: [{ label: "Total payable", value: "Rs. 1,840.00" }],
  dates: [{ label: "Due date", value: "21 June 2026" }],
  deadline: "21 June 2026",
  action_required: "Pay before 21 June 2026.",
  warnings: ["2% late payment surcharge after the due date."],
  summary_spoken: "Pay one thousand eight hundred and forty rupees by 21 June.",
};

async function mockApis(page: Page) {
  await page.route("**/api/parse/start", (r) => r.fulfill({ json: { jobId: "mock_job_e2e_1" } }));
  await page.route("**/api/parse/status**", (r) => r.fulfill({ json: { state: "Completed" } }));
  await page.route("**/api/parse/result**", (r) => r.fulfill({ json: { ocrText: OCR, qualityIssues: [], qualityWarnings: [] } }));
  await page.route("**/api/detect-language", (r) => r.fulfill({ json: { languageCode: "en-IN", scriptCode: "Latn", explainable: true } }));
  await page.route("**/api/summarize", (r) =>
    r.fulfill({
      json: {
        summary: SUMMARY,
        checks: [
          { field: "amount", index: 0, value: "Rs. 1,840.00", found: true, evidence: span("Rs. 1,840.00") },
          { field: "date", index: 0, value: "21 June 2026", found: true, evidence: span("21 June 2026") },
          { field: "deadline", index: 0, value: "21 June 2026", found: true, evidence: span("21 June 2026") },
        ],
        fallback: false,
        latencyMs: 1,
        model: "mock",
      },
    })
  );
  await page.route("**/api/tts", (r) => r.fulfill({ json: { audioUrl: `data:audio/wav;base64,${SILENT_WAV}` } }));
  await page.route("**/api/stt", (r) => r.fulfill({ json: { transcript: "kitna bharna hai", languageCode: "hi-IN", languageProbability: 0.42 } }));
  await page.route("**/api/chat", (r) =>
    r.fulfill({ json: { answer: "Rs. 1,840 by 21 June 2026.", verification: "verified", evidence: [span("Rs. 1,840.00")], unsupportedValues: [], latencyMs: 1, model: "mock" } })
  );
}

test.beforeEach(async ({ page }) => {
  await mockApis(page);
});

test("landing page renders and links to the app", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Understand every document");
  await expect(page.getByText("Demo with a made-up bill")).toBeVisible();
  await page.getByRole("link", { name: "Explain a document" }).first().click();
  await expect(page.getByRole("heading", { name: "Show me a document" })).toBeVisible();
});

test("sample → processing → explanation with verified values and evidence", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("button", { name: /Electricity bill/ }).click();
  await expect(page.getByRole("heading", { name: "Electricity bill for May" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Found in document").first()).toBeVisible();
  await page.getByRole("button", { name: "Show where" }).first().click();
  await expect(page.locator("mark")).toHaveText(/21 June 2026|Rs\. 1,840\.00/);
});

test("rejects a non-image file before uploading", async ({ page }) => {
  await page.goto("/app");
  await page.locator('input[type=file]').nth(1).setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.getByText("This file isn't a photo KagazBol can read")).toBeVisible();
});

test("voice question: record, confirm low-confidence transcript, answer, offer language switch", async ({ page, context }) => {
  await context.grantPermissions(["microphone"]);
  await page.goto("/app");
  await page.getByRole("button", { name: /Electricity bill/ }).click();
  await expect(page.getByRole("heading", { name: "Electricity bill for May" })).toBeVisible({ timeout: 15_000 });

  const askTab = page.getByRole("tab", { name: "Ask" });
  if (await askTab.isVisible()) await askTab.click(); // phone layout
  await page.getByRole("button", { name: "Tap and speak" }).click();
  await page.getByRole("button", { name: "Tap when you finish" }).click();
  await expect(page.getByText("Is this your question?")).toBeVisible();
  await expect(page.getByText("We weren't sure we heard you right")).toBeVisible();
  await page.getByLabel("Is this your question?").fill("kitna bharna hai aur kab tak?");
  await page.getByRole("button", { name: "Ask this" }).click();
  await expect(page.getByText("Checked against the document")).toBeVisible();
  await expect(page.getByText(/You spoke in हिंदी/)).toBeVisible();
});

test("language switch re-explains and changes the interface", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("radio", { name: "मराठी" }).click();
  await expect(page.getByRole("heading", { name: "कागद दाखवा" })).toBeVisible();
});
