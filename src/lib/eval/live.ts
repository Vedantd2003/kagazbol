import { createDocJob, getUploadUrl, uploadFileToUrl, startDocJob, getDocJobStatus, downloadDocResultText } from "../sarvam/docIntelligence";
import { detectTextLanguage } from "../sarvam/lid";
import { chatCompletion } from "../sarvam/chat";
import { SARVAM_MODELS, DOC_INTELLIGENCE_LANGUAGE } from "../sarvam/config";
import { buildChatSystemPrompt, buildSummarySystemPrompt, buildSummaryUserPrompt } from "../prompts";
import { parseAnswerResponse, parseSummaryWithStatus } from "../parseSummary";
import { sniffImageType, SNIFFED_EXTENSION } from "../validation";
import { isAppLanguage } from "../languages";
import { readRepoImage } from "./dataset";
import type { LiveDeps, Pricing } from "./runner";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Live provider functions: the same Sarvam calls and prompts the app uses. */
export function createLiveDeps(): LiveDeps {
  return {
    readImage: readRepoImage,
    async ocr(bytes, language) {
      const type = sniffImageType(bytes);
      if (!type) throw new Error("Dataset image is not a supported image type");
      const lang = isAppLanguage(language) ? DOC_INTELLIGENCE_LANGUAGE[language] : "en-IN";
      const jobId = await createDocJob(lang);
      const url = await getUploadUrl(jobId, `document.${SNIFFED_EXTENSION[type]}`);
      await uploadFileToUrl(url, Buffer.from(bytes), type);
      await startDocJob(jobId);
      const deadline = Date.now() + 120_000;
      let delay = 2000;
      while (Date.now() < deadline) {
        const s = await getDocJobStatus(jobId);
        if (s.job_state === "Completed" || s.job_state === "PartiallyCompleted") return downloadDocResultText(jobId);
        if (s.job_state === "Failed") throw new Error("OCR job failed");
        await sleep(delay);
        delay = Math.min(delay * 1.5, 10_000);
      }
      throw new Error("OCR timed out");
    },
    async detectLanguage(text) {
      return (await detectTextLanguage(text)).languageCode;
    },
    async summarize(text, language) {
      const r = await chatCompletion(
        SARVAM_MODELS.chatFlagship,
        [
          { role: "system", content: buildSummarySystemPrompt(language) },
          { role: "user", content: buildSummaryUserPrompt(text) },
        ],
        { temperature: 0.1, maxTokens: 4096 }
      );
      return { summary: parseSummaryWithStatus(r.text).summary, usage: r.usage ? { ...r.usage, model: r.model } : null };
    },
    async answer(text, summary, language, question) {
      const r = await chatCompletion(
        SARVAM_MODELS.chatConversational,
        [
          { role: "system", content: buildChatSystemPrompt(text, summary, language) },
          { role: "user", content: question },
        ],
        { temperature: 0.2, maxTokens: 4096 }
      );
      const p = parseAnswerResponse(r.text);
      return { answer: p.answer, quotes: p.quotes, usage: r.usage ? { ...r.usage, model: r.model } : null };
    },
  };
}

export const LIVE_PIPELINE = {
  ocr: "sarvam doc-digitization v1 (md)",
  detection: "sarvam text-lid",
  extraction: SARVAM_MODELS.chatFlagship,
  qa: SARVAM_MODELS.chatConversational,
};

/**
 * Pricing is read from EVAL_PRICING_JSON, e.g.
 * {"currency":"INR","models":{"sarvam-105b":{"input":0.0,"output":0.0}},"ocrPerPage":0.0}
 * KagazBol does not ship prices: provider prices change, and a wrong number is
 * worse than "Unavailable".
 */
export function loadPricing(): Pricing | null {
  const raw = process.env.EVAL_PRICING_JSON;
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Pricing;
    if (typeof p.currency !== "string" || !p.models || typeof p.models !== "object") return null;
    return p;
  } catch {
    return null;
  }
}
