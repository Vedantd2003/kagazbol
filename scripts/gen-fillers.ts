/**
 * Generates filler audio files using Sarvam Bulbul TTS.
 * Run via: npm run gen:fillers
 *
 * Saves files to public/audio/fillers/<lang>-<index>.wav
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const SARVAM_API_BASE = "https://api.sarvam.ai";

const FILLERS: Record<string, string[]> = {
  "hi-IN": ["एक मिनट, देखती हूँ…", "ज़रा सोचती हूँ…", "हाँ, बताती हूँ…"],
  "mr-IN": ["एक क्षण, बघते…", "थांबा, सांगते…", "हो, सांगते…"],
  "en-IN": ["Let me check…", "One moment…", "Let me see…"],
};

const SPEAKER = "priya";
const MODEL = "bulbul:v3";

async function generateFiller(
  text: string,
  language: string,
  apiKey: string
): Promise<Buffer | null> {
  const res = await fetch(`${SARVAM_API_BASE}/v1/text-to-speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": apiKey,
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: language,
      speaker: SPEAKER,
      model: MODEL,
      enable_preprocessing: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`TTS failed for "${text}" (${language}): ${res.status} ${err}`);
    return null;
  }

  const data = (await res.json()) as { audios?: string[] };
  const base64 = data.audios?.[0];
  if (!base64) {
    console.error(`No audio in response for "${text}"`);
    return null;
  }

  return Buffer.from(base64, "base64");
}

async function main() {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    console.error("SARVAM_API_KEY not set in environment. Add it to .env");
    process.exit(1);
  }

  const outputDir = path.join(process.cwd(), "public", "audio", "fillers");
  fs.mkdirSync(outputDir, { recursive: true });

  let generated = 0;
  let failed = 0;

  for (const [lang, phrases] of Object.entries(FILLERS)) {
    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i];
      const filename = `${lang}-${i}.wav`;
      const filepath = path.join(outputDir, filename);

      console.log(`Generating ${filename}: "${phrase}"`);

      const audioBuffer = await generateFiller(phrase, lang, apiKey);
      if (audioBuffer) {
        fs.writeFileSync(filepath, audioBuffer);
        console.log(`  Saved ${filepath} (${audioBuffer.length} bytes)`);
        generated++;
      } else {
        failed++;
      }
    }
  }

  console.log(`\nDone: ${generated} generated, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("gen-fillers error:", err);
  process.exit(1);
});
