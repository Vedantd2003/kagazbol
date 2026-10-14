/**
 * E2E happy-path: user selects a sample document, the full pipeline runs
 * (all Sarvam API routes are mocked), and the summary card appears.
 *
 * Run:  npm run test:e2e
 * Requires: SARVAM_API_KEY is not needed because all routes are mocked.
 */
import { test, expect } from "@playwright/test";

// Minimal valid WAV (44-byte header + 0 data bytes) for TTS mock responses.
const SILENT_WAV_B64 =
  "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQCAAAAAgAAAAAgAIAGRhdGEAAAAA";

const MOCK_SUMMARY = {
  document_type: "Electricity Bill",
  title: "MSEB Bill – October 2026",
  key_facts: ["Account: 1234567890", "Units consumed: 250 kWh"],
  amounts: [{ label: "Amount Due", value: "₹1,234.50" }],
  dates: [{ label: "Due Date", value: "15/11/2026" }],
  deadline: "15/11/2026",
  action_required: "Pay before 15 November 2026 to avoid disconnection.",
  summary_spoken:
    "Yeh MSEB ka bijli ka bill hai. Ek hazaar do sau chhatees rupaye paanch November tak bharne hain.",
};

test.beforeEach(async ({ page }) => {
  // ── Mock all Sarvam-calling API routes ──────────────────────────────────

  await page.route("/api/parse/start", async (route) => {
    await route.fulfill({ json: { jobId: "mock-job-e2e" } });
  });

  await page.route("/api/parse/status**", async (route) => {
    await route.fulfill({ json: { state: "Completed" } });
  });

  await page.route("/api/parse/result**", async (route) => {
    await route.fulfill({
      json: {
        ocrText:
          "# MSEB Electricity Bill\n\nAccount: 1234567890\nAmount Due: Rs. 1,234.50\nDue Date: 15/11/2026",
      },
    });
  });

  await page.route("/api/summarize", async (route) => {
    await route.fulfill({
      json: { summary: MOCK_SUMMARY, latencyMs: 100, model: "sarvam-105b" },
    });
  });

  await page.route("/api/tts", async (route) => {
    await route.fulfill({
      json: { audioUrl: `data:audio/wav;base64,${SILENT_WAV_B64}` },
    });
  });

  await page.route("/api/stt", async (route) => {
    await route.fulfill({ json: { transcript: "Kitna bharna hai?" } });
  });

  await page.route("/api/chat", async (route) => {
    await route.fulfill({
      json: {
        answer: "Aapko ek hazaar do sau chhatees rupaye bharne hain.",
        latencyMs: 80,
        model: "sarvam-30b",
      },
    });
  });
});

test("document pipeline: sample upload shows summary card", async ({ page }) => {
  await page.goto("/");

  // The app title should be visible.
  await expect(page.getByRole("heading", { name: "KagazBol" })).toBeVisible();

  // Click the first sample document button ("Electricity bill").
  const sampleButton = page.getByRole("button", { name: /electricity bill/i });
  await expect(sampleButton).toBeVisible();
  await sampleButton.click();

  // The UI should transition through the processing stages.
  // Wait for the summary card to appear (the OCR + summarize pipeline completed).
  await expect(page.getByText("MSEB Bill – October 2026")).toBeVisible({ timeout: 15_000 });

  // Summary card should show the amount.
  await expect(page.getByText("₹1,234.50")).toBeVisible();

  // The action required section should be present.
  await expect(page.getByText(/Pay before 15 November/)).toBeVisible();

  // The ask / mic section should be visible.
  await expect(page.getByRole("heading", { name: /ask something/i })).toBeVisible();
});

test("language switcher changes UI labels", async ({ page }) => {
  await page.goto("/");

  const hindiButton = page.getByRole("button", { name: "हिंदी", exact: true });
  await hindiButton.click();

  // After switching to Hindi, the upload title changes.
  await expect(page.getByText("दस्तावेज़ की फोटो लें")).toBeVisible();
});

test("new document button returns to upload screen", async ({ page }) => {
  await page.goto("/");

  // Go through the pipeline first.
  await page.getByRole("button", { name: /electricity bill/i }).click();
  await expect(page.getByText("MSEB Bill – October 2026")).toBeVisible({ timeout: 15_000 });

  // Click "New document".
  await page.getByRole("button", { name: /new document/i }).click();

  // Should return to the upload card.
  await expect(page.getByText("Photograph a document")).toBeVisible();
});
