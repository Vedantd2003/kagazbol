import { NextResponse } from "next/server";
import { textToSpeech } from "@/lib/sarvam/tts";
import { SarvamApiError } from "@/lib/sarvam/client";
import type { AppLanguage } from "@/lib/sarvam/config";

export const runtime = "nodejs";

/** Converts a short spoken-style reply into audio via Bulbul TTS. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text: string; language: AppLanguage };
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "No text to speak." }, { status: 400 });
    }

    const { dataUrl } = await textToSpeech(body.text, body.language);
    return NextResponse.json({ audioUrl: dataUrl });
  } catch (err) {
    if (err instanceof SarvamApiError) {
      return NextResponse.json({ error: "The voice service is unavailable right now." }, { status: 502 });
    }
    console.error("tts error", err);
    return NextResponse.json({ error: "Something went wrong generating audio." }, { status: 500 });
  }
}
