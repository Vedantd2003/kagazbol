/**
 * KagazBol Evaluation Runner
 * Run via: npm run eval
 *
 * - Reads eval/data/ documents (skips eval/samples/)
 * - For each: OCR (cached) → summarize → QA
 * - Scores with metrics.ts
 * - Writes eval/results/<timestamp>.json and docs/EVAL.md
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { scoreField, findHallucinatedValues } from "./metrics";

dotenv.config();

const BASE_URL = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const EVAL_DATA_DIR = path.join(process.cwd(), "eval", "data");
const EVAL_CACHE_DIR = path.join(process.cwd(), "eval", "cache");
const RESULTS_DIR = path.join(process.cwd(), "eval", "results");
const DOCS_DIR = path.join(process.cwd(), "docs");

interface LabelField {
  name: string;
  type: "amount" | "date" | "name" | "id" | "text";
  value: string;
}

interface QAPair {
  question: string;
  answer: string;
  supporting_text: string;
}

interface Labels {
  doc_id: string;
  doc_type: string;
  language: "en-IN" | "hi-IN" | "mr-IN";
  is_synthetic?: boolean;
  fields: LabelField[];
  qa_pairs: QAPair[];
}

interface QAResult {
  question: string;
  expected: string;
  predicted: string;
  exact: boolean;
  fuzzy: boolean;
  score: number;
  hallucinations: string[];
}

interface DocResult {
  doc_id: string;
  doc_type: string;
  language: string;
  qaResults: QAResult[];
  avgScore: number;
  hallucinationCount: number;
}

async function getOcr(docId: string, imagePath: string, language: string): Promise<string> {
  const cacheFile = path.join(EVAL_CACHE_DIR, `${docId}.ocr.txt`);

  if (fs.existsSync(cacheFile)) {
    return fs.readFileSync(cacheFile, "utf-8");
  }

  // Upload image for OCR
  const imageBuffer = fs.readFileSync(imagePath);
  const form = new FormData();
  const blob = new Blob([imageBuffer], { type: "image/jpeg" });
  form.append("file", blob, path.basename(imagePath));
  form.append("language", language);

  const startRes = await fetch(`${BASE_URL}/api/parse/start`, {
    method: "POST",
    body: form,
  });

  if (!startRes.ok) {
    throw new Error(`Parse start failed: ${startRes.status}`);
  }

  const { jobId } = (await startRes.json()) as { jobId: string };

  // Poll for completion
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`${BASE_URL}/api/parse/status?jobId=${encodeURIComponent(jobId)}`);
    const status = (await statusRes.json()) as { state: string };
    if (status.state === "Completed" || status.state === "PartiallyCompleted") break;
    if (status.state === "Failed") throw new Error(`OCR failed for ${docId}`);
  }

  const resultRes = await fetch(`${BASE_URL}/api/parse/result?jobId=${encodeURIComponent(jobId)}`);
  const { ocrText } = (await resultRes.json()) as { ocrText: string };

  // Cache result
  fs.mkdirSync(EVAL_CACHE_DIR, { recursive: true });
  fs.writeFileSync(cacheFile, ocrText, "utf-8");

  return ocrText;
}

async function runQA(
  ocrText: string,
  language: string,
  question: string
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ocrText,
      summary: {
        document_type: "Document",
        title: "Document",
        key_facts: [],
        amounts: [],
        dates: [],
        deadline: null,
        action_required: "See document",
        summary_spoken: "Document loaded.",
      },
      language,
      history: [],
      question,
    }),
  });

  const data = (await res.json()) as { answer?: string; error?: string };
  return data.answer ?? data.error ?? "(no answer)";
}

async function evalDoc(docDir: string): Promise<DocResult | null> {
  const labelsPath = path.join(docDir, "labels.json");
  if (!fs.existsSync(labelsPath)) return null;

  const labels = JSON.parse(fs.readFileSync(labelsPath, "utf-8")) as Labels;

  // Find image
  const imageExts = ["jpg", "jpeg", "png", "webp"];
  let imagePath: string | null = null;
  for (const ext of imageExts) {
    const p = path.join(docDir, `image.${ext}`);
    if (fs.existsSync(p)) { imagePath = p; break; }
  }

  if (!imagePath) {
    console.log(`  Skipping ${labels.doc_id}: no image found`);
    return null;
  }

  console.log(`  Processing ${labels.doc_id} (${labels.doc_type}, ${labels.language})`);

  let ocrText: string;
  try {
    ocrText = await getOcr(labels.doc_id, imagePath, labels.language);
  } catch (err) {
    console.error(`  OCR failed for ${labels.doc_id}:`, err);
    return null;
  }

  const qaResults: QAResult[] = [];

  for (const qa of labels.qa_pairs) {
    let predicted: string;
    try {
      predicted = await runQA(ocrText, labels.language, qa.question);
    } catch {
      predicted = "(error)";
    }

    // Score against expected answer
    const field = labels.fields.find((f) =>
      qa.supporting_text.toLowerCase().includes(f.value.toLowerCase())
    );
    const fieldType = field?.type ?? "text";
    const { exact, fuzzy, score } = scoreField(predicted, qa.answer, fieldType);
    const hallucinations = findHallucinatedValues(predicted, ocrText);

    qaResults.push({
      question: qa.question,
      expected: qa.answer,
      predicted,
      exact,
      fuzzy,
      score,
      hallucinations,
    });
  }

  const avgScore =
    qaResults.length > 0
      ? qaResults.reduce((s, r) => s + r.score, 0) / qaResults.length
      : 0;

  return {
    doc_id: labels.doc_id,
    doc_type: labels.doc_type,
    language: labels.language,
    qaResults,
    avgScore,
    hallucinationCount: qaResults.reduce((s, r) => s + r.hallucinations.length, 0),
  };
}

function generateEvalMd(results: DocResult[]): string {
  if (results.length === 0) {
    return `# KagazBol Evaluation Results

> Run \`npm run eval\` with real masked documents in \`eval/data/\` to populate this table.
> Synthetic samples in \`eval/samples/\` are excluded from all numbers below.

## Dataset
- Documents: 0 (add masked real documents to \`eval/data/\`)

## Results
No results yet.
`;
  }

  const byType: Record<string, DocResult[]> = {};
  const byLang: Record<string, DocResult[]> = {};

  for (const r of results) {
    byType[r.doc_type] = [...(byType[r.doc_type] ?? []), r];
    byLang[r.language] = [...(byLang[r.language] ?? []), r];
  }

  const overallAvg = results.reduce((s, r) => s + r.avgScore, 0) / results.length;
  const totalHallucinations = results.reduce((s, r) => s + r.hallucinationCount, 0);

  const worstCases = results
    .flatMap((r) => r.qaResults.map((qa) => ({ ...qa, doc_id: r.doc_id })))
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);

  return `# KagazBol Evaluation Results

> Synthetic samples in \`eval/samples/\` are excluded from all numbers below.
> Run \`npm run eval\` to regenerate.

## Dataset
- Documents: ${results.length}
- By type: ${Object.entries(byType).map(([t, r]) => `${t} ${r.length}`).join(", ")}
- By language: ${Object.entries(byLang).map(([l, r]) => `${l} ${r.length}`).join(", ")}

## Results

| Document | Type | Language | Avg Score | Hallucinations |
|---|---|---|---|---|
${results.map((r) => `| ${r.doc_id} | ${r.doc_type} | ${r.language} | ${(r.avgScore * 100).toFixed(1)}% | ${r.hallucinationCount} |`).join("\n")}

**Overall average score:** ${(overallAvg * 100).toFixed(1)}%
**Total hallucinations detected:** ${totalHallucinations}

## Failure Analysis

Top ${worstCases.length} worst answers:

${worstCases
  .map(
    (c, i) => `### ${i + 1}. ${c.doc_id}: "${c.question}"
- Expected: ${c.expected}
- Predicted: ${c.predicted}
- Score: ${(c.score * 100).toFixed(1)}%
${c.hallucinations.length > 0 ? `- Hallucinations: ${c.hallucinations.join(", ")}` : ""}`
  )
  .join("\n\n")}
`;
}

async function main() {
  fs.mkdirSync(EVAL_CACHE_DIR, { recursive: true });
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  if (!fs.existsSync(EVAL_DATA_DIR)) {
    console.log("No eval/data/ directory found. Creating template docs/EVAL.md.");
    fs.writeFileSync(path.join(DOCS_DIR, "EVAL.md"), generateEvalMd([]));
    return;
  }

  const entries = fs.readdirSync(EVAL_DATA_DIR, { withFileTypes: true });
  const docDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(EVAL_DATA_DIR, e.name));

  if (docDirs.length === 0) {
    console.log("No documents in eval/data/. Writing empty EVAL.md.");
    fs.writeFileSync(path.join(DOCS_DIR, "EVAL.md"), generateEvalMd([]));
    return;
  }

  console.log(`Found ${docDirs.length} documents in eval/data/`);

  const results: DocResult[] = [];
  for (const dir of docDirs) {
    const result = await evalDoc(dir);
    if (result) results.push(result);
  }

  // Write timestamped JSON
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(RESULTS_DIR, `${ts}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`Results written to ${jsonPath}`);

  // Write docs/EVAL.md
  const mdPath = path.join(DOCS_DIR, "EVAL.md");
  fs.writeFileSync(mdPath, generateEvalMd(results));
  console.log(`EVAL.md written to ${mdPath}`);
}

main().catch((err) => {
  console.error("eval runner error:", err);
  process.exit(1);
});
