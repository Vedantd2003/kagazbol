import { promises as fs } from "fs";
import path from "path";
import type { EvalSample } from "./types";

/**
 * Datasets live in eval/datasets/<id>/*.json (one sample per file).
 * "seed" is committed and 100% synthetic. Real, consented and masked documents go
 * in eval/data/ (git-ignored) and are never committed or served to the browser.
 */
export const DATASETS_DIR = path.join(process.cwd(), "eval", "datasets");
const DATASET_ID = /^[a-z0-9][a-z0-9-]{0,40}$/;

export function validateSample(raw: unknown, file: string): EvalSample {
  const s = raw as Partial<EvalSample>;
  const problems: string[] = [];
  if (!s || typeof s !== "object") throw new Error(`${file}: not an object`);
  if (typeof s.id !== "string" || !s.id) problems.push("id");
  if (typeof s.synthetic !== "boolean") problems.push("synthetic");
  if (typeof s.category !== "string") problems.push("category");
  if (typeof s.sourceLanguage !== "string") problems.push("sourceLanguage");
  if (s.image != null && (typeof s.image !== "string" || s.image.includes(".."))) problems.push("image");
  if (typeof s.referenceOcr !== "string") problems.push("referenceOcr");
  if (!s.expected || !Array.isArray(s.expected.amounts) || !Array.isArray(s.expected.dates) || !Array.isArray(s.expected.fields)) problems.push("expected");
  if (!Array.isArray(s.qa)) problems.push("qa");
  if (problems.length) throw new Error(`${file}: invalid fields: ${problems.join(", ")}`);
  return s as EvalSample;
}

export async function listDatasets(): Promise<string[]> {
  try {
    const entries = await fs.readdir(DATASETS_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && DATASET_ID.test(e.name)).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

export async function loadDataset(id: string): Promise<EvalSample[]> {
  if (!DATASET_ID.test(id)) throw new Error("Invalid dataset id");
  const dir = path.join(DATASETS_DIR, id);
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const samples: EvalSample[] = [];
  for (const f of files) samples.push(validateSample(JSON.parse(await fs.readFile(path.join(dir, f), "utf-8")), f));
  return samples;
}

/**
 * Reads a dataset image. Images must live in public/samples/ (synthetic) — the
 * path is reduced to its file name, so a sample cannot point anywhere else.
 */
export async function readRepoImage(rel: string): Promise<Uint8Array> {
  if (!rel.startsWith("public/samples/")) throw new Error("Dataset images must be in public/samples/");
  const name = path.basename(rel);
  if (!/^[a-z0-9._-]+\.(png|jpe?g|webp)$/i.test(name)) throw new Error("Invalid image name");
  return new Uint8Array(await fs.readFile(path.join(process.cwd(), "public", "samples", name)));
}
