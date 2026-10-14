/**
 * Voice pipeline latency benchmark.
 * Run via: npm run bench:voice
 *
 * Measures /api/chat (non-streaming) and /api/chat/stream (streaming) latency.
 * Writes results to docs/VOICE_LATENCY.md
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.BENCH_BASE_URL ?? "http://localhost:3000";

const FIXTURE_OCR = `
MAHARASHTRA STATE ELECTRICITY DISTRIBUTION CO. LTD.
Consumer Account: TEST-9876543210
Consumer Name: Rahul Test
Address: 123 Sample Nagar, Test City, MH 400001

ELECTRICITY BILL - October 2026
Meter Number: MTR-001234
Previous Reading: 12450 units
Current Reading: 12700 units
Units Consumed: 250 units

CHARGES:
Energy Charges (250 units @ ₹4.00): ₹1,000.00
Fixed Charges: ₹150.00
Electricity Duty (16%): ₹184.00
Fuel Adjustment Charge: ₹65.00
TOTAL AMOUNT DUE: ₹1,399.00

Due Date: 15/11/2026
Late Payment Surcharge after due date: ₹70.00

For queries: Call 1800-200-3435 or email: support@test-electric.example
Pay online at: www.test-electric.example/pay
`.trim();

const QUESTIONS = [
  "How much do I owe?",
  "When is the deadline?",
  "What is the account number?",
  "What is the meter reading?",
  "Who should I contact?",
];

const DUMMY_SUMMARY = {
  document_type: "Electricity Bill",
  title: "MSEB Bill - October 2026",
  key_facts: ["Consumer: Rahul Test", "Units: 250 kWh"],
  amounts: [{ label: "Total Due", value: "₹1,399.00" }],
  dates: [{ label: "Due Date", value: "15/11/2026" }],
  deadline: "15/11/2026",
  action_required: "Pay ₹1,399.00 before 15 November 2026.",
  summary_spoken:
    "Yeh Rahul Test ka bijli ka bill hai. Ek hazaar teen sau ninyanave rupaye bharne hain, pandraha November se pehle.",
};

interface NonStreamResult {
  question: string;
  totalMs: number;
  answer: string;
}

interface StreamResult {
  question: string;
  firstTokenMs: number;
  totalMs: number;
}

async function benchNonStream(question: string): Promise<NonStreamResult> {
  const start = Date.now();
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ocrText: FIXTURE_OCR,
      summary: DUMMY_SUMMARY,
      language: "en-IN",
      history: [],
      question,
    }),
  });

  const data = (await res.json()) as { answer?: string; error?: string };
  const totalMs = Date.now() - start;
  return {
    question,
    totalMs,
    answer: data.answer ?? data.error ?? "(no response)",
  };
}

async function benchStream(question: string): Promise<StreamResult> {
  const start = Date.now();
  let firstTokenMs = -1;

  const res = await fetch(`${BASE_URL}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ocrText: FIXTURE_OCR,
      summary: DUMMY_SUMMARY,
      language: "en-IN",
      history: [],
      question,
    }),
  });

  if (!res.ok || !res.body) {
    return { question, firstTokenMs: -1, totalMs: Date.now() - start };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let currentEvent = "";

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      const t = line.trim();
      if (!t) { currentEvent = ""; continue; }
      if (t.startsWith("event:")) { currentEvent = t.slice(6).trim(); continue; }
      if (t.startsWith("data:") && currentEvent === "content_delta") {
        if (firstTokenMs === -1) {
          firstTokenMs = Date.now() - start;
        }
      }
      if (t.startsWith("data:") && (currentEvent === "done" || currentEvent === "error")) {
        break outer;
      }
    }
  }

  const totalMs = Date.now() - start;
  return { question, firstTokenMs, totalMs };
}

async function main() {
  const apiKey = process.env.SARVAM_API_KEY;

  const docsDir = path.join(process.cwd(), "docs");
  fs.mkdirSync(docsDir, { recursive: true });
  const outputPath = path.join(docsDir, "VOICE_LATENCY.md");

  if (!apiKey) {
    fs.writeFileSync(
      outputPath,
      "# Voice Latency Benchmark\n\nRun `npm run bench:voice` with SARVAM_API_KEY set to see results.\n"
    );
    console.log("No SARVAM_API_KEY — wrote placeholder to docs/VOICE_LATENCY.md");
    return;
  }

  console.log(`Benchmarking against ${BASE_URL}`);
  console.log("Make sure the dev server is running: npm run dev\n");

  const nonStreamResults: NonStreamResult[] = [];
  const streamResults: StreamResult[] = [];

  for (const question of QUESTIONS) {
    console.log(`[non-stream] ${question}`);
    try {
      const r = await benchNonStream(question);
      nonStreamResults.push(r);
      console.log(`  total: ${r.totalMs}ms`);
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }

    console.log(`[stream] ${question}`);
    try {
      const r = await benchStream(question);
      streamResults.push(r);
      console.log(`  first-token: ${r.firstTokenMs}ms, total: ${r.totalMs}ms`);
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Compute averages
  const avgNonStream =
    nonStreamResults.length > 0
      ? Math.round(nonStreamResults.reduce((s, r) => s + r.totalMs, 0) / nonStreamResults.length)
      : 0;
  const avgStreamFirst =
    streamResults.filter((r) => r.firstTokenMs > 0).length > 0
      ? Math.round(
          streamResults
            .filter((r) => r.firstTokenMs > 0)
            .reduce((s, r) => s + r.firstTokenMs, 0) /
            streamResults.filter((r) => r.firstTokenMs > 0).length
        )
      : 0;
  const avgStreamTotal =
    streamResults.length > 0
      ? Math.round(streamResults.reduce((s, r) => s + r.totalMs, 0) / streamResults.length)
      : 0;

  const date = new Date().toISOString().slice(0, 10);

  const md = `# Voice Latency Benchmark

> Measured on ${date}. Run \`npm run bench:voice\` to regenerate.
> Fixture: 250-word electricity bill, 5 questions in en-IN.

## Non-Streaming (/api/chat)

| Question | Total (ms) |
|---|---|
${nonStreamResults.map((r) => `| ${r.question} | ${r.totalMs} |`).join("\n")}

**Average total:** ${avgNonStream}ms

## Streaming (/api/chat/stream)

| Question | First-token (ms) | Total (ms) |
|---|---|---|
${streamResults.map((r) => `| ${r.question} | ${r.firstTokenMs > 0 ? r.firstTokenMs : "N/A"} | ${r.totalMs} |`).join("\n")}

**Average first-token:** ${avgStreamFirst}ms
**Average total:** ${avgStreamTotal}ms
`;

  fs.writeFileSync(outputPath, md);
  console.log(`\nResults written to docs/VOICE_LATENCY.md`);
}

main().catch((err) => {
  console.error("bench-voice error:", err);
  process.exit(1);
});
